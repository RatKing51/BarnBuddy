const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CLERK_PAGE_SIZE,
  JOIN_CODE_ALPHABET,
  MEMBERSHIP_CACHE_MAX_ENTRIES,
  generateJoinCode,
  generateUniqueJoinCode,
  getAllOrganizationMemberships,
  getAllUserMemberships,
  getOrganizationMemberCount,
  getUserFfaAccess,
  invalidateAllUserMembershipCaches,
  invalidateUserMembershipCache,
  isChapterPremiumCurrent,
  isCanonicalAdvisorEntry,
  normalizeJoinCode,
  resolvePremiumAccess,
  serializeChapterForMember,
} = require("../services/ffaChapterService");
const {
  ADVISOR_ACCESS_RETRY_DELAYS_MS,
  bindOrVerifyCanonicalAdvisor,
  getExactOrganizationAdvisorCandidates,
  getVerifiedClerkEmails,
  hasAvailableChapterSeat,
  hasVerifiedAdvisorEmail,
  loadAdvisorCandidatesWithRetry,
  mayBeConfiguredAdvisor,
  normalizeAccess,
} = require("../routes/ffaChapters");
const {
  buildClerkReconciliationPatch,
  chapterMatchesUpdateInput,
  hasCanonicalAdvisorMembership,
  isClerkOrganizationNotFound,
  normalizeChapterCreateInput,
  normalizeChapterPatchInput,
  reconcileClerkOrganizationFromDurableChapter,
} = require("../routes/adminFfaChapters");

test("chapter deletion only treats Clerk not-found responses as already removed", () => {
  assert.equal(isClerkOrganizationNotFound({ status: 404 }), true);
  assert.equal(isClerkOrganizationNotFound({ errors: [{ code: "organization_not_found" }] }), true);
  assert.equal(isClerkOrganizationNotFound({ status: 503, code: "service_unavailable" }), false);
});

test("chapter codes are cryptographically shaped, normalized, and exclude confusing characters", () => {
  const code = generateJoinCode(() => Uint8Array.from({ length: 12 }, (_, index) => index));
  const compact = code.replaceAll("-", "");

  assert.match(code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(compact.length, 12);
  assert.equal(compact, JOIN_CODE_ALPHABET.slice(0, 12));
  assert.equal(normalizeJoinCode(`  ${code.toLowerCase().replaceAll("-", " ")}  `), code);
  assert.equal(normalizeJoinCode("O000-I111-ABCD"), "");
  assert.equal(normalizeJoinCode("ABCD/EFGH/JKLM"), "");
});

test("unique chapter-code generation retries collisions without exposing a predictable value", async () => {
  const collidingCode = "ABCD-EFGH-JKLM";
  const candidates = [collidingCode, "NPQR-STUV-WXYZ"];
  const checked = [];
  const queryable = {
    async query(_text, values) {
      checked.push(values[0]);
      return values[0] === collidingCode
        ? { rowCount: 1, rows: [{ exists: 1 }] }
        : { rowCount: 0, rows: [] };
    },
  };

  const result = await generateUniqueJoinCode(queryable, {
    codeGenerator: () => candidates.shift(),
  });

  assert.equal(result, "NPQR-STUV-WXYZ");
  assert.deepEqual(checked, ["ABCD-EFGH-JKLM", "NPQR-STUV-WXYZ"]);
});

test("Clerk user membership pagination uses 500-item pages and caches until invalidated", async () => {
  const userId = "user_pagination_test";
  const memberships = Array.from({ length: 503 }, (_, index) => ({
    id: `membership_${index}`,
    organization: { id: `org_${index}` },
    role: "org:member",
  }));
  const calls = [];
  const client = {
    users: {
      async getOrganizationMembershipList(params) {
        calls.push(params);
        return {
          data: memberships.slice(params.offset, params.offset + params.limit),
          totalCount: memberships.length,
        };
      },
    },
  };

  invalidateUserMembershipCache(userId);
  const first = await getAllUserMemberships(userId, { clerkClient: client });
  const cached = await getAllUserMemberships(userId, { clerkClient: client });

  assert.equal(first.length, 503);
  assert.equal(cached.length, 503);
  assert.deepEqual(calls.map(({ limit, offset }) => ({ limit, offset })), [
    { limit: CLERK_PAGE_SIZE, offset: 0 },
    { limit: CLERK_PAGE_SIZE, offset: CLERK_PAGE_SIZE },
  ]);

  invalidateUserMembershipCache(userId);
  await getAllUserMemberships(userId, { clerkClient: client });
  assert.equal(calls.length, 4);
  invalidateUserMembershipCache(userId);
});

test("the short-lived Clerk membership cache stays bounded", async () => {
  let calls = 0;
  const client = {
    users: {
      async getOrganizationMembershipList() {
        calls += 1;
        return { data: [], totalCount: 0 };
      },
    },
  };

  invalidateAllUserMembershipCaches();
  for (let index = 0; index <= MEMBERSHIP_CACHE_MAX_ENTRIES; index += 1) {
    await getAllUserMemberships(`user_cache_${index}`, { clerkClient: client });
  }

  const callsBeforeRefetch = calls;
  await getAllUserMemberships("user_cache_0", { clerkClient: client });
  assert.equal(calls, callsBeforeRefetch + 1);
  invalidateAllUserMembershipCaches();
});

test("Clerk Organization membership helpers paginate and read totalCount efficiently", async () => {
  const memberships = Array.from({ length: 501 }, (_, index) => ({ id: `membership_${index}` }));
  const calls = [];
  const client = {
    organizations: {
      async getOrganizationMembershipList(params) {
        calls.push(params);
        return {
          data: memberships.slice(params.offset, params.offset + params.limit),
          totalCount: memberships.length,
        };
      },
    },
  };

  const result = await getAllOrganizationMemberships("org_chapter", { clerkClient: client });
  const count = await getOrganizationMemberCount("org_chapter", { clerkClient: client });

  assert.equal(result.length, 501);
  assert.equal(count, 501);
  assert.deepEqual(calls.slice(0, 2).map(({ limit, offset }) => ({ limit, offset })), [
    { limit: 500, offset: 0 },
    { limit: 500, offset: 500 },
  ]);
  assert.deepEqual(
    { limit: calls[2].limit, offset: calls[2].offset },
    { limit: 1, offset: 0 }
  );
});

test("chapter capacity reserves the advisor seat until the invitation is accepted", () => {
  const students = (count) => Array.from({ length: count }, () => ({ role: "org:member" }));
  const advisor = { role: "org:admin", userId: "user_advisor" };
  const promotedAdmin = { role: "org:admin", userId: "user_promoted" };

  assert.equal(hasAvailableChapterSeat(students(18), 20, ""), true);
  assert.equal(hasAvailableChapterSeat(students(19), 20, ""), false);
  assert.equal(hasAvailableChapterSeat([advisor, ...students(18)], 20, "user_advisor"), true);
  assert.equal(hasAvailableChapterSeat([advisor, ...students(19)], 20, "user_advisor"), false);
  assert.equal(hasAvailableChapterSeat([promotedAdmin, ...students(18)], 20, "user_advisor"), false);
  assert.equal(hasAvailableChapterSeat([], 1, ""), false);
});

test("only the canonical accepted advisor satisfies the administrative seat", () => {
  const chapter = { advisor_clerk_user_id: "user_advisor" };
  const canonical = { role: "org:admin", userId: "user_advisor" };
  const promotedAdmin = { role: "org:admin", userId: "user_promoted" };

  assert.equal(hasCanonicalAdvisorMembership(chapter, [canonical]), true);
  assert.equal(hasCanonicalAdvisorMembership(chapter, [promotedAdmin]), false);
  assert.equal(hasCanonicalAdvisorMembership({}, [canonical]), false);
});

test("admin chapter input respects Clerk limits and cannot silently reassign the advisor", () => {
  assert.throws(
    () => normalizeChapterCreateInput({
      chapterName: "Test FFA",
      advisorName: "Advisor",
      advisorEmail: "advisor@example.org",
      maxMembers: 501,
    }),
    /between 1 and 500/
  );

  const chapter = {
    chapter_name: "Test FFA",
    advisor_name: "Advisor",
    advisor_email: "advisor@example.org",
    max_members: 20,
    status: "ACTIVE",
    join_enabled: false,
    premium_active: false,
  };
  assert.throws(
    () => normalizeChapterPatchInput({ advisorEmail: "replacement@example.org" }, chapter),
    /cannot be changed/
  );
  assert.equal(
    normalizeChapterPatchInput({ advisorEmail: "ADVISOR@example.org" }, chapter).advisorEmail,
    "advisor@example.org"
  );
});

test("member serialization is safe and chapter Premium is current only while eligible", () => {
  const now = Date.parse("2026-08-14T12:00:00.000Z");
  const row = {
    id: 7,
    clerk_org_id: "org_secret_internal_id",
    join_code: "ABCD-EFGH-JKLM",
    chapter_name: "Herington FFA",
    school_name: "Herington High School",
    chapter_number: "42",
    state: "Kansas",
    advisor_name: "John Smith",
    advisor_email: "john@example.org",
    advisor_clerk_user_id: "user_internal_advisor",
    max_members: 20,
    status: "ACTIVE",
    join_enabled: true,
    premium_active: true,
    premium_expires_at: "2027-08-14T12:00:00.000Z",
    created_at: "2026-08-14T12:00:00.000Z",
    updated_at: "2026-08-14T12:00:00.000Z",
  };
  const safe = serializeChapterForMember(row, { role: "org:member", now });

  assert.equal(safe.chapterName, "Herington FFA");
  assert.equal(safe.membershipRole, "org:member");
  assert.equal(safe.premiumActive, true);
  assert.equal(safe.premiumCurrent, true);
  assert.equal(Object.hasOwn(safe, "join_code"), false);
  assert.equal(Object.hasOwn(safe, "joinCode"), false);
  assert.equal(Object.hasOwn(safe, "clerk_org_id"), false);
  assert.equal(Object.hasOwn(safe, "clerkOrgId"), false);
  assert.equal(Object.hasOwn(safe, "advisor_clerk_user_id"), false);
  assert.equal(Object.hasOwn(safe, "advisorClerkUserId"), false);
  assert.equal(isChapterPremiumCurrent(row, now), true);
  assert.equal(isChapterPremiumCurrent({ ...row, status: "SUSPENDED" }, now), true);
  assert.equal(isChapterPremiumCurrent({ ...row, premium_expires_at: "2026-08-14T11:59:59.000Z" }, now), false);
  assert.equal(isChapterPremiumCurrent({ ...row, premium_expires_at: null }, now), true);
  const expiredSafe = serializeChapterForMember({
    ...row,
    premium_expires_at: "2026-08-14T11:59:59.000Z",
  }, { now });
  assert.equal(expiredSafe.premiumActive, true);
  assert.equal(expiredSafe.premiumCurrent, false);
  assert.equal(serializeChapterForMember(row, "org:admin").isAdvisor, true);
});

test("Premium resolution preserves personal access and only derives chapter access in memory", () => {
  const personal = {
    plan: "premium",
    status: "canceled",
    isPremium: true,
    premiumSource: "clerk_billing_canceled",
    premiumExpiresAt: "2026-09-01T00:00:00.000Z",
  };
  const snapshot = { ...personal };
  const personalResult = resolvePremiumAccess(personal, {
    chapterPremiumActive: true,
    premiumExpiresAt: "2026-08-20T00:00:00.000Z",
  });

  assert.deepEqual(personal, snapshot);
  assert.equal(personalResult.isPremium, true);
  assert.equal(personalResult.premiumSource, "clerk_billing_canceled");
  assert.equal(personalResult.premiumExpiresAt, "2026-09-01T00:00:00.000Z");
  assert.equal(personalResult.personalIsPremium, true);
  assert.equal(personalResult.personalPremiumActive, true);
  assert.equal(personalResult.chapterPremiumActive, true);
  assert.equal(personalResult.providedByChapter, false);

  const extendedResult = resolvePremiumAccess(personal, {
    chapterPremiumActive: true,
    premiumExpiresAt: "2027-08-14T00:00:00.000Z",
  });
  assert.equal(extendedResult.premiumExpiresAt, "2027-08-14T00:00:00.000Z");
  assert.equal(extendedResult.providedByChapter, true);

  const lifetimeResult = resolvePremiumAccess({ ...personal, premiumExpiresAt: "" }, {
    chapterPremiumActive: true,
    premiumExpiresAt: "2027-08-14T00:00:00.000Z",
  });
  assert.equal(lifetimeResult.premiumExpiresAt, "");
  assert.equal(lifetimeResult.providedByChapter, false);

  const chapterResult = resolvePremiumAccess(
    { plan: "free", status: "free", isPremium: false },
    { chapterPremiumActive: true, premiumExpiresAt: "2027-08-14T00:00:00.000Z" }
  );
  assert.equal(chapterResult.isPremium, true);
  assert.equal(chapterResult.premiumSource, "ffa_chapter");
  assert.equal(chapterResult.personalIsPremium, false);
  assert.equal(chapterResult.personalPremiumActive, false);
  assert.equal(chapterResult.providedByChapter, true);

  const freeResult = resolvePremiumAccess(
    { plan: "free", status: "free", isPremium: false },
    { chapterPremiumActive: false }
  );
  assert.equal(freeResult.isPremium, false);
  assert.equal(freeResult.plan, "free");

  const expiredChapterResult = resolvePremiumAccess(
    { plan: "free", status: "free", isPremium: false },
    {
      chapters: [{
        premiumActive: true,
        premiumCurrent: false,
        premiumExpiresAt: "2020-01-01T00:00:00.000Z",
      }],
    }
  );
  assert.equal(expiredChapterResult.isPremium, false);
});

test("FFA access finds an advisor chapter without depending on active Organization claims", async () => {
  const userId = "user_advisor_lookup_test";
  const memberships = [
    { organization: { id: "org_student" }, role: "org:member" },
    { organization: { id: "org_advisor" }, role: "org:admin", userId },
  ];
  const client = {
    users: {
      async getOrganizationMembershipList({ limit, offset }) {
        return { data: memberships.slice(offset, offset + limit), totalCount: memberships.length };
      },
    },
  };
  const rows = [
    {
      id: 1,
      clerk_org_id: "org_student",
      chapter_name: "Student Chapter",
      school_name: "Student School",
      max_members: 20,
      status: "ACTIVE",
      join_enabled: true,
      premium_active: false,
    },
    {
      id: 2,
      clerk_org_id: "org_advisor",
      advisor_clerk_user_id: userId,
      join_code: "ABCD-EFGH-JKLM",
      chapter_name: "Advisor Chapter",
      school_name: "Advisor School",
      max_members: 20,
      status: "ACTIVE",
      join_enabled: true,
      premium_active: true,
      premium_expires_at: null,
    },
  ];
  const queryable = {
    async query(_text, values) {
      assert.deepEqual(values[0], ["org_student", "org_advisor"]);
      return { rows };
    },
  };

  invalidateUserMembershipCache(userId);
  const access = await getUserFfaAccess(userId, {
    clerkClient: client,
    queryable,
    ensureSchema: false,
    forceRefresh: true,
  });

  assert.equal(access.hasChapter, true);
  assert.equal(access.membershipCount, 2);
  assert.equal(access.accesses.length, 2);
  assert.equal(access.accesses[1].chapter.clerk_org_id, "org_advisor");
  assert.equal(access.accesses[1].role, "org:admin");
  assert.equal(access.isAdvisor, true);
  assert.equal(access.advisorChapter.id, 2);
  assert.equal(access.advisorChapter.chapterName, "Advisor Chapter");
  assert.equal(access.advisorChapter.membershipRole, "org:admin");
  assert.equal(access.chapterPremiumActive, true);
  assert.equal(Object.hasOwn(access.advisorChapter, "joinCode"), false);
  assert.equal(Object.hasOwn(access.advisorChapter, "clerkOrgId"), false);
  invalidateUserMembershipCache(userId);
});

test("unbound and promoted org admins are not classified as BarnBuddy advisors", () => {
  const promoted = {
    chapter: { id: 8, advisor_clerk_user_id: "user_real_advisor" },
    membership: { role: "org:admin", userId: "user_promoted" },
  };
  const canonical = {
    chapter: { id: 8, advisor_clerk_user_id: "user_real_advisor" },
    membership: { role: "org:admin", userId: "user_real_advisor" },
  };

  assert.equal(isCanonicalAdvisorEntry(promoted), false);
  assert.equal(isCanonicalAdvisorEntry(canonical), true);
  assert.equal(normalizeAccess({
    advisorChapter: null,
    accesses: [promoted],
  }, { requiredRole: "org:admin" }), null);
});

test("central FFA access demotes a non-canonical Clerk admin in user-facing state", async () => {
  const userId = "user_promoted_central_test";
  const client = {
    users: {
      async getOrganizationMembershipList() {
        return {
          data: [{ organization: { id: "org_promoted" }, role: "org:admin", userId }],
          totalCount: 1,
        };
      },
    },
  };
  const queryable = {
    async query() {
      return { rows: [{
        id: 10,
        clerk_org_id: "org_promoted",
        chapter_name: "Protected FFA",
        advisor_clerk_user_id: "user_real_advisor",
        max_members: 20,
        status: "ACTIVE",
        join_enabled: true,
        premium_active: false,
      }] };
    },
  };

  invalidateUserMembershipCache(userId);
  const access = await getUserFfaAccess(userId, {
    clerkClient: client,
    queryable,
    ensureSchema: false,
    forceRefresh: true,
  });
  assert.equal(access.isAdvisor, false);
  assert.equal(access.advisorChapter, null);
  assert.equal(access.chapter.membershipRole, "org:member");
  assert.equal(access.chapter.isAdvisor, false);
  assert.equal(access.accesses[0].role, "org:admin");
  assert.equal(Object.hasOwn(access.chapter, "advisorClerkUserId"), false);
  invalidateUserMembershipCache(userId);
});

test("canonical advisor binding requires the configured verified Clerk email", async () => {
  const chapter = {
    id: 9,
    clerk_org_id: "org_advisor",
    advisor_email: "advisor@example.org",
    advisor_clerk_user_id: null,
  };
  const clerkUser = {
    id: "user_advisor",
    emailAddresses: [
      { emailAddress: "advisor@example.org", verification: { status: "verified" } },
      { emailAddress: "other@example.org", verification: { status: "unverified" } },
    ],
  };
  const queries = [];
  const invalidatedUsers = [];
  const boundChapter = { ...chapter, advisor_clerk_user_id: "user_advisor" };
  const result = await bindOrVerifyCanonicalAdvisor(chapter, "user_advisor", {
    clerkUsers: { getUser: async () => clerkUser },
    invalidateMembershipCache: async (userId) => invalidatedUsers.push(userId),
    queryable: {
      async query(text, values) {
        queries.push({ text, values });
        return { rows: [boundChapter] };
      },
    },
  });

  assert.equal(hasVerifiedAdvisorEmail(clerkUser, "ADVISOR@example.org"), true);
  assert.equal(hasVerifiedAdvisorEmail(clerkUser, "other@example.org"), false);
  assert.equal(result.authorized, true);
  assert.equal(result.chapter.advisor_clerk_user_id, "user_advisor");
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].values, ["user_advisor", 9, "org_advisor"]);
  assert.deepEqual(invalidatedUsers, ["user_advisor"]);

  const denied = await bindOrVerifyCanonicalAdvisor(chapter, "user_promoted", {
    clerkUsers: {
      getUser: async () => ({
        id: "user_promoted",
        emailAddresses: [{
          emailAddress: "promoted@example.org",
          verification: { status: "verified" },
        }],
      }),
    },
    queryable: { query: async () => assert.fail("an email mismatch must not bind") },
  });
  assert.equal(denied.authorized, false);

  const wrongIdentity = await bindOrVerifyCanonicalAdvisor(chapter, "user_advisor", {
    clerkUsers: {
      getUser: async () => ({ ...clerkUser, id: "user_different" }),
    },
    queryable: { query: async () => assert.fail("a mismatched Clerk identity must not bind") },
  });
  assert.equal(wrongIdentity.authorized, false);
});

test("advisor acceptance tolerates bounded Clerk membership propagation", async () => {
  const clerkUser = {
    id: "user_invited_advisor",
    emailAddresses: [
      { emailAddress: "ADVISOR@example.org", verification: { status: "verified" } },
      { emailAddress: "advisor@example.org", verification: { status: "verified" } },
      { emailAddress: "unverified@example.org", verification: { status: "unverified" } },
    ],
  };
  const queryCalls = [];
  const potential = await mayBeConfiguredAdvisor("user_invited_advisor", {
    clerkUsers: { getUser: async () => clerkUser },
    queryable: {
      async query(text, values) {
        queryCalls.push({ text, values });
        return {
          rows: [
            { id: 12, clerk_org_id: "org_not_accepted" },
            { id: 13, clerk_org_id: "org_invited" },
          ],
        };
      },
    },
  });
  assert.equal(potential.eligible, true);
  assert.deepEqual(potential.chapters.map((chapter) => chapter.id), [12, 13]);
  assert.deepEqual(getVerifiedClerkEmails(clerkUser), ["advisor@example.org"]);
  assert.deepEqual(queryCalls[0].values, ["user_invited_advisor", ["advisor@example.org"]]);
  assert.doesNotMatch(queryCalls[0].text, /LIMIT\s+1/i);
  assert.match(queryCalls[0].text, /ORDER BY[\s\S]+id ASC/i);

  const checkedOrganizations = [];
  const exactCandidates = await getExactOrganizationAdvisorCandidates(
    potential.chapters,
    "user_invited_advisor",
    {
      loadMemberships: async (organizationId) => {
        checkedOrganizations.push(organizationId);
        return organizationId === "org_invited" ? [{
          role: "org:admin",
          publicUserData: { userId: "user_invited_advisor" },
        }] : [];
      },
    }
  );
  assert.equal(exactCandidates.length, 1);
  assert.equal(exactCandidates[0].chapter.id, 13);
  assert.deepEqual(checkedOrganizations, ["org_not_accepted", "org_invited"]);

  const exactFallbackInvalidations = [];
  const exactFallback = await loadAdvisorCandidatesWithRetry("user_invited_advisor", {
    loadFfaAccess: async () => ({ advisorChapter: null, accesses: [] }),
    checkPotentialAdvisor: async () => ({
      eligible: true,
      clerkUser,
      chapters: [{ id: 13, clerk_org_id: "org_invited" }],
    }),
    loadExactOrganizationCandidates: async () => exactCandidates,
    invalidateMembershipCache: async (userId) => exactFallbackInvalidations.push(userId),
    retryDelays: [10],
    wait: async () => assert.fail("the exact Organization fallback must avoid a retry delay"),
  });
  assert.equal(exactFallback.candidates.length, 1);
  assert.equal(exactFallback.attempts, 1);
  assert.deepEqual(exactFallbackInvalidations, ["user_invited_advisor"]);

  const accessResponses = [
    { advisorChapter: null, accesses: [] },
    { advisorChapter: null, accesses: [] },
    {
      advisorChapter: null,
      accesses: [{
        chapter: { id: 13, clerk_org_id: "org_invited" },
        membership: { role: "org:admin" },
        role: "org:admin",
      }],
    },
  ];
  const waits = [];
  const lookup = await loadAdvisorCandidatesWithRetry("user_invited_advisor", {
    loadFfaAccess: async () => accessResponses.shift(),
    checkPotentialAdvisor: async () => potential,
    loadExactOrganizationCandidates: async () => [],
    retryDelays: [10, 20, 30],
    wait: async (delay) => waits.push(delay),
  });

  assert.equal(lookup.candidates.length, 1);
  assert.equal(lookup.candidates[0].role, "org:admin");
  assert.equal(lookup.clerkUser, clerkUser);
  assert.equal(lookup.attempts, 3);
  assert.deepEqual(waits, [10, 20]);
  assert.equal(ADVISOR_ACCESS_RETRY_DELAYS_MS.length, 3);

  let unauthorizedLoads = 0;
  const unauthorized = await loadAdvisorCandidatesWithRetry("user_normal", {
    loadFfaAccess: async () => {
      unauthorizedLoads += 1;
      return { advisorChapter: null, accesses: [] };
    },
    checkPotentialAdvisor: async () => ({ eligible: false, clerkUser: null }),
    retryDelays: [10, 20],
    wait: async () => assert.fail("non-advisors must not incur retry delays"),
  });
  assert.equal(unauthorized.candidates.length, 0);
  assert.equal(unauthorizedLoads, 1);
});

test("chapter update reconciliation follows the durable database row", async () => {
  const durableChapter = {
    id: 12,
    clerk_org_id: "org_durable",
    chapter_name: "Durable FFA",
    school_name: "Durable School",
    chapter_number: "12",
    state: "Kansas",
    advisor_name: "Advisor",
    advisor_email: "advisor@example.org",
    max_members: 40,
    status: "ACTIVE",
    join_enabled: true,
    premium_active: true,
    premium_expires_at: "2027-08-14T23:59:59.999Z",
  };
  const attemptedPatch = { name: "Attempted", maxAllowedMemberships: 30 };
  const updates = [];
  const reconciliation = await reconcileClerkOrganizationFromDurableChapter({
    chapterId: 12,
    attemptedClerkPatch: attemptedPatch,
    findChapterById: async () => durableChapter,
    updateOrganization: async (organizationId, patch) => updates.push({ organizationId, patch }),
  });

  assert.equal(reconciliation.ok, true);
  assert.deepEqual(updates, [{
    organizationId: "org_durable",
    patch: { name: "Durable FFA", maxAllowedMemberships: 40 },
  }]);
  assert.deepEqual(
    buildClerkReconciliationPatch(durableChapter, attemptedPatch),
    { name: "Durable FFA", maxAllowedMemberships: 40 }
  );
  assert.equal(chapterMatchesUpdateInput(durableChapter, {
    chapterName: "Durable FFA",
    schoolName: "Durable School",
    chapterNumber: "12",
    state: "Kansas",
    advisorName: "Advisor",
    advisorEmail: "advisor@example.org",
    maxMembers: 40,
    status: "ACTIVE",
    joinEnabled: true,
    premiumActive: true,
    premiumExpiresAt: "2027-08-14T23:59:59.999Z",
  }), true);

  const failed = await reconcileClerkOrganizationFromDurableChapter({
    chapterId: 12,
    attemptedClerkPatch: attemptedPatch,
    findChapterById: async () => durableChapter,
    updateOrganization: async () => { throw new Error("Clerk unavailable"); },
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.stage, "clerk_update");
});

test("optional FFA lookup failure fails closed without affecting personal access", async () => {
  const userId = "user_lookup_failure_test";
  const client = {
    users: {
      async getOrganizationMembershipList() {
        throw new Error("Clerk unavailable");
      },
    },
  };

  invalidateUserMembershipCache(userId);
  const access = await getUserFfaAccess(userId, {
    clerkClient: client,
    queryable: { query: async () => ({ rows: [] }) },
    ensureSchema: false,
    forceRefresh: true,
    allowFailure: true,
  });

  assert.equal(access.lookupFailed, true);
  assert.equal(access.chapterPremiumActive, false);
  assert.equal(resolvePremiumAccess({ isPremium: true }, access).isPremium, true);
  invalidateUserMembershipCache(userId);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const ffaProjectRouter = require("../routes/ffaProjects");
const {
  clearAllChapterProjectShares,
  clearProjectSharesForChapterMember,
  generateAdvisorShareToken,
  getExactStudentEntry,
  normalizeAdvisorShareToken,
  removeChapterMemberAndClearProjectShares,
  serializeSharedProjectDetails,
  serializeSharedProjectListRow,
  serializeOwnedAdvisorShareRow,
  serializeStudentSharingStatus,
  upsertProjectAdvisorShare,
} = require("../services/ffaProjectSharingService");
const {
  getCurrentStudentMembershipIds,
  isActiveProjectSharingChapter,
} = require("../routes/ffaChapters");

function collectKeys(value, keys = new Set()) {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, keys));
    return keys;
  }
  Object.entries(value).forEach(([key, entry]) => {
    keys.add(key);
    collectKeys(entry, keys);
  });
  return keys;
}

test("advisor share tokens are 192-bit URL-safe opaque identifiers", () => {
  const token = generateAdvisorShareToken(() => Buffer.alloc(24, 17));
  assert.equal(token.length, 32);
  assert.match(token, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(normalizeAdvisorShareToken(token), token);
  assert.equal(normalizeAdvisorShareToken("42"), "");
  assert.equal(normalizeAdvisorShareToken(`${token}extra`), "");
});

test("student chapter derivation accepts exactly one current org:member chapter", () => {
  const chapter = { id: 8, status: "ACTIVE", project_sharing_enabled: true };
  const exact = getExactStudentEntry({
    accesses: [
      { chapter, membership: { role: "org:member" } },
      { chapter: { id: 9 }, membership: { role: "org:admin" } },
    ],
  });
  assert.equal(exact.status, "ok");
  assert.equal(exact.entry.chapter, chapter);
  assert.equal(exact.entry.role, "org:member");

  assert.equal(getExactStudentEntry({ accesses: [] }).status, "none");
  assert.equal(getExactStudentEntry({
    accesses: [
      { chapter: { id: 8 }, role: "org:member" },
      { chapter: { id: 10 }, role: "org:member" },
    ],
  }).status, "ambiguous");
});

test("advisor authorization considers only exact current org:member identities", () => {
  assert.deepEqual(getCurrentStudentMembershipIds([
    { role: "org:member", userId: "student_1" },
    { role: "org:admin", userId: "promoted_admin" },
    { role: "org:member", publicUserData: { userId: "student_2" } },
    { role: "org:member", userId: "student_1" },
  ]), ["student_1", "student_2"]);

  assert.equal(isActiveProjectSharingChapter({
    status: "ACTIVE",
    project_sharing_enabled: true,
  }), true);
  assert.equal(isActiveProjectSharingChapter({
    status: "SUSPENDED",
    project_sharing_enabled: true,
  }), false);
  assert.equal(isActiveProjectSharingChapter({
    status: "ACTIVE",
    project_sharing_enabled: false,
  }), false);
});

test("advisor project serializers enforce the project-only privacy allowlist", () => {
  const secret = "must-never-cross-the-advisor-boundary";
  const raw = {
    id: 51,
    user_id: 91,
    project_id: 51,
    animal_id: 33,
    share_token: "AbCdEfGhIjKlMnOpQrStUvWxYz012345",
    shared_at: "2026-08-14T12:00:00Z",
    name: "Market Steer",
    school_year: "2026-2027",
    sae_type: "entrepreneurship",
    chapter_name: "Herington FFA",
    advisor_name: "Advisor",
    advisor_email: secret,
    description: "Project description",
    start_date: "2026-08-01",
    end_date: "2027-05-31",
    status: "active",
    goals: ["Track growth"],
    created_at: "2026-08-01T12:00:00Z",
    updated_at: "2026-08-14T12:00:00Z",
    animal_count: 1,
    total_minutes: 45,
    income: "100",
    expenses: "30",
    current_weight: 700,
    current_status: secret,
    linked_record_summary: secret,
  };
  const child = {
    ...raw,
    animal_name: "Rocket",
    species: "Cattle",
    tag_id: "FFA-12",
    starting_weight: "610",
    starting_value: "1500",
    ownership_percentage: "100",
    records_from_date: "2026-08-01",
    activity_date: "2026-08-12",
    category: "Showing",
    title: "Practice",
    duration_minutes: 45,
    skills_learned: "Leading",
    reflection: "Improved",
    transaction_date: "2026-08-13",
    transaction_type: "expense",
    amount: "30",
    vendor: "FFA Supply",
    notes: "Project-only expense",
  };
  const list = serializeSharedProjectListRow(raw);
  const details = serializeSharedProjectDetails({
    project: raw,
    animals: [child],
    activities: [child],
    finances: [child],
  });
  const keys = collectKeys({ list, details });
  for (const forbidden of [
    "id", "user_id", "userId", "project_id", "projectId", "animal_id", "animalId",
    "advisorEmail", "email", "currentWeight", "currentStatus", "linkedRecordSummary",
  ]) {
    assert.equal(keys.has(forbidden), false, `${forbidden} must not be returned`);
  }
  assert.doesNotMatch(JSON.stringify({ list, details }), new RegExp(secret));
  assert.equal(details.animals[0].animalName, "Rocket");
  assert.equal(details.finances[0].amount, 30);
  assert.equal(details.summary.profit, 70);
});

test("student sharing status requires advisor enablement and keeps consent explicit", () => {
  const chapter = {
    chapter_name: "Herington FFA",
    status: "ACTIVE",
    project_sharing_enabled: true,
  };
  assert.deepEqual(serializeStudentSharingStatus({ chapter, eligible: true }), {
    eligible: true,
    chapterName: "Herington FFA",
    chapterEnabled: true,
    shared: false,
    sharedAt: null,
  });
  assert.equal(serializeStudentSharingStatus({
    chapter: { ...chapter, project_sharing_enabled: false },
    share: { shared_at: "2026-08-14T12:00:00Z" },
    eligible: true,
  }).eligible, false);
});

test("consent writes are idempotent and fail the transaction cleanly on an impossible token collision", async () => {
  const calls = [];
  const queryable = {
    async query(text, values) {
      calls.push({ text, values });
      throw Object.assign(new Error("collision"), { code: "23505" });
    },
  };
  await assert.rejects(upsertProjectAdvisorShare({
    projectId: 44,
    chapterId: 5,
    queryable,
    tokenGenerator: () => "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  }), /collision/);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, [44, 5, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"]);
  assert.match(calls[0].text, /ON CONFLICT \(project_id\)/);
});

test("chapter disable and member removal delete consent with chapter-scoped queries", async () => {
  const calls = [];
  const queryable = {
    async query(text, values) {
      calls.push({ text, values });
      return { rowCount: 2, rows: [] };
    },
  };
  assert.equal(await clearAllChapterProjectShares(7, queryable), 2);
  assert.equal(await clearProjectSharesForChapterMember(7, "user_student", queryable), 2);
  assert.deepEqual(calls[0].values, [7]);
  assert.deepEqual(calls[1].values, [7, "user_student"]);
  assert.match(calls[1].text, /account\.clerk_user_id = \$2/);
  assert.match(calls[1].text, /consent\.chapter_id = \$1/);
});

test("member removal pre-clears, deletes Clerk membership, then row-locks and clears again", async () => {
  const actions = [];
  const database = {
    async query(text) {
      actions.push(text.startsWith("DELETE") ? "pre-clear" : "pool-query");
      return { rowCount: 1, rows: [] };
    },
    async connect() {
      return {
        async query(text) {
          if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") actions.push(text);
          else if (text.includes("FOR UPDATE")) actions.push("chapter-lock");
          else if (text.startsWith("DELETE")) actions.push("post-clear");
          return { rowCount: 1, rows: [{ id: 7 }] };
        },
        release() {
          actions.push("release");
        },
      };
    },
  };
  await removeChapterMemberAndClearProjectShares({
    chapterId: 7,
    clerkUserId: "user_student",
    database,
    deleteMembership: async () => actions.push("clerk-delete"),
  });
  assert.deepEqual(actions, [
    "pre-clear",
    "clerk-delete",
    "BEGIN",
    "chapter-lock",
    "post-clear",
    "COMMIT",
    "release",
  ]);
});

test("member removal retries privacy cleanup if the post-Clerk database connection fails", async () => {
  const actions = [];
  const database = {
    async query() {
      actions.push("clear");
      return { rowCount: 1, rows: [] };
    },
    async connect() {
      actions.push("connect");
      throw new Error("database unavailable");
    },
  };
  await assert.rejects(removeChapterMemberAndClearProjectShares({
    chapterId: 7,
    clerkUserId: "user_student",
    database,
    deleteMembership: async () => actions.push("clerk-delete"),
  }), /database unavailable/);
  assert.deepEqual(actions, ["clear", "clerk-delete", "connect", "clear"]);
});

test("owner consent inventory exposes only the revocation handle and safe labels", () => {
  const result = serializeOwnedAdvisorShareRow({
    project_id: 42,
    user_id: 9,
    share_token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    name: "Market Steer",
    chapter_name: "Herington FFA",
    shared_at: "2026-08-14T12:00:00Z",
    email: "private@example.org",
  });
  assert.deepEqual(result, {
    projectId: 42,
    name: "Market Steer",
    chapterName: "Herington FFA",
    sharedAt: "2026-08-14T12:00:00.000Z",
  });
});

test("advisor-sharing consent route is registered before the Premium middleware", () => {
  const optOutRouteIndex = ffaProjectRouter.stack.findIndex((layer) => (
    layer.route?.path === "/:id/advisor-sharing" && layer.route?.methods?.patch
  ));
  const inventoryRouteIndex = ffaProjectRouter.stack.findIndex((layer) => (
    layer.route?.path === "/advisor-sharing" && layer.route?.methods?.get
  ));
  const premiumIndex = ffaProjectRouter.stack.findIndex((layer) => (
    layer.handle === ffaProjectRouter.requirePremium
  ));
  assert.ok(optOutRouteIndex >= 0, "advisor sharing route must exist");
  assert.ok(inventoryRouteIndex >= 0, "owner consent inventory route must exist");
  assert.ok(premiumIndex >= 0, "Premium middleware must exist");
  assert.ok(optOutRouteIndex < premiumIndex, "consent opt-out must bypass Premium");
  assert.ok(inventoryRouteIndex < premiumIndex, "consent inventory must bypass Premium");
});

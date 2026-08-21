const express = require("express");
const { clerkClient } = require("@clerk/express");
const authMiddleware = require("../middleware/authMiddleware");
const pool = require("../data-source");
const { consumeRateLimits } = require("../services/durableRateLimit");
const { formatRetryDuration } = require("../middleware/usageLimits");
const { ensureFfaProjectSharingSchema } = require("../services/ensureFfaProjectSharingSchema");
const {
  clearAllChapterProjectShares,
  normalizeAdvisorShareToken,
  removeChapterMemberAndClearProjectShares,
  serializeSharedProjectDetails,
  serializeSharedProjectListRow,
} = require("../services/ffaProjectSharingService");
const {
  generateUniqueJoinCode,
  getAllOrganizationMemberships,
  getUserFfaAccess,
  invalidateUserMembershipCache,
  normalizeJoinCode,
  serializeChapterForMember,
} = require("../services/ffaChapterService");

const router = express.Router();
const GENERIC_CODE_ERROR = "That chapter code is invalid or unavailable.";
const ADVISOR_ACCESS_RETRY_DELAYS_MS = Object.freeze([250, 750, 1_500]);
const JOIN_RATE_LIMIT_POLICIES = Object.freeze([
  Object.freeze({
    key: "ffa-chapter-join:15-minute",
    windowSeconds: 15 * 60,
    max: 5,
    message: "Too many chapter-code attempts.",
    exposeHeaders: true,
  }),
  Object.freeze({
    key: "ffa-chapter-join:day",
    windowSeconds: 24 * 60 * 60,
    max: 20,
    message: "Too many chapter-code attempts.",
  }),
]);

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function setPrivateNoStore(res) {
  res.set("Cache-Control", "private, no-store");
}

function getOrganizationId(chapter = {}) {
  return chapter.clerk_org_id || chapter.clerkOrgId || "";
}

function getChapterId(chapter = {}) {
  return Number(chapter.id) || null;
}

function normalizeAccessEntries(access) {
  if (!access) return [];
  if (Array.isArray(access)) return access;
  if (Array.isArray(access.accesses)) return access.accesses;
  if (Array.isArray(access.chapters)) return access.chapters;
  return [access];
}

function normalizeAccess(access, { requiredRole } = {}) {
  const hasAdvisorClassification = Boolean(
    access && typeof access === "object" && !Array.isArray(access) &&
    Object.prototype.hasOwnProperty.call(access, "advisorChapter")
  );
  const entries = requiredRole === "org:admin" && hasAdvisorClassification
    ? (access.advisorChapter ? [access.advisorChapter] : [])
    : (!requiredRole && access?.chapter ? [access.chapter] : normalizeAccessEntries(access));
  for (const entry of entries) {
    const chapter = entry?.chapter || entry?.ffaChapter || (getOrganizationId(entry) ? entry : null);
    const membership = entry?.membership || entry?.organizationMembership || {};
    const safeChapter = chapter || (entry?.id ? entry : null);
    const role = entry?.role || entry?.membershipRole || membership?.role || "";
    if (safeChapter && (!requiredRole || role === requiredRole)) {
      return { chapter: safeChapter, membership, role };
    }
  }
  return null;
}

function getAdvisorBindingCandidates(access) {
  return normalizeAccessEntries(access).flatMap((entry) => {
    const chapter = entry?.chapter || entry?.ffaChapter || (getOrganizationId(entry) ? entry : null);
    const membership = entry?.membership || entry?.organizationMembership || {};
    const safeChapter = chapter || (entry?.id ? entry : null);
    const role = entry?.role || entry?.membershipRole || membership?.role || "";
    return safeChapter && role === "org:admin"
      ? [{ chapter: safeChapter, membership, role }]
      : [];
  });
}

function getMembershipUserId(membership = {}) {
  const publicUserData = membership.publicUserData || membership.public_user_data || {};
  return (
    membership.userId ||
    membership.user_id ||
    publicUserData.userId ||
    publicUserData.user_id ||
    ""
  );
}

function serializeMembership(membership = {}) {
  const publicUserData = membership.publicUserData || membership.public_user_data || {};
  const userId = getMembershipUserId(membership);
  const firstName = publicUserData.firstName || publicUserData.first_name || "";
  const lastName = publicUserData.lastName || publicUserData.last_name || "";
  const email = publicUserData.identifier || publicUserData.emailAddress || publicUserData.email_address || "";
  const role = membership.role || "org:member";

  return {
    id: userId,
    userId,
    name: [firstName, lastName].filter(Boolean).join(" ") || email || "Chapter member",
    email,
    role,
    memberType: role === "org:admin" ? "Advisor" : "Student",
  };
}

function asMembershipArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function hasAvailableChapterSeat(memberships, maxMembers, advisorClerkUserId = "") {
  const currentMemberships = asMembershipArray(memberships);
  const maximum = Number(maxMembers);
  if (!Number.isSafeInteger(maximum) || maximum < 1) return false;

  const canonicalAdvisorId = asTrimmedString(advisorClerkUserId);
  const hasAcceptedAdvisor = Boolean(
    canonicalAdvisorId && currentMemberships.some((membership) => (
      membership.role === "org:admin" && getMembershipUserId(membership) === canonicalAdvisorId
    ))
  );
  return currentMemberships.length < maximum &&
    (hasAcceptedAdvisor || currentMemberships.length < Math.max(0, maximum - 1));
}

function serializeChapter(chapter, role, { memberCount } = {}) {
  const serialized = serializeChapterForMember(chapter, { role }) || {};
  const maxMembers = Number(chapter.max_members ?? chapter.maxMembers) || 20;
  return {
    ...serialized,
    ...(memberCount === undefined ? {} : { memberCount }),
    maxMembers,
    role: role || serialized.role || "org:member",
  };
}

function sendGenericCodeError(res) {
  return res.status(400).json({ error: GENERIC_CODE_ERROR });
}

function safeErrorSummary(error) {
  return {
    code: error?.code || error?.errors?.[0]?.code || "",
    status: error?.status || error?.statusCode || "",
    message: error?.message || "Unknown error",
  };
}

function isClerkMembershipLimitError(error) {
  const summary = JSON.stringify(safeErrorSummary(error)).toLowerCase();
  return summary.includes("maximum") || summary.includes("max_allowed") || summary.includes("limit");
}

function hasVerifiedAdvisorEmail(clerkUser = {}, advisorEmail = "") {
  const expectedEmail = asTrimmedString(advisorEmail).toLowerCase();
  if (!expectedEmail) return false;
  const emailAddresses = Array.isArray(clerkUser.emailAddresses)
    ? clerkUser.emailAddresses
    : (Array.isArray(clerkUser.email_addresses) ? clerkUser.email_addresses : []);

  return emailAddresses.some((emailAddress) => {
    const value = asTrimmedString(
      emailAddress?.emailAddress || emailAddress?.email_address
    ).toLowerCase();
    const verificationStatus = asTrimmedString(
      emailAddress?.verification?.status || emailAddress?.verification_status
    ).toLowerCase();
    return value === expectedEmail && verificationStatus === "verified";
  });
}

function getVerifiedClerkEmails(clerkUser = {}) {
  const emailAddresses = Array.isArray(clerkUser.emailAddresses)
    ? clerkUser.emailAddresses
    : (Array.isArray(clerkUser.email_addresses) ? clerkUser.email_addresses : []);
  return [...new Set(emailAddresses.flatMap((emailAddress) => {
    const verificationStatus = asTrimmedString(
      emailAddress?.verification?.status || emailAddress?.verification_status
    ).toLowerCase();
    const value = asTrimmedString(
      emailAddress?.emailAddress || emailAddress?.email_address
    ).toLowerCase();
    return verificationStatus === "verified" && value ? [value] : [];
  }))];
}

async function mayBeConfiguredAdvisor(clerkUserId, options = {}) {
  const normalizedUserId = asTrimmedString(clerkUserId);
  if (!normalizedUserId) return { eligible: false, clerkUser: null };
  const clerkUsers = options.clerkUsers || clerkClient.users;
  const queryable = options.queryable || pool;
  const clerkUser = await clerkUsers.getUser(normalizedUserId);
  if (asTrimmedString(clerkUser?.id) !== normalizedUserId) {
    return { eligible: false, clerkUser: null };
  }
  const verifiedEmails = getVerifiedClerkEmails(clerkUser);
  const result = await queryable.query(
    `SELECT id,
            clerk_org_id,
            advisor_email,
            advisor_clerk_user_id
     FROM ffa_chapters
     WHERE advisor_clerk_user_id = $1
        OR (
          advisor_clerk_user_id IS NULL
          AND LOWER(advisor_email) = ANY($2::text[])
        )
     ORDER BY CASE WHEN advisor_clerk_user_id = $1 THEN 0 ELSE 1 END,
              id ASC`,
    [normalizedUserId, verifiedEmails]
  );
  return {
    eligible: Boolean(result.rows[0]),
    chapters: Array.isArray(result.rows) ? result.rows : [],
    clerkUser,
  };
}

function getAdvisorCandidates(ffaAccess) {
  const classifiedAdvisor = normalizeAccess(ffaAccess, { requiredRole: "org:admin" });
  return classifiedAdvisor ? [classifiedAdvisor] : getAdvisorBindingCandidates(ffaAccess);
}

function waitForMilliseconds(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getExactOrganizationAdvisorCandidates(chapters, clerkUserId, options = {}) {
  const loadMemberships = options.loadMemberships || loadChapterMemberships;
  const normalizedUserId = asTrimmedString(clerkUserId);
  const candidates = [];
  if (!normalizedUserId || !Array.isArray(chapters)) return candidates;

  for (const chapter of chapters) {
    const organizationId = getOrganizationId(chapter);
    if (!organizationId) continue;
    const memberships = await loadMemberships(organizationId);
    const membership = asMembershipArray(memberships).find((entry) => (
      entry.role === "org:admin" && getMembershipUserId(entry) === normalizedUserId
    ));
    if (membership) candidates.push({ chapter, membership, role: "org:admin" });
  }
  return candidates;
}

async function loadAdvisorCandidatesWithRetry(clerkUserId, options = {}) {
  const loadFfaAccess = options.loadFfaAccess || ((userId) => (
    getUserFfaAccess(userId, { forceRefresh: true })
  ));
  const checkPotentialAdvisor = options.checkPotentialAdvisor || mayBeConfiguredAdvisor;
  const loadExactOrganizationCandidates = options.loadExactOrganizationCandidates || ((chapters, userId) => (
    getExactOrganizationAdvisorCandidates(chapters, userId)
  ));
  const wait = options.wait || waitForMilliseconds;
  const invalidateMembershipCache = options.invalidateMembershipCache || invalidateUserMembershipCache;
  const retryDelays = Array.isArray(options.retryDelays)
    ? options.retryDelays
    : ADVISOR_ACCESS_RETRY_DELAYS_MS;

  let ffaAccess = await loadFfaAccess(clerkUserId);
  let candidates = getAdvisorCandidates(ffaAccess);
  if (candidates.length) return { candidates, clerkUser: null, attempts: 1 };

  const potentialAdvisor = await checkPotentialAdvisor(clerkUserId);
  if (!potentialAdvisor?.eligible) {
    return { candidates: [], clerkUser: potentialAdvisor?.clerkUser || null, attempts: 1 };
  }

  if (Array.isArray(potentialAdvisor.chapters) && potentialAdvisor.chapters.length) {
    try {
      candidates = await loadExactOrganizationCandidates(potentialAdvisor.chapters, clerkUserId);
      if (candidates.length) {
        await invalidateMembershipCache(clerkUserId);
        return { candidates, clerkUser: potentialAdvisor.clerkUser || null, attempts: 1 };
      }
    } catch (error) {
      console.warn("Could not verify the advisor through the Clerk Organization member list:", safeErrorSummary(error));
    }
  }

  let attempts = 1;
  for (const rawDelay of retryDelays) {
    const delay = Math.max(0, Number(rawDelay) || 0);
    if (delay) await wait(delay);
    ffaAccess = await loadFfaAccess(clerkUserId);
    attempts += 1;
    candidates = getAdvisorCandidates(ffaAccess);
    if (candidates.length) {
      return { candidates, clerkUser: potentialAdvisor.clerkUser || null, attempts };
    }
  }

  return { candidates: [], clerkUser: potentialAdvisor.clerkUser || null, attempts };
}

async function bindOrVerifyCanonicalAdvisor(chapter, clerkUserId, options = {}) {
  const normalizedUserId = asTrimmedString(clerkUserId);
  if (!chapter || !normalizedUserId) return { authorized: false, chapter };

  const boundAdvisorId = asTrimmedString(
    chapter.advisor_clerk_user_id || chapter.advisorClerkUserId
  );
  if (boundAdvisorId) {
    return { authorized: boundAdvisorId === normalizedUserId, chapter };
  }

  const clerkUsers = options.clerkUsers || clerkClient.users;
  const queryable = options.queryable || pool;
  const invalidateMembershipCache = options.invalidateMembershipCache || invalidateUserMembershipCache;
  const clerkUser = options.clerkUser || await clerkUsers.getUser(normalizedUserId);
  if (
    asTrimmedString(clerkUser?.id) !== normalizedUserId ||
    !hasVerifiedAdvisorEmail(clerkUser, chapter.advisor_email || chapter.advisorEmail)
  ) {
    return { authorized: false, chapter };
  }

  try {
    const result = await queryable.query(
      `UPDATE ffa_chapters
       SET advisor_clerk_user_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND clerk_org_id = $3
         AND (advisor_clerk_user_id IS NULL OR advisor_clerk_user_id = $1)
       RETURNING *`,
      [normalizedUserId, getChapterId(chapter), getOrganizationId(chapter)]
    );
    if (result.rows[0]) {
      await invalidateMembershipCache(normalizedUserId);
      return { authorized: true, chapter: result.rows[0], bound: true };
    }
  } catch (error) {
    if (error?.code !== "23505") throw error;
  }

  const refreshed = await queryable.query(
    `SELECT *
     FROM ffa_chapters
     WHERE id = $1 AND clerk_org_id = $2`,
    [getChapterId(chapter), getOrganizationId(chapter)]
  );
  const refreshedChapter = refreshed.rows[0] || chapter;
  const refreshedAdvisorId = asTrimmedString(
    refreshedChapter.advisor_clerk_user_id || refreshedChapter.advisorClerkUserId
  );
  const authorized = refreshedAdvisorId === normalizedUserId;
  if (authorized) await invalidateMembershipCache(normalizedUserId);
  return {
    authorized,
    chapter: refreshedChapter,
    bound: authorized,
  };
}

async function joinChapterRateLimit(req, res, next) {
  try {
    const result = await consumeRateLimits({
      userId: req.user?.id,
      group: "ffa-chapter-join",
      policies: JOIN_RATE_LIMIT_POLICIES,
    });

    if (!result.allowed) {
      const blocked = result.blocked;
      const retryAfter = Math.max(1, Number(blocked.retryAfterSeconds) || 1);
      res.set({
        "RateLimit-Limit": String(blocked.max),
        "RateLimit-Remaining": "0",
        "RateLimit-Reset": String(retryAfter),
        "Retry-After": String(retryAfter),
      });
      return res.status(429).json({
        error: `${blocked.message} Try again in ${formatRetryDuration(retryAfter)}.`,
        code: "RATE_LIMITED",
        retryAfterSeconds: retryAfter,
      });
    }

    const exposed = result.policies.find((policy) => policy.exposeHeaders);
    if (exposed) {
      res.set({
        "RateLimit-Limit": String(exposed.max),
        "RateLimit-Remaining": String(exposed.remaining),
        "RateLimit-Reset": String(exposed.retryAfterSeconds),
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireAdvisorAccess(req, res) {
  try {
    const advisorLookup = await loadAdvisorCandidatesWithRetry(req.user.clerkUserId);
    const candidates = advisorLookup.candidates;

    for (const candidate of candidates) {
      const organizationId = getOrganizationId(candidate.chapter);
      const result = organizationId
        ? await pool.query(
          "SELECT * FROM ffa_chapters WHERE id = $1 AND clerk_org_id = $2",
          [getChapterId(candidate.chapter), organizationId]
        )
        : await pool.query("SELECT * FROM ffa_chapters WHERE id = $1", [getChapterId(candidate.chapter)]);
      const chapter = result.rows[0];
      if (!chapter) continue;
      const canonicalAdvisor = await bindOrVerifyCanonicalAdvisor(
        chapter,
        req.user.clerkUserId,
        { clerkUser: advisorLookup.clerkUser }
      );
      if (canonicalAdvisor.authorized) {
        return { ...candidate, chapter: canonicalAdvisor.chapter };
      }
    }
    res.status(403).json({ error: "FFA advisor access required" });
    return null;
  } catch (error) {
    console.warn("Could not verify FFA advisor access:", safeErrorSummary(error));
    res.status(502).json({ error: "BarnBuddy could not verify advisor access. Please try again." });
    return null;
  }
}

async function loadChapterMemberships(clerkOrgId) {
  return asMembershipArray(await getAllOrganizationMemberships(clerkOrgId));
}

async function regenerateJoinCode(chapter) {
  const code = await generateUniqueJoinCode(pool);
  const result = await pool.query(
    `UPDATE ffa_chapters
     SET join_code = $1,
         join_code_created_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND clerk_org_id = $3
     RETURNING *`,
    [code, getChapterId(chapter), getOrganizationId(chapter)]
  );
  return result.rows[0] || null;
}

function isActiveProjectSharingChapter(chapter = {}) {
  return String(chapter.status || "").toUpperCase() === "ACTIVE" &&
    chapter.project_sharing_enabled === true;
}

function getCurrentStudentMembershipIds(memberships = []) {
  return [...new Set(asMembershipArray(memberships).flatMap((membership) => {
    const userId = getMembershipUserId(membership);
    return membership.role === "org:member" && userId ? [userId] : [];
  }))];
}

function sendProjectSharingUnavailable(res, chapter = {}) {
  const suspended = String(chapter.status || "").toUpperCase() !== "ACTIVE";
  return res.status(409).json({
    error: suspended
      ? "FFA project sharing is unavailable while this chapter is suspended."
      : "Enable FFA project sharing before viewing student projects.",
  });
}

router.get("/me", authMiddleware, async (req, res) => {
  setPrivateNoStore(res);
  try {
    const access = normalizeAccess(
      await getUserFfaAccess(req.user.clerkUserId, { forceRefresh: true })
    );
    if (!access) return res.json({ chapter: null });

    return res.json({
      chapter: serializeChapter(access.chapter, access.role),
    });
  } catch (error) {
    console.warn("Could not load the current user's FFA chapter:", safeErrorSummary(error));
    return res.status(502).json({ error: "BarnBuddy could not load your FFA chapter. Please try again." });
  }
});

router.post("/join", authMiddleware, joinChapterRateLimit, async (req, res) => {
  const code = normalizeJoinCode(req.body?.code);
  if (!code) return sendGenericCodeError(res);

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const chapterResult = await client.query(
      `SELECT *
       FROM ffa_chapters
       WHERE join_code = $1
       FOR UPDATE`,
      [code]
    );
    const chapter = chapterResult.rows[0];

    if (
      !chapter ||
      String(chapter.status || "").toUpperCase() !== "ACTIVE" ||
      chapter.join_enabled !== true
    ) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendGenericCodeError(res);
    }

    const existingAccess = normalizeAccess(
      await getUserFfaAccess(req.user.clerkUserId, { forceRefresh: true })
    );
    if (existingAccess) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      if (getChapterId(existingAccess.chapter) === getChapterId(chapter)) {
        return res.json({
          chapter: serializeChapter(existingAccess.chapter, existingAccess.role),
          message: `You're already a member of ${chapter.chapter_name}.`,
        });
      }
      return res.status(409).json({ error: "You are already a member of an FFA chapter." });
    }

    const currentMemberships = await loadChapterMemberships(getOrganizationId(chapter));
    const memberCount = currentMemberships.length;
    if (!hasAvailableChapterSeat(
      currentMemberships,
      Number(chapter.max_members),
      chapter.advisor_clerk_user_id || chapter.advisorClerkUserId
    )) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendGenericCodeError(res);
    }

    try {
      await clerkClient.organizations.createOrganizationMembership({
        organizationId: getOrganizationId(chapter),
        userId: req.user.clerkUserId,
        role: "org:member",
      });
    } catch (error) {
      await invalidateUserMembershipCache(req.user.clerkUserId);
      const refreshedAccess = normalizeAccess(
        await getUserFfaAccess(req.user.clerkUserId, { forceRefresh: true })
      );
      if (!refreshedAccess || getChapterId(refreshedAccess.chapter) !== getChapterId(chapter)) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        if (isClerkMembershipLimitError(error)) return sendGenericCodeError(res);
        console.warn("Clerk could not add an FFA chapter member:", safeErrorSummary(error));
        return res.status(502).json({ error: "BarnBuddy could not join the chapter. Please try again." });
      }
    }

    await client.query("COMMIT");
    transactionOpen = false;
    await invalidateUserMembershipCache(req.user.clerkUserId);
    return res.status(201).json({
      chapter: serializeChapter(chapter, "org:member", { memberCount: memberCount + 1 }),
      message: `You're now a member of ${chapter.chapter_name}.`,
    });
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    console.warn("FFA chapter join failed:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not join the chapter. Please try again." });
  } finally {
    client.release();
  }
});

router.get("/advisor", authMiddleware, async (req, res) => {
  setPrivateNoStore(res);
  const access = await requireAdvisorAccess(req, res);
  if (!access) return;

  try {
    const memberships = await loadChapterMemberships(getOrganizationId(access.chapter));
    return res.json({
      chapter: serializeChapter(access.chapter, access.role, { memberCount: memberships.length }),
      joinCode: access.chapter.join_code || access.chapter.joinCode || "",
      members: memberships.map(serializeMembership),
      memberCount: memberships.length,
      maxMembers: Number(access.chapter.max_members ?? access.chapter.maxMembers) || 20,
    });
  } catch (error) {
    console.warn("Could not load FFA advisor dashboard:", safeErrorSummary(error));
    return res.status(502).json({ error: "BarnBuddy could not load the advisor dashboard. Please try again." });
  }
});

router.post("/advisor/join-code/regenerate", authMiddleware, async (req, res) => {
  setPrivateNoStore(res);
  const access = await requireAdvisorAccess(req, res);
  if (!access) return;

  try {
    const chapter = await regenerateJoinCode(access.chapter);
    if (!chapter) return res.status(404).json({ error: "FFA chapter not found" });
    return res.json({
      chapter: serializeChapter(chapter, "org:admin"),
      joinCode: chapter.join_code,
      message: "A new chapter code is active. The old code no longer works.",
    });
  } catch (error) {
    console.warn("Could not regenerate an FFA chapter code:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not regenerate the chapter code. Please try again." });
  }
});

router.patch("/advisor/joining", authMiddleware, async (req, res) => {
  setPrivateNoStore(res);
  const enabled = typeof req.body?.joinEnabled === "boolean"
    ? req.body.joinEnabled
    : req.body?.enabled;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Joining must be enabled or disabled." });
  }

  const access = await requireAdvisorAccess(req, res);
  if (!access) return;
  if (enabled && String(access.chapter.status || "").toUpperCase() !== "ACTIVE") {
    return res.status(409).json({ error: "Joining cannot be enabled while this chapter is suspended." });
  }

  try {
    const result = await pool.query(
      `UPDATE ffa_chapters
       SET join_enabled = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND clerk_org_id = $3
       RETURNING *`,
      [enabled, getChapterId(access.chapter), getOrganizationId(access.chapter)]
    );
    const chapter = result.rows[0];
    if (!chapter) return res.status(404).json({ error: "FFA chapter not found" });
    return res.json({ chapter: serializeChapter(chapter, "org:admin") });
  } catch (error) {
    console.warn("Could not update FFA chapter joining:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not update chapter joining. Please try again." });
  }
});

router.patch("/advisor/project-sharing", authMiddleware, async (req, res) => {
  setPrivateNoStore(res);
  const enabled = typeof req.body?.projectSharingEnabled === "boolean"
    ? req.body.projectSharingEnabled
    : req.body?.enabled;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Project sharing must be enabled or disabled." });
  }

  const access = await requireAdvisorAccess(req, res);
  if (!access) return;
  if (enabled && String(access.chapter.status || "").toUpperCase() !== "ACTIVE") {
    return res.status(409).json({
      error: "Project sharing cannot be enabled while this chapter is suspended.",
    });
  }

  const client = await pool.connect();
  try {
    await ensureFfaProjectSharingSchema();
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE ffa_chapters
       SET project_sharing_enabled = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND clerk_org_id = $3
       RETURNING *`,
      [enabled, getChapterId(access.chapter), getOrganizationId(access.chapter)]
    );
    const chapter = result.rows[0];
    if (!chapter) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "FFA chapter not found" });
    }
    if (!enabled) await clearAllChapterProjectShares(chapter.id, client);
    await client.query("COMMIT");
    return res.json({
      chapter: serializeChapter(chapter, "org:admin"),
      projectSharingEnabled: chapter.project_sharing_enabled === true,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.warn("Could not update FFA project sharing:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not update project sharing. Please try again." });
  } finally {
    client.release();
  }
});

router.get("/advisor/shared-projects", authMiddleware, async (req, res) => {
  setPrivateNoStore(res);
  const access = await requireAdvisorAccess(req, res);
  if (!access) return;
  if (!isActiveProjectSharingChapter(access.chapter)) {
    return sendProjectSharingUnavailable(res, access.chapter);
  }

  try {
    await ensureFfaProjectSharingSchema();
    const memberships = await loadChapterMemberships(getOrganizationId(access.chapter));
    const currentStudentIds = getCurrentStudentMembershipIds(memberships);
    if (!currentStudentIds.length) {
      return res.json({ projects: [], projectSharingEnabled: true });
    }

    const result = await pool.query(
      `SELECT consent.share_token,
              consent.shared_at,
              project.name,
              project.school_year,
              project.sae_type,
              project.status,
              project.updated_at,
              (SELECT COUNT(*)::int
               FROM ffa_project_animals animal
               WHERE animal.project_id = project.id AND animal.user_id = project.user_id) AS animal_count,
              (SELECT COALESCE(SUM(activity.duration_minutes), 0)::int
               FROM ffa_project_activities activity
               WHERE activity.project_id = project.id AND activity.user_id = project.user_id) AS total_minutes,
              (SELECT COALESCE(SUM(CASE WHEN finance.transaction_type = 'income' THEN finance.amount ELSE 0 END), 0)
               FROM ffa_project_finances finance
               WHERE finance.project_id = project.id AND finance.user_id = project.user_id) AS income,
              (SELECT COALESCE(SUM(CASE WHEN finance.transaction_type = 'expense' THEN finance.amount ELSE 0 END), 0)
               FROM ffa_project_finances finance
               WHERE finance.project_id = project.id AND finance.user_id = project.user_id) AS expenses
       FROM ffa_project_advisor_shares consent
       JOIN ffa_projects project ON project.id = consent.project_id
       JOIN ffa_chapters durable_chapter
         ON durable_chapter.id = consent.chapter_id
        AND durable_chapter.status = 'ACTIVE'
        AND durable_chapter.project_sharing_enabled = TRUE
       JOIN users account ON account.id = project.user_id
       WHERE consent.chapter_id = $1
         AND account.clerk_user_id = ANY($2::text[])
       ORDER BY consent.shared_at DESC, project.updated_at DESC`,
      [getChapterId(access.chapter), currentStudentIds]
    );
    return res.json({
      projects: result.rows.map(serializeSharedProjectListRow),
      projectSharingEnabled: true,
    });
  } catch (error) {
    console.warn("Could not load advisor-shared FFA projects:", safeErrorSummary(error));
    return res.status(502).json({ error: "BarnBuddy could not load shared FFA projects. Please try again." });
  }
});

router.get("/advisor/shared-projects/:shareId", authMiddleware, async (req, res) => {
  setPrivateNoStore(res);
  const shareToken = normalizeAdvisorShareToken(req.params.shareId);
  if (!shareToken) return res.status(404).json({ error: "Shared FFA project not found." });

  const access = await requireAdvisorAccess(req, res);
  if (!access) return;
  if (!isActiveProjectSharingChapter(access.chapter)) {
    return sendProjectSharingUnavailable(res, access.chapter);
  }

  await ensureFfaProjectSharingSchema();
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    const memberships = await loadChapterMemberships(getOrganizationId(access.chapter));
    const currentStudentIds = getCurrentStudentMembershipIds(memberships);
    if (!currentStudentIds.length) {
      return res.status(404).json({ error: "Shared FFA project not found." });
    }

    await client.query("BEGIN");
    transactionOpen = true;
    const projectResult = await client.query(
      `SELECT project.id AS internal_project_id,
              project.user_id AS internal_user_id,
              account.clerk_user_id AS internal_clerk_user_id,
              consent.share_token,
              consent.shared_at,
              project.name,
              project.school_year,
              project.sae_type,
              project.chapter_name,
              project.advisor_name,
              project.description,
              project.start_date,
              project.end_date,
              project.status,
              project.goals,
              project.created_at,
              project.updated_at,
              (SELECT COUNT(*)::int
               FROM ffa_project_animals animal
               WHERE animal.project_id = project.id AND animal.user_id = project.user_id) AS animal_count,
              (SELECT COALESCE(SUM(activity.duration_minutes), 0)::int
               FROM ffa_project_activities activity
               WHERE activity.project_id = project.id AND activity.user_id = project.user_id) AS total_minutes,
              (SELECT COALESCE(SUM(CASE WHEN finance.transaction_type = 'income' THEN finance.amount ELSE 0 END), 0)
               FROM ffa_project_finances finance
               WHERE finance.project_id = project.id AND finance.user_id = project.user_id) AS income,
              (SELECT COALESCE(SUM(CASE WHEN finance.transaction_type = 'expense' THEN finance.amount ELSE 0 END), 0)
               FROM ffa_project_finances finance
               WHERE finance.project_id = project.id AND finance.user_id = project.user_id) AS expenses
       FROM ffa_project_advisor_shares consent
       JOIN ffa_projects project ON project.id = consent.project_id
       JOIN ffa_chapters durable_chapter
         ON durable_chapter.id = consent.chapter_id
        AND durable_chapter.status = 'ACTIVE'
        AND durable_chapter.project_sharing_enabled = TRUE
       JOIN users account ON account.id = project.user_id
       WHERE consent.share_token = $1
         AND consent.chapter_id = $2
         AND account.clerk_user_id = ANY($3::text[])
       LIMIT 1
       FOR SHARE OF consent, project, durable_chapter`,
      [shareToken, getChapterId(access.chapter), currentStudentIds]
    );
    const project = projectResult.rows[0];
    if (!project) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(404).json({ error: "Shared FFA project not found." });
    }

    const [animalsResult, activitiesResult, financesResult] = await Promise.all([
      client.query(
        `SELECT animal_name, species, tag_id, starting_weight, starting_value,
                ownership_percentage, records_from_date, created_at, updated_at
         FROM ffa_project_animals
         WHERE project_id = $1 AND user_id = $2
         ORDER BY created_at, id`,
        [project.internal_project_id, project.internal_user_id]
      ),
      client.query(
        `SELECT animal_name, activity_date, category, title, description,
                duration_minutes, skills_learned, reflection, created_at, updated_at
         FROM ffa_project_activities
         WHERE project_id = $1 AND user_id = $2
         ORDER BY activity_date DESC, id DESC`,
        [project.internal_project_id, project.internal_user_id]
      ),
      client.query(
        `SELECT animal_name, transaction_date, transaction_type, category, amount,
                vendor, notes, created_at, updated_at
         FROM ffa_project_finances
         WHERE project_id = $1 AND user_id = $2
         ORDER BY transaction_date DESC, id DESC`,
        [project.internal_project_id, project.internal_user_id]
      ),
    ]);

    // A final uncached Clerk check occurs while the durable consent/chapter
    // rows are share-locked. App-mediated opt-out, disable, and member removal
    // cannot commit through this gate, and direct Clerk removals fail closed.
    const finalMemberships = await loadChapterMemberships(getOrganizationId(access.chapter));
    const stillCurrentStudent = finalMemberships.some((membership) => (
      membership.role === "org:member" &&
      getMembershipUserId(membership) === project.internal_clerk_user_id
    ));
    const canonicalAdvisorId = asTrimmedString(
      access.chapter.advisor_clerk_user_id || access.chapter.advisorClerkUserId
    );
    const stillCanonicalAdvisor = Boolean(
      canonicalAdvisorId === req.user.clerkUserId &&
      finalMemberships.some((membership) => (
        membership.role === "org:admin" &&
        getMembershipUserId(membership) === canonicalAdvisorId
      ))
    );
    if (!stillCurrentStudent || !stillCanonicalAdvisor) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return stillCanonicalAdvisor
        ? res.status(404).json({ error: "Shared FFA project not found." })
        : res.status(403).json({ error: "FFA advisor access required" });
    }

    const responseProject = serializeSharedProjectDetails({
      project,
      animals: animalsResult.rows,
      activities: activitiesResult.rows,
      finances: financesResult.rows,
    });
    await client.query("COMMIT");
    transactionOpen = false;
    return res.json({ project: responseProject });
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    console.warn("Could not load an advisor-shared FFA project:", safeErrorSummary(error));
    return res.status(502).json({ error: "BarnBuddy could not load that shared FFA project. Please try again." });
  } finally {
    client.release();
  }
});

router.delete("/advisor/members/:userId", authMiddleware, async (req, res) => {
  const targetUserId = asTrimmedString(req.params.userId);
  if (!targetUserId || targetUserId.length > 200) {
    return res.status(400).json({ error: "A valid chapter member is required." });
  }

  const access = await requireAdvisorAccess(req, res);
  if (!access) return;
  if (targetUserId === req.user.clerkUserId) {
    return res.status(403).json({ error: "Advisors cannot remove themselves." });
  }

  try {
    const organizationId = getOrganizationId(access.chapter);
    const memberships = await loadChapterMemberships(organizationId);
    const membership = memberships.find((item) => getMembershipUserId(item) === targetUserId);
    if (!membership) return res.status(404).json({ error: "Chapter member not found" });
    if (membership.role !== "org:member") {
      return res.status(403).json({ error: "Advisor memberships cannot be removed here." });
    }

    await removeChapterMemberAndClearProjectShares({
      chapterId: getChapterId(access.chapter),
      clerkUserId: targetUserId,
      deleteMembership: () => clerkClient.organizations.deleteOrganizationMembership({
        organizationId,
        userId: targetUserId,
      }),
    });
    await invalidateUserMembershipCache(targetUserId);
    return res.json({ removed: true, userId: targetUserId });
  } catch (error) {
    console.warn("Could not remove an FFA chapter member:", safeErrorSummary(error));
    return res.status(502).json({ error: "BarnBuddy could not remove that chapter member. Please try again." });
  }
});

module.exports = router;
module.exports.ADVISOR_ACCESS_RETRY_DELAYS_MS = ADVISOR_ACCESS_RETRY_DELAYS_MS;
module.exports.GENERIC_CODE_ERROR = GENERIC_CODE_ERROR;
module.exports.bindOrVerifyCanonicalAdvisor = bindOrVerifyCanonicalAdvisor;
module.exports.getAdvisorBindingCandidates = getAdvisorBindingCandidates;
module.exports.getAdvisorCandidates = getAdvisorCandidates;
module.exports.getExactOrganizationAdvisorCandidates = getExactOrganizationAdvisorCandidates;
module.exports.getVerifiedClerkEmails = getVerifiedClerkEmails;
module.exports.hasVerifiedAdvisorEmail = hasVerifiedAdvisorEmail;
module.exports.hasAvailableChapterSeat = hasAvailableChapterSeat;
module.exports.JOIN_RATE_LIMIT_POLICIES = JOIN_RATE_LIMIT_POLICIES;
module.exports.joinChapterRateLimit = joinChapterRateLimit;
module.exports.loadAdvisorCandidatesWithRetry = loadAdvisorCandidatesWithRetry;
module.exports.mayBeConfiguredAdvisor = mayBeConfiguredAdvisor;
module.exports.normalizeAccess = normalizeAccess;
module.exports.serializeMembership = serializeMembership;
module.exports.getCurrentStudentMembershipIds = getCurrentStudentMembershipIds;
module.exports.isActiveProjectSharingChapter = isActiveProjectSharingChapter;

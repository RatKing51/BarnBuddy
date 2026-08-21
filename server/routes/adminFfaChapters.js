const express = require("express");
const { clerkClient } = require("@clerk/express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminAuthorization");
const env = require("../config/env");
const pool = require("../data-source");
const { logAdminActivity } = require("../services/siteContent");
const { removeChapterMemberAndClearProjectShares } = require("../services/ffaProjectSharingService");
const {
  generateUniqueJoinCode,
  getAllOrganizationMemberships,
  getOrganizationMemberCount,
  invalidateAllUserMembershipCaches,
  invalidateUserMembershipCache,
  isChapterPremiumCurrent,
  serializeChapterForMember,
} = require("../services/ffaChapterService");

const router = express.Router();
const CHAPTER_STATUSES = new Set(["ACTIVE", "SUSPENDED"]);
const MAX_TEXT_LENGTHS = Object.freeze({
  chapterName: 160,
  schoolName: 200,
  chapterNumber: 80,
  state: 80,
  advisorName: 160,
  advisorEmail: 320,
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.isValidationError = true;
  return error;
}

function readText(body, field, { required = false, fallback = "" } = {}) {
  const value = hasOwn(body, field) ? asTrimmedString(body[field]) : fallback;
  if (required && !value) throw validationError(`${field} is required.`);
  if (value.length > MAX_TEXT_LENGTHS[field]) {
    throw validationError(`${field} is too long.`);
  }
  return value;
}

function readBoolean(body, field, fallback) {
  if (!hasOwn(body, field)) return fallback;
  if (typeof body[field] !== "boolean") {
    throw validationError(`${field} must be true or false.`);
  }
  return body[field];
}

function readMaxMembers(value, fallback = 20) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 500) {
    throw validationError("maxMembers must be a whole number between 1 and 500.");
  }
  return parsed;
}

function readStatus(value, fallback = "ACTIVE") {
  if (value === undefined) return fallback;
  const status = asTrimmedString(value).toUpperCase();
  if (!CHAPTER_STATUSES.has(status)) {
    throw validationError("status must be ACTIVE or SUSPENDED.");
  }
  return status;
}

function readExpiration(value, fallback = null) {
  if (value === undefined) return fallback;
  if (value === null || value === "") return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw validationError("premiumExpiresAt must be a valid date.");
  }
  return new Date(parsed).toISOString();
}

function validateAdvisorEmail(value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw validationError("advisorEmail must be a valid email address.");
  }
  return value.toLowerCase();
}

function normalizeChapterCreateInput(body = {}) {
  const status = readStatus(body.status, "ACTIVE");
  const premiumActive = readBoolean(body, "premiumActive", false);
  const premiumExpiresAt = readExpiration(body.premiumExpiresAt, null);
  const requestedJoining = readBoolean(body, "joinEnabled", false);

  if (premiumActive && (!premiumExpiresAt || Date.parse(premiumExpiresAt) <= Date.now())) {
    throw validationError("Active chapter Premium requires a future expiration date.");
  }

  return {
    chapterName: readText(body, "chapterName", { required: true }),
    schoolName: readText(body, "schoolName"),
    chapterNumber: readText(body, "chapterNumber"),
    state: readText(body, "state"),
    advisorName: readText(body, "advisorName", { required: true }),
    advisorEmail: validateAdvisorEmail(readText(body, "advisorEmail", { required: true })),
    maxMembers: readMaxMembers(body.maxMembers, 20),
    status,
    joinEnabled: status === "ACTIVE" ? requestedJoining : false,
    premiumActive,
    premiumExpiresAt: premiumActive ? premiumExpiresAt : null,
  };
}

function normalizeChapterPatchInput(body = {}, chapter = {}) {
  const current = {
    chapterName: chapter.chapter_name || chapter.chapterName || "",
    schoolName: chapter.school_name || chapter.schoolName || "",
    chapterNumber: chapter.chapter_number || chapter.chapterNumber || "",
    state: chapter.state || "",
    advisorName: chapter.advisor_name || chapter.advisorName || "",
    advisorEmail: chapter.advisor_email || chapter.advisorEmail || "",
    maxMembers: Number(chapter.max_members ?? chapter.maxMembers) || 20,
    status: String(chapter.status || "ACTIVE").toUpperCase(),
    joinEnabled: chapter.join_enabled === true || chapter.joinEnabled === true,
    premiumActive: chapter.premium_active === true || chapter.premiumActive === true,
    premiumExpiresAt: chapter.premium_expires_at || chapter.premiumExpiresAt || null,
  };
  const touchesPremium = hasOwn(body, "premiumActive") || hasOwn(body, "premiumExpiresAt");
  const status = readStatus(body.status, current.status);
  const premiumActive = readBoolean(body, "premiumActive", current.premiumActive);
  const premiumExpiresAt = readExpiration(body.premiumExpiresAt, current.premiumExpiresAt);
  const requestedJoining = readBoolean(body, "joinEnabled", current.joinEnabled);

  if (
    touchesPremium &&
    premiumActive &&
    (!premiumExpiresAt || Date.parse(premiumExpiresAt) <= Date.now())
  ) {
    throw validationError("Active chapter Premium requires a future expiration date.");
  }

  const requestedAdvisorEmail = hasOwn(body, "advisorEmail")
    ? validateAdvisorEmail(readText(body, "advisorEmail", { required: true }))
    : current.advisorEmail;
  if (requestedAdvisorEmail.toLowerCase() !== current.advisorEmail.toLowerCase()) {
    throw validationError("Advisor email cannot be changed without transferring the Clerk advisor membership.");
  }

  return {
    chapterName: hasOwn(body, "chapterName")
      ? readText(body, "chapterName", { required: true })
      : current.chapterName,
    schoolName: hasOwn(body, "schoolName")
      ? readText(body, "schoolName")
      : current.schoolName,
    chapterNumber: hasOwn(body, "chapterNumber")
      ? readText(body, "chapterNumber")
      : current.chapterNumber,
    state: hasOwn(body, "state") ? readText(body, "state") : current.state,
    advisorName: hasOwn(body, "advisorName")
      ? readText(body, "advisorName", { required: true })
      : current.advisorName,
    advisorEmail: current.advisorEmail,
    maxMembers: readMaxMembers(body.maxMembers, current.maxMembers),
    status,
    joinEnabled: status === "ACTIVE" ? requestedJoining : false,
    premiumActive,
    premiumExpiresAt,
  };
}

function parseChapterId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getOrganizationId(chapter = {}) {
  return chapter.clerk_org_id || chapter.clerkOrgId || "";
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

function asMembershipArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
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

function normalizeMemberCount(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (Number.isFinite(Number(value?.totalCount))) return Number(value.totalCount);
  if (Number.isFinite(Number(value?.total_count))) return Number(value.total_count);
  return null;
}

function hasCanonicalAdvisorMembership(chapter = {}, memberships = []) {
  const advisorUserId = asTrimmedString(
    chapter.advisor_clerk_user_id || chapter.advisorClerkUserId
  );
  if (!advisorUserId) return false;
  return asMembershipArray(memberships).some((membership) => (
    membership.role === "org:admin" && getMembershipUserId(membership) === advisorUserId
  ));
}

function serializeAdminChapter(chapter, { includeJoinCode = false, memberCount, clerkAvailable = true } = {}) {
  const serialized = { ...(serializeChapterForMember(chapter, { role: "org:admin" }) || {}) };
  if (includeJoinCode) {
    serialized.joinCode = chapter.join_code || chapter.joinCode || "";
  } else {
    delete serialized.joinCode;
    delete serialized.join_code;
  }

  return {
    ...serialized,
    ...(memberCount === undefined ? {} : { memberCount }),
    maxMembers: Number(chapter.max_members ?? chapter.maxMembers) || 20,
    premiumCurrent: isChapterPremiumCurrent(chapter),
    clerkOrganizationAvailable: clerkAvailable,
  };
}

function setPrivateNoStore(res) {
  res.set("Cache-Control", "private, no-store");
}

function safeErrorSummary(error) {
  return {
    code: error?.code || error?.errors?.[0]?.code || "",
    status: error?.status || error?.statusCode || "",
    message: error?.message || "Unknown error",
  };
}

function isClerkOrganizationNotFound(error) {
  const status = Number(error?.status || error?.statusCode);
  const code = asTrimmedString(error?.code || error?.errors?.[0]?.code).toLowerCase();
  return status === 404 || code === "resource_not_found" || code === "organization_not_found";
}

function sendValidationError(res, error) {
  if (error?.isValidationError) {
    return res.status(error.status || 400).json({ error: error.message });
  }
  return null;
}

function getAdvisorInviteRedirectUrl() {
  const baseUrl = env.clientUrls?.[0] || env.clientUrl;
  try {
    const redirectUrl = new URL("/login", baseUrl);
    redirectUrl.searchParams.set("returnTo", "/advisor");
    return redirectUrl.toString();
  } catch {
    return "";
  }
}

async function findChapter(id) {
  const result = await pool.query("SELECT * FROM ffa_chapters WHERE id = $1", [id]);
  return result.rows[0] || null;
}

function sameNullableTimestamp(left, right) {
  if ((left === null || left === undefined || left === "") &&
      (right === null || right === undefined || right === "")) return true;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
}

function chapterMatchesUpdateInput(chapter = {}, input = {}) {
  return Boolean(
    chapter.chapter_name === input.chapterName &&
    (chapter.school_name || "") === input.schoolName &&
    (chapter.chapter_number || "") === input.chapterNumber &&
    (chapter.state || "") === input.state &&
    chapter.advisor_name === input.advisorName &&
    chapter.advisor_email === input.advisorEmail &&
    Number(chapter.max_members) === input.maxMembers &&
    String(chapter.status || "").toUpperCase() === input.status &&
    chapter.join_enabled === input.joinEnabled &&
    chapter.premium_active === input.premiumActive &&
    sameNullableTimestamp(chapter.premium_expires_at, input.premiumExpiresAt)
  );
}

function buildClerkReconciliationPatch(chapter = {}, attemptedClerkPatch = {}) {
  const patch = {};
  if (hasOwn(attemptedClerkPatch, "name")) patch.name = chapter.chapter_name;
  if (hasOwn(attemptedClerkPatch, "maxAllowedMemberships")) {
    patch.maxAllowedMemberships = Number(chapter.max_members);
  }
  return patch;
}

async function reconcileClerkOrganizationFromDurableChapter({
  chapterId,
  attemptedClerkPatch,
  findChapterById = findChapter,
  updateOrganization = (organizationId, patch) => (
    clerkClient.organizations.updateOrganization(organizationId, patch)
  ),
} = {}) {
  let durableChapter;
  try {
    durableChapter = await findChapterById(chapterId);
  } catch (error) {
    return { ok: false, stage: "database_read", error };
  }
  if (!durableChapter) return { ok: false, stage: "chapter_missing" };

  const clerkPatch = buildClerkReconciliationPatch(durableChapter, attemptedClerkPatch);
  if (Object.keys(clerkPatch).length) {
    try {
      await updateOrganization(getOrganizationId(durableChapter), clerkPatch);
    } catch (error) {
      return { ok: false, stage: "clerk_update", error, durableChapter, clerkPatch };
    }
  }

  return { ok: true, durableChapter, clerkPatch };
}

async function getSafeMemberCount(chapter) {
  try {
    return {
      memberCount: normalizeMemberCount(await getOrganizationMemberCount(getOrganizationId(chapter))),
      clerkAvailable: true,
    };
  } catch (error) {
    console.warn("Could not load an FFA chapter member count:", {
      chapterId: chapter.id,
      ...safeErrorSummary(error),
    });
    return { memberCount: null, clerkAvailable: false };
  }
}

async function logFfaAdminActivity(req, action, details) {
  try {
    await logAdminActivity({ userId: req.user.id, action, details });
  } catch (error) {
    console.warn("Could not log an FFA chapter admin action:", safeErrorSummary(error));
  }
}

router.use(authMiddleware, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM ffa_chapters ORDER BY chapter_name ASC, id ASC"
    );
    const chapters = await Promise.all(
      result.rows.map(async (chapter) => {
        const count = await getSafeMemberCount(chapter);
        return serializeAdminChapter(chapter, {
          memberCount: count.memberCount,
          clerkAvailable: count.clerkAvailable,
        });
      })
    );
    return res.json({ chapters });
  } catch (error) {
    console.warn("Could not list FFA chapters:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not load FFA chapters. Please try again." });
  }
});

router.post("/", async (req, res) => {
  setPrivateNoStore(res);
  let input;
  try {
    input = normalizeChapterCreateInput(req.body);
  } catch (error) {
    return sendValidationError(res, error);
  }

  let organization = null;
  let client = null;
  let transactionOpen = false;
  let commitAttempted = false;
  let committed = false;
  try {
    const joinCode = await generateUniqueJoinCode(pool);
    organization = await clerkClient.organizations.createOrganization({
      name: input.chapterName,
      maxAllowedMemberships: input.maxMembers,
    });
    organization = await clerkClient.organizations.updateOrganization(organization.id, {
      adminDeleteEnabled: false,
    });

    client = await pool.connect();
    await client.query("BEGIN");
    transactionOpen = true;
    const result = await client.query(
      `INSERT INTO ffa_chapters
        (clerk_org_id, chapter_name, school_name, chapter_number, state,
         advisor_name, advisor_email, max_members, status, join_enabled,
         join_code, join_code_created_at, premium_active, premium_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
               CURRENT_TIMESTAMP, $12, $13)
       RETURNING *`,
      [
        organization.id,
        input.chapterName,
        input.schoolName,
        input.chapterNumber,
        input.state,
        input.advisorName,
        input.advisorEmail,
        input.maxMembers,
        input.status,
        input.joinEnabled,
        joinCode,
        input.premiumActive,
        input.premiumExpiresAt,
      ]
    );
    const chapter = result.rows[0];
    const redirectUrl = getAdvisorInviteRedirectUrl();
    await clerkClient.organizations.createOrganizationInvitation({
      organizationId: organization.id,
      emailAddress: input.advisorEmail,
      role: "org:admin",
      ...(redirectUrl ? { redirectUrl } : {}),
    });
    commitAttempted = true;
    await client.query("COMMIT");
    transactionOpen = false;
    committed = true;

    await logFfaAdminActivity(req, "ffa_chapter_created", {
      chapterId: chapter.id,
      chapterName: chapter.chapter_name,
    });
    return res.status(201).json({
      chapter: serializeAdminChapter(chapter, { includeJoinCode: true, memberCount: 0 }),
      joinCode: chapter.join_code,
      message: "FFA chapter created and advisor invitation sent.",
    });
  } catch (error) {
    if (transactionOpen && client) await client.query("ROLLBACK").catch(() => {});
    let cleanupIsSafe = true;
    if (organization && !committed && commitAttempted) {
      try {
        const recovery = await pool.query(
          "SELECT * FROM ffa_chapters WHERE clerk_org_id = $1 LIMIT 1",
          [organization.id]
        );
        const recoveredChapter = recovery.rows[0];
        if (recoveredChapter) {
          committed = true;
          await logFfaAdminActivity(req, "ffa_chapter_created", {
            chapterId: recoveredChapter.id,
            chapterName: recoveredChapter.chapter_name,
            recoveredAfterCommit: true,
          });
          return res.status(201).json({
            chapter: serializeAdminChapter(recoveredChapter, { includeJoinCode: true, memberCount: 0 }),
            joinCode: recoveredChapter.join_code,
            message: "FFA chapter created and advisor invitation sent.",
          });
        }
      } catch (recoveryError) {
        cleanupIsSafe = false;
        console.error("Could not determine whether the FFA chapter transaction committed:", {
          ...safeErrorSummary(recoveryError),
        });
      }
    }
    if (organization && !committed && cleanupIsSafe) {
      try {
        await clerkClient.organizations.deleteOrganization(organization.id);
      } catch (cleanupError) {
        console.error("Could not clean up an orphaned Clerk organization:", {
          clerkOrgId: organization.id,
          ...safeErrorSummary(cleanupError),
        });
      }
    }
    console.warn("Could not create an FFA chapter:", safeErrorSummary(error));
    if (error?.code === "23505") {
      return res.status(409).json({ error: "That FFA chapter conflicts with an existing chapter." });
    }
    return res.status(502).json({
      error: "BarnBuddy could not create the chapter and advisor invitation. Please try again.",
    });
  } finally {
    if (client) client.release();
  }
});

router.get("/:id", async (req, res) => {
  setPrivateNoStore(res);
  const chapterId = parseChapterId(req.params.id);
  if (!chapterId) return res.status(400).json({ error: "A valid chapter ID is required." });

  try {
    const chapter = await findChapter(chapterId);
    if (!chapter) return res.status(404).json({ error: "FFA chapter not found" });
    const count = await getSafeMemberCount(chapter);
    return res.json({
      chapter: serializeAdminChapter(chapter, {
        includeJoinCode: true,
        memberCount: count.memberCount,
        clerkAvailable: count.clerkAvailable,
      }),
    });
  } catch (error) {
    console.warn("Could not load an FFA chapter:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not load that FFA chapter. Please try again." });
  }
});

router.patch("/:id", async (req, res) => {
  setPrivateNoStore(res);
  const chapterId = parseChapterId(req.params.id);
  if (!chapterId) return res.status(400).json({ error: "A valid chapter ID is required." });

  let chapter;
  let input;
  try {
    chapter = await findChapter(chapterId);
    if (!chapter) return res.status(404).json({ error: "FFA chapter not found" });
    input = normalizeChapterPatchInput(req.body, chapter);
  } catch (error) {
    if (sendValidationError(res, error)) return;
    console.warn("Could not validate an FFA chapter update:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not update that FFA chapter. Please try again." });
  }

  const clerkPatch = {};
  if (input.chapterName !== chapter.chapter_name) clerkPatch.name = input.chapterName;
  if (input.maxMembers !== Number(chapter.max_members)) {
    if (input.maxMembers < Number(chapter.max_members)) {
      try {
        const memberships = asMembershipArray(
          await getAllOrganizationMemberships(getOrganizationId(chapter))
        );
        const reservedAdvisorSeats = hasCanonicalAdvisorMembership(chapter, memberships) ? 0 : 1;
        const minimumCapacity = memberships.length + reservedAdvisorSeats;
        if (minimumCapacity > input.maxMembers) {
          return res.status(409).json({
            error: reservedAdvisorSeats
              ? "Maximum members must keep one seat available for the chapter advisor."
              : "Maximum members cannot be lower than the chapter's current membership.",
          });
        }
      } catch (error) {
        console.warn("Could not verify FFA membership before changing the limit:", safeErrorSummary(error));
        return res.status(502).json({
          error: "BarnBuddy could not verify the current membership limit. Please try again.",
        });
      }
    }
    clerkPatch.maxAllowedMemberships = input.maxMembers;
  }

  let clerkUpdated = false;
  let databaseUpdateAttempted = false;
  try {
    if (Object.keys(clerkPatch).length) {
      await clerkClient.organizations.updateOrganization(getOrganizationId(chapter), clerkPatch);
      clerkUpdated = true;
    }

    databaseUpdateAttempted = true;
    const result = await pool.query(
      `UPDATE ffa_chapters
       SET chapter_name = $1,
           school_name = $2,
           chapter_number = $3,
           state = $4,
           advisor_name = $5,
           advisor_email = $6,
           max_members = $7,
           status = $8,
           join_enabled = $9,
           premium_active = $10,
           premium_expires_at = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        input.chapterName,
        input.schoolName,
        input.chapterNumber,
        input.state,
        input.advisorName,
        input.advisorEmail,
        input.maxMembers,
        input.status,
        input.joinEnabled,
        input.premiumActive,
        input.premiumExpiresAt,
        chapterId,
      ]
    );
    const updated = result.rows[0];
    const count = await getSafeMemberCount(updated);
    await logFfaAdminActivity(req, "ffa_chapter_updated", {
      chapterId,
      chapterName: updated.chapter_name,
      status: updated.status,
      joinEnabled: updated.join_enabled,
      premiumActive: updated.premium_active,
      premiumExpiresAt: updated.premium_expires_at,
      maxMembers: updated.max_members,
    });
    return res.json({
      chapter: serializeAdminChapter(updated, {
        includeJoinCode: true,
        memberCount: count.memberCount,
        clerkAvailable: count.clerkAvailable,
      }),
    });
  } catch (error) {
    if (databaseUpdateAttempted) {
      const reconciliation = await reconcileClerkOrganizationFromDurableChapter({
        chapterId,
        attemptedClerkPatch: clerkUpdated ? clerkPatch : {},
      });
      if (!reconciliation.ok) {
        console.error("FFA chapter update requires manual reconciliation:", {
          chapterId,
          stage: reconciliation.stage,
          ...safeErrorSummary(reconciliation.error),
        });
        return res.status(503).json({
          error: "BarnBuddy could not verify the final chapter state. Reload before retrying.",
          code: "FFA_CHAPTER_RECONCILIATION_REQUIRED",
        });
      }

      if (chapterMatchesUpdateInput(reconciliation.durableChapter, input)) {
        const count = await getSafeMemberCount(reconciliation.durableChapter);
        await logFfaAdminActivity(req, "ffa_chapter_updated", {
          chapterId,
          chapterName: reconciliation.durableChapter.chapter_name,
          recoveredAfterDatabaseError: true,
        });
        return res.json({
          chapter: serializeAdminChapter(reconciliation.durableChapter, {
            includeJoinCode: true,
            memberCount: count.memberCount,
            clerkAvailable: count.clerkAvailable,
          }),
        });
      }
    }
    console.warn("Could not update an FFA chapter:", safeErrorSummary(error));
    return res.status(502).json({ error: "BarnBuddy could not update that FFA chapter. Please try again." });
  }
});

router.delete("/:id", async (req, res) => {
  setPrivateNoStore(res);
  const chapterId = parseChapterId(req.params.id);
  if (!chapterId) return res.status(400).json({ error: "A valid chapter ID is required." });

  let chapter;
  try {
    chapter = await findChapter(chapterId);
  } catch (error) {
    console.warn("Could not load an FFA chapter for deletion:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not load that FFA chapter. Please try again." });
  }
  if (!chapter) return res.status(404).json({ error: "FFA chapter not found" });

  const organizationId = getOrganizationId(chapter);
  try {
    await clerkClient.organizations.deleteOrganization(organizationId);
  } catch (error) {
    if (!isClerkOrganizationNotFound(error)) {
      console.warn("Could not delete the Clerk Organization for an FFA chapter:", {
        chapterId,
        ...safeErrorSummary(error),
      });
      return res.status(502).json({
        error: "BarnBuddy could not delete the connected Clerk Organization. Nothing was removed from BarnBuddy.",
      });
    }
  }

  try {
    await pool.query(
      "DELETE FROM ffa_chapters WHERE id = $1 AND clerk_org_id = $2",
      [chapterId, organizationId]
    );
    invalidateAllUserMembershipCaches();
    await logFfaAdminActivity(req, "ffa_chapter_deleted", {
      chapterId,
      chapterName: chapter.chapter_name,
    });
    return res.json({
      deleted: true,
      chapterId,
      message: `${chapter.chapter_name} was permanently deleted.`,
    });
  } catch (error) {
    console.error("Clerk Organization deleted but BarnBuddy chapter cleanup failed:", {
      chapterId,
      ...safeErrorSummary(error),
    });
    return res.status(503).json({
      error: "The Clerk Organization was removed, but BarnBuddy cleanup needs to be retried.",
      code: "FFA_CHAPTER_DELETE_RETRY_REQUIRED",
    });
  }
});

router.post("/:id/join-code/regenerate", async (req, res) => {
  setPrivateNoStore(res);
  const chapterId = parseChapterId(req.params.id);
  if (!chapterId) return res.status(400).json({ error: "A valid chapter ID is required." });

  try {
    const chapter = await findChapter(chapterId);
    if (!chapter) return res.status(404).json({ error: "FFA chapter not found" });
    const joinCode = await generateUniqueJoinCode(pool);
    const result = await pool.query(
      `UPDATE ffa_chapters
       SET join_code = $1,
           join_code_created_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [joinCode, chapterId]
    );
    const updated = result.rows[0];
    await logFfaAdminActivity(req, "ffa_chapter_join_code_regenerated", { chapterId });
    return res.json({
      chapter: serializeAdminChapter(updated, { includeJoinCode: true }),
      joinCode: updated.join_code,
      message: "A new chapter code is active. The old code no longer works.",
    });
  } catch (error) {
    console.warn("Could not regenerate an FFA chapter code:", safeErrorSummary(error));
    return res.status(500).json({ error: "BarnBuddy could not regenerate the chapter code. Please try again." });
  }
});

router.get("/:id/members", async (req, res) => {
  setPrivateNoStore(res);
  const chapterId = parseChapterId(req.params.id);
  if (!chapterId) return res.status(400).json({ error: "A valid chapter ID is required." });

  try {
    const chapter = await findChapter(chapterId);
    if (!chapter) return res.status(404).json({ error: "FFA chapter not found" });
    const memberships = asMembershipArray(
      await getAllOrganizationMemberships(getOrganizationId(chapter))
    );
    return res.json({
      members: memberships.map(serializeMembership),
      memberCount: memberships.length,
      maxMembers: Number(chapter.max_members) || 20,
    });
  } catch (error) {
    console.warn("Could not load FFA chapter members:", safeErrorSummary(error));
    return res.status(502).json({ error: "BarnBuddy could not load chapter members. Please try again." });
  }
});

router.delete("/:id/members/:userId", async (req, res) => {
  const chapterId = parseChapterId(req.params.id);
  const targetUserId = asTrimmedString(req.params.userId);
  if (!chapterId) return res.status(400).json({ error: "A valid chapter ID is required." });
  if (!targetUserId || targetUserId.length > 200) {
    return res.status(400).json({ error: "A valid chapter member is required." });
  }

  try {
    const chapter = await findChapter(chapterId);
    if (!chapter) return res.status(404).json({ error: "FFA chapter not found" });
    const memberships = asMembershipArray(
      await getAllOrganizationMemberships(getOrganizationId(chapter))
    );
    const membership = memberships.find((item) => getMembershipUserId(item) === targetUserId);
    if (!membership) return res.status(404).json({ error: "Chapter member not found" });
    if (membership.role !== "org:member") {
      return res.status(403).json({ error: "Advisor memberships cannot be removed here." });
    }

    await removeChapterMemberAndClearProjectShares({
      chapterId,
      clerkUserId: targetUserId,
      deleteMembership: () => clerkClient.organizations.deleteOrganizationMembership({
        organizationId: getOrganizationId(chapter),
        userId: targetUserId,
      }),
    });
    await invalidateUserMembershipCache(targetUserId);
    await logFfaAdminActivity(req, "ffa_chapter_member_removed", {
      chapterId,
      memberUserId: targetUserId,
    });
    return res.json({ removed: true, userId: targetUserId });
  } catch (error) {
    console.warn("Could not remove an FFA chapter member:", safeErrorSummary(error));
    return res.status(502).json({ error: "BarnBuddy could not remove that chapter member. Please try again." });
  }
});

module.exports = router;
module.exports.buildClerkReconciliationPatch = buildClerkReconciliationPatch;
module.exports.chapterMatchesUpdateInput = chapterMatchesUpdateInput;
module.exports.getAdvisorInviteRedirectUrl = getAdvisorInviteRedirectUrl;
module.exports.hasCanonicalAdvisorMembership = hasCanonicalAdvisorMembership;
module.exports.isClerkOrganizationNotFound = isClerkOrganizationNotFound;
module.exports.normalizeChapterCreateInput = normalizeChapterCreateInput;
module.exports.normalizeChapterPatchInput = normalizeChapterPatchInput;
module.exports.reconcileClerkOrganizationFromDurableChapter = reconcileClerkOrganizationFromDurableChapter;
module.exports.serializeMembership = serializeMembership;

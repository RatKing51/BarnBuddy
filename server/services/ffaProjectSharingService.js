const crypto = require("node:crypto");
const pool = require("../data-source");
const { ensureFfaProjectSharingSchema } = require("./ensureFfaProjectSharingSchema");
const { getUserFfaAccess } = require("./ffaChapterService");

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const SHARE_TOKEN_BYTES = 24;

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getChapterId(chapter = {}) {
  const id = Number(chapter.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getMembershipRole(entry = {}) {
  return asTrimmedString(
    entry.role || entry.membershipRole || entry.membership?.role
  ).toLowerCase();
}

function generateAdvisorShareToken(randomBytes = crypto.randomBytes) {
  const bytes = randomBytes(SHARE_TOKEN_BYTES);
  if (!bytes || typeof bytes.length !== "number" || bytes.length < SHARE_TOKEN_BYTES) {
    throw new TypeError("The secure random source did not return enough bytes.");
  }
  const token = Buffer.from(bytes).subarray(0, SHARE_TOKEN_BYTES).toString("base64url");
  if (!SHARE_TOKEN_PATTERN.test(token)) {
    throw new TypeError("The secure random source produced an invalid share token.");
  }
  return token;
}

function normalizeAdvisorShareToken(value) {
  const token = asTrimmedString(value);
  return SHARE_TOKEN_PATTERN.test(token) ? token : "";
}

function getExactStudentEntry(ffaAccess = {}) {
  const entries = Array.isArray(ffaAccess?.accesses) ? ffaAccess.accesses : [];
  const studentsByChapter = new Map();
  for (const entry of entries) {
    const chapter = entry?.chapter || null;
    const chapterId = getChapterId(chapter);
    if (!chapterId || getMembershipRole(entry) !== "org:member") continue;
    studentsByChapter.set(chapterId, { ...entry, chapter, role: "org:member" });
  }

  if (studentsByChapter.size === 0) return { status: "none", entry: null };
  if (studentsByChapter.size !== 1) return { status: "ambiguous", entry: null };
  return { status: "ok", entry: [...studentsByChapter.values()][0] };
}

async function getExactCurrentStudentEntry(clerkUserId, options = {}) {
  const loadAccess = options.loadAccess || ((userId) => getUserFfaAccess(userId, {
    forceRefresh: true,
  }));
  const access = await loadAccess(clerkUserId);
  return getExactStudentEntry(access);
}

function toIsoStringOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const milliseconds = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function dateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function serializeStudentSharingStatus({ chapter = null, share = null, eligible = false } = {}) {
  const chapterName = asTrimmedString(chapter?.chapter_name ?? chapter?.chapterName);
  const chapterEnabled = chapter?.project_sharing_enabled === true || chapter?.projectSharingEnabled === true;
  const active = asTrimmedString(chapter?.status).toUpperCase() === "ACTIVE";

  return {
    eligible: Boolean(eligible && chapter && active && chapterEnabled),
    chapterName,
    chapterEnabled: Boolean(chapterEnabled && active),
    shared: Boolean(share),
    sharedAt: share ? toIsoStringOrNull(share.shared_at ?? share.sharedAt) : null,
  };
}

function serializeSharedProjectSummary(row = {}) {
  const income = numberOrZero(row.income);
  const expenses = numberOrZero(row.expenses);
  return {
    animalCount: Math.max(0, Math.trunc(numberOrZero(row.animal_count))),
    totalMinutes: Math.max(0, Math.trunc(numberOrZero(row.total_minutes))),
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    profit: Math.round((income - expenses) * 100) / 100,
  };
}

function serializeSharedProjectListRow(row = {}) {
  return {
    shareId: normalizeAdvisorShareToken(row.share_token),
    sharedAt: toIsoStringOrNull(row.shared_at),
    project: {
      name: asTrimmedString(row.name),
      schoolYear: asTrimmedString(row.school_year),
      saeType: asTrimmedString(row.sae_type),
      status: asTrimmedString(row.status),
      updatedAt: toIsoStringOrNull(row.updated_at),
    },
    summary: serializeSharedProjectSummary(row),
  };
}

function serializeSharedProjectDetails({ project = {}, animals = [], activities = [], finances = [] } = {}) {
  return {
    shareId: normalizeAdvisorShareToken(project.share_token),
    sharedAt: toIsoStringOrNull(project.shared_at),
    project: {
      name: asTrimmedString(project.name),
      schoolYear: asTrimmedString(project.school_year),
      saeType: asTrimmedString(project.sae_type),
      chapterName: asTrimmedString(project.chapter_name),
      advisorName: asTrimmedString(project.advisor_name),
      description: asTrimmedString(project.description),
      startDate: dateOnly(project.start_date),
      endDate: dateOnly(project.end_date),
      status: asTrimmedString(project.status),
      goals: Array.isArray(project.goals)
        ? project.goals.filter((goal) => typeof goal === "string").slice(0, 12)
        : [],
      createdAt: toIsoStringOrNull(project.created_at),
      updatedAt: toIsoStringOrNull(project.updated_at),
    },
    summary: serializeSharedProjectSummary(project),
    animals: animals.map((animal) => ({
      animalName: asTrimmedString(animal.animal_name),
      species: asTrimmedString(animal.species),
      tagId: asTrimmedString(animal.tag_id),
      startingWeight: animal.starting_weight === null ? null : numberOrZero(animal.starting_weight),
      startingValue: numberOrZero(animal.starting_value),
      ownershipPercentage: numberOrZero(animal.ownership_percentage),
      recordsFromDate: dateOnly(animal.records_from_date),
      createdAt: toIsoStringOrNull(animal.created_at),
      updatedAt: toIsoStringOrNull(animal.updated_at),
    })),
    activities: activities.map((activity) => ({
      animalName: asTrimmedString(activity.animal_name),
      activityDate: dateOnly(activity.activity_date),
      category: asTrimmedString(activity.category),
      title: asTrimmedString(activity.title),
      description: asTrimmedString(activity.description),
      durationMinutes: Math.max(0, Math.trunc(numberOrZero(activity.duration_minutes))),
      skillsLearned: asTrimmedString(activity.skills_learned),
      reflection: asTrimmedString(activity.reflection),
      createdAt: toIsoStringOrNull(activity.created_at),
      updatedAt: toIsoStringOrNull(activity.updated_at),
    })),
    finances: finances.map((finance) => ({
      animalName: asTrimmedString(finance.animal_name),
      transactionDate: dateOnly(finance.transaction_date),
      transactionType: asTrimmedString(finance.transaction_type),
      category: asTrimmedString(finance.category),
      amount: numberOrZero(finance.amount),
      vendor: asTrimmedString(finance.vendor),
      notes: asTrimmedString(finance.notes),
      createdAt: toIsoStringOrNull(finance.created_at),
      updatedAt: toIsoStringOrNull(finance.updated_at),
    })),
  };
}

function serializeOwnedAdvisorShareRow(row = {}) {
  const projectId = Number(row.project_id);
  return {
    projectId: Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null,
    name: asTrimmedString(row.name),
    chapterName: asTrimmedString(row.chapter_name),
    sharedAt: toIsoStringOrNull(row.shared_at),
  };
}

async function upsertProjectAdvisorShare({ projectId, chapterId, queryable = pool, tokenGenerator } = {}) {
  const generateToken = tokenGenerator || generateAdvisorShareToken;
  const token = generateToken();
  // At 192 random bits a token collision is not a realistic recovery path.
  // Let a uniqueness error abort the caller's transaction cleanly; retrying a
  // statement after 23505 without a savepoint would leave PostgreSQL aborted.
  const result = await queryable.query(
    `INSERT INTO ffa_project_advisor_shares (project_id, chapter_id, share_token)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id) DO UPDATE
     SET chapter_id = EXCLUDED.chapter_id,
         share_token = CASE
           WHEN ffa_project_advisor_shares.chapter_id = EXCLUDED.chapter_id
             THEN ffa_project_advisor_shares.share_token
           ELSE EXCLUDED.share_token
         END,
         shared_at = CASE
           WHEN ffa_project_advisor_shares.chapter_id = EXCLUDED.chapter_id
             THEN ffa_project_advisor_shares.shared_at
           ELSE CURRENT_TIMESTAMP
         END
     RETURNING share_token, shared_at`,
    [projectId, chapterId, token]
  );
  return result.rows[0] || null;
}

async function clearProjectSharesForChapterMember(chapterId, clerkUserId, queryable = pool) {
  if (queryable === pool) await ensureFfaProjectSharingSchema();
  const result = await queryable.query(
    `DELETE FROM ffa_project_advisor_shares consent
     USING ffa_projects project, users account
     WHERE consent.project_id = project.id
       AND consent.chapter_id = $1
       AND project.user_id = account.id
       AND account.clerk_user_id = $2`,
    [chapterId, clerkUserId]
  );
  return Number(result.rowCount) || 0;
}

async function clearAllChapterProjectShares(chapterId, queryable = pool) {
  if (queryable === pool) await ensureFfaProjectSharingSchema();
  const result = await queryable.query(
    "DELETE FROM ffa_project_advisor_shares WHERE chapter_id = $1",
    [chapterId]
  );
  return Number(result.rowCount) || 0;
}

async function removeChapterMemberAndClearProjectShares({
  chapterId,
  clerkUserId,
  deleteMembership,
  database = pool,
} = {}) {
  if (!Number.isSafeInteger(Number(chapterId)) || Number(chapterId) < 1) {
    throw new TypeError("A valid chapter ID is required.");
  }
  if (!asTrimmedString(clerkUserId)) {
    throw new TypeError("A Clerk user ID is required.");
  }
  if (typeof deleteMembership !== "function") {
    throw new TypeError("A Clerk membership deletion callback is required.");
  }
  if (database === pool) await ensureFfaProjectSharingSchema();

  // Revoke any existing consent before changing Clerk. Opt-in serializes on
  // the chapter row; the post-Clerk locked clear below catches an opt-in that
  // won the interval between this safe pre-clear and membership deletion.
  await clearProjectSharesForChapterMember(chapterId, clerkUserId, database);
  await deleteMembership();

  let client;
  try {
    client = await database.connect();
    await client.query("BEGIN");
    await client.query(
      "SELECT id FROM ffa_chapters WHERE id = $1 FOR UPDATE",
      [chapterId]
    );
    const cleared = await clearProjectSharesForChapterMember(chapterId, clerkUserId, client);
    await client.query("COMMIT");
    return cleared;
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    // Clerk removal already succeeded. Make a final best-effort privacy cleanup
    // outside the failed transaction before surfacing the operation failure.
    await clearProjectSharesForChapterMember(chapterId, clerkUserId, database).catch(() => {});
    throw error;
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  SHARE_TOKEN_PATTERN,
  clearAllChapterProjectShares,
  clearProjectSharesForChapterMember,
  generateAdvisorShareToken,
  getExactCurrentStudentEntry,
  getExactStudentEntry,
  normalizeAdvisorShareToken,
  removeChapterMemberAndClearProjectShares,
  serializeSharedProjectDetails,
  serializeSharedProjectListRow,
  serializeOwnedAdvisorShareRow,
  serializeStudentSharingStatus,
  upsertProjectAdvisorShare,
};

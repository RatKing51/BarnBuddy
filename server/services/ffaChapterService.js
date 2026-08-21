const crypto = require("node:crypto");
const { clerkClient } = require("@clerk/express");
const pool = require("../data-source");
const { ensureFfaChapterSchema } = require("./ensureFfaChapterSchema");

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 12;
const JOIN_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/;
const CLERK_PAGE_SIZE = 500;
const MEMBERSHIP_CACHE_TTL_MS = 30_000;
const MEMBERSHIP_CACHE_MAX_ENTRIES = 1_000;
const userMembershipCache = new Map();

const FFA_ACCESS_COLUMNS = `
  id,
  clerk_org_id,
  chapter_name,
  school_name,
  chapter_number,
  state,
  advisor_name,
  advisor_email,
  advisor_clerk_user_id,
  max_members,
  status,
  join_enabled,
  project_sharing_enabled,
  premium_active,
  premium_expires_at,
  created_at,
  updated_at
`;

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getNowMilliseconds(now = Date.now()) {
  const value = typeof now === "function" ? now() : now;
  const parsed = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function formatJoinCode(compactCode) {
  const compact = asTrimmedString(compactCode).toUpperCase();
  if (!JOIN_CODE_PATTERN.test(compact)) return "";
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
}

function normalizeJoinCode(value) {
  const compact = asTrimmedString(value)
    .toUpperCase()
    .replace(/[\s-]+/g, "");
  return formatJoinCode(compact);
}

function generateJoinCode(randomBytes = crypto.randomBytes) {
  const bytes = randomBytes(JOIN_CODE_LENGTH);
  if (!bytes || typeof bytes.length !== "number" || bytes.length < JOIN_CODE_LENGTH) {
    throw new TypeError("The secure random source did not return enough bytes.");
  }

  let compact = "";
  for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
    // The alphabet has exactly 32 characters, so this mapping introduces no modulo bias.
    compact += JOIN_CODE_ALPHABET[bytes[index] & 31];
  }
  return formatJoinCode(compact);
}

function getQueryable(queryable) {
  if (typeof queryable === "function") return queryable;
  if (queryable && typeof queryable.query === "function") {
    return (text, values) => queryable.query(text, values);
  }
  throw new TypeError("A database query function or queryable client is required.");
}

async function generateUniqueJoinCode(queryable = pool, options = {}) {
  const query = getQueryable(queryable);
  const codeGenerator = options.codeGenerator || generateJoinCode;
  const maxAttempts = Number.isSafeInteger(options.maxAttempts) && options.maxAttempts > 0
    ? options.maxAttempts
    : 20;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = normalizeJoinCode(codeGenerator());
    if (!code) throw new TypeError("The chapter code generator returned an invalid code.");

    const result = await query(
      "SELECT 1 FROM ffa_chapters WHERE join_code = $1 LIMIT 1",
      [code]
    );
    const exists = Number(result?.rowCount) > 0 || (Array.isArray(result?.rows) && result.rows.length > 0);
    if (!exists) return code;
  }

  throw new Error("Unable to generate a unique chapter code.");
}

async function collectPaginatedResources(fetchPage, options = {}) {
  if (typeof fetchPage !== "function") throw new TypeError("A page fetcher is required.");

  const requestedPageSize = Number(options.pageSize);
  const pageSize = Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0
    ? Math.min(requestedPageSize, CLERK_PAGE_SIZE)
    : CLERK_PAGE_SIZE;
  const resources = [];
  let offset = 0;

  while (true) {
    const response = await fetchPage({ limit: pageSize, offset });
    if (!response || !Array.isArray(response.data)) {
      throw new TypeError("Clerk returned an invalid paginated response.");
    }

    const page = response.data;
    resources.push(...page);
    offset += page.length;

    const rawTotalCount = response.totalCount ?? response.total_count;
    const totalCount = Number(rawTotalCount);
    const hasTotalCount = Number.isFinite(totalCount) && totalCount >= 0;
    if (page.length === 0 || (hasTotalCount && offset >= totalCount)) break;
    if (!hasTotalCount && page.length < pageSize) break;
  }

  return resources;
}

function copyMemberships(memberships) {
  return Array.isArray(memberships) ? memberships.slice() : [];
}

function pruneUserMembershipCache(now) {
  for (const [userId, entry] of userMembershipCache) {
    if (!entry?.promise && entry?.expiresAt <= now) userMembershipCache.delete(userId);
  }

  while (userMembershipCache.size >= MEMBERSHIP_CACHE_MAX_ENTRIES) {
    const oldestUserId = userMembershipCache.keys().next().value;
    if (!oldestUserId) break;
    userMembershipCache.delete(oldestUserId);
  }
}

async function fetchAllUserMemberships(clerkUserId, client) {
  return collectPaginatedResources(({ limit, offset }) => (
    client.users.getOrganizationMembershipList({
      userId: clerkUserId,
      limit,
      offset,
    })
  ));
}

async function getAllUserMemberships(clerkUserId, options = {}) {
  const normalizedUserId = asTrimmedString(clerkUserId);
  if (!normalizedUserId) throw new TypeError("A Clerk user ID is required.");

  const client = options.clerkClient || clerkClient;
  const forceRefresh = options.forceRefresh === true;
  const now = getNowMilliseconds(options.now);
  const cached = userMembershipCache.get(normalizedUserId);
  if (!forceRefresh && cached && cached.expiresAt > now) {
    userMembershipCache.delete(normalizedUserId);
    userMembershipCache.set(normalizedUserId, cached);
    const memberships = cached.promise ? await cached.promise : cached.memberships;
    return copyMemberships(memberships);
  }

  if (cached) userMembershipCache.delete(normalizedUserId);
  pruneUserMembershipCache(now);
  const pending = fetchAllUserMemberships(normalizedUserId, client);
  const pendingEntry = {
    expiresAt: now + MEMBERSHIP_CACHE_TTL_MS,
    promise: pending,
  };
  userMembershipCache.set(normalizedUserId, pendingEntry);

  try {
    const memberships = await pending;
    if (userMembershipCache.get(normalizedUserId) === pendingEntry) {
      userMembershipCache.set(normalizedUserId, {
        expiresAt: getNowMilliseconds(options.now) + MEMBERSHIP_CACHE_TTL_MS,
        memberships: copyMemberships(memberships),
      });
    }
    return copyMemberships(memberships);
  } catch (error) {
    if (userMembershipCache.get(normalizedUserId) === pendingEntry) {
      userMembershipCache.delete(normalizedUserId);
    }
    throw error;
  }
}

function invalidateUserMembershipCache(clerkUserId) {
  const normalizedUserId = asTrimmedString(clerkUserId);
  return normalizedUserId ? userMembershipCache.delete(normalizedUserId) : false;
}

function invalidateAllUserMembershipCaches() {
  userMembershipCache.clear();
}

async function getAllOrganizationMemberships(organizationId, options = {}) {
  const normalizedOrganizationId = asTrimmedString(organizationId);
  if (!normalizedOrganizationId) throw new TypeError("A Clerk Organization ID is required.");

  const client = options.clerkClient || clerkClient;
  return collectPaginatedResources(({ limit, offset }) => (
    client.organizations.getOrganizationMembershipList({
      organizationId: normalizedOrganizationId,
      limit,
      offset,
      ...(options.role ? { role: Array.isArray(options.role) ? options.role : [options.role] } : {}),
    })
  ));
}

async function getOrganizationMemberCount(organizationId, options = {}) {
  const normalizedOrganizationId = asTrimmedString(organizationId);
  if (!normalizedOrganizationId) throw new TypeError("A Clerk Organization ID is required.");

  const client = options.clerkClient || clerkClient;
  const response = await client.organizations.getOrganizationMembershipList({
    organizationId: normalizedOrganizationId,
    limit: 1,
    offset: 0,
    ...(options.role ? { role: Array.isArray(options.role) ? options.role : [options.role] } : {}),
  });
  const totalCount = Number(response?.totalCount ?? response?.total_count);
  if (Number.isFinite(totalCount) && totalCount >= 0) return totalCount;
  return getAllOrganizationMemberships(normalizedOrganizationId, options).then((memberships) => memberships.length);
}

function getMembershipOrganizationId(membership) {
  return asTrimmedString(
    membership?.organization?.id ||
    membership?.organizationId ||
    membership?.organization_id
  );
}

function getMembershipRole(membership) {
  return asTrimmedString(membership?.role).toLowerCase();
}

function getMembershipUserId(membership = {}) {
  const publicUserData = membership.publicUserData || membership.public_user_data || {};
  return asTrimmedString(
    membership.userId ||
    membership.user_id ||
    publicUserData.userId ||
    publicUserData.user_id
  );
}

function getDateMilliseconds(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  return Date.parse(value);
}

function toIsoStringOrNull(value) {
  const milliseconds = getDateMilliseconds(value);
  return milliseconds !== null && Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : null;
}

function isChapterPremiumCurrent(chapter = {}, now = Date.now()) {
  const premiumActive = chapter.premium_active === true || chapter.premiumActive === true;
  if (!premiumActive) return false;

  const expiration = chapter.premium_expires_at ?? chapter.premiumExpiresAt;
  if (expiration === null || expiration === undefined || expiration === "") return true;
  const expiresAt = getDateMilliseconds(expiration);
  return Number.isFinite(expiresAt) && expiresAt > getNowMilliseconds(now);
}

function serializeChapterForMember(chapter = {}, options = {}) {
  const roleOption = typeof options === "string" ? options : options.role;
  const now = typeof options === "object" && options !== null ? options.now : undefined;
  const membershipRole = asTrimmedString(
    roleOption || chapter.membershipRole || chapter.membership_role || chapter.role
  ).toLowerCase();
  const premiumExpiration = chapter.premium_expires_at ?? chapter.premiumExpiresAt;
  const premiumActive = chapter.premium_active === true || chapter.premiumActive === true;
  const premiumCurrent = isChapterPremiumCurrent(chapter, now);

  return {
    id: chapter.id ?? null,
    chapterName: asTrimmedString(chapter.chapter_name ?? chapter.chapterName),
    schoolName: asTrimmedString(chapter.school_name ?? chapter.schoolName),
    chapterNumber: asTrimmedString(chapter.chapter_number ?? chapter.chapterNumber),
    state: asTrimmedString(chapter.state),
    advisorName: asTrimmedString(chapter.advisor_name ?? chapter.advisorName),
    advisorEmail: asTrimmedString(chapter.advisor_email ?? chapter.advisorEmail),
    maxMembers: Number(chapter.max_members ?? chapter.maxMembers) || 0,
    status: asTrimmedString(chapter.status).toUpperCase(),
    joinEnabled: chapter.join_enabled === true || chapter.joinEnabled === true,
    projectSharingEnabled: chapter.project_sharing_enabled === true || chapter.projectSharingEnabled === true,
    membershipRole,
    isAdvisor: membershipRole === "org:admin",
    premiumActive,
    premiumCurrent,
    premiumExpiresAt: toIsoStringOrNull(premiumExpiration),
    createdAt: toIsoStringOrNull(chapter.created_at ?? chapter.createdAt),
    updatedAt: toIsoStringOrNull(chapter.updated_at ?? chapter.updatedAt),
  };
}

function compareChapterEntries(left, right) {
  const leftActive = asTrimmedString(left?.chapter?.status).toUpperCase() === "ACTIVE" ? 0 : 1;
  const rightActive = asTrimmedString(right?.chapter?.status).toUpperCase() === "ACTIVE" ? 0 : 1;
  if (leftActive !== rightActive) return leftActive - rightActive;

  const leftId = Number(left?.chapter?.id);
  const rightId = Number(right?.chapter?.id);
  if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) return leftId - rightId;
  return asTrimmedString(left?.chapter?.chapter_name).localeCompare(asTrimmedString(right?.chapter?.chapter_name));
}

function isCanonicalAdvisorEntry(entry = {}) {
  const chapter = entry.chapter || {};
  const membership = entry.membership || entry;
  const canonicalAdvisorId = asTrimmedString(
    chapter.advisor_clerk_user_id || chapter.advisorClerkUserId
  );
  return Boolean(
    canonicalAdvisorId &&
    getMembershipRole(membership) === "org:admin" &&
    getMembershipUserId(membership) === canonicalAdvisorId
  );
}

function chooseAdvisorChapter(chapterEntries = []) {
  const advisors = chapterEntries
    .filter(isCanonicalAdvisorEntry)
    .slice()
    .sort(compareChapterEntries);
  return advisors[0] || null;
}

function getPremiumExpiration(chapterEntries, now) {
  const currentPremiumEntries = chapterEntries.filter((entry) => isChapterPremiumCurrent(entry.chapter, now));
  if (currentPremiumEntries.length === 0) return "";

  const expirations = currentPremiumEntries.map((entry) => (
    entry.chapter.premium_expires_at ?? entry.chapter.premiumExpiresAt
  ));
  if (expirations.some((expiration) => expiration === null || expiration === undefined || expiration === "")) {
    return "";
  }

  const latest = Math.max(...expirations.map(getDateMilliseconds).filter(Number.isFinite));
  return Number.isFinite(latest) ? new Date(latest).toISOString() : "";
}

function createEmptyFfaAccess(lookupFailed = false) {
  return {
    hasChapter: false,
    chapter: null,
    chapters: [],
    accesses: [],
    membershipCount: 0,
    isAdvisor: false,
    advisorChapter: null,
    chapterPremiumActive: false,
    premiumChapter: null,
    premiumExpiresAt: "",
    lookupFailed,
  };
}

async function getUserFfaAccess(clerkUserId, options = {}) {
  try {
    const normalizedUserId = asTrimmedString(clerkUserId);
    if (!normalizedUserId) throw new TypeError("A Clerk user ID is required.");

    const queryable = options.queryable || pool;
    if (options.ensureSchema !== false && queryable === pool) {
      await ensureFfaChapterSchema();
    }

    const memberships = await getAllUserMemberships(normalizedUserId, {
      forceRefresh: options.forceRefresh === true,
      clerkClient: options.clerkClient || clerkClient,
      now: options.now,
    });
    const membershipsByOrganization = new Map();
    for (const membership of memberships) {
      const organizationId = getMembershipOrganizationId(membership);
      if (!organizationId) continue;
      const existing = membershipsByOrganization.get(organizationId);
      if (!existing || getMembershipRole(membership) === "org:admin") {
        membershipsByOrganization.set(organizationId, membership);
      }
    }

    const organizationIds = [...membershipsByOrganization.keys()];
    if (organizationIds.length === 0) return createEmptyFfaAccess(false);

    const query = getQueryable(queryable);
    const result = await query(
      `SELECT ${FFA_ACCESS_COLUMNS}
       FROM ffa_chapters
       WHERE clerk_org_id = ANY($1::text[])
       ORDER BY id ASC`,
      [organizationIds]
    );
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const chapterEntries = rows.flatMap((chapter) => {
      const membership = membershipsByOrganization.get(asTrimmedString(chapter.clerk_org_id));
      return membership ? [{ chapter, membership }] : [];
    }).sort(compareChapterEntries);

    if (chapterEntries.length === 0) return createEmptyFfaAccess(false);

    const safeEntries = chapterEntries.map((entry) => ({
      entry,
      chapter: serializeChapterForMember(entry.chapter, {
        role: isCanonicalAdvisorEntry(entry)
          ? "org:admin"
          : (getMembershipRole(entry.membership) === "org:admin" ? "org:member" : getMembershipRole(entry.membership)),
        now: options.now,
      }),
    }));
    const advisorEntry = chooseAdvisorChapter(chapterEntries);
    const premiumEntry = chapterEntries.find((entry) => isChapterPremiumCurrent(entry.chapter, options.now)) || null;
    const safeAdvisor = advisorEntry
      ? serializeChapterForMember(advisorEntry.chapter, {
        role: getMembershipRole(advisorEntry.membership),
        now: options.now,
      })
      : null;
    const safePremium = premiumEntry
      ? serializeChapterForMember(premiumEntry.chapter, {
        role: getMembershipRole(premiumEntry.membership),
        now: options.now,
      })
      : null;

    return {
      hasChapter: true,
      chapter: safeEntries[0].chapter,
      chapters: safeEntries.map((entry) => entry.chapter),
      accesses: chapterEntries.map(({ chapter, membership }) => ({
        chapter,
        membership,
        role: getMembershipRole(membership),
      })),
      membershipCount: safeEntries.length,
      isAdvisor: Boolean(advisorEntry),
      advisorChapter: safeAdvisor,
      chapterPremiumActive: Boolean(premiumEntry),
      premiumChapter: safePremium,
      premiumExpiresAt: getPremiumExpiration(chapterEntries, options.now),
      lookupFailed: false,
    };
  } catch (error) {
    if (options.allowFailure === true) return createEmptyFfaAccess(true);
    throw error;
  }
}

function getPremiumExpirationMilliseconds(value) {
  if (value === null || value === undefined || value === "") return null;
  const milliseconds = getDateMilliseconds(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function resolvePremiumAccess(personalSubscription = {}, ffaAccess = {}) {
  const personal = personalSubscription && typeof personalSubscription === "object"
    ? { ...personalSubscription }
    : {};
  const personalPremiumActive = personalSubscription === true ||
    personal.isPremium === true ||
    personal.subscription_is_premium === true;
  const chapters = Array.isArray(ffaAccess?.chapters) ? ffaAccess.chapters : [];
  const chapterPremiumActive = ffaAccess?.chapterPremiumActive === true ||
    chapters.some((chapter) => chapter.premiumCurrent === true || isChapterPremiumCurrent(chapter));
  const personalExpiration = asTrimmedString(
    personal.premiumExpiresAt || personal.subscription_expires_at
  );
  const chapterExpiration = asTrimmedString(ffaAccess?.premiumExpiresAt);
  let effectiveExpiration = personalExpiration;
  let providedByChapter = !personalPremiumActive && chapterPremiumActive;

  if (personalPremiumActive && chapterPremiumActive) {
    const personalExpiresAt = getPremiumExpirationMilliseconds(personalExpiration);
    const chapterExpiresAt = getPremiumExpirationMilliseconds(chapterExpiration);
    if (!personalExpiration) {
      effectiveExpiration = "";
      providedByChapter = false;
    } else if (!chapterExpiration) {
      effectiveExpiration = "";
      providedByChapter = true;
    } else if (chapterExpiresAt !== null && (personalExpiresAt === null || chapterExpiresAt > personalExpiresAt)) {
      effectiveExpiration = new Date(chapterExpiresAt).toISOString();
      providedByChapter = true;
    }
  } else if (!personalPremiumActive && chapterPremiumActive) {
    effectiveExpiration = chapterExpiration;
  }

  if (personalPremiumActive) {
    return {
      ...personal,
      isPremium: true,
      premiumExpiresAt: effectiveExpiration,
      personalIsPremium: true,
      personalPremiumActive: true,
      chapterPremiumActive,
      providedByChapter,
    };
  }

  if (!chapterPremiumActive) {
    return {
      ...personal,
      personalIsPremium: false,
      personalPremiumActive: false,
      chapterPremiumActive: false,
      providedByChapter: false,
    };
  }

  return {
    ...personal,
    plan: "premium",
    status: "active",
    isPremium: true,
    premiumSource: "ffa_chapter",
    premiumExpiresAt: effectiveExpiration,
    personalIsPremium: false,
    personalPremiumActive: false,
    chapterPremiumActive: true,
    providedByChapter: true,
  };
}

module.exports = {
  CLERK_PAGE_SIZE,
  JOIN_CODE_ALPHABET,
  MEMBERSHIP_CACHE_MAX_ENTRIES,
  MEMBERSHIP_CACHE_TTL_MS,
  chooseAdvisorChapter,
  collectPaginatedResources,
  formatJoinCode,
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
};

const { clerkClient, getAuth } = require("@clerk/express");
const pool = require("../data-source");
const { findOrCreateLocalUserFromAuth } = require("../services/clerkUserSync");
const { getClerkBillingSubscriptionState } = require("../services/adminSubscription");
const { getUserFfaAccess, resolvePremiumAccess } = require("../services/ffaChapterService");
const { attachActivityLogger } = require("../services/userActivity");
const { enforceUsageLimits } = require("./usageLimits");

function normalizeValue(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function readEnvList(name, fallback = []) {
    const values = (process.env[name] || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    return [...new Set([...values, ...fallback].filter(Boolean))];
}

function hasAnyClerkAccess(auth, planCandidates, featureCandidates) {
    if (typeof auth.has !== "function") return false;

    for (const plan of planCandidates) {
        try {
            if (auth.has({ plan })) return true;
        } catch (err) {
            console.warn("Clerk plan check failed:", { plan, error: err.message });
        }
    }

    for (const feature of featureCandidates) {
        try {
            if (auth.has({ feature })) return true;
        } catch (err) {
            console.warn("Clerk feature check failed:", { feature, error: err.message });
        }
    }

    return false;
}

function hasPersonalClerkAccess(auth, planCandidates, featureCandidates) {
    if (auth?.orgId) return false;
    return hasAnyClerkAccess(auth || {}, planCandidates, featureCandidates);
}

function getSubscriptionFromTrustedState(hasPremiumAccess = false, localState = {}) {
    const premiumSource = normalizeValue(localState.subscription_source);
    const persistentPersonalSources = new Set(["manual_admin", "clerk_billing"]);
    const expiringPersonalSources = new Set(["clerk_trial", "clerk_billing_canceled"]);
    const hasExpiration = Boolean(localState.subscription_expires_at);
    const expiresTime = localState.subscription_expires_at
        ? new Date(localState.subscription_expires_at).getTime()
        : 0;
    const hasFutureExpiration = Boolean(Number.isFinite(expiresTime) && expiresTime > Date.now());
    const hasPersistentPersonalGrant = Boolean(
        localState.subscription_is_premium === true &&
        persistentPersonalSources.has(premiumSource) &&
        (!hasExpiration || hasFutureExpiration)
    );
    const hasExpiringPersonalGrant = Boolean(
        localState.subscription_is_premium === true &&
        expiringPersonalSources.has(premiumSource) &&
        hasFutureExpiration
    );
    const hasTrustedLocalGrant = hasPersistentPersonalGrant || hasExpiringPersonalGrant;
    const isPremium = Boolean(hasPremiumAccess || hasTrustedLocalGrant);
    const normalizedStatus = normalizeValue(localState.subscription_status);
    const status = isPremium && hasTrustedLocalGrant && ["active", "trialing", "canceled"].includes(normalizedStatus)
        ? normalizedStatus
        : (isPremium ? "active" : "free");

    return {
        plan: isPremium ? "premium" : "free",
        status,
        isPremium,
        premiumExpiresAt: hasTrustedLocalGrant && hasFutureExpiration
            ? new Date(expiresTime).toISOString()
            : "",
        premiumSource: isPremium
            ? (hasTrustedLocalGrant ? premiumSource : (hasPremiumAccess ? "clerk_entitlement" : ""))
            : "",
    };
}

function shouldVerifyPersonalBilling(hasPremiumAccess, localState = {}, subscription = {}) {
    return Boolean(
        !hasPremiumAccess &&
        !subscription.isPremium &&
        localState.subscription_is_premium === true &&
        normalizeValue(localState.subscription_source) === "clerk_entitlement"
    );
}

function subscriptionFromBillingState(state = {}) {
    return {
        plan: state.isPremium ? "premium" : "free",
        status: state.status || (state.isPremium ? "active" : "free"),
        isPremium: state.isPremium === true,
        premiumExpiresAt: state.expiresAt || "",
        premiumSource: state.isPremium ? (state.source || "clerk_billing") : "",
    };
}

async function resolvePersonalSubscription({
    hasPremiumAccess = false,
    localState = {},
    clerkUserId = "",
    planCandidates = [],
    billingClient = clerkClient.billing,
} = {}) {
    let subscription = getSubscriptionFromTrustedState(hasPremiumAccess, localState);
    if (!shouldVerifyPersonalBilling(hasPremiumAccess, localState, subscription)) {
        return { subscription, shouldPersist: true, verificationFailed: false };
    }

    const candidates = [...new Set([
        ...planCandidates,
        ...readEnvList("CLERK_PREMIUM_PLAN_ID"),
        ...readEnvList("CLERK_PREMIUM_PLAN_SLUG", ["premium", "pro"]),
        ...readEnvList("CLERK_PREMIUM_FEATURE_SLUG", ["premium_access"]),
    ].filter(Boolean))];

    try {
        const billingSubscription = await billingClient.getUserBillingSubscription(clerkUserId);
        subscription = subscriptionFromBillingState(
            getClerkBillingSubscriptionState(billingSubscription, candidates)
        );
        return { subscription, shouldPersist: true, verificationFailed: false };
    } catch (error) {
        console.warn("Could not verify personal Clerk Billing while Organization claims were active:", {
            clerkUserId,
            error: error.message,
        });
        return {
            // Fail closed for this request, but do not overwrite the last known
            // personal state. A later request will retry Clerk Billing.
            subscription,
            shouldPersist: false,
            verificationFailed: true,
        };
    }
}

function sanitizeFfaChapter(chapter) {
    if (!chapter || typeof chapter !== "object") return null;

    return {
        id: chapter.id ?? null,
        chapterName: typeof chapter.chapterName === "string" ? chapter.chapterName : "",
        schoolName: typeof chapter.schoolName === "string" ? chapter.schoolName : "",
        chapterNumber: typeof chapter.chapterNumber === "string" ? chapter.chapterNumber : "",
        state: typeof chapter.state === "string" ? chapter.state : "",
        advisorName: typeof chapter.advisorName === "string" ? chapter.advisorName : "",
        advisorEmail: typeof chapter.advisorEmail === "string" ? chapter.advisorEmail : "",
        maxMembers: Number(chapter.maxMembers) || 0,
        status: typeof chapter.status === "string" ? chapter.status : "",
        joinEnabled: chapter.joinEnabled === true,
        membershipRole: typeof chapter.membershipRole === "string" ? chapter.membershipRole : "",
        isAdvisor: chapter.isAdvisor === true,
        premiumActive: chapter.premiumActive === true,
        premiumCurrent: chapter.premiumCurrent === true,
        premiumExpiresAt: chapter.premiumExpiresAt || null,
        createdAt: chapter.createdAt || null,
        updatedAt: chapter.updatedAt || null,
    };
}

function sanitizeFfaAccessForUser(ffaAccess = {}) {
    const chapters = Array.isArray(ffaAccess.chapters)
        ? ffaAccess.chapters.map(sanitizeFfaChapter).filter(Boolean)
        : [];

    return {
        hasChapter: ffaAccess.hasChapter === true,
        chapter: sanitizeFfaChapter(ffaAccess.chapter),
        chapters,
        membershipCount: Number(ffaAccess.membershipCount) || chapters.length,
        hasAdvisorMembership: ffaAccess.hasAdvisorMembership === true,
        isAdvisor: ffaAccess.isAdvisor === true,
        advisorChapter: sanitizeFfaChapter(ffaAccess.advisorChapter),
        chapterPremiumActive: ffaAccess.chapterPremiumActive === true,
        premiumChapter: sanitizeFfaChapter(ffaAccess.premiumChapter),
        premiumExpiresAt: typeof ffaAccess.premiumExpiresAt === "string" ? ffaAccess.premiumExpiresAt : "",
        lookupFailed: ffaAccess.lookupFailed === true,
    };
}

async function authMiddleware(req, res, next) {
    try {
        const auth =
            typeof req.auth === "function"
                ? req.auth({ acceptsToken: "any" })
                : getAuth(req, { acceptsToken: "any" });
        const authenticatedUserId = auth.userId || auth.sessionClaims?.sub || "";

        if (!authenticatedUserId) {
            const details = {
                method: req.method,
                path: req.originalUrl,
            };

            if (process.env.NODE_ENV !== "production") {
                details.origin = req.headers.origin || "";
                details.hasAuthorizationHeader = Boolean(req.headers.authorization);
                details.hasBearerToken = typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ");
                details.authStatus = auth.status || "";
                details.authReason = auth.reason || "";
                details.authMessage = auth.message || "";
                details.tokenType = auth.tokenType || "";
                details.sessionStatus = auth.sessionStatus || "";
                details.isAuthenticated = auth.isAuthenticated;
                details.hasSessionSubject = Boolean(auth.sessionClaims?.sub);
            }

            console.warn("Rejected unauthenticated request:", details);
            return res.status(401).json({ message: "Not authenticated" });
        }

        const premiumPlanCandidates = readEnvList("CLERK_PREMIUM_PLAN_SLUG", ["premium", "pro"]);
        const premiumPlanIdCandidates = readEnvList("CLERK_PREMIUM_PLAN_ID");
        const premiumFeatureCandidates = readEnvList("CLERK_PREMIUM_FEATURE_SLUG", ["premium_access"]);
        // Clerk's `has()` reflects the active context. An active Organization
        // entitlement must not be mistaken for the user's personal plan.
        const hasPremiumAccess = hasPersonalClerkAccess(
            auth,
            [...premiumPlanCandidates, ...premiumPlanIdCandidates],
            premiumFeatureCandidates
        );
        const authForSync = {
            ...auth,
            userId: authenticatedUserId,
        };
        const user = await findOrCreateLocalUserFromAuth(authForSync);
        const userStateResult = await pool.query(
            `SELECT subscription_status,
                    subscription_is_premium,
                    subscription_source,
                    subscription_expires_at,
                    onboarding_required,
                    onboarding_completed,
                    user_type,
                    primary_species,
                    herd_size_range,
                    main_goal,
                    setup_mode,
                    created_first_animal
             FROM users
             WHERE id = $1`,
            [user.id]
        );
        const userState = userStateResult.rows[0] || {};
        const personalResolution = await resolvePersonalSubscription({
            hasPremiumAccess,
            localState: userState,
            clerkUserId: authenticatedUserId,
            planCandidates: [
                ...premiumPlanCandidates,
                ...premiumPlanIdCandidates,
                ...premiumFeatureCandidates,
            ],
        });
        const personalSubscription = personalResolution.subscription;
        const shouldPersistPersonalSubscription = personalResolution.shouldPersist;
        const localPremiumSource = normalizeValue(userState.subscription_source);
        const localPremiumExpiresTime = userState.subscription_expires_at
            ? new Date(userState.subscription_expires_at).getTime()
            : 0;
        const shouldRetainExpiredManualGrant = Boolean(
            !personalSubscription.isPremium &&
            localPremiumSource === "manual_admin" &&
            localPremiumExpiresTime &&
            localPremiumExpiresTime <= Date.now()
        );
        if (shouldPersistPersonalSubscription) {
            await pool.query(
                `UPDATE users
                 SET subscription_plan = $1,
                     subscription_status = $2,
                     subscription_is_premium = $3,
                     subscription_source = $4,
                     subscription_expires_at = $5
                 WHERE id = $6`,
                [
                    personalSubscription.plan || "free",
                    personalSubscription.status || (personalSubscription.isPremium ? "active" : "free"),
                    personalSubscription.isPremium === true,
                    shouldRetainExpiredManualGrant ? "manual_admin" : (personalSubscription.premiumSource || ""),
                    shouldRetainExpiredManualGrant ? userState.subscription_expires_at : (personalSubscription.premiumExpiresAt || null),
                    user.id,
                ]
            );
        }
        const ffaAccess = await getUserFfaAccess(authenticatedUserId, { allowFailure: true });
        const subscription = resolvePremiumAccess(personalSubscription, ffaAccess);
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            clerkUserId: authenticatedUserId,
            subscription,
            ffa: sanitizeFfaAccessForUser(ffaAccess),
            onboarding: {
                required: userState.onboarding_required === true,
                completed: userState.onboarding_completed === true,
                userType: userState.user_type || "",
                primarySpecies: Array.isArray(userState.primary_species) ? userState.primary_species : [],
                herdSizeRange: userState.herd_size_range || "",
                mainGoal: userState.main_goal || "",
                setupMode: userState.setup_mode || "",
                createdFirstAnimal: userState.created_first_animal === true,
            },
        };
        attachActivityLogger(req, res);
        return enforceUsageLimits(req, res, next);
    } catch (err) {
        console.error("Auth middleware failed:", {
            method: req.method,
            path: req.originalUrl,
            error: err.message,
        });
        return res.status(500).json({
            message: "Authentication failed",
            ...(process.env.NODE_ENV === "production" ? {} : { error: err.message }),
        });
    }
}

module.exports = authMiddleware;
module.exports.getSubscriptionFromTrustedState = getSubscriptionFromTrustedState;
module.exports.hasPersonalClerkAccess = hasPersonalClerkAccess;
module.exports.resolvePersonalSubscription = resolvePersonalSubscription;
module.exports.sanitizeFfaAccessForUser = sanitizeFfaAccessForUser;
module.exports.shouldVerifyPersonalBilling = shouldVerifyPersonalBilling;
module.exports.subscriptionFromBillingState = subscriptionFromBillingState;

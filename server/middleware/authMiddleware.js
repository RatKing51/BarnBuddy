const { getAuth } = require("@clerk/express");
const pool = require("../data-source");
const { findOrCreateLocalUserFromAuth } = require("../services/clerkUserSync");
const { attachActivityLogger } = require("../services/userActivity");

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

function getSubscriptionFromTrustedState(hasPremiumAccess = false, localState = {}) {
    const premiumSource = normalizeValue(localState.subscription_source);
    const trustedLocalSources = new Set(["manual_admin", "clerk_trial", "clerk_billing_canceled"]);
    const trustedPremiumSource = trustedLocalSources.has(premiumSource) ? premiumSource : "";
    const expiresTime = localState.subscription_expires_at
        ? new Date(localState.subscription_expires_at).getTime()
        : 0;
    const hasFutureExpiration = Boolean(expiresTime && expiresTime > Date.now());
    const hasManualGrant = Boolean(
        localState.subscription_is_premium === true &&
        premiumSource === "manual_admin" &&
        (!expiresTime || hasFutureExpiration)
    );
    const hasServerManagedGracePeriod = Boolean(
        localState.subscription_is_premium === true &&
        ["clerk_trial", "clerk_billing_canceled"].includes(premiumSource) &&
        hasFutureExpiration
    );
    const isPremium = Boolean(hasPremiumAccess || hasManualGrant || hasServerManagedGracePeriod);
    const keepExpiration = isPremium && hasFutureExpiration;

    return {
        plan: isPremium ? "premium" : "free",
        status: isPremium && ["active", "trialing", "canceled"].includes(normalizeValue(localState.subscription_status))
            ? normalizeValue(localState.subscription_status)
            : (isPremium ? "active" : "free"),
        isPremium,
        premiumExpiresAt: keepExpiration ? new Date(expiresTime).toISOString() : "",
        premiumSource: isPremium
            ? (trustedPremiumSource || (hasPremiumAccess ? "clerk_entitlement" : ""))
            : "",
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
        const hasPremiumAccess = hasAnyClerkAccess(
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
        const subscription = getSubscriptionFromTrustedState(hasPremiumAccess, userState);
        await pool.query(
            `UPDATE users
             SET subscription_plan = $1,
                 subscription_status = $2,
                 subscription_is_premium = $3,
                 subscription_source = $4,
                 subscription_expires_at = $5
             WHERE id = $6`,
            [
                subscription.plan || "free",
                subscription.status || (subscription.isPremium ? "active" : "free"),
                subscription.isPremium === true,
                subscription.premiumSource || "",
                subscription.premiumExpiresAt || null,
                user.id,
            ]
        );
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            clerkUserId: authenticatedUserId,
            subscription,
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
        next();
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

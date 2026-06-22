const { clerkClient, getAuth } = require("@clerk/express");
const pool = require("../data-source");
const { findOrCreateLocalUserFromAuth } = require("../services/clerkUserSync");
const { cleanupPremiumDataForUser } = require("../services/premiumDowngradeCleanup");

const premiumPlanValues = new Set(["premium", "pro", "paid", "active"]);
const activeStatusValues = new Set(["active", "trialing", "paid"]);

function normalizeValue(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function readClaim(claims, keys) {
    for (const key of keys) {
        if (typeof claims[key] === "string" && claims[key].trim()) return claims[key];
    }

    return "";
}

function metadataSources(metadata = {}) {
    return [
        metadata,
        metadata.publicMetadata,
        metadata.privateMetadata,
        metadata.unsafeMetadata,
        metadata.publicMetadata?.subscription,
        metadata.privateMetadata?.subscription,
        metadata.unsafeMetadata?.subscription,
        metadata.subscription,
    ].filter((source) => source && typeof source === "object");
}

function readStringFromSources(sources, keys) {
    for (const source of sources) {
        for (const key of keys) {
            if (typeof source[key] === "string" && source[key].trim()) {
                return source[key];
            }
        }
    }

    return "";
}

function readBooleanFromSources(sources, keys) {
    return sources.some((source) => keys.some((key) => source[key] === true));
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

function getSubscriptionFromClaims(claims = {}, hasPremiumAccess = false, clerkMetadata = {}) {
    const sources = [claims, claims.subscription, ...metadataSources(clerkMetadata)].filter(
        (source) => source && typeof source === "object"
    );
    const plan = normalizeValue(readStringFromSources(sources, [
        "plan",
        "subscriptionPlan",
        "subscription_plan",
        "billingPlan",
        "tier",
    ]));
    const status = normalizeValue(readStringFromSources(sources, [
        "subscriptionStatus",
        "subscription_status",
        "billingStatus",
        "status",
    ]));
    const hasPremiumFlag = readBooleanFromSources(sources, ["premium", "isPremium", "hasPremium"]);
    const isPremium = Boolean(
        Boolean(hasPremiumAccess) ||
        hasPremiumFlag ||
        premiumPlanValues.has(plan) ||
        Boolean(plan && plan !== "free" && activeStatusValues.has(status))
    );

    return {
        plan: isPremium ? "premium" : "free",
        status: status || (isPremium ? "active" : "free"),
        isPremium,
    };
}

module.exports = async function authMiddleware(req, res, next) {
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
        let clerkMetadata = {};
        if (!hasPremiumAccess) {
            try {
                const clerkUser = await clerkClient.users.getUser(authenticatedUserId);
                clerkMetadata = {
                    publicMetadata: clerkUser.publicMetadata || clerkUser.public_metadata || {},
                    privateMetadata: clerkUser.privateMetadata || clerkUser.private_metadata || {},
                    unsafeMetadata: clerkUser.unsafeMetadata || clerkUser.unsafe_metadata || {},
                };
            } catch (err) {
                console.warn("Could not fetch Clerk metadata for subscription fallback:", err.message);
            }
        }

        const user = await findOrCreateLocalUserFromAuth(authForSync);
        const subscription = getSubscriptionFromClaims(auth.sessionClaims, hasPremiumAccess, clerkMetadata);
        await pool.query(
            `UPDATE users
             SET subscription_plan = $1,
                 subscription_status = $2,
                 subscription_is_premium = $3
             WHERE id = $4`,
            [
                subscription.plan || "free",
                subscription.status || (subscription.isPremium ? "active" : "free"),
                subscription.isPremium === true,
                user.id,
            ]
        );

        if (!subscription.isPremium) {
            await cleanupPremiumDataForUser(user.id);
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            clerkUserId: authenticatedUserId,
            subscription,
        };
        next();
    } catch (err) {
        console.error("Auth middleware failed:", {
            method: req.method,
            path: req.originalUrl,
            error: err.message,
        });
        return res.status(500).json({
            message: "Authentication failed",
            error: err.message,
        });
    }
}

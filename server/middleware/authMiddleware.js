const { getAuth } = require("@clerk/express");
const pool = require("../data-source");
const { findOrCreateLocalUserFromAuth } = require("../services/clerkUserSync");

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

function getSubscriptionFromClaims(claims = {}, hasPremiumAccess = false) {
    const plan = normalizeValue(readClaim(claims, [
        "plan",
        "subscriptionPlan",
        "subscription_plan",
        "billingPlan",
    ]));
    const status = normalizeValue(readClaim(claims, [
        "subscriptionStatus",
        "subscription_status",
        "billingStatus",
    ]));
    const hasPremiumFlag = claims.premium === true || claims.isPremium === true || claims.hasPremium === true;
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
        const auth = getAuth(req);

        if (!auth.isAuthenticated || !auth.userId) {
            console.warn("Rejected unauthenticated request:", {
                method: req.method,
                path: req.originalUrl,
            });
            return res.status(401).json({ message: "Not authenticated" });
        }

        const premiumPlanSlug = process.env.CLERK_PREMIUM_PLAN_SLUG || "premium";
        const premiumFeatureSlug = process.env.CLERK_PREMIUM_FEATURE_SLUG || "premium_access";
        const hasPremiumAccess = typeof auth.has === "function"
            ? Boolean(auth.has({ plan: premiumPlanSlug }) || auth.has({ feature: premiumFeatureSlug }))
            : false;
        const user = await findOrCreateLocalUserFromAuth(auth);
        const subscription = getSubscriptionFromClaims(auth.sessionClaims, hasPremiumAccess);
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

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            clerkUserId: auth.userId,
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

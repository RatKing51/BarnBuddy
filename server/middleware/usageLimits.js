const { RECORD_CREATION_POLICIES, getAiExtractionPolicies } = require("../config/usageLimits");
const { consumeRateLimits } = require("../services/durableRateLimit");

const RECORD_CREATION_PATHS = Object.freeze([
  /^\/api\/animals\/?$/i,
  /^\/api\/animals\/[^/]+\/weight-records\/?$/i,
  /^\/api\/herds\/?$/i,
  /^\/api\/vaccinations(?:\/bulk)?\/?$/i,
  /^\/api\/vetVisits\/?$/i,
  /^\/api\/healthEvents(?:\/bulk)?\/?$/i,
  /^\/api\/reproductions\/?$/i,
  /^\/api\/premium-records\/(?:finance|feed|inventory)\/?$/i,
  /^\/api\/births\/?$/i,
  /^\/api\/ffa-projects\/?$/i,
  /^\/api\/ffa-projects\/[^/]+\/(?:animals|activities|finances)\/?$/i,
  /^\/api\/import-assistant\/import\/?$/i,
]);

function getRequestPath(req) {
  return String(req.originalUrl || req.url || "").split("?", 1)[0];
}

function getUsageLimit(req) {
  if (String(req.method || "").toUpperCase() !== "POST") return null;

  const path = getRequestPath(req);
  if (/^\/api\/import-assistant\/extract\/?$/i.test(path)) {
    const isPremium = req.user?.subscription?.isPremium === true;
    return {
      group: "ai-extraction",
      policies: getAiExtractionPolicies(isPremium),
    };
  }

  if (RECORD_CREATION_PATHS.some((pattern) => pattern.test(path))) {
    return {
      group: "record-create",
      policies: RECORD_CREATION_POLICIES,
    };
  }

  return null;
}

function formatRetryDuration(seconds) {
  const value = Math.max(1, Math.ceil(Number(seconds) || 1));
  if (value >= 86_400) {
    const days = Math.ceil(value / 86_400);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (value >= 3_600) {
    const hours = Math.ceil(value / 3_600);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (value >= 60) {
    const minutes = Math.ceil(value / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  return `${value} second${value === 1 ? "" : "s"}`;
}

function setRateLimitHeaders(res, policy, { blocked = false } = {}) {
  if (!policy) return;
  res.set({
    "RateLimit-Limit": String(policy.max),
    "RateLimit-Remaining": String(policy.remaining),
    "RateLimit-Reset": String(policy.retryAfterSeconds),
  });
  if (blocked) res.set("Retry-After", String(policy.retryAfterSeconds));
}

function createUsageLimitMiddleware({ consume = consumeRateLimits } = {}) {
  return async function enforceUsageLimits(req, res, next) {
    const usageLimit = getUsageLimit(req);
    if (!usageLimit) return next();

    try {
      const result = await consume({
        userId: req.user?.id,
        group: usageLimit.group,
        policies: usageLimit.policies,
      });

      if (!result.allowed) {
        const blocked = result.blocked;
        setRateLimitHeaders(res, blocked, { blocked: true });
        return res.status(429).json({
          error: `${blocked.message} Try again in ${formatRetryDuration(blocked.retryAfterSeconds)}.`,
          code: "RATE_LIMITED",
          scope: blocked.key,
          limit: blocked.max,
          remaining: 0,
          windowSeconds: blocked.windowSeconds,
          retryAfterSeconds: blocked.retryAfterSeconds,
          retryAt: blocked.resetAt,
        });
      }

      const exposedPolicy = result.policies.find((policy) => policy.exposeHeaders);
      setRateLimitHeaders(res, exposedPolicy);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

const enforceUsageLimits = createUsageLimitMiddleware();

module.exports = {
  RECORD_CREATION_PATHS,
  createUsageLimitMiddleware,
  enforceUsageLimits,
  formatRetryDuration,
  getRequestPath,
  getUsageLimit,
};

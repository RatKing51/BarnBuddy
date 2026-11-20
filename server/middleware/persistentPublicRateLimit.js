const { createHmac } = require("node:crypto");
const env = require("../config/env");
const pool = require("../data-source");

let requestsUntilCleanup = 0;

function hashSubject(secret, endpoint, address) {
  return createHmac("sha256", secret).update(`${endpoint}:${address}`).digest("hex");
}

function createPersistentPublicRateLimit({
  endpoint,
  windowMs,
  max,
  message = "Too many requests. Please try again later.",
  query = (...args) => pool.query(...args),
  secret = env.rateLimitHmacSecret || (env.nodeEnv === "production" ? "" : "barnbuddy-local-public-rate-limit-development-key"),
  now = () => Date.now(),
} = {}) {
  const bucketKey = String(endpoint || "").trim();
  if (!bucketKey || bucketKey.length > 120) throw new TypeError("A valid public rate-limit endpoint is required.");
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) throw new TypeError("Rate-limit window must be positive.");
  if (!Number.isSafeInteger(max) || max < 1) throw new TypeError("Rate-limit maximum must be positive.");

  return async function persistentPublicRateLimit(req, res, next) {
    if (!secret || secret.length < 32) {
      return res.status(503).json({ error: "This service is temporarily unavailable. Please try again later." });
    }

    // Express trust proxy is pinned to Railway's single ingress hop in production.
    const address = String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 128);
    const subjectHash = hashSubject(secret, bucketKey, address);
    const windowSeconds = Math.ceil(windowMs / 1_000);

    try {
      const result = await query(
        `INSERT INTO public_rate_limits
          (subject_hash, bucket_key, window_started_at, expires_at, request_count, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($3::int * INTERVAL '1 second'), 1, CURRENT_TIMESTAMP)
         ON CONFLICT (subject_hash, bucket_key) DO UPDATE SET
           window_started_at = CASE
             WHEN public_rate_limits.expires_at <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
             ELSE public_rate_limits.window_started_at
           END,
           expires_at = CASE
             WHEN public_rate_limits.expires_at <= CURRENT_TIMESTAMP
               THEN CURRENT_TIMESTAMP + ($3::int * INTERVAL '1 second')
             ELSE public_rate_limits.expires_at
           END,
           request_count = CASE
             WHEN public_rate_limits.expires_at <= CURRENT_TIMESTAMP THEN 1
             ELSE LEAST(public_rate_limits.request_count + 1, $4 + 1)
           END,
           updated_at = CURRENT_TIMESTAMP
         RETURNING request_count, expires_at`,
        [subjectHash, bucketKey, windowSeconds, max]
      );
      const count = Number(result.rows[0]?.request_count);
      const resetAt = new Date(result.rows[0]?.expires_at).getTime();
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now()) / 1_000));

      res.set({
        "RateLimit-Limit": String(max),
        "RateLimit-Remaining": String(Math.max(0, max - count)),
        "RateLimit-Reset": String(retryAfterSeconds),
      });

      if (count > max) {
        res.set("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({ error: message });
      }

      requestsUntilCleanup += 1;
      if (requestsUntilCleanup >= 100) {
        requestsUntilCleanup = 0;
        // Opportunistic bounded cleanup keeps expired pseudonymous buckets from accumulating.
        await query(
          `DELETE FROM public_rate_limits
           WHERE ctid IN (
             SELECT ctid FROM public_rate_limits
             WHERE expires_at < CURRENT_TIMESTAMP
             LIMIT 500
           )`
        ).catch((error) => console.warn("Public rate-limit cleanup failed:", error.message));
      }

      return next();
    } catch (error) {
      console.error("Public rate limiting unavailable:", error.message);
      return res.status(503).json({ error: "This service is temporarily unavailable. Please try again later." });
    }
  };
}

module.exports = { createPersistentPublicRateLimit, hashSubject };

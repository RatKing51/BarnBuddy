const { createHmac, hkdfSync } = require("node:crypto");
const env = require("../config/env");
const pool = require("../data-source");

const HMAC_SALT = Buffer.from("barnbuddy:rate-limit-key:v1", "utf8");
const HMAC_INFO = Buffer.from("barnbuddy:public-request-subject:v1", "utf8");
let requestsUntilCleanup = 0;

function deriveRateLimitKey(masterSecret) {
  if (!masterSecret) return null;
  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(String(masterSecret), "utf8"),
    HMAC_SALT,
    HMAC_INFO,
    32
  ));
}

function getRateLimitKey(configuration = env) {
  const source = configuration.clerk?.secretKey || configuration.databaseUrl ||
    (configuration.nodeEnv === "production" ? "" : "barnbuddy-local-rate-limit-key");
  return deriveRateLimitKey(source);
}

function hashSubject(key, bucketKey, subject) {
  return createHmac("sha256", key)
    .update(`${bucketKey}\0${subject}`, "utf8")
    .digest("hex");
}

function createPersistentPublicRateLimit({
  endpoint,
  windowMs,
  max,
  message = "Too many requests. Please try again later.",
  query = (...args) => pool.query(...args),
  key = getRateLimitKey(),
  now = () => Date.now(),
} = {}) {
  const bucketKey = String(endpoint || "").trim();
  if (!bucketKey || bucketKey.length > 120) throw new TypeError("A valid rate-limit endpoint is required.");
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) throw new TypeError("Rate-limit window must be positive.");
  if (!Number.isSafeInteger(max) || max < 1) throw new TypeError("Rate-limit maximum must be positive.");

  return async function persistentRateLimit(req, res, next) {
    if (!key) {
      return res.status(503).json({ error: "This service is temporarily unavailable. Please try again later." });
    }

    const subject = req.user?.clerkUserId
      ? `user:${req.user.clerkUserId}`
      : `ip:${String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 128)}`;
    const subjectHash = hashSubject(key, bucketKey, subject);
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
      const resetSeconds = Math.max(1, Math.ceil((new Date(result.rows[0]?.expires_at).getTime() - now()) / 1_000));
      res.set({
        "RateLimit-Limit": String(max),
        "RateLimit-Remaining": String(Math.max(0, max - count)),
        "RateLimit-Reset": String(resetSeconds),
      });

      if (count > max) {
        res.set("Retry-After", String(resetSeconds));
        return res.status(429).json({ error: message });
      }

      requestsUntilCleanup += 1;
      if (requestsUntilCleanup >= 100) {
        requestsUntilCleanup = 0;
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

module.exports = { createPersistentPublicRateLimit, deriveRateLimitKey, getRateLimitKey, hashSubject };

const pool = require("../data-source");

const RATE_LIMIT_TABLE = "usage_rate_limits";

function ensureRateLimitSchema() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS ${RATE_LIMIT_TABLE} (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bucket_key VARCHAR(120) NOT NULL,
      window_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMPTZ NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, bucket_key)
    );

    CREATE INDEX IF NOT EXISTS idx_usage_rate_limits_expiry
      ON ${RATE_LIMIT_TABLE} (expires_at);
  `);
}

function normalizePolicies(policies) {
  if (!Array.isArray(policies) || policies.length === 0) {
    throw new TypeError("At least one rate-limit policy is required.");
  }

  return policies.map((policy) => {
    const key = String(policy?.key || "").trim();
    const max = Number(policy?.max);
    const windowSeconds = Number(policy?.windowSeconds);
    if (!key || key.length > 120) throw new TypeError("Rate-limit policy keys must be 1-120 characters.");
    if (!Number.isSafeInteger(max) || max < 1) throw new TypeError("Rate-limit maximums must be positive integers.");
    if (!Number.isSafeInteger(windowSeconds) || windowSeconds < 1) {
      throw new TypeError("Rate-limit windows must be positive integer seconds.");
    }

    return { ...policy, key, max, windowSeconds };
  });
}

function getRetryAfterSeconds(expiresAt, now) {
  return Math.max(1, Math.ceil((new Date(expiresAt).getTime() - new Date(now).getTime()) / 1_000));
}

async function consumeRateLimits({ userId, group, policies }) {
  const normalizedUserId = Number(userId);
  if (!Number.isSafeInteger(normalizedUserId) || normalizedUserId < 1) {
    throw new TypeError("A valid user ID is required for durable rate limiting.");
  }

  const normalizedGroup = String(group || "usage").trim().slice(0, 120) || "usage";
  const normalizedPolicies = normalizePolicies(policies);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${normalizedUserId}:${normalizedGroup}`]);
    const nowResult = await client.query("SELECT CURRENT_TIMESTAMP AS now");
    const now = nowResult.rows[0].now;
    const existingResult = await client.query(
      `SELECT bucket_key, request_count, window_started_at, expires_at
       FROM ${RATE_LIMIT_TABLE}
       WHERE user_id = $1 AND bucket_key = ANY($2::text[])
       FOR UPDATE`,
      [normalizedUserId, normalizedPolicies.map((policy) => policy.key)]
    );
    const existingByKey = new Map(existingResult.rows.map((row) => [row.bucket_key, row]));

    const blockedPolicies = normalizedPolicies.flatMap((policy) => {
      const bucket = existingByKey.get(policy.key);
      const isActive = bucket && new Date(bucket.expires_at).getTime() > new Date(now).getTime();
      if (!isActive || Number(bucket.request_count) < policy.max) return [];
      return [{
        ...policy,
        retryAfterSeconds: getRetryAfterSeconds(bucket.expires_at, now),
        resetAt: new Date(bucket.expires_at).toISOString(),
        remaining: 0,
      }];
    });

    if (blockedPolicies.length > 0) {
      const blocked = blockedPolicies.sort((left, right) => right.retryAfterSeconds - left.retryAfterSeconds)[0];
      await client.query("ROLLBACK");
      return { allowed: false, blocked, policies: blockedPolicies };
    }

    const consumed = [];
    for (const policy of normalizedPolicies) {
      const expiresAt = new Date(new Date(now).getTime() + policy.windowSeconds * 1_000);
      const result = await client.query(
        `INSERT INTO ${RATE_LIMIT_TABLE}
          (user_id, bucket_key, window_started_at, expires_at, request_count, updated_at)
         VALUES ($1, $2, $3, $4, 1, $3)
         ON CONFLICT (user_id, bucket_key) DO UPDATE SET
           window_started_at = CASE
             WHEN ${RATE_LIMIT_TABLE}.expires_at <= $3 THEN $3
             ELSE ${RATE_LIMIT_TABLE}.window_started_at
           END,
           expires_at = CASE
             WHEN ${RATE_LIMIT_TABLE}.expires_at <= $3 THEN $4
             ELSE ${RATE_LIMIT_TABLE}.expires_at
           END,
           request_count = CASE
             WHEN ${RATE_LIMIT_TABLE}.expires_at <= $3 THEN 1
             ELSE ${RATE_LIMIT_TABLE}.request_count + 1
           END,
           updated_at = $3
         RETURNING bucket_key, request_count, window_started_at, expires_at`,
        [normalizedUserId, policy.key, now, expiresAt]
      );
      const bucket = result.rows[0];
      consumed.push({
        ...policy,
        count: Number(bucket.request_count),
        remaining: Math.max(0, policy.max - Number(bucket.request_count)),
        retryAfterSeconds: getRetryAfterSeconds(bucket.expires_at, now),
        resetAt: new Date(bucket.expires_at).toISOString(),
      });
    }

    await client.query("COMMIT");
    return { allowed: true, policies: consumed };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  consumeRateLimits,
  ensureRateLimitSchema,
  getRetryAfterSeconds,
  normalizePolicies,
};

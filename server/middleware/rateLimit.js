const buckets = new Map();
let nextLimiterId = 1;

function defaultKey(req) {
  return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip || req.socket?.remoteAddress || "unknown"}`;
}

function pruneExpiredBuckets(now) {
  if (buckets.size < 10_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size <= 20_000) return;

  const overflow = buckets.size - 20_000;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

function createRateLimit({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests. Please try again later.",
  keyGenerator = defaultKey,
} = {}) {
  const limiterId = nextLimiterId++;

  return function rateLimit(req, res, next) {
    const now = Date.now();
    pruneExpiredBuckets(now);

    const key = `${limiterId}:${keyGenerator(req)}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.set({
      "RateLimit-Limit": String(max),
      "RateLimit-Remaining": String(Math.max(0, max - bucket.count - 1)),
      "RateLimit-Reset": String(resetSeconds),
    });

    if (bucket.count >= max) {
      res.set("Retry-After", String(resetSeconds));
      return res.status(429).json({ error: message });
    }

    bucket.count += 1;
    next();
  };
}

function clearRateLimitStore() {
  buckets.clear();
}

module.exports = {
  clearRateLimitStore,
  createRateLimit,
};

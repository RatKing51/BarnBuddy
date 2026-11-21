const test = require("node:test");
const assert = require("node:assert/strict");
const { createPersistentPublicRateLimit, deriveRateLimitKey, hashSubject } = require("../middleware/persistentPublicRateLimit");

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    set(values, value) {
      Object.assign(this.headers, typeof values === "string" ? { [values]: value } : values);
      return this;
    },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("persistent public limits are shared across limiter instances without storing raw identifiers", async () => {
  const key = deriveRateLimitKey("existing-server-secret-from-test");
  const sharedCounters = new Map();
  const persistedSubjects = [];
  const query = async (sql, values = []) => {
    if (!sql.includes("INSERT INTO public_rate_limits")) return { rows: [] };
    const [subjectHash, bucket] = values;
    persistedSubjects.push(subjectHash);
    const counterKey = `${subjectHash}:${bucket}`;
    const count = (sharedCounters.get(counterKey) || 0) + 1;
    sharedCounters.set(counterKey, count);
    return { rows: [{
      request_count: count,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }] };
  };
  const options = { endpoint: "contact-test", windowMs: 60_000, max: 1, key, query };
  const firstInstance = createPersistentPublicRateLimit(options);
  const secondInstance = createPersistentPublicRateLimit(options);
  const request = { ip: "203.0.113.7", socket: { remoteAddress: "ignored" } };
  let accepted = 0;

  await firstInstance(request, createResponse(), () => { accepted += 1; });
  const blocked = createResponse();
  await secondInstance(request, blocked, () => { accepted += 1; });

  assert.equal(accepted, 1);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers["RateLimit-Limit"], "1");
  assert.ok(blocked.headers["Retry-After"]);
  assert.equal(persistedSubjects[0], hashSubject(key, "contact-test", "ip:203.0.113.7"));
  assert.equal(persistedSubjects.some((value) => value.includes("203.0.113.7")), false);
});

test("rate-limit HKDF output is stable and domain-separated", () => {
  const first = deriveRateLimitKey("same-clerk-server-secret");
  assert.deepEqual(first, deriveRateLimitKey("same-clerk-server-secret"));
  assert.notDeepEqual(first, deriveRateLimitKey("different-clerk-server-secret"));
  assert.notEqual(hashSubject(first, "contact", "ip:1.2.3.4"), hashSubject(first, "newsletter", "ip:1.2.3.4"));
});

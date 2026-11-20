const test = require("node:test");
const assert = require("node:assert/strict");
const { createPersistentPublicRateLimit, hashSubject } = require("../middleware/persistentPublicRateLimit");

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

test("persistent public rate limiter stores only a keyed pseudonymous subject and returns 429", async () => {
  const secret = "unit-test-rate-limit-secret-at-least-32";
  const address = "203.0.113.8";
  let count = 0;
  const calls = [];
  const limiter = createPersistentPublicRateLimit({
    endpoint: "contact-submit-test",
    windowMs: 60_000,
    max: 1,
    secret,
    query: async (sql, values) => {
      calls.push({ sql, values });
      count += 1;
      return { rows: [{ request_count: count, expires_at: new Date(Date.now() + 60_000).toISOString() }] };
    },
  });
  const request = { ip: address, socket: { remoteAddress: "ignored" } };
  let accepted = 0;

  const first = createResponse();
  await limiter(request, first, () => { accepted += 1; });
  const second = createResponse();
  await limiter(request, second, () => { accepted += 1; });

  assert.equal(accepted, 1);
  assert.equal(second.statusCode, 429);
  assert.equal(second.headers["Retry-After"] != null, true);
  assert.equal(calls[0].values[0], hashSubject(secret, "contact-submit-test", address));
  assert.equal(calls[0].values[0].includes(address), false);
  assert.match(calls[0].sql, /ON CONFLICT/);
});

test("public rate-limit subject hashes differ between endpoints", () => {
  const key = "unit-test-rate-limit-secret-at-least-32";
  assert.notEqual(hashSubject(key, "contact", "203.0.113.8"), hashSubject(key, "newsletter", "203.0.113.8"));
});

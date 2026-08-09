const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createUsageLimitMiddleware,
  formatRetryDuration,
  getUsageLimit,
} = require("../middleware/usageLimits");

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) {
      if (typeof name === "object") Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function requestFor(path, { method = "POST", premium = false } = {}) {
  return {
    method,
    originalUrl: path,
    user: {
      id: 42,
      subscription: { isPremium: premium },
    },
  };
}

test("record creation routes share the recommended cooldown and quotas", () => {
  const paths = [
    "/api/animals",
    "/api/animals/123/weight-records",
    "/api/herds",
    "/api/vaccinations/bulk",
    "/api/vetVisits",
    "/api/healthEvents/bulk",
    "/api/reproductions",
    "/api/premium-records/inventory",
    "/api/births",
    "/api/ffa-projects/12/activities",
    "/api/import-assistant/import",
  ];

  for (const path of paths) {
    const limit = getUsageLimit(requestFor(path));
    assert.equal(limit.group, "record-create", path);
    assert.deepEqual(limit.policies.map(({ max, windowSeconds }) => [max, windowSeconds]), [
      [1, 2],
      [10, 60],
      [100, 3_600],
    ]);
  }
});

test("updates, uploads, and non-record actions do not consume creation quota", () => {
  assert.equal(getUsageLimit(requestFor("/api/animals/123", { method: "PUT" })), null);
  assert.equal(getUsageLimit(requestFor("/api/animals/123/upload")), null);
  assert.equal(getUsageLimit(requestFor("/api/notifications/reminders/send")), null);
  assert.equal(getUsageLimit(requestFor("/api/import-assistant/request")), null);
});

test("AI extraction uses plan-aware daily limits and a 60-second cooldown", () => {
  const free = getUsageLimit(requestFor("/api/import-assistant/extract"));
  const premium = getUsageLimit(requestFor("/api/import-assistant/extract?source=settings", { premium: true }));

  assert.equal(free.group, "ai-extraction");
  assert.deepEqual(free.policies.map(({ max, windowSeconds }) => [max, windowSeconds]), [
    [1, 60],
    [3, 86_400],
  ]);
  assert.deepEqual(premium.policies.map(({ max, windowSeconds }) => [max, windowSeconds]), [
    [1, 60],
    [25, 86_400],
  ]);
});

test("blocked usage returns retry headers and a structured 429 response", async () => {
  const consume = async () => ({
    allowed: false,
    blocked: {
      key: "record-create:cooldown",
      max: 1,
      remaining: 0,
      windowSeconds: 2,
      retryAfterSeconds: 2,
      resetAt: "2026-08-09T12:00:02.000Z",
      message: "Please wait before creating another record.",
    },
  });
  const middleware = createUsageLimitMiddleware({ consume });
  const response = createResponse();
  let nextCalled = false;

  await middleware(requestFor("/api/animals"), response, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers["Retry-After"], "2");
  assert.equal(response.headers["RateLimit-Remaining"], "0");
  assert.equal(response.body.code, "RATE_LIMITED");
  assert.equal(response.body.retryAfterSeconds, 2);
  assert.match(response.body.error, /Try again in 2 seconds\./);
});

test("successful usage continues and exposes the primary quota", async () => {
  const consume = async ({ policies }) => ({
    allowed: true,
    policies: policies.map((policy) => ({
      ...policy,
      remaining: policy.max - 1,
      retryAfterSeconds: policy.windowSeconds,
    })),
  });
  const middleware = createUsageLimitMiddleware({ consume });
  const response = createResponse();
  let nextCalled = false;

  await middleware(requestFor("/api/import-assistant/extract", { premium: true }), response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(response.headers["RateLimit-Limit"], "25");
  assert.equal(response.headers["RateLimit-Remaining"], "24");
  assert.equal(response.headers["RateLimit-Reset"], "86400");
});

test("retry durations are concise and rounded up", () => {
  assert.equal(formatRetryDuration(1), "1 second");
  assert.equal(formatRetryDuration(59.1), "1 minute");
  assert.equal(formatRetryDuration(3_601), "2 hours");
  assert.equal(formatRetryDuration(86_400), "1 day");
});

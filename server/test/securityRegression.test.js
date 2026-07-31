const test = require("node:test");
const assert = require("node:assert/strict");
const { getSubscriptionFromTrustedState } = require("../middleware/authMiddleware");
const { clearRateLimitStore, createRateLimit } = require("../middleware/rateLimit");
const securityHeaders = require("../middleware/securityHeaders");
const { detectImageMimeType } = require("../utils/imageFiles");

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

test("untrusted account metadata cannot grant premium access", () => {
  const subscription = getSubscriptionFromTrustedState(false, {
    subscription_is_premium: true,
    subscription_source: "unsafe_metadata",
    subscription_status: "active",
  });

  assert.equal(subscription.isPremium, false);
  assert.equal(subscription.plan, "free");
  assert.equal(subscription.premiumSource, "");
});

test("trusted premium grants require a valid source and expiration", () => {
  const manualGrant = getSubscriptionFromTrustedState(false, {
    subscription_is_premium: true,
    subscription_source: "manual_admin",
  });
  const expiredTrial = getSubscriptionFromTrustedState(false, {
    subscription_is_premium: true,
    subscription_source: "clerk_trial",
    subscription_expires_at: "2020-01-01T00:00:00.000Z",
  });

  assert.equal(manualGrant.isPremium, true);
  assert.equal(manualGrant.premiumSource, "manual_admin");
  assert.equal(expiredTrial.isPremium, false);
});

test("the request limiter rejects traffic after the configured allowance", () => {
  clearRateLimitStore();
  const limiter = createRateLimit({ max: 2, windowMs: 60_000 });
  const request = { ip: "127.0.0.1" };
  let accepted = 0;

  const first = createResponse();
  const second = createResponse();
  const third = createResponse();
  limiter(request, first, () => { accepted += 1; });
  limiter(request, second, () => { accepted += 1; });
  limiter(request, third, () => { accepted += 1; });

  assert.equal(accepted, 2);
  assert.equal(third.statusCode, 429);
  assert.equal(third.headers["RateLimit-Remaining"], "0");
  assert.equal(typeof third.headers["Retry-After"], "string");
});

test("security headers deny framing and content-type sniffing", () => {
  const response = createResponse();
  let nextCalled = false;
  securityHeaders({}, response, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(response.headers["X-Frame-Options"], "DENY");
  assert.equal(response.headers["X-Content-Type-Options"], "nosniff");
  assert.match(response.headers["Content-Security-Policy"], /default-src 'none'/);
});

test("uploaded images are identified by file bytes, not their filename", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(4),
  ]);
  const disguisedHtml = Buffer.from("<html><script>alert(1)</script></html>");

  assert.equal(detectImageMimeType(png), "image/png");
  assert.equal(detectImageMimeType(disguisedHtml), null);
});

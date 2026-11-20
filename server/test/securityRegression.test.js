const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getSubscriptionFromTrustedState,
  hasPersonalClerkAccess,
  resolvePersonalSubscription,
  sanitizeFfaAccessForUser,
  shouldVerifyPersonalBilling,
  subscriptionFromBillingState,
} = require("../middleware/authMiddleware");
const { clearRateLimitStore, createRateLimit } = require("../middleware/rateLimit");
const securityHeaders = require("../middleware/securityHeaders");
const { isAdminUser } = require("../middleware/adminAuthorization");
const { buildClientUrls, validateProductionConfig, resolveNodeEnv } = require("../config/env");
const { getDatabaseSslOptions } = require("../config/databaseTls");
const { getEffectiveReminderSubscription } = require("../services/notificationService");
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

test("active Organization entitlements are not mistaken for a personal Clerk plan", () => {
  const auth = { has: () => true };
  assert.equal(hasPersonalClerkAccess(auth, ["premium"], ["premium_access"]), true);
  assert.equal(hasPersonalClerkAccess({ ...auth, orgId: "org_active" }, ["premium"], ["premium_access"]), false);
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

test("personal Clerk billing survives missing active-context claims without trusting stale entitlements", () => {
  const billing = getSubscriptionFromTrustedState(false, {
    subscription_is_premium: true,
    subscription_source: "clerk_billing",
    subscription_status: "active",
    subscription_expires_at: null,
  });
  const entitlementState = {
    subscription_is_premium: true,
    subscription_source: "clerk_entitlement",
    subscription_status: "active",
    subscription_expires_at: null,
  };
  const entitlement = getSubscriptionFromTrustedState(false, entitlementState);
  const expiredBilling = getSubscriptionFromTrustedState(false, {
    subscription_is_premium: true,
    subscription_source: "clerk_billing",
    subscription_status: "active",
    subscription_expires_at: "2020-01-01T00:00:00.000Z",
  });

  assert.equal(billing.isPremium, true);
  assert.equal(billing.premiumSource, "clerk_billing");
  assert.equal(entitlement.isPremium, false);
  assert.equal(shouldVerifyPersonalBilling(false, entitlementState, entitlement), true);
  assert.deepEqual(subscriptionFromBillingState({
    isPremium: true,
    status: "active",
    source: "clerk_billing",
    expiresAt: "",
  }), {
    plan: "premium",
    status: "active",
    isPremium: true,
    premiumExpiresAt: "",
    premiumSource: "clerk_billing",
  });
  assert.equal(expiredBilling.isPremium, false);
});

test("stored session entitlements are reverified against personal Clerk Billing", async () => {
  const localState = {
    subscription_is_premium: true,
    subscription_source: "clerk_entitlement",
    subscription_status: "active",
    subscription_expires_at: null,
  };
  const active = await resolvePersonalSubscription({
    localState,
    clerkUserId: "user_active",
    planCandidates: ["premium"],
    billingClient: {
      async getUserBillingSubscription() {
        return {
          subscriptionItems: [{
            status: "active",
            plan: { slug: "premium", isDefault: false },
          }],
        };
      },
    },
  });
  const ended = await resolvePersonalSubscription({
    localState,
    clerkUserId: "user_ended",
    planCandidates: ["premium"],
    billingClient: {
      async getUserBillingSubscription() {
        return { subscriptionItems: [] };
      },
    },
  });

  assert.equal(active.subscription.isPremium, true);
  assert.equal(active.subscription.premiumSource, "clerk_billing");
  assert.equal(active.shouldPersist, true);
  assert.equal(ended.subscription.isPremium, false);
  assert.equal(ended.shouldPersist, true);
});

test("a failed personal Billing recheck neither grants stale Premium nor rewrites the stored state", async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await resolvePersonalSubscription({
      localState: {
        subscription_is_premium: true,
        subscription_source: "clerk_entitlement",
        subscription_status: "active",
      },
      clerkUserId: "user_retry_later",
      billingClient: {
        async getUserBillingSubscription() {
          throw new Error("temporary Clerk failure");
        },
      },
    });

    assert.equal(result.subscription.isPremium, false);
    assert.equal(result.shouldPersist, false);
    assert.equal(result.verificationFailed, true);
  } finally {
    console.warn = originalWarn;
  }
});

test("request user FFA state omits internal membership, code, and Clerk Organization identifiers", () => {
  const safe = sanitizeFfaAccessForUser({
    hasChapter: true,
    hasAdvisorMembership: true,
    chapters: [{
      id: 3,
      chapterName: "Herington FFA",
      membershipRole: "org:member",
      joinCode: "ABCD-EFGH-JKLM",
      clerkOrgId: "org_secret",
    }],
    chapter: {
      id: 3,
      chapterName: "Herington FFA",
      joinCode: "ABCD-EFGH-JKLM",
      clerkOrgId: "org_secret",
    },
    accesses: [{ chapter: { clerk_org_id: "org_secret", join_code: "ABCD-EFGH-JKLM" } }],
  });
  const serialized = JSON.stringify(safe);

  assert.equal(safe.chapter.chapterName, "Herington FFA");
  assert.equal(safe.hasAdvisorMembership, true);
  assert.doesNotMatch(serialized, /ABCD-EFGH-JKLM/);
  assert.doesNotMatch(serialized, /org_secret/);
  assert.equal(Object.hasOwn(safe, "accesses"), false);
});

test("automatic reminder eligibility uses personal OR chapter Premium without chapter downgrades", () => {
  const personal = getEffectiveReminderSubscription({
    subscription_is_premium: true,
    subscription_source: "clerk_billing",
    subscription_status: "active",
  }, {
    chapterPremiumActive: false,
  });
  const chapter = getEffectiveReminderSubscription({
    subscription_is_premium: false,
    subscription_source: "",
  }, {
    chapterPremiumActive: true,
    premiumExpiresAt: "2027-08-14T00:00:00.000Z",
  });

  assert.equal(personal.isPremium, true);
  assert.equal(personal.premiumSource, "clerk_billing");
  assert.equal(chapter.isPremium, true);
  assert.equal(chapter.premiumSource, "ffa_chapter");
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

test("admin access is granted by Clerk user ID and never by email alone", () => {
  const previousIds = process.env.ADMIN_CLERK_USER_IDS;
  const previousEmails = process.env.ADMIN_EMAILS;
  process.env.ADMIN_CLERK_USER_IDS = "user_admin_test";
  process.env.ADMIN_EMAILS = "admin@example.com";

  try {
    assert.equal(isAdminUser({ clerkUserId: "user_admin_test", email: "other@example.com" }), true);
    assert.equal(isAdminUser({ clerkUserId: "user_regular", email: "admin@example.com" }), false);
  } finally {
    if (previousIds === undefined) delete process.env.ADMIN_CLERK_USER_IDS;
    else process.env.ADMIN_CLERK_USER_IDS = previousIds;
    if (previousEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousEmails;
  }
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

test("production CORS origins exclude localhost even if it is configured", () => {
  const productionOrigins = buildClientUrls("https://app.example.com,http://localhost:5173", "production");
  const developmentOrigins = buildClientUrls("https://app.example.com,http://localhost:5173", "development");

  assert.deepEqual(productionOrigins, [
    "https://app.example.com",
    "https://barnbuddy.pro",
    "https://www.barnbuddy.pro",
  ]);
  assert.ok(developmentOrigins.includes("http://localhost:5173"));
});

test("Railway's production environment enables production protections without relying on NODE_ENV", () => {
  assert.equal(resolveNodeEnv({ RAILWAY_ENVIRONMENT_NAME: "production" }), "production");
  assert.equal(resolveNodeEnv({ RAILWAY_ENVIRONMENT_NAME: "Staging", NODE_ENV: "development" }), "development");
});

test("production PostgreSQL TLS verifies the Railway CA and certificate name", () => {
  assert.deepEqual(getDatabaseSslOptions({
    nodeEnv: "production",
    databaseSslCaCert: "test-ca",
    databaseSslServername: "localhost",
  }), {
    ca: "test-ca",
    rejectUnauthorized: true,
    servername: "localhost",
  });
  assert.equal(getDatabaseSslOptions({ nodeEnv: "development" }), false);
});

test("production configuration rejects missing database and non-live Clerk credentials", () => {
  const configuration = {
    databaseUrl: "",
    databaseSslCaCert: "-----BEGIN CERTIFICATE-----test-----END CERTIFICATE-----",
    databaseSslServername: "localhost",
    rateLimitHmacSecret: "unit-test-rate-limit-secret-at-least-32",
    adminClerkUserIds: ["user_admin_test"],
    clerk: {
      publishableKey: "pk_test_placeholder",
      secretKey: "sk_test_placeholder",
      webhookSigningSecret: "whsec_configured_by_test",
      premiumPlanSlug: "premium",
    },
  };
  assert.throws(() => validateProductionConfig(configuration), /DATABASE_URL/);

  configuration.databaseUrl = "postgres://configured-by-test";
  assert.throws(() => validateProductionConfig(configuration), /live Clerk publishable key/);

  configuration.clerk.publishableKey = "pk_live_configured-by-test";
  assert.throws(() => validateProductionConfig(configuration), /live Clerk secret key/);

  configuration.clerk.secretKey = "sk_live_configured-by-test";
  assert.doesNotThrow(() => validateProductionConfig(configuration));

  configuration.databaseSslCaCert = "";
  assert.throws(() => validateProductionConfig(configuration), /DATABASE_SSL_CA_CERT/);
});

test("production API responses receive HSTS", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const response = createResponse();
  try {
    securityHeaders({}, response, () => {});
    assert.equal(response.headers["Strict-Transport-Security"], "max-age=31536000; includeSubDomains");
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("auth middleware rejects cookie-only requests to avoid CSRF", async () => {
  const authMiddleware = require("../middleware/authMiddleware");
  const response = createResponse();
  let nextCalled = false;
  const request = {
    headers: { cookie: "__session=present" },
    path: "/api/animals",
    get(name) { return this.headers[name.toLowerCase()]; },
  };

  await authMiddleware(request, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
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

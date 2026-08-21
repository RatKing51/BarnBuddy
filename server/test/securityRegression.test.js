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

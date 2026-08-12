const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getAdminSubscriptionState,
  getClerkBillingSubscriptionState,
  hasPremiumMetadata,
  isClerkManagedLocalPremium,
} = require("../services/adminSubscription");

test("admin subscription uses an actual Clerk-backed local entitlement", () => {
  const localUser = {
    subscription_is_premium: true,
    subscription_status: "active",
    subscription_source: "clerk_billing",
    subscription_expires_at: null,
  };

  assert.equal(isClerkManagedLocalPremium(localUser), true);
  assert.deepEqual(getAdminSubscriptionState({}, localUser), {
    isPremium: true,
    plan: "premium",
    subscriptionStatus: "active",
    premiumSource: "clerk_billing",
    premiumExpiresAt: "",
    premiumExpired: false,
  });
});

test("expired metadata and local grants do not appear active", () => {
  const expired = new Date(Date.now() - 60_000).toISOString();
  assert.equal(hasPremiumMetadata({ plan: "premium", subscriptionStatus: "active", premiumExpiresAt: expired }), false);
  assert.equal(getAdminSubscriptionState({}, {
    subscription_is_premium: true,
    subscription_source: "manual_admin",
    subscription_expires_at: expired,
  }).isPremium, false);
});

test("Clerk Billing subscription items resolve paid and canceled access", () => {
  const active = getClerkBillingSubscriptionState({
    subscriptionItems: [{ status: "active", planId: "plan_premium", plan: { slug: "premium" } }],
  }, ["plan_premium", "premium"]);
  assert.equal(active.isPremium, true);
  assert.equal(active.source, "clerk_billing");

  const paidCustomPlan = getClerkBillingSubscriptionState({
    subscriptionItems: [{
      status: "active",
      amount: { amount: 500, currency: "USD" },
      plan: { slug: "barnbuddy-plus", isDefault: false, hasBaseFee: true },
    }],
  }, ["premium"]);
  assert.equal(paidCustomPlan.isPremium, true);

  const canceled = getClerkBillingSubscriptionState({
    subscriptionItems: [{
      status: "canceled",
      plan: { slug: "premium" },
      periodEnd: Date.now() + 86_400_000,
    }],
  }, ["premium"]);
  assert.equal(canceled.isPremium, true);
  assert.equal(canceled.source, "clerk_billing_canceled");
  assert.ok(canceled.expiresAt);
});

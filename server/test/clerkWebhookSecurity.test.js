const test = require("node:test");
const assert = require("node:assert/strict");
const { getBillingEventCreatedAt, isPremiumBillingEvent } = require("../routes/clerkWebhooks");

test("Clerk Billing webhook plan matching fails closed for missing and unknown plans", () => {
  const noPlansConfigured = { planSlugs: new Set(), planIds: new Set(), featureSlugs: new Set() };
  const premiumPlanConfigured = { planSlugs: new Set(["premium"]), planIds: new Set(), featureSlugs: new Set() };
  assert.equal(isPremiumBillingEvent({}), false);
  assert.equal(isPremiumBillingEvent({ plan: { slug: "free" } }, noPlansConfigured), false);
  assert.equal(isPremiumBillingEvent({ plan: { slug: "unrelated-paid-plan" } }, noPlansConfigured), false);
  assert.equal(isPremiumBillingEvent({ plan: { slug: "pro" } }, noPlansConfigured), false);
  assert.equal(isPremiumBillingEvent({ plan: { slug: "premium" } }, premiumPlanConfigured), true);
  assert.equal(isPremiumBillingEvent({ plan: { slug: "premium" } }, noPlansConfigured), false);
  assert.equal(isPremiumBillingEvent({
    subscription_item: { plan: { slug: "plus", features: [{ slug: "premium_access" }] } },
  }, { planSlugs: new Set(), planIds: new Set(), featureSlugs: new Set(["premium_access"]) }), true);
});

test("Clerk Billing webhook timestamps normalize to UTC for ordering guards", () => {
  assert.equal(
    getBillingEventCreatedAt({ timestamp: 1_800_000_000_000 }),
    new Date(1_800_000_000_000).toISOString()
  );
  assert.equal(getBillingEventCreatedAt({}), "");
});

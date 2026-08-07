const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../data-source");
const {
  buildExpiredManualPremiumMetadata,
  describeTimeRemaining,
  getExpiryReminderWindow,
  getManualPremiumMetadataState,
} = require("../services/premiumExpirationService");
const {
  getBillingPeriodEnd,
  normalizeBillingTimestamp,
} = require("../routes/clerkWebhooks");

const DAY_MS = 24 * 60 * 60 * 1000;

test.after(async () => {
  await pool.end();
});

test("selects the nearest configured reminder window", () => {
  const now = Date.UTC(2026, 6, 31, 12);

  assert.equal(getExpiryReminderWindow(now + 6 * DAY_MS, now).threshold, 7);
  assert.equal(getExpiryReminderWindow(now + 3 * DAY_MS, now).threshold, 3);
  assert.equal(getExpiryReminderWindow(now + DAY_MS, now).threshold, 1);
});

test("ignores expirations outside the reminder range or in the past", () => {
  const now = Date.UTC(2026, 6, 31, 12);

  assert.equal(getExpiryReminderWindow(now + 8 * DAY_MS, now), null);
  assert.equal(getExpiryReminderWindow(now - 1, now), null);
  assert.equal(getExpiryReminderWindow("not-a-date", now), null);
});

test("formats remaining time for email copy", () => {
  assert.equal(describeTimeRemaining(30 * 60 * 1000), "1 hour");
  assert.equal(describeTimeRemaining(6 * 60 * 60 * 1000), "6 hours");
  assert.equal(describeTimeRemaining(2 * DAY_MS), "2 days");
});

test("identifies only expired manual Clerk grants", () => {
  const now = Date.parse("2026-08-07T12:00:00.000Z");

  assert.equal(getManualPremiumMetadataState({ premiumSource: "manual_admin", premiumExpiresAt: "2026-08-06T12:00:00.000Z" }, now), "expired");
  assert.equal(getManualPremiumMetadataState({ premiumSource: "manual_admin", premiumExpiresAt: "2026-08-08T12:00:00.000Z" }, now), "active");
  assert.equal(getManualPremiumMetadataState({ premiumSource: "manual_admin", premiumExpiresAt: "" }, now), "lifetime");
  assert.equal(getManualPremiumMetadataState({ premiumSource: "clerk_billing", premiumExpiresAt: "2026-08-06T12:00:00.000Z" }, now), "unmanaged");
});

test("clears every Clerk metadata field that can preserve manual Premium access", () => {
  const metadata = buildExpiredManualPremiumMetadata({
    favoriteSpecies: "cattle",
    plan: "premium",
    subscriptionStatus: "active",
    premiumSource: "manual_admin",
    premiumExpiresAt: "2026-08-06T12:00:00.000Z",
    premium: true,
    isPremium: true,
    hasPremium: true,
  });

  assert.equal(metadata.favoriteSpecies, "cattle");
  assert.equal(metadata.plan, "free");
  assert.equal(metadata.subscriptionPlan, "free");
  assert.equal(metadata.subscriptionStatus, "expired");
  assert.equal(metadata.premiumSource, "");
  assert.equal(metadata.premiumExpiresAt, "");
  assert.equal(metadata.premium, false);
  assert.equal(metadata.isPremium, false);
  assert.equal(metadata.hasPremium, false);
});

test("normalizes Clerk Billing period-end timestamps", () => {
  const expected = "2026-08-31T12:00:00.000Z";
  const milliseconds = Date.parse(expected);

  assert.equal(normalizeBillingTimestamp(milliseconds), expected);
  assert.equal(normalizeBillingTimestamp(milliseconds / 1000), expected);
  assert.equal(getBillingPeriodEnd({ period_end: milliseconds }), expected);
  assert.equal(getBillingPeriodEnd({ subscriptionItem: { periodEnd: milliseconds } }), expected);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../data-source");
const {
  describeTimeRemaining,
  getExpiryReminderWindow,
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

test("normalizes Clerk Billing period-end timestamps", () => {
  const expected = "2026-08-31T12:00:00.000Z";
  const milliseconds = Date.parse(expected);

  assert.equal(normalizeBillingTimestamp(milliseconds), expected);
  assert.equal(normalizeBillingTimestamp(milliseconds / 1000), expected);
  assert.equal(getBillingPeriodEnd({ period_end: milliseconds }), expected);
  assert.equal(getBillingPeriodEnd({ subscriptionItem: { periodEnd: milliseconds } }), expected);
});

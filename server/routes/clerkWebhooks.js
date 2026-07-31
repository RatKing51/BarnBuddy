const express = require("express");
const { Webhook } = require("svix");
const env = require("../config/env");
const { syncClerkWebhookUser } = require("../services/clerkUserSync");
const { deleteUserDataByClerkUserId } = require("../services/deleteUserData");
const { sendWelcomeEmail } = require("../services/emailService");
const {
  activatePremiumUserByClerkId,
  downgradePremiumUserByClerkId,
  markPremiumExpiringByClerkId,
} = require("../services/premiumDowngradeCleanup");

const router = express.Router();
const premiumPlanValues = new Set([
  "premium",
  "pro",
  "paid",
  "active",
  ...(process.env.CLERK_PREMIUM_PLAN_SLUG || "").split(",").map(normalizeValue).filter(Boolean),
]);
const downgradeBillingEvents = new Set([
  "subscription.pastDue",
  "subscriptionItem.ended",
  "subscriptionItem.pastDue",
]);
const activateBillingEvents = new Set(["subscriptionItem.active", "subscriptionItem.updated"]);

function verifyClerkWebhook(req) {
  if (!env.clerk.webhookSigningSecret) {
    throw new Error("CLERK_WEBHOOK_SIGNING_SECRET is required for Clerk webhooks.");
  }

  const svixId = req.headers["svix-id"];
  const svixTimestamp = req.headers["svix-timestamp"];
  const svixSignature = req.headers["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    const error = new Error("Missing Svix webhook headers.");
    error.status = 400;
    throw error;
  }

  const wh = new Webhook(env.clerk.webhookSigningSecret);
  return wh.verify(req.body.toString("utf8"), {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  });
}

function getPrimaryEmail(clerkUser) {
  const emailAddresses = clerkUser.email_addresses || clerkUser.emailAddresses || [];
  const primaryEmailId = clerkUser.primary_email_address_id || clerkUser.primaryEmailAddressId;
  const primaryEmail =
    clerkUser.primaryEmailAddress ||
    emailAddresses.find(
      (email) => email.id === primaryEmailId
    );

  return (
    primaryEmail?.email_address ||
    primaryEmail?.emailAddress ||
    emailAddresses[0]?.email_address ||
    emailAddresses[0]?.emailAddress ||
    null
  );
}

function normalizeValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getBillingPayerUserId(data = {}) {
  return (
    data.payer?.user_id ||
    data.payer?.userId ||
    data.payer?.id ||
    data.user_id ||
    data.userId ||
    data.subscription?.payer?.user_id ||
    data.subscription?.payer?.userId ||
    null
  );
}

function getPlanSlugs(data = {}) {
  return [
    data.plan?.slug,
    data.plan_slug,
    data.planSlug,
    ...(Array.isArray(data.items) ? data.items.map((item) => item?.plan?.slug) : []),
  ]
    .map(normalizeValue)
    .filter(Boolean);
}

function isPremiumBillingEvent(data = {}) {
  const planSlugs = getPlanSlugs(data);

  if (planSlugs.length === 0) return true;
  return planSlugs.some((slug) => slug !== "free" && premiumPlanValues.has(slug));
}

function normalizeBillingTimestamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value < 1e12 ? value * 1000 : value;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    if (/^\d+$/.test(value.trim())) return normalizeBillingTimestamp(Number(value.trim()));
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  return "";
}

function getBillingPeriodEnd(data = {}) {
  const nested = data.subscription_item || data.subscriptionItem || data.item || {};
  const candidates = [
    data.period_end,
    data.periodEnd,
    data.free_trial_ends_at,
    data.freeTrialEndsAt,
    nested.period_end,
    nested.periodEnd,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBillingTimestamp(candidate);
    if (normalized) return normalized;
  }

  return "";
}

router.post("/", async (req, res) => {
  let event;

  try {
    event = verifyClerkWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err.message);
    return res.status(err.status || 400).json({ error: "Invalid webhook signature" });
  }

  try {
    if (event.type === "user.created") {
      const user = await syncClerkWebhookUser(event.data);
      const email = getPrimaryEmail(event.data);

      if (email) {
        await sendWelcomeEmail({ to: email, name: user.name });
      }
    }

    if (event.type === "user.updated") {
      await syncClerkWebhookUser(event.data);
    }

    if (event.type === "user.deleted" && event.data?.id) {
      await deleteUserDataByClerkUserId(event.data.id);
    }

    if (["subscriptionItem.canceled", "subscriptionItem.freeTrialEnding"].includes(event.type) && isPremiumBillingEvent(event.data)) {
      const clerkUserId = getBillingPayerUserId(event.data);
      const expiresAt = getBillingPeriodEnd(event.data);

      if (!clerkUserId || !expiresAt) {
        console.warn("Clerk expiring subscription webhook was missing payer or period end.", {
          eventType: event.type,
          eventId: event.id,
        });
      } else {
        await markPremiumExpiringByClerkId(clerkUserId, {
          expiresAt,
          source: event.type === "subscriptionItem.freeTrialEnding" ? "clerk_trial" : "clerk_billing_canceled",
          status: event.type === "subscriptionItem.freeTrialEnding" ? "trialing" : "canceled",
        });
      }
    }

    if (activateBillingEvents.has(event.type) && isPremiumBillingEvent(event.data)) {
      const clerkUserId = getBillingPayerUserId(event.data);
      if (clerkUserId) await activatePremiumUserByClerkId(clerkUserId);
    }

    if (downgradeBillingEvents.has(event.type) && isPremiumBillingEvent(event.data)) {
      const clerkUserId = getBillingPayerUserId(event.data);
      const status = event.type.split(".")[1] || "free";

      if (!clerkUserId) {
        console.warn("Clerk billing downgrade webhook did not include a user payer.", {
          eventType: event.type,
          eventId: event.id,
        });
      } else {
        await downgradePremiumUserByClerkId(clerkUserId, status);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error(`Failed to handle Clerk webhook ${event.type}:`, err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
});

module.exports = router;
module.exports.getBillingPeriodEnd = getBillingPeriodEnd;
module.exports.normalizeBillingTimestamp = normalizeBillingTimestamp;

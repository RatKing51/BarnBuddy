const express = require("express");
const { Webhook } = require("svix");
const env = require("../config/env");
const { syncClerkWebhookUser } = require("../services/clerkUserSync");
const { deleteUserDataByClerkUserId } = require("../services/deleteUserData");
const { sendWelcomeEmail } = require("../services/emailService");
const { downgradePremiumUserByClerkId } = require("../services/premiumDowngradeCleanup");

const router = express.Router();
const premiumPlanValues = new Set(["premium", "pro", "paid", "active"]);
const downgradeBillingEvents = new Set([
  "subscription.pastDue",
  "subscriptionItem.canceled",
  "subscriptionItem.ended",
  "subscriptionItem.pastDue",
]);

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

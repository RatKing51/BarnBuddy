const express = require("express");
const { Webhook } = require("svix");
const env = require("../config/env");
const { syncClerkWebhookUser } = require("../services/clerkUserSync");
const { deleteUserDataByClerkUserId } = require("../services/deleteUserData");
const { sendWelcomeEmail } = require("../services/emailService");

const router = express.Router();

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
  const primaryEmail = clerkUser.email_addresses?.find(
    (email) => email.id === clerkUser.primary_email_address_id
  );

  return primaryEmail?.email_address || clerkUser.email_addresses?.[0]?.email_address || null;
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

    return res.json({ received: true });
  } catch (err) {
    console.error(`Failed to handle Clerk webhook ${event.type}:`, err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
});

module.exports = router;

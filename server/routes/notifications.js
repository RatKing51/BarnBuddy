const express = require("express");
const crypto = require("crypto");
const env = require("../config/env");
const authMiddleware = require("../middleware/authMiddleware");
const {
  previewUserReminders,
  sendDueReminderEmails,
  sendUserReminderEmail,
} = require("../services/notificationService");
const { sendPremiumExpirationReminders } = require("../services/premiumExpirationService");

const router = express.Router();

function safeSecretEquals(value, expected) {
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(String(value));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function requirePremium(req, res) {
  if (!req.user.subscription?.isPremium) {
    res.status(403).json({
      error: "Premium is required for automatic reminders.",
      subscription: req.user.subscription || null,
    });
    return false;
  }

  return true;
}

router.get("/reminders/preview", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    const preview = await previewUserReminders(req.user.id);
    res.json({
      windowDays: preview.windowDays,
      automaticReminders: preview.automaticReminders,
      emailEnabled: env.email.enabled,
      items: preview.items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to preview reminders",
      detail: env.nodeEnv === "production" ? undefined : err.message,
    });
  }
});

router.post("/reminders/send", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    const result = await sendUserReminderEmail(req.user.id, { force: Boolean(req.body?.force) });
    res.json({
      sent: Boolean(result.sent),
      skipped: Boolean(result.skipped),
      reason: result.reason || "",
      windowDays: result.windowDays,
      automaticReminders: result.automaticReminders,
      emailEnabled: env.email.enabled,
      itemCount: result.items?.length || 0,
      items: result.items || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to send reminder email",
      detail: env.nodeEnv === "production" ? undefined : err.message,
    });
  }
});

router.post("/reminders/run", async (req, res) => {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.body?.secret;

  if (!safeSecretEquals(token, env.notifications.cronSecret)) {
    return res.status(401).json({ error: "Unauthorized reminder run." });
  }

  try {
    const careResults = await sendDueReminderEmails({ limit: req.body?.limit });
    const premiumResults = await sendPremiumExpirationReminders({ limit: req.body?.limit });
    const results = [
      ...careResults.map((result) => ({ kind: "care", ...result })),
      ...premiumResults.map((result) => ({ kind: "premium-expiration", ...result })),
    ];
    const sent = results.filter((result) => result.sent).length;
    const skipped = results.filter((result) => result.skipped).length;
    const failed = results.filter((result) => result.error).length;
    res.json({ sent, skipped, failed, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to run reminder emails" });
  }
});

module.exports = router;

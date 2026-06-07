const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const env = require("../config/env");
const { sendTestEmail } = require("../services/emailService");

const router = express.Router();

router.post("/test", authMiddleware, async (req, res) => {
  const userEmail = String(req.user.email || "").toLowerCase();
  const allowedEmails = env.email.testAllowedEmails;
  const allowedClerkUserIds = env.email.testAllowedClerkUserIds;
  const isAllowedByEmail = allowedEmails.includes(userEmail);
  const isAllowedByClerkId = allowedClerkUserIds.includes(req.user.clerkUserId);

  if (!isAllowedByEmail && !isAllowedByClerkId) {
    return res.status(403).json({
      error: "You are not allowed to send test emails.",
    });
  }

  const to = String(req.body?.to || req.user.email || "").trim();

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({
      error: "A valid recipient email is required.",
    });
  }

  try {
    const result = await sendTestEmail({
      to,
      requestedBy: req.user.email,
    });

    return res.status(202).json({
      ok: true,
      to,
      email: result,
    });
  } catch (err) {
    console.error("Failed to send test email:", err.message);
    return res.status(500).json({
      error: "Failed to send test email.",
    });
  }
});

module.exports = router;

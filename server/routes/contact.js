const express = require("express");
const { sendContactEmail } = require("../services/emailService");
const pool = require("../data-source");
const { createRateLimit } = require("../middleware/rateLimit");

const router = express.Router();
const contactRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many contact requests. Please wait and try again.",
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

router.post("/", contactRateLimit, async (req, res) => {
  const name = normalizeString(req.body.name);
  const email = normalizeString(req.body.email);
  const topic = normalizeString(req.body.topic) || "General question";
  const message = normalizeString(req.body.message);

  if (!name || !email || !message) {
    return res.status(400).json({
      error: "Name, email, and message are required.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: "Please enter a valid email address.",
    });
  }

  if (name.length > 120 || email.length > 254 || topic.length > 120 || message.length > 5_000) {
    return res.status(400).json({
      error: "One or more fields are too long.",
    });
  }

  try {
    await pool.query(
      `INSERT INTO contact_messages (name, email, topic, message)
       VALUES ($1, $2, $3, $4)`,
      [name, email, topic, message]
    );
    const result = await sendContactEmail({ name, email, topic, message });
    return res.status(202).json({ ok: true, email: result });
  } catch (err) {
    console.error("Failed to send contact email:", err.message);
    return res.status(500).json({
      error: "Failed to send message. Please try again later.",
    });
  }
});

module.exports = router;

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getNewsletterSubscriptionByEmail,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
} = require("../services/newsletterService");

const router = express.Router();

router.post("/subscribe", async (req, res) => {
  try {
    const subscriber = await subscribeToNewsletter({
      email: req.body.email,
      source: req.body.source || "footer",
    });

    return res.status(201).json({
      ok: true,
      subscriber,
    });
  } catch (err) {
    console.error("Newsletter subscription failed:", err.message);
    return res.status(err.status || 500).json({
      error: err.status ? err.message : "Failed to subscribe. Please try again later.",
    });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const subscriber = await getNewsletterSubscriptionByEmail(req.user.email);

    return res.json({
      email: req.user.email,
      subscribed: subscriber?.status === "subscribed",
      subscriber,
    });
  } catch (err) {
    console.error("Newsletter status lookup failed:", err.message);
    return res.status(500).json({
      error: "Failed to load newsletter status.",
    });
  }
});

router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const subscribed = Boolean(req.body.subscribed);
    const subscriber = subscribed
      ? await subscribeToNewsletter({
          email: req.user.email,
          source: "account-settings",
        })
      : await unsubscribeFromNewsletter({
          email: req.user.email,
        });

    return res.json({
      ok: true,
      email: req.user.email,
      subscribed: subscriber.status === "subscribed",
      subscriber,
    });
  } catch (err) {
    console.error("Newsletter preference update failed:", err.message);
    return res.status(err.status || 500).json({
      error: err.status ? err.message : "Failed to update newsletter setting.",
    });
  }
});

module.exports = router;

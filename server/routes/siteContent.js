const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const pool = require("../data-source");
const {
  defaultSiteContent,
  getAdminActivity,
  getSiteMedia,
  getSiteContent,
  logAdminActivity,
  updateSiteContent,
} = require("../services/siteContent");

const router = express.Router();
const validTones = new Set(["green", "blue", "yellow", "red"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"), false);
    }
  },
});

function readEnvList(name) {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAdminUser(user) {
  const allowedEmails = readEnvList("ADMIN_EMAILS").map((email) => email.toLowerCase());
  const allowedClerkIds = readEnvList("ADMIN_CLERK_USER_IDS");

  return Boolean(
    (user.email && allowedEmails.includes(user.email.toLowerCase())) ||
      (user.clerkUserId && allowedClerkIds.includes(user.clerkUserId))
  );
}

function requireAdmin(req, res, next) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

function asTrimmedString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sanitizeNewsPosts(newsPosts) {
  if (!Array.isArray(newsPosts)) {
    throw new Error("News posts must be a list.");
  }

  return newsPosts.map((post, index) => {
    const title = asTrimmedString(post.title);
    const date = asTrimmedString(post.date);

    if (!title) throw new Error(`News post ${index + 1} needs a title.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`News post ${index + 1} needs a valid date.`);

    return {
      id: asTrimmedString(post.id) || slugify(title) || `post-${Date.now()}-${index}`,
      title,
      date,
      category: asTrimmedString(post.category, "Updates"),
      excerpt: asTrimmedString(post.excerpt),
      body: asTrimmedString(post.body),
      image: asTrimmedString(post.image, "/bblogo.png"),
      imageAlt: asTrimmedString(post.imageAlt, title),
      imageFit: post.imageFit === "contain" ? "contain" : "cover",
      featured: post.featured === true,
      published: post.published !== false,
    };
  });
}

function sanitizeReviews(reviews = []) {
  if (!Array.isArray(reviews)) {
    throw new Error("Reviews must be a list.");
  }

  return reviews.map((review, index) => {
    const name = asTrimmedString(review.name);
    const text = asTrimmedString(review.text);
    const rating = Math.max(1, Math.min(Number.parseFloat(review.rating) || 5, 5));
    const published = review.published !== false;

    if (published && !name) throw new Error(`Published review ${index + 1} needs a name.`);
    if (published && !text) throw new Error(`Published review ${index + 1} needs review text.`);

    return {
      id: asTrimmedString(review.id) || slugify(`${name || "draft"}-${review.date || Date.now()}`) || `review-${Date.now()}-${index}`,
      name,
      role: asTrimmedString(review.role, "BarnBuddy user"),
      rating,
      date: asTrimmedString(review.date, new Date().toLocaleString("en-US", { month: "short", year: "numeric" })),
      tag: asTrimmedString(review.tag, "Verified user"),
      text,
      published,
    };
  });
}

function sanitizeStatus(status = {}) {
  const services = Array.isArray(status.services) ? status.services : defaultSiteContent.status.services;

  return {
    headline: asTrimmedString(status.headline, defaultSiteContent.status.headline),
    summary: asTrimmedString(status.summary, defaultSiteContent.status.summary),
    overallStatus: asTrimmedString(status.overallStatus, "Operational"),
    overallTone: validTones.has(status.overallTone) ? status.overallTone : "green",
    services: services.map((service, index) => ({
      name: asTrimmedString(service.name, `Service ${index + 1}`),
      status: asTrimmedString(service.status, "Operational"),
      tone: validTones.has(service.tone) ? service.tone : "green",
    })),
    recentUpdateTitle: asTrimmedString(status.recentUpdateTitle, "Recent updates"),
    recentUpdateBody: asTrimmedString(status.recentUpdateBody, "No incidents reported."),
  };
}

function sanitizeAnnouncement(announcement = {}) {
  return {
    enabled: announcement.enabled === true,
    tone: validTones.has(announcement.tone) ? announcement.tone : "blue",
    title: asTrimmedString(announcement.title),
    message: asTrimmedString(announcement.message),
    linkText: asTrimmedString(announcement.linkText),
    linkUrl: asTrimmedString(announcement.linkUrl),
  };
}

function sanitizeMaintenance(maintenance = {}) {
  return {
    enabled: maintenance.enabled === true,
    title: asTrimmedString(maintenance.title, defaultSiteContent.maintenance.title),
    message: asTrimmedString(maintenance.message, defaultSiteContent.maintenance.message),
    estimatedReturn: asTrimmedString(maintenance.estimatedReturn),
  };
}

router.get("/", async (req, res) => {
  try {
    const content = await getSiteContent();
    res.json(content);
  } catch (err) {
    console.error("Failed to load site content:", err);
    res.status(500).json({ error: "Failed to load site content" });
  }
});

router.get("/media/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mime_type, data
       FROM site_media
       WHERE id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.set("Content-Type", result.rows[0].mime_type);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(result.rows[0].data);
  } catch (err) {
    console.error("Failed to load site media:", err);
    res.status(500).json({ error: "Failed to load image" });
  }
});

router.get("/admin", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const content = await getSiteContent({ includeDrafts: true });
    res.json(content);
  } catch (err) {
    console.error("Failed to load admin site content:", err);
    res.status(500).json({ error: "Failed to load site content" });
  }
});

router.get("/admin/activity", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const activity = await getAdminActivity({ limit: req.query.limit });
    res.json({ activity });
  } catch (err) {
    console.error("Failed to load admin activity:", err);
    res.status(500).json({ error: "Failed to load admin activity" });
  }
});

router.get("/admin/media", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const media = await getSiteMedia({ limit: req.query.limit });
    res.json({ media });
  } catch (err) {
    console.error("Failed to load site media library:", err);
    res.status(500).json({ error: "Failed to load media library" });
  }
});

router.get("/admin/support", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [messagesResult, subscribersResult] = await Promise.all([
      pool.query(
        `SELECT id, name, email, topic, message, status, created_at, updated_at
         FROM contact_messages
         ORDER BY created_at DESC
         LIMIT 80`
      ),
      pool.query(
        `SELECT id, email, status, source, subscribed_at, unsubscribed_at, updated_at
         FROM newsletter_subscribers
         ORDER BY updated_at DESC
         LIMIT 80`
      ).catch((err) => {
        if (err.code === "42P01") return { rows: [] };
        throw err;
      }),
    ]);

    res.json({
      messages: messagesResult.rows,
      newsletterSubscribers: subscribersResult.rows,
    });
  } catch (err) {
    console.error("Failed to load support inbox:", err);
    res.status(500).json({ error: "Failed to load support inbox" });
  }
});

router.patch("/admin/support/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const status = ["new", "open", "closed"].includes(req.body.status) ? req.body.status : "open";
    const result = await pool.query(
      `UPDATE contact_messages
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, topic, message, status, created_at, updated_at`,
      [status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Support message not found" });
    }

    await logAdminActivity({
      userId: req.user.id,
      action: "support_message_updated",
      details: {
        messageId: result.rows[0].id,
        status,
      },
    });

    res.json({ message: result.rows[0] });
  } catch (err) {
    console.error("Failed to update support message:", err);
    res.status(500).json({ error: "Failed to update support message" });
  }
});

router.put("/admin", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const newsPosts = sanitizeNewsPosts(req.body.newsPosts);
    const status = sanitizeStatus(req.body.status);
    const announcement = sanitizeAnnouncement(req.body.announcement);
    const maintenance = sanitizeMaintenance(req.body.maintenance);
    const reviews = sanitizeReviews(req.body.reviews);
    const content = await updateSiteContent({ newsPosts, status, announcement, maintenance, reviews, userId: req.user.id });
    await logAdminActivity({
      userId: req.user.id,
      action: "website_content_updated",
      details: {
        newsPostCount: newsPosts.length,
        publishedPostCount: newsPosts.filter((post) => post.published !== false).length,
        overallStatus: status.overallStatus,
        serviceCount: status.services.length,
        announcementEnabled: announcement.enabled,
        maintenanceEnabled: maintenance.enabled,
        reviewCount: reviews.length,
        publishedReviewCount: reviews.filter((review) => review.published !== false).length,
      },
    });
    res.json(content);
  } catch (err) {
    const statusCode = err.message.includes("needs") || err.message.includes("must") ? 400 : 500;
    console.error("Failed to update site content:", err);
    res.status(statusCode).json({ error: err.message || "Failed to update site content" });
  }
});

router.post("/admin/media", authMiddleware, requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const result = await pool.query(
      `INSERT INTO site_media (filename, mime_type, data, uploaded_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.file.originalname || "", req.file.mimetype, req.file.buffer, req.user.id]
    );
    const id = result.rows[0].id;
    await logAdminActivity({
      userId: req.user.id,
      action: "site_media_uploaded",
      details: {
        mediaId: id,
        filename: req.file.originalname || "",
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });

    res.status(201).json({
      id,
      url: `/api/site-content/media/${id}`,
    });
  } catch (err) {
    console.error("Failed to upload site media:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

module.exports = router;

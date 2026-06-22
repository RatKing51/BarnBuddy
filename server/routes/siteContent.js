const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const pool = require("../data-source");
const {
  defaultSiteContent,
  getSiteContent,
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

router.put("/admin", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const newsPosts = sanitizeNewsPosts(req.body.newsPosts);
    const status = sanitizeStatus(req.body.status);
    const content = await updateSiteContent({ newsPosts, status, userId: req.user.id });
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

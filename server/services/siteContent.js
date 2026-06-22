const pool = require("../data-source");

const defaultSiteContent = {
  newsPosts: [
    {
      id: "weight-tracking",
      title: "Weight Tracking Added for All Tiers",
      date: "2026-06-18",
      category: "Updates",
      excerpt:
        "Now track your animals weight from day to day, week to week, or however you please -- all in one location!",
      body:
        "Weight tracking is now available for all BarnBuddy users. You can log animal weights as often as you need, whether that is daily, weekly, or whenever you check in. Each entry stays connected to the animal profile, making it easier to watch growth over time, compare progress, and keep better records in one place.",
      image: "/weight-graph.png",
      imageAlt: "BarnBuddy logo",
      imageFit: "contain",
      featured: true,
      published: true,
    },
    {
      id: "barnbuddy-record-keeping-launch",
      title: "BarnBuddy launches smarter record-keeping for small farms",
      date: "2026-05-24",
      category: "Product",
      excerpt:
        "BarnBuddy now gives small farms a cleaner way to track animals, health records, herds, and care tasks without juggling notebooks or scattered spreadsheets.",
      body:
        "This release focuses on the basics that matter every day: animal profiles, herd organization, vaccinations, vet visits, and health history. The goal is simple record-keeping that feels light enough to use after chores, but structured enough to help when decisions matter.",
      image: "/IMG_5761.JPEG",
      imageAlt: "Livestock in a pasture",
      imageFit: "cover",
      featured: false,
      published: true,
    },
    {
      id: "care-reminders-progress",
      title: "Care reminders and health workflows keep getting sharper",
      date: "2026-05-18",
      category: "Updates",
      excerpt:
        "Upcoming vaccination and vet visit visibility is becoming a bigger part of the dashboard experience.",
      body:
        "BarnBuddy is being shaped around the repeated work of livestock care. Recent dashboard work makes it easier to spot animals that need attention soon, separate urgent items from routine care, and keep health records close to the animal profile.",
      image: "/bblogo.png",
      imageAlt: "BarnBuddy logo",
      imageFit: "contain",
      featured: false,
      published: true,
    },
    {
      id: "ffa-4h-small-farm-focus",
      title: "Built with FFA, 4H, and small farms in mind",
      date: "2026-05-10",
      category: "Company",
      excerpt:
        "BarnBuddy is staying focused on youth agriculture, hobby farms, and family operations that need practical tools instead of enterprise complexity.",
      body:
        "The product direction continues to center on affordable, approachable livestock management. That means clear workflows, mobile-friendly screens, and features that help newer livestock owners build good record-keeping habits early.",
      image: "/bblogo.png",
      imageAlt: "BarnBuddy logo",
      imageFit: "contain",
      featured: false,
      published: true,
    },
  ],
  status: {
    headline: "All systems normal",
    summary: "BarnBuddy services are running normally.",
    overallStatus: "Operational",
    overallTone: "green",
    services: [
      { name: "Web app", status: "Operational", tone: "green" },
      { name: "Login and accounts", status: "Operational", tone: "green" },
      { name: "Animal records", status: "Operational", tone: "green" },
      { name: "Notifications", status: "Operational", tone: "green" },
    ],
    recentUpdateTitle: "Recent updates",
    recentUpdateBody: "No incidents reported.",
  },
  announcement: {
    enabled: false,
    tone: "blue",
    title: "",
    message: "",
    linkText: "",
    linkUrl: "",
  },
  maintenance: {
    enabled: false,
    title: "BarnBuddy is down for maintenance",
    message: "We are making a few updates and will be back soon.",
    estimatedReturn: "",
  },
  reviews: [],
  carouselSlides: [
    {
      eyebrow: "Dashboard",
      title: "See herd priorities at a glance",
      image: "/dashboard.png",
      alt: "BarnBuddy dashboard overview showing animals, vaccinations due, vet visits, and herd risk",
      published: true,
    },
    {
      eyebrow: "Animal Profiles",
      title: "Edit core animal details in one place",
      image: "/generaldata.png",
      alt: "BarnBuddy animal profile screen with general data fields",
      published: true,
    },
    {
      eyebrow: "Vet Visits",
      title: "Track vet visits",
      image: "/vetvisits.png",
      alt: "BarnBuddy health records screen showing vet visits",
      published: true,
    },
  ],
};

async function ensureSiteContentSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      id TEXT PRIMARY KEY DEFAULT 'default',
      news_posts JSONB NOT NULL DEFAULT '[]'::jsonb,
      status JSONB NOT NULL DEFAULT '{}'::jsonb,
      announcement JSONB NOT NULL DEFAULT '{}'::jsonb,
      maintenance JSONB NOT NULL DEFAULT '{}'::jsonb,
      reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
      carousel_slides JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE site_content
      ADD COLUMN IF NOT EXISTS announcement JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS maintenance JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS carousel_slides JSONB NOT NULL DEFAULT '[]'::jsonb;

    CREATE TABLE IF NOT EXISTS site_media (
      id SERIAL PRIMARY KEY,
      filename TEXT DEFAULT '',
      mime_type TEXT NOT NULL,
      data BYTEA NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_activity_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT 'General question',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(
    `INSERT INTO site_content (id, news_posts, status, announcement, maintenance, reviews, carousel_slides)
     VALUES ('default', $1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [
      JSON.stringify(defaultSiteContent.newsPosts),
      JSON.stringify(defaultSiteContent.status),
      JSON.stringify(defaultSiteContent.announcement),
      JSON.stringify(defaultSiteContent.maintenance),
      JSON.stringify(defaultSiteContent.reviews),
      JSON.stringify(defaultSiteContent.carouselSlides),
    ]
  );
}

async function getSiteContent({ includeDrafts = false } = {}) {
  const result = await pool.query(
    `SELECT news_posts, status, announcement, maintenance, reviews, carousel_slides, updated_at
     FROM site_content
     WHERE id = 'default'
     LIMIT 1`
  );
  const row = result.rows[0];
  const content = row
    ? {
        newsPosts: Array.isArray(row.news_posts) ? row.news_posts : defaultSiteContent.newsPosts,
        status: row.status && typeof row.status === "object" ? row.status : defaultSiteContent.status,
        announcement:
          row.announcement && typeof row.announcement === "object"
            ? { ...defaultSiteContent.announcement, ...row.announcement }
            : defaultSiteContent.announcement,
        maintenance:
          row.maintenance && typeof row.maintenance === "object"
            ? { ...defaultSiteContent.maintenance, ...row.maintenance }
            : defaultSiteContent.maintenance,
        reviews: Array.isArray(row.reviews) ? row.reviews : defaultSiteContent.reviews,
        carouselSlides: Array.isArray(row.carousel_slides) && row.carousel_slides.length ? row.carousel_slides : defaultSiteContent.carouselSlides,
        updatedAt: row.updated_at,
      }
    : { ...defaultSiteContent, updatedAt: null };

  if (includeDrafts) return content;

  return {
    ...content,
    newsPosts: content.newsPosts.filter((post) => post.published !== false),
    reviews: content.reviews.filter((review) => review.published !== false),
    carouselSlides: content.carouselSlides.filter((slide) => slide.published !== false),
  };
}

async function updateSiteContent({ newsPosts, status, announcement, maintenance, reviews, carouselSlides, userId }) {
  const result = await pool.query(
    `UPDATE site_content
     SET news_posts = $1::jsonb,
         status = $2::jsonb,
         announcement = $3::jsonb,
         maintenance = $4::jsonb,
         reviews = $5::jsonb,
         carousel_slides = $6::jsonb,
         updated_by = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 'default'
     RETURNING news_posts, status, announcement, maintenance, reviews, carousel_slides, updated_at`,
    [
      JSON.stringify(newsPosts),
      JSON.stringify(status),
      JSON.stringify(announcement),
      JSON.stringify(maintenance),
      JSON.stringify(reviews),
      JSON.stringify(carouselSlides),
      userId,
    ]
  );

  const row = result.rows[0];
  return {
    newsPosts: row.news_posts,
    status: row.status,
    announcement: row.announcement,
    maintenance: row.maintenance,
    reviews: row.reviews,
    carouselSlides: row.carousel_slides,
    updatedAt: row.updated_at,
  };
}

async function logAdminActivity({ userId, action, details = {} }) {
  await pool.query(
    `INSERT INTO admin_activity_log (user_id, action, details)
     VALUES ($1, $2, $3::jsonb)`,
    [userId, action, JSON.stringify(details)]
  );
}

async function getAdminActivity({ limit = 30 } = {}) {
  const result = await pool.query(
    `SELECT aal.id,
            aal.action,
            aal.details,
            aal.created_at,
            u.name,
            u.email,
            u.clerk_user_id
     FROM admin_activity_log aal
     LEFT JOIN users u ON u.id = aal.user_id
     ORDER BY aal.created_at DESC
     LIMIT $1`,
    [Math.max(1, Math.min(Number.parseInt(limit, 10) || 30, 100))]
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    details: row.details || {},
    createdAt: row.created_at,
    actor: {
      name: row.name || row.email || row.clerk_user_id || "Unknown admin",
      email: row.email || "",
      clerkUserId: row.clerk_user_id || "",
    },
  }));
}

async function getSiteMedia({ limit = 60 } = {}) {
  const result = await pool.query(
    `SELECT sm.id,
            sm.filename,
            sm.mime_type,
            OCTET_LENGTH(sm.data) AS size,
            sm.created_at,
            u.name,
            u.email
     FROM site_media sm
     LEFT JOIN users u ON u.id = sm.uploaded_by
     ORDER BY sm.created_at DESC
     LIMIT $1`,
    [Math.max(1, Math.min(Number.parseInt(limit, 10) || 60, 120))]
  );

  return result.rows.map((row) => ({
    id: row.id,
    filename: row.filename || `site-image-${row.id}`,
    mimeType: row.mime_type,
    size: Number(row.size) || 0,
    url: `/api/site-content/media/${row.id}`,
    createdAt: row.created_at,
    uploadedBy: row.name || row.email || "Unknown admin",
  }));
}

module.exports = {
  defaultSiteContent,
  ensureSiteContentSchema,
  getSiteContent,
  getAdminActivity,
  getSiteMedia,
  logAdminActivity,
  updateSiteContent,
};

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
};

async function ensureSiteContentSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      id TEXT PRIMARY KEY DEFAULT 'default',
      news_posts JSONB NOT NULL DEFAULT '[]'::jsonb,
      status JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_media (
      id SERIAL PRIMARY KEY,
      filename TEXT DEFAULT '',
      mime_type TEXT NOT NULL,
      data BYTEA NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(
    `INSERT INTO site_content (id, news_posts, status)
     VALUES ('default', $1::jsonb, $2::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(defaultSiteContent.newsPosts), JSON.stringify(defaultSiteContent.status)]
  );
}

async function getSiteContent({ includeDrafts = false } = {}) {
  const result = await pool.query(
    `SELECT news_posts, status, updated_at
     FROM site_content
     WHERE id = 'default'
     LIMIT 1`
  );
  const row = result.rows[0];
  const content = row
    ? {
        newsPosts: Array.isArray(row.news_posts) ? row.news_posts : defaultSiteContent.newsPosts,
        status: row.status && typeof row.status === "object" ? row.status : defaultSiteContent.status,
        updatedAt: row.updated_at,
      }
    : { ...defaultSiteContent, updatedAt: null };

  if (includeDrafts) return content;

  return {
    ...content,
    newsPosts: content.newsPosts.filter((post) => post.published !== false),
  };
}

async function updateSiteContent({ newsPosts, status, userId }) {
  const result = await pool.query(
    `UPDATE site_content
     SET news_posts = $1::jsonb,
         status = $2::jsonb,
         updated_by = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 'default'
     RETURNING news_posts, status, updated_at`,
    [JSON.stringify(newsPosts), JSON.stringify(status), userId]
  );

  const row = result.rows[0];
  return {
    newsPosts: row.news_posts,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  defaultSiteContent,
  ensureSiteContentSchema,
  getSiteContent,
  updateSiteContent,
};

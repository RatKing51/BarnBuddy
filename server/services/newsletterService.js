const pool = require("../data-source");

let schemaReadyPromise;

function ensureNewsletterSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'subscribed',
        source TEXT NOT NULL DEFAULT 'footer',
        subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  return schemaReadyPromise;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function subscribeToNewsletter({ email, source = "footer" }) {
  await ensureNewsletterSchema();

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    const error = new Error("Please enter a valid email address.");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO newsletter_subscribers (email, status, source)
     VALUES ($1, 'subscribed', $2)
     ON CONFLICT (email)
     DO UPDATE SET
       status = 'subscribed',
       source = EXCLUDED.source,
       unsubscribed_at = NULL,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, email, status, source, subscribed_at, updated_at`,
    [normalizedEmail, source]
  );

  return result.rows[0];
}

async function getNewsletterSubscriptionByEmail(email) {
  await ensureNewsletterSchema();

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, email, status, source, subscribed_at, unsubscribed_at, updated_at
     FROM newsletter_subscribers
     WHERE email = $1`,
    [normalizedEmail]
  );

  return result.rows[0] || null;
}

async function unsubscribeFromNewsletter({ email }) {
  await ensureNewsletterSchema();

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    const error = new Error("Please enter a valid email address.");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO newsletter_subscribers (email, status, source, unsubscribed_at)
     VALUES ($1, 'unsubscribed', 'account-settings', CURRENT_TIMESTAMP)
     ON CONFLICT (email)
     DO UPDATE SET
       status = 'unsubscribed',
       unsubscribed_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, email, status, source, subscribed_at, unsubscribed_at, updated_at`,
    [normalizedEmail]
  );

  return result.rows[0];
}

module.exports = {
  getNewsletterSubscriptionByEmail,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
};

const pool = require("../data-source");
const { Resend } = require("resend");
const env = require("../config/env");

let schemaReadyPromise;
const resend = env.email.resendApiKey ? new Resend(env.email.resendApiKey) : null;

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

function getNewsletterAudienceId() {
  return env.email.newsletterAudienceId;
}

function createNewsletterError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function formatResendError(response) {
  return response?.error?.message || "Resend contact sync failed.";
}

function isMissingContactError(response) {
  const message = formatResendError(response).toLowerCase();
  const statusCode = response?.error?.statusCode;
  return statusCode === 404 || message.includes("not found");
}

function isDuplicateContactError(response) {
  const message = formatResendError(response).toLowerCase();
  const statusCode = response?.error?.statusCode;
  return (
    statusCode === 409 ||
    message.includes("already") ||
    message.includes("exist") ||
    message.includes("duplicate")
  );
}

function assertNewsletterSyncConfigured() {
  if (!resend) {
    if (env.nodeEnv === "production") {
      createNewsletterError("RESEND_API_KEY is required to sync newsletter contacts.", 500);
    }

    return {
      skipped: true,
      reason: "RESEND_API_KEY is not configured.",
    };
  }

  const audienceId = getNewsletterAudienceId();

  if (!audienceId) {
    createNewsletterError("RESEND_NEWSLETTER_AUDIENCE_ID is required to sync newsletter contacts.", 500);
  }

  return { segmentId: audienceId };
}

async function syncResendNewsletterContact({ email, source, unsubscribed }) {
  const config = assertNewsletterSyncConfigured();

  if (config.skipped) {
    console.log(`[newsletter sync skipped] ${config.reason}`);
    return config;
  }

  const payload = {
    email,
    unsubscribed,
    segments: [{ id: config.segmentId }],
  };

  const created = await resend.contacts.create(payload);

  if (!created.error) {
    return { synced: true, action: "created", data: created.data };
  }

  if (!isDuplicateContactError(created)) {
    createNewsletterError(formatResendError(created));
  }

  const updated = await resend.contacts.update({
    email,
    unsubscribed,
  });

  if (updated.error) {
    createNewsletterError(formatResendError(updated));
  }

  const addedToSegment = await resend.contacts.segments.add({
    email,
    segmentId: config.segmentId,
  });

  if (addedToSegment.error && !isDuplicateContactError(addedToSegment)) {
    createNewsletterError(formatResendError(addedToSegment));
  }

  return {
    synced: true,
    action: "updated",
    data: updated.data,
    segment: addedToSegment.data || null,
  };
}

async function unsubscribeResendNewsletterContact({ email }) {
  const config = assertNewsletterSyncConfigured();

  if (config.skipped) {
    console.log(`[newsletter sync skipped] ${config.reason}`);
    return config;
  }

  const updated = await resend.contacts.update({
    email,
    unsubscribed: true,
  });

  if (!updated.error) {
    return { synced: true, action: "unsubscribed", data: updated.data };
  }

  if (isMissingContactError(updated)) {
    return { synced: true, action: "already_absent" };
  }

  createNewsletterError(formatResendError(updated));
}

async function subscribeToNewsletter({ email, source = "footer" }) {
  await ensureNewsletterSchema();

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    const error = new Error("Please enter a valid email address.");
    error.status = 400;
    throw error;
  }

  const resendSync = await syncResendNewsletterContact({
    email: normalizedEmail,
    source,
    unsubscribed: false,
  });

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

  const subscriber = result.rows[0];

  return {
    ...subscriber,
    resendSync,
  };
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

  const resendSync = await unsubscribeResendNewsletterContact({
    email: normalizedEmail,
  });

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

  const subscriber = result.rows[0] || {
    email: normalizedEmail,
    status: "unsubscribed",
  };

  return {
    ...subscriber,
    resendSync,
  };
}

module.exports = {
  getNewsletterSubscriptionByEmail,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
};

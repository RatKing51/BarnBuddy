const pool = require("../data-source");
const env = require("../config/env");
const { ensureAppSchema } = require("./ensureAppSchema");
const { ensureNotificationSchema } = require("./notificationService");
const { sendEmail, escapeHtml } = require("./emailService");
const { clerkClient } = require("@clerk/express");

const DAY_MS = 24 * 60 * 60 * 1000;

function getExpiryReminderWindow(expiresAt, now = Date.now(), reminderDays = env.notifications.premiumExpiryReminderDays) {
  const expiresTime = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresTime) || expiresTime <= now) return null;

  const remainingMs = expiresTime - now;
  const remainingDays = Math.ceil(remainingMs / DAY_MS);
  const threshold = [...reminderDays].sort((a, b) => a - b).find((day) => remainingDays <= day);
  if (!threshold) return null;

  return { expiresTime, remainingMs, remainingDays, threshold };
}

function describeTimeRemaining(remainingMs) {
  const hours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
  if (hours <= 24) return `${hours} hour${hours === 1 ? "" : "s"}`;

  const days = Math.ceil(remainingMs / DAY_MS);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function buildPremiumExpirationEmail({ name, expiresAt, remainingMs }) {
  const safeName = escapeHtml(name || "there");
  const timeRemaining = describeTimeRemaining(remainingMs);
  const expirationText = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(expiresAt));
  const accountUrl = `${env.clientUrls[0].replace(/\/$/, "")}/settings/account`;

  return {
    subject: `Your BarnBuddy Premium access ends in ${timeRemaining}`,
    text: [
      `Hi ${name || "there"},`,
      "",
      `Your BarnBuddy Premium access is scheduled to end in ${timeRemaining}, on ${expirationText}.`,
      "After it ends, your account will return to the Free plan unless Premium is renewed or extended.",
      "",
      `Review your account: ${accountUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.6;">
        <p>Hi ${safeName},</p>
        <h1 style="margin: 0 0 12px;">Premium ends in ${escapeHtml(timeRemaining)}</h1>
        <p>Your BarnBuddy Premium access is scheduled to end on <strong>${escapeHtml(expirationText)}</strong>.</p>
        <p>After it ends, your account will return to the Free plan unless Premium is renewed or extended.</p>
        <p>
          <a href="${accountUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
            Review your account
          </a>
        </p>
        <p style="color: #5b667a; font-size: 14px;">This is an account notice about time-limited Premium access.</p>
      </div>
    `,
  };
}

async function sendPremiumExpirationReminder(user, { now = Date.now() } = {}) {
  const window = getExpiryReminderWindow(user.subscription_expires_at, now);
  if (!window) return { skipped: true, reason: "Premium expiration is not in a reminder window" };

  const expirationKey = new Date(window.expiresTime).toISOString();
  const notificationKey = `premium-expiry:${expirationKey}:${window.threshold}`;
  const existing = await pool.query(
    "SELECT id FROM notification_deliveries WHERE user_id = $1 AND notification_key = $2",
    [user.id, notificationKey]
  );
  if (existing.rowCount > 0) {
    return { skipped: true, reason: "Premium expiration reminder already sent", notificationKey };
  }

  const email = buildPremiumExpirationEmail({
    name: user.name,
    expiresAt: window.expiresTime,
    remainingMs: window.remainingMs,
  });
  const result = await sendEmail({
    to: user.email,
    from: env.email.notificationsFrom,
    ...email,
  });
  if (result?.skipped) {
    return { skipped: true, reason: result.reason || "Email sending is disabled", notificationKey };
  }

  await pool.query(
    `INSERT INTO notification_deliveries (user_id, notification_key, sent_to)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, notification_key) DO NOTHING`,
    [user.id, notificationKey, user.email]
  );

  return {
    sent: true,
    notificationKey,
    thresholdDays: window.threshold,
    expiresAt: expirationKey,
    result,
  };
}

async function sendPremiumExpirationReminders({ limit = 100 } = {}) {
  await ensureAppSchema();
  await ensureNotificationSchema();

  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const unsyncedUsers = await pool.query(
    `SELECT id, clerk_user_id
     FROM users
     WHERE subscription_is_premium = true
       AND COALESCE(subscription_source, '') = ''
       AND subscription_expires_at IS NULL
       AND clerk_user_id IS NOT NULL
     ORDER BY id ASC
     LIMIT $1`,
    [safeLimit]
  );

  for (const user of unsyncedUsers.rows) {
    try {
      const clerkUser = await clerkClient.users.getUser(user.clerk_user_id);
      const metadata = clerkUser.publicMetadata || clerkUser.public_metadata || {};
      const parsedExpiration = metadata.premiumExpiresAt ? new Date(metadata.premiumExpiresAt) : null;
      const expiresAt = parsedExpiration && !Number.isNaN(parsedExpiration.getTime())
        ? parsedExpiration.toISOString()
        : null;

      await pool.query(
        `UPDATE users
         SET subscription_source = $2,
             subscription_expires_at = $3
         WHERE id = $1`,
        [user.id, metadata.premiumSource || "clerk_billing", expiresAt]
      );
    } catch (err) {
      console.warn("Could not sync Premium expiration metadata from Clerk.", {
        clerkUserId: user.clerk_user_id,
        error: err.message,
      });
    }
  }

  const maxDays = Math.max(...env.notifications.premiumExpiryReminderDays);
  const users = await pool.query(
    `SELECT id, name, email, subscription_expires_at
     FROM users
     WHERE subscription_is_premium = true
       AND COALESCE(subscription_source, '') <> 'clerk_trial'
       AND subscription_expires_at > CURRENT_TIMESTAMP
       AND subscription_expires_at <= CURRENT_TIMESTAMP + ($1 * INTERVAL '1 day')
       AND email IS NOT NULL
       AND email NOT LIKE '%@users.barnbuddy.local'
     ORDER BY subscription_expires_at ASC
     LIMIT $2`,
    [maxDays, safeLimit]
  );

  const results = [];
  for (const user of users.rows) {
    try {
      results.push({ userId: user.id, ...(await sendPremiumExpirationReminder(user)) });
    } catch (err) {
      results.push({ userId: user.id, error: err.message || "Failed to send Premium expiration reminder" });
    }
  }

  return results;
}

module.exports = {
  buildPremiumExpirationEmail,
  describeTimeRemaining,
  getExpiryReminderWindow,
  sendPremiumExpirationReminder,
  sendPremiumExpirationReminders,
};

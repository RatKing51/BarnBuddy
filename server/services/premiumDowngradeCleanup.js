const pool = require("../data-source");
const {
  ensureBirthSchema,
  ensurePremiumRecordSchema,
  ensureReproductionSchema,
} = require("./ensureAppSchema");
const { ensurePreferenceSchema } = require("./userPreferences");

async function tableExists(tableName) {
  const result = await pool.query("SELECT to_regclass($1) AS name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.name);
}

async function cleanupPremiumDataForUser(userId) {
  await ensurePreferenceSchema();
  await ensurePremiumRecordSchema();
  await ensureReproductionSchema();
  await ensureBirthSchema();

  if (await tableExists("notification_deliveries")) {
    await pool.query("DELETE FROM notification_deliveries WHERE user_id = $1", [userId]);
  }

  await pool.query("DELETE FROM births WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM reproductions WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM finance_records WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM feed_records WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM inventory_records WHERE user_id = $1", [userId]);
  await pool.query(
    "UPDATE users SET automatic_reminders = false WHERE id = $1",
    [userId]
  );
}

async function downgradePremiumUser(userId, status = "free") {
  await pool.query(
    `UPDATE users
     SET subscription_plan = 'free',
         subscription_status = $2,
         subscription_is_premium = false,
         subscription_source = '',
         subscription_expires_at = NULL
     WHERE id = $1`,
    [userId, status || "free"]
  );

  await cleanupPremiumDataForUser(userId);
}

async function downgradePremiumUserByClerkId(clerkUserId, status = "free") {
  if (!clerkUserId) return false;

  const result = await pool.query(
    "SELECT id FROM users WHERE clerk_user_id = $1",
    [clerkUserId]
  );
  const user = result.rows[0];

  if (!user) return false;

  await downgradePremiumUser(user.id, status);
  return true;
}

async function markPremiumExpiringByClerkId(clerkUserId, { expiresAt, source, status } = {}) {
  if (!clerkUserId || !expiresAt) return false;

  const result = await pool.query(
    `UPDATE users
     SET subscription_plan = 'premium',
         subscription_status = $2,
         subscription_is_premium = true,
         subscription_source = $3,
         subscription_expires_at = $4
     WHERE clerk_user_id = $1`,
    [clerkUserId, status || "active", source || "clerk_billing", expiresAt]
  );

  return result.rowCount > 0;
}

async function activatePremiumUserByClerkId(clerkUserId) {
  if (!clerkUserId) return false;

  const result = await pool.query(
    `UPDATE users
     SET subscription_plan = 'premium',
         subscription_status = 'active',
         subscription_is_premium = true,
         subscription_source = 'clerk_billing',
         subscription_expires_at = NULL
     WHERE clerk_user_id = $1`,
    [clerkUserId]
  );

  return result.rowCount > 0;
}

module.exports = {
  cleanupPremiumDataForUser,
  downgradePremiumUser,
  downgradePremiumUserByClerkId,
  markPremiumExpiringByClerkId,
  activatePremiumUserByClerkId,
};

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

async function deletePremiumDataForUser(userId) {
  await ensurePreferenceSchema();
  await ensurePremiumRecordSchema();
  await ensureReproductionSchema();
  await ensureBirthSchema();

  const hasNotificationDeliveries = await tableExists("notification_deliveries");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const deliveries = hasNotificationDeliveries
      ? await client.query("DELETE FROM notification_deliveries WHERE user_id = $1", [userId])
      : { rowCount: 0 };
    const births = await client.query("DELETE FROM births WHERE user_id = $1", [userId]);
    const reproductions = await client.query("DELETE FROM reproductions WHERE user_id = $1", [userId]);
    const finance = await client.query("DELETE FROM finance_records WHERE user_id = $1", [userId]);
    const feed = await client.query("DELETE FROM feed_records WHERE user_id = $1", [userId]);
    const inventory = await client.query("DELETE FROM inventory_records WHERE user_id = $1", [userId]);
    await client.query("UPDATE users SET automatic_reminders = false WHERE id = $1", [userId]);
    await client.query("COMMIT");

    const deleted = {
      births: births.rowCount,
      reproductions: reproductions.rowCount,
      finance: finance.rowCount,
      feed: feed.rowCount,
      inventory: inventory.rowCount,
      notificationDeliveries: deliveries.rowCount,
    };

    return {
      deleted,
      premiumRecordCount:
        deleted.births + deleted.reproductions + deleted.finance + deleted.feed + deleted.inventory,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
  deletePremiumDataForUser,
  downgradePremiumUser,
  downgradePremiumUserByClerkId,
  markPremiumExpiringByClerkId,
  activatePremiumUserByClerkId,
};

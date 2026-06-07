const { clerkClient } = require("@clerk/express");
const pool = require("../data-source");

let schemaReadyPromise;

function ensureSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT
      );

      CREATE TABLE IF NOT EXISTS herds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        location TEXT DEFAULT ''
      );

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE,
        ADD COLUMN IF NOT EXISTS care_window_days INTEGER DEFAULT 7,
        ADD COLUMN IF NOT EXISTS dashboard_density TEXT DEFAULT 'comfortable',
        ADD COLUMN IF NOT EXISTS app_theme TEXT DEFAULT 'dark',
        ADD COLUMN IF NOT EXISTS email_updates BOOLEAN DEFAULT true;

      ALTER TABLE herds
        ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS location TEXT DEFAULT ''
    `);
  }

  return schemaReadyPromise;
}

function getClaimValue(claims, keys) {
  for (const key of keys) {
    if (claims[key]) return claims[key];
  }

  return null;
}

function getEmailFromClerkUser(clerkUser) {
  const primaryEmail = clerkUser.email_addresses?.find(
    (email) => email.id === clerkUser.primary_email_address_id
  );

  return primaryEmail?.email_address || clerkUser.email_addresses?.[0]?.email_address || null;
}

function getNameFromClerkUser(clerkUser, fallbackEmail) {
  return (
    clerkUser.full_name ||
    [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ") ||
    clerkUser.username ||
    fallbackEmail
  );
}

async function getClerkProfileFromAuth(auth) {
  const claims = auth.sessionClaims || {};
  let email = getClaimValue(claims, [
    "email",
    "email_address",
    "primary_email_address",
    "primaryEmailAddress",
  ]);
  let name = getClaimValue(claims, [
    "name",
    "full_name",
    "fullName",
    "first_name",
    "firstName",
  ]);

  if (!email) {
    if (!process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY === "YOUR_CLERK_SECRET_KEY") {
      throw new Error("CLERK_SECRET_KEY is required to link Clerk users to BarnBuddy records by email.");
    }

    const clerkUser = await clerkClient.users.getUser(auth.userId);
    email = getEmailFromClerkUser(clerkUser);
    name = getNameFromClerkUser(clerkUser, email);
  }

  if (!email) {
    throw new Error("Clerk user does not have a primary email address.");
  }

  return { clerkUserId: auth.userId, email, name };
}

function getClerkProfileFromWebhookUser(clerkUser) {
  const email = getEmailFromClerkUser(clerkUser);

  if (!email) {
    throw new Error("Clerk webhook user does not have an email address.");
  }

  return {
    clerkUserId: clerkUser.id,
    email,
    name: getNameFromClerkUser(clerkUser, email),
  };
}

async function findOrCreateLocalUser({ clerkUserId, email, name }) {
  await ensureSchema();
  console.info("Syncing Clerk user to local database:", {
    clerkUserId,
    email,
  });

  const existingByClerkId = await pool.query(
    "SELECT id, name, email FROM users WHERE clerk_user_id = $1",
    [clerkUserId]
  );

  const existingByEmail = await pool.query(
    "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)",
    [email]
  );

  const clerkLinkedUser = existingByClerkId.rows[0];
  let user = existingByEmail.rows[0];

  if (user && clerkLinkedUser && user.id !== clerkLinkedUser.id) {
    await pool.query(
      "UPDATE users SET clerk_user_id = NULL WHERE id = $1",
      [clerkLinkedUser.id]
    );
    const updated = await pool.query(
      "UPDATE users SET clerk_user_id = $1, name = $2, email = $3 WHERE id = $4 RETURNING id, name, email",
      [clerkUserId, name, email, user.id]
    );
    user = updated.rows[0];
    console.info("Re-linked Clerk user to existing email user:", { userId: user.id, clerkUserId });
  } else if (user) {
    const updated = await pool.query(
      "UPDATE users SET clerk_user_id = $1, name = $2, email = $3 WHERE id = $4 RETURNING id, name, email",
      [clerkUserId, name, email, user.id]
    );
    user = updated.rows[0];
    console.info("Linked Clerk user by email:", { userId: user.id, clerkUserId });
  } else if (clerkLinkedUser) {
    const updated = await pool.query(
      "UPDATE users SET name = $1, email = $2 WHERE clerk_user_id = $3 RETURNING id, name, email",
      [name, email, clerkUserId]
    );
    user = updated.rows[0];
    console.info("Updated existing Clerk-linked user:", { userId: user.id, clerkUserId });
  } else {
    const inserted = await pool.query(
      "INSERT INTO users (clerk_user_id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email",
      [clerkUserId, name, email, "clerk_managed"]
    );
    user = inserted.rows[0];
    console.info("Created local user for Clerk signup:", { userId: user.id, clerkUserId });
  }

  const herdResult = await pool.query(
    "INSERT INTO herds (user_id, name, description, location) SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM herds WHERE user_id = $1)",
    [user.id, "Default Herd", "", ""]
  );
  console.info("Ensured default herd for user:", {
    userId: user.id,
    inserted: herdResult.rowCount > 0,
  });

  return user;
}

async function findOrCreateLocalUserFromAuth(auth) {
  return findOrCreateLocalUser(await getClerkProfileFromAuth(auth));
}

async function syncClerkWebhookUser(clerkUser) {
  return findOrCreateLocalUser(getClerkProfileFromWebhookUser(clerkUser));
}

module.exports = {
  findOrCreateLocalUserFromAuth,
  syncClerkWebhookUser,
};

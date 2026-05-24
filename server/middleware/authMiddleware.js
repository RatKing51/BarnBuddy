const { getAuth, clerkClient } = require("@clerk/express");
const pool = require("../data-source");

let schemaReadyPromise;

function ensureSchema() {
    if (!schemaReadyPromise) {
        schemaReadyPromise = pool.query(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE"
        );
    }

    return schemaReadyPromise;
}

function getClaimValue(claims, keys) {
    for (const key of keys) {
        if (claims[key]) return claims[key];
    }

    return null;
}

async function getClerkProfile(auth) {
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
            throw new Error("CLERK_SECRET_KEY is required to link Clerk users to existing BarnBuddy records by email.");
        }

        const clerkUser = await clerkClient.users.getUser(auth.userId);
        email = clerkUser.primaryEmailAddress?.emailAddress;
        name = clerkUser.fullName || clerkUser.firstName || email;
    }

    if (!email) {
        throw new Error("Clerk user does not have a primary email address.");
    }

    return { email, name };
}

async function findOrCreateLocalUser(auth) {
    await ensureSchema();
    const { email, name } = await getClerkProfile(auth);

    const existingByClerkId = await pool.query(
        "SELECT id, name, email FROM users WHERE clerk_user_id = $1",
        [auth.userId]
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
            "UPDATE users SET clerk_user_id = $1 WHERE id = $2 RETURNING id, name, email",
            [auth.userId, user.id]
        );
        user = updated.rows[0];
    } else if (user) {
        const updated = await pool.query(
            "UPDATE users SET clerk_user_id = $1 WHERE id = $2 RETURNING id, name, email",
            [auth.userId, user.id]
        );
        user = updated.rows[0];
    } else if (clerkLinkedUser) {
        user = clerkLinkedUser;
    } else {
        const inserted = await pool.query(
            "INSERT INTO users (clerk_user_id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email",
            [auth.userId, name, email, "clerk_managed"]
        );
        user = inserted.rows[0];
    }

    await pool.query(
        "INSERT INTO herds (user_id, name) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM herds WHERE user_id = $1)",
        [user.id, "Default Herd"]
    );

    return user;
}

module.exports = async function authMiddleware(req, res, next) {
    try {
        const auth = getAuth(req);

        if (!auth.isAuthenticated || !auth.userId) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const user = await findOrCreateLocalUser(auth);
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            clerkUserId: auth.userId,
        };
        next();
    } catch (err) {
        console.error("Auth middleware failed:", err);
        return res.status(500).json({ message: "Authentication failed" });
    }
}

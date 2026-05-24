const pool = require("../data-source");

async function deleteUserDataByUserId(userId) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `DELETE FROM vet_visits vv
             USING animals a
             WHERE vv.animal_id = a.id
               AND a.user_id = $1`,
            [userId]
        );

        await client.query(
            `DELETE FROM vaccinations v
             USING animals a
             WHERE v.animal_id = a.id
               AND a.user_id = $1`,
            [userId]
        );

        await client.query(
            `DELETE FROM health_events he
             USING animals a
             WHERE he.animal_id = a.id
               AND a.user_id = $1`,
            [userId]
        );

        await client.query("DELETE FROM births WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM reproductions WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM animals WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM herds WHERE user_id = $1", [userId]);

        const userResult = await client.query(
            "DELETE FROM users WHERE id = $1 RETURNING id, email, clerk_user_id",
            [userId]
        );

        await client.query("COMMIT");
        return userResult.rows[0] || null;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function deleteUserDataByClerkUserId(clerkUserId) {
    const result = await pool.query(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [clerkUserId]
    );

    const user = result.rows[0];
    if (!user) return null;

    return deleteUserDataByUserId(user.id);
}

async function deleteUserDataByEmail(email) {
    if (!email) return null;

    const result = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
        [email]
    );

    const user = result.rows[0];
    if (!user) return null;

    return deleteUserDataByUserId(user.id);
}

module.exports = {
    deleteUserDataByUserId,
    deleteUserDataByClerkUserId,
    deleteUserDataByEmail,
};

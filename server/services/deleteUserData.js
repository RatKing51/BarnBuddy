const pool = require("../data-source");
const { deleteObject } = require("./r2Storage");

async function deleteUserDataByUserId(userId) {
    const client = await pool.connect();
    const objectKeys = [];

    try {
        await client.query("BEGIN");

        const animalImages = await client.query(
            "SELECT image_key FROM animals WHERE user_id = $1 AND image_key IS NOT NULL",
            [userId]
        );
        const importFiles = await client.query(
            "SELECT file_key FROM import_assistant_requests WHERE user_id = $1 AND file_key IS NOT NULL",
            [userId]
        );
        objectKeys.push(
            ...animalImages.rows.map((row) => row.image_key),
            ...importFiles.rows.map((row) => row.file_key)
        );

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

        const newsletterTable = await client.query("SELECT to_regclass('newsletter_subscribers') AS table_name");
        const contactTable = await client.query("SELECT to_regclass('contact_messages') AS table_name");
        const userEmailResult = await client.query("SELECT email FROM users WHERE id = $1", [userId]);
        const userEmail = userEmailResult.rows[0]?.email || "";
        if (userEmail && newsletterTable.rows[0]?.table_name) {
            await client.query("DELETE FROM newsletter_subscribers WHERE LOWER(email) = LOWER($1)", [userEmail]);
        }
        if (userEmail && contactTable.rows[0]?.table_name) {
            await client.query("DELETE FROM contact_messages WHERE LOWER(email) = LOWER($1)", [userEmail]);
        }

        const userResult = await client.query(
            "DELETE FROM users WHERE id = $1 RETURNING id, email, clerk_user_id",
            [userId]
        );

        await client.query("COMMIT");
        const cleanupResults = await Promise.allSettled(objectKeys.map((key) => deleteObject(key)));
        cleanupResults.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error("Failed to delete user object from R2:", {
                    key: objectKeys[index],
                    error: result.reason?.message || String(result.reason),
                });
            }
        });
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

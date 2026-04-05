const pool = require("./data-source");
const fs = require("fs");

async function runMigration() {
    try {
        const sql = fs.readFileSync("./reproduction_schema.sql", "utf8");
        await pool.query(sql);
        console.log("Reproduction schema migration completed successfully!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

runMigration();
const pool = require("./data-source");

async function runMigration() {
    try {
        console.log("Running migration: Adding tracking_years column to animals table...");
        
        const result = await pool.query(
            `ALTER TABLE animals ADD COLUMN IF NOT EXISTS tracking_years INTEGER[] DEFAULT ARRAY[]::INTEGER[];`
        );
        
        console.log("Migration successful!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

runMigration();

const pool = require("./data-source");

async function runMigration() {
    try {
        console.log("Running migration: Updating animal tracking fields...");
        
        await pool.query(
            `ALTER TABLE animals ADD COLUMN IF NOT EXISTS tracking_years INTEGER[] DEFAULT ARRAY[]::INTEGER[];`
        );

        await pool.query(
            `ALTER TABLE animals
              ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
              ADD COLUMN IF NOT EXISTS deceased_date DATE,
              ADD COLUMN IF NOT EXISTS deceased_notes TEXT;`
        );

        await pool.query(
            `UPDATE animals
             SET status = 'active'
             WHERE status IS NULL OR status = '';`
        );
        
        console.log("Migration successful!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

runMigration();

const pool = require("../data-source");

async function ensureAnimalSchema() {
  await pool.query(`
    ALTER TABLE animals
      ADD COLUMN IF NOT EXISTS birth_weight DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS birth_notes TEXT,
      ADD COLUMN IF NOT EXISTS image_data BYTEA,
      ADD COLUMN IF NOT EXISTS tracking_years INTEGER[] DEFAULT ARRAY[]::INTEGER[],
      ADD COLUMN IF NOT EXISTS dam_id INTEGER,
      ADD COLUMN IF NOT EXISTS sire_id INTEGER,
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS deceased_date DATE,
      ADD COLUMN IF NOT EXISTS deceased_notes TEXT;
  `);

  await pool.query(`
    UPDATE animals
    SET status = 'active'
    WHERE status IS NULL OR status = '';
  `);
}

module.exports = ensureAnimalSchema;

const pool = require("../data-source");

async function ensureAnimalSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS animals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      herd_id INTEGER REFERENCES herds(id) ON DELETE SET NULL,
      name TEXT,
      species TEXT,
      sex TEXT,
      birthdate DATE,
      age INTEGER,
      comments TEXT,
      weight DECIMAL(10,2),
      behavior TEXT,
      tag_id TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

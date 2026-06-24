const pool = require("../data-source");
const ensureAnimalSchema = require("./ensureAnimalSchema");
const { ensureSchema: ensureUserSchema } = require("./clerkUserSync");
const { ensurePreferenceSchema } = require("./userPreferences");
const { ensureSiteContentSchema } = require("./siteContent");

let appSchemaReadyPromise;

function ensurePremiumRecordSchema() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS finance_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      animal_id INTEGER REFERENCES animals(id) ON DELETE CASCADE,
      herd_id INTEGER REFERENCES herds(id) ON DELETE CASCADE,
      record_date DATE,
      category TEXT DEFAULT 'Expense',
      amount DECIMAL(10,2) DEFAULT 0,
      vendor TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE finance_records
      ADD COLUMN IF NOT EXISTS herd_id INTEGER REFERENCES herds(id) ON DELETE CASCADE,
      ALTER COLUMN animal_id DROP NOT NULL;

    CREATE TABLE IF NOT EXISTS feed_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      animal_id INTEGER REFERENCES animals(id) ON DELETE CASCADE,
      herd_id INTEGER REFERENCES herds(id) ON DELETE CASCADE,
      record_date DATE,
      feed_type TEXT DEFAULT '',
      amount DECIMAL(10,2) DEFAULT 0,
      unit TEXT DEFAULT 'lb',
      cost DECIMAL(10,2) DEFAULT 0,
      next_purchase_date DATE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE feed_records
      ADD COLUMN IF NOT EXISTS herd_id INTEGER REFERENCES herds(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS next_purchase_date DATE,
      ALTER COLUMN animal_id DROP NOT NULL;

    CREATE TABLE IF NOT EXISTS inventory_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      herd_id INTEGER REFERENCES herds(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL DEFAULT '',
      category TEXT DEFAULT 'Supplies',
      quantity DECIMAL(10,2) DEFAULT 0,
      unit TEXT DEFAULT 'each',
      reorder_level DECIMAL(10,2) DEFAULT 0,
      cost_per_unit DECIMAL(10,2) DEFAULT 0,
      supplier TEXT DEFAULT '',
      expiration_date DATE,
      use_for_vaccinations BOOLEAN DEFAULT false,
      use_for_health_events BOOLEAN DEFAULT false,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE inventory_records
      ADD COLUMN IF NOT EXISTS herd_id INTEGER REFERENCES herds(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Supplies',
      ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'each',
      ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS supplier TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS expiration_date DATE,
      ADD COLUMN IF NOT EXISTS use_for_vaccinations BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS use_for_health_events BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE vaccinations
      ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER REFERENCES inventory_records(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS inventory_quantity_used DECIMAL(10,2) DEFAULT 0;

    ALTER TABLE health_events
      ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER REFERENCES inventory_records(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS inventory_quantity_used DECIMAL(10,2) DEFAULT 0;
  `);
}

function ensureReproductionSchema() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS reproductions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dam_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
      sire_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
      breeding_date DATE,
      due_date DATE,
      outcome VARCHAR(50),
      breeding_method TEXT DEFAULT '',
      pregnancy_check_date DATE,
      pregnancy_status TEXT DEFAULT '',
      birth_date DATE,
      offspring_count INTEGER,
      birth_outcome TEXT DEFAULT '',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE reproductions
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS dam_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS sire_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS breeding_date DATE,
      ADD COLUMN IF NOT EXISTS due_date DATE,
      ADD COLUMN IF NOT EXISTS outcome VARCHAR(50),
      ADD COLUMN IF NOT EXISTS breeding_method TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS pregnancy_check_date DATE,
      ADD COLUMN IF NOT EXISTS pregnancy_status TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS birth_date DATE,
      ADD COLUMN IF NOT EXISTS offspring_count INTEGER,
      ADD COLUMN IF NOT EXISTS birth_outcome TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
}

function ensureBirthSchema() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS births (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reproduction_id INTEGER REFERENCES reproductions(id) ON DELETE CASCADE,
      offspring_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
      birth_date DATE,
      birth_weight DECIMAL(8,2),
      birth_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE births
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS reproduction_id INTEGER REFERENCES reproductions(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS offspring_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS birth_date DATE,
      ADD COLUMN IF NOT EXISTS birth_weight DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS birth_notes TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
}

async function ensureAppSchema() {
  if (!appSchemaReadyPromise) {
    appSchemaReadyPromise = (async () => {
      await ensureUserSchema();
      await ensurePreferenceSchema();
      await ensureAnimalSchema();
      await ensureSiteContentSchema();
      await ensurePremiumRecordSchema();
      await ensureReproductionSchema();
      await ensureBirthSchema();
    })();
  }

  return appSchemaReadyPromise;
}

module.exports = {
  ensureAppSchema,
  ensurePremiumRecordSchema,
  ensureReproductionSchema,
  ensureBirthSchema,
};

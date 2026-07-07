const pool = require("../data-source");
const ensureAnimalSchema = require("./ensureAnimalSchema");
const { ensureSchema: ensureUserSchema } = require("./clerkUserSync");
const { ensurePreferenceSchema } = require("./userPreferences");
const { ensureSiteContentSchema } = require("./siteContent");
const { ensureUserActivitySchema } = require("./userActivity");

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

function ensureImportAssistantSchema() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS import_assistant_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      record_format TEXT NOT NULL,
      transfer_priority TEXT NOT NULL,
      notes TEXT DEFAULT '',
      file_name TEXT,
      file_mime_type TEXT,
      file_size INTEGER,
      file_key TEXT,
      file_data BYTEA,
      ai_extraction_status TEXT,
      ai_extraction_result JSONB,
      ai_extraction_error TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE import_assistant_requests
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS record_format TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS transfer_priority TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS file_name TEXT,
      ADD COLUMN IF NOT EXISTS file_mime_type TEXT,
      ADD COLUMN IF NOT EXISTS file_size INTEGER,
      ADD COLUMN IF NOT EXISTS file_key TEXT,
      ADD COLUMN IF NOT EXISTS file_data BYTEA,
      ADD COLUMN IF NOT EXISTS ai_extraction_status TEXT,
      ADD COLUMN IF NOT EXISTS ai_extraction_result JSONB,
      ADD COLUMN IF NOT EXISTS ai_extraction_error TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    CREATE INDEX IF NOT EXISTS idx_import_assistant_requests_user_created
      ON import_assistant_requests (user_id, created_at DESC);
  `);
}

async function ensureAppSchema() {
  if (!appSchemaReadyPromise) {
    appSchemaReadyPromise = (async () => {
      await ensureUserSchema();
      await ensurePreferenceSchema();
      await ensureAnimalSchema();
      await ensureSiteContentSchema();
      await ensureUserActivitySchema();
      await ensurePremiumRecordSchema();
      await ensureReproductionSchema();
      await ensureBirthSchema();
      await ensureImportAssistantSchema();
    })();
  }

  return appSchemaReadyPromise;
}

module.exports = {
  ensureAppSchema,
  ensurePremiumRecordSchema,
  ensureReproductionSchema,
  ensureBirthSchema,
  ensureImportAssistantSchema,
};

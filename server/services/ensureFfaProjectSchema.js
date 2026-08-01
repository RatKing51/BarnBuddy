const pool = require("../data-source");

let ffaSchemaReadyPromise;

function ensureFfaProjectSchema() {
  if (!ffaSchemaReadyPromise) {
    ffaSchemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS ffa_projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        school_year TEXT NOT NULL DEFAULT '',
        sae_type TEXT NOT NULL DEFAULT 'entrepreneurship',
        chapter_name TEXT NOT NULL DEFAULT '',
        advisor_name TEXT NOT NULL DEFAULT '',
        advisor_email TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        start_date DATE NOT NULL,
        end_date DATE,
        status TEXT NOT NULL DEFAULT 'active',
        goals JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ffa_project_animals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES ffa_projects(id) ON DELETE CASCADE,
        animal_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
        animal_name TEXT NOT NULL DEFAULT '',
        species TEXT NOT NULL DEFAULT '',
        tag_id TEXT NOT NULL DEFAULT '',
        starting_weight DECIMAL(10,2),
        starting_value DECIMAL(12,2) NOT NULL DEFAULT 0,
        ownership_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
        records_from_date DATE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ffa_project_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES ffa_projects(id) ON DELETE CASCADE,
        animal_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
        animal_name TEXT NOT NULL DEFAULT '',
        activity_date DATE NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        duration_minutes INTEGER NOT NULL DEFAULT 0,
        skills_learned TEXT NOT NULL DEFAULT '',
        reflection TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ffa_project_finances (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES ffa_projects(id) ON DELETE CASCADE,
        animal_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
        animal_name TEXT NOT NULL DEFAULT '',
        transaction_date DATE NOT NULL,
        transaction_type TEXT NOT NULL DEFAULT 'expense',
        category TEXT NOT NULL DEFAULT 'Other',
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        vendor TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ffa_projects_user_updated
        ON ffa_projects (user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ffa_project_animals_project
        ON ffa_project_animals (project_id, created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ffa_project_animals_unique_live_animal
        ON ffa_project_animals (project_id, animal_id)
        WHERE animal_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_ffa_project_activities_project_date
        ON ffa_project_activities (project_id, activity_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_ffa_project_finances_project_date
        ON ffa_project_finances (project_id, transaction_date DESC, id DESC);
    `).catch((error) => {
      ffaSchemaReadyPromise = null;
      throw error;
    });
  }

  return ffaSchemaReadyPromise;
}

module.exports = { ensureFfaProjectSchema };

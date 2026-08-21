const pool = require("../data-source");

let ffaChapterSchemaReadyPromise;

function ensureFfaChapterSchema() {
  if (!ffaChapterSchemaReadyPromise) {
    ffaChapterSchemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS ffa_chapters (
        id SERIAL PRIMARY KEY,
        clerk_org_id TEXT NOT NULL UNIQUE,
        chapter_name TEXT NOT NULL,
        school_name TEXT,
        chapter_number TEXT,
        state TEXT,
        advisor_name TEXT NOT NULL,
        advisor_email TEXT NOT NULL,
        advisor_clerk_user_id TEXT,
        max_members INTEGER NOT NULL DEFAULT 20 CHECK (max_members BETWEEN 1 AND 500),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
        join_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        project_sharing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        join_code TEXT NOT NULL UNIQUE
          CHECK (join_code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
        join_code_created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        premium_active BOOLEAN NOT NULL DEFAULT FALSE,
        premium_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE ffa_chapters
        ADD COLUMN IF NOT EXISTS advisor_clerk_user_id TEXT,
        ADD COLUMN IF NOT EXISTS project_sharing_enabled BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE INDEX IF NOT EXISTS idx_ffa_chapters_advisor_clerk_user
        ON ffa_chapters (advisor_clerk_user_id)
        WHERE advisor_clerk_user_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_ffa_chapters_status
        ON ffa_chapters (status);
      CREATE INDEX IF NOT EXISTS idx_ffa_chapters_premium
        ON ffa_chapters (premium_active, premium_expires_at)
        WHERE premium_active = TRUE;
    `).catch((error) => {
      ffaChapterSchemaReadyPromise = null;
      throw error;
    });
  }

  return ffaChapterSchemaReadyPromise;
}

module.exports = { ensureFfaChapterSchema };

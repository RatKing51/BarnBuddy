const pool = require("../data-source");
const { ensureFfaChapterSchema } = require("./ensureFfaChapterSchema");
const { ensureFfaProjectSchema } = require("./ensureFfaProjectSchema");

let ffaProjectSharingSchemaReadyPromise;

function ensureFfaProjectSharingSchema() {
  if (!ffaProjectSharingSchemaReadyPromise) {
    ffaProjectSharingSchemaReadyPromise = (async () => {
      // The consent table references both domains, so it must never race either
      // additive schema initializer during a rolling deploy.
      await ensureFfaProjectSchema();
      await ensureFfaChapterSchema();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ffa_project_advisor_shares (
          project_id INTEGER PRIMARY KEY REFERENCES ffa_projects(id) ON DELETE CASCADE,
          chapter_id INTEGER NOT NULL REFERENCES ffa_chapters(id) ON DELETE CASCADE,
          share_token TEXT NOT NULL UNIQUE
            CHECK (share_token ~ '^[A-Za-z0-9_-]{32}$'),
          shared_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_ffa_project_advisor_shares_chapter
          ON ffa_project_advisor_shares (chapter_id, shared_at DESC);
      `);
    })().catch((error) => {
      ffaProjectSharingSchemaReadyPromise = null;
      throw error;
    });
  }

  return ffaProjectSharingSchemaReadyPromise;
}

module.exports = { ensureFfaProjectSharingSchema };

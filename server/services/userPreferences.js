const pool = require("../data-source");

const defaults = {
  careWindow: "7",
  dashboardDensity: "comfortable",
  appTheme: "dark",
  animalPrimaryIdentifier: "name",
  emailUpdates: true,
  automaticReminders: false,
};

let schemaReadyPromise;

function ensurePreferenceSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS care_window_days INTEGER DEFAULT 7,
        ADD COLUMN IF NOT EXISTS dashboard_density TEXT DEFAULT 'comfortable',
        ADD COLUMN IF NOT EXISTS app_theme TEXT DEFAULT 'dark',
        ADD COLUMN IF NOT EXISTS animal_primary_identifier TEXT DEFAULT 'name',
        ADD COLUMN IF NOT EXISTS email_updates BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS automatic_reminders BOOLEAN DEFAULT false
    `);
  }

  return schemaReadyPromise;
}

function normalizePreferences(row = {}) {
  const careWindow = ["7", "14", "30"].includes(String(row.care_window_days))
    ? String(row.care_window_days)
    : defaults.careWindow;
  const dashboardDensity = row.dashboard_density === "compact" ? "compact" : "comfortable";
  const appTheme = row.app_theme === "light" ? "light" : "dark";
  const animalPrimaryIdentifier = row.animal_primary_identifier === "tag" ? "tag" : "name";

  return {
    careWindow,
    dashboardDensity,
    appTheme,
    animalPrimaryIdentifier,
    emailUpdates: typeof row.email_updates === "boolean" ? row.email_updates : defaults.emailUpdates,
    automaticReminders: typeof row.automatic_reminders === "boolean" ? row.automatic_reminders : defaults.automaticReminders,
  };
}

function normalizePatch(payload = {}) {
  const patch = {};

  if (["7", "14", "30"].includes(String(payload.careWindow))) {
    patch.care_window_days = Number(payload.careWindow);
  }

  if (["comfortable", "compact"].includes(payload.dashboardDensity)) {
    patch.dashboard_density = payload.dashboardDensity;
  }

  if (["dark", "light"].includes(payload.appTheme)) {
    patch.app_theme = payload.appTheme;
  }

  if (["name", "tag"].includes(payload.animalPrimaryIdentifier)) {
    patch.animal_primary_identifier = payload.animalPrimaryIdentifier;
  }

  if (typeof payload.emailUpdates === "boolean") {
    patch.email_updates = payload.emailUpdates;
  }

  if (typeof payload.automaticReminders === "boolean") {
    patch.automatic_reminders = payload.automaticReminders;
  }

  return patch;
}

async function getUserPreferences(userId) {
  await ensurePreferenceSchema();

  const result = await pool.query(
    "SELECT care_window_days, dashboard_density, app_theme, animal_primary_identifier, email_updates, automatic_reminders FROM users WHERE id = $1",
    [userId]
  );

  return normalizePreferences(result.rows[0]);
}

async function updateUserPreferences(userId, payload) {
  await ensurePreferenceSchema();

  const patch = normalizePatch(payload);
  const entries = Object.entries(patch);

  if (entries.length === 0) {
    return getUserPreferences(userId);
  }

  const assignments = entries.map(([key], index) => `${key} = $${index + 2}`).join(", ");
  const values = entries.map(([, value]) => value);

  const result = await pool.query(
    `UPDATE users
     SET ${assignments}
     WHERE id = $1
     RETURNING care_window_days, dashboard_density, app_theme, animal_primary_identifier, email_updates, automatic_reminders`,
    [userId, ...values]
  );

  return normalizePreferences(result.rows[0]);
}

module.exports = {
  defaults,
  ensurePreferenceSchema,
  getUserPreferences,
  updateUserPreferences,
};

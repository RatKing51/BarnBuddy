const pool = require("../data-source");

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const routeLabels = [
  [/^\/api\/animals\/dashboard\/bootstrap$/, "loaded dashboard"],
  [/^\/api\/animals\/unassigned$/, "viewed unassigned animals"],
  [/^\/api\/animals\/([^/]+)\/weight-records$/, "added weight record"],
  [/^\/api\/animals\/([^/]+)\/weight-records\/([^/]+)$/, "changed weight record"],
  [/^\/api\/animals\/([^/]+)\/upload$/, "changed animal image"],
  [/^\/api\/animals\/([^/]+)\/birth-data$/, "updated animal birth data"],
  [/^\/api\/animals\/([^/]+)$/, "changed animal"],
  [/^\/api\/animals$/, "created animal"],
  [/^\/api\/herds\/([^/]+)$/, "changed herd"],
  [/^\/api\/herds$/, "created herd"],
  [/^\/api\/vaccinations\/bulk$/, "added vaccinations in bulk"],
  [/^\/api\/vaccinations\/([^/]+)$/, "changed vaccination"],
  [/^\/api\/vaccinations$/, "created vaccination"],
  [/^\/api\/vetVisits\/([^/]+)$/, "changed vet visit"],
  [/^\/api\/vetVisits$/, "created vet visit"],
  [/^\/api\/healthEvents\/bulk$/, "added health events in bulk"],
  [/^\/api\/healthEvents\/([^/]+)$/, "changed health event"],
  [/^\/api\/healthEvents$/, "created health event"],
  [/^\/api\/premium-records\/finance\/([^/]+)$/, "changed finance record"],
  [/^\/api\/premium-records\/finance$/, "created finance record"],
  [/^\/api\/premium-records\/feed\/([^/]+)$/, "changed feed record"],
  [/^\/api\/premium-records\/feed$/, "created feed record"],
  [/^\/api\/premium-records\/inventory\/([^/]+)$/, "changed inventory record"],
  [/^\/api\/premium-records\/inventory$/, "created inventory record"],
  [/^\/api\/reproductions\/([^/]+)$/, "changed reproduction record"],
  [/^\/api\/reproductions$/, "created reproduction record"],
  [/^\/api\/births\/([^/]+)$/, "changed birth record"],
  [/^\/api\/births$/, "created birth record"],
  [/^\/auth\/preferences$/, "updated account preferences"],
  [/^\/auth\/me$/, "deleted account"],
  [/^\/api\/newsletter\/me$/, "updated newsletter settings"],
  [/^\/api\/notifications\/reminders\/send$/, "sent reminders"],
  [/^\/api\/email\/test$/, "sent test email"],
];

function ensureUserActivitySchema() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS user_activity_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT '',
      path TEXT NOT NULL DEFAULT '',
      status_code INTEGER,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS user_activity_log_created_at_idx
      ON user_activity_log (created_at DESC);

    CREATE INDEX IF NOT EXISTS user_activity_log_user_id_idx
      ON user_activity_log (user_id);
  `);
}

function normalizePath(originalUrl = "") {
  return originalUrl.split("?")[0].replace(/\/+$/, "") || "/";
}

function actionForRequest(req) {
  const path = normalizePath(req.originalUrl);
  const match = routeLabels.find(([pattern]) => pattern.test(path));
  const baseLabel = match?.[1] || "used BarnBuddy";

  if (req.method === "DELETE") return baseLabel.replace(/^created /, "deleted ").replace(/^changed /, "deleted ");
  if (req.method === "PUT" || req.method === "PATCH") return baseLabel.replace(/^created /, "updated ").replace(/^changed /, "updated ");
  return baseLabel;
}

function detailsForRequest(req, statusCode) {
  const path = normalizePath(req.originalUrl);
  const details = {
    method: req.method,
    path,
    status: statusCode,
  };

  if (req.params && Object.keys(req.params).length) {
    details.params = req.params;
  }

  return details;
}

function shouldLogRequest(req, statusCode) {
  if (!req.user?.id) return false;
  if (!writeMethods.has(req.method)) return false;
  if (statusCode >= 400) return false;

  const path = normalizePath(req.originalUrl);
  if (path.startsWith("/api/site-content/admin")) return false;

  return true;
}

async function logUserActivity({ userId, action, method, path, statusCode, details = {} }) {
  await pool.query(
    `INSERT INTO user_activity_log (user_id, action, method, path, status_code, details)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [userId, action, method, path, statusCode, JSON.stringify(details)]
  );
}

function attachActivityLogger(req, res) {
  res.on("finish", () => {
    if (!shouldLogRequest(req, res.statusCode)) return;

    const path = normalizePath(req.originalUrl);
    logUserActivity({
      userId: req.user.id,
      action: actionForRequest(req),
      method: req.method,
      path,
      statusCode: res.statusCode,
      details: detailsForRequest(req, res.statusCode),
    }).catch((err) => {
      console.warn("Failed to log user activity:", err.message);
    });
  });
}

async function getUserActivity({ limit = 60, userId } = {}) {
  const params = [];
  const where = [];

  if (userId) {
    params.push(userId);
    where.push(`ual.user_id = $${params.length}`);
  }

  params.push(Math.max(1, Math.min(Number.parseInt(limit, 10) || 60, 200)));

  const result = await pool.query(
    `SELECT ual.id,
            ual.user_id,
            ual.action,
            ual.method,
            ual.path,
            ual.status_code,
            ual.details,
            ual.created_at,
            u.name,
            u.email,
            u.clerk_user_id
     FROM user_activity_log ual
     LEFT JOIN users u ON u.id = ual.user_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ual.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows.map((row) => ({
    id: `user-${row.id}`,
    source: "user",
    action: row.action,
    details: row.details || {},
    createdAt: row.created_at,
    actor: {
      id: row.user_id,
      name: row.name || row.email || row.clerk_user_id || "Unknown user",
      email: row.email || "",
      clerkUserId: row.clerk_user_id || "",
    },
  }));
}

async function getUserActivityUsers({ limit = 200 } = {}) {
  const result = await pool.query(
    `SELECT u.id,
            u.name,
            u.email,
            u.clerk_user_id,
            COUNT(ual.id)::int AS activity_count,
            MAX(ual.created_at) AS last_activity_at
     FROM users u
     LEFT JOIN user_activity_log ual ON ual.user_id = u.id
     GROUP BY u.id, u.name, u.email, u.clerk_user_id
     ORDER BY MAX(ual.created_at) DESC NULLS LAST, u.name ASC, u.email ASC
     LIMIT $1`,
    [Math.max(1, Math.min(Number.parseInt(limit, 10) || 200, 500))]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name || row.email || row.clerk_user_id || "Unknown user",
    email: row.email || "",
    clerkUserId: row.clerk_user_id || "",
    activityCount: row.activity_count || 0,
    lastActivityAt: row.last_activity_at,
  }));
}

module.exports = {
  attachActivityLogger,
  ensureUserActivitySchema,
  getUserActivity,
  getUserActivityUsers,
  logUserActivity,
};

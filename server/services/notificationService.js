const crypto = require("crypto");
const pool = require("../data-source");
const env = require("../config/env");
const { ensureAppSchema } = require("./ensureAppSchema");
const { sendEmail, escapeHtml } = require("./emailService");
const { ensureSchema: ensureUserSchema } = require("./clerkUserSync");
const { ensurePreferenceSchema } = require("./userPreferences");

let schemaReadyPromise;
let sourceSchemaReadyPromise;

function ensureNotificationSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS notification_deliveries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_key TEXT NOT NULL,
        sent_to TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, notification_key)
      );
    `);
  }

  return schemaReadyPromise;
}

async function tableExists(tableName) {
  const result = await pool.query("SELECT to_regclass($1) AS name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.name);
}

async function ensureReminderSourceSchema() {
  if (!sourceSchemaReadyPromise) {
    sourceSchemaReadyPromise = (async () => {
      if (await tableExists("animals")) {
        await pool.query(`
          ALTER TABLE animals
            ADD COLUMN IF NOT EXISTS tag_id TEXT,
            ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
        `);
      }

      if (await tableExists("vet_visits")) {
        await pool.query(`
          ALTER TABLE vet_visits
            ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS visit_completed BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS follow_up_completed BOOLEAN NOT NULL DEFAULT false;
        `);
      }

      if (await tableExists("reproductions")) {
        await pool.query(`
          ALTER TABLE reproductions
            ADD COLUMN IF NOT EXISTS due_date DATE,
            ADD COLUMN IF NOT EXISTS pregnancy_check_date DATE,
            ADD COLUMN IF NOT EXISTS pregnancy_status TEXT DEFAULT '',
            ADD COLUMN IF NOT EXISTS outcome VARCHAR(50);
        `);
      }

      if (await tableExists("feed_records")) {
        await pool.query(`
          ALTER TABLE feed_records
            ADD COLUMN IF NOT EXISTS herd_id INTEGER,
            ADD COLUMN IF NOT EXISTS next_purchase_date DATE;
        `);
      }
    })();
  }

  return sourceSchemaReadyPromise;
}

function asDateString(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function statusForDate(value) {
  return timingForDate(value).label;
}

function timingForDate(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(asDateString(value));
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) {
    return {
      diffDays,
      urgency: diffDays <= -7 ? "critical" : "overdue",
      label: `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`,
      headline: diffDays <= -7 ? "Critical" : "Overdue",
    };
  }

  if (diffDays === 0) {
    return { diffDays, urgency: "today", label: "due today", headline: "Due today" };
  }

  return {
    diffDays,
    urgency: diffDays <= 2 ? "soon" : "upcoming",
    label: `due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
    headline: diffDays <= 2 ? "Coming up" : "Upcoming",
  };
}

function reminderForDate(value) {
  const timing = timingForDate(value);
  return {
    dueDate: asDateString(value),
    status: timing.label,
    urgency: timing.urgency,
    urgencyLabel: timing.headline,
    diffDays: timing.diffDays,
  };
}

function reminderKey(parts) {
  return parts.filter(Boolean).join(":");
}

async function getReminderUser(userId) {
  await ensureUserSchema();
  await ensurePreferenceSchema();
  const result = await pool.query(
    `SELECT id, email, name, care_window_days, automatic_reminders
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function collectVaccinationReminders(userId, windowDays) {
  if (!(await tableExists("vaccinations"))) return [];

  const result = await pool.query(
    `SELECT v.id, v.vaccine_name, v.next_due_date, a.name AS animal_name, a.tag_id
     FROM vaccinations v
     JOIN animals a ON v.animal_id = a.id
     WHERE a.user_id = $1
       AND v.next_due_date IS NOT NULL
       AND v.next_due_date <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
       AND v.next_due_date >= CURRENT_DATE - INTERVAL '365 days'
       AND COALESCE(a.status, 'active') <> 'deceased'
     ORDER BY v.next_due_date ASC`,
    [userId, windowDays]
  );

  return result.rows.map((row) => ({
    key: reminderKey(["vaccination", row.id, asDateString(row.next_due_date)]),
    type: "Vaccination",
    title: row.vaccine_name || "Vaccination due",
    subject: row.animal_name || row.tag_id || "Animal",
    ...reminderForDate(row.next_due_date),
  }));
}

async function collectVetVisitReminders(userId, windowDays) {
  if (!(await tableExists("vet_visits"))) return [];

  const result = await pool.query(
    `SELECT vv.id, vv.visit_date, vv.follow_up_date, vv.reason, vv.vet_name,
            vv.completed, vv.visit_completed, vv.follow_up_completed,
            a.name AS animal_name, a.tag_id
     FROM vet_visits vv
     JOIN animals a ON vv.animal_id = a.id
     WHERE a.user_id = $1
       AND COALESCE(vv.completed, false) = false
       AND COALESCE(a.status, 'active') <> 'deceased'
       AND (
         (COALESCE(vv.visit_completed, false) = false
          AND vv.visit_date IS NOT NULL
          AND vv.visit_date <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
          AND vv.visit_date >= CURRENT_DATE - INTERVAL '365 days')
         OR
         (COALESCE(vv.follow_up_completed, false) = false
          AND vv.follow_up_date IS NOT NULL
          AND vv.follow_up_date <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
          AND vv.follow_up_date >= CURRENT_DATE - INTERVAL '365 days')
       )
     ORDER BY COALESCE(vv.visit_date, vv.follow_up_date) ASC`,
    [userId, windowDays]
  );

  return result.rows.flatMap((row) => {
    const subject = row.animal_name || row.tag_id || "Animal";
    const title = row.reason || row.vet_name || "Vet visit";
    const items = [];

    if (!row.visit_completed && row.visit_date) {
      items.push({
        key: reminderKey(["vet-visit", row.id, asDateString(row.visit_date)]),
        type: "Vet",
        title,
        subject,
        ...reminderForDate(row.visit_date),
      });
    }

    if (!row.follow_up_completed && row.follow_up_date) {
      items.push({
        key: reminderKey(["vet-follow-up", row.id, asDateString(row.follow_up_date)]),
        type: "Vet follow-up",
        title,
        subject,
        ...reminderForDate(row.follow_up_date),
      });
    }

    return items;
  });
}

async function collectReproductionReminders(userId, windowDays) {
  if (!(await tableExists("reproductions"))) return [];

  const result = await pool.query(
    `SELECT r.id, r.due_date, r.pregnancy_check_date, r.outcome, r.pregnancy_status,
            dam.name AS dam_name, sire.name AS sire_name
     FROM reproductions r
     LEFT JOIN animals dam ON r.dam_id = dam.id
     LEFT JOIN animals sire ON r.sire_id = sire.id
     WHERE r.user_id = $1
       AND COALESCE(r.outcome, '') NOT IN ('Birthed', 'Aborted', 'Missed')
       AND (
         (r.due_date IS NOT NULL
          AND r.due_date <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
          AND r.due_date >= CURRENT_DATE - INTERVAL '365 days')
         OR
         (r.pregnancy_check_date IS NOT NULL
          AND COALESCE(r.pregnancy_status, '') = ''
          AND r.pregnancy_check_date <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
          AND r.pregnancy_check_date >= CURRENT_DATE - INTERVAL '365 days')
       )
     ORDER BY COALESCE(r.pregnancy_check_date, r.due_date) ASC`,
    [userId, windowDays]
  );

  return result.rows.flatMap((row) => {
    const subject = [row.dam_name, row.sire_name].filter(Boolean).join(" x ") || "Breeding record";
    const items = [];

    if (row.pregnancy_check_date && !row.pregnancy_status) {
      items.push({
        key: reminderKey(["reproduction-check", row.id, asDateString(row.pregnancy_check_date)]),
        type: "Reproduction",
        title: "Pregnancy check",
        subject,
        ...reminderForDate(row.pregnancy_check_date),
      });
    }

    if (row.due_date) {
      items.push({
        key: reminderKey(["reproduction-due", row.id, asDateString(row.due_date)]),
        type: "Reproduction",
        title: "Expected birth window",
        subject,
        ...reminderForDate(row.due_date),
      });
    }

    return items;
  });
}

async function collectFeedReminders(userId, windowDays) {
  if (!(await tableExists("feed_records"))) return [];

  const result = await pool.query(
    `SELECT fr.id, fr.feed_type, fr.next_purchase_date,
            a.name AS animal_name, h.name AS herd_name
     FROM feed_records fr
     LEFT JOIN animals a ON fr.animal_id = a.id
     LEFT JOIN herds h ON fr.herd_id = h.id
     WHERE fr.user_id = $1
       AND fr.next_purchase_date IS NOT NULL
       AND fr.next_purchase_date <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
       AND fr.next_purchase_date >= CURRENT_DATE - INTERVAL '365 days'
     ORDER BY fr.next_purchase_date ASC`,
    [userId, windowDays]
  );

  return result.rows.map((row) => ({
    key: reminderKey(["feed", row.id, asDateString(row.next_purchase_date)]),
    type: "Feed",
    title: row.feed_type ? `Buy ${row.feed_type}` : "Feed purchase",
    subject: row.herd_name || row.animal_name || "Farm",
    ...reminderForDate(row.next_purchase_date),
  }));
}

async function previewUserReminders(userId) {
  const user = await getReminderUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const windowDays = Number(user.care_window_days) || 7;
  await ensureReminderSourceSchema();
  const groups = await Promise.all([
    collectVaccinationReminders(userId, windowDays),
    collectVetVisitReminders(userId, windowDays),
    collectReproductionReminders(userId, windowDays),
    collectFeedReminders(userId, windowDays),
  ]);
  const items = groups.flat().sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    user,
    windowDays,
    automaticReminders: Boolean(user.automatic_reminders),
    items,
  };
}

function formatEmailDate(value) {
  if (!value) return "No date";
  const date = new Date(`${asDateString(value)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return asDateString(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function urgencyTheme(urgency) {
  if (urgency === "critical") {
    return {
      label: "Critical",
      color: "#991b1b",
      text: "#7f1d1d",
      soft: "#fef2f2",
      border: "#fecaca",
      accent: "#dc2626",
    };
  }

  if (urgency === "overdue") {
    return {
      label: "Overdue",
      color: "#b91c1c",
      text: "#7f1d1d",
      soft: "#fff1f2",
      border: "#fecdd3",
      accent: "#ef4444",
    };
  }

  if (urgency === "today") {
    return {
      label: "Due today",
      color: "#92400e",
      text: "#78350f",
      soft: "#fffbeb",
      border: "#fde68a",
      accent: "#f59e0b",
    };
  }

  if (urgency === "soon") {
    return {
      label: "Soon",
      color: "#1d4ed8",
      text: "#1e3a8a",
      soft: "#eff6ff",
      border: "#bfdbfe",
      accent: "#3b82f6",
    };
  }

  return {
    label: "Upcoming",
    color: "#047857",
    text: "#065f46",
    soft: "#ecfdf5",
    border: "#a7f3d0",
    accent: "#10b981",
  };
}

function typeLabel(type) {
  const labels = {
    Vaccination: "Vaccine",
    Vet: "Vet",
    "Vet follow-up": "Follow-up",
    Reproduction: "Repro",
    Feed: "Feed",
  };

  return labels[type] || type || "Reminder";
}

function buildReminderEmail({ name, items, windowDays }) {
  const safeName = escapeHtml(name || "there");
  const dashboardUrl = `${env.clientUrls[0].replace(/\/$/, "")}/dashboard`;
  const urgentItems = items.filter((item) => item.urgency === "critical" || item.urgency === "overdue");
  const todayItems = items.filter((item) => item.urgency === "today");
  const soonItems = items.filter((item) => item.urgency === "soon" || item.urgency === "upcoming");
  const leadItem = urgentItems[0] || todayItems[0] || soonItems[0] || items[0];
  const leadTheme = urgencyTheme(leadItem?.urgency);
  const preheader = urgentItems.length
    ? `${urgentItems.length} overdue care item${urgentItems.length === 1 ? "" : "s"} need attention.`
    : todayItems.length
    ? `${todayItems.length} care item${todayItems.length === 1 ? "" : "s"} due today.`
    : `${items.length} care reminder${items.length === 1 ? "" : "s"} inside your ${windowDays}-day window.`;
  const summaryCards = [
    { label: "Overdue", value: urgentItems.length, color: "#dc2626", bg: "#fef2f2" },
    { label: "Due today", value: todayItems.length, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Upcoming", value: soonItems.length, color: "#2563eb", bg: "#eff6ff" },
  ]
    .map(
      (card) => `
        <td style="width: 33.333%; padding: 0 4px;">
          <div style="background: ${card.bg}; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px;">
            <div style="color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">${card.label}</div>
            <div style="color: ${card.color}; font-size: 28px; font-weight: 800; line-height: 1.1; margin-top: 8px;">${card.value}</div>
          </div>
        </td>`
    )
    .join("");
  const cards = items
    .map((item) => {
      const theme = urgencyTheme(item.urgency);
      return `
        <div style="background: #ffffff; border: 1px solid ${theme.border}; border-left: 6px solid ${theme.accent}; border-radius: 16px; margin: 0 0 12px; overflow: hidden;">
          <div style="padding: 16px 18px;">
            <div style="margin-bottom: 10px;">
              <span style="background: ${theme.soft}; color: ${theme.text}; border: 1px solid ${theme.border}; border-radius: 999px; display: inline-block; font-size: 12px; font-weight: 800; padding: 5px 9px;">${escapeHtml(theme.label)}</span>
              <span style="background: #f1f5f9; color: #475569; border-radius: 999px; display: inline-block; font-size: 12px; font-weight: 700; margin-left: 6px; padding: 5px 9px;">${escapeHtml(typeLabel(item.type))}</span>
            </div>
            <div style="color: #0f172a; font-size: 18px; font-weight: 800; line-height: 1.25;">${escapeHtml(item.subject)}</div>
            <div style="color: #334155; font-size: 14px; margin-top: 4px;">${escapeHtml(item.title)}</div>
            <div style="color: ${theme.color}; font-size: 14px; font-weight: 800; margin-top: 12px;">${escapeHtml(item.status)} · ${escapeHtml(formatEmailDate(item.dueDate))}</div>
          </div>
        </div>`;
    })
    .join("");

  const text = [
    `BarnBuddy reminders for ${name || "your farm"}`,
    preheader,
    "",
    ...items.map((item) => `- ${item.type}: ${item.subject} - ${item.title} (${item.status}, ${item.dueDate})`),
    "",
    `Open BarnBuddy: ${dashboardUrl}`,
  ].join("\n");

  const html = `
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(preheader)}</div>
    <div style="background: #f6f8fb; font-family: Arial, sans-serif; padding: 28px 12px;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08); color: #172033; line-height: 1.6; margin: 0 auto; max-width: 640px; overflow: hidden;">
        <div style="background: #0f1f44; color: #ffffff; padding: 28px 28px 24px;">
          <div style="font-size: 14px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;"><span style="color: #60a5fa;">Barn</span>Buddy</div>
          <h1 style="font-size: 28px; line-height: 1.15; margin: 18px 0 10px;">${escapeHtml(leadTheme.label)} care reminder</h1>
          <p style="color: #dbeafe; font-size: 15px; margin: 0;">Hi ${safeName}, ${escapeHtml(preheader)}</p>
        </div>
        <div style="padding: 24px 24px 10px;">
          <table role="presentation" style="border-collapse: collapse; margin: 0 0 22px; width: 100%;">
            <tr>${summaryCards}</tr>
          </table>
          ${cards}
          <div style="padding: 12px 0 8px;">
            <a href="${dashboardUrl}" style="background: #2563eb; border-radius: 12px; color: #ffffff; display: inline-block; font-weight: 800; padding: 12px 18px; text-decoration: none;">
              Open BarnBuddy
            </a>
          </div>
          <p style="color: #64748b; font-size: 13px; margin: 18px 0 4px;">Your reminder window is ${windowDays} day${windowDays === 1 ? "" : "s"}. You can turn automatic reminders off in BarnBuddy account settings.</p>
        </div>
      </div>
    </div>
  `;

  return { html, text };
}

function buildReminderSubject(items = []) {
  const criticalCount = items.filter((item) => item.urgency === "critical").length;
  const overdueCount = items.filter((item) => item.urgency === "overdue").length;
  const todayCount = items.filter((item) => item.urgency === "today").length;
  const count = items.length;
  const plural = count === 1 ? "" : "s";

  if (criticalCount > 0) {
    return `Urgent BarnBuddy reminder: ${criticalCount} critical item${criticalCount === 1 ? "" : "s"}`;
  }

  if (overdueCount > 0) {
    return `BarnBuddy reminder: ${overdueCount} overdue item${overdueCount === 1 ? "" : "s"}`;
  }

  if (todayCount > 0) {
    return `BarnBuddy reminder: ${todayCount} item${todayCount === 1 ? "" : "s"} due today`;
  }

  return `BarnBuddy reminders: ${count} upcoming item${plural}`;
}

async function sendUserReminderEmail(userId, { force = false } = {}) {
  await ensureNotificationSchema();
  const preview = await previewUserReminders(userId);

  if (!preview.user.email) {
    return { skipped: true, reason: "No email address on account", ...preview };
  }

  if (!force && !preview.automaticReminders) {
    return { skipped: true, reason: "Automatic reminders are disabled", ...preview };
  }

  if (preview.items.length === 0) {
    return { skipped: true, reason: "No reminders due", ...preview };
  }

  const digestHash = crypto
    .createHash("sha256")
    .update(preview.items.map((item) => item.key).join("|"))
    .digest("hex")
    .slice(0, 16);
  const today = new Date().toISOString().slice(0, 10);
  const notificationKey = `reminder-digest:${today}:${digestHash}`;

  const existing = await pool.query(
    "SELECT id FROM notification_deliveries WHERE user_id = $1 AND notification_key = $2",
    [userId, notificationKey]
  );

  if (existing.rowCount > 0 && !force) {
    return { skipped: true, reason: "Reminder digest already sent", ...preview };
  }

  const email = buildReminderEmail({
    name: preview.user.name,
    items: preview.items,
    windowDays: preview.windowDays,
  });

  const result = await sendEmail({
    to: preview.user.email,
    from: env.email.notificationsFrom,
    subject: buildReminderSubject(preview.items),
    ...email,
  });

  if (result?.skipped) {
    return { skipped: true, reason: result.reason || "Email sending is disabled", ...preview };
  }

  await pool.query(
    `INSERT INTO notification_deliveries (user_id, notification_key, sent_to)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, notification_key) DO NOTHING`,
    [userId, notificationKey, preview.user.email]
  );

  return { sent: true, result, notificationKey, ...preview };
}

async function sendDueReminderEmails({ limit = 100 } = {}) {
  await ensureAppSchema();
  await ensureNotificationSchema();
  await ensureUserSchema();
  await ensurePreferenceSchema();
  await ensureReminderSourceSchema();

  const users = await pool.query(
    `SELECT id
     FROM users
     WHERE automatic_reminders = true
       AND subscription_is_premium = true
       AND email IS NOT NULL
     ORDER BY id ASC
     LIMIT $1`,
    [Math.max(1, Math.min(Number(limit) || 100, 500))]
  );

  const results = [];
  for (const user of users.rows) {
    try {
      results.push({ userId: user.id, ...(await sendUserReminderEmail(user.id)) });
    } catch (err) {
      results.push({ userId: user.id, error: err.message || "Failed to send reminders" });
    }
  }

  return results;
}

module.exports = {
  ensureNotificationSchema,
  previewUserReminders,
  sendUserReminderEmail,
  sendDueReminderEmails,
};

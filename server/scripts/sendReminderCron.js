const pool = require("../data-source");
const { ensureAppSchema } = require("../services/ensureAppSchema");
const { sendDueReminderEmails } = require("../services/notificationService");

async function main() {
  await ensureAppSchema();
  const limit = Number(process.env.REMINDER_CRON_LIMIT) || 500;
  const results = await sendDueReminderEmails({ limit });
  const sent = results.filter((result) => result.sent).length;
  const skipped = results.filter((result) => result.skipped).length;
  const failed = results.filter((result) => result.error).length;

  console.log(
    JSON.stringify(
      {
        ok: failed === 0,
        sent,
        skipped,
        failed,
        checkedUsers: results.length,
      },
      null,
      2
    )
  );

  if (failed > 0) {
    console.error(JSON.stringify(results.filter((result) => result.error), null, 2));
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("Reminder cron failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  REMINDER_CANDIDATE_SCAN_CAP,
  getDailyReminderCandidateOffset,
  getReminderCandidateScanLimit,
  getReminderCandidates,
  getReminderResultLimit,
} = require("../services/notificationService");

test("reminder eligibility scans stay bounded while preserving the requested result ceiling", () => {
  assert.equal(getReminderResultLimit(0), 100);
  assert.equal(getReminderResultLimit(10_000), 500);
  assert.equal(getReminderCandidateScanLimit(100), 400);
  assert.equal(getReminderCandidateScanLimit(500), REMINDER_CANDIDATE_SCAN_CAP);
  assert.equal(getReminderCandidateScanLimit(10_000), REMINDER_CANDIDATE_SCAN_CAP);
});

test("reminder candidates rotate through bounded daily windows and wrap safely", async () => {
  const allCandidates = Array.from({ length: 900 }, (_, index) => ({ id: index + 1 }));
  const calls = [];
  const queryable = {
    async query(text, values = []) {
      calls.push({ text, values });
      if (text.includes("COUNT(*)")) return { rows: [{ count: allCandidates.length }] };
      const [limit, offset] = values;
      return { rows: allCandidates.slice(offset, offset + limit) };
    },
  };
  const now = Date.parse("1970-01-03T00:00:00.000Z");

  assert.equal(getDailyReminderCandidateOffset(900, 400, now), 800);
  const candidates = await getReminderCandidates({
    queryable,
    resultLimit: 100,
    now,
  });

  assert.equal(candidates.length, 400);
  assert.equal(candidates[0].id, 801);
  assert.equal(candidates[99].id, 900);
  assert.equal(candidates[100].id, 1);
  assert.equal(candidates.at(-1).id, 300);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[1].values, [400, 800]);
  assert.deepEqual(calls[2].values, [300, 0]);
});

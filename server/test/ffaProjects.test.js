const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeActivityPayload,
  normalizeAnimalLinks,
  normalizeFinancePayload,
  normalizeProjectPayload,
  requirePremium,
  linkedRecordSummaryQuery,
} = require("../routes/ffaProjects");

const project = {
  start_date: "2026-08-01",
  end_date: "2027-05-31",
};

test("FFA Project Mode requires Premium access", () => {
  let nextCalled = false;
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  requirePremium({ user: { subscription: { isPremium: false } } }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 403);
  assert.match(response.body.error, /Premium/i);
  assert.equal(nextCalled, false);

  requirePremium({ user: { subscription: { isPremium: true } } }, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("linked animal summaries include existing and future BarnBuddy records", () => {
  assert.doesNotMatch(linkedRecordSummaryQuery, /records_from_date/);
  assert.doesNotMatch(linkedRecordSummaryQuery, /\$3/);
  for (const table of ["weight_records", "vaccinations", "health_events", "vet_visits", "feed_records", "finance_records"]) {
    assert.match(linkedRecordSummaryQuery, new RegExp(`FROM ${table}\\b`));
  }
  assert.match(linkedRecordSummaryQuery, /pa\.project_id = \$1/);
  assert.match(linkedRecordSummaryQuery, /pa\.user_id = \$2/);
});

test("FFA project setup normalizes valid project fields", () => {
  const result = normalizeProjectPayload({
    name: "  Market Steer SAE  ",
    school_year: "2026-2027",
    sae_type: "Entrepreneurship",
    advisor_email: "Advisor@Example.com",
    start_date: "2026-08-01",
    end_date: "2027-05-31",
    goals: ["Track every expense", "  Practice showmanship  ", ""],
  });

  assert.equal(result.error, undefined);
  assert.equal(result.value.name, "Market Steer SAE");
  assert.equal(result.value.sae_type, "entrepreneurship");
  assert.equal(result.value.advisor_email, "advisor@example.com");
  assert.deepEqual(result.value.goals, ["Track every expense", "Practice showmanship"]);
});

test("FFA project setup rejects invalid types, dates, and advisor email", () => {
  assert.match(normalizeProjectPayload({
    name: "Project",
    school_year: "2026-2027",
    sae_type: "unknown",
    start_date: "2026-08-01",
  }).error, /SAE type/i);

  assert.match(normalizeProjectPayload({
    name: "Project",
    school_year: "2026-2027",
    sae_type: "placement",
    start_date: "2026-08-01",
    end_date: "2026-07-31",
  }).error, /before its start/i);

  assert.match(normalizeProjectPayload({
    name: "Project",
    school_year: "2026-2027",
    sae_type: "placement",
    start_date: "2026-08-01",
    advisor_email: "not-an-email",
  }).error, /valid advisor email/i);
});

test("animal links are deduplicated and preserve safe starting snapshots", () => {
  const result = normalizeAnimalLinks([
    { animal_id: 12, starting_weight: "615.5", starting_value: "1800", ownership_percentage: "50", records_from_date: "2026-08-15" },
    { animal_id: "12", starting_value: 9999 },
  ], project.start_date, project.end_date);

  assert.equal(result.error, undefined);
  assert.equal(result.value.length, 1);
  assert.deepEqual(result.value[0], {
    animal_id: 12,
    starting_weight: 615.5,
    starting_value: 1800,
    ownership_percentage: 50,
    records_from_date: "2026-08-15",
  });
});

test("animal links reject unsafe identifiers, values, and out-of-project dates", () => {
  assert.match(normalizeAnimalLinks([{ animal_id: "1 OR 1=1" }], project.start_date, project.end_date).error, /invalid/i);
  assert.match(normalizeAnimalLinks([{ animal_id: 1, ownership_percentage: 101 }], project.start_date, project.end_date).error, /ownership/i);
  assert.match(normalizeAnimalLinks([{ animal_id: 1, records_from_date: "2026-07-31" }], project.start_date, project.end_date).error, /project dates/i);
  assert.match(normalizeAnimalLinks([{ animal_id: 1, records_from_date: "2026-02-31" }], project.start_date, project.end_date).error, /valid animal record/i);
});

test("journal activities require bounded dates and work time", () => {
  const valid = normalizeActivityPayload({
    activity_date: "2026-08-12",
    category: "Showing",
    title: "Leading practice",
    duration_minutes: "45",
    animal_id: "12",
  }, project);
  assert.equal(valid.error, undefined);
  assert.equal(valid.value.duration_minutes, 45);
  assert.equal(valid.value.animal_id, 12);

  assert.match(normalizeActivityPayload({
    activity_date: "2027-06-01",
    title: "Too late",
    duration_minutes: 10,
  }, project).error, /project dates/i);
  assert.match(normalizeActivityPayload({
    activity_date: "2026-08-12",
    title: "Too long",
    duration_minutes: 1441,
  }, project).error, /24 hours/i);
});

test("project finances require a positive amount and supported type", () => {
  const valid = normalizeFinancePayload({
    transaction_date: "2026-09-01",
    transaction_type: "expense",
    amount: "42.75",
    category: "Feed",
  }, project);
  assert.equal(valid.error, undefined);
  assert.equal(valid.value.amount, 42.75);

  assert.match(normalizeFinancePayload({
    transaction_date: "2026-09-01",
    transaction_type: "transfer",
    amount: 20,
    category: "Other",
  }, project).error, /income or expense/i);
  assert.match(normalizeFinancePayload({
    transaction_date: "2026-09-01",
    transaction_type: "income",
    amount: 0,
    category: "Sale",
  }, project).error, /greater than zero/i);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeBirthPayload,
  normalizeFeedPayload,
  normalizeFinancePayload,
  normalizeHealthEventPayload,
  normalizeInventoryPayload,
  normalizeReproductionPayload,
  normalizeVaccinationPayload,
} = require("../utils/recordPayloads");
const {
  normalizeBoolean,
  normalizeDateOnly,
  normalizeNumber,
  normalizePositiveId,
} = require("../utils/requestValues");
const { getClientError } = require("../utils/routeErrors");

test("shared request values reject malformed dates, numbers, and IDs", () => {
  assert.match(normalizeDateOnly("2026-02-30", { label: "Date" }).error, /valid date/i);
  assert.match(normalizeDateOnly("08/04/2026", { label: "Date" }).error, /valid date/i);
  assert.match(normalizeNumber("12abc", { label: "Amount" }).error, /valid number/i);
  assert.match(normalizePositiveId("1 OR 1=1", { label: "Animal" }).error, /valid selection/i);
});

test("shared request values safely handle blanks and explicit booleans", () => {
  assert.equal(normalizeDateOnly("   ").value, null);
  assert.equal(normalizeNumber("", { defaultValue: 0 }).value, 0);
  assert.equal(normalizePositiveId("").value, null);
  assert.equal(normalizeBoolean("false"), false);
  assert.equal(normalizeBoolean("true"), true);
});

test("PostgreSQL input errors are treated as client validation errors", () => {
  assert.deepEqual(getClientError({ code: "22P02" }), {
    status: 400,
    message: "One or more fields contain an invalid value. Check dates, numbers, and selections, then try again.",
  });
  assert.equal(getClientError({ code: "XX000" }), null);
});

test("vaccination payload requires its core fields and nulls an optional date", () => {
  const valid = normalizeVaccinationPayload({
    animal_id: "8",
    vaccine_name: "  CDT  ",
    date_given: "2026-08-04",
    next_due_date: "",
  }, { requireAnimalId: true });

  assert.equal(valid.error, undefined);
  assert.deepEqual(valid.value, {
    animalId: 8,
    vaccineName: "CDT",
    dateGiven: "2026-08-04",
    nextDueDate: null,
    dosage: "",
    notes: "",
  });
  assert.match(normalizeVaccinationPayload({ date_given: "2026-08-04" }).error, /vaccine name/i);
  assert.match(normalizeVaccinationPayload({ vaccine_name: "CDT", date_given: "bad" }).error, /valid date/i);
});

test("health events require a real date and normalize string booleans", () => {
  const valid = normalizeHealthEventPayload({
    animal_id: 3,
    event_date: "2026-08-04",
    type: " Treatment ",
    resolved: "false",
  }, { requireAnimalId: true });

  assert.equal(valid.error, undefined);
  assert.equal(valid.value.resolved, false);
  assert.equal(valid.value.type, "Treatment");
  assert.match(normalizeHealthEventPayload({ type: "Treatment", event_date: "2026-13-01" }).error, /valid date/i);
});

test("reproduction payload safely normalizes every optional typed field", () => {
  const valid = normalizeReproductionPayload({
    dam_id: "",
    sire_id: null,
    breeding_date: "",
    due_date: "",
    pregnancy_check_date: "",
    birth_date: "",
    offspring_count: "",
  });

  assert.equal(valid.error, undefined);
  assert.equal(valid.value.damId, null);
  assert.equal(valid.value.breedingDate, null);
  assert.equal(valid.value.offspringCount, null);
  assert.match(normalizeReproductionPayload({ offspring_count: "2.5" }).error, /whole number/i);
  assert.match(normalizeReproductionPayload({ due_date: "2026-02-29" }).error, /valid date/i);
});

test("birth payload rejects bad weights instead of sending them to PostgreSQL", () => {
  const valid = normalizeBirthPayload({
    reproduction_id: "",
    offspring_id: "",
    birth_date: "",
    birth_weight: "",
  });

  assert.equal(valid.error, undefined);
  assert.equal(valid.value.birthWeight, null);
  assert.match(normalizeBirthPayload({ birth_weight: "ten" }).error, /valid number/i);
  assert.match(normalizeBirthPayload({ birth_weight: "0" }).error, /greater than/i);
});

test("finance and feed payloads normalize blank database fields", () => {
  const finance = normalizeFinancePayload({ record_date: "", amount: "" });
  const feed = normalizeFeedPayload({
    herd_id: "unassigned",
    record_date: "",
    amount: "",
    cost: "",
    next_purchase_date: "",
  });

  assert.equal(finance.error, undefined);
  assert.equal(finance.value.recordDate, null);
  assert.equal(finance.value.amount, 0);
  assert.equal(feed.error, undefined);
  assert.equal(feed.value.herdId, null);
  assert.equal(feed.value.amount, 0);
  assert.equal(feed.value.cost, 0);
  assert.equal(feed.value.nextPurchaseDate, null);
  assert.match(normalizeFinancePayload({ amount: "12 dollars" }).error, /valid number/i);
});

test("inventory payload handles blank typed fields and string checkbox values", () => {
  const valid = normalizeInventoryPayload({
    item_name: "  Vaccine bottles ",
    quantity: "",
    reorder_level: "",
    cost_per_unit: "",
    expiration_date: "",
    use_for_vaccinations: "false",
    use_for_health_events: "true",
  });

  assert.equal(valid.error, undefined);
  assert.equal(valid.value.itemName, "Vaccine bottles");
  assert.equal(valid.value.quantity, 0);
  assert.equal(valid.value.expirationDate, null);
  assert.equal(valid.value.useForVaccinations, false);
  assert.equal(valid.value.useForHealthEvents, true);
  assert.match(normalizeInventoryPayload({ item_name: "Hay", quantity: "-1" }).error, /at least 0/i);
});

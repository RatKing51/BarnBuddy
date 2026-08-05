const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeVetVisitPayload } = require("../utils/vetVisitPayload");

test("blank optional vet visit values are safe for PostgreSQL", () => {
  const result = normalizeVetVisitPayload({
    animal_id: "42",
    visit_date: "2026-08-04",
    follow_up_date: "",
    cost: "",
  }, { requireAnimalId: true });

  assert.equal(result.error, undefined);
  assert.equal(result.value.animal_id, 42);
  assert.equal(result.value.visit_date, "2026-08-04");
  assert.equal(result.value.follow_up_date, null);
  assert.equal(result.value.cost, 0);
});

test("vet visit payload rejects invalid costs and calendar dates", () => {
  assert.equal(
    normalizeVetVisitPayload({ animal_id: 1, visit_date: "2026-08-04", cost: "not-a-number" }, { requireAnimalId: true }).error,
    "Cost must be a valid non-negative number."
  );
  assert.equal(
    normalizeVetVisitPayload({ animal_id: 1, visit_date: "2026-02-30" }, { requireAnimalId: true }).error,
    "Visit date must be a valid date."
  );
  assert.equal(
    normalizeVetVisitPayload({ animal_id: 1 }, { requireAnimalId: true }).error,
    "Visit date is required."
  );
});

test("vet visit completion flags are normalized explicitly", () => {
  const result = normalizeVetVisitPayload({
    visit_date: "2026-08-04",
    completed: "false",
    visit_completed: "true",
    follow_up_completed: 1,
  });

  assert.equal(result.value.completed, false);
  assert.equal(result.value.visit_completed, true);
  assert.equal(result.value.follow_up_completed, true);
});

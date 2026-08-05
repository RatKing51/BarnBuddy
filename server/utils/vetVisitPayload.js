const {
  cleanText,
  normalizeBoolean,
  normalizeDateOnly,
  normalizeNumber,
  normalizePositiveId,
} = require("./requestValues");

function normalizeVetVisitPayload(body = {}, { requireAnimalId = false } = {}) {
  const animalId = normalizePositiveId(body.animal_id, { label: "Animal", required: requireAnimalId });
  if (animalId.error) return animalId;

  const visitDate = normalizeDateOnly(body.visit_date, { label: "Visit date", required: true });
  if (visitDate.error) return visitDate;

  const followUpDate = normalizeDateOnly(body.follow_up_date, { label: "Follow-up date" });
  if (followUpDate.error) return followUpDate;

  const cost = normalizeNumber(body.cost, {
    label: "Cost",
    defaultValue: 0,
    min: 0,
    max: 100_000_000,
  });
  if (cost.error) return { error: "Cost must be a valid non-negative number." };

  return {
    value: {
      ...(requireAnimalId ? { animal_id: animalId.value } : {}),
      vet_name: cleanText(body.vet_name),
      visit_date: visitDate.value,
      reason: cleanText(body.reason),
      treatment: cleanText(body.treatment),
      medications: cleanText(body.medications),
      follow_up_date: followUpDate.value,
      cost: cost.value,
      notes: cleanText(body.notes),
      completed: normalizeBoolean(body.completed),
      visit_completed: normalizeBoolean(body.visit_completed),
      follow_up_completed: normalizeBoolean(body.follow_up_completed),
    },
  };
}

module.exports = {
  normalizeVetVisitPayload,
};

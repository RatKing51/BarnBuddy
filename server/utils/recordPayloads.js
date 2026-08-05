const {
  cleanText,
  normalizeBoolean,
  normalizeDateOnly,
  normalizeNumber,
  normalizePositiveId,
} = require("./requestValues");

function firstError(results) {
  return results.find((result) => result.error)?.error || "";
}

function normalizeVaccinationPayload(body = {}, { requireAnimalId = false } = {}) {
  const animalId = normalizePositiveId(body.animal_id, { label: "Animal", required: requireAnimalId });
  const dateGiven = normalizeDateOnly(body.date_given, { label: "Date given", required: true });
  const nextDueDate = normalizeDateOnly(body.next_due_date, { label: "Next due date" });
  const error = firstError([animalId, dateGiven, nextDueDate]);
  if (error) return { error };

  const vaccineName = cleanText(body.vaccine_name);
  if (!vaccineName) return { error: "Vaccine name is required." };

  return {
    value: {
      animalId: animalId.value,
      vaccineName,
      dateGiven: dateGiven.value,
      nextDueDate: nextDueDate.value,
      dosage: cleanText(body.dosage),
      notes: cleanText(body.notes),
    },
  };
}

function normalizeHealthEventPayload(body = {}, { requireAnimalId = false } = {}) {
  const animalId = normalizePositiveId(body.animal_id, { label: "Animal", required: requireAnimalId });
  const eventDate = normalizeDateOnly(body.event_date, { label: "Event date", required: true });
  const error = firstError([animalId, eventDate]);
  if (error) return { error };

  const type = cleanText(body.type);
  if (!type) return { error: "Event type is required." };

  return {
    value: {
      animalId: animalId.value,
      eventDate: eventDate.value,
      type,
      description: cleanText(body.description),
      severity: cleanText(body.severity, "Low"),
      resolved: normalizeBoolean(body.resolved),
      notes: cleanText(body.notes),
    },
  };
}

function normalizeReproductionPayload(body = {}) {
  const damId = normalizePositiveId(body.dam_id, { label: "Dam" });
  const sireId = normalizePositiveId(body.sire_id, { label: "Sire" });
  const breedingDate = normalizeDateOnly(body.breeding_date, { label: "Breeding date" });
  const dueDate = normalizeDateOnly(body.due_date, { label: "Due date" });
  const pregnancyCheckDate = normalizeDateOnly(body.pregnancy_check_date, { label: "Pregnancy check date" });
  const birthDate = normalizeDateOnly(body.birth_date, { label: "Birth date" });
  const offspringCount = normalizeNumber(body.offspring_count, {
    label: "Offspring count",
    integer: true,
    min: 0,
  });
  const error = firstError([
    damId,
    sireId,
    breedingDate,
    dueDate,
    pregnancyCheckDate,
    birthDate,
    offspringCount,
  ]);
  if (error) return { error };

  return {
    value: {
      damId: damId.value,
      sireId: sireId.value,
      breedingDate: breedingDate.value,
      dueDate: dueDate.value,
      outcome: cleanText(body.outcome, "Planned"),
      breedingMethod: cleanText(body.breeding_method),
      pregnancyCheckDate: pregnancyCheckDate.value,
      pregnancyStatus: cleanText(body.pregnancy_status),
      birthDate: birthDate.value,
      offspringCount: offspringCount.value,
      birthOutcome: cleanText(body.birth_outcome),
      notes: cleanText(body.notes),
    },
  };
}

function normalizeBirthPayload(body = {}) {
  const reproductionId = normalizePositiveId(body.reproduction_id, { label: "Reproduction" });
  const offspringId = normalizePositiveId(body.offspring_id, { label: "Offspring" });
  const birthDate = normalizeDateOnly(body.birth_date, { label: "Birth date" });
  const birthWeight = normalizeNumber(body.birth_weight, {
    label: "Birth weight",
    min: 0,
    exclusiveMin: true,
  });
  const error = firstError([reproductionId, offspringId, birthDate, birthWeight]);
  if (error) return { error };

  return {
    value: {
      reproductionId: reproductionId.value,
      offspringId: offspringId.value,
      birthDate: birthDate.value,
      birthWeight: birthWeight.value,
      birthNotes: cleanText(body.birth_notes),
    },
  };
}

function normalizeFinancePayload(body = {}) {
  const animalId = normalizePositiveId(body.animal_id, { label: "Animal" });
  const herdId = normalizePositiveId(body.herd_id === "unassigned" ? null : body.herd_id, { label: "Herd" });
  const recordDate = normalizeDateOnly(body.record_date, { label: "Record date" });
  const amount = normalizeNumber(body.amount, { label: "Amount", defaultValue: 0, min: 0 });
  const error = firstError([animalId, herdId, recordDate, amount]);
  if (error) return { error };

  return {
    value: {
      animalId: animalId.value,
      herdId: herdId.value,
      recordDate: recordDate.value,
      category: cleanText(body.category, "Expense"),
      amount: amount.value,
      vendor: cleanText(body.vendor),
      notes: cleanText(body.notes),
    },
  };
}

function normalizeFeedPayload(body = {}) {
  const animalId = normalizePositiveId(body.animal_id, { label: "Animal" });
  const herdId = normalizePositiveId(body.herd_id === "unassigned" ? null : body.herd_id, { label: "Herd" });
  const recordDate = normalizeDateOnly(body.record_date, { label: "Record date" });
  const amount = normalizeNumber(body.amount, { label: "Feed amount", defaultValue: 0, min: 0 });
  const cost = normalizeNumber(body.cost, { label: "Feed cost", defaultValue: 0, min: 0 });
  const nextPurchaseDate = normalizeDateOnly(body.next_purchase_date, { label: "Next purchase date" });
  const error = firstError([animalId, herdId, recordDate, amount, cost, nextPurchaseDate]);
  if (error) return { error };

  return {
    value: {
      animalId: animalId.value,
      herdId: herdId.value,
      recordDate: recordDate.value,
      feedType: cleanText(body.feed_type),
      amount: amount.value,
      unit: cleanText(body.unit, "lb"),
      cost: cost.value,
      nextPurchaseDate: nextPurchaseDate.value,
      notes: cleanText(body.notes),
    },
  };
}

function normalizeInventoryPayload(body = {}) {
  const herdId = normalizePositiveId(body.herd_id === "unassigned" ? null : body.herd_id, { label: "Herd" });
  const quantity = normalizeNumber(body.quantity, { label: "Quantity", defaultValue: 0, min: 0 });
  const reorderLevel = normalizeNumber(body.reorder_level, { label: "Reorder level", defaultValue: 0, min: 0 });
  const costPerUnit = normalizeNumber(body.cost_per_unit, { label: "Cost per unit", defaultValue: 0, min: 0 });
  const expirationDate = normalizeDateOnly(body.expiration_date, { label: "Expiration date" });
  const error = firstError([herdId, quantity, reorderLevel, costPerUnit, expirationDate]);
  if (error) return { error };

  const itemName = cleanText(body.item_name);
  if (!itemName) return { error: "Item name is required." };

  return {
    value: {
      herdId: herdId.value,
      itemName,
      category: cleanText(body.category, "Supplies"),
      quantity: quantity.value,
      unit: cleanText(body.unit, "each"),
      reorderLevel: reorderLevel.value,
      costPerUnit: costPerUnit.value,
      supplier: cleanText(body.supplier),
      expirationDate: expirationDate.value,
      useForVaccinations: normalizeBoolean(body.use_for_vaccinations),
      useForHealthEvents: normalizeBoolean(body.use_for_health_events),
      notes: cleanText(body.notes),
    },
  };
}

module.exports = {
  normalizeBirthPayload,
  normalizeFeedPayload,
  normalizeFinancePayload,
  normalizeHealthEventPayload,
  normalizeInventoryPayload,
  normalizeReproductionPayload,
  normalizeVaccinationPayload,
};

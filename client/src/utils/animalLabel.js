function cleanLabelPart(value) {
  return String(value ?? "").trim();
}

export function getUnnamedAnimalLabel(animal) {
  const id = cleanLabelPart(animal?.animal_id || animal?.id);
  return id ? `Unnamed animal #${id}` : "Unnamed animal";
}

export function getAnimalDisplayName(animal, { preferTag = false, prefixTag = false } = {}) {
  const name = cleanLabelPart(animal?.name || animal?.animal_name);
  const tag = cleanLabelPart(animal?.tag_id || animal?.animal_tag);
  const value = preferTag ? tag || name : name || tag;

  if (!value) return getUnnamedAnimalLabel(animal);
  if (prefixTag && value === tag && !name) return `Tag ${tag}`;
  return value;
}

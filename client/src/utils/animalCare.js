import { getAnimalDisplayName } from "./animalLabel";

export const animalStatusLabels = {
  red: "Overdue",
  yellow: "Due soon",
  green: "Stable",
  deceased: "Deceased",
  archived: "Archived",
};

export function getAnimalCareStatus(animal, urgencies) {
  if (animal.status === "deceased" || animal.status === "archived") return animal.status;
  return urgencies[animal.id] || "green";
}

export function getAnimalIdentifiers(animal, primaryIdentifier) {
  const preferTag = primaryIdentifier === "tag";
  return {
    primary: getAnimalDisplayName(animal, { preferTag }),
    secondary: preferTag ? animal.name : animal.tag_id && `Tag ${animal.tag_id}`,
  };
}

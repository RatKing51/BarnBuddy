const SPECIES_DEFAULTS = {
  Cattle: "Cow",
  Goats: "Goat",
  Sheep: "Sheep",
  Pigs: "Swine",
  Horses: "Horse",
  Poultry: "Chicken",
  Rabbits: "Rabbit",
  Other: "Other",
};

export function getOnboardingDefaultSpecies(onboarding = {}) {
  const primarySpecies = Array.isArray(onboarding.primarySpecies)
    ? onboarding.primarySpecies.filter((species) => SPECIES_DEFAULTS[species])
    : [];

  return SPECIES_DEFAULTS[primarySpecies[0]] || "Cow";
}

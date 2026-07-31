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

const GOAL_PERSONALIZATION = {
  "Remember health records": {
    preferredAnimalTab: "health",
    title: "Stay ahead of animal care",
    copy: "Health records, vaccinations, vet visits, and follow-ups are your recommended starting point.",
    actionLabel: "Open health records",
  },
  "Track breeding and birth records": {
    preferredAnimalTab: "reproduction",
    title: "Keep breeding plans moving",
    copy: "BarnBuddy will lead you toward reproduction timelines, breeding notes, and birth records.",
    actionLabel: "Open reproduction records",
  },
  "Track weights and growth": {
    preferredAnimalTab: "weight",
    title: "Make growth easy to follow",
    copy: "Weight history and growth records are placed at the center of your animal workflow.",
    actionLabel: "Open weight tracking",
  },
  "Manage show animals": {
    preferredAnimalTab: "weight",
    title: "Keep show animals on track",
    copy: "Profiles, weights, health history, and notes are the recommended workflow for your projects.",
    actionLabel: "Open a show animal",
  },
  "Keep sale/buyer records": {
    preferredAnimalTab: "finance",
    title: "Keep sale records connected",
    copy: "Animal money records are your recommended starting point for tracking sales and buyers.",
    actionLabel: "Open money records",
  },
  "Organize everything in one place": {
    preferredAnimalTab: "general",
    title: "Your farm, organized in one place",
    copy: "Start with an animal profile, then move between care, growth, breeding, and money records as needed.",
    actionLabel: "Open an animal profile",
  },
  "Not sure yet": {
    preferredAnimalTab: "general",
    title: "Start simple and build from there",
    copy: "Begin with an animal profile. BarnBuddy will keep every record type close when you need it.",
    actionLabel: "Open an animal profile",
  },
};

const DEFAULT_GOAL = GOAL_PERSONALIZATION["Organize everything in one place"];

export function getOnboardingPersonalization(onboarding = {}) {
  const primarySpecies = Array.isArray(onboarding.primarySpecies)
    ? onboarding.primarySpecies.filter((species) => SPECIES_DEFAULTS[species])
    : [];
  const goal = GOAL_PERSONALIZATION[onboarding.mainGoal] || DEFAULT_GOAL;
  const defaultSpecies = SPECIES_DEFAULTS[primarySpecies[0]] || "Cow";

  return {
    ...goal,
    isConfigured: Boolean(
      onboarding.completed ||
      onboarding.userType ||
      primarySpecies.length ||
      onboarding.herdSizeRange ||
      onboarding.mainGoal
    ),
    defaultSpecies,
    primarySpecies,
    speciesLabel: primarySpecies.length ? primarySpecies.join(", ") : "Your animals",
    profileLabel: onboarding.userType || "Livestock owner",
    herdSizeLabel: onboarding.herdSizeRange ? `${onboarding.herdSizeRange} animals` : "",
    mainGoal: onboarding.mainGoal || "Organize everything in one place",
  };
}

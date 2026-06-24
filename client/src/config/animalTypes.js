export const ANIMAL_TYPES = [
  {
    value: "Cow",
    label: "Cattle",
    sexOptions: ["Cow", "Heifer", "Bull", "Steer", "Calf"],
    reproductionDays: 283,
    reproductionTerm: "gestation",
  },
  {
    value: "Horse",
    label: "Horse",
    sexOptions: ["Mare", "Stallion", "Gelding", "Filly", "Colt", "Foal"],
    reproductionDays: 340,
    reproductionTerm: "gestation",
  },
  {
    value: "Donkey",
    label: "Donkey",
    sexOptions: ["Jenny", "Jack", "Gelding", "Filly", "Colt", "Foal"],
    reproductionDays: 365,
    reproductionTerm: "gestation",
  },
  {
    value: "Sheep",
    label: "Sheep",
    sexOptions: ["Ewe", "Ram", "Wether", "Lamb"],
    reproductionDays: 147,
    reproductionTerm: "gestation",
  },
  {
    value: "Goat",
    label: "Goat",
    sexOptions: ["Doe", "Buck", "Wether", "Doeling", "Buckling", "Kid"],
    reproductionDays: 150,
    reproductionTerm: "gestation",
  },
  {
    value: "Swine",
    label: "Pig / Swine",
    sexOptions: ["Sow", "Gilt", "Boar", "Barrow", "Stag", "Piglet"],
    reproductionDays: 114,
    reproductionTerm: "gestation",
  },
  {
    value: "Alpaca",
    label: "Alpaca",
    sexOptions: ["Female", "Male", "Gelding", "Cria"],
    reproductionDays: 345,
    reproductionTerm: "gestation",
  },
  {
    value: "Llama",
    label: "Llama",
    sexOptions: ["Female", "Male", "Gelding", "Cria"],
    reproductionDays: 350,
    reproductionTerm: "gestation",
  },
  {
    value: "Rabbit",
    label: "Rabbit",
    sexOptions: ["Doe", "Buck", "Kit"],
    reproductionDays: 31,
    reproductionTerm: "gestation",
  },
  {
    value: "Chicken",
    label: "Chicken",
    sexOptions: ["Hen", "Rooster", "Pullet", "Cockerel", "Chick"],
    reproductionDays: 21,
    reproductionTerm: "incubation",
  },
  {
    value: "Duck",
    label: "Duck",
    sexOptions: ["Hen", "Drake", "Duckling"],
    reproductionDays: 28,
    reproductionTerm: "incubation",
  },
  {
    value: "Turkey",
    label: "Turkey",
    sexOptions: ["Hen", "Tom", "Jake", "Jenny", "Poult"],
    reproductionDays: 28,
    reproductionTerm: "incubation",
  },
  {
    value: "Goose",
    label: "Goose",
    sexOptions: ["Goose", "Gander", "Gosling"],
    reproductionDays: 30,
    reproductionTerm: "incubation",
  },
  {
    value: "Other",
    label: "Other",
    sexOptions: ["Female", "Male", "Neutered", "Unknown"],
    reproductionDays: null,
    reproductionTerm: "custom",
  },
];

export const SEX_OPTIONS_BY_SPECIES = Object.fromEntries(
  ANIMAL_TYPES.map((animalType) => [animalType.value, animalType.sexOptions])
);

export function getAnimalType(species) {
  const normalized = String(species || "").trim().toLowerCase();
  const aliases = {
    cattle: "Cow",
    cow: "Cow",
    pig: "Swine",
    pigs: "Swine",
    hog: "Swine",
    hogs: "Swine",
    equine: "Horse",
    poultry: "Chicken",
  };
  const matchingValue = aliases[normalized] || species;
  return ANIMAL_TYPES.find(
    (animalType) => animalType.value.toLowerCase() === String(matchingValue || "").trim().toLowerCase()
  ) || null;
}

export function getReproductionDefaults(species) {
  const animalType = getAnimalType(species);
  return {
    days: animalType?.reproductionDays ?? null,
    term: animalType?.reproductionTerm || "custom",
  };
}

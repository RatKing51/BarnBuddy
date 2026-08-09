const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MAX_BULK_RECORDS = 500;

const RECORD_CREATION_POLICIES = Object.freeze([
  Object.freeze({
    key: "record-create:cooldown",
    windowSeconds: 2,
    max: 1,
    message: "Please wait before creating another record.",
  }),
  Object.freeze({
    key: "record-create:minute",
    windowSeconds: MINUTE,
    max: 10,
    message: "You have reached the limit of 10 new records per minute.",
    exposeHeaders: true,
  }),
  Object.freeze({
    key: "record-create:hour",
    windowSeconds: HOUR,
    max: 100,
    message: "You have reached the limit of 100 new records per hour.",
  }),
]);

function getAiExtractionPolicies(isPremium) {
  const dailyMax = isPremium ? 25 : 3;
  const planName = isPremium ? "Premium" : "Free";

  return [
    {
      key: "ai-extraction:cooldown",
      windowSeconds: MINUTE,
      max: 1,
      message: "AI extraction has a 60-second cooldown.",
    },
    {
      key: "ai-extraction:daily",
      windowSeconds: DAY,
      max: dailyMax,
      message: `${planName} accounts can use AI extraction ${dailyMax} times per 24 hours.`,
      exposeHeaders: true,
    },
  ];
}

module.exports = {
  MAX_BULK_RECORDS,
  RECORD_CREATION_POLICIES,
  getAiExtractionPolicies,
};

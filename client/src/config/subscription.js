export const PLAN_IDS = {
  free: "free",
  premium: "premium",
};

export const PLANS = {
  [PLAN_IDS.free]: {
    id: PLAN_IDS.free,
    name: "Free",
    price: "$0",
    interval: "forever",
    description: "Core livestock records for small herds and students getting started.",
    cta: "Start free",
    features: [
      "Animal profiles and herd organization",
      "Health records and vet visit history",
      "Basic dashboard care status",
      "Mobile-friendly record keeping",
    ],
  },
  [PLAN_IDS.premium]: {
    id: PLAN_IDS.premium,
    name: "Premium",
    price: "$5",
    interval: "per month",
    description: "Advanced reporting and planning tools for farms that need deeper insight.",
    cta: "Upgrade to Premium",
    features: [
      "Advanced dashboard analytics",
      "PDF and scheduled exports",
      "Automatic reminders",
      "Breeding, finance, feed, and inventory tools",
      "Shared farm account access",
    ],
  },
};

export const PREMIUM_FEATURES = [
  "Advanced dashboard analytics",
  "PDF and scheduled exports",
  "Automatic reminders",
  "Breeding, finance, feed, and inventory tools",
];

export const PRICING_FEATURES = [
  { label: "Animal and herd records", free: "Included", premium: "Included" },
  { label: "Health and vet tracking", free: "Included", premium: "Included" },
  { label: "Care status dashboard", free: "Basic", premium: "Advanced" },
  { label: "Exports", free: "Simple records", premium: "PDF and scheduled exports" },
  { label: "Automatic reminders", free: "Manual review", premium: "Included" },
  { label: "Breeding, finance, feed, and inventory tools", free: "Not included", premium: "Included" },
];

const premiumPlanValues = new Set(["premium", "pro", "paid", "active"]);
const activeStatusValues = new Set(["active", "trialing", "paid"]);

function normalizeValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function readFirstString(source, keys) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

function readFirstBoolean(source, keys) {
  if (!source || typeof source !== "object") return false;

  return keys.some((key) => source[key] === true);
}

function readFirstDate(source, keys) {
  if (!source || typeof source !== "object") return 0;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  return 0;
}

export function getSubscriptionFromClerk({ user, sessionClaims, backendUser, hasPremiumAccess = false } = {}) {
  const publicMetadata = user?.publicMetadata || {};
  const unsafeMetadata = user?.unsafeMetadata || {};
  const backendSubscription = backendUser?.subscription || {};

  const plan = normalizeValue(
    readFirstString(sessionClaims, ["plan", "subscriptionPlan", "subscription_plan", "billingPlan"]) ||
      readFirstString(publicMetadata, ["plan", "subscriptionPlan", "subscription_plan", "billingPlan"]) ||
      readFirstString(unsafeMetadata, ["plan", "subscriptionPlan", "subscription_plan", "billingPlan"]) ||
      readFirstString(backendSubscription, ["plan", "subscriptionPlan", "billingPlan"])
  );

  const status = normalizeValue(
    readFirstString(sessionClaims, ["subscriptionStatus", "subscription_status", "billingStatus"]) ||
      readFirstString(publicMetadata, ["subscriptionStatus", "subscription_status", "billingStatus"]) ||
      readFirstString(unsafeMetadata, ["subscriptionStatus", "subscription_status", "billingStatus"]) ||
      readFirstString(backendSubscription, ["status", "subscriptionStatus", "billingStatus"])
  );

  const hasPremiumFlag =
    readFirstBoolean(sessionClaims, ["premium", "isPremium", "hasPremium"]) ||
    readFirstBoolean(publicMetadata, ["premium", "isPremium", "hasPremium"]) ||
    readFirstBoolean(unsafeMetadata, ["premium", "isPremium", "hasPremium"]) ||
    readFirstBoolean(backendSubscription, ["premium", "isPremium", "hasPremium"]);
  const premiumExpiresAt =
    readFirstDate(sessionClaims, ["premiumExpiresAt", "premium_expires_at", "subscriptionExpiresAt"]) ||
    readFirstDate(publicMetadata, ["premiumExpiresAt", "premium_expires_at", "subscriptionExpiresAt"]) ||
    readFirstDate(unsafeMetadata, ["premiumExpiresAt", "premium_expires_at", "subscriptionExpiresAt"]) ||
    readFirstDate(backendSubscription, ["premiumExpiresAt", "premium_expires_at", "subscriptionExpiresAt"]);
  const premiumExpired = Boolean(premiumExpiresAt && premiumExpiresAt <= Date.now());

  const isPremium = Boolean(
    !premiumExpired &&
      (Boolean(hasPremiumAccess) ||
        hasPremiumFlag ||
        premiumPlanValues.has(plan) ||
        Boolean(plan && plan !== PLAN_IDS.free && activeStatusValues.has(status)))
  );

  const planId = isPremium ? PLAN_IDS.premium : PLAN_IDS.free;

  return {
    isPremium,
    planId,
    planName: PLANS[planId].name,
    status: status || (isPremium ? "active" : "free"),
    statusLabel: isPremium ? "Active" : "Free",
    premiumExpiresAt: premiumExpiresAt ? new Date(premiumExpiresAt).toISOString() : "",
    premiumExpired,
  };
}

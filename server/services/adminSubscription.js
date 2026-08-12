function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeValue(value) {
  return asTrimmedString(value).toLowerCase();
}

function getFutureExpiration(value) {
  const parsed = value ? Date.parse(value) : 0;
  return parsed && parsed > Date.now() ? new Date(parsed).toISOString() : "";
}

function hasPremiumMetadata(publicMetadata = {}) {
  const expiresAt = getFutureExpiration(publicMetadata.premiumExpiresAt);
  const hasExpired = Boolean(publicMetadata.premiumExpiresAt && !expiresAt);
  return (
    normalizeValue(publicMetadata.plan) === "premium" &&
    ["active", "trialing", "canceled"].includes(normalizeValue(publicMetadata.subscriptionStatus)) &&
    !hasExpired
  );
}

function hasActiveLocalPremium(localUser = {}) {
  const expiresAt = getFutureExpiration(localUser.subscription_expires_at);
  const hasExpired = Boolean(localUser.subscription_expires_at && !expiresAt);
  return localUser.subscription_is_premium === true && !hasExpired;
}

function isClerkManagedLocalPremium(localUser = {}) {
  const source = normalizeValue(localUser.subscription_source);
  return (
    hasActiveLocalPremium(localUser) &&
    ["clerk_billing", "clerk_entitlement", "clerk_trial", "clerk_billing_canceled"].includes(source)
  );
}

function getAdminSubscriptionState(publicMetadata = {}, localUser = {}) {
  const metadataPremium = hasPremiumMetadata(publicMetadata);
  const localPremium = hasActiveLocalPremium(localUser);
  const clerkManagedPremium = isClerkManagedLocalPremium(localUser);
  const isPremium = metadataPremium || localPremium;
  const metadataExpiration = getFutureExpiration(publicMetadata.premiumExpiresAt);
  const localExpiration = getFutureExpiration(localUser.subscription_expires_at);
  const source = clerkManagedPremium
    ? asTrimmedString(localUser.subscription_source) || "clerk_entitlement"
    : (metadataPremium
      ? asTrimmedString(publicMetadata.premiumSource) || "manual_admin"
      : (localPremium ? asTrimmedString(localUser.subscription_source) || "clerk_entitlement" : ""));
  const status = clerkManagedPremium
    ? normalizeValue(localUser.subscription_status) || "active"
    : (metadataPremium
      ? normalizeValue(publicMetadata.subscriptionStatus) || "active"
      : (localPremium ? normalizeValue(localUser.subscription_status) || "active" : "free"));
  const metadataHadExpired = Boolean(publicMetadata.premiumExpiresAt && !metadataExpiration);
  const localHadExpired = Boolean(localUser.subscription_expires_at && !localExpiration);

  return {
    isPremium,
    plan: isPremium ? "premium" : "free",
    subscriptionStatus: status,
    premiumSource: source,
    premiumExpiresAt: clerkManagedPremium
      ? localExpiration
      : (metadataPremium ? metadataExpiration : localExpiration),
    premiumExpired: !isPremium && (metadataHadExpired || localHadExpired),
  };
}

function getClerkBillingSubscriptionState(subscription = {}, planCandidates = []) {
  const candidates = new Set(planCandidates.map(normalizeValue).filter(Boolean));
  const items = subscription.subscriptionItems || subscription.subscription_items || subscription.items || [];
  const now = Date.now();
  const premiumItem = items.find((item = {}) => {
    const plan = item.plan || {};
    const features = Array.isArray(plan.features) ? plan.features : [];
    const values = [
      item.planId,
      item.plan_id,
      plan.id,
      plan.slug,
      ...features.flatMap((feature = {}) => [feature.id, feature.slug]),
    ].map(normalizeValue).filter(Boolean);
    const matchesPremiumConfig = values.some((value) => candidates.has(value));
    const isClearlyPaidPlan = plan.isDefault === false && (
      plan.hasBaseFee === true ||
      Boolean(plan.fee || plan.annualFee || item.amount)
    );
    const isPremiumPlan = matchesPremiumConfig || isClearlyPaidPlan;
    const status = normalizeValue(item.status);
    const periodEnd = Number(item.periodEnd || item.period_end) || 0;
    const hasAccess = status === "active" || (status === "canceled" && periodEnd > now);
    return isPremiumPlan && hasAccess;
  });

  if (!premiumItem) {
    return { isPremium: false, plan: "free", status: "free", source: "", expiresAt: "" };
  }

  const periodEnd = Number(premiumItem.periodEnd || premiumItem.period_end) || 0;
  const isTrial = premiumItem.isFreeTrial === true || premiumItem.is_free_trial === true;
  const status = isTrial ? "trialing" : normalizeValue(premiumItem.status) || "active";
  const keepExpiration = isTrial || status === "canceled";

  return {
    isPremium: true,
    plan: "premium",
    status,
    source: isTrial ? "clerk_trial" : (status === "canceled" ? "clerk_billing_canceled" : "clerk_billing"),
    expiresAt: keepExpiration && periodEnd ? new Date(periodEnd).toISOString() : "",
  };
}

module.exports = {
  getAdminSubscriptionState,
  getClerkBillingSubscriptionState,
  hasActiveLocalPremium,
  hasPremiumMetadata,
  isClerkManagedLocalPremium,
};

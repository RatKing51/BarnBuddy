require("dotenv").config();

function uniqueUrls(urls) {
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
}

function positiveDayList(value, fallback = [7, 3, 1]) {
  const days = String(value || "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0 && item <= 90);

  return [...new Set(days.length ? days : fallback)].sort((a, b) => a - b);
}

function resolveNodeEnv(environment = process.env) {
  const railwayEnvironment = String(environment.RAILWAY_ENVIRONMENT_NAME || "").trim().toLowerCase();
  return railwayEnvironment === "production" ? "production" : (environment.NODE_ENV || "development");
}

const nodeEnv = resolveNodeEnv();

function buildClientUrls(value, environment = nodeEnv) {
  const configured = String(value || "").split(",").map((url) => url.trim()).filter(Boolean);
  const allowedConfigured = configured.filter((url) => (
    environment !== "production" || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)
  ));

  return uniqueUrls([
    ...allowedConfigured,
    "https://barnbuddy.pro",
    "https://www.barnbuddy.pro",
    ...(environment === "production" ? [] : ["http://localhost:5173", "http://127.0.0.1:5173"]),
  ]);
}

function validateProductionConfig(configuration) {
  const missing = [];
  if (!configuration.databaseUrl) missing.push("DATABASE_URL");
  if (!configuration.databaseSslCaCert) missing.push("DATABASE_SSL_CA_CERT");
  if (!configuration.databaseSslServername) missing.push("DATABASE_SSL_SERVERNAME");
  if (!configuration.rateLimitHmacSecret) missing.push("RATE_LIMIT_HMAC_SECRET");
  if (!configuration.clerk.publishableKey) missing.push("CLERK_PUBLISHABLE_KEY");
  if (!configuration.clerk.secretKey) missing.push("CLERK_SECRET_KEY");
  if (!configuration.clerk.webhookSigningSecret) missing.push("CLERK_WEBHOOK_SIGNING_SECRET");
  if (!configuration.adminClerkUserIds?.length) missing.push("ADMIN_CLERK_USER_IDS");
  if (!configuration.clerk.premiumPlanId && !configuration.clerk.premiumPlanSlug && !configuration.clerk.premiumFeatureSlug) {
    missing.push("CLERK_PREMIUM_PLAN_ID or CLERK_PREMIUM_PLAN_SLUG or CLERK_PREMIUM_FEATURE_SLUG");
  }
  if (missing.length) {
    throw new Error(`Missing required production configuration: ${missing.join(", ")}.`);
  }
  if (!configuration.clerk.publishableKey.startsWith("pk_live_")) {
    throw new Error("Production requires a live Clerk publishable key.");
  }
  if (!configuration.clerk.secretKey.startsWith("sk_live_")) {
    throw new Error("Production requires a live Clerk secret key.");
  }
  if (String(configuration.rateLimitHmacSecret).length < 32) {
    throw new Error("RATE_LIMIT_HMAC_SECRET must contain at least 32 characters in production.");
  }
  if (!String(configuration.databaseSslCaCert).includes("BEGIN CERTIFICATE")) {
    throw new Error("DATABASE_SSL_CA_CERT must contain a PEM-encoded PostgreSQL CA certificate.");
  }
}

const usePublicDatabaseUrl = process.env.USE_PUBLIC_DATABASE_URL === "true";
const databaseUrl = usePublicDatabaseUrl
  ? process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || process.env.DB_URL || ""
  : process.env.DATABASE_URL || process.env.DB_URL || "";

const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  clientUrls: buildClientUrls(process.env.CLIENT_URL, nodeEnv),
  databaseUrl,
  databaseSslCaCert: process.env.DATABASE_SSL_CA_CERT || "",
  databaseSslServername: process.env.DATABASE_SSL_SERVERNAME || "",
  rateLimitHmacSecret: process.env.RATE_LIMIT_HMAC_SECRET || "",
  adminClerkUserIds: (process.env.ADMIN_CLERK_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  db: {
    user: process.env.PGUSER || "postgres",
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE || "BarnBuddy",
    password: process.env.PGPASSWORD || "",
    port: Number(process.env.PGPORT) || 5432,
  },
  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || "",
    secretKey: process.env.CLERK_SECRET_KEY || "",
    webhookSigningSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET || "",
    premiumPlanId: process.env.CLERK_PREMIUM_PLAN_ID || "",
    premiumPlanSlug: process.env.CLERK_PREMIUM_PLAN_SLUG || "",
    premiumFeatureSlug: process.env.CLERK_PREMIUM_FEATURE_SLUG || "",
  },
  email: {
    enabled: process.env.EMAIL_ENABLED === "true",
    resendApiKey: process.env.RESEND_API_KEY || "",
    from: process.env.RESEND_FROM_EMAIL || "BarnBuddy <onboarding@resend.dev>",
    notificationsFrom:
      process.env.RESEND_NOTIFICATIONS_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      "BarnBuddy Notifications <notifications@barnbuddy.pro>",
    newsletterAudienceId: process.env.RESEND_NEWSLETTER_AUDIENCE_ID || "",
    contactTo: process.env.CONTACT_TO_EMAIL || process.env.RESEND_TO_EMAIL || "barnbuddyapp@gmail.com",
    testAllowedEmails: (process.env.EMAIL_TEST_ALLOWED_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    testAllowedClerkUserIds: (process.env.EMAIL_TEST_ALLOWED_CLERK_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  },
  notifications: {
    cronSecret: process.env.NOTIFICATION_CRON_SECRET || "",
    premiumExpiryReminderDays: positiveDayList(process.env.PREMIUM_EXPIRY_REMINDER_DAYS),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    importModel: process.env.OPENAI_IMPORT_MODEL || "gpt-5.5",
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET_NAME || "",
    siteBucket: process.env.R2_SITE_BUCKET_NAME || "",
    publicBaseUrl: (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
    signedUrlTtlSeconds: Math.max(
      60,
      Math.min(Number(process.env.R2_SIGNED_URL_TTL_SECONDS) || 900, 604800)
    ),
  },
};

if (env.nodeEnv === "production") {
  validateProductionConfig(env);
}

module.exports = env;
module.exports.buildClientUrls = buildClientUrls;
module.exports.validateProductionConfig = validateProductionConfig;
module.exports.resolveNodeEnv = resolveNodeEnv;

require("dotenv").config();

function uniqueUrls(urls) {
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
}

const configuredClientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const usePublicDatabaseUrl = process.env.USE_PUBLIC_DATABASE_URL === "true";
const databaseUrl = usePublicDatabaseUrl
  ? process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || process.env.DB_URL || ""
  : process.env.DATABASE_URL || process.env.DB_URL || "";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  clientUrls: uniqueUrls([
    ...configuredClientUrls,
    "http://localhost:5173",
    "https://barnbuddy.pro",
    "https://www.barnbuddy.pro",
  ]),
  databaseUrl,
  db: {
    user: process.env.PGUSER || "postgres",
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE || "BarnBuddy",
    password: process.env.PGPASSWORD || "password",
    port: Number(process.env.PGPORT) || 5432,
  },
  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || "",
    secretKey: process.env.CLERK_SECRET_KEY || "",
    webhookSigningSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET || "",
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
  if (env.clerk.publishableKey.startsWith("pk_test_")) {
    throw new Error("Production is using a Clerk test publishable key. Set CLERK_PUBLISHABLE_KEY to a pk_live key.");
  }

  if (env.clerk.secretKey.startsWith("sk_test_")) {
    throw new Error("Production is using a Clerk test secret key. Set CLERK_SECRET_KEY to a sk_live key.");
  }
}

module.exports = env;

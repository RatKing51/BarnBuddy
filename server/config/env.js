require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL || "",
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
  },
};

module.exports = env;

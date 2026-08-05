const env = require("./config/env");

process.env.CLERK_PUBLISHABLE_KEY = env.clerk.publishableKey;
console.log("Clerk publishable key mode:", env.clerk.publishableKey.startsWith("pk_live_") ? "live" : "test-or-missing");
console.log("Clerk secret key mode:", env.clerk.secretKey.startsWith("sk_live_") ? "live" : "test-or-missing");

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { clerkMiddleware } = require("@clerk/express");
const securityHeaders = require("./middleware/securityHeaders");
const { getClientError } = require("./utils/routeErrors");

const animalRoutes = require("./routes/animals");
const herdRoutes = require("./routes/herds")
const vaccinationRoutes = require("./routes/vaccinations");
const vetVisitRoutes = require("./routes/vetVisits");
const healthEventRoutes = require("./routes/healthEvents");
const authRoutes = require("./routes/auth");
const reproductionRoutes = require("./routes/reproductions");
const premiumRecordRoutes = require("./routes/premiumRecords");
const birthRoutes = require("./routes/births");
const clerkWebhookRoutes = require("./routes/clerkWebhooks");
const contactRoutes = require("./routes/contact");
const emailRoutes = require("./routes/email");
const newsletterRoutes = require("./routes/newsletter");
const notificationRoutes = require("./routes/notifications");
const siteContentRoutes = require("./routes/siteContent");
const importAssistantRoutes = require("./routes/importAssistant");
const ffaProjectRoutes = require("./routes/ffaProjects");
const { ensureAppSchema } = require("./services/ensureAppSchema");

const app = express();
app.disable("x-powered-by");
if (env.nodeEnv === "production") app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.clientUrls.includes(origin)) {
      return callback(null, true);
    }

    console.warn("Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    ...(env.nodeEnv === "production" ? {} : { environment: env.nodeEnv }),
  });
});
app.use("/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhookRoutes);
app.use(express.json({ limit: "100kb" }));
app.use(clerkMiddleware({
  publishableKey: env.clerk.publishableKey,
  secretKey: env.clerk.secretKey,
}));

app.use("/api/animals", animalRoutes);
app.use("/api/herds", herdRoutes);
app.use("/api/vaccinations", vaccinationRoutes);
app.use("/api/vetVisits", vetVisitRoutes);
app.use("/api/healthEvents", healthEventRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/site-content", siteContentRoutes);
app.use("/api/import-assistant", importAssistantRoutes);
app.use("/api/ffa-projects", ffaProjectRoutes);
app.use("/auth", authRoutes);
app.use("/contact", contactRoutes);
app.use("/api/reproductions", reproductionRoutes);
app.use("/api/premium-records", premiumRecordRoutes);
app.use("/api/births", birthRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        if (err.field === "file") {
          return res.status(400).json({ error: "File too large. Max size is 15MB." });
        }
        return res.status(400).json({ error: "Image too large. Max size is 5MB." });
      }
    }

    if (err.message === "Only images allowed") {
      return res.status(400).json({ error: "Only image files are allowed." });
    }

    if (err.message === "Unsupported image type") {
      return res.status(400).json({
        error: "Unsupported image format. Please use JPG, PNG, GIF, WebP, or AVIF.",
      });
    }

    if (err.message === "Unsupported import help file type") {
      return res.status(400).json({
        error: "Use a CSV, spreadsheet, PDF, Word document, text file, or photo.",
      });
    }

    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({ error: "Not allowed by CORS" });
    }

    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body is too large." });
    }

    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Request body contains invalid JSON." });
    }

    const clientError = getClientError(err);
    if (clientError) {
      return res.status(clientError.status).json({ error: clientError.message });
    }

    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
  next();
});

async function startServer() {
  try {
    await ensureAppSchema();
    app.listen(env.port, () => console.log(`Server running on port ${env.port}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

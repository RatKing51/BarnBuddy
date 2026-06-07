const env = require("./config/env");

process.env.CLERK_PUBLISHABLE_KEY = env.clerk.publishableKey;
console.log("Clerk publishable key mode:", env.clerk.publishableKey.startsWith("pk_live_") ? "live" : "test-or-missing");
console.log("Clerk secret key mode:", env.clerk.secretKey.startsWith("sk_live_") ? "live" : "test-or-missing");

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { clerkMiddleware } = require("@clerk/express");

const animalRoutes = require("./routes/animals");
const herdRoutes = require("./routes/herds")
const vaccinationRoutes = require("./routes/vaccinations");
const vetVisitRoutes = require("./routes/vetVisits");
const healthEventRoutes = require("./routes/healthEvents");
const authRoutes = require("./routes/auth");
const reproductionRoutes = require("./routes/reproductions");
const birthRoutes = require("./routes/births");
const clerkWebhookRoutes = require("./routes/clerkWebhooks");
const contactRoutes = require("./routes/contact");

const app = express();
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
app.use("/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhookRoutes);
app.use(express.json());
app.use(clerkMiddleware());

app.use("/api/animals", animalRoutes);
app.use("/api/herds", herdRoutes);
app.use("/api/vaccinations", vaccinationRoutes);
app.use("/api/vetVisits", vetVisitRoutes);
app.use("/api/healthEvents", healthEventRoutes);
app.use("/auth", authRoutes);
app.use("/contact", contactRoutes);
app.use("/api/reproductions", reproductionRoutes);
app.use("/api/births", birthRoutes);

app.use((err, req, res, next) => {
  if (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Image too large. Max size is 5MB." });
      }
    }

    if (err.message === "Only images allowed") {
      return res.status(400).json({ error: "Only image files are allowed." });
    }

    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({ error: "Not allowed by CORS" });
    }

    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true, environment: env.nodeEnv });
});

app.listen(env.port, () => console.log(`Server running on port ${env.port}`))

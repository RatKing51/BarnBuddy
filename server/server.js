const express = require("express");
const cors = require("cors");
const multer = require("multer");

const animalRoutes = require("./routes/animals");
const herdRoutes = require("./routes/herds")
const vaccinationRoutes = require("./routes/vaccinations");
const vetVisitRoutes = require("./routes/vetVisits");
const healthEventRoutes = require("./routes/healthEvents");
const authRoutes = require("./routes/auth");
const reproductionRoutes = require("./routes/reproductions");
const birthRoutes = require("./routes/births");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/animals", animalRoutes);
app.use("/api/herds", herdRoutes);
app.use("/api/vaccinations", vaccinationRoutes);
app.use("/api/vetVisits", vetVisitRoutes);
app.use("/api/healthEvents", healthEventRoutes);
app.use("/auth", authRoutes);
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

    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
  next();
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
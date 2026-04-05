const express = require("express");
const cors = require("cors");

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

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
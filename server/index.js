require("dotenv").config();
const express = require("express");
const cors = require("cors");
const AppDataSource = require("./src/data-source");
const authRoutes = require("./src/routes/auth.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => console.log("DB connection error:", err));

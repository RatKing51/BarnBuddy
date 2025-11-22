require("dotenv").config();
const { DataSource } = require("typeorm");
const User = require("./entities/User"); // make sure this exists

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,      // use the Railway URL
  ssl: { rejectUnauthorized: false }, // required for cloud Postgres
  synchronize: true,                  // only for dev
  logging: false,
  entities: [User],
});

module.exports = AppDataSource;

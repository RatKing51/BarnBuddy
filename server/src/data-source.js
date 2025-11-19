require("dotenv").config();
const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "barnbuddy",
  synchronize: true, // auto-create tables for dev
  logging: false,
  entities: [require("./entities/User")],
});

module.exports = AppDataSource;

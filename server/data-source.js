const { Pool } = require("pg");
const env = require("./config/env");

const pool = new Pool(
    env.databaseUrl
        ? {
            connectionString: env.databaseUrl,
            ssl: env.nodeEnv === "production" ? { rejectUnauthorized: false } : false,
        }
        : env.db
);

module.exports = pool;

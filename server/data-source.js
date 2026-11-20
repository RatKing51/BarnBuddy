const { Pool } = require("pg");
const env = require("./config/env");
const { getDatabaseSslOptions } = require("./config/databaseTls");

const pool = new Pool(
    env.databaseUrl
        ? {
            connectionString: env.databaseUrl,
            ssl: getDatabaseSslOptions(env),
        }
        : env.db
);

module.exports = pool;

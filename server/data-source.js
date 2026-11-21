const { Pool } = require("pg");
const env = require("./config/env");
const { getDatabaseConnectionConfig } = require("./config/databaseTls");

const connection = getDatabaseConnectionConfig(env);
const pool = new Pool(connection || env.db);

module.exports = pool;

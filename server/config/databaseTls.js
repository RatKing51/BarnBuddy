const { parse } = require("pg-connection-string");

function isRailwayPrivateHostname(hostname = "") {
  const host = String(hostname).trim().toLowerCase();
  return host.length > ".railway.internal".length && host.endsWith(".railway.internal");
}

function getDatabaseSslOptions({
  nodeEnv = "development",
  databaseHost = "",
  databaseSslCaCert = "",
  connectionSsl = false,
} = {}) {
  if (nodeEnv !== "production") return connectionSsl || false;

  // Railway private service traffic is isolated and encrypted with WireGuard.
  // Its stock PostgreSQL image uses a per-database private CA, which cannot
  // validate against Node's system trust store without an operator-provided CA.
  if (isRailwayPrivateHostname(databaseHost)) return false;

  const ssl = connectionSsl && typeof connectionSsl === "object" ? { ...connectionSsl } : {};
  delete ssl.checkServerIdentity;
  ssl.rejectUnauthorized = true;
  if (databaseSslCaCert) ssl.ca = databaseSslCaCert;
  return ssl;
}

function getDatabaseConnectionConfig({ nodeEnv, databaseUrl, databaseSslCaCert } = {}) {
  if (!databaseUrl) return null;

  const connection = parse(databaseUrl);
  return {
    ...connection,
    ssl: getDatabaseSslOptions({
      nodeEnv,
      databaseHost: connection.host,
      databaseSslCaCert,
      connectionSsl: connection.ssl,
    }),
  };
}

module.exports = { getDatabaseConnectionConfig, getDatabaseSslOptions, isRailwayPrivateHostname };


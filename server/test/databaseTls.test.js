const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getDatabaseConnectionConfig,
  getDatabaseSslOptions,
  isRailwayPrivateHostname,
} = require("../config/databaseTls");

test("Railway private PostgreSQL uses the explicitly documented WireGuard path", () => {
  assert.equal(isRailwayPrivateHostname("postgres.railway.internal"), true);
  assert.equal(isRailwayPrivateHostname("POSTGRES.RAILWAY.INTERNAL"), true);
  assert.equal(isRailwayPrivateHostname("not-railway.internal"), false);
  assert.equal(getDatabaseSslOptions({
    nodeEnv: "production",
    databaseHost: "postgres.railway.internal",
  }), false);
});

test("external production PostgreSQL verifies system or supplied CA certificates", () => {
  assert.deepEqual(getDatabaseSslOptions({
    nodeEnv: "production",
    databaseHost: "db.example.net",
  }), { rejectUnauthorized: true });
  assert.deepEqual(getDatabaseSslOptions({
    nodeEnv: "production",
    databaseHost: "db.example.net",
    databaseSslCaCert: "test-ca",
    connectionSsl: { rejectUnauthorized: false, checkServerIdentity: () => undefined },
  }), { rejectUnauthorized: true, ca: "test-ca" });
});

test("database CA and strict verification settings are optional outside production", () => {
  assert.equal(getDatabaseSslOptions({ nodeEnv: "development" }), false);
});

test("production connection config overrides unsafe connection-string SSL modes", () => {
  const external = getDatabaseConnectionConfig({
    nodeEnv: "production",
    databaseUrl: "postgresql://user:password@db.example.net:5432/barnbuddy?sslmode=no-verify",
  });
  assert.deepEqual(external.ssl, { rejectUnauthorized: true });
  assert.equal(external.host, "db.example.net");

  const railwayPrivate = getDatabaseConnectionConfig({
    nodeEnv: "production",
    databaseUrl: "postgresql://user:password@postgres.railway.internal:5432/barnbuddy?sslmode=require",
  });
  assert.equal(railwayPrivate.ssl, false);
});

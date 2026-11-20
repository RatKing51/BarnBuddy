function getDatabaseSslOptions(configuration) {
  if (configuration.nodeEnv !== "production") return false;

  return {
    ca: configuration.databaseSslCaCert,
    rejectUnauthorized: true,
    servername: configuration.databaseSslServername,
  };
}

module.exports = { getDatabaseSslOptions };

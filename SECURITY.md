# BarnBuddy Security Policy

## Supported Version

Security updates are applied to the latest deployed BarnBuddy release and the current `main` branch. Older deployments should be upgraded before requesting a fix.

## Report a Vulnerability

Email `barnbuddyapp@gmail.com` with the subject `Security report`. Include:

- the affected URL or feature;
- steps to reproduce the issue;
- the likely impact;
- screenshots or a minimal proof of concept, if useful; and
- a safe way to contact you.

Please do not post an unpatched vulnerability publicly, access another person's livestock or account data, interrupt the service, or include real credentials or sensitive personal information in a report. Use test data and stop once you have demonstrated the issue.

BarnBuddy will aim to acknowledge a report within three business days, validate its severity, and provide updates while a fix is prepared. Timelines may vary with complexity and third-party dependencies.

## Deployment Checklist

- Run supported Node LTS releases. The client currently requires Node 22.22 or a supported Node 24+ release.
- Keep Clerk, Resend, OpenAI, Cloudflare R2, database, webhook, and cron credentials only in the deployment secret store.
- Set `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL_CA_CERT`, `DATABASE_SSL_SERVERNAME`, `RATE_LIMIT_HMAC_SECRET`, live `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, and `ADMIN_CLERK_USER_IDS` in Railway. The app also forces production protections when Railway names the active environment `production`. Startup fails closed if required values are absent, and rejects untrusted PostgreSQL certificates.
- Keep the PostgreSQL service private on Railway. The stock Railway postgres-ssl certificate uses a self-signed CA and `localhost` identity; retrieve the public CA certificate from the database service, store its PEM in `DATABASE_SSL_CA_CERT`, and set `DATABASE_SSL_SERVERNAME=localhost`. Never copy the CA private key or server private key.
- Generate a unique random `RATE_LIMIT_HMAC_SECRET` with at least 32 characters. Public contact and newsletter limits use a database-backed bucket keyed by an HMAC of the client address; raw IP addresses are not stored.
- Historical credential exposure was previously remediated by rotation per founder confirmation. Current validity is independently unverified; do not repeat rotation absent new evidence of currently active exposed credentials.
- Keep Clerk webhook signing and notification cron secrets enabled in production.
- Review CORS origins, the `ADMIN_CLERK_USER_IDS` allowlist, and premium plan identifiers before each production deployment. Administrative access is granted by Clerk user ID only; keep the allowlist in Railway, never in `VITE_` variables.
- Run `npm audit`, the server tests, the client lint/build, and the docs build before release.
- Back up the database and test restoration regularly. Confirm that account deletion also removes associated object-storage files.
- Monitor repeated authentication failures, rate-limit responses, upload failures, webhook failures, and elevated 5xx responses.

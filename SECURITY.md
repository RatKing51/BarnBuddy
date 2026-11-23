# BarnBuddy Security Policy

## Supported Version

Security updates are applied to the latest deployed BarnBuddy release and the current `main` branch. Older deployments should be upgraded before requesting a fix.

## Report a Vulnerability

Email `support@barnbuddy.pro` with the subject `Security report`. Include:

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
- Use distinct production and development credentials. Historical credential exposure was previously remediated by rotation per founder confirmation; current validity is independently unverified. Do not repeat rotation absent new evidence of currently active exposed credentials.
- Connect the Railway API to PostgreSQL through the private `.railway.internal` address. Railway encrypts private service traffic with its WireGuard network, so BarnBuddy uses that platform-protected path without requesting PostgreSQL TLS for that private hostname. This is an explicit network trust choice; do not point the API at a public database proxy for convenience.
- For production PostgreSQL hosts outside Railway private networking, BarnBuddy requires verified TLS using Node's system trust store. If the database uses a private CA, set the optional `DATABASE_SSL_CA_CERT` PEM value. The hostname must match the server certificate; no verification bypass is enabled. The standard Railway database CA is private and therefore needs a CA bundle if strict PostgreSQL TLS is used instead of the WireGuard private-network path.
- Public contact, newsletter, and import-help throttles share persistent PostgreSQL counters across API instances. Their subject keys use HKDF-derived HMAC keys from the existing server-side Clerk secret (or the database URL if Clerk is not configured); raw IPs and Clerk user IDs are not stored in the limiter table. No extra HMAC environment variable is required.
- Keep Clerk webhook signing and notification cron secrets enabled in production.
- Review CORS origins, admin email/user ID allowlists, and premium plan identifiers before each production deployment.
- Run `npm audit`, the server tests, the client lint/build, and the docs build before release.
- Back up the database and test restoration regularly. Confirm that account deletion also removes associated object-storage files.
- Monitor repeated authentication failures, rate-limit responses, upload failures, webhook failures, and elevated 5xx responses.

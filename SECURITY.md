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
- Use distinct production and development credentials and rotate any credential that may have been exposed.
- Keep Clerk webhook signing and notification cron secrets enabled in production.
- Review CORS origins, admin email/user ID allowlists, and premium plan identifiers before each production deployment.
- Run `npm audit`, the server tests, the client lint/build, and the docs build before release.
- Back up the database and test restoration regularly. Confirm that account deletion also removes associated object-storage files.
- Monitor repeated authentication failures, rate-limit responses, upload failures, webhook failures, and elevated 5xx responses.

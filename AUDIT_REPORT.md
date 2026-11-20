# BarnBuddy production audit report

Updated: 2026-11-20  
Scope: follow-up review of billing, newsletter, account deletion, public news, accessibility, performance, assets, and founder/legal decisions. No production settings were changed, no production subscription was started, and no customer data was deleted.

## A. Existing functionality verified by code review

- Clerk handles authentication and exposes Clerk Billing components for monthly Premium checkout and subscription management. The application does not contain a direct Stripe SDK integration; Stripe is the payment processor behind the Clerk Billing configuration and still needs production-dashboard verification.
- PostgreSQL stores BarnBuddy account and livestock records. Cloudflare R2 is used for uploaded objects. Railway is identified as the hosting platform in the public policy copy. Resend is used for newsletter contact synchronization and transactional email.
- The newsletter has a public email subscription endpoint, an authenticated account preference endpoint, database status records, a Resend audience sync, and request rate limiting. A required unchecked marketing opt-in is present on the public form. Code review did not find an outbound marketing campaign sender; this does not verify the provider's unsubscribe behavior for any campaigns sent outside this repository.
- Account deletion is authenticated, asks Clerk to delete the identity, and then runs BarnBuddy cleanup. The Clerk `user.deleted` webhook also runs cleanup and attempts a newsletter unsubscribe. R2 cleanup is best-effort and errors are logged; durable retry, user-visible completion status, and the proposed 24-hour escalation are not implemented or verified.
- Public news is fetched from the site-content API, with bundled fallback content. Production server code pre-renders article metadata/content and builds a sitemap from published API stories when reachable. If the API is unreachable, bundled news is the fallback; an unknown article ID can consequently receive a fallback route response instead of a reliable not-found status.
- Production build generation emits SEO HTML for 30 BarnBuddy routes. Public routes have route metadata; private dashboard/admin routes are marked noindex and are excluded from the public sitemap. `robots.txt` is a crawl preference, not an access control.
- Inter Variable is bundled locally. Its installed package declares SIL Open Font License 1.1. No analytics or advertising SDK was found in the reviewed client dependency/source inventory. Essential authentication and payment-provider behavior still relies on third parties and their configuration.
- Existing app behavior includes dashboard record management, account settings, Premium billing actions, public documentation/news/contact pages, and admin content management. The fixes listed below preserve these patterns.

## B. Issues and limits found

- Production Stripe/Clerk plan setup, renewal and failed-payment behavior, tax settings, trial state, cancellation timing, and actual checkout summary cannot be established from repository code alone.
- Newsletter provider synchronization is visible in code, but no end-to-end Resend or production unsubscribe test has been performed. The repository contains transactional email senders; a repository-owned marketing campaign sender was not found.
- Deletion cleanup spans Clerk, PostgreSQL and R2, but has no durable cleanup queue or user-facing distinction between access revocation, database deletion, and storage cleanup. Provider delivery and webhook retries were not exercised. The current account deletion path does not provide a full-account export; existing selected-record PDF exports remain.
- Dynamic news API publication, metadata, sitemap freshness, fallback and HTTP statuses need staging verification against live-like content. There are no focused automated integration tests for the server-side dynamic news flow in the current test suite.
- Automated accessibility scanning was not available in the installed project. The Playwright Firefox suite was attempted, but all six cases failed before executing browser actions; no Firefox executable was present in the local Playwright browser cache. This is an environment limitation, not evidence that the UI assertions passed or failed.
- `weight-graph.png` is 1,060,876 bytes at 1672 × 941. Product screenshots (`dashboard.png`, `generaldata.png`, `vetvisits.png`) are 77–105 KB at approximately 1867 × 940. `bblogo.png` is 25 KB at 1200 × 1200. Existing PWA icons are about 4.5 KB (192 × 192) and 12.9 KB (512 × 512). The source/origin and commercial-use rights for photography, screenshots, logos, and news images have not been fully documented.
- A 685 × 703 favicon was 344,789 bytes despite being served as an icon. It has been resized and re-encoded without changing the artwork.
- The main JavaScript bundle was 612.1 KB minified before this follow-up and triggered Vite's 500 KB warning. The landing page was statically imported into every route even though its animation dependencies are only used on marketing pages.

## C. Fixes completed

### Product, account and legal transparency

- Added distinct routes and page metadata for Privacy, Terms, Refunds, Subscription/Cancellation, Cookies, Data Retention, Accessibility, and Security information. Policy language identifies details that remain unconfirmed rather than inventing an entity, address, guarantee, or legal commitment.
- Removed the visually prominent “Details requiring confirmation” panel from the public legal pages at the founder's request. Unresolved decisions remain documented in this report; this presentation change does not indicate that policy terms received legal approval.
- Increased legal-page article width and typography, added clearer section spacing/dividers, and improved mobile link targets and keyboard focus while keeping the existing BarnBuddy palette and content.
- Added newsletter opt-in control and legal links to the footer; removed an unsupported “Verified” review label and the inaccurate “Export anytime” signup claim.
- Clarified that account deletion does not cancel a Premium subscription and that uploaded-file cleanup is a separate operation.
- Updated billing and deletion help documentation to match the current interface.
- Changed account deletion order so Clerk identity deletion is attempted before local cleanup; suppressed private R2 object keys from cleanup logs. The webhook cleanup is intended to be idempotent, but production and provider failure paths still need staging tests.

### SEO and public news

- Added route-specific static SEO output, canonical production URLs, robots directives, metadata and a sitemap built from route definitions plus published bundled stories.
- Added runtime sitemap/article rendering using published site-content stories with bounded caching and fallback behavior.
- Kept private account/admin pages out of indexable SEO output; `robots.txt` must not be relied upon for security.

### Accessibility and interaction quality

- Added a search label in bulk entry.
- Improved the FFA project dialog with initial focus, focus containment, Escape handling, and focus restoration.
- Corrected dashboard mobile “More” navigation semantics and exposed selected navigation state; removed Escape behavior that cleared animal selection.
- Existing homepage browser tests cover mobile menu/focus restoration, reduced motion, navigation, and horizontal overflow, but are currently blocked from execution by the unavailable local Firefox binary.

### Performance and asset handling

- Lazy-loaded the landing route so non-home routes do not download landing-only animation code.
- Removed unused `react-hot-toast` from client dependencies and lockfile; the app already uses `react-toastify`.
- Resized `client/public/favicon.png` to 256 × 263; file size fell from 344,789 bytes to 52,636 bytes (about 85% smaller). Brand artwork remains visually intact at icon scale.
- Kept the large weight chart and product imagery unchanged because the current UI/API can serve independently managed copies and no safe, visually equivalent optimized replacement was verified. See `ASSET_LICENSES.md` for provenance follow-up.

## D. Founder and legal decisions requiring review

The following is a record of founder input, not finalized policy language. Do not publish it as legally approved until the noted reviews and verification are complete.

1. **Legal operator and governing terms.** BarnBuddy is the public-facing brand. The legal operating name is unconfirmed. Kansas, United States is the proposed business jurisdiction, subject to confirming the operator's location and registration. Kansas governing law is proposed, pending attorney review. No arbitration, class-action waiver, exclusive venue, or other special dispute term has counsel approval. Confirm the operator/entity and obtain counsel review before publishing a governing-law or dispute provision.
2. **Minors and school use.** Proposed minimum registration age is 13; users ages 13–17 should have parent/guardian permission, but consent verification and enforcement are not implemented or legally reviewed. COPPA and FERPA/school-record assessments are unconfirmed. Confirm counsel's assessment of actual audience, registration, data flows, school-sponsored use, agreements, and whether additional safeguards are required. No new age-gate or consent workflow was added.
3. **Billing configuration and terms.** Founder input proposes $5/month, automatically renewing until canceled, no advertised trial unless configured, cancellation stopping future renewals with paid access through period end, and return to Free after expiry while retaining livestock records. Stripe is stated as the processor through Clerk Billing, but the production connection/settings are unverified. Taxes, retry/grace behavior, exact plan price/interval, trial state, and post-cancellation entitlement timing require account verification. Do not change production billing settings during this audit.
4. **Refund policy.** Founder proposed a full first-payment refund request within 7 calendar days, an unintended renewal refund request within 48 hours, no automatic proration, and separate review of duplicate/error/unauthorized/service-failure/legal cases. Requested acknowledgement/decision targets are 2/5 business days; approved refunds would go through the connected payment account and may end Premium immediately. These rules are explicitly pending confirmation and legal review. Verify Clerk/Stripe refund and entitlement behavior before implementation or publication.
5. **Retention periods.** Founder proposed: rolling 30-day encrypted DB backups; 30-day routine logs; 90-day security logs; 180-day admin activity; 12-month resolved support records; 7-year necessary financial records (accountant/legal review); third-party retention controlled by providers; and removal/anonymization of deletion-processing records within 90 days except documented holds. These periods are not verified against Railway, PostgreSQL, Clerk, Stripe, Resend, or R2 configuration and are not established as enforced schedules. Confirm provider capabilities, applicable law, and enforcement before publishing them.
6. **Chapter contacts, admin logs and R2 cleanup.** Founder proposed removing a deleted user's profile/membership/permissions without deleting active shared chapters, limiting independently maintained chapter contact data, reviewing inactive contacts after 12 months, retaining necessary admin activity for 180 days with minimization/access controls, and durable idempotent R2 deletion retries plus support/admin alert after 24 hours. These controls are not fully implemented or verified. Choose implementation priority and validate behavior in an isolated environment; do not imply all deletion is complete while cleanup is pending.
7. **Full-account export.** Founder decision: do not build a full account CSV/JSON/bulk export now; retain current plan-gated PDF exports, and handle any legally required access/copy requests through an appropriate process. No development change is needed. Ensure public copy does not promise “export anytime” or imply a complete archive.
8. **Support and email identity.** Proposed response goal is within 2 business days, Monday–Friday excluding major holidays; support may take longer for complex issues. `support@barnbuddy.pro` and sender `updates@barnbuddy.pro` are proposed and must be verified as operational/authenticated before publication. All marketing email must have working no-login/no-fee unsubscribe and remain separate from transactional messages. Production sender and unsubscribe behavior are not verified.
9. **Backups, incident response and certifications.** No backup/recovery process, incident-response process, or independent security certification has been verified for public claims. Verify backup configuration, document/restore-test in isolation, and establish incident procedures. Do not claim SOC 2, ISO 27001, penetration tests, compliance certification, or recovery guarantees without evidence.
10. **Asset rights.** Founder says assets should be original, owned, or licensed, but provenance/permissions for existing assets are not fully verified. Complete the asset-by-asset inventory and preserve evidence/attribution; confirm releases for identifiable people, especially minors. Do not reuse unverified images commercially without permission.

## E. Production verification and automated test results

- `client`: `npm run lint` passed.
- `client`: `npm run build` passed. It generated SEO HTML for 30 routes.
- `server`: `npm test` passed: 78 tests, 0 failures. These include Clerk Billing entitlement/event interpretation and security/payload checks, but not live checkout, Resend, user deletion, or dynamic news provider integration.
- Browser suite: `npm run test:browser -- --workers=1 --timeout=7000` attempted. All six Firefox cases failed at 0–1 ms before UI interaction; Firefox is not installed in `%LOCALAPPDATA%\ms-playwright`. Manual UI verification and automated browser accessibility checks remain incomplete.
- Post-optimization build reports `index-wJ_1bh2R.js` at 459.28 KB minified / 143.11 KB gzip; `Landing-n4sYMBs7.js` is 146.61 KB / 55.30 KB gzip; `Dashboard-Cj3wWCYJ.js` is 258.64 KB / 58.60 KB gzip; `AdminContent-B2IpPooW.js` is 145.88 KB / 29.70 KB gzip. Vite's 500 KB main-chunk warning is gone. Main CSS is 137.83 KB / 22.69 KB gzip. Inter Latin WOFF2 is 48.26 KB and Latin-ext is 85.07 KB; unicode subsets and `unicode-range` should avoid fetching unrelated scripts, but actual field network behavior was not profiled.
- No production deployment, configuration changes, test payment, subscription cancellation, newsletter send, account deletion, or customer-data operation was performed.

## F. Staging/manual verification checklist

Use an isolated staging environment with test Clerk/Stripe configuration, test PostgreSQL data, a test R2 bucket, and a test Resend audience. Never use live customer records for destructive checks.

### Billing

- In Clerk Dashboard, verify the production Stripe connection, Premium plan ID/slug, $5 monthly price, recurring interval, no unintended trial, tax handling, failed-payment retries, and cancellation/period-end settings. Compare these with staging; do not edit production during this review.
- In staging, signed out: visit Pricing and follow signup; confirm the recurring amount and interval are shown before checkout.
- In staging with Stripe test mode, complete a test subscription with a test card. Verify Clerk subscription details and BarnBuddy Premium entitlement, webhook delivery/idempotency, dashboard access, and confirmation email.
- Cancel from Manage billing. Confirm whether cancellation is scheduled or immediate, the effective end date, access through the paid period, and Free-plan access after the period expires. Exercise failed-payment/test webhook cases supported by the provider. Record exact observed behavior; do not assume a grace period.
- If testing production settings, use read-only dashboard review only. No production checkout or cancellation.

### Newsletter and email

- In staging with test addresses, verify blank/invalid email rejection, required unchecked opt-in, duplicate/re-subscription behavior, success/error feedback, rate limiting, and that an unchecked form cannot subscribe.
- Verify the account preference reflects Resend state; toggle off/on and confirm PostgreSQL and the test audience agree. Confirm failures are shown rather than reported as success.
- If a campaign sender is configured outside this repository, send only to an authorized test inbox; verify `From`, domain authentication, transactional/marketing separation, unsubscribe without login, suppression on subsequent campaigns, and re-subscribe only after affirmative opt-in. Do not send to customers.
- Verify proposed support/sender addresses are monitored/authenticated before publishing them or promising response times.

### Account deletion and data lifecycle

- Create a disposable staging Clerk user with representative records, chapter membership (if safe), and owned R2 uploads. Delete only that disposable account.
- Verify identity revocation/deletion, repeated `user.deleted` webhook handling, local DB cleanup, membership/privacy cleanup, newsletter suppression, and R2 object cleanup. Check the deletion response and logs do not disclose sensitive identifiers or object keys.
- Simulate Clerk, PostgreSQL, Resend and R2 failures independently. Confirm which steps have committed, whether retries occur, whether support/admin can detect incomplete deletion, and whether the user is told accurately. Current R2 handling is best-effort, so durable retry/escalation remains a production priority.
- Do not run these destructive steps against production or actual customers.

### Dynamic news and SEO

- In staging, publish, update, unpublish and republish a test story. Check listing/detail rendering, canonical/title/description/Open Graph/Article structured data, correct date/image alt, and freshness after cache expiry.
- Fetch `/sitemap.xml`; confirm only current published stories appear, stable public routes remain present, and private dashboard/admin URLs are absent. Verify `robots.txt` and noindex headers/meta for private routes separately from authorization.
- Request a nonexistent story ID and record HTTP status and rendered page. Repeat with site-content API unavailable and confirm the documented bundled fallback. Test direct navigation/crawler response without executing client JavaScript.
- Run a production preview with all public routes and confirm redirects, 404 status for unknown paths, internal/footer links, and no console/network errors.

## G. Manual WCAG 2.2 AA checklist

Run this with a current Chromium or Firefox browser after installing the project browser, at desktop and 320–390 px widths, with keyboard only, 200% text zoom, and a screen reader (NVDA with Firefox/Chrome or VoiceOver with Safari). The checks below are not completed by the passing build/lint/server tests.

- [ ] **Keyboard and focus:** Tab/Shift+Tab through every public and authenticated route; confirm logical order, visible focus, no traps outside dialogs, skip link works, every action has keyboard activation, sticky navigation does not obscure focused content, and focus returns to the trigger after closing overlays.
- [ ] **Screen reader and semantics:** Inspect landmarks, page title changes after client navigation, one clear page-level heading, nested headings, link purpose, button names/state, live status/announcement regions, image alt text, data-table headers/captions, and hidden decorative icons using NVDA/VoiceOver.
- [ ] **Forms:** Check labels are programmatically associated; required state is conveyed; errors identify the field and correction; errors are announced and linked with `aria-describedby`; invalid submission focuses or summarizes the first error; values persist after recoverable errors; loading/disabled/success states are perceivable; newsletter consent is never prechecked.
- [ ] **Dialogs and menus:** Open/close every modal, dropdown, dashboard mobile menu and account dialog by keyboard; verify dialog name/role, initial focus, contained focus when modal, Escape behavior, background inertness, trigger restoration, and no focus lost to hidden content.
- [ ] **Notifications:** Trigger success and error toast flows; verify announcement role/live politeness, readable duration, no unexpected focus movement, errors remain available long enough to read, and no important state is conveyed by color alone.
- [ ] **Dashboard and tables:** Navigate animal records and dense tables at 200% zoom; verify row/column context, controls are distinguishable, horizontal scrolling is locally operable where necessary, and no content/functionality is lost at 320 CSS px.
- [ ] **Visual/reflow:** Verify 200% text zoom and 400% browser zoom/reflow at a 1280 px viewport; contrast for text, focus indicators, disabled/hover states, chart content and validation messages; touch target sizing; reduced-motion preference; no horizontal overflow.
- [ ] **Authentication and billing:** Test Clerk-hosted dialogs, checkout/manage-billing controls, and any provider-rendered errors with keyboard and screen reader; these third-party surfaces require their own accessibility assessment.

Automated follow-up recommended once a browser is installed: run the existing desktop/narrow Playwright suite; add an approved axe-core scan to the existing browser workflow only after confirming dependency policy. Automated scans do not replace the manual checks above.

## H. Remaining priorities

1. Obtain counsel review for legal operator, minors/COPPA/FERPA, billing/refund terms, privacy/retention, deletion and school-account obligations before final policy publication.
2. Verify production Clerk/Stripe and email configuration read-only; perform functional checks only in staging/test mode.
3. Implement and test durable, observable retries for deletion cleanup before describing account deletion as complete.
4. Complete the staging manual checks in sections F and G, including browser accessibility with real assistive technology.
5. Finish `ASSET_LICENSES.md` provenance/release review; replace only assets confirmed to lack permission after an appropriate replacement is available.
6. Verify provider backup retention/restoration and operational incident response before making security claims or publishing proposed retention periods.

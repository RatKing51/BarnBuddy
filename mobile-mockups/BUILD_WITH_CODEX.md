# Build the BarnBuddy mobile redesign

Paste the section below into Codex with the BarnBuddy repository open and this ZIP extracted into your workspace. Include `SCREEN_MAP.json` with the mockups so Codex can find both themes for each feature. Light PNGs are in `PNG/` and dark PNGs are in `PNG/Dark/`. The PDF is a visual index. SVGs provide geometry, type sizes and contents for precise comparisons.

## Prompt for Codex

Implement the mobile BarnBuddy redesign in the existing `RatKing51/BarnBuddy` codebase. This is a responsive web/PWA redesign of the customer experience, public site, advisor tools and admin mobile layouts. Keep the existing API, Clerk sign-in and billing, React Router URLs, deep links, authorization, subscriptions and role checks, public content and SEO metadata. Preserve desktop features and layout unless a narrowly scoped shared fix is needed.

### Map the repository before changing it

1. Read any applicable `AGENTS.md`, then `DESIGN.md` and `PRODUCT.md`. Check local changes and build on them.
2. Read `SCREEN_MAP.json`. Review its screen IDs, source component paths, existing URL patterns and interaction notes. Use `ROUTE_COVERAGE.csv` to check the entire router. The mockups were based on the main tree at `438127a0b1de19e4e17005dfac1c070d9d21566d`. Reconcile any differences against the checkout you are actually editing.
3. Read both `PNG/<screen-id>.png` and `PNG/Dark/<screen-id>.png`, or the matching SVGs, before implementing each surface. All example names, dates, quantities, dollar amounts, account details, statuses and activity counts are mock data. On actual screens render data and wording from the current application. The mockups show the initial mobile viewport. Retain all existing fields, controls and below-the-fold content, even where a frame depicts only the frequent items.
4. Treat source files and current contracts as authoritative for feature gating, wording, payment flows, legal content, role membership, provider-managed authentication and data fields. `kind: "proposed UI"` denotes a new presentation or step for an existing capability. It is not a new product or persistence contract.

### Mobile shell and hierarchy

- Build the signed-in shell first. Use **Home, Animals, Add, Care, More**. Home uses **Today** as the visible heading and keeps the current Farm Overview. Place care priorities first, then the Add action and compact herd shortcuts. Animals is the searchable directory. Add opens the record type sheet. Care surfaces existing care information and links to the relevant record. More exposes existing secondary tools, help and settings.
- Reuse the current herd scope and `herd` query, including default and Unassigned. Do not imply a farm-wide view from a single herd fetch. Directory search and filters should survive a trip into an animal profile and back. Profile tabs stay predictable. Use existing `record=weight|health|vet|reproduction|finance` handling and `view=feed|herd-finance|bulk-entry|inventory` for herd tools. Keep direct links opening the intended view. Treat Add, Care, More and in-view sheets as UI states unless a route change is intentionally approved.
- Use the reference 390 × 844 layout as a baseline for relative hierarchy. Start with 24 px horizontal insets and an 8 px spacing rhythm. Keep a 44 × 44 CSS px minimum for frequent touch targets, 14–17 px regular UI copy, clear visible labels, 10–15 px control radii and restrained borders. Let long content scroll. The simulated 9:41, network/battery icons and home-indicator bar in the mockups represent device chrome. Use browser/PWA safe area insets for the real UI.
- Use BarnBuddy’s real wordmark and semantic design tokens. Reference colors are action blue `#3851DB`, text `#171C2C`, subtle surface `#F7F8FC`, border `#E4E8F0`, due-state fill `#FFF0D7`, due-state text `#824509`. Match typography from the frames with the approved product font or Inter where appropriate. Every screen has a matching dark frame and shares the same layout, fields, action order and responsive behavior. Use theme-specific semantic colors in one component tree. Read the existing `bb-light` and `bb-dark` classes and persist the current Dark/Light preference through the existing settings flow. Preserve comfortable/compact density.
- Use the existing BarnBuddy dark roles from `client/src/index.css`, `client/src/styles/livestock.css`, and `client/src/styles/admin.css`. The dark mockups use charcoal for livestock, navy for the public site, and slate for admin. Apply the matching dark values to input fields, overlays, navigation, charts, status chips, placeholder states, links and focus rings. Keep text, icons and control edges legible against their actual surfaces. Treat public and signed-out mockups as design references and honor the existing theme scope on those routes.
- Use a compact separate header and grouped navigation for admin, with clear state-specific controls. Keep public navigation on the public site. Keep advisor navigation within its authorized workspace. Avoid routing users back to the wrong shell after a provider redirect.
- Preserve public page structure, copy, approved screenshots and founder images, news/review feed fallbacks, anchor links, sitemap/canonical tags and structured data. Keep documentation as its existing separate site. Keep the eight policy types and legacy hash redirect. The policy frames only preview existing copy layouts.

### Build and validate the record flows

| Flow | Start with these screen IDs | Required behavior |
| --- | --- | --- |
| Weigh-in | `add-menu`, `record-animal-picker`, `weight-form`, `weight` | Prefill a known animal. Preserve units, date and notes. Update the profile’s latest weight and history when a save succeeds. |
| Care | `care`, `health`, `vaccinations`, `vaccination-form`, `vet`, `vet-form` | Keep current care window, filters, next dates and treatment eligibility. Deep link into the relevant record and distinguish a logged dose from an upcoming reminder. |
| Animal and herd | `animals`, `animal`, `animal-edit`, `animal-qr`, `herd-list`, `herd-delete` | Preserve photo and QR tag flows, status choices, deletion semantics, authorized links and Unassigned after herd deletion. |
| Bulk and inventory | `bulk`, `bulk-review`, `inventory`, `inventory-form` | Confirm selected animals and supported inventory use. Reuse current atomic writes and stock checks. Preserve input on failure and reconcile uncertain save outcomes before retry. |
| Import | `import`, `import-upload`, `import-ai`, `import-review`, `import-confirm`, `import-result` | Separate draft/extraction from confirmed import. Keep supported file types and limits, disclosure, corrections, validation, duplicate handling and true result counts. |
| FFA and advisor | `ffa-list`, `ffa-overview`, `ffa-journal`, `ffa-finance`, `ffa-share`, `advisor-project` | Link records without duplication. Existing sharing controls and advisor access are authoritative. Advisors can read only what has been shared with them. Keep chapter entitlements and printing. |
| Billing and settings | `account`, `preferences`, `billing`, `chapter-membership` | Preserve real Clerk flows, current plan origin, case handling for expired/retained access, emails and preferences. Keep account deletion distinct from subscription management. |
| Admin | `admin-overview`, `admin-nav`, `admin-news`, `admin-chapters`, `admin-support`, `admin-accounts` | Cover all 15 current sections and preserve role checks, side effects, audit activity, drafts and explicit publish/destructive confirmations. |

### Implementation sequence

1. Establish shared mobile spacing, buttons, fields, list rows, modal/sheet behavior, theme, and navigation. Wire Home, Animals, animal profile, Add and Care to existing data paths.
2. Implement the core care, animal, herd and import workflows, followed by Premium herd/animal tools, reports, FFA and advisor surfaces.
3. Apply settings, authentication entry, onboarding, public layouts and mobile admin changes. For repeated surfaces, reuse the appropriate design pattern and existing behavior.
4. Run repo checks and review real app screenshots at 320, 390, 430 and tablet widths, then verify existing desktop layouts. Use a local/dev test account with sample data. Keep auth, billing, advisor and admin role gates active. Review both theme choices with Free, Premium, chapter access, advisor, and admin roles where relevant. Verify that theme changes preserve the current route, form inputs and navigation state.
5. Use real mobile browser checks for scroll, keyboard, focus restoration, back behavior, form errors, loading/empty states and bottom safe areas. Confirm no horizontal page overflow with long real labels. Test disabled and pending submit behavior, error recovery, safe retries, direct URLs, desktop navigation and print exports. Resolve issues before claiming a screen is done.

At the end, summarize implemented screens by route/component and screen ID. Report what was verified and what remains, with evidence for any intentional divergence from the design. Keep incomplete items visible in the route coverage summary. Stop before any production deployment.

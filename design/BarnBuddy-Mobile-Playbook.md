# BarnBuddy mobile playbook

Research and implementation brief for Codex · November 22, 2026

## What a good barn visit should feel like

A student has a pig on the scale and one hand free. They open Animals, type the tag, tap the pig, and tap **Log weight**. The form already identifies the animal, herd, date and unit. They enter the number, save, and see the new weight in history. Back returns to the same filtered list so they can weigh the next pig. Design this journey first. It exercises navigation, context, input, persistence and recovery in one small slice.

## What exists today

This is a source review of the current checkout. Device behavior, task times and usability outcomes still need measurement. Start from these specific entry points.

| Evidence | Implementation consequence |
|---|---|
| `client/src/pages/Dashboard.jsx` renders Home, Animals, Feed, Money and More in farm navigation. The bottom bar disappears inside an animal. The profile then has four primary record tabs plus More. | Test whether users can tell farm navigation from animal navigation. Put farm destinations in one consistent place and keep animal actions beside the animal name. |
| `AnimalDirectory.jsx` already searches name, tag and species, supports a status filter, and honors the preferred identifier. Dashboard already has animal shortcuts, herd controls and a care summary. | Reuse search, permissions, preferences and existing links. On a small display give the search results precedence over shortcuts and stats. |
| `client/public/manifest.webmanifest` supports standalone display but starts at the public homepage. `sw.js` caches the shell and static assets, skips API requests and ignores writes. | Test an installed launch into the dashboard with sign-in return. Treat record submissions as online operations until reliable offline entry is separately built and tested. |
| `client/playwright.config.mjs` includes a development Clerk setup, free/premium walkthroughs and narrow Firefox viewports. | Extend the signed-in suite. Narrow-window tests establish layout coverage. Keyboard, touch, camera, downloads and installed launches also need platform checks. |

## Three apps worth studying

| Reference | What to borrow | BarnBuddy application |
|---|---|---|
| **Sortly** · [mobile quick actions](https://help.sortly.com/quick-actions-on-the-sortly-mobile-app) and [item editing](https://help.sortly.com/sb/editing-an-item) | Identify an item, then perform a small, specific update. | Closest model for Animals and Inventory. Put name/tag first, one useful status beside it, and the frequent action within the detail view. A feed adjustment should show the item, quantity and unit together. Barcode scanning is optional future work. |
| **Todoist** · [Quick Add](https://www.todoist.com/help/todoist/features/use-task-quick-add-in-todoist-va4Lhpzz) | A short capture flow with extra attributes available when needed. | Open Log weight directly from the animal. Present the weight and unit first, prefill the date, and leave notes optional. Use a small chooser only when the user has not already selected the record type. |
| **Apple Health** · [summaries and measurement details](https://support.apple.com/en-gb/guide/iphone/iphe3d379c32/27/ios/27) | Lead with a useful measurement, then let the reader inspect trends, history or add data. | Animal weight opens with the latest dated reading and unit. Follow with the trend and a readable history. One weigh-in still makes a useful screen. A herd-level average cannot stand in for an individual animal's reading. |

## Proposed mobile layout

Test three labeled bottom destinations, **Home · Animals · Farm tools**. Home answers “What needs my attention?” Animals answers “Which animal am I working with?” Farm tools contains labeled rows for Feed, Money, Inventory, Bulk entry and eligible FFA or advisor work. Settings and help live under the account control. Put the selected herd in the header wherever it scopes the data. If users repeatedly hunt for Feed, measure a fourth direct Feed destination before settling the bar. Three to five peer destinations is consistent with [Android navigation guidance](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns).

| Surface | First screen | After a tap |
|---|---|---|
| Home | Herd selector, due or overdue care, recent animals, and a clear first-animal action for an empty herd. | A care row opens the correct animal and record section. Distinguish “no care due,” “checking,” and “couldn’t load.” |
| Animals | Search, visible active filters, count and compact rows. Respect tag-first preferences. Show species and one actionable status. Allow names and tags to wrap. | Open a profile. Restore herd, query, filters, scroll and focus on return. An empty search offers Clear filters. |
| Animal | Name/tag, herd, status and **Log record**. Offer direct Log weight on the weight screen. Keep a plainly labeled section list for General, Weight, Health, Vet, Reproduction and Money. | Open one section at a time. Keep Animals selected in top-level navigation. Hide the bottom bar during focused editing if it competes with Save or the keyboard. |
| Farm tools | Group operating tools and chapter/project tools under familiar names. Surface membership and feature access using existing rules. | A tool opens with its scope attached, e.g. Money for North Pasture. Returning restores the tool list. |

Use the existing navy, accent, typography and animal photos. Favor divider-separated rows over a card for every field. Use a short bottom sheet for bounded choices such as record type. Give long forms, file previews and multi-step edits a full screen with a title, Back and a clearly named submit button. Preserve URLs, browser Back/Forward, refresh and sign-in return. Make the phone route usable in a browser tab and from a home-screen icon.

## Feature coverage and acceptance

For each row, inventory all existing buttons, menu actions, route/query variants, entitlement checks and supported mutations. Record the mobile entry point and a passing scenario for each. Include archived, empty and older records. Resolve discrepancies against live code before implementation.

| Workflow | Phone interaction and proof |
|---|---|
| Signup, login, onboarding, invitations | Follow a protected animal link through login. Resume at the intended destination. Complete setup and add the first animal. Test invitation completion separately. |
| Herds and directory | Create/edit a herd, switch herds, search by tag and filter by status. Navigate back from a result. Check a small show herd and a long mixed-species list. |
| Animal identity and lifecycle | Add, edit, upload/crop a photo, view the QR tag, and exercise available move, archive and delete actions on disposable data. Destructive confirmation identifies the animal. A canceled action preserves it. |
| Weight | Save a fractional reading in the chosen unit. Reload, verify once in history, edit and delete. Give the chart an equivalent list with dates and units. Test the numeric keyboard on both platforms. |
| Health, vaccinations, vet visits | Log each supported record type. Open a due vaccination from Home. Confirm animal, date and next due value after save. A failed load offers retry and never reads as all-clear. |
| Reproduction and animal finances | Enter dated events and individual ledger entries. Show animal identity, currency and dates while editing. Verify premium and free access using actual entitlement rules. |
| Feed, herd finances and inventory | Use stacked rows with quantity, units or currency visible. Open one row for editing. Verify saved balances or totals after refresh and distinguish herd totals from animal amounts. |
| Bulk entry and batch changes | Select animals with checkboxes, show selected count and herd, review targets and submit once. Verify exactly the selected animals changed. Report partial failures accurately if the API permits them. |
| Import and export | Open the actual import route in Settings. Choose a supported file from the phone, review mapping/errors and inspect results. Export a real report and open it in Files/downloads. Identify skipped sections in the result. |
| FFA projects and sharing | Open a project, link an animal, enter activity hours and income/expense, review totals, generate the report and change sharing. Unlinking an animal preserves its profile. Verify the advisor view after revocation. |
| Advisor and admin | Exercise chapter roster, invites, shared projects and role-specific controls. Inventory every admin section including news, chapter and support tools. Use compact list → detail screens for dense tables. Test permitted roles and denied routes. |
| Settings, billing, help and public routes | Change herd/account preferences, theme, density and reminders. Test permitted billing actions in test mode, including return/cancel. Verify mobile menus, news, pricing, contact, docs, policies and deep links. |

## Implementation order for Codex

| Slice | Work | Exit evidence |
|---|---|---|
| 0 · Baseline | Read PRODUCT.md, DESIGN.md, current diffs, App.jsx, Dashboard.jsx, relevant components and tests. Capture signed-in baseline screenshots and route/action inventory. Record current taps, time and errors for finding an animal, logging weight and opening due care. | Baseline by device, role and task. Label inspected, emulated and physically verified results separately. |
| 1 · One complete journey | Prototype the three-destination shell and implement Animals → profile → Log weight → saved history → back to results. Reuse existing record APIs, URL state and form logic. | Weigh two animals consecutively. Reload confirms each reading once, attached to the right animal. Existing desktop flow passes. |
| 2 · Daily care | Adapt Home, animal sections, due-care links, herd switching, photos and QR display. Apply the working form pattern to Health and Vet. | A user opens a due item, updates it, and sees the refreshed care state. Slow or failed requests preserve input and identity. |
| 3 · Full feature parity | Complete the coverage table. Prioritize feed, inventory and bulk entry, then FFA/advisor, import/export, settings, billing, admin and public surfaces. Extend shared components only when two workflows actually need the same behavior. | Every audited action has an entry point, role and result. No desktop-only action is silently hidden. |
| 4 · Installed experience | Review manifest start URL, icon appearance, sign-in return, orientation and service worker update behavior. Test online, unavailable network, reconnect and expired session. | Home-screen launch lands in the intended workspace. A failed submission stays visibly unsaved. Refresh or resume never silently submits twice. |

### Skills already in this repository

Codex can read each named skill under `.agents/skills/<name>/SKILL.md`. No additional downloads are needed for this plan.

| When | Skills to use | Required output |
|---|---|---|
| Before changing navigation | `navigation-patterns`, `responsive-design` | Map existing URLs and actions to phone destinations; identify the breakpoint where content actually stops fitting. |
| Building a record workflow | `form-design`, `error-handling-ux` | Field order, initial values, keyboard type, validation, busy state, failure and retry behavior. |
| Checking a slice | `playwright`, `accessibility-test-plan` | Signed-in interaction evidence, keyboard and screen-reader checks, plus failures with reproduction steps. |
| Evaluating the design | `usability-test-plan` | Short observation script, baseline comparison and a prioritized list of changes backed by observed friction. |

## Release checks

- Run the existing client build and browser scripts. For the protected dashboard, use the repository’s development Clerk setup and disposable fixtures with `BARNBUDDY_SIGNED_IN=1`. Extend the existing tests for the redesigned journey; replace superseded layout assertions with checks for action reachability, data integrity and return behavior. Report blocked cases explicitly.
- Cover 320 CSS px for reflow, plus 360, 390, 430, a tablet width and existing desktop. Add mobile WebKit and Chromium device projects alongside Firefox. Use a real iPhone in Safari and a real Android phone in Chrome for keyboards, back gestures, camera/library picker, downloads, home-screen launch and resume. See [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) and [Playwright device emulation](https://playwright.dev/docs/emulation).
- Use 48 CSS px as the project target for frequently tapped controls. Confirm visible labels, touch alternatives to gestures, keyboard focus, focus return after dialogs, inline errors and screen-reader announcements. Check VoiceOver and TalkBack, large text, dark theme, reduced motion and 200% zoom. No clipped save button, covered final row or page-wide sideways scroll. Sticky controls must clear the keyboard and safe areas.
- Test slow initial load, rapid herd switching, failed save, repeated taps, dropped response after submit and retry. Preserve unsaved input in the active form. For uncertain outcomes, reconcile with the server before retrying. Add server-supported idempotency if needed for a retriable create. Keep sensitive drafts out of shared persistent storage by default.
- Measure initial load and time until the directory responds on a throttled connection against the baseline. Use thumbnail sizes appropriate to the rows; defer charts, full photos and export code until needed if profiling identifies them as costs.
- Pilot with five representative users, including a first-time livestock exhibitor and a multi-animal owner. Give them an animal tag and a weight; ask them to record it, find a due vaccination, adjust inventory and locate a less frequent tool. Avoid naming buttons. Proposed goals: at least four of five finish each task unassisted, zero wrong-animal saves, and a repeat weigh-in takes at most 20 seconds after opening the profile. Record friction and repeat after fixes. These are targets to validate.

## Later decision for iOS and Android

Finish the mobile web journey first. Then prototype the **same** signed-in weigh-in on both platforms, including photo selection, deep link return, keyboard, resume and network loss. Use real phone results to choose:

| Option | When it fits BarnBuddy | What to prove |
|---|---|---|
| Installed web app | Home-screen access and browser capabilities cover the observed needs. Lowest ongoing maintenance. | Users can install, return to their farm, complete daily tasks and recover from connection failure. |
| Capacitor with bundled app assets | The mobile-first React screens already feel right and a specific native integration adds value. This is the first native prototype I would try. | Validate auth redirects, camera/files, native back, safe areas and upgrades. Demonstrate meaningful farm utility. [Capacitor documentation](https://capacitorjs.com/docs) |
| Expo / React Native | Device trials show persistent problems with web-rendered controls or a need for a substantially different offline or navigation experience. | Build a native screen using the same API and validation contracts. Compare effort and task performance, including the cost of maintaining two UIs. [Expo documentation](https://docs.expo.dev/) |

Before a store release, review current store requirements for sign-in, privacy, subscriptions and account management. Apple explicitly evaluates whether the app offers sufficient functionality beyond a repackaged site. A field-ready workflow such as queued offline weigh-ins would need account-scoped storage, visible pending status, durable retries, duplicate prevention and conflict handling before it could be promised. [Apple App Review Guidelines, section 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)

## Paste into Codex

> Read design/BarnBuddy-Mobile-Playbook.md, PRODUCT.md and DESIGN.md. Implement slices 0 and 1 in the current checkout. Start with the protected development dashboard and establish the existing mobile and desktop baseline. Map all current destinations and actions before changing navigation. Use the repository skills identified for each step. Deliver the working Animals → Log weight → saved history journey, including restored list state, failed saves and duplicate-submit handling. Reuse the existing API, entitlement rules, theme and routing. Keep desktop workflows working. Run the applicable builds and tests, then report changed files, baseline versus result, device/browser coverage, and outstanding checks. Only claim real-device verification when you performed it. Use the remaining slices and coverage table as the backlog for subsequent passes.

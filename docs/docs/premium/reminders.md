---
title: Automatic Reminders
---

# Automatic Reminders

Automatic reminders help surface upcoming care work.

## Reminder Sources

Reminders can come from:

- Vaccination next due dates
- Vet visit dates
- Vet follow-up dates
- Reproduction due dates and pregnancy checks
- Feed next purchase dates

## Account Settings

Premium users can preview reminder items and send reminder emails from Account Settings when the feature is enabled.

Automatic email delivery also depends on email being enabled on the BarnBuddy server.

## Premium Expiration Notices

BarnBuddy sends account notices when time-limited Premium access has 7, 3, and 1 day remaining. This includes Premium granted for a fixed duration by an administrator and a paid Clerk subscription that was canceled but remains active through the end of its billing period.

Clerk sends its own free-trial-ending email three days before a Clerk Billing trial ends, so BarnBuddy shows the trial countdown without sending a duplicate notice.

The reminder worker should run at least once per day:

```bash
npm run reminders:send
```

Set `PREMIUM_EXPIRY_REMINDER_DAYS` to a comma-separated list such as `7,3,1` to change the notification windows.

## Care Window

The care window controls how many days ahead BarnBuddy looks when building care summaries.

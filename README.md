# ClassRelay v2.2.0

ClassRelay is a local-first admin web app for reconciling Google Form recording requests with bank CSV deposits and sending recording URLs through the user's own Gmail account.

## v2.2.0 direction
The app uses one browser IndexedDB, but every applicant and operational history record is linked to a stable `courseId`. Selecting a course opens a course-specific history view for applicant lookup, payment status, delivery history, resend/CS verification, and activity logs.

Synchronization is incremental and non-destructive: Google Form re-sync does not reset existing payment or delivery history, and later CSV imports append only new bank transactions.

Auto matching is deliberately conservative: normalized payer name, exact amount, date eligibility, and a unique 1:1 candidate are all required. Similar names are review suggestions only.

See `User manual.md`, `DESIGN-SYSTEM.md`, and `/guide` for usage details.

# ClassRelay v2.3.0

ClassRelay is a local-first admin web app for reconciling Google Form recording requests with bank CSV deposits and sending recording URLs through the user's own Gmail account.

## v2.3.0 direction
The app keeps one browser IndexedDB and links every application, payment match, delivery event, and CS log to a stable `courseId`. Each Google Form response is preserved as an independent application record with its own request number, even when the same customer submits the same course again.

Course history is now the primary CS workspace: search a name/email/request number, inspect the selected request, review send/resend history and Gmail message IDs, write a request-specific CS note, switch among the same customer's repeated applications, and resend without leaving the course screen.

Synchronization remains incremental and non-destructive. Re-syncing the Form updates source fields for the same response ID but never clears payment state, matched payment, delivery state, send count, send timestamp, message ID, request number, or CS note. Importing another bank CSV appends only new transactions and immediately re-runs conservative matching.

Auto matching requires normalized payer name exact match, exact amount, eligible payment date, and a unique 1:1 candidate. Similar names are suggestions only.

See `User manual.md`, `DESIGN-SYSTEM.md`, and `/guide` for usage details.

# ClassRelay v2.3.2 Context Notes

## Product model
- Local-first browser app. No central DB and no ClassRelay login.
- Users bring their own Google OAuth Web Client, Google Form, Gmail, bank CSV.
- One physical IndexedDB is used for reliability; operational data is logically partitioned by `courseId`.

## v2.3.2 requirements
- Course-first history: selecting a course shows that course's applicants, matched payments, delivery state and activity history for CS.
- Google Form sync must be non-destructive. Existing payment/delivery/send history must survive re-sync.
- Bank CSV import is additive and deduplicated. Existing matches/history must survive later CSV imports.
- CSV import runs matching immediately; no matching preview/confirmation step.
- Auto-confirm only when normalized payer name + exact amount + date eligibility form a unique 1:1 pair.
- Default date eligibility: payment timestamp is no earlier than 1 day before form submission. Missing/unparseable payment dates are never auto-confirmed.
- Similar payer names may be shown as review suggestions only and must never auto-confirm.
- Courses with history should not be destructively deleted; archive/disable instead.

## Data invariants
- Operational fields (`paymentStatus`, `matchedPaymentId`, `deliveryStatus`, `sentAt`, `sendCount`, `lastMessageId`, notes) are never reset by Form sync.
- Existing payment rows are never cleared by CSV import.
- A matched payment and sent applicant are excluded from subsequent automatic matching.
- Activity logs are append-only during normal operation.

## v2.3.2 requirements
- Course history is the primary CS surface.
- Same-customer same-course submissions remain separate application/order-like records when response IDs differ.
- Request-level CS note, delivery history, message IDs, and resend action must remain available from the course history screen.
- Form sync and later CSV imports must remain append/merge operations, never destructive reset operations.


## v2.3.2 interaction requirements
- One-time setup state belongs in the top bar, not in permanent dashboard content.
- Dashboard summary counts must drill into the corresponding applicant filter.
- Payment and course-history metrics must filter their own underlying records where possible.
- Course-history filtering must keep the operator inside the same course CS workspace.
- Sample/demo data is a setup/guide affordance, not an operating-dashboard action.
- URL hash filter state should be preserved without clearing IndexedDB or operational history.

## v2.3.2 reliability invariants
- Form sync must immediately reconcile newly synced applicants with previously imported unmatched payments.
- A failed resend must not erase an earlier successful send.
- After payment confirmation, payer name and amount are historical reconciliation fields and are not silently overwritten by Form edits.
- OAuth access tokens are in-memory only and isolated by OAuth Client ID.
- Backup restore is intentionally destructive, therefore it requires confirmation; unlike Form sync/CSV import it replaces the local dataset.
- Demo records must not be mixed into an environment containing real operating records.

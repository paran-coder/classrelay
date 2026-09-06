# ClassRelay v2.2.0 Context Notes

## Product model
- Local-first browser app. No central DB and no ClassRelay login.
- Users bring their own Google OAuth Web Client, Google Form, Gmail, bank CSV.
- One physical IndexedDB is used for reliability; operational data is logically partitioned by `courseId`.

## v2.2.0 requirements
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

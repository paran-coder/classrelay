# ClassRelay v2.3.2

ClassRelay is a local-first admin web app for reconciling Google Form recording requests with bank CSV deposits and sending recording URLs through the user's own Gmail account.

## v2.3.2 direction

This patch focuses on operational safety after the v2.3.1 dashboard/drill-down redesign.

- The ClassRelay sidebar logo is now a dashboard/home link.
- Dashboard metrics are ordered by work priority: `확인 필요 → 발송 가능 → 입금 대기 → 발송 완료 → 전체 신청`.
- Google Form sync is still non-destructive, and now immediately runs matching against bank transactions already stored in IndexedDB.
- Gmail access-token cache entries are isolated by OAuth Client ID; changing/restoring a Client ID cannot reuse another client's cached token.
- A failed resend no longer erases the fact that a previous send succeeded. Last-attempt failure information is stored separately for CS.
- Once a payment is confirmed, payment-critical applicant fields (payer name and amount) are frozen across later Form re-syncs so reconciliation history does not silently change.
- Backup restore now requires explicit confirmation and is applied in one multi-store IndexedDB transaction.
- Demo data is blocked when real operating data exists, preventing accidental mixing.
- Gmail header values are sanitized against CR/LF header injection.
- Basic Vercel security headers were added.

## Matching invariant

Automatic matching requires all of the following:

1. normalized payer name exact match,
2. exact amount,
3. eligible payment date,
4. one unique applicant ↔ one unique payment candidate.

Similar names are review suggestions only and never auto-confirm.

## Data model

One physical IndexedDB is used. Courses, applications, payments, delivery history, and activity logs are linked by stable IDs such as `courseId` and Form response IDs. Form sync and CSV imports are incremental; they do not reset existing payment/send/CS history.

## Verification

- Node regression/static tests: 31/31 pass
- JavaScript syntax checks: pass
- Version/static asset checks: pass
- Actual Google OAuth, Google Forms, Gmail, and real-bank CSV end-to-end testing is still required on the deployed production URL before calling the product production-complete.

See `SELF-AUDIT.md`, `User manual.md`, `DESIGN-SYSTEM.md`, and `/guide` for details.

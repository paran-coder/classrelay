# ClassRelay v2.4.0

ClassRelay is a local-first admin web app for reconciling Google Form recording requests with bank CSV deposits and sending recording URLs through the user's own Gmail account.

## v2.4.0 direction

This version closes a practical CS gap while keeping the local-first, non-destructive data model.

- Dashboard KPI order: `전체 신청 → 입금확인 → 입금대기 → 확인필요 → 발송가능 → 발송완료`.
- Applicant list quick filters use the same operational sequence.
- CS can manually correct applicant **name, email, and course**.
- Manual corrections are local overrides and are not overwritten by later Google Form re-sync.
- Every correction writes a before/after activity log.
- If the course changes after a payment was linked, the linked payment follows the corrected `courseId`.
- Existing payment, delivery, resend, CS note, and request history remain non-destructive.

## Matching invariant

Automatic matching requires all of the following:

1. normalized payer name exact match,
2. exact amount,
3. eligible payment date,
4. one unique applicant ↔ one unique payment candidate.

Similar names are review suggestions only and never auto-confirm.

## Data model

One physical IndexedDB is used. Courses, applications, payments, delivery history, manual corrections, and activity logs are linked by stable IDs such as `courseId` and Form response IDs. Form sync and CSV imports are incremental and never reset historical payment/send/CS state.

## Verification

- Node regression/static tests: 35/35 pass
- JavaScript syntax checks: pass
- Version/static asset checks: pass
- Real Google OAuth, Google Forms, Gmail, and bank CSV end-to-end testing is still required on the deployed production URL.

## Deployment note

The currently connected GitHub account exposes writable existing repositories, but no `class-relay` repository exists yet and the available GitHub actions do not create repositories. The connected Vercel account likewise currently contains only the existing `subtitle-localizer` project. Create an empty `class-relay` GitHub repository (and import it into Vercel) before production deployment.

See `SELF-AUDIT.md`, `User manual.md`, `DESIGN-SYSTEM.md`, and `/guide`.

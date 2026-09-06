# ClassRelay v2.4.1 — Final Pre-Test Self Audit

## Scope
This audit was performed before connecting real Google Form, bank CSV, and Gmail data. Minor wording and non-operational display inconsistencies were corrected. Operational-risk findings were documented but intentionally not fixed without approval.

## Automated / static results
- Unit + static tests: **36/36 pass**
- JavaScript syntax check: **pass**
- Internal static links/assets: **0 broken references**
- Duplicate static HTML IDs: **0**
- User-facing `거래` terminology in app/guide/privacy: **0 occurrences**
- Version consistency for v2.4.1: **pass**
- Vercel baseline security-header checks: **pass**

## Data-preservation review
- Form re-sync preserves payment status, linked deposit, send state, send count, message ID, CS memo, request number: covered by tests.
- Manual name/email/course overrides survive Form re-sync: covered by tests.
- Additional CSV imports append only deposits that do not match the current fingerprint occurrence count; existing payment/send history is not cleared.
- Backup restore is explicitly destructive, is confirmed before execution, and runs as one multi-store IndexedDB transaction.

## Matching review
- Exact normalized payer + exact amount + date eligibility + unique 1:1 is the only automatic confirmation path.
- Similar names never auto-confirm.
- Duplicate exact applicants/payments require review.
- Unparseable deposit dates require review.
- **Open operational risks:** no upper date bound and raw-date fingerprint normalization. See `OPERATIONAL-RISKS.md`.

## Delivery review
- Only payment-confirmed applicants with valid email and course URL can be sent.
- Normal bulk send excludes already-sent applicants; resend is explicit.
- Failed resend preserves prior successful-delivery state.
- Gmail header newline injection is sanitized.
- **Open operational risks:** concurrent/ambiguous duplicate send and non-atomic cross-store state. See `OPERATIONAL-RISKS.md`.

## UI / accessibility review
- KPI drill-down filters are retained.
- Logo returns to dashboard.
- Focus-visible styles, Escape close behavior, mobile sidebar, responsive KPI grids, and table horizontal overflow handling are present.
- User-facing banking terminology is now deposit-centric.
- Headless Chromium rendering could not be completed reliably in the current container, so final visual browser QA remains part of the real deployment test.

## Readiness assessment
**Current score: 8.7 / 10**

Reasoning:
- Feature completeness and automated coverage are strong.
- Core history-preservation behavior is well tested.
- Several real operational edge cases could cause a wrong automatic payment match, duplicate/uncertain email send, or one-sided applicant/payment state. Those items should be resolved before declaring the product operationally ready.

## Gate before real-data testing
1. Review and approve/reject the risks in `OPERATIONAL-RISKS.md`.
2. Apply approved operational fixes and rerun regression tests.
3. Then deploy to Vercel and run end-to-end tests using a test Form, a controlled CSV, and a Gmail address owned by the tester.

# ClassRelay v2.5.0 Context Notes

## Product definition

ClassRelay is a local-first admin web app. The deployed website is a tool that each operator uses with their own Google Cloud OAuth Client ID, Google Form, Gmail account, bank CSV, and browser-local IndexedDB data. There is no central ClassRelay user database or global administrator.

## Version decision

v2.5.0 is a minor release because it changes core operational behavior and state models rather than only fixing presentation.

## User-approved v2.5.0 requirements

The user explicitly approved fixing all seven operational risks found in v2.4.1.

1. Automatic payment date window: default **1 day before application through 7 days after application**.
2. CSV duplicate detection: canonicalize payment date; prefer bank transaction/reference ID when available.
3. Gmail duplicate-send mitigation: pre-send state, ambiguous-delivery state, no automatic retry, cross-tab send lock.
4. Applicant/payment link writes must be atomic across IndexedDB stores.
5. Course change after payment confirmation or sending requires a dedicated warning/confirmation flow.
6. Inactive courses must not receive new Form auto-assignment.
7. High-risk writes must be coordinated across multiple tabs.

## Non-destructive invariants

- Different Form response IDs remain separate applications.
- Same response ID re-sync merges source data without resetting operational history.
- Manual overrides for name/email/course survive Form re-sync.
- CSV import is additive; it does not clear previous deposits or matching history.
- Delivery success history survives later resend failures.
- Ambiguous Gmail delivery is never automatically retried.
- Courses with history are preserved for CS.

## Payment matching invariant

Automatic confirmation requires:
- exact normalized payer-name match,
- exact amount,
- date within configured before/after window,
- exactly one eligible applicant candidate,
- exactly one eligible payment candidate.

Fuzzy name similarity is suggestion-only.

## UI terminology

User-facing bank terminology uses `입금`, `입금 내역`, and `입금일시`. Internal CSV aliases may still contain bank source headers such as `거래일시` because they are used only for compatibility detection.

## Testing constraint

Automated Node/static checks can run in this environment. A true browser smoke test was attempted, but localhost/file navigation in Chromium was blocked by the execution environment policy. Production-browser QA must therefore be performed after Vercel deployment.

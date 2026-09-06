# ClassRelay v2.4.0 — Self Audit

## Scope reviewed

- Google Form non-destructive sync
- CSV additive import and conservative matching
- course-level history / CS lookup
- Gmail send/resend state preservation
- backup/restore
- applicant manual correction
- dashboard KPI drill-down
- accessibility/static integrity

## Findings resolved in v2.4.0

1. Dashboard KPI order now matches the approved lifecycle: `전체 신청 → 입금확인 → 입금대기 → 확인필요 → 발송가능 → 발송완료`.
2. Applicant name/email/course can be corrected from CS without editing the original Form.
3. Manual corrections persist across Form re-sync through `manualOverrides`.
4. Every manual correction stores before/after values in the activity log.
5. A linked payment follows a manually corrected course via `courseId`.

## Automated verification

- Tests: **35/35 pass**
- `npm run check`: pass
- Sidebar brand home-link static check: pass
- Form re-sync → existing payment re-match check: pass
- OAuth token isolation check: pass
- Gmail header-injection sanitation check: pass
- Vercel security-header config check: pass
- v2.4.0 KPI order static check: pass
- applicant edit affordance static check: pass

## Remaining production verification

Static/unit tests cannot prove real external integration behavior. Before calling the product production-complete, verify on the final Vercel production origin:

1. create a user's own Google OAuth Web Client,
2. register the production origin,
3. connect a real Google Form,
4. sync existing and new responses,
5. import a real bank CSV,
6. verify exact/ambiguous/date matching behavior,
7. send one real Gmail message,
8. resend and inspect history,
9. manually correct an email and verify Form re-sync does not revert it,
10. export and restore a backup in a clean browser profile.

## Current evaluation

**9.1 / 10 for code-complete MVP readiness.**

The codebase is materially stronger than v2.3.2, but the score is intentionally below production-complete because the real Google/bank end-to-end path has not yet been run on the final production URL.

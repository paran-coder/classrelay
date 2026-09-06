# ClassRelay v2.5.1 — Master-detail Interaction Audit

## Result

**Code-level readiness score: 9.5 / 10**

v2.5.1 changes interaction, not the v2.5.0 payment/Gmail/history safety model. The course history and applicant list now behave as consistent master-detail workspaces.

## What changed

- Course history rows are selectable across the full row; the dedicated `CS 확인` button is removed.
- Applicant list uses the same row-selection → right detail panel pattern.
- Selected rows expose hover, focus, and selected states and can be activated with Enter/Space.
- Row-internal controls such as checkboxes do not trigger row selection.
- Search/filter changes keep the current selection when valid, otherwise the first valid result is selected automatically.
- The selected application ID is preserved in the URL query so rerenders after edits/sends can restore the same record.
- Applicant right panel exposes send/resend, applicant correction, full detail, CS memo, and recent activity.

## Verification

- Node regression/static tests: **56 / 56 pass**
- JavaScript syntax checks: **pass**
- Duplicate static DOM IDs: **0**
- Broken internal static references: **0**
- User-facing `CS 확인` button wording remaining in app/guide/manual: **0**
- v2.5.0 operational safety tests remain passing.

## Remaining integration gate

Actual Vercel/browser testing is still required for:

- pointer/keyboard feel in the deployed origin
- desktop/mobile master-detail width
- Google OAuth popup/consent
- real Form sync
- bank-specific CSV
- Gmail send/resend
- multi-tab coordination

There is no newly identified code-level operational risk from this interaction patch.

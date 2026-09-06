# CHANGELOG

## 2.4.1
- Final pre-test QA pass focused on terminology consistency and static/operational review.
- Standardized user-facing bank wording around `입금`, `입금 내역`, and `입금일시`; internal CSV header aliases such as `거래일시` remain supported for compatibility.
- Applicant list/dashboard course labels now resolve from the current `courseId`, preventing stale labels after a course rename.
- Added a regression test that rejects user-facing `거래` terminology in the app/guide/privacy surfaces.
- No operational-risk code changes are included without explicit approval.

# Changelog

## 2.4.0
- Reordered dashboard KPIs to the approved operational sequence: `전체 신청 → 입금확인 → 입금대기 → 확인필요 → 발송가능 → 발송완료`.
- Reordered applicant quick filters to the same sequence for consistency.
- Added manual applicant correction for name, email, and course from both applicant detail and course CS workspace.
- Manual applicant corrections persist as explicit local overrides and survive later Google Form re-sync.
- Every manual correction writes a before/after `신청정보 수정` activity log.
- When a manually corrected course changes for an applicant with a linked payment, the payment's `courseId` follows the corrected course.
- Expanded automated tests to 35.

## 2.3.2
- Made the ClassRelay sidebar logo link to the dashboard/home route.
- Reordered dashboard metrics around actual work priority and added `발송 가능` drill-down.
- Form sync now immediately re-runs conservative auto matching against already-imported bank transactions.
- Isolated in-memory Google OAuth tokens by OAuth Client ID.
- Preserved previous successful delivery state when a resend attempt fails; latest attempt error is stored separately for CS.
- Preserved payment-confirmed payer name and amount across later Form re-syncs.
- Made backup restore explicit/confirmable and atomic across IndexedDB stores.
- Cleared Google token state after backup restore and when switching OAuth Client IDs.
- Prevented sample data from being mixed into a browser that already contains real operating data.
- Sanitized Gmail header values against CR/LF header injection.
- Added basic Vercel response security headers.
- Expanded automated regression/static tests to 31.

## 2.3.0
- Added stable request numbers for each application.
- Defined repeated submissions as separate application records when Form response IDs differ.
- Added course-level CS workspace with inline send history, Gmail message IDs, CS notes, same-customer request switching, and resend action.
- Preserved request numbers and CS state during non-destructive Form re-sync.
- Expanded core tests for repeated-application identity and history preservation.

## 2.2.0
- Added courseId-based course history views for long-term CS lookup.
- Google Form sync now performs non-destructive merges and preserves payment/delivery/send history.
- CSV imports are additive, fingerprint-deduplicated, and immediately run matching.
- Auto-confirm now requires exact normalized payer name, exact amount, eligible transaction date, and unique 1:1 candidates.
- Added configurable pre-application payment window (default 1 day).
- Added similar-name review suggestions that never auto-confirm.
- Added manual linking of a suggested bank transaction to an applicant.
- Courses with applicant history can no longer be destructively deleted.
- Expanded regression tests from 7 to 11.


## 2.1.1

### Changed
- Added a ClassRelay-specific design system instead of treating the supplied reference tokens as a fixed specification.
- Compressed admin typography to a 28 / 20 / 16 / 15 / 12–14px operational hierarchy.
- Reduced KPI emphasis from 34px to 30px.
- Reduced guide typography from marketing-scale display sizes to 36 / 26 / 18px.
- Tightened desktop content padding, card padding, grid gaps, table rows, form gaps, and guide section spacing.
- Raised remaining 11px UI labels/meta copy to 12px for readability.
- Preserved neutral surfaces and rounded/pill geometry as reference-inspired qualities.
- Preserved semantic success/warning/danger colors as product-specific operational requirements.

### QA
- Core logic tests 7/7 pass.
- JavaScript syntax checks pass.
- Version/reference scan passes.

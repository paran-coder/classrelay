# Changelog

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

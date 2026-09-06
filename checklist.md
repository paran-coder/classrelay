# ClassRelay v2.3.1 Checklist

- [x] Preserve required project docs before implementation
- [x] Add courseId-based logical partitioning and migration
- [x] Add course history/detail screen for CS
- [x] Make Form sync non-destructive merge
- [x] Keep CSV imports additive and improve deduplication
- [x] Auto-run matching immediately after CSV import
- [x] Add date eligibility to exact matching
- [x] Add fuzzy payer-name suggestions without auto-confirm
- [x] Add suggested payment manual-link UI
- [x] Protect courses with historical records from deletion
- [x] Update backup schema/version safely
- [x] Add/expand regression tests
- [x] Run JS syntax checks and tests
- [x] Update README / User manual / CHANGELOG

## v2.3.1 CS / repeated applications
- [x] Stable request number per application
- [x] Different Form response IDs remain separate records
- [x] Same customer repeated applications grouped visually, not merged
- [x] Course history CS inspector
- [x] Request-level CS note
- [x] Send/resend history + Gmail message ID visibility
- [x] Inline resend from course history
- [x] Form re-sync preserves request-level operational state
- [x] Core tests expanded to 15


## v2.3.1 KPI drill-down / dashboard density
- [x] Remove persistent dashboard setup-status column
- [x] Remove duplicate dashboard review card
- [x] Move setup readiness beside setup guide as compact popover
- [x] Remove sample-data action from dashboard
- [x] Keep sample data in Settings and document it in Guide
- [x] Dashboard metrics drill into Applicants filters
- [x] Add Applicants `입금확인` filter
- [x] Payment metrics filter transaction table in place
- [x] Course-history metrics filter application table in place
- [x] Course-list counts drill into course history
- [x] Preserve filter state in hash URL
- [x] Add keyboard/focus/aria-pressed states
- [x] Expand core tests to 18

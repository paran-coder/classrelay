# ClassRelay v2.3.1

ClassRelay is a local-first admin web app for reconciling Google Form recording requests with bank CSV deposits and sending recording URLs through the user's own Gmail account.

## v2.3.1 direction

Operational screens now use **metric → drill-down** as a core navigation pattern. Dashboard, payment, and course-history KPI cards are actionable: selecting a count opens or filters the underlying records rather than leaving the number as decoration. Applicant and payment filters are represented in the hash URL so the current view is recoverable.

The dashboard no longer reserves permanent space for one-time onboarding cards. Setup readiness is compressed into the top bar next to the setup guide, where OAuth, Form mapping, course registration, and recent backup status can be inspected from a compact popover. Sample data is available only from Settings and the Guide.

Course history remains the primary CS workspace. Each Google Form response is preserved as an independent application with its own request number, while same-customer records are grouped only for navigation. Form re-sync and later CSV imports remain incremental and non-destructive.

Auto matching requires normalized payer name exact match, exact amount, eligible payment date, and a unique 1:1 candidate. Similar names are suggestions only.

See `User manual.md`, `DESIGN-SYSTEM.md`, and `/guide` for usage details.

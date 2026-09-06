# ClassRelay v2.3.2 UI Review

## Review basis

This revision uses the supplied Frontend Forge workflow as the primary UI quality framework and treats the supplied Mobbin design tokens as visual reference material, not as a template to reproduce.

## Main issue found in v2.1.0

The previous revision borrowed the Mobbin typography scale too literally. That created a marketing-style hierarchy inside an operational admin tool: page and guide titles were visually oversized while supporting copy remained small. The resulting jumps made the interface feel less dense and less task-oriented than ClassRelay needs.

## Direction for v2.3.2

ClassRelay now has its own typography and density system:

- app page title: 28px
- KPI value: 30px
- section title: 20px
- card title: 16px
- body: 15px
- table/supporting text: 14px
- meta/labels: 12–13px
- guide hero: 36px desktop / 32px mobile
- guide section title: 26px
- guide step title: 18px

Hierarchy is now carried by a combination of weight, muted color, grouping, and spacing rather than by large font-size jumps.

## Density changes

- desktop content padding reduced from 32px to 24px
- page header bottom spacing reduced to 20px
- card padding reduced to 18–20px range
- card headers tightened
- KPI cards reduced to ~108px minimum height
- table rows reduced to 11px vertical padding
- form/grid gaps reduced to ~14px
- guide sections reduced from 64px to 48px

## What remains from the Mobbin reference

Useful reference qualities retained:

- neutral tint ladder rather than heavy shadows
- restrained black/white application chrome
- rounded cards and fields
- pill controls where appropriate
- Inter as a practical font substitute

Not copied:

- marketing-scale 56–80px display type
- very large editorial section spacing
- absence of operational semantic colors
- a one-size-fits-all component scale

## Product-specific exceptions

ClassRelay retains restrained success, warning, and danger colors because payment state, ambiguous matching, failed delivery, and destructive actions must be distinguishable quickly. Status is also communicated with text, not color alone.

## Accessibility / interaction checks

- primary interactive targets remain about 44px where practical
- visible `:focus-visible` retained
- keyboard Escape handling retained for menus/modals
- reduced-motion CSS retained
- status labels remain textual
- minimum UI meta size raised to 12px

## QA status

- regression/static tests: 31/31 pass
- JavaScript syntax check: pass
- version/reference scan: pass
- typography scale scan: no app display typography above the defined hierarchy

A final visual QA pass should still be performed on the actual Vercel production URL because browser font rendering, viewport behavior, OAuth prompts, and real table data cannot be fully judged from static source inspection alone.


## v2.3.2 operational additions
Course history, payment candidates, and delivery metadata reuse the compact ClassRelay hierarchy. New controls were added without increasing global heading scale or returning to marketing-style spacing.


## v2.3.2 CS review
The course history now uses a master-detail layout: a dense request table on the left and a sticky CS inspector on the right. This reduces modal hopping for the common support task of searching a customer, checking send history, and resending. Repeated applications remain individually identifiable through stable request numbers.


## v2.3.2 dashboard and drill-down review

The supplied screenshot showed a persistent setup-status column duplicating information already represented by the top bar and KPI counts. v2.3.2 removes that permanent right column and gives the recent-applications table the full content width.

Changes:
- setup status moved to a compact top-bar popover to the left of the setup guide
- dashboard sample-data action removed; sample mode remains in Settings and is documented in the Guide
- dashboard KPI cards navigate to filtered applicant lists
- payment KPI cards filter bank transactions in place
- course-history KPI cards filter the current course table in place without leaving the CS workspace
- course-list application/send counts link directly to the relevant course history filters
- active metric filters expose pressed state and keyboard focus

This follows the operational-dashboard principle that summary information should support action rather than occupy space as static duplication.

## v2.3.2 final audit note

The left sidebar ClassRelay brand now acts as a clear home affordance and returns to `#dashboard`. The dashboard metric order was also changed so operational exceptions and send-ready work appear before passive totals. This better matches the stated page job: show what needs action first.

Static review is complete, but visual completion still depends on production-browser inspection because real OAuth dialogs, real CSV column widths, and mobile master-detail behavior cannot be fully validated from source alone.

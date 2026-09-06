# ClassRelay v2.1.1 UI Review

## Review basis

This revision uses the supplied Frontend Forge workflow as the primary UI quality framework and treats the supplied Mobbin design tokens as visual reference material, not as a template to reproduce.

## Main issue found in v2.1.0

The previous revision borrowed the Mobbin typography scale too literally. That created a marketing-style hierarchy inside an operational admin tool: page and guide titles were visually oversized while supporting copy remained small. The resulting jumps made the interface feel less dense and less task-oriented than ClassRelay needs.

## Direction for v2.1.1

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

- core logic tests: 7/7 pass
- JavaScript syntax check: pass
- version/reference scan: pass
- typography scale scan: no app display typography above the defined hierarchy

A final visual QA pass should still be performed on the actual Vercel production URL because browser font rendering, viewport behavior, OAuth prompts, and real table data cannot be fully judged from static source inspection alone.

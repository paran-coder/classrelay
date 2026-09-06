# ClassRelay Design System — v2.2.0

## 1. Design thesis

ClassRelay is an operational tool, not a marketing site. The interface should feel calm, compact, and trustworthy while making exceptions and next actions easy to scan.

- **Mood:** quiet operations desk
- **Density:** standard-to-compact on app screens, relaxed on guides
- **Hierarchy:** use modest size steps; rely on weight, color, grouping, and spacing before dramatic font-size changes
- **Chrome:** neutral canvas, restrained borders/tints, minimal shadow
- **Signature:** relay/status information is surfaced through clear state chips and action grouping rather than decorative color

The supplied Mobbin tokens are a reference for restraint, geometry, and neutral surfaces — not a fixed visual specification.

## 2. Typography

### App surfaces

| Role | Size | Weight | Line height | Use |
|---|---:|---:|---:|---|
| Page title | 28px | 700 | 1.2 | Main route heading |
| KPI / data emphasis | 30px | 650 | 1.1 | Dashboard values |
| Section title | 20px | 650 | 1.3 | Major grouped sections / modal titles |
| Card title | 16px | 600 | 1.35 | Cards, rows, compact panels |
| Body | 15px | 450 | 1.5 | Default UI copy |
| Body small | 14px | 450 | 1.5 | Tables, secondary descriptions |
| Meta / label | 12–13px | 500–600 | 1.45 | Labels, timestamps, field captions |

Rules:
- Never create hierarchy by size alone.
- Prefer `weight + muted color + spacing` before adding another type size.
- App titles should not exceed 28px in normal operational screens.
- KPI values should not visually overpower the task list below them.
- Avoid 2× jumps between adjacent levels.

### Guide / documentation surfaces

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Guide hero | 36px desktop / 32px mobile | 700 | 1.16 |
| Guide section | 26px | 650 | 1.25 |
| Guide step | 18px | 650 | 1.35 |
| Lead | 16px | 400 | 1.6 |
| Body | 14–15px | 450 | 1.65 |

Guide typography may be more spacious than the admin app, but should still avoid marketing-scale display type.

## 3. Spacing and density

Base rhythm remains 4/8px, but operational surfaces use tighter defaults.

- App content padding: 24px desktop, 16px mobile
- Page heading bottom gap: 20px
- Card padding: 18–20px
- Card header: 18–20px horizontal, 16px vertical
- Grid gap: 12–14px
- KPI card minimum height: ~108px
- Table cells: 11–12px vertical, 14px horizontal
- Form grid gap: 14px
- Guide sections: 48px desktop, 40px tablet/mobile

Whitespace is used to group tasks, not to create dramatic editorial moments.

## 4. Color and states

Reference neutrals:
- Ink: `#141414`
- Canvas: `#ffffff`
- Soft canvas: `#f3f3f3`
- Field: `#f0f0f0`
- Hairline: `#e0e0e0`
- Muted text: `#707070`

Operational semantic colors are deliberate exceptions:
- Success: confirmed payment / successful delivery
- Warning: needs review / ambiguous match
- Danger: failed delivery / destructive action

Do not use semantic colors as decoration or general brand accents.

## 5. Shape and elevation

- Cards: 20–24px radius depending on size
- Inputs: 14–16px radius
- Buttons, filters, segmented controls: pill geometry where practical
- Default cards: no drop shadow
- Modals/toasts: limited elevation only when layered above content
- Dividers and tint shifts carry most structural separation

## 6. Component hierarchy

### Page header
1. Route title
2. One-line operational description
3. Primary/secondary actions aligned separately

### KPI cards
1. Small label
2. Medium-size value
3. Optional short explanation

### Tables
1. Name / primary identifier
2. Status chip
3. Amount/date metadata
4. Row actions

Avoid turning table rows into mini marketing cards.

## 7. Responsive rules

- Preserve scan order on mobile.
- Avoid horizontal overflow except intentionally scrollable tables.
- Primary actions should remain at least ~44px high.
- App headings shrink minimally because the desktop scale is already restrained.
- On mobile, prioritize task/status visibility over explanatory copy.

## 8. Accessibility and interaction

- Keep visible `:focus-visible` states.
- Support keyboard operability for menus/modals/buttons.
- Keep reduced-motion behavior.
- Do not encode status with color alone; keep text labels.
- Preserve readable contrast and 44px primary touch targets where practical.

## 9. Reference usage

The supplied Mobbin token document informs:
- neutral tint ladder
- restrained elevation
- rounded geometry
- pill interaction language
- use of Inter as a practical substitute for Saans

It does **not** dictate ClassRelay's marketing-scale typography, section spacing, or absence of operational semantic colors.

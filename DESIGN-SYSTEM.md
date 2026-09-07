# ClassRelay Design System — v2.6.1

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


## Course history CS workspace (v2.4.1)
- Treat the course history as a dense operational master-detail surface, not a marketing page.
- The application table and selected CS inspector should coexist on desktop; collapse to one column below approximately 1180px.
- Request numbers, send timestamps, and counts use compact tabular presentation.
- Repeated applications are shown as separate records and grouped only as navigational context.
- Primary resend action stays visually dominant only after payment/email/video prerequisites are satisfied.


## 10. Metric → drill-down

Operational counts should lead to the records they summarize whenever a meaningful underlying list exists.

- Dashboard KPI cards link to the Applicants route with the corresponding status filter.
- Payment KPI cards filter the payment table in place.
- Course-history KPI cards filter the current course table in place and must not navigate away from the course CS workspace.
- A metric card is one keyboard-focusable control; do not create competing nested links inside it.
- The numeric value is followed by an explicit action label such as `확인 필요 보기 →` so clickability does not depend on hover discovery.
- Active in-place filters use a stronger border/surface treatment and `aria-pressed`.
- Filter state is represented in the hash URL where practical.

## 11. Setup readiness

One-time setup state must not permanently consume dashboard layout space.

- Keep setup readiness in the global top bar beside `설정 가이드`.
- Show a compact `설정 n/4` control until complete, then `✓ 설정 완료`.
- The popover may expose OAuth, Form mapping, course registration, and backup readiness.
- Sample/demo data belongs in Settings/Guide rather than the operating dashboard.

## Operational KPI ordering (v2.4.1)

When the six primary applicant states appear together, use this fixed sequence:

`전체 신청 → 입금확인 → 입금대기 → 확인필요 → 발송가능 → 발송완료`

This sequence represents the lifecycle from total population through payment reconciliation to delivery completion. Do not reorder it by urgency unless the user explicitly changes the product rule.

## Manual correction affordance

CS correction controls are secondary actions, not primary CTAs. They must:
- appear in applicant detail and course CS context,
- clearly state that name/email/course are editable,
- leave payer name and paid amount protected,
- create a visible activity-log record,
- preserve local corrections across Form re-sync.


## Operational safety interaction rules (v2.5.1)

### Delivery uncertainty
- `발송중` and `발송 확인 필요` are first-class operational states, not transient toasts.
- An ambiguous Gmail outcome must not be presented as a definite failure.
- Automatic retry is forbidden when delivery outcome is uncertain.
- Manual retry must show a duplicate-delivery warning and require an explicit action.

### High-risk course changes
- Name/email corrections remain lightweight secondary CS actions.
- Changing a course after payment confirmation, payment linking, or delivery history is high risk.
- High-risk changes require a second confirmation surface with old/new course, prices, linked deposit, and send history.
- Do not hide price differences inside secondary text.

### Inactive course behavior
- `사용 중지` is a historical/CS state, not a deletion state.
- Inactive courses may appear in history/manual correction context.
- Inactive courses must not be silently assigned to new Form responses.

### Cross-tab changes
- A stale edit must be rejected rather than silently overwriting newer data.
- External updates should refresh the current screen when safe; do not destroy an open modal interaction mid-edit.


## Master-detail row selection

- 운영 목록에서 오른쪽 상세 패널이 존재하면 별도 `보기`/`CS 확인` 버튼보다 **행 전체 선택**을 기본 패턴으로 사용합니다.
- 선택 가능한 행은 pointer cursor, hover state, `aria-selected`, visible `:focus-visible`을 제공합니다.
- Enter/Space로도 행을 선택할 수 있어야 합니다.
- 체크박스, 링크, 버튼, 입력창 등 행 내부 interactive control은 행 선택을 트리거하지 않습니다.
- 필터/검색으로 현재 선택이 사라지면 첫 번째 유효 결과를 자동 선택합니다.
- 현재 선택 ID는 URL query에 보존해 재렌더·CS 수정 후에도 같은 신청 건을 복원합니다.


## Email template manager pattern

- Treat templates as a reusable operational resource, not a single form.
- Use master-editor layout: template list first, selected editor second.
- Default state must be explicit with a badge and a non-destructive fallback.
- Course assignments are visible in the selected template editor.
- Destructive deletion is unavailable for the current default template.
- Snapshot/history actions are secondary links inside activity logs, not dominant CTAs.
- On narrow screens, preserve edit context by stacking rather than hiding controls.

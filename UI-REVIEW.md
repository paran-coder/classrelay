# ClassRelay v2.6.0 UI Review

## Mail page goal
The mail page is now a management surface, not a one-off editor. It should let an operator answer four questions without leaving the page:
1. Which template am I editing?
2. Which courses use it?
3. What will recipients actually receive?
4. What was actually sent in the past?

## Applied interaction pattern
- Template selector is the primary context control.
- `템플릿 추가` remains visible in the card header.
- Duplicate/delete are secondary compact actions.
- Default-template state is explicit.
- Course linkage is shown as checkable rows with current assignment context.
- Template variables are shown as compact reference chips.
- Preview is separated from save.
- Historical send-content access appears as a small drill-down action in activity rows.

## Density/accessibility
- Primary controls retain practical touch target sizes.
- Course assignment labels remain clickable, not checkbox-only targets.
- Historical send-content links have visible keyboard focus.
- Template course grid collapses to one column on narrow screens.
- No new decorative color system was introduced.

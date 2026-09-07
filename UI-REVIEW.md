# ClassRelay v2.7.0 — UI Review

## Changes reviewed
- Dashboard Form actions now colocate `폼 추가` and `전체 폼 동기화`.
- Course history uses the narrower `이 강의 폼 동기화` label.
- New course flow can continue directly into Form connection.
- Template `사용 강의` uses compact selectable rows instead of oversized checkbox cards.
- Default-template course application is read-only because it is derived fallback state.
- Recent send history moved from a narrow right rail to a full-width table below template management.

## Rationale
ClassRelay is an admin/operations surface. The UI therefore prioritizes high information clarity, explicit action scope, and dense reusable list/table patterns instead of decorative cards. `추가`, `전체 동기화`, and `이 강의 동기화` are visibly distinct because they have materially different effects.

## Responsive/accessibility checks
- Selectable course rows retain a native checkbox and row-sized click target.
- Table wrappers preserve horizontal scrolling on narrow screens rather than crushing columns.
- Existing keyboard focus rules and 44px-class primary controls remain intact.
- The send snapshot stays in a modal so long mail bodies do not destabilize the table layout.

## Remaining visual QA
Production-origin browser inspection is still required for mobile list density and send-log horizontal overflow behavior.

# ClassRelay v2.8.2 context notes

## Goal
Apply a restrained interaction accent without changing product logic.

## Decision
- `#141414`: primary execution actions (save/create/send), active sidebar
- `#2563EB`: selection, navigation state, focus, inline links
- `#EFF4FF`: low-intensity selected background
- existing green/amber/red: operational outcomes

## Non-goals
- no DB/schema changes
- no Form/payment/Gmail logic changes
- no wholesale brand recoloring

## Validation
93/93 automated tests pass and JavaScript syntax checks pass.

# ClassRelay v2.6.2

## Template creation UX
- `+ 템플릿 추가` now opens a complete blank-template form instead of copying the default subject/body.
- New templates collect template name, course assignments, subject and body in one step.
- Existing content is reused only through the explicit `복제` action.
- Newly created templates are automatically selected after creation.

## Course assignment safety
- If a selected course already has a dedicated template, ClassRelay shows the existing template → new template replacement before creation.
- `다시 편집` returns to the creation form without losing the entered draft.
- The replacement is revalidated inside the operation lock; if another tab changes the assignment before save, creation stops and asks the user to check again.
- Course assignment and template creation are committed in one IndexedDB transaction.

## Compatibility
- Keeps the v2.6.1 settings-backed template architecture.
- No IndexedDB schema version bump or new object store.
- Existing v2.5.x/v2.6.x operational data and email snapshots remain compatible.

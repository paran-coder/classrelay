# ClassRelay v2.6.1 — Self Audit

## Scope
This version was rebuilt from v2.5.1 rather than patching the broken v2.6.0 branch. The purpose was to isolate the template feature and avoid another IndexedDB schema migration.

## What was verified
- Existing stores remain `settings / courses / applicants / payments / logs`.
- No new template object store is created.
- IndexedDB open does not force a version, so existing v1 and previously-created higher-version DBs can open without downgrade attempts.
- Existing single template migrates to `settings.emailTemplates`.
- Abandoned optional `templates` store can be read and recovered to settings.
- Default template fallback and course-specific template resolution are deterministic.
- Template add/select/default/assignment/duplicate/delete/preview code paths exist and are syntax checked.
- Successful email delivery stores an immutable email snapshot.
- Snapshot is viewable from email logs and CS activity.
- Backup restore migrates older `stores.templates` data into settings.
- Startup exceptions no longer leave the content pane silently blank.

## Automated result
- `npm test`: **68/68 tests passing**.
- `npm run check`: all JavaScript syntax checks passing.
- Static asset/link/version checks included in the test suite.
- Additional package-level check: duplicate static DOM IDs 0, missing internal links/assets 0.

## Browser smoke-test limitation
Headless Chromium is available in the execution environment, but local HTTP origins are blocked by organization policy (`Your organization doesn’t allow you to view this site`). Therefore a real browser render could not be completed here. This is an environment limitation, not an observed ClassRelay runtime error.

## Remaining real-environment acceptance test
1. Open v2.6.1 over the actual Vercel URL with existing v2.5.1 data.
2. Confirm dashboard renders.
3. Open Mail / Delivery Log and confirm default template migration.
4. Add a second template, reload, confirm it persists.
5. Assign it to one course and confirm another course uses default fallback.
6. Send one real Gmail message and verify `발송 내용 보기` snapshot.
7. Reload and verify applicant/payment/send/CS history remains unchanged.

## Self rating
**9.4 / 10** before production-browser acceptance.

The score is intentionally below 10 because the actual deployed browser + Google API integration still needs one end-to-end pass.

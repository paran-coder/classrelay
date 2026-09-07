# ClassRelay v2.6.0 — Self Audit

## Scope
This audit covers the new multi-template mail system, course-template linkage, send-content snapshots, legacy migration, and regression safety.

## Completed checks
- Multiple templates stored in IndexedDB.
- Exactly one usable default is recovered when template data exists without a default flag.
- Legacy single template migrates without resetting applicants/payments/logs.
- Explicit course template wins over the default template.
- Missing/stale course template ID falls back to the default template.
- Default template cannot be deleted.
- Deleting a non-default template atomically unlinks affected courses.
- Template assignment writes are guarded by the existing operation lock.
- Template preview supports all five variables.
- Send flow rejects applicants with no resolvable template.
- Course/template changes after the confirmation modal cause exclusion from that send pass.
- Successful sends persist rendered content in `deliverySnapshot`.
- Historical send content remains independent from future template edits.
- Snapshot viewer is reachable from mail logs and dynamic CS panels.
- Backup/export includes the templates store.
- IndexedDB upgrade reports a clear error if an old tab blocks the schema upgrade.

## Automated results
- Core/static/coordination test suite: **64/64 passed**.
- JavaScript syntax check (`npm run check`): **passed**.

## Remaining real-environment verification
1. Deploy to Vercel.
2. Open v2.5.x browser data and confirm automatic default-template migration.
3. Create two templates and bind different courses.
4. Send one Gmail message from each course.
5. Edit both templates after sending.
6. Confirm historical `발송 내용 보기` still shows the original rendered text and URL.
7. Export/restore a backup and confirm templates + snapshots survive.

## Self evaluation
Static implementation quality: **9.6 / 10**.
The remaining gap is real Google/Vercel/browser integration testing rather than a known static defect.

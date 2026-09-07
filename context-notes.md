# ClassRelay v2.6.0 Context Notes

## Product definition
ClassRelay is a local-first web admin tool for online lecture recording delivery. Each operator uses their own Google Cloud OAuth Client ID, Google Form, Gmail account, bank CSV, and browser-local IndexedDB data. There is no central ClassRelay user database.

## v2.6.0 goal
Upgrade the mail page from one editable template into a reusable template management system while preserving ClassRelay's course-level CS history.

## User-approved requirements
1. Support multiple mail templates.
2. Keep one default template.
3. Allow a course to use a specific template; when none is assigned, fall back to the default template.
4. Add template creation, editing, duplication, deletion, and preview.
5. Preserve the exact rendered subject, body, recording URL, recipient, course, and template used at successful send time.
6. Surface historical send content from mail logs and CS activity.

## Data model
- IndexedDB `templates` store holds template records.
- `courses.emailTemplateId` optionally points to one template.
- A course without `emailTemplateId` resolves to the default template.
- Successful send logs hold `deliverySnapshot` with rendered content.
- Legacy `settings.emailTemplate` is migrated into the first default template on first v2.6.0 load.

## Non-destructive invariants
- Form re-sync does not reset payment, delivery, notes, send counts, manual overrides, or delivery snapshots.
- CSV imports remain additive.
- Re-sends create new send logs rather than overwriting historical send content.
- Deleting a non-default template unlinks its courses atomically; those courses fall back to the default template.
- The default template cannot be deleted until another template becomes default.

## Safety rules
- If a course or resolved template changes after the send-confirmation modal opens, the applicant is excluded from that send pass as `상태가 변경됨`.
- Template and course assignments are persisted under the existing cross-tab operation lock.
- Template deletion and course unlinking use one IndexedDB transaction.

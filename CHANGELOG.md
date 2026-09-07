# ClassRelay v2.6.1

## Reimplemented from v2.5.1 stable baseline
- Rebuilt multi-template email management without adding a new IndexedDB store.
- Templates are stored in the existing `settings` store under `emailTemplates`.
- Default template ID is stored under `defaultEmailTemplateId`.
- Existing single `emailTemplate` is migrated non-destructively.
- If a browser previously opened the abandoned higher-schema template build, its optional `templates` store is read once and copied into settings.
- IndexedDB is opened without forcing a version, avoiding both upgrade and downgrade errors.

## Email templates
- Add/select multiple templates.
- Set a default template.
- Assign a template to one or more courses.
- Courses without an assignment fall back to the default template.
- Duplicate/delete/preview templates.
- Default template cannot be deleted.
- Deleting a linked non-default template clears course assignments so they fall back safely.
- Added `{{신청번호}}` and `{{금액}}` variables.

## Delivery history
- Successful sends store an immutable snapshot of template name, rendered subject/body, recording URL, recipient, course, request number, amount and sent time.
- Applicant, course history and email log surfaces can open `발송 내용 보기`.

## Recovery
- Startup failures render a recovery panel instead of a blank content area.
- v2.6.0 backup files containing a `templates` store are migrated into settings during restore.

## Tests
- Expanded unit/static test coverage for template migration, fallback, snapshot, abandoned-schema recovery and startup recovery UI.

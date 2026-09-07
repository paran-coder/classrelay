# ClassRelay v2.6.0

## Added
- Multiple reusable Gmail templates.
- Default template designation.
- Course-specific template assignment with default fallback.
- Template add / duplicate / delete / preview controls.
- `{{신청번호}}` and `{{금액}}` variables in addition to existing variables.
- `templates` IndexedDB store and automatic v2.5.x single-template migration.
- Successful-send `deliverySnapshot` containing rendered subject, body, recording URL, recipient, course, template, and sent timestamp.
- Historical `발송 내용 보기` action in mail logs and CS activity.
- Course editor template selector.
- Atomic non-default-template delete + course unlink.
- Send-confirmation protection when the course/template changes before the actual send starts.

## Changed
- IndexedDB version raised from 1 to 2.
- Backups now include the `templates` store and report app version 2.6.0.
- Mail page redesigned as a template manager rather than a single global editor.
- Course list now shows the resolved mail template.

## Compatibility
- Existing `settings.emailTemplate` content is imported as `기본 녹화본 발송` the first time v2.6.0 loads with no template records.
- Old backups without a `templates` store remain importable; a default template is recreated after restore.

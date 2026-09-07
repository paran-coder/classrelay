# ClassRelay v2.6.0 Checklist

## Required project docs
- [x] context-notes.md updated
- [x] checklist.md updated
- [x] README.md updated
- [x] User manual.md updated

## Template data model
- [x] Add IndexedDB `templates` store
- [x] Migrate legacy single template into default template
- [x] Add `courses.emailTemplateId`
- [x] Default-template fallback when a course has no explicit template
- [x] Include templates in backup/export/import

## Template UI
- [x] Add template selector
- [x] Add template creation
- [x] Add template duplication
- [x] Add guarded deletion
- [x] Add default-template designation
- [x] Add course assignment controls
- [x] Add template preview
- [x] Add variables: 이름 / 강의명 / 녹화본URL / 신청번호 / 금액

## Send integration
- [x] Resolve per-course template before send
- [x] Reject send when no usable template exists
- [x] Detect course/template changes between confirmation and send
- [x] Store rendered subject/body/URL/recipient/template/course snapshot on successful send
- [x] Keep resend snapshots as separate log records

## CS / log history
- [x] Mail page can open historical send content
- [x] Applicant master-detail activity can open historical send content
- [x] Course CS activity can open historical send content

## QA
- [x] JavaScript syntax check
- [x] Core template resolution tests
- [x] Static template-management tests
- [x] Backup/store version checks
- [ ] Real Vercel/browser visual QA
- [ ] Real Gmail end-to-end send verification

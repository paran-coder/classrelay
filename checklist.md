# Checklist — class-relay-v2.1.0

## 0. Project foundation
- [x] Create versioned project directory
- [x] Create context-notes.md
- [x] Create checklist.md
- [x] Create README.md
- [x] Create User manual.md

## 1. Local-first data layer
- [x] IndexedDB stores for settings/courses/applicants/payments/logs
- [x] Backup export
- [x] Backup restore
- [x] Local data reset
- [x] Demo data loader

## 2. Admin UI
- [x] Responsive application shell
- [x] Dashboard
- [x] Applicants table + search/filter
- [x] Payments import/matching page
- [x] Courses page
- [x] Email/send log page
- [x] Settings page
- [x] First-use setup state

## 3. Google Forms
- [x] BYO OAuth Client ID setting
- [x] Browser token authorization
- [x] Form URL/ID parsing
- [x] Form metadata fetch
- [x] Question auto-mapping
- [x] Manual field mapping UI
- [x] Existing responses sync
- [x] Duplicate response prevention

## 4. Bank CSV matching
- [x] Client-side CSV parsing
- [x] Column auto-detection
- [x] Manual column mapping
- [x] Exact name + amount matching
- [x] Duplicate/ambiguous review state
- [x] Manual payment approval

## 5. Gmail
- [x] gmail.send incremental authorization
- [x] Individual message send
- [x] First-send guard
- [x] Explicit resend
- [x] Delivery log
- [x] Editable template

## 6. Guide
- [x] Detailed /guide page
- [x] Google Cloud project creation flow
- [x] API activation steps
- [x] OAuth audience/testing guidance
- [x] Authorized JavaScript origins explanation
- [x] Client ID setup
- [x] Google Form connection/mapping guide
- [x] Gmail sending guide
- [x] CSV import/matching guide
- [x] Troubleshooting
- [x] Local data/security/backup guide

## 7. Quality
- [x] Pure matching/normalization tests
- [x] Static JS syntax checks
- [x] HTML internal asset/link validation
- [x] Local HTTP 200 response check
- [ ] Real Google OAuth integration test with user's Client ID
- [ ] Real Google Form response sync test
- [ ] Real Gmail message send test
- [ ] Real bank CSV format validation
- [ ] GitHub repository publish
- [ ] Vercel production deployment


## 8. UI review v2.1.0
- [x] Apply supplied Mobbin palette and neutral tint ladder
- [x] Replace colored SaaS chrome with monochrome operational UI
- [x] Replace rectangular controls with pill interaction language
- [x] Move cards to 24px geometry and remove routine drop shadows
- [x] Move inputs to tint-fill/no-border resting state
- [x] Add visible keyboard focus states
- [x] Preserve semantic colors only for operational success/warning/error
- [x] Improve mobile touch targets and drawer aria-expanded state
- [x] Add Escape close behavior for modal/mobile drawer
- [x] Restyle /guide as gallery-white documentation surface

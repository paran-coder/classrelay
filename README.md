# ClassRelay v2.6.0

ClassRelay is a local-first web admin tool that syncs Google Form applications, matches bank CSV deposits, and sends recording links through the operator's own Gmail account.

## v2.6.0
The mail module now supports multiple reusable templates instead of one global editable message.

- Multiple templates
- One default template
- Optional course-specific template
- Default fallback for unassigned courses
- Add / duplicate / delete / preview
- Variables: `{{이름}}`, `{{강의명}}`, `{{녹화본URL}}`, `{{신청번호}}`, `{{금액}}`
- Exact successful-send snapshot in local logs
- Historical send-content viewer in mail/CS activity

## Storage
The application is local-first. Operational data is stored in browser IndexedDB. v2.6.0 uses these stores:

- settings
- courses
- applicants
- payments
- logs
- templates

No central ClassRelay user database is required.

## Legacy migration
If a v2.5.x browser already has the old single `emailTemplate` setting, v2.6.0 automatically creates `기본 녹화본 발송` from that content. Existing operational history is not reset.

## Template resolution
For each applicant:

1. Find the applicant's course.
2. If `course.emailTemplateId` points to an existing template, use it.
3. Otherwise use the template marked `isDefault`.
4. If no usable template exists, exclude the applicant from sending.

## Send history
On a successful Gmail send, ClassRelay stores the actual rendered:

- template ID/name
- subject
- body
- recording URL
- recipient email
- course ID/name
- sent timestamp
- Gmail message ID

Changing a template later does not rewrite past send content.

## Run locally
Serve the folder over HTTP. ES modules and Google OAuth require an HTTP origin rather than opening `index.html` directly as a local file.

## Tests
```bash
npm test
npm run check
```

## Deployment
The project is a static Vercel-ready web app. After deployment, register the production origin in each user's own Google OAuth Web Client as an Authorized JavaScript Origin.

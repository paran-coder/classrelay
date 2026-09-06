# ClassRelay v2.3.1 User Manual

## Core workflow
1. Register a course with its price and recording URL.
2. Connect a Google Form and map its fields. Choose a default course when the form does not contain a course field.
3. Sync Form responses. Each distinct Google Form response becomes its own application record and receives a stable request number.
4. Re-syncing the same response updates source information only; existing payment, delivery and CS history is preserved.
5. Import a bank CSV. New transactions are appended and matching runs immediately.
6. Only unique exact-name + exact-amount + eligible-date pairs are auto-confirmed. Similar names appear only as review suggestions.
7. Send recording emails to confirmed applications.
8. For later support, open **강의 관리 → 히스토리**, search the customer, select **CS 확인**, inspect delivery history and resend from the same screen.

## Repeated application policy
- The same person may submit the same course more than once.
- A different Google Form `responseId` is always a separate application/order-like record.
- Applications are never merged merely because name, email, course, payer name, or amount is identical.
- Repeated applications are grouped visually as the same customer for CS navigation only.
- Payment matching still occurs per application. If repeated applications create an ambiguous 1:N or N:1 match, ClassRelay leaves them in `확인필요` until the operator connects the correct payment.

## Course CS workspace
- Every application has a stable `CR-YYYYMMDD-xxxxx` request number.
- Search by applicant name, payer name, email, or request number.
- `CS 확인` shows the selected request's payment state, final send time, send count, activity history and Gmail message IDs.
- `녹화본 재발송` is available for previously sent applications; sending remains blocked when payment/email/course URL prerequisites are not satisfied.
- CS notes are stored on that specific application and are preserved across Form re-sync.
- Other applications from the same customer for the same course are shown separately and can be switched without leaving the history screen.

## Data persistence rules
- Form sync never clears request number, sent status, send count, sent timestamp, matched payment, Gmail message ID, or CS note.
- Importing another CSV never clears earlier payments or matches.
- Existing bank transactions are deduplicated before insertion.
- Courses that already have applicant history cannot be destructively deleted; mark them inactive instead.


## KPI drill-down and setup status
- Dashboard counts are actionable. Select `전체 신청`, `입금 대기`, `입금 확인`, `확인 필요`, or `발송 완료` to open Applicants with that filter already applied.
- Payment summary cards filter the bank-transaction table immediately.
- Course History summary cards filter that course's application table without leaving the course page.
- The current filter is kept in the hash URL so filtered views remain identifiable.
- Initial setup readiness is shown in the top bar next to `설정 가이드`; it no longer occupies a permanent dashboard card.
- Sample data is available from **설정 → 로컬 데이터 관리** and is intentionally absent from the operating dashboard.

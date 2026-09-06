# ClassRelay v2.2.0 User Manual

## Core workflow
1. Register a course with its price and recording URL.
2. Connect a Google Form and map its fields. Choose a default course when the form does not contain a course field.
3. Sync Form responses. Existing applicants are merged without losing payment or email delivery history.
4. Import a bank CSV. New transactions are appended and matching runs immediately.
5. Only unique exact-name + exact-amount + eligible-date pairs are auto-confirmed. Similar names appear only as review suggestions.
6. Send recording emails to confirmed applicants.
7. Later, open **강의 관리 → 히스토리** to search that course's applicants and inspect payment, send, resend and activity history for CS.

## Data persistence rules
- Form sync never clears sent status, send count, sent timestamp, matched payment, or CS notes.
- Importing another CSV never clears earlier payments or matches.
- Existing bank transactions are deduplicated before insertion.
- Courses that already have applicant history cannot be destructively deleted; mark them inactive instead.

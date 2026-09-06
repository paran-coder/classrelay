# ClassRelay v2.4.1 User Manual

## Core workflow
1. Register a course with its price and recording URL.
2. Connect a Google Form and map its fields. Choose a default course when the form does not contain a course field.
3. Sync Form responses. Each distinct Google Form response becomes its own application record and receives a stable request number.
4. Re-syncing the same response updates source information only; existing payment, delivery and CS history is preserved.
5. Import a bank CSV. New deposits are appended and matching runs immediately.
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
- Existing bank deposits are deduplicated before insertion.
- Courses that already have applicant history cannot be destructively deleted; mark them inactive instead.


## KPI drill-down and setup status
- Dashboard counts are actionable. Select `전체 신청`, `입금 대기`, `입금 확인`, `확인 필요`, or `발송 완료` to open Applicants with that filter already applied.
- Payment summary cards filter the bank-deposit table immediately.
- Course History summary cards filter that course's application table without leaving the course page.
- The current filter is kept in the hash URL so filtered views remain identifiable.
- Initial setup readiness is shown in the top bar next to `설정 가이드`; it no longer occupies a permanent dashboard card.
- Sample data is available from **설정 → 로컬 데이터 관리** and is intentionally absent from the operating dashboard.


## v2.4.1 운영 안전성

- 왼쪽 상단 ClassRelay 로고를 누르면 대시보드로 돌아갑니다.
- Form을 다시 동기화하면 새 신청을 추가/병합한 뒤 기존 미매칭 입금과 즉시 다시 매칭합니다. 기존 입금/발송/CS 이력은 초기화하지 않습니다.
- 이미 입금 확인이 끝난 신청 건의 입금자명과 금액은 Form 수정으로 조용히 덮어쓰지 않습니다.
- 재발송이 실패하더라도 이전에 한 번 이상 성공 발송한 기록은 `발송완료` 이력으로 유지되고, 최근 실패 내용은 별도로 남습니다.
- 백업 복원은 Form 동기화/CSV 추가와 달리 현재 로컬 데이터를 교체하는 작업이므로 확인창을 거칩니다.
- 실제 운영 데이터가 있는 브라우저에서는 샘플 데이터 추가를 차단합니다.

## v2.4.1 신청 정보 수동 수정

신청자 상세 또는 강의 히스토리의 CS 패널에서 `신청정보 수정`을 사용할 수 있습니다.

수정 가능한 항목:
- 신청자 이름
- 이메일
- 강의

수정한 값은 로컬 보정값으로 표시되어 이후 Google Form을 다시 동기화해도 덮어쓰지 않습니다. 변경 전/후 값은 `신청정보 수정` 활동 로그에 남습니다.

입금자명과 금액은 입금 대조 히스토리를 보호하기 위해 이 화면에서 수정하지 않습니다. 이미 입금이 연결된 신청의 강의를 변경하면 연결된 입금의 `courseId`도 함께 이동합니다.

## v2.4.1 대시보드 순서

대시보드 현황 카드는 다음 순서로 고정됩니다.

`전체 신청 → 입금확인 → 입금대기 → 확인필요 → 발송가능 → 발송완료`

각 카드는 클릭하면 해당 신청자 필터로 바로 이동합니다.


## v2.4.1 용어 원칙
사용자 화면에서는 은행 CSV의 개별 항목을 가능한 한 `입금`, `입금 내역`, `입금일시`로 표현합니다. 내부 구현상 transaction 개념은 사용자 문구와 분리합니다.

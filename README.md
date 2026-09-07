# ClassRelay v2.6.1

ClassRelay는 Google Form 신청자, 은행 CSV 입금, 강의별 녹화본 Gmail 발송과 CS 히스토리를 브라우저 로컬에 관리하는 local-first 웹앱입니다.

## v2.6.1 핵심
- v2.5.1을 안정 기준으로 템플릿 기능을 재구현합니다.
- IndexedDB schema/version은 올리지 않습니다 (`DB_VERSION = 1`).
- 여러 메일 템플릿은 기존 `settings` store에 배열로 저장합니다.
- 기본 템플릿과 강의별 템플릿 연결을 지원합니다.
- 성공 발송 시 당시 제목/본문/녹화본 URL을 snapshot으로 로그에 보존합니다.

## 실행
정적 웹앱이므로 Vercel 등에서 그대로 배포할 수 있습니다. 로컬에서는 정적 HTTP 서버로 실행해야 Google OAuth origin 테스트가 가능합니다.


## QA status
- Automated tests: **68/68 passed**
- JavaScript syntax check: passed
- Static internal links/assets and duplicate DOM ID check: passed
- Actual Vercel browser + Google API end-to-end test: pending

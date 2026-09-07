# ClassRelay v2.9.2 — Operational Risk Status

v2.9.2는 Google 설정 가이드 절차 보강 버전이며 애플리케이션 운영 로직을 변경하지 않습니다.

## 문서 관련 잔여 위험
- Google Cloud Console의 UI 문구는 Google이 변경할 수 있어 메뉴명이 향후 달라질 수 있음
- 개인 Gmail과 Google Workspace 조직 계정에서 Audience 선택지가 다를 수 있음
- 은행별 CSV 다운로드 위치는 은행 UI가 서로 달라 공통 클릭 경로를 고정할 수 없음

## 대응
- Google 공식 문서 링크를 가이드에 함께 제공
- External + Testing + 본인 Test user를 초보 기본 경로로 안내
- 앱 실제 scope/버튼명과 가이드 문구를 정적 테스트로 고정


## v2.10.0 추가 운영 규칙
- **가격 변조/오입력 위험**: 결제금액은 Google Form 응답에서 읽지 않는다. 신규 신청의 기준 금액은 연결 강의의 신청 당시 `course.price`를 `applicant.amount`에 저장한다.
- **가격 변경으로 과거 신청 훼손 위험**: 재동기화 시 기존 양수 `applicant.amount`를 보존한다. 강의 가격 변경은 과거 신청 금액을 소급 변경하지 않는다.
- **불필요한 녹화본 URL 강제 위험**: 녹화본 URL은 강의/발송의 전역 필수조건이 아니다. 템플릿이 `{{녹화본URL}}`을 실제 사용할 때만 URL 존재를 검증한다.
- **일반메일 오차단 위험**: 녹화본 변수를 사용하지 않는 템플릿은 URL이 비어 있어도 발송 가능해야 한다. 관련 회귀 테스트를 유지한다.

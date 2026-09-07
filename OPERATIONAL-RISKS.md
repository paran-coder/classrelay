# ClassRelay v2.8.0 — Operational Risk Status

## Resolved baseline risks
- 자동 입금매칭 기간 상·하한
- CSV 날짜 정규화 / 은행 참조번호 우선 중복판정
- Gmail 발송중 / 발송 확인 필요 / 중복 실행 보호
- 신청자↔입금 원자적 저장
- 고위험 강의 변경 확인
- 사용 중지 강의 전체 Form 동기화 제외
- 멀티탭 쓰기 작업 조정
- 템플릿 schema 회귀 방지
- 초기화 실패 복구 UI

## v2.8.0 sending protections
1. **다른 강의 신청자를 한 번에 섞어 발송하는 위험** — 한 발송 작업에 하나의 courseId만 허용합니다.
2. **발송 화면에서 잘못된 강의를 다시 선택하는 위험** — 강의는 발송 대상 화면의 고정 컨텍스트이며 필터 드롭다운으로 제공하지 않습니다.
3. **입금확인만 보고 실제 발송 준비가 안 된 신청자를 포함하는 위험** — 이메일, 녹화본 URL, 템플릿, 기존 발송 상태까지 포함한 eligibility를 사용합니다.
4. **발송 확인 후 템플릿/URL이 바뀌는 위험** — 확인 당시 강의/템플릿 snapshot과 실제 발송 직전 값을 비교하고 다르면 발송에서 제외합니다.
5. **같은 사람이 여러 강의를 신청했을 때 한 메일로 합쳐지는 위험** — 신청 건은 courseId별로 별도 발송합니다.
6. **발송 대상 화면에서 Form 동기화가 잘못된 강의를 갱신하는 위험** — 현재 강의의 Form connection ID만 호출합니다.

## Still requires real-environment testing
- Gmail API 실제 발송과 quota/네트워크 응답
- Google OAuth 실제 팝업/토큰 UX
- 두 개 이상 강의의 발송 대상 전환
- 모바일/태블릿 레이아웃

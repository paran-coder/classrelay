# ClassRelay v2.8.4 — Operational Risk Status

## 데이터/발송 로직
v2.8.4는 운영 로직을 변경하지 않는 interaction accent UI 패치입니다. v2.8.0에서 해결한 다음 보호장치를 그대로 유지합니다.

- 자동 입금매칭 기간 상·하한
- CSV 날짜 정규화 / 은행 참조번호 우선 중복판정
- Gmail 발송중 / 발송 확인 필요 / 중복 실행 보호
- 신청자↔입금 원자적 저장
- 고위험 강의 변경 확인
- 사용 중지 강의 전체 Form 동기화 제외
- 멀티탭 쓰기 작업 조정
- 비파괴 Form 재동기화
- Course-first Sending / 한 발송 작업에 하나의 강의만 허용
- 발송 직전 강의·URL·템플릿 변경 재검증

## v2.8.4 변경으로 새로 생긴 운영 위험
현재 확인된 신규 운영 위험은 없습니다. interaction accent CSS와 문서만 변경했고 IndexedDB schema, 매칭, Gmail 전송 경로는 변경하지 않았습니다.

## Still requires real-environment testing
- Gmail API 실제 발송과 quota/네트워크 응답
- Google OAuth 실제 팝업/토큰 UX
- 두 개 이상 강의의 Form 동기화/발송 대상 분리
- 모바일/태블릿 레이아웃

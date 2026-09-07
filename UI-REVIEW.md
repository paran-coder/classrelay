# ClassRelay v2.8.1 — UI Review

## 이번 검토 범위
- 사용자 제공 `강의 추가` 모달 스크린샷
- `/guide`의 현재 정보구조와 v2.8.x 실제 동작 일치 여부
- 기존 Mobbin 참고 토큰의 색상 후보 재검토

## 1. 강의 추가 모달 정렬

### 문제
`가격` 필드는 label + input만 있고 `상태` 필드는 label + select + help text를 가지고 있어 같은 grid row의 높이가 달랐습니다. `.field`가 row 높이에 맞춰 stretch되면서 가격 입력창이 아래로 밀려 두 컨트롤의 상단 기준선이 어긋났습니다.

### 수정
- 강의 모달에 `.course-form-grid` 전용 클래스 추가
- `.course-form-grid > .field { align-self:start; align-content:start; }` 적용
- 임의 margin/height 보정 없이 도움말 길이가 달라도 컨트롤 상단선이 유지되도록 수정

## 2. Guide 정보구조

가이드는 현재 앱의 실제 흐름으로 다시 정리했습니다.

- Google Cloud / OAuth Token Model
- 새 강의 → 새 Google Form 연결
- `폼 추가 / 전체 폼 동기화 / 이 강의 폼 동기화` 용어 구분
- 비파괴 Form 재동기화
- CSV 누적/자동매칭
- 강의별 메일 템플릿
- Course-first Sending (`한 번의 발송 = 한 강의`)
- 하단 전체 폭 발송로그와 발송 snapshot
- YouTube 일부공개/비공개 URL 특성
- CS / 백업 / 문제 해결

## 3. Interaction accent 제안

실제 UI에는 아직 적용하지 않았습니다.

- Reference accent: `#0066FF` — 선명하고 전기적인 느낌
- Recommended candidate: `#2563EB` — 더 차분하고 관리자 UI에서 상태/선택 강조에 적합
- Primary action은 `#141414` 유지
- 향후 적용 시 `Black = commit`, `Blue = interaction state`, `Green/Amber/Red = outcome` 역할 분리를 권장

## 다음 Visual QA
Vercel 실제 화면에서 강의 추가 모달의 가격/상태 입력 상단 정렬과 `/guide` 모바일 표/긴 문장 reflow를 확인합니다. 포인트 컬러는 별도 승인 전까지 적용하지 않습니다.

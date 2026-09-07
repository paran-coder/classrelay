# ClassRelay v2.9.2 context notes

## 작업 목적
- `/guide`를 완전 초보 사용자도 처음부터 따라 할 수 있는 튜토리얼로 전면 재작성한다.
- 애플리케이션 기능/데이터 모델은 변경하지 않는다.

## 가이드 작성 원칙
- `무엇을 해야 한다`가 아니라 `어디를 클릭 → 무엇을 입력 → 성공 화면 → 오류 시 확인` 순서로 설명한다.
- 기술용어는 먼저 쉬운 말로 정의한다.
- Google Cloud 메뉴는 현재 공식 문서 기준 `Branding / Audience / Data Access / Clients`를 사용한다.
- Google OAuth는 External + Testing + 본인 Test user를 기본 초보 경로로 안내한다.
- 실제 앱 scope와 동일한 Forms 2개 + Gmail 1개 scope를 안내한다.
- Google Form은 `forms.gle`/`viewform`이 아니라 긴 편집 `/edit` URL을 사용하도록 안내한다.
- 마지막에 본인 이메일로 끝까지 검증하는 전체 실습을 둔다.

## v2.9.1 작업 컨텍스트 — 가이드 타이포그래피 QA
- 범위: 앱 기능 변경 없이 `/guide`의 읽기 위계와 설명문 가독성만 개선한다.
- 기준: Docs/knowledge surface는 가독성과 안정적 위계를 우선한다.
- 가이드 전용 타입 규칙: 핵심 본문/행동 설명 16px, 보조 설명 15px, 메타/라벨 12~13px.
- 색상 규칙: 사용자가 따라 해야 하는 핵심 지시는 `#141414` 또는 `#262626`, 부가 설명만 muted를 사용한다.
- QA: 데스크톱과 모바일 실제 렌더 스크린샷에서 크기, 줄 길이, 카드 밀도, 모바일 스택을 시각 검수한다.
- 회귀 방지: UI-REVIEW와 정적 테스트에 최종 가이드 타입 스케일을 기록한다.


## v2.9.2 작업 컨텍스트 — 실제 Google 화면 기반 초보자 흐름 보강
- 범위: 앱 기능/DB/API 로직은 변경하지 않고 `/guide`의 Google OAuth 설정·권한 승인 설명만 보강한다.
- Audience 초기 설정: 개인 Gmail 사용자는 `외부(External)`를 선택한 뒤 `다음(Next)`까지 누르도록 명시한다. `내부(Internal)`은 회사/학교 Google Workspace 조직 내부 사용자 전용으로 설명한다.
- Test user: `대상(Audience)` 화면 아래쪽의 `테스트 사용자(Test users)` → `Add users`에서 실제 사용할 본인 Gmail을 추가하고 저장하도록 화면 위치까지 적는다.
- Data Access: scope를 검색 링크로 오해하지 않도록 `범위 직접 추가(Manually add scopes)`에 scope 문자열 3개를 붙여넣는 방식으로 안내한다. scope 문자열은 일반 code 텍스트 + 복사 버튼으로 제공한다.
- Client 생성: Create 이후 `OAuth 클라이언트 생성됨` 팝업에서 Client ID를 확인/복사하고 `확인`을 누르는 단계까지 적는다. Client Secret은 ClassRelay가 사용하지 않는다고 같은 위치에서 강조한다.
- Form 권한: 테스트 OAuth에서 `Google에서 확인하지 않은 앱` 경고가 나오면 Test user로 등록한 본인 계정인지 확인한 뒤 `계속`을 누르도록 안내한다.
- Forms 동의 화면: Form 구조/응답 읽기 두 항목을 선택하거나 `모두 선택` 후 화면 아래의 `계속`을 누르도록 설명한다.
- 계정 선택 화면이 이어질 수 있으면 Test user로 등록한 본인 Gmail을 선택하도록 안내한다.
- 실제 화면에서 확정되지 않은 조작(예: 이메일 입력 후 Enter)은 확정 절차로 문서화하지 않는다.

- 사용자 제공 Google 화면 캡처에는 개인 계정/클라이언트 정보가 노출될 수 있으므로 가이드 이미지 asset으로 복사하지 않고 텍스트 절차 검증에만 사용한다.

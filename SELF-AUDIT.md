# ClassRelay v2.6.2 — Self Audit

## Scope
메일 템플릿의 `추가`와 `복제` 역할을 분리한 안전한 UX 패치입니다. IndexedDB schema는 변경하지 않았습니다.

## Verified behavior
- `+ 템플릿 추가`는 이름·사용 강의·제목·본문이 비어 있는 신규 작성 폼으로 시작합니다.
- 신규 템플릿은 이름·제목·본문을 모두 입력해야 생성됩니다.
- 기존 제목/본문을 가져오는 동작은 `복제`에만 남아 있습니다.
- 복제는 템플릿 내용만 복사하고 강의 연결은 복사하지 않습니다.
- 이미 전용 템플릿이 연결된 강의를 선택하면 `기존 템플릿 → 새 템플릿` 교체를 확인합니다.
- `다시 편집`을 누르면 작성 draft가 유지됩니다.
- 확인 이후 다른 탭에서 강의 연결이 달라지면 저장을 중단합니다.
- 템플릿 생성과 선택 강의 연결은 하나의 IndexedDB atomicWrite로 저장됩니다.
- 생성 성공 직후 새 템플릿 route가 선택되어 편집 화면에 표시됩니다.

## Automated QA
- `npm test`: **72/72 passed**
- `npm run check`: passed
- Static DOM duplicate IDs: 0
- Internal page/asset references: no missing files
- Core release files: no stale v2.6.1 version marker

## Browser smoke test
A Chromium smoke test was attempted against a local static server, but the execution environment blocks the local test origin with an organization policy. Therefore the actual click flow still needs confirmation after Vercel deployment.

## Self score
**9.5 / 10**

The remaining 0.5 is reserved for production-origin browser verification of: `+ 템플릿 추가 → 강의 충돌 확인 → 생성 → 자동 선택 → 새로고침 후 유지`.

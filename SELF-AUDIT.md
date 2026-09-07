# ClassRelay v2.10.0 — Self Audit

## 변경 범위
- 강의 생성/수정에서 녹화본 URL을 선택값으로 변경했다.
- Google Form 질문 매핑에서 결제금액을 제거했다.
- 신규 신청의 금액은 연결 강의의 신청 당시 가격을 저장하고, 이후 재동기화/강의 가격 변경으로 덮어쓰지 않는다.
- 일반 안내메일은 녹화본 URL 없이 발송할 수 있다. 템플릿에 `{{녹화본URL}}`이 있을 때만 URL을 요구한다.
- 메일 UI/로그 문구를 녹화본 전용 표현보다 일반 메일 중심으로 정리했다.
- IndexedDB schema는 변경하지 않았다.

## 운영 로직 검수
- `validateCourseDraft()`는 강의명과 양수 가격만 검증하며 URL을 검증하지 않는다.
- `FIELD_DEFINITIONS`에서 결제금액 field를 제거했고 `mapFormResponse()`는 Form 금액을 사용하지 않는다.
- `syncFormConnectionData()`는 신규/레거시 보완용 incoming amount에 현재 `course.price`를 넣는다.
- `mergeSyncedApplicant()`는 기존 양수 amount를 항상 유지해 신청 당시 가격을 스냅샷으로 보존한다.
- `templateRequiresRecordingUrl()`은 제목/본문의 `{{녹화본URL}}` 사용 여부를 검사한다.
- `sendEligibilityReason()`은 위 변수가 있을 때만 강의 URL 미등록을 발송 제외 사유로 처리한다.

## 자동 검증
- `npm test`: **110/110 통과**
- `npm run check`: **전체 JavaScript syntax 통과**
- 새 테스트에 URL 선택형 강의 생성, Form 금액 무시, 가격 스냅샷 보존, 일반 메일 URL 불필요, 녹화본 변수 조건부 검증을 포함했다.

## UI QA
- Frontend Forge 기준으로 기존 ClassRelay admin surface의 낮은 장식성/높은 명확성을 유지했다.
- 실제 `styles.css`와 현재 앱의 강의 추가/질문 매핑 markup을 Playwright로 렌더했다.
- desktop 1440×1000, mobile 390×844 모두 document horizontal overflow 0을 확인했다.
- 강의 추가 모달에서 `녹화본 URL (선택)`과 가격 스냅샷 설명이 필드 위계 안에서 자연스럽게 읽힌다.
- 질문 매핑 모달에서는 결제금액 선택 항목이 사라지고, 연결 강의 아래에 자동 가격 저장 규칙이 표시된다.
- 환경 정책상 localhost/file URL로 실제 앱 전체 E2E 내비게이션은 차단되어, 시각 QA는 현재 앱 markup + 실제 stylesheet harness로 수행했다. 최종 Vercel 배포에서 Google Form 실연결 E2E는 사용자 테스트로 확인해야 한다.

## 자체평가
**9.7 / 10**

핵심 운영 규칙은 코드와 단위/정적 테스트로 고정했고 UI도 desktop/mobile 렌더로 확인했다. 남은 0.3은 실제 배포 origin에서 Google OAuth → Form 동기화 → CSV 매칭 → 일반메일/녹화본메일 발송까지 연속 E2E를 아직 이 환경에서 실행하지 못한 점이다.

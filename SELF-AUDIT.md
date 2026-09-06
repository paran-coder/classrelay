# ClassRelay v2.3.2 — Self Audit

## 결론

MVP 코드 기능은 거의 완성 단계지만, 아직 **production-complete**로 판정하지 않습니다. 실제 Google 계정/실제 Form/실제 은행 CSV/실제 Gmail을 연결한 배포 환경 E2E 테스트가 남아 있습니다.

## 이번 점검에서 발견해 수정한 항목

1. 사이드바 브랜드가 홈 링크가 아니었음 → `#dashboard` 링크로 수정.
2. 대시보드가 작업 우선순위보다 누적 숫자를 먼저 보여줌 → `확인 필요 → 발송 가능 → 입금 대기 → 발송 완료 → 전체 신청` 순서로 변경.
3. Form sync 후 기존 은행 거래가 자동 재매칭되지 않았음 → sync 직후 conservative autoMatch 실행.
4. OAuth token cache가 scope만 키로 사용함 → `Client ID + scope`로 격리.
5. 재발송 실패가 기존 성공 상태를 `FAILED`로 덮어쓸 수 있었음 → 과거 성공을 보존하고 마지막 시도 실패를 별도 기록.
6. 입금 확정 후 Form 수정이 payer/amount를 바꿀 수 있었음 → 결제 확정 후 두 필드를 역사 데이터로 잠금.
7. backup restore가 즉시 전체 데이터를 교체함 → 명시적 확인창 + multi-store transaction 적용.
8. 실제 데이터에 demo 데이터를 섞을 수 있었음 → real data 존재 시 demo import 차단.
9. Gmail raw header 값에 CR/LF 방어가 없었음 → header sanitization 적용.
10. 기본 보안 response header 부재 → nosniff / DENY / referrer / permissions headers 추가.

## 자동 검증

- regression/static tests: **31/31 pass**
- JavaScript syntax checks: **pass**
- 핵심 정적 파일/버전 검사: **pass**
- 로고 홈 링크 정적 테스트: **pass**
- OAuth Client ID token isolation 정적 테스트: **pass**
- Form sync → rematch 정적 테스트: **pass**

## 아직 실제 환경에서 확인해야 하는 항목

1. Vercel production origin으로 Google OAuth Web Client 연결.
2. 실제 Google Form 질문 자동 매핑 + 기존 응답 재동기화.
3. 사용 중인 은행의 실제 CSV 인코딩/열명/중복 거래 형식.
4. 본인 Gmail로 최초 발송 1건 + 재발송 1건.
5. 백업 → 다른 브라우저 프로필에서 복원 smoke test.
6. 데스크톱/모바일에서 강의 히스토리 master-detail visual QA.

## 남아 있는 제품 보완 후보

### P1 — CS용 신청 정보 수동 수정
잘못 입력된 이메일/이름/강의를 관리자 화면에서 수정하고 변경 로그를 남기는 기능. 현재는 원본 Form 수정 + 재동기화에 더 의존합니다.

### P1 — 잘못 연결한 입금의 안전한 연결 해제/재연결
자동/수동 매칭이 잘못되었을 때 과거 로그를 남기면서 거래를 다시 풀 수 있는 보정 흐름. 재자동매칭 방지를 위한 ignore-pair 정책도 같이 설계해야 합니다.

### P1 — 은행 고유 거래 ID 지원
현재 CSV 중복 방지는 날짜+입금자명+금액 fingerprint와 occurrence를 사용합니다. 실제 CSV에 거래번호/거래 후 잔액 등 안정적인 고유 열이 있으면 그 값을 우선 사용해 동일 시각·동일 금액 거래를 더 정확하게 구분하는 편이 좋습니다.

### P2 — 자동매칭 최대 후행 기간
현재는 신청 전 허용일만 제한합니다. 오래된 미결 신청이 훨씬 나중의 동일 이름/동일 금액 거래와 매칭되는 것을 막으려면 `신청 후 최대 N일` 옵션을 둘 수 있습니다.

### P2 — Google 세션 연결 해제
Client ID 변경 외에도 현재 메모리 토큰을 사용자가 명시적으로 지우는 `Google 세션 초기화` 버튼을 제공하면 계정 전환이 더 명확합니다.

### P2 — Content Security Policy
CSP는 Google Identity Services 동작을 실제 production origin에서 검증한 뒤 추가하는 것이 안전합니다. 현재는 충돌 위험이 낮은 기본 보안 헤더만 적용했습니다.

## 자체평가

- 데이터 구조/비파괴 히스토리: 9.3/10
- 입금 매칭 안전성: 9.0/10
- Gmail 발송/재발송 상태관리: 8.8/10
- 강의별 CS 사용성: 9.1/10
- UI/접근성 정적 품질: 9.0/10
- 실환경 검증 수준: 7.3/10

**종합: 8.9/10**

실제 Vercel + OAuth + Form + 은행 CSV + Gmail 통합 테스트를 통과하고 P1 보정 기능 중 최소 `수동 신청정보 수정`과 `입금 연결 해제/재연결`을 넣으면 9.5/10 이상을 목표로 할 수 있습니다.

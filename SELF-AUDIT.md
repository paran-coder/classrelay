# ClassRelay v2.7.0 — Self Audit

## Scope
강의 중심 Google Form 연결 UX, 동기화 범위 구분, 메일 템플릿 강의 선택 UI, 전체 폭 발송로그, 사용자 가이드 전수 검수를 진행했습니다.

## Verified behavior
- 대시보드에서 `폼 추가`와 `전체 폼 동기화`를 바로 실행할 수 있습니다.
- 강의 히스토리에서는 `이 강의 폼 동기화`만 실행합니다.
- 새 강의 생성 직후 Google Form 연결을 이어갈 수 있습니다.
- Form 질문 매핑에서 강의 필드는 제외하고 연결된 강의를 authoritative course로 사용합니다.
- 같은 Form response는 다시 동기화해도 기존 입금/발송/CS 이력을 보존합니다.
- 서로 다른 response ID는 별도 신청 건으로 유지합니다.
- 전체 동기화는 사용 중 강의에 연결된 활성 Form만 대상으로 합니다.
- 기존 단일 Form 설정을 강의별 연결 배열로 마이그레이션할 수 있습니다.
- 과거 연결 이력이 있는 동일 Form은 새 강의에 재사용하지 못합니다.
- 기본 템플릿은 전용 템플릿이 없는 강의를 자동 적용 목록으로 보여줍니다.
- 전용 템플릿은 강의 리스트에서 행 단위로 선택합니다.
- 최근 발송 내역은 전체 폭 테이블로 표시하고 당시 발송 내용을 조회할 수 있습니다.
- `/guide`는 Form/OAuth/Gmail/YouTube 설명을 현재 구현과 맞춰 재작성했습니다.

## Automated QA
- `npm test`: **81/81 passed**
- `npm run check`: passed
- Static DOM duplicate IDs: 0
- Internal page/asset references: no missing files
- Core release files: no stale runtime version marker

## Design QA
- 관리자 화면에서 Form `추가`와 `동기화`를 별도 액션으로 구분했습니다.
- 전체/강의별 동기화 용어를 범위에 맞춰 분리했습니다.
- 템플릿 강의 선택은 큰 체크박스 대신 고밀도 리스트로 바꿨습니다.
- 발송로그는 좁은 2열 패널을 제거하고 전체 폭 정보 테이블로 구성했습니다.
- 키보드 focus, 44px급 주요 버튼, responsive table overflow 규칙을 기존 디자인 시스템과 함께 유지합니다.

## Still requires production-origin testing
- 실제 Google OAuth Client ID 권한 승인
- 2개 이상 강의 + 각기 다른 Form을 연결한 전체 폼 동기화
- 강의별 `이 강의 폼 동기화`
- 실제 Gmail 발송과 발송 당시 내용 조회
- 실제 은행 CSV 중복/자동매칭
- 모바일에서 템플릿 강의 리스트와 발송로그 테이블 확인

## Self score
**9.5 / 10**

구조/정적 회귀 테스트는 통과했습니다. 남은 0.5점은 Vercel production origin에서 실제 Google API와 브라우저 조작을 이용한 end-to-end 검증입니다.

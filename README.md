# ClassRelay v2.5.0

ClassRelay는 Google Form으로 받은 녹화본 신청과 은행 CSV 입금을 대조하고, 사용자의 Gmail로 녹화본 URL을 개별 발송하는 **local-first 관리자 웹앱**입니다.

- 회원가입/중앙 관리자 없음
- 중앙 DB 없음
- 운영 데이터는 브라우저 IndexedDB에 저장
- Google OAuth Client ID는 사용자 각자가 준비(BYO OAuth)
- Google Form / Gmail은 사용자의 Google 계정으로 직접 연결
- 은행 CSV는 브라우저에서 파싱하며 앱 서버에 업로드하지 않음

## v2.5.0 핵심 운영 안전성

v2.4.1 최종 QA에서 발견된 운영 위험 7건을 모두 보완했습니다.

1. **입금 자동매칭 기간 상한**
   - 기본: 신청 전 1일 ~ 신청 후 7일
   - 설정에서 전/후 허용일 변경 가능
   - 기간 밖 입금은 이름/금액이 같아도 자동확정하지 않음

2. **CSV 중복 판정 안정화**
   - 입금일시를 canonical 형식으로 정규화한 뒤 fingerprint 생성
   - 은행 고유번호/참조번호가 있으면 날짜·입금자명보다 우선해 중복 키로 사용

3. **Gmail 중복발송 방지**
   - 발송 전에 `SENDING` 상태를 먼저 저장
   - 네트워크 timeout/5xx처럼 Gmail 처리 여부가 애매한 경우 `발송 확인 필요`로 유지
   - 이런 신청은 자동 재발송에서 제외되고, 사용자가 수신 여부를 확인한 뒤 명시적으로 재발송해야 함
   - 같은 탭/다른 탭의 동시 발송을 operation lock으로 직렬화

4. **입금 매칭 원자성**
   - 신청자와 입금의 연결 상태를 하나의 IndexedDB readwrite transaction에서 함께 저장
   - 중간 실패 시 한쪽만 연결되는 상태를 줄임

5. **운영 이력 있는 신청의 강의 변경 보호**
   - 입금확인/연결입금/발송이력이 있는 신청의 강의를 바꾸면 전용 경고 확인창 표시
   - 기존/변경 강의, 가격, 연결 입금, 발송 이력을 확인한 뒤 `강의 변경 계속`을 눌러야 반영
   - 변경은 활동 로그에 남고 연결 입금의 `courseId`도 같은 transaction에서 이동

6. **사용 중지 강의 자동배정 제외**
   - 과거 CS를 위해 강의는 유지할 수 있지만 Google Form 신규 자동배정에는 사용하지 않음
   - 사용 중지 강의를 Form 응답이 명시적으로 요청해도 자동으로 다른 강의에 잘못 대체하지 않고 미배정/확인 대상으로 남김

7. **멀티탭 충돌 완화**
   - Web Locks API를 우선 사용해 고위험 쓰기 작업을 탭 간 직렬화
   - Web Locks가 없는 환경에서는 localStorage lease를 fallback으로 사용
   - BroadcastChannel로 다른 탭의 변경을 알려 최신 화면으로 갱신

## 자동 입금확정 조건

다음 조건을 **모두** 만족해야 자동으로 입금확인됩니다.

1. 정규화된 입금자명 100% 일치
2. 금액 100% 일치
3. 입금일이 설정된 허용 범위 안에 있음 (기본 신청 전 1일 ~ 신청 후 7일)
4. 신청자 후보 1명 ↔ 입금 후보 1건

유사 이름은 자동확정하지 않고 사람이 확인할 후보로만 표시합니다.

## 데이터 보존 원칙

- 다른 Google Form response ID = 별도 신청 건
- 같은 response ID 재동기화 = 기존 신청 건 비파괴 merge
- Form 재동기화로 입금/발송/재발송/CS 메모/수동 보정값을 초기화하지 않음
- CSV 추가 업로드는 기존 입금내역을 지우지 않고 신규 입금만 누적
- 수동으로 수정한 이름/이메일/강의는 Form 재동기화로 덮어쓰지 않음
- 운영 이력이 있는 강의는 삭제하지 않고 사용 중지 상태로 보존

## 검증 상태

- Node regression/static tests: **52/52 pass**
- JavaScript syntax check: **pass**
- 핵심 정적 파일/버전 검사: **pass**
- 사용자 노출 은행 용어: `입금` 중심으로 통일
- 로컬 Chromium smoke test: 현재 실행 환경 정책으로 localhost/file 접근이 차단되어 수행하지 못함
- 실제 Vercel Production URL에서 Google OAuth / Form / 실제 은행 CSV / Gmail end-to-end 테스트는 아직 필요

## 테스트 권장 순서

1. Vercel Production 배포
2. `/guide`, `/privacy`, 대시보드 렌더 확인
3. Google OAuth Web Client에 Production origin 등록
4. 테스트 Google Form 연결 및 응답 동기화
5. 샘플 은행 CSV 업로드 → 자동매칭/확인필요 검증
6. 본인 이메일 1건 Gmail 발송
7. 발송 후 Form 재동기화/CSV 재업로드 → 히스토리 보존 확인
8. `발송 확인 필요` 및 고위험 강의 변경 UI 점검
9. 백업 → 복원 smoke test
10. 두 탭을 열어 동시 작업 충돌 방지 확인

상세 사용법은 `/guide`와 `User manual.md`, 최종 검증 내용은 `SELF-AUDIT.md`를 참고하세요.

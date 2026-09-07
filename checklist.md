# ClassRelay v2.10.0 checklist

## v2.9.0 baseline / 작업 전
- [x] v2.9.0 전체 ZIP을 기준으로 v2.9.1 작업 폴더 재구성
- [x] context-notes.md / checklist.md / README.md / User manual.md 준비

## v2.9.0 baseline / 가이드 전면 개편
- [x] 초보자용 용어 설명 추가
- [x] Google Cloud 프로젝트 생성 클릭 경로 상세화
- [x] Forms API / Gmail API 사용 설정 상세화
- [x] Branding / Audience / Data Access / Clients 현재 메뉴 구조 반영
- [x] Test user 필수 단계와 403 오류 설명 강화
- [x] 실제 OAuth scope 3개 안내
- [x] Authorized JavaScript origin / Client ID 생성 상세화
- [x] ClassRelay Client ID 저장 위치 설명
- [x] 강의 생성 / Form 준비 / 편집 URL / 질문 매핑 상세화
- [x] Form 동기화 / CSV / 입금상태 상세화
- [x] 메일 템플릿 / Course-first 발송 상세화
- [x] CS / 재발송 / 백업 상세화
- [x] 처음부터 끝까지 전체 실습 챕터 추가
- [x] 공식 Google 문서 링크 재검수

## v2.9.0 baseline / 최종 QA
- [x] npm test — 103/103 통과
- [x] npm run check — 통과
- [x] 가이드 필수 문구/링크 정적 검사
- [x] 내부 asset/페이지 존재 검사
- [x] ZIP 무결성 검사

## v2.9.1 — Guide typography
- [x] 범위를 가이드 UI 타이포그래피로 한정
- [x] 가이드 타입 규칙 사전 정의: body 16 / support 15 / meta 12–13
- [x] 실제 설명문 12–14px 전수 조정
- [x] 핵심 지시문 색상을 ink 계열로 상향
- [x] 카드/알림/단계 박스 여백을 새 글자 크기에 맞게 조정
- [x] 모바일 본문 최소 15px 이상 유지
- [x] 데스크톱 Chromium 시각 QA — 1440×1000
- [x] 모바일 Chromium 시각 QA — 390×844, document overflow 없음
- [x] npm test 104/104 / npm run check 통과
- [x] ZIP 필수 파일 무결성 확인


## v2.9.2 — Google onboarding 실제 화면 보강
- [x] v2.9.1 전체 ZIP을 기준으로 v2.9.2 작업 폴더 재구성
- [x] context-notes.md / checklist.md / README.md / User manual.md에 작업 범위 선반영
- [x] 개인 Gmail = 외부 선택 → 다음 클릭 절차 반영
- [x] 대상 → 테스트 사용자 → Add users → 본인 Gmail → 저장 위치 설명 강화
- [x] Data Access를 범위 직접 추가 방식으로 재작성
- [x] scope 3개를 일반 텍스트 + 복사 버튼으로 변경
- [x] OAuth Client 생성 완료 팝업 → Client ID 확인/복사 → 확인 클릭 추가
- [x] Client Secret 미사용 안내를 생성 팝업 단계에 배치
- [x] `Google에서 확인하지 않은 앱` → 본인 Test user 확인 → 계속 절차 추가
- [x] Forms 권한 2개/모두 선택 → 아래로 스크롤 → 계속 절차 추가
- [x] 이후 계정 선택 화면이 나오면 Test user 계정 선택 안내
- [x] 정적 회귀 테스트 추가/갱신
- [x] npm test / npm run check 통과
- [x] 데스크톱·모바일 가이드 렌더 QA
- [x] ZIP 전체 파일 무결성 확인

## v2.9.2 QA 결과
- [x] npm test — 106/106 통과
- [x] npm run check — 전체 JavaScript syntax 통과
- [x] 실제 렌더 계산값: desktop 1440/1440, mobile 390/390으로 document 가로 overflow 없음
- [x] 실제 렌더 계산값: H3 20px desktop / 19px mobile, 행동 본문 16px, scope code 13px
- [x] OAuth scope 복사 버튼 3개 렌더, scope URL 링크 0개 확인
- [x] app/core/google/coordination/icons 런타임 파일은 v2.9.1과 hash 동일; db.mjs는 backup appVersion만 v2.9.2로 변경

## v2.10.0 — 운영 로직 수정
- [x] v2.9.2 전체 ZIP 기준으로 v2.10.0 작업 폴더 재구성
- [x] context-notes.md / checklist.md / README.md / User manual.md에 작업 범위 선반영
- [x] 강의 저장에서 녹화본 URL 필수 제거, 가격 필수 검증 추가
- [x] 강의 모달 라벨을 `녹화본 URL (선택)`으로 변경하고 일반 안내메일 가능 설명 추가
- [x] Form 질문 매핑에서 결제금액 제거
- [x] 신규 신청 금액을 연결 강의 가격으로 자동 스냅샷 저장
- [x] 재동기화 시 기존 신청 금액 보존
- [x] 발송 가능 조건에서 전역 녹화본 URL 필수 제거
- [x] `{{녹화본URL}}`을 사용하는 템플릿만 URL 필요 검증
- [x] 메일/활동로그의 녹화본 전용 문구를 일반 메일 중심으로 정리
- [x] 가이드 / User Manual 운영 설명 갱신
- [x] 관련 core/static 회귀 테스트 추가 및 기존 테스트 갱신
- [x] npm test / npm run check 통과
- [x] 주요 UI 실제 렌더 QA
- [x] ZIP 필수 파일/CRC 무결성 검사

## v2.10.0 QA 결과
- [x] `npm test` — 110/110 통과
- [x] `npm run check` — 전체 JavaScript syntax 통과
- [x] 강의 생성 검증 단위 테스트: 녹화본 URL 없이 강의명+가격만으로 유효
- [x] Form 응답 매핑 테스트: 결제금액 질문을 무시하고 amount=0으로 반환, sync에서 course.price 주입
- [x] 재동기화 테스트: 기존 양수 신청 금액 보존, 기존 금액이 0인 레거시 건만 강의 가격으로 보완
- [x] 발송 테스트: 일반 템플릿은 URL 없이 가능, `{{녹화본URL}}` 템플릿은 URL 없으면 차단
- [x] Playwright 시각 QA harness: 강의 추가/질문 매핑 desktop 1440×1000, mobile 390×844, horizontal overflow 0

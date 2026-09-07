# ClassRelay v2.9.0

ClassRelay는 Google Form 신청자와 은행 입금 CSV를 대조한 뒤, 입금이 확인된 신청자에게 강의별 녹화본 링크를 Gmail로 발송하고 CS 히스토리를 로컬에 보존하는 local-first 웹앱입니다.

## v2.9.0 변경 범위

이번 버전은 애플리케이션 운영 로직을 변경하지 않고 `/guide`를 완전 초보자용 튜토리얼로 전면 재작성한 문서/UX 버전입니다.

- Google Cloud를 처음 쓰는 사용자를 위한 용어 설명 추가
- `프로젝트 → Forms/Gmail API → Branding → Audience → Data Access → Clients`를 실제 클릭 경로로 세분화
- Test user 등록과 `403 access_denied` 해결 절차 상세화
- 실제 사용 scope 3개를 Data Access에서 추가하는 방법 안내
- Authorized JavaScript origins와 Client ID 생성 과정을 초보자 기준으로 상세화
- ClassRelay에 Client ID를 저장하는 위치와 완료 상태 안내
- 강의 생성, 추천 Google Form 질문 구성, 긴 `/edit` URL 복사 방법 상세화
- Form 질문 매핑, 전체/개별 동기화, CSV 열 매핑, 자동매칭 상태 설명 보강
- Course-first Gmail 발송과 발송로그 확인을 단계별로 재작성
- CS/재발송/백업 절차 상세화
- `테스트 강의 → Form → 테스트 CSV → 본인 Gmail 발송` 전체 실습 챕터 추가
- Google 공식 문서 링크를 최신 메뉴 구조 기준으로 재검수

## 핵심 운영 원칙

### 강의 중심 Form 연결

- 새 강의를 만들고 해당 강의의 새 Google Form 편집 URL을 연결합니다.
- 대시보드의 `폼 추가`는 새 Form 연결, `전체 폼 동기화`는 활성 강의 Form 전체 갱신입니다.
- 강의 히스토리의 `이 강의 폼 동기화`는 현재 강의 Form만 갱신합니다.
- 재동기화해도 기존 입금·발송·CS 히스토리는 초기화하지 않습니다.

### Course-first Sending

메일 발송은 항상 **강의 → 발송 가능 대상 → 선택 → 최종 확인 → 발송** 순서로 진행합니다.

- 한 번의 발송 작업에는 하나의 강의만 포함됩니다.
- 강의 히스토리에서는 현재 강의를 그대로 유지한 채 발송 대상으로 진입합니다.
- 발송 직전 강의명, 인원, 템플릿, 녹화본 URL, 제목을 다시 확인합니다.

## 저장 및 개인정보

신청자, 입금, 템플릿, 발송로그는 중앙 DB가 아니라 사용자의 브라우저 IndexedDB에 저장합니다. Google Access Token은 영구 저장하지 않습니다.

## 검증

`npm test`와 `npm run check`로 핵심 로직과 정적 회귀 검사를 실행할 수 있습니다.

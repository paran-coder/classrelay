# ClassRelay v2.8.5

ClassRelay는 Google Form 신청자와 은행 입금 CSV를 대조한 뒤, 입금이 확인된 신청자에게 강의별 녹화본 링크를 Gmail로 발송하고 CS 히스토리를 로컬에 보존하는 local-first 웹앱입니다.

## v2.8.5 변경 범위

이번 버전은 Google 연결 초기 설정에서 실제 테스트 중 발견된 두 가지 마찰을 보완하는 패치입니다.

- Google Form 편집 URL에서 `/forms/u/N/d/.../edit` 계정 경로 지원
- `forms.gle` 축약 링크 및 `/viewform` 응답자 링크 입력 시 긴 편집 URL이 필요하다고 명확히 안내
- Form 연결 모달에 지원 URL 예시와 비지원 링크 안내 추가
- OAuth 설정 화면에 `Testing` 상태의 `Test users` 등록 필수 안내 추가
- `/guide`의 Test user 단계와 `403 access_denied` 문제 해결 설명 강화
- 기존 Form/입금/Gmail/CS/DB 로직은 변경하지 않음


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

## 주요 기능

- 강의별 Google Form 연결 및 전체/개별 동기화
- Form response ID 기반 비파괴 병합
- 은행 CSV 누적 가져오기 및 이름+금액+날짜 기반 보수적 자동매칭
- 여러 메일 템플릿 / 기본 템플릿 / 강의별 전용 템플릿
- Gmail `gmail.send` 기반 개별 발송
- 발송 당시 제목·본문·녹화본 URL snapshot 보존
- 강의별 CS 히스토리, 재발송, CS 메모
- IndexedDB local-first 저장 / JSON 백업·복원
- BYO Google OAuth Client ID

## 저장 및 개인정보

신청자, 입금, 템플릿, 발송로그는 중앙 DB가 아니라 사용자의 브라우저 IndexedDB에 저장합니다. Google Access Token은 영구 저장하지 않습니다.

## 검증

`npm test`와 `npm run check`로 핵심 로직과 정적 회귀 검사를 실행할 수 있습니다.


## 기존 Metric Card consistency (v2.8.4에서 확립)

KPI values remain `#141414`. `#2563EB` is reserved for drill-down labels, focus and active selection; only active in-place filter cards use the `#EFF4FF` soft-blue selected surface. Primary actions and semantic state colors are unchanged.

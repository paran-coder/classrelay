# ClassRelay v2.8.5 context notes

## 이번 버전 범위
- Google Form URL 입력 지원/오류 안내 보강
  - 긴 편집 URL `/forms/d/.../edit` 지원 유지
  - 계정 경로가 포함된 `/forms/u/0/d/.../edit`, `/forms/u/1/d/.../edit` 등 지원
  - `forms.gle` 축약 링크와 `/viewform` 응답자 링크는 편집 URL 안내와 함께 명확히 거절
- Google OAuth Testing 상태의 Test user 등록 안내 강화
  - 설정 화면 Client ID 영역에 `403 access_denied` 예방 안내 노출
  - 사용자 가이드의 Test user 단계를 필수 경고로 강화
- 위 두 항목 외 기능/데이터 구조/메일/입금 로직은 변경하지 않음

## 작업 기준
- v2.8.4 전체 ZIP을 기준으로 재구성
- 기존 IndexedDB/발송/Form 히스토리 구조 유지
- 수정 후 전체 테스트와 필수 파일 포함 ZIP 검증

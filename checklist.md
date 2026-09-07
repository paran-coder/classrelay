# ClassRelay v2.8.5 checklist

## 시작 전
- [x] v2.8.4 전체 ZIP을 기준으로 v2.8.5 작업 폴더 재구성
- [x] context-notes.md 갱신
- [x] checklist.md 갱신
- [x] README.md 갱신
- [x] User manual.md 갱신

## Google Form URL
- [x] `/forms/d/.../edit` 기존 지원 유지
- [x] `/forms/u/N/d/.../edit` 지원
- [x] `forms.gle` 축약 링크에 긴 편집 URL 안내
- [x] `/viewform` 응답자 링크에 편집 URL 안내
- [x] Form 연결 모달에 지원/비지원 URL 안내 표시
- [x] URL 파서 회귀 테스트 추가

## OAuth Test user
- [x] 설정 화면 OAuth Client ID 영역에 Test user 필수 안내
- [x] 가이드 Google Cloud 단계의 Test user 경고 강화
- [x] 문제 해결 `403 access_denied` 문구 강화

## QA
- [x] npm test
- [x] npm run check
- [x] 핵심 정적 파일/내부 asset 검사
- [x] 전체 ZIP 필수 파일 포함 확인

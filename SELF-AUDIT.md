# ClassRelay v2.8.5 — Self Audit

## 변경 범위
이번 버전은 실제 초기 연결 테스트에서 확인된 두 항목만 수정했습니다.

1. Google Form URL 입력 호환성/오류 안내
2. OAuth Testing 상태의 Test user 등록 안내 강화

신청자, 입금 자동매칭, Course-first 발송, Gmail, 템플릿, CS 히스토리, IndexedDB 구조는 변경하지 않았습니다.

## Google Form URL 검증
- `/forms/d/FORM_ID/edit` → 지원
- `/forms/u/0/d/FORM_ID/edit` → 지원
- `/forms/u/12/d/FORM_ID/edit?...` → 지원
- `forms.gle/...` → 축약 주소임을 명시하고 긴 편집 URL 안내
- `/forms/d/e/.../viewform` 또는 `/viewform` → 응답자용 링크임을 명시하고 `/edit` URL 안내
- Form 연결 모달에 지원 예시 및 비지원 링크 안내 노출

## OAuth Test user 검증
- 설정 → Google OAuth 영역에 `Testing 상태라면 Test user 등록이 필수` 경고 노출
- Google Auth Platform → Audience → Test users 경로 안내
- 누락 시 `403 access_denied`가 발생할 수 있음을 앱과 가이드 양쪽에 표시
- 가이드 Google Cloud 5단계를 `필수`로 강화
- 문제 해결 FAQ의 403 항목을 Test users 우선 확인 흐름으로 강화

## 자동 검증
- `npm test`: **98/98 통과**
- `npm run check`: 통과
- Google Form URL 신규 회귀 테스트 통과
- OAuth 설정/가이드 문구 정적 테스트 통과
- 기존 운영 로직 회귀 테스트 통과

## 패키지 검증
배포 ZIP에서 다음 필수 항목을 확인합니다.
- `index.html`
- `assets/` 전체 런타임 모듈/CSS
- `guide/index.html`
- `privacy/index.html`
- `tests/`
- `package.json`
- `vercel.json`
- `classrelay-og-1200x630.png`

## 자체평가
**9.7 / 10**

이번 두 오류/안내 문제는 테스트로 재현·고정했습니다. 남은 0.3점은 실제 Google 권한창과 실제 Form 편집 URL을 Vercel 배포본에서 다시 연결해 확인하는 end-to-end 검증입니다.

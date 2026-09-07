# ClassRelay v2.9.0 — Self Audit

## 변경 범위
- 앱 기능/DB/Form/Gmail 로직은 변경하지 않음
- `/guide`를 완전 초보자용 클릭 따라하기 튜토리얼로 전면 재작성
- 초보자용 가이드 스타일 컴포넌트만 CSS에 추가

## 검수 기준
- Google 공식 최신 문서 기준 메뉴 구조: Branding / Audience / Data Access / Clients
- 앱 실제 OAuth scope와 가이드 scope 일치 확인
- 앱 실제 버튼명과 가이드 운영 흐름 일치 확인
- 긴 Form 편집 URL과 비지원 links 안내 일치 확인
- 입금 중심 사용자 용어 유지

## 자동 검증
- `npm test`: 103/103 통과
- `npm run check`: 전체 JavaScript syntax 통과
- 필수 런타임 파일/페이지/OG 이미지 포함 검사 통과
- guide/index.html 중복 ID 검사 통과
- 로컬 내부 링크 대상 검사 통과
- CSS brace balance 검사 통과

## 남은 실제 환경 검증
- Vercel 배포 후 모바일/데스크톱에서 긴 가이드의 가독성
- Google Cloud 실제 화면이 계정/언어별로 다르게 표시되는 경우의 문구 차이
- 완전 초보 사용자 1명이 문서만 보고 끝까지 설정 가능한지 사용자 테스트

## 자체평가
9.6 / 10

가이드의 상세도와 실제 앱 일치성은 크게 개선됐습니다. 남은 점수는 실제 초보 사용자 관찰 테스트가 필요하기 때문입니다.

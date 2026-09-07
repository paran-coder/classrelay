# ClassRelay v2.9.1 — Self Audit

## 변경 범위
- 앱 기능/DB/Form/Gmail 로직은 변경하지 않음
- `/guide` 문서 전용 타이포그래피 위계와 색상 대비를 조정
- 모바일 문서 가로 overflow 및 긴 URL wrap 문제 수정
- wide table은 해당 컨테이너 내부 가로 스크롤만 유지

## 검수 결과
- 핵심 본문/행동 설명: 16px / ink-soft
- 보조 설명, 성공 기준, 주의, 팁, 카드 설명: 15px
- source / TOC / meta: 12–13px
- Step H3: 20px desktop / 19px mobile
- Section H2: 26px desktop / 24px mobile
- TOC touch target: 44px 이상

## 실제 렌더 QA
Playwright + Chromium으로 CSS를 실제 렌더해 desktop 1440×1000, mobile 390×844을 확인했다. 모바일 문서 전체 scrollWidth가 390px로 viewport와 일치하며, 표만 내부 스크롤된다. 핵심 설명 글자는 모바일에서도 15px 아래로 줄어들지 않는다.

## 자동 검증
- `npm test`: 104/104 통과
- `npm run check`: 전체 JavaScript syntax 통과
- typography/mobile overflow 정적 회귀 테스트 추가
- 앱 운영 로직 및 IndexedDB schema 변경 없음

## 자체평가
9.8 / 10

이번 패치는 사용자가 지적한 실제 가독성 문제를 UI QA로 확인하고 수정했다. 0.2점은 실제 Vercel 환경 및 다양한 모바일 브라우저의 폰트 렌더링 차이를 아직 직접 확인하지 못한 점에 남긴다.

# ClassRelay v2.8.3 — Self Audit

## Scope
v2.8.2의 기능·데이터 로직을 유지하고 KPI/드릴다운 카드의 색 역할과 selected state를 전 화면에서 통일했습니다.

## Verified changes
- Dashboard KPI anchor가 글로벌 link accent를 상속해 숫자까지 파랗게 보이던 원인을 수정했습니다.
- KPI 숫자는 모든 Metric Card 상태에서 `--ink`를 유지합니다.
- drill-down 액션 라벨만 `--interaction-accent`를 사용합니다.
- Payments / Course History처럼 실제 in-place filter가 있는 화면만 active 카드에 soft-blue surface + blue border를 사용합니다.
- Dashboard는 이동형 KPI이므로 어떤 카드도 selected surface를 갖지 않습니다.
- Metric Card hover/focus/active 규칙을 공통 CSS에 중앙화했습니다.

## Automated QA
- `npm test`: **95/95 passed**
- `npm run check`: **passed**
- Static DOM duplicate IDs: **0**
- Internal local asset references missing: **0**
- CSS brace balance: **passed (449 / 449)**

## Still requires production visual check
- Dashboard와 Payments의 숫자/링크 색 역할이 실제 렌더에서도 동일하게 보이는지
- Course History active filter 카드의 soft-blue 강도가 과하지 않은지
- keyboard focus ring과 selected border가 충돌하지 않는지

## Self score
**9.7 / 10**


기능/DB/Form/Gmail 로직에는 변경이 없으며, 남은 0.3점은 실제 Vercel 렌더에서 Dashboard/Payments/Course History의 visual consistency를 눈으로 확인하는 단계입니다.

# ClassRelay v2.8.4 — UI Review

## Review target
Dashboard와 입금 관리 스크린샷에서 동일한 Metric Card가 서로 다른 색 문법을 사용하던 문제를 정리했습니다.

## Issue
- Dashboard의 KPI는 anchor 요소라 글로벌 blue link color를 상속해 숫자까지 파랗게 보였습니다.
- Payments의 KPI는 button 요소라 숫자가 ink로 보였고, 선택 카드만 soft-blue였습니다.
- 결과적으로 `파랑 = 링크`인지 `파랑 = 선택`인지 의미가 화면마다 달라졌습니다.

## Resolved visual rule
- **Data value = ink black**
- **Drill-down affordance = blue**
- **Current in-place filter = soft-blue surface + blue border**
- **Operational result = semantic green/amber/red**
- Dashboard는 navigation-only metric이므로 active surface를 표시하지 않습니다.

이 규칙은 Frontend Forge의 dashboard/admin 원칙인 높은 정보 명확성, 낮은 장식성, 명시적 interaction state를 우선합니다.

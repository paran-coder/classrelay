# ClassRelay v2.8.5 — UI Review

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


## v2.8.5 초기 설정 안내
- Form URL 입력 필드에 긴 편집 URL과 비지원 링크를 바로 설명해 오류 후 학습 비용을 줄였습니다.
- OAuth Client ID 영역에 Testing/Test user 경고를 설정 화면에서 직접 노출해 가이드 왕복을 줄였습니다.
- 기능 화면의 기존 시각 시스템은 변경하지 않았습니다.

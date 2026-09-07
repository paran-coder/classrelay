# ClassRelay v2.9.1 — UI Review

## Surface classification
`/guide`는 관리자 대시보드가 아니라 **Docs / knowledge surface**다. 장식보다 readability, navigation, stable layout을 우선한다. 기존 ClassRelay 색상/형태 언어는 유지하되 관리자 화면의 12~14px 밀도를 그대로 가져오지 않는다.

## Final typography hierarchy
| Role | Desktop | Mobile | Color role |
|---|---:|---:|---|
| Hero H1 | 36px | 32px | ink |
| Section H2 | 26px | 24px | ink |
| Step H3 | 20px | 19px | ink |
| 핵심 본문/행동 단계 | 16px | 16px | ink-soft |
| 카드/용어/성공/주의/팁 | 15px | 15px | ink-soft + semantic label |
| TOC / source / meta | 12–13px | 12–13px | muted 또는 ink |

핵심 행동 설명에는 `--muted`를 사용하지 않는다. 성공/주의 박스는 박스 전체 글자를 초록/갈색으로 칠하지 않고, 본문은 ink-soft로 읽히게 하고 제목/강조만 semantic 색상을 사용한다.

## Visual QA
- Chromium 실제 렌더로 1440×1000 desktop, 390×844 mobile을 검수했다.
- desktop 문서 scrollWidth = clientWidth로 수평 overflow 없음.
- mobile 문서 scrollWidth = clientWidth = 390px로 수평 overflow 없음.
- 680px 폭이 필요한 비교 표는 `.owner-table` 내부에서만 `overflow:auto`로 스크롤하며 문서 폭을 늘리지 않는다.
- 긴 Google Form URL/code는 narrow viewport에서 wrap된다.
- TOC touch target은 최소 44px 높이로 상향했다.
- mobile에서 H2/H3만 완만하게 축소하고 본문 16px/보조 15px은 유지한다.

## Review result
타이포 위계와 설명 가독성은 v2.9.0보다 명확하게 개선됐다. 초보자가 실제로 따라 해야 하는 문장과 부가 정보가 크기·색상으로 구분된다. 남은 검증은 실제 Vercel 폰트 렌더링과 초보 사용자 관찰 테스트다.

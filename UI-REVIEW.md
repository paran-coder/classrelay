# ClassRelay v2.5.1 UI / Interaction Review

## Product surface

ClassRelay is an operational admin tool, so the UI prioritizes dense clarity, status readability, and safe actions over marketing-scale decoration.

## Current hierarchy

- page title: 28px
- KPI value: ~30px
- section title: 20px
- card title: 16px
- body: 15px
- table/support: 14px
- metadata: 12–13px

The visual system keeps the earlier neutral canvas, restrained borders, rounded surfaces, pill controls, and minimal shadow approach while retaining semantic success/warning/danger states for operational clarity.

## KPI lifecycle order

When all six applicant lifecycle metrics are shown together, the fixed sequence is:

`전체 신청 → 입금확인 → 입금대기 → 확인필요 → 발송가능 → 발송완료`

Metrics drill down to the underlying records rather than acting as decorative counters.

## v2.5.1 new safety states

### Gmail
- `발송중`: a send attempt has been persisted before the Gmail request completes.
- `발송 확인 필요`: the remote result is ambiguous; automatic resend is blocked.
- Explicit `확인 후 재발송` action uses danger emphasis and a duplicate-send warning.

### Course correction
For applications with payment/delivery history, course changes use a dedicated confirmation surface showing:
- old course and price
- new course and price
- linked deposit
- delivery history
- price mismatch warning when applicable

### Inactive courses
Inactive courses remain visible where historical CS needs them, but are clearly labeled `사용 중지` and are not used in new Form auto-assignment.

## Multi-tab interaction

External writes from another tab trigger refresh when no modal is open. If a modal is open, ClassRelay defers the refresh and notifies the operator after the current interaction closes. Stale applicant edits are rejected rather than silently overwriting newer data.

## QA status

- automated/static tests: 56/56 pass
- JavaScript syntax: pass
- browser-local runtime smoke: blocked by the execution environment's localhost/file navigation policy
- final visual completion still requires deployed Vercel desktop/mobile review


## v2.5.1 master-detail review
- 강의 히스토리와 신청자 목록에서 행 자체가 상세 패널의 선택 컨트롤 역할을 합니다.
- 별도 보기 버튼을 제거해 반복 액션 chrome을 줄였습니다.
- 선택 상태는 중성 배경 + 왼쪽 ink indicator로 표시하며 keyboard focus도 별도로 보입니다.
- 1180px 이하에서는 기존 규칙대로 상세 패널이 목록 아래로 이동합니다.

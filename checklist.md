# ClassRelay v2.5.1 Checklist

- [x] 강의 히스토리 행 전체 선택
- [x] 선택 행 강조/aria-selected
- [x] CS 확인 버튼 제거
- [x] 신청자 master-detail 적용
- [x] 체크박스 클릭과 행 선택 충돌 방지
- [x] 검색/필터 후 첫 결과 자동 선택
- [x] 키보드 Enter/Space 선택
- [x] 모바일 단일 열 전환 확인
- [x] 정적/핵심 테스트 통과
- [x] 문서/버전 갱신

# ClassRelay v2.5.1 Checklist

## Required project docs
- [x] context-notes.md updated
- [x] checklist.md updated
- [x] README.md updated
- [x] User manual.md updated

## Risk 1 — payment date upper bound
- [x] Add `matchAfterDays` setting
- [x] Default to 7 days after application
- [x] Keep default 1 day before application
- [x] Reject too-late payments from automatic matching
- [x] Add boundary regression tests

## Risk 2 — CSV duplicate reliability
- [x] Canonicalize parsable payment date for fingerprinting
- [x] Add optional bank unique/reference ID field
- [x] Prefer bank ID in fingerprint when present
- [x] Recompute existing fingerprints during duplicate comparison for legacy rows
- [x] Add date-format equivalence test

## Risk 3 — Gmail duplicate-send mitigation
- [x] Persist send-attempt state before Gmail API call
- [x] Add `발송중` state
- [x] Add `발송 확인 필요` state for ambiguous network/5xx result
- [x] Exclude ambiguous delivery from automatic resend/ready queue
- [x] Require explicit user action for resend after uncertain result
- [x] Add same-tab send guard
- [x] Run Gmail send inside cross-tab operation lock
- [x] Preserve previous successful delivery history on later failure/uncertainty

## Risk 4 — matching atomicity
- [x] Add multi-store `atomicWrite()` to IndexedDB layer
- [x] Automatic applicant/payment linking uses one readwrite transaction
- [x] Manual payment link uses atomic write
- [x] Course move with linked payment uses atomic write

## Risk 5 — protected course changes
- [x] Detect payment/sending history before course change
- [x] Show dedicated high-risk warning modal
- [x] Display old/new course, price, linked payment, send history
- [x] Require explicit `강의 변경 계속`
- [x] Record change in activity log

## Risk 6 — inactive course auto-assignment
- [x] Auto-resolve only active courses
- [x] Exclude inactive default course
- [x] Explicit inactive course response does not silently fall through to another course
- [x] Keep inactive course selectable for historical manual CS correction

## Risk 7 — multi-tab coordination
- [x] Add Web Locks operation lock
- [x] Add localStorage lease fallback
- [x] Add BroadcastChannel change notifications
- [x] Refresh after external change when safe
- [x] Detect stale applicant-edit snapshot
- [x] Re-read fresh DB state inside high-risk operations

## Regression / QA
- [x] Automated tests: 56/56 pass
- [x] JavaScript syntax check including coordination module
- [x] Core version/static checks
- [x] User-facing bank terminology remains deposit-oriented
- [x] Guide updated to 1-day-before / 7-days-after default
- [ ] Production Vercel render smoke test
- [ ] Real Google OAuth test
- [ ] Real Google Form sync test
- [ ] Real bank CSV integration test
- [ ] Real Gmail send + resend test
- [ ] Browser backup/restore smoke test
- [ ] Two-tab production coordination smoke test
- [ ] Desktop/mobile visual QA on deployed URL


## v2.5.1 Final QA
- [x] 56/56 tests pass
- [x] npm run check pass
- [x] duplicate static DOM IDs: 0
- [x] broken internal static references: 0
- [x] app/guide/manual `CS 확인` legacy interaction wording removed

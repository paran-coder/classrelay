# ClassRelay v2.6.2 — Operational Risk Status

## Resolved in the v2.5.x baseline
- Payment match date upper/lower bounds.
- CSV duplicate normalization / bank reference preference.
- Gmail in-flight / uncertain-delivery protection.
- Atomic applicant-payment writes.
- High-risk course-change confirmation.
- Inactive-course auto-assignment exclusion.
- Multi-tab write coordination.

## Template-specific risks addressed in v2.6.2
1. **Schema migration regression** — no new IndexedDB store is required.
2. **Downgrade VersionError after testing v2.6.0** — DB opens without a forced version.
3. **Previously-created v2 template records** — optional orphan store is recoverable into settings.
4. **Deleting a linked template** — course links are cleared and default fallback is used.
5. **Changing templates after an old send** — successful delivery stores rendered snapshot.
6. **Blank-screen startup failure** — startup recovery UI is shown without deleting local data.
7. **Older v2.6.0 backup with template store** — restore migrates template records into settings.

## Template creation risks addressed in v2.6.2
- `추가`가 사실상 `복제`처럼 동작하던 UX를 제거했습니다.
- 강의 연결 충돌은 명시적 확인 없이 덮어쓰지 않습니다.
- 확인 이후 다른 탭에서 연결이 변경되면 재검증 실패로 저장을 중단합니다.
- 신규 템플릿과 선택 강의 연결은 같은 IndexedDB transaction으로 저장합니다.

## Still requires real-environment testing
- Gmail API actual send and snapshot content.
- Google OAuth on production origin.
- Browser persistence after reload.
- Existing browser that already opened the abandoned template-schema build.

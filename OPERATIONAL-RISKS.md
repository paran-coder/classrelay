# ClassRelay v2.5.0 — Operational Risk Resolution

The seven operational risks identified in the v2.4.1 pre-test audit were explicitly approved for correction and are addressed in v2.5.0.

| # | Risk | v2.5.0 status | Resolution |
|---|---|---|---|
| 1 | No upper payment-date bound | Resolved | Default auto-match window is application -1 day through +7 days; both limits configurable. |
| 2 | CSV duplicate key depends on raw date string | Resolved | Canonicalized date fingerprint + optional bank unique/reference ID priority. |
| 3 | Gmail duplicate sends after concurrent/ambiguous delivery | Mitigated | Pre-send state, cross-tab lock, uncertain-delivery state, no automatic retry. |
| 4 | Applicant/payment updates were non-atomic | Resolved | Multi-store IndexedDB `atomicWrite()` used for matching/linking. |
| 5 | High-risk course move lacked confirmation | Resolved | Dedicated second confirmation with payment/send/price context. |
| 6 | Inactive courses could receive new Form assignment | Resolved | Auto-assignment only considers active courses; explicit inactive request is not silently redirected. |
| 7 | Multi-tab overwrite risk | Mitigated | Web Locks + lease fallback + BroadcastChannel + fresh-state/stale-edit checks; unrelated same-tab operations no longer bypass the lock. |

## Residual operational considerations

These are not the previously identified unfixed risks; they are integration realities that must be validated after deployment.

- Bank CSV formats differ by bank, encoding, and exported column names. Test the actual bank file before production use.
- Google OAuth permissions and consent depend on the user's own Cloud project configuration.
- Gmail remote delivery can be intrinsically ambiguous on network failure. ClassRelay deliberately pauses in `발송 확인 필요` rather than automatically retrying.
- Local-first data can be lost if browser site data is cleared; regular backup remains required.
- Browser support for Web Locks varies; fallback coordination exists, but deployed multi-tab testing is still required.

See `SELF-AUDIT.md` for the remaining integration test gate.

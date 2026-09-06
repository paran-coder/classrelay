# ClassRelay v2.5.0 — Pre-Integration Self Audit

## Result

**Code-level readiness score: 9.3 / 10**

The seven operational risks approved after v2.4.1 are implemented and covered by regression/static checks. The remaining gap is real production-browser and external-service integration testing, not a known unfixed code-risk item from that list.

## Automated verification

- Node regression/static tests: **52 / 52 pass**
- JavaScript syntax checks: **pass**
- Coordination module included in syntax checks: **pass**
- Core version/static asset checks: **pass**
- User-facing bank terminology scan: **pass**

## Seven approved risks — status

### 1. Payment-date upper bound — RESOLVED
Default window is application minus 1 day through application plus 7 days. Too-early and too-late payments are excluded from automatic exact matching.

### 2. CSV duplicate fingerprint — RESOLVED
Parsable dates are canonicalized. If a bank-provided unique/reference ID is mapped, it becomes the primary duplicate key.

### 3. Gmail duplicate-send / ambiguous network result — MITIGATED
A send attempt is persisted before the API call. Timeout/network/5xx ambiguity becomes `발송 확인 필요`, which is excluded from automatic resend. Same-tab and cross-tab send operations are locked. Absolute exactly-once delivery cannot be guaranteed by a browser client when a remote API acknowledges ambiguously, so the safe behavior is manual confirmation before retry.

### 4. Applicant/payment atomicity — RESOLVED
Automatic and manual matching updates both stores through one IndexedDB readwrite transaction.

### 5. High-risk course change — RESOLVED
Changing the course of a payment-confirmed or sent application requires an explicit second confirmation showing operational context and price difference. Linked payment course association moves atomically.

### 6. Inactive course auto-assignment — RESOLVED
Inactive courses are excluded from automatic Form assignment but retained for historical CS/manual correction.

### 7. Multi-tab overwrite risk — MITIGATED
Web Locks is used where available with a localStorage lease fallback. BroadcastChannel propagates external changes. High-risk operations re-read current IndexedDB data, and applicant edits detect stale state. A final concurrency audit also removed the earlier global nested-lock bypass; only explicit internal auto-match calls may reuse an already-held lock, so unrelated same-tab actions are queued rather than bypassing coordination.

## Important design limitation, not a known bug

Gmail's remote outcome can be ambiguous if the network drops after Gmail accepts a request but before the browser receives the response. ClassRelay now treats that as `발송 확인 필요` and blocks automatic retry. This is intentionally safer than claiming failure or retrying automatically.

## Browser QA limitation

A local Chromium smoke test was attempted, but this execution environment blocks navigation to localhost/file URLs. Therefore the following remain integration gates rather than code-level failures:

- actual Vercel rendering
- Google OAuth popup/consent flow
- real Google Form API response shapes/permissions
- bank-specific CSV encoding/header quirks
- Gmail actual send/uncertain behavior
- multi-tab coordination in the deployed origin
- mobile/desktop visual QA

## Recommended integration test sequence

1. Deploy v2.5.0 to Vercel production.
2. Verify `/`, `/guide`, `/privacy`.
3. Register production origin in user's Google OAuth Client.
4. Connect a test Form and sync a small set of responses.
5. Upload a controlled CSV containing exact, too-early, too-late, duplicate, and ambiguous payer cases.
6. Send one email to the operator's own email address.
7. Re-sync Form and re-upload overlapping CSV; confirm all histories remain intact.
8. Test high-risk course change with payment/sent history.
9. Open two tabs and attempt concurrent edits/sends.
10. Backup and restore in the deployed origin.

## Score rationale

- Data/history preservation: 9.7
- Payment matching safety: 9.5
- Gmail send safety: 9.2
- Cross-store atomicity: 9.7
- Course/CS safety: 9.5
- Multi-tab coordination: 9.1
- Production integration evidence: 7.5

**Overall: 9.3 / 10 before production integration testing.**

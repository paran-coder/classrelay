# ClassRelay v2.4.1 — Operational Risks Requiring Approval

This file records operational-risk findings discovered during the final pre-test QA. Per user instruction, these risks are **not fixed in v2.4.1** until explicit approval is given.

## R1 — No upper bound on payment date during automatic matching
**Severity: High**

Current matching only rejects deposits that are too early (`submittedAt - beforeDays`). Any deposit after that point remains eligible, even if it is weeks or months later.

### Reproduction
- Application: 2026-09-01, payer `김민지`, 39,000원
- Deposit: 2026-10-15, payer `김민지`, 39,000원
- Current result: automatic match succeeds if the pair is otherwise unique.

### Risk
An old unresolved application can absorb a much later deposit intended for a newer application, especially if a bank CSV is imported before the newest Form responses are synchronized.

### Proposed fix (approval required)
Add a configurable maximum post-application matching window, e.g. `신청 전 1일 ~ 신청 후 N일`.

---

## R2 — CSV duplicate fingerprint depends on the raw date string
**Severity: Medium–High**

The current payment fingerprint is `raw date text + normalized payer + amount`.

### Reproduction
`2026-09-06 14:31 / 김민지 / 39,000` and `2026.09.06 14:31 / 김민지 / 39,000` produce different fingerprints even if they represent the same bank deposit.

### Risk
Overlapping CSV exports with different date formatting can insert the same physical deposit twice. A duplicate could later match another pending application.

### Proposed fix (approval required)
Canonicalize parsable deposit timestamps before fingerprinting. When a real bank CSV sample is available, prefer a bank-provided transaction ID if one exists.

---

## R3 — Gmail sends can be duplicated during overlapping sends or ambiguous network failures
**Severity: High**

The send confirmation closes before the sequential send loop completes, and there is no global send lock. A second send action can be started while the first is still running.

Also, Gmail may accept a message while the browser fails before the local success state is persisted or before the API response is received. In that situation ClassRelay can record the attempt as failed/unfinished and a later resend may duplicate the message.

### Proposed fix (approval required)
- Introduce a global in-flight send lock and disable send controls during a batch.
- Persist a `SENDING` / `DELIVERY_UNCERTAIN` attempt before the API call.
- Treat ambiguous network failures as `발송 확인 필요` rather than a normal retryable failure.

Gmail API does not provide a simple client-side exactly-once guarantee, so the goal is to prevent accidental duplicate retries and clearly surface uncertain delivery state.

---

## R4 — Applicant/payment matching writes are not atomic across stores
**Severity: High**

Automatic matching currently writes applicant updates and payment updates in separate IndexedDB transactions. Manual linking also updates the applicant and payment separately.

### Risk
If the browser crashes, storage fails, or the tab is interrupted between writes, one side can say “matched” while the other side does not. That can break future matching and CS history.

### Proposed fix (approval required)
Add a multi-store atomic transaction helper and commit applicant/payment reconciliation in a single IndexedDB transaction.

---

## R5 — Changing the course of a paid/sent application has no high-risk confirmation
**Severity: Medium–High**

The CS correction screen can change an application’s course even after a deposit is linked or an email has already been sent. The linked deposit’s `courseId` is moved as well, and future resend uses the newly selected course URL. The original paid amount remains unchanged.

### Risk
An accidental course change can make future CS resend the wrong recording or make a payment appear under a differently priced course without an explicit warning.

### Proposed fix (approval required)
If a course change is attempted for a matched or sent application, show a dedicated confirmation containing old/new course, old/new course price, linked deposit, and previous send state. Decide whether a price mismatch should block the change or require a second confirmation.

---

## R6 — Inactive courses can still be auto-assigned during Form sync
**Severity: Medium**

Course resolution during Form synchronization searches all courses by name and does not exclude `active === false` courses.

### Risk
A new Form response can be assigned to a course that the operator has marked “사용 중지”, which can later make that applicant eligible for the old recording link.

### Proposed fix (approval required)
Use active courses only for automatic/default assignment while preserving inactive courses for historical CS and explicit manual correction.

---

## R7 — Multiple tabs can overwrite each other’s local state
**Severity: Medium**

ClassRelay uses one IndexedDB origin without a cross-tab operation lock/version check. Two open tabs can read stale records and later overwrite each other during sync, edit, matching, or send operations.

### Proposed fix (approval required)
Use a `BroadcastChannel`-based operation lock and/or record-level `updatedAt` conflict checks for high-risk writes.

---

## Findings fixed during v2.4.1 (non-operational)
- User-facing bank wording standardized from `거래` to `입금` / `입금 내역` / `입금일시`.
- Internal CSV header aliases such as `거래일시` remain supported for bank-file compatibility.
- Applicant list/dashboard now resolves the current course name by `courseId`, so renaming a course does not leave stale course labels in those views.
- Static regression test added to prevent user-facing `거래` terminology from returning.

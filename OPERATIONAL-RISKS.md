# ClassRelay v2.6.0 — Operational Risk Status

The seven payment/Gmail/history risks approved and fixed in v2.5.0 remain protected in v2.6.0.

## New template-related safeguards
- A course resolves to its assigned template, otherwise the default template.
- No usable template means the applicant is excluded from sending.
- Template/course changes between send confirmation and execution invalidate that applicant for the current pass.
- Default template deletion is blocked.
- Non-default template deletion unlinks dependent courses in one IndexedDB transaction.
- Past successful-send content is copied into the send log and never derived from the current template later.
- Multi-tab writes remain serialized through the existing ClassRelay operation lock.

## Remaining environment-dependent risks
- Gmail ambiguous delivery cannot be made perfectly idempotent by a browser-only client; `발송 확인 필요` remains the safety state.
- Browser IndexedDB can still be deleted by user/browser actions; regular backup remains required.
- Google OAuth/API behavior must be verified on the final Vercel origin.

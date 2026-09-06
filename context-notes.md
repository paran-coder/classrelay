# Context Notes — class-relay-v2.1.1

## Product definition
- A local-first administrator tool for people who sell online lecture recordings.
- The app publisher is not a super-admin and does not hold end-user operational data.
- Each operator becomes the administrator of their own local copy/session.
- No member signup/login and no central application database.
- Hosting target: GitHub -> Vercel static web deployment.

## Data ownership
- Applicants, bank CSV rows, matching results, courses, email templates, and delivery logs are stored in the operator's browser IndexedDB.
- Google access tokens stay in memory only and are not persisted.
- Google OAuth Client ID is supplied by each operator (BYO OAuth) and may be stored locally in browser settings.
- Bank CSV processing happens in the browser; files are not uploaded to an app server.
- Backup/restore is required because browser storage can be cleared by the operator/browser.

## Google integration
- Each operator creates their own Google Cloud project and OAuth Web client.
- Client Secret is not requested or stored.
- Required scopes are requested incrementally:
  - Google Forms body read-only
  - Google Forms responses read-only
  - Gmail send only
- Google Forms integration reads form metadata, maps questions, and syncs responses when the operator opens the app or presses sync.
- Gmail integration sends individual emails from the operator's Google account.

## Safety rules
- Never auto-send when payment matching is ambiguous.
- Exact payer-name + exact amount only for auto matching in MVP.
- Duplicate applicants/payments sharing the same match key are REVIEW_REQUIRED.
- Already-sent applicants are excluded from bulk first-send.
- Re-send is a separate explicit action.

## UI direction
- Practical operator dashboard, not a generic SaaS marketing template.
- Strong hierarchy, low visual noise, clear statuses, restrained animation.
- Mobile usable for CS checks, desktop optimized for bulk review.
- Guide page structure inspired by subtitle-localizer.vercel.app/guide: overview, prerequisites, numbered setup, completion criteria, copyable values, troubleshooting, data/security ownership.

## Deferred
- Real-time background form push notifications.
- Shared cloud database.
- Shared OAuth credentials.
- Non-Google email delivery providers.
- Simple non-Google mode.


## UI direction — v2.1.1
- Reviewed using the user-supplied Frontend Forge skill.
- Visual thesis: gallery-like operational clarity.
- Adopted supplied Mobbin token ladder: #141414 ink, white canvas, #f3f3f3 soft canvas, #f0f0f0 fields, #e0e0e0 hairlines.
- Inter/Pretendard system fallback substitutes for commercial Saans; no font files are bundled.
- Primary actions and active navigation use near-black, not electric blue.
- Cards are 24px, inputs 16px, interactive controls predominantly stadium-pill.
- Routine shadows removed. Modal/toast/mobile drawer may retain functional depth.
- Operational semantic badges retain restrained green/amber/red because state scanning and destructive-risk prevention outrank strict marketing-token imitation.
- Added global focus-visible treatment, larger primary touch targets, aria-expanded for mobile navigation, and Escape dismissal.

## v2.1.1 UI decision
- User clarified that supplied design tokens are references, not a template to copy.
- Frontend Forge hierarchy guidance is treated as primary: operational information hierarchy comes before decorative typography.
- ClassRelay therefore uses a compact admin scale and tighter spacing; guide pages are relaxed but not marketing-scale.
- See `DESIGN-SYSTEM.md` and `UI-REVIEW.md`.

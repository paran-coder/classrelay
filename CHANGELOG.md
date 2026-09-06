# Changelog

## 2.1.0
- UI review against the supplied Frontend Forge skill and Mobbin design tokens
- Gallery-white monochrome application chrome
- Near-black primary actions and active navigation
- 24px cards, 16px fields, stadium-pill controls
- Routine shadows removed; modal/toast depth retained only where functional
- Improved focus-visible, touch targets, mobile menu aria state, Escape dismissal
- Detailed guide restyled to the same design system
- Semantic status colors retained only where operationally necessary

# CHANGELOG — ClassRelay

## 2.1.0 — 2026-09-06

### Major architecture change
- Google Apps Script/Google Sheets extension architecture removed.
- Rebuilt as a local-first static administrator web application.
- No central database or app login.
- Each operator supplies their own Google OAuth Client ID.
- Browser IndexedDB stores operational data.
- Google Forms and Gmail accessed directly from the browser with user-granted OAuth access tokens.
- Added detailed in-app guide and backup/restore workflow.

### Branding
- 서비스명과 프로젝트 식별자를 `ClassRelay` / `class-relay`로 통일
- 관리자 UI, 가이드, 개인정보 안내, IndexedDB, 백업 파일명에 새 브랜드 반영


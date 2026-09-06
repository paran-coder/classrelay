# ClassRelay UI Review — v2.1.0

## Design thesis
- Mood: gallery-like operational clarity
- Palette: white canvas, #141414 ink, neutral tint ladder; semantic status colors only
- Typography: Inter/Pretendard fallback, 650 headings, ~450 body
- Geometry: 24px cards, 16px fields, pill controls, 30% squircle brand/icon tiles
- Depth: flat by default; shadows only for modal/toast/mobile drawer
- Signature: black active navigation and black primary pills against a gallery-white workspace

## High-impact findings addressed
1. The former dark navy/blue gradient shell looked like a generic SaaS template and conflicted with the supplied token system.
2. Buttons, fields, cards and navigation had inconsistent radii and elevation.
3. Routine card shadows competed with the data tables instead of letting information provide hierarchy.
4. Focus behavior depended heavily on blue shadow rings and did not provide a consistent global focus-visible rule.
5. Primary touch targets were often under 44px.
6. The guide page used the right content hierarchy but not the supplied gallery-white visual language.

## Deliberate exception
Mobbin marketing surfaces do not define a dedicated semantic success/warning/error palette. ClassRelay is an operational dashboard, so restrained green/amber/red state badges remain for payment/delivery scanning and destructive-risk prevention. CTA and structural chrome remain monochrome.

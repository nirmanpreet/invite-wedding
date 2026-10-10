# PHASE 6 — QA RESULTS (local, Chrome via CDP :9222, server :3000)

Machine-run checks only. Real-device checks are in the manual checklist in the Phase 7 report.
Raw JSON: `qa/qa-results.json`, `qa/final-results.json`, `qa/axe-results.json`.

## A. Widths × languages (scroll-through, after gate)

| Width | Lang | Horizontal overflow | `.reveal`/`.card` revealed | Petals | Console/page errors |
|---|---|---|---|---|---|
| 320 | en / pa | none | 10/10 | 26, 3 layers | 0 |
| 360 | en / pa | none | 10/10 | 26, 3 layers | 0 |
| 390 | en / pa | none | 10/10 | 26, 3 layers | 0 |
| 414 | en / pa | none | 10/10 | 26, 3 layers | 0 |
| 768 | en / pa | none | 10/10 | 40, 3 layers | 0 |
| 1280 | en / pa | none | 10/10 | 40, 3 layers | 0 |

## B. First screen fits without scrolling (badge bottom ≤ viewport height)

| Viewport | EN | PA |
|---|---|---|
| 320×640 | 563 ✓ | 597 ✓ |
| 360×640 | 559 ✓ | 603 ✓ |
| 430×932 | 860 ✓ | 836 ✓ |

## C. Feature regression

| Feature | Result |
|---|---|
| Language switch (gate + toggle) | ✓ both directions, no console errors |
| RSVP → WhatsApp | ✓ `https://wa.me/61423594009?text=Name: Jaspreet / Attending: Yes / I'm replying to the Wedding Reception of Nirman & Simran on 6 December 2026.` |
| Calendar (.ics) | ✓ `DTSTART;VALUE=DATE:20261206`, `DTEND;VALUE=DATE:20261207`, `GEO:30.220481;74.472704`, VALARM −P1D; dock Calendar carries the identical data URI |
| QR codes | ✓ 2 table QRs; the map QR **decodes** to `https://www.google.com/maps/dir/?api=1&destination=30.220481,74.472704` |
| Map embed | ✓ iframe src contains `30.220481,74.472704` |
| Directions CTA | ✓ `maps/dir` link |
| Tap-to-call | ✓ `tel:+61423594009` (×2) and `tel:+917888479610` |
| Print | ✓ `#print-invite` present |
| PDF | ✓ click loads html2canvas 1.4.1 + jsPDF 2.5.1 from cdnjs (`_pdfLibsReady` true, no alerts). Actual file save needs a real download prompt — see "not tested" |
| Dock | ✓ hidden in hero, shown past it, hidden at the RSVP card and while typing, hidden ≥700px |

## D. Reduce Motion (emulated)

- Cards: quick opacity fade only, no transforms; all content visible. ✓
- Petals: **still present** — 16 (vs 26 normally), 3 layers, durations ×1.8 in JS. ✓
- `scroll-behavior: auto`, `ik` glow animation off. ✓
- Harness note: this Chrome build also collapses animation durations to `1e-06s` under the emulation, so the numbers above prove *structure* (petals present, fewer, glow off); the calm pacing itself is set in `js/invite-motion.js` (`calm = 1.8`).

## E. Throttling (Slow 4G ≈1.5 Mbps / 400 ms RTT, 4× CPU, 360×740)

- Petals present: **3.6 s** after navigation start (network-bound: two stylesheets + fonts).
- Content rendered + names visible: **4.3 s**.
- Long tasks (>50 ms) during a full scroll: **0**. No console errors.

## F. Accessibility (axe-core, 390 px)

- EN: **0 violations**, 49 rule passes. PA: **0 violations**, 49 passes.
- Only "incomplete" is `color-contrast` on gradient backgrounds (axe cannot compute; the explicit colour pairs were audited separately and pass AA — see Phase 5).
- No-JS: the language gate is removed from the layout (it cannot be dismissed), and the `<noscript>` card shows ੴ, blessing, names, date, time, venue and a `tel:` link in both languages. (`qa/shots/nojs-390.png`)

## Screenshots taken by this run (`qa/shots/`)

- First-screen fit: `fit-320x640-en/pa.png`, `fit-360x640-en/pa.png`, `fit-430x932-en/pa.png`
- Width sweep heroes: `qa-w{320,360,390,414,768,1280}-{en,pa}-hero.png`
- Sections at 390: `qa-sec-{hero,day-info,time,qr-section,rsvp-section,venue-map-embed,print-section}-{en,pa}-390.png`
- Full pages: `qa-full-{en,pa}-390.png`
- Reduce Motion: `qa-reduced-{en,pa}-390.png`
- Dock: `p4-dock-390.png`, `p4-pa-dock-390.png`
- No-JS: `nojs-390.png`
- Petals: `p3-petals-390.png`

## Not tested here (needs real devices / a real Lighthouse run)

1. iOS Safari 14+ and the WhatsApp / Instagram / Facebook in-app browsers on iPhone.
2. Android Chrome / Samsung Internet in-app browsers, and iOS Low Power Mode's 30 fps cap.
3. Real Reduce Motion setting on a device (only emulated).
4. The PDF file actually landing in Files/Downloads inside an in-app browser.
5. Lighthouse mobile Performance/Acceptance (>=85 / >=95) — no Lighthouse binary in this workspace; proxies used: 0 axe violations, 0 long tasks under 4× CPU, first load ≈140 KB + 268 KB hero WebP excluding fonts.
6. True 60 fps feel on a mid-range Android — needs a real device (checklist item).

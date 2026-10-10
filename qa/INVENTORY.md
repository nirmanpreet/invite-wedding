# PHASE 0 — INVENTORY (no code changes)

Observed from `index.html`, `js/script.js`, `css/style.css`, `data/config.json`, `build.js`, `serve.js`.
Nothing below is invented; every line was read from the repo or verified against the running dev server.

---

## 0. How the site runs

| Item | Detail |
|---|---|
| Dev server | `node serve.js` → http://localhost:3000 (already running). It synthesises `window.__WEDDING_CONFIG__` at `/config.js` from `data/config.json`. |
| Production | `node build.js` → self-contained `dist/index.html` (CSS inlined in `<style>`, config inlined, `qrcode.min.js` + `tsparticles.slim.min.js` inlined) + copies of `js/script.js`, manifest, assets. `dist/` is what gets deployed. |
| Entry HTML | `index.html` (dev) / `dist/index.html` (live) |
| Stylesheet | `css/style.css` (48.6 KB, 1573 lines) — single file today |
| Logic | `js/script.js` (57.7 KB, 1182 lines), IIFE, `'use strict'`, ES5-style |
| QR lib | `js/qrcode.min.js` (global `qrcode`) — loaded in `<head>` |
| Petal lib | `js/tsparticles.slim.min.js` (global `window.tsParticles`) — **inlined by build.js only; `index.html` has NO script tag for it** (see §9 Flags) |
| Config | `data/config.json` — all content, feature toggles, all EN/PA strings |

---

## 1. Page structure, in DOM order (ids and classes)

### `<head>`
- meta: `viewport (viewport-fit=cover)`, `description`, `author`, `theme-color #6d1a2d`, `robots noindex,nofollow`, `canonical`, `apple-touch-icon`, full OG/Twitter set (og:image absolute URL), `manifest.webmanifest`
- preconnects: fonts.googleapis.com, fonts.gstatic.com, cdnjs.cloudflare.com; preload `assets/img/anand-karaj.webp` (`fetchpriority=high`)
- Google Fonts (current): Cormorant Garamond, Crimson Text, Dancing Script, Great Vibes, Noto Sans Gurmukhi, Playfair Display — `display=swap`
- `<link rel="stylesheet" href="./css/style.css">`
- `<script src="./js/qrcode.min.js">`, `<script src="./config.js">`
- JSON-LD `Event` schema (startDate `2026-12-06T10:00:00+05:30`, Park City Resort address)

### `<body class="soft-gradient">`

| # | Element | id | classes | Notes |
|---|---|---|---|---|
| 1 | Language gate | `intro-gate` | `.intro-gate` > `.card` | children: `.ik` (ੴ, aria-hidden), `.gate-blessing` (3 Gurmukhi lines, static), `.gate-names` (Nirman `&` Simran), `.sub` **`intro-sub`**, `.lang-pick` **`intro-lang-pick`** > `button[data-lang="en"]`, `button[data-lang="pa"]`, `.gate-hint` **`gate-hint`** |
| 2 | Petal canvas host | `sakura-falling` | `.sakura-falling` | tsParticles container (old petal system — Phase 3 target) |
| 3 | Corner frame | — | `.royal-frame` > `img.rf-corner.tl/.tr/.bl/.br` | `assets/svg/corner-ornament.svg` ×4, aria-hidden (Phase 2/4: gets `.corner`) |
| 4 | `<main id="invite-main">` | `invite-main` | | wraps items 5–19 |
| 5 | Blessing block | `invite-blessing` | `.blessing` | **filled by JS** (`renderInvite`): `<span class="ik">ੴ</span>` + `.blessing-text` (from `i18n.*.footerNote`) |
| 6 | Divider ornament | — | `.ornament` > `img` | `assets/svg/divider-ornament.svg` |
| 7 | Hero art | — | `.ceremony-image` > `picture` | `source webp anand-karaj.webp`, `img anand-karaj-fallback.png` 1216×1216, eager, fetchpriority high, aria-hidden wrapper |
| 8 | Print-only header | `print-header` | `.print-header` | JS-filled, `display:none` on screen |
| 9 | Title block | `invite-title` | `.wrap` > `.title` | **JS-filled**: `h1.title-names` > `.name-a`, `.amp-title`, `.name-b` (+ `.name-latin` in PA), `h2.title-sub`, `p` with `.date` / `.place` |
| 10 | Save-the-Date card | `time` | (link `.save-date` > `#save-date-link`, `.sd-title`, `.sd-date`, `.sd-note`, `.sd-cta`) | **JS-filled**; `href` is a `data:text/calendar` .ics with `download` attr — this is the "Add to calendar" feature |
| 11 | Occasion line | `dance-med` | `.dance-med` | static "Reception", JS re-translates via `receptionHeading` |
| 12 | Action buttons | `invite-actions` | `.actions` | **JS-filled**: `<a class="venue">SEE THE VENUE</a>` (map URL, target=_blank) + `<button id="download-pdf" class="venue">DOWNLOAD INVITATION CARD</button>` |
| 13 | Contact footer | `invite-footer` | `.footer` | **JS-filled**: `label <a class="phone" href="tel:...">` ×2 (+91 second number) |
| 14 | Language switch | `lang-toggle` | `.lang-toggle` | **JS-filled**: `<a href="#lang=en|pa" data-lang>` |
| 15 | At-a-glance grid | `day-info` | `.day-info` | **JS-filled**: `h2` + `.day-grid` > `.day-item` > `.label`/`.value` (Date / Time / Venue+address) |
| 16 | QR section | `qr-section` | `.qr-section` | **JS-filled**: `h2`, `.qr-grid` > `.qr-item` > `a.qr-link` > `.qr-wrap` > `table.qr-table`, `.qr-label` ×2, `.qr-note` |
| 17 | Photos | `photos` | `.photos` | empty — `features.photoSection: false` |
| 18 | RSVP | `rsvp-section` | `.rsvp-section` | **JS-filled**: `h2`, `.rsvp-by`, `input#rsvp-name`, `p.rsvp-error#rsvp-error[role=alert][hidden]`, `.rsvp-attend-label`, `.rsvp-attending[role=group]` > `button.attend-btn[data-attend="Yes|No"][aria-pressed]`, `button#rsvp-send`, `.rsvp-note` (form path) or `a#rsvp-direct-only` (direct-link path) |
| 19 | Map embed | `venue-map-embed` | `.venue-map-embed` | **JS-filled**: `iframe` (title set, loading=lazy) + `.map-label` |
| 20 | Print button | `print-section` | `.print-section` | **JS-filled**: `button#print-invite` → `window.print()` |
| 21 | Share | `invite-social` | `.happiness` | **JS-filled**, hidden (`social.enabled: false`) |
| 22 | Music (dead) | `music-container` / `my_audio` | `.music` | `display:none`, `music.enabled: false` |
| 23 | Off-screen PDF card | `pdf-card` | `.pdf-card` | `left:-9999px`, 700 px wide; ids: `pdf-ik`, `pdf-blessing`, `pdf-subtext`, `pdf-name-1`, `pdf-connector`, `pdf-name-2`, `pdf-event-line`, `pdf-time-line`, `pdf-venue-line`, `pdf-qr`, `pdf-footer-note`, `pdf-contact` |
| 24 | Script | | | `<script src="./js/script.js">` at end of body |

---

## 2. Everything `js/script.js` depends on

### 2a. Element ids consumed (`getElementById`)
Static (must keep in HTML): `invite-main` (implied), `intro-gate`, `intro-lang-pick`, `intro-sub`, `gate-hint`, `dance-med`, `print-header`, `pdf-card`, `pdf-ik`, `pdf-blessing`, `pdf-subtext`, `pdf-name-1`, `pdf-connector`, `pdf-name-2`, `pdf-event-line`, `pdf-time-line`, `pdf-venue-line`, `pdf-qr`, `pdf-footer-note`, `pdf-contact`, `download-pdf` (re-created each render), `my_audio` (unused).

JS-created (must keep their container ids in HTML): `invite-title`, `invite-blessing`, `invite-footer`, `invite-actions`, `invite-social`, `day-info`, `rsvp-section`, `rsvp-send`, `rsvp-error`, `rsvp-name`, `rsvp-direct-only`, `venue-map-embed`, `print-section`, `print-invite`, `qr-section`, `time` (Save-the-Date), `save-date-link`, `lang-toggle`, `sakura-falling`, `photos`.

### 2b. Selectors / attributes
- `.wrap` (focus target after gate dismiss), `.ornament`, `.ceremony-image img` (old reveal layer)
- `.attend-btn` + `data-attend` (RSVP Yes/No, `aria-pressed`)
- `.lang-pick button[data-lang]` (gate), `#lang-toggle a[href="#lang=xx"][data-lang]`
- `.intro-gate.hide` + `body.intro-done` (gate dismissal state)
- `document.documentElement.classList.add('js-reveal')` at boot; `.reveal-target` / `.revealed` classes driven by `playRoyalReveal()`
- Custom event `wedding-langchange` dispatched on every language switch (petal toggle label listens)

### 2c. Globals / network
- `window.__WEDDING_CONFIG__` (config.js in dev, inlined in dist)
- `qrcode` (global, head) — QR section + PDF QR painting
- `window.tsParticles` — old petals; guarded, silently no-ops if absent
- Lazy CDN: `html2canvas 1.4.1` + `jspdf 2.5.1` from cdnjs, only on PDF click
- Storage (all in try/catch): `sessionStorage['wedding-lang']`, `sessionStorage['wedding-intro-seen']`, `localStorage['wedding-petals']`, hash `#lang=xx`

### 2d. Boot order
`DOMContentLoaded` → `boot()`: add `js-reveal`, set `<html lang>`, `setupIntroGate`, `updateIntroGate`, `renderInvite`, `renderSaveTheDate`, `renderDayInfo`, `renderRsvp`, `renderVenueMapEmbed`, `renderPrintSection`, `renderQrSection`, `updatePdfLang`, `renderLangToggle`, `startPetal`, `initAnimations` (waits for `body.intro-done`, then IO reveal + 2.5 s failsafe).

---

## 3. Feature list (must all keep working)

1. **Language gate** — first visit: ੴ, blessing, names, "Wedding Reception Invitation", English/ਪੰਜਾਬੀ buttons, "Tap your language to enter"; dismissed via click or Enter/Escape; remembered in `sessionStorage['wedding-intro-seen']`.
2. **Language switch** — gate buttons + `#lang-toggle` links; sets `<html lang>`, `sessionStorage`, `history.replaceState('#lang=xx')`, re-renders everything; layout must not jump.
3. **RSVP via WhatsApp** — name + Yes/No → `https://wa.me/61423594009?text=...` built in the reader's language; opened with `window.open(link,'_blank',{noopener:true,noreferrer:true})`; inline validation with `#rsvp-error`.
4. **Add to calendar (.ics)** — `data:text/calendar` URI on `#save-date-link` (all-day 6 Dec 2026, DTEND 7 Dec, GEO pin, −P1D alarm, `download="Nirman_Simran_reception.ics"`).
5. **PDF download** — off-screen `#pdf-card` → lazy html2canvas + jsPDF → `Invitation - Nirman & Simran.pdf`; QR modules painted onto the canvas afterwards.
6. **QR codes** — venue map QR + contact vCard QR as `<table>`s, equal grid size, each wrapped in a link (map / `tel:`); also rendered into the PDF card.
7. **Map** — `#venue-map-embed` iframe (lat/lng embed, `hl=en`) + `.map-label`; "SEE THE VENUE" directions link (`maps/dir/?api=1&destination=30.220481,74.472704`).
8. **Print** — `#print-invite` + `#print-header`, print-only CSS.
9. **Tap-to-call** — footer `tel:` links (+61 423 594 009, +91 78884 79610).
10. **Save-the-Date card** (replaces countdown) — `#time`.
11. **At-a-glance grid** — `#day-info` (Date/Time/Venue).
12. **Petals** — tsParticles in `#sakura-falling`, off by default, opt-in `.petals-toggle` button (bottom-left), static scatter under reduced motion. *Phase 3 replaces this with always-on 3-layer mogra petals.*
13. **Scroll reveal** — `.reveal-target`/`.revealed` via IntersectionObserver + 2.5 s failsafe. *Phase 4 replaces this with the `.reveal`/`.in` system.*
14. **Disabled/optional** (config-toggled, keep the plumbing): photos (`features.photoSection:false`), share (`social.enabled:false`), music (`music.enabled:false`).
15. **SEO/PWA** — JSON-LD Event, OG/Twitter, `manifest.webmanifest`, `noindex`.

---

## 4. i18n sources (every visible string)

- `i18n.en.*` / `i18n.pa.*` top-level keys (inviteTitle, venueBtn, downloadBtn, footerNote, rsvpTitle, venueMapLabel, qrTitle/qrMap/qrContact/qrNote, pdf*, console*, photoCaption, langLabel, shareLabel)
- `i18n._extra.en|pa.*` (dayInfo*, rsvpError*, petalToggle*, printLabel, calendarLabel/Note, introSub, introMeaning, receptionHeading, onWording, atWording, saveTheDate*, gateHint, weekdays[], …)
- `data/config.json` Pa variants: `couple.partner1Pa/partner2Pa/connectorPa`, `datePa`, `timePa`, `venue.namePa/addressPa`, `rsvp.notePa`, `footer.contactLabelPa`, `rsvpWhatsApp.*Pa`, `rsvpForm.*Pa`
- Static-in-HTML strings not currently translated: gate blessing lines, gate names, `#dance-med` (JS patches it), `#pdf-*` defaults (JS patches most).

**Current blessing strings (verbatim, must not be re-spelled):**
- Gate (`index.html` and `build.js`): `ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥` / `ਦਾਸਾਂ ਕਾਰਜ ਆਪ ਸਵਾਰੇ, ਇਹ ਉਸ ਦੀ ਵਡਿਆਈ ॥` / `ਸਤਿਗੁਰ ਦਾਤੇ ਕਾਜ ਰਚਾਇਆ, ਆਪਣੀ ਮੇਹਰ ਕਰਾਈ ।`
- Page blessing (`i18n.*.footerNote`): same three lines (order: ਪ੍ਰਸਾਦਿ → ਦਾਸਾਂ → ਸਤਿਗੁਰ ਦਾਤੇ), EN adds `— With the blessings of Waheguru, we joyfully invite you to celebrate the Wedding Reception!`
- The verified SGGS line `ਲਖ ਖੁਸੀਆ ਪਾਤਿਸਾਹੀਆ ਜੇ ਸਤਿਗੁਰੁ ਨਦਰਿ ਕਰੇਇ ॥` **does not appear anywhere on the site today.**

---

## 5. Assets + weight

| File | Size | Use |
|---|---|---|
| `assets/img/anand-karaj.webp` | 268 KB | hero art (preloaded, LCP) |
| `assets/img/anand-karaj-fallback.png` | 820 KB | `<picture>` fallback (never fetched where WebP works) |
| `assets/img/anand-karaj.png` | 1.4 MB | master, not referenced by the page |
| `assets/img/og.jpg` | 68 KB | OG image |
| `assets/svg/corner-ornament.svg`, `divider-ornament.svg` | ~2–4 KB | frame + divider |
| `assets/svg/khanda.svg`, `floral-corner.svg`, `ornament.svg`, `rose-petal.svg` | small | **not referenced by index.html or style.css** (khanda must still be respected per Hard Rule 3 if it appears) |
| `assets/img/left.png`, `right.png` | 124/132 KB | not referenced |
| `css/style.css` | 48.6 KB | only stylesheet |
| `js/script.js` | 57.7 KB | |
| `js/qrcode.min.js` | small | |
| `js/tsparticles.slim.min.js` | large | inlined into dist only |

First load (dev): HTML + style.css + script.js + qrcode + fonts ≈ 120–140 KB + 268 KB hero image → under the 400 KB budget excluding fonts, but the hero WebP is the single biggest item.

---

## 6. Motion / animation code that exists today

- `css/style.css`: `.intro-gate .card` entrance animation; `html.js-reveal .reveal-target` (opacity/translate transition) → `.revealed`; `.petals-toggle` styles; `background-attachment: scroll, scroll, fixed` on `body` (**violates the compatibility rules — must go**); hover rules outside `@media (hover:hover)` in places.
- `js/script.js`: `startPetal()` (tsParticles engine + static scatter + `.petals-toggle`), `playRoyalReveal()` (IO reveal + failsafe), `playIntroCard()` (empty stub).
- Root-level untracked inputs supplied for this redesign: `invite-motion.css` (10.9 KB), `invite-motion.js` (5.3 KB), `reference.html` (scratch harness).

**Phase 3 removals:** `#sakura-falling` container + `startPetal()` + `.petals-toggle` + tsParticles inlining in `build.js` (replaced by `#petals` + `js/invite-motion.js`).

---

## 7. Conflicts to resolve in Phase 1 (invite-motion.css vs style.css)

1. **`:root` tokens** — both files define `:root`; invite-motion.css loads second so its tokens win wholesale: `--font-body` changes from `'Cormorant Garamond',…serif` to `'Noto Sans Gurmukhi',…`, and `* { font-family: var(--font-body) }` in style.css applies it to *every* element → Latin display type (Playfair/Cormorant) would silently change. Must be reconciled deliberately, not left to cascade order.
2. **`body`** — style.css makes `body` a centered flex column with its own gradient + `background-attachment: … fixed`; invite-motion.css wants a block `body` with a 160° gradient and `padding-top/bottom: env(safe-area-inset-*)`. Old rules must be removed, not overridden with `!important`.
3. **`.intro-gate .card` vs new `.card`** — the gate card would pick up the new `.card` look (gold border, shine `::after`, overflow hidden). Needs an explicit decision (keep gate's own styling).
4. **`.ik`** — defined under `.blessing .ik` and `.intro-gate .ik`; new system defines a global `.ik` with a glow `::before` (allowed by Hard Rule 3).
5. **Fonts** — spec asks for `Noto Sans Gurmukhi (400/500/600/700)`, `Noto Serif Gurmukhi`, `Arvo`, `Dancing Script`; the page already loads Cormorant Garamond, Crimson Text, Dancing Script, Great Vibes, Noto Sans Gurmukhi, Playfair Display. Keep the families style.css still uses, add the missing ones, avoid double-loading Dancing Script/Noto Sans Gurmukhi.
6. **Reveal duplication** — `html.js-reveal .reveal-target` (old) vs `.js .reveal` (new). One must go in Phase 4.
7. **`overflow-x` / `overflow:hidden` on `.card`** — `.card{overflow:hidden}` will clip focus outlines/`outline-offset` on inputs inside cards; verify in QA.

---

## 8. Verified facts (do not invent or change)

- Couple: **Nirman ਨਿਰਮਾਣ** & **Simran ਸਿਮਰਨ**
- Event: Wedding Reception, **Sunday 6 December 2026**, **"10:00 AM onwards"**, **Park City Resort, Malout, Fazilka Rd, Malout Rural, Punjab 152107, India (IST)**, coords 30.220481, 74.472704
- **⚑ FLAG (do not change):** the printed card says **12:00 pm**; the site says **10:00 AM onwards**. Reported here only, per instructions.
- Contact **+61 423 594 009** (WhatsApp RSVP number `61423594009`), second number **+91 78884 79610**
- RSVP by **22 November 2026**
- Names in Gurmukhi: **ਨਿਰਮਾਣ** and **ਸਿਮਰਨ**

---

## 9. Flags / issues found during inventory

1. **`index.html` never loads `js/tsparticles.slim.min.js`** — `startPetal()` exits at `if (!window.tsParticles…) return;`, so petals (and the `.petals-toggle`) are dead in the dev page. `dist/` inlines the lib, so live behaviour may differ from dev. Phase 3 removes this system anyway.
2. **`README.md` line 6 contains the forbidden spelling** `ਲੱਖ ਖੁਸ਼ੀਆਂ ਪਾਤਸ਼ਾਹੀਆਂ`. Not on the site, but it breaks Hard Rule 1. Suggest fixing to `ਲਖ ਖੁਸੀਆ ਪਾਤਿਸਾਹੀਆ ਜੇ ਸਤਿਗੁਰੁ ਨਦਰਿ ਕਰੇਇ ॥` — **needs your OK** (it is a repo doc, not the invitation).
3. **Blessing order mismatch** — see Questions below.
4. `qa/` is untracked (`.gitignore` currently ignores it), so `qa/INVENTORY.md` needs an ignore exception to be committable.
5. `.gitignore`, `invite-motion.css`, `invite-motion.js`, `reference.html` are currently uncommitted working-tree changes (pre-existing).
6. Dead markup kept for compatibility: `#photos`, `#invite-social`, `#music-container`, `#print-header` — all still queried by script.js.

---

## 10. User decisions (Phase 0 answers — binding for all later phases)

1. **Blessing:** keep today's blessing untouched — order `ਪ੍ਰਸਾਦਿ` → `ਦਾਸਾਂ ਕਾਰਜ` → `ਸਤਿਗੁਰ ਦਾਤੇ`. No new blessing, no `ਲਖ ਖੁਸੀਆ` line on the page. Restyle only.
2. **Gate:** keep the language gate exactly as it is, static; all new motion (petals, stagger, reveals) starts only on the hero *after* a language is picked.
3. **At-a-glance:** one card, keeping the `#day-info` id that script.js renders into. No duplicate Date/Time/Venue card.
4. **Fonts:** keep the current families (Playfair Display / Cormorant Garamond / Great Vibes / Dancing Script / Noto Sans Gurmukhi). Do NOT switch Latin display to Arvo; do not load unused families.
5. **README:** fix the forbidden `ਲੱਖ ਖੁਸ਼ੀਆਂ ਪਾਤਸ਼ਾਹੀਆਂ` spelling to the verified line. *(done in Phase 1)*

---

## 11. QA tooling available in this workspace

- `serve.js` already running on **:3000**
- Chrome **CDP on 127.0.0.1:9222** responds (`Chrome/155`, reported UA is *HeadlessChrome* — I'll verify whether it is actually headed before Phase 6)
- `qa/` has a node harness (`qa/node_modules`, `lib.mjs`, `live_interactions.mjs`, `REPORT.md`, `shots/`) — Playwright-style tooling from earlier rounds
- No test files detected in the repo; `build.js` and `serve.js` are the only Node entry points

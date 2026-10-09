#!/usr/bin/env node
/**
 * Build a single self-contained dist/ for free hosting (GitHub Pages / Vercel / Netlify).
 * Usage: node build.js   (reads data/config.json)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const DIST = path.join(ROOT, 'dist');

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/config.json'), 'utf8'));
} catch (e) {
  console.error('Failed to read data/config.json:', e.message);
  process.exit(1);
}

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function att(obj, dotted, fallback) {
  let cur = obj;
  for (const p of String(dotted).split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return fallback;
    if (!(p in cur)) return fallback;
    cur = cur[p];
  }
  return cur === null || cur === undefined ? fallback : cur;
}

const extraEn = att(config, 'i18n._extra.en', {});
const extraPa = att(config, 'i18n._extra.pa', {});
const p1 = att(config, 'couple.partner1', 'Partner 1');
const p2 = att(config, 'couple.partner2', 'Partner 2');
const connector = att(config, 'couple.connector', '&');
const seoDesc = att(config, 'seo.description', att(config, 'footer.message', 'Wedding invitation'));

const monthMap = { January:'01', February:'02', March:'03', April:'04', May:'05', June:'06',
                   July:'07', August:'08', September:'09', October:'10', November:'11', December:'12' };
function isoDate(d) {
  const parts = String(d || '').trim().split(/\s+/);
  if (parts.length < 3) return '';
  // Config is day-first ("6 December 2026"), but some sources write
  // month-first ("December 6, 2026"). Detect which, so the day is never
  // dropped (this produced the live "2026-12-0" bug).
  let day, monName, year;
  if (/^[0-9]{1,2}$/.test(parts[0])) {
    day = parts[0]; monName = parts[1]; year = parts[2];
  } else {
    monName = parts[0]; day = parts[1]; year = parts[2];
  }
  day = String(day).replace(/[^0-9]/g, '');
  const mon = monthMap[monName.replace(/[^A-Za-z]/g, '')] || '12';
  year = String(year).replace(/[^0-9]/g, '') || '2026';
  return year + '-' + mon + '-' + (day.length < 2 ? '0' + day : day);
}
const eventIso = isoDate(att(config, 'date', '6 December 2026')) + 'T10:00:00+05:30';

const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');

// Vendored QR code generator (MIT, qrcode-generator 1.4.4) — inlined so dist/ works offline
let qrLib = '';
try {
  qrLib = fs.readFileSync(path.join(ROOT, 'js/qrcode.min.js'), 'utf8')
    .replace(/<\/script/gi, '<\\/script');
} catch (e) {
  console.warn('js/qrcode.min.js not found; QR codes disabled in build.');
}

// Small UI text injected statically (runtime localizes via window.__WEDDING_CONFIG__)
const summaryEn = esc(extraEn.receptionHeading || 'Reception Party');
const summaryPa = esc(extraPa.receptionHeading || 'ਰਿਸੈਪਸ਼ਨ ਪਾਰਟੀ');

const html = `<!DOCTYPE html>
<html lang="en">
    <head>
      <link rel="shortcut icon" href="favicon.png" type="image/png">
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
      <meta name="description" content="${esc(seoDesc)}">
      <meta name="author" content="${esc(p1)} &amp; ${esc(p2)}">
      <meta name="theme-color" content="#6d1a2d">
      <meta name="robots" content="noindex, nofollow">
      <link rel="canonical" href="https://invite.nirmanpreet.com/">
      <link rel="apple-touch-icon" href="assets/img/icon-180.png">
      <meta property="og:type" content="website" />
      <meta property="og:title" content="${esc(p1)} &amp; ${esc(p2)} | Wedding Reception | ${esc(att(config, 'date', 'Date'))}" />
      <meta property="og:description" content="${esc(seoDesc)}" />
      <meta property="og:url" content="https://invite.nirmanpreet.com/" />
      <meta property="og:site_name" content="Nirman &amp; Simran" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content="https://invite.nirmanpreet.com/assets/img/og.jpg" />
      <meta property="og:image:secure_url" content="https://invite.nirmanpreet.com/assets/img/og.jpg" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Nirman &amp; Simran | Wedding Reception | 6 December 2026 — Wedding Reception on 6 December 2026 at Park City Resort, Malout" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Nirman & Simran | Wedding Reception | 6 December 2026" />
      <meta name="twitter:description" content="${esc(seoDesc)}" />
      <meta name="twitter:image" content="https://invite.nirmanpreet.com/assets/img/og.jpg" />
      <title>${esc(p1)} &amp; ${esc(p2)} | Wedding Reception | ${esc(att(config, 'date', 'Date'))}</title>

      <link rel="manifest" href="manifest.webmanifest">

      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- Prefetch/preconnect: the share preview and first paint both depend on
       these. og:image must be an ABSOLUTE URL or WhatsApp/iMessage show nothing.
       The artwork is preloaded as the likely LCP element; the <picture> on the
       page still picks WebP, so the preload and the element agree. -->
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  <link rel="preload" as="image" href="assets/img/anand-karaj.webp" type="image/webp" fetchpriority="high">
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Noto+Sans+Gurmukhi:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">

      <style>
${css}
      </style>

      <!-- GSAP removed: reveals are CSS + IntersectionObserver in script.js -->

      <script>
${qrLib}
      </script>

      <script>
        window.__WEDDING_CONFIG__ = ${JSON.stringify(config, null, 2)};
      </script>

      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "${esc(p1)} & ${esc(p2)} — Wedding Reception",
        "startDate": "${eventIso}",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
          "@type": "Place",
          "name": "${esc(att(config, 'venue.name', ''))}",
          "address": "${esc(att(config, 'venue.address', ''))}"
        },
        "description": "${esc(seoDesc)}",
        "organizer": { "@type": "Person", "name": "${esc(p1)} & ${esc(p2)}" }
      }
      </script>
    </head>
    <body class="soft-gradient">

      <!-- Intro gate: simple first-visit language pick -->
      <div class="intro-gate" id="intro-gate">
        <div class="card">
          <div class="ik" aria-hidden="true">ੴ</div>
          <div class="gate-blessing">
            ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥<br>
            ਲਖ ਖੁਸੀਆ ਪਾਤਿਸਾਹੀਆ ਜੇ ਸਤਿਗੁਰੁ ਨਦਰਿ ਕਰੇਇ ॥
          </div>
          <div class="gate-names">${esc(p1)} <span class="amp">${esc(connector)}</span> ${esc(p2)}</div>
          <div class="sub" id="intro-sub">${esc(extraEn.introSub || 'Wedding Invite')}</div>
          <div class="lang-pick" id="intro-lang-pick">
            <button type="button" data-lang="en" class="active">English</button>
            <button type="button" data-lang="pa">ਪੰਜਾਬੀ</button>
          </div>
          <div class="gate-hint" id="gate-hint">Tap your language to enter</div>
        </div>
      </div>

      <!-- Petals -->
      <div class="sakura-falling" id="sakura-falling"></div>

      <!-- Royal ornament frame -->
      <div class="royal-frame" aria-hidden="true">
        <img class="rf-corner tl" src="assets/svg/corner-ornament.svg" alt="">
        <img class="rf-corner tr" src="assets/svg/corner-ornament.svg" alt="">
        <img class="rf-corner bl" src="assets/svg/corner-ornament.svg" alt="">
        <img class="rf-corner br" src="assets/svg/corner-ornament.svg" alt="">
      </div>

      <!-- Blessing: Ik Onkar + Satgur Prasad + Lakh khushiaan pathshahiaan -->
      <main id="invite-main">
      <div class="blessing" id="invite-blessing"></div>

      <div class="ornament" aria-hidden="true">
        <img src="assets/svg/divider-ornament.svg" alt="">
      </div>

      <!-- Anand Karaj ceremonial art, straight after the blessing.
           <picture> because this is the page's likely LCP element: at 1216px
           the PNG is 1.36 MB, while the same resolution as WebP is 268 KB.
           The 900px PNG is only ever fetched by a browser with no WebP
           support, since a browser picks one source and ignores the other. -->
      <div class="ceremony-image" aria-hidden="true">
        <picture>
          <source type="image/webp" srcset="assets/img/anand-karaj.webp">
          <img src="assets/img/anand-karaj-fallback.png" alt="" width="1216" height="1216" loading="eager" fetchpriority="high" decoding="async">
        </picture>
      </div>

      <!-- Print-only header -->
      <div id="print-header" class="print-header"></div>

      <div class="wrap">
        <div class="title" id="invite-title"></div>
      </div>

      <div id="time"></div>
      <p class="dance-med" id="dance-med">${esc(extraEn.receptionHeading || 'Reception')}</p>

      <div class="actions" id="invite-actions"></div>
      <p class="footer" id="invite-footer"></p>
      <div class="lang-toggle" id="lang-toggle"></div>
      <div id="day-info" class="day-info"></div>
      <div id="qr-section" class="qr-section"></div>
      <div id="photos" class="photos"></div>
      <div id="rsvp-section" class="rsvp-section"></div>
      <div id="venue-map-embed" class="venue-map-embed"></div>
      <div id="calendar-section" class="calendar-section"></div>
      <div id="print-section" class="print-section"></div>
      <p class="happiness" id="invite-social"></p>
      </main>

      <div class="music" id="music-container" style="display:none;">
        <audio src="" id="my_audio" loop="loop"></audio>
      </div>

      <!-- Hidden PDF card -->

      <div id="pdf-card" class="pdf-card" style="position:absolute; left:-9999px; top:0; width:700px; background:#faf6ec; color:#4a1220; font-family:'Cormorant Garamond', Georgia, serif; border:1px solid #e3d5b3; padding:40px; box-sizing:border-box;">
        <div style="text-align:center;">
          <div style="font-size:34px; color:#a4243b; margin-bottom:12px;" id="pdf-ik">ੴ</div>
          <div style="font-size:15px; color:#6d1a2d; margin-bottom:16px; font-family:'Noto Sans Gurmukhi', serif; white-space:pre-line;" id="pdf-blessing">ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥
ਲਖ ਖੁਸੀਆ ਪਾਤਿਸਾਹੀਆ ਜੇ ਸਤਿਗੁਰੁ ਨਦਰਿ ਕਰੇਇ ॥</div>
          <div style="font-size:15px; color:#4a1220; font-style:italic; margin-bottom:10px;" id="pdf-subtext">${esc(att(config, '_pdf.subtext', 'You are cordially invited to the Reception of'))}</div>
          <div style="font-size:46px; color:#6d1a2d; font-family:'Great Vibes', cursive; margin:4px 0;" id="pdf-name-1">${esc(p1)}</div>
          <div style="font-size:22px; color:#b8862e; font-family:'Great Vibes', cursive;" id="pdf-connector">${esc(connector)}</div>
          <div style="font-size:46px; color:#6d1a2d; font-family:'Great Vibes', cursive; margin:4px 0 14px;" id="pdf-name-2">${esc(p2)}</div>
          <div style="font-size:15px; letter-spacing:2px; color:#a4813a; margin-bottom:12px;" id="pdf-event-line">${esc(extraEn.receptionHeading || 'Reception')} &bull; ${esc(att(config, 'date', ''))}</div>
          <div style="font-size:16px; color:#4a1220; margin:4px 0;" id="pdf-time-line">${esc(att(config, 'time', ''))}</div>
          <div style="font-size:16px; color:#4a1220; margin:4px 0;" id="pdf-venue-line">${esc(att(config, 'venue.name', ''))}${att(config, 'venue.address') ? ', ' + esc(att(config, 'venue.address')) : ''}</div>
          <div id="pdf-qr" class="pdf-qr"></div>
          <div style="margin-top:26px; border-top:1px solid #e3d5b3; padding-top:14px; font-size:13px; color:#4a1220;" id="pdf-footer-note">${esc(att(config, '_pdf.footerNote', 'With love and joy, together with their families'))}</div>
          <div style="margin-top:6px; font-size:12px; color:#7a5c2e;" id="pdf-contact">${esc(att(config, 'footer.contact', ''))}</div>
        </div>
      </div>

      <script src="./js/script.js"></script>
    </body>
</html>
`;

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

const faviconSrc = path.join(ROOT, 'favicon.png');
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, path.join(DIST, 'favicon.png'));
}
const jsDist = path.join(DIST, 'js');
fs.mkdirSync(jsDist, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'js/script.js'), path.join(jsDist, 'script.js'));

// PWA manifest + icon assets
const manifestSrc = path.join(ROOT, 'manifest.webmanifest');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, path.join(DIST, 'manifest.webmanifest'));
}
const iconDist = path.join(DIST, 'assets');
fs.mkdirSync(iconDist, { recursive: true });
const iconSrc = path.join(ROOT, 'assets/icon.svg');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(iconDist, 'icon.svg'));
}
// Royal ornament + Anand Karaj art
const svgDist = path.join(iconDist, 'svg');
fs.mkdirSync(svgDist, { recursive: true });
const ornamentSrc = path.join(ROOT, 'assets/svg/ornament.svg');
if (fs.existsSync(ornamentSrc)) {
  fs.copyFileSync(ornamentSrc, path.join(svgDist, 'ornament.svg'));
}
['corner-ornament.svg', 'divider-ornament.svg', 'rose-petal.svg'].forEach(function (f) {
  const s = path.join(ROOT, 'assets/svg', f);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(svgDist, f));
});
const imgDist = path.join(iconDist, 'img');
fs.mkdirSync(imgDist, { recursive: true });
/* The page loads anand-karaj.webp (268 KB) via <picture>, with
   anand-karaj-fallback.png (900px, 818 KB) only for browsers without WebP.
   The 1216px transparent PNG and the original JPG are the editable masters:
   anand-karaj.png is what the WebP was encoded from, so it must stay in the
   build for the encoder to be reproducible. */
['anand-karaj.webp', 'anand-karaj-fallback.png', 'anand-karaj.png', 'anand-karaj.jpg', 'og.jpg'].forEach(function (f) {
  const src = path.join(ROOT, 'assets/img', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(imgDist, f));
});
// Raster app icons (apple-touch + PWA 192/512), if present.
['icon-180.png', 'icon-192.png', 'icon-512.png'].forEach(function (f) {
  const s = path.join(ROOT, 'assets/img', f);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(imgDist, f));
});

console.log('Built dist/index.html (Sikh theme, reception invite).');
console.log('  Couple   : ' + p1 + ' & ' + p2);
console.log('  Date     : ' + att(config, 'date', '-') + (att(config, 'time') ? ' | ' + att(config, 'time') : ''));
console.log('  Venue    : ' + att(config, 'venue.name', '-'));
console.log('  RSVP     : WhatsApp +' + att(config, 'rsvpWhatsApp.phone', 'not set'));
console.log('  PDF      : lazy-loaded (html2canvas + jsPDF on demand)');

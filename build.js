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
/* The structured-data event times. Driven by config.startISO / config.endISO
   - the SAME two values the .ics, the Google Calendar link and the page's
   own countdown read - so a search result, a calendar entry and the card a
   guest is looking at cannot disagree about when the reception is. They
   carry an explicit +05:30, so no guesswork about the build machine's
   timezone is involved. endDate was missing entirely: Google reads a
   missing end as "same day", which is not the same as "ends at 4pm". */
const eventIso = att(config, 'startISO', '') ||
  isoDate(att(config, 'date', '6 December 2026')) + 'T10:00:00+05:30';
const eventEndIso = att(config, 'endISO', '');

/* WhatsApp and iMessage both show only the TITLE of a shared link, so it has
   to work in both languages at once - an English-only title hides the fact
   that the whole page is bilingual from exactly the audience most likely to
   want the Punjabi. It is assembled from config (not typed in) so changing a
   name or the date cannot leave the share card out of step with the page. */
const dateShort = (function () {
  const parts = String(att(config, 'date', '')).trim().split(/\s+/);
  if (parts.length < 3) return String(att(config, 'date', ''));
  let day, monName, year;
  if (/^[0-9]{1,2}$/.test(parts[0])) { day = parts[0]; monName = parts[1]; year = parts[2]; }
  else { monName = parts[0]; day = parts[1]; year = parts[2]; }
  const want = monName.replace(/[^A-Za-z]/g, '').toLowerCase();
  const full = Object.keys(monthMap).find(function (k) { return k.toLowerCase() === want; });
  return day + ' ' + (full ? full.slice(0, 3) : monName) + ' ' + year.replace(/[^0-9]/g, '');
})();
const titlePa = String(att(config, 'i18n.pa.inviteTitle', att(config, 'i18n._extra.pa.inviteTitle', '')));
/* Built with a RAW ampersand and escaped once below, so it renders as a
   literal "&" in the HTML source rather than "&amp;amp;". */
const shareTitle = p1 + ' & ' + p2 + ' | ' + (titlePa || 'Wedding Reception') + ' | ' + dateShort;

/* The og:description / twitter:description body.

   It used to be config.seo.description verbatim - 125 characters, which a
   phone truncates mid-sentence, and which spent its whole budget on "With
   Waheguru blessings, you are warmly invited" while saying NOTHING about
   when or where the reception actually is. The preview card is often the
   only thing a guest reads before deciding to tap, so the two facts that
   decide that are the date, the IST time and the venue.

   Assembled from config for the same reason shareTitle is: a hand-written
   description is a second copy of the date and time that nobody updates. */
const ogDescription = [
  p1 + ' ' + connector + ' ' + p2,
  titlePa || 'Wedding Reception',
  dateShort,
  att(config, 'time', ''),
  att(config, 'venue.name', '')
].filter(Boolean).join(' · ');
/* og:image:alt is the text a screen reader reads when the image cannot be
   seen, and the fallback WhatsApp shows while the image loads. The old one
   read "Nirman & Simran | Wedding Reception | 6 December 2026 - Wedding
   Reception on 6 December 2026 at Park City Resort, Malout" - the same
   facts twice, in two different date formats, with a hardcoded couple name
   that no longer followed config. */
const ogImageAlt = p1 + ' ' + connector + ' ' + p2 + ' - ' +
  (titlePa || 'Wedding Reception') + ' on ' + att(config, 'date', '') +
  ' at ' + att(config, 'time', '') + ', ' + att(config, 'venue.name', '');

const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');

/* Floating-flower shower + the two guest toggles. Inlined into the same
   <style> block as style.css so dist/ stays a single self-contained file. */
let motionCss = '';
try {
  motionCss = fs.readFileSync(path.join(ROOT, 'css/invite-motion.css'), 'utf8');
} catch (e) {
  console.warn('css/invite-motion.css not found; flowers disabled in build.');
}

// Vendored QR code generator (MIT, qrcode-generator 1.4.4) — inlined so dist/ works offline
let qrLib = '';
try {
  qrLib = fs.readFileSync(path.join(ROOT, 'js/qrcode.min.js'), 'utf8')
    .replace(/<\/script/gi, '<\\/script');
} catch (e) {
  console.warn('js/qrcode.min.js not found; QR codes disabled in build.');
}

/* Small UI text injected statically (runtime localizes via window.__WEDDING_CONFIG__) */
const summaryEn = esc(extraEn.receptionHeading || 'Reception Party');
const summaryPa = esc(extraPa.receptionHeading || 'ਰਿਸੈਪਸ਼ਨ ਪਾਰਟੀ');

/* The gate hint is bilingual in both directions (see the comment on the
   markup below). Split once here so the STATIC html is already correct for
   a guest whose JavaScript has not finished - or failed - rather than
   showing one untracked run of mixed script. */
const gateHintHtml = (function () {
  const raw = String(extraEn.gateHintBoth || 'Tap your language to enter · ਭਾਸ਼ਾ ਚੁਣੋ');
  const parts = raw.split(/\s*·\s*/);
  if (parts.length < 2) return esc(raw);
  return '<span class="hint-latin">' + esc(parts[0]) + '</span>' +
    '<span class="hint-mid" aria-hidden="true">·</span>' +
    '<span class="hint-pa">' + esc(parts.slice(1).join(' · ')) + '</span>';
})();

const html = `<!DOCTYPE html>
<html lang="en">
    <head>
      <link rel="shortcut icon" href="favicon.png" type="image/png">
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
      <meta name="description" content="${esc(seoDesc)}">
      <meta name="author" content="${esc(p1)} &amp; ${esc(p2)}">
      <meta name="theme-color" content="#5f1526">
      <!-- SEARCH indexing is blocked, but NOT with a blanket noindex.
           This used to say <meta name="robots" content="noindex, nofollow">,
           on the reasoning (now recorded in robots.txt) that noindex "is about
           search indexing, not fetching". That is true of most crawlers and
           is exactly the wrong assumption here: the WhatsApp card is built by
           the Facebook crawler, facebookexternalhit, and a blanket noindex is
           a documented way to get a link shared with no preview at all. The
           owner wants this invitation SHARED on WhatsApp far more than they
           want it searchable, so the directive is scoped to the search bots
           instead. Google stays out; WhatsApp, iMessage, Slack and Facebook
           can now build a card. robots.txt blocks the same bots one layer up. -->
      <meta name="googlebot" content="noindex, nofollow, noimageindex">
      <meta name="bingbot" content="noindex, nofollow">
      <link rel="canonical" href="https://invite.nirmanpreet.com/">
      <link rel="apple-touch-icon" href="assets/img/icon-180.png">
      <meta property="og:type" content="website" />
      <meta property="og:title" content="${esc(shareTitle)}" />
      <meta property="og:description" content="${esc(ogDescription)}" />
      <meta property="og:url" content="https://invite.nirmanpreet.com/" />
      <meta property="og:site_name" content="${esc(p1)} &amp; ${esc(p2)}" />
      <meta property="og:locale" content="en_US" />
      <!-- One URL serves both languages (the page switches in place, there is
           no /pa/ path), so this only tells a scraper the Punjabi wording
           exists. Harmless if a platform ignores it; useful if it does not. -->
      <meta property="og:locale:alternate" content="pa_IN" />
      <meta property="og:image" content="https://invite.nirmanpreet.com/assets/img/og.jpg" />
      <meta property="og:image:secure_url" content="https://invite.nirmanpreet.com/assets/img/og.jpg" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="${esc(ogImageAlt)}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${esc(shareTitle)}" />
      <meta name="twitter:description" content="${esc(ogDescription)}" />
      <meta name="twitter:image" content="https://invite.nirmanpreet.com/assets/img/og.jpg" />
      <meta name="twitter:image:alt" content="${esc(ogImageAlt)}" />
      <title>${esc(shareTitle)}</title>

      <link rel="manifest" href="manifest.webmanifest">

      <!--
       FONTS ARE SELF-HOSTED NOW. The Google Fonts <link> and its two
       preconnects are gone: every guest on mobile data was paying a DNS
       lookup, a TLS handshake and two round trips to a third party before a
       single letter could be painted, and that <link rel=stylesheet> was
       render-blocking. The @font-face rules are at the top of css/style.css
       and the files come from tools/build-fonts.js.

       Font PRELOADS were tried here and are still not here, on the evidence:
       an A/B over three alternating Lighthouse runs on a throttled phone gave
       LCP 6.54s WITH them and 5.70s WITHOUT. Preloads are high priority and
       compete with the critical CSS and the LCP artwork. font-display:swap
       already means nothing waits on a font. Do not add them back without
       re-running that A/B.

       Prefetch/preconnect: the share preview and first paint both depend on
       these. og:image must be an ABSOLUTE URL or WhatsApp/iMessage show
       nothing. The artwork is preloaded as the likely LCP element; the
       <picture> on the page still picks WebP, so the preload and the element
       agree. -->
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  <link rel="preload" as="image" href="assets/img/anand-karaj-crop.webp" type="image/webp" fetchpriority="high">

      <style>
${css}
${motionCss}
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
        "startDate": "${eventIso}",${eventEndIso ? `
        "endDate": "${eventEndIso}",` : ''}
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

      <!-- Scroll progress — gold thread wayfinding -->
      <div class="scroll-progress" aria-hidden="true"></div>

      <!-- Intro gate: simple first-visit language pick -->
      <div class="intro-gate" id="intro-gate">
        <div class="card">
          <div class="ik" aria-hidden="true">ੴ</div>
          <div class="gate-blessing">
            ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ\u00a0॥<br>
            ਸਤਿਗੁਰ ਦਾਤੇ ਕਾਜ ਰਚਾਇਆ, ਆਪਣੀ ਮੇਹਰ ਕਰਾਈ\u00a0।<br>
            ਦਾਸਾਂ ਕਾਰਜ ਆਪ ਸਵਾਰੇ, ਇਹ ਉਸ ਦੀ ਵਡਿਆਈ\u00a0॥
          </div>
          <div class="gate-names"><span class="gate-name">${esc(p1)}</span><span class="amp">${esc(connector)}</span><span class="gate-name">${esc(p2)}</span></div>
          <div class="sub" id="intro-sub">${esc(extraEn.introSub || 'Wedding Invite')}</div>
          <div class="lang-pick" id="intro-lang-pick">
            <!-- No .active on either button: highlighting one language by
                 default reads as "this is the right one", and a large part of
                 the guest list reads Punjabi. Both are equal until one is
                 tapped; script.js may add .pre to Punjabi on a phone whose
                 own language is Punjabi. -->
            <button type="button" data-lang="en">English</button>
            <button type="button" data-lang="pa">ਪੰਜਾਬੀ</button>
          </div>
          <!-- Bilingual on purpose: the guest should not have to recognise
               their own language before being able to read the instruction.
               The two halves are separate elements because the Latin half is
               tracked and upper-cased and the Gurmukhi half must be NEITHER:
               letter-spacing severs Gurmukhi conjuncts and breaks the join at
               the top bar (W3C Gurmukhi Layout Requirements 5.1 / 6). One run
               of mixed text could not be styled both ways.
               Static so it reads correctly before script.js runs;
               updateIntroGate() keeps it in sync with config afterwards. -->
          <div class="gate-hint" id="gate-hint">${gateHintHtml}</div>
        </div>
      </div>

      <!-- Petals / floating flowers. Decoration only: aria-hidden so it is
           never announced, and the overlay itself already sits behind every
           content layer (z-index -1) with pointer-events disabled. -->
      <div class="sakura-falling" id="sakura-falling" aria-hidden="true"></div>

      <!-- Royal ornament frame -->
      <div class="royal-frame" aria-hidden="true">
        <img class="rf-corner tl" src="assets/svg/corner-ornament.svg" alt="" width="104" height="104">
        <img class="rf-corner tr" src="assets/svg/corner-ornament.svg" alt="" width="104" height="104">
        <img class="rf-corner bl" src="assets/svg/corner-ornament.svg" alt="" width="104" height="104">
        <img class="rf-corner br" src="assets/svg/corner-ornament.svg" alt="" width="104" height="104">
      </div>

      <!-- Blessing: Ik Onkar + Satgur Prasad + Lakh khushiaan pathshahiaan -->
      <main id="invite-main">
      <div class="blessing" id="invite-blessing"></div>

      <div class="ornament" aria-hidden="true">
        <img src="assets/svg/divider-ornament.svg" alt="" width="300" height="40" style="aspect-ratio:300/40">
      </div>

      <!-- Anand Karaj ceremonial art, straight after the blessing.
           <picture> because this is the page's likely LCP element: at 1216px
           the PNG is 1.36 MB, while the same resolution as WebP is 268 KB.
           The 900px PNG is only ever fetched by a browser with no WebP
           support, since a browser picks one source and ignores the other. -->
      <div class="ceremony-image" aria-hidden="true">
        <picture>
          <source type="image/webp" srcset="assets/img/anand-karaj-crop.webp">
          <img src="assets/img/anand-karaj-crop-fallback.png" alt="" width="993" height="1194" loading="eager" fetchpriority="high" decoding="async">
        </picture>
      </div>

      <!-- Print-only header -->
      <div id="print-header" class="print-header"></div>

      <div class="wrap">
        <div class="title" id="invite-title"></div>
      </div>

      <!-- Moved up from below the contact numbers. It used to sit 44% down the
           page, so a guest who picked the wrong language had to scroll past the
           blessing, the artwork, the names, the date and the buttons before they
           could change it - and nothing on the page hinted that it was there.
           Directly under the names it is visible immediately. It is a link, not
           an action, so it does not compete with Save the Date. -->
      <div class="lang-toggle" id="lang-toggle"></div>

      <div id="time"></div>
      <p class="dance-med" id="dance-med">${esc(extraEn.receptionHeading || 'Reception')}</p>

      <div class="actions" id="invite-actions"></div>
      <p class="footer" id="invite-footer"></p>
      <div id="day-info" class="day-info"></div>
      <div id="rsvp-section" class="rsvp-section"></div>
      <!-- QR codes first, then the map. The owner asked for this order.
           On a touch phone the QR block is hidden entirely (a phone cannot
           scan its own screen), so on a phone this pair simply reads
           "RSVP -> map", which is the order that was wanted anyway.
           On desktop, print and the PDF card the QR codes are the thing a
           guest holds up to someone else, so they now come before the
           directions. -->
      <div id="qr-section" class="qr-section"></div>
      <div id="venue-map-embed" class="venue-map-embed"></div>
      <div id="photos" class="photos"></div>
      <div id="print-section" class="print-section"></div>
      <p class="happiness" id="invite-social"></p>
      </main>

      <!-- The one shared audio element for the whole invitation. Its src is
           set from config.music.src at runtime and it is only ever played
           after the guest's first language tap. -->
      <div class="music" id="music-container" style="display:none;">
        <audio src="" id="my_audio" loop="loop" preload="none"></audio>
      </div>

      <!-- Hidden PDF card. Portrait (was 700px landscape) so the Anand Karaj
           artwork has room without the card becoming a letterboxed strip.
           Must stay in step with updatePdfLang() in js/script.js - same ids.

           display:none, not just parked off-screen at left:-9999px.
           Parked off-screen it is still LAID OUT, so the browser sees text
           set in its faces and downloads them for every guest who will
           never tap "download". That was Great Vibes (30 KB) plus two
           more faces pulled onto the critical path of every single visit
           for a card most guests do not open. onDownloadPdfClick() turns
           it back on before html2canvas reads it. -->
      <div id="pdf-card" class="pdf-card" style="display:none; position:absolute; left:-9999px; top:0; width:560px; background:#faf6ec; color:#4a1220; font-family:'Cormorant Garamond', Georgia, serif; border:1px solid #e3d5b3; padding:34px 30px 26px; box-sizing:border-box;">
        <div style="text-align:center;">
          <div style="font-size:32px; color:#86162c; line-height:1; margin-bottom:10px;" id="pdf-ik">ੴ</div>
          <div style="font-size:14px; line-height:1.85; color:#5f1526; margin-bottom:16px; font-family:'Noto Sans Gurmukhi', serif; white-space:pre-line;" id="pdf-blessing">ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ\u00a0॥
ਸਤਿਗੁਰ ਦਾਤੇ ਕਾਜ ਰਚਾਇਆ, ਆਪਣੀ ਮੇਹਰ ਕਰਾਈ\u00a0।
ਦਾਸਾਂ ਕਾਰਜ ਆਪ ਸਵਾਰੇ, ਇਹ ਉਸ ਦੀ ਵਡਿਆਈ\u00a0॥</div>
          <!-- The Anand Karaj artwork, which the old card left out entirely.
               No crossorigin attribute: it would cache separately from the
               same file the page loads and download it twice. -->
          <div style="margin:2px auto 14px; width:300px;">
            <img src="assets/img/anand-karaj-crop.webp" alt="" style="display:block; width:100%; height:auto;">
          </div>
          <div style="font-size:14px; color:#4a1220; font-style:italic; margin-bottom:8px;" id="pdf-subtext">${esc(att(config, '_pdf.subtext', 'You are cordially invited to the Reception of'))}</div>
          <div style="font-size:44px; color:#5f1526; font-family:'Great Vibes', cursive; margin:2px 0; line-height:1.1;" id="pdf-name-1">${esc(p1)}</div>
          <div style="font-size:20px; color:#7a5a16; font-family:'Great Vibes', cursive; line-height:1.1;" id="pdf-connector">${esc(connector)}</div>
          <div style="font-size:44px; color:#5f1526; font-family:'Great Vibes', cursive; margin:2px 0 8px; line-height:1.1;" id="pdf-name-2">${esc(p2)}</div>
          <div style="font-size:14px; letter-spacing:2px; color:#6b1a2e; margin-bottom:8px;" id="pdf-event-line">${esc(extraEn.receptionHeading || 'Reception')} &bull; ${esc(att(config, 'date', ''))}</div>
          <div style="font-size:15px; color:#4a1220; margin:3px 0;" id="pdf-time-line">${esc(att(config, 'time', ''))}</div>
          <div style="font-size:15px; color:#4a1220; margin:3px 0;" id="pdf-venue-line">${esc(att(config, 'venue.name', ''))}${att(config, 'venue.address') ? ', ' + esc(att(config, 'venue.address')) : ''}</div>
          <div id="pdf-qr" class="pdf-qr"></div>
          <div style="margin-top:20px; border-top:1px solid #e3d5b3; padding-top:12px; font-size:13px; color:#4a1220;" id="pdf-footer-note">${esc(att(config, '_pdf.footerNote', 'With love and joy, together with their families'))}</div>
          <div style="margin-top:5px; font-size:12px; color:#5f4718;" id="pdf-contact">${esc(att(config, 'footer.contact', ''))}</div>
        </div>
      </div>

      <!-- The single .ics generator, shared by the page and this build. -->
      <script src="./js/ics.js"></script>
      <script src="./js/script.js"></script>
      <!-- Must come after script.js: it listens for the wedding-enter event
           that script.js dispatches from enterSite(). -->
      <script src="./js/invite-motion.js"></script>
    </body>
</html>
`;

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

const faviconSrc = path.join(ROOT, 'favicon.png');
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, path.join(DIST, 'favicon.png'));
}
/* Without this the host's SPA fallback answers /robots.txt with the whole
   index.html at 200 text/html, which crawlers cannot parse as a policy. */
const robotsSrc = path.join(ROOT, 'robots.txt');
if (fs.existsSync(robotsSrc)) {
  fs.copyFileSync(robotsSrc, path.join(DIST, 'robots.txt'));
}
const jsDist = path.join(DIST, 'js');
fs.mkdirSync(jsDist, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'js/script.js'), path.join(jsDist, 'script.js'));

// Shared .ics generator - loaded by the page, required by build.js.
fs.copyFileSync(path.join(ROOT, 'js/ics.js'), path.join(jsDist, 'ics.js'));

// Flower shower + the two toggles. Referenced by <script src> in the page,
// so it ships as a file rather than being inlined.
const motionJsSrc = path.join(ROOT, 'js/invite-motion.js');
if (fs.existsSync(motionJsSrc)) {
  fs.copyFileSync(motionJsSrc, path.join(jsDist, 'invite-motion.js'));
} else {
  console.warn('js/invite-motion.js not found; flowers and music toggles disabled in build.');
}

/* Background music. config.music.src is "./music.mp3", i.e. relative to the
   page, so the track has to sit at the root of dist/. Nothing was copied
   here before, which is why the deployed site had a silent <audio> tag. */
const musicSrc = att(config, 'music.src', '');
if (musicSrc && att(config, 'music.enabled', false)) {
  const from = path.join(ROOT, musicSrc.replace(/^\.\//, ''));
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(DIST, path.basename(musicSrc)));
    console.log('  Music   : ' + path.basename(musicSrc));
  } else {
    console.warn('music.src points at a missing file (' + musicSrc + '); music disabled in build.');
  }
}

/* The calendar event, as a REAL file.
   The page used to link a data:text/calendar URI. iOS cannot use those at
   all - data: URLs crash SFSafariViewController, and in-app browsers can
   neither open the Calendar app nor download a file - so "Add to calendar"
   silently did nothing on the phones this invitation is actually opened on.
   Served over HTTPS with text/calendar, iOS offers it to the Calendar app. */
const ics = require('./js/ics.js');
fs.writeFileSync(path.join(DIST, 'wedding.ics'), ics.buildIcs(config), 'utf8');
console.log('  Calendar: wedding.ics');

// PWA manifest + icon assets
const manifestSrc = path.join(ROOT, 'manifest.webmanifest');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, path.join(DIST, 'manifest.webmanifest'));
}
const iconDist = path.join(DIST, 'assets');
fs.mkdirSync(iconDist, { recursive: true });

/* Wipe the two directories this build owns before repopulating them.
   Without this, an asset deleted from assets/ lingers in dist/ forever
   and still gets deployed - which is how rose-petal.svg and a long-dead
   anand-karaj.svg survived several builds. Only these two fully-derived
   directories are touched; dist/index.html and dist/js are overwritten
   in place rather than removed. */
[path.join(iconDist, 'svg'), path.join(iconDist, 'img')].forEach(function (dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
});

const iconSrc = path.join(ROOT, 'assets/icon.svg');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(iconDist, 'icon.svg'));
}
// Self-hosted, subsetted woff2 faces (tools/build-fonts.js). Copied as a
// whole directory rather than a hard-coded list, so a weight added to the
// generator ships without anyone having to remember a second place.
const fontsSrc = path.join(ROOT, 'assets', 'fonts');
if (fs.existsSync(fontsSrc)) {
  const fontsDist = path.join(DIST, 'assets', 'fonts');
  fs.rmSync(fontsDist, { recursive: true, force: true });
  fs.mkdirSync(fontsDist, { recursive: true });
  fs.readdirSync(fontsSrc).forEach(function (f) {
    if (/\.woff2$/.test(f)) fs.copyFileSync(path.join(fontsSrc, f), path.join(fontsDist, f));
  });
  const n = fs.readdirSync(fontsDist).length;
  const bytes = fs.readdirSync(fontsDist).reduce((a, f) => a + fs.statSync(path.join(fontsDist, f)).size, 0);
  console.log('  Fonts   : ' + n + ' woff2, ' + (bytes / 1024).toFixed(0) + ' KB');
} else {
  console.warn('assets/fonts not found; text will fall back to Georgia/serif.');
}
// Royal ornament + Anand Karaj art
const svgDist = path.join(iconDist, 'svg');
fs.mkdirSync(svgDist, { recursive: true });
const ornamentSrc = path.join(ROOT, 'assets/svg/ornament.svg');
if (fs.existsSync(ornamentSrc)) {
  fs.copyFileSync(ornamentSrc, path.join(svgDist, 'ornament.svg'));
}
['corner-ornament.svg', 'divider-ornament.svg'].forEach(function (f) {
  const s = path.join(ROOT, 'assets/svg', f);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(svgDist, f));
});
const imgDist = path.join(iconDist, 'img');
fs.mkdirSync(imgDist, { recursive: true });
/* The page loads anand-karaj-crop.webp (247 KB) via <picture>, with
   anand-karaj-crop-fallback.png only for browsers without WebP.
   Both are cropped from the master: the source is a 1216px SQUARE canvas
   holding a 993x1194 PORTRAIT illustration, so cropping removes ~64px of
   dead width on every render and let the phone size go up (see
   tools/crop-artwork.mjs).

   anand-karaj.png and anand-karaj.jpg are the EDITABLE MASTER and the
   original photo it came from. Nothing references either: a grep across
   index.html, js/ and build.js finds no real use, and both were being
   copied into dist/ anyway - 1.6 MB of deploy payload that no guest has
   ever downloaded. They stay in assets/img/ so the crop stays
   reproducible; they just no longer ship. */
['anand-karaj-crop.webp', 'anand-karaj-crop-fallback.png', 'og.jpg'].forEach(function (f) {
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

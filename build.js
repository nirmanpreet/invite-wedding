#!/usr/bin/env node
/**
 * Build a single self-contained dist/ for free hosting (GitHub Pages / Vercel / Netlify).
 * Usage: node build.js   (reads data/config.json)
 *
 * Phase 2: the build now starts from the REAL index.html instead of a second,
 * hand-maintained HTML template. The template had already drifted from
 * index.html (different pdf-card font, no color-scheme meta), and keeping two
 * copies of the markup meant every markup change had to be made twice.
 * Only the pieces that must change for a single-file build are rewritten:
 * the two stylesheets become <style> blocks, config.js becomes an inline
 * window.__WEDDING_CONFIG__, and qrcode.min.js is inlined.
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

function att(obj, dotted, fallback) {
  let cur = obj;
  for (const p of String(dotted).split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return fallback;
    if (!(p in cur)) return fallback;
    cur = cur[p];
  }
  return cur === null || cur === undefined ? fallback : cur;
}

const p1 = att(config, 'couple.partner1', 'Partner 1');
const p2 = att(config, 'couple.partner2', 'Partner 2');

const monthMap = { January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
                   July: '07', August: '08', September: '09', October: '10', November: '11', December: '12' };
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

let html;
try {
  html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
} catch (e) {
  console.error('Failed to read index.html:', e.message);
  process.exit(1);
}

function readIf(p, warn) {
  try { return fs.readFileSync(p, 'utf8'); }
  catch (e) { if (warn) console.warn(warn); return ''; }
}

const css = readIf(path.join(ROOT, 'css/style.css'), 'css/style.css not found.');
const motionCss = readIf(path.join(ROOT, 'css/invite-motion.css'), 'css/invite-motion.css not found; building without the motion layer.');
// Vendored QR code generator (MIT, qrcode-generator 1.4.4) — inlined so dist/ works offline
const qrLib = readIf(path.join(ROOT, 'js/qrcode.min.js'), 'js/qrcode.min.js not found; QR codes disabled in build.')
  .replace(/<\/script/gi, '<\\/script');

function replaceOnce(src, needle, replacement, label) {
  if (src.indexOf(needle) === -1) {
    console.warn('build: expected to replace ' + label + ' but it was not found; leaving index.html as-is.');
    return src;
  }
  return src.replace(needle, replacement);
}

html = replaceOnce(html, '<link rel="stylesheet" href="./css/style.css">', '<style>\n' + css + '\n</style>', 'style.css link');
html = replaceOnce(html, '<link rel="stylesheet" href="./css/invite-motion.css">', motionCss ? '<style>\n' + motionCss + '\n</style>' : '', 'invite-motion.css link');
html = replaceOnce(html, '<script src="./js/qrcode.min.js"></script>', qrLib ? '<script>\n' + qrLib + '\n</script>' : '', 'qrcode script');
html = replaceOnce(html, '<script src="./config.js"></script>',
  '<script>\nwindow.__WEDDING_CONFIG__ = ' + JSON.stringify(config, null, 2) + ';\n</script>', 'config.js script');

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

console.log('Built dist/index.html (single-file, from index.html).');
console.log('  Couple   : ' + p1 + ' & ' + p2);
console.log('  Date     : ' + att(config, 'date', '-') + (att(config, 'time') ? ' | ' + att(config, 'time') : ''));
console.log('  Venue    : ' + att(config, 'venue.name', '-'));
console.log('  RSVP     : WhatsApp +' + att(config, 'rsvpWhatsApp.phone', 'not set'));
console.log('  PDF      : lazy-loaded (html2canvas + jsPDF on demand)');

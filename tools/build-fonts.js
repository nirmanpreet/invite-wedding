#!/usr/bin/env node
/**
 * Self-host the webfonts.
 *
 * WHY
 * The page loaded seven families from fonts.googleapis.com. Every guest on
 * mobile data, opening a WhatsApp link, paid a DNS lookup, a TLS handshake
 * and two round trips to a third party before a single letter could be
 * painted. That is the biggest single reason the throttled-phone LCP sat
 * around 3.5-4.4s.
 *
 * WHICH
 * Not "the families in the <link>". Two of them were dead weight:
 *   Crimson Text  - zero references in the CSS, the HTML or the JS.
 *   Arvo          - a phantom: it appears only as a fallback in --font-body
 *                   and was never in the <link>, so it cost nothing and
 *                   did nothing.
 * Dancing Script is NOT a leftover - it is the face the names are set in,
 * and the one the whole "never upper-case a script face" rule exists for.
 *
 * The weight list below is not a guess. It is what the page actually
 * requests, measured by instrumenting the Google-Fonts build and reading
 * document.fonts on a real page load in both languages:
 *   Cormorant Garamond  400  400italic  600  700
 *   Playfair Display    400  500  600  700
 *   Dancing Script      400  700
 *   Great Vibes         400
 *   Noto Sans Gurmukhi  400  600
 * 500 is kept on Cormorant as well: it is declared on the html[lang="pa"]
 * lists and would otherwise fall back and reflow.
 *
 * HOW
 * 1. Ask Google for the CSS with a browser UA, which returns woff2.
 * 2. Download the face.
 * 3. PIN THE WEIGHT. Google now serves a VARIABLE font covering the whole
 *    400-700 range as a single file. Shipping that verbatim would mean an
 *    Android WebView older than Chrome 62 - precisely the phones in the
 *    brief - renders every heading at the default 400 instance, so bold
 *    text quietly becomes regular. Each weight is therefore instanced to a
 *    static font with fontTools.varLib.instancer.
 * 4. Subset to the characters the page can draw.
 *    --layout-features='*' is NOT optional: drop it and every Gurmukhi
 *    conjunct and vowel mark in the verse renders broken.
 *
 * Run:  node tools/build-fonts.js   (needs: pip install fonttools brotli)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'fonts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const FAMILIES = [
  {
    q: 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400',
    name: 'Cormorant Garamond', slug: 'cormorant-garamond', gurmukhi: false,
    weights: [{ w: 400, s: 'normal' }, { w: 500, s: 'normal' }, { w: 600, s: 'normal' }, { w: 700, s: 'normal' }, { w: 400, s: 'italic' }],
  },
  {
    q: 'Playfair+Display:wght@400;500;600;700',
    name: 'Playfair Display', slug: 'playfair-display', gurmukhi: false,
    weights: [{ w: 400, s: 'normal' }, { w: 500, s: 'normal' }, { w: 600, s: 'normal' }, { w: 700, s: 'normal' }],
  },
  {
    q: 'Dancing+Script:wght@400;700',
    name: 'Dancing Script', slug: 'dancing-script', gurmukhi: false,
    weights: [{ w: 400, s: 'normal' }, { w: 700, s: 'normal' }],
  },
  {
    q: 'Great+Vibes:wght@400',
    name: 'Great Vibes', slug: 'great-vibes', gurmukhi: false,
    weights: [{ w: 400, s: 'normal' }],
  },
  {
    q: 'Noto+Sans+Gurmukhi:wght@400;600',
    name: 'Noto Sans Gurmukhi', slug: 'noto-sans-gurmukhi', gurmukhi: true,
    weights: [{ w: 400, s: 'normal' }, { w: 600, s: 'normal' }],
  },
];

/* What the page can actually draw. Basic Latin, the punctuation it uses,
   and the Gurmukhi block. Kept tight on purpose: every codepoint kept is
   bytes in every download. Noto gets BOTH blocks in one file, which is why
   it needs one request per weight rather than the two Google splits it into. */
const UNICODES_GURMUKHI =
  'U+0020-007E,U+00A0,U+00B7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,' +
  'U+0A00-0A7F,U+25CC';
const UNICODES_LATIN = 'U+0020-007E,U+00A0,U+00B7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022';

function get(url, asBuffer) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': UA } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return resolve(get(new URL(r.headers.location, url).href, asBuffer));
      }
      if (r.statusCode !== 200) { r.resume(); return reject(new Error(url + ' -> HTTP ' + r.statusCode)); }
      const chunks = [];
      r.on('data', (d) => chunks.push(d));
      r.on('end', () => resolve(asBuffer ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function faces(css) {
  const out = [];
  const re = /@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const body = m[1];
    const grab = (k) => {
      const hit = new RegExp(k + '\\s*:\\s*([^;]+)').exec(body);
      return hit ? hit[1].trim().replace(/^['"]|['"]$/g, '') : '';
    };
    const src = grab('src');
    const um = /url\(([^)]+)\)/.exec(src);
    out.push({
      family: grab('font-family'),
      weight: grab('font-weight'),
      style: grab('font-style') || 'normal',
      url: um ? um[1] : '',
      range: grab('unicode-range'),
    });
  }
  return out;
}

/* Which subset carries which block. Google splits latin and gurmukhi into
   separate files; for Noto we take the gurmukhi subset and add the latin
   range ourselves in the subset step. */
const covers = (range, a, b) => (range || '').split(',').some((part) => {
  const m = /^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/.exec(part.trim());
  if (!m) return false;
  const lo = parseInt(m[1], 16);
  const hi = m[2] ? parseInt(m[2], 16) : lo;
  return !(hi < a || lo > b);
});

const py = (...args) => execFileSync('python', args, { stdio: 'pipe' });

(async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, '.tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  const written = [];
  const seenFiles = new Map();   // url -> local path, so a variable font is downloaded once

  for (const fam of FAMILIES) {
    const css = await get('https://fonts.googleapis.com/css2?family=' + fam.q + '&display=swap', false);
    const all = faces(css);

    for (const { w, s } of fam.weights) {
      const cands = all.filter((f) => f.weight === String(w) && f.style === s);
      if (!cands.length) { console.log(`  !! ${fam.slug} ${w}${s === 'italic' ? 'i' : ''} NOT IN GOOGLE CSS`); continue; }
      const pick = (fam.gurmukhi && covers(cands[0].range, 0x0A00, 0x0A7F)
        ? cands.find((f) => covers(f.range, 0x0A00, 0x0A7F)) : null)
        || cands.find((f) => covers(f.range, 0x0041, 0x007A)) || cands[0];

      let raw = seenFiles.get(pick.url);
      if (!raw) {
        raw = path.join(tmp, `dl-${seenFiles.size}.woff2`);
        fs.writeFileSync(raw, await get(pick.url, true));
        seenFiles.set(pick.url, raw);
      }

      const tag = `${w}${s === 'italic' ? 'i' : ''}`;
      const base = `${fam.slug}-${tag}`;

      // 1. pin the weight if this is a variable font
      let src = raw;
      const isVariable = py('-c',
        `from fontTools.ttLib import TTFont;import sys;print('fvar' if 'fvar' in TTFont(sys.argv[1]) else 'static')`, raw)
        .toString().trim() === 'fvar';
      if (isVariable) {
        src = path.join(tmp, `${base}.inst.woff2`);
        py('-m', 'fontTools.varLib.instancer', raw, `wght=${w}`, `--output=${src}`);
      }

      // 2. subset to what the page can draw
      const outPath = path.join(OUT, `${base}.woff2`);
      py('-m', 'fontTools.subset', src,
        `--unicodes=${fam.gurmukhi ? UNICODES_GURMUKHI : UNICODES_LATIN}`,
        '--layout-features=*',
        '--flavor=woff2',
        `--output-file=${outPath}`);

      const kb = fs.statSync(outPath).size / 1024;
      written.push({ file: path.basename(outPath), family: fam.name, weight: w, style: s, kb });
      console.log(`  ${kb.toFixed(1).padStart(6)} KB  ${base}.woff2${isVariable ? '  (pinned from variable)' : ''}`);
    }
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  const total = written.reduce((a, f) => a + f.kb, 0);
  console.log(`\n${written.length} files, ${total.toFixed(1)} KB on disk.`);
  console.log(`Google was loading ${seenFiles.size} variable files (${(written.length)} faces) plus 2 round trips.`);

  const block = written.map((f) =>
    `@font-face {\n  font-family: '${f.family}';\n  src: url('assets/fonts/${f.file}') format('woff2');\n` +
    `  font-weight: ${f.weight};\n  font-style: ${f.style};\n  font-display: swap;\n}`
  ).join('\n');
  fs.writeFileSync(path.join(OUT, 'faces.css'),
    '/* Generated by tools/build-fonts.js - do not hand-edit.\n' +
    '   Re-run: node tools/build-fonts.js */\n' + block + '\n', 'utf8');
  console.log('Wrote assets/fonts/faces.css');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
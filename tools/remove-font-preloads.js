/**
 * Remove the font <link rel=preload> tags that were added to index.html and
 * build.js, replacing them with a note recording WHY they were removed.
 * An A/B over three alternating Lighthouse runs showed they cost ~0.85s of
 * LCP on a throttled phone (6.54s with, 5.70s without) - see qa/ab-fonts.mjs.
 */
'use strict';
const fs = require('fs');

const NOTE = [
  '  <!-- Font preloads were TRIED here and REMOVED again on the evidence.',
  '       Preloading the four faces the gate card needs (Noto Sans Gurmukhi,',
  '       Dancing Script, Playfair Display, Cormorant Garamond) looked like the',
  '       obvious fix for the render-blocking Google Fonts stylesheet, but an',
  '       A/B over three alternating Lighthouse runs on a throttled phone said',
  '       the opposite: FCP 4.29s -> 3.99s and LCP 6.54s -> 5.70s without them.',
  '       Preloads are high priority and simply compete with the critical CSS',
  '       and the LCP artwork. They did improve CLS (0.016 vs 0.032), but both',
  '       figures sit far inside the 0.1 "good" threshold, so that is not worth',
  '       ~0.85s of LCP.',
  '',
  '       The real fix for that render block is self-hosting the fonts, which',
  '       removes the third-party round trip instead of racing it. That needs',
  '       font files, licences and an @font-face block, and has not been done. -->',
];

for (const f of ['index.html', 'build.js']) {
  let s = fs.readFileSync(f, 'utf8');
  const before = (s.match(/<link rel="preload" as="font"[^>]*>/g) || []).length;
  // Drop the whole preload comment block plus the four tags.
  s = s.replace(/\s*<!-- Preload the four faces[\s\S]*?-->\s*(?=<link rel="preload" as="font"[\s\S]*?-->\s*)/, '\n');
  s = s.replace(/\s*<link rel="preload" as="font"[^>]*>/g, '');
  fs.writeFileSync(f, s, 'utf8');
  const after = (s.match(/<link rel="preload" as="font"/g) || []).length;
  console.log(`${f}: removed ${before} preload tag(s), ${after} left`);
}

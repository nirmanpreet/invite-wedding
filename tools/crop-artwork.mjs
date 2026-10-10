/**
 * Crop the transparent padding off the Anand Karaj artwork.
 *
 * The source is a 1216x1216 SQUARE canvas holding a 965x1160 PORTRAIT
 * illustration - 62.9% of the file is see-through. Rendered with
 * object-fit:contain, ~64px of every phone-width box is empty, so the
 * artwork reads smaller than it is and the height cap has to stay low to
 * keep the couple's names on the first screen.
 *
 * Cropping to the alpha bounding box (plus a small margin so the
 * anti-aliased edges of the branches are not shaved) means every pixel in
 * the box is artwork, which frees up the room to make it bigger.
 *
 * WebP is produced with Chrome's own canvas encoder rather than an image
 * library, so the page keeps its 268 KB WebP path instead of falling back
 * to a much larger PNG.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve('assets/img');
const SRC = path.join(ROOT, 'anand-karaj.png');

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.goto('about:blank');

const dataUrl = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');

const out = await page.evaluate(async (url) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;

  // Alpha bounding box. 16/255 rather than 0 so a faint halo left by the
  // matte removal is kept instead of being clipped off.
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // 1.5% margin on each side of the content box.
  const mx = Math.round((maxX - minX + 1) * 0.015);
  const my = Math.round((maxY - minY + 1) *0.015);
  const sx = Math.max(0, minX - mx);
  const sy = Math.max(0, minY - my);
  const sw = Math.min(c.width - sx, maxX - minX + 1 + mx * 2);
  const sh = Math.min(c.height - sy, maxY - minY + 1 + my * 2);

  const o = document.createElement('canvas');
  o.width = sw; o.height = sh;
  o.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  return {
    source: { w: c.width, h: c.height },
    bbox: { minX, maxX, minY, maxY },
    crop: { sx, sy, sw, sh },
    webp: o.toDataURL('image/webp', 0.92),
    png: o.toDataURL('image/png'),
  };
}, dataUrl);

await browser.close();

const webp = Buffer.from(out.webp.split(',')[1], 'base64');
const png = Buffer.from(out.png.split(',')[1], 'base64');

fs.writeFileSync(path.join(ROOT, 'anand-karaj-crop.webp'), webp);
fs.writeFileSync(path.join(ROOT, 'anand-karaj-crop.png'), png);

const pct = (a, b) => (a / b * 100).toFixed(1) + '%';
console.log('source        : ' + out.source.w + 'x' + out.source.h);
console.log('content bbox  : x ' + out.bbox.minX + '..' + out.bbox.maxX + '  y ' + out.bbox.minY + '..' + out.bbox.maxY);
console.log('cropped to    : ' + out.crop.sw + 'x' + out.crop.sh +
  '   (' + pct(out.crop.sw, out.source.w) + ' of width, ' + pct(out.crop.sh, out.source.h) + ' of height)');
console.log('new aspect    : ' + (out.crop.sw / out.crop.sh).toFixed(3) + ':1  (was 1.000 square)');
console.log('');
const kb = (f) => {
  try { return (fs.statSync(path.join(ROOT, f)).size / 1024).toFixed(0) + ' KB'; }
  catch (e) { return 'n/a'; }
};
console.log('anand-karaj-crop.webp : ' + (webp.length / 1024).toFixed(0) + ' KB');
console.log('anand-karaj-crop.png  : ' + (png.length / 1024).toFixed(0) + ' KB (intermediate)');
console.log('');
console.log('for reference, the un-cropped originals (if still present):');
console.log('  anand-karaj.webp           ' + kb('anand-karaj.webp'));
console.log('  anand-karaj-fallback.png  ' + kb('anand-karaj-fallback.png'));
console.log('  anand-karaj.png (master)   ' + kb('anand-karaj.png'));

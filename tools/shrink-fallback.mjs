/**
 * Right-size the cropped PNG fallback.
 *
 * anand-karaj-crop.png came out at 1349 KB because it is near full
 * resolution. The existing fallback was 818 KB at 900px wide, and the
 * fallback is only ever used by browsers with no WebP support - so it
 * should match that policy rather than ship the biggest file in the repo.
 * Downscaled to 900px wide, keeping the same aspect as the crop.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve('assets/img');
const SRC = path.join(ROOT, 'anand-karaj-crop.png');
const TARGET_W = 800;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.goto('about:blank');

const url = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');
const png = await page.evaluate(async ({ url, TARGET_W }) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const h = Math.round(img.naturalHeight * TARGET_W / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = TARGET_W;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, TARGET_W, h);
  return { data: c.toDataURL('image/png'), w: TARGET_W, h, srcW: img.naturalWidth, srcH: img.naturalHeight };
}, { url, TARGET_W });

await browser.close();

const buf = Buffer.from(png.data.split(',')[1], 'base64');
fs.writeFileSync(path.join(ROOT, 'anand-karaj-crop-fallback.png'), buf);
console.log('anand-karaj-crop-fallback.png : ' + png.w + 'x' + png.h + '  ' + (buf.length / 1024).toFixed(0) + ' KB');
console.log('  (from ' + png.srcW + 'x' + png.srcH + ')');

/* Build the og:image share card.
 *
 * Renders tools/og-template.html through headless Chrome at exactly 1200x630
 * (the aspect WhatsApp, Facebook, iMessage and Slack all crop for) and
 * encodes it to JPEG. JPEG rather than PNG: the card is opaque, and JPEG
 * gets to ~90 KB where PNG would be several hundred.
 *
 * Run:  node tools/make-og.js
 * Needs a Chrome already listening on CDP port 3333.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.CDP_PORT || 3333);
const SITE = process.env.SITE_URL || 'https://invite.nirmanpreet.com';

function req(m, p) {
  return new Promise((res, rej) => {
    const r = http.request({ host: 'localhost', port: PORT, path: p, method: m }, s => {
      let d = '';
      s.on('data', c => d += c);
      s.on('end', () => { try { res(d ? JSON.parse(d) : {}); } catch (e) { rej(e); } });
    });
    r.on('error', rej);
    r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

class Tab {
  constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map(); }
  connect() {
    return new Promise((res, rej) => {
      this.s = new WebSocket(this.ws);
      this.s.onopen = res;
      this.s.onerror = rej;
      this.s.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.id && this.p.has(m.id)) {
          const h = this.p.get(m.id);
          this.p.delete(m.id);
          m.error ? h.rej(new Error(m.error.message)) : h.res(m.result);
        }
      };
    });
  }
  send(m, p = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.p.set(id, { res, rej });
      this.s.send(JSON.stringify({ id, method: m, params: p }));
    });
  }
  async ev(x) {
    const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || 'eval error');
    return r.result && r.result.value;
  }
}

(async () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/config.json'), 'utf8'));
  // Read every value from config rather than hardcoding, so the share card
  // cannot drift out of sync with the invitation if any of it changes.
  const couple = config.couple || {};
  const p1 = couple.partner1;
  const p2 = couple.partner2;
  const conn = couple.connector || '&';
  if (!p1 || !p2) { console.error('could not read couple names from config'); process.exit(1); }

  const venue = config.venue || {};
  const og = {
    gurbani: [
      'ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
      'ਲਖ ਖੁਸੀਆ ਪਾਤਿਸਾਹੀਆ ਜੇ ਸਤਿਗੁਰੁ ਨਦਰਿ ਕਰੇਇ ॥'
    ],
    p1, p2,
    connector: conn,
    date: config.date,
    time: config.time,
    venue: venue.name + ' · ' + String(venue.address || '').split(',')[0],
    domain: SITE.replace(/^https?:\/\//, '').replace(/\/$/, '')
  };

  // inject the copy into the template
  const tplPath = path.join(ROOT, 'tools/og-template.html');
  let tpl = fs.readFileSync(tplPath, 'utf8');
  tpl = tpl.replace(/window\.__OG__ = \{[^}]*\};/, 'window.__OG__ = ' + JSON.stringify(og) + ';');
  if (!/window\.__OG__ = \{/.test(tpl)) { console.error('could not inject copy into template'); process.exit(1); }
  const tmpPath = path.join(ROOT, 'tools/.og-render.html');
  fs.writeFileSync(tmpPath, tpl, 'utf8');

  const tab = new Tab((await req('PUT', '/json/new?about:blank')).webSocketDebuggerUrl);
  await tab.connect();
  await tab.send('Page.enable');
  await tab.send('Runtime.enable');
  await tab.send('Network.enable');
  await tab.send('Network.setCacheDisabled', { cacheDisabled: true });
  await tab.send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 630, deviceScaleFactor: 1, mobile: false
  });

  await tab.send('Page.navigate', { url: 'file:///' + tmpPath.replace(/\\/g, '/') });
  await sleep(1000);
  // wait for webfonts so Dancing Script / Gurmukhi are actually applied
  await tab.ev('document.fonts.ready').catch(() => {});
  await sleep(2500);

  const metrics = await tab.ev(
    "(function(){var d=document.documentElement;" +
    "return JSON.stringify({w:d.scrollWidth,h:d.scrollHeight," +
    "overflowX:d.scrollWidth-d.clientWidth});})()"
  );
  const m = JSON.parse(metrics);
  if (m.w !== 1200 || m.h !== 630) {
    console.error('template is ' + m.w + 'x' + m.h + ', expected 1200x630 - adjust the CSS');
    process.exit(1);
  }
  if (m.overflowX > 0) console.warn('WARNING: horizontal overflow ' + m.overflowX + 'px');

  const shot = await tab.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const rawPng = Buffer.from(shot.data, 'base64');
  fs.writeFileSync(path.join(ROOT, 'tools/og-preview.png'), rawPng);

  // transcode PNG -> JPEG in the page, to keep the toolchain to just node
  const jpeg = await tab.ev(`(function(){
    return new Promise(function(resolve){
      var img=new Image();
      img.onload=function(){
        var c=document.createElement('canvas');
        c.width=1200;c.height=630;
        c.getContext('2d').drawImage(img,0,0,1200,630);
        resolve(c.toDataURL('image/jpeg',0.9));
      };
      img.onerror=function(){resolve(null);};
      img.src='data:image/png;base64,${shot.data}';
    });
  })()`);

  fs.unlinkSync(tmpPath);

  if (!jpeg) { console.error('JPEG transcode failed; PNG kept at tools/og-preview.png'); process.exit(1); }
  const buf = Buffer.from(jpeg.split(',')[1], 'base64');
  const outPath = path.join(ROOT, 'assets/img/og.jpg');
  fs.writeFileSync(outPath, buf);

  console.log('wrote assets/img/og.jpg   ' + (buf.length / 1024).toFixed(0) + ' KB  1200x630');
  console.log('  jpeg magic : ' + JSON.stringify(buf.slice(0, 3).toString('latin1')));
  console.log('  size class : ' + (buf.length < 300 * 1024 ? 'good for WhatsApp (<300 KB)' : 'TOO BIG for WhatsApp'));
  console.log('  absolute   : ' + SITE + '/assets/img/og.jpg');
  console.log('  preview    : tools/og-preview.png');
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
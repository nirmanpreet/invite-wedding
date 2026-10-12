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
  const extra = (config.i18n && config.i18n._extra) || {};
  const en = extra.en || {};
  const og = {
    gurbani: [
      'ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
      'ਲਖ ਖੁਸ਼ੀਆ ਪਾਤਿਸਾਹੀਆ ਜੇ ਸਤਿਗੁਰੁ ਨਦਰਿ ਕਰੇਇ ॥'
    ],
    blessing: en.blessing || 'With the blessings of Waheguru',
    heading: (en.receptionHeading || 'Wedding Reception').toUpperCase(),
    p1, p2,
    connector: conn,
    date: config.date,
    time: config.time,
    venue: venue.name + ' · ' + String(venue.address || '').split(',')[0],
    domain: SITE.replace(/^https?:\/\//, '').replace(/\/$/, '')
  };

  // A preview card that hides the start time is worse than none: a guest reads
  // '6 December 2026' in the chat, assumes a morning, and misses it. config.time
  // carries 'IST' for exactly this reason - refuse to build if a hand-edit
  // drops it, rather than shipping a card with no timezone on it.
  if (!/(^|[^A-Za-z])IST([^A-Za-z]|$)/.test(String(og.time || ''))) {
    console.error('config.time is "' + og.time + '" - it must name the timezone, e.g. "10:00 AM onwards IST".');
    console.error('A guest in another country cannot convert an unlabelled time, and the card is often all they see.');
    process.exit(1);
  }

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

  // The template uses font-display:block, so until the faces resolve the text
  // is INVISIBLE - a screenshot taken too early is a blank card with no error
  // anywhere. Assert the faces actually loaded rather than trusting
  // document.fonts.ready to mean "the right ones are ready".
  //
  // Checked per DESCRIPTOR the card actually sets text in, not by walking
  // document.fonts: a declared-but-unused face is legitimately never fetched,
  // so listing all of them reports failures that do not affect the output.
  // Read off the template's OWN computed styles rather than hand-listing them.
  // A hand-written list is wrong the moment someone edits a font-weight, and
  // a wrong entry fails the build for no reason: .ik is weight 400, not 600.
  const NEEDED = JSON.parse(await tab.ev(
    "JSON.stringify(['.ik','.gurbani','.names','.heading','.venue','.blessing-en'].map(function(s){" +
    "var e=document.querySelector(s); if(!e) return null;" +
    "var c=getComputedStyle(e);" +
    "return [c.fontFamily.split(',')[0].replace(/[\"']/g,''), c.fontWeight, s];}))"
  )).filter(Boolean);
  // Push the list in as a page global rather than splicing JSON into an
  // expression string: the family names contain spaces and the descriptor
  // needs real quote characters, which is exactly where hand-built escaping
  // goes wrong.
  await tab.ev('window.__NEEDED_FONTS__ = ' + JSON.stringify(NEEDED));
  const fontCheck = JSON.parse(await tab.ev(
    'JSON.stringify(window.__NEEDED_FONTS__.map(function(d) {' +
    ' return d[0] + " | " + d[1] + " | " + d[2] + " = " +' +
    ' document.fonts.check(d[1] + " 32px \\\"" + d[0] + "\\\"");' +
    '}))'
  ));
  const bad = fontCheck.filter(s => s.trim().slice(-4) !== 'true');
  if (bad.length) {
    console.error('these faces did not load - the card would be blank or in a fallback face:');
    bad.forEach(s => console.error('  ' + s));
    console.error('Check the paths in tools/og-template.html (../assets/fonts/...).');
    process.exit(1);
  }
  console.log('  fonts   : all ' + fontCheck.length + ' faces in use are loaded');

  const metrics = await tab.ev(
    "(function(){var d=document.documentElement,c=document.getElementById('card');" +
    "var last=c.lastElementChild.getBoundingClientRect();" +
    "var dom=document.getElementById('domain').getBoundingClientRect();" +
    "return JSON.stringify({w:d.scrollWidth,h:d.scrollHeight," +
    "overflowX:d.scrollWidth-d.clientWidth," +
    "overflowY:d.scrollHeight-d.clientHeight," +
    "cardBottom:Math.round(last.bottom), domainTop:Math.round(dom.top)});})()"
  );
  const m = JSON.parse(metrics);
  if (m.w !== 1200 || m.h !== 630) {
    console.error('template is ' + m.w + 'x' + m.h + ', expected 1200x630 - adjust the CSS');
    process.exit(1);
  }
  if (m.overflowX > 0) console.warn('WARNING: horizontal overflow ' + m.overflowX + 'px');
  if (m.overflowY > 0) console.warn('WARNING: vertical overflow ' + m.overflowY + 'px');
  /* The canvas is overflow:hidden, so copy past the edge is not merely
     untidy - it is silently CROPPED off the finished card. A venue line or a
     date that does not fit is invisible to whoever runs this script and very
     visible to a guest, so it has to be a hard failure. */
  if (m.cardBottom > 570 || m.domainTop < 555) {
    console.error('the copy does not fit: lowest text ends at y=' + m.cardBottom +
      ', the domain line starts at y=' + m.domainTop + ' (need <=570 and >=555).');
    console.error('overflow:hidden means anything past the edge is cut off the card.');
    process.exit(1);
  }
  console.log('  layout  : copy ends y=' + m.cardBottom + ', domain line at y=' + m.domainTop);

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
/**
 * One-off: restore the correct order of the Chaubees Bach couplet.
 *
 *   ਸਤਿਗੁਰ ਦਾਤੇ ਕਾਜ ਰਚਾਇਆ, ਆਪਣੀ ਮੇਹਰ ਕਰਾਈ ॥
 *   ਦਾਸਾਂ ਕਾਰਜ ਆਪ ਸਵਾਰੇ, ਇਹ ਉਸ ਦੀ ਵਡਿਆਈ ॥
 *
 * The site had these two lines the other way round. The blessing lives in
 * several places, so it is swapped in every one of them at once.
 */
'use strict';
const fs = require('fs');

const A = 'ਦਾਸਾਂ ਕਾਰਜ ਆਪ ਸਵਾਰੇ, ਇਹ ਉਸ ਦੀ ਵਡਿਆਈ ॥';
const B = 'ਸਤਿਗੁਰ ਦਾਤੇ ਕਾਜ ਰਚਾਇਆ, ਆਪਣੀ ਮੇਹਰ ਕਰਾਈ ।';

// Every separator the blessing is joined with across the codebase:
// a literal newline in HTML, the two-character escape "\n" inside JSON,
// and CRLF from git checkout.
const SEPS = ['\r\n', '\n', '\\n'];

const files = ['index.html', 'build.js', 'data/config.json'];
let grandTotal = 0;

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  let n = 0;
  for (const sep of SEPS) {
    const from = A + sep + B;
    const to = B + sep + A;
    let i = s.indexOf(from);
    while (i !== -1) {
      s = s.slice(0, i) + to + s.slice(i + from.length);
      n++;
      i = s.indexOf(from, i + to.length);
    }
  }
  fs.writeFileSync(f, s, 'utf8');
  console.log(f.padEnd(22) + n + ' swap(s)');
  grandTotal += n;
}

console.log('\ntotal swaps: ' + grandTotal);

// Verify the outcome rather than trusting the edit.
console.log('\n--- verification ---');
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const iB = s.indexOf(B);
  const iA = s.indexOf(A);
  const ok = iB !== -1 && iA !== -1 && iB < iA;
  console.log((ok ? 'OK   ' : 'FAIL ') + f.padEnd(22) +
    'B before A: ' + (iB < iA) + '   (B at ' + iB + ', A at ' + iA + ')');
}

const cfg = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
console.log('\nconfig i18n.pa.footerNote:\n  ' + JSON.stringify(cfg.i18n.pa.footerNote));
console.log('\nconfig i18n.en.footerNote:\n  ' + JSON.stringify(cfg.i18n.en.footerNote));

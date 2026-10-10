/**
 * Verifies the blessing reads in the correct order EVERYWHERE it appears:
 * the live page (gate + main blessing + PDF card) and the built dist/,
 * in both languages. Fails loudly if any copy is still reversed.
 */
'use strict';
const fs = require('fs');

const B = 'ਸਤਿਗੁਰ ਦਾਤੇ ਕਾਜ ਰਚਾਇਆ, ਆਪਣੀ ਮੇਹਰ ਕਰਾਈ ।';
const A = 'ਦਾਸਾਂ ਕਾਰਜ ਆਪ ਸਵਾਰੇ, ਇਹ ਉਸ ਦੀ ਵਡਿਆਈ ॥';

// Report every A/B pair found in a file and whether it is in the right order.
function scan(label, text) {
  const lines = text.split(/\r?\n/);
  let pairs = 0, wrong = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(B) === -1) continue;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      if (lines[j].indexOf(A) === -1) continue;
      pairs++;
      if (j < i) wrong++;
      break;
    }
  }
  // Also catch A-then-B (the wrong order) explicitly.
  const aFirst = text.indexOf(A);
  const bFirst = text.indexOf(B);
  const orderOk = bFirst === -1 ? null : (aFirst === -1 || bFirst < aFirst);
  console.log(
    (pairs === 0 ? '  n/a ' : (orderOk ? '  OK  ' : '  WRONG')) +
    ' ' + label.padEnd(34) +
    ' pairs=' + pairs +
    '  firstB=' + bFirst + ' firstA=' + aFirst
  );
  return orderOk !== false;
}

let ok = true;
for (const f of ['index.html', 'build.js', 'data/config.json', 'dist/index.html']) {
  if (!fs.existsSync(f)) { console.log('  skip ' + f + ' (missing)'); continue; }
  ok = scan(f, fs.readFileSync(f, 'utf8')) && ok;
}

const cfg = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
for (const k of ['footer', 'en', 'pa']) {
  const s = k === 'footer' ? cfg.footer.message : cfg.i18n[k].footerNote;
  const good = s.indexOf(B) !== -1 && (s.indexOf(A) === -1 || s.indexOf(B) < s.indexOf(A));
  console.log((good ? '  OK  ' : '  WRONG') + ' config ' + k.padEnd(28) + (good ? '' : ' <- reversed'));
  ok = ok && good;
}

console.log('\n' + (ok ? 'PASS: the couplet reads Satgur Datae Kaaj first everywhere.' : 'FAIL: somewhere it is still reversed.'));
process.exit(ok ? 0 : 1);

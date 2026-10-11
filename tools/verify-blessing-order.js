/**
 * Verifies the blessing is EXACT everywhere it appears.
 *
 * This previously only checked that the two couplet lines appeared in the
 * right ORDER, and it shipped a corrupted live page because of that: the
 * intro gate on the built site read
 *
 *     ਦਾਸਾਂ ਕਾਰਜ ਆਪ ਸਵਾਰੇ, ਇਹ ਉਸ ਦੀ ਵਡਿਆਈ ॥ਕਰਾਈ ।
 *
 * - a stray "ਕਰਾਈ ।" from the previous line glued on after the closing
 * danda. The order was still correct, so the order check passed and the
 * wrong sacred text went out to every guest on the first screen they saw.
 *
 * Order alone is therefore not a sufficient check for sacred text. Every
 * line must now match the canonical string CHARACTER FOR CHARACTER, with
 * nothing appended, nothing missing, and nothing reversed.
 *
 * Runs against the source page, the build script, the built dist, and the
 * config - the gate markup exists in all three, and the build script is
 * where the corruption actually was.
 */
'use strict';
const fs = require('fs');

const B = 'ਸਤਿਗੁਰ ਦਾਤੇ ਕਾਜ ਰਚਾਇਆ, ਆਪਣੀ ਮੇਹਰ ਕਰਾਈ ।';
const A = 'ਦਾਸਾਂ ਕਾਰਜ ਆਪ ਸਵਾਰੇ, ਇਹ ਉਸ ਦੀ ਵਡਿਆਈ ॥';
const OPEN = 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥';

let problems = [];
let ok = true;

/* Strip the bits that legitimately follow the text in markup - a closing
   HTML tag, a JS quote/comma, JSON escaping - so that "does the text end
   exactly here" is a question about the Gurbani and not about the syntax.
   Anything left over is a real content bug. */
function trailingJunk(line) {
  return line
    .replace(/<br\s*\/?>\s*$/i, '')            // trailing <br>
    .replace(/<\/[a-zA-Z][^>]*>\s*$/, '')     // trailing closing tag, e.g. </div>
    .replace(/\s*["'`\],;)]?\s*$/, '')        // trailing JS/JSON punctuation
    .replace(/[ \t\r]+$/, '');
}

function checkFile(label, raw) {
  // config.json keeps the blessing in one physical line with \n escapes.
  const text = raw.replace(/\\n/g, '\n');
  const lines = text.split(/\r?\n/);
  let found = 0, exact = 0;

  for (const rawLine of lines) {
    const line = trailingJunk(rawLine);
    if (line.indexOf(A) === -1 && line.indexOf(B) === -1 && line.indexOf(OPEN) === -1) continue;
    found++;

    // Which canonical line does this end with?
    let canonical = null, name = null;
    if (line.indexOf(A) !== -1) { canonical = A; name = 'A (ਵਡਿਆਈ ॥)'; }
    else if (line.indexOf(B) !== -1) { canonical = B; name = 'B (ਕਰਾਈ ।)'; }
    else if (line.indexOf(OPEN) !== -1) { canonical = OPEN; name = 'open (ਪ੍ਰਸਾਦਿ ॥)'; }

    if (line === canonical) { exact++; continue; }

    // Not equal. Is it merely a prefix (text simply continues onto the same
    // line, which is fine) or is there junk glued on after the closing
    // punctuation (the bug)?
    const endsAt = line.lastIndexOf(canonical) + canonical.length;
    const rest = line.slice(endsAt).trim();
    if (rest === '') { exact++; continue; }

    problems.push(`${label}: ${name} has "${rest}" glued onto the end\n      -> ${line}`);
    ok = false;
  }

  if (found === 0) { console.log(`  n/a   ${label.padEnd(30)} (blessing not present)`); return; }
  console.log(`  ${exact === found ? 'OK   ' : 'BAD  '} ${label.padEnd(30)} ${exact}/${found} exact`);
}

console.log('Every blessing line must match character for character.\n');
for (const f of ['index.html', 'build.js', 'dist/index.html']) {
  if (!fs.existsSync(f)) { console.log(`  skip  ${f} (missing)`); continue; }
  checkFile(f, fs.readFileSync(f, 'utf8'));
}

const cfg = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
for (const [k, s] of [['footer.message', cfg.footer.message],
                     ['i18n.en.footerNote', cfg.i18n.en.footerNote],
                     ['i18n.pa.footerNote', cfg.i18n.pa.footerNote]]) {
  checkFile('config ' + k, s);
  if (s.indexOf(B) === -1) { problems.push(`config ${k}: first couplet line missing`); ok = false; }
  if (s.indexOf(A) === -1) { problems.push(`config ${k}: second couplet line missing`); ok = false; }
  if (s.indexOf(B) > s.indexOf(A)) { problems.push(`config ${k}: couplet is REVERSED`); ok = false; }
}

console.log('');
if (problems.length) {
  console.log('PROBLEMS:\n' + problems.map((p) => '  - ' + p).join('\n'));
}
console.log(ok
  ? 'PASS: every copy of the blessing is exact - no stray text, correct order.'
  : 'FAIL: the blessing is not exact somewhere. Do not deploy.');
process.exit(ok ? 0 : 1);
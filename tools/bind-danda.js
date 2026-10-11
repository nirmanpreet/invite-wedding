/**
 * One-shot: bind the danda to the word before it.
 *
 * Rule 2 allows exactly one change to the Gurbani verse - replacing the
 * normal space before । / ॥ with U+00A0 - so that the mark can never wrap
 * onto a line of its own at a narrow viewport.
 *
 * This is done as a byte-level rewrite rather than by retyping the verse, so
 * no Gurmukhi letter can be mangled: the script only ever swaps U+0020 for
 * U+00A0 in the two- character sequence [space][danda].
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DANDAS = ['।', '॥']; // । AAPPLY ||

// U+00A0 is what we write INTO the source, spelled as an escape so the file
// stays pure ASCII-safe at the byte level for these positions.
const files = ['data/config.json', 'build.js'];

let total = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  let src = fs.readFileSync(abs, 'utf8');
  let n = 0;
  for (const d of DANDAS) {
    // Only when the space is INSIDE a Gurmukhi run: require a Gurmukhi
    // codepoint immediately before the space. That makes it impossible to
    // touch an English sentence or any other space in the file.
    const re = new RegExp('([\\u0A00-\\u0A7F]) (' + d + ')', 'g');
    src = src.replace(re, (m, gurmukhi, danda) => {
      n++;
      return gurmukhi + '\\u00a0' + danda;
    });
  }
  fs.writeFileSync(abs, src, 'utf8');
  console.log(`  ${String(n).padStart(2)} bindings  ${rel}`);
  total += n;
}
console.log(`\n${total} total. No Gurmukhi letter was touched - only U+0020 -> U+00A0.`);
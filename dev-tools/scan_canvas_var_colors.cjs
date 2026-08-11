// Find CSS custom properties used where CSS cannot resolve them.
//
// Canvas 2D cannot parse var(--x): `ctx.fillStyle = 'var(--allo-stem-text)'` is
// silently IGNORED and the PREVIOUS fill colour persists — no error anywhere.
// Confirmed live in universe (the H-R diagram's "White Dwarfs" marker plotted in
// Proxima Centauri's red) and waterCycle (the Condensation label).
//
// Two related failures share the cause:
//   CONCAT   'var(--x)' + '25'            -> invalid CSS, declaration dropped
//   PARSEINT parseInt(c.slice(1), 16)     -> reads the leading 'a' as hex 10, so
//                                            luminance maths scores it near-black
//
// PRECISION: an earlier version flagged every `.color` reaching canvas in any
// file containing a var() anywhere, which was almost all noise. This version
// only reports a field when THAT field is assigned a var() string somewhere in
// the same file, then reports whether it reaches canvas. A var() in a plain DOM
// style is valid and is not reported.
const fs = require('fs');
const path = require('path');

const DIR = 'stem_lab';
const files = fs.readdirSync(DIR).filter((f) => /^stem_tool_.*\.js$/.test(f));

let flagged = 0;
const summary = [];

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  if (!src.includes("var(--")) continue;
  const lines = src.split(/\r?\n/);

  // fields/identifiers that are actually GIVEN a var() string value
  const varFields = new Map(); // name -> first line number
  const fieldRe = /([A-Za-z_$][\w$]*)\s*:\s*['"]var\(--[^'"]*['"]/g;
  const declRe = /(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*['"]var\(--[^'"]*['"]/g;
  lines.forEach((line, i) => {
    let m;
    fieldRe.lastIndex = 0; declRe.lastIndex = 0;
    while ((m = fieldRe.exec(line))) if (!varFields.has(m[1])) varFields.set(m[1], i + 1);
    while ((m = declRe.exec(line))) if (!varFields.has(m[1])) varFields.set(m[1], i + 1);
  });
  if (!varFields.size) continue;

  const hits = [];
  lines.forEach((line, i) => {
    const n = i + 1;
    // direct literal into canvas
    if (/(fillStyle|strokeStyle|shadowColor)\s*=\s*['"]var\(--/.test(line)) {
      hits.push(['CANVAS-LITERAL', n, line.trim()]);
      return;
    }
    // canvas fed by an identifier/field that carries a var() string
    const assign = line.match(/(?:fillStyle|strokeStyle|shadowColor)\s*=\s*([A-Za-z_$][\w$.]*)/);
    if (assign) {
      const leaf = assign[1].split('.').pop();
      if (varFields.has(leaf)) hits.push(['CANVAS-VIA:' + leaf, n, line.trim()]);
    }
    // alpha suffix concatenated onto a var()-carrying field
    const concat = line.match(/([A-Za-z_$][\w$.]*)\s*\+\s*['"][0-9a-fA-F]{2}['"]/);
    if (concat && varFields.has(concat[1].split('.').pop())) {
      hits.push(['CONCAT:' + concat[1].split('.').pop(), n, line.trim()]);
    }
    // hex parsing of a var()-carrying field
    const pi = line.match(/parseInt\s*\(\s*([A-Za-z_$][\w$.]*)\s*\.slice\(1\)/);
    if (pi) hits.push(['PARSEINT?', n, line.trim()]);
  });

  if (!hits.length) continue;
  flagged++;
  const name = f.replace('stem_tool_', '').replace('.js', '');
  summary.push(name + ' (' + hits.length + ')');
  console.log('=== ' + name + '  — var()-valued fields: ' +
    [...varFields.keys()].join(', '));
  hits.slice(0, 10).forEach(([kind, n, text]) => {
    console.log('   ' + kind.padEnd(20) + n + ': ' + text.slice(0, 110));
  });
  if (hits.length > 10) console.log('   ... +' + (hits.length - 10) + ' more');
}

console.log('\nscanned ' + files.length + ' tools; ' + flagged + ' with a real join: ' +
  (summary.join(', ') || 'none'));
console.log('CANVAS-* = canvas cannot parse var(); CONCAT/PARSEINT still need eyeballing.');

// Catalog-wide answer-position-bias sweep over stem_lab/stem_tool_*.js.
//
// Detects the two authoring schemas actually used in this repo:
//   A) index schema:  correct: <n>  paired with an options/opts/a array
//   B) string schema: a: '<text>'   paired with an opts/options array
// For each tool it reports the distribution of correct-answer positions, and
// whether the file contains a shuffle (which would neutralise a biased bank).
//
// Reports only; changes nothing.
const fs = require('fs');
const path = require('path');

const DIR = 'stem_lab';
const files = fs.readdirSync(DIR).filter(f => /^stem_tool_.*\.js$/.test(f));

function splitOptions(raw) {
  // raw is the inside of [...] — split on quote boundaries, tolerate escapes
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(raw))) out.push((m[1] !== undefined ? m[1] : m[2]).replace(/\\'/g, "'"));
  return out;
}

const rows = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const counts = {};   // arity -> array of counts
  let total = 0;

  // Schema A: options array followed by `correct: n`  (options|opts|a|choices)
  // `choices` was missed in the first pass and hid 68 questions in autorepair
  // alone — keep this alternation in sync with any new authoring style.
  const reA = /(?:options|opts|choices|a):\s*\[([^\]]{4,600})\]\s*,\s*correct:\s*(\d+)/g;
  let m;
  while ((m = reA.exec(src))) {
    const opts = splitOptions(m[1]);
    const idx = parseInt(m[2], 10);
    if (opts.length < 2 || opts.length > 6 || idx >= opts.length) continue;
    counts[opts.length] = counts[opts.length] || new Array(opts.length).fill(0);
    counts[opts.length][idx]++; total++;
  }
  // Schema A': `correct: n` preceding the array
  const reA2 = /correct:\s*(\d+)\s*,\s*(?:options|opts|choices|a):\s*\[([^\]]{4,600})\]/g;
  while ((m = reA2.exec(src))) {
    const opts = splitOptions(m[2]);
    const idx = parseInt(m[1], 10);
    if (opts.length < 2 || opts.length > 6 || idx >= opts.length) continue;
    counts[opts.length] = counts[opts.length] || new Array(opts.length).fill(0);
    counts[opts.length][idx]++; total++;
  }
  // Schema B: a: '<answer>' then opts/options: [...]
  const reB = /a:\s*'((?:[^'\\]|\\.)*)'\s*,\s*[\r\n]*\s*(?:opts|options):\s*\[([^\]]{4,600})\]/g;
  while ((m = reB.exec(src))) {
    const ans = m[1].replace(/\\'/g, "'");
    const opts = splitOptions(m[2]);
    const idx = opts.indexOf(ans);
    if (idx < 0 || opts.length < 2 || opts.length > 6) continue;
    counts[opts.length] = counts[opts.length] || new Array(opts.length).fill(0);
    counts[opts.length][idx]++; total++;
  }

  if (total < 8) continue; // too few to judge

  const hasShuffle = /Fisher|shuffle|Shuffle|sort\(\s*function\s*\(\s*\)\s*\{\s*return\s+Math\.random/.test(src);

  // judge the dominant arity only
  const arity = Object.keys(counts).sort((a, b) => counts[b].reduce((x, y) => x + y, 0) - counts[a].reduce((x, y) => x + y, 0))[0];
  const c = counts[arity];
  const n = c.reduce((a, b) => a + b, 0);
  if (n < 8) continue;
  const shares = c.map(x => x / n);
  const maxShare = Math.max(...shares);
  const deadSlots = c.filter(x => x === 0).length;
  const expected = 1 / c.length;
  // flag: any slot over 1.8x expected, or a never-used slot
  const biased = maxShare > expected * 1.8 || deadSlots > 0;

  rows.push({ file: f, n, arity: +arity, counts: c.join('/'), maxShare, deadSlots, biased, hasShuffle });
}

rows.sort((a, b) => (b.biased - a.biased) || (b.maxShare - a.maxShare));
console.log('tool'.padEnd(38), 'Qs'.padStart(4), 'counts'.padEnd(16), 'max%'.padStart(6), 'dead', 'shuffle?', 'FLAG');
console.log('-'.repeat(92));
for (const r of rows) {
  console.log(
    r.file.replace('stem_tool_', '').replace('.js', '').padEnd(38),
    String(r.n).padStart(4),
    r.counts.padEnd(16),
    (100 * r.maxShare).toFixed(0).padStart(5) + '%',
    String(r.deadSlots).padStart(4),
    (r.hasShuffle ? 'yes' : 'NO ').padStart(8),
    r.biased ? (r.hasShuffle ? 'bias(shuffled)' : '*** BIASED ***') : ''
  );
}
console.log('\nscanned', files.length, 'tools;', rows.length, 'with a measurable bank;',
  rows.filter(r => r.biased && !r.hasShuffle).length, 'biased AND unshuffled');

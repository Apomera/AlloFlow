// Catalog-wide answer-position-bias sweep over stem_lab/stem_tool_*.js.
//
// Detects the authoring schemas actually used in this repo:
//   A) index schema:  correct: <n> OR answer: <n>  paired with an
//      options/opts/choices/a array (either order). `answer:` was missed in
//      the first pass and hid the astronomy / dinolab / microbiology /
//      nutritionlab stacked banks entirely.
//   B) string schema: a: '<text>'   paired with an opts/options array
//   C) flag schema:   `correct: true` on a choice OBJECT — found by a bracket
//      walk (regexes can't span these), recording each flagged object's index
//      among its array siblings. This blind spot hid the stacked cephalopod
//      (28/40 at B), applab, anatomy, and titration banks.
// For each tool it reports the distribution of correct-answer positions, and
// whether the file neutralises authored order — either a shuffle or the
// deterministic per-question rotation fix (fingerprint: `* 7 + 3) %`).
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

// Schema C: bracket walk. For every `correct: true`, find the object it lives
// in and that object's index among its parent array's direct object children.
// Skips strings and comments; returns {idx, arity} pairs (arity = the parent
// array's total object-child count).
function flagSchemaHits(src) {
  const stack = [];
  const arityByPos = {};
  const rawHits = []; // {siblingIdx, arrayPos}
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; i++;
      while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '[' || c === '{' || c === '(') {
      const rec = { ch: c, pos: i, childObjIdx: 0 };
      if (c === '{') {
        const parent = stack[stack.length - 1];
        rec.siblingIdx = parent && parent.ch === '[' ? parent.childObjIdx++ : -1;
        rec.parentArrayPos = parent && parent.ch === '[' ? parent.pos : -1;
      }
      stack.push(rec);
      i++; continue;
    }
    if (c === ']' || c === '}' || c === ')') {
      const closed = stack.pop();
      if (closed && closed.ch === '[') arityByPos[closed.pos] = closed.childObjIdx;
      i++; continue;
    }
    if (src.startsWith('correct: true', i)) {
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].ch === '{') {
          if (stack[k].siblingIdx >= 0) rawHits.push({ siblingIdx: stack[k].siblingIdx, arrayPos: stack[k].parentArrayPos });
          break;
        }
      }
      i += 13; continue;
    }
    i++;
  }
  return rawHits
    .map(h2 => ({ idx: h2.siblingIdx, arity: arityByPos[h2.arrayPos] || 0 }))
    .filter(h2 => h2.arity >= 2 && h2.arity <= 6 && h2.idx < h2.arity);
}

const rows = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const counts = {};   // arity -> array of counts
  let total = 0;

  // Schema A: options array followed by `correct: n`  (options|opts|a|choices)
  // `choices` was missed in the first pass and hid 68 questions in autorepair
  // alone — keep this alternation in sync with any new authoring style.
  const reA = /(?:options|opts|choices|a):\s*\[([^\]]{4,600})\]\s*,\s*(?:correctIdx|correct|answer):\s*(\d+)/g;
  let m;
  while ((m = reA.exec(src))) {
    const opts = splitOptions(m[1]);
    const idx = parseInt(m[2], 10);
    if (opts.length < 2 || opts.length > 6 || idx >= opts.length) continue;
    counts[opts.length] = counts[opts.length] || new Array(opts.length).fill(0);
    counts[opts.length][idx]++; total++;
  }
  // Schema A': `correct: n` preceding the array
  const reA2 = /(?:correctIdx|correct|answer):\s*(\d+)\s*,\s*(?:options|opts|choices|a):\s*\[([^\]]{4,600})\]/g;
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

  // Schema C: flag objects
  for (const hit of flagSchemaHits(src)) {
    counts[hit.arity] = counts[hit.arity] || new Array(hit.arity).fill(0);
    counts[hit.arity][hit.idx]++; total++;
  }

  if (total < 8) continue; // too few to judge

  // "Neutralised" = a runtime shuffle OR the deterministic rotation fix.
  // The rotation fingerprint is the shared shift recipe `... * 7 + 3) % len`
  // (also written `* 7) + 3) %`) used by every rotation IIFE in the catalog —
  // geometryworld's gwRotateQuestionTree and punnett's punnettRotateBank were
  // flagged as unshuffled for months because this check only knew shuffles.
  const hasShuffle = /Fisher|shuffle|Shuffle|sort\(\s*function\s*\(\s*\)\s*\{\s*return\s+Math\.random|\*\s*7\s*\)?\s*\+\s*3\s*\)\s*%/.test(src);

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

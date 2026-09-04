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

// The directory and filename filter used to be hardcoded to stem_lab/
// stem_tool_*.js, so passing another lab as an argument was silently ignored and
// the report described STEM while claiming to describe whatever was asked for.
const args = process.argv.slice(2);
const DIR = args.find(a => !a.startsWith('--')) || 'stem_lab';
const patternArg = args.find(a => a.startsWith('--pattern='));
const FILE_RE = patternArg ? new RegExp(patternArg.slice('--pattern='.length)) : /^stem_tool_.*\.js$/;
const files = fs.readdirSync(DIR).filter(f => FILE_RE.test(f));
if (files.length === 0) {
  console.error('scan_answer_position_bias: pattern ' + FILE_RE + ' matched NO files in ' + DIR + ' - nothing was scanned.');
  process.exit(2);
}

// One entry per option. A LOCALIZED bank writes each option as `t('key')` or
// `__alloT('key', 'English')`, so the naive "every quoted run is an option"
// split returns two entries per element, blows past the arity ceiling, and the
// tool silently vanishes from this report — a gate going blind exactly when a
// bank is improved. Reduce each element to one identifying string instead:
// the English fallback when there is one, otherwise the key.
// Split an array-literal body on TOP-LEVEL commas, respecting quotes and
// nested parens. `__alloT('k', 'Hematite (iron oxide)')` contains both, and a
// regex that stops at the first `)` loses the element.
function topLevelParts(raw) {
  const parts = [];
  let depth = 0, quote = null, cur = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      cur += c;
      if (c === '\\') { cur += raw[i + 1] || ''; i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; cur += c; continue; }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim());
}

// `t('key')` / `__alloT('key', 'English')` → the identifying string (the
// English fallback when present, else the key). Null for anything else.
function localizedText(expr) {
  const e = String(expr).trim();
  if (!/^(?:t|__alloT)\s*\(/.test(e)) return null;
  const inner = topLevelParts(e.slice(e.indexOf('(') + 1, e.lastIndexOf(')')));
  if (!inner.length) return null;
  const lit = (s) => {
    const m = String(s).match(/^'((?:[^'\\]|\\.)*)'$/) || String(s).match(/^"((?:[^"\\]|\\.)*)"$/);
    return m ? m[1].replace(/\\'/g, "'") : null;
  };
  const key = lit(inner[0]);
  if (key === null) return null;
  const english = inner.length > 1 ? lit(inner[1]) : null;
  return english !== null ? english : key;
}

function splitOptions(raw) {
  // A LOCALIZED bank writes each option as t('key') or __alloT('key','English').
  // The naive "every quoted run is an option" split then returns two entries per
  // element, blows past the arity ceiling, and the tool silently vanishes from
  // this report — a gate going blind exactly when a bank is improved.
  //
  // Only take this path when EVERY element parses as such a call. A partial
  // match means the array is something else, and guessing there changed two
  // unrelated tools' numbers when this was first attempted.
  const parts = topLevelParts(raw);
  if (parts.length >= 2) {
    const mapped = parts.map(localizedText);
    if (mapped.every((x) => x !== null)) return mapped;
  }
  // raw is the inside of [...] — split on quote boundaries, tolerate escapes
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(raw))) out.push((m[1] !== undefined ? m[1] : m[2]).replace(/\\'/g, "'"));
  return out;
}

// The answer side of the same change: `a: __alloT('key', 'English')`.
function answerText(expr) { return localizedText(expr); }

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
  const reA = /(?:options|opts|choices|a):\s*\[([^\]]{4,600})\]\s*,\s*(?:correctIndex|correctIdx|correct|answer|ans|a|c):\s*(\d+)/g;
  let m;
  while ((m = reA.exec(src))) {
    const opts = splitOptions(m[1]);
    const idx = parseInt(m[2], 10);
    if (opts.length < 2 || opts.length > 6 || idx >= opts.length) continue;
    counts[opts.length] = counts[opts.length] || new Array(opts.length).fill(0);
    counts[opts.length][idx]++; total++;
  }
  // Schema A': `correct: n` preceding the array
  const reA2 = /(?:correctIndex|correctIdx|correct|answer|ans|a|c):\s*(\d+)\s*,\s*(?:options|opts|choices|a):\s*\[([^\]]{4,600})\]/g;
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
  // Schema B': the same bank once its answer and options are localized —
  // `a: __alloT('key', 'English'),` then the array. Rocks disappeared from this
  // report entirely the day its quiz was localized, which is the failure mode
  // this branch exists to prevent.
  const reB2 = /a:\s*((?:t|__alloT)\s*\((?:[^()']|'(?:[^'\\]|\\.)*'|\([^)]*\))*\))\s*,\s*[\r\n]*\s*(?:opts|options):\s*\[((?:[^\][']|'(?:[^'\\]|\\.)*')*)\]/g;
  while ((m = reB2.exec(src))) {
    const ans = answerText(m[1]);
    if (ans === null) continue;
    const opts = splitOptions(m[2]);
    const idx = opts.indexOf(ans);
    if (idx < 0 || opts.length < 2 || opts.length > 6) continue;
    counts[opts.length] = counts[opts.length] || new Array(opts.length).fill(0);
    counts[opts.length][idx]++; total++;
  }

  // Schema D: STRING-valued `correct:`/`answer:`/`ans:` before or after the
  // options array (`options: ['Nitrate', 'Nitrite'], correct: 'Nitrite'`).
  // Invisible until 2026-08-25 - aquarium alone hid 46 such questions. `\b`
  // keeps `incorrect: '...'` feedback strings from matching as answers.
  const tallyStr = (rawOpts, rawAns) => {
    const opts = splitOptions(rawOpts);
    const dec = splitOptions("'" + rawAns + "'");
    const idx = dec ? opts.indexOf(dec[0]) : -1;
    if (idx < 0 || opts.length < 2 || opts.length > 6) return;
    counts[opts.length] = counts[opts.length] || new Array(opts.length).fill(0);
    counts[opts.length][idx]++; total++;
  };
  const reD = /\b(?:options|opts|choices):\s*\[([^\]]{4,600})\]\s*,\s*[\r\n]*\s*\b(?:correct|answer|ans):\s*'((?:[^'\\]|\\.)*)'/g;
  while ((m = reD.exec(src))) tallyStr(m[1], m[2]);
  const reD2 = /\b(?:correct|answer|ans):\s*'((?:[^'\\]|\\.)*)'\s*,\s*[\r\n]*\s*\b(?:options|opts|choices):\s*\[([^\]]{4,600})\]/g;
  while ((m = reD2.exec(src))) tallyStr(m[2], m[1]);

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
  //
  // Two ways this check used to answer "yes" to a file that neutralises nothing:
  //   1. It read the WHOLE source, comments included. A tool whose 3-D section
  //      says "a scene that reshuffles itself is distracting" scored a shuffle it
  //      does not have. Any prose containing the word passed the bank.
  //   2. The rotation fingerprint was pinned to the literal 7/3 recipe, so an
  //      equally valid `(i * 3 + 1) % len` did not count and only rescued a tool
  //      by accident, through reason 1.
  // Comments are stripped first, and the recipe is matched by SHAPE.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  // Match the RECIPE, not the counter expression: the multiplicand may be `i`,
  // `counter.i++`, `idx`, anything. Pinning the operand shape rejected
  // geometryworld's `((counter.i++ * 7) + 3) % n`, which is a real rotation.
  const ROTATION = /\*\s*\d+\s*\)?\s*\+\s*\d+\s*\)?\s*%/;

  // A third neutralisation shape: SLOT-TARGETED rotation, where each question is
  // moved onto a target slot (`shift = (target - correct + n) % n`) rather than by a
  // fixed offset. That is what galaxy and economicslab use, because it makes the
  // distribution exactly uniform instead of merely decorrelated — and neither the
  // shuffle keywords nor the `* n + m %` recipe match it, so both were reported as
  // "biased AND unshuffled" after they had been fixed.
  //
  // Deliberately NARROW, because this flag's failure mode is FALSE CLEARANCE: the
  // `* n + m %` recipe above already matches any arithmetic of that shape anywhere
  // in a file, which is how a tool with no shuffle at all got excused. So require a
  // `.map(` whose body BOTH takes a modulus AND names an answer field — the actual
  // signature of a rotation applied to a bank, not merely defined near one.
  const SLOT_ROTATION = /\.map\(\s*function\s*\([^)]*\)\s*\{[\s\S]{0,600}?%[\s\S]{0,600}?\b(?:correct|correctIndex|options|opts|choices)\b[\s\S]{0,600}?\}\s*\)/;

  // A fourth neutralisation shape: RENDER-TIME placement. The bank keeps its
  // authored order and every render maps over `orderOptions(q, opts, answer)`,
  // which hash-places the answer at a stable slot (semiconductor, 2026-08-23 —
  // verified empirically: authored 76%-at-B renders as 3/4/2, 3/4/8/6 and 3/3/2/4
  // across its three banks). Clearance requires the APPLIED call — an identifier
  // containing "order" invoked with an opts-ish argument and its result mapped
  // for render — because the function's mere existence neutralises nothing.
  const RENDER_PLACEMENT = /\b[A-Za-z_$]*[Oo]rder[A-Za-z_$]*\s*\(\s*[^()]*\b(?:opts|options|choices)\b[^()]*\)\s*\.map\s*\(/;

  const hasShuffle = /Fisher|shuffle|Shuffle|sort\(\s*function\s*\(\s*\)\s*\{\s*return\s+Math\.random/.test(code)
    || ROTATION.test(code)
    || SLOT_ROTATION.test(code)
    || RENDER_PLACEMENT.test(code);

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

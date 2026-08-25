// Longest-answer-tell sweep over TOOL quiz banks (stem_lab + sel_hub).
//
//   node dev-tools/scan_tool_answer_length_clue.cjs [dir ...]      (default: stem_lab sel_hub)
//
// scan_answer_length_bias.cjs covers the test_prep credential packs; nothing
// covered the ~216 tool files. The tell is the classic test-wise heuristic:
// the true statement carries its qualifiers while distractors were dashed off
// short, so "pick the longest" beats "know the material". Crucially a length
// tell SURVIVES shuffling and rotation - position-clean banks can still carry
// it (galaxy did: 5 of 20 uniquely-longest keys behind a working rotation).
//
// Extraction reuses the position scanner's schemas:
//   A/A': options/opts/choices/a array with correct/correctIdx/answer index
//   B:    a: '<text>' with an options array
//   C:    correct: true flags on option OBJECTS (bracket walk)
// HONESTY RULE: a question is only measured when every option is a plain
// string literal. Options built from t()/__alloT() calls have unknowable
// rendered length here, so those questions are counted as SKIPPED rather than
// measured wrong. A large skipped count means "unmeasured", not "clean".
//
// Reported per bank: uniquely-longest-key rate (chance is 1/arity if lengths
// were unrelated to truth) and the pack rule's "severe" count
// (key >= longestDistractor + 20 AND >= longestDistractor * 1.75).
// Reports only; changes nothing.
const fs = require('fs');
const path = require('path');

const dirs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DIRS = dirs.length ? dirs : ['stem_lab', 'sel_hub'];
// --check: ratchet against the baseline (exit 1 if any tool got WORSE).
// --update-baseline: rewrite the baseline from the current measurement. Counts
// may only go DOWN in normal work; raising one requires a deliberate edit with
// a reason, same contract as the packs' answer_length_clue_baseline.json.
const CHECK = process.argv.includes('--check');
const UPDATE = process.argv.includes('--update-baseline');
const BASELINE_PATH = path.join('dev-tools', 'tool_answer_length_clue_baseline.json');

function splitOptions(raw) {
  // Returns null when the array holds anything but plain string literals.
  const out = [];
  let i = 0;
  const n = raw.length;
  while (i < n) {
    const c = raw[i];
    if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === ',') { i++; continue; }
    if (c === "'" || c === '"') {
      const q = c; i++;
      let s = '';
      while (i < n && raw[i] !== q) {
        if (raw[i] === '\\') {
          // Decode escapes to RENDERED length: 'M\u0101ori' is 5 characters
          // on screen, not 10 - source length overcounted escaped keys as tells.
          if (raw[i + 1] === 'u' && /^[0-9a-fA-F]{4}$/.test(raw.slice(i + 2, i + 6))) {
            s += String.fromCharCode(parseInt(raw.slice(i + 2, i + 6), 16));
            i += 6;
          } else { s += raw[i + 1]; i += 2; }
        } else s += raw[i++];
      }
      i++;
      out.push(s);
      continue;
    }
    return null; // t(...), identifiers, numbers, nested objects: not measurable
  }
  return out.length ? out : null;
}

function judge(opts, idx, stats) {
  // Two-option (True/False) items are excluded: chance is already 50%, and
  // "False" being one character longer than "True" is neither a real cue nor
  // fixable. The licensure-pack rule likewise judges 4-choice items only.
  if (opts.length < 3) return;
  // snake_case id option sets (`['el_crossed', 'el_smile', ...]` in sel social's
  // body-language reader) are keys the tool maps to cue sentences at render
  // time; their source length says nothing about what the learner sees. Plain
  // lowercase words ('nucleus', 'kind') stay measured - they render as-is, and
  // a broader "identifier" rule silently dropped 38 real allobotsage items.
  if (opts.every((o) => /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(o))) { stats.skipped++; return; }
  const lens = opts.map((o) => o.length);
  const maxLen = Math.max(...lens);
  const others = lens.filter((_, j) => j !== idx);
  const longestDistractor = Math.max(...others);
  stats.n++;
  if (lens[idx] === maxLen && lens.filter((l) => l === maxLen).length === 1) stats.uniq++;
  if (lens[idx] >= longestDistractor + 20 && lens[idx] >= longestDistractor * 1.75) stats.severe++;
}

// Schema C: bracket walk collecting each options-array of OBJECTS with exactly
// one `correct: true`, keeping only banks whose option objects carry a plain
// string `text:` - measured on that text.
function flagSchemaJudge(src, stats) {
  const re = /\{\s*(?:letter:\s*'[^']*',\s*)?text:\s*'((?:[^'\\]|\\.)*)'\s*,\s*correct:\s*(true|false)\s*\}/g;
  // group consecutive option objects into questions by proximity
  let m;
  const runs = [];
  let cur = null;
  while ((m = re.exec(src))) {
    if (cur && m.index - cur.end < 40) {
      cur.opts.push({ text: m[1].replace(/\\'/g, "'"), correct: m[2] === 'true' });
      cur.end = re.lastIndex;
    } else {
      if (cur) runs.push(cur);
      cur = { opts: [{ text: m[1].replace(/\\'/g, "'"), correct: m[2] === 'true' }], end: re.lastIndex };
    }
  }
  if (cur) runs.push(cur);
  for (const r of runs) {
    if (r.opts.length < 2 || r.opts.length > 6) continue;
    const flagged = r.opts.map((o, j) => (o.correct ? j : -1)).filter((j) => j >= 0);
    if (flagged.length !== 1) continue;
    judge(r.opts.map((o) => o.text), flagged[0], stats);
  }
}

const rows = [];
for (const dir of DIRS) {
  for (const f of fs.readdirSync(dir).filter((x) => /^(stem|sel)_tool_.*\.js$/.test(x))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const stats = { n: 0, uniq: 0, severe: 0, skipped: 0 };

    const tryArr = (raw, idx) => {
      const opts = splitOptions(raw);
      if (!opts) { stats.skipped++; return; }
      if (opts.length < 2 || opts.length > 6 || idx < 0 || idx >= opts.length) return;
      judge(opts, idx, stats);
    };

    let m;
    const reA = /(?:options|opts|choices|a):\s*\[([^\]]{4,900})\]\s*,\s*(?:correctIndex|correctIdx|correct|answer|ans|a|c):\s*(\d+)/g;
    while ((m = reA.exec(src))) tryArr(m[1], parseInt(m[2], 10));
    const reA2 = /(?:correctIndex|correctIdx|correct|answer|ans|a|c):\s*(\d+)\s*,\s*(?:options|opts|choices|a):\s*\[([^\]]{4,900})\]/g;
    while ((m = reA2.exec(src))) tryArr(m[2], parseInt(m[1], 10));
    const reB = /a:\s*'((?:[^'\\]|\\.)*)'\s*,\s*[\r\n]*\s*(?:opts|options):\s*\[([^\]]{4,900})\]/g;
    while ((m = reB.exec(src))) {
      const opts = splitOptions(m[2]);
      if (!opts) { stats.skipped++; continue; }
      const idx = opts.indexOf(m[1].replace(/\\'/g, "'"));
      if (idx < 0 || opts.length < 2 || opts.length > 6) continue;
      judge(opts, idx, stats);
    }
    // Schema D: STRING-valued answer (`correct: 'Nitrite'`, `answer: '...'`,
    // `ans: '...'`) before or after the options array, matched to an option by
    // decoded text. Until 2026-08-25 these banks were invisible (aquarium 46,
    // flightsim 50, pets 21, weldlab 20, ...). `\b` keeps `incorrect: '...'`
    // feedback fields from matching as answers.
    const judgeStr = (rawOpts, rawAns) => {
      const opts = splitOptions(rawOpts);
      if (!opts) { stats.skipped++; return; }
      const decoded = splitOptions("'" + rawAns + "'");
      const idx = decoded ? opts.indexOf(decoded[0]) : -1;
      if (idx < 0 || opts.length < 2 || opts.length > 6) return;
      judge(opts, idx, stats);
    };
    const reD = /\b(?:options|opts|choices):\s*\[([^\]]{4,900})\]\s*,\s*[\r\n]*\s*\b(?:correct|answer|ans):\s*'((?:[^'\\]|\\.)*)'/g;
    while ((m = reD.exec(src))) judgeStr(m[1], m[2]);
    const reD2 = /\b(?:correct|answer|ans):\s*'((?:[^'\\]|\\.)*)'\s*,\s*[\r\n]*\s*\b(?:options|opts|choices):\s*\[([^\]]{4,900})\]/g;
    while ((m = reD2.exec(src))) judgeStr(m[2], m[1]);
    flagSchemaJudge(src, stats);

    if (stats.n < 8) continue;
    rows.push({
      tool: dir + '/' + f.replace(/^(stem|sel)_tool_/, '').replace(/\.js$/, ''),
      n: stats.n, uniq: stats.uniq, severe: stats.severe, skipped: stats.skipped,
      rate: stats.uniq / stats.n,
    });
  }
}

rows.sort((a, b) => b.rate - a.rate || b.severe - a.severe);
console.log('tool'.padEnd(40), 'Qs'.padStart(4), 'uniqLongest'.padStart(12), 'severe'.padStart(7), 'skip'.padStart(5), ' FLAG');
console.log('-'.repeat(84));
for (const r of rows) {
  const flag = r.rate >= 0.4 ? '*** LENGTH TELL ***' : r.severe >= 3 ? 'severe outliers' : '';
  console.log(r.tool.padEnd(40), String(r.n).padStart(4),
    (r.uniq + ' (' + Math.round(100 * r.rate) + '%)').padStart(12),
    String(r.severe).padStart(7), String(r.skipped).padStart(5), ' ' + flag);
}
console.log('\n' + rows.length + ' banks measured (n>=8); chance rate is ~25-33% depending on arity;',
  rows.filter((r) => r.rate >= 0.4).length, 'flagged at >=40%');

if (UPDATE) {
  const packs = {};
  for (const r of rows) packs[r.tool] = { uniq: r.uniq, severe: r.severe, items: r.n };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({
    _comment: 'Ratchet baseline for the tool-bank longest-answer tell. Counts may only go DOWN; fixing the tell means hand-rewriting distractors (never the key) - the automated-filler pass was reverted in f6e08fe43, do not reinvent it. Regenerate with --update-baseline only after re-reading each changed bank.',
    _rule: 'uniq = key uniquely longest; severe = key >= longestDistractor + 20 AND >= longestDistractor * 1.75',
    tools: packs,
  }, null, 2) + '\n');
  console.log('baseline written: ' + BASELINE_PATH);
}
if (CHECK) {
  const base = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).tools;
  let worse = 0;
  for (const r of rows) {
    const b = base[r.tool];
    if (!b) { console.log('RATCHET: new measurable bank not in baseline: ' + r.tool + ' (uniq ' + r.uniq + ')'); if (r.rate >= 0.4) worse++; continue; }
    if (r.uniq > b.uniq || r.severe > b.severe) {
      console.log('RATCHET FAIL: ' + r.tool + ' uniq ' + b.uniq + ' -> ' + r.uniq + ', severe ' + b.severe + ' -> ' + r.severe);
      worse++;
    }
  }
  if (worse) process.exit(1);
  console.log('ratchet OK: no bank got worse.');
}

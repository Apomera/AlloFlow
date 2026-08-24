// Insert a hand-translated Water Cycle key set into one language pack.
//
//   node dev-tools/wc_pilot_pack_insert.cjs <slug> <translations.json> [--dry]
//
// Guards, each of which exists because the corresponding mistake is easy and
// silent:
//   · KEY PARITY against ui_strings.js - a typo'd key inserts a value nothing
//     will ever read, and the surface renders English with no error anywhere.
//   · TOKEN PARITY - if the English holds {m} and the translation drops it, the
//     number vanishes from the sentence at runtime. Checked per key, both ways.
//   · UNTRANSLATED detection - a value identical to the English is reported, so
//     "63/63 done" cannot quietly mean "63 copies of English".
//   · JSON validity of pack AND mirror, re-read from disk after writing.
//
// Targeted insertion into the existing stem.watercycle object; the rest of the
// pack is untouched, because other lanes hold sections in these same files.
'use strict';

const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
const jsonPath = process.argv[3];
const DRY = process.argv.includes('--dry');
if (!slug || !jsonPath) {
  console.error('usage: wc_pilot_pack_insert.cjs <slug> <translations.json> [--dry]');
  process.exit(2);
}

const PACK = path.join('lang', slug + '.js');
const MIRROR = path.join('desktop', 'web-app', 'public', 'lang', slug + '.js');
for (const f of [PACK, MIRROR]) if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }

const master = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.watercycle;
const incoming = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ── Guards ───────────────────────────────────────────────────────────────
const problems = [];
const untranslated = [];
const tokenRe = /\{(\w+)\}/g;

for (const [k, v] of Object.entries(incoming)) {
  if (!(k in master)) { problems.push(`unknown key (not in ui_strings.js): ${k}`); continue; }
  if (typeof v !== 'string' || !v.trim()) { problems.push(`empty value: ${k}`); continue; }
  const en = master[k];
  const want = (en.match(tokenRe) || []).sort();
  const got = (v.match(tokenRe) || []).sort();
  if (want.join(',') !== got.join(',')) {
    problems.push(`token mismatch ${k}: english ${JSON.stringify(want)} vs translation ${JSON.stringify(got)}`);
  }
  if (v === en && en.length > 3) untranslated.push(k);
}

// ── Unicode sanity ────────────────────────────────────────────────────────
// Hand-authoring non-Latin text is where silent corruption enters: a lone
// combining mark, a replacement character from a bad round-trip, or a stray
// Latin letter inside an Indic/Arabic/Ge'ez word. None of the three existing
// pack gates look for any of this - they check JSON validity and key parity,
// which corrupt text passes cleanly.
const SCRIPT_RANGES = [
  ['Devanagari', /[ऀ-ॿ]/], ['Bengali', /[ঀ-৿]/],
  ['Gurmukhi', /[਀-੿]/], ['Gujarati', /[઀-૿]/],
  ['Tamil', /[஀-௿]/], ['Telugu', /[ఀ-౿]/],
  ['Kannada', /[ಀ-೿]/], ['Malayalam', /[ഀ-ൿ]/],
  ['Thai', /[฀-๿]/], ['Lao', /[຀-໿]/],
  ['Myanmar', /[က-႟]/], ['Khmer', /[ក-៿]/],
  ['Ethiopic', /[ሀ-፿]/], ['Arabic', /[؀-ۿ]/],
  ['Hebrew', /[֐-׿]/],
];
const unicodeIssues = [];
for (const [k, v] of Object.entries(incoming)) {
  if (v.includes('�')) unicodeIssues.push(`${k}: contains U+FFFD replacement character`);
  // A combining mark with no base character before it.
  if (/(^|\s)[̀-ͯऀ-ःऺ-ॏัิ-ฺ็-๎]/.test(v)) {
    unicodeIssues.push(`${k}: combining mark with no base character`);
  }
  for (const [name, re] of SCRIPT_RANGES) {
    if (!re.test(v)) continue;
    // Latin letters glued directly to a LETTER of that script almost always
    // means a typo. Script PUNCTUATION is excluded: a do-not-translate unit
    // beside an Arabic comma ("°C/km،") or a Devanagari danda is correct, and
    // flagging it made the gate noisy on its first real run - a gate that cries
    // wolf gets ignored, which is worse than not having one.
    const PUNCT = /[،؛؟۔।॥၊။។៕]/;
    const glued = v.match(new RegExp(`[A-Za-z]${re.source}|${re.source}[A-Za-z]`, 'g')) || [];
    const real = glued.filter((g) => ![...g].some((ch) => PUNCT.test(ch)));
    if (real.length) unicodeIssues.push(`${k}: Latin letter glued to ${name} text near ${JSON.stringify(real[0])}`);
  }
}
if (unicodeIssues.length) {
  console.error(`UNICODE WARNINGS (${unicodeIssues.length}) - check these by eye:`);
  for (const u of unicodeIssues.slice(0, 12)) console.error('  ' + u);
}

if (problems.length) {
  console.error(`REFUSING - ${problems.length} problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`${slug}: ${Object.keys(incoming).length} keys, tokens verified`);
if (untranslated.length) {
  console.log(`  identical to English (${untranslated.length}): ${untranslated.slice(0, 12).join(', ')}${untranslated.length > 12 ? ' …' : ''}`);
}

function insert(file) {
  const src = fs.readFileSync(file, 'utf8');
  const parsed = JSON.parse(src);
  const has = parsed.stem && parsed.stem.watercycle;
  if (!has) throw new Error(`${file}: no stem.watercycle section to extend`);

  const m = /("watercycle"\s*:\s*\{)/.exec(src);
  if (!m) throw new Error(`${file}: "watercycle" anchor not found`);
  const indentMatch = /\n(\s+)"/.exec(src.slice(m.index + m[0].length));
  const indent = indentMatch ? indentMatch[1] : '      ';

  const fresh = Object.keys(incoming).filter((k) => !(k in has));
  const updates = Object.keys(incoming).filter((k) => k in has && has[k] !== incoming[k]);
  if (!fresh.length && !updates.length) return { file, added: 0, updated: 0, src };

  let out = src;
  if (fresh.length) {
    const block = fresh.map((k) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(incoming[k])},`).join('\n');
    out = out.slice(0, m.index + m[0].length) + '\n' + block + out.slice(m.index + m[0].length);
  }
  // Existing keys are rewritten through the parsed object only if they changed,
  // and only within the watercycle section, by regenerating that one line.
  for (const k of updates) {
    const lineRe = new RegExp(`(\\n\\s*${JSON.stringify(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*)("(?:[^"\\\\]|\\\\.)*")`, 'g');
    let replaced = 0;
    out = out.replace(lineRe, (whole, head) => { replaced += 1; return head + JSON.stringify(incoming[k]); });
    if (replaced !== 1) throw new Error(`${file}: key ${k} matched ${replaced} times on update`);
  }

  const check = JSON.parse(out);
  for (const k of Object.keys(incoming)) {
    if (check.stem.watercycle[k] !== incoming[k]) throw new Error(`${file}: ${k} did not round-trip`);
  }
  return { file, added: fresh.length, updated: updates.length, src: out };
}

const results = [PACK, MIRROR].map(insert);
for (const r of results) console.log(`  ${r.file}: +${r.added} new, ${r.updated} updated`);

if (DRY) { console.log('  (dry run)'); process.exit(0); }

for (const r of results) if (r.added || r.updated) fs.writeFileSync(r.file, r.src);
for (const r of results) {
  const disk = JSON.parse(fs.readFileSync(r.file, 'utf8'));
  const ok = Object.keys(incoming).filter((k) => disk.stem.watercycle[k] === incoming[k]).length;
  console.log(`  verified on disk ${r.file}: ${ok}/${Object.keys(incoming).length}`);
}

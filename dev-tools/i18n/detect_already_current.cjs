#!/usr/bin/env node
// detect_already_current.cjs — find keys the packs ALREADY reflect, which the baseline
// still reports as stale.
//
// A pack can be re-translated without anyone re-blessing the key. The baseline then keeps
// comparing against older English and keeps calling the key stale for ever, and a
// re-translation pass would rewrite text that is already right. Two roadready strings in
// the 2026-08-23 backlog were exactly this: every one of their 43 packs already said
// "20 scenarios" and "simulated impairment", while the baseline still held the English
// that said "18" and "0.08 BAC".
//
// The test has to be script-neutral, because the packs are in 62 languages. So it only
// uses MARKER TOKENS: substrings that survive translation unchanged - digits, decimal
// numbers, and Latin-script acronyms/proper nouns - and only when a marker appears on
// exactly one side of the English diff. A pack is "already current" for a key when it
// contains every new-side marker and none of the old-side markers.
//
// Keys with no usable marker are reported as UNDECIDABLE, never as current: silence here
// would bless prose that nobody checked.
//
// USAGE
//   node dev-tools/i18n/detect_already_current.cjs --search 90 [--json out.json]
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
function opt(n, d) { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; }
const SEARCH = Number(opt('--search', 90));
const JSON_OUT = opt('--json', null);

function git(a) { return execFileSync('git', a, { cwd: L.ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); }
function parseUi(t) { return L.flatten(JSON.parse(t.replace(/^﻿/, ''))); }
function parseHelp(t) {
  const H = new Function('return (' + t.slice(t.indexOf('{')) + ')')();
  const o = {}; for (const [k, v] of Object.entries(H)) o['help_mode.' + k] = v; return o;
}

const baseline = L.loadBaseline() || {};
const after = L.loadSourceStrings();
const { byKey } = L.computeStaleness({});
const keys = Object.keys(byKey).sort();

// Resolve the blessed English per key from history (same approach as classify_stale_drift).
const need = new Set(keys);
const before = {};
outer:
for (const rel of ['ui_strings.js', 'help_strings.js']) {
  let log = '';
  try { log = git(['log', '--format=%h', '-n', String(SEARCH), '--', rel]); } catch (_) { continue; }
  for (const rev of log.trim().split(String.fromCharCode(10)).map(x => x.trim()).filter(Boolean)) {
    if (!need.size) break outer;
    let src;
    try { src = rel === 'help_strings.js' ? parseHelp(git(['show', rev + ':' + rel])) : parseUi(git(['show', rev + ':' + rel])); }
    catch (_) { continue; }
    for (const k of [...need]) {
      const v = src[k];
      if (v !== undefined && L.hashEn(v) === baseline[k]) { before[k] = v; need.delete(k); }
    }
  }
}

// Digits do NOT survive translation as ASCII: Bengali writes 20 as ২০, Farsi as ۲۰,
// Burmese as ၂၀. Comparing raw substrings makes those packs look un-updated, which is
// the same non-Latin blind spot that has bitten every scanner in this repo. Fold the
// common digit blocks to ASCII before matching. (A language that spells the number out,
// like Latin "Viginti", still falls through to NOT CURRENT and gets read by a human.)
const DIGIT_BASES = [0x0660, 0x06F0, 0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6,
                     0x0C66, 0x0CE6, 0x0D66, 0x0E50, 0x0ED0, 0x0F20, 0x1040, 0x17E0];
function foldDigits(s) {
  return [...String(s)].map(ch => {
    const cp = ch.codePointAt(0);
    for (const base of DIGIT_BASES) if (cp >= base && cp <= base + 9) return String(cp - base);
    return ch;
  }).join('');
}

// Markers: things a translator carries across unchanged.
//   12   3.5   0.08          numbers (after digit folding)
//   WCAG BAC IEP AI PDF      all-caps Latin runs of 2+
function markers(s) {
  const out = new Set();
  for (const m of String(s).matchAll(/\d+(?:\.\d+)?/g)) out.add(m[0]);
  for (const m of String(s).matchAll(/\b[A-Z]{2,}\b/g)) out.add(m[0]);
  return out;
}

// Load every pack ONCE. Re-reading a 3 MB pack inside the per-key loop turned a
// seconds-long check into a ten-minute one.
const packs = {};
for (const slug of L.getLangSlugs()) { const p = L.loadPack(slug); if (p) packs[slug] = p; }

const result = { current: [], notCurrent: [], undecidable: [], unresolved: [...need] };
for (const k of keys) {
  if (!(k in before)) continue;
  const oldM = markers(before[k]), newM = markers(after[k]);
  const onlyNew = [...newM].filter(x => !oldM.has(x));
  const onlyOld = [...oldM].filter(x => !newM.has(x));
  if (!onlyNew.length && !onlyOld.length) { result.undecidable.push(k); continue; }
  const slugs = byKey[k];
  let currentCount = 0;
  for (const slug of slugs) {
    const raw = (packs[slug] || {})[k];
    if (typeof raw !== 'string') continue;
    const v = foldDigits(raw);
    const hasAllNew = onlyNew.every(x => v.includes(x));
    const hasNoOld = onlyOld.every(x => !v.includes(x));
    if (hasAllNew && hasNoOld) currentCount++;
  }
  const row = { key: k, packs: slugs.length, current: currentCount, onlyNew, onlyOld };
  if (currentCount === slugs.length) result.current.push(row);
  else result.notCurrent.push(row);
}

const entries = rows => rows.reduce((n, r) => n + r.packs, 0);
console.log(`detect_already_current: ${keys.length} stale key(s) examined`);
console.log(`  ALREADY CURRENT  ${String(result.current.length).padStart(4)} key(s)  ${String(entries(result.current)).padStart(5)} entries  - every pack already reflects the new English; bless`);
console.log(`  NOT CURRENT      ${String(result.notCurrent.length).padStart(4)} key(s)  ${String(entries(result.notCurrent)).padStart(5)} entries  - some pack still carries an old marker`);
console.log(`  UNDECIDABLE      ${String(result.undecidable.length).padStart(4)} key(s)         - no marker token; must be judged by reading`);
if (result.unresolved.length) console.log(`  UNRESOLVED       ${String(result.unresolved.length).padStart(4)} key(s)         - blessed English not found in the last ${SEARCH} revisions`);
for (const r of result.current) {
  console.log(`    ✓ ${r.key}  [${r.packs} packs]  new marker(s): ${r.onlyNew.join(', ') || '(none)'}  old: ${r.onlyOld.join(', ') || '(none)'}`);
}
for (const r of result.notCurrent.slice(0, 10)) {
  console.log(`    · ${r.key}  ${r.current}/${r.packs} packs updated  new: ${r.onlyNew.join(', ')}  old: ${r.onlyOld.join(', ')}`);
}
if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`\nwrote ${JSON_OUT}`);
}

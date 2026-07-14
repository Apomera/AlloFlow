#!/usr/bin/env node
// check_safety_string_spanglish.cjs — BLOCKING guard against half-translated (Spanglish)
// safety-critical UI strings.
//
// WHY THIS EXISTS (root-cause of the 2026-06-08 Finding-1 defect):
//   The lang-pack "passthrough %" metric only counts value===English (an EXACT match), so a
//   HALF-translated string like Greek "Διαγραφή this στόχος?" (Delete this goal?) scored as
//   "translated" while being broken in both languages. A 56-pack native review found alerts.* +
//   confirms.* — including destructive-action confirms ("Delete this? cannot be recovered") —
//   half-English in ~23 packs (242+ keys). check_translation_quality.cjs is scoped to
//   behavior_lens.* and is informational, so it never caught this.
//
//   New keys added to ui_strings.js AFTER the big translation phases are the recurring risk:
//   they ship as English in non-major packs and get partial substitution. This guard catches
//   that for the namespaces where a half-translation is most harmful (a user cannot read a
//   data-loss confirm) and where detection is high-precision.
//
// METHOD (source-relative + script-aware — the approach that converged Finding 1 to 0):
//   For each alerts.*/confirms.* value that differs from its English source (skip pure
//   passthrough — that is intentional for the PPS cluster / acceptable clean English):
//     - NON-LATIN-script value  → residue = Latin-script words (>=3 chars) not on the allowlist.
//                                  (Any English word inside Amharic/Greek/Japanese/etc. is residue.)
//     - LATIN-script value      → residue = words from the ENGLISH_ONLY set (English words with no
//                                  Romance/Latin cognate), so French "association/note/annotation"
//                                  and Italian "note" are NOT false-flagged.
//   A value with >=2 residue words is flagged. One kept loanword/cognate never trips it; a
//   half-translated string (English function + content words) does.
//
// SCOPE: alerts.* + confirms.* only (deliberately narrow + high-precision so it can BLOCK).
//   maay_maay is excluded (separate known issue: the pack is Standard Somali, not Maay Maay).
//
// STATUS: BLOCKING. After the Finding-1 fix (commits f330b0c9 + f48ab681) this reports 0, so it
//   cannot break the current build — it exists to fail CI when a FUTURE key regresses.
//
// Usage:
//   node dev-tools/i18n/check_safety_string_spanglish.cjs            exit 1 if any flagged; 0 if clean
//   node dev-tools/i18n/check_safety_string_spanglish.cjs --quiet    one-line summary
//   node dev-tools/i18n/check_safety_string_spanglish.cjs --json     machine-readable
//   node dev-tools/i18n/check_safety_string_spanglish.cjs <slug>...  scope to specific packs
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UI = path.join(ROOT, 'ui_strings.js');
const LANG = path.join(ROOT, 'lang');
const GLOSSARY = path.join(__dirname, 'aba_glossary.json');

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const JSON_OUT = args.includes('--json');
const slugFilter = args.filter((a) => !a.startsWith('--'));

const NAMESPACES = ['alerts.', 'confirms.'];
const THRESHOLD = 2; // >= this many residue words in one value => flagged

// Packs excluded from blocking, with reason. maay_maay is wrong-language (Finding 2, needs a human).
const SKIP_PACKS = new Set(['maay_maay']);

// Allowlist of words that may legitimately appear in any language (brand / standard tech loanword /
// feature-name / acronym). Used by the NON-LATIN branch (where any other Latin word is residue).
let glossaryWords = [];
try {
  const g = JSON.parse(fs.readFileSync(GLOSSARY, 'utf8'));
  const pv = g.preserve_verbatim || {};
  glossaryWords = [...(pv.brands || []), ...(pv.clinical_acronyms || []), ...(pv.tech_formats || [])];
} catch { /* glossary optional */ }
const ALLOWLIST = new Set(
  [
    ...glossaryWords.map((w) => String(w).toLowerCase()),
    // brand / product
    'alloflow', 'gemini', 'firebase', 'chrome', 'edge', 'safari', 'kindle', 'canvas', 'schoology',
    'chromebook', 'github', 'wikipedia',
    // standard tech loanwords commonly kept across languages
    'browser', 'clipboard', 'popup', 'url', 'html', 'json', 'csv', 'pdf', 'png', 'svg', 'ocr', 'api',
    'encryption', 'crypto', 'module', 'microphone', 'submission', 'token', 'tokens', 'data', 'clip',
    'tab', 'cache', 'app', 'web', 'epub', 'markdown', 'ai', 'wcag', 'aria', 'ada', 'iep',
    // AlloFlow feature-name nouns used as proper nouns (translated context around them)
    'atlas', 'realm', 'board', 'template', 'session', 'journal', 'backup', 'probe', 'calibration',
    'granularity', 'remediation', 'regenerate', 'function',
    // assessment-probe acronyms (DIBELS-style)
    'nwf', 'lnf', 'ran', 'orf', 'dibels', 'mb', 'kb',
  ]
);

// ENGLISH-ONLY words: clearly English, with NO Romance/Latin cognate, so they are reliable residue
// markers for LATIN-script packs (French/Italian/Romanian/Latin/Spanish/Portuguese won't false-flag).
const ENGLISH_ONLY = new Set(
  ('was were does did remind discarded discard empty supported unsupported something recovered cannot '
    + 'smaller shorter denied allow missing lost yet current both front back this with your ones existing '
    + 'imported recording exit invalid please switch draft highlight voice too over replace sequence '
    + 'available saved removed choose picked unable below above working while when where which their there '
    + 'here could would should been remove delete keep stay').split(/\s+/)
);

// === helpers ===
const flatten = (obj, prefix = '') => {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, full));
    else if (typeof v === 'string') out[full] = v;
  }
  return out;
};
const latinWords = (s) => s.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
const latinLetters = (s) => (s.match(/[A-Za-z]/g) || []).length;
const nonLatinLetters = (s) => { let n = 0; for (const ch of s) { if (/\p{L}/u.test(ch) && !/[A-Za-zÀ-ɏ]/.test(ch)) n++; } return n; };
const lowerTokens = (s) => s.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 3);

function residueWords(value) {
  if (nonLatinLetters(value) > latinLetters(value)) {
    // non-Latin script: any Latin word not on the allowlist is residue
    return [...new Set(latinWords(value).map((w) => w.toLowerCase()))].filter((w) => !ALLOWLIST.has(w));
  }
  // Latin script: only count English-only (non-cognate) words
  return [...new Set(lowerTokens(value))].filter((w) => ENGLISH_ONLY.has(w));
}

// === scan ===
const en = flatten(JSON.parse(fs.readFileSync(UI, 'utf8').replace(/^﻿/, '')));
const enKeys = Object.keys(en).filter((k) => NAMESPACES.some((n) => k.startsWith(n)));

const allSlugs =
  slugFilter.length > 0
    ? slugFilter
    : fs.readdirSync(LANG).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));

const report = { totalPacks: 0, flaggedKeys: 0, skipped: [...SKIP_PACKS], perPack: {} };

for (const slug of allSlugs) {
  if (SKIP_PACKS.has(slug)) continue;
  const langPath = path.join(LANG, slug + '.js');
  if (!fs.existsSync(langPath)) continue;
  let pack;
  try { pack = JSON.parse(fs.readFileSync(langPath, 'utf8')); }
  catch { continue; } // malformed JSON is check_lang_json's job, not ours
  report.totalPacks++;
  const flat = flatten(pack);
  const findings = [];
  for (const k of enKeys) {
    const e = en[k];
    const v = flat[k];
    if (!e || v === undefined || v === e) continue; // skip missing + pure passthrough
    const residue = residueWords(v);
    if (residue.length >= THRESHOLD) findings.push({ key: k, residue: residue.slice(0, 8), value: v.slice(0, 90) });
  }
  if (findings.length) { report.perPack[slug] = findings; report.flaggedKeys += findings.length; }
}

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(report.flaggedKeys > 0 ? 1 : 0); }

const offenders = Object.keys(report.perPack).sort((a, b) => report.perPack[b].length - report.perPack[a].length);

if (QUIET) {
  if (report.flaggedKeys === 0) console.log(`safety-string-spanglish: 0 flagged across ${report.totalPacks} packs (alerts.* + confirms.*).`);
  else console.log(`safety-string-spanglish: ${report.flaggedKeys} half-translated key(s) across ${offenders.length} pack(s) — run without --quiet for detail.`);
  process.exit(report.flaggedKeys > 0 ? 1 : 0);
}

console.log('=== safety-string Spanglish guard (alerts.* + confirms.*) ===');
console.log(`Scanned ${report.totalPacks} packs against ${enKeys.length} English keys. Skipped: ${[...SKIP_PACKS].join(', ') || 'none'}.`);
if (report.flaggedKeys === 0) {
  console.log('\n✓ 0 half-translated safety strings. All alerts/confirms are either fully translated or clean passthrough.');
  process.exit(0);
}
console.log(`\n❌ ${report.flaggedKeys} half-translated (Spanglish) safety string(s) across ${offenders.length} pack(s):\n`);
for (const slug of offenders) {
  console.log(`  ${slug} (${report.perPack[slug].length}):`);
  for (const f of report.perPack[slug]) console.log(`    ${f.key}  <${f.residue.join(',')}>  ${f.value}`);
}
console.log('\nThese values contain >=2 untranslated English words (script-aware, cognate-safe). A target-');
console.log('language user cannot read them — and several are destructive-action confirms. Re-translate from');
console.log('the English source in ui_strings.js (keep brand/loanword/feature tokens). See');
console.log('lang/PACK_QUALITY_REVIEW_2026-06-08.md for the original sweep + method.');
process.exit(1);

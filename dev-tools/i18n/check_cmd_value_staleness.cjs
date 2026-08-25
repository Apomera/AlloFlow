#!/usr/bin/env node
// check_cmd_value_staleness.cjs — find cmd.*/palette.* pack VALUES that are
// byte-identical to English behind check_cmd_i18n's green (X4, wave 3, 2026-08-17).
//
// WHY THIS EXISTS: check_cmd_i18n verifies key PRESENCE only. W1 measured 213 of
// 567 Spanish cmd/palette values byte-identical to English — including a pinned
// RETIRED feature name ("Here — Throughline") shipped in all 63 packs. A value
// identical to English is only acceptable when it is on the reviewed allowlist:
//   - surface/brand names the house convention keeps untranslated
//     (cmd_value_identical_allowlist.json, key- or value-based)
//   - the palette.ctx.* passthrough convention W1 documented
// Anything else is an untranslated command pretending to be done. When a
// catalog exists, the report also records whether the identity is a catalog
// gap, a catalog-English fallback, a placeholder-invalid catalog candidate,
// or an actionable catalog translation. Coverage and native translation are
// intentionally kept separate: an English fallback is safe at runtime but
// remains translation debt.
//
// LIMITS (read before trusting a green): value-identity is a PROXY. It cannot see
// a lazy translation that changed one letter, nor distinguish a deliberate loan
// word from an untranslated string outside the allowlist; languages that
// legitimately keep an English term (code-switching packs) will over-report.
// That is why default mode is REPORT-ONLY and --gate compares against a baseline
// count per pack (growth fails; the backlog does not).
//
// USAGE
//   node dev-tools/i18n/check_cmd_value_staleness.cjs                 # report; writes cmd_value_staleness/_summary.json; exit 0
//   node dev-tools/i18n/check_cmd_value_staleness.cjs --gate          # exit 1 if any pack EXCEEDS its baselined identical-count
//   node dev-tools/i18n/check_cmd_value_staleness.cjs --write-baseline
//   node dev-tools/i18n/check_cmd_value_staleness.cjs --quiet
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const OUT_DIR = path.join(__dirname, 'cmd_value_staleness');
const ALLOWLIST_PATH = path.join(__dirname, 'cmd_value_identical_allowlist.json');
const BASELINE_PATH = path.join(__dirname, 'cmd_value_staleness_baseline.json');
const EN_PATH = path.join(__dirname, 'cmd_keys_en.json');
const CATALOG_DIR = path.join(__dirname, 'cmd_translations');

const argv = process.argv.slice(2);
const GATE = argv.includes('--gate');
const WRITE_BASELINE = argv.includes('--write-baseline');
const QUIET = argv.includes('--quiet');
// test seams: --lang-dir/--baseline/--out-dir let the negative-control test
// plant a defect without touching the repo's real ledger files
const dirFlag = argv.indexOf('--lang-dir');
const langDir = dirFlag !== -1 ? path.resolve(argv[dirFlag + 1]) : LANG_DIR;
const baseFlag = argv.indexOf('--baseline');
const baselinePath = baseFlag !== -1 ? path.resolve(argv[baseFlag + 1]) : BASELINE_PATH;
const outFlag = argv.indexOf('--out-dir');
const outDir = outFlag !== -1 ? path.resolve(argv[outFlag + 1]) : OUT_DIR;
const catalogFlag = argv.indexOf('--catalog-dir');
const catalogDir = catalogFlag !== -1 ? path.resolve(argv[catalogFlag + 1]) : CATALOG_DIR;

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const allow = fs.existsSync(ALLOWLIST_PATH)
  ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'))
  : { keys: [], values: [], note: '' };
const allowKeys = new Set(allow.keys || []);
const allowValues = new Set(allow.values || []);

function isAllowed(key, value) {
  if (key.startsWith('palette.ctx.')) return true; // documented passthrough convention
  if (allowKeys.has(key)) return true;
  if (allowValues.has(value)) return true;
  return false;
}

function placeholderTokens(value) {
  return [...String(value)
    .matchAll(/\$\{[^}]+\}|\{[^{}]+\}|<\/?[a-zA-Z][^>]*>/g)]
    .map((match) => match[0])
    .sort();
}

function hasSamePlaceholders(left, right) {
  const a = placeholderTokens(left);
  const b = placeholderTokens(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function readCatalog(slug) {
  const file = path.join(catalogDir, `${slug}.json`);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) {
    console.error(`✗ ${slug}.json catalog is not parseable: ${error.message}`);
    process.exitCode = 1;
    return {};
  }
}

function replaceFile(file, text) {
  const temporary = `${file}.cmd-staleness-${process.pid}.tmp`;
  const transientCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN']);
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(temporary, text, 'utf8');
      try {
        fs.renameSync(temporary, file);
      } catch (error) {
        if (!transientCodes.has(error.code)) throw error;
        fs.copyFileSync(temporary, file);
      }
      return;
    } catch (error) {
      lastError = error;
      if (!transientCodes.has(error.code) || attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
    } finally {
      if (fs.existsSync(temporary)) {
        try { fs.unlinkSync(temporary); } catch (error) { lastError = error; }
      }
    }
  }
  throw lastError;
}

// A pack file is strict JSON despite the .js extension (house rule).
const packs = fs.readdirSync(langDir).filter((f) => f.endsWith('.js'));
const perPack = {};
const catalogByPack = {};
let total = 0;
let totalCatalogMissing = 0;
let totalCatalogEnglish = 0;
let totalCatalogPlaceholderRejects = 0;
let totalCatalogRecoverable = 0;
for (const file of packs) {
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8')); }
  catch (e) { console.error(`✗ ${file}: not parseable JSON — ${e.message}`); process.exitCode = 1; continue; }
  const slug = file.replace(/\.js$/, '');
  const identical = [];
  const catalog = readCatalog(slug);
  const catalogReasons = {
    missing: [],
    english: [],
    placeholderRejects: [],
    recoverable: [],
  };
  for (const [key, enValue] of Object.entries(en)) {
    // resolve dotted key in the pack (packs store nested namespaces)
    const parts = key.split('.');
    let v = data;
    for (const p of parts) { v = v && typeof v === 'object' ? v[p] : undefined; }
    if (typeof v !== 'string') continue; // missing = check_cmd_i18n's job
    if (v !== enValue || !String(enValue).trim() || isAllowed(key, enValue)) continue;
    identical.push(key);
    const candidate = catalog[key];
    if (typeof candidate !== 'string' || !candidate.trim()) catalogReasons.missing.push(key);
    else if (candidate === enValue) catalogReasons.english.push(key);
    else if (!hasSamePlaceholders(candidate, enValue)) catalogReasons.placeholderRejects.push(key);
    else catalogReasons.recoverable.push(key);
  }
  perPack[slug] = identical;
  catalogByPack[slug] = {
    catalogMissing: catalogReasons.missing.length,
    catalogEnglish: catalogReasons.english.length,
    catalogPlaceholderRejects: catalogReasons.placeholderRejects.length,
    catalogRecoverable: catalogReasons.recoverable.length,
    keysByReason: catalogReasons,
  };
  total += identical.length;
  totalCatalogMissing += catalogReasons.missing.length;
  totalCatalogEnglish += catalogReasons.english.length;
  totalCatalogPlaceholderRejects += catalogReasons.placeholderRejects.length;
  totalCatalogRecoverable += catalogReasons.recoverable.length;
}

fs.mkdirSync(outDir, { recursive: true });
replaceFile(path.join(outDir, '_summary.json'), JSON.stringify({
  generatedNote: 'cmd/palette values byte-identical to English, outside the reviewed allowlist. English fallback presence is safe runtime coverage, not a reviewed translation.',
  catalogNote: 'For each identity value, catalogMissing means no catalog candidate exists; catalogEnglish means the catalog also carries English; catalogPlaceholderRejects means a candidate was rejected for token mismatch; catalogRecoverable means a non-English, token-safe candidate is ready for merge.',
  totalIdentical: total,
  totalCatalogMissing,
  totalCatalogEnglish,
  totalCatalogPlaceholderRejects,
  totalCatalogRecoverable,
  perPack: Object.fromEntries(Object.entries(perPack).map(([k, v]) => [k, v.length])),
  keysPerPack: perPack,
  catalogByPack,
}, null, 2) + '\n');

if (WRITE_BASELINE) {
  replaceFile(baselinePath, JSON.stringify({
    note: 'Per-pack identical-to-English counts for --gate. This snapshot includes the 2026-08-24 command/palette coverage registration; growth still fails. Re-run --write-baseline only after an intentional coverage or translation change.',
    perPack: Object.fromEntries(Object.entries(perPack).map(([k, v]) => [k, v.length])),
  }, null, 2) + '\n');
  console.log(`cmd_value_staleness baseline written (${total} identical values across ${packs.length} packs).`);
  process.exit(0);
}

if (!QUIET) {
  const worst = Object.entries(perPack).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  for (const [slug, keys] of worst) console.log(`  ${slug}: ${keys.length} identical (e.g. ${keys.slice(0, 3).join(', ')})`);
}
console.log(`cmd_value_staleness: ${total} cmd/palette value(s) identical to English outside the allowlist, across ${packs.length} pack(s). Catalog gaps=${totalCatalogMissing}; catalog-English=${totalCatalogEnglish}; recoverable=${totalCatalogRecoverable}; placeholder-rejected=${totalCatalogPlaceholderRejects}. Worklist: dev-tools/i18n/cmd_value_staleness/_summary.json`);

if (GATE) {
  if (!fs.existsSync(baselinePath)) {
    console.error('✗ --gate needs a baseline: run --write-baseline first.');
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')).perPack || {};
  const regressions = [];
  for (const [slug, keys] of Object.entries(perPack)) {
    const cap = baseline[slug];
    if (typeof cap === 'number' && keys.length > cap) regressions.push(`${slug}: ${keys.length} > baseline ${cap}`);
    if (typeof cap !== 'number') regressions.push(`${slug}: no baseline entry (new pack) with ${keys.length} identical`);
  }
  if (regressions.length) {
    console.error('❌ cmd value-staleness gate: identical-to-English count GREW:\n  ' + regressions.join('\n  '));
    console.error('  Translate the new keys (never English passthrough), or add a REVIEWED surface name to cmd_value_identical_allowlist.json.');
    process.exit(1);
  }
  if (totalCatalogRecoverable || totalCatalogPlaceholderRejects) {
    console.error(`✗ cmd value-staleness gate: ${totalCatalogRecoverable} catalog translation(s) are ready to merge and ${totalCatalogPlaceholderRejects} candidate(s) fail placeholder validation.`);
    console.error('  Run merge_cmd_catalog_translations.cjs to apply token-safe candidates; review placeholder rejects before changing a pack.');
    process.exit(1);
  }
  console.log('✓ cmd value-staleness gate: no pack exceeds its baseline.');
}
process.exit(process.exitCode || 0);

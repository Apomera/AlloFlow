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
// Anything else is an untranslated command pretending to be done.
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

// A pack file is strict JSON despite the .js extension (house rule).
const packs = fs.readdirSync(langDir).filter((f) => f.endsWith('.js'));
const perPack = {};
let total = 0;
for (const file of packs) {
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8')); }
  catch (e) { console.error(`✗ ${file}: not parseable JSON — ${e.message}`); process.exitCode = 1; continue; }
  const slug = file.replace(/\.js$/, '');
  const identical = [];
  for (const [key, enValue] of Object.entries(en)) {
    // resolve dotted key in the pack (packs store nested namespaces)
    const parts = key.split('.');
    let v = data;
    for (const p of parts) { v = v && typeof v === 'object' ? v[p] : undefined; }
    if (typeof v !== 'string') continue; // missing = check_cmd_i18n's job
    if (v === enValue && String(enValue).trim() && !isAllowed(key, enValue)) identical.push(key);
  }
  perPack[slug] = identical;
  total += identical.length;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify({
  generatedNote: 'cmd/palette values byte-identical to English, outside the reviewed allowlist. Worklist for translators.',
  totalIdentical: total,
  perPack: Object.fromEntries(Object.entries(perPack).map(([k, v]) => [k, v.length])),
  keysPerPack: perPack,
}, null, 2) + '\n');

if (WRITE_BASELINE) {
  fs.writeFileSync(baselinePath, JSON.stringify({
    note: 'Per-pack identical-to-English counts for --gate. Growth fails; auto-lower this by re-running --write-baseline after real translation work.',
    perPack: Object.fromEntries(Object.entries(perPack).map(([k, v]) => [k, v.length])),
  }, null, 2) + '\n');
  console.log(`cmd_value_staleness baseline written (${total} identical values across ${packs.length} packs).`);
  process.exit(0);
}

if (!QUIET) {
  const worst = Object.entries(perPack).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  for (const [slug, keys] of worst) console.log(`  ${slug}: ${keys.length} identical (e.g. ${keys.slice(0, 3).join(', ')})`);
}
console.log(`cmd_value_staleness: ${total} cmd/palette value(s) identical to English outside the allowlist, across ${packs.length} pack(s). Worklist: dev-tools/i18n/cmd_value_staleness/_summary.json`);

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
  console.log('✓ cmd value-staleness gate: no pack exceeds its baseline.');
}
process.exit(process.exitCode || 0);

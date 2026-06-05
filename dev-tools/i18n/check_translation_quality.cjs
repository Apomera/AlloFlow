#!/usr/bin/env node
// check_translation_quality.cjs — Translation-quality CI guard.
//
// Audit-derived defect patterns (2026-06-04/05) — all 4 are real defects
// observed in production lang packs:
//
//   1. Contraction stubs    e.g. "wuu kara't Do" (Maay Maay), "maroñ't Do" (Marshallese)
//   2. Compound stubs       e.g. "Real-iien", "check-ilo" (Marshallese — old pipeline replaced
//                           English stems INSIDE hyphenated compounds, leaving broken halves)
//   3. Pack-specific calque "Matter" used as a noun for "Data" in acholi
//   4. ASCII-density in non-Latin packs — for lao/karen/burmese/khmer/thai/farsi/dari/pashto/urdu/etc,
//                           a behavior_lens.* string >40 chars with >40% Latin-ASCII content tokens
//                           after stop-word/whitelist removal is almost certainly Spanglish residue
//
// Usage:
//   node dev-tools/i18n/check_translation_quality.cjs              informational (exit 0)
//   node dev-tools/i18n/check_translation_quality.cjs --strict     blocking (exit 1 on any defect)
//   node dev-tools/i18n/check_translation_quality.cjs --json       machine-readable, no human output
//   node dev-tools/i18n/check_translation_quality.cjs <slug> [...] scope to specific packs
//
// Wired into verify_all as INFORMATIONAL until the residual fossil-defect count is driven
// down to a small known set (currently ~395 Spanglish flags surviving the 2026-06-05 sweep,
// most of which are conservative-principle outcomes — see aba_glossary.json conservative_principle).

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UI = path.join(ROOT, 'ui_strings.js');
const LANG = path.join(ROOT, 'lang');
const GLOSSARY = path.join(__dirname, 'aba_glossary.json');

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_OUT = args.includes('--json');
const slugFilter = args.filter((a) => !a.startsWith('--'));

const glossary = JSON.parse(fs.readFileSync(GLOSSARY, 'utf8'));

const PRESERVED = new Set([
  ...glossary.preserve_verbatim.brands,
  ...glossary.preserve_verbatim.clinical_acronyms,
  ...glossary.preserve_verbatim.tech_formats,
]);

// Per-pack target-script classification
const NON_LATIN_PACKS = new Set([
  'lao', 'thai', 'khmer', 'burmese', 'karen', 'hmong',
  'amharic', 'tigrinya',
  'arabic', 'farsi', 'dari', 'pashto', 'urdu',
  'hebrew',
  'chinese_simplified', 'chinese_traditional', 'japanese', 'korean',
  'bengali', 'hindi', 'nepali', 'punjabi', 'tamil', 'telugu',
  'greek', 'russian', 'ukrainian',
]);

const CONTRACTION_STUBS = glossary.preserve_anti_patterns.contraction_stubs;
const COMPOUND_STUBS = glossary.preserve_anti_patterns.compound_stubs;
const CALQUES = glossary.preserve_anti_patterns.calques;

// === Helpers ===
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

const tokenizeAscii = (s) => {
  const matches = s.match(/[A-Za-z]{4,}/g) || [];
  return matches.filter((w) => !PRESERVED.has(w));
};

// Compile contraction & compound stub matchers
const stubPatterns = [
  ...CONTRACTION_STUBS.map((p) => ({
    pattern: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    bucket: 'contraction_stubs',
    sample: p,
  })),
  ...COMPOUND_STUBS.map((p) => ({
    pattern: new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'),
    bucket: 'compound_stubs',
    sample: p,
  })),
];

// === Main scan ===
const en = JSON.parse(fs.readFileSync(UI, 'utf8'));
const enBL = flatten(en.behavior_lens || {});

const allSlugs =
  slugFilter.length > 0
    ? slugFilter
    : fs.readdirSync(LANG).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));

const report = {
  generated: '2026-06-05',
  totalPacks: allSlugs.length,
  perPack: {},
  totals: { contraction_stubs: 0, compound_stubs: 0, calques: 0, ascii_density: 0 },
};

for (const slug of allSlugs) {
  const langPath = path.join(LANG, slug + '.js');
  if (!fs.existsSync(langPath)) continue;
  let pack;
  try {
    pack = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  } catch (e) {
    report.perPack[slug] = { parseError: e.message };
    continue;
  }
  const flat = flatten(pack.behavior_lens || {});
  const findings = { contraction_stubs: [], compound_stubs: [], calques: [], ascii_density: [] };

  for (const [k, v] of Object.entries(flat)) {
    if (typeof v !== 'string' || v.length === 0) continue;

    // (1) + (2) contraction & compound stubs
    for (const sp of stubPatterns) {
      if (sp.pattern.test(v)) {
        findings[sp.bucket].push({ key: k, sample: sp.sample, value: v.slice(0, 120) });
        break;
      }
    }

    // (3) calques
    for (const c of CALQUES) {
      if (c.lang !== slug) continue;
      const re = new RegExp('\\b' + c.calque + '\\b');
      if (re.test(v)) findings.calques.push({ key: k, calque: c.calque, value: v.slice(0, 120) });
    }

    // (4) ASCII-density in non-Latin packs
    if (NON_LATIN_PACKS.has(slug) && v.length > 40) {
      const enSource = enBL[k];
      if (typeof enSource !== 'string' || v === enSource) continue; // skip passthroughs
      const asciiTokens = tokenizeAscii(v);
      if (asciiTokens.length >= 3) {
        const allTokens = (v.match(/\S+/g) || []).length;
        const ratio = asciiTokens.length / Math.max(1, allTokens);
        if (ratio > 0.4) {
          findings.ascii_density.push({
            key: k,
            asciiTokenCount: asciiTokens.length,
            ratio: +ratio.toFixed(2),
            value: v.slice(0, 120),
            asciiSample: asciiTokens.slice(0, 6),
          });
        }
      }
    }
  }

  const summary = {
    contraction_stubs: findings.contraction_stubs.length,
    compound_stubs: findings.compound_stubs.length,
    calques: findings.calques.length,
    ascii_density: findings.ascii_density.length,
  };
  report.perPack[slug] = { summary, findings };
  for (const k of Object.keys(report.totals)) report.totals[k] += summary[k];
}

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(STRICT && Object.values(report.totals).some((n) => n > 0) ? 1 : 0);
}

// Human output
console.log('=== Translation-quality CI guard ===');
console.log(
  'Scanned ' +
    allSlugs.length +
    ' pack(s). Rules: contraction-stubs, compound-stubs, calques, ascii-density (non-Latin packs only).'
);
console.log('');
console.log('Totals across all packs:');
console.log('  contraction stubs : ' + report.totals.contraction_stubs);
console.log('  compound stubs    : ' + report.totals.compound_stubs);
console.log('  calques           : ' + report.totals.calques);
console.log('  ascii-density     : ' + report.totals.ascii_density);
console.log('');

const offenders = Object.entries(report.perPack)
  .filter(([, v]) => v.summary && Object.values(v.summary).some((n) => n > 0))
  .sort((a, b) =>
    Object.values(b[1].summary).reduce((x, y) => x + y, 0) -
    Object.values(a[1].summary).reduce((x, y) => x + y, 0)
  );

if (offenders.length === 0) {
  console.log('All packs clean.');
} else {
  console.log('Per-pack defect counts (offenders only):');
  console.log('  pack                       cstub  pstub  calq   ascii');
  for (const [slug, v] of offenders) {
    const s = v.summary;
    console.log(
      '  ' +
        slug.padEnd(25) +
        '  ' +
        String(s.contraction_stubs).padStart(4) +
        '   ' +
        String(s.compound_stubs).padStart(4) +
        '   ' +
        String(s.calques).padStart(4) +
        '   ' +
        String(s.ascii_density).padStart(5)
    );
  }
}

console.log('');
const totalDefects = Object.values(report.totals).reduce((a, b) => a + b, 0);
if (STRICT && totalDefects > 0) {
  console.error('FAIL: ' + totalDefects + ' translation-quality defects detected. Run without --strict for informational output.');
  process.exit(1);
} else {
  console.log(
    'PASS (informational): ' +
      totalDefects +
      ' defects flagged. Use --strict to make blocking. See dev-tools/i18n/aba_glossary.json for the rule definitions.'
  );
  process.exit(0);
}

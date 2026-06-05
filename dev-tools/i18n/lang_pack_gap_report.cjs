#!/usr/bin/env node
// lang_pack_gap_report.cjs — For every lang pack in lang/*.js, compare its
// behavior_lens.* namespace against the canonical English in ui_strings.js
// and emit a per-language gap report listing which keys still need translation.
//
// Output: dev-tools/i18n/lang_pack_gaps/<lang>.json
//   { langName, totalKeys, translatedKeys, missingKeys, missing: { key: english } }
//
// Also writes a summary table to stdout sorted by coverage %.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_STRINGS = path.join(ROOT, 'ui_strings.js');
const LANG_DIR = path.join(ROOT, 'lang');
const OUT_DIR = path.join(ROOT, 'dev-tools', 'i18n', 'lang_pack_gaps');

const flatten = (obj, prefix = '') => {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, full));
    else out[full] = v;
  }
  return out;
};

const english = JSON.parse(fs.readFileSync(UI_STRINGS, 'utf8'));
const englishFlat = flatten(english.behavior_lens || {});
const englishKeys = Object.keys(englishFlat);
console.log(`Canonical English: ${englishKeys.length} behavior_lens.* keys in ui_strings.js`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const langFiles = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.js'));
const summary = [];

for (const langFile of langFiles) {
  const langName = langFile.replace(/\.js$/, '');
  let langJson;
  try {
    langJson = JSON.parse(fs.readFileSync(path.join(LANG_DIR, langFile), 'utf8'));
  } catch (err) {
    console.warn(`  skip ${langFile}: ${err.message.slice(0, 80)}`);
    continue;
  }
  const langFlat = flatten(langJson.behavior_lens || {});
  const langKeys = new Set(Object.keys(langFlat));
  const missing = {};
  const passthrough = []; // keys that exist in lang pack but value === English value (i.e. untranslated)
  let translatedCount = 0;

  for (const k of englishKeys) {
    if (!langKeys.has(k)) {
      missing[k] = englishFlat[k];
    } else {
      const langVal = langFlat[k];
      const enVal = englishFlat[k];
      if (langVal === enVal) passthrough.push(k);
      else translatedCount++;
    }
  }

  const totalEn = englishKeys.length;
  const missingCount = Object.keys(missing).length;
  const passthroughCount = passthrough.length;
  const coverage = totalEn > 0 ? Math.round((translatedCount / totalEn) * 1000) / 10 : 0;

  fs.writeFileSync(
    path.join(OUT_DIR, langName + '.json'),
    JSON.stringify({
      langName,
      generated: 'extract_behavior_lens_keys / lang_pack_gap_report',
      totalEnglishKeys: totalEn,
      translatedKeys: translatedCount,
      missingKeys: missingCount,
      passthroughKeys: passthroughCount,
      coveragePct: coverage,
      missing
    }, null, 2) + '\n'
  );

  summary.push({ langName, total: totalEn, translated: translatedCount, missing: missingCount, passthrough: passthroughCount, coveragePct: coverage });
}

// Print summary table sorted by coverage (highest first).
summary.sort((a, b) => b.coveragePct - a.coveragePct);
console.log(`\n── Coverage Summary (${summary.length} lang packs) ──`);
console.log('LANG                     COV%   TRANS    MISS    PASS');
console.log('────────────────────────────────────────────────────────');
for (const s of summary) {
  const pad = (str, n) => String(str).padEnd(n);
  const padN = (n, w) => String(n).padStart(w);
  console.log(`${pad(s.langName, 24)} ${padN(s.coveragePct.toFixed(1), 5)}  ${padN(s.translated, 5)}  ${padN(s.missing, 6)}  ${padN(s.passthrough, 6)}`);
}

const writes = summary.map(s => `  ${s.langName}.json`).join('\n');
console.log(`\nWrote ${summary.length} per-language gap reports to:\n  ${OUT_DIR}\n${writes}`);

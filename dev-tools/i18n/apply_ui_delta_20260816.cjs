#!/usr/bin/env node
// Merge the wave-1 ui_strings delta (L4 Translations control + L3 measured-level chip) into
// lang/*.js and the desktop mirror. Additive only: an existing pack value is never overwritten.
//
// Slot 12 contains a {btn} marker, replaced per pack with that pack's own
// simplified.check_level label so the sentence names the button the user actually sees.
//
// Validates before writing: 13 slots per language, no blanks, every {placeholder} the English
// carries survives verbatim, no stray placeholders, no em/en dashes.
// Usage: node dev-tools/i18n/apply_ui_delta_20260816.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop/web-app/public/lang')];
const DRY = process.argv.includes('--dry-run');

const rows = Object.assign({}, require('./ui_delta_hand_20260816_partA.cjs'), require('./ui_delta_hand_20260816_partB.cjs'));

const KEYS = [
  'universal.translations',
  'universal.translations_auto',
  'universal.translations_auto_plain',
  'universal.translations_none',
  'universal.translations_on_hint',
  'universal.translations_off_hint',
  'output.translation_block',
  'output.translation_into',
  'simplified.measured_level_label',
  'simplified.measured_on_target',
  'simplified.measured_above',
  'simplified.measured_below',
  'simplified.measured_note',
];
// Placeholders each slot must carry, mirroring the English source exactly.
const NEEDS = { 1: ['{language}'], 4: ['{output}', '{target}'], 5: ['{output}'], 7: ['{language}'], 9: ['{grade}'], 10: ['{grade}'], 11: ['{grade}'], 12: ['{btn}'] };
const ALL_PH = ['{language}', '{output}', '{target}', '{grade}', '{btn}'];

const get = (o, k) => k.split('.').reduce((a, p) => (a && typeof a === 'object') ? a[p] : undefined, o);
function setIfAbsent(o, k, v) {
  const parts = k.split('.');
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const leaf = parts[parts.length - 1];
  if (Object.prototype.hasOwnProperty.call(cur, leaf) && String(cur[leaf]).trim() !== '') return false;
  cur[leaf] = v;
  return true;
}

const langs = fs.readdirSync(path.join(ROOT, 'lang')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
const problems = [];
for (const L of langs) {
  const v = rows[L];
  if (!v) { problems.push(`${L}: MISSING from delta`); continue; }
  if (v.length !== KEYS.length) { problems.push(`${L}: ${v.length} slots, expected ${KEYS.length}`); continue; }
  v.forEach((s, i) => {
    if (typeof s !== 'string' || !s.trim()) problems.push(`${L}[${i}]: blank`);
    if (/[—–]/.test(s)) problems.push(`${L}[${i}]: em/en dash`);
    for (const ph of NEEDS[i] || []) if (!s.includes(ph)) problems.push(`${L}[${i}]: lost ${ph}`);
    for (const ph of ALL_PH) if (s.includes(ph) && !(NEEDS[i] || []).includes(ph)) problems.push(`${L}[${i}]: stray ${ph}`);
  });
}
if (problems.length) { console.error('VALIDATION FAILED:'); problems.forEach((p) => console.error('  ' + p)); process.exit(1); }
console.log(`validation OK: ${langs.length} languages x ${KEYS.length} slots`);

let added = 0, present = 0, files = 0, btnEn = 0;
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const slug = f.replace(/\.js$/, '');
    const v = rows[slug];
    if (!v) continue;
    const p = path.join(dir, f);
    const pack = JSON.parse(fs.readFileSync(p, 'utf8'));
    const btn = (typeof get(pack, 'simplified.check_level') === 'string' && get(pack, 'simplified.check_level').trim())
      ? get(pack, 'simplified.check_level') : 'Check Level';
    if (btn === 'Check Level') btnEn++;
    let dirty = false;
    v.forEach((s, i) => {
      const val = s.replace('{btn}', btn);
      if (setIfAbsent(pack, KEYS[i], val)) { added++; dirty = true; } else present++;
    });
    if (dirty && !DRY) {
      const out = JSON.stringify(pack, null, 2);
      JSON.parse(out);
      fs.writeFileSync(p, out, 'utf8');
      files++;
    }
  }
}
console.log(`${DRY ? '[dry] ' : ''}ui delta: +${added} value(s), ${present} already present, ${files} pack file(s) written; ${btnEn} pack(s) had no localized Check Level label.`);

#!/usr/bin/env node
// Fold the 2026-08-16 cmd-palette delta hand translations into
// dev-tools/i18n/cmd_translations/<slug>.json so merge_cmd_keys.cjs can carry them
// into every lang pack. Validates before writing:
//   - 19 slots per language, none blank
//   - {index} / {count} placeholders survive verbatim in the slots that carry them
//   - no em dash / en dash in any value
// Usage: node dev-tools/i18n/apply_cmd_delta_20260816.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const TR_DIR = path.join(DIR, 'cmd_translations');
const DRY = process.argv.includes('--dry-run');

const rows = Object.assign(
  {},
  require('./cmd_delta_hand_20260816_part1.cjs'),
  require('./cmd_delta_hand_20260816_part2.cjs'),
  require('./cmd_delta_hand_20260816_part3.cjs'),
);

// Slot -> key. Slot 3 feeds two keys (identical English source strings).
const KEYS = [
  ['cmd.describe_current_media'],
  ['cmd.describe_current_media_done'],
  ['cmd.describe_current_media_hint'],
  ['cmd.describe_current_media_none', 'cmd.read_media_descriptions_none'],
  ['cmd.open_learning_web_explorer'],
  ['cmd.open_learning_web_explorer_done'],
  ['cmd.open_learning_web_explorer_hint'],
  ['cmd.read_media_descriptions'],
  ['cmd.read_media_descriptions_count'],
  ['cmd.read_media_descriptions_hint'],
  ['cmd.suggest_contextual_next_steps'],
  ['cmd.suggest_contextual_next_steps_hint'],
  ['cmd.suggest_contextual_next_steps_working'],
  ['cmd.surprise_me_contextually'],
  ['cmd.surprise_me_contextually_hint'],
  ['cmd.surprise_me_contextually_working'],
  ['cmd.use_contextual_suggestion'],
  ['cmd.use_contextual_suggestion_hint'],
  ['cmd.use_contextual_suggestion_working'],
];
const NEEDS = { 1: ['{index}', '{count}'], 8: ['{count}'] };

const langs = fs.readdirSync(path.join(DIR, '..', '..', 'lang')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
let bad = 0;
const problems = [];
for (const L of langs) {
  const v = rows[L];
  if (!v) { problems.push(`${L}: MISSING from delta`); bad++; continue; }
  if (v.length !== KEYS.length) { problems.push(`${L}: ${v.length} slots, expected ${KEYS.length}`); bad++; continue; }
  v.forEach((s, i) => {
    if (typeof s !== 'string' || !s.trim()) problems.push(`${L}[${i}]: blank`);
    if (/[—–]/.test(s)) problems.push(`${L}[${i}]: em/en dash`);
    for (const ph of NEEDS[i] || []) if (!s.includes(ph)) problems.push(`${L}[${i}]: lost ${ph}`);
    for (const ph of ['{index}', '{count}']) {
      if (s.includes(ph) && !(NEEDS[i] || []).includes(ph)) problems.push(`${L}[${i}]: stray ${ph}`);
    }
  });
}
if (problems.length) { console.error('VALIDATION FAILED:'); problems.forEach((p) => console.error('  ' + p)); process.exit(1); }
console.log(`validation OK: ${langs.length} languages x ${KEYS.length} slots`);

let touched = 0, written = 0;
for (const L of langs) {
  const p = path.join(TR_DIR, L + '.json');
  const tr = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  let added = 0;
  rows[L].forEach((s, i) => { for (const k of KEYS[i]) { if (tr[k] !== s) { tr[k] = s; added++; } } });
  if (added) {
    touched++;
    const out = {};
    for (const k of Object.keys(tr).sort()) out[k] = tr[k];
    const json = JSON.stringify(out, null, 2) + '\n';
    JSON.parse(json);
    if (!DRY) { fs.writeFileSync(p, json, 'utf8'); written++; }
  }
}
console.log(`${DRY ? '[dry] ' : ''}${touched} translation file(s) updated${DRY ? '' : `, ${written} written`}.`);

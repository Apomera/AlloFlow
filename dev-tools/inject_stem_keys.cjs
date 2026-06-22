#!/usr/bin/env node
// inject_stem_keys.cjs <tool> — merge the English key map emitted by
// stem_extract_tool.cjs into ui_strings.js under stem.<tool>.{...}.
// ui_strings.js is canonical 2-space JSON, so load → merge → stringify is exact
// (clean diff = only the added keys). Merges into an existing stem.<tool> object
// (e.g. when a tool name collides with a curated stem key like fractions/volume),
// never overwriting an existing key. Reports value-differing collisions.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const UI = path.join(ROOT, 'ui_strings.js');
const tool = process.argv[2];
if (!tool) { console.error('Usage: inject_stem_keys.cjs <tool>'); process.exit(2); }
const mapPath = path.join(__dirname, 'stem_i18n_report', 'ui_strings_stem_' + tool + '.json');
if (!fs.existsSync(mapPath)) { console.error('No emitted map: ' + mapPath); process.exit(2); }
const keys = JSON.parse(fs.readFileSync(mapPath, 'utf8'))[tool];
if (!keys || !Object.keys(keys).length) { console.log(tool + ': no keys to inject'); process.exit(0); }

const data = JSON.parse(fs.readFileSync(UI, 'utf8'));
if (!data.stem || typeof data.stem !== 'object') { console.error('no stem namespace'); process.exit(2); }
const existing = (data.stem[tool] && typeof data.stem[tool] === 'object' && !Array.isArray(data.stem[tool])) ? data.stem[tool] : null;
const target = existing || {};
let added = 0, kept = 0, conflicts = [];
for (const [k, v] of Object.entries(keys)) {
  if (k in target) {
    if (target[k] !== v) conflicts.push(k);
    kept++;
  } else { target[k] = v; added++; }
}
data.stem[tool] = target;

fs.writeFileSync(UI, JSON.stringify(data, null, 2) + '\n');
console.log('stem.' + tool + ': +' + added + ' new keys' + (existing ? ' (merged into existing ' + (Object.keys(existing).length) + ')' : '') + (kept ? ', ' + kept + ' already present' : '') + '.');
if (conflicts.length) console.log('  ⚠ ' + conflicts.length + ' key(s) exist with a DIFFERENT value (kept curated; verify render): ' + conflicts.slice(0, 6).join(', '));

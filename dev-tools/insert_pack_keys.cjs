#!/usr/bin/env node
// insert_pack_keys.cjs — merge hand-translated keys into a language pack.
//
// Rebuild of the Math Fluency-era mf_pack_insert.py, in-repo this time so the
// next session doesn't have to reinvent it from a scratchpad (that pipeline was
// lost once already).
//
//   node dev-tools/insert_pack_keys.cjs <slug> <translations.json> [--section a11y]
//
// Guarantees, in this order:
//   1. every key exists in ui_strings.js's section  (no invented keys)
//   2. every {n} placeholder in English also appears in the translation
//   3. DNT brand terms present in English survive verbatim
//   4. a .bak of the pack is written before any change
//   5. pack + desktop/web-app/public mirror both stay valid JSON
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const slug = args[0];
const jsonPath = args[1];
const sectionArg = args.indexOf('--section');
const SECTION = sectionArg >= 0 ? args[sectionArg + 1] : 'a11y';

if (!slug || !jsonPath) {
  console.error('usage: node dev-tools/insert_pack_keys.cjs <slug> <translations.json> [--section a11y]');
  process.exit(2);
}

const DNT = ['AlloFlow', 'AlloBot', 'AlloHaven', 'StoryForge', 'LitLab', 'PoetTree', 'Gemini',
  'Imagen', 'Kokoro', 'XP', 'UDL', 'SEL', 'IEP', 'FERPA', 'WCAG', 'WCPM', 'TTS', 'Portfolio'];

const uiPath = path.join(ROOT, 'ui_strings.js');
const ui = JSON.parse(fs.readFileSync(uiPath, 'utf8'));
if (!ui[SECTION]) { console.error('no such section in ui_strings.js: ' + SECTION); process.exit(1); }

const incoming = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const packPath = path.join(ROOT, 'lang', slug + '.js');
if (!fs.existsSync(packPath)) { console.error('no pack: lang/' + slug + '.js'); process.exit(1); }

const problems = [];
for (const [k, v] of Object.entries(incoming)) {
  const en = ui[SECTION][k];
  if (en === undefined) { problems.push(k + ': NOT in ui_strings.' + SECTION); continue; }
  if (typeof v !== 'string' || !v.trim()) { problems.push(k + ': empty translation'); continue; }
  for (const tok of en.match(/\{\d+\}/g) || []) {
    if (!v.includes(tok)) problems.push(k + ': placeholder ' + tok + ' missing from translation');
  }
  for (const term of DNT) {
    if (en.includes(term) && !v.includes(term)) problems.push(k + ': DNT term "' + term + '" not preserved');
  }
}
if (problems.length) {
  console.error('VALIDATION FAILED (' + problems.length + '):');
  for (const p of problems.slice(0, 40)) console.error('  ' + p);
  process.exit(1);
}

const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
fs.writeFileSync(packPath + '.bak', JSON.stringify(pack, null, 2) + '\n', 'utf8');
pack[SECTION] = Object.assign({}, pack[SECTION] || {}, incoming);

// Preserve the pack's existing formatting convention (2-space, trailing newline).
const out = JSON.stringify(pack, null, 2) + '\n';
JSON.parse(out); // paranoia
fs.writeFileSync(packPath, out, 'utf8');

const mirror = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang', slug + '.js');
if (fs.existsSync(path.dirname(mirror))) fs.writeFileSync(mirror, out, 'utf8');

const total = Object.keys(pack[SECTION]).length;
console.log('lang/' + slug + '.js  +' + Object.keys(incoming).length + ' keys into ' + SECTION +
  '  (section now ' + total + ')' + (fs.existsSync(mirror) ? '  [mirror synced]' : '  [no mirror]'));

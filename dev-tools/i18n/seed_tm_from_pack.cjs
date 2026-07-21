#!/usr/bin/env node
// seed_tm_from_pack.cjs <tool> <slug> — seed tm_<tool>/<slug>.json from the
// translations ALREADY in lang/<slug>.js.
//
// Why: gen_stem_handtl.cjs refuses unless CORR+HT+tm.filled together cover every
// key in stem_<tool>_en.json. For a TOP-UP (pack was translated when the tool had
// fewer keys, then the tool grew), that would force an agent to re-supply hundreds
// of existing translations just to add a handful of new ones.
//
// Seeding tm.filled with the pack's current values means the HT module only needs
// the MISSING keys. The normal pipe then works unchanged: gen validates the full
// set, and apply_stem_tool_translations.cjs (non-clobber) adds only what's absent.
//
// Built 2026-07-20 for economicslab: 49 packs sat at 374 keys while the manifest
// had grown to 490 — each missing the same 117-key "Policy Inquiry" feature set,
// including canvas_summary_* screen-reader descriptions.
//
// Usage:
//   node dev-tools/i18n/seed_tm_from_pack.cjs economicslab hindi
//   node dev-tools/i18n/seed_tm_from_pack.cjs economicslab hindi --report
// Exit: 0 ok · 2 usage/setup error
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const [tool, slug] = process.argv.slice(2);
const REPORT = process.argv.includes('--report');
if (!tool || !slug) {
  console.error('Usage: seed_tm_from_pack.cjs <tool> <slug> [--report]');
  process.exit(2);
}

const enPath = path.join(__dirname, 'stem_' + tool + '_en.json');
if (!fs.existsSync(enPath)) { console.error('Missing English source: ' + enPath); process.exit(2); }
const EN = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const packPath = path.join(ROOT, 'lang', slug + '.js');
if (!fs.existsSync(packPath)) { console.error('Missing pack: ' + packPath); process.exit(2); }
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const cur = (pack.stem && pack.stem[tool] && typeof pack.stem[tool] === 'object') ? pack.stem[tool] : {};

// Only carry keys the manifest still knows about (drops stale/renamed keys).
const filled = {};
let carried = 0, stale = 0;
for (const [k, v] of Object.entries(cur)) {
  if (!(k in EN)) { stale++; continue; }
  if (typeof v === 'string' && v) { filled[k] = v; carried++; }
}
const missing = Object.keys(EN).filter(k => !(k in filled));

const tmDir = path.join(__dirname, 'tm_' + tool);
fs.mkdirSync(tmDir, { recursive: true });
const tmPath = path.join(tmDir, slug + '.json');
if (!REPORT) fs.writeFileSync(tmPath, JSON.stringify({ filled }, null, 2) + '\n');

console.log(slug.padEnd(22) +
  'carried ' + String(carried).padStart(4) +
  ' | manifest ' + String(Object.keys(EN).length).padStart(4) +
  ' | HT must supply ' + String(missing.length).padStart(4) +
  (stale ? ' | ' + stale + ' stale key(s) dropped' : '') +
  (REPORT ? '   [report-only, tm not written]' : ''));
if (REPORT && missing.length) console.log('  missing: ' + missing.slice(0, 12).join(', ') + (missing.length > 12 ? ', …' : ''));

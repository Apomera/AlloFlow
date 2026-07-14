#!/usr/bin/env node
// help_mode_gap_report.cjs — For every lang/*.js, compute which help_mode keys
// are MISSING or still English PASSTHROUGH versus the canonical English in
// help_strings.js (HELP_STRINGS). Emits help_gaps/<lang>.json with a `missing`
// block (English source for each gap key) in the exact shape that
// merge_help_missing.cjs consumes. Passthrough (value byte-identical to English)
// is treated as a gap so it gets retranslated.
//
//   node dev-tools/i18n/help_mode_gap_report.cjs
//
// maay_maay is excluded (its pack is the wrong language — a human decision).

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const HELP = path.join(ROOT, 'help_strings.js');
const OUT_DIR = path.join(__dirname, 'help_gaps');

const EXCLUDE = new Set(['maay_maay']);

let raw = fs.readFileSync(HELP, 'utf8');
const H = new Function('return (' + raw.slice(raw.indexOf('{')) + ')')();
const hKeys = Object.keys(H);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const norm = s => String(s).trim();
const slugs = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));
const summary = [];
for (const slug of slugs) {
  if (EXCLUDE.has(slug)) { summary.push({ slug, skipped: true }); continue; }
  let pack;
  try { pack = JSON.parse(fs.readFileSync(path.join(LANG_DIR, slug + '.js'), 'utf8')); }
  catch (e) { summary.push({ slug, error: 'parse' }); continue; }
  const hm = pack.help_mode || {};
  const missing = {};
  for (const k of hKeys) {
    if (!(k in hm) || norm(hm[k]) === norm(H[k])) missing[k] = H[k];
  }
  fs.writeFileSync(path.join(OUT_DIR, slug + '.json'), JSON.stringify({ langName: slug, totalEnglishKeys: hKeys.length, missingKeys: Object.keys(missing).length, missing }, null, 2) + '\n');
  summary.push({ slug, missing: Object.keys(missing).length });
}

console.log(`Canonical English: ${hKeys.length} HELP_STRINGS keys`);
console.log(`Wrote help_gaps/<slug>.json for ${summary.filter(s => !s.skipped && !s.error).length} packs.\n`);
summary.filter(s => s.missing > 0).sort((a, b) => b.missing - a.missing)
  .forEach(s => console.log(`  ${s.slug.padEnd(24)} ${String(s.missing).padStart(4)} gap keys`));
const clean = summary.filter(s => s.missing === 0).length;
console.log(`\n${clean} packs already complete; ${summary.filter(s => s.skipped).length} excluded (maay_maay).`);

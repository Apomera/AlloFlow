#!/usr/bin/env node
// Apply the B2 batch-1 stale-key re-translations (7 keys, gate-guarded namespaces).
// UNLIKE the additive delta appliers, this one OVERWRITES: every one of these (key, pack)
// pairs is flagged stale in dev-tools/i18n/lang_staleness (translations of superseded
// English), so replacing them is the point. Missing keys are added.
// The two brand-only keys are constants: surface names are do-not-translate.
// Usage: node dev-tools/i18n/apply_stale_fix_20260816.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop/web-app/public/lang')];
const DRY = process.argv.includes('--dry-run');
const rows = require('./stale_fix_hand_20260816.cjs');

const AUTHORED_KEYS = [
  'launch_pad.full_desc',
  'launch_pad.learning_tools_desc',
  'sidebar.open_stem_lab_explore_aria',
  'glossary.tooltips.select_all_highlight',
  'glossary.tooltips.select_highlight',
];
const CONSTANT_KEYS = { 'launch_pad.stem_title': 'STEAM Lab', 'sidebar.tool_math': 'STEAM Lab' };
const BRANDS = ['AlloFlow', 'STEAM Lab', 'StoryForge', 'SEL Hub', 'Research Hub'];

function set(o, k, v) {
  const parts = k.split('.');
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const leaf = parts[parts.length - 1];
  const changed = cur[leaf] !== v;
  cur[leaf] = v;
  return changed;
}

const langs = fs.readdirSync(path.join(ROOT, 'lang')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
const problems = [];
for (const L of langs) {
  const v = rows[L];
  if (!v) { problems.push(`${L}: MISSING`); continue; }
  if (v.length !== AUTHORED_KEYS.length) { problems.push(`${L}: ${v.length} slots, expected ${AUTHORED_KEYS.length}`); continue; }
  v.forEach((s, i) => {
    if (typeof s !== 'string' || !s.trim()) problems.push(`${L}[${i}]: blank`);
    if (/[—–]/.test(s)) problems.push(`${L}[${i}]: em/en dash`);
  });
  // Brand names must survive verbatim in the two slots that carry them all.
  for (const b of ['STEAM Lab']) {
    if (!v[0].includes(b)) problems.push(`${L}[0]: lost brand ${b}`);
    if (!v[1].includes(b)) problems.push(`${L}[1]: lost brand ${b}`);
    if (!v[2].includes(b)) problems.push(`${L}[2]: lost brand ${b}`);
  }
  if (!v[0].includes('AlloFlow')) problems.push(`${L}[0]: lost brand AlloFlow`);
  for (const b of ['StoryForge', 'SEL Hub', 'Research Hub']) if (!v[1].includes(b)) problems.push(`${L}[1]: lost brand ${b}`);
}
if (problems.length) { console.error('VALIDATION FAILED:'); problems.forEach((p) => console.error('  ' + p)); process.exit(1); }
console.log(`validation OK: ${langs.length} languages x ${AUTHORED_KEYS.length} authored + ${Object.keys(CONSTANT_KEYS).length} constant slots`);

let changed = 0, unchanged = 0, files = 0;
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const slug = f.replace(/\.js$/, '');
    const v = rows[slug];
    if (!v) continue;
    const p = path.join(dir, f);
    const pack = JSON.parse(fs.readFileSync(p, 'utf8'));
    let dirty = false;
    AUTHORED_KEYS.forEach((k, i) => { if (set(pack, k, v[i])) { changed++; dirty = true; } else unchanged++; });
    for (const [k, val] of Object.entries(CONSTANT_KEYS)) { if (set(pack, k, val)) { changed++; dirty = true; } else unchanged++; }
    if (dirty && !DRY) {
      const out = JSON.stringify(pack, null, 2);
      JSON.parse(out);
      fs.writeFileSync(p, out, 'utf8');
      files++;
    }
  }
}
console.log(`${DRY ? '[dry] ' : ''}stale fix: ${changed} value(s) rewritten, ${unchanged} already current, ${files} pack file(s) written.`);

#!/usr/bin/env node
// Merge the wave-3 ui_strings delta (X1 deep-link banner, X6 AI-setup notice,
// X7 family dashboard, coordinator Canvas card) into lang/*.js and the desktop
// mirror. Additive only: an existing pack value is never overwritten.
// Validates before writing: all 63 languages, 11 slots each, no blanks, no
// em/en dashes, brand tokens survive in the slots that carry them.
// Usage: node dev-tools/i18n/apply_ui_delta_20260817.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop/web-app/public/lang')];
const DRY = process.argv.includes('--dry-run');

const rows = Object.assign({}, require('./ui_delta_hand_20260817_partA.cjs'), require('./ui_delta_hand_20260817_partB.cjs'));

const KEYS = [
  'shell_link.banner_aria',
  'shell_link.banner_text',
  'shell_link.banner_open',
  'shell_link.banner_dismiss',
  'ai_backend.guided_card_canvas_title',
  'ai_backend.guided_card_canvas_badge',
  'ai_backend.guided_card_canvas_body',
  'ai_backend.guided_card_canvas_req',
  'dashboard.title_parent',
  'sidebar.needs_ai_setup',
  'sidebar.needs_ai_setup_cta',
];
// slot -> substrings that must survive verbatim
const MUST_CARRY = {
  1: ['AlloFlow'],
  4: ['AlloFlow', 'Gemini Canvas'],
  6: ['AlloFlow', 'Google Gemini'],
  7: ['gemini.google.com', 'google.com/gemini'],
  10: ['AlloFlow', 'Gemini Canvas'],
};

const slugs = fs.readdirSync(DIRS[0]).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));

let bad = 0;
for (const slug of slugs) {
  const values = rows[slug];
  if (!Array.isArray(values)) { console.error(`✗ ${slug}: MISSING`); bad++; continue; }
  if (values.length !== KEYS.length) { console.error(`✗ ${slug}: ${values.length} slots != ${KEYS.length}`); bad++; continue; }
  values.forEach((v, i) => {
    if (!v || !String(v).trim()) { console.error(`✗ ${slug}[${i}]: blank`); bad++; }
    if (/[–—]/.test(v)) { console.error(`✗ ${slug}[${i}]: em/en dash`); bad++; }
    for (const token of MUST_CARRY[i] || []) {
      if (!v.includes(token)) { console.error(`✗ ${slug}[${i}]: missing brand token ${token}`); bad++; }
    }
  });
}
if (bad) { console.error(`\n${bad} validation error(s); nothing written.`); process.exit(1); }

function setIfAbsent(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const leaf = parts[parts.length - 1];
  if (Object.prototype.hasOwnProperty.call(cur, leaf) && String(cur[leaf]).trim() !== '') return false;
  cur[leaf] = value;
  return true;
}

let totalAdded = 0;
for (const dir of DIRS) {
  for (const slug of slugs) {
    const file = path.join(dir, slug + '.js');
    if (!fs.existsSync(file)) continue;
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    let added = 0;
    rows[slug].forEach((v, i) => { if (setIfAbsent(pack, KEYS[i], v)) added++; });
    if (added && !DRY) fs.writeFileSync(file, JSON.stringify(pack, null, 2) + '\n');
    totalAdded += added;
  }
}
console.log(`${DRY ? '[dry-run] would add' : 'added'} ${totalAdded} value(s) across ${slugs.length} pack(s) x ${DIRS.length} dir(s).`);

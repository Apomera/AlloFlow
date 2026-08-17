#!/usr/bin/env node
// Fold the 2026-08-17b cmd delta (Leadership Hub voice door, 3 keys) into
// cmd_translations/<slug>.json for merge_cmd_keys.cjs. W1-pattern validation:
// all 63 languages, 3 slots each, no blanks, no em/en dashes, MTSS verbatim.
// Usage: node dev-tools/i18n/apply_cmd_delta_20260817b.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const TR_DIR = path.join(DIR, 'cmd_translations');
const DRY = process.argv.includes('--dry-run');
const rows = require('./cmd_delta_hand_20260817b.cjs');

const KEYS = ['cmd.open_leadership_hub', 'cmd.open_leadership_hub_hint', 'cmd.open_leadership_hub_done'];

const slugs = fs.readdirSync(path.join(DIR, '..', '..', 'lang'))
  .filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));

let bad = 0;
for (const slug of slugs) {
  const values = rows[slug];
  if (!Array.isArray(values)) { console.error(`✗ ${slug}: MISSING`); bad++; continue; }
  if (values.length !== KEYS.length) { console.error(`✗ ${slug}: ${values.length} slots`); bad++; continue; }
  values.forEach((v, i) => {
    if (!v || !String(v).trim()) { console.error(`✗ ${slug}[${i}]: blank`); bad++; }
    if (/[–—]/.test(v)) { console.error(`✗ ${slug}[${i}]: em/en dash`); bad++; }
  });
  if (!/MTSS/.test(values[1])) { console.error(`✗ ${slug}[1]: MTSS must survive verbatim`); bad++; }
}
for (const slug of Object.keys(rows)) {
  if (!slugs.includes(slug)) { console.error(`✗ unknown slug ${slug}`); bad++; }
}
if (bad) { console.error(`\n${bad} validation error(s); nothing written.`); process.exit(1); }

let written = 0;
for (const slug of slugs) {
  const file = path.join(TR_DIR, slug + '.json');
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  rows[slug].forEach((v, i) => { existing[KEYS[i]] = v; });
  if (!DRY) fs.writeFileSync(file, JSON.stringify(existing, null, 2) + '\n');
  written++;
}
console.log(`${DRY ? '[dry-run] would write' : 'wrote'} ${KEYS.length} keys for ${written} language(s).`);

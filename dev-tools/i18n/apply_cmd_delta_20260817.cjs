#!/usr/bin/env node
// Fold the 2026-08-17 cmd-palette delta hand translations (X6's six new commands)
// into dev-tools/i18n/cmd_translations/<slug>.json so merge_cmd_keys.cjs can carry
// them into every lang pack. Validates before writing (the W1 pattern):
//   - all 63 languages present, 18 slots each, none blank
//   - no em dash / en dash in any value
//   - brand names AlloFlow / Gemini Canvas survive verbatim in slots 0 and 2
// Usage: node dev-tools/i18n/apply_cmd_delta_20260817.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const TR_DIR = path.join(DIR, 'cmd_translations');
const DRY = process.argv.includes('--dry-run');

const rows = Object.assign(
  {},
  require('./cmd_delta_hand_20260817_part1.cjs'),
  require('./cmd_delta_hand_20260817_part2.cjs'),
  require('./cmd_delta_hand_20260817_part3.cjs'),
);

const KEYS = [
  'cmd.use_gemini_canvas',
  'cmd.use_gemini_canvas_hint',
  'cmd.use_gemini_canvas_done',
  'cmd.open_brainstorm_modes',
  'cmd.open_brainstorm_modes_hint',
  'cmd.open_brainstorm_modes_done',
  'cmd.open_discussion_builder',
  'cmd.open_discussion_builder_hint',
  'cmd.open_discussion_builder_done',
  'cmd.open_jigsaw_builder',
  'cmd.open_jigsaw_builder_hint',
  'cmd.open_jigsaw_builder_done',
  'cmd.jump_to_lesson_plan',
  'cmd.jump_to_lesson_plan_hint',
  'cmd.jump_to_lesson_plan_done',
  'cmd.open_block_suggestions',
  'cmd.open_block_suggestions_hint',
  'cmd.open_block_suggestions_done',
];

const slugs = fs.readdirSync(path.join(DIR, '..', '..', 'lang'))
  .filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));

let bad = 0;
for (const slug of slugs) {
  const values = rows[slug];
  if (!Array.isArray(values)) { console.error(`✗ ${slug}: MISSING from delta`); bad++; continue; }
  if (values.length !== KEYS.length) { console.error(`✗ ${slug}: ${values.length} slots, expected ${KEYS.length}`); bad++; continue; }
  values.forEach((v, i) => {
    if (!v || !String(v).trim()) { console.error(`✗ ${slug}[${i}]: blank`); bad++; }
    if (/[–—]/.test(v)) { console.error(`✗ ${slug}[${i}]: em/en dash`); bad++; }
  });
  if (!/AlloFlow/.test(values[0]) || !/Gemini Canvas/.test(values[0])) { console.error(`✗ ${slug}[0]: brand names must survive`); bad++; }
  if (!/AlloFlow/.test(values[2]) || !/Gemini Canvas/.test(values[2])) { console.error(`✗ ${slug}[2]: brand names must survive`); bad++; }
}
for (const slug of Object.keys(rows)) {
  if (!slugs.includes(slug)) { console.error(`✗ delta has unknown slug ${slug}`); bad++; }
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
console.log(`${DRY ? '[dry-run] would write' : 'wrote'} ${KEYS.length} keys for ${written} language(s) into cmd_translations/`);

#!/usr/bin/env node
// apply_cmd_lesson_narration_hand.cjs — merge hand translations for the four
// lesson-narration command keys into the cmd.* namespace of each lang pack.
//
// WHY A NEW APPLIER
// dev-tools/i18n/apply_hand_translations.cjs is hardcoded to the behavior_lens
// namespace (`setDeep(langJson.behavior_lens, ...)`), so it would file these
// keys in the wrong place. These keys live flat under `cmd`.
//
// WHAT THIS FIXES
// allo_commands_module.js narrates four states through t():
//   cmd.rebuild_lesson_step_working / _complete
//   cmd.run_lesson_blueprint_working / _complete
// All 63 packs shipped the ENGLISH string for these, so a non-English learner
// heard "Rebuilding the selected lesson step..." in English. The real
// translations existed only on two older key names (_done) that the code
// stopped using when the message shape changed from a fragment + step number
// to a standalone sentence -- which is why those strings could not simply be
// renamed onto the new keys.
//
// Payload shape:
//   { "<slug>": { "cmd.<key>": "<translation>", ... }, ... }
//
// Usage:
//   node dev-tools/i18n/apply_cmd_lesson_narration_hand.cjs <payload.json> [--dry-run]
//
// Refuses to overwrite a value that is NOT the English string, so a curated
// translation is never clobbered by a rerun.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, 'cmd_keys_en.json'), 'utf8'));

const argv = process.argv.slice(2);
const PAYLOAD = argv.find((a) => !a.startsWith('--'));
const DRY_RUN = argv.includes('--dry-run');

if (!PAYLOAD) {
  console.error('Usage: apply_cmd_lesson_narration_hand.cjs <payload.json> [--dry-run]');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
const ts = 'handtl-cmd-lesson-narration';

let applied = 0;
let skippedCurated = 0;
let missingPack = 0;
const rows = [];

for (const [slug, entries] of Object.entries(payload)) {
  const langPath = path.join(LANG_DIR, slug + '.js');
  if (!fs.existsSync(langPath)) { missingPack += 1; rows.push([slug, 'pack-not-found', 0]); continue; }

  let pack;
  try { pack = JSON.parse(fs.readFileSync(langPath, 'utf8')); }
  catch (err) { rows.push([slug, 'parse-error: ' + err.message.slice(0, 40), 0]); continue; }

  if (!pack.cmd || typeof pack.cmd !== 'object' || Array.isArray(pack.cmd)) pack.cmd = {};

  let merged = 0;
  for (const [dotted, value] of Object.entries(entries)) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const local = dotted.replace(/^cmd\./, '');
    const current = pack.cmd[local];
    const english = EN[dotted];
    // Only fill a slot that is absent or still carrying the English source.
    // Anything else is somebody's curated translation and is left alone.
    if (current !== undefined && current !== english) { skippedCurated += 1; continue; }
    pack.cmd[local] = value;
    merged += 1;
  }

  if (!DRY_RUN && merged > 0) {
    fs.copyFileSync(langPath, langPath + '.bak.' + ts);
    fs.writeFileSync(langPath, JSON.stringify(pack, null, 2) + '\n');
  }
  applied += merged;
  rows.push([slug, DRY_RUN ? 'would-merge' : 'merged', merged]);
}

const failed = rows.filter((r) => !/^(merged|would-merge)$/.test(r[1]));
for (const r of failed) console.log('  %s: %s', r[0], r[1]);
console.log('%s %d value(s) across %d pack(s); %d slot(s) left alone as already-curated; %d pack(s) not found.',
  DRY_RUN ? 'WOULD merge' : 'Merged', applied, rows.filter((r) => r[2] > 0).length, skippedCurated, missingPack);
if (failed.length) process.exitCode = 1;

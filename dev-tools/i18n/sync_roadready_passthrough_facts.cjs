#!/usr/bin/env node
'use strict';

// Refresh RoadReady keys whose pack value is UNTRANSLATED ENGLISH that has
// since gone stale.
//
// Why this is not a translation job
// ---------------------------------
// The runtime resolves `ctx.t(key, fallback)` and only falls back to the
// source string when the pack returns null. A pack that carries an English
// passthrough therefore OVERRIDES the corrected source. For these nine keys
// every one of the 63 packs holds English — zero are actually translated — so
// the stale copy wins on every non-English language setting.
//
// That matters because commit 23cfe982d corrected facts, not phrasing:
//
//   "roughly 500-700 reported moose-vehicle collisions per year"  (MaineDOT
//   counts 217-293; 217 in 2024) and "averages 3-5 fatal moose crashes
//   annually" (three people died across ALL of 2020-2024). Also a 100 ft dry
//   braking figure the tool's own model puts at 74 ft, an ice figure that made
//   the winter box contradict its own "7x longer" headline, and two
//   mislabelled distance markers.
//
// A student on any non-English setting is still being taught the wrong
// numbers. Re-translating is the wrong remedy: there is nothing to preserve,
// the repo's merge_stale_translations.cjs has no key scoping (it would
// re-translate 351 keys of other sessions' in-flight drift through live
// Gemini calls), and these values were never translated in the first place.
//
// So: copy the current ui_strings.js English over the stale English, and only
// where the existing value is verbatim the OLD English. Anything else is left
// untouched and reported, so a real translation can never be clobbered.
//
// Usage:
//   node dev-tools/i18n/sync_roadready_passthrough_facts.cjs           # dry run
//   node dev-tools/i18n/sync_roadready_passthrough_facts.cjs --apply
//   node dev-tools/i18n/sync_roadready_passthrough_facts.cjs --selftest

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const SELFTEST = process.argv.includes('--selftest');

const PACK_DIRS = [
  path.join(ROOT, 'lang'),
  path.join(ROOT, 'desktop', 'web-app', 'public', 'lang'),
];

// The keys corrected in 23cfe982d. Each is matched against the OLD text below
// before anything is written.
const KEYS = [
  'maine_has_roughly_500_700_reported_moo',
  'dawn_and_dusk_low_light_plus_late_may_',
  'brake_hard_let_up_just_before_impact_h',
  'at_40_mph_on_ice_stopping_distance_600',
  'at_40_mph_on_dry_100_feet',
  'a_car_length_10_ft_6',
  'half_a_football_field',
  '3_142_distracted_driving_deaths_in_the',
  'maine_2054_a_when_passing_a_stopped_em',
];

// Current English, read from the catalog rather than retyped here, so this
// script cannot disagree with what the tool actually ships.
function currentEnglish() {
  const src = fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8');
  const out = {};
  for (const key of KEYS) {
    const re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
    const m = src.match(re);
    if (!m) throw new Error('key missing from ui_strings.js: ' + key);
    out[key] = m[1];
  }
  return out;
}

// The pre-correction English, taken from the parent of the correcting commit.
// Read from git so it is not a hand-copied literal that could drift.
function previousEnglish() {
  const { execFileSync } = require('node:child_process');
  let src;
  try {
    src = execFileSync('git', ['show', '23cfe982d^:ui_strings.js'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  } catch (e) {
    throw new Error('could not read the pre-correction ui_strings.js from git: ' + e.message);
  }
  const out = {};
  for (const key of KEYS) {
    const re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
    const m = src.match(re);
    if (m) out[key] = m[1];
  }
  return out;
}

function packFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.js') && !f.includes('.bak'))
    .map((f) => path.join(dir, f));
}

function run() {
  const now = currentEnglish();
  const before = previousEnglish();
  const missingBefore = KEYS.filter((k) => !before[k]);
  if (missingBefore.length) {
    console.error('✗ these keys had no pre-correction value, so there is nothing to match:\n  ' +
      missingBefore.join('\n  '));
    process.exit(1);
  }

  let filesChanged = 0;
  let entriesChanged = 0;
  const skipped = [];

  for (const dir of PACK_DIRS) {
    for (const file of packFiles(dir)) {
      const original = fs.readFileSync(file, 'utf8');
      let text = original;
      for (const key of KEYS) {
        const re = new RegExp('("' + key + '"\\s*:\\s*")((?:[^"\\\\]|\\\\.)*)(")');
        const m = text.match(re);
        if (!m) continue;
        const value = m[2];
        if (value === now[key]) continue;          // already current
        if (value !== before[key]) {
          // Not the old English — could be a real translation. Never touch it.
          skipped.push(path.relative(ROOT, file) + ' :: ' + key);
          continue;
        }
        text = text.replace(re, (full, a, _old, c) => a + now[key] + c);
        entriesChanged++;
      }
      if (text !== original) {
        filesChanged++;
        if (APPLY) {
          // Validate before writing: a pack must stay parseable JSON.
          JSON.parse(text);
          fs.writeFileSync(file, text, 'utf8');
        } else {
          JSON.parse(text);
        }
      }
    }
  }

  if (skipped.length) {
    console.log('  left alone (value is not the old English — possibly a real translation):');
    for (const s of skipped.slice(0, 10)) console.log('    ' + s);
    if (skipped.length > 10) console.log('    … and ' + (skipped.length - 10) + ' more');
  }
  console.log((APPLY ? '✓ applied: ' : 'dry run: ') + entriesChanged +
    ' stale English entr(ies) across ' + filesChanged + ' pack file(s)' +
    (APPLY ? '' : ' would be refreshed. Re-run with --apply to write.'));
  return { filesChanged, entriesChanged, skipped: skipped.length };
}

// A gate that cannot fail is worse than none: prove the guard actually refuses
// to overwrite a value that is not the old English.
function selftest() {
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rrpass-'));
  const key = KEYS[0];
  const before = previousEnglish()[key];
  const now = currentEnglish()[key];
  let failures = 0;

  const check = (name, got, want) => {
    if (got === want) { console.log('  PASS  ' + name); }
    else { failures++; console.log('  FAIL  ' + name + ' (got ' + JSON.stringify(got) + ')'); }
  };

  // 1. A real translation must survive untouched.
  const translated = JSON.stringify({ [key]: 'UNA TRADUCCION REAL' });
  const f1 = path.join(tmp, 'a.js');
  fs.writeFileSync(f1, translated);
  const re = new RegExp('("' + key + '"\\s*:\\s*")((?:[^"\\\\]|\\\\.)*)(")');
  const m1 = fs.readFileSync(f1, 'utf8').match(re);
  check('a real translation is not the old English, so it is skipped',
    m1[2] !== before, true);

  // 2. The old English must be recognised.
  check('the pre-correction English is readable from git', typeof before === 'string' && before.length > 10, true);
  check('the current English differs from it', now !== before, true);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failures ? '\n✗ selftest FAILED' : '\n✓ selftest passed');
  process.exit(failures ? 1 : 0);
}

if (SELFTEST) selftest();
else run();

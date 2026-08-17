#!/usr/bin/env node
/**
 * add_volume_builder_keys_20260817.cjs — W1
 *
 * VolumeBuilderView (view_misc_panels_source.jsx) shipped 24 scanner-visible
 * hardcoded English strings plus ~10 the AST scanner could not see (ternaries
 * like `dim === 'l' ? 'Length' : …`, the raw `{d}` difficulty labels, and the
 * ✅/❌ feedback messages built by string concatenation inside two event
 * handlers). This adds the keys for ALL of them to the existing
 * `volume_builder` namespace.
 *
 * Why a script and not the Edit tool: ui_strings.js is strict JSON with CRLF
 * line endings, so a multi-line Edit anchor cannot match (disk CRLF vs the LF
 * in a composed old_string). This splices raw text, preserving the file's own
 * EOL byte-for-byte — no JSON.stringify reformat of the other ~70k lines.
 *
 * Safety: single-occurrence anchor, JSON.parse before AND after, exact
 * added-key-count assertion, and an abort if any key already exists (so a
 * double run is a no-op rather than a duplicate).
 *
 * Run under the fleet lock for ui_strings.js.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', '..', 'ui_strings.js');
const NS = 'volume_builder';
const ANCHOR = '    "answer_aria": "Volume answer"';

// Existing product copy is preserved VERBATIM (including the em dash in
// surface_area_approx) — this is i18n plumbing, not a copy rewrite.
const ADDITIONS = {
  title: '3D Volume Explorer',
  rotate_group_aria: 'Rotate 3D volume',
  rotate_label: 'Rotate:',
  rotate_left_aria: 'Rotate volume left',
  rotate_left: 'Left',
  rotate_right_aria: 'Rotate volume right',
  rotate_right: 'Right',
  tilt_up_aria: 'Tilt volume up',
  tilt_up: 'Up',
  tilt_down_aria: 'Tilt volume down',
  tilt_down: 'Down',
  // One key, not three fragments: this is a single aria-live sentence.
  orientation_status: 'Tilt {tilt} degrees, turn {turn} degrees, zoom {zoom} percent',
  shape_rect: 'Rectangular',
  shape_lblock: 'L-Block',
  dim_length: 'Length',
  dim_width: 'Width',
  dim_height: 'Height',
  layers_label: 'Layers:',
  layers_all: 'All',
  unit_cubes_one: '{count} unit cube',
  unit_cubes_other: '{count} unit cubes',
  surface_area_approx: '(approx — full prism)',
  difficulty_label: 'Difficulty:',
  difficulty_easy: 'easy',
  difficulty_medium: 'medium',
  difficulty_hard: 'hard',
  random_challenge: 'Random Challenge',
  // Full sentences rather than "…of this " + shape: word order is not
  // universal, and a trailing-fragment concat cannot be translated.
  challenge_prompt_rect: 'What is the volume of this rectangular prism?',
  challenge_prompt_lblock: 'What is the volume of this L-block?',
  check: 'Check',
  feedback_correct_rect: 'Correct! {l} × {w} × {h} = {answer} cubic units',
  feedback_correct_lblock: 'Correct! ({l}×{w}×{h}) − ({nl}×{nw}×{nh}) = {answer} cubic units',
  feedback_wrong_rect: 'Not quite. Try V = L × W × H',
  feedback_wrong_lblock: 'Not quite. Try V = (L × W × H) − notch',
};

const raw = fs.readFileSync(FILE, 'utf8');

// Validate BEFORE touching anything.
let before;
try {
  before = JSON.parse(raw);
} catch (err) {
  console.error('[abort] ui_strings.js does not parse as JSON:', err.message);
  process.exit(2);
}
if (!before[NS] || typeof before[NS] !== 'object') {
  console.error('[abort] namespace "' + NS + '" is missing or not an object');
  process.exit(2);
}

const clash = Object.keys(ADDITIONS).filter((k) => before[NS][k] !== undefined);
if (clash.length) {
  console.error('[abort] these keys already exist (already applied?): ' + clash.join(', '));
  process.exit(1);
}

const occurrences = raw.split(ANCHOR).length - 1;
if (occurrences !== 1) {
  console.error('[abort] anchor matched ' + occurrences + ' times, expected exactly 1');
  process.exit(2);
}

const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = Object.entries(ADDITIONS)
  .map(([k, v]) => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(v))
  .join(',' + EOL);
const replacement = ANCHOR + ',' + EOL + lines;
const next = raw.replace(ANCHOR, replacement);

// Validate AFTER, before writing.
let after;
try {
  after = JSON.parse(next);
} catch (err) {
  console.error('[abort] result would not parse as JSON:', err.message);
  process.exit(2);
}
const added = Object.keys(after[NS]).length - Object.keys(before[NS]).length;
const expected = Object.keys(ADDITIONS).length;
if (added !== expected) {
  console.error('[abort] added ' + added + ' keys, expected ' + expected);
  process.exit(2);
}
for (const [k, v] of Object.entries(ADDITIONS)) {
  if (after[NS][k] !== v) {
    console.error('[abort] round-trip mismatch on ' + NS + '.' + k);
    process.exit(2);
  }
}
// Nothing outside the namespace may change.
const beforeOther = { ...before, [NS]: null };
const afterOther = { ...after, [NS]: null };
if (JSON.stringify(beforeOther) !== JSON.stringify(afterOther)) {
  console.error('[abort] content outside "' + NS + '" changed');
  process.exit(2);
}

if (process.argv.includes('--apply')) {
  fs.writeFileSync(FILE, next, 'utf8');
  console.log('[applied] +' + expected + ' keys to ' + NS + ' (' + Object.keys(after[NS]).length + ' total)');
} else {
  console.log('[dry-run] would add ' + expected + ' keys to ' + NS +
    ' (' + Object.keys(before[NS]).length + ' -> ' + Object.keys(after[NS]).length + '). Re-run with --apply.');
}

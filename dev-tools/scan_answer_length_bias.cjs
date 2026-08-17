#!/usr/bin/env node
// Answer-LENGTH-bias sweep over the test_prep credential banks.
//
//   node dev-tools/scan_answer_length_bias.cjs            # report
//   node dev-tools/scan_answer_length_bias.cjs --check    # ratchet (exit 1 if worse)
//   node dev-tools/scan_answer_length_bias.cjs --update   # rewrite the baseline
//
// WHY THIS EXISTS, given scan_answer_position_bias.cjs already ships.
//
// That scanner asks WHERE the key sits and the credential banks are clean on it:
// every one of the 22 packs is at exactly 25% answer-at-B, because the position
// work already landed. But position is only half of what makes an item guessable.
// The other half is SHAPE, and nothing measured it: across 11,000 shipped items
// 44.1% have the key as the longest of the four options, against 25% by chance.
//
// A learner who knows nothing about audiology and always picks the longest option
// scores 55% on Audiology 5343 and 67% on ParaPro. That is a test-wiseness tell,
// not knowledge, and it is worst in the packs with the most genuine authoring —
// which is the whole trap. A carefully written key gets qualified ("...permits
// pressure release within the nearly incompressible cochlear fluids") while the
// distractors stay curt, so care itself leaks the answer. It cannot be fixed by
// being more careful; it has to be measured.
//
// Reports only, or ratchets. Never edits a pack.
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const baselinePath = path.join(root, 'tests', 'fixtures', 'test_prep_answer_length_baseline.json');
const CHANCE = 0.25;
const FLAG_RATE = 0.40;
// Packs move by whole items, so a ratchet with no slack turns one reworded
// option into a red gate. One item in 500 is 0.2%; allow half a point.
const TOLERANCE = 0.005;

function packFiles() {
  return fs.readdirSync(sourceDir)
    .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'))
    .sort();
}

function measure(pack) {
  const items = (pack.items || []).filter((item) =>
    Array.isArray(item.choices) && item.choices.length === 4 && Number.isInteger(item.answerIndex));
  let longest = 0;
  let strictlyLongest = 0;
  let shortest = 0;
  let margin = 0;
  for (const item of items) {
    const lengths = item.choices.map((choice) => String(choice || '').length);
    const key = lengths[item.answerIndex];
    const others = lengths.filter((_, index) => index !== item.answerIndex);
    const maxOther = Math.max(...others);
    if (key >= maxOther) longest += 1;
    if (key > maxOther) strictlyLongest += 1;
    if (key <= Math.min(...others)) shortest += 1;
    margin += key - (others.reduce((sum, value) => sum + value, 0) / others.length);
  }
  const total = items.length || 1;
  return {
    items: items.length,
    longest,
    strictlyLongest,
    shortest,
    rate: longest / total,
    // Mean characters by which the key exceeds the average distractor. Reported
    // because a bank can sit near chance on the count and still telegraph the
    // key by always being a little fuller.
    meanMargin: margin / total,
  };
}

function collect() {
  const rows = [];
  for (const file of packFiles()) {
    const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
    rows.push(Object.assign({ pack: file.replace('_pack.json', '') }, measure(pack)));
  }
  return rows;
}

const rows = collect();
const totalItems = rows.reduce((sum, row) => sum + row.items, 0);
const totalLongest = rows.reduce((sum, row) => sum + row.longest, 0);
const corpusRate = totalItems ? totalLongest / totalItems : 0;

const args = process.argv.slice(2);

if (args.includes('--update')) {
  const payload = {
    note: 'Answer-length-bias ratchet. Rates may fall, never rise. Chance is 0.25. '
      + 'Regenerate with dev-tools/scan_answer_length_bias.cjs --update after deliberate item work.',
    corpusRate: Number(corpusRate.toFixed(4)),
    packs: Object.fromEntries(rows.map((row) => [row.pack, Number(row.rate.toFixed(4))])),
  };
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('Wrote answer-length baseline: corpus ' + (100 * corpusRate).toFixed(1) + '%');
  process.exit(0);
}

const sorted = rows.slice().sort((a, b) => b.rate - a.rate);
console.log('pack'.padEnd(46), 'items'.padStart(6), 'key=longest'.padStart(12), 'rate'.padStart(7),
  'key=shortest'.padStart(13), 'margin'.padStart(8), '  flag');
console.log('-'.repeat(104));
for (const row of sorted) {
  console.log(
    row.pack.padEnd(46),
    String(row.items).padStart(6),
    String(row.longest).padStart(12),
    ((100 * row.rate).toFixed(1) + '%').padStart(7),
    String(row.shortest).padStart(13),
    (row.meanMargin >= 0 ? '+' : '') + row.meanMargin.toFixed(1),
    row.rate >= FLAG_RATE ? '  *** LENGTH TELL ***' : '',
  );
}
console.log('\ncorpus: ' + totalLongest + '/' + totalItems + ' = ' + (100 * corpusRate).toFixed(1)
  + '% key-is-longest (chance ' + (100 * CHANCE).toFixed(0) + '%); '
  + rows.filter((row) => row.rate >= FLAG_RATE).length + ' of ' + rows.length + ' packs at or above '
  + (100 * FLAG_RATE).toFixed(0) + '%');

if (!args.includes('--check')) process.exit(0);

if (!fs.existsSync(baselinePath)) {
  console.error('\nNo baseline. Run with --update once to record the current state.');
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const regressions = [];
for (const row of rows) {
  const previous = baseline.packs[row.pack];
  if (previous === undefined) {
    regressions.push(row.pack + ': not in baseline (new pack — run --update deliberately)');
  } else if (row.rate > previous + TOLERANCE) {
    regressions.push(row.pack + ': ' + (100 * previous).toFixed(1) + '% -> ' + (100 * row.rate).toFixed(1) + '%');
  }
}
if (regressions.length) {
  console.error('\nAnswer-length bias got WORSE in ' + regressions.length + ' pack(s):');
  for (const entry of regressions) console.error('  ' + entry);
  console.error('\nNew items must not make the key the longest option. Rewrite the distractors to '
    + 'match the key in length and specificity, then re-run.');
  process.exit(1);
}
console.log('\nRatchet OK: no pack regressed beyond ' + (100 * TOLERANCE).toFixed(1) + '%.');

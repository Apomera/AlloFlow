#!/usr/bin/env node
// Within-bank duplication sweep over the non-EPPP credential SOURCE banks.
//
//   node dev-tools/scan_source_bank_duplication.cjs            # report
//   node dev-tools/scan_source_bank_duplication.cjs --check    # ratchet (exit 1 if worse)
//   node dev-tools/scan_source_bank_duplication.cjs --update   # rewrite the baseline
//
// WHY THIS EXISTS.
//
// authored_batch_originality_checks.cjs catches templated generation, and it
// works: it flags all 45 staged filler batches and none of the registered ones.
// But the apply pipeline only ever hands it `pack.items.slice(200, 200+n)` --
// the ASSISTANT-AUTHORED range. The 200 SOURCE items ahead of that range are
// never shown to it, and nothing else looks at them either.
//
// Pointing the same check at source bank 1 finds shipped content with the exact
// pathology the gate was built for. school_librarian_5312 is 25 topics crossed
// with 4 prompt frames:
//
//   [0] A school librarian is reviewing needs assessment after noticing uneven
//       learner outcomes. Which action is most defensible?
//   [1] During collaborative planning, a team disagrees about needs assessment.
//       What should the school librarian recommend first?
//   [2] A principal asks for an evidence-based approach to needs assessment.
//       Which response best reflects beginning-practice standards?
//   [3] A library program audit identifies a weakness involving needs assessment.
//       Which improvement is most appropriate?
//
// All four carry the SAME key, the SAME distractors and the SAME rationale. A
// learner working through that 100-question bank meets each answer set four
// times in one sitting. Both source banks are 26 distinct kernels per 100 items.
//
// This is invisible to every existing measure. The pack-level counter
// (`distinctSourceContentKernels`) treats it as `parallelSourceVariants`, which
// is the same bucket used for the legitimate design in the other 21 packs where
// bank 2 is a parallel form of bank 1. Across banks that is a retest form and a
// learner never sees both in one sitting; WITHIN a bank it is a defect. Those
// two are worth separating, so this measures per bank, not per pack.
//
// GUIDED banks are excluded deliberately: expand_test_prep_packs_to_500.cjs
// derives them from the source items on purpose, so kernel reuse there is the
// feature, not the bug.
//
// Ratcheted rather than absolute: this is pre-existing shipped content and a
// hard cap would fail the build for three packs today. Rates may fall, never
// rise, and a pack with no recorded entry is held to the real limits.
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const baselinePath = path.join(root, 'tests', 'fixtures', 'test_prep_source_duplication_baseline.json');
const { contentKernel } = require('./apply_test_prep_independent_additions.cjs');
const { topFrame } = require('./authored_batch_originality_checks.cjs');
const { canonical } = require('./non_eppp_warning_checks.cjs');

// CROSS-PACK reuse, measured with the reviewer's own `responseKernel`: the four
// choices canonicalised and sorted, ignoring prompt, rationale and references.
//
// Every other measure here is per pack, and that is a blind spot. `contentKernel`
// includes the rationale, which is written per credential, so it reports ZERO
// cross-pack sharing. The reviewer counts 324 shared response kernels as a
// warning that never fails the build, and does not report how many items that
// touches. It is 2,179 - roughly 41% of the independent practice items in the
// corpus.
//
// The worst single answer set appears 12 times across SIX separately-purchasable
// special-education credentials, always keyed at index 0, with only the prompt
// reworded per pack:
//
//   [0] Development follows broad patterns, but individual variation requires
//       information from multiple sources and settings before conclusions are drawn.
//   [1] Any difference from a class average proves a disability.
//   ...
//
// A candidate who buys 5383 and 5372 meets the identical item.
function responseKernel(item) {
  return JSON.stringify((item.choices || []).map(canonical).sort());
}

// AUTHORING SCAFFOLDING LEAKED INTO LEARNER-FACING PROMPTS.
//
// The PLT packs are built as grade-band parallel forms: PLT K-6 and PLT 5-9
// share an answer set on 198 of 200 items, with zero identical prompts. That
// design is arguable on its own. What is not arguable is how the parallel item
// announces itself:
//
//   "In a parallel secondary setting, students interpret a new history topic
//    only through an inaccurate prior idea. What should the teacher do first?"
//   "In a parallel school, during collaborative planning, a team disagrees
//    about needs assessment..."
//   "A beginning early-childhood teacher reviews this parallel content problem:
//    What is 3/4 + 2/3?"
//
// No exam item is phrased that way. This is the authoring process showing
// through into text a candidate reads, and it also tells the candidate the item
// is a transplant whose answer is generic. Guided banks inherit it from their
// source items, so the exposure is double the scored-bank count.
const SCAFFOLD_PATTERNS = [
  /^In a parallel /i,
  /^For a parallel /i,
  /\bparallel (?:middle-grades|elementary|secondary|early-childhood|content|setting|scenario|context|item|problem|version)\b/i,
  /^A beginning [a-z-]+ (?:teacher|educator|librarian|counselor) reviews this parallel/i,
];

function scaffoldPromptCount(items) {
  return items.filter((item) => SCAFFOLD_PATTERNS.some((pattern) => pattern.test(String(item.prompt || '')))).length;
}

// A learner should not meet the same answer set twice in one bank. Zero is the
// only defensible target, so any duplicate is a finding.
const MAX_WITHIN_BANK_DUPLICATES = 0;
// Same 20% frame limit the authored gate uses, calibrated the same way: the
// healthy source banks sit at 1-13%, the templated ones at 26-30%.
const MAX_FRAME_SHARE = 0.20;
const TOLERANCE = 0.005;

// EPPP is included as of 2026-08-17. It passes both measures cleanly (1,500
// items, zero within-bank duplicate kernels, 2% top prompt frame), but its
// duplication is SEMANTIC and therefore invisible here: two items can key the
// same fact with the same distractor set and differ only in a reworded
// rationale. That layer is tracked separately in
// eppp_distractor_quality_diagnostics.json. Covering EPPP here still matters,
// because it stops the exact-duplicate floor from silently dropping.
function packFiles() {
  return fs.readdirSync(sourceDir)
    .filter((name) => name.endsWith('_pack.json'))
    .sort();
}

function measure(pack) {
  const items = Array.isArray(pack.items) ? pack.items : [];
  const guided = Math.max(0, Number(pack.guidedReviewItems) || 0);
  const scored = items.slice(0, items.length - guided);
  const size = Math.max(1, Number(pack.batchSize) || 100);
  let duplicateItems = 0;
  let worstGroup = 0;
  let frameShare = 0;
  let distinct = 0;
  for (let start = 0; start < scored.length; start += size) {
    const bank = scored.slice(start, start + size);
    if (!bank.length) continue;
    const groups = new Map();
    for (const item of bank) {
      const kernel = contentKernel(item);
      groups.set(kernel, (groups.get(kernel) || 0) + 1);
    }
    distinct += groups.size;
    for (const count of groups.values()) {
      if (count > 1) { duplicateItems += count; worstGroup = Math.max(worstGroup, count); }
    }
    frameShare = Math.max(frameShare, topFrame(bank, (item) => item.prompt).share);
  }
  return {
    scaffoldPrompts: scaffoldPromptCount(items),
    scaffoldScored: scaffoldPromptCount(scored),
    scoredItems: scored.length,
    distinct,
    duplicateItems,
    worstGroup,
    frameShare,
    duplicateRate: scored.length ? duplicateItems / scored.length : 0,
  };
}

const rows = [];
const responseIndex = new Map();
for (const file of packFiles()) {
  const stem = file.replace('_pack.json', '');
  const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
  rows.push(Object.assign({ pack: stem }, measure(pack)));
  const guided = Math.max(0, Number(pack.guidedReviewItems) || 0);
  for (const item of pack.items.slice(0, pack.items.length - guided)) {
    if (!Array.isArray(item.choices) || !item.choices.length) continue;
    const key = responseKernel(item);
    if (!responseIndex.has(key)) responseIndex.set(key, []);
    responseIndex.get(key).push(stem);
  }
}
// A pack's score is how many of its own items share an answer set with an item
// in a DIFFERENT pack.
const crossPackItemsByStem = new Map();
let crossPackKernels = 0;
for (const stems of responseIndex.values()) {
  if (new Set(stems).size < 2) continue;
  crossPackKernels += 1;
  for (const stem of stems) crossPackItemsByStem.set(stem, (crossPackItemsByStem.get(stem) || 0) + 1);
}
for (const row of rows) row.crossPackItems = crossPackItemsByStem.get(row.pack) || 0;

const args = process.argv.slice(2);

if (args.includes('--update')) {
  const payload = {
    note: 'Within-bank duplication ratchet for non-EPPP source banks. Rates may fall, never rise. '
      + 'duplicateRate is the share of non-guided items sitting in a same-bank duplicate-kernel group; '
      + 'frameShare is the largest single 8-word prompt frame in any one bank. Guided banks are excluded '
      + 'because they are derived from source items by design. Regenerate with '
      + 'dev-tools/scan_source_bank_duplication.cjs --update after deliberate item work.',
    packs: Object.fromEntries(rows.map((row) => [row.pack, {
      duplicateRate: Number(row.duplicateRate.toFixed(4)),
      frameShare: Number(row.frameShare.toFixed(4)),
      crossPackItems: row.crossPackItems,
      scaffoldPrompts: row.scaffoldPrompts,
    }])),
  };
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('Wrote source-duplication baseline for ' + rows.length + ' packs');
  process.exit(0);
}

const sorted = rows.slice().sort((a, b) => b.duplicateRate - a.duplicateRate || b.frameShare - a.frameShare);
console.log('pack'.padEnd(48), 'scored'.padStart(7), 'distinct'.padStart(9), 'dup items'.padStart(10),
  'worst'.padStart(6), 'frame'.padStart(7), 'x-pack'.padStart(7), 'scaffold'.padStart(9), '  flag');
console.log('-'.repeat(104));
for (const row of sorted) {
  const flags = [];
  if (row.duplicateItems > MAX_WITHIN_BANK_DUPLICATES) flags.push('DUPLICATE KERNELS IN BANK');
  if (row.frameShare > MAX_FRAME_SHARE) flags.push('TEMPLATED PROMPTS');
  if (row.scaffoldPrompts) flags.push('SCAFFOLDING IN PROMPTS');
  console.log(
    row.pack.padEnd(48),
    String(row.scoredItems).padStart(7),
    String(row.distinct).padStart(9),
    String(row.duplicateItems).padStart(10),
    String(row.worstGroup || 0).padStart(6),
    ((100 * row.frameShare).toFixed(0) + '%').padStart(7),
    String(row.crossPackItems).padStart(7),
    String(row.scaffoldPrompts).padStart(9),
    flags.length ? '  *** ' + flags.join(' + ') + ' ***' : '',
  );
}

if (!args.includes('--check')) process.exit(0);

if (!fs.existsSync(baselinePath)) {
  console.error('\nNo baseline. Run with --update once to record the current state.');
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const regressions = [];
for (const row of rows) {
  const previous = baseline.packs[row.pack];
  if (!previous) {
    // A brand-new pack gets the real limits, not an inherited exemption.
    if (row.duplicateItems > MAX_WITHIN_BANK_DUPLICATES) {
      regressions.push(row.pack + ': not in baseline and ships ' + row.duplicateItems
        + ' items in same-bank duplicate groups');
    }
    if (row.frameShare > MAX_FRAME_SHARE) {
      regressions.push(row.pack + ': not in baseline and its prompts are templated ('
        + (100 * row.frameShare).toFixed(0) + '%)');
    }
    continue;
  }
  if (row.duplicateRate > previous.duplicateRate + TOLERANCE) {
    regressions.push(row.pack + ': within-bank duplicates ' + (100 * previous.duplicateRate).toFixed(1)
      + '% -> ' + (100 * row.duplicateRate).toFixed(1) + '%');
  }
  if (previous.crossPackItems !== undefined && row.crossPackItems > previous.crossPackItems) {
    regressions.push(row.pack + ': items sharing an answer set with another pack '
      + previous.crossPackItems + ' -> ' + row.crossPackItems);
  }
  if (previous.scaffoldPrompts !== undefined && row.scaffoldPrompts > previous.scaffoldPrompts) {
    regressions.push(row.pack + ': prompts carrying authoring scaffolding '
      + previous.scaffoldPrompts + ' -> ' + row.scaffoldPrompts);
  }
  if (row.frameShare > previous.frameShare + TOLERANCE) {
    regressions.push(row.pack + ': prompt templating ' + (100 * previous.frameShare).toFixed(1)
      + '% -> ' + (100 * row.frameShare).toFixed(1) + '%');
  }
}
if (regressions.length) {
  console.error('\nSource-bank duplication got WORSE in ' + regressions.length + ' place(s):');
  for (const entry of regressions) console.error('  ' + entry);
  console.error('\nTwo items in one bank must not share an answer set, and prompts must not come from '
    + 'a shared frame. Vary the key, distractors and rationale, not just the prompt wording.');
  process.exit(1);
}
console.log('\nRatchet OK: no source bank regressed beyond ' + (100 * TOLERANCE).toFixed(1) + '%.');

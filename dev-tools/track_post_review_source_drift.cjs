#!/usr/bin/env node
// Per-item record of which SOURCE items have changed since the automated review.
//
//   node dev-tools/track_post_review_source_drift.cjs --snapshot   # capture the as-reviewed state (once)
//   node dev-tools/track_post_review_source_drift.cjs              # list what has changed since
//   node dev-tools/track_post_review_source_drift.cjs --json       # same, machine-readable
//
// WHY THIS EXISTS.
//
// `dev-tools/authored/non_eppp_eppp_guided_qa_group_[a-c].review.json` binds each
// pack's first 200 source items by sha256. Editing any source item breaks that
// binding and the reviewer emits a hard finding, which made source content look
// frozen. It is not, and the reason matters:
//
//   reviewer:    "OpenAI Codex independent EPPP-guided review"
//   limitations: "semantic key/content adjudication was risk-based and manually
//                 covered 58 independent items rather than every one of the 1,700
//                 independent keys"
//                "Key-length, lexical-overlap, prompt-length, and distractor-
//                 extremity counts are screening heuristics. They prioritize
//                 editing and do not by themselves prove that a key is wrong."
//
// That is an automated review with honestly declared limits, not a licensed
// expert sign-off. The product says the same thing to learners: "Independent
// professional and psychometric validation is separate" and "Expert validation is
// in progress." So the binding is an internal consistency check - "this artifact
// was checked in exactly this state" - and the correct response to a deliberate
// edit is to RENEW it, not to avoid editing. Renewing is already supported by
// freeze_non_eppp_group_review_artifact_bindings.cjs, behind an explicit
// --confirm-current-independent-review flag.
//
// The one thing renewal loses is history. The freeze tool recomputes the hashes
// and keeps `reviewedAt: 2026-07-18`, so after a few rounds of editing there is
// no way to tell which items the automated review actually saw and which were
// written afterwards. When a human expert becomes available - which may be many
// months out - that distinction is exactly what they need in order to know where
// to look.
//
// So this records it. Snapshot the per-item digests while the bindings still
// match, then every later edit is diffable against that baseline. Re-binding
// stays honest because the drift list, not the sha256, carries the history.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const authoredDir = path.join(__dirname, 'authored');
const snapshotPath = path.join(sourceDir, 'reviewed_source_item_digests.json');
const SOURCE_ITEM_COUNT = 200;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function packStems() {
  return fs.readdirSync(sourceDir)
    .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'))
    .map((name) => name.replace('_pack.json', ''))
    .sort();
}

function sourceItems(stem) {
  const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, stem + '_pack.json'), 'utf8'));
  return pack.items.slice(0, SOURCE_ITEM_COUNT);
}

// The binding each group review carries for a stem, if any.
function reviewBindings() {
  const bindings = new Map();
  for (const name of fs.readdirSync(authoredDir).filter((f) => /^non_eppp_eppp_guided_qa_group_[a-c]\.review\.json$/i.test(f))) {
    const evidence = JSON.parse(fs.readFileSync(path.join(authoredDir, name), 'utf8'));
    for (const binding of evidence.artifactBindings || []) {
      bindings.set(binding.stem, { file: name, sha256: binding.sourceItemsSha256, reviewedAt: binding.reviewedAt });
    }
  }
  return bindings;
}

const args = process.argv.slice(2);

if (args.includes('--snapshot')) {
  // The obvious guard - "refuse if the bindings have drifted" - does not work,
  // and this was caught by testing it rather than by reading it. Renewing the
  // group binding makes the bindings match again BY CONSTRUCTION, so once
  // re-binding is part of the workflow that check passes every time and a
  // re-snapshot silently records edited items as reviewed. Exactly what
  // happened on the first attempt.
  //
  // The baseline is therefore WRITE-ONCE. It records what the automated review
  // saw, which is a fact about the past and cannot be improved by re-running.
  // Overwriting it needs a deliberate flag and destroys the expert's worklist.
  if (fs.existsSync(snapshotPath) && !args.includes('--force-rebaseline')) {
    const existing = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    console.error('A baseline already exists, captured ' + existing.capturedAt + '.');
    console.error('It records what the automated review saw. Re-capturing would erase the record of');
    console.error('every post-review edit, which is the one thing a future expert needs.');
    console.error('\nPass --force-rebaseline only when a genuinely new review has been completed.');
    process.exit(1);
  }
  const bindings = reviewBindings();
  const drifted = [];
  for (const [stem, binding] of bindings) {
    if (sha256(JSON.stringify(sourceItems(stem))) !== binding.sha256) drifted.push(stem);
  }
  if (drifted.length && !args.includes('--force-rebaseline')) {
    console.error('Refusing to snapshot: these packs have already drifted from their review binding:');
    for (const stem of drifted) console.error('  ' + stem);
    process.exit(1);
  }
  const packs = {};
  for (const stem of packStems()) {
    const items = sourceItems(stem);
    packs[stem] = {
      binding: bindings.get(stem)?.sha256 || null,
      reviewedAt: bindings.get(stem)?.reviewedAt || null,
      items: Object.fromEntries(items.map((item) => [item.id, sha256(JSON.stringify(item))])),
    };
  }
  const payload = {
    note: 'Per-item sha256 of each pack\'s 200 SOURCE items, captured while every group-review '
      + 'binding still matched. This is the record of what the automated review actually saw. '
      + 'Editing source items and renewing the binding is supported and expected; this file is what '
      + 'keeps the renewal honest, by making post-review edits enumerable for a human expert later. '
      + 'Regenerate ONLY via --snapshot, which refuses to run once anything has drifted.',
    capturedAt: '2026-08-17',
    reviewer: 'OpenAI Codex independent EPPP-guided review',
    reviewScope: 'automated, with declared limits; not a licensed-expert or psychometric validation',
    packs,
  };
  fs.writeFileSync(snapshotPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const total = Object.values(packs).reduce((sum, entry) => sum + Object.keys(entry.items).length, 0);
  console.log('Captured ' + total + ' source-item digests across ' + Object.keys(packs).length + ' packs.');
  process.exit(0);
}

if (!fs.existsSync(snapshotPath)) {
  console.error('No snapshot yet. Run with --snapshot while the review bindings still match.');
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const report = [];
for (const stem of packStems()) {
  const recorded = snapshot.packs[stem];
  if (!recorded) { report.push({ stem, added: [], changed: [], removed: [], unrecorded: true }); continue; }
  const items = sourceItems(stem);
  const currentById = new Map(items.map((item) => [item.id, sha256(JSON.stringify(item))]));
  const changed = [];
  const added = [];
  for (const [id, digest] of currentById) {
    if (!(id in recorded.items)) added.push(id);
    else if (recorded.items[id] !== digest) changed.push(id);
  }
  const removed = Object.keys(recorded.items).filter((id) => !currentById.has(id));
  if (changed.length || added.length || removed.length) report.push({ stem, changed, added, removed });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ capturedAt: snapshot.capturedAt, packs: report }, null, 2));
  process.exit(0);
}

const totalChanged = report.reduce((sum, row) => sum + row.changed.length + row.added.length + row.removed.length, 0);
if (!totalChanged) {
  console.log('No source item has changed since the automated review of ' + snapshot.capturedAt + '.');
  process.exit(0);
}
console.log('Source items changed since the automated review (' + snapshot.capturedAt + '):\n');
for (const row of report) {
  console.log(row.stem);
  if (row.changed.length) console.log('   edited  (' + row.changed.length + '): ' + row.changed.slice(0, 12).join(', ') + (row.changed.length > 12 ? ', ...' : ''));
  if (row.added.length) console.log('   added   (' + row.added.length + '): ' + row.added.slice(0, 12).join(', '));
  if (row.removed.length) console.log('   removed (' + row.removed.length + '): ' + row.removed.slice(0, 12).join(', '));
}
console.log('\n' + totalChanged + ' item(s) differ from what the automated review saw.');
console.log('This is the worklist for a human expert. It does not block anything.');

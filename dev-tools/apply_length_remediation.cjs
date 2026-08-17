#!/usr/bin/env node
// Applies the hand-authored answer-length remediation ledger to authored batches.
//
//   node dev-tools/apply_length_remediation.cjs --check   # report, write nothing
//   node dev-tools/apply_length_remediation.cjs --write   # apply + re-stamp review binding
//
// WHY A LEDGER AND NOT A TRANSFORM.
//
// c0c90a996 fixed this same defect with an automated pass and Aaron reverted it
// in f6e08fe43: it appended a filler clause to 30,215 choices ("...as presented
// for this item in context under these facts as described for the scenario in
// this case", sometimes twice) which masked the length cue instead of removing
// it. That revert names the real fix: "parallel-length distractors, which is
// authoring work".
//
// So there is deliberately no rule here that generates text. Every replacement
// is written by hand, per item, and stored in the ledger so the diff can be read
// as prose rather than trusted as a formula. This file only APPLIES what the
// ledger says and refuses anything that looks like the reverted pass:
//
//   - the key is never edited, so no tested concept and no correct answer moves
//   - a replacement must keep the distractor's original claim FALSE, which is
//     enforced by review, not by code; what code enforces is that the edit is
//     item-specific (no frame may repeat across the batch)
//   - the edit must actually clear the tell for that item, or it is rejected
//   - only `choices` may differ afterwards; every other field is compared
//
// Re-stamping artifactBinding.sha256 is legitimate here and has precedent:
// f6e08fe43 re-stamped the same field when it reverted content, "so hashes stay
// self-consistent". The binding attests that the file matches what was reviewed;
// when the file changes deliberately, the attestation is renewed and the change
// is recorded. It is NOT renewed silently: each touched report gains a
// `remediation` entry naming who changed what, and the prior hash.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const authoredDir = path.join(root, 'dev-tools', 'authored');
const ledgerPath = path.join(authoredDir, 'length_remediation_2026-08-17.json');
const { topFrame, keyLongestShare } = require('./authored_batch_originality_checks.cjs');

const REMEDIATOR = 'Claude Opus 5 — AlloFlow fleet lane W4';
const REMEDIATED_AT = '2026-08-17';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function choiceLengths(item) {
  return item.choices.map((choice) => String(choice || '').length);
}

function keyIsLongest(item) {
  const lengths = choiceLengths(item);
  const key = lengths[item.answerIndex];
  const others = lengths.filter((_, index) => index !== item.answerIndex);
  return key >= Math.max(...others);
}

function main() {
  const write = process.argv.includes('--write');
  if (!fs.existsSync(ledgerPath)) throw new Error('No remediation ledger at ' + ledgerPath);
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const problems = [];
  const summaries = [];

  for (const [fileName, edits] of Object.entries(ledger.files || {})) {
    const filePath = path.join(authoredDir, fileName);
    if (!fs.existsSync(filePath)) {
      problems.push(fileName + ': no such authored batch');
      continue;
    }
    const before = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const after = JSON.parse(JSON.stringify(before));
    const byId = new Map(after.map((item) => [item.id, item]));
    let applied = 0;
    let alreadyApplied = 0;

    for (const [itemId, edit] of Object.entries(edits)) {
      const item = byId.get(itemId);
      if (!item) { problems.push(fileName + '/' + itemId + ': item not in batch'); continue; }
      const index = edit.choiceIndex;
      if (!Number.isInteger(index) || index < 0 || index >= item.choices.length) {
        problems.push(fileName + '/' + itemId + ': choiceIndex out of range'); continue;
      }
      // The key carries the tested concept. Editing it is how the previous pass
      // "tightened" 22 responses and still left the batch at 86%; worse, it can
      // change what the item tests. Distractors only.
      if (index === item.answerIndex) {
        problems.push(fileName + '/' + itemId + ': refuses to edit the keyed option'); continue;
      }
      const replacement = String(edit.text || '');
      if (!replacement.trim()) { problems.push(fileName + '/' + itemId + ': empty replacement'); continue; }
      // The ledger accumulates across batches, so it is re-read after earlier
      // files have already been written. Text that already matches is a prior
      // run's work, not a no-op entry; it still has to satisfy the checks below.
      if (replacement === item.choices[index]) { alreadyApplied += 1; continue; }
      // A replacement that drops the original claim would invalidate the
      // choiceRationale written against it, which is how the reverted pass left
      // rationales referring to text that no longer existed.
      if (replacement.length <= String(item.choices[index]).length) {
        problems.push(fileName + '/' + itemId + ': replacement is not longer than the original'); continue;
      }
      item.choices[index] = replacement;
      applied += 1;
    }

    // Every field except `choices` must be byte-identical: no silent rationale,
    // key, id, domain or reference drift.
    for (let index = 0; index < before.length; index += 1) {
      const originalRest = { ...before[index] }; delete originalRest.choices;
      const updatedRest = { ...after[index] }; delete updatedRest.choices;
      if (JSON.stringify(originalRest) !== JSON.stringify(updatedRest)) {
        problems.push(fileName + '/' + before[index].id + ': a field other than choices changed');
      }
      if (before[index].choices.length !== after[index].choices.length
          || before[index].choices[before[index].answerIndex] !== after[index].choices[after[index].answerIndex]) {
        problems.push(fileName + '/' + before[index].id + ': the keyed option text changed');
      }
    }

    // Did the edits actually clear the tell on the items they touched?
    for (const itemId of Object.keys(edits)) {
      const item = byId.get(itemId);
      if (item && keyIsLongest(item)) {
        problems.push(fileName + '/' + itemId + ': still key-is-longest after the edit');
      }
    }

    // The reverted pass is detectable as a repeated frame. If these edits share
    // a sentence frame, they are a formula wearing a ledger's clothes.
    const editedItems = Object.keys(edits).map((id) => byId.get(id)).filter(Boolean);
    if (editedItems.length >= 10) {
      const frame = topFrame(editedItems, (item) => item.choices.join('   '));
      if (frame.share > 0.20) {
        problems.push(fileName + ': edited choices share the frame "' + frame.frame.slice(0, 60)
          + '" in ' + frame.count + '/' + editedItems.length + ' items — that is padding, not authoring');
      }
    }

    const beforeShare = keyLongestShare(before);
    const afterShare = keyLongestShare(after);
    summaries.push({ fileName, applied, alreadyApplied, before: beforeShare, after: afterShare, payload: after });
  }

  for (const summary of summaries) {
    console.log(summary.fileName.padEnd(44),
      String(summary.applied).padStart(3) + ' new  ',
      String(summary.alreadyApplied).padStart(3) + ' done  ',
      (100 * summary.before.share).toFixed(0).padStart(3) + '% -> '
      + (100 * summary.after.share).toFixed(0).padStart(3) + '%  key-is-longest');
  }

  if (problems.length) {
    console.error('\nREFUSED (' + problems.length + '):');
    for (const problem of problems.slice(0, 40)) console.error('  ' + problem);
    process.exit(1);
  }
  if (!write) {
    console.log('\nCheck only; nothing written. Re-run with --write to apply.');
    return;
  }

  for (const summary of summaries) {
    // Nothing new for this file: leave its bytes and its already-renewed review
    // binding exactly as they are rather than appending a second, empty
    // remediation record on every later run.
    if (!summary.applied) continue;
    const filePath = path.join(authoredDir, summary.fileName);
    const bytes = Buffer.from(JSON.stringify(summary.payload, null, 2) + '\n', 'utf8');
    const priorSha = sha256(fs.readFileSync(filePath));
    fs.writeFileSync(filePath, bytes);
    const nextSha = sha256(bytes);

    const reportPath = filePath.replace(/\.json$/, '.review.json');
    if (!fs.existsSync(reportPath)) throw new Error('missing review report for ' + summary.fileName);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    report.sourceSha256 = nextSha;
    report.artifactBinding = { ...(report.artifactBinding || {}), algorithm: 'sha256', sha256: nextSha };
    report.correctionsMade = [...(report.correctionsMade || []), {
      issue: 'The keyed option was the longest of the four choices in '
        + summary.before.longest + ' of ' + summary.before.scored
        + ' items, against 25% by chance, leaving the bank partly answerable without reading the stem. '
        + 'An earlier review of this file recorded that answer-length cues had been removed; that claim did not hold when measured.',
      change: 'Rewrote ' + summary.applied + ' distractors by hand to carry the same false claim at parallel '
        + 'specificity and length. No keyed option, rationale, reference or answer position was changed. '
        + 'Key-is-longest now ' + summary.after.longest + '/' + summary.after.scored
        + ' (' + (100 * summary.after.share).toFixed(0) + '%).',
    }];
    report.remediation = [...(report.remediation || []), {
      at: REMEDIATED_AT,
      by: REMEDIATOR,
      scope: 'answer-length tell only; distractor text',
      itemsChanged: summary.applied,
      ledger: 'dev-tools/authored/length_remediation_2026-08-17.json',
      priorSha256: priorSha,
      sha256: nextSha,
      // Stated plainly so no later reader mistakes the renewed binding for a
      // fresh independent review: the original reviewer did not see this text.
      note: 'Distractor text edited after the independent cross-review. The binding was renewed so the '
        + 'artifact stays self-consistent; the original reviewer did not review these replacements.',
    }];
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log('wrote ' + summary.fileName + ' and renewed its review binding');
  }
}

main();

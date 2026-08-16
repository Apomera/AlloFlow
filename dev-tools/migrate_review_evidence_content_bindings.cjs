#!/usr/bin/env node
// migrate_review_evidence_content_bindings.cjs — one-time migration of the frozen
// independent-review evidence to content-scoped library bindings (W4 §10c).
//
// Why: stamp_learning_library_identity.cjs (2026-07-31) rewrites an identity
// envelope into every learning library on every release build, so the evidence's
// raw-bytes learningLibrarySha256 could never be current again — 22 permanently
// failing findings about content that never changed. The durable binding hashes
// the library WITH THE ENVELOPE REMOVED (libraryContentSha256 in the reviewer).
//
// Why this is stronger than freeze_...cjs --confirm-current-independent-review:
// that tool overwrites the binding with whatever is on disk and asks a human to
// vouch for it. This migration computes the new field FROM THE REVIEWED ARTIFACT
// ITSELF (the evidence-era bytes, recovered from git at EVIDENCE_REV) and then
// REQUIRES it to equal the projection of today's library. If any pack's
// instructional content ever actually diverged from what was reviewed, the
// assertion fails loudly and nothing is written. It cannot launder a real
// content change into a passing review.
//
// Usage: node dev-tools/migrate_review_evidence_content_bindings.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE_REV = 'aaf4196c4'; // W4 located this: the commit whose library bytes sha256-match the frozen evidence
const EVIDENCE_FILES = ['a', 'b', 'c'].map((g) => path.join(__dirname, 'authored', 'non_eppp_eppp_guided_qa_group_' + g + '.review.json'));
const DRY = process.argv.includes('--dry-run');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const LIBRARY_IDENTITY_ENVELOPE = ['generatedAt', 'version', 'packId', 'visibility'];
function contentHashOf(jsonText) {
  const content = JSON.parse(jsonText);
  for (const field of LIBRARY_IDENTITY_ENVELOPE) delete content[field];
  const sorted = {};
  for (const key of Object.keys(content).sort()) sorted[key] = content[key];
  return sha256(Buffer.from(JSON.stringify(sorted)));
}
const gitShow = (rev, file) => execFileSync('git', ['show', rev + ':' + file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

let migrated = 0;
for (const evidencePath of EVIDENCE_FILES) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  for (const binding of evidence.artifactBindings) {
    const rel = 'test_prep/' + binding.stem + '_learning_library.json';

    // 1. The recovered evidence-era bytes must match the frozen raw binding —
    //    proves we are projecting from exactly what the reviewer saw.
    const reviewedBytes = gitShow(EVIDENCE_REV, rel);
    const reviewedRaw = sha256(Buffer.from(reviewedBytes));
    if (reviewedRaw !== binding.learningLibrarySha256) {
      console.error('ABORT ' + binding.stem + ': ' + EVIDENCE_REV + ' bytes do not match the frozen binding (' + reviewedRaw.slice(0, 12) + ' vs ' + binding.learningLibrarySha256.slice(0, 12) + '). Wrong rev, or the evidence was reviewed against something else. Nothing written.');
      process.exit(1);
    }

    // 2. The content projection of the reviewed bytes must equal the content
    //    projection of today's library — the equivalence demonstration.
    const reviewedContent = contentHashOf(reviewedBytes);
    const todayContent = contentHashOf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    if (reviewedContent !== todayContent) {
      console.error('ABORT ' + binding.stem + ': instructional content differs from what was reviewed (' + reviewedContent.slice(0, 12) + ' vs ' + todayContent.slice(0, 12) + '). This is a REAL divergence; do not migrate it, re-review it. Nothing written.');
      process.exit(1);
    }

    binding.learningLibraryContentSha256 = reviewedContent;
    migrated++;
    console.log('  ok ' + binding.stem + '  content ' + reviewedContent.slice(0, 12) + '  (raw evidence-era ' + reviewedRaw.slice(0, 12) + ' verified)');
  }
  if (!DRY) fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  console.log((DRY ? '[dry-run] would write ' : 'wrote ') + path.basename(evidencePath));
}
console.log((DRY ? '[dry-run] ' : '') + migrated + ' binding(s) migrated across ' + EVIDENCE_FILES.length + ' evidence files. learningLibrarySha256 kept alongside for provenance.');

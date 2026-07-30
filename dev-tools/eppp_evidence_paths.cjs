#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const provenanceRoot = path.join(workspaceRoot, 'quality', 'eppp_provenance');
const evidenceRoot = path.join(provenanceRoot, 'evidence');

const familyFiles = Object.freeze({
  audit: Object.freeze([
    'content_audit.json',
    'content_audit.md',
    'content_inventory.json',
    'content_inventory.md',
  ]),
  curation: Object.freeze([
    'curation_500.json',
    'curation_500.md',
    'curation_1000.json',
    'curation_1000.md',
    'curation_1500.json',
    'curation_1500.md',
  ]),
  adjudication: Object.freeze([
    ...Array.from({ length: 7 }, (_, index) => {
      const suffix = String(index + 1).padStart(2, '0');
      return [`adjudication_batch_${suffix}.json`, `adjudication_batch_${suffix}.md`];
    }).flat(),
    'adjudication_index.json',
    'adjudication_index.md',
  ]),
  review: Object.freeze([
    'bulk_review_wave_01.json',
    'bulk_review_wave_01.md',
    ...Array.from({ length: 5 }, (_, index) => {
      const suffix = String(index + 1).padStart(2, '0');
      return [`bulk_review_wave_01_set_${suffix}.json`, `bulk_review_wave_01_set_${suffix}.md`];
    }).flat(),
    'next_review_docket.json',
    'next_review_docket.md',
    'review_ledger.json',
    'review_ledger.md',
    'review_progress.json',
    'review_progress.md',
  ]),
});

const artifacts = Object.freeze(
  Object.entries(familyFiles)
    .flatMap(([family, files]) => files.map((file) => Object.freeze({ family, file })))
    .sort((left, right) => left.family.localeCompare(right.family) || left.file.localeCompare(right.file)),
);

function assertFamily(family) {
  if (!Object.prototype.hasOwnProperty.call(familyFiles, family)) {
    throw new Error(`Unknown EPPP evidence family: ${family}`);
  }
}

function familyRoot(family) {
  assertFamily(family);
  return path.join(evidenceRoot, family);
}

function ensureFamily(family) {
  const directory = familyRoot(family);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function evidencePath(family, file) {
  assertFamily(family);
  if (!familyFiles[family].includes(file)) {
    throw new Error(`Unexpected ${family} evidence artifact: ${file}`);
  }
  return path.join(familyRoot(family), file);
}

module.exports = Object.freeze({
  workspaceRoot,
  provenanceRoot,
  evidenceRoot,
  familyFiles,
  artifacts,
  familyRoot,
  ensureFamily,
  evidencePath,
});

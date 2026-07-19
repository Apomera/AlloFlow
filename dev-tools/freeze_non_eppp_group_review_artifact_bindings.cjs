#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

if (!process.argv.includes('--confirm-current-independent-review')) {
  throw new Error('Refusing to bind review evidence without --confirm-current-independent-review.');
}

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const authoredDir = path.join(__dirname, 'authored');
const reviewedAt = '2026-07-18';
const reviewer = 'OpenAI Codex independent EPPP-guided review';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const reviewFiles = fs.readdirSync(authoredDir)
  .filter((name) => /^non_eppp_eppp_guided_qa_group_[a-c]\.review\.json$/i.test(name))
  .sort();

if (reviewFiles.length !== 3) throw new Error('Expected three group review files, found ' + reviewFiles.length + '.');

for (const name of reviewFiles) {
  const file = path.join(authoredDir, name);
  const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
  const packRows = evidence.packs || evidence.packStems || evidence.scope?.packs || [];
  const stems = packRows.map((entry) => typeof entry === 'string'
    ? entry : entry.stem || entry.packStem || entry.packId || entry.id).filter(Boolean);
  if (evidence.reviewedAt !== reviewedAt || evidence.reviewer !== reviewer
      || !/^pass/i.test(String(evidence.verdict || '')) || !stems.length
      || new Set(stems).size !== stems.length) {
    throw new Error(name + ': current passing independent-review evidence is required.');
  }
  evidence.artifactBindings = stems.sort().map((stem) => {
    const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, stem + '_pack.json'), 'utf8'));
    const libraryBytes = fs.readFileSync(path.join(sourceDir, stem + '_learning_library.json'));
    if (!Array.isArray(pack.items) || pack.items.length !== 500) {
      throw new Error(stem + ': final 500-activity pack is required before review evidence can be frozen.');
    }
    return {
      stem,
      algorithm: 'sha256',
      reviewedAt,
      sourceItemCount: 200,
      sourceItemsSha256: sha256(JSON.stringify(pack.items.slice(0, 200))),
      learningLibrarySha256: sha256(libraryBytes),
    };
  });
  writeGeneratedFile(file, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
}

console.log('Frozen exact source/library artifact bindings into ' + reviewFiles.length + ' independent group reviews.');

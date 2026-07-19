#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const manifestPath = path.join(__dirname, 'authored', 'test_prep_independent_additions_manifest.json');
const expected = [{
  id: 'independent-diagnostic-batch-3',
  label: 'Assistant-reviewed independent diagnostic bank 3',
  reviewedAt: '2026-07-19',
  expectedPackId: 'praxis-school-counselor-5422',
  reviewEvidenceProfile: 'hash-bound-independent-cross-review-v1',
  files: ['school_counselor_5422_batch3.json'],
  reviewReports: ['school_counselor_5422_batch3.review.json'],
}];

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.schemaVersion !== 2 || !manifest.packs || !Array.isArray(manifest.legacyReviewEvidencePacks)
    || manifest.legacyReviewEvidencePacks.length) {
  throw new Error('Refusing to update an invalid or legacy-enabled authored-additions manifest.');
}
const current = manifest.packs.school_counselor_5422;
if (current && JSON.stringify(current) !== JSON.stringify(expected)) {
  throw new Error('School Counselor 5422 already has a different manifest registration.');
}
manifest.packs.school_counselor_5422 = expected;
const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (JSON.stringify(current) !== JSON.stringify(expected)) throw new Error('School Counselor 5422 is not registered exactly.');
  console.log('School Counselor 5422 authored Batch 3 manifest registration is exact.');
} else if (JSON.stringify(current) === JSON.stringify(expected)) {
  console.log('School Counselor 5422 authored Batch 3 was already registered exactly.');
} else {
  writeGeneratedFile(manifestPath, output);
  console.log('Registered School Counselor 5422 authored Batch 3 in the schema-v2 manifest.');
}

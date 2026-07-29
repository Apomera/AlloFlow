#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { wave } = require('./eppp_memory_aid_review_wave_06_data.cjs');

const root = path.resolve(__dirname, '..');
const testPrepRoot = path.join(root, 'test_prep');
const outputPath = path.join(testPrepRoot, 'eppp_memory_aid_review_wave_06.json');
const predecessorFilename = 'eppp_memory_aid_review_wave_05.json';
const predecessorPath = path.join(testPrepRoot, predecessorFilename);
const catalogPath = path.join(testPrepRoot, 'eppp_learning_library.json');
const historicalArtifactFilename = 'eppp_memory_aid_review_wave_06.json';
const correctionArtifactFilename = 'eppp_memory_aid_correction_wave_01.json';
const correctionArtifactPath = path.join(testPrepRoot, correctionArtifactFilename);
const checkOnly = process.argv.includes('--check');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeTitle(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fail(message) {
  throw new Error(`Wave 06 validation failed: ${message}`);
}

if (!fs.existsSync(predecessorPath)) fail(`missing required predecessor ${predecessorFilename}.`);
if (!fs.existsSync(catalogPath)) fail('missing eppp_learning_library.json used to verify stable targets.');

const predecessor = readJson(predecessorPath);
if (predecessor.waveId !== 'eppp-memory-aid-review-wave-05') fail('the predecessor does not identify itself as Wave 05.');
if (wave.waveId !== 'eppp-memory-aid-review-wave-06') fail('the data module has the wrong waveId.');
if (wave.summary.items !== 16 || wave.summary.domains !== 8 || wave.summary.itemsPerDomain !== 2) {
  fail('summary must declare 16 items, 8 domains, and 2 items per domain.');
}
if (!Array.isArray(wave.items) || wave.items.length !== 16) fail('the data module must contain exactly 16 items.');

const waveIds = new Set();
const domainCounts = new Map();
for (const item of wave.items) {
  if (!item.legacyId || !item.title || !Number.isInteger(item.domainId)) fail('every item needs legacyId, title, and integer domainId.');
  if (waveIds.has(item.legacyId)) fail(`duplicate Wave 06 legacyId ${item.legacyId}.`);
  waveIds.add(item.legacyId);
  domainCounts.set(item.domainId, (domainCounts.get(item.domainId) || 0) + 1);
  if (item.reviewStatus !== 'source-reviewed-editorial-pass') fail(`${item.legacyId} has the wrong reviewStatus.`);
  if (item.reviewDate !== '2026-07-28' || item.reviewMode !== 'claim-level-source-and-editorial-review') {
    fail(`${item.legacyId} is missing the review date or mode.`);
  }
  if (String(item.content || '').length < 600) fail(`${item.legacyId} has an underspecified replacement.`);
  if (!Array.isArray(item.sourceDetails) || item.sourceDetails.length < 2) fail(`${item.legacyId} needs at least two sources.`);
  const sourceUrls = item.sourceDetails.map((source) => source.url);
  if (JSON.stringify(item.references) !== JSON.stringify(sourceUrls)) fail(`${item.legacyId} references do not match sourceDetails.`);
  for (const source of item.sourceDetails) {
    if (!source.title || !source.organization || !/^https:\/\//.test(source.url) || String(source.whyReputable || '').length < 100) {
      fail(`${item.legacyId} has incomplete source provenance.`);
    }
  }
}

for (let domainId = 1; domainId <= 8; domainId += 1) {
  if (domainCounts.get(domainId) !== 2) fail(`domain ${domainId} does not contain exactly two items.`);
}

const priorWavePattern = /^eppp_memory_aid_review_wave_0[1-5]\.json$/i;
const priorIds = new Set();
for (const filename of fs.readdirSync(testPrepRoot).filter((entry) => priorWavePattern.test(entry)).sort()) {
  const priorWave = readJson(path.join(testPrepRoot, filename));
  for (const item of Array.isArray(priorWave.items) ? priorWave.items : []) priorIds.add(item.legacyId);
}
for (const legacyId of waveIds) {
  if (priorIds.has(legacyId)) fail(`${legacyId} overlaps an earlier numbered memory-aid wave.`);
}

const catalog = readJson(catalogPath);
const catalogById = new Map(catalog.memoryAids.map((item) => [item.id, item]));
const correctionWave = fs.existsSync(correctionArtifactPath) ? readJson(correctionArtifactPath) : null;
const correctionsById = new Map((correctionWave?.items || []).map((item) => [item.legacyId, item]));
const titleCounts = new Map();
for (const item of catalog.memoryAids) {
  const key = normalizeTitle(item.title);
  titleCounts.set(key, (titleCounts.get(key) || 0) + 1);
}

function correctionFor(item) {
  if (correctionWave?.waveId !== 'eppp-memory-aid-correction-wave-01') fail(`${item.legacyId} points to a missing or invalid correction artifact.`);
  const correction = correctionsById.get(item.legacyId);
  if (!correction) fail(`${item.legacyId} points to the correction artifact without a matching record.`);
  if (correction.expectedTitle !== item.title) fail(`${item.legacyId} correction does not name the historical title it supersedes.`);
  if (correction.supersedesArtifact !== historicalArtifactFilename) fail(`${item.legacyId} correction does not supersede ${historicalArtifactFilename}.`);
  if (correction.domainId !== item.domainId) fail(`${item.legacyId} correction changes the stable domain target.`);
  if (correction.reviewStatus !== 'source-reviewed-editorial-pass') fail(`${item.legacyId} correction has an unexpected review status.`);
  return correction;
}

for (const item of wave.items) {
  const target = catalogById.get(item.legacyId);
  if (!target) fail(`${item.legacyId} is not present in the cumulative catalog.`);
  if (target.domainId !== item.domainId) fail(`${item.legacyId} no longer matches its guarded domain target.`);

  if (target.reviewStatus === 'review-required') {
    if (target.title !== item.title) fail(`${item.legacyId} pending target no longer has its guarded historical title.`);
    if (titleCounts.get(normalizeTitle(target.title)) !== 1) fail(`${item.legacyId} belongs to a duplicate-title group.`);
    continue;
  }

  if (target.reviewStatus !== 'source-reviewed-editorial-pass') fail(`${item.legacyId} has an unexpected catalog review state.`);
  if (target.reviewArtifact === historicalArtifactFilename) {
    if (target.title !== item.title || target.content !== item.content) fail(`${item.legacyId} does not match its numbered-wave review.`);
    if (JSON.stringify(target.references) !== JSON.stringify(item.references)) fail(`${item.legacyId} references do not match its numbered-wave review.`);
    if (titleCounts.get(normalizeTitle(target.title)) !== 1) fail(`${item.legacyId} belongs to a duplicate-title group.`);
    continue;
  }

  if (target.reviewArtifact === correctionArtifactFilename) {
    const correction = correctionFor(item);
    if (target.title !== correction.title || target.content !== correction.content) fail(`${item.legacyId} does not match its superseding correction record.`);
    if (JSON.stringify(target.references) !== JSON.stringify(correction.references)) fail(`${item.legacyId} references do not match its superseding correction record.`);
    if (titleCounts.get(normalizeTitle(target.title)) !== 1) fail(`${item.legacyId} correction belongs to a duplicate-title group.`);
    continue;
  }

  fail(`${item.legacyId} has an unexpected catalog review artifact.`);
}

const expected = `${JSON.stringify(wave, null, 2)}\n`;
if (checkOnly) {
  if (!fs.existsSync(outputPath)) fail('the Wave 06 JSON artifact does not exist.');
  if (fs.readFileSync(outputPath, 'utf8') !== expected) fail('the Wave 06 JSON artifact is stale relative to its data module.');
  console.log('EPPP memory-aid review Wave 06 artifact is current and guarded after Wave 05.');
} else {
  fs.writeFileSync(outputPath, expected, 'utf8');
  console.log(`Wrote ${path.relative(root, outputPath)} with ${wave.items.length} guarded reviews.`);
}

#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const canonicalItemsPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const sourcePackPath = path.join(root, 'test_prep', 'eppp_part_one_pack.json');
const deployPackPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_part_one_pack.json');

const DOMAIN_IDS = Object.freeze([
  'biological',
  'cognitive-affective',
  'social-cultural',
  'lifespan',
  'assessment',
  'intervention',
  'research',
  'professional',
]);
const BANK_COUNT = 15;
const BANK_SIZE = 100;
const EXPECTED_ORDER_SHA256 = '3fa8e0dd748bdb9a4c27a77a1bf54c76a05c75d3d2c4765e2d24d9d10c41c75e';

function fail(message) {
  throw new Error('[EPPP Part 1 pack] ' + message);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(label + ' is not valid JSON: ' + error.message);
  }
}

// This is intentionally the same stable, domain-interleaving algorithm that
// built the original 15 runtime banks in test_prep_hub_source.jsx.
function arrangeBalancedBatches(items, domainIds = DOMAIN_IDS, batchCount = BANK_COUNT) {
  const sourceItems = items.slice();
  const groups = {};
  domainIds.forEach((domainId) => { groups[domainId] = []; });
  const unmatched = [];
  sourceItems.forEach((item) => {
    if (groups[item.domainId]) groups[item.domainId].push(item);
    else unmatched.push(item);
  });

  const batches = Array.from({ length: batchCount }, () => []);
  const domainSlices = Array.from({ length: batchCount }, () => []);
  domainIds.forEach((domainId) => {
    const group = groups[domainId];
    const size = Math.floor(group.length / batchCount);
    const remainder = group.length % batchCount;
    let cursor = 0;
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
      const take = size + (batchIndex < remainder ? 1 : 0);
      domainSlices[batchIndex].push(group.slice(cursor, cursor + take));
      cursor += take;
    }
  });
  batches.forEach((batch, batchIndex) => {
    const slices = domainSlices[batchIndex];
    const longest = Math.max(...slices.map((slice) => slice.length));
    for (let position = 0; position < longest; position += 1) {
      slices.forEach((slice) => {
        if (slice[position]) batch.push(slice[position]);
      });
    }
  });
  unmatched.forEach((item, index) => batches[index % batchCount].push(item));
  return batches.flat();
}

function orderSha256(items) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(items.map((item) => item.id)))
    .digest('hex');
}

function buildPack(canonicalItems) {
  if (!Array.isArray(canonicalItems)) fail('Canonical item source must be an array.');
  if (canonicalItems.length !== BANK_COUNT * BANK_SIZE) {
    fail('Canonical item source must contain exactly ' + (BANK_COUNT * BANK_SIZE) + ' items.');
  }
  const ids = canonicalItems.map((item) => String(item && item.id || ''));
  if (ids.some((id) => !id)) fail('Every canonical item must have an id.');
  if (new Set(ids).size !== ids.length) fail('Canonical item ids must be unique.');

  const items = arrangeBalancedBatches(canonicalItems);
  if (items.length !== canonicalItems.length) fail('Balanced-bank arrangement changed the item count.');
  const arrangedIds = items.map((item) => item.id);
  if (new Set(arrangedIds).size !== arrangedIds.length || ids.some((id) => !arrangedIds.includes(id))) {
    fail('Balanced-bank arrangement did not preserve every canonical item exactly once.');
  }
  const orderDigest = orderSha256(items);
  if (orderDigest !== EXPECTED_ORDER_SHA256) {
    fail('Balanced-bank runtime order changed (expected ' + EXPECTED_ORDER_SHA256 + ', received ' + orderDigest + ').');
  }

  return {
    schemaVersion: 1,
    itemSchemaVersion: 1,
    id: 'eppp-part-one',
    title: 'EPPP Part 1 \u2014 Source-Reviewed Practice Bank',
    shortTitle: 'EPPP Part 1',
    description: 'Fifteen hundred source-reviewed practice items across all eight Part 1 domains, organized into fifteen balanced 100-question banks with feedback after each bank.',
    credentialOwner: 'Association of State and Provincial Psychology Boards',
    version: '3.1.0',
    status: 'ready',
    visibility: 'public',
    portfolioCategories: ['professional-school-personnel'],
    responseTypes: ['single-choice'],
    examModes: ['computer-delivered-selected-response'],
    released: false,
    calibrated: false,
    accent: 'violet',
    contentReview: '1,500 source-reviewed practice items; independent expert review pending',
    nativeQaUrl: 'https://alloflow-cdn.pages.dev/test_prep/eppp_native_qa.json',
    learningLibraryUrl: 'https://alloflow-cdn.pages.dev/test_prep/eppp_learning_library.json',
    learningLibraryQaUrl: 'https://alloflow-cdn.pages.dev/test_prep/eppp_learning_library_qa.json',
    blueprintLabel: 'EPPP Part 1-Knowledge current blueprint (2026-2027)',
    blueprintEffective: 'Current Part 1 blueprint used during 2026 and 2027 administrations',
    officialBlueprintUrl: 'https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/eppp-exam-topics/',
    transitionNotice: 'ASPPB plans an integrated six-domain EPPP for the fourth quarter of 2027. This pack follows the current eight-domain Part 1-Knowledge blueprint and is not an integrated-EPPP pack.',
    transitionUrl: 'https://asppb.net/future-eppp-content-areas-2027/',
    disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ASPPB. Practice results are not official scores or pass predictions.',
    domains: [
      { id: 'biological', label: 'Biological bases of behavior', weight: 0.10 },
      { id: 'cognitive-affective', label: 'Cognitive-affective bases of behavior', weight: 0.13 },
      { id: 'social-cultural', label: 'Social and cultural bases of behavior', weight: 0.11 },
      { id: 'lifespan', label: 'Growth and lifespan development', weight: 0.12 },
      { id: 'assessment', label: 'Assessment and diagnosis', weight: 0.16 },
      { id: 'intervention', label: 'Treatment, intervention, prevention and supervision', weight: 0.15 },
      { id: 'research', label: 'Research methods and statistics', weight: 0.07 },
      { id: 'professional', label: 'Ethical, legal, and professional issues', weight: 0.16 },
    ],
    sections: [{ id: 'knowledge', label: 'Part 1 \u2014 Knowledge', timeMinutes: 255 }],
    batchSize: BANK_SIZE,
    items,
  };
}

const transientFileCodes = new Set(['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN']);
const retrySignal = new Int32Array(new SharedArrayBuffer(4));

function sameFileBytes(filePath, expectedBuffer) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size === expectedBuffer.length && fs.readFileSync(filePath).equals(expectedBuffer);
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

function writeFileIfChanged(filePath, contents) {
  const expectedBuffer = Buffer.isBuffer(contents) ? contents : Buffer.from(String(contents), 'utf8');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      if (sameFileBytes(filePath, expectedBuffer)) return false;
      fs.writeFileSync(filePath, expectedBuffer);
      if (!sameFileBytes(filePath, expectedBuffer)) {
        fail('Generated asset failed byte verification: ' + path.relative(root, filePath).replace(/\\/g, '/') + '.');
      }
      return true;
    } catch (error) {
      if (!error || !transientFileCodes.has(error.code) || attempt === 5) throw error;
      Atomics.wait(retrySignal, 0, 0, 25 * (2 ** attempt));
    }
  }
  return false;
}

function writePack() {
  const canonicalItems = readJson(canonicalItemsPath, 'Canonical EPPP native item source');
  const pack = buildPack(canonicalItems);
  const serialized = JSON.stringify(pack, null, 2) + '\n';
  writeFileIfChanged(sourcePackPath, serialized);
  writeFileIfChanged(deployPackPath, serialized);
  return pack;
}

if (require.main === module) {
  const pack = writePack();
  process.stdout.write(
    'Built test_prep/eppp_part_one_pack.json with ' + pack.items.length +
    ' items in ' + BANK_COUNT + ' balanced banks; order ' + orderSha256(pack.items) + '.\n',
  );
}

module.exports = {
  BANK_COUNT,
  BANK_SIZE,
  DOMAIN_IDS,
  EXPECTED_ORDER_SHA256,
  arrangeBalancedBatches,
  buildPack,
  orderSha256,
  writePack,
};

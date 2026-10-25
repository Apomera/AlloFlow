#!/usr/bin/env node
'use strict';
// Current file integrity and existing review labels, without renewing historical
// educational review attestations or changing any learning material.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'test_prep');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const count = (items, field) => Object.fromEntries([...new Set(items.map(item => String(item[field] || 'unspecified')))].sort()
  .map(value => [value, items.filter(item => String(item[field] || 'unspecified') === value).length]));

function buildInventory() {
  const historicalFile = 'test_prep_assistant_review_2026-07-16.json';
  const historicalBytes = fs.readFileSync(path.join(source, historicalFile));
  const historical = JSON.parse(historicalBytes);
  const perPack = historical.perPack.map(({ stem }) => {
    if (!/^[a-z0-9_]+$/.test(stem)) throw new Error('Invalid pack identifier');
    const packBytes = fs.readFileSync(path.join(source, stem + '_pack.json'));
    const itemsBytes = fs.readFileSync(path.join(source, stem + '_items.json'));
    const pack = JSON.parse(packBytes), items = JSON.parse(itemsBytes);
    if (JSON.stringify(pack.items) !== JSON.stringify(items)) throw new Error('Pack/item drift: ' + stem);
    return { stem, packSha256: sha256(packBytes), itemsSha256: sha256(itemsBytes),
      learningActivities: items.length, reviewStatus: count(items, 'reviewStatus'), qaStatus: count(items, 'qaStatus') };
  }).sort((a, b) => a.stem.localeCompare(b.stem));
  return { schemaVersion: 1, purpose: 'structural-inventory-not-content-approval',
    limitation: 'Records existing labels and file hashes only. Draft and pending QA items still need educational review. The historical review does not certify the current files.',
    historicalReview: { file: historicalFile, sha256: sha256(historicalBytes) }, perPack };
}

if (require.main === module) {
  const text = JSON.stringify(buildInventory(), null, 2) + '\n';
  for (const directory of [source, path.join(root, 'desktop/web-app/public/test_prep')]) {
    const file = path.join(directory, 'test_prep_status_inventory.json');
    if (process.argv.includes('--check')) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) throw new Error('Stale status inventory: ' + file);
    } else fs.writeFileSync(file, text);
  }
  console.log('Current test-prep status inventory verified; educational review labels unchanged.');
}
module.exports = { buildInventory };

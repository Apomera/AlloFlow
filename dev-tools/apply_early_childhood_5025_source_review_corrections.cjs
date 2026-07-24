#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { corrections, applySourceReviewCorrections } = require('./early_childhood_5025/source_review_corrections.cjs');

const root = path.resolve(__dirname, '..');
const roots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

for (const outputRoot of roots) {
  const packPath = path.join(outputRoot, 'early_childhood_5025_pack.json');
  const itemsPath = path.join(outputRoot, 'early_childhood_5025_items.json');
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  const packSeen = applySourceReviewCorrections(pack.items);
  const itemSeen = applySourceReviewCorrections(items);
  if (packSeen.size !== Object.keys(corrections).length || itemSeen.size !== Object.keys(corrections).length) {
    throw new Error(`Not all ${Object.keys(corrections).length} source corrections were found in ${outputRoot}`);
  }
  writeJson(packPath, pack);
  writeJson(itemsPath, items);
}

console.log(`Applied ${Object.keys(corrections).length} durable Early Childhood 5025 source-review corrections to source and deployment artifacts.`);

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { revisions, reviewWave } = require('./eppp_native_quality_wave_07_data.cjs');

const root = path.resolve(__dirname, '..');
const bankPaths = [
  path.join(root, 'test_prep', 'eppp_native_items.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json'),
];
const selectedIds = new Set(revisions.map((revision) => revision.id));
const revisionById = new Map(revisions.map((revision) => [revision.id, revision]));
const catalogPaths = [
  path.join(root, 'test_prep', 'reference_catalog.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json'),
];

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.writeFileSync(filePath, contents);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

let canonicalJson = null;
for (const bankPath of bankPaths) {
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected a 1,500-item bank at ' + bankPath);
  for (const item of bank) {
    if (!selectedIds.has(item.id)) continue;
    if (item.wordingReviewWave !== reviewWave) throw new Error(item.id + ' is not the reviewed wave 07 item.');
    const revision = revisionById.get(item.id);
    item.choices = [...revision.choices];
    item.references = [...revision.references];
    item.sourceDetails = revision.sourceDetails.map((source) => ({ ...source }));
    item.choiceRationales[item.answerIndex] = item.rationale;
    item.sourceReviewBasis = 'item-specific-authoritative-source-review';
    delete item.sourceAnchorItemId;
    delete item.sourceMatchScore;
  }
  const json = JSON.stringify(bank, null, 2) + '\n';
  if (canonicalJson == null) canonicalJson = json;
  else if (json !== canonicalJson) throw new Error('Source and deploy banks diverged before provenance finalization.');
  writeFileWithRetry(bankPath, json);
}

let canonicalCatalogJson = null;
for (const catalogPath of catalogPaths) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  for (const revision of revisions) {
    for (const source of revision.sourceDetails) {
      catalog[source.url] = { ...source, metadataSource: 'pack-authored' };
      delete catalog[source.url].url;
    }
  }
  const ordered = Object.fromEntries(Object.entries(catalog).sort(([left], [right]) => left.localeCompare(right)));
  const json = JSON.stringify(ordered, null, 2) + '\n';
  if (canonicalCatalogJson == null) canonicalCatalogJson = json;
  else if (json !== canonicalCatalogJson) throw new Error('Source and deploy catalogs diverged before provenance finalization.');
  writeFileWithRetry(catalogPath, json);
}

console.log('Finalized wave 07 source metadata, item-specific provenance, and answer-rationale consistency.');

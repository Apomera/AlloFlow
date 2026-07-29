#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const targets = [
  path.join(root, 'test_prep_hub_module.js'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep_hub_module.js'),
];
const catalogStartMarker = 'const TEST_PREP_REFERENCE_CATALOG = ';
const startMarker = 'const EPPP_NATIVE_ITEMS = ';
const nextMarker = 'const EPPP_INTEGRATED_2027_PREVIEW_PACK = ';

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.writeFileSync(filePath, contents, 'utf8');
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

function replaceEmbeddedBank(moduleText, filePath, serializedBank) {
  const markerIndex = moduleText.indexOf(startMarker);
  if (markerIndex < 0 || moduleText.indexOf(startMarker, markerIndex + 1) >= 0) {
    throw new Error(filePath + ' must contain exactly one EPPP native-bank marker.');
  }
  const dataStart = markerIndex + startMarker.length;
  const nextIndex = moduleText.indexOf(nextMarker, dataStart);
  if (nextIndex < 0 || moduleText.indexOf(nextMarker, nextIndex + 1) >= 0) {
    throw new Error(filePath + ' must contain exactly one EPPP 2027 preview marker after the native bank.');
  }
  const separatorStart = moduleText.lastIndexOf(';', nextIndex);
  if (separatorStart < dataStart || moduleText.slice(separatorStart + 1, nextIndex).trim()) {
    throw new Error(filePath + ' has an unexpected separator between the EPPP bank and preview pack.');
  }
  const updated = moduleText.slice(0, dataStart) + serializedBank + moduleText.slice(separatorStart);
  const updatedNextIndex = updated.indexOf(nextMarker, dataStart);
  const updatedSeparatorStart = updated.lastIndexOf(';', updatedNextIndex);
  const embedded = JSON.parse(updated.slice(dataStart, updatedSeparatorStart));
  if (!Array.isArray(embedded) || embedded.length !== 1500) {
    throw new Error(filePath + ' did not receive the complete 1,500-item EPPP bank.');
  }
  return updated;
}

function replaceEmbeddedCatalog(moduleText, filePath, serializedCatalog) {
  const markerIndex = moduleText.indexOf(catalogStartMarker);
  if (markerIndex < 0 || moduleText.indexOf(catalogStartMarker, markerIndex + 1) >= 0) {
    throw new Error(filePath + ' must contain exactly one Test Prep reference-catalog marker.');
  }
  const dataStart = markerIndex + catalogStartMarker.length;
  const nextIndex = moduleText.indexOf(startMarker, dataStart);
  if (nextIndex < 0 || moduleText.indexOf(startMarker, nextIndex + 1) >= 0) {
    throw new Error(filePath + ' must contain exactly one EPPP native-bank marker after the reference catalog.');
  }
  const separatorStart = moduleText.lastIndexOf(';', nextIndex);
  if (separatorStart < dataStart || moduleText.slice(separatorStart + 1, nextIndex).trim()) {
    throw new Error(filePath + ' has an unexpected separator between the reference catalog and EPPP bank.');
  }
  const updated = moduleText.slice(0, dataStart) + serializedCatalog + moduleText.slice(separatorStart);
  const updatedNextIndex = updated.indexOf(startMarker, dataStart);
  const updatedSeparatorStart = updated.lastIndexOf(';', updatedNextIndex);
  const embedded = JSON.parse(updated.slice(dataStart, updatedSeparatorStart));
  if (!embedded || typeof embedded !== 'object' || Array.isArray(embedded) || Object.keys(embedded).length < 1000) {
    throw new Error(filePath + ' did not receive the complete Test Prep reference catalog.');
  }
  return updated;
}

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500 || new Set(bank.map((item) => item.id)).size !== 1500) {
  throw new Error('Expected a unique 1,500-item EPPP native bank.');
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog) || Object.keys(catalog).length < 1000) {
  throw new Error('Expected the complete Test Prep reference catalog.');
}
const serializedBank = JSON.stringify(bank);
const serializedCatalog = JSON.stringify(catalog);
for (const target of targets) {
  const current = fs.readFileSync(target, 'utf8');
  const withCatalog = replaceEmbeddedCatalog(current, target, serializedCatalog);
  const updated = replaceEmbeddedBank(withCatalog, target, serializedBank);
  if (updated !== current) writeFileWithRetry(target, updated);
}

console.log('Synchronized the reviewed 1,500-item EPPP bank and shared reference catalog into both Test Prep Hub runtime modules without rebuilding unrelated packs.');

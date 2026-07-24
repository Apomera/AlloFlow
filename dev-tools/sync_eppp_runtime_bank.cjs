#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const targets = [
  path.join(root, 'test_prep_hub_module.js'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep_hub_module.js'),
];
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

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500 || new Set(bank.map((item) => item.id)).size !== 1500) {
  throw new Error('Expected a unique 1,500-item EPPP native bank.');
}
const serializedBank = JSON.stringify(bank);
for (const target of targets) {
  const current = fs.readFileSync(target, 'utf8');
  const updated = replaceEmbeddedBank(current, target, serializedBank);
  if (updated !== current) writeFileWithRetry(target, updated);
}

console.log('Synchronized the reviewed 1,500-item EPPP bank into both Test Prep Hub runtime modules without rebuilding unrelated packs.');

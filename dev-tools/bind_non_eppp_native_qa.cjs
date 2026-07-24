#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const reviewedAt = '2026-07-18';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const retryableWriteCodes = new Set(['UNKNOWN', 'EBUSY', 'EPERM']);
const waitSync = (milliseconds) => Atomics.wait(
  new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds,
);
const writeJson = (file, value) => {
  const content = JSON.stringify(value, null, 2) + '\n';
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      fs.writeFileSync(file, content, 'utf8');
      return;
    } catch (error) {
      if (!retryableWriteCodes.has(error?.code) || attempt === 8) throw error;
      waitSync(75 * attempt);
    }
  }
};

const packFiles = fs.readdirSync(sourceDir)
  .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'))
  .sort();
if (packFiles.length !== 22) throw new Error(`Expected 22 non-EPPP packs, found ${packFiles.length}.`);

for (const packFile of packFiles) {
  const stem = packFile.slice(0, -'_pack.json'.length);
  const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, packFile), 'utf8'));
  const libraryPath = path.join(sourceDir, `${stem}_learning_library.json`);
  const nativeQaPath = path.join(sourceDir, `${stem}_native_qa.json`);
  const libraryQaPath = path.join(sourceDir, `${stem}_learning_library_qa.json`);
  if (!Array.isArray(pack.items) || pack.items.length < 200) throw new Error(`${stem}: QA binding requires at least the 200-item source layer.`);
  for (const requiredPath of [libraryPath, nativeQaPath, libraryQaPath]) {
    if (!fs.existsSync(requiredPath)) throw new Error(`${stem}: missing ${path.basename(requiredPath)}.`);
  }

  const libraryBytes = fs.readFileSync(libraryPath);
  const nativeQa = JSON.parse(fs.readFileSync(nativeQaPath, 'utf8'));
  const libraryQa = JSON.parse(fs.readFileSync(libraryQaPath, 'utf8'));
  if (nativeQa.summary?.status !== 'pass' || libraryQa.summary?.status !== 'pass') {
    throw new Error(`${stem}: cannot bind a non-passing native or learning-library QA report.`);
  }

  const binding = {
    schemaVersion: 1,
    algorithm: 'sha256',
    reviewedAt,
    sourceItemCount: 200,
    sourceItemsSha256: sha256(JSON.stringify(pack.items.slice(0, 200))),
    learningLibrarySha256: sha256(libraryBytes),
    meaning: 'Credential-specific native and learning-library QA passed against exactly these 200 source items and this learning-library artifact; final expansion activities are reviewed separately by the consolidated release QA.',
  };
  nativeQa.contentBinding = binding;
  libraryQa.contentBinding = binding;

  for (const [name, report] of [
    [`${stem}_native_qa.json`, nativeQa],
    [`${stem}_learning_library_qa.json`, libraryQa],
  ]) {
    writeJson(path.join(sourceDir, name), report);
    writeJson(path.join(deployDir, name), report);
  }
}

console.log(`Bound 22 non-EPPP native/library QA pairs to their exact source items and learning libraries (${reviewedAt}).`);

#!/usr/bin/env node
'use strict';

// One-time, idempotent catalog migration for the revised RoadReady mirror-scan
// instruction. The prior pack value was an English fallback in every language,
// not a reviewed translation, so keep deployed packs aligned with the canonical
// English source until translations are supplied.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const KEY = 'rearview_top_center_left_mirror_top_le';
const OLD_VALUE = "Rearview (top center) · Left mirror (top left) · Right mirror (top right). Take your time — the road isn't going anywhere.";
const NEW_VALUE = 'Rearview (top center) · Left mirror (top left) · Right mirror (top right). Driving controls unlock after the scan.';
const TRANSIENT_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function replaceFile(file, text) {
  const temporary = `${file}.roadready-sync-${process.pid}.tmp`;
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(temporary, text, 'utf8');
      try {
        fs.renameSync(temporary, file);
      } catch (error) {
        if (!TRANSIENT_CODES.has(error.code)) throw error;
        fs.copyFileSync(temporary, file);
      }
      return;
    } catch (error) {
      lastError = error;
      if (!TRANSIENT_CODES.has(error.code) || attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
    } finally {
      if (fs.existsSync(temporary)) {
        try { fs.unlinkSync(temporary); } catch (error) { lastError = error; }
      }
    }
  }
  throw lastError;
}

function updatePack(file) {
  const pack = readJson(file);
  const roadready = pack && pack.stem && pack.stem.roadready;
  if (!roadready || ![OLD_VALUE, NEW_VALUE].includes(roadready[KEY])) {
    throw new Error(`Unexpected ${KEY} value in ${path.relative(ROOT, file)}`);
  }
  if (roadready[KEY] === NEW_VALUE) return false;
  roadready[KEY] = NEW_VALUE;
  replaceFile(file, JSON.stringify(pack, null, 2) + '\n');
  return true;
}

let updated = 0;
for (const relativeDir of ['lang', path.join('desktop', 'web-app', 'public', 'lang')]) {
  const directory = path.join(ROOT, relativeDir);
  for (const name of fs.readdirSync(directory).filter((file) => file.endsWith('.js')).sort()) {
    if (updatePack(path.join(directory, name))) updated += 1;
  }
}

const extractionFile = path.join(__dirname, 'stem_roadready_en.json');
const extraction = readJson(extractionFile);
if (![OLD_VALUE, NEW_VALUE].includes(extraction[KEY])) throw new Error(`Unexpected ${KEY} value in STEM extraction`);
if (extraction[KEY] === OLD_VALUE) {
  extraction[KEY] = NEW_VALUE;
  replaceFile(extractionFile, JSON.stringify(extraction, null, 2) + '\n');
  updated += 1;
}

console.log(`RoadReady mirror-scan catalog synchronized; ${updated} file(s) updated.`);

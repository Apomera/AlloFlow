#!/usr/bin/env node
'use strict';

// Applies deduplicated, chapter-aligned replacement flashcards to
// school_librarian_5312_learning_library.json (49 cards) and
// special_education_early_childhood_5692_learning_library.json (2 cards),
// and repairs stray possessive `?s` apostrophe typos in
// eppp_knowledge_check_review_wave_0{1,2}.json and reading_specialist_5302.

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const { deriveGuidedReviewItems } = require('./test_prep_guided_expansion_core.cjs');
const dedupe = require('./learning_library_flashcard_dedupe.cjs');

const root = path.resolve(__dirname, '..');
const testPrepDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const write = process.argv.includes('--write');

function canon(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fixPossessiveQ(value) {
  if (typeof value === 'string') {
    if (value.includes('http://') || value.includes('https://')) return value;
    return value.replace(/\b([A-Za-z]+)\?s\b/g, "$1's");
  }
  if (Array.isArray(value)) return value.map(fixPossessiveQ);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, (k === 'references' || k === 'url') ? v : fixPossessiveQ(v)]));
  }
  return value;
}

// 1. Flashcard dedupe across school_librarian_5312 and special_education_early_childhood_5692
for (const [stem, replacements] of Object.entries(dedupe)) {
  const fileName = stem + '_learning_library.json';
  const filePath = path.join(testPrepDir, fileName);
  const lib = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const seenIds = new Set();
  let changed = 0;

  lib.flashcards = lib.flashcards.map((card) => {
    const ov = replacements[card.id];
    if (!ov) return card;
    seenIds.add(card.id);
    const next = { ...card, front: ov.front.trim(), back: ov.back.trim() };
    if (next.front.length < 25) throw new Error(`${stem}/${card.id}: front too short`);
    if (next.back.length < 60) throw new Error(`${stem}/${card.id}: back too short`);
    if (JSON.stringify(next) !== JSON.stringify(card)) changed += 1;
    return next;
  });

  const unknown = Object.keys(replacements).filter((id) => !seenIds.has(id));
  if (unknown.length) throw new Error(`${stem}: unknown flashcard id(s): ${unknown.join(', ')}`);

  const frontSet = new Set(lib.flashcards.map((c) => canon(c.front)));
  const backSet = new Set(lib.flashcards.map((c) => canon(c.back)));
  if (frontSet.size !== lib.flashcards.length) throw new Error(`${stem}: duplicate flashcard front remains (${frontSet.size}/${lib.flashcards.length})`);
  if (backSet.size !== lib.flashcards.length) throw new Error(`${stem}: duplicate flashcard back remains (${backSet.size}/${lib.flashcards.length})`);

  console.log(`${stem}: ${Object.keys(replacements).length} dedupe cards, ${changed} changed, unique fronts/backs: ${frontSet.size}/${lib.flashcards.length}`);
  if (write && changed > 0) {
    const json = JSON.stringify(lib, null, 2) + '\n';
    for (const dir of [testPrepDir, deployDir]) writeGeneratedFile(path.join(dir, fileName), json, 'utf8');
  }
}

// 2. Fix ?s apostrophe typos in eppp_knowledge_check_review_wave_01.json & wave_02.json
for (const w of [1, 2]) {
  const fileName = `eppp_knowledge_check_review_wave_0${w}.json`;
  const filePath = path.join(testPrepDir, fileName);
  const before = fs.readFileSync(filePath, 'utf8');
  const nextObj = fixPossessiveQ(JSON.parse(before));
  const after = JSON.stringify(nextObj, null, 2) + '\n';
  console.log(`${fileName}: ?s fixed = ${before !== after}`);
  if (write && before !== after) {
    writeGeneratedFile(filePath, after, 'utf8');
    const dp = path.join(deployDir, fileName);
    if (fs.existsSync(dp)) writeGeneratedFile(dp, after, 'utf8');
  }
}

// 3. Fix ?s apostrophe typos in reading_specialist_5302 (source item_content.cjs + pack/items + guided tail)
const rsSrcPath = path.join(root, 'dev-tools', 'reading_specialist_5302', 'item_content.cjs');
if (fs.existsSync(rsSrcPath)) {
  const before = fs.readFileSync(rsSrcPath, 'utf8');
  const after = before.replace(/\b([A-Za-z]+)\?s\b/g, "$1's");
  console.log(`reading_specialist_5302/item_content.cjs: ?s fixed = ${before !== after}`);
  if (write && before !== after) writeGeneratedFile(rsSrcPath, after, 'utf8');
}

const rsPackPath = path.join(testPrepDir, 'reading_specialist_5302_pack.json');
const rsPack = JSON.parse(fs.readFileSync(rsPackPath, 'utf8'));
const rsBefore = JSON.stringify(rsPack);
const nextSource = fixPossessiveQ(rsPack.items.slice(0, 200));
const nextGuided = deriveGuidedReviewItems(nextSource).slice(0, 300);
rsPack.items = [...nextSource, ...nextGuided];
const rsAfter = JSON.stringify(rsPack);
console.log(`reading_specialist_5302_pack.json: ?s fixed = ${rsBefore !== rsAfter}`);
if (write && rsBefore !== rsAfter) {
  const packJson = JSON.stringify(rsPack, null, 2) + '\n';
  const itemsJson = JSON.stringify(rsPack.items, null, 2) + '\n';
  for (const dir of [testPrepDir, deployDir]) {
    writeGeneratedFile(path.join(dir, 'reading_specialist_5302_pack.json'), packJson, 'utf8');
    writeGeneratedFile(path.join(dir, 'reading_specialist_5302_items.json'), itemsJson, 'utf8');
  }
}

if (!write) console.log('Check passed; nothing written.');

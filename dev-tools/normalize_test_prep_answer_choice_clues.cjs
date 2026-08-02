'use strict';

// Applies the shared, semantics-preserving answer-choice clue pass to released
// non-EPPP packs and the AP pilot. Dedicated EPPP Part One artifacts remain
// owned by their native builder and are intentionally not rewritten here.

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop', 'web-app', 'public', 'test_prep');
const { normalizeItem } = require('./test_prep_guided_expansion_core.cjs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const reviewedAt = '2026-08-01';
const reviewVersion = 'answer-choice-clue-normalization-v1';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeItems(items) {
  let changed = 0;
  const normalized = (Array.isArray(items) ? items : []).map(item => {
    const next = normalizeItem(item);
    if (next !== item) changed += 1;
    return next;
  });
  return { normalized, changed };
}

function writePair(name, value) {
  const json = JSON.stringify(value, null, 2) + '\n';
  writeGeneratedFile(path.join(sourceDir, name), json);
  if (fs.existsSync(deployDir)) writeGeneratedFile(path.join(deployDir, name), json);
}

function normalizePack(name) {
  const sourcePath = path.join(sourceDir, name);
  const pack = readJson(sourcePath);
  const result = normalizeItems(pack.items);
  if (!result.changed && pack.answerChoiceClueReview?.version === reviewVersion) return result.changed;
  pack.items = result.normalized;
  pack.answerChoiceClueReview = {
    version: reviewVersion,
    reviewedAt,
    normalizedItems: result.changed,
    scope: 'answer-length, key-stem lexical, and asymmetric-extreme distractor cues',
    answerKeyPolicy: 'answerIndex values and keyed content claims were preserved',
  };
  writePair(name, pack);
  const itemsName = name.replace(/_pack\.json$/i, '_items.json');
  writePair(itemsName, pack.items);
  return result.changed;
}

function normalizePilot() {
  const name = 'ap_psychology_pilot.json';
  const file = path.join(sourceDir, name);
  if (!fs.existsSync(file)) return 0;
  const pilot = readJson(file);
  const result = normalizeItems(pilot.items);
  if (!result.changed && pilot.answerChoiceClueReview?.version === reviewVersion) return result.changed;
  pilot.items = result.normalized;
  pilot.answerChoiceClueReview = {
    version: reviewVersion,
    reviewedAt,
    normalizedItems: result.changed,
    scope: 'answer-length, key-stem lexical, and asymmetric-extreme distractor cues',
    answerKeyPolicy: 'answerIndex values and keyed content claims were preserved',
  };
  writePair(name, pilot);
  return result.changed;
}

function main() {
  const names = fs.readdirSync(sourceDir)
    .filter(name => /_pack\.json$/i.test(name) && !/^eppp/i.test(name))
    .sort();
  const changed = {};
  for (const name of names) changed[name] = normalizePack(name);
  changed['ap_psychology_pilot.json'] = normalizePilot();
  const total = Object.values(changed).reduce((sum, value) => sum + value, 0);
  if (process.argv.includes('--check')) {
    console.log('Answer-choice clue normalization checked ' + names.length + ' non-EPPP packs and AP pilot; ' + total + ' items would change.');
    return;
  }
  console.log('Answer-choice clue normalization applied to ' + names.length + ' non-EPPP packs and AP pilot; ' + total + ' items changed.');
}

if (require.main === module) main();
module.exports = { normalizeItems, normalizePack, normalizePilot, reviewVersion };

'use strict';

// Removes only the v1 clue-normalization text so the revised, stable pass can
// be applied once. It is intentionally limited to items carrying the v1 marker.

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop', 'web-app', 'public', 'test_prep');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const padding = [
  'This response should be interpreted in the setting described by the item.',
  'Its application depends on the evidence, constraints, and decision context provided.',
  'The claim should be evaluated against the facts and purpose stated in the question.',
  'This wording describes a possible response, not a universal rule outside the case.',
];
const reverseExtremes = [
  [/\bstudents generally\b/gi, 'all students'],
  [/\bfew students\b/gi, 'no students'],
  [/\btypically\b/gi, 'always'],
  [/\brarely\b/gi, 'never'],
  [/\bprimarily\b/gi, 'only'],
  [/\blargely\b/gi, 'entirely'],
  [/\bsubstantially\b/gi, 'completely'],
  [/\bsupports\b/gi, 'guarantees'],
  [/\bpromptly\b/gi, 'immediately'],
  [/\bas a routine step\b/gi, 'automatically'],
];

function cleanText(value) {
  let text = String(value || '');
  for (const suffix of padding) text = text.split(suffix).join('');
  text = text.replace(/\s*\(in the context of [^)]+\)/gi, '');
  return text.replace(/\s{2,}/g, ' ').trim();
}

function cleanItem(item) {
  if (!item || item.answerChoiceClueNormalizationVersion !== 'answer-choice-clue-normalization-v1') return item;
  const choices = (item.choices || []).map((choice, index) => {
    let text = cleanText(choice);
    if (index !== item.answerIndex) for (const [pattern, replacement] of reverseExtremes) text = text.replace(pattern, replacement);
    return text;
  });
  const next = { ...item, choices };
  delete next.answerChoiceClueNormalizationVersion;
  return next;
}

function writeJson(file, value) {
  writeGeneratedFile(file, JSON.stringify(value, null, 2) + '\n');
}

function cleanFile(file) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Array.isArray(value.items)) {
    value.items = value.items.map(cleanItem);
    delete value.answerChoiceClueReview;
    writeJson(file, value);
    return;
  }
  if (Array.isArray(value)) writeJson(file, value.map(cleanItem));
}

function main() {
  const names = fs.readdirSync(sourceDir).filter(name => /(?:_pack|_items)\.json$/i.test(name) || name === 'ap_psychology_pilot.json');
  for (const name of names) cleanFile(path.join(sourceDir, name));
  if (fs.existsSync(deployDir)) for (const name of names) {
    const file = path.join(deployDir, name);
    if (fs.existsSync(file)) cleanFile(file);
  }
  console.log('Rolled back v1 answer-choice normalization text from ' + names.length + ' source artifacts.');
}

if (require.main === module) main();

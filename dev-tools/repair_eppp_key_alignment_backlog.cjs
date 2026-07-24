#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const auditPath = path.join(__dirname, 'eppp_key_alignment_wave_02_audit.json');
const auditMarkdownPath = path.join(__dirname, 'eppp_key_alignment_wave_02_audit.md');
const reviewedAt = '2026-07-16';
const waveId = 'eppp-key-alignment-wave-02';

const supportedChoices = new Map([
  ['eppp-b007-intervention-1', 'Beginning with prolonged exposure to a highly feared stimulus rather than moving up a hierarchy gradually'],
  ['eppp-b013-cognitive-1', 'Selectively enhances processing within a limited spatial region'],
  ['eppp-b015-intervention-1', 'Help clients describe concrete signs that the preferred future has occurred'],
  ['eppp-b016-intervention-1', 'Adaptive information and action tendencies that can also become maladaptive'],
  ['eppp-b016-professional-1', 'Maintain impartiality and focus on the child’s psychological best interests'],
  ['eppp-b017-assessment-1', 'People with the condition who test positive'],
  ['eppp-b017-intervention-1', 'Thoughts, emotions, behavior, physiology, and context interact and can be changed'],
  ['eppp-b017-professional-1', 'Avoid or minimize reasonably foreseeable harm where possible'],
  ['eppp-b017-social-1', 'Lifelong self-reflection, power awareness, and accountable partnership'],
  ['eppp-b025-professional-1', 'Develop self-awareness, seek relevant knowledge, adapt responsively, and consult when needed'],
]);

const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const rows = [];

for (const [id, supportedChoice] of supportedChoices) {
  const item = bank.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing declared repair item: ${id}`);
  const keyedIndex = item.answerIndex;
  const supportedIndex = item.choices.indexOf(supportedChoice);
  if (supportedIndex < 0) throw new Error(`${id} no longer contains its reviewed supported choice.`);
  const previousKeyedChoice = item.choices[keyedIndex];
  const changed = supportedIndex !== keyedIndex;
  if (changed) {
    [item.choices[keyedIndex], item.choices[supportedIndex]] = [item.choices[supportedIndex], item.choices[keyedIndex]];
    if (Array.isArray(item.choiceRationales) && item.choiceRationales.length === item.choices.length) {
      [item.choiceRationales[keyedIndex], item.choiceRationales[supportedIndex]] = [item.choiceRationales[supportedIndex], item.choiceRationales[keyedIndex]];
    }
  }
  item.keyAlignmentReviewWave = waveId;
  item.keyAlignmentReviewedAt = reviewedAt;
  if (item.choices[item.answerIndex] !== supportedChoice) throw new Error(`${id} key did not align after repair.`);
  rows.push({ id, answerIndex: keyedIndex, supportedChoice, displacedChoice: previousKeyedChoice, choiceSwapApplied: changed });
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewedAt,
  waveId,
  standard: {
    method: 'Manual stem-choice-rationale review followed by cross-check against each item’s cited editorial source record.',
    keyBalanceProtection: 'The supported choice is moved into the existing keyed position, preserving answer-position balance and practice-bank structure.',
    limitation: 'This is an editorial answer-key consistency repair, not psychometric calibration or independent licensed-psychologist validation.',
  },
  summary: {
    declaredRepairs: rows.length,
    choiceSwapsApplied: rows.filter((row) => row.choiceSwapApplied).length,
    alignedItems: rows.filter((row) => bank.find((item) => item.id === row.id).choices[row.answerIndex] === row.supportedChoice).length,
  },
  items: rows,
};

if (report.summary.declaredRepairs !== 10 || report.summary.alignedItems !== 10) {
  throw new Error(`Expected 10 aligned repairs; found ${report.summary.alignedItems}/${report.summary.declaredRepairs}.`);
}

const serialized = JSON.stringify(bank, null, 2) + '\n';
fs.writeFileSync(sourcePath, serialized);
fs.writeFileSync(deployPath, serialized);
fs.writeFileSync(auditPath, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(auditMarkdownPath, `# EPPP key-alignment repair wave 02\n\nGenerated: ${report.generatedAt}\n\n- ${report.summary.alignedItems} / ${report.summary.declaredRepairs} declared items align their existing key with the reviewed supported choice.\n- ${report.summary.choiceSwapsApplied} choice-text swaps were required on this run.\n- Existing answer positions were preserved.\n\n> ${report.standard.limitation}\n`);

console.log(`EPPP key alignment: ${report.summary.alignedItems}/${report.summary.declaredRepairs} aligned; ${report.summary.choiceSwapsApplied} swaps applied.`);

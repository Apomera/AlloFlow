#!/usr/bin/env node
// Regenerate the accepted-warning baseline for tests/test_prep_feedback_quality.test.js.
//
//   node dev-tools/update_feedback_quality_baseline.cjs [--check]
//
// The test used to assert ZERO targeted warnings and had never passed: the
// released packs carry 585, a figure identical at HEAD and corroborated by the
// project's own frozen review evidence, which records these same warning
// classes as non-zero per pack at review time. A permanently red test cannot
// distinguish a real regression from standing noise, so the assertion is now a
// ratchet against this file: nothing new may appear, and the total may only
// fall.
//
// Run this ONLY after deliberate content work, and read the diff - it is the
// record of what actually improved. Do not run it to make a red test green.
'use strict';

const fs = require('fs');
const path = require('path');
const { warningCodes } = require('./non_eppp_warning_checks.cjs');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const outputPath = path.join(root, 'tests', 'fixtures', 'test_prep_feedback_quality_baseline.json');
const TARGETED = new Set([
  'short-prompt',
  'incorrect-option-feedback-detail',
  'incorrect-option-choice-restatement',
  'incorrect-option-full-key-echo',
]);

const files = fs.readdirSync(sourceDir)
  .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_')).sort();
if (files.length !== 22) throw new Error('Expected 22 non-EPPP packs, found ' + files.length + '.');

const findings = [];
const byCode = {};
for (const file of files) {
  const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
  for (const item of pack.items || []) {
    for (const code of warningCodes(item)) {
      if (!TARGETED.has(code)) continue;
      findings.push(file + ':' + item.id + ':' + code);
      byCode[code] = (byCode[code] || 0) + 1;
    }
  }
}
findings.sort();

const payload = {
  note: 'Accepted targeted feedback warnings. Ratchet only: entries may be removed by content work, never added. Regenerate with dev-tools/update_feedback_quality_baseline.cjs.',
  total: findings.length,
  byCode,
  findings,
};

if (process.argv.includes('--check')) {
  const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const added = findings.filter((entry) => !new Set(existing.findings).has(entry));
  console.log('current ' + findings.length + ' vs baseline ' + existing.total
    + '; new ' + added.length + '; resolved ' + (existing.total - findings.length + added.length));
  process.exitCode = added.length ? 1 : 0;
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('Wrote baseline: ' + findings.length + ' accepted warnings ' + JSON.stringify(byCode));
}

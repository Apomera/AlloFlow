#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { replacements } = require('./eppp_native_quality_wave_05_data.cjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];
const reviewedAt = '2026-07-18';
const reviewWave = 'eppp-native-quality-wave-05';
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
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

const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
const originalKeyPositions = {};
for (const [id, replacement] of Object.entries(replacements)) {
  const matches = bank.filter((item) => item.id === id);
  if (matches.length !== 1) throw new Error('Expected exactly one ' + id + ' item, found ' + matches.length + '.');
  const item = matches[0];
  originalKeyPositions[id] = item.answerIndex;
  if (item.answerIndex !== replacement.answerIndex) throw new Error(id + ' key position changed; review before applying this repair.');
  Object.assign(item, replacement, {
    qaReviewedAt: reviewedAt,
    wordingReviewStatus: 'editorial-deep-rewrite-pass',
    wordingReviewWave: reviewWave,
  });
  item.choiceRationales[item.answerIndex] = item.rationale;
  if (new Set(item.choices.map((choice) => choice.toLowerCase())).size !== 4) throw new Error(id + ' choices must be distinct.');
  if (item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) throw new Error(id + ' uses an aggregate response option.');
  if (item.choices.some((choice) => extremeCuePattern.test(choice))) throw new Error(id + ' retains an asymmetric extreme cue word.');
  if (item.choiceRationales.length !== 4 || item.choiceRationales.some((feedback) => feedback.length < 100)) throw new Error(id + ' needs four extended option-specific explanations.');
  if (!item.references.length || item.references.length !== item.sourceDetails.length || item.sourceDetails.some((source) => !item.references.includes(source.url) || source.title.length < 20 || source.credibility.length < 100)) throw new Error(id + ' needs complete source provenance.');
  if (!['application', 'analysis'].includes(item.cognitiveProcess) || /^complete the statement\b/i.test(item.prompt)) throw new Error(id + ' did not receive the intended applied rewrite.');
  if (!Array.isArray(item.distractorDesign) || item.distractorDesign.length !== 3) throw new Error(id + ' needs three named adjacent-misconception designs.');
}

const auditItems = Object.keys(replacements).map((id) => {
  const item = bank.find((entry) => entry.id === id);
  return {
    id,
    domainId: item.domainId,
    difficulty: item.difficulty,
    answerIndex: item.answerIndex,
    keyPositionPreserved: item.answerIndex === originalKeyPositions[id],
    learningObjectiveId: item.learningObjectiveId,
    cognitiveProcess: item.cognitiveProcess,
    distractorDesign: item.distractorDesign,
    sourceCount: item.sourceDetails.length,
  };
});
const audit = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  scope: 'Eight priority-docket rewrites replacing cue-heavy, redundant, or direct-recall items with source-checked application and analysis scenarios using adjacent-concept distractors.',
  challengeCriteria: ['scenario-based application or analysis', 'three plausible adjacent-concept distractors', 'no extreme cue words', 'no aggregate response options', 'one defensible best answer', 'option-specific teaching feedback'],
  summary: {
    totalItems: bank.length,
    rewrittenItems: auditItems.length,
    advancedItems: auditItems.filter((item) => item.difficulty === 'advanced').length,
    appliedOrAnalysisItems: auditItems.filter((item) => ['application', 'analysis'].includes(item.cognitiveProcess)).length,
    keyPositionsPreserved: auditItems.filter((item) => item.keyPositionPreserved).length,
    aggregateResponseOptionsAdded: 0,
    optionSpecificExplanations: auditItems.length * 4,
    status: 'pass',
  },
  items: auditItems,
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};
const markdown = `# EPPP native quality repair - wave 05

Reviewed: ${reviewedAt}

## Result

- Rewrote eight high-priority items as challenging application or analysis scenarios with adjacent-concept distractors.
- Separated two redundant IPT definitions into role-transition formulation and termination-phase objectives.
- Reframed PE around imaginal and function-matched in vivo exposure, and replaced an overbroad habituation claim with avoidance reduction and new learning.
- Replaced three cue-heavy ethics definitions with applied distinctions from Standards 1.02, 3.04(a), and 3.04(b).
- Rebuilt transfer-appropriate processing and R-Optimized administration items around empirical study logic and psychometric purpose.
- Preserved all eight answer positions and the 375-per-position bank balance.
- Added 32 extended option-specific explanations and complete named-source records.
- Added no all/none-of-the-above response options.

> Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.
`;
const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFileWithRetry(sourcePath, bankJson);
writeFileWithRetry(deployPath, bankJson);
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, 'eppp_native_quality_audit_wave_05.json'), JSON.stringify(audit, null, 2) + '\n');
  writeFileWithRetry(path.join(outputRoot, 'eppp_native_quality_audit_wave_05.md'), markdown);
}
console.log('EPPP quality wave 05: rewrote 8 priority items as challenging, sourced application and analysis scenarios.');

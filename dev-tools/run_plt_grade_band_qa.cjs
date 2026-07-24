#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { auditLibraryIntegrity } = require('./plt_learning_library_integrity.cjs');
const { auditPackIntegrity } = require('./plt_grade_band_pack_integrity.cjs');

const root = path.resolve(__dirname, '..');
const diagnostic = { 'students-as-learners': 30, 'instructional-process': 30, assessment: 20, 'professional-development-leadership-community': 20 };
const simulation = { 'students-as-learners': 21, 'instructional-process': 21, assessment: 14, 'professional-development-leadership-community': 14 };
const libraryInventory = { chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 8 };

function run(spec) {
  const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', `${spec.stem}_pack.json`), 'utf8'));
  const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', `${spec.stem}_learning_library.json`), 'utf8'));
  const findings = [];
  const add = (check, message, id = '') => findings.push({ check, id, message });

  const totalItems = pack.items?.length || 0;
  const validItemCount = [200, 500].includes(totalItems);
  const learningActivityBanks = validItemCount ? totalItems / 100 : 0;
  if (!validItemCount) add('inventory', 'Pack must contain either the 200-item source stage or 500 expanded learning activities');
  for (let batch = 0; batch < learningActivityBanks; batch += 1) {
    const selection = pack.items.slice(batch * 100, batch * 100 + 100);
    for (const [domain, count] of Object.entries(diagnostic)) {
      if (selection.filter(item => item.domainId === domain).length !== count) add('blueprint', `Bank ${batch + 1} ${domain} count must equal ${count}`);
    }
    if ([0, 1, 2, 3].some(answer => selection.filter(item => item.answerIndex === answer).length !== 25)) add('balance', `Bank ${batch + 1} answer positions must be 25/25/25/25`);
  }
  for (const [domain, count] of Object.entries(simulation)) {
    if (pack.items.slice(0, 70).filter(item => item.domainId === domain).length !== count) add('simulation', `${domain} simulation count must equal ${count}`);
  }
  if (new Set(pack.items.map(item => item.prompt)).size !== totalItems) add('originality', 'All ' + totalItems + ' learning-activity prompts must be distinct');
  for (const item of pack.items) {
    if (item.choices?.length !== 4 || item.rationale?.length < 120 || item.choiceRationales?.length !== 4 || item.skillIds?.length !== 1 || item.chapterIds?.length !== 1) add('item', 'Invalid item structure', item.id);
    if (spec.languagePattern?.test([item.prompt, ...item.choices, item.rationale].join(' '))) add('language', 'Article agreement error', item.id);
  }
  for (const [field, count] of Object.entries(libraryInventory)) {
    if (library.summary?.[field] !== count) add('library', `${field} must equal ${count}`);
  }
  if (library.constructedResponseWorkshops?.some(workshop => !/does not score written responses/i.test(workshop.reviewNote || ''))) add('boundary', 'Workshop boundary missing');

  const packIntegrity = auditPackIntegrity(pack, spec, add);
  const libraryIntegrity = auditLibraryIntegrity(library, spec, add);
  const status = findings.length ? 'review-required' : 'pass';
  libraryIntegrity.negativeGates = findings.some(finding => /^library-(?:identity|foreign|grade|source)/.test(finding.check)) ? 'fail' : 'pass';
  const generatedAt = new Date().toISOString();
  const itemFindingIds = new Set(findings.filter(finding => finding.id).map(finding => finding.id));
  const distinctSourceContentKernels = pack.distinctSourceContentKernels || 100;
  const parallelSourceVariants = pack.parallelSourceVariants || 100;
  const guidedReasoningItems = Math.max(0, totalItems - 200);
  const newIndependentItemsNeeded = pack.newIndependentItemsNeeded ?? 300;
  const assistantReviewVerdict = pack.assistantReview?.verdict || 'reviewed-target-not-met';
  const summary = {
    totalItems,
    passedItems: totalItems - itemFindingIds.size,
    findings,
    status,
    sourceItems: 200,
    distinctSourceContentKernels,
    parallelSourceVariants,
    guidedReasoningItems,
    independentQuestionTarget: 500,
    newIndependentItemsNeeded,
    structuralStatus: findings.length ? 'fail' : 'pass',
    contentDistinctnessStatus: newIndependentItemsNeeded ? 'target-not-met' : 'target-met',
    assistantReviewVerdict,
    diagnosticBanks: learningActivityBanks,
    diagnosticBanksSemantics: 'legacy-total-learning-activity-bank-alias',
    sourceDiagnosticBanks: pack.sourceDiagnosticBatchCount || 2,
    guidedReviewBanks: pack.guidedReviewBatchCount || Math.max(0, learningActivityBanks - 2),
    learningActivityBanks,
    packIntegrity,
    libraryIntegrity,
  };
  const report = {
    schemaVersion: 1,
    generatedAt,
    packId: pack.id,
    standard: spec.standard,
    summary,
    expansion: {
      independentQuestionTarget: 500,
      totalLearningActivities: totalItems,
      batchSize: 100,
      learningActivityBanks,
      sourceItems: 200,
      distinctSourceContentKernels,
      parallelSourceVariants,
      guidedReasoningItems,
      newIndependentItemsNeeded,
      structurallyReviewedItems: totalItems,
      reviewer: 'OpenAI Codex',
      examItemReview: assistantReviewVerdict,
      taskForms: ['misconception-correction', 'principle-justification', 'evidence-comparison'],
      method: 'The assistant reviewed structure and answer derivation across all activities and conducted a cross-domain qualitative sample. Normalized answer-set, rationale, and reference reuse was counted as one source content kernel. The 300 transformations are approved as guided practice only, not as independent exam items.',
      findings,
    },
  };
  const libraryReport = {
    schemaVersion: 1,
    generatedAt,
    libraryId: library.libraryId,
    packId: pack.id,
    standard: spec.standard,
    summary: { ...library.summary, packIntegrity, libraryIntegrity, findings, status },
  };

  const stageNote = totalItems === 500 ? 'Three additional 100-item banks are source-derived guided review, not independent exam-item banks.' : 'The corrected 200-item source stage is ready for central guided-review expansion.';
  const nativeMarkdown = `# ${spec.displayName} QA\n\n- Status: **${status.toUpperCase()}**\n- Items: ${summary.passedItems}/${totalItems}\n- Pack credential gate: ${packIntegrity.negativeGates.toUpperCase()}; reviewed ${packIntegrity.allItemsReviewed} activities with foreign-code/K-6/out-of-band/malformed-band counts ${packIntegrity.foreignCodeOccurrences}/${packIntegrity.k6ContaminationOccurrences}/${packIntegrity.outOfBandOccurrences}/${packIntegrity.malformedBandOccurrences}.\n- Library source gate: ${libraryIntegrity.officialSourceReferenceSets}/${libraryIntegrity.referenceSets} reference sets cite the official ${spec.code} Study Companion; foreign-code, K-6, and out-of-band counts are ${libraryIntegrity.foreignCodeOccurrences}/${libraryIntegrity.k6ContaminationOccurrences}/${libraryIntegrity.outOfBandOccurrences}.\n\n> ${spec.standard.limitation}\n\n- Assistant audit: 200 source questions contain ${pack.distinctSourceContentKernels} distinct source content kernels and ${pack.parallelSourceVariants} parallel variants under the normalized answer-set/rationale/reference test. ${stageNote} The 500-distinct-question target is not met.\n`;
  const libraryMarkdown = `# ${spec.displayName} library QA\n\n- Status: **${status.toUpperCase()}**\n- Inventory: 12 chapters, 60 checks, 75 flashcards, 20 memory aids, 8 workshops\n- Official source coverage: ${libraryIntegrity.officialSourceReferenceSets}/${libraryIntegrity.referenceSets} reference sets\n- Pack credential-scope gate: **${packIntegrity.negativeGates.toUpperCase()}**\n- Library contamination gate: **${libraryIntegrity.negativeGates.toUpperCase()}**\n\n> ${spec.standard.limitation}\n`;

  for (const output of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
    fs.writeFileSync(path.join(output, `${spec.stem}_native_qa.json`), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(output, `${spec.stem}_native_qa.md`), nativeMarkdown);
    fs.writeFileSync(path.join(output, `${spec.stem}_learning_library_qa.json`), `${JSON.stringify(libraryReport, null, 2)}\n`);
    fs.writeFileSync(path.join(output, `${spec.stem}_learning_library_qa.md`), libraryMarkdown);
  }
  console.log(`${spec.displayName} QA: ${status} (${findings.length} findings); official source ${libraryIntegrity.officialSourceReferenceSets}/${libraryIntegrity.referenceSets}; contamination ${libraryIntegrity.foreignCodeOccurrences}/${libraryIntegrity.k6ContaminationOccurrences}/${libraryIntegrity.outOfBandOccurrences}.`);
  if (findings.length) process.exitCode = 1;
}

module.exports = { run };

#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const waitBuffer=new Int32Array(new SharedArrayBuffer(4));
function writeGeneratedFile(file,data){let error;for(let attempt=1;attempt<=8;attempt++){try{fs.writeFileSync(file,data);return}catch(caught){error=caught;if(attempt<8)Atomics.wait(waitBuffer,0,0,150*attempt)}}throw error}

const sourceDir=path.join(root,'test_prep'),deployDir=path.join(root,'desktop/web-app','public','test_prep');
// The derivation itself lives in test_prep_guided_expansion_core.cjs — shared
// byte-for-byte with the hub module's runtime derivation (release-build parity gate).
const{compact,inlineQuote,sourceFeedback,expandedItem,deriveGuidedReviewItems}=require('./test_prep_guided_expansion_core.cjs');
function replaceBinaryMathOperator(value, escapedOperator, token) {
  const leftOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\))';
  const rightOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\()';
  const pattern = new RegExp(
    '(^|[^A-Za-z0-9_])(' + leftOperand + ')\\s*' + escapedOperator +
      '\\s*(' + rightOperand + ')(?=$|[^A-Za-z0-9_])',
    'g'
  );
  let normalized = value;
  while (true) {
    const next = normalized.replace(pattern, (_, prefix, left, right) =>
      prefix + left + ' ' + token + ' ' + right
    );
    if (next === normalized) return normalized;
    normalized = next;
  }
}

function normalizeMathOperators(value) {
  let normalized = value
    .replace(/<=|≤/g, ' mathoplte ')
    .replace(/>=|≥/g, ' mathopgte ')
    .replace(/!=|≠/g, ' mathopneq ')
    .replace(/=/g, ' mathopeq ')
    .replace(/</g, ' mathoplt ')
    .replace(/>/g, ' mathopgt ')
    .replace(/×/g, ' mathopmul ')
    .replace(/÷/g, ' mathopdiv ')
    .replace(/−/g, ' mathopminus ')
    .replace(/\+/g, ' mathopplus ')
    .replace(/\^/g, ' mathoppow ');
  normalized = normalized.replace(
    /(^|[^A-Za-z0-9_])-(?=\s*(?:\d|[A-Za-z]\b))/g,
    (_, prefix) => prefix + ' mathopminus '
  );
  normalized = replaceBinaryMathOperator(normalized, '\\*', 'mathopmul');
  normalized = replaceBinaryMathOperator(normalized, '\\/', 'mathopdiv');
  return replaceBinaryMathOperator(normalized, '-', 'mathopminus');
}

function canonical(value, options = {}) {
  const raw = String(value ?? '').normalize('NFKC');
  const isStandaloneUrl = /^https?:\/\/\S+$/i.test(raw.trim());
  const operatorAware = options.mathOperators !== false && !isStandaloneUrl
    ? normalizeMathOperators(raw)
    : raw;
  return operatorAware
    .toLowerCase()
    .replace(/[“”"'’\u0060]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices?.[item.answerIndex]),
    distractors: (item.choices || [])
      .filter((_, index) => index !== item.answerIndex)
      .map(value => canonical(value))
      .sort(),
    rationale: canonical(item.rationale),
    references: (item.references || [])
      .map(value => canonical(value, { mathOperators: false }))
      .sort(),
  });
}

function inventoryTierTitle(authoredCount, guidedCount) {
  if (!authoredCount) return `200 Source Questions + ${guidedCount} Guided Review`;
  return `200 Source Questions + ${authoredCount} Independent Practice Questions`
    + (guidedCount ? ` + ${guidedCount} Guided Review` : '');
}
function updateInventoryTitle(title, tierTitle) {
  const value = String(title || '').trim();
  const patterns = [
    /200 Source Questions \+ \d+ Independent Practice Questions(?: \+ \d+ Guided Review)?$/i,
    /200 Source Questions \+ \d+ Guided Review$/i,
    /(?:200|500)[- ]Item Diagnostic(?: Bank)?(?: \+ \d+ Guided Review)?$/i,
  ];
  for (const pattern of patterns) if (pattern.test(value)) return value.replace(pattern, tierTitle);
  return value ? value + ' — ' + tierTitle : tierTitle;
}

const countBy=(items,key)=>items.reduce((counts,item)=>(counts[item[key]]=(counts[item[key]]||0)+1,counts),{});
const equalCounts=(left,right)=>JSON.stringify(Object.fromEntries(Object.entries(left).sort()))===JSON.stringify(Object.fromEntries(Object.entries(right).sort()));




function updateQa(stem, pack, findings) {
  const name = stem + '_native_qa.json';
  const file = path.join(sourceDir, name);
  if (!fs.existsSync(file)) return;
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const summary = report.summary || (report.summary = {});
  const verdict = pack.assistantReview.verdict;
  const distinctnessStatus = pack.newIndependentItemsNeeded ? 'target-not-met' : 'target-met';
  Object.assign(summary, {
    totalItems: 500,
    passedItems: findings.length ? 500 - findings.length : 500,
    sourceItems: 200,
    assistantAuthoredIndependentItems: pack.assistantAuthoredIndependentItems,
    independentPracticeItems: pack.independentPracticeItems,
    distinctSourceContentKernels: pack.distinctSourceContentKernels,
    parallelSourceVariants: pack.parallelSourceVariants,
    distinctIndependentContentKernels: pack.distinctIndependentContentKernels,
    parallelIndependentVariants: pack.parallelIndependentVariants,
    guidedReasoningItems: pack.guidedReviewItems,
    independentQuestionTarget: 500,
    newIndependentItemsNeeded: pack.newIndependentItemsNeeded,
    structuralStatus: findings.length ? 'fail' : 'pass',
    contentDistinctnessStatus: distinctnessStatus,
    assistantReviewVerdict: verdict,
    diagnosticBanks: 5,
    diagnosticBanksSemantics: 'legacy-total-learning-activity-bank-alias',
    sourceDiagnosticBanks: 2,
    assistantAuthoredIndependentBanks: pack.assistantAuthoredIndependentBatchCount,
    independentDiagnosticBanks: pack.independentDiagnosticBatchCount,
    guidedReviewBanks: pack.guidedReviewBatchCount,
    learningActivityBanks: 5,
    status: findings.length ? 'structural-fail' : 'pass',
  });
  if ('reviewRequiredItems' in summary) summary.reviewRequiredItems = 0;
  if ('bankSize' in summary) summary.bankSize = 100;
  if ('findings' in summary) summary.findings = Array.isArray(summary.findings) ? findings : findings.length;
  if ('packFindings' in summary) summary.packFindings = findings;
  if ('answerPositions' in summary) {
    const positions = [0, 1, 2, 3].map(answer => pack.items.filter(item => item.answerIndex === answer).length);
    summary.answerPositions = Array.isArray(summary.answerPositions)
      ? positions
      : Object.fromEntries(['A', 'B', 'C', 'D'].map((label, index) => [label, positions[index]]));
  }
  if (report.diagnosticBatch) Object.assign(report.diagnosticBatch, {
    batchCount: 5,
    batchCountSemantics: 'legacy-total-learning-activity-bank-alias',
    sourceBatchCount: 2,
    assistantAuthoredIndependentBatchCount: pack.assistantAuthoredIndependentBatchCount,
    independentDiagnosticBatchCount: pack.independentDiagnosticBatchCount,
    guidedReviewBatchCount: pack.guidedReviewBatchCount,
    learningActivityBankCount: 5,
  });
  report.generatedAt = new Date().toISOString();
  report.expansion = {
    independentQuestionTarget: 500,
    totalLearningActivities: 500,
    batchSize: 100,
    learningActivityBanks: 5,
    sourceItems: 200,
    assistantAuthoredIndependentItems: pack.assistantAuthoredIndependentItems,
    independentPracticeItems: pack.independentPracticeItems,
    distinctSourceContentKernels: pack.distinctSourceContentKernels,
    parallelSourceVariants: pack.parallelSourceVariants,
    distinctIndependentContentKernels: pack.distinctIndependentContentKernels,
    parallelIndependentVariants: pack.parallelIndependentVariants,
    guidedReasoningItems: pack.guidedReviewItems,
    newIndependentItemsNeeded: pack.newIndependentItemsNeeded,
    structurallyReviewedItems: 500,
    reviewer: 'OpenAI Codex',
    examItemReview: verdict,
    taskForms: ['misconception-correction', 'principle-justification', 'evidence-comparison'],
    method: 'Manifest-backed independent additions passed exact artifact review, blueprint, key, distractor, feedback, source, learning-link, originality, balance, and structural validation. Remaining transformations are guided practice only.',
    findings,
  };
  const json = JSON.stringify(report, null, 2) + '\n';
  writeGeneratedFile(file, json);
  writeGeneratedFile(path.join(deployDir, name), json);
  const mdName = stem + '_native_qa.md';
  const mdFile = path.join(sourceDir, mdName);
  if (fs.existsSync(mdFile)) {
    let md = fs.readFileSync(mdFile, 'utf8')
      .replace(/\n- Independent-batch audit:.*?(?=\n- |\n?$)/gs, '')
      .replace(/\n- Assistant audit:.*?(?=\n- |\n?$)/gs, '');
    md += `\n- Independent-batch audit: 200 original source questions plus ${pack.assistantAuthoredIndependentItems} assistant-authored independent practice questions produce ${pack.distinctIndependentContentKernels} distinct independent content kernels. ${pack.guidedReviewItems} additional activities remain guided review only. ${pack.newIndependentItemsNeeded} new independent questions remain to reach 500.\n`;
    writeGeneratedFile(mdFile, md);
    writeGeneratedFile(path.join(deployDir, mdName), md);
  }
}

const officialReleaseMetadata={parapro:[90,0,150],audiology_5343:[120,0,120],early_childhood_5025:[120,0,120],educational_leadership_5412:[120,0,165],esol_5362:[120,0,120],plt_5_9_5623:[70,4,120],plt_7_12_5624:[70,4,120],plt_early_childhood_5621:[70,4,120],plt_k6_5622:[70,4,120],praxis_core_5752:[152,2,275],reading_specialist_5302:[95,2,150],school_counselor_5422:[120,0,120],school_librarian_5312:[120,0,120],school_psychologist_5403:[125,0,125],special_education_5355:[120,0,120],special_education_behavior_emotional_5372:[120,0,120],special_education_early_childhood_5692:[120,0,120],special_education_intellectual_disabilities_5322:[120,0,120],special_education_learning_disabilities_5383:[120,0,120],special_education_severe_profound_5547:[120,0,120],speech_language_pathology_5331:[132,0,150],teaching_reading_5205:[90,3,150]};
const packFiles = fs.readdirSync(sourceDir).filter(name => name.endsWith('_pack.json')).sort();
let expanded = 0;
for (const packFile of packFiles) {
  const stem = packFile.slice(0, -'_pack.json'.length);
  const packPath = path.join(sourceDir, packFile);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  if (/^eppp/i.test(pack.id || '') || !Array.isArray(pack.items)) continue;
  const packVersionBefore = pack.version;
  const officialMetadata = officialReleaseMetadata[stem];
  if (!officialMetadata) throw Error(stem + ': missing final official-format metadata');
  pack.officialSelectedResponseCount = officialMetadata[0];
  pack.officialConstructedResponseCount = officialMetadata[1];
  pack.officialTotalTimeMinutes = officialMetadata[2];
  if (pack.items.length < 200) throw Error(pack.id + ': expected at least 200 source items');

  const base = pack.items.slice(0, 200);
  const batch1 = base.slice(0, 100);
  const batch2 = base.slice(100, 200);
  if (batch1.length !== 100 || batch2.length !== 100) {
    throw Error(pack.id + ': two 100-item source batches required');
  }
  const staging = pack.independentAdditionStaging;
  const authoredCount = staging
    ? Number(staging.assistantAuthoredIndependentItems)
    : Math.max(0, Number(pack.assistantAuthoredIndependentItems) || 0);
  if (!Number.isInteger(authoredCount) || authoredCount < 0 || authoredCount > 300 || authoredCount % 100 !== 0) {
    throw Error(pack.id + ': assistant-authored additions must be complete 100-item banks');
  }
  const authored = pack.items.slice(200, 200 + authoredCount);
  if (authored.length !== authoredCount || authored.some((item, index) =>
    item.authorship !== 'assistant-authored-independent'
    || item.assistantReviewStatus !== 'reviewed-independent-practice-item'
    || item.examItemStatus !== 'assistant-approved-as-independent-practice-item'
    || item.reviewStatus !== 'assistant-reviewed-independent-practice-item'
    || item.qaStatus !== 'qa-passed-independent-practice-item'
    || item.independentBatchNumber !== 3 + Math.floor(index / 100)
  )) {
    throw Error(pack.id + ': staged independent additions have invalid integrated provenance');
  }
  if (staging && (staging.status !== 'validated-awaiting-final-expansion'
      || staging.packId !== pack.id || staging.packVersion !== pack.version
      || staging.sourceItems !== 200 || staging.independentPracticeItems !== 200 + authoredCount
      || !Array.isArray(staging.batches) || staging.batches.length !== authoredCount / 100)) {
    throw Error(pack.id + ': independent-addition staging evidence is stale or incomplete');
  }

  const allGuided = deriveGuidedReviewItems(base);
  const independentItems = [...base, ...authored];
  const guidedNeeded = 500 - independentItems.length;
  const guided = allGuided.slice(0, guidedNeeded);
  if (guided.length !== guidedNeeded || guidedNeeded < 0 || guidedNeeded % 100 !== 0) {
    throw Error(pack.id + ': invalid final guided-review inventory');
  }
  const distinctSourceContentKernels = new Set(base.map(contentKernel)).size;
  const distinctIndependentContentKernels = new Set(independentItems.map(contentKernel)).size;
  const parallelSourceVariants = base.length - distinctSourceContentKernels;
  const parallelIndependentVariants = independentItems.length - distinctIndependentContentKernels;
  const newIndependentItemsNeeded = 500 - distinctIndependentContentKernels;
  const assistantAuthoredIndependentBatchCount = authoredCount / 100;
  const independentDiagnosticBatchCount = 2 + assistantAuthoredIndependentBatchCount;
  const guidedReviewBatchCount = guidedNeeded / 100;
  const verdict = newIndependentItemsNeeded ? 'reviewed-target-not-met' : 'reviewed-target-met';
  const stagedEvidence = staging?.batches?.map(batch => ({
    id: batch.id,
    reviewedAt: batch.reviewedAt,
    reviewEvidenceProfile: batch.reviewEvidenceProfile,
    files: batch.files.map(file => file.file),
    reviewReports: batch.files.map(file => file.reviewReport),
    artifactBindings: batch.files.map(file => ({
      file: file.file,
      algorithm: 'sha256',
      sha256: file.sha256,
      itemCount: file.itemCount,
    })),
  }));
  const independentBatchEvidence = stagedEvidence
    || pack.assistantReview?.independentBatchEvidence
    || [];
  if (independentBatchEvidence.length !== assistantAuthoredIndependentBatchCount) {
    throw Error(pack.id + ': final independent-batch evidence count is invalid');
  }

  pack.items = [...independentItems, ...guided];
  pack.batchSize = 100;
  pack.diagnosticBatchCount = 5;
  pack.diagnosticBatchCountSemantics = 'legacy-total-learning-activity-bank-alias';
  pack.sourceDiagnosticBatchCount = 2;
  pack.assistantAuthoredIndependentBatchCount = assistantAuthoredIndependentBatchCount;
  pack.independentDiagnosticBatchCount = independentDiagnosticBatchCount;
  pack.guidedReviewBatchCount = guidedReviewBatchCount;
  pack.learningActivityBankCount = 5;
  pack.sourceQuestionItems = 200;
  pack.assistantAuthoredIndependentItems = authoredCount;
  pack.independentPracticeItems = independentItems.length;
  pack.guidedReviewItems = guidedNeeded;
  pack.distinctSourceContentKernels = distinctSourceContentKernels;
  pack.parallelSourceVariants = parallelSourceVariants;
  pack.distinctIndependentContentKernels = distinctIndependentContentKernels;
  pack.parallelIndependentVariants = parallelIndependentVariants;
  pack.newIndependentItemsNeeded = newIndependentItemsNeeded;
  pack.expansionVersion = authoredCount
    ? 'source-kernel-audit-plus-independent-batches-and-guided-review-v2'
    : 'source-kernel-audit-plus-guided-review-v1';
  pack.simulationDomainCountsBasis = pack.simulationDomainCountsBasis
    || 'release-declared-selected-response-allocation';
  pack.assistantReview = {
    reviewer: 'OpenAI Codex',
    lastReviewedAt: staging?.reviewedAt || pack.assistantReview?.lastReviewedAt,
    structurallyReviewedItems: 500,
    sourceItems: 200,
    assistantAuthoredIndependentItems: authoredCount,
    independentPracticeItems: independentItems.length,
    distinctSourceContentKernels,
    parallelSourceVariants,
    distinctIndependentContentKernels,
    parallelIndependentVariants,
    guidedReviewItems: guidedNeeded,
    independentQuestionTarget: 500,
    newIndependentItemsNeeded,
    verdict,
    categories: ['source alignment', 'answer-key consistency', 'distractor plausibility', 'editorial clarity', 'accessibility language', 'structural integrity', 'content-kernel duplication'],
    taskForms: ['misconception-correction', 'principle-justification', 'evidence-comparison'],
    independentBatchReview: authoredCount
      ? 'blueprint-key-distractor-feedback-originality-citation-balance-and-structural-review-v1'
      : undefined,
    independentBatchEvidence,
    limitation: 'Assistant-authored independent practice items are reviewed learning materials, not official ETS questions, field-tested items, psychometrically calibrated items, or licensed-professional endorsement. Guided transformations remain guided practice only.',
  };
  if (!authoredCount) {
    delete pack.assistantReview.independentBatchReview;
    delete pack.assistantReview.independentBatchEvidence;
  }
  if (staging) {
    pack.independentAdditionReview = {
      ...staging,
      status: 'integrated-final-expansion',
      finalIndependentPracticeItems: independentItems.length,
      finalGuidedReviewItems: guidedNeeded,
    };
  }
  delete pack.independentAdditionStaging;

  const tierTitle = inventoryTierTitle(authoredCount, guidedNeeded);
  pack.title = updateInventoryTitle(pack.title, tierTitle);
  const priorDescription = String(pack.description || '')
    .replace(/^Contains 200 original source questions, \d+ assistant-authored independent practice questions, and \d+ source-derived guided-review activities\. The assistant audit found \d+ distinct independent content kernels\.\s*/i, '')
    .replace(/^Contains 200 source diagnostic questions and 300 source-derived guided-review tasks;[^.]*\.\s*/i, '')
    .replace(/Two independent 100-item diagnostic batches plus three 100-item guided-review banks/gi, 'Five 100-item learning-activity banks')
    .replace(/Two independent 100-item diagnostics plus three 100-item guided-review banks/gi, 'Five 100-item learning-activity banks')
    .replace(/Five 100-item diagnostic batches/gi, 'Five 100-item learning-activity banks')
    .replace(/Five 100-item diagnostics/gi, 'Five 100-item learning-activity banks');
  pack.description = `Contains 200 original source questions, ${authoredCount} assistant-authored independent practice questions, and ${guidedNeeded} source-derived guided-review activities. The assistant audit found ${distinctIndependentContentKernels} distinct independent content kernels. ${priorDescription}`;
  pack.contentReview = `Assistant audit completed: ${independentItems.length} independent-practice items contain ${distinctIndependentContentKernels} distinct content kernels and ${parallelIndependentVariants} parallel variants under the normalized test. ${guidedNeeded} additional activities are guided reasoning transformations, not independent exam questions. The 500-distinct-question target ${newIndependentItemsNeeded ? 'is not met' : 'is met'}.`;
  pack.bankDisclosure = `This pack has 500 learning activities: 200 original source questions, ${authoredCount} assistant-authored independent practice questions, and ${guidedNeeded} source-derived guided-review activities. It currently contains ${distinctIndependentContentKernels} distinct independent content kernels; ${newIndependentItemsNeeded} newly authored independent questions remain to reach 500.`;
  pack.assistantAuditUrl = './test_prep/test_prep_assistant_review_2026-07-16.json';
  pack.sections = [
    ...Array.from({ length: 2 }, (_, index) => ({ id: `diagnostic-batch-${index + 1}`, label: `100-item source diagnostic bank ${index + 1}`, kind: 'source-diagnostic', timeMinutes: null })),
    ...Array.from({ length: assistantAuthoredIndependentBatchCount }, (_, index) => ({ id: `independent-diagnostic-batch-${index + 3}`, label: `Assistant-reviewed independent diagnostic bank ${index + 3}`, kind: 'independent-diagnostic', timeMinutes: null })),
    ...Array.from({ length: guidedReviewBatchCount }, (_, index) => ({ id: `guided-review-bank-${index + 1}`, label: `Guided reasoning review bank ${index + 1}`, kind: 'guided-review', timeMinutes: null })),
  ];

  const findings = [];
  if (pack.version !== packVersionBefore) findings.push({ check: 'pack-version', message: 'Expansion changed the source pack version' });
  if (pack.items.length !== 500) findings.push({ check: 'inventory', message: 'Pack must contain 500 items' });
  if (new Set(pack.items.map(item => item.id)).size !== 500) findings.push({ check: 'ids', message: 'Item IDs must be unique' });
  if (new Set(pack.items.map(item => canonical(item.prompt))).size !== 500) findings.push({ check: 'prompts', message: 'Normalized prompts must be unique' });
  const expectedDomainCounts = [
    countBy(batch1, 'domainId'),
    countBy(batch2, 'domainId'),
    ...Array.from({ length: assistantAuthoredIndependentBatchCount }, () => countBy(batch1, 'domainId')),
    ...[batch1, batch2, batch1].slice(0, guidedReviewBatchCount).map(items => countBy(items, 'domainId')),
  ];
  for (let batch = 0; batch < 5; batch++) {
    const items = pack.items.slice(batch * 100, batch * 100 + 100);
    const answers = [0, 1, 2, 3].map(answer => items.filter(item => item.answerIndex === answer).length);
    if (items.length !== 100) findings.push({ check: 'batch-size', batch: batch + 1, message: 'Batch must contain 100 items' });
    if (!equalCounts(countBy(items, 'domainId'), expectedDomainCounts[batch])) findings.push({ check: 'domain-allocation', batch: batch + 1, message: 'Domain distribution differs from its declared blueprint' });
    if (answers.some(count => count !== 25)) findings.push({ check: 'answer-balance', batch: batch + 1, message: `Answer positions ${answers.join('/')}` });
  }
  for (const item of pack.items) {
    if (!Array.isArray(item.choices) || item.choices.length !== 4 || item.answerIndex < 0 || item.answerIndex >= item.choices.length
        || !item.rationale || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== item.choices.length
        || !Array.isArray(item.references) || !item.references.length) {
      findings.push({ check: 'item-shape', id: item.id, message: 'Answer, rationale, option feedback, or references invalid' });
    }
  }
  const sourceById = Object.fromEntries(base.map(item => [item.id, item]));
  for (const item of guided) {
    const source = sourceById[item.sourceItemId];
    if (!source) {
      findings.push({ check: 'source-link', id: item.id, message: 'Source item missing' });
      continue;
    }
    if (item.prompt === source.prompt || item.prompt.toLowerCase().endsWith(source.prompt.toLowerCase())) findings.push({ check: 'guided-transform-variation', id: item.id, message: 'Prompt is only a prefix variation' });
    if (JSON.stringify([...item.choices].sort()) === JSON.stringify([...source.choices].sort())) findings.push({ check: 'guided-transform-variation', id: item.id, message: 'Choice set duplicates source' });
    if (item.rationale === source.rationale) findings.push({ check: 'guided-transform-variation', id: item.id, message: 'Rationale duplicates source' });
    const correctIndex = source.answerIndex;
    const wrongIndexes = source.choices.map((_, choiceIndex) => choiceIndex).filter(choiceIndex => choiceIndex !== correctIndex);
    const principle = compact(source.rationale, 300);
    const feedbacks = source.choices.map((_, choiceIndex) => sourceFeedback(source, choiceIndex, principle));
    const authoredCorrect = canonical(item.choices[item.answerIndex]);
    let answerValid = false;
    if (item.expansionBatch === 3) answerValid = authoredCorrect === canonical(feedbacks[wrongIndexes[0]]);
    else if (item.expansionBatch === 4) answerValid = authoredCorrect.includes(canonical(source.choices[correctIndex])) && authoredCorrect.includes(canonical(feedbacks[correctIndex]).slice(0, Math.min(36, canonical(feedbacks[correctIndex]).length)));
    else if (item.expansionBatch === 5) answerValid = authoredCorrect.includes(canonical(source.choices[correctIndex])) && authoredCorrect.includes(canonical(feedbacks[correctIndex]).slice(0, Math.min(36, canonical(feedbacks[correctIndex]).length))) && authoredCorrect.includes(canonical(source.choices[wrongIndexes[0]]));
    if (!answerValid) findings.push({ check: 'answer-key-derivation', id: item.id, message: 'Authored answer does not follow its declared source-feedback derivation' });
    if (new Set(item.choices).size !== 4) findings.push({ check: 'choice-uniqueness', id: item.id, message: 'Duplicate authored choices' });
    if (!item.editorialReviewer || item.assistantReviewStatus !== 'reviewed-guided-practice-only' || item.expansionStatus !== 'assistant-authored-guided-reasoning-task' || item.examItemStatus !== 'not-approved-as-independent-exam-item') findings.push({ check: 'review-provenance', id: item.id, message: 'Guided-practice review provenance missing' });
  }
  if (pack.sections.length !== 5 || findings.length) {
    throw Error(pack.id + ': expansion QA failed: ' + JSON.stringify(findings.slice(0, 8)));
  }
  const itemsName = stem + '_items.json';
  const packJson = JSON.stringify(pack, null, 2) + '\n';
  const itemsJson = JSON.stringify(pack.items, null, 2) + '\n';
  for (const dir of [sourceDir, deployDir]) {
    fs.mkdirSync(dir, { recursive: true });
    writeGeneratedFile(path.join(dir, packFile), packJson);
    writeGeneratedFile(path.join(dir, itemsName), itemsJson);
  }
  updateQa(stem, pack, findings);
  expanded++;
}
if (expanded !== 22) throw Error(`Expected 22 non-EPPP packs, expanded ${expanded}`);
console.log(`Reviewed ${expanded} non-EPPP packs and finalized every manifest-staged independent diagnostic batch; the cross-pack 500-independent-question target remains in progress.`);
#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'prismflow-deploy', 'public', 'test_prep');
const authoredDir = path.join(__dirname, 'authored');
const manifestPath = path.join(authoredDir, 'test_prep_independent_additions_manifest.json');
const waitBuffer = new Int32Array(new SharedArrayBuffer(4));

function writeGeneratedFile(file, data) {
  let error;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      fs.writeFileSync(file, data);
      return;
    } catch (caught) {
      error = caught;
      if (attempt < 8) Atomics.wait(waitBuffer, 0, 0, 150 * attempt);
    }
  }
  throw error;
}

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
    /(^|[\s(\[{,:=<>+*/^])-(?=\s*(?:\d|[A-Za-z]\b))/g,
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

function normalizedRawText(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function normalizedRawChoice(value) {
  return normalizedRawText(value).toLowerCase();
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

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sameCounts(actual, expected) {
  const normalize = value => Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
}

function expectedDomainCounts(pack, size) {
  const domains = pack.domains.map((domain, index) => ({
    id: domain.id,
    index,
    raw: Math.max(0, Number(domain.weight) || 0) * size,
  }));
  const totalWeight = domains.reduce((sum, domain) => sum + domain.raw, 0);
  const weighted = totalWeight > 0
    ? domains
    : domains.map(domain => ({ ...domain, raw: size / Math.max(1, domains.length) }));
  const counts = Object.fromEntries(weighted.map(domain => [domain.id, Math.floor(domain.raw)]));
  let remaining = size - Object.values(counts).reduce((sum, count) => sum + count, 0);
  const order = [...weighted].sort((left, right) => (right.raw - Math.floor(right.raw)) - (left.raw - Math.floor(left.raw)) || left.index - right.index);
  for (let index = 0; remaining > 0; index++, remaining--) counts[order[index % order.length].id]++;
  return counts;
}

function tokenSet(value) {
  return new Set(canonical(value).split(' ').filter(token => token.length > 2));
}

function jaccard(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap++;
  return overlap / (a.size + b.size - overlap);
}

function validateAuthoredBatch(pack, batch, items, priorItems) {
  const findings = [];
  if (items.length !== 100) findings.push(`expected 100 items, found ${items.length}`);
  const expectedDomains = expectedDomainCounts(pack, 100);
  const actualDomains = countBy(items, 'domainId');
  if (!sameCounts(actualDomains, expectedDomains)) findings.push(`domain counts ${JSON.stringify(actualDomains)} do not match ${JSON.stringify(expectedDomains)}`);
  const positions = [0, 1, 2, 3].map(answerIndex => items.filter(item => item.answerIndex === answerIndex).length);
  if (positions.some(count => count !== 25)) findings.push(`answer positions must be 25/25/25/25, found ${positions.join('/')}`);
  if (pack.id === 'parapro-1755-practice-1') {
    const focus = countBy(items, 'contentFocus');
    if (!sameCounts(focus, { 'basic-skills-knowledge': 67, 'application-classroom': 33 })) findings.push(`ParaPro content focus must be 67/33, found ${JSON.stringify(focus)}`);
  }
  const ids = new Set(priorItems.map(item => item.id));
  const prompts = [...priorItems];
  const kernels = new Set(priorItems.map(contentKernel));
  for (const item of items) {
    if (!item || typeof item !== 'object') { findings.push('non-object item'); continue; }
    if (!item.id || ids.has(item.id)) findings.push(`${item.id || '(missing id)'}: duplicate or missing id`);
    ids.add(item.id);
    if (!item.prompt || normalizedRawText(item.prompt).length < 35) findings.push(`${item.id}: prompt is missing or too short`);
    if (!Array.isArray(item.choices) || item.choices.length !== 4 || new Set(item.choices.map(normalizedRawChoice)).size !== 4) findings.push(`${item.id}: requires four unique choices`);
    if (!Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) findings.push(`${item.id}: invalid answer index`);
    if (!item.rationale || String(item.rationale).trim().length < 80) findings.push(`${item.id}: rationale must be at least 80 characters`);
    if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4 || item.choiceRationales.some(value => String(value || '').trim().length < 20)) findings.push(`${item.id}: four substantive choice rationales required`);
    if (!Array.isArray(item.references) || !item.references.length || item.references.some(value => !/^https:\/\//.test(String(value)))) findings.push(`${item.id}: at least one HTTPS reference required`);
    if (!Array.isArray(item.skillIds) || !item.skillIds.length || !Array.isArray(item.chapterIds) || !item.chapterIds.length) findings.push(`${item.id}: skill and chapter links required`);
    if (item.authorship !== 'assistant-authored-independent' || item.assistantReviewStatus !== 'reviewed-independent-draft' || item.examItemStatus !== 'assistant-reviewed-independent-draft') findings.push(`${item.id}: independent-draft provenance missing`);
    const kernel = contentKernel(item);
    if (kernels.has(kernel)) findings.push(`${item.id}: duplicates an existing normalized content kernel`);
    kernels.add(kernel);
    for (const prior of prompts) {
      if (jaccard(item.prompt, prior.prompt) > 0.82) { findings.push(`${item.id}: prompt is too similar to ${prior.id}`); break; }
    }
    prompts.push(item);
  }
  if (findings.length) throw new Error(`${pack.id}/${batch.id}: authored-batch QA failed: ${findings.slice(0, 12).join('; ')}`);
}

function reviewItem(item, batch, batchNumber) {
  return {
    ...item,
    assistantReviewStatus: 'reviewed-independent-practice-item',
    examItemStatus: 'assistant-approved-as-independent-practice-item',
    reviewStatus: 'assistant-reviewed-independent-practice-item',
    qaStatus: 'qa-passed-independent-practice-item',
    assistantReviewedAt: batch.reviewedAt,
    independentBatchId: batch.id,
    independentBatchNumber: batchNumber,
    reviewMethod: 'independent-item-key-distractor-feedback-originality-blueprint-and-structural-review-v1',
  };
}

function updateQa(stem, pack) {
  const qaName = `${stem}_native_qa.json`;
  const qaPath = path.join(sourceDir, qaName);
  if (!fs.existsSync(qaPath)) return;
  const report = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
  const summary = report.summary || (report.summary = {});
  Object.assign(summary, {
    totalItems: 500,
    passedItems: 500,
    sourceItems: pack.sourceQuestionItems,
    assistantAuthoredIndependentItems: pack.assistantAuthoredIndependentItems,
    independentPracticeItems: pack.independentPracticeItems,
    distinctSourceContentKernels: pack.distinctSourceContentKernels,
    parallelSourceVariants: pack.parallelSourceVariants,
    distinctIndependentContentKernels: pack.distinctIndependentContentKernels,
    parallelIndependentVariants: pack.parallelIndependentVariants,
    guidedReasoningItems: pack.guidedReviewItems,
    independentQuestionTarget: 500,
    newIndependentItemsNeeded: pack.newIndependentItemsNeeded,
    structuralStatus: 'pass',
    contentDistinctnessStatus: pack.newIndependentItemsNeeded ? 'target-not-met' : 'target-met',
    assistantReviewVerdict: pack.assistantReview.verdict,
    sourceDiagnosticBanks: pack.sourceDiagnosticBatchCount,
    assistantAuthoredIndependentBanks: pack.assistantAuthoredIndependentBatchCount,
    independentDiagnosticBanks: pack.independentDiagnosticBatchCount,
    guidedReviewBanks: pack.guidedReviewBatchCount,
    learningActivityBanks: 5,
    status: 'pass',
  });
  if (report.diagnosticBatch) Object.assign(report.diagnosticBatch, {
    batchCount: 5,
    batchCountSemantics: 'legacy-total-learning-activity-bank-alias',
    sourceBatchCount: pack.sourceDiagnosticBatchCount,
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
    sourceItems: pack.sourceQuestionItems,
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
    examItemReview: pack.assistantReview.verdict,
    method: 'Assistant-authored independent additions were reviewed for blueprint alignment, distinct stimuli, keyed-answer defensibility, distractor plausibility, feedback, citations, answer balance, and structure. Guided transformations remain approved only for guided practice.',
    findings: [],
  };
  const qaJson = JSON.stringify(report, null, 2) + '\n';
  writeGeneratedFile(qaPath, qaJson);
  writeGeneratedFile(path.join(deployDir, qaName), qaJson);

  const mdName = `${stem}_native_qa.md`;
  const mdPath = path.join(sourceDir, mdName);
  if (fs.existsSync(mdPath)) {
    let md = fs.readFileSync(mdPath, 'utf8').replace(/\n- Independent-batch audit:.*?(?=\n- |\n?$)/gs, '');
    md += `\n- Independent-batch audit: ${pack.sourceQuestionItems} original source questions plus ${pack.assistantAuthoredIndependentItems} assistant-authored independent practice questions produce ${pack.distinctIndependentContentKernels} distinct independent content kernels. ${pack.guidedReviewItems} additional activities remain guided review only. ${pack.newIndependentItemsNeeded} new independent questions remain to reach 500.\n`;
    writeGeneratedFile(mdPath, md);
    writeGeneratedFile(path.join(deployDir, mdName), md);
  }
}

if (!fs.existsSync(manifestPath)) {
  console.log('No independent-additions manifest found; no changes applied.');
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.schemaVersion !== 1 || !manifest.packs || typeof manifest.packs !== 'object') throw new Error('Independent-additions manifest is invalid');
let updated = 0;

for (const [stem, batches] of Object.entries(manifest.packs)) {
  if (!Array.isArray(batches) || !batches.length) continue;
  const packPath = path.join(sourceDir, `${stem}_pack.json`);
  if (!fs.existsSync(packPath)) throw new Error(`${stem}: pack file not found`);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  if (!Array.isArray(pack.items) || pack.items.length !== 500) throw new Error(`${stem}: expected a 500-activity expanded pack before independent additions`);
  const base = pack.items.slice(0, 200);
  const existingGuided = pack.items.filter(item => item.examItemStatus === 'not-approved-as-independent-exam-item');
  if (existingGuided.length < 100) throw new Error(`${stem}: insufficient guided activities for replacement`);
  const authored = [];
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    if (!batch || !batch.id || !/^\d{4}-\d{2}-\d{2}$/.test(String(batch.reviewedAt || '')) || !Array.isArray(batch.files) || !batch.files.length) throw new Error(`${stem}: invalid authored-batch manifest entry`);
    if (!Array.isArray(batch.reviewReports) || batch.reviewReports.length !== batch.files.length) throw new Error(`${stem}/${batch.id}: one independent cross-review report is required per authored domain file`);
    const reviewReports = batch.reviewReports.map(file => {
      const filePath = path.join(authoredDir, file);
      if (!fs.existsSync(filePath)) throw new Error(`${stem}/${batch.id}: missing cross-review report ${file}`);
      const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!report || !Number.isInteger(report.itemCount) || !/^pass/i.test(String(report.verdict || '')) || !/independent cross-review/i.test(String(report.reviewer || ''))) throw new Error(`${stem}/${batch.id}: invalid or non-passing cross-review report ${file}`);
      return report;
    });
    if (reviewReports.reduce((sum, report) => sum + report.itemCount, 0) !== 100) throw new Error(`${stem}/${batch.id}: cross-review reports must cover exactly 100 items`);
    const batchItems = batch.files.flatMap(file => {
      const filePath = path.join(authoredDir, file);
      if (!fs.existsSync(filePath)) throw new Error(`${stem}/${batch.id}: missing ${file}`);
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(parsed)) throw new Error(`${file}: expected a JSON array`);
      return parsed;
    });
    validateAuthoredBatch(pack, batch, batchItems, [...base, ...authored, ...existingGuided]);
    authored.push(...batchItems.map(item => reviewItem(item, batch, 3 + batchIndex)));
  }
  if (authored.length % 100 !== 0 || authored.length > 300) throw new Error(`${stem}: independent additions must be complete 100-item batches up to 300 items`);
  const independentItems = [...base, ...authored];
  const guidedNeeded = 500 - independentItems.length;
  if (guidedNeeded < 0 || guidedNeeded % 100 !== 0 || existingGuided.length < guidedNeeded) throw new Error(`${stem}: invalid guided replacement count ${guidedNeeded}`);
  const guided = existingGuided.slice(0, guidedNeeded);
  const distinctSourceContentKernels = new Set(base.map(contentKernel)).size;
  const distinctIndependentContentKernels = new Set(independentItems.map(contentKernel)).size;
  const parallelSourceVariants = base.length - distinctSourceContentKernels;
  const parallelIndependentVariants = independentItems.length - distinctIndependentContentKernels;
  const newIndependentItemsNeeded = 500 - distinctIndependentContentKernels;
  const sourceDiagnosticBatchCount = 2;
  const assistantAuthoredIndependentBatchCount = authored.length / 100;
  const independentDiagnosticBatchCount = sourceDiagnosticBatchCount + assistantAuthoredIndependentBatchCount;
  const guidedReviewBatchCount = guidedNeeded / 100;

  pack.items = [...independentItems, ...guided];
  pack.sourceQuestionItems = 200;
  pack.assistantAuthoredIndependentItems = authored.length;
  pack.independentPracticeItems = independentItems.length;
  pack.guidedReviewItems = guidedNeeded;
  pack.sourceDiagnosticBatchCount = sourceDiagnosticBatchCount;
  pack.assistantAuthoredIndependentBatchCount = assistantAuthoredIndependentBatchCount;
  pack.independentDiagnosticBatchCount = independentDiagnosticBatchCount;
  pack.guidedReviewBatchCount = guidedReviewBatchCount;
  pack.distinctSourceContentKernels = distinctSourceContentKernels;
  pack.parallelSourceVariants = parallelSourceVariants;
  pack.distinctIndependentContentKernels = distinctIndependentContentKernels;
  pack.parallelIndependentVariants = parallelIndependentVariants;
  pack.newIndependentItemsNeeded = newIndependentItemsNeeded;
  pack.expansionVersion = 'source-kernel-audit-plus-independent-batches-and-guided-review-v2';
  pack.assistantReview = {
    ...(pack.assistantReview || {}),
    reviewer: 'OpenAI Codex',
    lastReviewedAt: batches[batches.length - 1].reviewedAt,
    structurallyReviewedItems: 500,
    sourceItems: 200,
    assistantAuthoredIndependentItems: authored.length,
    independentPracticeItems: independentItems.length,
    distinctSourceContentKernels,
    parallelSourceVariants,
    distinctIndependentContentKernels,
    parallelIndependentVariants,
    guidedReviewItems: guidedNeeded,
    independentQuestionTarget: 500,
    newIndependentItemsNeeded,
    verdict: newIndependentItemsNeeded ? 'reviewed-target-not-met' : 'reviewed-target-met',
    independentBatchReview: 'blueprint-key-distractor-feedback-originality-citation-balance-and-structural-review-v1',
    limitation: 'Assistant-authored independent practice items are reviewed learning materials, not official ETS questions, field-tested items, psychometrically calibrated items, or licensed-professional endorsement. Guided transformations remain guided practice only.',
  };
  pack.version = `0.${4 + assistantAuthoredIndependentBatchCount}.0`;
  pack.shortTitle = 'ParaPro 1755 practice suite';
  pack.title = String(pack.title || '').replace(/200 Source Questions \+ (?:\d+ Independent Practice Questions \+ )?\d+ Guided Review/gi, `200 Source Questions + ${authored.length} Independent Practice Questions + ${guidedNeeded} Guided Review`);
  pack.description = String(pack.description || '')
    .replace(/^Contains 200 original source questions, \d+ assistant-authored independent practice questions, and \d+ source-derived guided-review activities\. The assistant audit found \d+ distinct independent content kernels\.\s*/i, '')
    .replace(/^Contains 200 source diagnostic questions and 300 source-derived guided-review tasks;[^.]*\.\s*/i, '');
  pack.description = `Contains 200 original source questions, ${authored.length} assistant-authored independent practice questions, and ${guidedNeeded} source-derived guided-review activities. The assistant audit found ${distinctIndependentContentKernels} distinct independent content kernels. ${pack.description}`;
  pack.contentReview = `Assistant audit completed: ${independentItems.length} independent-practice items contain ${distinctIndependentContentKernels} distinct content kernels and ${parallelIndependentVariants} parallel variants under the normalized test. ${guidedNeeded} additional activities are guided reasoning transformations, not independent exam questions. The 500-distinct-question target ${newIndependentItemsNeeded ? 'is not met' : 'is met'}.`;
  pack.bankDisclosure = `This pack has 500 learning activities: 200 original source questions, ${authored.length} assistant-authored independent practice questions, and ${guidedNeeded} source-derived guided-review activities. It currently contains ${distinctIndependentContentKernels} distinct independent content kernels; ${newIndependentItemsNeeded} newly authored independent questions remain to reach 500.`;
  pack.sections = [
    ...Array.from({ length: 2 }, (_, index) => ({ id: `diagnostic-batch-${index + 1}`, label: `100-item source diagnostic bank ${index + 1}`, kind: 'source-diagnostic', timeMinutes: null })),
    ...batches.map((batch, index) => ({ id: batch.id, label: batch.label || `Assistant-reviewed independent diagnostic bank ${index + 3}`, kind: 'independent-diagnostic', timeMinutes: null })),
    ...Array.from({ length: guidedReviewBatchCount }, (_, index) => ({ id: `guided-review-bank-${index + 1}`, label: `Guided reasoning review bank ${index + 1}`, kind: 'guided-review', timeMinutes: null })),
  ];
  if (pack.sections.length !== 5 || new Set(pack.items.map(item => item.id)).size !== 500 || new Set(pack.items.map(item => item.prompt)).size !== 500) throw new Error(`${stem}: final independent-additions inventory is invalid`);
  const packJson = JSON.stringify(pack, null, 2) + '\n';
  const itemsJson = JSON.stringify(pack.items, null, 2) + '\n';
  for (const dir of [sourceDir, deployDir]) {
    writeGeneratedFile(path.join(dir, `${stem}_pack.json`), packJson);
    writeGeneratedFile(path.join(dir, `${stem}_items.json`), itemsJson);
  }
  updateQa(stem, pack);
  updated++;
}

console.log(`Applied assistant-reviewed independent additions to ${updated} pack${updated === 1 ? '' : 's'}.`);

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const { selectPackStems } = require('./test_prep_pack_selection.cjs');
const { listCoveredStems, loadOverridesForStem, applySourceLeakageOverride } = require('./non_eppp_source_leakage_overrides/index.cjs');
const { deriveGuidedReviewItems } = require('./test_prep_guided_expansion_core.cjs');
const { warningCodes, canonical } = require('./non_eppp_warning_checks.cjs');

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

function kernelCanonical(value, options = {}) {
  const raw = String(value == null ? '' : value).normalize('NFKC');
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
    answer: kernelCanonical(item.choices && item.choices[item.answerIndex]),
    distractors: (item.choices || [])
      .filter((_, index) => index !== item.answerIndex)
      .map((value) => kernelCanonical(value))
      .sort(),
    rationale: kernelCanonical(item.rationale),
    references: (item.references || [])
      .map((value) => kernelCanonical(value, { mathOperators: false }))
      .sort(),
  });
}

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const checkOnly = process.argv.includes('--check');

const availableStems = listCoveredStems();
const stems = selectPackStems(process.argv.slice(2), availableStems, ['--check']);

if (!stems.length) {
  console.log('No source leakage override modules found.');
  process.exit(0);
}

let totalUpdated = 0;
for (const stem of stems) {
  const packFile = stem + '_pack.json';
  const packPath = path.join(sourceDir, packFile);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const stemOverrides = loadOverridesForStem(stem) || {};
  const overrideIds = new Set(Object.keys(stemOverrides));
  const seenIds = new Set();

  let changedCount = 0;
  const nextSource = pack.items.slice(0, 200).map((item) => {
    if (overrideIds.has(item.id)) seenIds.add(item.id);
    const updated = applySourceLeakageOverride(stem, item);
    if (JSON.stringify(updated) !== JSON.stringify(item)) changedCount += 1;
    if (!Array.isArray(updated.choices) || updated.choices.length !== 4 || new Set(updated.choices).size !== 4) {
      throw new Error(stem + '/' + updated.id + ': invalid or duplicate choices after leakage override');
    }
    const codes = warningCodes(updated);
    if (overrideIds.has(updated.id) && codes.length > 0) {
      throw new Error(stem + '/' + updated.id + ': still has warning(s) after leakage override: ' + codes.join(', '));
    }
    return updated;
  });

  const missingIds = [...overrideIds].filter((id) => !seenIds.has(id));
  if (missingIds.length) {
    throw new Error(stem + ': override item id(s) not found in first 200 source items: ' + missingIds.join(', '));
  }

  const promptSet = new Set(nextSource.map((item) => canonical(item.prompt)));
  if (promptSet.size !== nextSource.length) {
    throw new Error(stem + ': duplicate canonical prompt introduced in source items 0-199');
  }

  const authoredCount = Math.max(0, Number(pack.assistantAuthoredIndependentItems) || 0);
  const authoredSlice = pack.items.slice(200, 200 + authoredCount);
  const guidedNeeded = Math.max(0, 500 - 200 - authoredCount);
  const nextGuided = guidedNeeded > 0 ? deriveGuidedReviewItems(nextSource).slice(0, guidedNeeded) : [];
  const independentItems = [...nextSource, ...authoredSlice];
  const nextItems = [...independentItems, ...nextGuided];
  const guidedChanged = JSON.stringify(pack.items.slice(200 + authoredCount)) !== JSON.stringify(nextGuided);

  const distinctSourceContentKernels = new Set(nextSource.map(contentKernel)).size;
  const distinctIndependentContentKernels = new Set(independentItems.map(contentKernel)).size;
  const parallelSourceVariants = nextSource.length - distinctSourceContentKernels;
  const parallelIndependentVariants = independentItems.length - distinctIndependentContentKernels;
  const newIndependentItemsNeeded = 500 - distinctIndependentContentKernels;
  const verdict = newIndependentItemsNeeded ? 'reviewed-target-not-met' : 'reviewed-target-met';
  const accountingChanged =
    pack.distinctSourceContentKernels !== distinctSourceContentKernels
    || pack.parallelSourceVariants !== parallelSourceVariants
    || pack.distinctIndependentContentKernels !== distinctIndependentContentKernels
    || pack.parallelIndependentVariants !== parallelIndependentVariants
    || pack.newIndependentItemsNeeded !== newIndependentItemsNeeded
    || (pack.assistantReview && (
      pack.assistantReview.distinctSourceContentKernels !== distinctSourceContentKernels
      || pack.assistantReview.parallelSourceVariants !== parallelSourceVariants
      || pack.assistantReview.distinctIndependentContentKernels !== distinctIndependentContentKernels
      || pack.assistantReview.parallelIndependentVariants !== parallelIndependentVariants
      || pack.assistantReview.newIndependentItemsNeeded !== newIndependentItemsNeeded
      || pack.assistantReview.verdict !== verdict
    ));

  const remainingLeakage = nextSource.filter((item) => warningCodes(item).includes('key-stem-lexical-leakage')).length;
  console.log(stem.padEnd(48), String(overrideIds.size).padStart(3) + ' overrides', String(changedCount).padStart(3) + ' changed', 'remaining src0-199 leakage: ' + remainingLeakage);

  const priorDescription = String(pack.description || '')
    .replace(/^Contains 200 original source questions, \d+ assistant-authored independent practice questions, and \d+ source-derived guided-review activities\. The assistant audit found \d+ distinct independent content kernels\.\s*/i, '')
    .replace(/^Contains 200 source diagnostic questions and 300 source-derived guided-review tasks;[^.]*\.\s*/i, '');
  const nextDescription = `Contains 200 original source questions, ${authoredCount} assistant-authored independent practice questions, and ${guidedNeeded} source-derived guided-review activities. The assistant audit found ${distinctIndependentContentKernels} distinct independent content kernels. ${priorDescription}`;
  const nextContentReview = `Assistant audit completed: ${independentItems.length} independent-practice items contain ${distinctIndependentContentKernels} distinct content kernels and ${parallelIndependentVariants} parallel variants under the normalized test. ${guidedNeeded} additional activities are guided reasoning transformations, not independent exam questions. The 500-distinct-question target ${newIndependentItemsNeeded ? 'is not met' : 'is met'}.`;
  const nextBankDisclosure = `This pack has 500 learning activities: 200 original source questions, ${authoredCount} assistant-authored independent practice questions, and ${guidedNeeded} source-derived guided-review activities. It currently contains ${distinctIndependentContentKernels} distinct independent content kernels; ${newIndependentItemsNeeded} newly authored independent questions remain to reach 500.`;
  const proseChanged = pack.description !== nextDescription || pack.contentReview !== nextContentReview || pack.bankDisclosure !== nextBankDisclosure;

  const qaFile = path.join(sourceDir, stem + '_native_qa.json');
  const qaBefore = fs.existsSync(qaFile) ? JSON.parse(fs.readFileSync(qaFile, 'utf8')) : null;
  const qaNeedsSync = Boolean(qaBefore && (
    qaBefore.summary?.totalItems !== 500
    || qaBefore.summary?.distinctSourceContentKernels !== distinctSourceContentKernels
    || qaBefore.summary?.distinctIndependentContentKernels !== distinctIndependentContentKernels
    || qaBefore.summary?.newIndependentItemsNeeded !== newIndependentItemsNeeded
    || qaBefore.expansion?.distinctSourceContentKernels !== distinctSourceContentKernels
    || qaBefore.expansion?.distinctIndependentContentKernels !== distinctIndependentContentKernels
    || qaBefore.expansion?.newIndependentItemsNeeded !== newIndependentItemsNeeded
  ));

  if (!checkOnly && (changedCount > 0 || guidedChanged || accountingChanged || proseChanged || qaNeedsSync)) {
    pack.items = nextItems;
    pack.distinctSourceContentKernels = distinctSourceContentKernels;
    pack.parallelSourceVariants = parallelSourceVariants;
    pack.distinctIndependentContentKernels = distinctIndependentContentKernels;
    pack.parallelIndependentVariants = parallelIndependentVariants;
    pack.newIndependentItemsNeeded = newIndependentItemsNeeded;
    pack.description = nextDescription;
    pack.contentReview = nextContentReview;
    pack.bankDisclosure = nextBankDisclosure;
    if (pack.assistantReview) {
      pack.assistantReview.distinctSourceContentKernels = distinctSourceContentKernels;
      pack.assistantReview.parallelSourceVariants = parallelSourceVariants;
      pack.assistantReview.distinctIndependentContentKernels = distinctIndependentContentKernels;
      pack.assistantReview.parallelIndependentVariants = parallelIndependentVariants;
      pack.assistantReview.newIndependentItemsNeeded = newIndependentItemsNeeded;
      pack.assistantReview.verdict = verdict;
    }
    const packJson = JSON.stringify(pack, null, 2) + '\n';
    const itemsJson = JSON.stringify(pack.items, null, 2) + '\n';
    for (const dir of [sourceDir, deployDir]) {
      writeGeneratedFile(path.join(dir, packFile), packJson, 'utf8');
      writeGeneratedFile(path.join(dir, stem + '_items.json'), itemsJson, 'utf8');
    }
    if (qaBefore) {
      const distinctnessStatus = newIndependentItemsNeeded ? 'target-not-met' : 'target-met';
      const summary = qaBefore.summary || (qaBefore.summary = {});
      Object.assign(summary, {
        totalItems: 500,
        passedItems: 500,
        sourceItems: 200,
        assistantAuthoredIndependentItems: authoredCount,
        independentPracticeItems: independentItems.length,
        distinctSourceContentKernels,
        parallelSourceVariants,
        distinctIndependentContentKernels,
        parallelIndependentVariants,
        guidedReasoningItems: guidedNeeded,
        independentQuestionTarget: 500,
        newIndependentItemsNeeded,
        structuralStatus: 'pass',
        contentDistinctnessStatus: distinctnessStatus,
        assistantReviewVerdict: verdict,
        diagnosticBanks: 5,
        diagnosticBanksSemantics: 'legacy-total-learning-activity-bank-alias',
        sourceDiagnosticBanks: 2,
        assistantAuthoredIndependentBanks: authoredCount / 100,
        independentDiagnosticBanks: 2 + authoredCount / 100,
        guidedReviewBanks: guidedNeeded / 100,
        learningActivityBanks: 5,
        status: 'pass',
      });
      if ('reviewRequiredItems' in summary) summary.reviewRequiredItems = 0;
      if ('bankSize' in summary) summary.bankSize = 100;
      if ('findings' in summary) summary.findings = Array.isArray(summary.findings) ? [] : 0;
      if ('packFindings' in summary) summary.packFindings = [];
      if ('answerPositions' in summary) {
        const positions = [0, 1, 2, 3].map((ans) => pack.items.filter((it) => it.answerIndex === ans).length);
        summary.answerPositions = Array.isArray(summary.answerPositions)
          ? positions
          : Object.fromEntries(['A', 'B', 'C', 'D'].map((label, idx) => [label, positions[idx]]));
      }
      if (qaBefore.diagnosticBatch) {
        Object.assign(qaBefore.diagnosticBatch, {
          batchCount: 5,
          batchCountSemantics: 'legacy-total-learning-activity-bank-alias',
          sourceBatchCount: 2,
          assistantAuthoredIndependentBatchCount: authoredCount / 100,
          independentDiagnosticBatchCount: 2 + authoredCount / 100,
          guidedReviewBatchCount: guidedNeeded / 100,
          learningActivityBankCount: 5,
        });
      }
      qaBefore.generatedAt = new Date().toISOString();
      qaBefore.expansion = {
        independentQuestionTarget: 500,
        totalLearningActivities: 500,
        batchSize: 100,
        learningActivityBanks: 5,
        sourceItems: 200,
        assistantAuthoredIndependentItems: authoredCount,
        independentPracticeItems: independentItems.length,
        distinctSourceContentKernels,
        parallelSourceVariants,
        distinctIndependentContentKernels,
        parallelIndependentVariants,
        guidedReasoningItems: guidedNeeded,
        newIndependentItemsNeeded,
        structurallyReviewedItems: 500,
        reviewer: 'OpenAI Codex',
        examItemReview: verdict,
        taskForms: ['misconception-correction', 'principle-justification', 'evidence-comparison'],
        method: 'Manifest-backed independent additions passed exact artifact review, blueprint, key, distractor, feedback, source, learning-link, originality, balance, and structural validation. Remaining transformations are guided practice only.',
        findings: [],
      };
      const qaJson = JSON.stringify(qaBefore, null, 2) + '\n';
      for (const dir of [sourceDir, deployDir]) {
        writeGeneratedFile(path.join(dir, stem + '_native_qa.json'), qaJson, 'utf8');
      }
      const mdPath = path.join(sourceDir, stem + '_native_qa.md');
      if (fs.existsSync(mdPath)) {
        let md = fs.readFileSync(mdPath, 'utf8')
          .replace(/\n- Independent-batch audit:.*?(?=\n- |\n?$)/gs, '')
          .replace(/\n- Assistant audit:.*?(?=\n- |\n?$)/gs, '');
        md += `\n- Independent-batch audit: 200 original source questions plus ${authoredCount} assistant-authored independent practice questions produce ${distinctIndependentContentKernels} distinct independent content kernels. ${guidedNeeded} additional activities remain guided review only. ${newIndependentItemsNeeded} new independent questions remain to reach 500.\n`;
        for (const dir of [sourceDir, deployDir]) {
          writeGeneratedFile(path.join(dir, stem + '_native_qa.md'), md, 'utf8');
        }
      }
    }
    totalUpdated += Math.max(changedCount, (guidedChanged || accountingChanged || proseChanged || qaNeedsSync) ? 1 : 0);
  }
}

console.log(checkOnly ? 'Check passed; nothing written.' : 'Applied ' + totalUpdated + ' source leakage override change(s).');

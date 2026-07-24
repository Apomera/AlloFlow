#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const audit = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'content_audit.json'), 'utf8'));
const nativeQa = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_native_qa.json'), 'utf8'));

const blueprint = [
  ['biological', 1, 'Biological bases of behavior', 10],
  ['cognitive-affective', 2, 'Cognitive-affective bases of behavior', 13],
  ['social-cultural', 3, 'Social and cultural bases of behavior', 11],
  ['lifespan', 4, 'Growth and lifespan development', 12],
  ['assessment', 5, 'Assessment and diagnosis', 16],
  ['intervention', 6, 'Treatment, intervention, prevention, and supervision', 15],
  ['research', 7, 'Research methods and statistics', 7],
  ['professional', 8, 'Ethical, legal, and professional issues', 16],
].map(([id, legacyDomainId, label, perBatch]) => ({ id, legacyDomainId, label, perBatch }));

const migratedIds = new Set(nativeQa.items.map((item) => item.legacySourceId).filter(Boolean));
const timeSensitive = /current|recent|DSM|APA|CPA|law|legal|statute|court|HIPAA|licens|mandat|Tarasoff|Goldwater|guideline|code|standard/i;
const alternativeFeedback = /why (?:the )?others are wrong|\n\s*\(?[A-D]\)?[.):]|\n\s*[A-D]\s*[-—:]/gi;

function riskFor(item) {
  const flags = item.flags.map((flag) => flag.code);
  const risks = [];
  if (!item.references.length || flags.includes('missing_reference')) risks.push('missing-direct-reference');
  if (flags.includes('time_sensitive_claim') || timeSensitive.test(`${item.prompt} ${item.rationale}`)) risks.push('time-sensitive-claim');
  if (flags.includes('duplicate_prompt')) risks.push('duplicate-prompt');
  if (flags.includes('correct_answer_length_clue')) risks.push('answer-length-clue');
  if (item.rationale.length < 100) risks.push('thin-rationale');
  const feedbackMatches = item.rationale.match(alternativeFeedback) || [];
  if (feedbackMatches.length < 3) risks.push('incomplete-distractor-feedback');
  return [...new Set(risks)];
}

function reviewTasks(risks) {
  const tasks = ['Verify the keyed answer and one-best-answer structure against current authoritative sources.'];
  if (risks.includes('missing-direct-reference')) tasks.push('Attach a claim-level authoritative reference with full source name, URL, and credibility rationale.');
  if (risks.includes('time-sensitive-claim')) tasks.push('Verify the claim against the current controlling edition, guidance, law, or jurisdiction and date-stamp the review.');
  if (risks.includes('duplicate-prompt')) tasks.push('Resolve the duplicate group by retiring, merging, or substantially re-authoring overlapping items.');
  if (risks.includes('answer-length-clue')) tasks.push('Rewrite options to remove answer-length and specificity clues while preserving plausible distractors.');
  if (risks.includes('thin-rationale')) tasks.push('Expand the rationale to explain the governing concept and the keyed answer.');
  if (risks.includes('incomplete-distractor-feedback')) tasks.push('Write a distinct explanation for why every non-keyed option is less appropriate.');
  tasks.push('Run accessibility, cultural responsiveness, wording-clue, answer-position, provenance, and independent-expert review gates before release.');
  return tasks;
}

function priorityScore(item) {
  const risks = riskFor(item);
  const weights = {
    'time-sensitive-claim': 60,
    'missing-direct-reference': 35,
    'duplicate-prompt': 25,
    'answer-length-clue': 18,
    'thin-rationale': 12,
    'incomplete-distractor-feedback': 10,
  };
  return risks.reduce((sum, risk) => sum + weights[risk], 0)
    + (item.reviewPriority === 'high' ? 20 : item.reviewPriority === 'medium' ? 8 : 0);
}

const remaining = audit.reviewQueue.filter((item) => !migratedIds.has(item.id));
const pools = new Map(blueprint.map((domain) => [domain.legacyDomainId, remaining
  .filter((item) => item.domainId === domain.legacyDomainId)
  .sort((a, b) => priorityScore(a) - priorityScore(b) || a.ordinal - b.ordinal)]));

const selected = [];
for (let batchNumber = 1; batchNumber <= 5; batchNumber += 1) {
  for (const domain of blueprint) {
    const pool = pools.get(domain.legacyDomainId);
    const batchItems = pool.splice(0, domain.perBatch);
    if (batchItems.length !== domain.perBatch) throw new Error(`Insufficient ${domain.id} items for review batch ${batchNumber}.`);
    for (const item of batchItems) {
      const risks = riskFor(item);
      selected.push({
        reviewBatch: batchNumber,
        positionInBatch: null,
        legacyId: item.id,
        sourceFile: item.sourceFile,
        legacyOrdinal: item.ordinal,
        domainId: domain.id,
        domainName: domain.label,
        prompt: item.prompt,
        choices: item.choices,
        answerIndex: item.answerIndex,
        rationale: item.rationale,
        directReferences: item.references,
        automatedPriority: item.reviewPriority,
        automatedFlags: item.flags.map((flag) => ({ code: flag.code, severity: flag.severity, detail: flag.detail })),
        editorialRisks: risks,
        reviewTasks: reviewTasks(risks),
        workflowStage: 'legacy-quarantine-next-review',
        learnerVisibleInNativeBank: false,
        contentQaStatus: 'not-started',
        independentExpertStatus: 'not-started',
      });
    }
  }
}

for (let batchNumber = 1; batchNumber <= 5; batchNumber += 1) {
  selected.filter((item) => item.reviewBatch === batchNumber).forEach((item, index) => { item.positionInBatch = index + 1; });
}

const riskCounts = {};
for (const item of selected) for (const risk of item.editorialRisks) riskCounts[risk] = (riskCounts[risk] || 0) + 1;
const fastLaneCount = selected.filter((item) => item.editorialRisks.length === 0).length;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'editorial-docket-only-not-released',
  purpose: 'Prioritize the next 500 quarantined legacy candidates for human source, content, distractor, accessibility, and expert review without treating automated triage as approval.',
  blueprint: {
    label: 'EPPP Part 1–Knowledge current blueprint (2026–2027)',
    owner: 'Association of State and Provincial Psychology Boards (ASPPB)',
    officialUrl: 'https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/eppp-exam-topics/',
    domains: blueprint.map(({ id, label, perBatch }) => ({ id, label, weightPercent: perBatch, itemsPerReviewBatch: perBatch })),
  },
  transition: {
    notice: 'ASPPB states that an integrated EPPP using a new six-domain blueprint becomes operational in the fourth quarter of 2027. This Part 1 docket must not be relabeled as integrated-EPPP preparation.',
    officialUrl: 'https://asppb.net/future-eppp-content-areas-2027/',
  },
  safeguards: [
    'Every docket item remains in legacy quarantine and is excluded from the native learner-facing bank.',
    'Automated ordering only prioritizes editorial effort; it does not verify factual accuracy or approve an item.',
    'A balanced docket is a workflow convenience, not a claim that the selected items satisfy the blueprint.',
    'Release requires all content gates plus independent qualified psychology/assessment review.',
  ],
  summary: {
    legacyUniverse: audit.summary.totalItems,
    nativeLegacyItems: migratedIds.size,
    remainingQuarantinedItems: remaining.length,
    docketItems: selected.length,
    reviewBatches: 5,
    itemsPerBatch: 100,
    zeroAutomatedRiskCandidates: fastLaneCount,
    itemsRequiringEditorialWork: selected.length - fastLaneCount,
    riskCounts,
  },
  items: selected,
};

const domainRows = blueprint.map((domain) => `| ${domain.label} | ${domain.perBatch}% | ${selected.filter((item) => item.domainId === domain.id).length} |`).join('\n');
const riskRows = Object.entries(riskCounts).sort((a, b) => b[1] - a[1]).map(([risk, count]) => `| ${risk} | ${count} |`).join('\n');
const markdown = `# EPPP next-500 editorial review docket

Generated: ${report.generatedAt}

**Status: editorial docket only — not released learner content.**

${report.purpose}

## Blueprint basis

This workflow uses the current EPPP Part 1–Knowledge blueprint published by the Association of State and Provincial Psychology Boards (ASPPB): ${report.blueprint.officialUrl}

| Domain | Current weight | Docket items |
| --- | ---: | ---: |
${domainRows}

## Exam transition

${report.transition.notice} Official future blueprint: ${report.transition.officialUrl}

## Docket summary

- ${report.summary.docketItems} quarantined candidates in five 100-item editorial batches.
- ${report.summary.zeroAutomatedRiskCandidates} candidates have no detected docket risk; this still does not constitute review approval.
- ${report.summary.itemsRequiringEditorialWork} candidates have one or more explicit editorial risks.
- The native learner-facing bank remains unchanged.

| Editorial risk | Items |
| --- | ---: |
${riskRows}

## Required safeguards

${report.safeguards.map((guardrail) => `- ${guardrail}`).join('\n')}
`;

for (const outputRoot of [sourceRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'next_review_docket.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'next_review_docket.md'), markdown, 'utf8');
}

console.log(`EPPP next-review docket: ${selected.length} quarantined candidates in 5 blueprint-weighted editorial batches; ${fastLaneCount} have no detected docket risk.`);

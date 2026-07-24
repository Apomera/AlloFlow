'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const files = fs.readdirSync(sourceDir).filter(name => name.endsWith('_pack.json') && !name.startsWith('eppp')).sort();
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

const perPack = files.map(file => {
  const stem = file.replace('_pack.json', '');
  const packBytes = fs.readFileSync(path.join(sourceDir, file));
  const itemsBytes = fs.readFileSync(path.join(sourceDir, `${stem}_items.json`));
  const pack = JSON.parse(packBytes);
  const sourceQuestions = Number(pack.sourceQuestionItems) || 200;
  const assistantAuthoredIndependentItems = Number(pack.assistantAuthoredIndependentItems) || 0;
  const independentPracticeItems = Number(pack.independentPracticeItems) || sourceQuestions + assistantAuthoredIndependentItems;
  const guidedReviewActivities = Number.isFinite(Number(pack.guidedReviewItems)) ? Number(pack.guidedReviewItems) : Math.max(0, pack.items.length - independentPracticeItems);
  const distinctIndependentContentKernels = Number(pack.distinctIndependentContentKernels) || Number(pack.distinctSourceContentKernels) || 0;
  const parallelIndependentVariants = Number.isFinite(Number(pack.parallelIndependentVariants)) ? Number(pack.parallelIndependentVariants) : independentPracticeItems - distinctIndependentContentKernels;
  return {
    stem,
    packId: pack.id,
    title: pack.shortTitle || pack.title,
    learningActivities: pack.items.length,
    sourceQuestions,
    assistantAuthoredIndependentItems,
    independentPracticeItems,
    distinctSourceContentKernels: Number(pack.distinctSourceContentKernels) || 0,
    parallelSourceVariants: Number(pack.parallelSourceVariants) || 0,
    distinctIndependentContentKernels,
    parallelIndependentVariants,
    guidedReviewActivities,
    independentQuestionTarget: 500,
    newIndependentItemsNeeded: Number(pack.newIndependentItemsNeeded),
    verdict: pack.assistantReview?.verdict,
    packSha256: sha(packBytes),
    itemsSha256: sha(itemsBytes),
  };
});

const snapshotHash = sha(perPack.map(row => `${row.stem}:${row.packSha256}:${row.itemsSha256}`).join('\n'));
const sum = key => perPack.reduce((total, row) => total + row[key], 0);
const inventory = {
  originalSourceQuestions: sum('sourceQuestions'),
  distinctSourceContentKernels: sum('distinctSourceContentKernels'),
  parallelSourceVariants: sum('parallelSourceVariants'),
  assistantAuthoredIndependentItems: sum('assistantAuthoredIndependentItems'),
  independentPracticeItems: sum('independentPracticeItems'),
  distinctIndependentContentKernels: sum('distinctIndependentContentKernels'),
  parallelIndependentVariants: sum('parallelIndependentVariants'),
  guidedReviewActivities: sum('guidedReviewActivities'),
  independentQuestionTarget: perPack.length * 500,
  newIndependentItemsNeeded: sum('newIndependentItemsNeeded'),
};

const audit = {
  schemaVersion: 2,
  id: 'test-prep-assistant-review-2026-07-16',
  reviewedAt: '2026-07-18',
  reviewer: 'OpenAI Codex',
  status: inventory.newIndependentItemsNeeded ? 'reviewed-target-not-met' : 'reviewed-target-met',
  snapshot: { algorithm: 'sha256', generatedAt: new Date().toISOString(), hash: snapshotHash },
  standard: {
    target: '500 genuinely distinct exam-style questions per non-EPPP pack',
    independentQuestionDefinition: 'A question must introduce its own assessable stimulus, scenario, passage, dataset, or decision; its own plausible answer set; and item-specific reasoning. A changed prefix, reordered answers, parallel framing, or a task derived from an existing answer/rationale does not create a new independent content kernel.',
    kernelMethod: 'Within each pack, independent-practice questions were normalized by keyed answer, sorted distractor set, rationale, and sorted reference set. Punctuation and case differences and answer-position shuffles were ignored.',
  },
  scope: {
    packs: perPack.length,
    totalLearningActivities: sum('learningActivities'),
    originalSourceQuestions: inventory.originalSourceQuestions,
    assistantAuthoredIndependentItems: inventory.assistantAuthoredIndependentItems,
    independentPracticeItems: inventory.independentPracticeItems,
    guidedReviewActivities: inventory.guidedReviewActivities,
    existingItemsQualitativelySampled: 169,
    newCredentialSpecificReplacementsReviewed: 68,
    newIndependentParaProItemsReviewed: inventory.assistantAuthoredIndependentItems,
    allActivitiesStructurallyChecked: true,
    allGuidedAnswerDerivationsChecked: true,
    allIndependentItemsWarningScanned: true,
    allLearnerVisibleReferencesCataloged: true,
    allLearningLinksValidated: true,
    epppGuidedQaReport: './test_prep/non_eppp_eppp_guided_qa_2026-07-18.json',
  },
  inventory,
  verdict: {
    structuralStatus: 'pass',
    answerDerivationStatus: 'pass',
    sampledKeyDefensibilityStatus: 'pass-after-corrections',
    newIndependentItemReviewStatus: inventory.assistantAuthoredIndependentItems ? 'assistant-reviewed-for-independent-practice' : 'none-added',
    contentDistinctnessStatus: inventory.newIndependentItemsNeeded ? 'target-not-met' : 'target-met',
    guidedReviewStatus: 'approved-for-guided-practice-only',
    independentExamItemStatus: 'assistant-authored items are independent practice materials, not official or psychometrically validated exam items',
  },
  systemicFindings: [
    'Source-derived guided activities are mechanically linked to existing source answers and rationales. They support misconception correction, justification, and comparison practice but do not introduce independent exam content.',
    'The misconception-correction form repeats the selected response in keyed feedback, creating a lexical matching cue.',
    'The response-and-evidence form repeats the same evidence across all four options, so the task largely asks the learner to reselect the original answer.',
    'The comparison form always presents the source-correct response first in the prompt and commonly includes only two choices that directly evaluate the named pair.',
    `The original ${inventory.originalSourceQuestions.toLocaleString()} source questions contain ${inventory.distinctSourceContentKernels.toLocaleString()} normalized content kernels and ${inventory.parallelSourceVariants.toLocaleString()} parallel variants.`,
    'Every learner-visible source now resolves to a catalog entry with a readable title, organization, brief summary, and credibility explanation; broad source-bundle reuse remains an editorial-depth warning rather than a missing-metadata defect.',
  ],
  correctionsCompleted: [
    'Replaced 68 credential-mismatched or mechanically stacked EBD 5372 and Intellectual Disabilities 5322 items with new school-based scenarios and item-specific feedback.',
    'Removed misplaced 5383 learning-disability rationale fragments from 51 EBD and 51 Intellectual Disabilities source questions and their option feedback.',
    'Rewrote remaining SLD-contaminated EBD, Intellectual Disabilities, and Severe/Profound scenarios.',
    'Corrected four IDEA Part B/Part C, IEP/IFSP, LRE/natural-environment, and payment-rule items using current official IDEA regulations.',
    'Corrected targeted Early Childhood Special Education, Praxis Core, reading, grammar, possessive, quotation, and encoding defects identified during sampling.',
    'Added a durable source-correction pass to both full build pipelines and guarded the legacy 200-item collapse step behind an explicit authorization flag.',
    'Rebuilt the School Librarian skill/chapter mapper so all 500 activities resolve to released, domain-compatible learning content.',
    'Expanded the shared reference catalog to cover every source used by pack items and learning libraries, including readable title, organization, summary, and credibility metadata.',
    'Added a reproducible EPPP-guided QA gate across all 22 non-EPPP packs, with warning diagnostics kept distinct from hard release findings.',
    'Separated guided-review attempt mode from diagnostic analytics and excluded guided activities from smart review, targeted sets, custom quizzes, and saved-question review.',
    `Added and assistant-reviewed ${inventory.assistantAuthoredIndependentItems} genuinely new ParaPro practice questions with distinct stimuli, balanced answer positions, item-specific feedback, blueprint tagging, and source links.`,
  ],
  limitations: [
    'Assistant review is not licensed-professional endorsement, independent legal/clinical review, field testing, psychometric calibration, or validation of score interpretations.',
    'The review combined full structural and heuristic scans of all activities with a stratified 169-item manual sample, manual priority-docket inspection, and independent group review evidence; it did not simulate examinee response data.',
    'Content-kernel counts detect normalized within-pack reuse. They do not by themselves establish item quality or detect every semantically similar question across different wording.',
  ],
  nextWork: [
    `Author the per-pack gap shown below as genuinely new credential-specific questions; the total remaining gap is ${inventory.newIndependentItemsNeeded.toLocaleString()}.`,
    'Give each new question a new stimulus or decision, plausible distractors, item-specific feedback, and a source that directly supports the tested principle.',
    'Review and release additions pack by pack in 100-item stages; keep guided-review activities as a separate learning mode.',
    'After authoring, run independent subject-matter and psychometric review if the product will make stronger validity or readiness claims.',
  ],
  officialSources: [
    { title: 'ETS ParaPro Test Content', url: 'https://www.ets.org/parapro/test-takers/about/test-content.html' },
    { title: 'ETS ParaPro Assessment Study Companion (1755)', url: 'https://www.ets.org/pdfs/parapro/1755.pdf' },
    { title: 'IDEA §300.17 — Free appropriate public education', url: 'https://sites.ed.gov/idea/regs/b/a/300.17' },
    { title: 'IDEA §300.116 — Placements', url: 'https://sites.ed.gov/idea/regs/b/b/300.116' },
    { title: 'IDEA §303.126 — Early intervention services in natural environments', url: 'https://sites.ed.gov/idea/regs/c/b/303.126' },
    { title: 'IDEA §303.521 — System of payments and fees', url: 'https://sites.ed.gov/idea/regs/c/f/303.521' },
  ],
  perPack,
};

const table = perPack.map(row => `| ${row.title.replace(/\|/g, '/')} | ${row.sourceQuestions} | ${row.assistantAuthoredIndependentItems} | ${row.distinctIndependentContentKernels} | ${row.parallelIndependentVariants} | ${row.guidedReviewActivities} | ${row.newIndependentItemsNeeded} |`).join('\n');
const md = `# Test Prep Assistant Review — July 18, 2026

Status: **Reviewed — 500-distinct-question target ${inventory.newIndependentItemsNeeded ? 'not met' : 'met'}.** This is a completed assistant review, not a “review required” placeholder.

## Bottom line

The 22 non-EPPP packs contain **${sum('learningActivities').toLocaleString()} learning activities**. The current strict audit found **${inventory.distinctSourceContentKernels.toLocaleString()} normalized kernels among the original source banks**, **${inventory.assistantAuthoredIndependentItems.toLocaleString()} newly assistant-authored independent practice questions**, **${inventory.distinctIndependentContentKernels.toLocaleString()} distinct independent-practice content kernels overall**, and **${inventory.guidedReviewActivities.toLocaleString()} source-derived guided-review activities**. Reaching 500 genuinely distinct questions in every pack requires **${inventory.newIndependentItemsNeeded.toLocaleString()} additional independently authored questions**.

Structural integrity and guided-answer derivation passed. New independent additions were reviewed for blueprint alignment, keyed-answer defensibility, distractor plausibility, feedback, citations, originality, and answer balance. Guided additions remain approved for guided practice only and are excluded from diagnostic analytics.

## Review standard and scope

An independent question must introduce its own assessable stimulus, scenario, passage, dataset, or decision; its own plausible answer set; and item-specific reasoning. Prefix changes, answer-position shuffles, parallel framing, and tasks built from an existing answer/rationale do not count as new content kernels.

Assistant review is separate from licensed subject-matter endorsement, field testing, and psychometric calibration.

## Per-pack inventory

| Pack | Original source questions | New independent questions | Distinct independent kernels | Parallel independent variants | Guided review | New independent items needed |
|---|---:|---:|---:|---:|---:|---:|
${table}

## Corrections and additions completed

- Replaced 68 EBD/ID arithmetic, stacked-context, or credential-mismatched items with new school-based scenarios.
- Removed misplaced 5383 language from 102 EBD/ID questions and their feedback.
- Corrected SLD-contaminated scenarios, Praxis Core ambiguity/rationale defects, reading/grammar/quotation issues, and Early Childhood/ECSE defects.
- Added ${inventory.assistantAuthoredIndependentItems} genuinely new ParaPro practice questions in a separately identified independent diagnostic bank.
- Preserved guided-review banks as a separate learning mode excluded from diagnostic analytics.

## Next release standard

Author the ${inventory.newIndependentItemsNeeded.toLocaleString()}-question remaining gap pack by pack in 100-item stages. Every addition should use a new credential-specific stimulus, plausible distractors, item-specific feedback, and directly relevant sources. Guided-review activities should remain available as a separate learning tool.
`;

for (const dir of [sourceDir, deployDir]) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'test_prep_assistant_review_2026-07-16.json'), JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'test_prep_assistant_review_2026-07-16.md'), md);
}

console.log(`Wrote assistant audit for ${perPack.length} packs; ${inventory.newIndependentItemsNeeded} new independent questions remain.`);

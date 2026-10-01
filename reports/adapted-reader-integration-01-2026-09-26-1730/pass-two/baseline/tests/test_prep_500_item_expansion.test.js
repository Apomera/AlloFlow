import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');

const expectedFiles = [
  'audiology_5343',
  'early_childhood_5025',
  'educational_leadership_5412',
  'esol_5362',
  'parapro',
  'plt_5_9_5623',
  'plt_7_12_5624',
  'plt_early_childhood_5621',
  'plt_k6_5622',
  'praxis_core_5752',
  'reading_specialist_5302',
  'school_counselor_5422',
  'school_librarian_5312',
  'school_psychologist_5403',
  'special_education_5355',
  'special_education_behavior_emotional_5372',
  'special_education_early_childhood_5692',
  'special_education_intellectual_disabilities_5322',
  'special_education_learning_disabilities_5383',
  'special_education_severe_profound_5547',
  'speech_language_pathology_5331',
  'teaching_reading_5205',
];

const paraProReferenceUrls = [
  'https://www.ets.org/pdfs/parapro/1755.pdf',
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published',
  'https://openstax.org/details/books/prealgebra-2e/',
  'https://openstax.org/books/writing-guide/pages/handbook',
  'https://openstax.org/books/writing-guide/pages/16-5-writing-process-thinking-critically-about-text',
];

const packCache = new Map();

function readPack(stem) {
  if (!packCache.has(stem)) {
    packCache.set(
      stem,
      JSON.parse(fs.readFileSync(path.join(sourceDir, `${stem}_pack.json`), 'utf8')),
    );
  }
  return packCache.get(stem);
}

const independentAdditionsManifest = JSON.parse(
  fs.readFileSync(path.join(root, 'dev-tools', 'authored', 'test_prep_independent_additions_manifest.json'), 'utf8'),
);

function layoutFor(stem) {
  const assistantAuthored = (independentAdditionsManifest.packs[stem]?.length || 0) * 100;
  const source = 200;
  const independent = source + assistantAuthored;
  const guided = 500 - independent;
  return {
    source,
    assistantAuthored,
    independent,
    guided,
    sourceBanks: source / 100,
    assistantAuthoredBanks: assistantAuthored / 100,
    independentBanks: independent / 100,
    guidedBanks: guided / 100,
    sectionKinds: [
      'source-diagnostic',
      'source-diagnostic',
      ...Array.from({ length: assistantAuthored / 100 }, () => 'independent-diagnostic'),
      ...Array.from({ length: guided / 100 }, () => 'guided-review'),
    ],
  };
}

function replaceBinaryMathOperator(value, escapedOperator, token) {
  const leftOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\))';
  const rightOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\()';
  const pattern = new RegExp(
    '(^|[^A-Za-z0-9_])(' + leftOperand + ')\\s*' + escapedOperator
      + '\\s*(' + rightOperand + ')(?=$|[^A-Za-z0-9_])',
    'g',
  );
  let normalized = value;
  while (true) {
    const next = normalized.replace(
      pattern,
      (_, prefix, left, right) => prefix + left + ' ' + token + ' ' + right,
    );
    if (next === normalized) return normalized;
    normalized = next;
  }
}

function normalizeMathOperators(value) {
  let normalized = value
    .replace(/\u2264/g, ' mathoplte ')
    .replace(/\u2265/g, ' mathopgte ')
    .replace(/\u2260/g, ' mathopneq ')
    .replace(/\u00d7/g, ' mathopmul ')
    .replace(/\u00f7/g, ' mathopdiv ')
    .replace(/\u2212/g, ' mathopminus ')
    .replace(/<=/g, ' mathoplte ')
    .replace(/>=/g, ' mathopgte ')
    .replace(/!=/g, ' mathopneq ')
    .replace(/=/g, ' mathopeq ')
    .replace(/</g, ' mathoplt ')
    .replace(/>/g, ' mathopgt ')
    .replace(/\+/g, ' mathopplus ')
    .replace(/\^/g, ' mathoppow ');
  normalized = normalized.replace(
    /(^|[^A-Za-z0-9_])-(?=\s*(?:\d|[A-Za-z]\b))/g,
    (_, prefix) => prefix + ' mathopminus ',
  );
  normalized = replaceBinaryMathOperator(normalized, '\\*', 'mathopmul');
  normalized = replaceBinaryMathOperator(normalized, '\\/', 'mathopdiv');
  return replaceBinaryMathOperator(normalized, '-', 'mathopminus');
}

function canonical(value, options = {}) {
  const raw = String(value || '').normalize('NFKC');
  const standaloneUrl = /^https?:\/\/\S+$/i.test(raw.trim());
  const normalized = options.mathOperators !== false && !standaloneUrl
    ? normalizeMathOperators(raw)
    : raw;
  return normalized
    .toLowerCase()
    .replace(/["'\u0060]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices?.[item.answerIndex]),
    distractors: (item.choices || [])
      .filter((_, index) => index !== item.answerIndex)
      .map(canonical)
      .sort(),
    rationale: canonical(item.rationale),
    references: (item.references || []).map((value) => canonical(value, { mathOperators: false })).sort(),
  });
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function answerCounts(items) {
  return items.reduce((counts, item) => {
    counts[item.answerIndex]++;
    return counts;
  }, [0, 0, 0, 0]);
}

function compact(value, max = 260) {
  const normalized = String(value || '')
    .replace(/^(Correct|Not the best answer)\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= max) return normalized;
  const clipped = normalized.slice(0, max);
  const sentence = clipped.lastIndexOf('.');
  return (sentence > 80
    ? clipped.slice(0, sentence + 1)
    : `${clipped.replace(/[,;:]?\s+\S*$/, '')}.`
  ).trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('source-question, independent-practice, and guided-review non-EPPP audit', () => {
  it('ships the explicit 22-pack manifest with all reviewed independent banks before guided review', () => {
    expect(expectedFiles).toHaveLength(22);

    for (const stem of expectedFiles) {
      const pack = readPack(stem);
      const layout = layoutFor(stem);
      const sourceItems = pack.items.slice(0, layout.source);
      const independentItems = pack.items.slice(0, layout.independent);
      const sourceKernelCount = new Set(sourceItems.map(contentKernel)).size;
      const independentKernelCount = new Set(independentItems.map(contentKernel)).size;
      const sourceParallelCount = layout.source - sourceKernelCount;
      const independentParallelCount = layout.independent - independentKernelCount;
      const remainingGap = 500 - independentKernelCount;
      const verdict = remainingGap ? 'reviewed-target-not-met' : 'reviewed-target-met';

      expect(pack.items).toHaveLength(500);
      expect(pack.sections).toHaveLength(5);
      expect(pack.sections.map((section) => section.kind)).toEqual(layout.sectionKinds);
      expect(pack).toMatchObject({
        diagnosticBatchCount: 5,
        diagnosticBatchCountSemantics: 'legacy-total-learning-activity-bank-alias',
        sourceDiagnosticBatchCount: layout.sourceBanks,
        guidedReviewBatchCount: layout.guidedBanks,
        learningActivityBankCount: 5,
        distinctSourceContentKernels: sourceKernelCount,
        parallelSourceVariants: sourceParallelCount,
        newIndependentItemsNeeded: remainingGap,
      });
      expect(pack.assistantReview).toMatchObject({
        reviewer: 'OpenAI Codex',
        structurallyReviewedItems: 500,
        sourceItems: layout.source,
        distinctSourceContentKernels: sourceKernelCount,
        parallelSourceVariants: sourceParallelCount,
        guidedReviewItems: layout.guided,
        independentQuestionTarget: 500,
        newIndependentItemsNeeded: remainingGap,
        verdict,
        taskForms: [
          'misconception-correction',
          'principle-justification',
          'evidence-comparison',
        ],
      });
      expect(pack.bankDisclosure).toMatch(/500 learning activities/i);
      expect(pack.assistantAuditUrl).toBe(
        './test_prep/test_prep_assistant_review_2026-07-16.json',
      );

      if (layout.assistantAuthored) {
        expect(pack.expansionVersion).toBe(
          'source-kernel-audit-plus-independent-batches-and-guided-review-v2',
        );
        expect(pack.sections[2]).toMatchObject({
          id: 'independent-diagnostic-batch-3',
          label: 'Assistant-reviewed independent diagnostic bank 3',
          kind: 'independent-diagnostic',
        });
        expect(pack).toMatchObject({
          sourceQuestionItems: layout.source,
          assistantAuthoredIndependentItems: layout.assistantAuthored,
          independentPracticeItems: layout.independent,
          guidedReviewItems: layout.guided,
          assistantAuthoredIndependentBatchCount: layout.assistantAuthoredBanks,
          independentDiagnosticBatchCount: layout.independentBanks,
          distinctIndependentContentKernels: independentKernelCount,
          parallelIndependentVariants: independentParallelCount,
        });
        expect(pack.assistantReview).toMatchObject({
          assistantAuthoredIndependentItems: layout.assistantAuthored,
          independentPracticeItems: layout.independent,
          distinctIndependentContentKernels: independentKernelCount,
          parallelIndependentVariants: independentParallelCount,
          independentBatchReview:
            'blueprint-key-distractor-feedback-originality-citation-balance-and-structural-review-v1',
        });
        expect(pack.assistantReview.independentBatchEvidence).toHaveLength(
          layout.assistantAuthoredBanks,
        );
        expect(pack.bankDisclosure).toMatch(
          new RegExp(
            '200 original source questions, '
              + layout.assistantAuthored
              + ' assistant-authored independent practice questions, and '
              + layout.guided
              + ' source-derived guided-review activities',
            'i',
          ),
        );
        if (stem === 'parapro') {
          expect(pack.sections.slice(2).map((section) => section.id)).toEqual([
            'independent-diagnostic-batch-3',
            'independent-diagnostic-batch-4',
            'independent-diagnostic-batch-5',
          ]);
        }
      } else {
        expect(pack.expansionVersion).toBe('source-kernel-audit-plus-guided-review-v1');
        expect(independentKernelCount).toBe(sourceKernelCount);
      }
    }
  }, 60_000);

  it('retains passing independent cross-review evidence for every authored ParaPro domain file', () => {
    const authoredDir = path.join(root, 'dev-tools', 'authored');
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(authoredDir, 'test_prep_independent_additions_manifest.json'),
        'utf8',
      ),
    );
    const batches = manifest.packs.parapro;

    expect(batches.map((batch) => batch.id)).toEqual([
      'independent-diagnostic-batch-3',
      'independent-diagnostic-batch-4',
      'independent-diagnostic-batch-5',
    ]);

    for (const batch of batches) {
      expect(batch.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(batch.files).toHaveLength(3);
      expect(batch.reviewReports).toHaveLength(3);
      let reviewedItems = 0;

      for (const reportFile of batch.reviewReports) {
        const report = JSON.parse(
          fs.readFileSync(path.join(authoredDir, reportFile), 'utf8'),
        );
        expect(report.reviewer).toContain('OpenAI Codex independent cross-review');
        expect(report.verdict).toMatch(/^pass/i);
        expect(Array.isArray(report.correctionsMade)).toBe(true);
        expect(report.checks).toBeTruthy();
        reviewedItems += report.itemCount;
      }

      expect(reviewedItems).toBe(100);
    }
  });
  it('keeps all IDs and prompts unique and validates the 300 new ParaPro items as independent', () => {
    for (const stem of expectedFiles) {
      const pack = readPack(stem);
      expect(new Set(pack.items.map((item) => item.id)).size).toBe(500);
      expect(new Set(pack.items.map((item) => item.prompt)).size).toBe(500);
      for (let bank = 0; bank < 5; bank++) {
        expect(answerCounts(pack.items.slice(bank * 100, bank * 100 + 100))).toEqual([
          25, 25, 25, 25,
        ]);
      }
    }

    const paraPro = readPack('parapro');
    const sourceItems = paraPro.items.slice(0, 200);
    const authoredItems = paraPro.items.slice(200, 500);
    const sourceKernels = new Set(sourceItems.map(contentKernel));
    const authoredKernels = authoredItems.map(contentKernel);
    const sourcePrompts = new Set(sourceItems.map((item) => canonical(item.prompt)));

    expect(authoredItems).toHaveLength(300);
    expect(new Set(authoredItems.map((item) => item.id)).size).toBe(300);
    expect(new Set(authoredItems.map((item) => canonical(item.prompt))).size).toBe(300);
    expect(new Set(authoredKernels).size).toBe(300);
    expect(authoredKernels.every((kernel) => !sourceKernels.has(kernel))).toBe(true);
    expect(authoredItems.every((item) => !sourcePrompts.has(canonical(item.prompt)))).toBe(true);
    expect(countBy(authoredItems, 'domainId')).toEqual({
      reading: 102,
      mathematics: 99,
      writing: 99,
    });
    expect(countBy(authoredItems, 'contentFocus')).toEqual({
      'basic-skills-knowledge': 201,
      'application-classroom': 99,
    });
    expect(answerCounts(authoredItems)).toEqual([75, 75, 75, 75]);

    for (let bankOffset = 0; bankOffset < 3; bankOffset++) {
      const bankItems = authoredItems.slice(bankOffset * 100, bankOffset * 100 + 100);
      expect(bankItems).toHaveLength(100);
      expect(countBy(bankItems, 'domainId')).toEqual({
        reading: 34,
        mathematics: 33,
        writing: 33,
      });
      expect(countBy(bankItems, 'contentFocus')).toEqual({
        'basic-skills-knowledge': 67,
        'application-classroom': 33,
      });
      expect(answerCounts(bankItems)).toEqual([25, 25, 25, 25]);
    }

    const reviewedAtByBatchId = new Map(
      paraPro.assistantReview.independentBatchEvidence.map((batch) => [batch.id, batch.reviewedAt]),
    );
    for (const [index, item] of authoredItems.entries()) {
      const independentBatchNumber = 3 + Math.floor(index / 100);
      const independentBatchId = `independent-diagnostic-batch-${independentBatchNumber}`;
      const assistantReviewedAt = reviewedAtByBatchId.get(independentBatchId);
      expect(assistantReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(item).toMatchObject({
        authorship: 'assistant-authored-independent',
        editorialReviewer: 'OpenAI Codex',
        assistantReviewStatus: 'reviewed-independent-practice-item',
        examItemStatus: 'assistant-approved-as-independent-practice-item',
        reviewStatus: 'assistant-reviewed-independent-practice-item',
        qaStatus: 'qa-passed-independent-practice-item',
        assistantReviewedAt,
        independentBatchId,
        independentBatchNumber,
        reviewMethod:
          'independent-item-key-distractor-feedback-originality-blueprint-and-structural-review-v1',
      });
      expect(item.sourceItemId).toBeUndefined();
      expect(item.prompt.trim().length).toBeGreaterThan(35);
      expect(item.choices).toHaveLength(4);
      expect(
        new Set(
          item.choices.map((choice) => String(choice ?? '')
            .normalize('NFKC')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase()),
        ).size,
      ).toBe(4);
      expect(item.rationale.trim().length).toBeGreaterThanOrEqual(80);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((value) => value.trim().length >= 20)).toBe(true);
      expect(item.skillIds.length).toBeGreaterThan(0);
      expect(item.chapterIds.length).toBeGreaterThan(0);
      expect(item.references.length).toBeGreaterThan(0);
      expect(item.references.every((reference) => reference.startsWith('https://'))).toBe(true);
    }
  }, 60_000);

  it('keeps guided tasks transformed, feedback-rich, and explicitly non-exam', () => {
    const allowedTaskForms = new Set([
      'misconception-correction',
      'principle-justification',
      'evidence-comparison',
    ]);

    for (const stem of expectedFiles) {
      const pack = readPack(stem);
      const layout = layoutFor(stem);
      const sourceById = Object.fromEntries(
        pack.items.slice(0, layout.source).map((item) => [item.id, item]),
      );
      const guidedItems = pack.items.slice(layout.independent);
      const taskForms = new Set();

      expect(guidedItems).toHaveLength(layout.guided);
      for (const item of guidedItems) {
        const source = sourceById[item.sourceItemId];
        expect(source).toBeTruthy();
        expect(item.prompt).not.toBe(source.prompt);
        expect(item.prompt.toLowerCase().endsWith(source.prompt.toLowerCase())).toBe(false);
        expect([...item.choices].sort()).not.toEqual([...source.choices].sort());
        expect(item.rationale).not.toBe(source.rationale);
        expect(item.rationale.length).toBeGreaterThanOrEqual(140);
        expect(item.choiceRationales).toHaveLength(4);
        expect(new Set(item.choices).size).toBe(4);
        expect(item).toMatchObject({
          expansionStatus: 'assistant-authored-guided-reasoning-task',
          authorship: 'assistant-authored-derived-from-reviewed-core',
          editorialReviewer: 'OpenAI Codex',
          assistantReviewStatus: 'reviewed-guided-practice-only',
          examItemStatus: 'not-approved-as-independent-exam-item',
          reviewStatus: 'assistant-reviewed-guided-practice-only',
          qaStatus: 'structural-qa-passed-guided-practice-only',
        });
        expect(allowedTaskForms.has(item.taskForm)).toBe(true);
        taskForms.add(item.taskForm);
      }

      expect(taskForms.size).toBe(layout.guidedBanks);
      expect(pack.contentReview).toMatch(
        new RegExp(`${layout.guided} additional activities are .*guided reasoning transformations`, 'i'),
      );
    }
  }, 60_000);

  it('derives every guided-review answer from the declared item-specific source feedback', () => {
    for (const stem of expectedFiles) {
      const pack = readPack(stem);
      const layout = layoutFor(stem);
      const sourceById = Object.fromEntries(
        pack.items.slice(0, layout.source).map((item) => [item.id, item]),
      );

      for (const item of pack.items.slice(layout.independent)) {
        const source = sourceById[item.sourceItemId];
        const correctIndex = source.answerIndex;
        const wrongIndexes = source.choices
          .map((_, index) => index)
          .filter((index) => index !== correctIndex);
        const feedbacks = source.choiceRationales.map((value) => compact(value, 260));
        const actual = canonical(item.choices[item.answerIndex]);

        if (item.expansionBatch === 3) {
          expect(actual).toBe(canonical(feedbacks[wrongIndexes[0]]));
        } else if (item.expansionBatch === 4) {
          expect(actual).toContain(canonical(source.choices[correctIndex]));
          expect(actual).toContain(
            canonical(feedbacks[correctIndex]).slice(
              0,
              Math.min(36, canonical(feedbacks[correctIndex]).length),
            ),
          );
        } else {
          expect(item.expansionBatch).toBe(5);
          expect(actual).toContain(canonical(source.choices[correctIndex]));
          expect(actual).toContain(
            canonical(feedbacks[correctIndex]).slice(
              0,
              Math.min(36, canonical(feedbacks[correctIndex]).length),
            ),
          );
          expect(actual).toContain(canonical(source.choices[wrongIndexes[0]]));
        }
        expect(item.answerDerivation).toBeTruthy();
      }
    }
  }, 60_000);

  it('preserves complete feedback, dynamic QA inventory, and exact deployment mirrors', () => {
    for (const stem of expectedFiles) {
      const pack = readPack(stem);
      const layout = layoutFor(stem);
      const independentKernelCount = new Set(
        pack.items.slice(0, layout.independent).map(contentKernel),
      ).size;
      const remainingGap = 500 - independentKernelCount;
      const verdict = remainingGap ? 'reviewed-target-not-met' : 'reviewed-target-met';
      const distinctnessStatus = remainingGap ? 'target-not-met' : 'target-met';

      expect(
        pack.items.every(
          (item) => item.rationale
            && item.choiceRationales?.length === item.choices?.length
            && item.references?.length,
        ),
      ).toBe(true);

      for (const file of [
        `${stem}_pack.json`,
        `${stem}_items.json`,
        `${stem}_native_qa.json`,
      ]) {
        expect(fs.readFileSync(path.join(deployDir, file), 'utf8')).toBe(
          fs.readFileSync(path.join(sourceDir, file), 'utf8'),
        );
      }

      const qa = JSON.parse(
        fs.readFileSync(path.join(sourceDir, `${stem}_native_qa.json`), 'utf8'),
      );
      const commonQaMetrics = {
        totalItems: 500,
        passedItems: 500,
        sourceItems: layout.source,
        distinctSourceContentKernels: pack.distinctSourceContentKernels,
        parallelSourceVariants: pack.parallelSourceVariants,
        guidedReasoningItems: layout.guided,
        independentQuestionTarget: 500,
        newIndependentItemsNeeded: remainingGap,
        structuralStatus: 'pass',
        contentDistinctnessStatus: distinctnessStatus,
        assistantReviewVerdict: verdict,
        status: 'pass',
      };

      expect(qa.summary).toMatchObject(commonQaMetrics);
      expect(qa.expansion).toMatchObject({
        independentQuestionTarget: 500,
        totalLearningActivities: 500,
        learningActivityBanks: 5,
        sourceItems: layout.source,
        distinctSourceContentKernels: pack.distinctSourceContentKernels,
        parallelSourceVariants: pack.parallelSourceVariants,
        guidedReasoningItems: layout.guided,
        newIndependentItemsNeeded: remainingGap,
        structurallyReviewedItems: 500,
        reviewer: 'OpenAI Codex',
        examItemReview: verdict,
      });

      if (stem === 'parapro') {
        const independentFields = {
          assistantAuthoredIndependentItems: layout.assistantAuthored,
          independentPracticeItems: layout.independent,
          distinctIndependentContentKernels: independentKernelCount,
          parallelIndependentVariants: layout.independent - independentKernelCount,
        };
        expect(qa.summary).toMatchObject({
          ...independentFields,
          sourceDiagnosticBanks: layout.sourceBanks,
          assistantAuthoredIndependentBanks: layout.assistantAuthoredBanks,
          independentDiagnosticBanks: layout.independentBanks,
          guidedReviewBanks: layout.guidedBanks,
          learningActivityBanks: 5,
        });
        expect(qa.expansion).toMatchObject(independentFields);
        expect(qa.diagnosticBatch).toMatchObject({
          batchCount: 5,
          batchCountSemantics: 'legacy-total-learning-activity-bank-alias',
          sourceBatchCount: layout.sourceBanks,
          assistantAuthoredIndependentBatchCount: layout.assistantAuthoredBanks,
          independentDiagnosticBatchCount: layout.independentBanks,
          guidedReviewBatchCount: layout.guidedBanks,
          learningActivityBankCount: 5,
        });
      }
    }
  }, 60_000);

  it('ships a schema-v2 audit whose inventory is derived from hash-bound pack rows', () => {
    for (const name of [
      'test_prep_assistant_review_2026-07-16.json',
      'test_prep_assistant_review_2026-07-16.md',
    ]) {
      expect(fs.readFileSync(path.join(deployDir, name), 'utf8')).toBe(
        fs.readFileSync(path.join(sourceDir, name), 'utf8'),
      );
    }

    const audit = JSON.parse(
      fs.readFileSync(
        path.join(sourceDir, 'test_prep_assistant_review_2026-07-16.json'),
        'utf8',
      ),
    );
    expect(audit.schemaVersion).toBe(2);
    expect(audit.perPack).toHaveLength(expectedFiles.length);
    expect(audit.perPack.map((row) => row.stem).sort()).toEqual([...expectedFiles].sort());

    const snapshotParts = [];
    for (const row of audit.perPack) {
      const packBytes = fs.readFileSync(path.join(sourceDir, `${row.stem}_pack.json`));
      const itemsBytes = fs.readFileSync(path.join(sourceDir, `${row.stem}_items.json`));
      const pack = JSON.parse(packBytes);
      const layout = layoutFor(row.stem);
      const independentKernelCount = new Set(
        pack.items.slice(0, layout.independent).map(contentKernel),
      ).size;
      const remainingGap = 500 - independentKernelCount;

      expect(sha256(packBytes)).toBe(row.packSha256);
      expect(sha256(itemsBytes)).toBe(row.itemsSha256);
      expect(row).toMatchObject({
        learningActivities: 500,
        sourceQuestions: layout.source,
        assistantAuthoredIndependentItems: layout.assistantAuthored,
        independentPracticeItems: layout.independent,
        distinctSourceContentKernels: pack.distinctSourceContentKernels,
        parallelSourceVariants: pack.parallelSourceVariants,
        distinctIndependentContentKernels: independentKernelCount,
        parallelIndependentVariants: layout.independent - independentKernelCount,
        guidedReviewActivities: layout.guided,
        independentQuestionTarget: 500,
        newIndependentItemsNeeded: remainingGap,
        verdict: remainingGap ? 'reviewed-target-not-met' : 'reviewed-target-met',
      });
      snapshotParts.push(`${row.stem}:${row.packSha256}:${row.itemsSha256}`);
    }

    const sum = (key) => audit.perPack.reduce((total, row) => total + row[key], 0);
    const derivedInventory = {
      originalSourceQuestions: sum('sourceQuestions'),
      distinctSourceContentKernels: sum('distinctSourceContentKernels'),
      parallelSourceVariants: sum('parallelSourceVariants'),
      assistantAuthoredIndependentItems: sum('assistantAuthoredIndependentItems'),
      independentPracticeItems: sum('independentPracticeItems'),
      distinctIndependentContentKernels: sum('distinctIndependentContentKernels'),
      parallelIndependentVariants: sum('parallelIndependentVariants'),
      guidedReviewActivities: sum('guidedReviewActivities'),
      independentQuestionTarget: sum('independentQuestionTarget'),
      newIndependentItemsNeeded: sum('newIndependentItemsNeeded'),
    };

    expect(audit.inventory).toEqual(derivedInventory);
    expect(audit.status).toBe(
      derivedInventory.newIndependentItemsNeeded
        ? 'reviewed-target-not-met'
        : 'reviewed-target-met',
    );
    expect(audit.scope).toMatchObject({
      packs: audit.perPack.length,
      totalLearningActivities: sum('learningActivities'),
      originalSourceQuestions: derivedInventory.originalSourceQuestions,
      assistantAuthoredIndependentItems: derivedInventory.assistantAuthoredIndependentItems,
      independentPracticeItems: derivedInventory.independentPracticeItems,
      guidedReviewActivities: derivedInventory.guidedReviewActivities,
      newIndependentParaProItemsReviewed: derivedInventory.assistantAuthoredIndependentItems,
      allActivitiesStructurallyChecked: true,
      allGuidedAnswerDerivationsChecked: true,
    });
    expect(audit.snapshot).toMatchObject({
      algorithm: 'sha256',
      hash: sha256(snapshotParts.join('\n')),
    });
  }, 60_000);

  it('catalogs every ParaPro Banks 3-5 source with readable metadata and an exact deploy mirror', () => {
    const sourceCatalogBytes = fs.readFileSync(
      path.join(sourceDir, 'reference_catalog.json'),
      'utf8',
    );
    expect(
      fs.readFileSync(path.join(deployDir, 'reference_catalog.json'), 'utf8'),
    ).toBe(sourceCatalogBytes);

    const catalog = JSON.parse(sourceCatalogBytes);
    const paraPro = readPack('parapro');
    const authoredReferences = new Set(
      paraPro.items.slice(200, 500).flatMap((item) => item.references || []),
    );

    for (const url of paraProReferenceUrls) {
      expect(authoredReferences.has(url), `${url} should be used by ParaPro Banks 3-5`).toBe(true);
    }
    expect(authoredReferences.size).toBeGreaterThanOrEqual(paraProReferenceUrls.length);

    for (const url of authoredReferences) {
      expect(
        Object.prototype.hasOwnProperty.call(catalog, url),
        `${url} should have a catalog record`,
      ).toBe(true);
      const detail = catalog[url];
      expect(detail.title.trim().length).toBeGreaterThan(12);
      expect(detail.organization.trim().length).toBeGreaterThan(4);
      expect(detail.summary.trim().length).toBeGreaterThan(40);
      expect(detail.credibility.trim().length).toBeGreaterThan(40);
    }
  });
});

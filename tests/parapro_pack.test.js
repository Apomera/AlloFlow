import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Hub;
let pack;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  pack = Hub.listPacks().find((candidate) => candidate.id === 'parapro-1755-practice-1');
});

describe('ParaPro 1755 diagnostic bank', () => {
  it('registers five ready 100-item batches that closely preserve the official content proportions', () => {
    expect(pack).toBeTruthy();
    expect(pack.status).toBe('ready');
    expect(pack.items).toHaveLength(500);
    expect(pack.batchSize).toBe(100);
    expect(pack.sections).toHaveLength(5);
    expect(pack.sections.map((section) => section.id)).toEqual(['diagnostic-batch-1', 'diagnostic-batch-2', 'independent-diagnostic-batch-3', 'independent-diagnostic-batch-4', 'independent-diagnostic-batch-5']);
    expect(pack.sections.map((section) => section.kind)).toEqual(['source-diagnostic', 'source-diagnostic', 'independent-diagnostic', 'independent-diagnostic', 'independent-diagnostic']);
    expect(pack).toMatchObject({
      sourceDiagnosticBatchCount: 2,
      assistantAuthoredIndependentBatchCount: 3,
      independentDiagnosticBatchCount: 5,
      guidedReviewBatchCount: 0,
    });
    // Honest tiers: 200 source-reviewed questions and 300 assistant-reviewed
    // independent-practice questions, with no guided transformations counted as questions.
    expect(pack.items.slice(0, 200).every((item) => item.reviewStatus === 'source-reviewed' && item.qaStatus === 'qa-passed')).toBe(true);
    expect(pack.items.slice(200).every((item) => item.reviewStatus === 'assistant-reviewed-independent-practice-item' && item.qaStatus === 'qa-passed-independent-practice-item')).toBe(true);
    expect(Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]))).toEqual({
      reading: 1 / 3,
      mathematics: 1 / 3,
      writing: 1 / 3,
    });

    const expectedBatch = {
      reading: { total: 34, skills: 23, application: 11 },
      mathematics: { total: 33, skills: 22, application: 11 },
      writing: { total: 33, skills: 22, application: 11 },
    };

    for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
      const batch = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
      expect(batch).toHaveLength(100);
      for (const domainId of ['reading', 'mathematics', 'writing']) {
        const domainItems = batch.filter((item) => item.domainId === domainId);
        expect(domainItems).toHaveLength(expectedBatch[domainId].total);
        expect(domainItems.filter((item) => item.id.includes('-skills-'))).toHaveLength(expectedBatch[domainId].skills);
        expect(domainItems.filter((item) => item.id.includes('-application-'))).toHaveLength(expectedBatch[domainId].application);
      }
    }
    expect(pack.items.filter((item) => item.domainId === 'reading')).toHaveLength(170);
    expect(pack.items.filter((item) => item.domainId === 'mathematics')).toHaveLength(165);
    expect(pack.items.filter((item) => item.domainId === 'writing')).toHaveLength(165);
    expect(Hub.batchMeta(pack, 100)).toMatchObject({ batchNumber: 2, batchCount: 5, position: 1, startIndex: 100, endIndex: 200, isFinalBatch: false });
    expect(pack.description).toContain('official ParaPro Assessment currently has 90 questions');
  });

  it('keeps every item explained and preserves its reviewed content tier', () => {
    const sourceItems = pack.items.slice(0, 200);
    const authoredIndependentItems = pack.items.slice(200);

    expect(pack.items.every((item) => item.type === 'single-choice')).toBe(true);
    expect(pack.items.every((item) => item.choices.length === 4)).toBe(true);
    expect(pack.items.every((item) => item.choiceRationales.length === 4)).toBe(true);
    expect(pack.items.every((item) => item.rationale.length >= 80)).toBe(true);
    expect(pack.items.every((item) => item.references.includes('https://www.ets.org/pdfs/parapro/1755.pdf'))).toBe(true);
    expect(sourceItems.every((item) => item.reviewStatus === 'source-reviewed' && item.qaStatus === 'qa-passed')).toBe(true);
    expect(authoredIndependentItems.every((item) => item.authorship === 'assistant-authored-independent'
      && item.assistantReviewStatus === 'reviewed-independent-practice-item'
      && item.examItemStatus === 'assistant-approved-as-independent-practice-item'
      && item.reviewStatus === 'assistant-reviewed-independent-practice-item'
      && item.qaStatus === 'qa-passed-independent-practice-item'
      && !item.sourceItemId
      && item.references.length > 0)).toBe(true);
    expect(pack.guidedReviewItems).toBe(0);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(pack.items.length);

    const combinedPrompts = pack.items.map((item) => item.prompt.toLowerCase()).join('\n');
    expect(combinedPrompts).not.toContain('early scientists believed that all dinosaurs');
    expect(combinedPrompts).not.toContain('how to teach your dog to sit');
  });

  it('balances answer positions and never invents an official or scaled result', () => {
    const answerCounts = pack.items.reduce((counts, item) => {
      counts[item.answerIndex] += 1;
      return counts;
    }, [0, 0, 0, 0]);
    expect(answerCounts).toEqual([125, 125, 125, 125]);

    const answers = Object.fromEntries(pack.items.map((item) => [item.id, item.answerIndex]));
    const score = Hub.scoreAttempt(pack, answers);
    expect(score).toMatchObject({ correct: 500, total: 500, percent: 100 });
    expect(score).not.toHaveProperty('scaledScore');
    expect(score).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official or scaled ParaPro scores');
    expect(pack.disclaimer).toContain('official ParaPro Assessment currently has 90 questions');
    expect(pack.disclaimer).toContain('state and local requirements');
  });

  it('produces post-batch domain diagnostics, confidence calibration, and targeted feedback', () => {
    const answers = Object.fromEntries(pack.items.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(pack.items.map((item) => [item.id, 'sure']));
    const missedItems = [
      pack.items.find((item) => item.domainId === 'reading'),
      pack.items.find((item) => item.domainId === 'mathematics'),
    ];
    missedItems.forEach((item) => { answers[item.id] = (item.answerIndex + 1) % item.choices.length; });

    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 1);
    const domainRows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));

    expect(Hub.batchMeta(pack, 99)).toMatchObject({ batchNumber: 1, batchCount: 5, position: 100, startIndex: 0, endIndex: 100, isFinalBatch: false });
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(Hub.batchMeta(pack, 100)).toMatchObject({ batchNumber: 2, batchCount: 5, position: 1, startIndex: 100, endIndex: 200, isFinalBatch: false });
    expect(Hub.buildBatchDiagnostic(pack, answers, confidence, 2)).toMatchObject({ batchNumber: 2, batchCount: 5, firstQuestion: 101, lastQuestion: 200, correct: 100, total: 100, percent: 100, isFinalBatch: false });
    expect(domainRows.reading).toMatchObject({ correct: 33, total: 34, missed: 1 });
    expect(domainRows.mathematics).toMatchObject({ correct: 32, total: 33, missed: 1 });
    expect(domainRows.writing).toMatchObject({ correct: 33, total: 33, missed: 0 });
    expect(diagnostic.confidentMissQuestionNumbers).toEqual(missedItems.map((item) => pack.items.indexOf(item) + 1));
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic).not.toHaveProperty('passed');
  });


  it('publishes a passing QA report and exact deploy mirrors', () => {
    const rootPack = fs.readFileSync(resolve(process.cwd(), 'test_prep/parapro_pack.json'), 'utf8');
    const deployPack = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/parapro_pack.json'), 'utf8');
    const rootQa = fs.readFileSync(resolve(process.cwd(), 'test_prep/parapro_native_qa.json'), 'utf8');
    const deployQa = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/parapro_native_qa.json'), 'utf8');
    const rootQaMarkdown = fs.readFileSync(resolve(process.cwd(), 'test_prep/parapro_native_qa.md'), 'utf8');
    const deployQaMarkdown = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/parapro_native_qa.md'), 'utf8');
    const currentPack = JSON.parse(rootPack);
    const report = JSON.parse(rootQa);

    expect(deployPack).toBe(rootPack);
    expect(deployQa).toBe(rootQa);
    expect(deployQaMarkdown).toBe(rootQaMarkdown);
    expect(rootQaMarkdown).toContain('# ParaPro diagnostic-bank QA report');
    expect(rootQaMarkdown).not.toMatch(/^# ParaPro \d+-item diagnostic bank QA report/m);
    expect(rootQaMarkdown).toContain(`Pack: ${currentPack.title} v${currentPack.version}`);
    expect(report.summary).toMatchObject({ totalItems: 500, passedItems: 500, reviewRequiredItems: 0, status: 'pass' });
    expect(report.blueprint.categories).toEqual({
      reading: { total: 30, skills: 20, application: 10 },
      mathematics: { total: 30, skills: 20, application: 10 },
      writing: { total: 30, skills: 20, application: 10 },
    }, 20000);
    expect(report.diagnosticBatch.categories).toEqual({
      reading: { total: 34, skills: 23, application: 11 },
      mathematics: { total: 33, skills: 22, application: 11 },
      writing: { total: 33, skills: 22, application: 11 },
    });
    expect(report.standard.limitation).toContain('not psychometric calibration');
    expect(report.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100 });
    expect(report.diagnosticBatch.batches).toHaveLength(2);
    expect(report.diagnosticBatch.batches[0]).toMatchObject({ batchNumber: 1, firstQuestion: 1, lastQuestion: 100, skillsAndKnowledgeItems: 67, classroomApplicationItems: 33 });
    expect(report.diagnosticBatch.batches[1]).toMatchObject({ batchNumber: 2, firstQuestion: 101, lastQuestion: 200, skillsAndKnowledgeItems: 67, classroomApplicationItems: 33 });
  });

  it('keeps the ParaPro build isolated from EPPP refresh scripts', () => {
    const builder = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_test_prep_hub_release.cjs'), 'utf8');
    expect(builder).toContain("registerTestPrepPack(PARAPRO_PRACTICE_PACK)");
    expect(builder).toContain("qa_parapro_pack_release.cjs");
    expect(builder).toContain('build_parapro_batch_2.cjs');
    expect(builder).toContain('buildBatchDiagnostic: testPrepBuildBatchDiagnostic');
    expect(builder).toContain('recordBatchAttempt: recordTestPrepBatchAttempt');
    expect(builder).not.toContain("qa_eppp_native_pack.cjs");
    expect(builder).not.toContain("build_eppp_learning_library.cjs");
  });
});


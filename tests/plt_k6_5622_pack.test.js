import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Hub;
let pack;

beforeAll(() => {
  window.React = window.React || { useState: (value) => [typeof value === 'function' ? value() : value, () => {}], useEffect: () => {}, useRef: () => ({ current: null }), createElement: () => null, Fragment: 'fragment' };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-plt-k6-5622');
});

describe('Praxis PLT K–6 5622 diagnostic bank', () => {
  it('registers two source diagnostics plus three guided-review banks with the exact selected-response category proportions', () => {
    expect(pack).toBeTruthy();
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 70, simulationTimeMinutes: 70, officialSelectedResponseCount: 70, officialConstructedResponseCount: 4 });
    expect(pack.items).toHaveLength(500);
    expect(pack.sections).toHaveLength(5);
    expect(pack.sections.map((section) => section.id)).toEqual(['diagnostic-batch-1', 'diagnostic-batch-2', 'guided-review-bank-1', 'guided-review-bank-2', 'guided-review-bank-3']);
    expect(pack.sections.map((section) => section.kind)).toEqual(['source-diagnostic', 'source-diagnostic', 'guided-review', 'guided-review', 'guided-review']);
    expect(pack).toMatchObject({ sourceDiagnosticBatchCount: 2, guidedReviewBatchCount: 3 });
    expect(Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]))).toEqual({
      'students-as-learners': 0.30,
      'instructional-process': 0.30,
      assessment: 0.20,
      'professional-development-leadership-community': 0.20,
    });
    const expected = { 'students-as-learners': 30, 'instructional-process': 30, assessment: 20, 'professional-development-leadership-community': 20 };
    for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
      const batch = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
      for (const [domainId, count] of Object.entries(expected)) expect(batch.filter((item) => item.domainId === domainId)).toHaveLength(count);
      expect(batch.reduce((counts, item) => { counts[item.answerIndex] += 1; return counts; }, [0, 0, 0, 0])).toEqual([25, 25, 25, 25]);
    }
  });

  it('keeps every item original and fully explained, with the review tier stated honestly per item', () => {
    const prompts = pack.items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim());
    expect(new Set(prompts).size).toBe(500);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(500);
    pack.items.forEach((item, index) => {
      expect(item.type).toBe('single-choice');
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.rationale.length).toBeGreaterThanOrEqual(100);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((entry) => entry.length >= 100)).toBe(true);
      expect(item.references).toContain('https://www.ets.org/pdfs/praxis/5622.pdf');
      // Two honest tiers: 200 source-reviewed questions, then 300 guided-review
      // activities that MUST NOT claim qa-passed until experts validate them.
      if (index < 200) expect(item).toMatchObject({ reviewStatus: 'source-reviewed', qaStatus: 'qa-passed' });
      else expect(item).toMatchObject({ reviewStatus: 'assistant-reviewed-guided-practice-only', qaStatus: 'structural-qa-passed-guided-practice-only' });
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    });
  });

  it('is candid that guided activities are not independent, expert-validated exam questions', () => {
    expect(pack.bankDisclosure).toContain('not 500 independent exam questions');
    expect(pack.assistantReview).toMatchObject({ sourceItems: 200, guidedReviewItems: 300, verdict: 'reviewed-target-not-met' });
    // No guided-tier item may launder into the reviewed tier.
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'structural-qa-passed-guided-practice-only').every((item) => item.reviewStatus === 'assistant-reviewed-guided-practice-only')).toBe(true);
  });

  it('builds category and confidence diagnostics without inventing a scaled score or pass decision', () => {
    const firstBatch = pack.items.slice(0, 100);
    const answers = Object.fromEntries(firstBatch.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(firstBatch.map((item) => [item.id, 'sure']));
    const misses = [firstBatch.find((item) => item.domainId === 'students-as-learners'), firstBatch.find((item) => item.domainId === 'assessment')];
    for (const item of misses) answers[item.id] = (item.answerIndex + 1) % 4;
    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 0);
    const rows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(rows['students-as-learners']).toMatchObject({ correct: 29, total: 30, missed: 1 });
    expect(rows.assessment).toMatchObject({ correct: 19, total: 20, missed: 1 });
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official or scaled Praxis scores');
    expect(pack.simulationNote).toContain('separate case-analysis workshops');
  });

  it('preserves disability, privacy, language-access, reporting, speech, and assessment safeguards', () => {
    const answerText = pack.items.map((item) => item.choices[item.answerIndex]).join(' ');
    expect(answerText).toContain('MTSS must not delay or deny a full individual evaluation');
    expect(answerText).toContain('legitimate educational interest tied to professional responsibility');
    expect(answerText).toContain('qualified accessible language support');
    expect(answerText).toContain('promptly follow current mandated-reporting law and school procedure');
    expect(answerText).toContain('current viewpoint-neutral school policy');
    expect(answerText).toContain('remove an access barrier without changing the essential construct');
  });

  it('publishes structurally-clean QA with honest tier counts and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/plt_k6_5622_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, findings: 0, status: 'pass', sourceItems: 200, guidedReasoningItems: 300, contentDistinctnessStatus: 'target-not-met', assistantReviewVerdict: 'reviewed-target-not-met' });
    expect(qa.blueprint).toMatchObject({ officialSelectedResponseCount: 70, officialConstructedResponseCount: 4, officialTotalTimeMinutes: 120, recommendedSelectedResponseMinutes: 70, recommendedConstructedResponseMinutes: 50, caseAnalysis: { constructedResponseQuestions: 4, percentageOfExam: 25, caseHistories: 2 } });
    expect(qa.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100, categories: { 'students-as-learners': 30, 'instructional-process': 30, assessment: 20, 'professional-development-leadership-community': 20 } });
    expect(qa.standard.limitation).toContain('independent practicing K–6 educator validation');
    expect(qa.standard.limitation).toContain('official constructed-response scoring');
    for (const name of ['plt_k6_5622_items.json', 'plt_k6_5622_pack.json', 'plt_k6_5622_native_qa.json', 'plt_k6_5622_native_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  }, 20000);
}, 20000);

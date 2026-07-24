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
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-educational-leadership-5412');
});

describe('Praxis Educational Leadership 5412 diagnostic bank', () => {
  it('registers five ready 100-item diagnostics with the exact current ETS category proportions', () => {
    expect(pack).toBeTruthy();
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 120, simulationTimeMinutes: 165, officialSelectedResponseCount: 120, officialConstructedResponseCount: 0 });
    expect(pack.items).toHaveLength(500);
    expect(pack.sections).toHaveLength(5);
    expect(pack.sections.map((section) => section.id)).toEqual(['diagnostic-batch-1', 'diagnostic-batch-2', 'independent-diagnostic-batch-3', 'guided-review-bank-1', 'guided-review-bank-2']);
    expect(pack.sections.map((section) => section.kind)).toEqual(['source-diagnostic', 'source-diagnostic', 'independent-diagnostic', 'guided-review', 'guided-review']);
    // Honest tiers: 200 source-reviewed, 100 assistant-authored independent, and 200 guided-review activities.
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed-independent-practice-item')).toHaveLength(100);
    expect(pack.items.filter((item) => item.qaStatus === 'structural-qa-passed-guided-practice-only')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'structural-qa-passed-guided-practice-only').every((item) => item.reviewStatus === 'assistant-reviewed-guided-practice-only')).toBe(true);
    expect(Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]))).toEqual({
      'strategic-leadership': 0.17,
      'instructional-leadership': 0.23,
      'climate-cultural-leadership': 0.18,
      'ethical-leadership': 0.16,
      'organizational-leadership': 0.13,
      'community-engagement-leadership': 0.13,
    });
    const expected = { 'strategic-leadership': 17, 'instructional-leadership': 23, 'climate-cultural-leadership': 18, 'ethical-leadership': 16, 'organizational-leadership': 13, 'community-engagement-leadership': 13 };
    for (let batchIndex = 0; batchIndex < 3; batchIndex += 1) {
      const batch = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
      for (const [domainId, count] of Object.entries(expected)) expect(batch.filter((item) => item.domainId === domainId)).toHaveLength(count);
      expect(batch.reduce((counts, item) => { counts[item.answerIndex] += 1; return counts; }, [0, 0, 0, 0])).toEqual([25, 25, 25, 25]);
    }
  });

  it('keeps all items original, fully explained, source-reviewed, and chapter-linked', () => {
    const prompts = pack.items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim());
    expect(new Set(prompts).size).toBe(500);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(500);
    for (const item of pack.items) {
      expect(item.type).toBe('single-choice');
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.rationale.length).toBeGreaterThanOrEqual(100);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((entry) => entry.length >= 100)).toBe(true);
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5412.pdf');
      expect(['source-reviewed | qa-passed', 'assistant-reviewed-independent-practice-item | qa-passed-independent-practice-item', 'assistant-reviewed-guided-practice-only | structural-qa-passed-guided-practice-only']).toContain(item.reviewStatus + ' | ' + item.qaStatus);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    }
  });

  it('builds category and confidence diagnostics without inventing a scaled score or credential result', () => {
    const firstBatch = pack.items.slice(0, 100);
    const answers = Object.fromEntries(firstBatch.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(firstBatch.map((item) => [item.id, 'sure']));
    const misses = [firstBatch.find((item) => item.domainId === 'strategic-leadership'), firstBatch.find((item) => item.domainId === 'instructional-leadership')];
    for (const item of misses) answers[item.id] = (item.answerIndex + 1) % 4;
    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 0);
    const rows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(rows['strategic-leadership']).toMatchObject({ correct: 16, total: 17, missed: 1 });
    expect(rows['instructional-leadership']).toMatchObject({ correct: 22, total: 23, missed: 1 });
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official or scaled Praxis scores');
    expect(pack.disclaimer).toContain('not official forms');
  });

  it('preserves evaluation, privacy, civil-rights, cybersecurity, emergency, and ethics safeguards', () => {
    const correct = (fragment) => { const item = pack.items.find((entry) => entry.prompt.includes(fragment)); return item.choices[item.answerIndex]; };
    expect(correct('MTSS relate to special-education evaluation')).toContain('must not delay or deny a full individual evaluation');
    expect(correct('identifiable student records')).toContain('minimum necessary information');
    expect(correct('K-12 cybersecurity leadership responsibility')).toContain('multifactor authentication');
    expect(correct('high-quality emergency operations plan')).toContain('emergency operations plan');
    expect(correct('discrimination or retaliation')).toContain('protect against retaliation');
    expect(correct('personal financial conflict')).toContain('Disclose the interest');
  });

  it('publishes zero-finding QA and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/educational_leadership_5412_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, reviewRequiredItems: 0, findings: 0, status: 'pass' });
    expect(qa.blueprint).toMatchObject({ officialQuestionCount: 120, timeMinutes: 165, selectedResponse: true, categories: { 'strategic-leadership': { questions: 20, percentage: 17 }, 'instructional-leadership': { questions: 27, percentage: 23 }, 'climate-cultural-leadership': { questions: 22, percentage: 18 }, 'ethical-leadership': { questions: 19, percentage: 16 }, 'organizational-leadership': { questions: 16, percentage: 13 }, 'community-engagement-leadership': { questions: 16, percentage: 13 } } });
    expect(qa.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100, categories: { 'strategic-leadership': 17, 'instructional-leadership': 23, 'climate-cultural-leadership': 18, 'ethical-leadership': 16, 'organizational-leadership': 13, 'community-engagement-leadership': 13 } });
    expect(qa.standard.limitation).toContain('independent practicing-school-leader validation');
    for (const name of ['educational_leadership_5412_items.json', 'educational_leadership_5412_pack.json', 'educational_leadership_5412_native_qa.json', 'educational_leadership_5412_native_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  }, 20000);
});

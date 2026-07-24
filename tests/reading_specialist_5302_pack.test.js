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
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-reading-specialist-5302');
});

describe('Praxis Reading Specialist 5302 diagnostic bank', () => {
  it('registers five ready 100-item diagnostics and distinguishes the mixed official format', () => {
    expect(pack).toBeTruthy();
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 95, simulationTimeMinutes: 150, simulationLabel: '95-question selected-response timed segment', officialSelectedResponseCount: 95, officialConstructedResponseCount: 2 });
    expect(pack.simulationNote).toContain('selected-response items only');
    expect(pack.simulationNote).toContain('does not score constructed responses');
    expect(pack.items).toHaveLength(500);
    expect(pack.sections).toHaveLength(5);
    expect(pack.sections.map((section) => section.id)).toEqual(['diagnostic-batch-1', 'diagnostic-batch-2', 'guided-review-bank-1', 'guided-review-bank-2', 'guided-review-bank-3']);
    expect(pack.sections.map((section) => section.kind)).toEqual(['source-diagnostic', 'source-diagnostic', 'guided-review', 'guided-review', 'guided-review']);
    // Honest tiers: exactly 200 expert/source-reviewed items; every other item
    // must carry the candid guided-review status until experts validate it.
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'structural-qa-passed-guided-practice-only').every((item) => item.reviewStatus === 'assistant-reviewed-guided-practice-only')).toBe(true);
    expect(Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]))).toEqual({ 'curriculum-instruction': 0.37, assessment: 0.23, 'professional-leadership': 0.15 });
    const expected = { 'curriculum-instruction': 49, assessment: 31, 'professional-leadership': 20 };
    for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
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
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5302.pdf');
      expect(['source-reviewed | qa-passed', 'assistant-reviewed-guided-practice-only | structural-qa-passed-guided-practice-only']).toContain(item.reviewStatus + ' | ' + item.qaStatus);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    }
  });

  it('builds diagnostics without inventing a scaled or written-response score', () => {
    const firstBatch = pack.items.slice(0, 100);
    const answers = Object.fromEntries(firstBatch.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(firstBatch.map((item) => [item.id, 'sure']));
    const misses = [firstBatch.find((item) => item.domainId === 'curriculum-instruction'), firstBatch.find((item) => item.domainId === 'assessment')];
    for (const item of misses) answers[item.id] = (item.answerIndex + 1) % 4;
    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 0);
    const rows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(rows['curriculum-instruction']).toMatchObject({ correct: 48, total: 49, missed: 1 });
    expect(rows.assessment).toMatchObject({ correct: 30, total: 31, missed: 1 });
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('constructedResponseScore');
    expect(diagnostic).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official or scaled Praxis scores');
    expect(pack.disclaimer).toContain('constructed-response scores');
  });

  it('preserves screening, multilingual, MTSS, accommodation, and privacy safeguards', () => {
    const correct = (fragment) => { const item = pack.items.find((entry) => entry.prompt.includes(fragment)); return item.choices[item.answerIndex]; };
    expect(correct('pattern is commonly associated with dyslexia')).toContain('evaluated comprehensively');
    expect(correct('language difference from disability')).toContain('performance across languages and contexts');
    expect(correct('role in MTSS leadership')).toContain('must not delay or deny an evaluation');
    expect(correct('accommodation be evaluated')).toContain('without changing the construct');
    expect(correct('identifiable literacy data')).toContain('minimum information needed');
  });

  it('publishes zero-finding QA and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/reading_specialist_5302_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, reviewRequiredItems: 0, findings: 0, status: 'pass' });
    expect(qa.blueprint).toMatchObject({ officialQuestionCount: 97, selectedResponseCount: 95, constructedResponseCount: 2, timeMinutes: 150, categories: { 'curriculum-instruction': { questions: 47, percentage: 37 }, assessment: { questions: 29, percentage: 23 }, 'professional-leadership': { questions: 19, percentage: 15 }, application: { questions: 2, percentage: 25, responseType: 'constructed-response' } } });
    expect(qa.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100, categories: { 'curriculum-instruction': 49, assessment: 31, 'professional-leadership': 20 } });
    expect(qa.standard.limitation).toContain('independent reading-specialist validation');
    for (const name of ['reading_specialist_5302_items.json', 'reading_specialist_5302_pack.json', 'reading_specialist_5302_native_qa.json', 'reading_specialist_5302_native_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  }, 20000);
});

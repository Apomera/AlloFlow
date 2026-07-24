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
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-audiology-5343');
});

describe('Praxis Audiology 5343 diagnostic bank', () => {
  it('registers five ready 100-item batches with the exact ETS category proportions', () => {
    expect(pack).toBeTruthy();
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 120, simulationTimeMinutes: 120 });
    expect(pack.items).toHaveLength(500);
    expect(pack.sections).toHaveLength(5);
    expect(pack.sections.map((section) => section.id)).toEqual(['diagnostic-batch-1', 'diagnostic-batch-2', 'independent-diagnostic-batch-3', 'guided-review-bank-1', 'guided-review-bank-2']);
    expect(pack.sections.map((section) => section.kind)).toEqual(['source-diagnostic', 'source-diagnostic', 'independent-diagnostic', 'guided-review', 'guided-review']);
    // Honest tiers: 200 source-reviewed, 100 assistant-authored independent, and 200 guided-review activities.
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed-independent-practice-item')).toHaveLength(100);
    expect(pack.items.filter((item) => item.qaStatus === 'structural-qa-passed-guided-practice-only')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'structural-qa-passed-guided-practice-only').every((item) => item.reviewStatus === 'assistant-reviewed-guided-practice-only')).toBe(true);
    expect(Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]))).toEqual({ 'foundations-audiology': 0.20, 'prevention-screening': 0.10, assessment: 0.35, intervention: 0.25, 'professional-ethical': 0.10 });
    const expected = { 'foundations-audiology': 20, 'prevention-screening': 10, assessment: 35, intervention: 25, 'professional-ethical': 10 };
    for (let batchIndex = 0; batchIndex < 3; batchIndex += 1) {
      const batch = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
      for (const [domainId, count] of Object.entries(expected)) expect(batch.filter((item) => item.domainId === domainId)).toHaveLength(count);
      expect(batch.reduce((counts, item) => { counts[item.answerIndex] += 1; return counts; }, [0, 0, 0, 0])).toEqual([25, 25, 25, 25]);
    }
    expect(Hub.batchMeta(pack, 100)).toMatchObject({ batchNumber: 2, batchCount: 5, position: 1, startIndex: 100, endIndex: 200, isFinalBatch: false });
  });

  it('keeps every item original, fully explained, source-reviewed, and linked to one compatible chapter', () => {
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
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5343.pdf');
      expect(['source-reviewed | qa-passed', 'assistant-reviewed-independent-practice-item | qa-passed-independent-practice-item', 'assistant-reviewed-guided-practice-only | structural-qa-passed-guided-practice-only']).toContain(item.reviewStatus + ' | ' + item.qaStatus);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    }
  });

  it('builds category and confidence diagnostics without inventing a scaled score or credential result', () => {
    const firstBatch = pack.items.slice(0, 100);
    const answers = Object.fromEntries(firstBatch.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(firstBatch.map((item) => [item.id, 'sure']));
    const missed = [firstBatch.find((item) => item.domainId === 'foundations-audiology'), firstBatch.find((item) => item.domainId === 'assessment')];
    for (const item of missed) answers[item.id] = (item.answerIndex + 1) % 4;
    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 0);
    const rows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(rows['foundations-audiology']).toMatchObject({ correct: 19, total: 20, missed: 1 });
    expect(rows.assessment).toMatchObject({ correct: 34, total: 35, missed: 1 });
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official or scaled Praxis scores');
    expect(pack.disclaimer).toContain('medical or vestibular decisions');
    expect(pack.disclaimer).toContain('device fittings');
  });

  it('uses safety-first, device-specific, screening-limited, and jurisdiction-aware guidance', () => {
    const sudden = pack.items.find((item) => item.prompt.includes('sudden unilateral sensorineural hearing change'));
    const neurologic = pack.items.find((item) => item.prompt.includes('acute severe imbalance with new focal neurologic signs'));
    const imaging = pack.items.find((item) => item.prompt.includes('MRI or another procedure involving an implant'));
    const screen = pack.items.find((item) => item.prompt.includes('hearing screening result establish'));
    const telepractice = pack.items.find((item) => item.prompt.includes('teleaudiology across state lines'));
    expect(sudden.choices[sudden.answerIndex]).toContain('urgent medical evaluation');
    expect(neurologic.choices[neurologic.answerIndex]).toContain('urgent medical or emergency referral');
    expect(imaging.choices[imaging.answerIndex]).toContain('exact device');
    expect(imaging.choices[imaging.answerIndex]).toContain('manufacturer');
    expect(screen.choices[screen.answerIndex]).toContain('screening alone does not diagnose');
    expect(telepractice.choices[telepractice.answerIndex]).toContain('where the client is located');
  });

  it('publishes zero-finding QA and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/audiology_5343_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, reviewRequiredItems: 0, findings: 0, status: 'pass' });
    expect(qa.blueprint).toMatchObject({ officialQuestionCount: 120, timeMinutes: 120, selectedResponse: true, categories: { 'foundations-audiology': { questions: 24 }, 'prevention-screening': { questions: 12 }, assessment: { questions: 42 }, intervention: { questions: 30 }, 'professional-ethical': { questions: 12 } } });
    expect(qa.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100, categories: { 'foundations-audiology': 20, 'prevention-screening': 10, assessment: 35, intervention: 25, 'professional-ethical': 10 } });
    expect(qa.standard.limitation).toContain('independent licensed-audiologist validation');
    for (const name of ['audiology_5343_items.json', 'audiology_5343_pack.json', 'audiology_5343_native_qa.json', 'audiology_5343_native_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  }, 20000);
});

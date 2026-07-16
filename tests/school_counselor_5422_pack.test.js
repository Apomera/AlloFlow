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
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-school-counselor-5422');
});

describe('Praxis School Counselor 5422 diagnostic bank', () => {
  it('registers five ready 100-item batches with the exact ETS 25/40/20/15 blueprint', () => {
    expect(pack).toBeTruthy();
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 120, simulationTimeMinutes: 120 });
    expect(pack.items).toHaveLength(500);
    expect(pack.sections).toHaveLength(5);
    expect(pack.sections.map((section) => section.id)).toEqual(['diagnostic-batch-1', 'diagnostic-batch-2', 'guided-review-bank-1', 'guided-review-bank-2', 'guided-review-bank-3']);
    expect(pack.sections.map((section) => section.kind)).toEqual(['source-diagnostic', 'source-diagnostic', 'guided-review', 'guided-review', 'guided-review']);
    // Honest tiers: exactly 200 expert/source-reviewed items; every other item
    // must carry the candid guided-review status until experts validate it.
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'review-required').every((item) => item.reviewStatus === 'assistant-reviewed-guided-practice-only')).toBe(true);
    expect(Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]))).toEqual({ define: 0.25, deliver: 0.40, manage: 0.20, assess: 0.15 });

    const expected = { define: 25, deliver: 40, manage: 20, assess: 15 };
    for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
      const batch = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
      expect(batch).toHaveLength(100);
      for (const [domainId, count] of Object.entries(expected)) expect(batch.filter((item) => item.domainId === domainId)).toHaveLength(count);
      expect(batch.reduce((counts, item) => { counts[item.answerIndex] += 1; return counts; }, [0, 0, 0, 0])).toEqual([25, 25, 25, 25]);
    }
    expect(Hub.batchMeta(pack, 100)).toMatchObject({ batchNumber: 2, batchCount: 5, position: 1, startIndex: 100, endIndex: 200, isFinalBatch: false });
  });

  it('keeps all items original, fully explained, source-reviewed, and linked to one compatible chapter', () => {
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
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw1272f63e/pdfs/5422.pdf');
      expect(['source-reviewed | qa-passed', 'assistant-reviewed-guided-practice-only | review-required']).toContain(item.reviewStatus + ' | ' + item.qaStatus);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    }
  });

  it('builds domain and confidence diagnostics without inventing a scaled score or credential result', () => {
    const answers = Object.fromEntries(pack.items.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(pack.items.map((item) => [item.id, 'sure']));
    const missed = [
      pack.items.find((item) => item.domainId === 'define'),
      pack.items.find((item) => item.domainId === 'deliver'),
    ];
    for (const item of missed) answers[item.id] = (item.answerIndex + 1) % 4;

    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 1);
    const rows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(rows.define).toMatchObject({ correct: 24, total: 25, missed: 1 });
    expect(rows.deliver).toMatchObject({ correct: 39, total: 40, missed: 1 });
    expect(diagnostic.confidentMissQuestionNumbers).toEqual(missed.map((item) => pack.items.indexOf(item) + 1));
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic.focusSkillIds.length).toBeGreaterThan(0);
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('passed');

    expect(pack.disclaimer).toContain('not official or scaled Praxis scores');
    expect(pack.disclaimer).toContain('mental-health treatment');
    expect(pack.disclaimer).toContain('mandated-reporting');
  });

  it('uses safety-first and jurisdiction-aware guidance for high-risk scenarios', () => {
    const selfHarm = pack.items.find((item) => item.prompt.includes('specific suicide plan'));
    const abuse = pack.items.find((item) => item.prompt.includes('possible child abuse'));
    const duty = pack.items.find((item) => item.prompt.includes('threatens another person'));
    expect(selfHarm.choices[selfHarm.answerIndex]).toContain('activate the school crisis protocol immediately');
    expect(selfHarm.choices[selfHarm.answerIndex]).toContain('Maintain supervision');
    expect(abuse.choices[abuse.answerIndex]).toContain('without conducting an independent investigation');
    expect(duty.choices[duty.answerIndex]).toContain('current jurisdictional law');
  });

  it('publishes zero-finding QA and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/school_counselor_5422_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, reviewRequiredItems: 0, findings: 0, status: 'pass' });
    expect(qa.blueprint).toMatchObject({ officialQuestionCount: 120, timeMinutes: 120, selectedResponse: true, categories: { define: { questions: 30, percentage: 25 }, deliver: { questions: 48, percentage: 40 }, manage: { questions: 24, percentage: 20 }, assess: { questions: 18, percentage: 15 } } });
    expect(qa.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100, categories: { define: 25, deliver: 40, manage: 20, assess: 15 } });
    expect(qa.diagnosticBatch.batches).toHaveLength(2);
    expect(qa.standard.limitation).toContain('psychometric calibration');
    for (const name of ['school_counselor_5422_items.json', 'school_counselor_5422_pack.json', 'school_counselor_5422_native_qa.json', 'school_counselor_5422_native_qa.md']) {
      expect(read('prismflow-deploy/public/test_prep/' + name)).toBe(read('test_prep/' + name));
    }
  }, 20000);
});

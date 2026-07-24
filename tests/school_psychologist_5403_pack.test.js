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
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-school-psychologist-5403');
});

describe('Praxis School Psychologist 5403 diagnostic bank', () => {
  it('registers five ready 100-item batches with the exact ETS 32/23/20/25 diagnostic blueprint', () => {
    expect(pack).toBeTruthy();
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 125, simulationTimeMinutes: 125 });
    expect(pack.items).toHaveLength(500);
    expect(pack.sections).toHaveLength(5);
    expect(pack.sections.map((section) => section.id)).toEqual(['diagnostic-batch-1', 'diagnostic-batch-2', 'guided-review-bank-1', 'guided-review-bank-2', 'guided-review-bank-3']);
    expect(pack.sections.map((section) => section.kind)).toEqual(['source-diagnostic', 'source-diagnostic', 'guided-review', 'guided-review', 'guided-review']);
    // Honest tiers: exactly 200 expert/source-reviewed items; every other item
    // must carry the candid guided-review status until experts validate it.
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'structural-qa-passed-guided-practice-only').every((item) => item.reviewStatus === 'assistant-reviewed-guided-practice-only')).toBe(true);
    expect(Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]))).toEqual({
      'permeating-practices': 0.32,
      'student-level-services': 0.23,
      'systems-level-services': 0.20,
      foundations: 0.25,
    });

    const expected = { 'permeating-practices': 32, 'student-level-services': 23, 'systems-level-services': 20, foundations: 25 };
    for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
      const batch = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
      expect(batch).toHaveLength(100);
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
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5403.pdf');
      expect(['source-reviewed | qa-passed', 'assistant-reviewed-guided-practice-only | structural-qa-passed-guided-practice-only']).toContain(item.reviewStatus + ' | ' + item.qaStatus);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    }
  });

  it('builds domain and confidence diagnostics without inventing a scaled score or credential result', () => {
    const firstBatch = pack.items.slice(0, 100);
    const answers = Object.fromEntries(firstBatch.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(firstBatch.map((item) => [item.id, 'sure']));
    const missed = [
      firstBatch.find((item) => item.domainId === 'permeating-practices'),
      firstBatch.find((item) => item.domainId === 'student-level-services'),
    ];
    for (const item of missed) answers[item.id] = (item.answerIndex + 1) % 4;

    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 0);
    const rows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(rows['permeating-practices']).toMatchObject({ correct: 31, total: 32, missed: 1 });
    expect(rows['student-level-services']).toMatchObject({ correct: 22, total: 23, missed: 1 });
    expect(diagnostic.confidentMissQuestionNumbers).toEqual(missed.map((item) => pack.items.indexOf(item) + 1));
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic.focusSkillIds.length).toBeGreaterThan(0);
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official or scaled Praxis scores');
    expect(pack.disclaimer).toContain('psychological evaluations');
    expect(pack.disclaimer).toContain('mandated-reporting');
  });

  it('uses safety-first and legally cautious guidance for high-risk and evaluation scenarios', () => {
    const selfHarm = pack.items.find((item) => item.prompt.includes('specific suicide plan'));
    const iee = pack.items.find((item) => item.prompt.includes('independent educational evaluation'));
    const evaluation = pack.items.find((item) => item.prompt.includes('IDEA require of evaluation procedures'));
    expect(selfHarm.choices[selfHarm.answerIndex]).toContain('Maintain supervision');
    expect(selfHarm.choices[selfHarm.answerIndex]).toContain('activate the current school crisis protocol');
    expect(iee.choices[iee.answerIndex]).toContain('Without unnecessary delay');
    expect(iee.choices[iee.answerIndex]).toContain('provide the IEE at public expense or file due process');
    expect(evaluation.choices[evaluation.answerIndex]).toContain('never rely on one measure as the sole criterion');
  });

  it('publishes zero-finding QA and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/school_psychologist_5403_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, reviewRequiredItems: 0, findings: 0, status: 'pass' });
    expect(qa.blueprint).toMatchObject({ officialQuestionCount: 125, timeMinutes: 125, selectedResponse: true, categories: {
      'permeating-practices': { questions: 40, percentage: 32 },
      'student-level-services': { questions: 28, percentage: 23 },
      'systems-level-services': { questions: 25, percentage: 20 },
      foundations: { questions: 32, percentage: 25 },
    } });
    expect(qa.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100, categories: { 'permeating-practices': 32, 'student-level-services': 23, 'systems-level-services': 20, foundations: 25 } });
    expect(qa.standard.limitation).toContain('psychometric calibration');
    for (const name of ['school_psychologist_5403_items.json', 'school_psychologist_5403_pack.json', 'school_psychologist_5403_native_qa.json', 'school_psychologist_5403_native_qa.md']) {
      expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
    }
  }, 20000);
});

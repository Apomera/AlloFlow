import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const nodeRequire = createRequire(import.meta.url);
const { findResponseFormIssue } = nodeRequire('../dev-tools/speech_language_pathology_5331/semantic_response_form_gate.cjs');

let Hub;
let pack;
beforeAll(() => {
  window.React = window.React || { useState: (value) => [typeof value === 'function' ? value() : value, () => {}], useEffect: () => {}, useRef: () => ({ current: null }), createElement: () => null, Fragment: 'fragment' };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-speech-language-pathology-5331');
});

describe('Praxis Speech-Language Pathology 5331 diagnostic bank', () => {
  it('registers five ready 100-item batches with the near-equal ETS category blueprint', () => {
    expect(pack).toBeTruthy();
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 132, simulationTimeMinutes: 150, officialSelectedResponseCount: 132, officialTotalTimeMinutes: 150 });
    expect(pack.items).toHaveLength(500);
    expect(pack.sections).toHaveLength(5);
    expect(pack.sections.map((section) => section.id)).toEqual(['diagnostic-batch-1', 'diagnostic-batch-2', 'guided-review-bank-1', 'guided-review-bank-2', 'guided-review-bank-3']);
    expect(pack.sections.map((section) => section.kind)).toEqual(['source-diagnostic', 'source-diagnostic', 'guided-review', 'guided-review', 'guided-review']);
    // Honest tiers: exactly 200 expert/source-reviewed items; every other item
    // must carry the candid guided-review status until experts validate it.
    expect(pack.items.filter((item) => item.qaStatus === 'qa-passed')).toHaveLength(200);
    expect(pack.items.filter((item) => item.qaStatus === 'structural-qa-passed-guided-practice-only').every((item) => item.reviewStatus === 'assistant-reviewed-guided-practice-only')).toBe(true);
    const weights = Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]));
    expect(weights['foundations-professional-practice']).toBeCloseTo(1 / 3);
    expect(weights['screening-assessment-diagnosis']).toBeCloseTo(1 / 3);
    expect(weights['treatment-planning-evaluation']).toBeCloseTo(1 / 3);
    const expected = { 'foundations-professional-practice': 34, 'screening-assessment-diagnosis': 33, 'treatment-planning-evaluation': 33 };
    for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
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
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5331.pdf');
      expect(['source-reviewed | qa-passed', 'assistant-reviewed-guided-practice-only | structural-qa-passed-guided-practice-only']).toContain(item.reviewStatus + ' | ' + item.qaStatus);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    }
  });

  it('rejects the seven legacy nonresponsive stem-key forms and accepts both repaired source forms', () => {
    const suffixes = ['009', '026', '034', '061', '062', '064', '094'];
    for (const suffix of suffixes) {
      for (const batch of ['b1', 'b2']) {
        const item = pack.items.find((entry) => entry.id === 'slp5331-' + batch + '-' + suffix);
        expect(item).toBeTruthy();
        expect(findResponseFormIssue(item)).toBe('');
      }
    }

    const sourceById = Object.fromEntries(pack.items.slice(0, 200).map((item) => [item.id, item]));
    const legacyForms = [
      ['slp5331-b1-009', 'Which finding most clearly distinguishes conductive from sensorineural hearing loss?'],
      ['slp5331-b1-026', 'Which pattern most strongly suggests language difference rather than disorder?'],
      ['slp5331-b1-034', 'Which symptom during eating most clearly warrants prompt swallowing-safety evaluation?'],
      ['slp5331-b1-061', 'When is a videofluoroscopic swallowing study especially useful?'],
      ['slp5331-b1-062', 'What is a major advantage of fiberoptic endoscopic evaluation of swallowing?', 'FEES, when clinically appropriate and within qualified scope and procedures.'],
      ['slp5331-b1-064', 'Which finding is most associated with oral-phase swallowing difficulty?'],
      ['slp5331-b1-094', 'How should a postural swallowing strategy be prescribed?', 'No; use a strategy only when assessment shows benefit for that person and bolus.'],
    ];
    for (const [id, prompt, oldKey] of legacyForms) {
      const item = sourceById[id];
      const choices = item.choices.slice();
      if (oldKey) choices[item.answerIndex] = oldKey;
      expect(findResponseFormIssue({ ...item, prompt, choices })).not.toBe('');
    }
  });
  it('builds category and confidence diagnostics without inventing a scaled score or credential result', () => {
    const firstBatch = pack.items.slice(0, 100);
    const answers = Object.fromEntries(firstBatch.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(firstBatch.map((item) => [item.id, 'sure']));
    const missed = [firstBatch.find((item) => item.domainId === 'foundations-professional-practice'), firstBatch.find((item) => item.domainId === 'screening-assessment-diagnosis')];
    for (const item of missed) answers[item.id] = (item.answerIndex + 1) % 4;
    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 0);
    const rows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(rows['foundations-professional-practice']).toMatchObject({ correct: 33, total: 34, missed: 1 });
    expect(rows['screening-assessment-diagnosis']).toMatchObject({ correct: 32, total: 33, missed: 1 });
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official or scaled Praxis scores');
    expect(pack.disclaimer).toContain('swallowing-safety decisions');
  });

  it('uses safety-first, access-first, and jurisdiction-aware clinical guidance', () => {
    const acute = pack.items.find((item) => item.prompt.includes('acute inability to manage secretions'));
    const aac = pack.items.find((item) => item.prompt.includes('cognitive readiness before receiving AAC'));
    const telepractice = pack.items.find((item) => item.prompt.includes('located in another state'));
    const thickened = pack.items.find((item) => item.prompt.includes('thicker liquid reduces aspiration'));
    expect(acute.choices[acute.answerIndex]).toContain('activate appropriate medical or emergency response');
    expect(aac.choices[aac.answerIndex]).toContain('no prerequisite cognitive or speech skills');
    expect(telepractice.choices[telepractice.answerIndex]).toContain('where the client is located');
    expect(thickened.choices[thickened.answerIndex]).toContain('hydration and nutrition');
    expect(thickened.choices[thickened.answerIndex]).toContain('informed choice');
  });

  it('publishes zero-finding QA and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/speech_language_pathology_5331_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, reviewRequiredItems: 0, findings: 0, status: 'pass' });
    expect(qa.blueprint).toMatchObject({ officialQuestionCount: 132, timeMinutes: 150, selectedResponse: true, categories: { 'foundations-professional-practice': { questions: 44 }, 'screening-assessment-diagnosis': { questions: 44 }, 'treatment-planning-evaluation': { questions: 44 } } });
    expect(qa.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100, categories: { 'foundations-professional-practice': 34, 'screening-assessment-diagnosis': 33, 'treatment-planning-evaluation': 33 } });
    expect(qa.standard.limitation).toContain('independent licensed-SLP validation');
    for (const name of ['speech_language_pathology_5331_items.json', 'speech_language_pathology_5331_pack.json', 'speech_language_pathology_5331_native_qa.json', 'speech_language_pathology_5331_native_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  }, 20000);
});

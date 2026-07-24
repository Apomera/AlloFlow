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
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-esol-5362');
});

describe('Praxis ESOL 5362 diagnostic bank', () => {
  it('registers two exact 100-item diagnostic banks', () => {
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 120, simulationTimeMinutes: 120, officialSelectedResponseCount: 120, officialConstructedResponseCount: 0, officialTotalTimeMinutes: 120 });
    expect(pack.items).toHaveLength(500);
    const expected = { 'foundations-linguistics': 18, 'foundations-language-learning': 22, 'planning-implementing-instruction': 23, 'assessment-evaluation': 15, culture: 11, 'professionalism-advocacy': 11 };
    for (let index = 0; index < 5; index += 1) {
      const bank = pack.items.slice(index * 100, index * 100 + 100);
      expect(bank.reduce((counts, item) => ({ ...counts, [item.domainId]: (counts[item.domainId] || 0) + 1 }), {})).toEqual(expected);
      expect(bank.reduce((counts, item) => { counts[item.answerIndex] += 1; return counts; }, [0, 0, 0, 0])).toEqual([25, 25, 25, 25]);
    }
  });

  it('keeps all items original, explained, authoritative, and chapter-linked', () => {
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(500);
    expect(new Set(pack.items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size).toBe(500);
    for (const item of pack.items) {
      expect(item.type).toBe('single-choice');
      expect(['source-reviewed | qa-passed', 'assistant-reviewed-guided-practice-only | structural-qa-passed-guided-practice-only']).toContain(item.reviewStatus + ' | ' + item.qaStatus);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.rationale.length).toBeGreaterThanOrEqual(120);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((entry) => entry.length >= 100)).toBe(true);
      expect(item.references.some((url) => /5362\.pdf$/.test(url))).toBe(true);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    }
  });

  it('builds useful category and confidence diagnostics without decisions', () => {
    const bank = pack.items.slice(0, 100);
    const answers = Object.fromEntries(bank.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(bank.map((item) => [item.id, 'sure']));
    for (const domain of ['foundations-linguistics', 'assessment-evaluation']) { const item = bank.find((candidate) => candidate.domainId === domain); answers[item.id] = (item.answerIndex + 1) % 4; }
    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 0);
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official forms, scaled scores, pass predictions, licenses, language-proficiency determinations');
  });

  it('uses the exact official category counts in the 120-item simulation', () => {
    const counts = pack.items.slice(0, 120).reduce((result, item) => ({ ...result, [item.domainId]: (result[item.domainId] || 0) + 1 }), {});
    expect(counts).toEqual({ 'foundations-linguistics': 22, 'foundations-language-learning': 26, 'planning-implementing-instruction': 28, 'assessment-evaluation': 18, culture: 13, 'professionalism-advocacy': 13 });
    expect(pack.simulationNote).toContain('may include audio questions and select-more-than-one formats');
    expect(pack.simulationNote).toContain('does not reproduce ETS recordings');
  });

  it('publishes passing QA and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/esol_5362_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, diagnosticBanks: 5, bankSize: 100, simulationItems: 120, findings: [], status: 'pass' });
    expect(qa.standard.limitation).toContain('psychometric validation remain pending');
    for (const name of ['esol_5362_items.json', 'esol_5362_pack.json', 'esol_5362_native_qa.json', 'esol_5362_native_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  }, 20000);
});

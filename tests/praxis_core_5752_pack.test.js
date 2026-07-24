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
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-core-5752');
});

describe('Praxis Core Combined 5752 diagnostic bank', () => {
  it('registers five ready 100-item banks with the exact combined diagnostic allocation', () => {
    expect(pack).toBeTruthy();
    expect(pack).toMatchObject({ status: 'ready', batchSize: 100, simulationItemCount: 152, simulationTimeMinutes: 215, officialSelectedResponseCount: 152, officialConstructedResponseCount: 2, officialTotalTimeMinutes: 275 });
    expect(pack.items).toHaveLength(500);
    expect(Object.fromEntries(pack.domains.map((domain) => [domain.id, domain.weight]))).toEqual({
      'reading-key-ideas-details': 0.13,
      'reading-craft-structure-language': 0.11,
      'reading-integration-knowledge-ideas': 0.13,
      'writing-text-types-production': 0.08,
      'writing-language-research': 0.18,
      'math-number-quantity': 0.13,
      'math-data-statistics-probability': 0.12,
      'math-algebra-geometry': 0.12,
    });
    for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
      const batch = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
      expect(batch.filter((item) => item.domainId.startsWith('reading-'))).toHaveLength(37);
      expect(batch.filter((item) => item.domainId.startsWith('writing-'))).toHaveLength(26);
      expect(batch.filter((item) => item.domainId.startsWith('math-'))).toHaveLength(37);
      expect(batch.reduce((counts, item) => { counts[item.answerIndex] += 1; return counts; }, [0, 0, 0, 0])).toEqual([25, 25, 25, 25]);
    }
  });

  it('keeps every item original, fully explained, authoritative, and chapter-linked', () => {
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
      expect(item.references.some((url) => /57(13|23|33)\.pdf$/.test(url))).toBe(true);
      expect(['source-reviewed | qa-passed', 'assistant-reviewed-guided-practice-only | structural-qa-passed-guided-practice-only']).toContain(item.reviewStatus + ' | ' + item.qaStatus);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
    }
  });

  it('builds category and confidence diagnostics without inventing scores or decisions', () => {
    const firstBatch = pack.items.slice(0, 100);
    const answers = Object.fromEntries(firstBatch.map((item) => [item.id, item.answerIndex]));
    const confidence = Object.fromEntries(firstBatch.map((item) => [item.id, 'sure']));
    const misses = [firstBatch.find((item) => item.domainId === 'reading-key-ideas-details'), firstBatch.find((item) => item.domainId === 'math-number-quantity')];
    for (const item of misses) answers[item.id] = (item.answerIndex + 1) % 4;
    const diagnostic = Hub.buildBatchDiagnostic(pack, answers, confidence, 0);
    const rows = Object.fromEntries(diagnostic.domainRows.map((row) => [row.id, row]));
    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 5, firstQuestion: 1, lastQuestion: 100, correct: 98, total: 100, percent: 98, isFinalBatch: false });
    expect(rows['reading-key-ideas-details']).toMatchObject({ correct: 12, total: 13, missed: 1 });
    expect(rows['math-number-quantity']).toMatchObject({ correct: 12, total: 13, missed: 1 });
    expect(diagnostic.feedback.join(' ')).toContain('Lowest accuracy in this batch');
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic).not.toHaveProperty('scaledScore');
    expect(diagnostic).not.toHaveProperty('passed');
    expect(pack.disclaimer).toContain('not official Praxis forms, scaled scores, essay scores, pass predictions');
  });

  it('preserves all current combined-section counts and timing boundaries', () => {
    expect(pack.officialSubtests).toEqual([
      { code: '5713', label: 'Reading', questions: 56, timeMinutes: 85 },
      { code: '5723', label: 'Writing selected response', questions: 40, timeMinutes: 40, essayCount: 2, essayMinutesEach: 30 },
      { code: '5733', label: 'Mathematics', questions: 56, timeMinutes: 90 },
    ]);
    const simulationItems = pack.items.slice(0, 152);
    expect(simulationItems.filter((item) => item.domainId.startsWith('reading-'))).toHaveLength(56);
    expect(simulationItems.filter((item) => item.domainId.startsWith('writing-'))).toHaveLength(40);
    expect(simulationItems.filter((item) => item.domainId.startsWith('math-'))).toHaveLength(56);
    expect(pack.simulationNote).toContain('85 minutes reading, 40 minutes writing selected response, and 90 minutes mathematics');
    expect(pack.simulationNote).toContain('complete official section times total 275 minutes');
  });

  it('keeps paired algebra rationales specific to the equation in each source form', () => {
    const firstForm = pack.items.find((item) => item.id === 'core5752-b1-089');
    const secondForm = pack.items.find((item) => item.id === 'core5752-b2-089');
    expect(firstForm.rationale).toContain('3x = 18');
    expect(firstForm.rationale).not.toContain('5x = 30');
    expect(secondForm.rationale).toContain('5x = 30');
    expect(secondForm.rationale).not.toContain('3x = 18');
  });

  it('publishes zero-finding QA and exact deployment mirrors', () => {
    const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
    const qa = JSON.parse(read('test_prep/praxis_core_5752_native_qa.json'));
    expect(qa.summary).toMatchObject({ totalItems: 500, passedItems: 500, reviewRequiredItems: 0, findings: 0, status: 'pass' });
    expect(qa.blueprint).toMatchObject({ officialSelectedResponseCount: 152, officialEssayCount: 2, officialTotalTimeMinutes: 275, selectedResponseMinutes: 215 });
    expect(qa.diagnosticBatch).toMatchObject({ batchCount: 5, batchSize: 100, subjectAllocation: { reading: 37, writing: 26, mathematics: 37 } });
    expect(qa.standard.limitation).toContain('official essay scoring');
    for (const name of ['praxis_core_5752_items.json', 'praxis_core_5752_pack.json', 'praxis_core_5752_native_qa.json', 'praxis_core_5752_native_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  }, 20000);
});

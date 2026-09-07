import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let G, M;
beforeAll(() => {
  window.React = globalThis.React = require(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('generation_helpers_module.js');
  loadAlloModule('math_fluency_module.js');
  G = window.AlloModules.GenerationHelpers;
  M = window.AlloModules.MathFluencyInternals;
});
const problem = (a, b, answer = a + b) => ({ question: `${a} + ${b}`, expression: `${a}+${b}`, answer: String(answer), taskType: 'compute' });

describe('Math Studio shared preparation', () => {
  it('honors selected quantities, explicit totals, and mixed-section counts', () => {
    expect(G.resolveMathRequestedCount('fractions', 12)).toBe(12);
    expect(G.resolveMathRequestedCount('Create 7 word problems', 12)).toBe(7);
    expect(G.resolveMathRequestedCount('3 addition problems and 4 subtraction problems', 12)).toBe(7);
    expect(G.resolveMathRequestedCount('grade 4 within 100', 12)).toBe(12);
  });
  it('preserves conflicting content for review instead of replacing the answer', () => {
    const content = G.prepareGeneratedMathContent({ problems: [{ question: '4 × 5', expression: '4+5', answer: '20', steps: [{ explanation: 'Four groups of five equal twenty.' }] }] }, '', 'conflict', 3);
    expect(content.problems[0].answer).toBe('20');
    expect(content.problems[0].steps[0].explanation).toContain('twenty');
    expect(content.problems[0]._verification).toMatchObject({ verified: false, reviewRequired: true, autoCorrected: false });
    expect(content.preparation).toMatchObject({ requested: 3, accepted: 1, ready: 0, reviewRequired: 1, status: 'partial' });
  });
  it('checks visible arithmetic without an expression and preserves response scaffolds', () => {
    const scaffold = { tool: 'numberline', state: { markers: [{ value: 4 }] } };
    const p = G.prepareGeneratedMathContent({ problems: [{ question: '2 + 2', correct_answer: '4', manipulativeSupport: scaffold }] }, '', 'visible', 1).problems[0];
    expect(p.answer).toBe('4');
    expect(p._verification.verified).toBe(true);
    expect(p.manipulativeSupport).toEqual(scaffold);
    expect(G.verifyGeneratedMathProblems([{ question: '2 + 2', answer: '5' }])[0]._verification.reviewRequired).toBe(true);
  });
  it('reports malformed and excess items rather than concealing the requested count', () => {
    const content = G.prepareGeneratedMathContent({ problems: [null, { nonsense: true }, problem(1, 2), problem(2, 3), problem(3, 4)] }, '', 'counts', 2);
    expect(content.problems).toHaveLength(2);
    expect(content.preparation).toMatchObject({ requested: 2, received: 3, accepted: 2, omitted: 1, status: 'ready' });
  });
  it('retries only incomplete sections and keeps the artifact and completed item IDs', async () => {
    const callGemini = vi.fn().mockResolvedValueOnce(JSON.stringify({ problems: [problem(1, 2), problem(2, 3)] })).mockResolvedValueOnce(JSON.stringify({ problems: [problem(3, 4)] })).mockResolvedValueOnce(JSON.stringify({ problems: [problem(4, 5), problem(5, 6)] }));
    const blocks = [{ id: 'a', type: 'computation', quantity: 2 }, { id: 'b', type: 'word_problem', quantity: 2 }];
    const options = { callGemini, grade: '3', subject: 'Math', language: 'Spanish', translationMode: 'off' };
    const first = await G.generateMathAssessment(blocks, options);
    expect(first.content.preparation.status).toBe('partial');
    const second = await G.generateMathAssessment(blocks, { ...options, resourceId: first.id, previousSections: first.sections });
    expect(callGemini).toHaveBeenCalledTimes(3);
    expect(callGemini.mock.calls[0][0]).toContain('in Spanish');
    expect(callGemini.mock.calls[0][0]).toContain('Do not add translations');
    expect(second.id).toBe(first.id);
    expect(second.sections[0]).toEqual(first.sections[0]);
    expect(second.content.preparation).toMatchObject({ requested: 4, ready: 4, status: 'ready' });
  });
  it('retains successful sections when another section fails', async () => {
    const callGemini = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(JSON.stringify({ problems: [problem(1, 2)] }));
    const result = await G.generateMathAssessment([{ id: 'a', quantity: 1 }, { id: 'b', quantity: 1 }], { callGemini, grade: '2' });
    expect(result.sections.map(s => s.status)).toEqual(['failed', 'ready']);
    expect(result.content.preparation).toMatchObject({ requested: 2, ready: 1, status: 'partial' });
  });
});

describe('Math Fluency domains and assessment identity', () => {
  it('fills a requested practice length even when the unique fact pool is smaller', () => {
    expect(M.generateProblems('sub', 'single', 120)).toHaveLength(120);
    expect(M.generatePracticeProblems('add', 'within10', 'K', 150)).toHaveLength(150);
  });
  it('keeps adaptive stretches inside the selected domain and preserves the next operation', () => {
    for (let i = 0; i < 100; i++) {
      for (const level of ['support', 'stretch']) {
        const next = M.chooseAdaptiveFact({ a: 9, b: 3, op: 'sub', answer: 6 }, { grade: 'K', practiceSet: 'within10' }, level);
        expect(next.op).toBe('sub'); expect(next.a).toBeLessThanOrEqual(10); expect(next.answer).toBe(next.a - next.b);
      }
    }
  });
  it('distinguishes learner, supports, form content, and administration length', () => {
    const config = { learnerId: 'a', grade: '3', mode: 'benchmark', form: 'A', formHash: 'v1', problemCount: 25, timeLimit: 120 };
    const key = M.fluencyComparisonKey(config);
    for (const changed of [{ learnerId: 'b' }, { touchKeypad: true }, { calmDisplay: true }, { formHash: 'v2' }, { problemCount: 30 }, { autoAdvance: true }]) expect(M.fluencyComparisonKey({ ...config, ...changed })).not.toBe(key);
    expect(M.fluencyStorageKey('a', 'mastery')).not.toBe(M.fluencyStorageKey('b', 'mastery'));
    expect(M.fluencyStorageKey(null, 'mastery')).toBeNull();
  });
  it('validates all 450 shipped answers and rejects corrupt or duplicate fixed forms', () => {
    const banks = JSON.parse(readFileSync('psychometric_math_probes.json', 'utf8')).MATH_PROBE_BANKS;
    let count = 0;
    for (const grade of Object.values(banks)) for (const form of Object.values(grade)) { expect(M.validateFluencyForm(form).valid).toBe(true); count += form.problems.length; }
    expect(count).toBe(450);
    const form = structuredClone(banks['3'].A);
    const hash = M.validateFluencyForm(form).hash;
    form.problems[0].answer++;
    expect(M.validateFluencyForm(form).valid).toBe(false);
    form.problems[0].answer--;
    form.timeLimit++;
    expect(M.validateFluencyForm(form).hash).not.toBe(hash);
    form.problems[1] = form.problems[0];
    expect(M.validateFluencyForm(form).valid).toBe(false);
  });
  it('requires independent evidence on different days before consistency is recorded', () => {
    const fact = { a: 2, b: 3, op: 'add', answer: 5, studentAnswer: 5, correct: true, responseMs: 1500 };
    const first = M.updateFactMastery({}, [fact, fact, fact], '2026-09-01T12:00:00Z');
    expect(M.buildFactMasteryDashboard(first).categories.secure.count).toBe(0);
    const revealed = M.updateFactMastery(first, [{ ...fact, answerRevealed: true }], '2026-09-02T12:00:00Z');
    expect(M.buildFactMasteryDashboard(revealed).categories.secure.count).toBe(0);
    const next = M.updateFactMastery(revealed, [fact], '2026-09-03T12:00:00Z');
    expect(M.buildFactMasteryDashboard(next).categories.secure.count).toBe(1);
  });
  it('keeps every draft form within its declared ranges and slot blueprint', () => {
    const draft = JSON.parse(readFileSync('pm_bank/PM_MATH_FORMS_DRAFT.json', 'utf8'));
    expect(draft.status).toContain('NOT wired'); expect(draft.blueprintVersion).toBe(2);
    let count = 0;
    for (const [grade, forms] of Object.entries(draft.PM_MATH_FORMS)) {
      const template = draft.templates[grade];
      const anchor = forms.PM01.problems;
      for (const form of Object.values(forms)) {
        expect(M.validateFluencyForm(form).valid).toBe(true);
        form.problems.forEach((p, i) => {
          count++;
          const r = template.ranges[p.op];
          expect(p.a).toBeGreaterThanOrEqual(r.a[0]); expect(p.a).toBeLessThanOrEqual(r.a[1]);
          expect(p.b).toBeGreaterThanOrEqual(r.b[0]); expect(p.b).toBeLessThanOrEqual(r.b[1]);
          expect([p.op, String(p.a).length, String(p.b).length, String(p.answer).length]).toEqual([anchor[i].op, String(anchor[i].a).length, String(anchor[i].b).length, String(anchor[i].answer).length]);
        });
      }
    }
    expect(count).toBe(3000);
  });
});

it('keeps item IDs unique across sections when the model repeats an ID', async () => {
  const result = await G.generateMathAssessment([{ id: 'a', quantity: 1 }, { id: 'b', quantity: 1 }], {
    grade: '3', callGemini: async () => JSON.stringify({ problems: [{ ...problem(1, 2), id: 'problem-1' }] })
  });
  expect(new Set(result.content.problems.map(p => p.id)).size).toBe(2);
});
it('rejects an oversized assessment before making model requests', async () => {
  const callGemini = vi.fn();
  await expect(G.generateMathAssessment([{ quantity: 100 }, { quantity: 100 }, { quantity: 1 }], { callGemini })).rejects.toThrow('200 problems');
  expect(callGemini).not.toHaveBeenCalled();
});

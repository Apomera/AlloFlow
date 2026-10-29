import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

let helpers;
beforeAll(() => {
  const window = { AlloModules: {}, addEventListener() {}, removeEventListener() {} };
  vm.runInNewContext(fs.readFileSync('generation_helpers_module.js', 'utf8'), {
    window, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, AbortController, Promise,
  });
  helpers = window.AlloModules.GenerationHelpers;
});
const verify = problem => helpers.verifyGeneratedMathProblems([problem])[0];

describe('Math Studio verification has explicit limits', () => {
  it.each(['5/6', '\\frac{5}{6}', '$\\dfrac{5}{6}$', '\\(\\tfrac{5}{6}\\)'])('verifies the supported rational key %s', answer => {
    const p = verify({ question: '1/2 + 1/3', expression: '1/2 + 1/3', answer });
    expect(p.answer).toBe(answer);
    expect(p._verification).toMatchObject({ verified: true, mismatch: false, status: 'verified', scope: 'numeric_calculation' });
    expect(p._verification.reviewRequired).toBeFalsy();
  });
  it('detects the reviewed wrong fraction and preserves it for correction', () => {
    const p = verify({ question: '1/2 + 1/3', expression: '1/2 + 1/3', answer: '4/6' });
    expect(p.answer).toBe('4/6');
    expect(p._verification).toMatchObject({ verified: false, mismatch: true, reviewRequired: true, status: 'needs_review' });
  });
  it('supports simple numeric LaTeX fractions in the expression', () => {
    expect(verify({ question: 'Add the fractions.', expression: '\\frac{1}{2} + \\frac{1}{3}', answer: '5/6' })._verification.verified).toBe(true);
  });
  it.each(['45 marbles', '46 marbles', '45 kg', '\\frac{45}{1}\\text{ marbles}'])('does not silently strip units from %s', answer => {
    const p = verify({ question: 'How many marbles are there?', expression: '18+27', answer });
    expect(p.answer).toBe(answer);
    expect(p._verification).toMatchObject({ verified: false, mismatch: false, reviewRequired: true, reason: 'unsupported_verification', status: 'needs_review', computed: 45 });
  });
  it.each([
    { question: 'Factor x squared minus one.', expression: 'x^2-1', answer: '(x-1)(x+1)' },
    { question: '1/0', expression: '1/0', answer: '1/0' },
    { question: 'Find a square root.', expression: 'sqrt(4)', answer: '2' },
    { question: 'Compute.', expression: '17 % 5', answer: '2' },
  ])('requires review for unsupported math: $expression', problem => {
    expect(verify(problem)._verification).toMatchObject({ verified: false, reviewRequired: true, reason: 'unsupported_verification', status: 'needs_review' });
  });
  it('requires review for unstated rounding without calling it a known mismatch', () => {
    expect(verify({ question: 'Write as a decimal.', expression: '1/3', answer: '0.33' })._verification)
      .toMatchObject({ verified: false, mismatch: false, reviewRequired: true, reason: 'answer_needs_review' });
    expect(verify({ question: 'Round to the nearest hundredth.', expression: '1/3', answer: '0.33' })._verification.verified).toBe(true);
  });
  it('separates prepared material from verified calculations and retains state in JSON', () => {
    const content = helpers.prepareGeneratedMathContent({ problems: [
      { question: '1/2 + 1/3', expression: '1/2 + 1/3', answer: '5/6' },
      { question: 'How many marbles?', expression: '18+27', answer: '46 marbles' },
      { question: 'x^2', answer: 'x squared', _verification: { verified: true, reviewRequired: false } },
    ] }, '', 'verification-test', 3);
    expect(content.preparation).toMatchObject({ version: 2, prepared: 3, verified: 1, unverified: 2, ready: 1, reviewRequired: 2, status: 'partial', verificationStatus: 'needs_review' });
    const restored = JSON.parse(JSON.stringify(content));
    expect(restored.preparation).toEqual(content.preparation);
    expect(restored.problems[2]._verification).toMatchObject({ verified: false, reviewRequired: true });
  });
  it('does not call a complete but unsupported assessment ready', async () => {
    const result = await helpers.generateMathAssessment([{ id: 'word', type: 'word_problem', quantity: 1 }], {
      resourceId: 'unit-review', callGemini: async () => JSON.stringify({ problems: [{ question: 'How many marbles?', expression: '18+27', answer: '46 marbles' }] }),
    });
    expect(result.content.preparation).toMatchObject({ prepared: 1, verified: 0, unverified: 1, reviewRequired: 1, status: 'partial', verificationStatus: 'needs_review' });
    expect(result.sections[0].preparation).toMatchObject({ prepared: 1, verified: 0, reviewRequired: 1 });
  });
});

describe('retrying incomplete sections preserves teacher-review work', () => {
  it('keeps a complete symbolic section byte-for-byte while retrying only a short section', async () => {
    const blocks = [{ id: 'symbolic', type: 'computation', quantity: 1 }, { id: 'missing', type: 'computation', quantity: 2 }];
    const responses = [
      { problems: [{ id: 'symbolic-key', question: 'Simplify x*x.', expression: 'x*x', answer: 'x^2', steps: [{ explanation: 'Multiply equal factors.', latex: 'x^{2}' }] }] },
      { problems: [{ id: 'number-one', question: '1+1', expression: '1+1', answer: '2' }] },
      { problems: [{ id: 'number-one', question: '1+1', expression: '1+1', answer: '2' }, { id: 'number-two', question: '2+2', expression: '2+2', answer: '4' }] },
    ];
    const calls = [];
    const options = { resourceId: 'retry-review', callGemini: async prompt => { calls.push(prompt); return JSON.stringify(responses.shift()); } };
    const initial = await helpers.generateMathAssessment(blocks, options);
    const sectionBytes = JSON.stringify(initial.sections[0]);
    const problemBytes = JSON.stringify(initial.content.problems[0]);
    expect(initial.sections[0].status).toBe('partial');
    const retried = await helpers.generateMathAssessment(blocks, { ...options, previousSections: initial.sections });
    expect(calls).toHaveLength(3);
    expect(calls[2]).toContain('Create exactly 2');
    expect(retried.sections[0]).toBe(initial.sections[0]);
    expect(JSON.stringify(retried.sections[0])).toBe(sectionBytes);
    expect(JSON.stringify(retried.content.problems[0])).toBe(problemBytes);
    expect(retried.content.problems[0]._verification).toMatchObject({ verified: false, reviewRequired: true, reason: 'unsupported_verification' });
    expect(retried.content.preparation).toMatchObject({ prepared: 3, verified: 2, reviewRequired: 1, status: 'partial' });
  });
  it('regenerates a complete section with a known conflict', async () => {
    const blocks = [{ id: 'conflict', type: 'computation', quantity: 1 }];
    let calls = 0;
    const options = { resourceId: 'retry-conflict', callGemini: async () => JSON.stringify({ problems: [{ question: '1+1', expression: '1+1', answer: ++calls === 1 ? '3' : '2' }] }) };
    const initial = await helpers.generateMathAssessment(blocks, options);
    const retried = await helpers.generateMathAssessment(blocks, { ...options, previousSections: initial.sections });
    expect(calls).toBe(2);
    expect(retried.sections[0]).not.toBe(initial.sections[0]);
    expect(retried.content.problems[0]).toMatchObject({ answer: '2', _verification: { verified: true, mismatch: false } });
  });
});

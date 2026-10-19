// Math review (2026-10-18): Unit Converter grading, feedback, and display fixes.
// Each test drives the real render function: it finds a control in the
// element tree, fires its handler against a hub-like store, and re-renders.
// MATH_REVIEW_UNITCONVERT_SRC lets the mutation driver point it at variants.
import { beforeEach, describe, expect, it } from 'vitest';
import { React, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_UNITCONVERT_SRC || 'stem_lab/stem_tool_unitconvert.js';
const DEG = String.fromCharCode(0xB0);

let tool;
beforeEach(() => {
  resetStemLab();
  tool = loadTool(FILE, 'unitConvert');
});

function walk(node, pred, out = []) {
  if (node == null || typeof node === 'boolean') return out;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, pred, out)); return out; }
  if (typeof node !== 'object' || !node.props) return out;
  if (pred(node)) out.push(node);
  walk(node.props.children, pred, out);
  return out;
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.props ? text(node.props.children) : '';
}
const buttonWithText = (tree, s) => walk(tree, (n) => n.type === 'button' && text(n).includes(s))[0];
const buttonWithLabel = (tree, s) => walk(tree, (n) => n.type === 'button' && n.props['aria-label'] === s)[0];
const byId = (tree, id) => walk(tree, (n) => n.props.id === id)[0];

function harness(seed, extra = {}) {
  const store = { toolData: seed || {}, xp: [], prompts: [] };
  const ctx = Object.assign({
    React,
    get toolData() { return store.toolData; },
    setToolData(fn) { store.toolData = typeof fn === 'function' ? fn(store.toolData) : fn; },
    setStemLabTool() {}, addToast() {}, t: (key, fallback) => fallback,
    icons: new Proxy({}, { get: () => function Icon() { return null; } }),
    awardXP(id, amount, reason) { store.xp.push({ amount, reason }); },
    celebrate() {}, beep() {}, callGemini: null, setToolSnapshots() {}, announceToSR() {}, a11yClick: (f) => f,
  }, extra);
  return { store, render: () => tool.render(ctx), uc: () => store.toolData.unitConvert };
}

function attemptWordProblem(h, value) {
  byId(h.render(), 'unitconvert-word-problem-attempt').props.onChange({ target: { value } });
  buttonWithText(h.render(), 'Check attempt').props.onClick();
}

describe('word-problem grading tolerance', () => {
  it('rejects 0 and a doubled value when the true answer is tiny, and still accepts the right value', () => {
    const h = harness({ unitConvert: { tab: 'wordproblem', category: 'volume', value: 1, fromUnit: 'mL', toUnit: 'L' } });
    buttonWithText(h.render(), 'Generate Problem').props.onClick();
    expect(h.uc().wordProblem.answer).toBeCloseTo(0.002, 12); // 2 mL = 0.002 L

    attemptWordProblem(h, '0');
    expect(h.uc().wordProblemSolved).toBe(false);
    expect(h.store.xp.filter((x) => x.reason === 'word problem solved')).toHaveLength(0);

    attemptWordProblem(h, '0.002');
    expect(h.uc().wordProblemSolved).toBe(true);
    expect(h.store.xp.filter((x) => x.reason === 'word problem solved')).toHaveLength(1);

    const energy = harness({ unitConvert: { tab: 'wordproblem', category: 'energy', value: 1, fromUnit: 'J', toUnit: 'kJ' } });
    buttonWithText(energy.render(), 'Generate Problem').props.onClick();
    expect(energy.uc().wordProblem.answer).toBeCloseTo(0.005, 12); // 5 J = 0.005 kJ
    attemptWordProblem(energy, '0.01');
    expect(energy.uc().wordProblemSolved).toBe(false);
  });
});

describe('reversed-ratio feedback', () => {
  it('names a flipped ratio from the starting value, not from 1 / answer', () => {
    const diagnose = window.__UnitConvertCore.diagnosePracticeAnswer;
    // 3 ft -> in: right answer 36; a flipped ratio gives 3 / 12 = 0.25.
    expect(diagnose(0.25, 36, 'in', 3)).toContain('ratio may be reversed');
    expect(diagnose(1 / 36, 36, 'in', 3)).not.toContain('reversed');
    // Callers that pass no starting value keep the value-1 behaviour.
    expect(diagnose(1 / 12, 12, 'in')).toContain('ratio may be reversed');
    // Temperature has no ratio to flip: 20 C -> 68 F, and 400/68 must not read as "reversed".
    expect(diagnose(400 / 68, 68, DEG + 'F', 20)).toContain('offset');
    expect(diagnose(400 / 68, 68, DEG + 'F', 20)).not.toContain('reversed');
    // An answer of 0 is not a flipped ratio.
    expect(diagnose(0, 1000, 'g', 1)).not.toContain('reversed');
  });

  it('the word-problem screen passes the starting value to the hint', () => {
    const h = harness({ unitConvert: { tab: 'wordproblem', category: 'length', value: 1, fromUnit: 'ft', toUnit: 'in' } });
    buttonWithText(h.render(), 'Generate Problem').props.onClick();
    expect(h.uc().wordProblem.inputValue).toBe(3);
    expect(h.uc().wordProblem.answer).toBeCloseTo(36, 9);
    attemptWordProblem(h, '0.25');
    expect(h.uc().wordProblemSolved).toBe(false);
    expect(h.uc().wordProblemFeedback).toContain('ratio may be reversed');
  });

  it('the quiz does not call an answer of 0 a reversed ratio', () => {
    const diagnose = window.__UnitConvertCore.diagnoseNumericAnswer;
    const zero = diagnose(0, 1000, 'g', 0.01);
    expect(zero).not.toContain('reversed');
    expect(zero).toContain('The answer is 1000 g.');
    expect(diagnose(1 / 12, 12, 'in', 0.01)).toContain('ratio is reversed');
  });
});

describe('quiz next question', () => {
  it('the Next Question button after an answer clears the previous answer', () => {
    const h = harness({ unitConvert: { tab: 'quiz', category: 'length', value: 1, fromUnit: 'm', toUnit: 'ft',
      quiz: { q: 'How many inches in 1 foot?', a: 12, unit: 'in', tol: 0.01, answered: false, startTime: Date.now() } } });
    const input = walk(h.render(), (n) => n.type === 'input' && n.props['aria-label'] === 'Quiz answer')[0];
    input.props.onChange({ target: { value: '12' } });
    buttonWithText(h.render(), 'Check answer').props.onClick();
    expect(h.uc().quiz.answered).toBe(true);

    buttonWithLabel(h.render(), 'Next Question').props.onClick();
    expect(h.uc().quiz.answered).toBe(false);
    expect(h.uc().quizDraft).toBe('');
    const next = walk(h.render(), (n) => n.type === 'input' && n.props['aria-label'] === 'Quiz answer')[0];
    expect(next.props.value).toBe('');
  });
});

describe('save without a unitConvert slice', () => {
  it('saving from an old project with no unitConvert data does not throw', () => {
    const h = harness({});
    const save = buttonWithLabel(h.render(), 'Save');
    expect(() => save.props.onClick()).not.toThrow();
    expect(h.uc().history).toHaveLength(1);
    expect(h.uc().historySaveCount).toBe(1);
  });
});

describe('metric-prefix canvas labels', () => {
  it('writes powers of ten as exponents, not as 10+3 or 10-12', () => {
    const canvas = walk(harness({}).render(), (n) => n.type === 'canvas')[0];
    const refFn = canvas.ref || canvas.props.ref;
    expect(typeof refFn).toBe('function');
    const drawn = [];
    const c2 = { setTransform() {}, scale() {}, fillRect() {}, save() {}, restore() {}, fillText(s) { drawn.push(String(s)); } };
    const cvEl = { getContext: () => c2, offsetWidth: 600, offsetHeight: 180, isConnected: true, width: 0, height: 0 };
    const savedMatchMedia = window.matchMedia;
    const savedRO = globalThis.ResizeObserver;
    window.matchMedia = () => ({ matches: true }); // reduced motion: one frame, no animation loop
    globalThis.ResizeObserver = undefined;
    try {
      refFn(cvEl);
    } finally {
      if (cvEl._mpCleanup) cvEl._mpCleanup();
      window.matchMedia = savedMatchMedia;
      globalThis.ResizeObserver = savedRO;
    }
    const sup = (s) => s.split('').map((ch) => (ch === '-' ? String.fromCharCode(0x207B)
      : String.fromCharCode(0x2070, 0xB9, 0xB2, 0xB3, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079).charAt(Number(ch)))).join('');
    expect(drawn).toContain('10' + sup('3'));
    expect(drawn).toContain('10' + sup('-12'));
    expect(drawn).toContain('10' + sup('0'));
    expect(drawn.filter((s) => /^10[+-]?\d/.test(s))).toEqual([]);
  });
});

describe('AI prompts use the English category id', () => {
  const japaneseLength = String.fromCharCode(0xD83D, 0xDCCF) + ' ' + String.fromCharCode(0x9577, 0x3055);
  const translated = (key, fallback) => (key === 'stem.unitconvert.length' ? japaneseLength : fallback);

  it('the word-problem prompt names the category under a translated label', async () => {
    const prompts = [];
    const h = harness({ unitConvert: { tab: 'wordproblem', category: 'length', value: 1, fromUnit: 'm', toUnit: 'ft' } },
      { t: translated, callGemini: (p) => { prompts.push(p); return new Promise(() => {}); } });
    buttonWithText(h.render(), 'Generate Problem').props.onClick();
    await Promise.resolve();
    await Promise.resolve();
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('Category: length.');
  });

  it('the tutor prompt names the category under a translated label', () => {
    const prompts = [];
    const h = harness({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'ft' } },
      { t: translated, callGemini: (p) => { prompts.push(p); return new Promise(() => {}); } });
    buttonWithLabel(h.render(), 'Tutor').props.onClick();
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('They are converting length units');
  });
});

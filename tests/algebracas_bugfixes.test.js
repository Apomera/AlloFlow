// Algebra CAS depth review (2026-11-03), bugs B1-B9: one regression test each.
// ALGEBRACAS_FILE points the suite at another copy (used to prove each test fails on the
// code before the fix).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.ALGEBRACAS_FILE || 'stem_lab/stem_tool_algebracas.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => {
  const drawing = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 20 }) : () => {} });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  resetStemLab(); loadTool(FILE, 'algebraCAS'); document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const cas = () => window.__alloCASPure;

async function mount(state, extra = {}) {
  let latest;
  const awardXP = vi.fn();
  function App() {
    const [data, setData] = React.useState({ algebraCAS: state });
    latest = data;
    return window.StemLab._registry.algebraCAS.render(makeCtx({ toolData: data, setToolData: setData, awardXP, ...extra }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest.algebraCAS, awardXP };
}
const visible = (el) => { const c = el.cloneNode(true); c.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove()); return c.textContent.trim(); };
async function click(label) {
  const el = [...document.querySelectorAll('button')].find((b) => visible(b) === label || b.getAttribute('aria-label') === label);
  expect(el, label).toBeTruthy();
  await React.act(async () => { el.click(); await Promise.resolve(); });
}
async function type(selector, value) {
  const el = document.querySelector(selector);
  expect(el, selector).toBeTruthy();
  await React.act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}

describe('B1: x isolated on the RIGHT is solved', () => {
  it('12 = 3x divided by 3 gives the solved 4 = x', () => {
    expect(cas().balanceOperation('12 = 3x', 'Divide', '3')).toMatchObject({ equation: '4 = x', solved: true });
  });
  it('the standard route for 2x + 3 = 5x - 6 ends solved and is credited once', async () => {
    const app = await mount({ tab: 'scale', scaleEq: '2x + 3 = 5x - 6', scaleOpVal: '2x' });
    await click('Subtract the entered value on both sides');
    await type('input[aria-label="Value to apply to both sides"]', '6');
    await click('Add the entered value on both sides');
    await type('input[aria-label="Value to apply to both sides"]', '3');
    await click('Divide the entered value on both sides');
    expect(app.state().scaleEq).toBe('3 = x');
    expect(app.state().scaleSolved).toBe(true);
    expect(app.state()._scaleSolves).toBe(1);
    expect(app.awardXP.mock.calls.filter((c) => c[2] === 'Balance scale solved')).toHaveLength(1);
  });
});

describe('B2: a wrong AI answer key does not mark a right answer wrong', () => {
  async function practice(problem, answer, typed) {
    const gemini = vi.fn(() => Promise.resolve('CORRECT: no\nFEEDBACK: Check again.\nSOLUTION:\nSTEP 1: work\nANSWER: ' + answer));
    const app = await mount({ tab: 'practice', practiceQ: { problem, answer, hint: '' }, practiceAnswer: typed }, { callGemini: gemini });
    await click('✅ Check');
    await React.act(async () => { await Promise.resolve(); await Promise.resolve(); });
    return { cas: app.state(), text: document.body.textContent, gemini };
  }
  it('key x = 5 for 2x + 3 = 11: the answer 4 is correct, and the key is reported wrong', async () => {
    const r = await practice('2x + 3 = 11', 'x = 5', '4');
    expect(r.cas.practiceFeedback).toMatchObject({ correct: true, gradeSource: 'verified' });
    expect(r.text).toContain('does not fit the problem');
    expect(r.gemini.mock.calls[0][0]).toContain('ENGINE VERDICT');
  });
  it('the same wrong key still marks a wrong answer wrong', async () => {
    const r = await practice('2x + 3 = 11', 'x = 5', '5');
    expect(r.cas.practiceFeedback).toMatchObject({ correct: false, gradeSource: 'verified' });
  });
  it('an incomplete quadratic key does not mark the complete answer wrong', async () => {
    const r = await practice('x^2 - 5x + 6 = 0', 'x = 2', 'x = 2, x = 3');
    expect(r.cas.practiceFeedback).toMatchObject({ correct: true, gradeSource: 'verified' });
    expect(r.text).toContain('left out a solution');
  });
});

describe('B3: mixed numbers in the exact paths', () => {
  it('4 1/2 is four and a half everywhere, and "2 3x" is not 23x', () => {
    expect(cas().gradeLinear('2x+9=18', '4 1/2')).toMatchObject({ decidable: true, correct: true });
    expect(cas().balanceOperation('x = 1', 'Add', '1 1/2').equation).toBe('x + 3/2 = 5/2');
    expect(cas().balanceTrial('2x + 9 = 18', '4 1/2')).toMatchObject({ ok: true, x: '9/2', relation: '=' });
    expect(cas().balanceTrial('2x = -3', '-1 1/2')).toMatchObject({ ok: true, x: '-3/2', relation: '=' });
    expect(cas().solveLinear('x = 4 1/2').answer).toBe('9/2');
    expect(cas().solveLinear('2 3x = 5').ok).toBe(false);
    expect(cas().balanceTrial('x = 1', '1 1/0')).toEqual({ ok: false, reason: 'value' });
  });
});

describe('B4: a no-op step on an equation that is already solved earns nothing', () => {
  it('Add 0 to x = 5 is not a solve', async () => {
    const app = await mount({ tab: 'scale', scaleEq: 'x = 5', scaleOpVal: '0' });
    await click('Add the entered value on both sides');
    expect(app.state()._scaleSolves || 0).toBe(0);
    expect(app.awardXP).not.toHaveBeenCalled();
  });
  it('multiplying by 2 and dividing back is not a solve either', async () => {
    const app = await mount({ tab: 'scale', scaleEq: 'x = 5', scaleOpVal: '2' });
    await click('Multiply the entered value on both sides');
    await click('Divide the entered value on both sides');
    expect(app.state().scaleEq).toBe('x = 5');
    expect(app.state()._scaleSolves || 0).toBe(0);
    expect(app.awardXP).not.toHaveBeenCalled();
  });
});

describe('B5: accessible names match the visible labels', () => {
  const states = [
    { tab: 'solve', expression: '2x + 5 = 13' },
    { tab: 'practice' },
    { tab: 'practice', practiceQ: { problem: '2x = 4', answer: '2', hint: 'h' }, practiceFeedback: { correct: false, text: 'FEEDBACK: x\nSOLUTION:\nSTEP 1: x = 2', gradeSource: 'ai' } },
    { tab: 'tutor', tutorInput: 'How do I solve for x?' }
  ];
  it.each(states.map((s, i) => [i, s]))('state %i: every aria-label contains the button text', (i, state) => {
    const host = document.createElement('div');
    host.innerHTML = renderTool('algebraCAS', { algebraCAS: state }, { callGemini: () => Promise.resolve('') });
    const bad = [];
    for (const b of host.querySelectorAll('button')) {
      const label = b.getAttribute('aria-label');
      const text = visible(b).replace(/^[^A-Za-z0-9]+/, '').toLowerCase();
      if (label && text && !label.toLowerCase().includes(text.slice(0, 6))) bad.push(text + ' -> ' + label);
    }
    expect(bad).toEqual([]);
  });
});

describe('B6: tutor without an AI provider', () => {
  // 2026-11-03 student AI-off sweep: with no usable AI the tutor is hidden (not disabled),
  // and a saved 'tutor' tab falls back to Solve.
  it('hides the tutor and its Send control', () => {
    const host = document.createElement('div');
    host.innerHTML = renderTool('algebraCAS', { algebraCAS: { tab: 'tutor', tutorInput: 'What is a variable?' } });
    const send = [...host.querySelectorAll('button')].find((b) => visible(b) === 'Send');
    expect(send).toBeUndefined();
    expect(host.textContent).not.toContain('needs an AI provider');
  });
});

describe('B7: learner-facing claims are true', () => {
  it('grade intros no longer promise quadratics, systems or a full CAS offline', () => {
    for (const grade of ['7th Grade', '11th Grade']) {
      const html = renderTool('algebraCAS', { algebraCAS: {} }, { gradeLevel: grade });
      expect(html).not.toContain('Tackle quadratics, systems, and factoring.');
      expect(html).not.toContain('Full CAS');
      expect(html).toContain('need the AI provider');
    }
  });
  it('tab hints do not claim what the tool does not do', () => {
    const all = ['solve', 'practice', 'builder', 'tutor'].map((tab) => renderTool('algebraCAS', { algebraCAS: { tab } })).join(' ');
    expect(all).not.toContain('generates an algebra problem matching your design');
    expect(all).not.toContain('The AI checks your answer');
    expect(all).not.toContain('Tutor knows your grade band');
    expect(all).not.toContain('reduce to ~8 transformations');
  });
  it('the tutor really is sent the active problem and recent attempts', async () => {
    const gemini = vi.fn(() => Promise.resolve('Try subtracting 5.'));
    await mount({ tab: 'tutor', tutorInput: 'Why?', expression: '2x + 5 = 13', history: [{ expr: '3x = 9', mode: 'solve' }], practiceQ: { problem: '4x = 8', answer: '2', hint: '' } }, { callGemini: gemini });
    await click('Send');
    const prompt = gemini.mock.calls[0][0];
    expect(prompt).toContain('2x + 5 = 13');
    expect(prompt).toContain('4x = 8');
    expect(prompt).toContain('3x = 9');
  });
});

describe('B8: step text has no "1x", "0x", "Divide both sides by 1" or "2/3x"', () => {
  it.each(['2x + 5 = 13', '3(x - 2) = 15', 'x + 1 = 2', '2x+1=2x+1', '2x+1=2x+2', '(2/3)x = 4', '3x = 2', 'x/3 + 1 = 2', '-x + 4 = 1', '3(x-2)=x+4'])('%s', (eq) => {
    const text = cas().solveLinear(eq).text;
    expect(text).not.toMatch(/(^|[^\d.\/])[01]x/);
    expect(text).not.toMatch(/by 1\]/);
    expect(text).not.toMatch(/\d\/\dx/);
  });
  it('3(x - 2) = 15 shows the distribution step', () => {
    const text = cas().solveLinear('3(x - 2) = 15').text;
    expect(text).toContain('3x - 6 = 15');
    expect(text).toContain('3x = 21');
    expect(text).toContain('ANSWER: 7');
  });
});

describe('B9: a rounded decimal in local practice asks for the exact value', () => {
  it('gradeLinear flags 0.333 for 1/3 as rounded', () => {
    expect(cas().gradeLinear('3x = 1', '0.333')).toMatchObject({ correct: false, rounded: true });
    expect(cas().gradeLinear('3x = 1', '0.34').rounded).not.toBe(true);
  });
  it('the practice tab gives a notice, not a wrong verdict, and keeps the streak', async () => {
    const app = await mount({ tab: 'practice', practiceStreak: 2, practiceQ: { problem: '3x = 1', answer: '1/3', solution: 'STEP 1: x = 1/3', source: 'local-linear', hint: '' }, practiceAnswer: '0.333' });
    await click('✅ Check');
    expect(app.state().practiceFeedback || null).toBeNull();
    expect(app.state().practiceStreak).toBe(2);
    expect(app.state().practiceNotice).toMatch(/exact/i);
  });
});

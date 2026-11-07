// Arithmetic Strategy Studio stage D (2026-11-04): an independent bug hunt.
// Each gate runs the tool; ARITH_STAGED_FILE points the suite at an older
// copy to prove the gate fails on it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.ARITH_STAGED_FILE || 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';
let root = null;

beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

function pure() { loadTool(FILE, ID); return window.ArithmeticStrategyPure; }

async function mount(initial, overrides) {
  const tool = loadTool(FILE, ID);
  const view = { awards: [], announcements: [] };
  function App() {
    const [state, setState] = React.useState(initial);
    view.state = state;
    view.set = setState;
    return tool.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (...args) => view.awards.push(args),
      announceToSR: (m) => view.announcements.push(m),
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
  view.d = () => view.state._arithmeticStudio || {};
  return view;
}
async function unmount() { await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>'; }
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
function button(label) {
  const el = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
  expect(el, label).toBeTruthy();
  return el;
}
const retryMissed = () => [...document.querySelectorAll('button')].find((b) => /^Retry missed/.test(b.textContent.trim()));
const numberInputs = () => [...document.querySelectorAll('input[type="number"]')];
const near = (x, y) => Math.abs(x - y) < 1e-9;

describe('the estimate shown after two far tries never gives away the answer', () => {
  it('no shown example or range end equals the exact answer, the whole quotient or the problem itself', () => {
    const P = pure();
    const leaks = [];
    for (const skill of Object.keys(P.skills)) {
      for (let seed = 1; seed <= 400; seed++) {
        const p = P.generateProblem(skill, seed);
        if (!P.problemNeedsEstimate(p)) continue;
        const est = P.assessEstimate(p.op, p.a, p.b, '0');
        const exact = p.op === 'divide' ? p.a / p.b : p.answer;
        const bad = (v) => v != null && (near(v, exact) || near(v, p.answer));
        if (bad(est.low) || bad(est.high) || (est.example && (bad(est.example.value) || (near(est.example.left, p.a) && near(est.example.right, p.b))))) leaks.push(p.id);
      }
    }
    expect(leaks.slice(0, 5), `${leaks.length} items expose the answer`).toEqual([]);
  });

  it('in Practice, 65 - 44 no longer shows "between 20 and 21" before the answer is typed', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'practice', practiceSource: 'generated', operation: 'subtract', genBand: 'k2', genSkill: 'sub100', genSeed: 23 } });
    expect(document.querySelector('[data-practice-problem-id="sub100-23"]')).toBeTruthy();
    for (const e of ['90', '80']) { await type(numberInputs()[0], e); await click(document.querySelector('[data-lock-estimate]')); }
    expect(view.d().estimateStatus).toBe('shown');
    const shown = document.querySelector('[data-estimate-status="shown"]').textContent;
    expect(shown).not.toMatch(/(^|[^0-9])21([^0-9]|$)/);
    expect(shown).toContain('60 − 40 = 20');
  });
});

describe('estimates: rounding the way the feedback says is accepted, and so is anything closer', () => {
  it('accepts nearest-ten and nearest-hundred estimates and near-side compatible numbers', () => {
    const P = pure();
    expect(P.assessEstimate('subtract', 65, 44, 30).reasonable).toBe(true); // 70 - 40
    expect(P.assessEstimate('subtract', 307, 152, 100).reasonable).toBe(true); // 300 - 200
    expect(P.assessEstimate('subtract', 84, 76, 0).reasonable).toBe(true); // 80 - 80
    expect(P.assessEstimate('divide', 153, 9, 15).reasonable).toBe(true); // 135 / 9, closer than the accepted 20
    expect(P.assessEstimate('divide', 51, 4, 15).reasonable).toBe(true); // 60 / 4
  });
  it('still rejects estimates that are far off', () => {
    const P = pure();
    expect(P.assessEstimate('subtract', 65, 44, 60).reasonable).toBe(false);
    expect(P.assessEstimate('subtract', 307, 152, 300).reasonable).toBe(false);
    expect(P.assessEstimate('add', 27, 35, 500).reasonable).toBe(false);
    expect(P.assessEstimate('multiply', 23, 14, 5000).reasonable).toBe(false);
    expect(P.assessEstimate('divide', 153, 9, 40).reasonable).toBe(false);
  });
});

describe('ruled-out choices survive leaving and coming back', () => {
  it('Error Detective: elimination across visits earns nothing', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'errors', errorIndex: 0 } });
    await click(document.querySelector('[data-error-choice="place"]'));
    await click(button('Next mistake'));
    await click(retryMissed());
    expect(view.d().errorIndex).toBe(0);
    expect(document.querySelector('[data-error-choice="place"]').disabled).toBe(true);
    await click(document.querySelector('[data-error-choice="operation"]'));
    await click(button('Next mistake'));
    await click(retryMissed());
    await click(document.querySelector('[data-error-choice="regroup"]'));
    expect(view.d().errorFeedback).toBe('eliminated');
    expect(view.awards).toEqual([]);
    expect(view.d().errorSolvedCases || {}).not.toHaveProperty('e1');
  });

  it('"Which strategy is efficient?": elimination across visits earns nothing', async () => {
    const P = pure();
    const item = P.genMentalItem('ef', 'g4', 1);
    const view = await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'efficient', genBand: 'g4', efIndex: 1 } });
    for (const w of item.order.filter((x) => x !== item.key)) {
      await click(document.querySelector(`[data-ef-choice="${w}"]`));
      await click(button('Next problem'));
      await click(retryMissed());
      expect(view.d().efIndex).toBe(1);
    }
    await click(document.querySelector(`[data-ef-choice="${item.key}"]`));
    expect(view.d().efFeedback).toBe('eliminated');
    expect(view.awards).toEqual([]);
  });

  it('a first visit with one wrong pick still earns the points on the next pick', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'errors', errorIndex: 0 } });
    await click(document.querySelector('[data-error-choice="place"]'));
    await click(button('Next mistake'));
    await click(retryMissed());
    await click(document.querySelector('[data-error-choice="regroup"]'));
    expect(view.d().errorFeedback).toBe('correct');
    expect(view.awards).toHaveLength(1);
  });
});

describe('the same problem under another id earns points and path ticks once', () => {
  it('Practice: 2 x 4 solved under seed 1 earns nothing again under seed 5', async () => {
    const P = pure();
    const p1 = P.generateProblem('mulGroups', 1), p5 = P.generateProblem('mulGroups', 5);
    expect([p5.a, p5.b]).toEqual([p1.a, p1.b]);
    const view = await mount({ _arithmeticStudio: { tab: 'practice', practiceSource: 'generated', operation: 'multiply', genBand: 'k2', genSkill: 'mulGroups', genSeed: 1 } });
    await type(numberInputs()[0], String(p1.answer));
    await click(button('Check answer'));
    expect(view.awards).toHaveLength(1);
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, genSeed: 5, practiceProblemId: null, answerInput: '', feedback: null } })));
    expect(document.querySelector('[data-practice-problem-id="mulGroups-5"]')).toBeTruthy();
    await type(numberInputs()[0], String(p5.answer));
    await click(button('Check answer'));
    expect(view.d().genSolved['mulGroups-5']).toBe(true);
    expect(view.awards).toHaveLength(1);
  });

  it('Decimals: a repeated tenths problem earns once', async () => {
    const P = pure();
    const a = P.genDecimalItem('mulwhole', 'g3', 0), b = P.genDecimalItem('mulwhole', 'g3', 1);
    expect([b.a, b.b]).toEqual([a.a, a.b]);
    const view = await mount({ _arithmeticStudio: { tab: 'decimals', decMode: 'mulwhole', genBand: 'g3', decIndex: 0, decSolved: {} } });
    const answer = () => document.querySelector('input[inputmode="decimal"]');
    await type(answer(), P.fmtNum(a.answer));
    await click(button('Check answer'));
    expect(view.awards).toHaveLength(1);
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, decIndex: 1, decFor: null, decAnswer: '', decFeedback: null } })));
    await type(answer(), P.fmtNum(b.answer));
    await click(button('Check answer'));
    expect(view.d().decSolved[b.id]).toBe(true);
    expect(view.awards).toHaveLength(1);
  });

  it('"Start here" counts distinct problems, and not a problem shown under another id', () => {
    const P = pure();
    const step = P.learningPaths.k2.find((s) => s.skill === 'mulGroups') || { id: 'x', kind: 'skill', skill: 'mulGroups' };
    expect(P.pathStepCount(step, 'k2', { genSolved: { 'mulGroups-1': true, 'mulGroups-5': true } })).toBe(1);
    expect(P.pathStepCount(step, 'k2', { genSolved: { 'mulGroups-5': true }, practiceRevealedIds: { 'mulGroups-1': true } })).toBe(0);
    expect(P.pathStepCount(step, 'k2', { genSolved: { 'mulGroups-1': true, 'mulGroups-2': true } })).toBe(2);
  });
});

describe('read-aloud', () => {
  let speak, cancel;
  beforeEach(() => {
    speak = vi.fn();
    cancel = vi.fn();
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window.speechSynthesis = { speak, cancel };
  });
  afterEach(() => { delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; });

  it('a host voice that fails after the tool closed starts no browser speech', async () => {
    let resolveTTS;
    const callTTS = vi.fn(() => new Promise((r) => { resolveTTS = r; }));
    await mount({ _arithmeticStudio: { tab: 'learn' } }, { callTTS });
    await click(button('Read the steps aloud'));
    expect(callTTS).toHaveBeenCalledTimes(1);
    await unmount();
    await React.act(async () => { resolveTTS(null); await Promise.resolve(); await Promise.resolve(); });
    expect(speak).not.toHaveBeenCalled();
  });

  it('a host voice that fails while the tool is open still falls back to browser speech', async () => {
    let resolveTTS;
    const callTTS = vi.fn(() => new Promise((r) => { resolveTTS = r; }));
    await mount({ _arithmeticStudio: { tab: 'learn' } }, { callTTS });
    await click(button('Read the steps aloud'));
    await React.act(async () => { resolveTTS(null); await Promise.resolve(); await Promise.resolve(); });
    expect(speak).toHaveBeenCalledTimes(1);
  });
});

describe('i18n', () => {
  it('a division prediction is echoed with the translated word, not a glued " r "', async () => {
    const t = (key, fallback) => (key === 'stem.arithmetic.answer_with_remainder' ? '{q} Rest {r}' : fallback);
    const view = await mount({ _arithmeticStudio: { tab: 'learn', operation: 'divide', a: 157, b: 12 } }, { t });
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, learnPrediction: '12', learnPredictionRemainder: '3' } })));
    await click(button('Check my prediction'));
    const text = document.querySelector('[data-learn-predict]').textContent;
    expect(text).toContain('12 Rest 3');
    expect(text).not.toContain('12 r 3');
  });
});

// Arithmetic Strategy Studio stage E (2026-11-04): three approved follow-ups.
// 1. Learn hides only the model's final total until the prediction.
// 2. A basic fact with zeros (7 x 60) is a fact: no estimate step.
// 3. A problem solved before under another id says it earns no new points.
// ARITH_STAGEE_FILE points the suite at an older copy to prove each gate fails on it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.ARITH_STAGEE_FILE || 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';
let root = null;

beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

function pure() { loadTool(FILE, ID); return window.ArithmeticStrategyPure; }

async function mount(initial, overrides) {
  const tool = loadTool(FILE, ID);
  const view = { awards: [], announcements: [], spoken: [] };
  function App() {
    const [state, setState] = React.useState(initial);
    view.state = state;
    view.set = setState;
    return tool.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (...args) => view.awards.push(args),
      announceToSR: (m) => view.announcements.push(m),
      callTTS: (text) => { view.spoken.push(text); return Promise.resolve('blob:ok'); },
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
  view.d = () => view.state._arithmeticStudio || {};
  view.patch = async (patch) => React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, ...patch } })));
  return view;
}
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
function findButton(label) { return [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label); }
function button(label) { const el = findButton(label); expect(el, label).toBeTruthy(); return el; }
const numberInputs = () => [...document.querySelectorAll('input[type="number"]')];

// Everything a student can see or hear: text (including collapsed details),
// accessible names, value text, SVG title/desc and tooltips.
function exposed() {
  const el = document.getElementById('root');
  const parts = [el.textContent];
  el.querySelectorAll('[aria-label]').forEach((n) => parts.push(n.getAttribute('aria-label')));
  el.querySelectorAll('[aria-valuetext]').forEach((n) => parts.push(n.getAttribute('aria-valuetext')));
  el.querySelectorAll('[title]').forEach((n) => parts.push(n.getAttribute('title')));
  el.querySelectorAll('title, desc').forEach((n) => parts.push(n.textContent));
  return parts.join(' | ');
}
const showsNumber = (s, n) => new RegExp('(^|[^0-9.,])' + n + '(?![0-9]|[.,][0-9])').test(s);
// 2026-11-04 engagement build: "Next step" became the student's own move ("Trade 10 ones for 1 ten",
// "Take away 8 ones"); at the end it stays focusable with aria-disabled.
const modelSteps = () => { const b = document.querySelector('[data-walk-next]'); return b && b.getAttribute('aria-disabled') !== 'true' ? b : undefined; };

describe('Learn hides only the final total until the prediction (option B)', () => {
  const cases = [
    ['add', 345, 278, 623],
    ['subtract', 503, 278, 225],
    ['subtract', 102, 38, 64],
    ['add', 58, 67, 125],
    ['multiply', 23, 14, 322],
    ['multiply', 345, 24, 8280],
    ['multiply', 7, 8, 56],
    ['multiply', 40, 30, 1200],
    ['multiply', 7, 60, 420],
    ['divide', 157, 12, 13],
  ];
  it.each(cases)('%s %i and %i: the total %i is not seen, heard or announced before the prediction', async (operation, a, b, total) => {
    const view = await mount({ _arithmeticStudio: { tab: 'learn', operation, a, b } });
    const leaks = [];
    const look = (where) => { if (showsNumber(exposed(), total)) leaks.push(where); };
    look('start');
    // Step through the whole place-value walk, and open the algorithm bridge.
    for (let i = 0; i < 12 && modelSteps() && !modelSteps().disabled; i++) { await click(modelSteps()); look('step ' + (i + 1)); }
    const bridge = document.querySelector('[data-algorithm-bridge]');
    if (bridge) { bridge.open = true; look('bridge'); }
    if (operation === 'divide') { await click(button('Share among a given number of groups')); look('sharing'); }
    await click(document.querySelector('[data-read-aloud="learn"]'));
    const heard = view.spoken.concat(view.announcements).join(' | ');
    if (showsNumber(heard, total)) leaks.push('speech or announcement');
    expect(leaks).toEqual([]);
    // The intermediate parts stay visible.
    if (operation === 'multiply' && a === 23) for (const part of ['200', '80', '30', '12']) expect(exposed()).toContain(part);
    if (operation === 'multiply' && a === 345) expect(exposed()).toContain('6000 + 1200 + 800 + 160 + 100 + 20 = ?');
    // The place counts stay visible, now in words ("6 hundreds + 2 tens + 3 ones").
    if (operation === 'add' && a === 345) expect(document.querySelector('[data-place-value-model]').textContent).toContain('hundreds');
  });

  it('a zero product does not state the product before the prediction', async () => {
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'multiply', a: 0, b: 7 } });
    expect(exposed()).not.toMatch(/Product: 0|the product is zero/);
    expect(document.querySelector('[role="img"]').getAttribute('aria-label')).toContain('one factor is zero');
  });

  it('subtraction keeps the steps before the last take-away, and hides only the difference', async () => {
    await mount({ _arithmeticStudio: { tab: 'learn', operation: 'subtract', a: 102, b: 38 } });
    await click(modelSteps());
    expect(document.querySelector('[data-value-change]').textContent).toContain('both representations have value 102');
    await click(modelSteps()); await click(modelSteps());
    expect(document.querySelector('[data-value-change]').textContent).toContain('102 − 8 = 94');
    await click(modelSteps());
    expect(document.querySelector('[data-value-change]').textContent).toContain('94 − 30 = ?');
    await click(modelSteps());
    expect(document.querySelector('[data-value-change]').textContent).not.toContain('64');
  });

  it('a wrong prediction keeps the total hidden; a right one, or "Show the exact result", shows it', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'learn', operation: 'multiply', a: 23, b: 14 } });
    await view.patch({ learnPrediction: '312' });
    await click(button('Check my prediction'));
    expect(view.d().learnPredictionResult).toBe('try');
    expect(showsNumber(exposed(), 322)).toBe(false);
    await view.patch({ learnPrediction: '322' });
    await click(button('Check my prediction'));
    expect(view.d().learnPredictionResult).toBe('correct');
    expect(exposed()).toContain('200 + 80 + 30 + 12 = 322');

    await view.patch({ a: 24, learnPrediction: '' });
    expect(showsNumber(exposed(), 336)).toBe(false);
    await click(button('Show the exact result'));
    expect(exposed()).toContain('200 + 80 + 40 + 16 = 336');
  });

  it('division shows the quotient and remainder once the prediction is right', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'learn', operation: 'divide', a: 157, b: 12 } });
    expect(document.querySelector('[data-division-remainder]').textContent).not.toMatch(/Left over: 1\b/);
    await view.patch({ learnPrediction: '13', learnPredictionRemainder: '1' });
    await click(button('Check my prediction'));
    expect(exposed()).toContain('13 complete groups of 12, with 1 left over');
    expect(exposed()).toContain('157 = 13 × 12 + 1');
  });
});

describe('a basic fact with zeros (7 x 60) is a fact: no estimate step', () => {
  const needs = (P, a, b, op = 'multiply') => P.problemNeedsEstimate({ op, a, b });
  it('treats a one-digit times a multiple of ten, two "digit and zeros" factors, and zero factors as facts', () => {
    const P = pure();
    for (const [a, b] of [[7, 60], [60, 7], [70, 6], [60, 70], [7, 600], [600, 7], [10, 60], [90, 90], [9, 9000], [0, 60], [60, 0], [0, 4837], [7, 8], [10, 10]]) {
      expect(needs(P, a, b), `${a} x ${b}`).toBe(false);
    }
  });
  it('still asks for an estimate when rounding would change a factor', () => {
    const P = pure();
    for (const [a, b] of [[12, 60], [7, 65], [17, 60], [61, 7], [7, 61], [25, 40], [7, 605], [15, 30], [11, 11], [0.7, 60]]) {
      expect(needs(P, a, b), `${a} x ${b}`).toBe(true);
    }
    expect(needs(P, 420, 7, 'divide')).toBe(true); // the rule is for products only
  });
  it('every generated "multiply by multiples of 10" problem is a fact with no estimate step', () => {
    const P = pure();
    for (let seed = 1; seed <= 300; seed++) {
      const p = P.generateProblem('mulTens', seed);
      expect(P.problemNeedsEstimate(p), p.id).toBe(false);
      expect(p.fact, p.id).toBe(true);
    }
  });
  it('in Practice, 7 x 60 opens the answer box at once and earns the points', async () => {
    const P = pure();
    let seed = 1;
    while (seed < 400) { const p = P.generateProblem('mulTens', seed); if (p.a === 7 && p.b === 60) break; seed++; }
    const p = P.generateProblem('mulTens', seed);
    expect([p.a, p.b]).toEqual([7, 60]);
    const view = await mount({ _arithmeticStudio: { tab: 'practice', practiceSource: 'generated', operation: 'multiply', genBand: 'g3', genSkill: 'mulTens', genSeed: seed } });
    expect(document.querySelector('[data-lock-estimate]')).toBeNull();
    expect(numberInputs()).toHaveLength(1);
    expect(numberInputs()[0].disabled).toBe(false);
    expect(document.getElementById('root').textContent).toContain('basic fact with zeros');
    await type(numberInputs()[0], '420');
    await click(button('Check answer'));
    expect(view.d().genSolved[p.id]).toBe(true);
    expect(view.awards).toHaveLength(1);
  });
});

describe('mounts cleanly in every mode', () => {
  it('every tab and Learn operation, hidden and open, in light, dark, contrast and teacher mode, logs nothing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const states = ['learn', 'practice', 'errors', 'apply', 'mental', 'bars', 'decimals'].map((tab) => ({ tab }));
      for (const [operation, a, b] of [['add', 345, 278], ['subtract', 503, 278], ['multiply', 7, 60], ['multiply', 0, 7], ['multiply', 6, 4], ['divide', 157, 12], ['divide', 9999, 1]]) {
        states.push({ tab: 'learn', operation, a, b }, { tab: 'learn', operation, a, b, learnRevealSig: `${operation}:${a}:${b}`, divisionMeaning: 'sharing' });
      }
      for (const overrides of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }]) {
        for (const s of states) {
          await mount({ _arithmeticStudio: s }, overrides);
          expect(document.getElementById('root').textContent, JSON.stringify(s)).not.toMatch(/render error|NaN|undefined/);
          await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';
        }
      }
      expect(error.mock.calls.map((c) => String(c[0]).slice(0, 160))).toEqual([]);
      expect(warn.mock.calls.map((c) => String(c[0]).slice(0, 160))).toEqual([]);
    } finally { error.mockRestore(); warn.mockRestore(); }
  }, 120000);
});

describe('a problem solved before under another id says it earns no new points', () => {
  const NOTE = 'You solved this same problem before, so it earns no new points.';
  const note = () => document.querySelector('[data-repeat-no-credit]');

  it('Practice: the second solve of 2 x 4 shows and announces the note once; the first solve does not', async () => {
    const P = pure();
    const p1 = P.generateProblem('mulGroups', 1), p5 = P.generateProblem('mulGroups', 5);
    expect([p5.a, p5.b]).toEqual([p1.a, p1.b]);
    const view = await mount({ _arithmeticStudio: { tab: 'practice', practiceSource: 'generated', operation: 'multiply', genBand: 'k2', genSkill: 'mulGroups', genSeed: 1 } });
    await type(numberInputs()[0], String(p1.answer));
    await click(button('Check answer'));
    expect(view.awards).toHaveLength(1);
    expect(note()).toBeNull();
    expect(view.announcements.join(' ')).not.toContain(NOTE);
    await view.patch({ genSeed: 5, practiceProblemId: null, answerInput: '', feedback: null });
    await type(numberInputs()[0], String(p5.answer));
    const before = view.announcements.length;
    await click(button('Check answer'));
    expect(view.awards).toHaveLength(1);
    expect(note()).toBeTruthy();
    expect(note().textContent).toBe(NOTE);
    expect(note().closest('[role="status"]')).toBeTruthy();
    const said = view.announcements.slice(before);
    expect(said).toHaveLength(1);
    expect(said[0].split(NOTE)).toHaveLength(2);
    // Back on the problem that earned the points: no note.
    await view.patch({ genSeed: 1, practiceProblemId: null });
    expect(document.querySelector('[data-practice-problem-id="mulGroups-1"]')).toBeTruthy();
    expect(note()).toBeNull();
  });

  it('Practice: a problem whose answer was shown under another id says so', async () => {
    const P = pure();
    const p1 = P.generateProblem('mulGroups', 1);
    const view = await mount({ _arithmeticStudio: { tab: 'practice', practiceSource: 'generated', operation: 'multiply', genBand: 'k2', genSkill: 'mulGroups', genSeed: 1 } });
    for (const wrong of ['1', '2']) { await type(numberInputs()[0], wrong); await click(button('Check answer')); }
    await click(button('Show the answer'));
    expect(view.d().practiceRevealedIds['mulGroups-1']).toBe(true);
    await view.patch({ genSeed: 5, practiceProblemId: null, answerInput: '', feedback: null, practiceTry: 0 });
    await type(numberInputs()[0], String(p1.answer));
    await click(button('Check answer'));
    expect(view.awards).toHaveLength(0);
    expect(note().getAttribute('data-repeat-no-credit')).toBe('shown');
    expect(note().textContent).toContain('earns no points');
  });

  it('Decimals: a repeated tenths problem shows the note on the second solve', async () => {
    const P = pure();
    const a = P.genDecimalItem('mulwhole', 'g3', 0), b = P.genDecimalItem('mulwhole', 'g3', 1);
    expect([b.a, b.b]).toEqual([a.a, a.b]);
    const view = await mount({ _arithmeticStudio: { tab: 'decimals', decMode: 'mulwhole', genBand: 'g3', decIndex: 0, decSolved: {} } });
    const answer = () => document.querySelector('input[inputmode="decimal"]');
    await type(answer(), P.fmtNum(a.answer));
    await click(button('Check answer'));
    expect(note()).toBeNull();
    await view.patch({ decIndex: 1, decFor: null, decAnswer: '', decFeedback: null });
    await type(answer(), P.fmtNum(b.answer));
    const before = view.announcements.length;
    await click(button('Check answer'));
    expect(view.awards).toHaveLength(1);
    expect(note().textContent).toBe(NOTE);
    expect(view.announcements.slice(before).filter((m) => m.includes(NOTE))).toHaveLength(1);
  });

  function findPair(gen, keyOf, ok = () => true) {
    const seen = {};
    for (let i = 0; i < 3000; i++) {
      const item = gen(i);
      if (!ok(item)) continue;
      const k = keyOf(item);
      if (seen[k] != null) return [seen[k], i];
      seen[k] = i;
    }
    return null;
  }

  it('Number talk: a repeated problem shows the note on the second solve', async () => {
    const P = pure();
    const pair = findPair((i) => P.genMentalItem('nt', 'g4', i), (it) => it.op + ':' + it.a + ':' + it.b);
    expect(pair).toBeTruthy();
    const view = await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'talk', genBand: 'g4', ntIndex: pair[0] } });
    for (const idx of pair) {
      const item = P.genMentalItem('nt', 'g4', idx);
      await view.patch({ ntIndex: idx, ntFor: null, ntPick: null, ntAnswer: '', ntTry: 0, ntFeedback: null });
      expect(document.querySelector(`[data-number-talk="${item.id}"]`)).toBeTruthy();
      await click(document.querySelector('[data-nt-pick="own"]'));
      await type(numberInputs()[0], String(item.answer));
      await click(button('Check answer'));
      expect(view.d().ntSolved[item.id]).toBe(true);
      if (idx === pair[0]) expect(note()).toBeNull();
    }
    expect(view.awards).toHaveLength(1);
    expect(note().textContent).toBe(NOTE);
  });

  it('Bar models: a repeated one-step problem shows the note on the second solve', async () => {
    const P = pure();
    const pair = findPair((i) => P.genBarProblem('g4', i), (p) => p.type + ':' + JSON.stringify(p.nums), (p) => !p.twoStep);
    expect(pair).toBeTruthy();
    const view = await mount({ _arithmeticStudio: { tab: 'bars', genBand: 'g4', barIndex: pair[0] } });
    for (const idx of pair) {
      const p = P.genBarProblem('g4', idx);
      await view.patch({ barIndex: idx, barFor: p.id, barStep: 0, barModelLocked: true, barModelFeedback: 'ok', barOp: p.steps[0].op, barAnswer: String(p.steps[0].answer), barFeedback: null, barTry: 0 });
      expect(document.querySelector(`[data-bar-problem="${p.id}"]`)).toBeTruthy();
      await click(button('Check answer'));
      expect(view.d().barSolved[p.id]).toBe(true);
      if (idx === pair[0]) expect(note()).toBeNull();
    }
    expect(view.awards).toHaveLength(1);
    expect(note().textContent).toBe(NOTE);
  });

  it('"Which strategy is efficient?": a repeated problem shows the note on the second solve', async () => {
    const P = pure();
    const seen = {};
    let pair = null;
    for (let i = 0; i < 3000 && !pair; i++) {
      const it = P.genMentalItem('ef', 'g4', i);
      const k = it.op + ':' + it.a + ':' + it.b;
      if (seen[k] != null) pair = [seen[k], i]; else seen[k] = i;
    }
    expect(pair, 'two "efficient" items with the same numbers').toBeTruthy();
    const first = P.genMentalItem('ef', 'g4', pair[0]);
    const view = await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'efficient', genBand: 'g4', efIndex: pair[0] } });
    expect(document.querySelector(`[data-efficient="${first.id}"]`)).toBeTruthy();
    await click(document.querySelector(`[data-ef-choice="${first.key}"]`));
    expect(view.awards).toHaveLength(1);
    expect(note()).toBeNull();
    await view.patch({ efIndex: pair[1], efFor: null, efChoice: null, efTry: 0, efFeedback: null, efWrong: [] });
    const second = P.genMentalItem('ef', 'g4', pair[1]);
    expect(document.querySelector(`[data-efficient="${second.id}"]`)).toBeTruthy();
    await click(document.querySelector(`[data-ef-choice="${second.key}"]`));
    expect(view.awards).toHaveLength(1);
    expect(note().textContent).toBe(NOTE);
  });
});

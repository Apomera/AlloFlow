// Calculus deep rebuild (2026-11-03): regressions for the review's confirmed bugs, and the
// student/teacher flows of the rebuild, driven through the real UI in jsdom.
// CALCULUS_DEEP_FILE points the suite at another copy of the tool (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null, drawn = [], rafQueue = [];

beforeEach(() => {
  resetStemLab();
  drawn = []; rafQueue = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }), fillText: (s) => { drawn.push(String(s)); } }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { rafQueue.push(cb); return rafQueue.length; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  loadTool(FILE, 'calculus');
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  container.remove();
  delete window.matchMedia;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function mount(init, extra) {
  const out = { latest: null, xp: [], prompts: [] };
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    out.latest = state.calculus;
    out.setState = setState;
    return window.StemLab._registry.calculus.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: (id, n, why) => out.xp.push([id, n, why]), addToast: () => {} }, extra || {})));
  }
  root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(App)));
  return out;
}
async function unmount() { if (root) await React.act(async () => root.unmount()); root = null; }
const btn = (text) => [...container.querySelectorAll('button')].find((b) => (b.textContent || '').includes(text));
const btnLabel = (label) => [...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label);
async function click(el) { expect(el, 'button to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function type(el, value) {
  await React.act(async () => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const graphLabel = () => container.querySelector('svg[role="img"]').getAttribute('aria-label');
const svgText = () => [...container.querySelectorAll('svg text')].map((t) => t.textContent).join(' | ');

describe('review bugs (regressions)', () => {
  it('HIGH :2079 Find the Slope: f′(x₀) is not printed or spoken before the student answers', async () => {
    const m = await mount({ tab: 'challenge', calcChallengeMode: 'deriv', calcBand: 'ab' });
    for (let i = 0; i < 15; i++) {
      await click(btn(i === 0 ? 'Start Challenge' : 'New Challenge'));
      const q = m.latest.calcQuiz;
      expect(q.answered).toBe(false);
      expect(svgText()).not.toMatch(/f′\(/);
      expect(graphLabel()).not.toMatch(/slope|tangent/i);
    }
  });

  it('HIGH (SR) :2061 challenge graphs never speak "exact integral" or the estimate before an answer', async () => {
    for (const mode of ['estimate', 'exact', 'overunder']) {
      const m = await mount({ tab: 'challenge', calcChallengeMode: mode, calcBand: 'ab', mode: 'left', n: 20 });
      for (let i = 0; i < 10; i++) {
        await click(btn(i === 0 ? 'Start Challenge' : 'New Challenge'));
        expect(graphLabel(), mode).not.toMatch(/exact integral|Estimate \d|error/i);
        expect(svgText(), mode).not.toMatch(/∫ ≈/);
        expect(m.latest.calcQuiz.answered).toBe(false);
      }
      await unmount();
    }
  });

  it('HIGH :1975 Best Method is not always Simpson’s', async () => {
    const m = await mount({ tab: 'challenge', calcChallengeMode: 'method', calcBand: 'ab' });
    const answers = {};
    for (let i = 0; i < 60; i++) {
      await click(btn(i === 0 ? 'Start Challenge' : 'New Challenge'));
      answers[m.latest.calcQuiz.answer] = (answers[m.latest.calcQuiz.answer] || 0) + 1;
    }
    expect(Object.keys(answers).length, JSON.stringify(answers)).toBeGreaterThanOrEqual(2);
    expect(answers.simpson || 0).toBeLessThan(60);
  });

  it('MED :2767/:2822 mission answer buttons are named by their own text, not "Next Step"', async () => {
    await mount({ tab: 'discover', missionIdx: 1, missionStep: 2, missionData: { prediction: 'Midpoint', measured: "Simpson's" } });
    expect(btnLabel('Next Step')).toBeUndefined();
    const parab = btn('It uses parabolas');
    expect(parab.getAttribute('aria-label')).toBeNull();
    await unmount();
    await mount({ tab: 'discover', missionIdx: 2, missionStep: 1, missionData: { slope1: '2', slope2: '4', slope3: '6' } });
    expect(btnLabel('Next Step')).toBeUndefined();
    expect(btn('= 2x')).toBeTruthy();
  });

  it('MED :320 under reduced motion a view draws the student’s value, not frame 1 of the animation', async () => {
    window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
    await mount({ tab: 'visualize', vizView: 'riemann', vizN: 37 });
    await React.act(async () => { const q = rafQueue.slice(); rafQueue = []; q.forEach((cb) => cb(0)); });
    expect(drawn.some((s) => /n = 37\b/.test(s)), drawn.slice(-6).join(' / ')).toBe(true);
    expect(container.querySelector('#calc-viz-desc').textContent).toContain('n = 37');
  });

  it('MED :1632 the ε–δ game checks the student’s δ instead of choosing it', async () => {
    const m = await mount({ tab: 'visualize', vizView: 'eps', vizEpsFn: 'square', vizEps: 0.5, vizDelta: 1.5 });
    await click(btn('Check my δ'));
    expect(m.latest.vizEpsChecked.trapped).toBe(false);
    expect(container.textContent).toContain('Leaks out');
    await type(container.querySelector('#calc-viz-delta'), '0.1');
    await click(btn('Check my δ'));
    expect(m.latest.vizEpsChecked.trapped).toBe(true);
    expect(container.textContent).toContain('Trapped!');
    expect(m.xp.length).toBe(1);
    await click(btn('Check my δ'));
    expect(m.xp.length, 'no farming the same round').toBe(1);
  });

  it('LOW :923 slope fields: the student picks the equation', async () => {
    const m = await mount({ tab: 'visualize', vizView: 'slope' });
    await click(btn("y′ = x − y"));
    expect(m.latest.vizOde).toBe(1);
    expect(m.latest.vizUserInteracted.ode).toBe(true);
  });

  it('LOW :2335/:2605 static labels are not role="alert"', async () => {
    for (const tab of ['integral', 'discover']) {
      await mount({ tab });
      expect(container.querySelectorAll('[role="alert"]').length, tab).toBe(0);
      await unmount();
    }
  });

  it('LOW :3098 the Riemann caption matches the n range the view really uses', async () => {
    await mount({ tab: 'visualize', vizView: 'riemann' });
    expect(container.querySelector('#calc-viz-riemann-n').getAttribute('max')).toBe('256');
    expect(container.textContent).toContain('n from 1 to 256');
  });

  it('LOW :3211 the AI prompt on Visualize describes the view, not the Integral tab’s quadratic', async () => {
    const prompts = [];
    await mount({ tab: 'visualize', vizView: 'taylor', a: 2, b: 3, c: 1 }, { callGemini: (p) => { prompts.push(p); return Promise.resolve('ok'); }, aiHintsEnabled: true });
    await click(btn('Explain'));
    expect(prompts.length).toBe(1);
    expect(prompts[0]).toContain('"taylor" visualization');
    expect(prompts[0]).not.toMatch(/rectangles|2x²/);
  });

  it('Suspected: challenge-type buttons are at least 24 px (min-h utility)', async () => {
    await mount({ tab: 'challenge' });
    const types = container.querySelectorAll('[aria-label^="Start "][aria-pressed]');
    expect(types.length).toBeGreaterThan(3);
    types.forEach((b) => expect(b.className).toMatch(/min-h-\[(3[2-9]|4\d)px\]/));
  });
});

describe('challenge: commit, named misconception, second try, then reveal', () => {
  const quiz = { mode: 'deriv', a: 2, b: 1, c: 3, x0: 1, answer: 5, band: 'ab', answered: false, attempts: 0, tried: [], id: 'deriv-test',
    opts: [{ id: '3', value: 3, mis: 'power_rule_bring_down' }, { id: '5', value: 5, mis: '' }, { id: '6', value: 6, mis: 'height_not_slope' }, { id: '8', value: 8, mis: 'constant_derivative' }] };

  it('a wrong answer names the misconception and keeps the answer hidden; the second wrong one reveals it and logs it', async () => {
    const m = await mount({ tab: 'challenge', calcChallengeMode: 'deriv', calcBand: 'ab', calcQuiz: quiz });
    await click(btn('6'));
    expect(m.latest.calcQuiz.answered).toBe(false);
    expect(container.textContent).toContain('the height of the curve');
    expect(container.textContent).not.toContain('Correct answer');
    expect(btn('6').disabled).toBe(true);
    await click(btn('8'));
    expect(m.latest.calcQuiz.answered).toBe(true);
    // Stage C: the answer is offered after two tries, not forced.
    expect(container.textContent).not.toContain('Correct answer: 5');
    await click(btn('Show the answer (no credit)'));
    expect(container.textContent).toContain('Correct answer: 5');
    expect(m.latest.calcMissed.length).toBe(1);
    expect(m.latest.calcMissed[0].mis).toBe('constant_derivative');
    expect(m.xp.length).toBe(0);
  });

  it('a right first answer pays 5 XP once; a teacher can withhold the reveal', async () => {
    vi.useFakeTimers();
    const m = await mount({ tab: 'challenge', calcChallengeMode: 'deriv', calcBand: 'ab', calcQuiz: quiz });
    await click(btn('5'));
    expect(m.latest.calcQuiz.correct).toBe(true);
    expect(m.xp).toEqual([['calculus', 5, 'Calculus challenge: deriv']]);
    vi.useRealTimers();
    await unmount();
    const m2 = await mount({ tab: 'challenge', calcChallengeMode: 'deriv', calcBand: 'ab', teacherNoReveal: true, calcQuiz: quiz });
    await click(btn('3'));
    await click(btn('6'));
    expect(m2.latest.calcQuiz.answered).toBe(true);
    expect(container.textContent).not.toContain('Correct answer: 5');
    expect(container.textContent).toContain('ask your teacher');
  });

  it('hints come one rung at a time and never contain the answer', async () => {
    await mount({ tab: 'challenge', calcChallengeMode: 'deriv', calcBand: 'ab', calcQuiz: quiz });
    for (let r = 1; r <= 3; r++) await click(btn('Hint ' + r + ' of 3'));
    const hints = [...container.querySelectorAll('ol.list-decimal li')].map((li) => li.textContent);
    expect(hints.length).toBe(3);
    hints.forEach((h) => expect(h).not.toMatch(/\b5\b/));
  });
});

describe('worked example fades', () => {
  const exactQ = { mode: 'exact', a: 3, b: 2, c: 0, xMin: 0, xMax: 2, answer: 12, band: 'ab', answered: false, attempts: 0, tried: [], id: 'exact-t', traps: [] };
  it('shows a worked start for a beginner and withdraws it after three solved', async () => {
    await mount({ tab: 'challenge', calcChallengeMode: 'exact', calcBand: 'ab', calcQuiz: exactQ });
    await click(btn('Hint 1 of 3'));
    await click(btn('Hint 2 of 3'));
    expect(container.textContent).toContain('Worked start for this one: F(x) = x³ + x²');
    await unmount();
    await mount({ tab: 'challenge', calcChallengeMode: 'exact', calcBand: 'ab', calcQuiz: exactQ, calcSolved: { exact: 3 } });
    await click(btn('Hint 1 of 3'));
    await click(btn('Hint 2 of 3'));
    expect(container.textContent).not.toContain('Worked start');
  });
});

describe('integral tab', () => {
  it('the over/under question hides the exact value and error until it is answered, with a second try', async () => {
    const m = await mount({ tab: 'integral', mode: 'left', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 4 });
    expect(graphLabel()).not.toMatch(/exact integral \d/);
    expect(graphLabel()).toContain('hidden until you answer');
    expect(container.querySelector('[data-signed-area]')).toBeNull();
    await click(btnLabel('OVERestimate'));
    expect(m.latest.overUnderChecked).toBeFalsy();
    expect(container.textContent).toContain('LOWEST height');
    await click(btnLabel('UNDERestimate'));
    expect(m.latest.overUnderChecked).toBe(true);
    expect(graphLabel()).toContain('exact integral 9.0000');
  });

  it('a typed function is graphed, integrated and broken at its asymptote', async () => {
    await mount({ tab: 'integral', fnMode: 'typed', fnText: 'sin(x)', xMin: 0, xMax: 3.14159265, mode: 'simpson', n: 10 });
    // Engagement pass 2026-11-04: on every method the exact value waits for the over/under question.
    expect(graphLabel()).toContain('hidden until you answer');
    await click(btn('Show the exact value without answering'));
    expect(graphLabel()).toMatch(/exact integral 2\.0000/);
    expect(container.textContent).toContain('Read as: f(x) = sin(x)');
    await unmount();
    await mount({ tab: 'integral', fnMode: 'typed', fnText: 'x^2 - 1', xMin: -2, xMax: 2, mode: 'simpson', n: 10 });
    expect(container.querySelector('[data-negative-area]'), 'signed areas wait for the over/under answer').toBeNull();
    await click(btn('Show the exact value without answering'));
    expect(+container.querySelector('[data-negative-area]').dataset.negativeArea).toBeCloseTo(4 / 3, 6);
    expect(+container.querySelector('[data-positive-area]').dataset.positiveArea).toBeCloseTo(8 / 3, 6);
    await unmount();
    await mount({ tab: 'integral', fnMode: 'typed', fnText: '1/(x-1)', xMin: 0, xMax: 2, mode: 'midpoint', n: 9 });
    expect(container.textContent).toContain('the integral is improper');
    expect(container.querySelectorAll('svg[role="img"] polyline').length).toBeGreaterThanOrEqual(2);
    await unmount();
    await mount({ tab: 'integral', fnMode: 'typed', fnText: '(x+1', mode: 'simpson' });
    expect(container.textContent).toContain('A bracket is not closed');
    await unmount();
    await mount({ tab: 'integral', fnMode: 'typed', fnText: 'sin(', mode: 'simpson' });
    expect(container.textContent).toContain('The formula ends too soon');
  });

  it('the antiderivative builder checks typed work by differentiating it', async () => {
    const m = await mount({ tab: 'integral', mode: 'simpson', a: 3, b: 0, c: 0, xMin: 0, xMax: 2 });
    const input = container.querySelector('#calc-anti-input');
    await type(input, '3x^3');
    await click(container.querySelector('[data-calc-antiderivative] button[aria-label="Check"]'));
    expect(container.textContent).toContain('Your F′ is 3 times f');
    await type(input, '6x');
    await click(container.querySelector('[data-calc-antiderivative] button[aria-label="Check"]'));
    expect(container.textContent).toContain('You differentiated instead of integrating');
    await type(input, 'x^3 + 7');
    await click(container.querySelector('[data-calc-antiderivative] button[aria-label="Check"]'));
    expect(container.textContent).toContain('F is an antiderivative');
    expect(container.textContent).toContain('F(2) − F(0) = 8.0000');
    await click(container.querySelector('[data-calc-antiderivative] button[aria-label="Check"]'));
    expect(m.xp.filter((x) => /antiderivative/.test(x[2])).length).toBe(1);
  });
});

describe('derivative tab', () => {
  it('shows one-sided and centred secants with an error table and the Function Grapher link', async () => {
    window.StemLab.isRegistered = (id) => id === 'funcGrapher';
    const opened = [];
    const m = await mount({ tab: 'derivative', fnMode: 'typed', fnText: 'x^3', x0: 1, xMin: -2, xMax: 2 }, { setStemLabTool: (id) => opened.push(id) });
    const table = container.querySelector('[data-calc-secant-table] table');
    expect(table.querySelectorAll('tbody tr').length).toBe(5);
    await click(btn('Centred: x₀ − h'));
    expect(m.latest.secantKind).toBe('centred');
    await click(btn('secant-to-tangent investigation'));
    expect(opened).toEqual(['funcGrapher']);
  });

  it('graph match: commit first, a wrong pick names the misconception, a right one pays once', async () => {
    const C = window.__CalculusCore;
    const seed = 424242;
    const g = C.genMatch(C.seeded(seed), 'ab', 'deriv');
    const wrong = g.opts.find((o) => o.mis);
    const m = await mount({ tab: 'derivative', calcBand: 'ab', matchKind: 'deriv', matchQuiz: { seed, band: 'ab', kind: 'deriv', tried: [], picked: null, answered: false } });
    expect(btn('Commit my choice').disabled).toBe(true);
    await click(btn('Graph ' + wrong.id));
    await click(btn('Commit my choice'));
    expect(m.latest.matchQuiz.answered).toBe(false);
    expect(container.textContent).toContain('One more try');
    await click(btn('Graph ' + g.answer));
    await click(btn('Commit my choice'));
    expect(m.latest.matchQuiz.correct).toBe(true);
    expect(m.xp.length, 'a second-try match earns no XP').toBe(0);
  });
});

describe('limits, bands and teacher tools', () => {
  it('a limit prediction is committed before the graph and tables appear', async () => {
    const m = await mount({ tab: 'limits', limitMode: 'explore', fnMode: 'typed', fnText: '(x^2 - 4)/(x - 2)', limitA: 2 });
    expect(container.querySelector('[data-calc-limits] table')).toBeNull();
    await click(container.querySelector('input[type="radio"][name="calc-lim-pred"]:not([aria-label])') && [...container.querySelectorAll('input[name="calc-lim-pred"]')][3]);
    await click(btn('Commit my prediction'));
    expect(container.textContent).toContain('A hole does not stop a limit');
    expect(container.querySelector('[data-calc-limits] table')).toBeNull();
    await click([...container.querySelectorAll('input[name="calc-lim-pred"]')][0]);
    await type(container.querySelector('input[aria-label="Predicted limit value"]'), '4');
    await click(btn('Commit my prediction'));
    expect(m.latest.limitCommitted).toBe(true);
    expect(container.querySelectorAll('[data-calc-limits] table').length).toBe(2);
    expect(container.textContent).toContain('a removable hole');
  });

  it('bands change the challenge list; a teacher lock fixes the band', async () => {
    const names = () => [...container.querySelectorAll('[aria-label^="Start "][aria-pressed]')].map((b) => b.textContent);
    await mount({ tab: 'challenge', calcBand: 'pre' });
    expect(names().join()).toContain('Average Rate');
    expect(names().join()).not.toContain('Best Method');
    await unmount();
    await mount({ tab: 'challenge', calcBand: 'bc' });
    expect(names().join()).toContain('Taylor Coefficient');
    await unmount();
    await mount({ tab: 'challenge', calcBand: 'bc', teacherBand: 'pre' });
    expect(names().join()).not.toContain('Taylor');
    expect(btn('AP Calculus BC').disabled).toBe(true);
  });

  it('teacher panel: missed-item summary by misconception, and restricted challenge types', async () => {
    const missed = [{ mode: 'deriv', question: 'Q1', chosen: '6', answer: '5', mis: 'height_not_slope', at: 1 }, { mode: 'deriv', question: 'Q2', chosen: '3', answer: '5', mis: 'height_not_slope', at: 2 }];
    const m = await mount({ tab: 'challenge', calcBand: 'ab', calcMissed: missed }, { isTeacherMode: true });
    const panel = container.querySelector('[data-calculus-teacher]');
    expect(panel.textContent).toContain('the height of the curve');
    expect(panel.textContent).toContain('2');
    const box = [...panel.querySelectorAll('label')].find((l) => /Find the Slope/.test(l.textContent)).querySelector('input');
    await click(box);
    expect(m.latest.teacherModes).toEqual(['deriv']);
    await unmount();
    await mount({ tab: 'challenge', calcBand: 'ab', teacherModes: ['deriv'] });
    expect(container.querySelector('[data-calculus-teacher]')).toBeNull();
    expect([...container.querySelectorAll('[aria-label^="Start "][aria-pressed]')].length).toBe(1);
  });
});

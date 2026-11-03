// Inequality Explorer depth review, bugs B1-B10 (2026-11-03). INEQ_FILE points the suite
// at another copy of the tool, so each test can be shown to fail on the code before the fix.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.INEQ_FILE || 'stem_lab/stem_tool_inequality.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'inequality'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { vi.useRealTimers(); if (root) await React.act(() => root.unmount()); root = null; });

const slice = (start, end, name) => {
  const a = src.indexOf(start), b = src.indexOf(end, a);
  expect(a, start).toBeGreaterThan(-1);
  expect(b, end).toBeGreaterThan(a);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(a, b) + '\nreturn ' + name + ';')();
};

async function mount(inequality, overrides) {
  const view = { state: null, toasts: [], prompts: [], announced: [], xp: [] };
  function App() {
    const [state, setState] = React.useState({ inequality });
    view.state = state;
    return window.StemLab._registry.inequality.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      addToast: (m) => view.toasts.push(m), awardXP: (...a) => view.xp.push(a), announceToSR: (m) => view.announced.push(m),
      callGemini: (p) => { view.prompts.push(p); return Promise.resolve('stub reply'); }
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return view;
}
const buttons = () => [...document.querySelectorAll('button')];
const byText = (re) => buttons().find((b) => re.test(b.textContent));
async function click(el) { expect(el).toBeTruthy(); await React.act(() => el.click()); }
const pretty = (s) => s.replace(/>=/g, '≥').replace(/<=/g, '≤');
function quizButton(view, opt) {
  const card = [...document.querySelectorAll('p')].find((p) => p.textContent === view.state.inequality.quiz.q).parentElement;
  return [...card.querySelectorAll('button')].find((b) => b.textContent === pretty(opt));
}

describe('B1: quiz score and streak survive the auto-advance', () => {
  it('keeps score 1 and streak 1 after the 1.5 s timer starts the next question', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const view = await mount({ quizTier: 'easy' });
    await click(byText(/Challenge Mode/));
    const first = view.state.inequality.quiz;
    await click(quizButton(view, first.a));
    expect(view.state.inequality.quiz.score).toBe(1);
    await React.act(async () => { vi.advanceTimersByTime(1600); });
    const next = view.state.inequality.quiz;
    expect(next.answered).toBe(false);
    expect(next.score).toBe(1);
    expect(next.streak).toBe(1);
  });
});

describe('B2: a boundary outside the visible range never draws a misleading graph', () => {
  const geometry = () => {
    const svg = document.querySelector('svg[role="img"]');
    return {
      cx: [...svg.querySelectorAll('circle')].map((c) => +c.getAttribute('cx')),
      rects: [...svg.querySelectorAll('rect')].map((r) => ({ x: +r.getAttribute('x'), w: +r.getAttribute('width') })),
      lines: [...svg.querySelectorAll('line')].map((l) => [+l.getAttribute('x1'), +l.getAttribute('x2')])
    };
  };
  it('x > 25 on [-10, 10]: no dot or shading off the axis, and the text says the boundary is off screen', async () => {
    await mount({ expr: 'x > 25' });
    const g = geometry();
    for (const cx of g.cx) { expect(cx).toBeGreaterThanOrEqual(35); expect(cx).toBeLessThanOrEqual(385); }
    for (const r of g.rects) { expect(r.w).toBeGreaterThanOrEqual(0); expect(r.x).toBeGreaterThanOrEqual(35); expect(r.x + r.w).toBeLessThanOrEqual(385.01); }
    for (const [a, b] of g.lines) { expect(Math.min(a, b)).toBeGreaterThanOrEqual(34.99); expect(Math.max(a, b)).toBeLessThanOrEqual(385.01); }
    expect(document.body.textContent).toMatch(/off screen/i);
  });
  it('a Hard quiz range does not leak into a preset: x > 3 is re-fitted on screen', async () => {
    const view = await mount({ expr: 'x >= 48', range: { min: 40, max: 56 } });
    await click(buttons().find((b) => b.textContent.trim() === 'x > 3'));
    const r = view.state.inequality.range;
    expect(r.min).toBeLessThan(3);
    expect(r.max).toBeGreaterThan(3);
  });
});

describe('B3: the 2D test point is never on the boundary line', () => {
  for (const expr of ['y < x', 'y > x', 'y <= x', 'y >= -2x']) {
    it(expr + ': the marked test point is off the line and the text explains the swap', async () => {
      await mount({ graphMode: '2d', expr });
      const svg = document.querySelector('svg[role="img"]');
      // viewBox 400, plot 40..360 for -10..10: 16 px per unit, origin at (200, 200).
      const atOrigin = [...svg.querySelectorAll('circle')].filter((c) => +c.getAttribute('cx') === 200 && +c.getAttribute('cy') === 200);
      expect(atOrigin.length).toBe(0);
      const text = document.body.textContent;
      expect(text).toMatch(/\(0, 0\) lies on the boundary line/);
      const m = /Test point \((-?\d+), (-?\d+)\)/.exec(text);
      expect(m).toBeTruthy();
      const slope = expr.includes('-2x') ? -2 : 1;
      expect(Math.abs(+m[2] - slope * +m[1])).toBeGreaterThan(0);
    });
  }
});

describe('B4: Explain after a wrong answer tells the tutor what went wrong', () => {
  it('sends the question, the student choice and the correct answer', async () => {
    const view = await mount({ quizTier: 'easy' });
    await click(byText(/Challenge Mode/));
    const q = view.state.inequality.quiz;
    const wrong = q.opts.find((o) => o !== q.a);
    await click(quizButton(view, wrong));
    await click(document.querySelector('button[aria-label="Explain"]'));
    const prompt = view.prompts[view.prompts.length - 1];
    expect(prompt).toContain(q.q);
    expect(prompt).toContain(wrong);
    expect(prompt).toContain(q.a);
  });
});

describe('B5: the quiz start button is named by its visible text', () => {
  it('has no "Iq Start Quiz" label overriding "Challenge Mode"', async () => {
    await mount({});
    const b = byText(/Challenge Mode/);
    expect(b).toBeTruthy();
    const name = b.getAttribute('aria-label') || b.textContent;
    expect(name).toMatch(/Challenge Mode/);
    expect(src).not.toContain("'Iq Start Quiz'),\n              onClick: iqStartQuiz");
  });
});

describe('B6: the solver accepts one-step and right-side forms', () => {
  const solve = slice('var solveInequality = function(raw) {', 'var zoomRange', 'solveInequality');
  const sol = (s) => { const r = solve(s); return r ? r.solution : null; };
  it.each([['-2x > 6', 'x < -3'], ['3x < 12', 'x < 4'], ['-x > 4', 'x < -4'], ['4 - 2x > 10', 'x < -3'], ['5 > 2x + 1', 'x < 2']])('%s -> %s', (input, out) => {
    expect(sol(input)).toBe(out);
  });
});

describe('B7: 2D shading and boundary are clipped to the plot area', () => {
  it('y > 5x stays inside 40..360 in both directions', async () => {
    await mount({ graphMode: '2d', expr: 'y > 5x' });
    const svg = document.querySelector('svg[role="img"]');
    const nums = [];
    for (const p of svg.querySelectorAll('polygon')) for (const pair of p.getAttribute('points').trim().split(/\s+/)) nums.push(...pair.split(',').map(Number));
    expect(nums.length).toBeGreaterThan(0);
    for (const n of nums) { expect(n).toBeGreaterThanOrEqual(39.99); expect(n).toBeLessThanOrEqual(360.01); }
    const boundary = [...svg.querySelectorAll('line')].filter((l) => l.getAttribute('stroke') === '#d946ef');
    expect(boundary.length).toBe(1);
    for (const a of ['x1', 'x2', 'y1', 'y2']) { const v = +boundary[0].getAttribute(a); expect(v).toBeGreaterThanOrEqual(39.99); expect(v).toBeLessThanOrEqual(360.01); }
  });
});

describe('B8: a malformed 2D slope is rejected, not NaN', () => {
  it("parse2D('y > .x') is null", () => {
    const parse2D = slice('var parse2D = function', 'var W2 =', 'parse2D');
    expect(parse2D('y > .x')).toBeNull();
  });
});

describe('B9: an expression badge is awarded once even if the tool renders again before the host stores it', () => {
  it('Abs Value toasts and pays once', async () => {
    // Fake timers hold the deferred write, so the second render surely sees the old state.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const view = { toasts: [], xp: 0, force: null };
    function App() {
      const [state, setState] = React.useState({ inequality: { expr: '|x - 3| < 5' } });
      const [, force] = React.useState(0);
      view.force = force;
      // Like the STEM host: a state write made during render lands on a later tick.
      return window.StemLab._registry.inequality.render(makeCtx({ toolData: state, setToolData: (fn) => setTimeout(() => setState(fn), 0),
        addToast: (m) => view.toasts.push(m), awardXP: () => { view.xp++; } }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    await React.act(() => view.force(1));
    await React.act(async () => { vi.advanceTimersByTime(50); });
    await React.act(() => view.force(2));
    expect(view.toasts.filter((m) => /Abs Value/.test(m)).length).toBe(1);
    expect(view.toasts.filter((m) => /Compound/.test(m)).length).toBe(1);
    expect(view.xp).toBe(2);
  });
});

describe('B10: the AI panel never spins forever', () => {
  const spinner = () => document.querySelector('.animate-spin');
  it('without callGemini it shows a built-in hint instead of a spinner', async () => {
    const view = await mount({ expr: 'x >= 2' }, { callGemini: null });
    await click(buttons().find((b) => /AI$/.test(b.textContent.trim())));
    expect(view.state.inequality.aiLoading).not.toBe(true);
    expect(spinner()).toBeNull();
    expect(view.state.inequality.aiResponse).toBeTruthy();
  });
  it('a callGemini that throws at once does not leave the spinner', async () => {
    const view = await mount({ expr: 'x >= 2' }, { callGemini: () => { throw new Error('no provider'); } });
    await click(buttons().find((b) => /AI$/.test(b.textContent.trim())));
    expect(view.state.inequality.aiLoading).not.toBe(true);
    expect(spinner()).toBeNull();
  });
  it('a persisted aiLoading from a closed session does not spin or block Ask Again', async () => {
    await mount({ showAI: true, aiLoading: true, aiResponse: '' });
    expect(spinner()).toBeNull();
    expect(document.querySelector('button[aria-label="Ask Again"]')).toBeTruthy();
  });
});

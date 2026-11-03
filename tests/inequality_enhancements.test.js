// Inequality Explorer depth review, enhancements 1, 2, 3, 4, 6 and 7 (2026-11-03):
// Flip Lab, the wider interactive solver, build / read a graph, descriptions and
// announcements, parser breadth, and systems with a feasible region.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.INEQ_FILE || 'stem_lab/stem_tool_inequality.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'inequality'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { vi.useRealTimers(); delete window.matchMedia; if (root) await React.act(() => root.unmount()); root = null; });

const slice = (start, end, name) => {
  const a = src.indexOf(start), b = src.indexOf(end, a);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(a, b) + '\nreturn ' + name + ';')();
};
const parseIneq = slice('var parseIneq = function', 'var ineq = parseIneq(d.expr)', 'parseIneq');
const solve = slice('var solveInequality = function(raw) {', 'var zoomRange', 'solveInequality');
const engine = slice('var parse2D = function', 'var W2 =', '{ parse2D, iqCorners, iqLinEval, iqObjective, qText }');

async function mount(inequality, overrides) {
  const view = { state: null, toasts: [], announced: [], xp: [] };
  function App() {
    const [state, setState] = React.useState({ inequality });
    view.state = state;
    return window.StemLab._registry.inequality.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, addToast: (m) => view.toasts.push(m),
      awardXP: (...a) => view.xp.push(a), announceToSR: (m) => view.announced.push(m)
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return view;
}
const buttons = () => [...document.querySelectorAll('button')];
const byText = (re) => buttons().find((b) => re.test(b.textContent.trim()));
async function click(el) { expect(el).toBeTruthy(); await React.act(() => el.click()); }
async function type(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  await React.act(() => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function svgClick(svg, px, py, w, hgt) {
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: hgt, right: w, bottom: hgt });
  await React.act(() => { svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: px, clientY: py })); });
}
const noLeftovers = () => {
  const html = document.getElementById('root').innerHTML;
  expect(html).not.toMatch(/undefined|NaN|\[object Object\]/);
};

describe('parser breadth (enhancement 7)', () => {
  it('reads the forms students type', () => {
    expect(parseIneq('3 < x')).toMatchObject({ compound: false, op: '>', val: 3 });
    expect(parseIneq('-1 >= x')).toMatchObject({ op: '<=', val: -1 });
    expect(parseIneq('|x| < 3')).toMatchObject({ compound: true, lo: -3, hi: 3, op1: '<', op2: '<' });
    expect(parseIneq('|2x - 1| < 5')).toMatchObject({ compound: true, lo: -2, hi: 3 });
    expect(parseIneq('|3x - 1| <= 5')).toMatchObject({ compound: true, loText: '-4/3', hiText: '2' });
    expect(parseIneq('|x| >= 2')).toMatchObject({ op: '<=', val: -2, absRight: { op: '>=', val: 2 } });
    expect(parseIneq('x < -2 or x > 4')).toMatchObject({ op: '<', val: -2, absRight: { op: '>', val: 4 } });
    expect(parseIneq('x > -2 and x <= 4')).toMatchObject({ compound: true, lo: -2, hi: 4, op1: '<', op2: '<=' });
    expect(parseIneq('x ≠ 3')).toMatchObject({ ne: true, op: '<', val: 3, absRight: { op: '>', val: 3 } });
    expect(parseIneq('x != 3')).toMatchObject({ ne: true });
    expect(parseIneq('x >= .5')).toMatchObject({ op: '>=', val: 0.5 });
    expect(parseIneq('X > 3')).toMatchObject({ v: 'x', op: '>', val: 3 });
    expect(parseIneq('x < 5 or x > 2')).toMatchObject({ allReals: true, reason: 'or_all' });
  });

  it('negative absolute-value bounds give the empty set or all reals, with a reason', () => {
    expect(parseIneq('|x - 3| < -1')).toMatchObject({ empty: true, reason: 'abs_negative_less' });
    expect(parseIneq('|x - 3| > -1')).toMatchObject({ allReals: true, reason: 'abs_negative_greater' });
    expect(parseIneq('|x - 3| < 0')).toMatchObject({ empty: true });
    expect(parseIneq('|x - 3| >= 0')).toMatchObject({ allReals: true });
    expect(parseIneq('|x - 3| <= 0')).toMatchObject({ compound: true, lo: 3, hi: 3 });
  });

  it('explains the empty set and all reals on screen', async () => {
    await mount({ expr: '|x - 3| < -1' });
    expect(document.querySelector('[data-inequality-notice]').textContent).toMatch(/never negative.*empty set/);
    expect(document.body.textContent).toContain('∅');
    noLeftovers();
    await React.act(() => root.unmount()); root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ expr: '|x - 3| > -1' });
    expect(document.body.textContent).toMatch(/every real number is a solution/);
    expect(document.body.textContent).toContain('(-∞, ∞)');
    noLeftovers();
  });
});

describe('wider solver (enhancement 2)', () => {
  const sol = (s) => { const r = solve(s); return r ? r.solution : null; };
  it('solves ax op c, c op ax + b, both sides, a(x + b), x/a and chains, keeping fractions exact', () => {
    expect(sol('3x < 12')).toBe('x < 4');
    expect(sol('5 > 2x + 1')).toBe('x < 2');
    expect(sol('2x + 1 < x + 5')).toBe('x < 4');
    expect(sol('x + 1 < 2x + 3')).toBe('x > -2');
    expect(sol('2(x + 3) < 10')).toBe('x < 2');
    expect(sol('x/2 > 3')).toBe('x > 6');
    expect(sol('-x/3 <= 2')).toBe('x >= -6');
    expect(sol('3x - 1 < 0')).toBe('x < 1/3');
    expect(sol('-3 < 2x + 1 <= 7')).toBe('-2 < x <= 3');
    expect(sol('-3 < -2x + 1 <= 7')).toBe('-3 <= x < 2');
    expect(sol('1 < 3x + 2 < 4')).toBe('-1/3 < x < 2/3');
    expect(sol('2x + y < 3')).toBeNull();
  });

  it('shows both sides at each step and flags the flip', () => {
    const steps = solve('4 - 2x > 10');
    expect(steps.find((s) => s.work && s.work.includes('- 4') && s.work.includes('10 - 4'))).toBeTruthy();
    const flip = steps.find((s) => s.warning);
    expect(flip.text).toMatch(/FLIP/);
    expect(flip.move).toMatchObject({ muldiv: true, flip: true, by: '-2' });
    expect(solve('3x < 12').find((s) => s.move && s.move.muldiv).move.flip).toBe(false);
  });

  it('says when the variable cancels', () => {
    expect(solve('x + 1 < x + 3')).toMatchObject({ identity: 'all', solution: null });
    expect(solve('x + 1 > x + 3')).toMatchObject({ identity: 'none', solution: null });
  });

  it('practice mode: the student picks each move and predicts the flip, with feedback', async () => {
    const view = await mount({ solverExpr: '4 - 2x > 10', solverPractice: true });
    await click(document.querySelector('button[aria-label="Solve"]'));
    expect(view.announced[0]).toMatch(/Start: 4 - 2x > 10/);
    expect(document.querySelector('button[aria-label="Reveal next solver step"]')).toBeNull();
    await click(byText(/^Add 4 to both sides$/));
    expect(document.querySelector('[data-inequality-solver-practice]').textContent).toMatch(/Not that one/);
    await click(byText(/^Subtract 4 from both sides$/));
    expect(document.querySelector('[data-inequality-solver]').textContent).toContain('-2x > 6');
    await click(byText(/^Divide both sides by -2$/));
    expect(document.body.textContent).toMatch(/will the inequality sign flip\?/);
    await click(byText(/^No, it stays$/));
    expect(view.announced.some((m) => /Not quite\. -2 is negative/.test(m))).toBe(true);
    await click(byText(/Show the step/));
    expect(document.querySelector('[data-inequality-solver]').textContent).toContain('x < -3');
    expect(view.announced.some((m) => /x < -3/.test(m))).toBe(true);
    noLeftovers();
  });
});

describe('describe and announce (enhancement 4)', () => {
  it('the number line label and the read sentence describe the actual set', async () => {
    await mount({ expr: 'x >= 2' });
    const svg = document.querySelector('svg[data-inequality-graph="main"]');
    expect(svg.getAttribute('aria-label')).toBe('Number line graph of x >= 2. Closed circle at 2, shaded to the right: 2 and every number greater than 2.');
    expect(document.querySelector('[data-inequality-read="main"]').textContent).toContain('Read the graph:');
  });

  it('the coordinate-plane label describes the line, the side and the test point', async () => {
    await mount({ graphMode: '2d', expr: 'y > 2x + 1' });
    const label = document.querySelector('svg[data-inequality-plane]').getAttribute('aria-label');
    expect(label).toContain('Dashed boundary line y = 2x + 1');
    expect(label).toContain('shaded above the line');
    expect(label).toContain('Test point (0, 0): 0 > 1 is false');
  });

  it('Test a Value announces its result on Enter', async () => {
    const view = await mount({ expr: 'x < 4' });
    const box = document.querySelector('input[aria-label="Test a value against the inequality"]');
    await type(box, '7');
    await React.act(() => box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(view.announced).toContain('7 is NOT in the solution set');
  });

  it('offers read-aloud when the browser can speak', async () => {
    const spoken = [];
    window.speechSynthesis = { cancel: () => {}, speak: (u) => spoken.push(u.text) };
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    try {
      await mount({ expr: 'x < -1' });
      await click(document.querySelector('button[aria-label="Read the graph description aloud"]'));
      expect(spoken[0]).toMatch(/Open circle at -1, shaded to the left/);
    } finally { delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; }
  });
});

describe('Flip Lab (enhancement 1)', () => {
  it('keeps the _ineqHunt key and the hypothesis notebook the smoke harness looks for', () => {
    expect(src).toContain('_ineqHunt');
    const html = renderTool('inequality', { inequality: {} });
    expect(html).toContain('hypothesis');
    expect(html).toContain('data-inequality-fliplab');
  });

  it('predict, then check: 2 < 5 times -2 flips, and the line mirrors through 0', async () => {
    const view = await mount({});
    const lab = () => document.querySelector('[data-inequality-fliplab]');
    expect(lab().querySelector('svg').getAttribute('aria-label')).toContain('hidden until you check');
    await click(byText(/^flip$/));
    await click(byText(/^✔ Check$/));
    expect(lab().textContent).toContain('2 < 5 became -4 > -10: the sign flipped.');
    expect(lab().textContent).toContain('Your prediction matched.');
    expect(lab().textContent).toContain('mirror at 0');
    expect(view.state.inequality._ineqHunt.log).toEqual([{ mode: 'numbers', op: 'mul', k: -2, pred: 'flips', actual: 'flips' }]);
    noLeftovers();
  });

  it('adding a negative number does not flip', async () => {
    await mount({ _ineqHunt: { op: 'add', k: -3 } });
    await click(byText(/^flip$/));
    await click(byText(/^✔ Check$/));
    expect(document.querySelector('[data-inequality-fliplab]').textContent).toContain('2 < 5 became -1 < 2: the sign stayed the same.');
    expect(document.querySelector('[data-inequality-fliplab]').textContent).toContain('did not match');
  });

  it('works on a solution set: x >= 1 divided by -2', async () => {
    await mount({ _ineqHunt: { mode: 'set', setOp: '>=', setV: 1, op: 'div', k: -2 } });
    await click(byText(/^flip$/));
    await click(byText(/^✔ Check$/));
    expect(document.querySelector('[data-inequality-fliplab]').textContent).toContain('x ≥ 1 became x ÷ (-2) ≤ -0.5');
  });

  it('k = 0 becomes a discussion prompt, not a prediction', async () => {
    await mount({ _ineqHunt: { op: 'mul', k: 0 } });
    expect(document.querySelector('[data-inequality-flip-zero]').textContent).toMatch(/Multiplying by 0 turns both sides into 0/);
    expect(byText(/^✔ Check$/)).toBeUndefined();
  });

  it('respects reduced motion each render', async () => {
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
    await mount({});
    const g = document.querySelector('[data-inequality-flip-line] g');
    expect(g.style.transition).toBe('none');
  });
});

describe('build the graph, and read graphs (enhancement 3)', () => {
  it('builds x <= -2 by keyboard controls, with feedback on each part, and credits the quest', async () => {
    const view = await mount({ oneDMode: 'build', build: { target: 'x <= -2' } });
    const hook = window.StemLab._registry.inequality.questHooks.find((q) => q.id === 'graph_first');
    expect(hook.check(view.state.inequality)).toBe(false);
    await type(document.getElementById('iq-build-pt'), '1');
    await click(byText(/Open$/));
    await click(byText(/Right/));
    await click(byText(/Check my graph/));
    const fb = () => document.querySelector('[data-inequality-build-feedback]').textContent;
    expect(fb()).toContain('You placed the point at 1');
    expect(fb()).toContain('use a closed circle');
    expect(fb()).toContain('smaller numbers lie to the left');
    await click(document.querySelector('button[aria-label="Move the point 1 to the left"]'));
    await click(document.querySelector('button[aria-label="Move the point 1 to the left"]'));
    await click(document.querySelector('button[aria-label="Move the point 1 to the left"]'));
    await click(byText(/Closed$/));
    await click(byText(/Left$/));
    await click(byText(/Check my graph/));
    expect(fb()).toContain('You built the graph of x ≤ -2');
    expect(view.state.inequality.expr).toBe('x <= -2');
    expect(hook.check(view.state.inequality)).toBe(true);
    expect(view.xp).toContainEqual(['inequality', 5, 'Built an inequality graph']);
    noLeftovers();
  });

  it('a click on the number line places the point', async () => {
    const view = await mount({ oneDMode: 'build', build: { target: 'x > 4' } });
    // viewBox 420 wide, axis 35..385 for -10..10: x = 4 sits at 35 + 14 * 17.5 = 280.
    await svgClick(document.querySelector('svg[data-inequality-graph="build"]'), 280, 50, 420, 140);
    expect(view.state.inequality.build.pt).toBe('4');
  });

  it('graph to symbols: a typed equivalent form counts', async () => {
    const view = await mount({ oneDMode: 'read', readG: { target: 'x > 3', opts: ['x > 3', 'x >= 3', 'x < 3', 'x <= 3'], answered: false, typed: '' } });
    expect(document.querySelector('svg[data-inequality-graph="read"]').getAttribute('aria-label')).toContain('Open circle at 3, shaded to the right');
    await click(byText(/^x ≥ 3$/));
    expect(view.state.inequality.readG.correct).toBe(false);
    expect(view.announced.some((m) => /Boundary mix-up/.test(m))).toBe(true);
    await type(document.getElementById('iq-read-typed'), '3 < x');
    await click(byText(/^Check$/));
    expect(view.state.inequality.readG.correct).toBe(true);
    noLeftovers();
  });
});

describe('systems and the feasible region (enhancement 6)', () => {
  it('lists exact corners and objective values, verified by computing them', async () => {
    await mount({ graphMode: '2d', twoDMode: 'system' });
    const text = document.querySelector('[data-inequality-system-text]').textContent;
    // 2x + y <= 8, x >= 0, y >= 1: corners (0, 1), (0, 8), (3.5, 1); P = 3x + 2y gives 2, 16, 12.5.
    const cons = ['2x + y <= 8', 'x >= 0', 'y >= 1'].map(engine.parse2D);
    const corners = engine.iqCorners(cons);
    expect(corners.map((c) => [c.x, c.y])).toEqual([[0, 1], [0, 8], [3.5, 1]]);
    const obj = engine.iqObjective('P = 3x + 2y');
    expect(corners.map((c) => engine.qText(engine.iqLinEval(obj.form, { x: c.qx, y: c.qy })))).toEqual(['2', '16', '12.5']);
    expect(text).toContain('A (0, 1)');
    expect(text).toContain('B (0, 8)');
    expect(text).toContain('C (3.5, 1)');
    expect(text).toContain('Largest: P = 16 at B (0, 8).');
    expect(text).toContain('Smallest: P = 2 at A (0, 1).');
    expect(text).toContain('It is bounded');
    noLeftovers();
  });

  it('keeps a non-terminating corner as a fraction', async () => {
    await mount({ graphMode: '2d', twoDMode: 'system', sys: { cons: ['y >= 2x + 1', 'y <= -x/3 + 4', 'x >= 0'], obj: '' } });
    // 2x + 1 = -x/3 + 4  ->  7x/3 = 3  ->  x = 9/7, y = 25/7.
    expect(9 / 7 * 2 + 1).toBeCloseTo(-(9 / 7) / 3 + 4, 12);
    expect(document.querySelector('[data-inequality-system-text]').textContent).toContain('(9/7, 25/7)');
  });

  it('tests a typed point and a clicked point against every constraint', async () => {
    const view = await mount({ graphMode: '2d', twoDMode: 'system' });
    await type(document.getElementById('iq-sys-px'), '4');
    await type(document.getElementById('iq-sys-py'), '1');
    await click(byText(/^Test this point$/));
    expect(view.announced).toContain('(4, 1): ① 9 ≤ 8 ✗, ② 4 ≥ 0 ✓, ③ 1 ≥ 1 ✓ → outside: it breaks ①');
    // (1, 2) sits at pixel (40 + 11 * 16, 40 + 8 * 16) = (216, 168).
    await svgClick(document.querySelector('svg[data-inequality-plane="system"]'), 216, 168, 400, 400);
    expect(view.state.inequality.sys.pts[0]).toEqual({ x: '1', y: '2' });
    expect(document.querySelector('[data-inequality-tested]').textContent).toContain('(1, 2): ① 4 ≤ 8 ✓, ② 1 ≥ 0 ✓, ③ 2 ≥ 1 ✓ → inside the feasible region');
  });

  it('marks corners on dashed boundaries, flags unbounded regions, and rejects non-linear input', async () => {
    await mount({ graphMode: '2d', twoDMode: 'system', sys: { cons: ['y > x', 'x + y >= 4', 'y > x^2'], obj: 'C = x + y' } });
    const text = document.querySelector('[data-inequality-system-text]').textContent;
    expect(text).toContain('(2, 2) — on a dashed boundary');
    expect(text).toContain('unbounded');
    expect(document.getElementById('iq-sys-err-2').textContent).toMatch(/Not a linear inequality/);
  });

  it('shading stays inside the plot and the label carries the text equivalent', async () => {
    await mount({ graphMode: '2d', twoDMode: 'system', sys: { cons: ['y >= 5x', 'y <= 9', 'x >= -3'] } });
    const svg = document.querySelector('svg[data-inequality-plane="system"]');
    for (const pair of svg.querySelector('[data-inequality-region]').getAttribute('points').split(' ')) {
      for (const n of pair.split(',').map(Number)) { expect(n).toBeGreaterThanOrEqual(39.99); expect(n).toBeLessThanOrEqual(360.01); }
    }
    expect(svg.getAttribute('aria-label')).toMatch(/Coordinate plane with 3 constraints\..*Corner points: A \(-3, -15\).*\(1\.8, 9\)/);
  });
});

// Function Grapher stage A (2026-11-03): Describe and Hear through the shared
// _graphAccess core, the Transformation Lab (its own tf key), four-way matching,
// answer leaks closed while a question is open, the low-vision SVG, table
// differences and the Graphing Calculator link. Real React 18 in jsdom.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.FUNCGRAPHER_STAGE_A_FILE || 'stem_lab/stem_tool_funcgrapher.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
const BASE = { type: 'linear', a: 1, b: 0, c: 0, showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false, compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0, aiExplain: '', aiExplainLoading: false };
function param() { return { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }; }
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.oscillators = []; FakeAudioContext.last = this; }
  createOscillator() { const o = { frequency: param(), connect() {}, disconnect() {}, start: vi.fn(), stop: vi.fn() }; this.oscillators.push(o); return o; }
  createGain() { return { gain: param(), connect() {} }; }
  createStereoPanner() { return { pan: param(), connect() {} }; }
}

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: () => ({ width: 20 }) }, { get: (tt, key) => (key === 'then' ? undefined : tt[key] || (() => {})) }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.AudioContext = FakeAudioContext;
  FakeAudioContext.last = null;
  loadTool(FILE, 'funcGrapher');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  try { window.StemLab._graphAccess.stop(); } catch (e) { /* not installed */ }
  if (root) await React.act(() => root.unmount());
  root = null;
  delete window.AudioContext;
  delete window.__alloEnsureStemPluginLoaded;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(patch, overrides) {
  const out = { latest: null, state: null, announced: [], awards: [], toasts: [] };
  function App() {
    const [state, setState] = React.useState({ funcGrapher: Object.assign({}, BASE, patch) });
    out.latest = state.funcGrapher;
    out.state = state;
    return window.StemLab._registry.funcGrapher.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, announceToSR: (m) => out.announced.push(m), awardXP: (...a) => out.awards.push(a), addToast: (m) => out.toasts.push(m) }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
const graphLabel = () => q('svg[role="img"]').getAttribute('aria-label');
async function click(el) { await React.act(() => el.click()); }
async function key(el, k) { await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
async function slide(el, value) {
  await React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function functionsOrAudio(value, path, seen) {
  seen = seen || new Set();
  if (typeof value === 'function') return [path];
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  if (value instanceof FakeAudioContext) return [path];
  return Object.keys(value).flatMap((k) => functionsOrAudio(value[k], path + '.' + k, seen));
}

describe('Describe and Hear', () => {
  it('names the graph from its key features: x^2 - 4', async () => {
    await mount({ type: 'quadratic', a: 1, b: 0, c: -4 });
    const label = graphLabel();
    expect(label.startsWith('Function graph showing the configured curve. Graph of f(x) = x² - 4.')).toBe(true);
    expect(label).toContain('x = −2 and x = 2');
    expect(label).toContain('a local minimum at (0, −4)');
  });

  it('describes sin x on [-2π, 2π] in full, with read-aloud', async () => {
    const callTTS = vi.fn(() => Promise.resolve(null));
    await mount({ type: 'trig', a: 1, b: 1, c: 0, range: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -2, yMax: 2 } }, { callTTS });
    await click(q('[data-graph-access-describe]'));
    const text = q('[data-graph-access-text]').textContent;
    expect(text).toContain('x = −6.28, x = −3.14, x = 0, x = 3.14 and x = 6.28');
    expect(text).toMatch(/rises and falls repeatedly, with 4 turning points/);
    await click(q('[data-graph-access-read]'));
    expect(callTTS).toHaveBeenCalledWith(text, undefined, undefined, { force: true });
  });

  it('plays and stops the sound, and keeps functions and audio out of toolData', async () => {
    const m = await mount({ type: 'quadratic', a: 1, b: 0, c: -4 });
    await click(q('[data-graph-access-hear]'));
    expect(FakeAudioContext.last.oscillators.length).toBe(3);
    expect(q('[data-graph-access-hear]').textContent).toBe('Stop');
    await click(q('[data-graph-access-hear]'));
    expect(q('[data-graph-access-hear]').textContent).toBe('Hear this graph');
    const region = q('[data-graph-access-explore]');
    await key(region, 'PageDown');
    expect(q('[data-graph-access-point]').textContent).toBe('x = −2, y = 0: meets the x-axis');
    expect(q('[data-function-explore-marker]')).toBeTruthy();
    expect(functionsOrAudio(m.state, 'toolData')).toEqual([]);
  });
});

describe('an open question shows nothing that answers it', () => {
  let seq; let k;
  beforeEach(() => { seq = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]; k = 0; });
  async function start(mode, extra) {
    const m = await mount(Object.assign({ type: 'quadratic', a: 1, b: 0, c: 0, fgChallengeMode: mode, fgGradeOverride: '9-12' }, extra || {}), { callGemini: vi.fn(() => Promise.resolve('x')) });
    vi.spyOn(Math, 'random').mockImplementation(() => seq[k++ % seq.length]);
    await click(q('button[aria-label="Start Challenge"]'));
    return m;
  }

  it('Y-Intercept: sliders, trace readout, chips, description and AI help wait for the answer', async () => {
    const m = await start('yint');
    const quiz = m.latest.fgQuiz;
    expect(quiz.mode).toBe('yint');
    expect(qa('input[aria-label^="Parameter "]')).toEqual([]);
    expect(q('[data-funcgrapher-sliders-hidden]')).toBeTruthy();
    expect(q('[data-function-trace]').textContent).toMatch(/Move the trace slider/);
    expect(graphLabel()).not.toMatch(/crosses the y-axis/);
    expect(document.body.textContent).not.toMatch(/Explain This Graph|Explain at my level/);
    expect(q('[data-funcgrapher-open-calc]')).toBeNull();
    // moving the trace is reading the graph: the readout comes back
    await slide(q('input[aria-label="Trace x position"]'), 1);
    expect(m.latest.fgQuiz.traceMoved).toBe(true);
    expect(q('[data-function-trace]').textContent).toMatch(/^f\(1\.0\) = /);
    const wrong = quiz.opts.find((o) => o !== quiz.answer);
    await click(qa('button').find((b) => b.getAttribute('aria-label') === 'Select answer: ' + wrong));
    expect(qa('input[aria-label^="Parameter "]').length).toBe(3);
    expect(graphLabel()).toMatch(/crosses the y-axis/);
  });

  it('Find the Root: chips and zeros in the description are hidden too', async () => {
    const m = await start('root');
    expect(m.latest.fgQuiz.mode).toBe('root');
    expect(qa('span.rounded-full').map((s) => s.textContent).join('|')).not.toMatch(/Slope|y-intercept|Vertex/);
    expect(graphLabel()).toContain('Explore with keys to find where it meets the x-axis.');
    expect(graphLabel()).not.toMatch(/meets the x-axis at/);
  });
});

describe('Transformation Lab', () => {
  const lab = () => q('[data-transform-lab]');
  const slider = (key) => q('#fg-tf-' + key);

  it('predict, then apply: h = 2 moves y = x^2 right, checked against the result', async () => {
    const m = await mount({ type: 'linear', a: 2, b: 3, c: 1 });
    expect(q('[data-tf-equation]').textContent).toBe('y = x²');
    expect(q('[data-tf-parent]').getAttribute('d')).toMatch(/^M/);
    expect(q('[data-tf-parent]').getAttribute('stroke-dasharray')).toBe('7 5');
    await slide(slider('h'), 2);
    expect(m.latest.tf.pending).toEqual({ key: 'h', to: 2 });
    expect(m.latest.tf.h).toBe(0);
    expect(q('[data-tf-equation]').textContent).toBe('y = x²');
    expect([...q('[data-tf-predict]').querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Moves right', 'Moves left', 'Apply without predicting', 'Cancel this change']);
    await click(q('[data-tf-choice="right"]'));
    expect(m.latest.tf.h).toBe(2);
    expect(m.latest.tf.pending).toBeNull();
    expect(q('[data-tf-equation]').textContent).toBe('y = (x − 2)²');
    expect(q('[data-tf-result]').textContent).toBe('Your prediction matched: Moves right. Result: the graph moved right 2 units.');
    const cells = [...q('[data-tf-table] tbody').querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => td.textContent));
    expect(cells[0]).toEqual(['(−2, 4)', '(0, 4)']);
    expect(cells[2]).toEqual(['(0, 0)', '(2, 0)']);
    // the graded keys are untouched
    expect(m.latest).toMatchObject({ type: 'linear', a: 2, b: 3, c: 1 });
  });

  it('a wrong prediction is named, with the actual effect (flip + stretch)', async () => {
    const m = await mount({ tf: { parent: 'abs', a: 1, b: 1, h: 0, k: 0 } });
    await slide(slider('a'), -2);
    await click(q('[data-tf-choice="compress_v"]'));
    expect(m.latest.tf.a).toBe(-2);
    expect(q('[data-tf-result]').textContent).toBe('You predicted: Gets flatter (vertical compression). Look again. Result: the graph flipped over the x-axis and stretched vertically (taller).');
    expect(m.announced[m.announced.length - 1]).toBe(q('[data-tf-result]').textContent);
    expect(q('[data-tf-equation]').textContent).toBe('y = −2·|x|');
  });

  it('with predictions off, a slider applies at once; cancel and reset work', async () => {
    const m = await mount({ tf: { parent: 'sqrt', predictOn: false } });
    await slide(slider('k'), -3);
    expect(m.latest.tf.k).toBe(-3);
    expect(q('[data-tf-result]').textContent).toBe('Result: the graph moved down 3 units.');
    await click([...lab().querySelectorAll('input[type="checkbox"]')][0]);
    expect(m.latest.tf.predictOn).toBe(true);
    await slide(slider('b'), 2);
    await click(q('[data-tf-choice="cancel"]'));
    expect(m.latest.tf.b).toBe(1);
    expect(m.latest.tf.pending).toBeNull();
    await click([...lab().querySelectorAll('button')].find((b) => /Reset a, b, h and k/.test(b.textContent)));
    expect(m.latest.tf).toMatchObject({ a: 1, b: 1, h: 0, k: 0 });
  });

  it('switching parents, b = 0 on 1/x, and hostile saved values', async () => {
    const m = await mount({ tf: { parent: 'evil', a: 'x', b: Infinity, h: 99, k: null, pending: { key: 'zz', to: 1 } } });
    expect(m.latest.tf.parent).toBe('evil');
    expect(q('[data-tf-equation]').textContent).toBe('y = (x − 6)²'); // h = 99 is clamped to the slider's 6
    expect(slider('h').value).toBe('6');
    expect(q('[data-tf-predict]')).toBeNull();
    await click(q('[data-tf-parent-choice="recip"]'));
    expect(m.latest.tf.parent).toBe('recip');
    expect(q('[data-tf-equation]').textContent).toBe('y = 1/(x − 6)');
    expect(q('[data-tf-parent]').getAttribute('d').match(/M/g).length).toBe(2); // two branches
    await click([...lab().querySelectorAll('input[type="checkbox"]')][0]);
    await slide(slider('b'), 0);
    expect(m.latest.tf.b).toBe(0);
    expect(q('[data-tf-image]').getAttribute('d')).toBe('');
    expect(lab().textContent).toMatch(/With b = 0 every input becomes 0/);
  });

  it('pure model: effects and equations', () => {
    const L = window.__alloTransformLab;
    expect(L.effects('h', 0, -3)).toEqual(['left']);
    expect(L.effects('b', 1, 3)).toEqual(['compress_h']);
    expect(L.effects('b', 2, -1)).toEqual(['flip_y', 'stretch_h']);
    expect(L.effects('a', 2, 0)).toEqual(['flatten']);
    expect(L.effects('k', 1, 1)).toEqual(['none']);
    expect(L.equation({ parent: 'sin', a: 3, b: 2, h: -1, k: 0.5 })).toBe('y = 3·sin(2(x + 1)) + 0.5');
    expect(L.equation({ parent: 'exp2', a: 1, b: -1, h: 0, k: 0 })).toBe('y = 2^(−x)');
    expect(L.normalize('junk')).toMatchObject({ parent: 'x2', a: 1, b: 1, h: 0, k: 0, predictOn: true, pending: null, last: null });
  });
});

describe('four-way matching', () => {
  async function startMatch(seq, band) {
    let k = 0;
    const m = await mount({ type: 'quadratic', a: 1, b: 2, c: -3, fgChallengeMode: 'match', fgGradeOverride: band || '3-5' });
    vi.spyOn(Math, 'random').mockImplementation(() => seq[k++ % seq.length]);
    await click(q('button[aria-label="Start Challenge"]'));
    return m;
  }

  it('asks across representations, keeps the student graph and graded keys untouched, and rotates the pair', async () => {
    const m = await startMatch([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
    const quiz = m.latest.fgQuiz;
    expect(quiz).toMatchObject({ mode: 'match', from: 'graph', to: 'equation', answered: false });
    expect(quiz.opts.length).toBe(3);
    expect(quiz.opts).toContain(quiz.answer);
    expect(m.latest).toMatchObject({ type: 'quadratic', a: 1, b: 2, c: -3, fgMatchTurn: 1 });
    expect(q('[data-funcgrapher-match]').textContent).toContain('Which equation matches this graph?');
    // the given graph is described, never labelled with its equation
    const given = q('#fg-match-given');
    expect(given.getAttribute('role')).toBe('img');
    expect(given.getAttribute('aria-label')).toContain('It crosses the y-axis at y = 2.');
    expect(q('[data-match-given]').textContent).not.toMatch(/y = \d/);
    expect(qa('[data-match-option]').length).toBe(3);
    const choose = qa('[data-funcgrapher-match] button');
    expect(choose.map((b) => b.textContent)).toEqual(['Choose option A', 'Choose option B', 'Choose option C']);
    expect(choose[0].getAttribute('aria-describedby')).toBe('fg-match-opt-0');
    await click(q('button[aria-label="Start Challenge"]'));
    expect(m.latest.fgQuiz).toMatchObject({ from: 'equation', to: 'table' });
  });

  it('a correct match pays XP once and explains the signature with differences', async () => {
    const m = await startMatch([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
    const quiz = m.latest.fgQuiz;
    const idx = quiz.opts.indexOf(quiz.answer);
    await click(qa('[data-funcgrapher-match] button')[idx]);
    expect(m.latest.fgQuiz.correct).toBe(true);
    expect(m.latest.fgScore).toBe(1);
    expect(m.awards).toEqual([['funcGrapher', 5, 'Function Grapher challenge']]);
    expect(m.latest.fgQuiz.fb).toContain('Signature spotted: a perfectly straight line');
    expect(m.latest.fgQuiz.fb).toContain('adds the same amount (3) to y');
    expect(m.latest.fgQuiz.fb).toContain('The match: y = 3x + 2 goes with "A plant is 2 cm tall and grows 3 cm every week."');
  });

  it('a wrong match explains the difference, and cross-family misses add a myth check', async () => {
    const m = await startMatch([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
    const quiz = m.latest.fgQuiz;
    const wrong = quiz.opts.find((o) => o !== quiz.answer);
    await click(qa('[data-funcgrapher-match] button')[quiz.opts.indexOf(wrong)]);
    expect(m.latest.fgQuiz.correct).toBe(false);
    expect(m.awards).toEqual([]);
    expect(m.latest.fgQuiz.fb).toMatch(/Both are .*compare the details: at x = 0 this one is 2/);
    expect(m.latest.fgQuiz.fb).toContain('Myth check:');
    // a cross-family question at the 6-8 band: exponential doubling vs linear
    await React.act(() => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';
    const m2 = await startMatch([0.55, 0, 0.1, 0.2, 0.3, 0.4], '6-8');
    const q2 = m2.latest.fgQuiz;
    expect(q2.answer).toBe('exp_double');
    const lin = q2.opts.find((o) => o !== q2.answer && /^lin/.test(o));
    await click(qa('[data-funcgrapher-match] button')[q2.opts.indexOf(lin)]);
    expect(m2.latest.fgQuiz.fb).toContain('nearly flat on one side, then exploding upward');
    expect(m2.latest.fgQuiz.fb).toContain('Exponential growth eventually beats ANY polynomial.');
  });
});

describe('low-vision SVG and table differences', () => {
  it('12 px labels, a 1 px grid, 3 px main curve, and dashed derivative and comparison curves', async () => {
    await mount({ type: 'quadratic', a: 1, b: 0, c: -4, showDeriv: true, compare: true, compareType: 'linear' });
    const svg = q('svg[role="img"]');
    const sizes = [...svg.querySelectorAll('text')].map((tx) => parseFloat(tx.style.fontSize));
    expect(sizes.length).toBeGreaterThan(10);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(12);
    expect(svg.querySelector('[data-function-curve="main"]').getAttribute('stroke-width')).toBe('3');
    const deriv = svg.querySelector('[data-function-curve="derivative"]');
    const cmp = svg.querySelector('[data-function-curve="compare"]');
    expect(Number(deriv.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(2.5);
    expect(Number(cmp.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(2.5);
    expect(deriv.getAttribute('stroke-dasharray')).not.toBe(cmp.getAttribute('stroke-dasharray'));
    expect(deriv.getAttribute('stroke')).not.toBe(cmp.getAttribute('stroke'));
    const gridLine = [...svg.querySelectorAll('line')].find((l) => l.getAttribute('stroke') === '#c3cedb');
    expect(gridLine.getAttribute('stroke-width')).toBe('1');
  });

  it('Δy and ratio columns with a pattern summary', async () => {
    const m = await mount({ type: 'exponential', a: 1, b: 1, c: 0, showTable: true, range: { xMin: 0, xMax: 4, yMin: -10, yMax: 60 } });
    await click(q('[data-funcgrapher-diffs]'));
    expect(m.latest.showDiffs).toBe(true);
    const table = q('[data-funcgrapher-diffs]').parentElement.parentElement.querySelector('table');
    const ratios = [...table.querySelectorAll('tbody tr')].map((tr) => tr.children[3].textContent);
    expect(ratios).toEqual(['—', '2.71828', '2.71828', '2.71828', '2.71828']);
    expect(q('[data-funcgrapher-diff-summary]').textContent).toBe('Each equal step in x multiplies y by the same factor (2.72): an exponential pattern.');
  });
});

describe('cross-link to Graphing Calculator', () => {
  const GA = () => window.StemLab._graphAccess;
  function toJs(expr) {
    return new Function('x', 'return (' + expr.replace(/\be\^\(/g, 'Math.exp(').replace(/x\^(\d)/g, 'Math.pow(x, $1)').replace(/\bln\(/g, 'Math.log(').replace(/\b(sin|sqrt|abs)\(/g, 'Math.$1(') + ');'); // eslint-disable-line no-new-func
  }
  const cases = [
    [{ type: 'quadratic', a: 1, b: 0, c: -4 }, 'x^2 - 4'],
    [{ type: 'linear', a: 0, b: 3, c: 0 }, '3'],
    [{ type: 'trig', a: 2, b: 3, c: 1 }, '2*sin(3*x + 1)'],
    [{ type: 'exponential', a: -1, b: 0.5, c: 2 }, '-e^(0.5*x) + 2'],
    [{ type: 'absolute', a: 1, b: -2, c: 0 }, 'abs(x - 2)'],
    [{ type: 'sqrt', a: 0.5, b: 1, c: -1 }, '0.5*sqrt(x + 1) - 1'],
    [{ type: 'log', a: 1, b: 0, c: 0 }, 'ln(x)'],
    [{ type: 'rational', a: 2, b: 1, c: -3 }, '2/(x + 1) - 3'],
    [{ type: 'cubic', a: -1, b: 1, c: 0 }, '-x^3 + x']
  ];
  for (const [fam, expr] of cases) {
    it('hands ' + fam.type + ' over as ' + expr + ', loading the plugin before switching', async () => {
      const calls = [];
      window.__alloEnsureStemPluginLoaded = (id) => { calls.push('ensure:' + id); return true; };
      const m = await mount(fam, { setStemLabTool: (id) => calls.push('switch:' + id) });
      await click(q('[data-funcgrapher-open-calc]'));
      expect(calls).toEqual(['ensure:graphCalc', 'switch:graphCalc']);
      const gc = m.state.graphCalc;
      expect(gc.funcs[0].expr).toBe(expr);
      expect(gc._gaFn).toBe(0);
      expect(gc.window).toEqual({ xmin: -10, xmax: 10, ymin: -10, ymax: 10 });
      // and the calculator's family matcher brings it straight back
      expect(GA().matchFamily(toJs(expr))).toEqual(fam);
    });
  }

  it('reuses an empty row and keeps the student\'s other rows', async () => {
    const before = { graphCalc: { funcs: [{ expr: 'x', color: '#38bdf8' }, { expr: '', color: '#f472b6' }] } };
    let latest;
    function App() {
      const [state, setState] = React.useState(Object.assign({ funcGrapher: Object.assign({}, BASE, { a: 2, b: 1 }) }, before));
      latest = state;
      return window.StemLab._registry.funcGrapher.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    await click(q('[data-funcgrapher-open-calc]'));
    expect(latest.graphCalc.funcs.map((f) => f.expr)).toEqual(['x', '2*x + 1']);
    expect(latest.graphCalc._gaFn).toBe(1);
  });
});

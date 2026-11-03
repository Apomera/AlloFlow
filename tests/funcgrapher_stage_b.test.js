// Function Grapher stage B (2026-11-03): one root engine for chips, description and sound;
// the Explore / Practice / Investigate mode bar; rate of change; exact domain, range and key
// features; transformation targets and challenge hint ladders (no XP once the answer shows);
// worked examples; teacher tools; translated banks; Zoo palettes; phone-size SVG text.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_funcgrapher.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
const BASE = { type: 'linear', a: 1, b: 0, c: 0, showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false, compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0, aiExplain: '', aiExplainLoading: false };
function param() { return { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }; }
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.oscillators = []; FakeAudioContext.last = this; }
  createOscillator() { const o = { type: '', frequency: param(), connect() {}, disconnect() {}, start: vi.fn(), stop: vi.fn() }; this.oscillators.push(o); return o; }
  createGain() { return { gain: param(), connect() {} }; }
  createStereoPanner() { return { pan: param(), connect() {} }; }
}
let canvasCalls = [];
beforeEach(() => {
  resetStemLab();
  canvasCalls = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }) }, {
    get: (tt, key) => (key === 'then' ? undefined : key in tt ? tt[key] : (...args) => canvasCalls.push({ call: key, args, fillStyle: tt.fillStyle, strokeStyle: tt.strokeStyle })),
    set: (tt, key, v) => { tt[key] = v; return true; }
  }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.AudioContext = FakeAudioContext;
  loadTool(FILE, 'funcGrapher');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  try { window.StemLab._graphAccess.stop(); } catch (e) { /* not installed */ }
  if (root) await React.act(() => root.unmount());
  root = null;
  delete window.AudioContext;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(patch, overrides) {
  const out = { latest: null, state: null, announced: [], awards: [], toasts: [], keys: new Set() };
  function App() {
    const [state, setState] = React.useState({ funcGrapher: Object.assign({}, BASE, patch) });
    out.latest = state.funcGrapher;
    out.state = state;
    return window.StemLab._registry.funcGrapher.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, t: (k, fb) => { out.keys.add(k); return fb || k; }, announceToSR: (m) => out.announced.push(m), awardXP: (...a) => out.awards.push(a), addToast: (m) => out.toasts.push(m) }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
async function click(el) { await React.act(() => el.click()); }
async function key(el, k) { await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
async function type(el, value) {
  await React.act(() => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
// Math.random in a cycle: the question generators loop until they have four different options.
function randomSeq(seq) { let k = 0; return vi.spyOn(Math, 'random').mockImplementation(() => seq[k++ % seq.length]); }
const chipText = () => qa('span').map((s) => s.textContent).find((s) => /root/.test(s) && /x =/.test(s)) || '';

describe('one root engine: chips, description and sound agree', () => {
  it('sin x on [-2π, 2π]: five roots, including both window edges, everywhere', async () => {
    await mount({ type: 'trig', a: 1, b: 1, c: 0, range: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -2, yMax: 2 } });
    expect(chipText()).toBe('📍 5 roots: x = -6.28, -3.14, 0.00, 3.14, 6.28');
    await click(q('[data-graph-access-describe]'));
    expect(q('[data-graph-access-text]').textContent).toContain('x = −6.28, x = −3.14, x = 0, x = 3.14 and x = 6.28');
    await click(q('[data-graph-access-hear]'));
    // one continuous sweep plus one click per root
    expect(FakeAudioContext.last.oscillators.length).toBe(1 + 5);
    expect(FakeAudioContext.last.oscillators.filter((o) => o.type === 'triangle').length).toBe(5);
  });

  it('keeps the old root-finder guarantees: no root at a pole, one per sample-aligned root', async () => {
    const cases = [
      [{ type: 'rational', a: 1, b: 0, c: 0 }, ''],
      [{ type: 'rational', a: 2, b: -3, c: 0 }, ''],
      [{ type: 'linear', a: 2, b: -4, c: 0 }, '📍 1 root: x = 2.00'],
      [{ type: 'quadratic', a: 1, b: 0, c: -4 }, '📍 2 roots: x = -2.00, 2.00'],
      [{ type: 'rational', a: 1, b: 0, c: 0.5 }, '📍 1 root: x = -2.00'],
      [{ type: 'linear', a: 1, b: 0, c: 0 }, '📍 1 root: x = 0.00'],
      [{ type: 'quadratic', a: 1, b: -4, c: 4 }, '📍 1 root: x = 2.00'],
      [{ type: 'absolute', a: 1, b: 0, c: 0 }, '📍 1 root: x = 0.00']
    ];
    for (const [fam, want] of cases) {
      await mount(fam);
      expect(chipText(), JSON.stringify(fam)).toBe(want);
      await React.act(() => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';
    }
  });
});

describe('mode bar', () => {
  it('Explore by default; tabs switch stages by click and arrow keys without remounting state', async () => {
    const m = await mount({});
    const tabs = qa('[role="tab"][data-funcgrapher-stage-tab]');
    expect(tabs.map((tb) => tb.getAttribute('data-funcgrapher-stage-tab'))).toEqual(['explore', 'practice', 'investigate']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(q('#fg-stage-panel').getAttribute('aria-labelledby')).toBe('fg-stage-tab-explore');
    expect(q('[data-transform-lab]')).toBeTruthy();
    expect(q('button[aria-label="Start Challenge"]')).toBeNull();
    expect(q('[data-secant-investigation]')).toBeNull();
    await click(tabs[1]);
    expect(m.latest.fgStage).toBe('practice');
    expect(q('button[aria-label="Start Challenge"]')).toBeTruthy();
    expect(q('[data-worked-panel]')).toBeTruthy();
    await key(q('#fg-stage-tab-practice'), 'ArrowRight');
    expect(m.latest.fgStage).toBe('investigate');
    expect(q('[data-secant-investigation]')).toBeTruthy();
    expect(q('[data-improper-investigation]')).toBeTruthy();
    expect(q('[data-wave-investigation]')).toBeTruthy();
    await key(q('#fg-stage-tab-investigate'), 'Home');
    expect(m.latest.fgStage).toBe('explore');
    // fgStage is not one of the host's remount fields (subtool, tab, mode, activeTab, activeSubtool)
    expect(['subtool', 'tab', 'mode', 'activeTab', 'activeSubtool'].some((k) => k in m.latest)).toBe(false);
  });

  it('saved work picks the stage; the 1-9 and D/A/T/L shortcuts still work', async () => {
    const m = await mount({ fgChallengeMode: 'root' });
    expect(q('#fg-stage-tab-practice').getAttribute('aria-selected')).toBe('true');
    const region = q('[role="region"][tabindex="0"]');
    await key(region, '2');
    expect(m.latest.type).toBe('quadratic');
    await key(region, 't');
    expect(m.latest.showTable).toBe(true);
  });

  it('a Teacher tab exists only in teacher mode', async () => {
    await mount({});
    expect(q('#fg-stage-tab-teacher')).toBeNull();
    await React.act(() => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>';
    await mount({ fgStage: 'teacher' }, { isTeacherMode: true });
    expect(q('#fg-stage-tab-teacher').getAttribute('aria-selected')).toBe('true');
    expect(q('[data-funcgrapher-teacher]')).toBeTruthy();
  });
});

describe('rate of change', () => {
  it('slope triangle on the graph, predict, then check a calculated rate (XP once)', async () => {
    const m = await mount({ type: 'quadratic', a: 1, b: 0, c: 0 });
    await click([...q('[data-funcgrapher-rate]').querySelectorAll('button')][0]);
    expect(m.latest.roc.on).toBe(true);
    const overlay = q('[data-funcgrapher-rate-overlay]');
    expect(overlay).toBeTruthy();
    expect([...overlay.querySelectorAll('text')].map((tx) => tx.textContent)).toEqual(['Δx = 2', 'Δy = 8', 'A', 'B']);
    expect(q('svg[data-funcgrapher-graph]').getAttribute('aria-label')).toContain('Points A (1, 1) and B (3, 9) are marked');
    expect(q('[data-rate-guess]')).toBeNull(); // predict first
    const up = [...q('[data-rate-predict]').querySelectorAll('input')].find((i) => i.value === 'up');
    await click(up);
    expect(q('[data-rate-pred-result]').getAttribute('data-rate-pred-result')).toBe('match');
    await type(q('[data-rate-guess]'), '4');
    await click(q('[data-rate-check]'));
    expect(q('[data-rate-check-result]').textContent).toBe('Correct: the average rate of change is 4.');
    expect(m.awards).toEqual([['funcGrapher', 3, 'Rate of change calculated']]);
    await click(q('[data-rate-check]'));
    expect(m.awards.length).toBe(1);
    // keyboard: move B to x = 2 with the slider
    await type(q('[data-rate-slider="x2"]'), 2);
    expect(m.latest.roc.x2).toBe(2);
    await click(q('[data-rate-steps]'));
    expect(q('[data-rate-steps-summary]').getAttribute('data-rate-steps-summary')).toBe('quadratic');
  });

  it('drags the nearer point on the graph', async () => {
    const m = await mount({ type: 'linear', a: 2, b: 0, c: 0, roc: { on: true } });
    const svg = q('svg[data-funcgrapher-graph]');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 440, height: 320, right: 440, bottom: 320 });
    // x = 5 sits at 45 + 15/20 * 350 = 307.5 px
    await React.act(() => { svg.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 307.5, clientY: 100 })); });
    expect(m.latest.roc.x2).toBe(5);
    expect(m.latest.roc.x1 === undefined || m.latest.roc.x1 === 1).toBe(true);
  });

  it('a calculated rate after the answer was shown earns nothing', async () => {
    const m = await mount({ type: 'linear', a: 3, b: -1, c: 0, roc: { on: true } });
    await click([...q('[data-rate-predict]').querySelectorAll('input')].find((i) => i.value === 'unsure'));
    for (let i = 0; i < 4; i++) await click(q('#fg-rate-panel-hints [data-hint-next], [data-hint-ladder="fg-rate-panel-hints"] [data-hint-next]'));
    expect(q('[data-hint-ladder="fg-rate-panel-hints"]').textContent).toContain('Δy ÷ Δx = 6 ÷ 2 = 3.');
    await type(q('[data-rate-guess]'), '3');
    await click(q('[data-rate-check]'));
    expect(q('[data-rate-check-result]').getAttribute('data-rate-check-result')).toBe('correct');
    expect(m.awards).toEqual([]);
  });
});

describe('domain, range and key features', () => {
  it('predict, then reveal: exact intervals from the rule (square root)', async () => {
    const m = await mount({ type: 'sqrt', a: 2, b: 1, c: -3, kf: { on: true } });
    expect(q('[data-features-source]').getAttribute('data-features-source')).toBe('exact');
    expect(q('[data-features-answer="domain"]').hidden).toBe(true);
    await type(q('#fg-features-panel-pred-domain'), 'x ≥ −1');
    await click(q('[data-features-reveal="domain"]'));
    expect(q('[data-features-answer="domain"]').textContent).toBe('[−1, ∞) (You predicted: x ≥ −1)');
    await click(q('[data-features-reveal-all]'));
    expect(q('[data-features-answer="range"]').textContent).toBe('[−3, ∞)');
    expect(q('[data-features-answer="ext"]').textContent).toBe('a minimum at the endpoint (−1, −3)');
    expect(m.latest.kf.revealed.range).toBe(true);
    // changing the function hides the answers again
    await click(qa('button').find((b) => /Logarithm/.test(b.textContent)));
    expect(q('[data-features-answer="domain"]').hidden).toBe(true);
    await click(q('[data-features-reveal="domain"]'));
    expect(q('[data-features-answer="domain"]').textContent).toBe('(−1, ∞)');
  });

  it('is hidden while a challenge question would be given away', async () => {
    const m = await mount({ type: 'quadratic', a: 1, b: 0, c: 0, kf: { on: true }, fgChallengeMode: 'root', fgGradeOverride: '9-12' });
    randomSeq([0.2, 0.7, 0.1, 0.3, 0.6, 0.9, 0.05, 0.75]);
    await click(q('button[aria-label="Start Challenge"]'));
    await click(q('#fg-stage-tab-explore'));
    expect(m.latest.fgQuiz.answered).toBe(false);
    expect(q('[data-features-panel]')).toBeNull();
    expect(q('[data-funcgrapher-features]').textContent).toMatch(/Hidden while a challenge question is open/);
  });
});

describe('practice: hints, targets and worked examples', () => {
  it('Find the Root has a hint ladder from the rule; after the answer shows, a right answer earns no XP', async () => {
    const m = await mount({ type: 'quadratic', a: 1, b: 0, c: 0, fgChallengeMode: 'root', fgGradeOverride: '3-5' });
    randomSeq([0.2, 0.7, 0.1, 0.3, 0.6, 0.9, 0.05, 0.75]);
    await click(q('button[aria-label="Start Challenge"]'));
    const quiz = m.latest.fgQuiz;
    expect(quiz.type).toBe('linear');
    const ladder = () => q('[data-hint-ladder="fg-quiz-hints"]');
    await click(ladder().querySelector('[data-hint-next]'));
    expect(ladder().textContent).toContain('A root is where the graph meets the x-axis');
    await click(ladder().querySelector('[data-hint-next]'));
    await click(ladder().querySelector('[data-hint-next]'));
    expect(ladder().textContent).toContain(String(quiz.a) + 'x = ' + String(-quiz.b === 0 ? 0 : -quiz.b));
    await click(ladder().querySelector('[data-hint-next]'));
    expect(ladder().textContent).toContain('Answer: x = ' + quiz.answer);
    expect(m.latest.fgQuiz.hint).toBe(4);
    await click(qa('button').find((b) => b.getAttribute('aria-label') === 'Select answer: ' + quiz.answer));
    expect(m.latest.fgQuiz.correct).toBe(true);
    expect(m.latest.fgQuiz.noXp).toBe(true);
    expect(m.awards).toEqual([]);
    expect(m.latest.fgScore || 0).toBe(0);
    expect(qa('[role="status"]').map((e) => e.textContent).join('|')).toContain('Correct (no XP: the answer was shown)');
  });

  it('a transformation target: dotted target, match pays once, the equation shows when matched', async () => {
    const m = await mount({ fgStage: 'practice', tf: { parent: 'x2', a: 1, b: 1, h: 0, k: 0, predictOn: false } });
    const card = () => q('[data-tf-target-card]');
    expect(card().getAttribute('data-tf-target-card')).toBe('y = (x − 2)² − 1');
    expect(q('[data-tf-target]').getAttribute('d')).toMatch(/^M/);
    expect(q('[data-tf-target-equation]')).toBeNull();
    await type(q('#fg-tf-h'), 2);
    expect(q('[data-tf-target-status]').getAttribute('data-tf-target-status')).toBe('open');
    await type(q('#fg-tf-k'), -1);
    expect(q('[data-tf-target-status]').getAttribute('data-tf-target-status')).toBe('matched');
    expect(m.awards).toEqual([['funcGrapher', 5, 'Transformation target matched']]);
    expect(m.latest.tfDone).toEqual(['y = (x − 2)² − 1']);
    expect(q('[data-tf-target-equation]').textContent).toBe('Target: y = (x − 2)² − 1');
    await type(q('#fg-tf-k'), 0);
    await type(q('#fg-tf-k'), -1);
    expect(m.awards.length).toBe(1);
  });

  it('a teacher-assigned target comes first; showing its answer removes the XP', async () => {
    const m = await mount({ fgStage: 'practice', tfTargets: [{ parent: 'abs', a: 2, b: 1, h: 1, k: 0 }, { parent: 'nope' }], tf: { parent: 'abs', predictOn: false } });
    expect(q('[data-tf-target-card]').getAttribute('data-tf-target-card')).toBe('y = 2·|x − 1|');
    expect(q('[data-tf-target-choice="0"]').textContent).toBe('Target 1 (from your teacher)');
    const next = () => q('[data-hint-ladder="fg-tf-hints"] [data-hint-next]');
    for (let i = 0; i < 4; i++) await click(next());
    expect(q('[data-hint-ladder="fg-tf-hints"]').textContent).toContain('Set a = 2, b = 1, h = 1 and k = 0: y = 2·|x − 1|.');
    await type(q('#fg-tf-a'), 2);
    await type(q('#fg-tf-h'), 1);
    expect(q('[data-tf-target-status]').getAttribute('data-tf-target-status')).toBe('matched');
    expect(m.awards).toEqual([]);
  });

  it('worked examples fade: example 1 fully worked, example 3 leaves two steps', async () => {
    const m = await mount({ fgStage: 'practice' });
    const panel = () => q('[data-worked-panel]');
    expect(panel().querySelector('[data-worked-problem]').textContent).toBe('Example 1 of 3: Find the zeros of f(x) = x² − x − 6.');
    for (let i = 0; i < 4; i++) await click(q('[data-worked-next]'));
    expect(panel().querySelectorAll('[data-worked-yours]').length).toBe(0);
    expect(q('[data-worked-next]')).toBeNull();
    await click(q('[data-worked-next-example]'));
    await click(q('[data-worked-next-example]'));
    expect(m.latest.we.index).toBe(2);
    for (let i = 0; i < 4; i++) await click(q('[data-worked-next]'));
    expect(panel().querySelectorAll('[data-worked-yours]').length).toBe(2);
    await type(q('#fg-worked-yours-3'), 'x = 1 or x = 5');
    await click(q('[data-worked-show="4"]'));
    expect(q('[data-worked-check="4"]').textContent).toBe('Compare with: A product is 0 only when a factor is 0, so x = 1 or x = 5.');
    await click(q('[data-worked-kind="rate"]'));
    expect(panel().querySelector('[data-worked-problem]').textContent).toBe('Example 1 of 3: Find the average rate of change of f(x) = x² from x = 1 to x = 3.');
  });
});

describe('teacher tools', () => {
  it('assigns the current Transformation Lab graph and Match items; exports CSV and Markdown; prints through a window', async () => {
    const m = await mount({ fgStage: 'teacher', tf: { parent: 'sqrt', a: 1, b: 1, h: 2, k: 1 }, fgScore: 3, tfDone: ['y = (x − 2)² − 1'] }, { isTeacherMode: true });
    await click(q('[data-teacher-assign-target]'));
    expect(m.latest.tfTargets).toEqual([{ parent: 'sqrt', a: 1, b: 1, h: 2, k: 1 }]);
    expect(q('[data-teacher-assign-target]').disabled).toBe(true);
    await click(q('[data-teacher-match-item="exp_half"]'));
    expect(m.latest.matchAssigned).toEqual(['exp_half']);
    const rows = [...q('[data-teacher-progress]').querySelectorAll('tr')].map((tr) => tr.textContent);
    expect(rows).toContain('Challenges answered correctly3');
    expect(rows).toContain('Transformation targets matched1 (y = (x − 2)² − 1)');
    const blobs = [];
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = (b) => { blobs.push(b); return 'blob:x'; };
    URL.revokeObjectURL = () => {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click(q('[data-teacher-csv]'));
    await click(q('[data-teacher-md]'));
    const csv = await blobs[0].text();
    expect(csv.split('\n')[0]).toBe('metric,value');
    expect(csv).toContain('Challenges answered correctly,3');
    expect(await blobs[1].text()).toMatch(/^# Function Grapher progress/);
    let written = '';
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ document: { open() {}, write(s) { written += s; }, close() {} } });
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    await click(q('[data-teacher-print]'));
    expect(openSpy).toHaveBeenCalled();
    expect(printSpy).not.toHaveBeenCalled();
    expect(written).toContain('Challenges answered correctly');
    URL.createObjectURL = origCreate;
  });

  it('assigned Match items are the ones asked', async () => {
    const m = await mount({ fgStage: 'practice', fgChallengeMode: 'match', fgGradeOverride: '3-5', matchAssigned: ['rat_share'] });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await click(q('button[aria-label="Start Challenge"]'));
    expect(m.latest.fgQuiz.answer).toBe('rat_share');
    expect(m.latest.fgQuiz.opts.length).toBe(3);
  });
});

describe('translation, Zoo palettes and phone-size SVG text', () => {
  it('traits, myths, "Signature spotted" and TRUE/FALSE go through literal keys', async () => {
    const m = await mount({ fgChallengeMode: 'myth', fgGradeOverride: '6-8' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await click(q('button[aria-label="Start Challenge"]'));
    for (const k of ['stem.funcgrapher.trait_linear', 'stem.funcgrapher.trait_rational', 'stem.funcgrapher.myth_g35_0_s', 'stem.funcgrapher.myth_g912_5_why', 'stem.funcgrapher.stage_explore']) expect(m.keys.has(k), k).toBe(true);
    await click(qa('button').find((b) => b.getAttribute('aria-label') === 'Select answer: True'));
    expect(m.keys.has('stem.funcgrapher.match_true') || m.keys.has('stem.funcgrapher.match_false')).toBe(true);
  });

  it('the Function Zoo draws a light canvas in light, black in contrast, and its labels follow', async () => {
    await mount({});
    expect(canvasCalls.find((c) => c.call === 'fillRect').fillStyle).toBe('#ffffff');
    expect(canvasCalls.find((c) => c.call === 'fillText').fillStyle).toBe('#1d4ed8');
    await React.act(() => root.unmount()); root = null; canvasCalls = []; document.body.innerHTML = '<div id="root"></div>';
    await mount({}, { isContrast: true, isDark: true });
    expect(canvasCalls.find((c) => c.call === 'fillRect').fillStyle).toBe('#000000');
    expect(canvasCalls.find((c) => c.call === 'fillText').fillStyle).toBe('#ffff00');
    expect(q('[data-allo-fs-stage]').style.background).toBe('rgb(0, 0, 0)');
  });

  it('measures the graph on a phone and enlarges SVG text to at least 12 CSS px', async () => {
    const orig = SVGElement.prototype.getBoundingClientRect;
    SVGElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 288, height: 209.45, right: 288, bottom: 209.45 }; };
    const m = await mount({ type: 'quadratic', a: 1, b: 0, c: -4 });
    SVGElement.prototype.getBoundingClientRect = orig;
    expect(m.latest._svgScale).toBeCloseTo(440 / 288, 2);
    const pxPerUnit = 288 / 440;
    for (const tx of q('svg[data-funcgrapher-graph]').querySelectorAll('text')) expect(parseFloat(tx.style.fontSize) * pxPerUnit).toBeGreaterThanOrEqual(11.95);
    for (const tx of q('[data-transform-lab] svg').querySelectorAll('text')) expect(parseFloat(tx.style.fontSize) * pxPerUnit).toBeGreaterThanOrEqual(11.95);
  });
});

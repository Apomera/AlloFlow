// Graphing Calculator stage A (2026-11-03): Describe and Hear through the shared
// _graphAccess core, keyboard stepping, auto-checked challenges with predictions,
// the low-vision canvas palette, table differences and the Function Grapher link.
// Each test mounts the tool with real React 18 in jsdom.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.GRAPHCALC_STAGE_A_FILE || 'stem_lab/stem_tool_graphcalc.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let canvasLog = [];
const COLORS = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'];
const funcs = (list) => COLORS.map((color, i) => ({ expr: list[i] || '', color }));

// A small math.js stand-in: x, powers, trig, sqrt/abs, log10 (log after gcCleanExpr) and ln.
function fakeMath() {
  return {
    compile(expr) {
      const js = String(expr).replace(/\^/g, '**').replace(/\blog10\(/g, '__L10(').replace(/\blog\(/g, 'Math.log(').replace(/__L10\(/g, 'Math.log10(')
        .replace(/\b(sin|cos|tan|sqrt|abs|exp)\(/g, 'Math.$1(').replace(/\bpi\b/g, 'Math.PI');
      const fn = new Function('x', 'a', 'b', 'c', 'return (' + js + ');');
      return { evaluate: (scope) => fn(scope.x, scope.a, scope.b, scope.c) };
    }
  };
}
// Records canvas state at every drawing call so colours, fonts and widths can be checked.
function recordingContext() {
  const state = { measureText: () => ({ width: 20 }) };
  return new Proxy(state, {
    get(t, key) {
      if (key === 'then') return undefined;
      if (key in t) return t[key];
      return (...args) => { canvasLog.push({ call: key, args, fillStyle: t.fillStyle, strokeStyle: t.strokeStyle, lineWidth: t.lineWidth, font: t.font }); };
    },
    set(t, key, value) { t[key] = value; if (key === 'font') canvasLog.push({ font: value }); return true; }
  });
}
function param() { return { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }; }
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.oscillators = []; FakeAudioContext.instances.push(this); }
  createOscillator() { const o = { type: '', frequency: param(), connect() {}, disconnect() {}, start: vi.fn(), stop: vi.fn() }; this.oscillators.push(o); return o; }
  createGain() { return { gain: param(), connect() {} }; }
  createStereoPanner() { return { pan: param(), connect() {} }; }
}
FakeAudioContext.instances = [];

beforeEach(() => {
  resetStemLab();
  canvasLog = [];
  FakeAudioContext.instances = [];
  window.math = fakeMath();
  window.AudioContext = FakeAudioContext;
  delete window._alloGlobalMute;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recordingContext());
  loadTool(FILE, 'graphCalc');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  try { window.StemLab._graphAccess.stop(); } catch (e) { /* not installed */ }
  if (root) { try { await React.act(() => root.unmount()); } catch (e) { /* a crashed root */ } }
  root = null;
  delete window.math;
  delete window.AudioContext;
  delete window._alloGlobalMute;
  delete window.__alloEnsureStemPluginLoaded;
  vi.restoreAllMocks();
});

async function mount(initial, overrides) {
  const out = { latest: null, state: null, announced: [], toasts: [], awards: [] };
  function App() {
    const [state, setState] = React.useState(Object.assign({ graphCalc: initial }, (overrides && overrides.extraState) || {}));
    out.latest = state.graphCalc;
    out.state = state;
    return window.StemLab._registry.graphCalc.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, addToast: (m) => out.toasts.push(m), announceToSR: (m) => out.announced.push(m), awardXP: (...a) => { if (a[2] === 'Graphing challenge') out.awards.push(a); } }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const q = (sel) => document.querySelector(sel);
const button = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent) || re.test(b.getAttribute('aria-label') || ''));
async function click(el) { await React.act(() => el.click()); }
async function key(el, k) { await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
function findFunctionsOrAudio(value, path, seen) {
  seen = seen || new Set();
  if (typeof value === 'function') return [path];
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  if (typeof value.createOscillator === 'function' || value instanceof FakeAudioContext) return [path];
  return Object.keys(value).flatMap((k) => findFunctionsOrAudio(value[k], path + '.' + k, seen));
}

describe('Describe and Hear', () => {
  it('names the canvas from the selected function\'s key features', async () => {
    await mount({ funcs: funcs(['x^2 - 4']) });
    const label = q('canvas').getAttribute('aria-label');
    expect(label).toContain('y1 = x^2 - 4');
    expect(label).toContain('x = −2 and x = 2');
    expect(label).toContain('local minimum at (0, −4)');
    expect(label).toContain('y = −4');
  });

  it('shows the full description on demand and reads it aloud through callTTS', async () => {
    const callTTS = vi.fn(() => Promise.resolve(null));
    const m = await mount({ funcs: funcs(['x^2 - 4']) }, { callTTS });
    const describe = q('[data-graph-access-describe]');
    expect(describe.getAttribute('aria-expanded')).toBe('false');
    await click(describe);
    expect(describe.getAttribute('aria-expanded')).toBe('true');
    const text = q('[data-graph-access-text]').textContent;
    expect(text).toMatch(/decreasing from x = −10 to x = 0 and increasing from x = 0 to x = 10/);
    expect(m.latest._gaOpen).toBe(true);
    await click(q('[data-graph-access-read]'));
    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(callTTS.mock.calls[0][0]).toBe(text);
    expect(callTTS.mock.calls[0][3]).toEqual({ force: true });
  });

  it('describes the function chosen in the selector', async () => {
    const m = await mount({ funcs: funcs(['x', 'x^2 - 9']) });
    const select = q('[data-graphcalc-access] select');
    expect([...select.options].map((o) => o.textContent)).toEqual(['y1 = x', 'y2 = x^2 - 9']);
    await React.act(() => { select.value = '1'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(m.latest._gaFn).toBe(1);
    expect(q('canvas').getAttribute('aria-label')).toContain('2 functions are graphed. Graph of y2 = x^2 - 9.');
    expect(q('canvas').getAttribute('aria-label')).toContain('x = −3 and x = 3');
  });

  it('plays a pitch sweep with a click per crossing, stops on request, and respects mute', async () => {
    const m = await mount({ funcs: funcs(['x^2 - 4']) });
    const hear = () => q('[data-graph-access-hear]');
    await click(hear());
    const ac = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
    // one continuous segment plus a click at x = -2 and x = 2
    expect(ac.oscillators.length).toBe(3);
    expect(hear().textContent).toBe('Stop');
    expect(m.announced.some((a) => /Playing the graph from left to right in 4 seconds/.test(a))).toBe(true);
    await click(hear());
    expect(ac.oscillators.every((o) => o.stop.mock.calls.length >= 1)).toBe(true);
    expect(hear().textContent).toBe('Hear this graph');
    expect(findFunctionsOrAudio(m.state, 'toolData')).toEqual([]);

    window._alloGlobalMute = true;
    const before = ac.oscillators.length;
    await click(hear());
    expect(ac.oscillators.length).toBe(before);
    expect(m.announced[m.announced.length - 1]).toMatch(/Sound is muted/);
  });

  it('steps along the curve by keyboard and jumps between key features', async () => {
    const m = await mount({ funcs: funcs(['x^2 - 4']) });
    const region = q('[data-graph-access-explore]');
    expect(region.getAttribute('role')).toBe('application');
    expect(region.getAttribute('tabindex')).toBe('0');
    await key(region, 'PageDown');
    expect(q('[data-graph-access-point]').textContent).toBe('x = −2, y = 0: meets the x-axis');
    expect(m.announced[m.announced.length - 1]).toBe('x = −2, y = 0: meets the x-axis');
    await key(region, 'PageDown');
    expect(q('[data-graph-access-point]').textContent).toBe('x = 0, y = −4: y-intercept, local minimum');
    await key(region, 'ArrowRight');
    expect(q('[data-graph-access-point]').textContent).toBe('x = 0.1, y = −3.99');
    await key(region, 'End');
    expect(q('[data-graph-access-point]').textContent).toBe('x = 10, y = 96');
    await key(region, 'Home');
    expect(q('[data-graph-access-point]').textContent).toBe('x = −10, y = 96');
    expect(typeof m.latest._gaIdx).toBe('number');
    expect(findFunctionsOrAudio(m.state, 'toolData')).toEqual([]);
  });
});

describe('auto-checked challenges', () => {
  it('needs a prediction and the graphed function before it pays XP, and pays once', async () => {
    const m = await mount({ funcs: funcs([]), _sideTab: 'challenge', activeChallenge: 0 });
    const check = () => q('button[aria-label="Check my graph"]');
    const card = () => q('[data-graphcalc-challenge="0"]');
    // The hint gives the answer away: hidden until the student predicts.
    expect(card().textContent).not.toMatch(/where the line crosses the y-axis \(x=0\)/);
    await click(check());
    expect(m.awards).toEqual([]);
    expect(q('[data-graphcalc-challenge-msg]').textContent).toMatch(/prediction first/);
    const radio = [...card().querySelectorAll('input[type="radio"]')].find((r) => r.parentElement.textContent === 'y = 3');
    await click(radio);
    expect(m.latest._challengePred).toEqual({ 0: 'b' });
    expect(card().textContent).toMatch(/where the line crosses the y-axis/);
    await click(check());
    expect(m.awards).toEqual([]);
    expect(q('[data-graphcalc-challenge-msg]').textContent).toMatch(/Not yet\. Still to do: Graph y = 3x - 2/);
    expect(m.latest._challengesCompleted || 0).toBe(0);
  });

  it('completes from the actual graph, reports the prediction, and never pays twice', async () => {
    const m = await mount({ funcs: funcs(['3x-2']), _sideTab: 'challenge', activeChallenge: 0, _challengePred: { 0: 'b' } });
    expect(q('[data-graphcalc-challenge="0"] li').getAttribute('data-req-met')).toBe('true');
    await click(q('button[aria-label="Check my graph"]'));
    expect(m.awards).toEqual([['graphCalc', 5, 'Graphing challenge']]);
    expect(m.latest._challengesCompleted).toBe(1);
    expect(m.latest._challengesDone).toEqual([0]);
    expect(q('button[aria-label="Check my graph"]')).toBeNull();
    expect(q('[data-graphcalc-prediction-result]').textContent).toBe('You predicted "y = 3". Your graph shows "y = −2".');
  });

  it('the intersection challenge waits for an Analyze result that finds (3, 2)', async () => {
    const m = await mount({ funcs: funcs(['-x + 5', 'x - 1']), _sideTab: 'challenge', activeChallenge: 1, _challengePred: { 1: 'a' } });
    const reqs = () => [...q('[data-graphcalc-challenge="1"]').querySelectorAll('li')].map((li) => li.getAttribute('data-req-met'));
    expect(reqs()).toEqual(['true', 'true', 'false']);
    await click(q('button[aria-label="Check my graph"]'));
    expect(m.awards).toEqual([]);
    await click(button(/Analyze/));
    expect(reqs()).toEqual(['true', 'true', 'true']);
    await click(q('button[aria-label="Check my graph"]'));
    expect(m.awards).toEqual([['graphCalc', 5, 'Graphing challenge']]);
    expect(q('[data-graphcalc-prediction-result]').textContent).toBe('You predicted "(3, 2)", and your graph agrees.');
  });

  it('the trig challenge checks both curves and the Trig window', async () => {
    const m = await mount({ tier: 'engineer', funcs: funcs(['sin(x)', 'cos(x)']), _sideTab: 'challenge', activeChallenge: 6, _challengePred: { 6: 'a' } });
    const reqs = () => [...q('[data-graphcalc-challenge="6"]').querySelectorAll('li')].map((li) => li.getAttribute('data-req-met'));
    expect(reqs()).toEqual(['true', 'true', 'false']);
    await click(button(/^Trig zoom preset$/));
    expect(reqs()).toEqual(['true', 'true', 'true']);
    await click(q('button[aria-label="Check my graph"]'));
    expect(m.latest._challengesDone).toEqual([6]);
  });

  it('a self-report path no longer exists', async () => {
    await mount({ funcs: funcs([]), _sideTab: 'challenge', activeChallenge: 0 });
    expect(q('button[aria-label="Complete"]')).toBeNull();
  });
});

describe('low-vision canvas', () => {
  function fonts() { return canvasLog.filter((e) => e.font && !e.call).map((e) => e.font); }
  it('uses a light canvas in the light app theme, 12 px labels, thick dashed-or-solid curves', async () => {
    await mount({ funcs: funcs(['x', 'x^2 - 4']) });
    const firstFill = canvasLog.find((e) => e.call === 'fillRect');
    expect(firstFill.fillStyle).toBe('#ffffff');
    expect(fonts().length).toBeGreaterThan(5);
    for (const f of fonts()) expect(Number(/(\d+)px/.exec(f)[1]), f).toBeGreaterThanOrEqual(12);
    const dashes = canvasLog.filter((e) => e.call === 'setLineDash').map((e) => JSON.stringify(e.args[0]));
    expect(dashes).toContain('[]');
    expect(dashes).toContain('[10,5]');
    // the canvas redraws on every commit; check the last frame only
    const lastFrame = canvasLog.slice(canvasLog.map((e) => e.call).lastIndexOf('fillRect'));
    const curveStrokes = lastFrame.filter((e) => e.call === 'stroke' && ['#1d4ed8', '#be185d'].includes(e.strokeStyle));
    expect(curveStrokes.length).toBe(2);
    for (const s of curveStrokes) expect(s.lineWidth).toBeGreaterThanOrEqual(2.5);
    // grid lines are drawn in a visible colour, not the old 8% tint
    expect(canvasLog.some((e) => e.call === 'stroke' && e.strokeStyle === '#c3cedb')).toBe(true);
  });

  it('keeps a dark canvas in the dark theme and pure black in the contrast theme', async () => {
    await mount({ funcs: funcs(['x']) }, { isDark: true });
    expect(canvasLog.find((e) => e.call === 'fillRect').fillStyle).toBe('#0f172a');
    await React.act(() => root.unmount()); root = null; canvasLog = [];
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ funcs: funcs(['x']) }, { isDark: true, isContrast: true });
    expect(canvasLog.find((e) => e.call === 'fillRect').fillStyle).toBe('#000000');
    expect(canvasLog.some((e) => e.call === 'stroke' && e.strokeStyle === '#ffff00')).toBe(true);
  });
});

describe('table differences', () => {
  it('adds Δy and ratio columns with a pattern summary', async () => {
    const m = await mount({ funcs: funcs(['x^2']), showTable: true, tableX: 0 });
    const toggle = q('[data-graphcalc-diffs]');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await click(toggle);
    expect(m.latest.showDiffs).toBe(true);
    const rows = [...document.querySelectorAll('table tbody tr')].slice(0, 4).map((tr) => [...tr.children].map((td) => td.textContent));
    expect(rows).toEqual([['0', '0', '—', '—'], ['1', '1', '1', '—'], ['2', '4', '3', '4'], ['3', '9', '5', '2.25']]);
    expect(q('[data-graphcalc-diff-summary]').textContent).toMatch(/quadratic pattern/);
  });
});

describe('cross-link to Function Grapher', () => {
  it('offers "Explore this family" for a matching expression and loads the plugin before switching', async () => {
    const calls = [];
    window.__alloEnsureStemPluginLoaded = (id) => { calls.push('ensure:' + id); return true; };
    const m = await mount({ funcs: funcs(['x^2 - 4']) }, { setStemLabTool: (id) => calls.push('switch:' + id) });
    const link = q('[data-graphcalc-explore-family]');
    expect(link.textContent).toBe('Explore this quadratic family in Function Grapher');
    await click(link);
    expect(calls).toEqual(['ensure:funcGrapher', 'switch:funcGrapher']);
    expect(m.state.funcGrapher).toMatchObject({ type: 'quadratic', a: 1, b: 0, c: -4, fgQuiz: null });
    expect(m.state.funcGrapher.familiesTried).toEqual({ quadratic: true });
    expect(m.state.graphCalc.funcs[0].expr).toBe('x^2 - 4');
  });

  it('offers nothing when no family reproduces the curve', async () => {
    await mount({ funcs: funcs(['x^4']) });
    expect(q('[data-graphcalc-explore-family]')).toBeNull();
  });
});

// Graphing Calculator bug fixes from the 2026-11-03 depth review:
//   B1 render loop when trig or 3+ functions are graphed,
//   B2 table Start/Step fields that could not be edited,
//   B3 sidebar "Challenge" button that did nothing visible,
//   B8 window bounds that snapped back while being typed.
// Each test mounts the tool with real React 18 in jsdom.
// GRAPHCALC_BUGFIX_FILE points the suite at another copy (pre-fix proof).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.GRAPHCALC_BUGFIX_FILE || 'stem_lab/stem_tool_graphcalc.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
const COLORS = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'];
const funcs = (list) => COLORS.map((color, i) => ({ expr: list[i] || '', color }));

// A small math.js stand-in (x, powers, sin/cos/tan). The B1 loop lives in the
// tool's state tracking, not in expression parsing, so this is enough to draw.
function fakeMath() {
  return {
    compile(expr) {
      const js = String(expr).replace(/\^/g, '**').replace(/\b(sin|cos|tan|sqrt|abs)\(/g, 'Math.$1(').replace(/\bpi\b/g, 'Math.PI');
      const fn = new Function('x', 'a', 'b', 'c', 'return (' + js + ');');
      return { evaluate: (scope) => fn(scope.x, scope.a, scope.b, scope.c) };
    }
  };
}

beforeEach(() => {
  resetStemLab();
  window.math = fakeMath();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, key) => (key === 'then' ? undefined : t[key] || (() => {})) }));
  loadTool(FILE, 'graphCalc');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) { try { await React.act(() => root.unmount()); } catch (e) { /* a crashed root */ } }
  root = null;
  delete window.math;
  vi.restoreAllMocks();
});

async function mount(initial, overrides) {
  const out = { renders: 0, errors: [], latest: null, toasts: [] };
  function App() {
    const [state, setState] = React.useState({ graphCalc: initial });
    out.renders++;
    out.latest = state.graphCalc;
    return window.StemLab._registry.graphCalc.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, addToast: (m) => out.toasts.push(m) }, overrides || {})));
  }
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...args) => out.errors.push(args.map(String).join(' ').slice(0, 200)));
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  try { await React.act(() => root.render(React.createElement(App))); }
  catch (e) { out.errors.push('THROWN: ' + String(e && e.message || e).slice(0, 200)); }
  errSpy.mockRestore();
  return out;
}

async function type(el, value) {
  await React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function blur(el) {
  await React.act(() => { el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
}
async function enter(el) {
  await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
}
const labelInput = (prefix) => [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(prefix)).querySelector('input');

describe('B1: graphing trig or three functions does not loop', () => {
  it('sin(x) mounts without "Maximum update depth" and records the trig use once', async () => {
    const m = await mount({ funcs: funcs(['sin(x)']) });
    expect(m.errors.filter((e) => /Maximum update depth|THROWN/.test(e))).toEqual([]);
    expect(m.renders).toBeLessThan(8);
    expect(m.latest._usedTrig).toBe(true);
  });

  it('three rows (x, x^2, x^3) mount without looping and record the count', async () => {
    const m = await mount({ funcs: funcs(['x', 'x^2', 'x^3']) });
    expect(m.errors.filter((e) => /Maximum update depth|THROWN/.test(e))).toEqual([]);
    expect(m.renders).toBeLessThan(8);
    expect(m.latest._multiGraphCount).toBe(3);
    expect(m.latest._graphsDrawn).toBe(3);
  });

  it('an unrelated state change after mount does not restart tracking writes', async () => {
    const m = await mount({ funcs: funcs(['sin(x)', 'x', 'x^2']) });
    const before = m.renders;
    const trace = [...document.querySelectorAll('button')].find((b) => /Trace/.test(b.textContent));
    await React.act(() => trace.click());
    expect(m.errors.filter((e) => /Maximum update depth|THROWN/.test(e))).toEqual([]);
    expect(m.renders - before).toBeLessThan(4);
  });
});

describe('B2: table Start and Step accept typing', () => {
  it('keeps the typed draft, commits on blur or Enter, and refuses invalid input with a message', async () => {
    const m = await mount({ funcs: funcs(['x^2']), showTable: true });
    const start = labelInput('Start:');
    const step = labelInput('Step:');
    await type(start, '3');
    expect(start.value).toBe('3');
    await blur(start);
    expect(m.latest.tableX).toBe(3);
    expect(document.querySelector('table tbody tr td').textContent).toBe('3');

    await type(step, '0.5');
    expect(step.value).toBe('0.5');
    await enter(step);
    expect(m.latest.tableStep).toBe(0.5);
    const xs = [...document.querySelectorAll('table tbody tr')].slice(0, 2).map((tr) => tr.firstChild.textContent);
    expect(xs).toEqual(['3', '3.5']);

    await type(step, '0');
    await blur(step);
    expect(m.latest.tableStep).toBe(0.5);
    expect(step.value).toBe('0.5');
    expect(document.querySelector('[data-graphcalc-table-status]').textContent).toMatch(/Step/);

    await type(start, '');
    expect(start.value).toBe('');
    await blur(start);
    expect(m.latest.tableX).toBe(3);
    expect(start.value).toBe('3');
    expect(document.querySelector('[data-graphcalc-table-status]').textContent).toMatch(/Start/);
  });
});

describe('B3: the sidebar Challenge button shows the challenges', () => {
  it('opens the Tasks panel, reports its state with aria-pressed, and moves focus there', async () => {
    const m = await mount({ funcs: funcs(['x']) });
    const btn = () => document.querySelector('button[aria-label="Challenge"]');
    expect(btn().getAttribute('aria-pressed')).toBe('false');
    await React.act(() => btn().click());
    expect(m.latest._sideTab).toBe('challenge');
    expect(btn().getAttribute('aria-pressed')).toBe('true');
    const panel = document.querySelector('[data-graphcalc-tasks]');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toMatch(/y-intercept/);
    await React.act(() => new Promise((r) => setTimeout(r, 20)));
    expect(document.activeElement).toBe(document.querySelector('[data-graphcalc-tasks]'));
    await React.act(() => btn().click());
    expect(btn().getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-graphcalc-tasks]')).toBeNull();
  });
});

describe('B8: window bounds can be cleared and retyped', () => {
  it('keeps an empty or partial draft, commits a number on blur, and keeps the last valid bound otherwise', async () => {
    const m = await mount({ funcs: funcs(['x']), showWindow: true });
    const xmin = () => document.querySelector('[aria-label="Graph window xmin"]');
    await type(xmin(), '');
    expect(xmin().value).toBe('');
    await type(xmin(), '-3');
    await blur(xmin());
    expect(m.latest.window.xmin).toBe(-3);
    expect(xmin().value).toBe('-3');

    await type(xmin(), '');
    await blur(xmin());
    expect(m.latest.window.xmin).toBe(-3);
    expect(xmin().value).toBe('-3');
    expect(document.querySelector('[data-graphcalc-window-status]').textContent).toMatch(/number/);

    await type(xmin(), '20');
    await enter(xmin());
    expect(m.latest.window.xmin).toBe(-3);
    expect(xmin().value).toBe('-3');
    expect(m.toasts.some((t) => /less than/.test(t))).toBe(true);
  });
});

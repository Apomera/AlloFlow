// Math review (algebra lane): Graphing Calculator task completion counts each
// challenge once. Since stage A (2026-11-03) a challenge completes only when the
// graphed state meets it ("Check my graph"); the self-report button is gone.
// MATH_REVIEW_GRAPHCALC points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_GRAPHCALC || 'stem_lab/stem_tool_graphcalc.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
const COLORS = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'];
const funcs = (list) => COLORS.map((color, i) => ({ expr: list[i] || '', color }));
// Enough of math.js for the rows below: powers and x.
const fakeMath = { compile(expr) { const fn = new Function('x', 'a', 'b', 'c', 'return (' + String(expr).replace(/\^/g, '**') + ');'); return { evaluate: (s) => fn(s.x, s.a, s.b, s.c) }; } };

beforeEach(() => {
  resetStemLab();
  window.math = fakeMath;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  loadTool(FILE, 'graphCalc');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; delete window.math; vi.restoreAllMocks(); });

// Challenges 0 (3x - 2), 4 (three shifted parabolas) and 8 (1/x) need only graphed rows;
// the researcher tier lists all of them.
const GRAPHED = funcs(['3x - 2', 'x^2', '(x-3)^2', '(x+2)^2', '1/x']);
const PREDICTED = { 0: 'a', 4: 'a', 8: 'a' };

async function mount(award) {
  const out = { latest: null };
  function App() {
    const [state, setState] = React.useState({ graphCalc: { tier: 'researcher', funcs: GRAPHED, _sideTab: 'challenge', activeChallenge: -1, _challengePred: PREDICTED } });
    out.latest = state.graphCalc;
    return window.StemLab._registry.graphCalc.render(makeCtx({ toolData: state, setToolData: setState, awardXP: award, addToast: vi.fn() }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const card = (pid) => document.querySelector('[data-graphcalc-challenge="' + pid + '"]');
const check = () => document.querySelector('button[aria-label="Check my graph"]');
async function open(pid) { const btn = card(pid).querySelector('button[aria-expanded]'); if (btn.getAttribute('aria-expanded') !== 'true') await React.act(() => btn.click()); }

describe('graphing tasks', () => {
  it('re-checking a completed task does not raise the quest count or pay XP again', async () => {
    const award = vi.fn();
    const m = await mount(award);
    await open(0);
    await React.act(() => check().click());
    expect(m.latest._challengesCompleted).toBe(1);
    // Re-open the finished task: there is nothing left to claim.
    await React.act(() => card(0).querySelector('button[aria-expanded]').click());
    await open(0);
    expect(check()).toBeNull();
    expect(m.latest._challengesCompleted).toBe(1);
    expect(award.mock.calls.filter((c) => c[2] === 'Graphing challenge').length).toBe(1);
    const hook = window.StemLab._registry.graphCalc.questHooks.find((h) => h.id === 'complete_3_challenges');
    expect(hook.check(m.latest)).toBe(false);
  });

  it('three different verified tasks complete the quest', async () => {
    const award = vi.fn();
    const m = await mount(award);
    for (const pid of [0, 4, 8]) {
      expect(card(pid), 'challenge ' + pid + ' is listed').toBeTruthy();
      await open(pid);
      await React.act(() => check().click());
    }
    expect(m.latest._challengesCompleted).toBe(3);
    expect(m.latest._challengesDone.slice().sort()).toEqual([0, 4, 8]);
    expect(award.mock.calls.filter((c) => c[2] === 'Graphing challenge').length).toBe(3);
    expect(window.StemLab._registry.graphCalc.questHooks.find((h) => h.id === 'complete_3_challenges').check(m.latest)).toBe(true);
  });
});

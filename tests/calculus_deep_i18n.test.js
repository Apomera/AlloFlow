// Calculus deep rebuild (2026-11-03): i18n coverage. Every user-visible sentence goes through
// t(); with a marker translator, the only unmarked text left is math notation or data.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null;
const MARK = '⟦T⟧';

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  loadTool(FILE, 'calculus');
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; container.remove(); vi.restoreAllMocks(); });

async function mount(init, extra) {
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    return window.StemLab._registry.calculus.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, t: (k, fb) => MARK + fb }, extra || {})));
  }
  root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(App)));
}
// Math, numbers and formulas need no translation: a text node with no run of 3+ letters
// that is not a function name or a variable.
const MATH_WORDS = /\b(sin|cos|tan|sqrt|ln|log|exp|abs|floor|sign|asin|acos|atan|sec|csc|cot|lim|dx|dt|dy|du|df|ft|in|cm|max|min|n\/a)\b/g;
function untranslated() {
  const out = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode, s = node.nodeValue.trim();
    if (!s || s.includes(MARK)) continue;
    if (node.parentElement.closest('style')) continue;
    const words = s.replace(MATH_WORDS, '').match(/[A-Za-z]{3,}/g);
    if (!words) continue;
    out.push(s.slice(0, 60));
  }
  for (const el of container.querySelectorAll('[aria-label],[placeholder],[title]')) {
    for (const attr of ['aria-label', 'placeholder', 'title']) {
      const v = (el.getAttribute(attr) || '').trim();
      if (!v || v.includes(MARK)) continue;
      if (!(v.replace(MATH_WORDS, '').match(/[A-Za-z]{3,}/g))) continue;
      out.push(attr + ': ' + v.slice(0, 60));
    }
  }
  return out;
}

describe('calculus deep: every visible sentence is translatable', () => {
  const states = [
    { tab: 'integral' }, { tab: 'integral', fnMode: 'typed', fnText: 'sin(x)', mode: 'simpson' }, { tab: 'integral', overUnderChecked: true, overUnderGuess: 'over', predictMode: true, predictSubmitted: true, predictInput: '3' },
    { tab: 'derivative', showDerivTrainer: true }, { tab: 'derivative', fnMode: 'typed', fnText: 'x^3', showDerivTrainer: true, matchQuiz: { seed: 99, band: 'ab', kind: 'deriv', tried: [], picked: null, answered: false } },
    { tab: 'limits', limitMode: 'practice', limitSeed: 777 }, { tab: 'limits', limitMode: 'explore', fnMode: 'typed', fnText: '1/x', limitA: 0, limitCommitted: true, limitTries: 1, limitLastPred: { kind: 'dne' } },
    { tab: 'challenge', calcChallengeMode: 'method', calcQuiz: { mode: 'method', fnText: 'e^x', xMin: 0, xMax: 2, n: 4, answer: 'simpson', choices: ['left', 'midpoint', 'simpson'], errors: { left: 1, midpoint: 0.1, simpson: 0.01 }, answered: true, attempts: 2, tried: ['left', 'midpoint'], mis: 'endpoint_order', correct: false } },
    { tab: 'discover' }, { tab: 'discover', missionIdx: 1, missionStep: 2, missionData: { prediction: 'Midpoint', measured: "Simpson's" } }, { tab: 'discover', missionIdx: 3, missionStep: 0 },
    { tab: 'derivHunt' }
  ].concat(['zoom', 'tangent', 'motion', 'riemann', 'ftc', 'slope', 'chain', 'taylor', 'optim', 'related', 'vor', 'eps'].map((v) => ({ tab: 'visualize', vizView: v })));

  it('leaves no untranslated sentence in any tab, view or panel', async () => {
    const all = [];
    for (const st of states) {
      await mount(st, { isTeacherMode: st.tab === 'challenge' });
      untranslated().forEach((s) => all.push((st.vizView || st.tab) + ': ' + s));
      await React.act(async () => root.unmount()); root = null;
    }
    expect([...new Set(all)]).toEqual([]);
  });
});

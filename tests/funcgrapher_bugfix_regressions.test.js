// Function Grapher bug fixes from the 2026-11-03 depth review:
//   B4 trig c labelled as a vertical shift (it is a phase shift of -c/b),
//   B5 "Explain at my level" sent the absolute-value formula for sqrt/log/rational,
//   B6 challenges showed their answers while the question was open,
//   B7 Compare family buttons named only by glyphs; toggles without aria-pressed.
// Each test mounts the tool with real React 18 in jsdom.
// FUNCGRAPHER_BUGFIX_FILE points the suite at another copy (pre-fix proof).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.FUNCGRAPHER_BUGFIX_FILE || 'stem_lab/stem_tool_funcgrapher.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
const BASE = { type: 'linear', a: 1, b: 0, c: 0, showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false, compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0, aiExplain: '', aiExplainLoading: false };

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, key) => (key === 'then' ? undefined : t[key] || (() => {})) }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  loadTool(FILE, 'funcGrapher');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(patch, overrides) {
  const out = { latest: null, prompts: [] };
  function App() {
    const [state, setState] = React.useState({ funcGrapher: Object.assign({}, BASE, patch) });
    out.latest = state.funcGrapher;
    return window.StemLab._registry.funcGrapher.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const chips = () => [...document.querySelectorAll('span.rounded-full')].map((s) => s.textContent);
const svgTexts = () => [...document.querySelectorAll('svg[role="img"] text')].map((t) => t.textContent);
const buttons = () => [...document.querySelectorAll('button')];
const bodyText = () => document.body.textContent.replace(/\s+/g, ' ');
const ariaText = () => [...document.querySelectorAll('[aria-label]')].map((n) => n.getAttribute('aria-label')).join(' | ');

describe('B4: the trig c is a phase shift', () => {
  it('labels sin(x + 2) as a shift left by 2, not up', async () => {
    await mount({ type: 'trig', a: 1, b: 1, c: 2 });
    expect(chips().join(' | ')).not.toMatch(/Shifted (up|down)/);
    expect(chips().some((c) => /left/.test(c) && /\b2\b/.test(c))).toBe(true);
  });

  it('uses -c/b: sin(2x - 3) shifts right by 1.5', async () => {
    await mount({ type: 'trig', a: 1, b: 2, c: -3 });
    expect(chips().some((c) => /right/.test(c) && /1\.5\b/.test(c))).toBe(true);
  });

  it('keeps vertical-shift chips for families where c is added outside', async () => {
    await mount({ type: 'quadratic', a: 1, b: 0, c: 2 });
    expect(chips()).toContain('Shifted up 2 units');
  });

  it('the guide explains the shift as -c/b', async () => {
    await mount({ type: 'trig', a: 1, b: 1, c: 0, showLearn: true });
    expect(bodyText()).toMatch(/−c\/b/);
    expect(bodyText()).not.toMatch(/phase shift \(c\) slides the wave left\/right/);
  });
});

describe('B5: "Explain at my level" sends the graphed equation', () => {
  for (const [type, eq] of [['sqrt', 'f(x) = 2√(x + 1) + 3'], ['log', 'f(x) = 2ln(x + 1) + 3'], ['rational', 'f(x) = 2/(x + 1) + 3']]) {
    it(type, async () => {
      const callGemini = vi.fn(() => Promise.resolve('ok'));
      await mount({ type, a: 2, b: 1, c: 3 }, { callGemini });
      const btn = buttons().find((b) => /^Generate AI explanation/.test(b.getAttribute('aria-label') || ''));
      await React.act(() => btn.click());
      const prompt = callGemini.mock.calls.map((c) => c[0]).find((p) => /^Explain this function/.test(p));
      expect(prompt).toContain('Function: ' + eq + '.');
      expect(prompt).not.toContain('|');
    });
  }
});

describe('B6: an open challenge does not show its answer', () => {
  let seq; let k;
  beforeEach(() => { seq = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]; k = 0; });
  async function start(mode) {
    const m = await mount({ type: 'quadratic', a: 1, b: 0, c: 0, fgChallengeMode: mode, fgGradeOverride: '9-12' });
    vi.spyOn(Math, 'random').mockImplementation(() => seq[k++ % seq.length]);
    await React.act(() => document.querySelector('button[aria-label="Start Challenge"]').click());
    return m;
  }
  async function answerWrong(m) {
    const q = m.latest.fgQuiz;
    const wrong = q.opts.find((o) => (q.answers ? q.answers.indexOf(o) < 0 : o !== q.answer));
    const btn = buttons().find((b) => b.getAttribute('aria-label') === 'Select answer: ' + String(wrong));
    await React.act(() => btn.click());
  }

  it('Find the Root hides the root chip and root labels until answered', async () => {
    const m = await start('root');
    const q = m.latest.fgQuiz;
    expect(q.mode).toBe('root');
    const answers = (q.answers || [q.answer]).map((r) => Number(r).toFixed(2));
    expect(bodyText()).not.toMatch(/roots?: x =/);
    expect(svgTexts().filter((t) => answers.includes(t))).toEqual([]);
    expect(ariaText()).not.toMatch(/roots?: x =/);
    await answerWrong(m);
    expect(bodyText()).toMatch(/roots?: x =/);
    expect(svgTexts().some((t) => answers.includes(t))).toBe(true);
  });

  it('Y-Intercept hides the y-intercept chip and label until answered', async () => {
    const m = await start('yint');
    const q = m.latest.fgQuiz;
    expect(q.mode).toBe('yint');
    const label = '(0, ' + Number(q.answer).toFixed(1) + ')';
    expect(bodyText()).not.toMatch(/y-int: /);
    expect(svgTexts()).not.toContain(label);
    await answerWrong(m);
    expect(bodyText()).toMatch(/y-int: /);
    expect(svgTexts()).toContain(label);
  });

  it('Name That Graph hides the family highlight, header metric and equation until answered', async () => {
    const m = await start('name');
    const q = m.latest.fgQuiz;
    expect(q.mode).toBe('name');
    expect(m.latest.type).toBe(q.type);
    const familyButtons = () => [...document.querySelectorAll('[aria-label="Function families"] button')];
    expect(familyButtons().filter((b) => /bg-indigo-600/.test(b.className))).toEqual([]);
    expect(svgTexts().filter((t) => /^f\(x\) = (?!\?)/.test(t))).toEqual([]);
    // The header's Family metric repeats the family button's text (glyph + name).
    const typeButtonText = familyButtons().map((b) => b.textContent);
    const quizIndex = ['linear', 'quadratic', 'cubic', 'trig', 'exponential', 'absolute', 'sqrt', 'log', 'rational'].indexOf(q.type);
    expect(quizIndex).toBeGreaterThan(-1);
    expect(document.querySelector('[data-funcgrapher-command]').textContent).not.toContain(typeButtonText[quizIndex]);
    // Linear is the quiz family here (Math.random() = 0); its "Slope =" chip names it too.
    expect(chips().join(' | ')).not.toMatch(/Slope =/);
    await answerWrong(m);
    expect(familyButtons().filter((b) => /bg-indigo-600/.test(b.className)).length).toBe(1);
    expect(document.querySelector('[data-funcgrapher-command]').textContent).toContain(typeButtonText[quizIndex]);
    expect(svgTexts().some((t) => /^f\(x\) = (?!\?)/.test(t))).toBe(true);
  });
});

describe('B7: compare and challenge toggles expose names and state', () => {
  it('names each Compare family button by its family and reports the pressed state', async () => {
    await mount({ compare: true, compareType: 'quadratic' });
    const toggle = buttons().find((b) => /^\S+ Comparing$/.test(b.textContent));
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const familyNames = [...document.querySelectorAll('[aria-label="Function families"] button')].map((b) => b.textContent.replace(/^\S+\s/, ''));
    const cmp = buttons().filter((b) => familyNames.includes(b.getAttribute('aria-label')));
    expect(cmp.length).toBe(9);
    expect(cmp.filter((b) => b.getAttribute('aria-pressed') === 'true').length).toBe(1);
    expect(cmp.filter((b) => b.getAttribute('aria-pressed') === 'false').length).toBe(8);
  });

  it('the Compare toggle reports false when off', async () => {
    await mount({ compare: false });
    const toggle = buttons().find((b) => /^\S+ Compare$/.test(b.textContent));
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('challenge-mode buttons report which mode is active', async () => {
    await mount({ fgChallengeMode: 'root' });
    const modes = buttons().filter((b) => /Name That Graph|Find the Root|Y-Intercept\?|True or False\?/.test(b.textContent));
    expect(modes.length).toBe(4);
    expect(modes.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
  });
});

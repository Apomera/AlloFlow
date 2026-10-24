// Math review (algebra lane): Calculus method allow-list, the explore_integral quest,
// and once-only mission rewards. MATH_REVIEW_CALCULUS points the suite at another
// copy of the tool (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_CALCULUS || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let cfg;
beforeEach(() => { resetStemLab(); cfg = loadTool(FILE, 'calculus'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

describe('Riemann method', () => {
  it("falls back to Left for the host's starter mode 'riemann'", () => {
    const html = renderTool('calculus', { calculus: { tab: 'integral', mode: 'riemann', n: 8 } });
    expect(html).not.toContain('(riemann)');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Left</);
  });
});

describe('explore_integral quest', () => {
  const hook = () => cfg.questHooks.find((h) => h.id === 'explore_integral');
  it('is not complete before the student does anything', () => {
    expect(hook().check({})).toBe(false);
    expect(hook().check({ mode: 'riemann', n: 8 })).toBe(false);
    expect(hook().check({ methodsUsed: { trapezoid: true } })).toBe(true);
  });

  it('completes when the student moves the subdivisions slider', async () => {
    let latest;
    function App() {
      const [state, setState] = React.useState({ calculus: { tab: 'integral' } });
      latest = state;
      return cfg.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const slider = document.querySelector('input[aria-label="n (subdivisions)"]');
    expect(slider).toBeTruthy();
    await React.act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '30');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(latest.calculus.n).toBe(30);
    expect(hook().check(latest.calculus)).toBe(true);
  });
});

describe('challenge generators', () => {
  it('counts one rectangle as a Left sum when finding the smallest n', () => {
    // f(x) = -x^2 + x on [0, 2]: exact -2/3, n = 1 gives 0, error 0.667 < 1.
    expect(window.__CalculusCore.minimumLeftSubdivisions(-1, 1, 0, 2, 1, 200)).toBe(1);
    expect(window.__CalculusCore.minimumLeftSubdivisions(2, 1, 0, 3, 0.25, 200)).toBeGreaterThan(100);
  });

  it('does not drop an old-type quiz into a newly chosen challenge type', async () => {
    vi.useFakeTimers();
    try {
      let latest;
      function App() {
        const [state, setState] = React.useState({ calculus: { tab: 'challenge', calcChallengeMode: 'exact', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, _calcExactInput: '9',
          calcQuiz: { mode: 'exact', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, answer: 9, answered: false, question: 'Compute the integral of x^2 from 0 to 3.', hint: '' } } });
        latest = state;
        return cfg.render(makeCtx({ toolData: state, setToolData: setState, addToast: vi.fn(), awardXP: vi.fn() }));
      }
      root = ReactDOMClient.createRoot(document.getElementById('root'));
      await React.act(() => root.render(React.createElement(App)));
      await React.act(() => document.querySelector('button[aria-label="Check"]').click());
      expect(latest.calculus.calcQuiz.correct).toBe(true);
      const overUnder = [...document.querySelectorAll('button[aria-label]')].find((b) => /Over or Under/.test(b.getAttribute('aria-label')));
      await React.act(() => overUnder.click());
      await React.act(() => { vi.advanceTimersByTime(2500); });
      expect(latest.calculus.calcChallengeMode).toBe('overunder');
      expect(latest.calculus.calcQuiz == null || latest.calculus.calcQuiz.mode === 'overunder').toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('discovery missions', () => {
  it('pays each completed mission once, however often the panel re-renders', () => {
    const missions = [
      { missionIdx: 0, missionStep: 4, missionData: { err4: '3.09', prediction1: 'half', err8: '1.62', predictN16: '0.8', err16: '0.83' } },
      { missionIdx: 2, missionStep: 3, missionData: { slope2x: '4' } },
      { missionIdx: 3, missionStep: 3, missionData: { predict5: '25' } }
    ];
    for (const m of missions) {
      const store = newStore({ calculus: Object.assign({ tab: 'discover' }, m) });
      const awards = [];
      // Like the host, an award writes XP state, which re-renders the tool.
      const awardXP = (id, pts, reason) => { awards.push(reason); store.dirty = true; };
      for (let pass = 0; pass < 10; pass++) {
        const ctx = makeCtx({ toolData: store.toolData, awardXP }, store);
        ReactDOMServer.renderToStaticMarkup(React.createElement(function C() { return cfg.render(ctx); }));
      }
      const missionAwards = awards.filter((r) => /^Mission \d complete$/.test(r));
      expect(missionAwards.length, 'mission ' + (m.missionIdx + 1)).toBe(1);
    }
  });
});

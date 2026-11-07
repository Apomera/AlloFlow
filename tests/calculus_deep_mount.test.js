// Calculus deep rebuild (2026-11-03): every tab, every Visualize view, both bands and the
// teacher panel mount in jsdom without a console error, and every visible control has a name.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let container = null;
let errors = [];

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 400)); });
  loadTool(FILE, 'calculus');
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
});

async function mount(init, extra) {
  const out = { latest: null, xp: [] };
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    out.latest = state.calculus;
    return window.StemLab._registry.calculus.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: (id, n, why) => out.xp.push([id, n, why]), addToast: () => {} }, extra || {})));
  }
  root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(App)));
  return out;
}
async function unmount() { if (root) await React.act(async () => root.unmount()); root = null; }

function unnamedControls() {
  return [...container.querySelectorAll('button, input, select, textarea')].filter((el) => {
    if (el.type === 'hidden') return false;
    const name = (el.getAttribute('aria-label') || '').trim() || (el.textContent || '').trim();
    if (name) return false;
    if (el.id && container.querySelector('label[for="' + el.id + '"]')) return false;
    if (el.closest('label')) return false;
    if (el.getAttribute('aria-labelledby')) return false;
    return true;
  }).map((el) => el.outerHTML.slice(0, 120));
}

describe('calculus deep: mounts cleanly', () => {
  for (const tab of ['integral', 'derivative', 'limits', 'visualize', 'challenge', 'discover', 'derivHunt']) {
    for (const extra of [{}, { fnMode: 'typed', fnText: 'sin(x) + x/2' }]) {
      it('tab ' + tab + (extra.fnMode ? ' with a typed function' : ''), async () => {
        await mount(Object.assign({ tab }, extra));
        expect(errors, errors.join('\n')).toEqual([]);
        expect(container.textContent).not.toMatch(/\bNaN\b|undefined\b(?! here)|Infinity/);
        expect(unnamedControls()).toEqual([]);
      });
    }
  }

  for (const view of ['zoom', 'tangent', 'motion', 'riemann', 'ftc', 'slope', 'chain', 'taylor', 'optim', 'related', 'vor', 'eps']) {
    it('visualize view ' + view + ' has its own controls and a live description', async () => {
      await mount({ tab: 'visualize', vizView: view });
      expect(errors, errors.join('\n')).toEqual([]);
      const group = container.querySelector('[role="group"][aria-label="Visualization controls"]');
      expect(group, 'controls group').toBeTruthy();
      expect(group.querySelectorAll('input, button').length, 'controls in ' + view).toBeGreaterThan(0);
      const desc = container.querySelector('#calc-viz-desc');
      expect(desc.getAttribute('aria-live')).toBe('polite');
      expect(desc.textContent.length).toBeGreaterThan(30);
      expect(container.querySelector('canvas').getAttribute('aria-describedby')).toBe('calc-viz-desc');
    });

    it('visualize view ' + view + ' draws frames, animated and under reduced motion, without throwing', async () => {
      const queue = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { queue.push(cb); return queue.length; });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
      for (const reduce of [false, true]) {
        window.matchMedia = (q) => ({ matches: reduce && /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
        await mount({ tab: 'visualize', vizView: view, vizEpsChecked: { fn: 'square', eps: 1, delta: 0.5, trapped: false, worstX: 2.4, worstY: 5.76 }, vizOptimReveal: true });
        for (let frame = 0; frame < 3; frame++) {
          const batch = queue.splice(0);
          await React.act(async () => { batch.forEach((cb) => cb(frame * 16)); });
        }
        await unmount();
      }
      delete window.matchMedia;
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  it('teacher panel, all three bands and the limits practice mount', async () => {
    for (const calcBand of ['pre', 'ab', 'bc']) {
      await mount({ tab: 'challenge', calcBand, calcChallengeMode: 'estimate' }, { isTeacherMode: true });
      expect(container.querySelector('[data-calculus-teacher]')).toBeTruthy();
      await unmount();
      await mount({ tab: 'limits', calcBand, limitMode: 'practice', limitSeed: 12345 });
      expect(container.textContent).toContain('Find the limit of');
      await unmount();
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  it('old saved state (legacy quiz shapes, stale keys) still loads', async () => {
    await mount({ tab: 'challenge', calcChallengeMode: 'method', calcQuiz: { mode: 'method', a: 1, b: 0, c: 0, xMin: 0, xMax: 2, n: 4, answer: 'simpson', answerLabel: "Simpson's", opts: [{ id: 'left', label: 'Left Riemann' }, { id: 'simpson', label: "Simpson's" }], errors: { left: 1, simpson: 0 }, answered: false, question: 'old' }, missionXP: { m1: true }, vizUserInteracted: { x0: true }, derivHunt: { a: 1, b: 0, c: 0, xPoint: 1, log: [{ a: 1, b: 0, c: 0, x: 0, d: '0.00', st: 'extremum' }] } });
    expect(errors, errors.join('\n')).toEqual([]);
    expect(container.textContent).toContain("Simpson's");
  });
});

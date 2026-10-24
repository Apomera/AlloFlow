import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
let root, host, queue, now, seq;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear();
  queue = []; now = 0; seq = 0;
  const raf = callback => { queue.push({ id: ++seq, callback }); return seq; };
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', id => { queue = queue.filter(item => item.id !== id); });
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return new Proxy({ canvas: this }, { get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return () => ({ width: 20 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    } });
  });
  resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null; host?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(extra = {}, contrast = false) {
  let latest; const updates = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'speedChallenge', ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { updates.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); },
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, updates };
}
async function frames(count) {
  for (let i = 0; i < count; i++) {
    now += 100; const current = queue; queue = [];
    await React.act(() => current.forEach(item => item.callback(now)));
  }
}
async function click(selector) { await React.act(() => host.querySelector(selector).click()); }
async function button(text) {
  const control = [...host.querySelectorAll('button')].find(el => el.textContent.includes(text));
  expect(control, text).toBeTruthy(); await React.act(() => control.click());
}
const panel = () => host.querySelector('[data-run-compare]');
const moment = slot => host.querySelector(`[data-run-pair-slice="${slot}"]`);
const inspector = () => host.querySelector('input[aria-label="Inspect the bead at"]');
async function select(index) { await React.act(() => Simulate.change(inspector(), { target: { value: String(index) } })); }
async function finish() {
  await button('Strike the arc');
  for (let i = 0; i < 600 && !panel(); i++) await frames(1);
  expect(panel()).toBeTruthy();
}

describe('Recorded live-run comparison', () => {
  it('offers comparison only after a recorded slice and never fabricates a reference', async () => {
    await mount(); expect(panel()).toBeNull();
    await button('Strike the arc'); await frames(1); await button('Stop run');
    expect(panel()).toBeNull();
    await button('Try again'); await button('Strike the arc'); await frames(30); await button('Stop run');
    expect(panel().dataset.referenceIndex).toBe('-1');
    expect(moment('reference')).toBeNull(); expect(host.querySelector('[data-run-pin-marker]')).toBeNull();
  });

  it('pins an actual recorded slice, follows the inspector and calculates exact signed deltas without score writes', async () => {
    const app = await mount(); await finish(); await select(0); await click('[data-run-pin]');
    const reference = { ...moment('reference').dataset };
    const saved = JSON.stringify(app.latest()), best = localStorage.getItem('weldLab.speed.best.v1'), writes = app.updates.length;
    await select(Number(inspector().max));
    expect(moment('reference').dataset).toMatchObject(reference);
    expect(Number(moment('current').dataset.thickness)).toBe(0.125);
    expect(Number(moment('reference').dataset.thickness)).toBe(0.25);
    expect(Number(moment('current').dataset.positionIn)).toBeGreaterThan(Number(reference.positionIn));
    for (const [key, dataset] of [['TS', 'travel'], ['aEff', 'arcAmps'], ['net', 'net'], ['pen', 'penetration']]) {
      expect(Number(host.querySelector(`[data-run-pair-delta="${key}"]`).dataset.value)).toBeCloseTo(Number(moment('current').dataset[dataset]) - Number(reference[dataset]), 12);
    }
    expect(moment('current').querySelector('svg').getAttribute('viewBox')).toBe(moment('reference').querySelector('svg').getAttribute('viewBox'));
    expect(moment('reference').querySelector('svg').getAttribute('aria-label')).toContain(Number(reference.penetration).toFixed(3));
    expect(host.querySelector('[data-run-pin-marker]').dataset.runPinMarker).toBe('0');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(localStorage.getItem('weldLab.speed.best.v1')).toBe(best); expect(app.updates).toHaveLength(writes);
    await click('[data-run-pin]');
    expect(moment('reference').dataset.sliceIndex).toBe(moment('current').dataset.sliceIndex);
    expect(host.querySelector('[data-run-pin]').disabled).toBe(true);
    await click('[data-run-clear-pin]');
    expect(moment('reference')).toBeNull(); expect(host.querySelector('[data-run-pin-marker]')).toBeNull();
  });

  it('supports stopped partial runs without recording a best or rotating the prediction', async () => {
    const app = await mount({ sc_tier: 'pro' });
    await button('Strike the arc'); await frames(80); await button('Stop run'); await select(0); await click('[data-run-pin]');
    await select(Number(inspector().max));
    expect(moment('reference')).toBeTruthy(); expect(moment('current')).toBeTruthy();
    expect(host.textContent).toContain('no score recorded');
    expect(app.updates.filter(([key]) => key === 'speedBest' || key === 'run_predIdx')).toEqual([]);
    expect(localStorage.getItem('weldLab.speed.best.v1')).toBeNull();
  });

  it('fits wide recorded profiles to one shared scale without flattening width or reinforcement differences', async () => {
    await mount(); await button('Strike the arc'); await frames(40);
    for (const [label, value] of [['Travel speed', 5], ['Amperage (wire feed)', 260], ['Voltage (arc length)', 32]]) {
      const slider = host.querySelector(`input[aria-label="${label}"]`);
      expect(slider, label).toBeTruthy();
      await React.act(() => Simulate.change(slider, { target: { value: String(value) } }));
    }
    await frames(40); await button('Stop run'); await select(0); await click('[data-run-pin]');
    await select(Number(inspector().max));
    const ref = moment('reference'), current = moment('current');
    expect(Number(current.dataset.width)).toBeGreaterThan(0.7);
    expect(Number(current.dataset.width)).toBeGreaterThan(Number(ref.dataset.width));
    const scale = Number(ref.querySelector('svg').dataset.runSectionScale);
    expect(Number(current.querySelector('svg').dataset.runSectionScale)).toBe(scale);
    for (const card of [ref, current]) {
      const points = card.querySelector('[data-run-section-crown]').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      expect(points[4] - points[0]).toBeCloseTo(Number(card.dataset.width) * scale, 10);
      expect((42 - points[3]) / 2).toBeCloseTo(Number(card.dataset.reinforcement) * scale, 10);
      expect(Number(card.dataset.width) * scale).toBeLessThanOrEqual(200.000001);
      expect(Number(card.dataset.reinforcement) * scale).toBeLessThanOrEqual(30.000001);
      expect(Number(card.dataset.thickness) * scale).toBeLessThanOrEqual(75.000001);
    }
  });

  it('clears the reference on a new joint and a tier change', async () => {
    await mount(); await finish(); await click('[data-run-pin]');
    await button('Try again'); expect(panel()).toBeNull();
    await button('Strike the arc'); await frames(30); await button('Stop run');
    expect(panel().dataset.referenceIndex).toBe('-1'); await click('[data-run-pin]');
    const pro = [...host.querySelectorAll('[role="radio"]')].find(el => el.textContent.includes('Production line'));
    await React.act(() => pro.click()); expect(panel()).toBeNull();
    await button('Strike the arc'); await frames(30); await button('Stop run');
    expect(panel().dataset.referenceIndex).toBe('-1');
  });

  it('uses native manual controls, readable values and explicit contrast', async () => {
    await mount({}, true); await button('Strike the arc'); await frames(40); await button('Stop run'); await click('[data-run-pin]');
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const control of panel().querySelectorAll('button')) {
      expect(control.type).toBe('button'); expect(control.style.minHeight).toBe('44px');
      expect(control.style.background).toBe('rgb(0, 0, 0)'); expect(control.style.color).toBe('rgb(255, 255, 0)');
    }
    expect(panel().querySelectorAll('[data-run-pair-slice] svg')).toHaveLength(2);
    expect(panel().querySelector('animate,animateTransform')).toBeNull();
    expect(panel().textContent).toContain('does not isolate one cause or recalculate your score');
    expect(panel().textContent).not.toMatch(/NaN|undefined/);
  });
});

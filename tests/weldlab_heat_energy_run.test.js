import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});
function fragment(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { view: 'heatInput', ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'heatInput', ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData,
      update: (bucket, key, value) => setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })),
    }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
const balance = el => {
  const data = el.querySelector('[data-hi-energy-balance]').dataset;
  return { gross: Number(data.gross), delivered: Number(data.delivered), loss: Number(data.loss) };
};

describe('Heat Input one-inch energy run', () => {
  it.each(['mig', 'tig', 'stick', 'oxy'])('accounts for distance, time and the existing %s efficiency', process => {
    const core = window.__WeldLabCore;
    for (const progress of [0, 1, 37, 50, 100]) {
      const el = fragment({ hi_V: 24, hi_A: 200, hi_TS: 16, hi_process: process, hi3_progress: progress });
      const distance = progress / 100, gross = core.heatInputGross(24, 200, 16) * distance;
      const energy = balance(el);
      expect(energy.gross).toBeCloseTo(gross, 10);
      expect(energy.delivered).toBeCloseTo(gross * core.ARC_EFFICIENCY[process], 10);
      expect(energy.delivered + energy.loss).toBeCloseTo(energy.gross, 10);
      expect(el.querySelector('[data-hi-energy-value="time"]').textContent).toBe((60 / 16 * distance).toFixed(2) + ' s');
      expect(el.querySelector('[data-hi-run-torch]').getAttribute('transform')).toBe('translate(' + (60 + 520 * distance) + ' 0)');
      expect(el.querySelectorAll('[data-hi-run-track]')).toHaveLength(progress > 0 ? 1 : 0);
    }
  });

  it('moves only the inspection distance and preserves the notebook and calculator settings', async () => {
    const notebook = { hypothesis: 'Speed changes time', log: [{ V: 22, A: 180, TS: 12, P: 'mig', net: 15.8, tier: 'MEDIUM' }], explanation: '', understood: false };
    const current = await mount({ hi_V: 22, hi_A: 180, hi_TS: 12, hi_process: 'mig', hi_inquiry: notebook });
    await React.act(() => host.querySelector('[data-hi-stop="100"]').click());
    expect(current()).toMatchObject({ hi3_progress: 100, hi_V: 22, hi_A: 180, hi_TS: 12, hi_process: 'mig', hi_inquiry: notebook });
    await React.act(() => Simulate.change(host.querySelector('[data-hi-distance-control]'), { target: { value: '25' } }));
    expect(current().hi3_progress).toBe(25);
    expect(host.querySelector('[data-hi-distance]').textContent).toBe('0.25 in / 1.00 in');
    await React.act(() => host.querySelector('[data-hi-stop="0"]').click());
    expect(balance(host)).toEqual({ gross: 0, delivered: 0, loss: 0 });
    expect(host.querySelector('[data-hi-energy-value="time"]').textContent).toBe('0.00 s');
  });

  it('keeps distance fixed when speed changes, halves time and energy, and follows process selection', async () => {
    await mount({ hi_TS: 12, hi3_progress: 50 });
    const old = balance(host), oldTime = Number(host.querySelector('[data-hi-energy-value="time"]').textContent.split(' ')[0]);
    await React.act(() => Simulate.change(host.querySelector('input[aria-label="Travel Speed"]'), { target: { value: '24' } }));
    expect(Number(host.querySelector('[data-hi-energy-run]').dataset.distance)).toBe(0.5);
    expect(balance(host).gross).toBeCloseTo(old.gross / 2, 10);
    expect(Number(host.querySelector('[data-hi-energy-value="time"]').textContent.split(' ')[0])).toBe(oldTime / 2);
    const tig = [...host.querySelectorAll('[role="radio"]')].find(el => el.textContent === 'TIG / GTAW');
    await React.act(() => tig.click());
    expect(balance(host).gross).toBeCloseTo(old.gross / 2, 10);
    expect(balance(host).delivered).toBeCloseTo(balance(host).gross * window.__WeldLabCore.ARC_EFFICIENCY.tig, 10);
  });

  it('normalizes malformed saved distance and keeps native controls labelled in contrast mode', () => {
    for (const [raw, expected] of [[-5, 0], [400, 1], ['bad', 0.5], [null, 0.5], [Infinity, 0.5]]) {
      const el = fragment({ hi3_progress: raw, hi_process: '__proto__' }, true);
      const scene = el.querySelector('[data-hi-energy-run]');
      expect(Number(scene.dataset.distance)).toBe(expected);
      expect(scene.textContent).not.toMatch(/NaN|undefined/);
      expect(scene.style.color).toBe('rgb(255, 255, 255)');
      expect(scene.querySelector('label[for="hi3-run-distance"]')).toBeTruthy();
      expect(scene.querySelector('input').getAttribute('aria-valuetext')).toBe(expected.toFixed(2) + ' in / 1.00 in');
      expect(scene.querySelectorAll('button[type="button"]')).toHaveLength(3);
    }
  });
});

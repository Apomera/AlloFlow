import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
let root, host;
const initial = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'estimate', sym2_m_score: 4, sym2_m_tries: 8, mb_q_score: 2 };
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: initial }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-math-paid-hour]');
const value = key => Number(panel().querySelector(`[data-math-hour-value="${key}"]`).dataset.value);
async function change(selector, value) { await React.act(() => Simulate.change(host.querySelector(selector), { target: { value: String(value) } })); }
async function click(selector) { await React.act(() => host.querySelector(selector).click()); }

describe('Paid-hour estimating workbench', () => {
  it('derives the default hour and three distances from the existing representative rate inputs', async () => {
    await mount();
    expect(panel().dataset).toMatchObject({ travel: '11.5', factor: '0.35', passes: '1' });
    const time = panel().querySelector('[data-math-hour-time]');
    expect(Number(time.dataset.arcMinutes)).toBe(21); expect(Number(time.dataset.otherMinutes)).toBe(39);
    expect(value('arc')).toBe(57.5); expect(value('deposited')).toBeCloseTo(20.125, 12); expect(value('finished')).toBe(value('deposited'));
    expect(panel().textContent).toContain('Grouped totals, not a schedule');
  });

  it('separates the effects of travel, arc-on share and passes while preserving all first-try scores', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await change('[data-math-hour-travel]', 15); expect(value('arc')).toBe(75);
    await change('[data-math-hour-factor]', 50); expect(value('deposited')).toBe(37.5);
    await click('[data-math-hour-passes="3"]'); expect(value('finished')).toBe(12.5);
    expect(value('deposited')).toBe(37.5); expect(value('arc')).toBe(75);
    expect(Number(panel().querySelector('[data-math-hour-time]').dataset.arcMinutes)).toBe(30);
    expect(panel().querySelector('[data-math-hour-formula]').textContent).toContain('÷ 3 passes = 12.50 ft');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
  });

  it('loads each table row with its own range and representative factor while retaining the chosen pass count', async () => {
    await mount(); await click('[data-math-hour-passes="2"]');
    for (const [index, lo, hi, factor] of [[0, 8, 15, 35], [1, 15, 25, 35], [2, 10, 18, 35], [3, 4, 7, 25], [4, 3, 6, 20]]) {
      await change('[data-math-hour-process]', index);
      expect(panel().dataset).toMatchObject({ processIndex: String(index), travel: String((lo + hi) / 2), factor: String(factor / 100), passes: '2' });
      const slider = panel().querySelector('[data-math-hour-travel]'); expect(slider.min).toBe(String(lo)); expect(slider.max).toBe(String(hi));
      expect(value('finished')).toBeCloseTo((lo + hi) / 2 * 60 / 12 * factor / 100 / 2, 12);
    }
  });

  it('keeps all distance bars on a shared 0–125 ft ruler, including the maximum and six-pass case', async () => {
    await mount(); await change('[data-math-hour-process]', 1); await change('[data-math-hour-travel]', 25); await change('[data-math-hour-factor]', 100);
    expect(value('arc')).toBe(125); expect(value('deposited')).toBe(125);
    await click('[data-math-hour-passes="6"]'); expect(value('finished')).toBeCloseTo(125 / 6, 12);
    for (const key of ['arc', 'deposited', 'finished']) {
      const bar = panel().querySelector(`[data-math-hour-bar="${key}"]`);
      expect(Number(bar.getAttribute('width'))).toBeCloseTo(value(key) / 125 * 600, 12);
      expect(bar.closest('svg').getAttribute('viewBox')).toBe('0 0 640 34');
    }
    expect(Number(panel().querySelector('[data-math-hour-time]').dataset.otherMinutes)).toBe(0);
  });

  it('bounds what-if inputs, ignores nonnumeric events and restores only the current process', async () => {
    await mount(); await change('[data-math-hour-process]', 4); await change('[data-math-hour-travel]', 90); await change('[data-math-hour-factor]', 0);
    expect(panel().dataset.travel).toBe('6'); expect(panel().dataset.factor).toBe('0.1');
    await change('[data-math-hour-factor]', 'not-a-number'); expect(panel().dataset.factor).toBe('0.1');
    await click('[data-math-hour-passes="5"]'); await click('[data-math-hour-reset]');
    expect(panel().dataset).toMatchObject({ processIndex: '4', travel: '4.5', factor: '0.2', passes: '1' });
    expect(panel().textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('provides labeled native manual controls and an explicit contrast selection', async () => {
    await mount(true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const input of panel().querySelectorAll('input,select')) {
      expect(panel().querySelector(`label[for="${input.id}"]`)).toBeTruthy(); expect(input.style.minHeight).toBe('44px');
    }
    const chosen = panel().querySelector('[data-math-hour-passes="1"]');
    expect(chosen.getAttribute('aria-pressed')).toBe('true'); expect(chosen.style.background).toBe('rgb(255, 255, 0)'); expect(chosen.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-math-hour-passes="2"]').style.background).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('animate,animateTransform')).toBeNull();
  });

  it('keeps estimating visuals out of checked practice and the symbol quiz', () => {
    for (const mb_mode of ['practice', 'quiz']) {
      const html = renderTool('weldLab', { weldLab: { ...initial, mb_mode } });
      expect(html).not.toContain('data-math-paid-hour');
    }
  });
});

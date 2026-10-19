import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const FIX = { target: 'undercut', P: 'mig', TH: 0.25 };
const BASE = { view: 'defectDiagnose', dd2Idx: 1, dd2Shown: [1], dd2Ans: true, dd2Pick: 'heatHigh', dh2_ddSec: 'travelFast', dd2Score: 1, dd2Rounds: 1 };
let root, host;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return new Proxy({ canvas: this }, { get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return () => ({ width: 20 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    } });
  });
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); vi.restoreAllMocks(); });
function render(extra = {}, contrast = false) {
  const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node;
}
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-repair-probe]');
const preview = () => host.querySelector('[data-repair-preview]');
async function click(selector) { await React.act(() => host.querySelector(selector).click()); }
async function change(selector, value) { await React.act(() => Simulate.change(host.querySelector(selector), { target: { value: String(value) } })); }
function checkPreview(dials) {
  const expected = window.__WeldLabCore.dhFixState(FIX, dials.V, dials.A, dials.TS);
  expect(Number(preview().dataset.targetIndex)).toBeCloseTo(expected.target, 12);
  expect(Number(preview().dataset.otherCount)).toBe(expected.others.length);
  expect(Number(preview().dataset.net)).toBeCloseTo(expected.net, 12);
  expect(preview().dataset.cleared).toBe(String(expected.cleared));
  for (const row of preview().querySelectorAll('[data-repair-defect]')) expect(Number(row.dataset.index)).toBeCloseTo(expected.defects[row.dataset.repairDefect], 12);
  return expected;
}

describe('Defect Diagnose single-dial candidate probe', () => {
  it('stays behind diagnosis submission and is absent for cases that cannot be fixed by dials', () => {
    for (const state of [{ dd2Idx: -1 }, { dd2Ans: false }, { dd2Idx: 0 }, { dd2Idx: 4 }, { dd2Idx: 6 }]) expect(render(state).querySelector('[data-repair-probe]')).toBeNull();
    for (const dd2Idx of [1, 2, 3, 5, 7]) expect(render({ dd2Idx }).querySelector('[data-repair-probe]')).toBeTruthy();
  });

  it('samples every valid step of each dial using the original shared model and fixed other settings', async () => {
    await mount();
    for (const [axis, min, max, step] of [['A', 50, 350, 5], ['V', 10, 40, 0.5], ['TS', 3, 30, 0.5]]) {
      await click(`[data-repair-axis="${axis}"]`);
      const target = panel().querySelector('[data-repair-curve="target"]').dataset.values.split(',').map(Number);
      const other = panel().querySelector('[data-repair-curve="other"]').dataset.values.split(',').map(Number);
      expect(target).toHaveLength(Math.round((max - min) / step) + 1);
      for (let i = 0; i < target.length; i++) {
        const dials = { V: 28, A: 280, TS: 20, [axis]: min + i * step }, result = window.__WeldLabCore.dhFixState(FIX, dials.V, dials.A, dials.TS);
        expect(target[i]).toBeCloseTo(result.target, 12);
        expect(other[i]).toBeCloseTo(Math.max(0, ...Object.entries(result.defects).filter(([key]) => key !== FIX.target).map(([, value]) => value)), 12);
      }
      const points = panel().querySelector('[data-repair-curve="target"]').getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
      expect(points[0][0]).toBe(12); expect(points.at(-1)[0]).toBe(628);
      for (let i = 0; i < points.length; i++) expect(points[i][1]).toBeCloseTo(186 - target[i] * 172, 12);
    }
  });

  it('previews a clean candidate without editing the live repair, scores or fixed history until applied', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await change('[data-repair-candidate]', 220); expect(checkPreview({ V: 28, A: 220, TS: 20 }).cleared).toBe(true);
    expect(panel().dataset.liveValue).toBe('280'); expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    await click('[data-repair-apply]'); expect(panel().dataset.liveValue).toBe('220');
    expect(host.querySelector('input[aria-label="Amperage"]').value).toBe('220');
    expect(app.latest().dh2_diag[2].fixed).toBe(true); expect(app.latest().dd2Score).toBe(1); expect(app.latest().dd2Rounds).toBe(1);
    expect(host.querySelector('[data-repair-apply]').disabled).toBe(true);
    const after = app.writes.length; await click('[data-repair-apply]'); expect(app.writes).toHaveLength(after);
  });

  it('shows a new problem when the target disappears but the candidate is not clean', async () => {
    const app = await mount(); await click('[data-repair-axis="TS"]'); await change('[data-repair-candidate]', 3);
    const expected = checkPreview({ V: 28, A: 280, TS: 3 });
    expect(expected.target).toBe(0); expect(expected.others.length).toBeGreaterThan(0); expect(expected.cleared).toBe(false);
    expect(preview().textContent).toContain('Defects reported at this candidate');
    expect(app.latest().dh2_diag).toBeUndefined(); expect(host.querySelector('input[aria-label="Travel speed"]').value).toBe('20');
  });

  it('re-evaluates the retained candidate when a different live dial changes and can resync to the current dial', async () => {
    await mount(); await change('[data-repair-candidate]', 220); await change('input[aria-label="Voltage"]', 20);
    expect(panel().dataset.value).toBe('220'); expect(panel().dataset.fixedV).toBe('20'); checkPreview({ V: 20, A: 220, TS: 20 });
    await change('input[aria-label="Amperage"]', 250); expect(panel().dataset.liveValue).toBe('250'); expect(panel().dataset.value).toBe('220');
    await click('[data-repair-use-current]'); expect(panel().dataset.value).toBe('250'); checkPreview({ V: 20, A: 250, TS: 20 });
  });

  it('ignores nonnumeric probe events, bounds extremes and resets exploration on the next case', async () => {
    const app = await mount(); await change('[data-repair-candidate]', 999); expect(panel().dataset.value).toBe('350');
    await change('[data-repair-candidate]', 'bad'); expect(panel().dataset.value).toBe('350');
    const next = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next defect'));
    await React.act(() => next.click()); expect(app.latest().dd2Idx).not.toBe(1);
    if (panel()) expect(panel().dataset.value).toBe(panel().dataset.liveValue);
  });

  it('transfers the applied candidate through the existing Bead Lab handoff with the original coupon thickness', async () => {
    const app = await mount(); await change('[data-repair-candidate]', 220); await click('[data-repair-apply]');
    const handoff = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Open the Bead Lab'));
    await React.act(() => handoff.click());
    expect(app.latest()).toMatchObject({ view: 'beadLab', bl_A: 220, bl_V: 28, bl_TS: 20, bl_thickness: 0.25, bl_process: 'mig', dd2Score: 1, dd2Rounds: 1 });
  });

  it('uses native labeled manual controls, explicit contrast selection and a textual preview', async () => {
    await mount({}, true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const control of panel().querySelectorAll('button,input')) expect(control.style.minHeight).toBe('44px');
    const selected = panel().querySelector('[data-repair-axis="A"]'); expect(selected.style.background).toBe('rgb(255, 255, 0)'); expect(selected.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('label[for="repair6-candidate"]')).toBeTruthy(); expect(panel().querySelector('animate,animateTransform')).toBeNull();
    expect(panel().textContent).toContain('not a probability or an acceptance decision'); expect(panel().textContent).not.toMatch(/NaN|Infinity|undefined/);
  });
});

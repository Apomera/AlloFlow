import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { stripT85Sweep } from './helpers/weldlab_t85_sweep_preservation.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'metallurgy', met_sect: 'haz', met2_hazH: 16, met2_hazTh: 0.25, met2_hazT0F: 70 };
let host, root;
const core = () => window.__WeldLabCore;
const sweep = el => el.querySelector('[data-t85-sweep]');
const n = (el, attribute) => Number(el.getAttribute(attribute));
const estimate = (heat, thickness, preheat) => core().met2T85(heat * (1000 / 25.4) / 1000, thickness * 25.4, (preheat - 32) * 5 / 9);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null; host?.remove(); host = null;
});
function render(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}, contrast = false) {
  let latest, writes = 0;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    const update = (id, key, value) => { writes++; setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })); };
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast, update }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes: () => writes };
}
async function click(selector) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function probe(value) { await React.act(() => Simulate.change(host.querySelector('[data-t85-probe]'), { target: { value: String(value) } })); }
const reading = (el, id) => n(el.querySelector(`[data-t85-reading="${id}"]`), 'data-value');

describe('local t8/5 thickness sweep', () => {
  it('starts closed, follows the current lab thickness, and retains the original heat-input prediction gate', () => {
    const el = render(), panel = sweep(el), expected = estimate(16, 0.25, 70);
    expect(panel.tagName).toBe('DETAILS'); expect(panel.open).toBe(false);
    expect(n(panel, 'data-probe-in')).toBe(0.25);
    expect(reading(panel, 'probe')).toBeCloseTo(expected.t85, 10);
    expect(panel.dataset.regime).toBe(expected.regime);
    expect(el.querySelector('#met2-haz-h').disabled).toBe(true);
    expect(el.textContent).toContain('Predict first:');
    expect(panel.textContent).toContain('leaves lab settings and answers unchanged');
  });

  it.each([[5, 32], [16, 70], [100, 600]])('uses exact existing model values for every curve sample at %s kJ/in and %s °F', (heat, preheat) => {
    const panel = sweep(render({ met2_hazH: heat, met2_hazT0F: preheat }));
    const curve = panel.querySelector('[data-t85-curve]');
    const thicknesses = curve.dataset.thicknesses.split(' ').map(Number);
    const times = curve.dataset.times.split(' ').map(Number);
    const points = curve.getAttribute('points').split(' ').map(point => point.split(',').map(Number));
    const maximum = estimate(heat, 0.125, preheat).t85;
    expect(thicknesses[0]).toBe(0.125); expect(thicknesses.at(-1)).toBe(2);
    expect(n(panel, 'data-y-max')).toBeCloseTo(maximum, 9);
    expect(panel.querySelector('[data-t85-plot]').dataset.yScale).toBe('linear');
    thicknesses.forEach((thickness, i) => {
      expect(times[i]).toBeCloseTo(estimate(heat, thickness, preheat).t85, 9);
      expect(points[i][0]).toBeCloseTo(96 + (thickness - 0.125) / 1.875 * 576, 9);
      expect(points[i][1]).toBeCloseTo(280 - times[i] / maximum * 240, 9);
      expect(points[i][1]).toBeGreaterThanOrEqual(40 - 1e-8); expect(points[i][1]).toBeLessThanOrEqual(280);
      if (i) expect(times[i]).toBeLessThanOrEqual(times[i - 1] + 1e-8);
    });
    expect(reading(panel, 'plateau')).toBeCloseTo(estimate(heat, 2, preheat).t3, 10);
    expect(reading(panel, 'scale-max')).toBeCloseTo(maximum, 9);
    expect(panel.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('moves the manual cursor on a fixed scale without changing saved settings, predictions, or the original lab marker', async () => {
    const state = await mount({ met2_hazPred: 2, met2_hazPredH0: 16 });
    const before = JSON.stringify(state.latest()), writes = state.writes();
    const originalMarker = host.querySelector('[data-t85-lab-marker]').outerHTML;
    const scale = sweep(host).dataset.yMax, curve = host.querySelector('[data-t85-curve]').outerHTML;
    for (const thickness of [0.125, 0.6, 1.25, 2]) {
      await probe(thickness);
      const panel = sweep(host), expected = estimate(16, thickness, 70);
      expect(n(panel, 'data-probe-in')).toBe(thickness);
      expect(reading(panel, 'probe')).toBeCloseTo(expected.t85, 10);
      expect(panel.querySelector('[data-t85-regime]').dataset.t85Regime).toBe(expected.regime);
      expect(panel.dataset.yMax).toBe(scale);
      expect(panel.querySelector('[data-t85-curve]').outerHTML).toBe(curve);
      expect(panel.querySelector('[data-t85-lab-marker]').outerHTML).toBe(originalMarker);
      expect(n(panel.querySelector('[data-t85-cursor]'), 'x1')).toBeCloseTo(96 + (thickness - 0.125) / 1.875 * 576, 9);
      expect(n(panel.querySelector('[data-t85-marker]'), 'cy')).toBeCloseTo(280 - expected.t85 / Number(scale) * 240, 9);
    }
    expect(JSON.stringify(state.latest())).toBe(before); expect(state.writes()).toBe(writes);
  });

  it('jumps to exact endpoints and an unrounded transition, where the existing 2-D and 3-D estimates agree', async () => {
    await mount();
    await click('[data-t85-set="thin"]'); expect(n(sweep(host), 'data-probe-in')).toBe(0.125);
    await click('[data-t85-set="thick"]'); expect(n(sweep(host), 'data-probe-in')).toBe(2);
    const transition = estimate(16, 0.25, 70).transition / 25.4;
    await click('[data-t85-set="transition"]'); expect(n(sweep(host), 'data-probe-in')).toBe(transition);
    const atTransition = estimate(16, transition, 70);
    expect(reading(sweep(host), 'probe')).toBeCloseTo(atTransition.t3, 9);
    expect(atTransition.t2).toBeCloseTo(atTransition.t3, 9);
    expect(n(host.querySelector('[data-t85-transition]'), 'x1')).toBeCloseTo(96 + (transition - 0.125) / 1.875 * 576, 9);
  });

  it('keeps the complete high-value estimate on a linear scale at the extreme permitted heat/preheat settings', () => {
    const panel = sweep(render({ met2_hazH: 100, met2_hazT0F: 600 }));
    const expected = estimate(100, 0.125, 600);
    expect(expected.transition / 25.4).toBeLessThan(2);
    expect(panel.dataset.transitionPosition).toBe('inside');
    expect(n(panel.querySelector('[data-t85-transition]'), 'data-thickness-in')).toBe(expected.transition / 25.4);
    expect(panel.querySelector('[data-t85-set="transition"]')).toBeTruthy();
    expect(panel.querySelector('[data-t85-outside]')).toBeNull();
    expect(reading(panel, 'scale-max')).toBeCloseTo(expected.t85, 8);
    expect(panel.querySelector('[data-t85-reading="scale-max"]').textContent).toBe(expected.t85.toFixed(3) + ' s');
  });

  it('relinks to lab thickness and inherits heat/preheat changes without writing from the reference control', async () => {
    const state = await mount({ met2_hazPred: 2 });
    await probe(1.8); await click('[data-t85-set="lab"]');
    expect(n(sweep(host), 'data-probe-in')).toBe(0.25);
    await React.act(() => Simulate.change(host.querySelector('#met2-haz-t'), { target: { value: '0.5' } }));
    expect(state.latest().met2_hazTh).toBe(0.5);
    expect(n(sweep(host), 'data-probe-in')).toBe(0.5);
    await probe(0.8);
    await React.act(() => Simulate.change(host.querySelector('#met2-haz-t0'), { target: { value: '200' } }));
    expect(n(sweep(host), 'data-probe-in')).toBe(0.8);
    expect(reading(sweep(host), 'probe')).toBeCloseTo(estimate(16, 0.8, 200).t85, 9);
  });

  it('keeps native controls, readable HTML values, focus styles, and static contrast geometry', () => {
    const panel = sweep(render({}, true));
    expect(panel.style.background).toBe('rgb(0, 0, 0)'); expect(panel.style.color).toBe('rgb(255, 255, 255)');
    const input = panel.querySelector('[data-t85-probe]');
    expect(input.type).toBe('range'); expect(input.min).toBe('0.125'); expect(input.max).toBe('2'); expect(input.step).toBe('any');
    expect(input.style.minHeight).toBe('44px'); expect(input.getAttribute('aria-valuetext')).toContain('seconds');
    expect(panel.querySelector('label').htmlFor).toBe(input.id);
    for (const button of panel.querySelectorAll('button')) expect(button.style.minHeight).toBe('44px');
    expect(panel.querySelector('summary').style.minHeight).toBe('44px');
    expect(panel.querySelector('style').textContent).toContain('focus-visible');
    const svg = panel.querySelector('svg'); expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('White ring'); expect(svg.querySelector('animate,animateTransform')).toBeNull();
    for (const text of svg.querySelectorAll('text')) expect(n(text, 'font-size')).toBeGreaterThanOrEqual(30);
    expect(panel.querySelector('[data-t85-scope]').textContent).toContain('bead-on-plate teaching estimate');
  });

  it('renders only within the existing carbon-steel HAZ cooling block', () => {
    for (const state of [{ met_sect: 'overview' }, { met_sect: 'phase' }, { met_sect: 'ce' }, { met2_hazMat: 'aluminum' }, { met2_hazMat: 'stainless' }]) expect(sweep(render(state))).toBeNull();
    expect(sweep(render({ met2_hazMat: 'steel', met2_hazPred: -1 }))).toBeTruthy();
  });

  it('has a narrow durable reversal that preserves all original metallurgy code and gates', () => {
    const source = readFileSync(resolve(SRC), 'utf8');
    const restored = stripT85Sweep(source);
    expect(restored).not.toContain('renderT85ThicknessSweep');
    expect(restored).not.toContain('t85ProbeState');
    expect(restored).toContain('        function renderT85(m) {');
    expect(restored).toContain("hazMat !== 'steel' ? renderNonSteelNote()");
    expect(restored).toContain('              renderT85(m),');
  });
});

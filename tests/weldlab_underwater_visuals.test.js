import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'underwater', uw_view: 'pressure', tech2_uw_pred: 'skip', uw_depth: 30, uw_tech: 'wet' };
let root, host;
const tech = () => window.__WeldLabCore.tech2;
const query = (hook, node = host) => node.querySelector(`[data-uw-${hook}]`);
const attr = (node, key) => Number(node.getAttribute(key));

beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }
const button = (name) => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === name);
const reading = (id, node = host) => node.querySelector(`[data-uw-probe-reading="${id}"]`);
const card = (id, node = host) => node.querySelector(`[data-uw-probe-card="${id}"]`);
const multiplier = (id, depth = 30) => tech().coolingMultiple(id, depth);

describe('Underwater manual cooling-clock probe', () => {
  it('keeps every probe and specimen behind the existing prediction or explicit skip gate', () => {
    for (const prediction of ['', 'bad', { chosen: true }]) {
      const node = render({ tech2_uw_pred: prediction, uw_probe_time: 10 });
      expect(node.textContent).toContain('Predict first');
      expect(query('cooling-probe', node)).toBeNull();
      expect(query('cooling-graph', node)).toBeNull();
      expect(node.querySelector('[data-uw-probe-time]')).toBeNull();
      expect(node.querySelector('[data-uw-probe-specimen]')).toBeNull();
    }
    for (const prediction of ['faster', 'same', 'slower', 'skip']) {
      expect(query('cooling-probe', render({ tech2_uw_pred: prediction }))).toBeTruthy();
    }
  });

  it('reads the exact single model at one shared time on the graph, HTML and all three specimens', () => {
    for (const depth of [0, 30, 300]) for (const time of [0, 1.25, 3, 40]) {
      const node = render({ uw_depth: depth, uw_probe_time: time });
      expect(attr(query('cooling-probe', node), 'data-uw-cooling-probe')).toBe(time);
      expect(attr(query('cooling-graph', node), 'data-probe-seconds')).toBe(time);
      const cursor = node.querySelector('[data-uw-probe-cursor]');
      expect(attr(cursor, 'x1')).toBeCloseTo(40 + time / 40 * 276, 10);
      for (const id of ['air', 'wet', 'dry']) {
        const expected = tech().coolTemp(multiplier(id, depth), time);
        const marker = node.querySelector(`[data-uw-probe-marker="${id}"]`);
        const specimen = node.querySelector(`[data-uw-probe-specimen="${id}"]`);
        expect(attr(reading(id, node), 'data-temperature-c')).toBeCloseTo(expected, 10);
        expect(reading(id, node).textContent).toBe(expected.toFixed(1) + ' °C');
        expect(attr(marker, 'data-temperature-c')).toBeCloseTo(expected, 10);
        expect(attr(specimen, 'data-temperature-c')).toBeCloseTo(expected, 10);
        expect(attr(marker, 'cx')).toBeCloseTo(attr(cursor, 'x1'), 10);
        expect(attr(marker, 'cy')).toBeCloseTo(190 - expected / 1500 * 178, 10);
        expect(attr(marker, 'cx')).toBeGreaterThanOrEqual(40);
        expect(attr(marker, 'cx')).toBeLessThanOrEqual(316);
        expect(attr(marker, 'cy')).toBeGreaterThanOrEqual(12);
        expect(attr(marker, 'cy')).toBeLessThanOrEqual(190);
        expect(specimen.getAttribute('aria-label')).toContain(expected.toFixed(1) + ' °C');
      }
      expect(node.querySelector('[data-uw-probe-specimen="dry"] [data-uw-probe-habitat]')).toBeTruthy();
      expect(node.querySelector('[data-uw-probe-specimen="wet"] [data-uw-probe-habitat]')).toBeNull();
    }
  });

  it('moves the shared native slider without rewriting technique, depth, predictions or decision answers', async () => {
    const latest = await mount({ tech2_uw_pred: 'same', tech2_uw_pred_from: 10, tech2_uw_dec: { 0: 1 } });
    await change(query('probe-time'), 7.25);
    expect(latest()).toMatchObject({ uw_probe_time: 7.25, uw_depth: 30, uw_tech: 'wet', tech2_uw_pred: 'same', tech2_uw_pred_from: 10, tech2_uw_dec: { 0: 1 } });
    for (const id of ['air', 'wet', 'dry']) expect(attr(reading(id), 'data-temperature-c')).toBeCloseTo(tech().coolTemp(multiplier(id), 7.25), 10);
    expect(query('probe-time').getAttribute('aria-valuetext')).toBe('7.25 seconds after the arc passes');
    expect(attr(reading('wet'), 'data-temperature-c')).toBeLessThan(attr(reading('dry'), 'data-temperature-c'));
    expect(attr(reading('dry'), 'data-temperature-c')).toBeLessThan(attr(reading('air'), 'data-temperature-c'));
  });

  it('jumps to each exact 800/500°C model crossing and accumulates only time actually spent in the window', async () => {
    const latest = await mount();
    for (const id of ['air', 'wet', 'dry']) {
      const t8 = tech().timeAt(multiplier(id), 800), t5 = tech().timeAt(multiplier(id), 500);
      await click(host.querySelector(`[data-uw-probe-jump="${id}:800"]`));
      expect(latest().uw_probe_time).toBe(t8);
      expect(attr(reading(id), 'data-temperature-c')).toBeCloseTo(800, 8);
      expect(card(id).dataset.band).toBe('t85');
      expect(attr(reading(id), 'data-window-seconds')).toBe(0);
      await click(host.querySelector(`[data-uw-probe-jump="${id}:500"]`));
      expect(latest().uw_probe_time).toBe(t5);
      expect(attr(reading(id), 'data-temperature-c')).toBeCloseTo(500, 8);
      expect(card(id).dataset.band).toBe('t85');
      expect(attr(reading(id), 'data-window-seconds')).toBeCloseTo(tech().t85(multiplier(id)), 10);
      await change(query('probe-time'), (t8 + t5) / 2);
      expect(attr(reading(id), 'data-window-seconds')).toBeCloseTo(tech().t85(multiplier(id)) / 2, 9);
    }
    await change(query('probe-time'), 40);
    for (const id of ['air', 'wet', 'dry']) expect(attr(reading(id), 'data-window-seconds')).toBeCloseTo(tech().t85(multiplier(id)), 10);
  });

  it('locates the existing authored temperature bands without claiming phase fractions', () => {
    for (const [temperature, band] of [[900, 'above800'], [650, 't85'], [475, 'aboveMs'], [tech().MS.hi, 'Ms'], [400, 'Ms'], [tech().MS.lo, 'Ms'], [300, 'belowMs']]) {
      const node = render({ uw_probe_time: tech().timeAt(multiplier('wet'), temperature) });
      expect(card('wet', node).dataset.band).toBe(band);
      expect(attr(reading('wet', node), 'data-temperature-c')).toBeCloseTo(temperature, 9);
      expect(query('cooling-probe', node).textContent).not.toMatch(/\d+%.*(?:martensite|ferrite|pearlite)|approved|certified/);
    }
    expect(query('cooling-probe', render()).textContent).toContain('do not predict phase fractions or qualify a diving or welding procedure');
  });

  it('keeps time fixed through depth and technique changes and follows the recalculated curves', async () => {
    const latest = await mount({ uw_probe_time: 3, tech2_uw_pred: 'faster', tech2_uw_pred_from: 30 });
    const air = attr(reading('air'), 'data-temperature-c');
    const depth = [...host.querySelectorAll('input[type="range"]')].find(input => input.getAttribute('aria-label') === 'Depth');
    await change(depth, 150);
    expect(latest()).toMatchObject({ uw_depth: 150, uw_probe_time: 3, tech2_uw_pred: 'faster', tech2_uw_pred_from: 30 });
    expect(attr(reading('wet'), 'data-temperature-c')).toBeCloseTo(tech().coolTemp(multiplier('wet', 150), 3), 10);
    expect(attr(reading('dry'), 'data-temperature-c')).toBeCloseTo(tech().coolTemp(multiplier('dry', 150), 3), 10);
    expect(attr(reading('air'), 'data-temperature-c')).toBe(air);
    await click(button('🛎️ Hyperbaric (dry)'));
    expect(latest()).toMatchObject({ uw_tech: 'dry', uw_probe_time: 3, uw_depth: 150 });
    expect(card('dry').dataset.currentTechnique).toBe('true');
    expect(card('wet').dataset.currentTechnique).toBe('false');
    expect(host.textContent).toContain('Matches the model.');
  });

  it('hides the probe again on Predict again without discarding the manual clock', async () => {
    const latest = await mount({ tech2_uw_pred: 'faster', uw_probe_time: 8 });
    await click(button('Predict again'));
    expect(latest().tech2_uw_pred).toBe('');
    expect(latest().uw_probe_time).toBe(8);
    expect(query('cooling-probe')).toBeNull();
    await click(button('Skip the prediction'));
    expect(latest().tech2_uw_pred).toBe('skip');
    expect(attr(query('cooling-probe'), 'data-uw-cooling-probe')).toBe(8);
  });

  it('bounds saved and manual times, including malformed input, so cursors cannot leave the plot', async () => {
    for (const [raw, expected] of [[-2, 0], [999, 40], ['junk', 3], [Infinity, 3], [{ time: 20 }, 3]]) {
      const node = render({ uw_probe_time: raw });
      expect(attr(query('cooling-probe', node), 'data-uw-cooling-probe')).toBe(expected);
      expect(query('cooling-probe', node).innerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
    }
    await mount({ uw_probe_time: 0 });
    expect(query('probe-step').disabled).toBe(true);
    await click(host.querySelector('[data-uw-probe-step="forward"]'));
    expect(attr(query('cooling-probe'), 'data-uw-cooling-probe')).toBe(0.25);
    await change(query('probe-time'), 900);
    expect(attr(query('cooling-probe'), 'data-uw-cooling-probe')).toBe(40);
    expect(host.querySelector('[data-uw-probe-step="forward"]').disabled).toBe(true);
    await change(query('probe-time'), 'bad');
    expect(attr(query('cooling-probe'), 'data-uw-cooling-probe')).toBe(40);
    await change(query('probe-time'), -8);
    expect(attr(query('cooling-probe'), 'data-uw-cooling-probe')).toBe(0);
  });

  it('provides manual controls, HTML values and explicit contrast without automatic animation', () => {
    const node = render({}, true), probe = query('cooling-probe', node);
    expect(probe.style.background).toBe('rgb(0, 0, 0)');
    expect(probe.style.color).toBe('rgb(255, 255, 255)');
    expect(node.querySelector('[data-uw-probe-time]').getAttribute('type')).toBe('range');
    expect(probe.querySelectorAll('[data-uw-probe-jump]')).toHaveLength(6);
    for (const button of probe.querySelectorAll('button')) {
      expect(button.style.minHeight).toBe('44px');
      expect(button.style.color).toBe('rgb(255, 255, 255)');
      expect(button.style.background).toBe('rgb(0, 0, 0)');
    }
    for (const svg of probe.querySelectorAll('svg')) {
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toContain('schematic cooling point');
      expect(svg.style.width).toBe('100%');
      expect(svg.style.background).toBe('rgb(0, 0, 0)');
    }
    expect(probe.querySelector('animate, animateTransform, canvas')).toBeNull();
  });
});

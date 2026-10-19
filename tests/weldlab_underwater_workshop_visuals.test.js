import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'underwater', uw_view: 'pressure', uw_depth: 66, uw_tech: 'wet', tech2_uw_pred: 'skip' };
let root, host;
const tech = () => window.__WeldLabCore.tech2;
const workshop = (node = host) => node.querySelector('[data-uw-workshop]');
const scene = (method, node = host) => node.querySelector(`[data-uw-workshop-scene="${method}"]`);
const reading = method => host.querySelector(`[data-uw-workshop-reading="${method}"]`);
const num = (node, key) => Number(node.getAttribute(key));
const textButton = text => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === text);

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
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      isContrast: contrast, toolData: data, setToolData: setData,
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
async function station(id) { await click(host.querySelector(`[data-uw-workshop-station="${id}"]`)); }
async function changeDepth(value) {
  const slider = host.querySelector('input[aria-label="Depth"]');
  expect(slider).toBeTruthy();
  await React.act(() => Simulate.change(slider, { target: { value: String(value) } }));
}
async function tab(prefix) { await click([...host.querySelectorAll('[role="tab"]')].find(button => button.textContent.startsWith(prefix))); }

describe('Underwater work-environment inspection workshop', () => {
  it('keeps every cutaway, station and new model reading behind prediction or explicit skip', () => {
    for (const prediction of ['', 'bad', { chosen: true }]) {
      const node = render({ tech2_uw_pred: prediction });
      expect(node.textContent).toContain('Predict first');
      expect(workshop(node)).toBeNull();
      expect(node.querySelector('[data-uw-workshop-station]')).toBeNull();
      expect(node.querySelector('[data-uw-workshop-bubble]')).toBeNull();
    }
    for (const prediction of ['faster', 'same', 'slower', 'skip']) expect(workshop(render({ tech2_uw_pred: prediction }))).toBeTruthy();
    expect(workshop(render({ uw_view: 'intro' }))).toBeNull();
    expect(render({ uw_view: 'intro' }).textContent).toContain('A sealed pressurized chamber');
  });

  it('uses only the exact existing pressure and wet bubble models at the same depth in both methods', () => {
    const habitatPaths = [];
    for (const depth of [0, 33, 66, 150, 300]) {
      const node = render({ uw_depth: depth }), pressure = tech().pressureAtm(depth), scale = tech().bubbleScale(depth);
      const bubble = node.querySelector('[data-uw-workshop-bubble]'), bubbleRead = node.querySelector('[data-uw-workshop-bubble-reading]');
      expect(num(workshop(node), 'data-depth-ft')).toBe(depth);
      expect(num(node.querySelector('[data-uw-workshop-depth]'), 'data-pressure-atm')).toBeCloseTo(pressure, 12);
      expect(num(bubble, 'rx')).toBeCloseTo(44 * scale, 12);
      expect(num(bubble, 'ry')).toBeCloseTo(44 * scale * 0.85, 12);
      expect(num(bubble, 'data-radius-scale')).toBeCloseTo(scale, 12);
      expect(num(bubbleRead, 'data-width-ratio') ** 3).toBeCloseTo(1 / pressure, 12);
      expect(num(bubbleRead, 'data-volume-ratio')).toBeCloseTo(1 / pressure, 12);
      expect(bubbleRead.textContent).toContain(Math.round(scale * 100) + '%');
      expect(bubbleRead.textContent).toContain((100 / pressure).toFixed(1) + '%');
      expect(scene('wet', node).dataset.depthFt).toBe(String(depth));
      expect(scene('dry', node).dataset.depthFt).toBe(String(depth));
      expect(scene('dry', node).querySelector('[data-uw-workshop-bubble]')).toBeNull();
      habitatPaths.push(scene('dry', node).querySelector('[data-uw-workshop-habitat]').getAttribute('d'));
      const marker = node.querySelector('[data-uw-workshop-depth-marker]');
      expect(parseFloat(marker.style.top)).toBeCloseTo(25 + depth / 3, 12);
      expect(node.querySelector('[data-uw-workshop-pressure-reading]').textContent).toContain(pressure.toFixed(1) + ' atm');
    }
    expect(new Set(habitatPaths).size).toBe(1);
  });

  it('links native inspection stations to matching evidence and geometry in both cutaways without writing answers', async () => {
    const latest = await mount({ tech2_uw_pred: 'same', tech2_uw_pred_from: 5, tech2_uw_dec: { 1: 0 }, uw_probe_time: 7.25 });
    const expected = { water: ['welder, electrode and metal', 'Water surrounds the habitat'], boundary: ['Gas and steam bubble', 'water is pushed out with gas'],
      arc: ['Stick (SMAW)', 'GTAW (TIG)'], bead: ['Water touching the finished bead', 'keeps water off the joint'] };
    for (const id of Object.keys(expected)) {
      await station(id);
      expect(workshop().dataset.station).toBe(id);
      expect(host.querySelectorAll('[data-uw-workshop-station][aria-pressed="true"]')).toHaveLength(1);
      for (const [i, method] of ['wet', 'dry'].entries()) {
        expect(reading(method).dataset.station).toBe(id);
        expect(reading(method).textContent).toContain(expected[id][i]);
        expect(scene(method).querySelector('[data-uw-workshop-focus]').dataset.uwWorkshopFocus).toBe(id);
        expect(scene(method).querySelector('[data-uw-workshop-callout][data-selected="true"]').dataset.uwWorkshopCallout).toBe(id);
        expect(scene(method).getAttribute('aria-label')).toContain('66 ft');
      }
    }
    expect(latest()).toMatchObject({ uw_depth: 66, uw_tech: 'wet', uw_probe_time: 7.25, tech2_uw_pred: 'same', tech2_uw_pred_from: 5, tech2_uw_dec: { 1: 0 } });
    expect(Object.keys(latest()).filter(key => key.startsWith('uw5'))).toEqual([]);
  });

  it('follows the selected technique while keeping compare and station choices local and the cooling clock intact', async () => {
    const latest = await mount({ uw_probe_time: 7.25 });
    await station('arc');
    await click(host.querySelector('[data-uw-workshop-compare="selected"]'));
    expect(scene('wet')).toBeTruthy();
    expect(scene('dry')).toBeNull();
    await click(textButton('🛎️ Hyperbaric (dry)'));
    expect(workshop().dataset.uwWorkshop).toBe('dry');
    expect(scene('wet')).toBeNull();
    expect(scene('dry')).toBeTruthy();
    expect(reading('dry').textContent).toContain('GTAW (TIG)');
    await changeDepth(150);
    expect(latest()).toMatchObject({ uw_tech: 'dry', uw_depth: 150, uw_probe_time: 7.25, tech2_uw_pred: 'skip' });
    expect(workshop().dataset.station).toBe('arc');
    expect(num(host.querySelector('[data-uw-probe-reading="wet"]'), 'data-temperature-c')).toBeCloseTo(tech().coolTemp(tech().coolingMultiple('wet', 150), 7.25), 10);
    await click(host.querySelector('[data-uw-workshop-compare="both"]'));
    expect(scene('wet')).toBeTruthy();
    expect(scene('dry')).toBeTruthy();
    expect(host.querySelector('[data-uw-workshop-method="dry"]').dataset.selectedMethod).toBe('true');
    expect(host.querySelector('[data-uw-workshop-method="wet"]').dataset.selectedMethod).toBe('false');
    expect(num(host.querySelector('[data-uw-workshop-bubble]'), 'data-radius-scale')).toBeCloseTo(tech().bubbleScale(150), 12);
  });

  it('retains the original prediction lock, movement threshold and hide-again behavior', async () => {
    const latest = await mount({ tech2_uw_pred: '', uw_probe_time: 8 });
    expect(workshop()).toBeNull();
    await click(textButton('It cools faster'));
    expect(latest()).toMatchObject({ tech2_uw_pred: 'faster', tech2_uw_pred_from: 66 });
    await station('bead');
    await changeDepth(100);
    expect(host.textContent).not.toContain('Matches the model.');
    await changeDepth(130);
    expect(host.textContent).toContain('Matches the model.');
    await click(textButton('Predict again'));
    expect(workshop()).toBeNull();
    expect(host.querySelector('[data-uw-cooling-probe]')).toBeNull();
    expect(latest().uw_probe_time).toBe(8);
    await click(textButton('Skip the prediction'));
    expect(workshop().dataset.station).toBe('bead');
    expect(latest().tech2_uw_pred).toBe('skip');
  });

  it('does not reveal or commit job answers and preserves the original first-answer lock and score', async () => {
    const latest = await mount({ tech2_uw_dec: {} });
    await station('bead');
    await click(textButton('🛎️ Hyperbaric (dry)'));
    expect(latest().tech2_uw_dec).toEqual({});
    expect(workshop().textContent).not.toMatch(/✓ best|your pick|Class O|Score/);
    await tab('3.');
    expect(workshop()).toBeNull();
    expect(host.textContent).toContain('Score 0 / 0');
    expect(host.textContent).not.toContain('✓ best');
    const choices = host.querySelector('[aria-label="Choices for job 1"]');
    await React.act(() => choices.querySelectorAll('button')[1].focus());
    expect(latest().tech2_uw_dec).toEqual({});
    await click(choices.querySelectorAll('button')[1]);
    expect(latest().tech2_uw_dec).toEqual({ 0: 1 });
    expect(host.textContent).toContain('Score 0 / 1');
    expect([...choices.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
    await click(choices.querySelectorAll('button')[0]);
    expect(latest().tech2_uw_dec).toEqual({ 0: 1 });
    await tab('2.');
    await station('water');
    await tab('3.');
    expect(latest().tech2_uw_dec).toEqual({ 0: 1 });
    expect(host.textContent).toContain('Score 0 / 1');
  });

  it('highlights the real gas boundaries and evidence regions rather than a generic middle rectangle', async () => {
    await mount();
    const bubble = scene('wet').querySelector('[data-uw-workshop-bubble]');
    const boundary = scene('wet').querySelector('[data-uw-workshop-focus] ellipse');
    expect(num(boundary, 'cx')).toBe(num(bubble, 'cx'));
    expect(num(boundary, 'cy')).toBe(num(bubble, 'cy'));
    expect(num(boundary, 'rx')).toBeCloseTo(num(bubble, 'rx') + 5, 12);
    expect(boundary.getAttribute('clip-path')).toBe('url(#uw5-bubble-above-plate)');
    expect(scene('dry').querySelector('[data-uw-workshop-focus] path').getAttribute('d')).toBe(scene('dry').querySelector('[data-uw-workshop-habitat]').getAttribute('d'));
    const covers = (rect, x, y) => x >= num(rect, 'x') && x <= num(rect, 'x') + num(rect, 'width') && y >= num(rect, 'y') && y <= num(rect, 'y') + num(rect, 'height');
    await station('water');
    const outside = [...scene('dry').querySelectorAll('[data-uw-workshop-focus] rect')];
    expect(outside.some(rect => covers(rect, 24, 122))).toBe(true);
    expect(outside.some(rect => covers(rect, 336, 130))).toBe(true);
    expect(outside.some(rect => covers(rect, 180, 120))).toBe(false);
    for (const [id, point] of [['arc', [180, 180]], ['bead', [91, 185]]]) {
      await station(id);
      for (const method of ['wet', 'dry']) expect([...scene(method).querySelectorAll('[data-uw-workshop-focus] rect')].some(rect => covers(rect, ...point))).toBe(true);
    }
  });

  it('normalizes untrusted saved inputs using the original bounds without malformed diagrams', () => {
    for (const raw of [-100, 999, 'bad', Infinity, { depth: 70 }]) {
      const node = render({ uw_depth: raw, uw_tech: 'unknown' }), b = workshop(node);
      expect(b.dataset.uwWorkshop).toBe('wet');
      const depth = num(b, 'data-depth-ft');
      expect(depth).toBeGreaterThanOrEqual(0);
      expect(depth).toBeLessThanOrEqual(300);
      expect(num(node.querySelector('[data-uw-workshop-bubble]'), 'rx')).toBeCloseTo(44 * tech().bubbleScale(depth), 12);
      expect(b.outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
    }
  });

  it('uses native manual controls, full-size HTML evidence and distinct contrast states without autoplay', async () => {
    await mount({}, true);
    const b = workshop();
    expect(b.style.background).toBe('rgb(0, 0, 0)');
    expect(b.style.color).toBe('rgb(255, 255, 255)');
    expect(b.querySelector('h3').style.color).toBe('rgb(255, 255, 0)');
    for (const button of b.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4');
      const selected = button.getAttribute('aria-pressed') === 'true';
      expect(button.style.background).toBe(selected ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(button.style.color).toBe(selected ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 0)');
    }
    await React.act(() => b.querySelector('[data-uw-workshop-station="arc"]').focus());
    expect(b.dataset.station).toBe('boundary');
    await station('arc');
    expect(b.querySelector('[data-uw-workshop-station="arc"]').style.background).toBe('rgb(255, 255, 0)');
    expect(b.querySelector('[data-uw-workshop-station="boundary"]').style.background).toBe('rgb(0, 0, 0)');
    for (const method of ['wet', 'dry']) {
      expect(scene(method).style.width).toBe('100%');
      expect(reading(method).style.fontSize).toBe('14px');
      expect(scene(method).getAttribute('aria-label')).toContain('schematic cross-section');
    }
    expect(b.querySelector('animate, animateTransform, canvas, [style*="animation"]')).toBeNull();
    expect(b.textContent).toContain('does not select a repair method or qualify a diving or welding procedure');
    expect(b.textContent).not.toMatch(/safe to dive|approved|certified|\d+.*(?:volts|amps|minutes of decompression)/i);
    const techniqueButtons = host.querySelectorAll('[aria-label="Underwater welding technique"] button');
    expect(techniqueButtons[0].style.background).toBe('rgb(255, 255, 0)');
    expect(techniqueButtons[1].style.background).toBe('rgb(0, 0, 0)');
  });
});

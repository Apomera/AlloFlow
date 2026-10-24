import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'metallurgy', met_sect: 'haz', met2_hazPred: 2 };
const KJIN = 1000 / 25.4;
let root, host;

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
const core = () => window.__WeldLabCore;
const model = (extra = {}) => core().met2HazModel({
  H: (extra.met2_hazH ?? 16) * KJIN,
  t: (extra.met2_hazTh ?? 0.25) * 25.4,
  T0: ((extra.met2_hazT0F ?? 70) - 32) * 5 / 9,
  C: extra.met2_hazC ?? 0.2,
  mode: extra.met2_hazMode ?? 'auto',
});
function render(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
const lens = el => el.querySelector('[data-met-microstructure]');
async function jump(zone) {
  const button = host.querySelector(`[data-met-zone-jump="${zone}"]`);
  expect(button.tagName).toBe('BUTTON');
  await React.act(() => button.click());
}

describe('HAZ microstructure lens', () => {
  it('uses the same actual point, peak temperature and zone as the model across plate and chemistry settings', () => {
    for (const mode of ['auto', 'thin', 'thick']) for (const C of [0.05, 0.2, 0.6]) {
      const setup = { met2_hazMode: mode, met2_hazC: C, met2_hazTh: 1, met2_hazH: 30, met2_hazT0F: 300 };
      const m = model(setup);
      for (const distance of [m.yCg / 2, (m.yCg + m.yA3) / 2, (m.yA3 + m.yA1) / 2, (m.yA1 + m.ySub) / 2, m.ySub + 0.1]) {
        const el = render({ ...setup, met2_hazProbe: distance }), figure = lens(el);
        expect(Number(figure.dataset.probeMm)).toBeCloseTo(distance, 10);
        expect(Number(figure.dataset.peakC)).toBeCloseTo(m.peakAt(distance), 10);
        expect(figure.dataset.metMicrostructure).toBe(m.zoneAt(distance));
        const marker = el.querySelector('[data-met-haz-probe-marker]');
        expect(Number(marker.dataset.distanceMm)).toBeCloseTo(distance, 10);
        expect(marker.dataset.zone).toBe(m.zoneAt(distance));
        expect(figure.querySelector('[data-met-micro-reading]').textContent).toContain(m.peakAt(distance).toFixed(0) + ' °C');
      }
    }
  });

  it('moves a single shared probe to each zone without changing the welding settings or prediction', async () => {
    const latest = await mount();
    const m = model();
    for (const zone of ['cg', 'fg', 'ic', 'sc', 'bm', 'fz']) {
      await jump(zone);
      const distance = latest().met2_hazProbe;
      expect(m.zoneAt(distance)).toBe(zone);
      expect(lens(host).dataset.metMicrostructure).toBe(zone);
      expect(Number(host.querySelector('#met2-haz-probe').value)).toBeCloseTo(distance, 10);
      expect(host.querySelectorAll('[data-met-zone-jump][aria-pressed="true"]')).toHaveLength(1);
      expect(host.querySelector(`[data-met-zone-jump="${zone}"]`).getAttribute('aria-pressed')).toBe('true');
      expect(latest().met2_hazPred).toBe(2);
      expect(latest().met2_hazH).toBeUndefined();
    }
  });

  it('shows only peak transformations and distinguishes coarse, fine, partial and below-A1 structures', async () => {
    await mount();
    const peak = () => host.querySelector('[data-met-micro-lens="peak"]');
    await jump('cg');
    expect(lens(host).textContent).toContain('does not resolve the near-melting phase fields');
    expect(lens(host).textContent).not.toContain('Fully austenitic at peak');
    const coarseGrains = peak().querySelectorAll('[data-met-grain]').length;
    await jump('fg');
    expect(lens(host).textContent).toContain('Fully austenitic at peak');
    expect(peak().querySelectorAll('[data-met-grain]').length).toBeGreaterThan(coarseGrains);
    await jump('ic');
    expect(lens(host).querySelector('[data-met-micro-phase]').textContent).toBe('Ferrite + austenite');
    expect(lens(host).textContent).toContain('some ferrite remains');
    await jump('sc');
    expect(lens(host).textContent).toContain('no new austenite forms');
    await jump('bm');
    expect(lens(host).textContent).toContain('retains the example starting structure');
    await jump('fz');
    expect(peak().querySelectorAll('[data-met-grain]')).toHaveLength(0);
    expect(lens(host).querySelector('[data-met-micro-phase]').textContent).toContain('Liquid');
    expect(lens(host).textContent).toContain('not the final cooled structure');
    expect(lens(host).textContent).toContain('Grain sizes and phase fractions are illustrative');
    expect(lens(host).textContent).toContain('Actual supply condition varies');
  });

  it('responds to slider changes at a fixed physical location instead of locking in the previous zone', async () => {
    const initial = model(), distance = (initial.yCg + initial.yA3) / 2;
    const latest = await mount({ met2_hazProbe: distance });
    expect(lens(host).dataset.metMicrostructure).toBe('fg');
    const slider = host.querySelector('#met2-haz-h');
    expect(slider).toBeTruthy();
    await React.act(() => Simulate.change(slider, { target: { value: '100' } }));
    const m = model({ met2_hazH: 100 });
    expect(latest().met2_hazProbe).toBeCloseTo(distance, 10);
    expect(lens(host).dataset.metMicrostructure).toBe(m.zoneAt(distance));
    expect(Number(lens(host).dataset.peakC)).toBeCloseTo(m.peakAt(distance), 10);
  });

  it('does not claim that every near-melting coarse-zone point is fully austenitic', () => {
    const setup = { met2_hazC: 0.05, met2_hazMode: 'thin' };
    const m = model(setup), distance = core().met2YThin(1450, m.H, m.t, m.T0);
    expect(core().met2FeCPhase(m.C, 1450)).toBe('delta');
    const figure = lens(render({ ...setup, met2_hazProbe: distance }));
    expect(figure.dataset.metMicrostructure).toBe('cg');
    expect(figure.querySelector('[data-met-micro-phase]').textContent).toBe('Grain-growth schematic');
    expect(figure.textContent).toContain('does not resolve the near-melting phase fields');
    expect(figure.textContent).not.toContain('Fully austenitic at peak');
  });

  it('preserves the predict-first gate while allowing inspection of zones', async () => {
    await mount({ met2_hazPred: -1 });
    await jump('cg');
    expect(host.querySelector('#met2-haz-h').disabled).toBe(true);
    expect(host.textContent).not.toContain('Prediction checked');
  });

  it('keeps carbon-steel sketches out of non-steel views', () => {
    for (const material of ['stainless', 'aluminum']) {
      const el = render({ met2_hazMat: material });
      expect(lens(el)).toBeNull();
      expect(el.textContent).toContain(material === 'aluminum' ? 'Aluminum' : 'stainless');
    }
  });

  it('normalizes saved probe extremes and keeps all SVG markers inside their cross-section', () => {
    for (const raw of [null, {}, 'not a number', -40, 400, Infinity]) {
      const el = render({ met2_hazProbe: raw, met2_hazH: 5, met2_hazTh: 2 });
      const figure = lens(el), marker = el.querySelector('[data-met-haz-probe-marker]');
      expect(Number.isFinite(Number(figure.dataset.peakC))).toBe(true);
      expect(Number.isFinite(Number(figure.dataset.probeMm))).toBe(true);
      const ring = marker.querySelector('circle');
      expect(Number(ring.getAttribute('cx'))).toBeGreaterThan(250);
      expect(Number(ring.getAttribute('cx'))).toBeLessThan(490);
      expect(Number(ring.getAttribute('cy'))).toBeGreaterThan(60);
      expect(el.innerHTML).not.toMatch(/(?:NaN|Infinity)/);
    }
  });

  it('keeps both lenses accessible and static with explicit contrasting palettes', () => {
    const el = render({}, true), figure = lens(el);
    const rgb = color => color.match(/\d+/g).map(Number).slice(0, 3);
    const luminance = color => rgb(color).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    expect(figure.style.background).toBe('rgb(0, 0, 0)');
    expect(figure.style.color).toBe('rgb(255, 255, 255)');
    for (const label of figure.querySelectorAll('h4,figcaption,[data-met-micro-reading],[data-met-micro-description],[data-met-micro-phase]')) {
      expect(ratio(label.style.color, figure.style.background)).toBeGreaterThanOrEqual(7);
    }
    for (const image of figure.querySelectorAll('svg')) {
      expect(image.getAttribute('role')).toBe('img');
      expect(image.getAttribute('aria-label')).toBeTruthy();
      expect(image.querySelector('animate,animateTransform')).toBeNull();
    }
    expect(figure.querySelectorAll('button')).toHaveLength(6);
    for (const button of figure.querySelectorAll('button')) {
      expect(button.style.minHeight).toBe('44px');
      expect(button.style.background).toBeTruthy();
      expect(button.style.color).toBeTruthy();
      expect(ratio(button.style.color, button.style.background)).toBeGreaterThanOrEqual(7);
      expect(button.className).toContain('focus:ring-4');
    }
    expect(figure.textContent).toContain('not a measured thermal cycle at the probe');
    expect(figure.textContent).not.toMatch(/(?:HV|micromet|µm|percent martensite)/i);
  });
});

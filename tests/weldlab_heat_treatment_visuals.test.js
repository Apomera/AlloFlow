import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'metallurgy', met_sect: 'pwht', met2_cdPicks: { 0: 1 }, met2_cdIdx: 0, met2_hazPred: 2, met2_ceTally: { n: 4, right: 3 } };
const ROWS = [
  ['stress', 1100, 1250, '1100-1250°F', '1 hr per inch of thickness', 'Reduces residual tensile stresses from welding. Required by the pressure-vessel codes (ASME) above set thicknesses, and used on thick structural welds and fatigue-loaded parts.'],
  ['hydrogen', 400, 600, '400-600°F', '2-4 hr', 'Drives hydrogen out of the weld + HAZ before it can cause cold cracking. Done right after welding, before the part cools.'],
  ['normalize', 1600, 1700, '1600-1700°F (above A3)', '1 hr per inch, then air cool', 'Refines the grain structure of the HAZ and restores impact toughness. Required by some pressure-vessel codes after thick-section welding.'],
  ['anneal', 1500, 1700, '1500-1700°F', 'long, slow furnace cool', 'Maximum softening + grain refinement. Used for parts that will be machined or formed after welding.'],
  ['solution', 1900, 2100, '1900-2100°F', '30 min, then rapid quench', 'Dissolves chromium carbides + restores corrosion resistance after welding non-stabilized austenitic stainless.']
];
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: BASE }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-met-pwht]');
const detail = (slot = 'selected') => panel().querySelector(`[data-met-pwht-detail="${slot}"]`);
const reading = (kind, slot = 'selected') => detail(slot).querySelector(`[data-met-pwht-reading="${kind}"]`).textContent;
const band = id => panel().querySelector(`[data-met-pwht-band="${id}"]`);
async function pick(id) { await React.act(() => panel().querySelector(`[data-met-pwht-pick="${id}"]`).click()); }
async function compare() { await React.act(() => panel().querySelector('[data-met-pwht-compare]').click()); }
async function peer(value) { await React.act(() => Simulate.change(panel().querySelector('[data-met-pwht-peer]'), { target: { value } })); }
async function textButton(text) { const el = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(el).toBeTruthy(); await React.act(() => el.click()); }

describe('PWHT reference-temperature comparison', () => {
  it('starts with all five authored ranges visible and stress-relief details selected', async () => {
    await mount();
    expect(panel().dataset).toMatchObject({ metPwht: 'stress', peer: 'anneal', compare: 'false' });
    expect(panel().querySelectorAll('[data-met-pwht-pick]')).toHaveLength(5);
    expect(panel().querySelectorAll('[data-met-pwht-detail]')).toHaveLength(1);
    expect(reading('range')).toBe('1100-1250°F'); expect(reading('hold')).toBe('1 hr per inch of thickness');
    expect(panel().querySelector('[data-met-pwht-peer]')).toBeNull();
  });

  it('preserves every authored hold, cooling note and purpose when selecting each treatment', async () => {
    await mount();
    for (const [id, lo, hi, range, hold, purpose] of ROWS) {
      await pick(id);
      expect(panel().dataset.metPwht).toBe(id); expect(detail().dataset.treatment).toBe(id);
      expect(reading('range')).toBe(range); expect(reading('hold')).toBe(hold); expect(reading('purpose')).toBe(purpose);
      expect(panel().querySelector(`[data-met-pwht-bounds="${id}"]`).textContent).toBe(range);
      expect(Number(band(id).dataset.min)).toBe(lo); expect(Number(band(id).dataset.max)).toBe(hi);
      expect(panel().querySelector(`[data-met-pwht-pick="${id}"]`).getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('plots every interval on the identical zero-to-2200 scale with physically aligned HTML labels', async () => {
    await mount();
    for (const [id, lo, hi] of ROWS) {
      expect(Number(band(id).getAttribute('x'))).toBeCloseTo(20 + lo / 2200 * 600, 12);
      expect(Number(band(id).getAttribute('width'))).toBeCloseTo((hi - lo) / 2200 * 600, 12);
      const svg = band(id).closest('svg'); expect(svg.getAttribute('viewBox')).toBe('0 0 640 32');
      expect(svg.getAttribute('preserveAspectRatio')).toBe('none'); expect(band(id).getAttribute('height')).toBe('14');
      expect(band(id).getAttribute('vector-effect')).toBe('non-scaling-stroke');
      const row = panel().querySelector(`[data-met-pwht-pick="${id}"]`);
      expect(row.style.padding).toBe('10px 12px'); expect(row.style.borderWidth).toBe('2px'); expect(row.style.boxSizing).toBe('border-box');
    }
    expect(panel().querySelector('[data-met-pwht-axis]').style.padding).toBe('0px 14px');
    for (const f of [0, 550, 1100, 1650, 2200]) {
      const label = panel().querySelector(`[data-met-pwht-axis-label="${f}"]`);
      expect(label.style.left).toBe(((20 + f / 2200 * 600) / 640 * 100) + '%');
      expect(label.style.transform).toBe(f === 0 ? 'none' : f === 2200 ? 'translateX(-100%)' : 'translateX(-50%)');
    }
  });

  it('compares overlapping normalize and anneal bands without merging their different cooling descriptions', async () => {
    await mount(); await pick('normalize'); await compare();
    expect(panel().dataset.peer).toBe('anneal');
    expect(panel().querySelectorAll('[data-met-pwht-detail]')).toHaveLength(2);
    expect(reading('hold')).toBe('1 hr per inch, then air cool');
    expect(reading('hold', 'comparison')).toBe('long, slow furnace cool');
    const normalEnd = Number(band('normalize').getAttribute('x')) + Number(band('normalize').getAttribute('width'));
    const annealEnd = Number(band('anneal').getAttribute('x')) + Number(band('anneal').getAttribute('width'));
    expect(normalEnd).toBeCloseTo(annealEnd, 12);
    expect(Number(band('anneal').getAttribute('x'))).toBeLessThan(Number(band('normalize').getAttribute('x')));
    expect(band('anneal').getAttribute('fill')).toBe('none'); expect(band('anneal').getAttribute('stroke-dasharray')).toBe('4 3');
    expect(band('normalize').getAttribute('fill')).not.toBe('none');
    expect(panel().querySelector('[data-met-pwht-pick="anneal"]').textContent).toContain('Comparison · open dashed band');
  });

  it('keeps the comparison distinct from the selected treatment and ignores invalid peer events', async () => {
    await mount(); await compare();
    expect(panel().querySelector('[data-met-pwht-peer]').options).toHaveLength(4);
    expect([...panel().querySelector('[data-met-pwht-peer]').options].map(o => o.value)).not.toContain('stress');
    await peer('solution'); expect(panel().dataset.peer).toBe('solution');
    await peer('stress'); await peer('not-a-treatment'); expect(panel().dataset.peer).toBe('solution');
    await pick('solution');
    expect(panel().dataset.peer).not.toBe('solution'); expect(detail('comparison').dataset.treatment).not.toBe('solution');
    await compare(); expect(panel().querySelectorAll('[data-met-pwht-detail]')).toHaveLength(1); expect(panel().dataset.metPwht).toBe('solution');
    expect(panel().querySelector('[data-met-pwht-peer]')).toBeNull();
  });

  it('changes only local reference state, preserving all assessed answers and tallies', async () => {
    const app = await mount(), before = JSON.stringify(app.latest()), writes = app.writes.length;
    await pick('normalize'); await compare(); await peer('hydrogen'); await pick('anneal'); await compare();
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
  });

  it('corrects only the generic slow-cooling claim and retains economics plus treatment-specific cooling', async () => {
    await mount();
    expect(host.textContent).toContain('holding for a specified time, then cooling.');
    expect(host.textContent).not.toContain('holding for a specified time, then slow cooling.');
    expect(host.textContent).toContain('PWHT is EXPENSIVE: large parts need walk-in furnaces or wrapped electric heaters');
    await pick('anneal'); expect(reading('hold')).toBe('long, slow furnace cool');
    await pick('solution'); expect(reading('hold')).toBe('30 min, then rapid quench');
    expect(panel().querySelector('[data-met-pwht-note]').textContent).toContain('do not show a heating rate, holding-time scale or cooling curve');
    expect(panel().querySelector('[data-met-pwht-note]').textContent).toContain('do not define a treatment procedure');
  });

  it('provides native 44px controls, semantic selections and explicit contrast colors', async () => {
    await mount(true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const button of panel().querySelectorAll('button')) { expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px'); }
    const selected = panel().querySelector('[data-met-pwht-pick="stress"]');
    expect(selected.style.background).toBe('rgb(255, 255, 0)'); expect(selected.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-met-pwht-pick="hydrogen"]').style.background).toBe('rgb(0, 0, 0)');
    await compare();
    const select = panel().querySelector('[data-met-pwht-peer]'); expect(select.style.minHeight).toBe('44px');
    expect(panel().querySelector(`label[for="${select.id}"]`)).toBeTruthy();
    expect(panel().querySelector('[data-met-pwht-pick="anneal"]').style.borderStyle).toBe('dashed');
    for (const node of panel().querySelectorAll('button[aria-controls]')) expect(panel().querySelector('#' + node.getAttribute('aria-controls'))).toBeTruthy();
    expect(panel().querySelector('animate,animateTransform')).toBeNull();
  });

  it('keeps other metallurgy sections and their assessment gates separate while preserving hook order', async () => {
    await mount(); await pick('normalize');
    await textButton('🥄 Stainless sensitization'); expect(panel()).toBeNull(); expect(host.querySelector('[data-met-sensitization]')).toBeTruthy();
    await textButton('🌡 PWHT'); expect(panel().dataset.metPwht).toBe('normalize');
    for (const met_sect of ['phase', 'haz', 'ce', 'cracking', 'aluminum']) {
      expect(renderTool('weldLab', { weldLab: { ...BASE, met_sect } })).not.toContain('data-met-pwht=');
    }
  });
});

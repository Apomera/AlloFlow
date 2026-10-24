import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'ppeSafety', ps_view: 'shade' };
const RANGES = { smaw: [20, 550], gmaw: [30, 500], gtaw: [5, 500], pac: [20, 800], cac: [100, 1000], ofw: [0.03, 1.5], ofc: [0.1, 10] };
const NAMES = { smaw: 'Stick (SMAW)', gmaw: 'MIG / flux-core (GMAW, FCAW)', gtaw: 'TIG (GTAW)', pac: 'Plasma cutting', cac: 'Air carbon arc cutting', ofw: 'Gas (oxy-fuel) welding', ofc: 'Oxygen cutting' };
let root, host;
const core = () => window.__WeldLabCore;
const bench = (el = host) => el.querySelector('[data-ppe-shade-workbench]');
const n = (el, key) => Number(el.getAttribute(key));

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
  let latest; const updates = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => { updates.push([key, value]); setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest, updates };
}
async function click(selector) {
  const button = host.querySelector(selector); expect(button, selector).toBeTruthy(); await React.act(() => button.click());
}
async function named(text) {
  const button = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text);
  expect(button, text).toBeTruthy(); await React.act(() => button.click());
}
async function proc(id) {
  const button = [...host.querySelectorAll('[aria-label="Welding or cutting process"] button')].find(b => b.textContent.replace('✓ ', '') === NAMES[id]);
  expect(button, id).toBeTruthy(); await React.act(() => button.click());
}
function assertProbe(procId, value) {
  const result = core().safe2ShadeFor(procId, value), section = bench();
  expect(section.dataset.ppeShadeWorkbench).toBe(procId);
  expect(n(section, 'data-value')).toBeCloseTo(value, 10); expect(n(section, 'data-band')).toBe(result.band);
  expect(n(section, 'data-minimum')).toBe(result.min); expect(section.dataset.suggested).toBe(result.sug == null ? '' : String(result.sug));
  const point = section.querySelector('[data-ppe-shade-probe]');
  const x = 56 + (value - RANGES[procId][0]) / (RANGES[procId][1] - RANGES[procId][0]) * 560;
  expect(n(point, 'data-ppe-shade-probe')).toBeCloseTo(value, 10);
  expect(point.getAttribute('d')).toBe(`M${x} 23V199`);
  expect(n(section.querySelector('[data-ppe-shade-probe-min]'), 'data-ppe-shade-probe-min')).toBe(result.min);
  expect(n(section.querySelector('[data-ppe-shade-probe-min]'), 'y')).toBeCloseTo(196 - (result.min - 2) / 12 * 168 - 5, 10);
  if (result.sug == null) expect(section.querySelector('[data-ppe-shade-probe-suggested]')).toBeNull();
  else expect(n(section.querySelector('[data-ppe-shade-probe-suggested]'), 'cy')).toBeCloseTo(196 - (result.sug - 2) / 12 * 168, 10);
}

describe('PPE shade-band workshop', () => {
  it('draws the authored minimum and suggested bands on common operating-range axes, without inventing a suggestion', () => {
    for (const [id, table] of Object.entries(core().SAFE2_SHADE_TABLE)) {
      const el = render({ safe2_shProc: id, safe2_shAmps: 120, safe2_shThick: 0.5 }), section = bench(el);
      const x = v => 56 + (Math.min(RANGES[id][1], Math.max(RANGES[id][0], v)) - RANGES[id][0]) / (RANGES[id][1] - RANGES[id][0]) * 560;
      const y = v => 196 - (v - 2) / 12 * 168;
      expect(section.querySelectorAll('[data-ppe-shade-band]')).toHaveLength(table.bands.length);
      table.bands.forEach((band, k) => {
        const low = Math.max(RANGES[id][0], k ? table.bands[k - 1][0] : RANGES[id][0]), high = Math.min(RANGES[id][1], band[0]);
        for (const [kind, index] of [['min', 1], ['suggested', 2]]) {
          const path = section.querySelector(`[data-ppe-shade-band-segment="${k}:${kind}"]`);
          if (band[index] == null) { expect(path).toBeNull(); continue; }
          expect(path.getAttribute('d')).toBe(`M${x(low)} ${y(band[index])}H${x(high)}`);
          expect(n(path, 'data-lo')).toBe(low); expect(n(path, 'data-hi')).toBe(high); expect(n(path, 'data-shade')).toBe(band[index]);
          if (kind === 'suggested') expect(path.getAttribute('stroke-dasharray')).toBe('7 5');
          else expect(path.hasAttribute('stroke-dasharray')).toBe(false);
        }
      });
      expect(section.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
      expect(section.textContent).toContain('does not simulate filter tint or establish eye protection');
      expect(section.textContent).toContain('A gap means no suggested shade is listed');
    }
  });

  it.each(Object.keys(RANGES))('moves the %s probe below, at and above every authored boundary with exact existing endpoint ownership', async id => {
    const app = await mount({ safe2_shProc: id });
    const table = core().SAFE2_SHADE_TABLE[id], gas = table.unit === 'in', epsilon = gas ? 0.001 : 1;
    for (let k = 0; k < table.bands.length - 1; k++) {
      await click(`[data-ppe-shade-edge="${k}"]`);
      const boundary = table.bands[k][0];
      expect(n(bench().querySelector('[data-ppe-shade-boundary-line]'), 'data-ppe-shade-boundary-line')).toBe(boundary);
      for (const offset of [-1, 0, 1]) {
        await click(`[data-ppe-shade-boundary-step="${offset}"]`);
        const value = Number((boundary + offset * epsilon).toFixed(gas ? 3 : 0));
        assertProbe(id, value);
        expect(app.state()[gas ? 'safe2_shThick' : 'safe2_shAmps']).toBeCloseTo(value, 10);
        expect(n(bench(), 'data-band')).toBe(offset === -1 ? k : offset === 1 ? k + 1 : k === 0 ? 1 : k);
        expect(bench().querySelector(`[data-ppe-shade-boundary-step="${offset}"]`).getAttribute('aria-pressed')).toBe('true');
        expect(host.querySelector('input[type="range"]').step).toBe(gas ? '0.001' : '1');
      }
    }
  });

  it('jumps to a representative of each process band and keeps the existing process/current/thickness states separate', async () => {
    const savedPicks = { 0: 2 }, worn = ['adfHelmet', 'safetyGlasses'];
    const app = await mount({ safe2_scPick: savedPicks, safe2_worn: worn, safe2_adf: 13 });
    for (const id of Object.keys(RANGES)) {
      await proc(id);
      for (const button of [...bench().querySelectorAll('[data-ppe-shade-band]')]) {
        const k = n(button, 'data-ppe-shade-band'), sample = n(button, 'data-sample');
        await click(`[data-ppe-shade-band="${k}"]`); assertProbe(id, sample);
        expect(n(bench(), 'data-band')).toBe(k);
        expect(bench().querySelectorAll('[data-ppe-shade-band][aria-pressed="true"]')).toHaveLength(1);
      }
    }
    expect(app.state().safe2_scPick).toEqual(savedPicks); expect(app.state().safe2_worn).toEqual(worn); expect(app.state().safe2_adf).toBe(13);
    expect(app.updates.filter(([key]) => key.startsWith('safe2_')).every(([key]) => ['safe2_shProc', 'safe2_shAmps', 'safe2_shThick'].includes(key))).toBe(true);
  });

  it('selects a boundary locally without moving or persisting another operating point', async () => {
    const app = await mount({ safe2_shProc: 'gmaw', safe2_shAmps: 150 }); app.updates.length = 0;
    for (const k of [0, 2, 1]) {
      await click(`[data-ppe-shade-edge="${k}"]`); assertProbe('gmaw', 150);
      expect(bench().querySelector(`[data-ppe-shade-edge="${k}"]`).getAttribute('aria-pressed')).toBe('true');
    }
    expect(app.updates).toEqual([]); expect(app.state().safe2_shAmps).toBe(150);
  });

  it('responds to the original slider and displays a one-eighth-inch endpoint without rounding away its precision', async () => {
    await mount({ safe2_shProc: 'ofw', safe2_shThick: 0.5 });
    await click('[data-ppe-shade-edge="0"]'); await click('[data-ppe-shade-boundary-step="0"]');
    assertProbe('ofw', 0.125);
    expect(bench().querySelector('[data-ppe-shade-reading]').textContent).toContain('0.125 in.');
    expect(host.textContent).toContain('0.125 in.');
    await React.act(() => Simulate.change(host.querySelector('input[type="range"]'), { target: { value: '0.124' } }));
    assertProbe('ofw', 0.124); expect(n(bench(), 'data-minimum')).toBe(4);
    await React.act(() => Simulate.change(host.querySelector('input[type="range"]'), { target: { value: '0.126' } }));
    assertProbe('ofw', 0.126); expect(n(bench(), 'data-minimum')).toBe(5);
  });

  it('keeps a missing suggested starting shade absent from the probe and chart instead of plotting zero', async () => {
    await mount({ safe2_shProc: 'smaw', safe2_shAmps: 30 });
    assertProbe('smaw', 30);
    expect(bench().querySelector('[data-ppe-shade-band-segment="0:suggested"]')).toBeNull();
    expect(bench().querySelector('[data-ppe-shade-reading]').textContent).toContain('none listed');
    await click('[data-ppe-shade-edge="0"]'); await click('[data-ppe-shade-boundary-step="0"]');
    assertProbe('smaw', 60); expect(n(bench(), 'data-suggested')).toBe(10);
  });

  it('retains the full unbounded gas band in the table while clipping only its chart to the existing slider range', async () => {
    await mount({ safe2_shProc: 'ofc', safe2_shThick: 8 });
    const last = bench().querySelector('[data-ppe-shade-band-segment="2:min"]');
    expect(n(last, 'data-lo')).toBe(6); expect(n(last, 'data-hi')).toBe(10); expect(last.getAttribute('d').endsWith('H616')).toBe(true);
    const table = host.querySelector('table'); expect(table.textContent).toContain('> 6 in.');
    expect(bench().innerHTML).not.toContain('Infinity');
    await click('[data-ppe-shade-band="2"]'); assertProbe('ofc', 8);
  });

  it('normalizes invalid saved process and numeric states before deriving any graph coordinates', () => {
    for (const extra of [{ safe2_shProc: '__proto__', safe2_shAmps: 'bad' }, { safe2_shProc: {}, safe2_shAmps: Infinity }, { safe2_shProc: 'gmaw', safe2_shAmps: -999 }]) {
      const section = bench(render(extra));
      expect(section.dataset.ppeShadeWorkbench).toBe('gmaw');
      const value = n(section, 'data-value'); expect(value).toBeGreaterThanOrEqual(30); expect(value).toBeLessThanOrEqual(500);
      expect(n(section, 'data-minimum')).toBe(core().safe2ShadeFor('gmaw', value).min);
      expect(section.innerHTML).not.toMatch(/NaN|Infinity|undefined|__proto__/);
    }
  });

  it('does not change the illustrated safety case or its first-answer reveal when the shade workbench is used', async () => {
    const app = await mount({ safe2_scIdx: 0 });
    await click('[data-ppe-shade-band="3"]');
    await named('4. Hazard Scenarios');
    expect(bench()).toBeNull(); expect(host.querySelector('[data-ppe-case-scene]')).toBeTruthy();
    expect(host.textContent).not.toContain('Anyone with a line of sight to the arc needs protection');
    const choices = () => [...host.querySelectorAll('[aria-label="Response choices"] button')];
    await React.act(() => choices()[0].click()); expect(app.state().safe2_scPick).toEqual({ 0: 0 });
    expect(host.textContent).toContain('Anyone with a line of sight to the arc needs protection');
    await named('2. Lens Shade'); await click('[data-ppe-shade-band="0"]');
    await named('4. Hazard Scenarios');
    expect(app.state().safe2_scPick).toEqual({ 0: 0 });
    await React.act(() => choices()[2].click()); expect(app.state().safe2_scPick).toEqual({ 0: 0 });
    expect(host.textContent).toContain('Score: 0 / 1 answered');
  });

  it('uses readable contrast paths and native wrapping controls with distinct selected states', async () => {
    await mount({}, true); const section = bench();
    expect(section.style.background).toBe('rgb(0, 0, 0)'); expect(section.style.color).toBe('rgb(255, 255, 255)');
    expect(section.querySelector('h3').style.color).toBe('rgb(255, 255, 0)');
    const chart = section.querySelector('svg'); expect(chart.style.background).toBe('rgb(0, 0, 0)'); expect(chart.getAttribute('role')).toBe('img');
    const scroll = section.querySelector('[data-ppe-shade-scroll]');
    expect(scroll.getAttribute('role')).toBe('region'); expect(scroll.tabIndex).toBe(0);
    expect(scroll.getAttribute('aria-label')).toBe('Shade-band chart; scroll horizontally');
    expect(scroll.style.overflowX).toBe('auto'); expect(scroll.style.maxWidth).toBe('100%');
    expect(scroll.className).toContain('focus:ring-4'); expect(scroll.contains(chart)).toBe(true);
    expect(chart.style.minWidth).toBe('660px'); expect(chart.style.boxSizing).toBe('border-box');
    expect(section.textContent).toContain('scroll the chart sideways');
    scroll.focus(); expect(document.activeElement).toBe(scroll);
    expect(chart.querySelector('[data-ppe-shade-band-segment="1:min"]').getAttribute('stroke')).toBe('#ffff00');
    expect(chart.querySelector('[data-ppe-shade-band-segment="1:suggested"]').getAttribute('stroke')).toBe('#ffffff');
    expect(chart.querySelectorAll('text[fill="#ffffff"]').length).toBeGreaterThan(7);
    expect(chart.querySelector('animate,animateTransform')).toBeNull();
    for (const button of section.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON'); expect(button.style.minHeight).toBe('44px'); expect(button.className).toContain('focus:ring-4');
      if (button.getAttribute('aria-pressed') === 'true') {
        expect(button.style.background).toBe('rgb(255, 255, 0)'); expect(button.style.color).toBe('rgb(0, 0, 0)'); expect(button.textContent.startsWith('●')).toBe(true);
      } else { expect(button.style.background).toBe('rgb(0, 0, 0)'); expect(button.style.color).toBe('rgb(255, 255, 255)'); }
    }
    for (const group of section.querySelectorAll('[role="group"]')) expect(group.style.flexWrap).toBe('wrap');
    await click('[data-ppe-shade-band="0"]');
    expect(section.querySelector('[data-ppe-shade-band="0"]').style.background).toBe('rgb(255, 255, 0)');
    expect(section.querySelector('[data-ppe-shade-band="1"]').style.background).toBe('rgb(0, 0, 0)');
  });
});

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { stripDiagnoseSection } from './helpers/weldlab_diagnose_section_restore.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'defectDiagnose', dd2Idx: 1, dd2Shown: [1], dd2Ans: true, dd2Pick: 'heatHigh', dh2_ddSec: 'travelFast', dd2Score: 1, dd2Rounds: 1 };
const FIXES = {
  2: { target: 'undercut', P: 'mig', TH: 0.25, V: 28, A: 280, TS: 20 },
  3: { target: 'lackOfFusion', P: 'mig', TH: 0.5, V: 17, A: 120, TS: 14 },
  4: { target: 'burnthrough', P: 'mig', TH: 0.075, V: 20, A: 150, TS: 10 },
  6: { target: 'overlap', P: 'mig', TH: 0.25, V: 18, A: 110, TS: 6 },
  8: { target: 'spatter', P: 'mig', TH: 0.375, V: 24, A: 330, TS: 14 },
};
let root, host;
const core = () => window.__WeldLabCore;
const panel = () => host.querySelector('[data-diagnose-section]');

function recordingContext(canvas) {
  const data = { canvas, _ops: [] };
  return new Proxy(data, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'clearRect') return () => { target._ops.length = 0; };
    if (key === 'setTransform') return () => {};
    if (key === 'measureText') return () => ({ width: 20 });
    if (/create.*Gradient/.test(String(key))) return () => ({ addColorStop() {} });
    return (...args) => target._ops.push([String(key), ...args]);
  } });
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () { return this._testContext || (this._testContext = recordingContext(this)); });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount(extra = {}, contrast = false) {
  let latest, setData; const writes = [];
  function App() {
    const state = React.useState({ weldLab: { ...BASE, ...extra } }); latest = state[0].weldLab; setData = state[1];
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: state[0], setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes, patch: async (extra) => { await React.act(() => setData(prev => ({ weldLab: { ...prev.weldLab, ...extra } }))); } };
}
function render(extra = {}) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }); return node; }
async function change(selector, value) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }
async function click(selector) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function clickText(text) { const node = [...host.querySelectorAll('button')].find(button => button.textContent.includes(text)); expect(node).toBeTruthy(); await React.act(() => node.click()); }
function geometry(id, dials = FIXES[id]) {
  const original = core().DH_DIAG_GEOM[id];
  return FIXES[id] ? core().dhFixGeom(original, core().dhFixState(FIXES[id], dials.V, dials.A, dials.TS).defects) : original;
}
function verifyPlane(id, u, geom = geometry(id)) {
  const expected = core().dhSectionMarks(geom, u);
  expect(Number(panel().dataset.u)).toBeCloseTo(u, 12);
  expect(panel().dataset.featureIds).toBe(expected.map(m => m.id).join(','));
  expect(Number(panel().querySelector('[data-diagnose-section-reading]').dataset.featureCount)).toBe(expected.length);
  for (const [selector, paint] of [
    ['[data-diagnose-section-locator]', (c, W, H) => core().dhPaintSurface(c, core().dhFrame(geom, W, H), { light: 35, cutPreview: u })],
    ['[data-diagnose-section-slice]', (c, W, H) => core().dhPaintSection(c, W, H, geom, u, {})],
  ]) {
    const figure = panel().querySelector(selector), canvas = figure.querySelector('canvas'), ctx = recordingContext(canvas);
    expect(Number(figure.getAttribute(selector.slice(1, -1)))).toBeCloseTo(u, 12);
    paint(ctx, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
    expect(canvas._testContext._ops).toEqual(ctx._ops);
    expect(canvas.getAttribute('aria-label')).toContain((u * 100).toFixed(1) + ' percent');
  }
  return expected;
}

describe('Defect Diagnose local section-plane exploration', () => {
  it('is absent before submission and starts closed at each authored example plane after submission', () => {
    for (const extra of [{ dd2Idx: -1 }, { dd2Ans: false }, { dd2Ans: 'true' }]) expect(render(extra).querySelector('[data-diagnose-section]')).toBeNull();
    for (let id = 1; id <= 11; id++) {
      const node = render({ dd2Idx: id - 1 }), details = node.querySelector('[data-diagnose-section]');
      expect(details).toBeTruthy(); expect(details.open).toBe(false);
      expect(Number(details.dataset.u)).toBe(core().DH_DIAG_GEOM[id].cutU);
      expect(node.querySelector('#dh2-dd-h').closest('section').querySelectorAll('canvas')).toHaveLength(2);
    }
  });

  it.each(Array.from({ length: 11 }, (_, i) => i + 1))('uses the exact existing surface/section painters and feature intersections across case %i', async (id) => {
    await mount({ dd2Idx: id - 1, dd2Shown: [id - 1] });
    const geom = geometry(id), positions = new Set([0, 0.05, 0.25, 0.5, 0.75, 0.95, 1, core().DH_DIAG_GEOM[id].cutU]);
    for (const mark of geom.marks) {
      positions.add(mark.u);
      for (const edge of [mark.u - (mark.len || 0) / 2 - 0.021, mark.u + (mark.len || 0) / 2 + 0.021]) positions.add(Math.max(0, Math.min(1, edge)));
    }
    for (const u of positions) { await change('[data-diagnose-section-plane]', u); verifyPlane(id, u, geom); }
  });

  it('can miss a localized feature while preserving the original example pictures and all saved state', async () => {
    const app = await mount({ dd2Idx: 4, dd2Shown: [4], dd2Pick: 'technique', dh2_ddSec: null });
    const before = JSON.stringify(app.latest()), stored = JSON.stringify(localStorage), writes = app.writes.length;
    const originals = [...host.querySelector('#dh2-dd-h').closest('section').querySelectorAll('canvas')].map(canvas => JSON.stringify(canvas._testContext._ops));
    await click('[data-diagnose-section] summary'); expect(panel().open).toBe(true);
    await change('[data-diagnose-section-plane]', 0.5); expect(verifyPlane(5, 0.5)).toHaveLength(0);
    expect(panel().textContent).toContain('No modeled discontinuity intersects this slice');
    expect(panel().textContent).toContain('does not clear the whole weld');
    await change('[data-diagnose-section-plane]', 0.966); expect(verifyPlane(5, 0.966)).toHaveLength(1);
    await change('[data-diagnose-section-plane]', 0); await click('[data-diagnose-section-reset]');
    expect(Number(panel().dataset.u)).toBe(0.966); expect(panel().open).toBe(true);
    expect(JSON.stringify(app.latest())).toBe(before); expect(JSON.stringify(localStorage)).toBe(stored); expect(app.writes).toHaveLength(writes);
    expect([...host.querySelector('#dh2-dd-h').closest('section').querySelectorAll('canvas')].map(canvas => JSON.stringify(canvas._testContext._ops))).toEqual(originals);
  });

  it('follows live repair changes while leaving the candidate probe and first diagnosis independent', async () => {
    const app = await mount(); await change('[data-diagnose-section-plane]', 0.51);
    await change('[data-repair-candidate]', 220);
    expect(host.querySelector('[data-repair-preview]').dataset.cleared).toBe('true');
    expect(verifyPlane(2, 0.51).map(m => m.type)).toContain('undercut');
    expect(host.querySelector('input[aria-label="Amperage"]').value).toBe('280');
    await change('input[aria-label="Amperage"]', 220);
    expect(verifyPlane(2, 0.51, geometry(2, { V: 28, A: 220, TS: 20 }))).toHaveLength(0);
    expect(app.latest().dh2_diag[2].fixed).toBe(true); expect(app.latest().dd2Score).toBe(1); expect(app.latest().dd2Rounds).toBe(1);
    await change('input[aria-label="Travel speed"]', 3);
    expect(verifyPlane(2, 0.51, geometry(2, { V: 28, A: 220, TS: 3 })).some(m => m.type === 'burnthrough')).toBe(true);
    expect(host.querySelector('[data-repair-probe]').dataset.value).toBe('220');
    await clickText('Back to the bad settings'); verifyPlane(2, 0.51);
    expect(host.querySelector('[data-repair-probe]').dataset.value).toBe('220');
    expect(app.latest().dd2Score).toBe(1); expect(app.latest().dd2Rounds).toBe(1);
  });

  it('ignores nonfinite input, bounds extremes and closes/resets the inspection when the next case is selected', async () => {
    const app = await mount(); await click('[data-diagnose-section] summary');
    await change('[data-diagnose-section-plane]', 'bad'); expect(Number(panel().dataset.u)).toBe(0.5);
    await change('[data-diagnose-section-plane]', Infinity); expect(Number(panel().dataset.u)).toBe(0.5);
    await change('[data-diagnose-section-plane]', 7); expect(Number(panel().dataset.u)).toBe(1);
    await change('[data-diagnose-section-plane]', -2); expect(Number(panel().dataset.u)).toBe(0);
    await app.patch({ dd2Idx: 4, dd2Shown: [1, 4] }); expect(Number(panel().dataset.u)).toBe(0.966); expect(panel().open).toBe(false);
    await change('[data-diagnose-section-plane]', 0.3); await clickText('Next defect');
    expect(panel()).toBeNull(); expect(app.latest().dd2Ans).toBe(false);
    await app.patch({ dd2Ans: true }); expect(Number(panel().dataset.u)).toBe(core().DH_DIAG_GEOM[app.latest().dd2Idx + 1].cutU); expect(panel().open).toBe(false);
  });

  it('keeps the existing apply and Bead Lab transfer behavior after inspecting another plane', async () => {
    const savedRun = [3, 8, 11], pin = { V: 22, A: 180, TS: 12, P: 'mig', M: 'steel', TH: 0.25, run: [] };
    const app = await mount({ arc_run: savedRun, arc_pin: pin });
    await change('[data-diagnose-section-plane]', 0); await change('[data-repair-candidate]', 220); await click('[data-repair-apply]');
    await clickText('Open the Bead Lab');
    expect(app.latest()).toMatchObject({ view: 'beadLab', bl_V: 28, bl_A: 220, bl_TS: 20, bl_thickness: 0.25, bl_process: 'mig', dd2Score: 1, dd2Rounds: 1 });
    expect(app.latest().arc_run).toEqual(savedRun); expect(app.latest().arc_pin).toEqual(pin);
  });

  it('uses native labeled controls, explicit focus outlines, text alternatives and contrast surfaces', async () => {
    await mount({}, true); expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    expect(panel().querySelector('style').textContent).toContain('outline:3px solid #ffff00');
    const input = panel().querySelector('input'); expect(input.type).toBe('range'); expect(panel().querySelector('label').htmlFor).toBe(input.id);
    for (const node of panel().querySelectorAll('summary,input,button')) { expect(node.style.minHeight).toBe('44px'); expect(node.className).toContain('weld-dd13-control'); }
    for (const figure of panel().querySelectorAll('figure')) { expect(figure.style.background).toBe('rgb(15, 23, 42)'); expect(figure.querySelector('figcaption').style.color).toBe('rgb(255, 255, 255)'); }
    expect(panel().querySelector('[data-diagnose-section-reading]').getAttribute('aria-live')).toBe('polite');
    expect(panel().querySelector('animate,animateTransform')).toBeNull(); expect(panel().textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('recovers every original Diagnose byte by removing only this addition, retaining the baseline digest', () => {
    const source = readFileSync(resolve(SRC), 'utf8').replace(/\r\n/g, '\n');
    const begin = source.indexOf('      function DefectDiagnose() {'), end = source.indexOf('      // LIVE BEAD RUN', begin);
    const region = source.slice(begin, end), restored = stripDiagnoseSection(region);
    expect(restored).not.toBe(region);
    expect(createHash('sha256').update(restored).digest('hex')).toBe('927c235feb4fcf0ac87d4e4aa470f82d1e25fc77579e29611fec7a92d1ae3148');
    expect(stripDiagnoseSection(restored)).toBe(restored);
  });
});

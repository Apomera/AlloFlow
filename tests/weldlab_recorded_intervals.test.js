import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'beadLab', bl_view: 'topdown', arc_handsOn: true, bl_V: 22, bl_A: 180, bl_TS: 12, bl_process: 'mig', bl_material: 'steel', bl_thickness: 0.25,
  arc_run: [6, 12, 24], arc_runHand: true, arc_missions: {}, weldBadges: {}, defectCatalog: {}, speedBest: {} };
const DEFECTS = ['burnthrough', 'lackOfFusion', 'undercut', 'overlap', 'spatter', 'porosity'];
let root, host, realMatchMedia, raf;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab();
  realMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); host = null; window.matchMedia = realMatchMedia; vi.restoreAllMocks(); });
const core = () => window.__WeldLabCore;
const inspect = (node = host) => node.querySelector('[data-arc-intervals]');
const num = (node, attr) => Number(node.getAttribute(attr));
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
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
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function button(text) { await click([...host.querySelectorAll('button')].find(node => node.textContent.includes(text))); }
async function choose(value) { await React.act(() => Simulate.change(inspect().querySelector('select'), { target: { value: String(value) } })); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }
function localModel(settings, speed) { return core().arc.beadReport(settings.bl_V, settings.bl_A, speed, settings.bl_process, settings.bl_material, settings.bl_thickness, null); }
function assertSelected(node, settings, run, index) {
  const panel = inspect(node), model = localModel(settings, run[index]), position = panel.querySelector('[data-arc-interval-position]');
  expect(panel.dataset.arcIntervals).toBe('recorded'); expect(num(panel, 'data-count')).toBe(run.length); expect(num(position, 'data-arc-interval-position')).toBe(index);
  expect(num(position, 'data-start')).toBe(index / 4); expect(num(position, 'data-end')).toBe((index + 1) / 4); expect(num(position, 'data-recorded-end')).toBe(run.length / 4);
  const values = { speed: run[index], net: model.net, width: model.width, reinforcement: model.reinf, penetration: model.penetration, thickness: settings.bl_thickness };
  for (const [key, value] of Object.entries(values)) {
    const reading = panel.querySelector(`[data-arc-interval-reading="${key}"]`); expect(num(reading, 'data-value')).toBeCloseTo(value, 12);
    expect(reading.querySelector('dd').textContent).toBe('≈ ' + value.toFixed(3) + ' ' + (key === 'speed' ? 'in/min' : key === 'net' ? 'kJ/in' : 'in'));
  }
  for (const key of DEFECTS) { const item = panel.querySelector(`[data-arc-interval-defect="${key}"]`); expect(num(item, 'data-value')).toBeCloseTo(model.defects[key], 12); expect(item.textContent).toContain((100 * model.defects[key]).toFixed(1) + '%'); }
  expect(panel.querySelectorAll('option')).toHaveLength(run.length); expect(Number(panel.querySelector('select').value)).toBe(index);
  const svg = panel.querySelector('[data-arc-interval-section]'), plate = svg.querySelector('[data-arc-interval-plate]'), line = svg.querySelector('[data-arc-interval-width-line]');
  expect(svg.getAttribute('viewBox')).toBe('0 0 480 280'); expect(num(svg, 'data-scale')).toBe(200); expect(num(svg, 'data-arc-interval-section')).toBe(index);
  expect(['x', 'y', 'width', 'height'].map(key => num(plate, key))).toEqual([20, 110, 440, settings.bl_thickness * 200]);
  const w = model.width * 200, rf = model.reinf * 200, fused = w * (1 - 0.8 * model.defects.lackOfFusion) * (1 - 0.35 * model.defects.overlap);
  let pen = Math.min(model.penetration, settings.bl_thickness) * 200;
  if (model.defects.lackOfFusion > 0) pen = Math.min(pen, Math.max(3, pen * (1 - model.defects.lackOfFusion)));
  const cap = svg.querySelector('[data-arc-interval-cap]'), fusion = svg.querySelector('[data-arc-interval-fusion]');
  expect(cap.getAttribute('d')).toBe(`M${240 - w / 2} 110 Q240 ${110 - 2 * rf} ${240 + w / 2} 110 Z`);
  expect(num(fusion, 'rx')).toBeCloseTo(Math.max(2, fused / 2), 12); expect(num(fusion, 'ry')).toBeCloseTo(Math.max(2, pen), 12);
  expect(num(line, 'x1')).toBeCloseTo(240 - w / 2, 12); expect(num(line, 'x2')).toBeCloseTo(240 + w / 2, 12);
  const ruler = svg.querySelector('[data-arc-interval-ruler] line'); expect(num(ruler, 'x2') - num(ruler, 'x1')).toBe(200);
  const burned = model.defects.burnthrough >= core().arc.REJECT_AT; expect(svg.dataset.burned).toBe(burned ? 'true' : 'false');
  const hole = svg.querySelector('[data-arc-interval-hole]'); expect(!!hole).toBe(burned);
  if (burned) {
    const width = Math.max(6, w * (0.22 + 0.22 * model.defects.burnthrough));
    expect(num(hole, 'x')).toBeCloseTo(240 - width / 2, 12); expect(num(hole, 'width')).toBeCloseTo(width, 12);
    expect(num(hole, 'y')).toBeCloseTo(110 - 2 * rf - 2, 12); expect(num(hole, 'height')).toBeCloseTo(settings.bl_thickness * 200 + 2 * rf + 4, 12);
    expect(svg.querySelector('[data-arc-interval-root]')).toBeNull(); expect(hole.compareDocumentPosition(cap) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  }
  const focus = panel.querySelector('[data-arc-interval-focus]'); expect(num(focus, 'x')).toBe(32 + index * 18); expect(num(focus, 'width')).toBe(18);
}
function assertStrip(node, settings, run) {
  const panel = inspect(node), svg = panel.querySelector('[data-arc-interval-strip]'); expect(svg.getAttribute('viewBox')).toBe('0 0 640 140');
  const slots = [...svg.querySelectorAll('[data-arc-interval-slot]')]; expect(slots).toHaveLength(32);
  slots.forEach((slot, i) => {
    expect(slot.dataset.recorded).toBe(i < run.length ? 'true' : 'false'); const base = slot.querySelector('[data-arc-interval-slot-base]');
    expect(num(base, 'x')).toBe(32 + i * 18); expect(num(base, 'width')).toBe(18);
    const part = slot.querySelector('[data-arc-interval-footprint]');
    if (i >= run.length) { expect(part).toBeNull(); return; }
    const model = localModel(settings, run[i]); expect(num(part, 'data-width')).toBeCloseTo(model.width, 12); expect(num(part, 'data-speed')).toBe(run[i]);
    expect(num(part, 'x')).toBe(32 + i * 18); expect(num(part, 'width')).toBe(18); expect(num(part, 'height')).toBeCloseTo(model.width * 72, 12); expect(num(part, 'y')).toBeCloseTo(68 - model.width * 36, 12);
    if (model.defects.burnthrough >= core().arc.REJECT_AT) { expect(part.getAttribute('fill')).toBe('#0f172a'); expect(part.getAttribute('stroke-dasharray')).toBe('3 2'); }
  });
  const axis = svg.querySelector('[data-arc-interval-strip-axis]'); expect(num(axis, 'x1')).toBe(32); expect(num(axis, 'x2')).toBe(608);
}

describe('Recorded quarter-inch interval inspection', () => {
  it('starts collapsed, represents no measurements for an empty or malformed run, and ignores a pretend saved selection', () => {
    for (const arc_run of [[], null, 'junk', [NaN, 12]]) {
      const node = render({ arc_run, arc12_selection: 9 }), panel = inspect(node);
      expect(panel.tagName).toBe('DETAILS'); expect(panel.open).toBe(false); expect(panel.dataset.arcIntervals).toBe('empty'); expect(num(panel, 'data-count')).toBe(0);
      expect(panel.querySelector('[data-arc-interval-empty]')).toBeTruthy(); expect(panel.querySelector('select,button,svg,dl')).toBeNull();
    }
    const node = render({ arc12_selection: 2 }); assertSelected(node, BASE, BASE.arc_run, 0);
  });

  it('reads one real recorded interval without silently changing the existing two-interval whole-pass report rule', () => {
    const node = render({ arc_run: [4] }); assertSelected(node, BASE, [4], 0); assertStrip(node, BASE, [4]);
    const average = core().arc.beadReport(22, 180, 12, 'mig', 'steel', 0.25, [4]); expect(average.handsOn).toBe(false); expect(average.ts).toBe(12);
    expect(node.querySelector('[data-arc-xs]').getAttribute('aria-label')).toContain(average.width.toFixed(3));
    expect(inspect(node).querySelector('[data-arc-interval-note]').textContent).toContain('two-interval minimum');
  });

  it('selects all32 actual intervals and their existing model geometry, heat and six defect values on exact quarter-inch positions', async () => {
    const run = Array.from({ length: 32 }, (_, i) => 2 + i * 38 / 31); await mount({ arc_run: run }); assertStrip(host, BASE, run);
    for (let i = 0; i < run.length; i++) { await choose(i); assertSelected(host, BASE, run, i); }
    expect(inspect().querySelector('[data-arc-interval-next]').disabled).toBe(true); await click(inspect().querySelector('[data-arc-interval-next]')); assertSelected(host, BASE, run, 31);
    await click(inspect().querySelector('[data-arc-interval-prev]')); assertSelected(host, BASE, run, 30);
    await choose(0); expect(inspect().querySelector('[data-arc-interval-prev]').disabled).toBe(true);
  });

  it.each(['mig', 'tig', 'stick', 'oxy'])('uses the existing %s model for all three materials and keeps the enlarged section scale fixed', P => {
    for (const M of ['steel', 'aluminum', 'stainless']) {
      const settings = { ...BASE, bl_process: P, bl_material: M, bl_V: 18.5, bl_A: 237, bl_thickness: 0.375 }, run = [3.25, 13.125, 39.5];
      const node = render({ ...settings, arc_run: run }); assertSelected(node, settings, run, 0); assertStrip(node, settings, run);
    }
  });

  it('retains genuine empty slots and fixed rulers, plate and footprints while selection alone changes', async () => {
    await mount({ arc_run: [5, 9, 14, 22, 37] }); const fixed = () => [...inspect().querySelectorAll('[data-arc-interval-slot-base],[data-arc-interval-footprint],[data-arc-interval-strip-base],[data-arc-interval-strip-axis],[data-arc-interval-plate],[data-arc-interval-ruler]')].map(node => node.outerHTML);
    const original = fixed();
    for (const index of [4, 1, 3, 0]) { await choose(index); expect(fixed()).toEqual(original); expect(num(inspect().querySelector('[data-arc-interval-section]'), 'data-scale')).toBe(200); }
    expect(inspect().querySelectorAll('[data-recorded="false"]')).toHaveLength(27);
  });

  it('fits bounded model caps, plate depths and existing root geometry without redrawing metal over burnthrough', () => {
    let holes = 0, roots = 0;
    for (const TH of [0.075, 0.125, 0.1875, 0.25, 0.375, 0.5]) for (const [V, A, speed] of [[10, 50, 40], [40, 350, 2], [22, 180, 12], [22, 180, 16]]) {
      const settings = { ...BASE, bl_thickness: TH, bl_V: V, bl_A: A }, node = render({ ...settings, arc_run: [speed] }); assertSelected(node, settings, [speed], 0);
      const model = localModel(settings, speed), svg = inspect(node).querySelector('[data-arc-interval-section]');
      expect(240 - model.width * 100).toBeGreaterThan(20); expect(240 + model.width * 100).toBeLessThan(460); expect(110 - model.reinf * 200).toBeGreaterThanOrEqual(0);
      expect(110 + TH * 200 + Math.min(30, Math.max(3, (model.penetration - TH) * 200 + 4))).toBeLessThan(280);
      if (svg.querySelector('[data-arc-interval-hole]')) holes++; if (svg.querySelector('[data-arc-interval-root]')) roots++;
    }
    expect(holes).toBeGreaterThan(0); expect(roots).toBeGreaterThan(0);
  });

  it('rejects invalid selection values and opens only by native user disclosure without saved writes or starting a replay', async () => {
    const app = await mount(); const before = JSON.stringify(app.latest()), writes = app.writes.length, clock = raf.mock.calls.length;
    await click(inspect().querySelector('summary')); expect(inspect().open).toBe(true); await choose(1); assertSelected(host, BASE, BASE.arc_run, 1);
    for (const value of ['', 'NaN', 'Infinity', 'junk', -1, 3, 0.5]) { await choose(value); assertSelected(host, BASE, BASE.arc_run, 1); }
    await click(inspect().querySelector('[data-arc-interval-next]')); assertSelected(host, BASE, BASE.arc_run, 2);
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes); expect(raf.mock.calls.length).toBe(clock);
  });

  it('preserves the existing trace, whole-pass scorecard, macro-etch, pin and mission data during local inspection', async () => {
    const app = await mount(); await button('Pin this bead');
    const selectors = ['[data-arc-trace]', '[data-arc-xs]', '[data-arc-verdict]', '[data-arc-visual-compare]', '[data-arc-missions]'];
    const before = selectors.map(selector => host.querySelector(selector).outerHTML), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const index of [2, 0, 1]) { await choose(index); expect(selectors.map(selector => host.querySelector(selector).outerHTML)).toEqual(before); }
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes); expect(app.latest().arc_pin.run).toEqual(BASE.arc_run);
  });

  it('uses current main settings and actual recorded speeds while the target travel-speed slider does not replace the recording', async () => {
    const app = await mount(); await choose(2); const sliders = () => [...host.querySelectorAll('.weldlab-knobs input[type="range"]')];
    const before = inspect().querySelector('[data-arc-interval-values]').outerHTML; await change(sliders()[2], 25);
    expect(app.latest().bl_TS).toBe(25); expect(inspect().querySelector('[data-arc-interval-values]').outerHTML).toBe(before);
    await change(sliders()[0], 28.5); assertSelected(host, { ...BASE, bl_V: 28.5, bl_TS: 25 }, BASE.arc_run, 2);
    expect(app.latest().arc_run).toEqual(BASE.arc_run); expect(inspect().querySelector('[data-arc-interval-note]').textContent).toContain('current lab settings');
  });

  it('clears every local reading on New Plate and inspects only the actual replacement recording', async () => {
    const app = await mount(); await choose(2); await button('New plate');
    expect(app.latest().arc_run).toEqual([]); expect(inspect().dataset.arcIntervals).toBe('empty'); expect(inspect().querySelector('select,svg,dl')).toBeNull();
    await button('Weld steady (auto)'); expect(app.latest().arc_run).toHaveLength(32); assertStrip(host, BASE, new Array(32).fill(12));
    await choose(31); await button('New plate'); expect(inspect().querySelector('select')).toBeNull();
    // Existing steady recording replaces the old run, never inventing samples from selection.
    await button('Weld steady (auto)'); assertSelected(host, BASE, new Array(32).fill(12), 31); expect(app.latest().arc_runHand).toBe(false);
  });

  it('keeps mission load-before-check and first-real-check prediction locks unchanged while inspecting recorded intervals', async () => {
    const app = await mount({ arc_mission: 3 }); const check = () => [...host.querySelectorAll('button')].find(node => node.textContent.includes('Check my weld'));
    expect(check().disabled).toBe(true); await choose(2); expect(host.querySelector('[data-arc-result]')).toBeNull();
    await button('Raise voltage by 3 V'); await click(check()); expect(host.querySelector('[data-arc-result]').dataset.arcResult).toBe('need-preset');
    expect(app.latest().arc_missions.coldRopey.locked).toBe(false); await choose(0); expect(host.querySelector('[data-arc-result]').dataset.arcResult).toBe('need-preset');
    await button('Load starting settings'); await click(check()); const record = JSON.stringify(app.latest().arc_missions.coldRopey);
    expect(app.latest().arc_missions.coldRopey.locked).toBe(true); expect(app.latest().arc_missions.coldRopey.tries).toBe(1); const result = host.querySelector('[data-arc-result]').outerHTML;
    for (const index of [1, 2, 0]) { await choose(index); expect(host.querySelector('[data-arc-result]').outerHTML).toBe(result); expect(JSON.stringify(app.latest().arc_missions.coldRopey)).toBe(record); }
    for (const text of ['Lower amperage by20A', 'Travel4in/min faster', 'Raise voltage by3V']) {
      const choices = [...host.querySelectorAll('[data-arc-mission] button')].filter(node => node.textContent.replace(/\s/g, '').includes(text.replace(/\s/g, '')));
      expect(choices).toHaveLength(1); expect(choices[0].disabled).toBe(true);
    }
  });

  it('is limited to the existing top-down hands-on workspace and normalizes the authored contiguous run limit', () => {
    for (const extra of [{ arc_handsOn: false }, { bl_view: '3d' }, { bl_view: 'helmet' }]) expect(inspect(render(extra))).toBeNull();
    for (const raw of [[9, null, 14], [0, -4, 99], Array.from({ length: 40 }, (_, i) => i + 1)]) {
      const run = core().arc.normRun(raw), node = render({ arc_run: raw }); expect(num(inspect(node), 'data-count')).toBe(run.length); assertStrip(node, BASE, run); assertSelected(node, BASE, run, 0);
    }
  });

  it.each([false, true])('provides full-size HTML, native44px controls, high contrast, strong focus and static vector geometry (contrast=%s)', contrast => {
    const node = render({}, contrast), panel = inspect(node); expect(panel.open).toBe(false); expect(panel.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(panel.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    for (const control of panel.querySelectorAll('summary,button,select')) expect(parseFloat(control.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(panel.querySelector('label').classList.contains('text-base')).toBe(true); expect(panel.querySelector('dl').classList.contains('text-base')).toBe(true);
    for (const caption of panel.querySelectorAll('figcaption')) expect(caption.classList.contains('text-base')).toBe(true);
    for (const svg of panel.querySelectorAll('svg')) { expect(svg.querySelector('text,foreignObject,animate,animateTransform')).toBeNull(); expect(svg.style.width).toBe('100%'); expect(svg.style.height).toBe('auto'); expect(svg.getAttribute('role')).toBe('img'); }
    const css = panel.querySelector('style').textContent; expect(css).toContain(`outline:3px solid ${contrast ? '#ffff00' : '#075985'}!important`); expect(css).toContain('transition:none!important;animation:none!important');
    expect(panel.querySelector('[data-arc-interval-note]').textContent).toContain('not a measured weld section'); expect(panel.querySelector('[data-arc-interval-note]').textContent).toContain('geometry retains unrounded values');
  });

  it('removes only the new local hook/helper/call to recover the exact original Bead Lab and unchanged trace', () => {
    const source = stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8')); const start = source.indexOf('      function WeldBeadLab() {'), end = source.indexOf('      function WeldBeadLab3D(props) {', start); let region = source.slice(start, end);
    const hook = '        var arcIntervalState = useState(0);\n', call = ',\n                renderRecordedIntervals()'; expect(region.split(hook)).toHaveLength(2); expect(region.split(call)).toHaveLength(2);
    const hs = region.indexOf('        function renderRecordedIntervals() {'), he = region.indexOf('        function renderSpeedTrace() {', hs); expect(hs).toBeGreaterThan(0); expect(he).toBeGreaterThan(hs);
    const helper = region.slice(hs, he); expect(helper).not.toMatch(/\bupd\(|usePersisted|requestAnimationFrame|setTimeout|setInterval|\bsetRun\(|\bcommitRun\(|\bsetMissions\(|\bsaveMissions\(|\bchoosePrediction\(|\bcheckMission\(|\bstrike\(|\brelease\(|\bkick\(/);
    region = region.slice(0, hs) + region.slice(he); region = region.replace(hook, '').replace(call, '');
    expect(createHash('sha256').update(region).digest('hex')).toBe('3520f8b833fe319745caa1729309f463f30f1facf90105ebe079a6ece4fe686b');
  });
});

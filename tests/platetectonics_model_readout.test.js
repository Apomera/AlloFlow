import fs from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Use the established StrictMode/manual-clock model inspection scaffold.
let React, ReactDOM, act, now = 0, frameId = 0;
const frames = new Map(), apps = [];
const SELECT = '[data-pt-quake-model-select]';
const LOWER_SELECT = '[data-pt-quake-inspect-select]';
const READOUT = '[data-pt-quake-model-values]';
const modelControl = name => '[data-pt-quake-model-' + name + ']';

beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.SVGElement.prototype.getBoundingClientRect = function () {
    const vb = (this.getAttribute('viewBox') || '0 0 460 354').split(' ').map(Number);
    return { width: 460, height: vb[3], x: 0, y: 0, left: 0, top: 0, right: 460, bottom: vb[3] };
  };
  if (!window.HTMLElement.prototype.scrollIntoView) Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value() {} });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool() {}, ensureThree: () => new Promise(() => {}), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});

beforeEach(() => {
  frames.clear(); now = 0;
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});
afterEach(() => { while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); } frames.clear(); vi.restoreAllMocks(); });

const saved = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, i) => ({ x: 100.12345678901234 + i * 50, z: 100.625 + i * 45, m: 4 })) };
function mount(record) {
  if (!arguments.length) record = saved;
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOM.createRoot(host);
  const effects = Object.fromEntries(['record', 'depth', 'inquiry', 'draft', 'xp', 'beep', 'announce'].map(key => [key, vi.fn()]));
  act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(window.AlloTectonicsInteractive, {
    darkMode: true, savedSlab: record, onRecordSlab: effects.record, onRecordDepths: effects.depth,
    onRecordBoundaryInquiry: effects.inquiry, onRecordBoundaryDraft: effects.draft,
    awardXP: effects.xp, beep: effects.beep, announceToSR: effects.announce
  }))));
  const query = selector => host.querySelector(selector), all = selector => [...host.querySelectorAll(selector)];
  const click = selector => act(() => query(selector).click());
  const open = () => act(() => { const log = query('[data-pt-quake-log]'); log.open = true; log.dispatchEvent(new window.Event('toggle', { bubbles: true })); });
  open();
  let rng = 0; const sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5];
  vi.spyOn(Math, 'random').mockImplementation(() => sequence[rng++ % sequence.length]);
  const frame = (depth = 0.9, shallow = false) => { sequence[2] = shallow ? 0 : 0.8; sequence[3] = depth; rng = 0; now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); };
  const select = (value, selector = SELECT) => {
    const node = query(selector);
    act(() => { Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new window.Event('change', { bubbles: true })); });
  };
  const app = { host, root, effects, query, all, click, open, frame, select, record };
  apps.push(app); return app;
}
function captureModel() {
  const engine = window.__alloTectGL, original = engine.submit; let latest;
  vi.spyOn(engine, 'submit').mockImplementation(function (value) { latest = value; return original.call(engine, value); });
  return () => latest;
}
function clearEffects(app) { for (const callback of Object.values(app.effects)) callback.mockClear(); }
function noEffects(app) { for (const callback of Object.values(app.effects)) expect(callback).not.toHaveBeenCalled(); }
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function showSample(app) { app.click('[data-pt-quake-sample-project]'); await flush(); }
function camera(app) { return { view: app.query('[data-tect-gl]')?.dataset.tectView, cut: app.query('#tect-cut')?.value }; }
function physical(app) { return ['time', 'movement'].map(key => app.query('[data-pt-model-reading="' + key + '"]').textContent).concat(app.query('#pt-ql-dip')?.value, app.query('[data-pt-model-play]').textContent); }
function copiedSample(value) { return value?.observationSample?.points?.map(point => ({ x: point.x, z: point.z, ...(point.m == null ? {} : { m: point.m }) })) ?? null; }
function selected(app, index, point) {
  const values = app.query(READOUT);
  expect(values).not.toBeNull(); expect(values.dataset.ptQuakeModelValues).toBe(String(index));
  expect(values.querySelector('[data-pt-quake-model-selected-heading]').textContent).toBe('Selected event ' + (index + 1));
  expect(values.querySelector('[data-pt-quake-model-distance]').textContent).toBe(String(point.x));
  expect(values.querySelector('[data-pt-quake-model-depth]').textContent).toBe(String(point.z));
  expect(app.query(SELECT).value).toBe(String(index)); expect(app.query(LOWER_SELECT).value).toBe(String(index));
  expect(app.query('[data-pt-quake-inspected-distance]').textContent).toBe(String(point.x));
  expect(app.query('[data-pt-quake-inspected-depth]').textContent).toBe(String(point.z));
  expect(app.query('[data-pt-quake-inspection-ring]').dataset.ptQuakeInspectionRing).toBe(String(index));
  expect(app.query('[data-pt-slab-coordinate-inspected="true"]').dataset.ptSlabCoordinateRow).toBe(String(index));
}

describe('Exact selected earthquake readout beside the model', () => {
  it('keeps the sample unselected until the learner chooses an event', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); clearEffects(app);
    expect(app.query(READOUT)).toBeNull(); expect(app.query(SELECT).value).toBe('');
    expect(app.query('[data-pt-quake-model-selected-heading]')).toBeNull();
    expect(app.query('[data-pt-quake-model-inspector]').tagName).toBe('FIELDSET');
    expect(getModel().observationProjection).toBeNull(); expect(copiedSample(getModel())).toEqual(saved.points);
    const status = app.query('#pt-quake-projection-status');
    expect(status.tabIndex).toBe(-1); expect(status.getAttribute('aria-live')).toBe('off');
    expect(app.query('[data-pt-quake-sample-counts]').dataset.total).toBe('8'); noEffects(app);
  });

  it('makes the exact checked coordinates a semantic two-value readout with a separate visibility explanation', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); clearEffects(app); app.select('2'); selected(app, 2, saved.points[2]);
    const values = app.query(READOUT), heading = values.querySelector('[data-pt-quake-model-selected-heading]'), layout = values.querySelector('[data-pt-quake-model-values-layout]');
    expect(heading.tagName).toBe('H5'); expect(layout.tagName).toBe('DL');
    expect(layout.querySelectorAll('dt')).toHaveLength(2); expect(layout.querySelectorAll('dd')).toHaveLength(2);
    expect([...layout.querySelectorAll('dt')].map(node => node.textContent)).toEqual(['Distance from trench (km)', 'Depth (km)']);
    expect(layout.style.display).toBe('grid');
    for (const value of layout.querySelectorAll('dd')) {
      expect(value.style.fontVariantNumeric).toBe('tabular-nums'); expect(value.style.fontSize).toBe('20px'); expect(value.style.overflowWrap).toBe('anywhere');
    }
    const visibility = values.querySelector('[data-pt-quake-model-visibility]'), status = app.query('#pt-quake-projection-status');
    expect(visibility.tagName).toBe('P'); expect(visibility.classList.contains('font-semibold')).toBe(false); expect(status.classList.contains('font-semibold')).toBe(false);
    expect(visibility.textContent).toContain('The 3D block is loading.');
    expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe('captured');
    expect(values.contains(app.query('[data-pt-quake-sample-counts]'))).toBe(false);
    expect(getModel().observationProjection).toEqual({ x: saved.points[2].x, z: saved.points[2].z, index: 2, captured: true }); noEffects(app);
  });

  it('preserves fractional negative and subnormal coordinates without rounding or moving them', async () => {
    const record = { version: 1, angle: 42, points: saved.points.map((point, index) => ({ ...point,
      x: index === 0 ? -125.1234567890123 : index === 1 ? -Number.MIN_VALUE : point.x,
      z: index === 0 ? 100.12345678901234 : point.z
    })) };
    const getModel = captureModel(), frozen = JSON.stringify(record), app = mount(record); await showSample(app); clearEffects(app);
    const view = camera(app), before = physical(app), sample = copiedSample(getModel());
    for (const index of [0, 1]) {
      app.select(String(index)); selected(app, index, record.points[index]);
      expect(getModel().observationProjection.x).toBe(record.points[index].x); expect(getModel().observationProjection.z).toBe(record.points[index].z);
    }
    expect(app.query('[data-pt-quake-model-distance]').textContent).toBe('-5e-324');
    expect(copiedSample(getModel())).toEqual(sample); expect(JSON.stringify(record)).toBe(frozen);
    expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('retains beyond-block evidence and sample counts while explaining the current model visibility', async () => {
    const record = { version: 1, angle: 42, points: saved.points.map((point, index) => ({ ...point, x: index === 7 ? 799.125 : point.x })) };
    const getModel = captureModel(), app = mount(record); await showSample(app); clearEffects(app); const view = camera(app), before = physical(app); app.select('7'); selected(app, 7, record.points[7]);
    expect(app.query('[data-pt-quake-model-visibility]').dataset.ptQuakeModelVisibility).toBe('true');
    expect(app.query('#pt-quake-projection-status').dataset.ptQuakeProjectionStatus).toBe('outside-block');
    expect(app.query('[data-pt-quake-projection-limit]').textContent).toContain('beyond the finite 3D block');
    const counts = app.query('[data-pt-quake-sample-counts]'); expect(counts.dataset.total).toBe('8'); expect(counts.dataset.outside).toBe('1'); expect(counts.dataset.inbounds).toBe('7');
    expect(app.query(READOUT).contains(counts)).toBe(false); expect(getModel().observationProjection.x).toBe(record.points[7].x);
    expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('follows both native choosers and Previous or Next without changing the physical model', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); clearEffects(app); const view = camera(app), before = physical(app), sample = copiedSample(getModel());
    app.select('2'); selected(app, 2, saved.points[2]); app.click(modelControl('next')); selected(app, 3, saved.points[3]);
    app.click('[data-pt-quake-inspect-prev]'); selected(app, 2, saved.points[2]);
    app.select('5', LOWER_SELECT); selected(app, 5, saved.points[5]);
    expect(copiedSample(getModel())).toEqual(sample); expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('reads the same exact event after a deliberate graph point choice', async () => {
    const app = mount(); await showSample(app); clearEffects(app); const view = camera(app), before = physical(app);
    const plot = app.query('[data-pt-quake-plot]'), point = app.query('[data-pt-quake-point="5"]'), bounds = plot.getBoundingClientRect(), vb = plot.getAttribute('viewBox').split(' ').map(Number);
    const x = bounds.left + Number(point.getAttribute('cx')) * bounds.width / vb[2], y = bounds.top + Number(point.getAttribute('cy')) * bounds.height / vb[3];
    act(() => plot.dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: x, clientY: y })));
    selected(app, 5, saved.points[5]); expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('keeps coincident events separately numbered while showing their identical raw coordinates', async () => {
    const record = { version: 1, angle: 42, points: Array.from({ length: 8 }, () => ({ x: 100.125, z: 200.25, m: 4 })) };
    const getModel = captureModel(), app = mount(record); await showSample(app); clearEffects(app);
    app.select('1'); selected(app, 1, record.points[1]); app.click(modelControl('next')); selected(app, 2, record.points[2]);
    expect(getModel().observationProjection.index).toBe(2); expect(getModel().observationSample.points).toHaveLength(8);
    expect(app.query('[data-pt-quake-sample-counts]').dataset.total).toBe('8'); expect(app.query(SELECT).options).toHaveLength(9); noEffects(app);
  });

  it('removes selected coordinates on Clear while retaining the whole-sample evidence', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('4'); clearEffects(app);
    const sample = copiedSample(getModel()), view = camera(app), before = physical(app); app.click(modelControl('clear')); await flush();
    expect(app.query(READOUT)).toBeNull(); expect(app.query('[data-pt-quake-model-selected-heading]')).toBeNull(); expect(app.query('[data-pt-quake-model-visibility]')).toBeNull();
    expect(app.query(SELECT).value).toBe(''); expect(app.query(LOWER_SELECT).value).toBe(''); expect(getModel().observationProjection).toBeNull();
    expect(copiedSample(getModel())).toEqual(sample); expect(app.query('[data-pt-quake-sample-counts]').dataset.total).toBe('8');
    expect(app.query('#pt-quake-projection-status').getAttribute('aria-live')).toBe('off'); expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('preserves the quiet status focus target while the learner changes the selected event', async () => {
    const app = mount(); app.select('2', LOWER_SELECT); app.click('[data-pt-quake-project]'); await flush();
    const status = app.query('#pt-quake-projection-status'); expect(document.activeElement).toBe(status); expect(status.tabIndex).toBe(-1); expect(status.getAttribute('aria-live')).toBe('off');
    const view = camera(app), before = physical(app); clearEffects(app);
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    app.select('3'); selected(app, 3, saved.points[3]);
    expect(app.query('#pt-quake-projection-status')).toBe(status); expect(document.activeElement).toBe(status);
    expect(app.query('[data-pt-quake-projection-panel]').contains(status)).toBe(true); expect(status.getAttribute('aria-live')).toBe('off'); expect(status.tabIndex).toBe(-1);
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('keeps checked readout coordinates fixed while newer events enter the live run', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('3');
    const sample = copiedSample(getModel()), projection = { ...getModel().observationProjection }, view = camera(app), html = app.query(READOUT).innerHTML;
    app.click('[data-pt-model-play]'); clearEffects(app); const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    for (let i = 0; i < 12; i++) app.frame();
    selected(app, 3, saved.points[3]); expect(app.query(READOUT).innerHTML).toBe(html); expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('12');
    expect(getModel().observationProjection).toEqual(projection); expect(copiedSample(getModel())).toEqual(sample);
    expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe('captured'); expect(camera(app)).toEqual(view);
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it('updates the live event number while keeping the same surviving observation and raw values', async () => {
    const getModel = captureModel(), app = mount(undefined); app.click('[data-pt-model-play]'); for (let i = 0; i < 200; i++) app.frame();
    await showSample(app); app.select('3'); const point = { x: getModel().observationProjection.x, z: getModel().observationProjection.z }, view = camera(app); clearEffects(app);
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'); app.frame(0.3);
    selected(app, 2, point); expect(getModel().observationProjection).toEqual({ ...point, index: 2, captured: false });
    expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe('live'); expect(app.query(SELECT).options).toHaveLength(201);
    expect(camera(app)).toEqual(view); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it('keeps the paused readout, exact evidence and keyboard focus quiet for 1200 idle frames', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('4'); app.query(SELECT).focus(); clearEffects(app);
    const status = app.query('#pt-quake-projection-status'), html = status.innerHTML, before = physical(app), view = camera(app), sample = copiedSample(getModel()), projection = { ...getModel().observationProjection };
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    for (let i = 0; i < 1200; i++) app.frame();
    selected(app, 4, saved.points[4]); expect(app.query('#pt-quake-projection-status')).toBe(status); expect(status.innerHTML).toBe(html);
    expect(status.getAttribute('aria-live')).toBe('off'); expect(physical(app)).toEqual(before); expect(camera(app)).toEqual(view);
    expect(copiedSample(getModel())).toEqual(sample); expect(getModel().observationProjection).toEqual(projection); expect(document.activeElement).toBe(app.query(SELECT));
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });
});

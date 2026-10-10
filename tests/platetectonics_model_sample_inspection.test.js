import fs from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Match the existing observation-inspector fixture's StrictMode/manual clock.
let React, ReactDOM, act, now = 0, frameId = 0;
const frames = new Map(), apps = [];
const SELECT = '[data-pt-quake-model-select]';
const lowerSelect = '[data-pt-quake-inspect-select]';
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
function coordinates(app) { return { x: app.query('[data-pt-quake-inspected-distance]')?.textContent, z: app.query('[data-pt-quake-inspected-depth]')?.textContent }; }
function camera(app) { return { view: app.query('[data-tect-gl]')?.dataset.tectView, cut: app.query('#tect-cut')?.value }; }
function physical(app) { return ['time', 'movement'].map(key => app.query('[data-pt-model-reading="' + key + '"]').textContent).concat(app.query('#pt-ql-dip')?.value, app.query('[data-pt-model-play]').textContent); }
function copiedSample(value) { return value?.observationSample?.points?.map(point => ({ x: point.x, z: point.z, ...(point.m == null ? {} : { m: point.m }) })) ?? null; }
function selected(app, index, point) {
  expect(app.query(SELECT).value).toBe(String(index));
  expect(app.query(lowerSelect).value).toBe(String(index));
  expect(app.query('[data-pt-quake-inspected-values]').dataset.ptQuakeInspectedValues).toBe(String(index));
  expect(coordinates(app)).toEqual({ x: String(point.x), z: String(point.z) });
  expect(app.query('[data-pt-quake-inspection-ring]').dataset.ptQuakeInspectionRing).toBe(String(index));
  expect(app.query('[data-pt-slab-coordinate-inspected="true"]').dataset.ptSlabCoordinateRow).toBe(String(index));
}

describe('Earthquake inspection beside the projected sample', () => {
  it('offers a local native chooser without automatically selecting a record', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); clearEffects(app);
    const fieldset = app.query('[data-pt-quake-model-inspector]'), select = app.query(SELECT);
    expect(fieldset.tagName).toBe('FIELDSET'); expect(fieldset.querySelector('legend')).not.toBeNull();
    expect(select.tagName).toBe('SELECT'); expect(select.value).toBe(''); expect(select.options).toHaveLength(9);
    expect(select.disabled).toBe(false); expect(select.style.minHeight).toBe('44px');
    expect(app.query('label[for="' + select.id + '"]')).not.toBeNull();
    for (const name of ['prev', 'next', 'clear']) { expect(app.query(modelControl(name)).disabled).toBe(true); expect(app.query(modelControl(name)).style.minHeight).toBe('44px'); }
    expect(getModel().observationProjection).toBeNull(); expect(copiedSample(getModel())).toEqual(saved.points);
    const ids = app.all('[id]').map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    expect(app.query('#pt-quake-projection-status').getAttribute('aria-live')).toBe('off'); noEffects(app);
  });

  it('links exact local choices to the same checked coordinates, plot ring and row without moving the view', async () => {
    const getModel = captureModel(), app = mount(), frozen = JSON.stringify(saved); await showSample(app); clearEffects(app);
    const before = physical(app), view = camera(app), sample = copiedSample(getModel()); app.query(SELECT).focus();
    const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'), focus = vi.spyOn(window.HTMLElement.prototype, 'focus');
    app.select('2'); selected(app, 2, saved.points[2]);
    expect(getModel().observationProjection).toEqual({ x: saved.points[2].x, z: saved.points[2].z, index: 2, captured: true });
    expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe('captured');
    expect(copiedSample(getModel())).toEqual(sample); expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before);
    expect(document.activeElement).toBe(app.query(SELECT)); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled();
    expect(JSON.stringify(saved)).toBe(frozen); noEffects(app);
  });

  it('moves Previous and Next only within the displayed sample and shares both inspectors', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); clearEffects(app); const view = camera(app), before = physical(app);
    app.select('0'); expect(app.query(modelControl('prev')).disabled).toBe(true);
    app.click(modelControl('next')); selected(app, 1, saved.points[1]); expect(getModel().observationProjection.index).toBe(1);
    app.click(modelControl('prev')); selected(app, 0, saved.points[0]);
    app.select('7'); expect(app.query(modelControl('next')).disabled).toBe(true);
    app.click('[data-pt-quake-inspect-prev]'); selected(app, 6, saved.points[6]);
    app.select('3', lowerSelect); selected(app, 3, saved.points[3]);
    expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('reflects a direct graph choice in the local model chooser', async () => {
    const app = mount(); await showSample(app); clearEffects(app); const plot = app.query('[data-pt-quake-plot]'), point = app.query('[data-pt-quake-point="5"]');
    const bounds = plot.getBoundingClientRect(), vb = plot.getAttribute('viewBox').split(' ').map(Number);
    const x = bounds.left + Number(point.getAttribute('cx')) * bounds.width / vb[2], y = bounds.top + Number(point.getAttribute('cy')) * bounds.height / vb[3];
    act(() => plot.dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: x, clientY: y })));
    selected(app, 5, saved.points[5]); noEffects(app);
  });

  it('keeps keyboard focus on the local chooser when an endpoint disables the clicked step button', async () => {
    const app = mount(); await showSample(app); app.select('1'); clearEffects(app);
    const view = camera(app), before = physical(app); app.query(modelControl('prev')).focus();
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    app.click(modelControl('prev')); selected(app, 0, saved.points[0]);
    expect(app.query(modelControl('prev')).disabled).toBe(true); expect(document.activeElement).toBe(app.query(SELECT));
    expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    app.select('6'); app.query(modelControl('next')).focus(); focus.mockClear();
    app.click(modelControl('next')); selected(app, 7, saved.points[7]);
    expect(app.query(modelControl('next')).disabled).toBe(true); expect(document.activeElement).toBe(app.query(SELECT));
    expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(scroll).not.toHaveBeenCalled(); expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('keeps coincident records distinct when using the local chooser and Next', async () => {
    const record = { version: 1, angle: 42, points: Array.from({ length: 8 }, () => ({ x: 100.125, z: 200.25, m: 4 })) };
    const getModel = captureModel(), app = mount(record); await showSample(app); clearEffects(app);
    app.select('1'); selected(app, 1, record.points[1]); expect(getModel().observationProjection.index).toBe(1);
    app.click(modelControl('next')); selected(app, 2, record.points[2]); expect(getModel().observationProjection.index).toBe(2);
    expect(app.query(SELECT).options).toHaveLength(9); expect(getModel().observationSample.points).toHaveLength(8); noEffects(app);
  });

  it('includes beyond-block observations and preserves their exact coordinates without clamping them', async () => {
    const record = { version: 1, angle: 42, points: saved.points.map((point, index) => ({ ...point, x: index === 7 ? 800 : point.x })) };
    const getModel = captureModel(), app = mount(record); await showSample(app); clearEffects(app);
    const view = camera(app); app.select('7'); selected(app, 7, record.points[7]);
    expect(getModel().observationProjection).toEqual({ x: 800, z: record.points[7].z, index: 7, captured: true });
    expect(app.query(SELECT).options).toHaveLength(9); expect(app.query('[data-pt-quake-sample-counts]').getAttribute('data-outside')).toBe('1');
    expect(app.query('[data-pt-quake-projection-limit]')).not.toBeNull(); expect(camera(app)).toEqual(view); noEffects(app);
  });

  it('clears the local selection while retaining the requested whole-sample pattern and its controls', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('4'); clearEffects(app);
    const sample = copiedSample(getModel()), view = camera(app), before = physical(app), button = app.query(modelControl('clear')); button.focus();
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    app.click(modelControl('clear')); await flush();
    expect(app.query(SELECT).value).toBe(''); expect(app.query(lowerSelect).value).toBe(''); expect(app.query('[data-pt-quake-inspected-values]')).toBeNull();
    expect(getModel().observationProjection).toBeNull(); expect(copiedSample(getModel())).toEqual(sample);
    expect(app.query('[data-pt-quake-model-inspector]')).not.toBeNull(); expect(app.query('[data-pt-quake-projection-panel]')).not.toBeNull();
    expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before);
    expect(document.activeElement).toBe(app.query(SELECT)); expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it.each(['clear', 'blank chooser'])('returns focus safely when %s removes an event-only projection panel', async method => {
    const getModel = captureModel(), app = mount(); app.select('3', lowerSelect); app.click('[data-pt-quake-project]'); await flush(); clearEffects(app);
    expect(getModel().observationSample).toBeNull(); const view = camera(app), before = physical(app);
    app.query(method === 'clear' ? modelControl('clear') : SELECT).focus();
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    if (method === 'clear') app.click(modelControl('clear')); else app.select(''); await flush();
    expect(app.query('[data-pt-quake-projection-panel]')).toBeNull(); expect(getModel().observationProjection).toBeNull(); expect(app.query(lowerSelect).value).toBe('');
    expect(document.activeElement).toBe(app.query('[data-tect-section]')); expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(scroll).not.toHaveBeenCalled(); expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('keeps the checked local chooser and projected coordinates fixed while a separate live log grows', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('3');
    const sample = copiedSample(getModel()), projection = { ...getModel().observationProjection }, view = camera(app); app.click('[data-pt-model-play]'); clearEffects(app);
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    for (let i = 0; i < 12; i++) app.frame();
    selected(app, 3, saved.points[3]); expect(app.query(SELECT).options).toHaveLength(9); expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('12');
    expect(copiedSample(getModel())).toEqual(sample); expect(getModel().observationProjection).toEqual(projection);
    expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe('captured'); expect(camera(app)).toEqual(view);
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it('follows a surviving observation as the live rolling sample changes its displayed event number', async () => {
    const getModel = captureModel(), app = mount(undefined); app.click('[data-pt-model-play]'); for (let i = 0; i < 200; i++) app.frame();
    await showSample(app); app.select('3'); const point = { x: getModel().observationProjection.x, z: getModel().observationProjection.z }, view = camera(app); clearEffects(app);
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'); app.frame(0.3);
    selected(app, 2, point); expect(getModel().observationProjection).toEqual({ ...point, index: 2, captured: false });
    expect(app.query(SELECT).options).toHaveLength(201); expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe('live');
    expect(camera(app)).toEqual(view); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it('clears an expired live selection without selecting its replacement or removing the requested pattern', async () => {
    const getModel = captureModel(), app = mount(undefined); app.click('[data-pt-model-play]'); for (let i = 0; i < 200; i++) app.frame();
    await showSample(app); app.select('0'); const view = camera(app); clearEffects(app);
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'); app.frame();
    expect(app.query(SELECT).value).toBe(''); expect(app.query(lowerSelect).value).toBe(''); expect(getModel().observationProjection).toBeNull();
    expect(getModel().observationSample.points).toHaveLength(200); expect(app.query(SELECT).options).toHaveLength(201);
    expect(app.query('[data-pt-quake-model-inspector]')).not.toBeNull(); expect(app.query('[data-pt-quake-inspection-ring]')).toBeNull();
    expect(camera(app)).toEqual(view); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it('returns deliberately to the existing graph and event list with focus while preserving the projected sample', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('2'); clearEffects(app);
    const before = physical(app), view = camera(app), sample = copiedSample(getModel()), projection = { ...getModel().observationProjection };
    const action = app.query(modelControl('return')); expect(action.type).toBe('button'); expect(action.style.minHeight).toBe('44px'); action.focus();
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'); app.click(modelControl('return')); await flush();
    expect(document.activeElement).toBe(app.query(lowerSelect)); expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledTimes(1); expect(scroll).toHaveBeenLastCalledWith({ block: 'center', behavior: 'auto' });
    expect(scroll.mock.instances[0]).toBe(app.query(lowerSelect));
    selected(app, 2, saved.points[2]); expect(copiedSample(getModel())).toEqual(sample); expect(getModel().observationProjection).toEqual(projection);
    expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('removes local model controls on log closure and restores the original lower selection without reopening the projection', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('2'); clearEffects(app); const view = camera(app), before = physical(app);
    act(() => { const log = app.query('[data-pt-quake-log]'); log.open = false; log.dispatchEvent(new window.Event('toggle', { bubbles: true })); }); await flush();
    expect(app.query('[data-pt-quake-model-inspector]')).toBeNull(); expect(getModel().observationSample).toBeNull(); expect(getModel().observationProjection).toBeNull();
    app.open(); expect(app.query(lowerSelect).value).toBe('2'); expect(coordinates(app)).toEqual({ x: String(saved.points[2].x), z: String(saved.points[2].z) });
    expect(app.query('[data-pt-quake-model-inspector]')).toBeNull(); expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it.each(['reset', 'mode', 'revise'])('clears the local projection controls on explicit %s with the existing persistence behavior', async action => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('2'); clearEffects(app);
    app.click(action === 'reset' ? '[data-pt-model-reset]' : action === 'mode' ? '[data-tect-mode="transform"]' : '[data-pt-slab-revise]'); await flush();
    expect(app.query('[data-pt-quake-model-inspector]')).toBeNull(); expect(getModel().observationSample).toBeNull(); expect(getModel().observationProjection).toBeNull();
    expect(app.query('[data-pt-quake-inspected-values]')).toBeNull();
    if (action === 'reset') {
      expect(app.effects.record).toHaveBeenCalledTimes(1); expect(app.effects.record).toHaveBeenCalledWith(null);
    } else expect(app.effects.record).not.toHaveBeenCalled();
    for (const key of ['depth', 'inquiry', 'draft', 'xp', 'beep']) expect(app.effects[key]).not.toHaveBeenCalled();
  });

  it('clears local inspection when Check captures a new sample and records only the existing deliberate check', async () => {
    const getModel = captureModel(), app = mount(undefined); app.click('[data-pt-model-play]'); for (let i = 0; i < 8; i++) app.frame(); app.click('[data-pt-model-play]');
    await showSample(app); app.select('2'); clearEffects(app); app.click('[data-pt-quake-lock]'); await flush();
    expect(app.query('[data-pt-quake-model-inspector]')).toBeNull(); expect(getModel().observationSample).toBeNull(); expect(getModel().observationProjection).toBeNull();
    expect(app.query('[data-pt-quake-inspected-values]')).toBeNull(); expect(app.effects.record).toHaveBeenCalledTimes(1);
    for (const key of ['depth', 'inquiry', 'draft', 'xp', 'beep']) expect(app.effects[key]).not.toHaveBeenCalled();
  });

  it('keeps paused local controls, exact evidence, focus and camera unchanged through 1200 idle frames', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('4'); clearEffects(app); app.query(SELECT).focus();
    const html = app.query('[data-pt-quake-projection-panel]').innerHTML, before = physical(app), view = camera(app), sample = copiedSample(getModel()), projection = { ...getModel().observationProjection };
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    for (let i = 0; i < 1200; i++) app.frame();
    expect(app.query('[data-pt-quake-projection-panel]').innerHTML).toBe(html); expect(physical(app)).toEqual(before); expect(camera(app)).toEqual(view);
    expect(copiedSample(getModel())).toEqual(sample); expect(getModel().observationProjection).toEqual(projection); expect(document.activeElement).toBe(app.query(SELECT));
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });
});

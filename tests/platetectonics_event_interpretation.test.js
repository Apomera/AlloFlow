import fs from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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


// Native interpretation uses the established manual-clock mount above.
// Readiness is mocked only for the UI's existing tap-help visibility gate;
// real renderer visibility and strokes belong to native WebGL/browser QA.
const INTERPRETATION = '[data-pt-quake-model-interpretation="true"]';
const BAND = '[data-pt-quake-model-band]';
const FIT_SAMPLE = '[data-pt-quake-model-fit-sample]';
const SIGNED = '[data-pt-quake-model-signed="true"]';
const HELP = '#pt-quake-sample-pick-help';
const INCLUDED = 'Included in the checked angle-fit sample: depth is at least 70 km.';
const EXCLUDED = 'Excluded from the checked angle fit: depth is below 70 km.';
const SIGNED_TEXT = 'In the graph, negative distances lie left of the zero-distance line; positive distances lie right. Turning the block does not change the recorded distance.';
const CAUTION = 'Compare several events before drawing a conclusion. One earthquake does not establish a slab angle or boundary type.';

function withEvent(point) { return { version: 1, angle: 42, points: [{ m: 4, ...point }, ...saved.points.map(point => ({ ...point }))] }; }
function interpretation(app) { const node = app.query(INTERPRETATION); expect(node).not.toBeNull(); expect(node.tagName).toBe('DETAILS'); return node; }
function openInterpretation(app) {
  const node = interpretation(app);
  act(() => { node.querySelector('summary').click(); node.dispatchEvent(new window.Event('toggle', { bubbles: true })); });
  expect(node.open).toBe(true); return node;
}
function disposeApp(app) { act(() => app.root.unmount()); app.host.remove(); apps.splice(apps.indexOf(app), 1); }
function key(app, key, shiftKey = false) { act(() => app.query('[data-tect-gl]').dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, key, shiftKey }))); }
function setCut(app, value) {
  const node = app.query('#tect-cut');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new window.Event('input', { bubbles: true })); node.dispatchEvent(new window.Event('change', { bubbles: true })); });
}
async function onePausedLiveEvent(app) { app.click('[data-pt-model-play]'); app.frame(); app.click('[data-pt-model-play]'); await showSample(app); app.select('0'); }

const actEnvironmentStates = [...new Set([window, globalThis])].map(target => ({
  target,
  descriptor: Object.getOwnPropertyDescriptor(target, 'IS_REACT_ACT_ENVIRONMENT')
}));
beforeAll(() => {
  for (const { target } of actEnvironmentStates) target.IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => {
  for (const { target, descriptor } of actEnvironmentStates) {
    if (descriptor) Object.defineProperty(target, 'IS_REACT_ACT_ENVIRONMENT', descriptor);
    else delete target.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Interpreting an exact selected earthquake beside the model', () => {
  it('offers one closed native disclosure after selection, retains the learner’s open state while selection changes and removes it on Clear', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app);
    expect(app.query(INTERPRETATION)).toBeNull(); app.select('2'); selected(app, 2, saved.points[2]);
    const node = interpretation(app), summary = node.querySelector('summary');
    expect(app.all(INTERPRETATION)).toHaveLength(1); expect(node.open).toBe(false); expect(node.hasAttribute('open')).toBe(false);
    expect(summary.tagName).toBe('SUMMARY'); expect(summary.textContent).toBe('Interpret this event');
    expect(node.textContent).toContain(CAUTION); expect(app.query(READOUT).contains(node)).toBe(true);
    const sample = copiedSample(getModel()), before = physical(app), view = camera(app); clearEffects(app); openInterpretation(app);
    expect(app.query('[data-pt-quake-log]').open).toBe(true); expect(copiedSample(getModel())).toEqual(sample);
    app.select('7'); selected(app, 7, saved.points[7]); expect(interpretation(app)).toBe(node); expect(node.open).toBe(true);
    expect(node.querySelector(BAND).dataset.ptQuakeModelBand).toBe('deep'); expect(node.querySelector(FIT_SAMPLE).textContent).toBe(INCLUDED);
    app.click(modelControl('clear')); await flush(); expect(app.query(INTERPRETATION)).toBeNull(); expect(app.query('[data-pt-quake-sample-counts]').dataset.total).toBe('8');
    expect(copiedSample(getModel())).toEqual(sample); expect(physical(app)).toEqual(before); expect(camera(app)).toEqual(view); noEffects(app);
  });

  it.each([
    [69.999, 'shallow', 'Shallow', '0–<70 km', 'excluded', EXCLUDED],
    [70, 'intermediate', 'Intermediate', '70–<300 km', 'included', INCLUDED],
    [299.999, 'intermediate', 'Intermediate', '70–<300 km', 'included', INCLUDED],
    [300, 'deep', 'Deep', '300–700 km', 'included', INCLUDED]
  ])('reads %s km using the correct band and checked fit membership', async (z, band, label, range, membership, message) => {
    const record = withEvent({ x: 125.1234567890123, z }), app = mount(record); await showSample(app); clearEffects(app); app.select('0');
    selected(app, 0, record.points[0]); const node = interpretation(app), reading = node.querySelector(BAND), fit = node.querySelector(FIT_SAMPLE);
    expect(reading.tagName).toBe('P'); expect(reading.dataset.ptQuakeModelBand).toBe(band); expect(reading.textContent).toContain(label); expect(reading.textContent).toContain(range);
    expect(fit.dataset.ptQuakeModelFitSample).toBe(membership); expect(fit.textContent).toBe(message);
    expect(app.query('[data-pt-slab-angle-sample-context]').dataset.usedCount).toBe(z < 70 ? '8' : '9');
    expect(node.open).toBe(false); noEffects(app);
  });

  it('includes a zero-distance record in a valid checked sample without changing its exact coordinates', async () => {
    const record = withEvent({ x: 0, z: 200 }), getModel = captureModel(), app = mount(record); await showSample(app); clearEffects(app); app.select('0');
    selected(app, 0, record.points[0]); expect(interpretation(app).querySelector(FIT_SAMPLE).textContent).toBe(INCLUDED);
    expect(getModel().observationProjection).toEqual({ x: 0, z: 200, index: 0, captured: true });
    expect(app.query('[data-pt-slab-angle-metric="fit"]').dataset.angleDeg).not.toBe(''); expect(app.query(SIGNED)).toBeNull(); noEffects(app);
  });

  it('keeps a valid 700 km event deep and exact when its 799.125 km distance lies beyond the finite block', async () => {
    const record = withEvent({ x: 799.125, z: 700 }), getModel = captureModel(), app = mount(record); await showSample(app); clearEffects(app); app.select('0');
    selected(app, 0, record.points[0]); const node = interpretation(app), band = node.querySelector(BAND);
    expect(band.dataset.ptQuakeModelBand).toBe('deep'); expect(band.textContent).toContain('300–700 km'); expect(node.querySelector(FIT_SAMPLE).textContent).toBe(INCLUDED);
    expect(app.query('#pt-quake-projection-status').dataset.ptQuakeProjectionStatus).toBe('outside-block');
    expect(app.query('[data-pt-quake-sample-counts]').dataset.outside).toBe('1'); expect(app.query('[data-pt-quake-sample-counts]').dataset.inbounds).toBe('8');
    expect(app.query('[data-pt-quake-projection-limit]').textContent).toContain('not moved to fit the picture');
    expect(getModel().observationProjection).toEqual({ x: 799.125, z: 700, index: 0, captured: true }); expect(copiedSample(getModel())).toEqual(record.points); noEffects(app);
  });

  it('places the single visible tap instruction immediately after the source and before the chooser', async () => {
    vi.spyOn(window.__alloTectGL, 'isReady').mockReturnValue(true); const app = mount(); await showSample(app);
    const source = app.query('[data-pt-quake-projection-source]'), help = app.query(HELP), chooser = app.query('[data-pt-quake-model-inspector]');
    expect(app.all(HELP)).toHaveLength(1); expect(source.nextElementSibling).toBe(help); expect(help.nextElementSibling).toBe(chooser);
    expect(help.textContent).toContain('Tap a hollow sample circle'); expect(app.query('[data-tect-gl]').getAttribute('aria-describedby').split(/\s+/)).toContain(help.id);
    app.select('2'); expect(app.query(HELP)).toBe(help); expect(app.all(HELP)).toHaveLength(1);
  });

  it('keeps tap guidance gated by loaded 3D, an exposed cut and a requested sample', async () => {
    const app = mount(); await showSample(app); expect(app.query(HELP)).toBeNull();
    vi.spyOn(window.__alloTectGL, 'isReady').mockReturnValue(true); app.select('0'); expect(app.query(HELP)).not.toBeNull();
    for (let i = 0; i < 4; i++) key(app, 'ArrowUp', true); expect(app.query(HELP)).toBeNull();
    expect(app.query('[data-tect-gl]').getAttribute('aria-describedby').split(/\s+/)).not.toContain('pt-quake-sample-pick-help');
    await showSample(app); expect(app.query(HELP)).not.toBeNull(); setCut(app, 100); expect(app.query(HELP)).toBeNull();
    await showSample(app); app.click('[data-tect-view="2d"]'); expect(app.query(HELP)).toBeNull();
    await showSample(app); expect(app.query(HELP)).not.toBeNull(); app.click('[data-pt-quake-sample-toggle]'); expect(app.query(HELP)).toBeNull();
  });

  it('explains a live depth without claiming membership in a checked fit even when the live sample is ready', async () => {
    const app = mount(undefined); app.click('[data-pt-model-play]'); for (let i = 0; i < 8; i++) app.frame(); app.click('[data-pt-model-play]');
    expect(app.query('[data-pt-quake-readiness]').dataset.ptQuakeReadiness).toBe('ready'); await showSample(app); clearEffects(app); app.select('0');
    expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe('live'); expect(interpretation(app).querySelector(BAND)).not.toBeNull();
    expect(app.query(FIT_SAMPLE)).toBeNull(); expect(interpretation(app).textContent).not.toContain('checked angle-fit sample'); noEffects(app);
  });

  it('does not treat incomplete, zero-weight, malformed or beyond-limit saved records as a checked fit', async () => {
    const invalid = [
      { ...saved, points: saved.points.map((point, i) => ({ ...point, z: i === 0 ? 10 : point.z })) },
      { ...saved, points: saved.points.map(point => ({ ...point, x: 0 })) },
      { ...saved, points: saved.points.map((point, i) => i === 0 ? { z: point.z } : { ...point }) },
      { ...saved, points: saved.points.map((point, i) => ({ ...point, z: i === 0 ? 800 : point.z })) }
    ];
    for (const record of invalid) {
      const app = mount(record); expect(app.query('[data-pt-slab-saved-note]')).toBeNull(); await onePausedLiveEvent(app); clearEffects(app);
      expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe('live');
      expect(interpretation(app).querySelector(BAND)).not.toBeNull(); expect(app.query(FIT_SAMPLE)).toBeNull(); noEffects(app); disposeApp(app);
    }
  });

  it('does not offer a slab-fit interpretation for divergent or transform events', async () => {
    for (const mode of ['divergent', 'transform']) {
      const app = mount(undefined); app.click('[data-tect-mode="' + mode + '"]'); await onePausedLiveEvent(app); clearEffects(app);
      expect(app.query('[data-pt-model-readings]').dataset.ptModelReadings).toBe(mode); expect(interpretation(app).querySelector(BAND).dataset.ptQuakeModelBand).toBe('shallow');
      expect(app.query(FIT_SAMPLE)).toBeNull(); expect(interpretation(app).textContent).not.toContain('checked angle'); noEffects(app); disposeApp(app);
    }
  });

  it('scopes a negative distance to graph coordinates while turning the 3D block and preserves every raw value', async () => {
    vi.spyOn(window.__alloTectGL, 'isReady').mockReturnValue(true);
    const record = withEvent({ x: -125.1234567890123, z: 100.625 }), getModel = captureModel(), app = mount(record); await showSample(app); app.select('0');
    const node = openInterpretation(app), before = camera(app), raw = JSON.stringify(record), sample = copiedSample(getModel()); clearEffects(app);
    expect(node.querySelector(SIGNED).textContent).toBe(SIGNED_TEXT); key(app, 'ArrowRight', true);
    expect(camera(app).view).not.toBe(before.view); expect(interpretation(app)).toBe(node); expect(node.open).toBe(true); expect(node.querySelector(SIGNED).textContent).toBe(SIGNED_TEXT);
    selected(app, 0, record.points[0]); expect(copiedSample(getModel())).toEqual(sample); expect(JSON.stringify(record)).toBe(raw);
    app.select('1'); expect(app.query(SIGNED)).toBeNull(); selected(app, 1, record.points[1]); noEffects(app);
  });

  it('keeps the opened interpretation, sample, model time and keyboard focus quiet for 125 paused frames', async () => {
    const getModel = captureModel(), app = mount(); await showSample(app); app.select('4'); const node = openInterpretation(app), summary = node.querySelector('summary'); summary.focus(); clearEffects(app);
    const html = node.innerHTML, view = camera(app), before = physical(app), sample = copiedSample(getModel()), projection = { ...getModel().observationProjection };
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    for (let i = 0; i < 125; i++) app.frame();
    expect(interpretation(app)).toBe(node); expect(node.open).toBe(true); expect(node.innerHTML).toBe(html); expect(document.activeElement).toBe(summary);
    expect(app.query('#pt-quake-projection-status').getAttribute('aria-live')).toBe('off'); selected(app, 4, saved.points[4]);
    expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); expect(copiedSample(getModel())).toEqual(sample); expect(getModel().observationProjection).toEqual(projection);
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });
});

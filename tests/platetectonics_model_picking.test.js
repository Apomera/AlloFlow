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
async function showSample(app) {
  app.click('[data-pt-quake-sample-project]'); await flush();
  app.canvasBounds={left:0,top:0,width:540,height:400};
  app.query('[data-tect-gl]').getBoundingClientRect=function(){
    const bounds=app.canvasBounds;
    return {...bounds,x:bounds.left,y:bounds.top,right:bounds.left+bounds.width,bottom:bounds.top+bounds.height};
  };
}
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

// These tests exercise the React gesture and selection contract. The native
// WebGL browser checks separately establish which on-screen circles are picked.
function picking() {
  const engine = window.__alloTectGL;
  vi.spyOn(engine, 'isReady').mockReturnValue(true);
  const pick = vi.spyOn(engine, 'pickObservationSample').mockReturnValue(null);
  const getModel = captureModel();
  return { pick, getModel };
}
function hit(app, index = 2, captured = true) {
  const point = app.record?.points?.[index];
  return { index, x: point.x, z: point.z, captured };
}
function pointer(app, type, values = {}) {
  const node = app.query('[data-tect-gl]');
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  const fields = { pointerId: 7, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
    pointerType: 'mouse', clientX: 100, clientY: 120, ...values };
  for (const [name, value] of Object.entries(fields)) Object.defineProperty(event, name, { value });
  act(() => node.dispatchEvent(event));
}
function tap(app, values = {}) { pointer(app, 'pointerdown', values); pointer(app, 'pointerup', values); }
function emptySelection(app) {
  const modelSelect = app.query(SELECT);
  if (modelSelect) expect(modelSelect.value).toBe('');
  expect(app.query(lowerSelect).value).toBe('');
  expect(app.query('[data-pt-quake-inspection-ring]')).toBeNull();
}

describe('Direct selection of projected earthquake circles', () => {
  it('selects the exact original record in both inspectors, graph and coordinate table without moving focus or the camera', async () => {
    const { pick, getModel } = picking(), app = mount(), frozen = JSON.stringify(saved);
    await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    const view = camera(app), before = physical(app), sample = copiedSample(getModel());
    app.query('[data-tect-gl]').focus();
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    tap(app);
    selected(app, 2, saved.points[2]);
    expect(pick).toHaveBeenCalledExactlyOnceWith(100, 120);
    expect(getModel().observationProjection).toEqual(hit(app));
    expect(copiedSample(getModel())).toEqual(sample); expect(JSON.stringify(saved)).toBe(frozen);
    expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before);
    expect(document.activeElement).toBe(app.query('[data-tect-gl]'));
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it.each(['mouse', 'touch', 'pen'])('accepts a primary %s tap with small movement without rotating the block', async pointerType => {
    const { pick, getModel } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    const view = camera(app); pointer(app, 'pointerdown', { pointerType });
    pointer(app, 'pointermove', { pointerType, clientX: 103, clientY: 124 });
    expect(camera(app)).toEqual(view);
    pointer(app, 'pointerup', { pointerType, clientX: 103, clientY: 124 });
    selected(app, 2, saved.points[2]); expect(getModel().observationProjection).toEqual(hit(app));
    expect(pick).toHaveBeenCalledExactlyOnceWith(103, 124); expect(camera(app)).toEqual(view); noEffects(app);
  });

  it('accepts movement exactly at the six-pixel tap limit', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    const view = camera(app); pointer(app, 'pointerdown'); pointer(app, 'pointermove', { clientX: 106 }); pointer(app, 'pointerup', { clientX: 106 });
    selected(app, 2, saved.points[2]); expect(camera(app)).toEqual(view); expect(pick).toHaveBeenCalledExactlyOnceWith(106, 120); noEffects(app);
  });

  it('rotates with the original start-relative deltas once movement exceeds the tap limit', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    const start = camera(app).view.split(',').map(Number), before = physical(app);
    pointer(app, 'pointerdown'); pointer(app, 'pointermove', { clientX: 130, clientY: 130 });
    const end = camera(app).view.split(',').map(Number);
    expect(end[0]).toBeCloseTo(Math.max(-88, Math.min(88, start[0] + 4)));
    expect(end[1]).toBeCloseTo(start[1] + 12); expect(end[2]).toBe(start[2]);
    pointer(app, 'pointerup', { clientX: 130, clientY: 130 });
    emptySelection(app); expect(pick).not.toHaveBeenCalled(); expect(physical(app)).toEqual(before); noEffects(app);
  });

  it('keeps an out-and-back drag a drag even when its release returns to the starting circle', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    pointer(app, 'pointerdown'); pointer(app, 'pointermove', { clientX: 140 }); pointer(app, 'pointermove'); pointer(app, 'pointerup');
    emptySelection(app); expect(pick).not.toHaveBeenCalled(); noEffects(app);
  });

  it('rejects a far release when the browser delivered no pointermove event', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    pointer(app, 'pointerdown'); pointer(app, 'pointerup', { clientX: 107 });
    emptySelection(app); expect(pick).not.toHaveBeenCalled(); noEffects(app);
  });

  it.each([{ isPrimary: false }, { button: 1 }, { button: 2 }])('ignores a disallowed starting pointer %j', async values => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    const view = camera(app); pointer(app, 'pointerdown', values); pointer(app, 'pointermove', { ...values, clientX: 140 }); pointer(app, 'pointerup', values);
    emptySelection(app); expect(pick).not.toHaveBeenCalled(); expect(camera(app)).toEqual(view); noEffects(app);
  });

  it('keeps gesture ownership with the initiating pointer', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    const view = camera(app); pointer(app, 'pointerdown');
    pointer(app, 'pointerdown', { pointerId: 8, clientX: 180 });
    pointer(app, 'pointermove', { pointerId: 8, clientX: 220 }); pointer(app, 'pointerup', { pointerId: 8 });
    expect(camera(app)).toEqual(view); expect(pick).not.toHaveBeenCalled(); emptySelection(app);
    pointer(app, 'pointerup'); selected(app, 2, saved.points[2]); expect(pick).toHaveBeenCalledOnce(); noEffects(app);
  });

  it.each(['pointercancel', 'lostpointercapture'])('cancels a gesture on matching %s', async type => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    pointer(app, 'pointerdown'); pointer(app, type); pointer(app, 'pointerup');
    emptySelection(app); expect(pick).not.toHaveBeenCalled();
    tap(app); selected(app, 2, saved.points[2]); expect(pick).toHaveBeenCalledOnce(); noEffects(app);
  });

  it.each(['pointercancel', 'lostpointercapture'])('ignores unrelated %s without dropping the active tap', async type => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    pointer(app, 'pointerdown'); pointer(app, type, { pointerId: 8 }); pointer(app, 'pointerup');
    selected(app, 2, saved.points[2]); expect(pick).toHaveBeenCalledOnce(); noEffects(app);
  });

  it('does nothing when the released position has no visible sample circle', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app); const view = camera(app);
    tap(app); expect(pick).toHaveBeenCalledOnce(); emptySelection(app); expect(camera(app)).toEqual(view); noEffects(app);
  });

  it.each(['negative index', 'beyond index', 'string index', 'different distance', 'different depth', 'wrong source'])('rejects picker results with %s', async problem => {
    const { pick } = picking(), app = mount(); await showSample(app); clearEffects(app);
    const result = hit(app);
    if (problem === 'negative index') result.index = -1;
    if (problem === 'beyond index') result.index = saved.points.length;
    if (problem === 'string index') result.index = '2';
    if (problem === 'different distance') result.x += 0.000001;
    if (problem === 'different depth') result.z += 0.000001;
    if (problem === 'wrong source') result.captured = false;
    pick.mockReturnValue(result); tap(app); emptySelection(app); noEffects(app);
  });

  it('retains separate coincident records by the picked original index', async () => {
    const record = { version: 1, angle: 42, points: Array.from({ length: 8 }, () => ({ x: 100.125, z: 200.25, m: 4 })) };
    const { pick, getModel } = picking(), app = mount(record); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app, 5));
    tap(app); selected(app, 5, record.points[5]); expect(getModel().observationProjection.index).toBe(5);
    expect(getModel().observationSample.points).toHaveLength(8); app.click(modelControl('next')); selected(app, 6, record.points[6]); noEffects(app);
  });

  it('keeps repeated selection and 1200 paused frames quiet with fixed evidence', async () => {
    const { pick, getModel } = picking(), app = mount(); await showSample(app); pick.mockReturnValue(hit(app)); tap(app); clearEffects(app);
    const view = camera(app), before = physical(app), sample = copiedSample(getModel()), projection = { ...getModel().observationProjection };
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    tap(app); tap(app); const calls = pick.mock.calls.length;
    for (let i = 0; i < 1200; i++) app.frame();
    selected(app, 2, saved.points[2]); expect(pick).toHaveBeenCalledTimes(calls);
    expect(camera(app)).toEqual(view); expect(physical(app)).toEqual(before); expect(copiedSample(getModel())).toEqual(sample);
    expect(getModel().observationProjection).toEqual(projection); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it('rejects a tap begun before the displayed live sample changes', async () => {
    const { pick, getModel } = picking(), app = mount(undefined); app.click('[data-pt-model-play]'); for (let i = 0; i < 8; i++) app.frame();
    await showSample(app); const original = { ...getModel().observationSample.points[2] }; pointer(app, 'pointerdown'); app.frame(); clearEffects(app);
    pick.mockReturnValue({ index: 2, x: original.x, z: original.z, captured: false }); pointer(app, 'pointerup');
    emptySelection(app); noEffects(app);
  });

  it('continues a checked tap while only the separate live log grows', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); app.click('[data-pt-model-play]'); clearEffects(app);
    pick.mockReturnValue(hit(app)); pointer(app, 'pointerdown'); app.frame(); pointer(app, 'pointerup');
    selected(app, 2, saved.points[2]); noEffects(app);
  });

  it('ignores a tap after its projected sample has been hidden', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); pick.mockReturnValue(hit(app)); pointer(app, 'pointerdown');
    app.click('[data-pt-quake-sample-toggle]'); clearEffects(app); pointer(app, 'pointerup');
    emptySelection(app); noEffects(app);
  });

  it('ignores a tap after the boundary mode changes', async () => {
    const { pick } = picking(), app = mount(); await showSample(app); pick.mockReturnValue(hit(app)); pointer(app, 'pointerdown');
    app.click('[data-tect-mode="transform"]'); clearEffects(app); pointer(app, 'pointerup');
    expect(app.query('[data-pt-quake-inspected-values]')).toBeNull(); expect(app.query('[data-pt-quake-inspection-ring]')).toBeNull(); noEffects(app);
  });

  it('preserves the exact intended sample event when surrounding content moves the unchanged canvas vertically during a tap', async () => {
    const { pick, getModel } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    app.canvasBounds={left:40,top:80,width:540,height:400};
    const before=camera(app),sample=copiedSample(getModel());pointer(app,'pointerdown');app.canvasBounds={...app.canvasBounds,top:102.75};pointer(app,'pointerup');
    selected(app,2,saved.points[2]);expect(pick).toHaveBeenCalledExactlyOnceWith(100,142.75);
    expect(camera(app)).toEqual(before);expect(copiedSample(getModel())).toEqual(sample);noEffects(app);
  });

  it('preserves the exact intended sample event when surrounding content moves the unchanged canvas horizontally during a tap', async () => {
    const { pick, getModel } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    app.canvasBounds={left:40,top:80,width:540,height:400};
    const before=camera(app),sample=copiedSample(getModel());pointer(app,'pointerdown');app.canvasBounds={...app.canvasBounds,left:57.5};pointer(app,'pointerup');
    selected(app,2,saved.points[2]);expect(pick).toHaveBeenCalledExactlyOnceWith(117.5,120);
    expect(camera(app)).toEqual(before);expect(copiedSample(getModel())).toEqual(sample);noEffects(app);
  });

  it('invalidates resized or invalid canvas taps while preserving rotation', async () => {
    const { pick, getModel } = picking(), app = mount(); await showSample(app); clearEffects(app); pick.mockReturnValue(hit(app));
    const original={left:0,top:0,width:540,height:400};
    const before=camera(app),sample=copiedSample(getModel());
    for(const dimension of ['width','height']){app.canvasBounds={...original};pointer(app,'pointerdown');app.canvasBounds={...app.canvasBounds,[dimension]:app.canvasBounds[dimension]+1};pointer(app,'pointerup');emptySelection(app);expect(pick).not.toHaveBeenCalled();}
    for(const invalid of [{width:0},{height:0},{left:NaN},{top:Infinity}]){app.canvasBounds={...original,...invalid};pointer(app,'pointerdown');app.canvasBounds={...original};pointer(app,'pointerup');emptySelection(app);expect(pick).not.toHaveBeenCalled();}
    expect(camera(app)).toEqual(before);expect(copiedSample(getModel())).toEqual(sample);noEffects(app);
    app.canvasBounds={...original,width:0};const start=camera(app).view.split(',').map(Number);
    pointer(app,'pointerdown');pointer(app,'pointermove',{clientX:140,clientY:130});pointer(app,'pointerup',{clientX:140,clientY:130});
    const end=camera(app).view.split(',').map(Number);expect(end[0]).toBeCloseTo(Math.max(-88,Math.min(88,start[0]+4)));expect(end[1]).toBeCloseTo(start[1]+16);
    emptySelection(app);expect(pick).not.toHaveBeenCalled();expect(copiedSample(getModel())).toEqual(sample);noEffects(app);
  });

});

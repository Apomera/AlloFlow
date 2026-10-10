import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Run from the repository root after installing this artifact under tests/.
// The fixture mounts the installed source only, with real React state and a
// manual animation clock. It does not replace the app's coordinate/fit helpers.
let React, ReactDOM, act, now = 0, frameId = 0, svgWidth = 460;
const frames = new Map(), apps = [];
const audioRequests = vi.fn(), audioStarts = vi.fn(), noop = () => {};
const audioParam = () => ({ value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop });
const audio = {
  state: 'running', currentTime: 0, sampleRate: 44100, destination: {},
  createOscillator: () => ({ frequency: audioParam(), connect: noop, start: audioStarts, stop: noop }),
  createGain: () => ({ gain: audioParam(), connect: noop }),
  createBiquadFilter: () => ({ frequency: audioParam(), Q: audioParam(), gain: audioParam(), connect: noop }),
  createBufferSource: () => ({ connect: noop, start: audioStarts, stop: noop }),
  createBuffer: (_channels, length) => ({ getChannelData: () => new Float32Array(length) })
};
const DEEP_EVENT = [0, .2, .8, .9, .5, .5];
const NEGATIVE_SHALLOW_EVENT = [0, .2, 0, 0, 0, .5];

beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.SVGElement.prototype.getBoundingClientRect = function () {
    const vb = (this.getAttribute('viewBox') || '0 0 460 354').split(' ').map(Number), height = svgWidth * vb[3] / vb[2];
    return { width: svgWidth, height, x: 0, y: 0, left: 0, top: 0, right: svgWidth, bottom: height };
  };
  window.SVGElement.prototype.getScreenCTM = () => ({ a: svgWidth / 460, b: 0, c: 0, d: svgWidth / 460, e: 0, f: 0 });
  if (!window.HTMLElement.prototype.scrollIntoView) Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value() {} });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool() {}, ensureThree: () => new Promise(() => {}), makeBayViewer: () => ({}), audioContext() { audioRequests(); return audio; } };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});

beforeEach(() => {
  frames.clear(); now = 0; svgWidth = 460; audioRequests.mockClear(); audioStarts.mockClear();
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});
afterEach(() => {
  while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); }
  frames.clear(); vi.restoreAllMocks();
});

function mount(slab = null) {
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOM.createRoot(host);
  const effects = Object.fromEntries(['record', 'depth', 'inquiry', 'draft', 'xp', 'beep', 'announce'].map(key => [key, vi.fn()]));
  let current = { slab: structuredClone(slab) };
  function Host({ seed }) {
    const [saved, setSaved] = React.useState(seed); current = saved;
    return React.createElement(window.AlloTectonicsInteractive, {
      darkMode: true, savedSlab: saved.slab, awardXP: effects.xp, beep: effects.beep, announceToSR: effects.announce,
      onRecordSlab(record) { effects.record(record); setSaved(prev => ({ ...prev, slab: record })); },
      onRecordDepths: effects.depth, onRecordBoundaryInquiry: effects.inquiry, onRecordBoundaryDraft: effects.draft
    });
  }
  const remount = () => { const seed = structuredClone(current); act(() => root.render(null)); act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { seed })))); };
  remount();
  const query = selector => host.querySelector(selector), all = selector => [...host.querySelectorAll(selector)];
  const click = selector => { const node = query(selector); expect(node, `Missing control: ${selector}`).not.toBeNull(); act(() => node.click()); };
  const open = (value = true) => act(() => { const log = query('[data-pt-quake-log]'); log.open = value; log.dispatchEvent(new window.Event('toggle', { bubbles: true })); });
  const select = (index, selector = '[data-pt-quake-inspect-select]') => act(() => {
    const node = query(selector); Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(node, String(index));
    node.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  const frame = (sequence = null) => {
    let index = 0;
    const random = vi.spyOn(Math, 'random').mockImplementation(sequence ? () => sequence[index++ % sequence.length] : () => .999999);
    now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); random.mockRestore();
  };
  const app = { host, root, query, all, click, open, select, frame, remount, effects, state: () => current };
  apps.push(app); return app;
}

function recordAtFit(angle, estimate = 42) {
  const slope = Math.tan(angle * Math.PI / 180);
  const points = Math.abs(angle) < 1
    ? Array.from({ length: 8 }, (_, i) => { const x = i % 2 ? -100 : 100; return { x, z: 100 + slope * x, m: 4.25 }; })
    : Array.from({ length: 8 }, (_, i) => {
      const maxDepth = Math.min(590, (angle < 0 ? 150 : 800) * Math.abs(slope) * .9);
      const z = 80 + (maxDepth - 80) * i / 7;
      return { x: z / slope, z, m: 4.25 };
    });
  return { version: 1, angle: estimate, points };
}
const positiveRecord = () => recordAtFit(45);
const mixedRecord = () => ({ ...positiveRecord(), points: [{ x: -125.1234567890123, z: 69.999, m: 3.75 }, ...positiveRecord().points] });
const points = app => app.all('[data-pt-quake-point]').map(node => ({ x: Number(node.dataset.distanceKm), z: Number(node.dataset.depthKm) }));
const fit = app => app.query('[data-pt-slab-line="fit"]');
const hint = app => app.query('[data-pt-quake-signed-distance-help]');
const origin = app => app.query('[data-pt-quake-origin-help]');
const counts = app => [...Object.values(app.effects), audioRequests, audioStarts].map(spy => spy.mock.calls.length);
const noEffects = app => { for (const spy of [...Object.values(app.effects), audioRequests, audioStarts]) expect(spy).not.toHaveBeenCalled(); };
const noRewardsOrWrites = app => { for (const key of ['record', 'depth', 'inquiry', 'draft', 'xp', 'beep']) expect(app.effects[key]).not.toHaveBeenCalled(); expect(audioStarts).not.toHaveBeenCalled(); };
function fitSlope(points) {
  const deep = points.filter(point => point.z >= 70);
  return deep.reduce((sum, point) => sum + point.x * point.z, 0) / deep.reduce((sum, point) => sum + point.x * point.x, 0);
}
function chart(app) {
  const gx = value => Number(app.query(`[data-pt-quake-grid="distance"][data-km="${value}"]`).getAttribute('x1'));
  const gz = value => Number(app.query(`[data-pt-quake-grid="depth"][data-km="${value}"]`).getAttribute('y1'));
  const x0 = gx(0), z0 = gz(0), scale = (gx(400) - gx(200)) / 200;
  expect(gz(400) - gz(200)).toBeCloseTo(200 * scale, 10);
  return { x0, z0, scale, left: gx(-150), right: gx(800), top: z0, bottom: z0 + 720 * scale,
    toKm: (x, z) => ({ x: (x - x0) / scale, z: (z - z0) / scale }) };
}
function endpoint(app) {
  const line = fit(app); expect(line).not.toBeNull();
  const values = ['x1', 'y1', 'x2', 'y2'].map(key => Number(line.getAttribute(key)));
  for (const value of values) expect(Number.isFinite(value)).toBe(true);
  return { x1: values[0], z1: values[1], x2: values[2], z2: values[3] };
}
function boundedFit(app, record) {
  const bounds = chart(app), line = endpoint(app);
  expect(line.x1).toBeCloseTo(bounds.x0, 10); expect(line.z1).toBeCloseTo(bounds.z0, 10);
  expect(line.x2).toBeGreaterThanOrEqual(bounds.left - 1e-8); expect(line.x2).toBeLessThanOrEqual(bounds.right + 1e-8);
  expect(line.z2).toBeGreaterThanOrEqual(bounds.top - 1e-8); expect(line.z2).toBeLessThanOrEqual(bounds.bottom + 1e-8);
  expect((line.z2 - line.z1) / (line.x2 - line.x1)).toBeCloseTo(fitSlope(record.points), 10);
  return { bounds, line, end: bounds.toKm(line.x2, line.z2) };
}
function described(app, selected = false) {
  const svg = app.query('[data-pt-quake-plot]'), ids = svg.getAttribute('aria-describedby').split(/\s+/);
  expect(ids).toContain('pt-ql-boundary-reference-help'); expect(ids).toContain('pt-ql-plot-selection-help');
  expect(ids).toContain(selected ? 'pt-ql-inspected-values' : 'pt-ql-equal-scale-help');
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(app.all(`[id="${id}"]`)).toHaveLength(1);
  expect(origin(app).id).toBe('pt-ql-boundary-reference-help'); expect(origin(app).textContent).toContain('0 km');
}
function captureModel() {
  const engine = window.__alloTectGL, original = engine.submit; let latest;
  vi.spyOn(engine, 'submit').mockImplementation(function (value) { latest = value; return original.call(engine, value); });
  return () => latest;
}
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

describe('Signed distance evidence stays inside a truthful graph', () => {
  it.each([[-45, 'left'], [-80, 'depth'], [-89, 'depth'], [-.05, 'left'], [-1e-8, 'left']])('bounds a %s° negative fit at the first %s edge without changing its slope', (angle, edge) => {
    const record = recordAtFit(angle), before = structuredClone(record), app = mount(record);
    expect(window.__alloPtSlabRecord(record)).toEqual(record);
    const { bounds, line, end } = boundedFit(app, record);
    if (edge === 'left') { expect(line.x2).toBeCloseTo(bounds.left, 10); expect(end.x).toBeCloseTo(-150, 9); }
    else { expect(line.z2).toBeCloseTo(bounds.bottom, 10); expect(end.z).toBeCloseTo(720, 9); expect(end.x).toBeGreaterThan(-150); }
    expect(end.x).toBeLessThan(0); expect(end.z).toBeGreaterThan(0);
    expect(app.query('[data-pt-slab-angle-comparison]').dataset.ptSlabAngleComparison).toBe('opposite');
    expect(Number(app.query('[data-pt-slab-angle-metric="fit"]').dataset.angleDeg)).toBeLessThan(0);
    expect(record).toEqual(before); expect(app.state().slab).toEqual(before); noEffects(app);
  });

  it.each([[15, 'right'], [45, 'depth'], [80, 'depth']])('preserves the existing %s° positive fit geometry at the %s edge', (angle, edge) => {
    const record = recordAtFit(angle), app = mount(record), { bounds, line, end } = boundedFit(app, record);
    if (edge === 'right') { expect(line.x2).toBe(bounds.right); expect(end.x).toBeCloseTo(800, 9); }
    else { expect(line.z2).toBeCloseTo(bounds.bottom, 10); expect(end.z).toBeCloseTo(720, 9); }
    expect(end.x).toBeGreaterThan(0); expect(end.z / end.x).toBeCloseTo(fitSlope(record.points), 11);
    expect(points(app)).toEqual(record.points.map(({ x, z }) => ({ x, z }))); noEffects(app);
  });

  it('preserves a zero fit as a finite horizontal line from the origin to 800 km', () => {
    const record = recordAtFit(0), app = mount(record), { bounds, line, end } = boundedFit(app, record);
    expect(line.x2).toBe(bounds.right); expect(line.z1).toBe(bounds.top); expect(line.z2).toBe(bounds.top);
    expect(end.x).toBeCloseTo(800, 10); expect(end.z).toBe(0);
    expect(app.query('[data-pt-slab-angle-comparison]').dataset.ptSlabAngleComparison).toBe('steeper'); noEffects(app);
  });

  it('renders an underflowed negative-zero fit as a finite horizontal line while retaining the tiny negative coordinate', () => {
    const paired = Array.from({ length: 8 }, (_, i) => ({ x: i % 2 ? -100 : 100, z: 70, m: 4 }));
    const record = { version: 1, angle: 42, points: [...paired, { x: -Number.MIN_VALUE, z: 70, m: 4 }] }, before = structuredClone(record);
    const rawFit = Math.atan(fitSlope(record.points)) * 180 / Math.PI;
    expect(Object.is(rawFit, -0)).toBe(true); expect(window.__alloPtSlabRecord(record)).toEqual(record);
    const app = mount(record), { bounds, line } = boundedFit(app, record);
    expect(line.x2).toBe(bounds.right); expect(line.z1).toBe(bounds.top); expect(line.z2).toBe(bounds.top);
    expect(app.query('[data-pt-slab-angle-metric="fit"]').dataset.angleDeg).toBe('0');
    expect(app.query('[data-pt-slab-angle-comparison]').dataset.ptSlabAngleComparison).toBe('steeper');
    expect(app.query('[data-pt-slab-angle-result]').dataset.ptQuakeFit).toBe('0');
    app.select(8);
    expect(app.query('[data-pt-quake-inspected-distance]').textContent).toBe(String(-Number.MIN_VALUE));
    expect(Object.is(Number(app.query('[data-pt-quake-point="8"]').dataset.distanceKm), -Number.MIN_VALUE)).toBe(true);
    expect(hint(app)).not.toBeNull(); expect(record).toEqual(before); expect(app.state().slab).toEqual(before); noEffects(app);
  });

  it.each([206, 244, 620])('keeps a negative edge tick and one zero boundary reference at %s CSS pixels', width => {
    const app = mount(positiveRecord()); svgWidth = width; act(() => window.dispatchEvent(new window.Event('resize')));
    const label = app.query('[data-pt-quake-axis-label="distance"][data-km="-150"]'), edge = app.query('[data-pt-quake-grid="distance"][data-km="-150"]');
    expect(label).not.toBeNull(); expect(edge).not.toBeNull();
    expect(label.textContent).toBe('−150'); expect(label.getAttribute('text-anchor')).toBe('end');
    expect(Number(label.getAttribute('font-size')) * width / 460).toBeCloseTo(14, 10);
    expect(Number(label.getAttribute('x'))).toBe(Number(edge.getAttribute('x1')));
    const zero = app.query('[data-pt-quake-axis-label="distance"][data-km="0"]');
    expect(Number(zero.getAttribute('x'))).toBeGreaterThan(Number(edge.getAttribute('x1')));
    expect(app.all('[data-pt-quake-boundary-reference]')).toHaveLength(1);
    expect(app.query('[data-pt-quake-boundary-reference]').dataset.km).toBe('0');
    expect(edge.hasAttribute('data-pt-quake-boundary-reference')).toBe(false); noEffects(app);
  });

  it.each([['all positive', positiveRecord()], ['zero distance', { ...positiveRecord(), points: [{ x: 0, z: 20 }, ...positiveRecord().points] }]])('avoids the conditional signed-distance sentence for %s records', (_name, record) => {
    const app = mount(record); expect(hint(app)).toBeNull(); described(app); noEffects(app);
  });

  it('explains even a small negative shallow coordinate in the same origin paragraph', () => {
    const record = { ...positiveRecord(), points: [{ x: -.0000001, z: 69.999 }, ...positiveRecord().points] }, app = mount(record);
    expect(hint(app).textContent.trim()).toBe('Negative distances lie left of that boundary. Positive distances lie right of it.');
    expect(origin(app).contains(hint(app))).toBe(true); expect(app.all('[data-pt-quake-origin-help]')).toHaveLength(1);
    expect(Number(app.query('[data-pt-quake-point="0"]').dataset.distanceKm)).toBe(-.0000001);
    expect(points(app)).toEqual(record.points.map(({ x, z }) => ({ x, z }))); noEffects(app);
  });

  it('resolves the signed-distance description before, during, and after event selection', () => {
    const app = mount(mixedRecord()); described(app);
    app.select(0); described(app, true);
    expect(app.query('[data-pt-quake-inspected-distance]').textContent).toBe('-125.1234567890123');
    app.click('[data-pt-quake-inspect-clear]'); described(app);
    expect(hint(app)).not.toBeNull(); expect(origin(app).closest('[aria-live]')?.getAttribute('aria-live') || 'off').toBe('off'); noEffects(app);
  });

  it('keeps signed point coordinates, identity, guides, and coordinate-table values exact', () => {
    const record = mixedRecord(), before = structuredClone(record), app = mount(record); app.select(0);
    const point = app.query('[data-pt-quake-point="0"]'), row = app.query('[data-pt-slab-coordinate-row="0"]');
    expect(point.dataset.ptQuakeInspected).toBe('true'); expect(row.dataset.ptSlabCoordinateInspected).toBe('true');
    expect(Number(row.dataset.distanceKm)).toBe(record.points[0].x); expect(Number(row.dataset.depthKm)).toBe(record.points[0].z);
    expect(app.query('[data-pt-quake-inspected-distance]').textContent).toBe(String(record.points[0].x));
    expect(app.query('[data-pt-quake-inspected-depth]').textContent).toBe(String(record.points[0].z));
    expect(Number(app.query('[data-pt-quake-guide="distance"]').getAttribute('x1'))).toBe(Number(point.getAttribute('cx')));
    expect(Number(app.query('[data-pt-quake-guide="depth"]').getAttribute('y1'))).toBe(Number(point.getAttribute('cy')));
    expect(points(app)).toEqual(record.points.map(({ x, z }) => ({ x, z }))); expect(app.state().slab).toEqual(before); expect(record).toEqual(before); noEffects(app);
  });

  it('keeps the captured hint while the fresh live log contains only positive distances, then follows that log on Revise', () => {
    const record = mixedRecord(), app = mount(record), saved = structuredClone(record), before = origin(app).textContent;
    app.click('[data-pt-model-play]'); app.frame(DEEP_EVENT);
    expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('1'); expect(origin(app).textContent).toBe(before);
    expect(points(app)).toEqual(record.points.map(({ x, z }) => ({ x, z }))); expect(hint(app)).not.toBeNull();
    app.click('[data-pt-slab-revise]');
    expect(points(app)).toHaveLength(1); expect(points(app)[0].x).toBeGreaterThan(0); expect(hint(app)).toBeNull();
    expect(fit(app)).toBeNull(); expect(app.state().slab).toEqual(saved); noRewardsOrWrites(app);
  });

  it('adds a live signed hint for a generated negative point without disclosing a fit or saving evidence', () => {
    const app = mount(); app.open(); expect(hint(app)).toBeNull(); app.click('[data-pt-model-play]'); app.frame(NEGATIVE_SHALLOW_EVENT);
    expect(points(app)).toHaveLength(1); expect(points(app)[0].x).toBeLessThan(0); expect(hint(app)).not.toBeNull();
    described(app); expect(fit(app)).toBeNull(); expect(app.query('[data-pt-slab-angle-result]')).toBeNull();
    expect(app.query('[data-pt-quake-lock]').disabled).toBe(true); noRewardsOrWrites(app);
  });

  it.each(['divergent', 'transform'])('uses the same signed reference in a generated %s observation', mode => {
    const app = mount(); app.open(); app.click(`[data-tect-mode="${mode}"]`); app.click('[data-pt-model-play]');
    app.frame([0, .2, 0, 0, .5]);
    expect(points(app)[0].x).toBeLessThan(0); expect(hint(app)).not.toBeNull(); described(app);
    expect(fit(app)).toBeNull(); expect(app.query('[data-pt-slab-angle-result]')).toBeNull(); noRewardsOrWrites(app);
  });

  it('removes signed help with the displayed sample on a boundary change and keeps the saved evidence for reentry', () => {
    const record = mixedRecord(), app = mount(record); expect(hint(app)).not.toBeNull();
    app.click('[data-tect-mode="divergent"]'); expect(points(app)).toHaveLength(0); expect(hint(app)).toBeNull(); described(app);
    app.click('[data-tect-mode="convergent"]'); expect(hint(app)).toBeNull(); expect(fit(app)).toBeNull();
    const before = counts(app); app.remount();
    expect(hint(app)).not.toBeNull(); expect(points(app)).toEqual(record.points.map(({ x, z }) => ({ x, z })));
    expect(counts(app)).toEqual(before); expect(app.state().slab).toEqual(record); noRewardsOrWrites(app);
  });

  it('Reset clears captured signed help and its saved record, allowing a fresh positive sample to be checked', () => {
    const app = mount(mixedRecord()); app.click('[data-pt-model-reset]');
    expect(hint(app)).toBeNull(); expect(fit(app)).toBeNull(); expect(points(app)).toHaveLength(0); expect(app.state().slab).toBeNull();
    expect(app.effects.record).toHaveBeenCalledTimes(1); expect(app.effects.record).toHaveBeenLastCalledWith(null);
    app.click('[data-pt-model-play]'); for (let i = 0; i < 8; i++) app.frame(DEEP_EVENT);
    expect(hint(app)).toBeNull(); expect(fit(app)).toBeNull(); app.click('[data-pt-quake-lock]');
    expect(app.effects.record).toHaveBeenCalledTimes(2); expect(fit(app)).not.toBeNull(); expect(hint(app)).toBeNull();
    expect(app.state().slab.points.every(point => point.x >= 0)).toBe(true); expect(app.effects.xp).not.toHaveBeenCalled(); expect(app.effects.beep).not.toHaveBeenCalled(); expect(audioStarts).not.toHaveBeenCalled();
  });

  it('restores accessible signed help through disclosure close/reopen and real unmount/remount', () => {
    const record = mixedRecord(), app = mount(record); app.select(0); const before = points(app), canonical = structuredClone(app.state().slab);
    app.open(false); expect(app.query('[data-pt-quake-plot]')).toBeNull(); app.frame(DEEP_EVENT); app.open();
    expect(points(app)).toEqual(before); described(app, true); expect(hint(app)).not.toBeNull();
    app.remount(); expect(points(app)).toEqual(before); described(app); expect(hint(app)).not.toBeNull();
    expect(app.state().slab).toEqual(canonical); noEffects(app);
  });

  it('submits the unchanged signed coordinates to the 3D sample and shares local event identity with the graph', async () => {
    const getModel = captureModel(), record = mixedRecord(), app = mount(record), before = structuredClone(record), svgPoints = points(app);
    app.click('[data-pt-quake-sample-project]'); await flush();
    expect(getModel().observationSample.points).toEqual(record.points);
    const afterEntry = counts(app); app.select(0, '[data-pt-quake-model-select]');
    expect(getModel().observationProjection).toEqual({ x: record.points[0].x, z: record.points[0].z, index: 0, captured: true });
    expect(app.query('[data-pt-quake-inspect-select]').value).toBe('0'); described(app, true);
    expect(getModel().observationSample.points).toEqual(before.points); expect(points(app)).toEqual(svgPoints);
    expect(app.query('[data-pt-quake-inspected-distance]').textContent).toBe(String(record.points[0].x));
    expect(app.state().slab).toEqual(before); expect(counts(app)).toEqual(afterEntry); noRewardsOrWrites(app);
  });

  it('keeps signed help, fit endpoints, exact points, and records quiet across 1,200 paused frames', () => {
    const record = recordAtFit(-.05), app = mount(record); app.select(1);
    const before = app.query('[data-pt-quake-log]').innerHTML, canonical = structuredClone(app.state().slab), readings = app.query('[data-pt-model-readings]').textContent;
    for (let i = 0; i < 1200; i++) app.frame(DEEP_EVENT);
    expect(app.query('[data-pt-quake-log]').innerHTML).toBe(before); expect(app.query('[data-pt-model-readings]').textContent).toBe(readings);
    expect(app.state().slab).toEqual(canonical); boundedFit(app, record); described(app, true); noEffects(app);
  });
});

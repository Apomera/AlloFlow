import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Install this fixture under tests/ and run it from the repository root.
// It always mounts the installed component; no candidate/source override is read.
let React, ReactDOM, act, now = 0, frameId = 0;
const frames = new Map(), apps = [];
const audioRequests = vi.fn(), audioStarts = vi.fn();
const noop = () => {};
const audioParam = () => ({ value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop });
const audio = {
  state: 'running', currentTime: 0, sampleRate: 44100, destination: {},
  createOscillator: () => ({ frequency: audioParam(), connect: noop, start: audioStarts, stop: noop }),
  createGain: () => ({ gain: audioParam(), connect: noop }),
  createBiquadFilter: () => ({ frequency: audioParam(), Q: audioParam(), gain: audioParam(), connect: noop }),
  createBufferSource: () => ({ connect: noop, start: audioStarts, stop: noop }),
  createBuffer: (_channels, length) => ({ getChannelData: () => new Float32Array(length) })
};

beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) {
    Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  }
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = {
    registerTool() {}, ensureThree: () => new Promise(() => {}), makeBayViewer: () => ({}),
    audioContext() { audioRequests(); return audio; }
  };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) {
    (0, eval)(fs.readFileSync(file, 'utf8'));
  }
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});

beforeEach(() => {
  frames.clear(); now = 0; audioRequests.mockClear(); audioStarts.mockClear();
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});

afterEach(() => {
  while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); }
  frames.clear(); vi.restoreAllMocks();
});

function mount(slab = null) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host);
  const writes = vi.fn(), depthWrites = vi.fn(), inquiryWrites = vi.fn(), draftWrites = vi.fn(), xp = vi.fn(), announce = vi.fn();
  let current = { slab: structuredClone(slab) };
  function Host({ seed }) {
    const [saved, setSaved] = React.useState(seed); current = saved;
    return React.createElement(window.AlloTectonicsInteractive, {
      savedSlab: saved.slab, darkMode: true, awardXP: xp, announceToSR: announce,
      onRecordSlab(record) { writes(record); setSaved(prev => ({ ...prev, slab: record })); },
      onRecordDepths: depthWrites, onRecordBoundaryInquiry: inquiryWrites, onRecordBoundaryDraft: draftWrites
    });
  }
  const remount = () => {
    const seed = structuredClone(current);
    act(() => root.render(null));
    act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { seed }))));
  };
  remount();
  const query = selector => host.querySelector(selector);
  const click = selector => {
    const node = query(selector); expect(node, `Missing control: ${selector}`).not.toBeNull();
    act(() => node.click());
  };
  const open = (value = true) => act(() => {
    const log = query('[data-pt-quake-log]'); log.open = value;
    log.dispatchEvent(new window.Event('toggle', { bubbles: true }));
  });
  const frame = (event = false) => {
    let index = 0; const sequence = [0, .2, .8, .9, .5, .5];
    const random = vi.spyOn(Math, 'random').mockImplementation(event ? () => sequence[index++ % sequence.length] : () => .999999);
    now += 1000;
    act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); });
    random.mockRestore();
  };
  const app = { host, root, query, click, open, frame, remount, writes, depthWrites, inquiryWrites, draftWrites, xp, announce, state: () => current };
  apps.push(app); return app;
}

function setInput(node, value) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value));
  act(() => node.dispatchEvent(new window.Event('input', { bubbles: true })));
}

function angleDraft(app, value, commit = false) {
  const node = app.query('[data-pt-slab-angle-number]'); act(() => node.focus()); setInput(node, value);
  if (commit) act(() => node.blur());
  return node;
}

function recordAtFit(fit, angle = 45) {
  const slope = Math.tan(fit * Math.PI / 180);
  // Symmetric distances can produce signed/zero fits while all depths qualify.
  const points = Math.abs(fit) < 1
    ? Array.from({ length: 8 }, (_, i) => { const x = i % 2 ? -100 : 100; return { x, z: 100 + slope * x, m: 4 }; })
    : Array.from({ length: 8 }, (_, i) => { const x = fit < 0 ? -80 - i * 8 : 100 + i * 30; return { x, z: x * slope, m: 4 }; });
  return { version: 1, angle, points };
}

function fitOf(points) {
  const used = points.filter(point => point.z >= 70);
  return Math.atan(used.reduce((sum, point) => sum + point.x * point.z, 0) / used.reduce((sum, point) => sum + point.x * point.x, 0)) * 180 / Math.PI;
}

const result = app => app.query('section[data-pt-slab-angle-result="checked"]');
const comparison = app => app.query('[data-pt-slab-angle-comparison]');
const metric = (app, key) => app.query(`dd[data-pt-slab-angle-metric="${key}"]`);
const displayedPoints = app => [...app.host.querySelectorAll('[data-pt-quake-point]')].map(node => ({ x: Number(node.dataset.distanceKm), z: Number(node.dataset.depthKm) }));
const effects = app => [app.writes, app.depthWrites, app.inquiryWrites, app.draftWrites, app.xp, app.announce, audioRequests, audioStarts].map(spy => spy.mock.calls.length);
const expectQuiet = app => {
  for (const spy of [app.writes, app.depthWrites, app.inquiryWrites, app.draftWrites, app.xp, app.announce, audioRequests, audioStarts]) expect(spy).not.toHaveBeenCalled();
};

function expectRawResult(app, record, kind) {
  const fit = fitOf(record.points), delta = record.angle - fit;
  const panel = result(app); expect(panel).not.toBeNull();
  expect(panel.getAttribute('data-pt-quake-fit')).toBe(String(Math.round(fit)));
  expect(panel.getAttribute('aria-live')).toBe('off');
  expect(metric(app, 'estimate').hasAttribute('data-angle-deg')).toBe(true);
  expect(metric(app, 'fit').hasAttribute('data-angle-deg')).toBe(true);
  expect(comparison(app).hasAttribute('data-fit-deg')).toBe(true);
  expect(comparison(app).hasAttribute('data-difference-deg')).toBe(true);
  expect(Number(metric(app, 'estimate').getAttribute('data-angle-deg'))).toBe(record.angle);
  expect(Number(metric(app, 'fit').getAttribute('data-angle-deg'))).toBeCloseTo(fit, 11);
  expect(comparison(app).getAttribute('data-pt-slab-angle-comparison')).toBe(kind);
  expect(Number(comparison(app).getAttribute('data-fit-deg'))).toBeCloseTo(fit, 11);
  expect(Number(comparison(app).getAttribute('data-difference-deg'))).toBeCloseTo(delta, 11);
}

function gather(app, count = 8) {
  app.open(); app.click('[data-pt-model-play]');
  for (let i = 0; i < count; i++) app.frame(true);
}

describe('Checked slab-angle feedback uses the captured evidence', () => {
  it('withholds fit metrics, comparison, and method until an explicit Check, even when eight events qualify', () => {
    const app = mount(); gather(app, 7);
    expect(app.query('[data-pt-quake-lock]').disabled).toBe(true);
    app.frame(true);
    expect(app.query('[data-pt-quake-lock]').disabled).toBe(false);
    for (const selector of ['[data-pt-slab-angle-result]', '[data-pt-slab-angle-metrics]', '[data-pt-slab-angle-comparison]', '[data-pt-slab-fit-method]', '[data-pt-slab-line="fit"]']) expect(app.query(selector)).toBeNull();
    expect(app.writes).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled();
    app.click('[data-pt-quake-lock]');
    expectRawResult(app, app.state().slab, 'shallower');
    expect(result(app).querySelector('h2,h3,h4')).not.toBeNull();
    const metrics = app.query('dl[data-pt-slab-angle-metrics]');
    expect(metrics.querySelectorAll('dt')).toHaveLength(2); expect(metrics.querySelectorAll('dd')).toHaveLength(2);
    expect(metrics.textContent).toMatch(/dashed/i); expect(metrics.textContent).toMatch(/solid/i);
    expect(app.writes).toHaveBeenCalledTimes(1); expect(app.xp).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(app.query('[data-pt-slab-revise]'));
  });

  it('commits pending keyboard input during Check and reports that committed estimate', () => {
    const app = mount(); gather(app);
    const node = angleDraft(app, '42');
    expect(document.activeElement).toBe(node); expect(app.query('#pt-ql-dip').value).toBe('20');
    app.click('[data-pt-quake-lock]');
    expect(app.state().slab.angle).toBe(42); expect(metric(app, 'estimate').textContent).toContain('42°');
    expectRawResult(app, app.state().slab, 'shallower');
    expect(document.activeElement).toBe(app.query('[data-pt-slab-revise]'));
    expect(app.writes).toHaveBeenCalledTimes(1);
  });

  it.each([37.5, 37.1234567890123])('restores the exact saved %s° estimate without rounding or rewriting it', angle => {
    const record = recordAtFit(45, angle), before = structuredClone(record), app = mount(record);
    expect(metric(app, 'estimate').textContent).toBe(`${angle}°`);
    expect(app.query('#pt-ql-dip').value).toBe(String(angle));
    expectRawResult(app, record, 'shallower');
    expect(app.state().slab).toEqual(before); expect(record).toEqual(before); expectQuiet(app);
  });

  it('calls genuinely equal restored decimal angles equal', () => {
    const record = recordAtFit(37.5, 37.5), app = mount(record);
    expectRawResult(app, record, 'equal');
    expect(comparison(app).textContent).toMatch(/same|match|equal/i);
    expect(comparison(app).textContent).not.toMatch(/steeper|shallower/i); expectQuiet(app);
  });

  it.each([-5e-8, 5e-8])('absorbs floating point fit differences of %s° into equality', offset => {
    const record = recordAtFit(45 + offset), app = mount(record);
    expectRawResult(app, record, 'equal');
    expect(comparison(app).textContent).not.toMatch(/steeper|shallower/i);
  });

  it.each([[-2e-7, 'steeper'], [2e-7, 'shallower']])('uses raw direction just beyond the equality tolerance (%s°)', (offset, kind) => {
    const record = recordAtFit(45 + offset), app = mount(record);
    expectRawResult(app, record, kind);
    expect(comparison(app).textContent).toContain(kind);
    expect(comparison(app).textContent).toMatch(/unrounded fit/i);
    expect(comparison(app).textContent).toMatch(/less than\s*0\.1°/i);
    expect(comparison(app).textContent).not.toMatch(/by\s+(?:about\s+)?0(?:\.0)?°/i);
  });

  it.each([[44.95, 'steeper'], [45.05, 'shallower']])('keeps the direction of a %s° fit when both values round to 45°', (fit, kind) => {
    const record = recordAtFit(fit), app = mount(record);
    expectRawResult(app, record, kind);
    expect(result(app).dataset.ptQuakeFit).toBe('45');
    expect(comparison(app).textContent).toContain(kind);
    expect(comparison(app).textContent).toMatch(/unrounded fit/i);
    expect(comparison(app).textContent).toMatch(/less than\s*0\.1°/i);
  });

  it.each([[57.3, 'steeper'], [32.7, 'shallower']])('explains the approximate size and direction of a %s° estimate', (angle, kind) => {
    const record = recordAtFit(45, angle), app = mount(record);
    expectRawResult(app, record, kind);
    expect(comparison(app).textContent).toContain(kind);
    expect(comparison(app).textContent).toContain('12.3°');
    expect(comparison(app).textContent).toMatch(/about|approximately/i);
    expect(metric(app, 'fit').textContent).toMatch(/about|approximately/i);
  });

  it('treats a raw zero fit as horizontal and compares a positive estimate as steeper', () => {
    const record = recordAtFit(0, 37.5), app = mount(record);
    expectRawResult(app, record, 'steeper');
    expect(Number(metric(app, 'fit').dataset.angleDeg)).toBe(0);
    expect(comparison(app).textContent).toContain('steeper');
    expect(comparison(app).textContent).not.toMatch(/opposite/i); expectQuiet(app);
  });

  it('describes direction for a saved negative fit instead of applying steeper or shallower', () => {
    const record = recordAtFit(-45), app = mount(record);
    expect(window.__alloPtSlabRecord(record)).toEqual(record);
    expectRawResult(app, record, 'opposite');
    expect(metric(app, 'fit').textContent).toMatch(/[-−]45/);
    expect(comparison(app).textContent).toMatch(/direction|opposite/i);
    expect(comparison(app).textContent).not.toMatch(/steeper|shallower/i); expectQuiet(app);
  });

  it('keeps a tiny negative fit visibly signed even when its rounded legacy value is zero', () => {
    const record = recordAtFit(-.05), app = mount(record);
    expectRawResult(app, record, 'opposite');
    expect(result(app).dataset.ptQuakeFit).toBe('0');
    expect(metric(app, 'fit').textContent).toBe('Between −0.1° and 0°');
    expect(comparison(app).textContent).toMatch(/direction|opposite/i);
    expect(comparison(app).textContent).not.toMatch(/steeper|shallower/i);
  });

  it('counts and fits depth 70 km exactly while excluding unrounded depths just below it', () => {
    const points = [{ x: 70, z: 70, m: 4 }, ...Array.from({ length: 7 }, (_, i) => ({ x: 100 + i * 20, z: 100 + i * 20, m: 4 })),
      { x: 800, z: 69.999, m: 4 }, { x: -150, z: 69.9999, m: 4 }, { x: 700, z: 0, m: 4 }];
    const record = { version: 1, angle: 45, points }, app = mount(record);
    expectRawResult(app, record, 'equal');
    const context = app.query('[data-pt-slab-angle-sample-context]');
    expect(context.dataset.usedCount).toBe('8'); expect(context.dataset.totalCount).toBe('11'); expect(context.dataset.excludedCount).toBe('3');
    expect(context.textContent).toContain('70');
    expect(Number(metric(app, 'fit').dataset.angleDeg)).toBeCloseTo(45, 12);
    expect(displayedPoints(app)).toEqual(points.map(({ x, z }) => ({ x, z })));
  });

  it.each([
    ['only seven qualifying depths', { version: 1, angle: 45, points: [...recordAtFit(45).points.slice(0, 7), { x: 500, z: 69.999 }] }],
    ['zero squared-distance denominator', { version: 1, angle: 45, points: Array.from({ length: 8 }, () => ({ x: 0, z: 100 })) }]
  ])('does not disclose feedback from an invalid saved sample with %s', (_reason, record) => {
    const before = structuredClone(record), app = mount(record);
    expect(window.__alloPtSlabRecord(record)).toBeNull();
    expect(result(app)).toBeNull(); expect(comparison(app)).toBeNull();
    expect(app.query('[data-pt-quake-lock]').disabled).toBe(true);
    expect(record).toEqual(before); expectQuiet(app);
  });

  it('keeps fitting method collapsed and preserves the legacy scientific explanation within it', () => {
    const record = recordAtFit(45, 37.5), app = mount(record);
    const method = app.query('details[data-pt-slab-fit-method]');
    expect(method.open).toBe(false); expect(method.querySelector('summary')).not.toBeNull();
    expect(method.textContent).toMatch(/0\s*km\s*distance/i);
    expect(method.textContent).toMatch(/0\s*km\s*depth/i);
    expect(method.textContent).toMatch(/boundary/i);
    expect(method.textContent).toMatch(/straight[- ]line/i);
    expect(method.textContent).toMatch(/eight|\b8\b/i);
    const legacy = 'The solid line fits 8 captured earthquakes at 70 km or deeper: about 45° from horizontal. Your estimate was 37.5°. In real subduction zones, the dipping earthquake band (Wadati–Benioff zone) helps trace the sinking slab. Deep earthquakes occur within the slab.';
    expect([...method.querySelectorAll('p')].some(node => node.textContent === legacy)).toBe(true);
    expect(result(app).textContent).toContain(legacy);
    const before = effects(app), canonical = structuredClone(app.state().slab);
    act(() => { method.open = true; method.dispatchEvent(new window.Event('toggle', { bubbles: true })); });
    expect(method.open).toBe(true); expect(app.query('[data-pt-quake-log]').open).toBe(true);
    expect(effects(app)).toEqual(before); expect(app.state().slab).toEqual(canonical);
  });

  it('keeps metrics, comparison, counts, and coordinates fixed while a fresh live run grows', () => {
    const record = recordAtFit(37.5, 42), app = mount(record);
    const before = result(app).outerHTML, points = displayedPoints(app), counts = app.query('[data-pt-slab-angle-sample-context]').outerHTML;
    app.click('[data-pt-model-play]'); app.frame(true); app.frame(true);
    expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('2');
    expect(result(app).outerHTML).toBe(before); expect(displayedPoints(app)).toEqual(points);
    expect(app.query('[data-pt-slab-angle-sample-context]').outerHTML).toBe(counts);
    expect(app.state().slab).toEqual(record); expect(app.writes).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled();
  });

  it('removes fit disclosure on Revise, preserves focus, and captures the new estimate only on recheck', () => {
    const record = recordAtFit(45, 37.5), app = mount(record), points = displayedPoints(app);
    app.click('[data-pt-slab-revise]');
    expect(document.activeElement).toBe(app.query('#pt-ql-dip'));
    for (const selector of ['[data-pt-slab-angle-result]', '[data-pt-slab-angle-comparison]', '[data-pt-slab-fit-method]', '[data-pt-slab-line="fit"]']) expect(app.query(selector)).toBeNull();
    expect(displayedPoints(app)).toEqual(points); expect(app.state().slab).toEqual(record); expect(app.writes).not.toHaveBeenCalled();
    angleDraft(app, 57, true); expect(result(app)).toBeNull();
    app.click('[data-pt-quake-lock]');
    expectRawResult(app, { ...record, angle: 57 }, 'steeper');
    expect(app.state().slab.points).toEqual(record.points); expect(app.writes).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(app.query('[data-pt-slab-revise]')); expect(app.xp).not.toHaveBeenCalled();
  });

  it('clears local disclosure on boundary change and restores canonical feedback only on reentry', () => {
    const record = recordAtFit(45, 37.5), app = mount(record);
    app.click('[data-tect-mode="divergent"]');
    expect(result(app)).toBeNull(); expect(app.query('[data-pt-slab-fit-method]')).toBeNull();
    expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('0'); expect(app.state().slab).toEqual(record);
    app.click('[data-tect-mode="convergent"]');
    expect(result(app)).toBeNull(); expect(app.query('[data-pt-quake-lock]').disabled).toBe(true);
    const beforeReentry = effects(app);
    app.remount(); expectRawResult(app, record, 'shallower');
    expect(effects(app)).toEqual(beforeReentry);
    expect(app.writes).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled(); expect(audioStarts).not.toHaveBeenCalled();
  });

  it('Reset clears the saved result and allows a new independent explicit check', () => {
    const app = mount(recordAtFit(45, 37.5));
    app.click('[data-pt-model-reset]');
    expect(app.state().slab).toBeNull(); expect(result(app)).toBeNull(); expect(app.query('[data-pt-slab-fit-method]')).toBeNull();
    expect(app.writes).toHaveBeenCalledTimes(1); expect(app.writes).toHaveBeenLastCalledWith(null);
    expect(app.query('[data-pt-quake-lock]').disabled).toBe(true);
    gather(app); app.click('[data-pt-quake-lock]');
    expect(app.writes).toHaveBeenCalledTimes(2); expect(app.state().slab.points).toHaveLength(8);
    expectRawResult(app, app.state().slab, 'shallower'); expect(app.xp).not.toHaveBeenCalled();
  });

  it('retains frozen feedback through disclosure close/reopen and actual component unmount/remount', () => {
    const record = recordAtFit(45.05, 45), app = mount(record), canonical = structuredClone(record), text = result(app).textContent;
    app.open(false); expect(app.query('[data-pt-quake-log]').open).toBe(false);
    app.frame(); app.open();
    expect(result(app).textContent).toBe(text); expect(app.state().slab).toEqual(canonical);
    app.remount();
    expectRawResult(app, canonical, 'shallower'); expect(result(app).textContent).toBe(text);
    expect(app.query('details[data-pt-slab-fit-method]').open).toBe(false);
    expect(app.query('[data-pt-slab-saved-note]').dataset.ptSlabSavedNote).toBe('restored'); expectQuiet(app);
  });

  it('reports a bounded 200-event sample without altering repeated coordinates or magnitudes', () => {
    const point = { x: 100, z: 100, m: 4.25 }, record = { version: 1, angle: 45, points: Array.from({ length: 200 }, () => ({ ...point })) };
    const before = structuredClone(record), app = mount(record);
    expectRawResult(app, record, 'equal');
    const context = app.query('[data-pt-slab-angle-sample-context]');
    expect(context.dataset.usedCount).toBe('200'); expect(context.dataset.totalCount).toBe('200'); expect(context.dataset.excludedCount).toBe('0');
    expect(displayedPoints(app)).toHaveLength(200); expect(app.state().slab).toEqual(before); expect(record).toEqual(before); expectQuiet(app);
  });

  it('does not write, award, ping, announce, or change frozen feedback during 1,200 paused frames', () => {
    const record = recordAtFit(45.05, 45), app = mount(record), before = result(app).outerHTML;
    const readings = app.query('[data-pt-model-readings]').textContent, points = displayedPoints(app), canonical = structuredClone(app.state().slab);
    expect(app.query('[data-pt-model-play]').textContent).toMatch(/Play/);
    for (let i = 0; i < 1200; i++) app.frame(true);
    expect(result(app).outerHTML).toBe(before); expect(displayedPoints(app)).toEqual(points);
    expect(app.query('[data-pt-model-readings]').textContent).toBe(readings);
    expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('8');
    expect(app.state().slab).toEqual(canonical); expectQuiet(app);
  });

  it('guards a repeated Check activation in one event turn against duplicate records or announcements', () => {
    const app = mount(); gather(app); const button = app.query('[data-pt-quake-lock]');
    const notices = app.announce.mock.calls.length;
    act(() => { button.click(); button.click(); });
    expect(app.writes).toHaveBeenCalledTimes(1); expect(app.announce).toHaveBeenCalledTimes(notices + 1);
    expectRawResult(app, app.state().slab, 'shallower'); expect(app.xp).not.toHaveBeenCalled();
  });
});

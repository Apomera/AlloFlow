import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, now = 0, frameId = 0;
const frames = new Map(), apps = [];
beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool() {}, ensureThree: () => new Promise(() => {}), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_RETAINED_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => {
  frames.clear(); now = 0;
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});
afterEach(() => { while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); } frames.clear(); vi.restoreAllMocks(); });
function mount(kind, initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), writes = vi.fn(), slabWrites = vi.fn(), depthWrites = vi.fn(), announce = vi.fn(), xp = vi.fn();
  let current = initial;
  function Host({ seed }) {
    const [saved, setSaved] = React.useState(seed); current = saved;
    return React.createElement(window[kind], {
      saved, savedSlab: saved.slab, depthRecords: saved.depthRecords, darkMode: true, awardXP: xp, announceToSR: announce,
      onRecord(patch) { writes(patch); setSaved(prev => ({ ...prev, ...patch })); },
      onRecordSlab(record) { slabWrites(record); setSaved(prev => ({ ...prev, slab: record })); },
      onRecordDepths(record) { depthWrites(record); setSaved(prev => ({ ...prev, depthRecords: { ...prev.depthRecords, [record.mode]: record } })); }
    });
  }
  const remount = () => { const seed = structuredClone(current); act(() => root.render(null)); act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { seed })))); };
  remount();
  const click = selector => act(() => host.querySelector(selector).click());
  const frame = (depth = null) => {
    let index = 0; const seq = [0, .3, .8, depth, .5, .5];
    const random = vi.spyOn(Math, 'random').mockImplementation(depth == null ? () => .999999 : () => seq[index++ % seq.length]);
    now += 1000; act(() => { for (const [id, cb] of [...frames]) if (frames.delete(id)) cb(now); }); random.mockRestore();
  };
  const app = { host, root, writes, slabWrites, depthWrites, announce, xp, remount, click, frame, state: () => current };
  apps.push(app); return app;
}
function input(app, selector, value) {
  const node = app.host.querySelector(selector);
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value));
  act(() => node.dispatchEvent(new window.Event('input', { bubbles: true })));
}
const savedSlab = angle => ({ version: 1, angle, points: Array.from({ length: 8 }, (_, i) => ({ x: 80 + i * 65, z: 80 + i * 65, m: 4.3 })) });

describe('Completed hotspot evidence survives retry', () => {
  it('reads legacy completed estimates without mutating them and rejects invalid rates', () => {
    const legacy = { est: 95, dir: 'nw' }, before = structuredClone(legacy);
    expect(window.__alloPtHotspotRecords(legacy)).toEqual({ completed: legacy, bestEst: 95, evidence: legacy });
    expect(legacy).toEqual(before);
    for (const bad of [NaN, Infinity, -1, 0, 201, '95']) expect(window.__alloPtHotspotRecords({ est: bad, dir: 'nw' })).toEqual({ completed: null, bestEst: null, evidence: null });
    expect(window.__alloPtHotspotRecords({ evidence: { est: 10, dir: 'nw' } }).evidence).toBeNull();
    expect(window.__alloPtHotspotRecords({ completed: { est: 95, dir: 'invalid' } }).completed.dir).toBeNull();
  });
  it('starts a retry without losing completed evidence, then restores draft controls quietly', () => {
    const app = mount('AlloTectonicsHotspotLab', { est: 95, dir: 'nw' });
    app.frame(); expect(app.writes).not.toHaveBeenCalled(); expect(app.announce).not.toHaveBeenCalled();
    app.click('[data-pt-hotspot-retry]');
    expect(app.state()).toMatchObject({ est: null, draftRate: 95, completed: { est: 95, dir: 'nw' }, bestEst: 95, evidence: { est: 95, dir: 'nw' } });
    expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeNull();
    expect(app.host.querySelector('#pt-hl-rate').disabled).toBe(false);
    expect(app.host.querySelector('[data-pt-hotspot-retained-evidence]').textContent).toContain('9.5');
    const writes = app.writes.mock.calls.length, notices = app.announce.mock.calls.length;
    app.remount(); for (let i = 0; i < 30; i++) app.frame();
    expect(app.host.querySelector('[data-pt-hotspot-lab]').dataset.ptHotspotLab).toBe('fitting');
    expect(app.writes).toHaveBeenCalledTimes(writes); expect(app.announce).toHaveBeenCalledTimes(notices); expect(app.xp).not.toHaveBeenCalled();
  });
  it('keeps the successful observation after a worse completed rate and direction', () => {
    const app = mount('AlloTectonicsHotspotLab', { est: 95, dir: 'nw' });
    app.click('[data-pt-hotspot-retry]'); input(app, '#pt-hl-rate', 10);
    app.click('input[type="radio"]:nth-child(1)'); // The current NW selection may be reaffirmed.
    act(() => app.host.querySelectorAll('input[type="radio"]')[1].click());
    act(() => { const lock = app.host.querySelector('[data-pt-hotspot-commit]'); lock.click(); lock.click(); });
    expect(app.state()).toMatchObject({ est: 10, dir: 'se', completed: { est: 10, dir: 'se' }, bestEst: 95, evidence: { est: 95, dir: 'nw' } });
    expect(app.writes.mock.calls.filter(([patch]) => patch.est === 10)).toHaveLength(1);
    app.remount(); expect(window.__alloPtHotspotRecords(app.state()).evidence).toEqual({ est: 95, dir: 'nw' });
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('does not attach an exploratory direction to a previous locked rate', () => {
    const app = mount('AlloTectonicsHotspotLab', { est: 95, dir: 'se' });
    app.click('[data-pt-hotspot-retry]'); act(() => app.host.querySelectorAll('input[type="radio"]')[0].click());
    expect(app.state().completed).toEqual({ est: 95, dir: 'se' });
    expect(window.__alloPtHotspotRecords(app.state()).evidence).toBeNull();
    app.click('[data-pt-hotspot-commit]'); expect(app.state().evidence).toEqual({ est: 95, dir: 'nw' });
  });
});

describe('Explicitly checked slab samples survive reentry', () => {
  it('validates bounded plain records including decimal angles and copies points', () => {
    const record = savedSlab(37.5), clean = window.__alloPtSlabRecord(record);
    expect(clean).toEqual(record); expect(clean.points[0]).not.toBe(record.points[0]);
    for (const patch of [{ angle: NaN }, { angle: 86 }, { version: 2 }, { points: [] }, { points: Array(201).fill(record.points[0]) }]) expect(window.__alloPtSlabRecord({ ...record, ...patch })).toBeNull();
    for (const point of [{ x: Infinity, z: 80 }, { x: 80, z: -1 }, { x: 80, z: 800 }, { x: 80, z: 80, m: NaN }]) expect(window.__alloPtSlabRecord({ ...record, points: [point, ...record.points.slice(1)] })).toBeNull();
  });
  it('restores the checked plot paused with no active quake replay or mount callbacks', () => {
    const app = mount('AlloTectonicsInteractive', { slab: savedSlab(37.5) });
    expect(app.host.querySelector('#pt-ql-dip').value).toBe('37.5');
    expect(app.host.querySelector('[data-pt-quake-fit]').textContent).toContain('37.5°');
    expect(app.host.querySelector('[data-pt-slab-saved-note]').dataset.ptSlabSavedNote).toBe('restored');
    const reading = app.host.querySelector('[data-pt-model-readings]').textContent;
    for (let i = 0; i < 30; i++) app.frame(.7);
    expect(app.host.querySelector('[data-pt-model-readings]').textContent).toBe(reading);
    expect(app.slabWrites).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled(); expect(app.announce).not.toHaveBeenCalled();
    expect(app.host.querySelector('[data-pt-depth-record]').disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-depth-preview-count]').textContent).toContain('saved angle check');
    app.click('[data-pt-depth-record]'); expect(app.depthWrites).not.toHaveBeenCalled();
  });
  it('does not recapture restored points with new run metadata, even after revising and checking the angle', () => {
    const app = mount('AlloTectonicsInteractive', { slab: savedSlab(38) });
    expect(window.__alloPtDepthTrials.capture({ mode: 'convergent', years: 0, rate: 5, qlog: savedSlab(38).points, qlogRestored: true })).toBeNull();
    app.click('[data-pt-slab-revise]'); input(app, '#pt-ql-dip', 42); app.click('[data-pt-quake-lock]');
    expect(app.state().slab.angle).toBe(42); expect(app.state().slab.points).toEqual(savedSlab(38).points);
    expect(app.host.querySelector('[data-pt-depth-record]').disabled).toBe(true); expect(app.depthWrites).not.toHaveBeenCalled();
  });
  it.each(['Play', 'Step'])('%s begins a fresh live log once while preserving the frozen checked plot', method => {
    const app = mount('AlloTectonicsInteractive', { slab: savedSlab(38) });
    const beforeFit = app.host.querySelector('[data-pt-quake-fit]').textContent;
    if (method === 'Play') {
      app.click('[data-pt-model-play]'); app.frame(.7);
    } else {
      let index = 0; const sequence = [0, .3, .8, .7, .5, .5];
      const random = vi.spyOn(Math, 'random').mockImplementation(() => sequence[index++ % sequence.length]);
      app.click('[data-pt-model-step]'); random.mockRestore();
    }
    expect(app.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('1');
    expect(app.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('8');
    expect(app.host.querySelector('[data-pt-quake-fit]').textContent).toBe(beforeFit);
    expect(app.state().slab).toEqual(savedSlab(38));
    app.click('[data-pt-depth-record]');
    expect(app.depthWrites).toHaveBeenCalledTimes(1);
    expect(app.depthWrites.mock.calls[0][0]).toMatchObject({ events: 1, years: 60000, rate: 5, minKm: 476, maxKm: 476 });
    if (method === 'Play') app.frame(.8);
    else {
      let index = 0; const sequence = [0, .3, .8, .8, .5, .5];
      const random = vi.spyOn(Math, 'random').mockImplementation(() => sequence[index++ % sequence.length]);
      app.click('[data-pt-model-step]'); random.mockRestore();
    }
    expect(app.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('2');
    expect(app.slabWrites).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled();
  });
  it('writes once on explicit Check using generated data, revises without erasing the record, and resets explicitly', () => {
    const app = mount('AlloTectonicsInteractive');
    act(() => [...app.host.querySelectorAll('button')].find(button => /Play$/.test(button.textContent)).click());
    for (const depth of [.08, .2, .31, .43, .56, .69, .82, .94]) app.frame(depth);
    expect(app.slabWrites).not.toHaveBeenCalled();
    act(() => { const check = app.host.querySelector('[data-pt-quake-lock]'); check.click(); check.click(); });
    expect(app.slabWrites).toHaveBeenCalledTimes(1); const stored = structuredClone(app.state().slab);
    expect(stored.points).toHaveLength(8);
    app.click('[data-pt-slab-revise]'); input(app, '#pt-ql-dip', 42);
    expect(app.slabWrites).toHaveBeenCalledTimes(1); expect(app.state().slab).toEqual(stored);
    app.remount(); expect(app.host.querySelector('#pt-ql-dip').value).toBe(String(stored.angle));
    app.click('[data-pt-model-reset]'); expect(app.slabWrites).toHaveBeenLastCalledWith(null); expect(app.state().slab).toBeNull();
    app.remount(); expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull(); expect(app.xp).not.toHaveBeenCalled();
  });
  it('changing boundary clears the live plot while preserving the last checked sample', () => {
    const app = mount('AlloTectonicsInteractive', { slab: savedSlab(42) });
    app.click('[data-tect-mode="divergent"]');
    expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull(); expect(app.slabWrites).not.toHaveBeenCalled();
    app.remount(); expect(app.host.querySelector('[data-pt-quake-fit]').textContent).toContain('42°');
    expect(app.slabWrites).not.toHaveBeenCalled();
  });
  it('ignores malformed saved samples without writing a cleanup or fabricating a fit', () => {
    const bad = savedSlab(40); bad.points[0].z = Infinity;
    const app = mount('AlloTectonicsInteractive', { slab: bad });
    expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull(); expect(app.host.querySelector('#pt-ql-dip').value).toBe('20');
    expect(app.slabWrites).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled();
  });
});

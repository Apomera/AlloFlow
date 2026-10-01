import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, now = 0, sequence = 0;
const frames = new Map(), roots = [];
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  for (const [key, value] of [['offsetWidth', 900], ['offsetHeight', 370]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = cb => { frames.set(++sequence, cb); return sequence; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  window.StemLab = { registerTool() {} };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_FORCE_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
}, 30000);
beforeEach(() => { frames.clear(); now = 0; for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now); });
afterEach(() => { while (roots.length) { const app = roots.pop(); act(() => app.root.unmount()); app.host.remove(); } frames.clear(); vi.restoreAllMocks(); });
function mount(initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), record = vi.fn(), announce = vi.fn(), xp = vi.fn();
  let saved = initial, saveExternal;
  function Host({ visible }) {
    const [state, setState] = React.useState(initial); saved = state; saveExternal = setState;
    return visible ? React.createElement(window.AlloTectonicsForces, { saved: state, awardXP: xp, announceToSR: announce,
      onRecord(patch) { record(patch); saved = { ...saved, ...patch }; setState(prev => ({ ...prev, ...patch })); } }) : null;
  }
  const render = visible => act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { visible }))));
  render(true);
  const click = selector => act(() => host.querySelector(selector).click());
  const frame = (count = 1) => { for (let i = 0; i < count; i++) { now += 100; act(() => { for (const [id, cb] of [...frames]) if (frames.delete(id)) cb(now); }); } };
  const api = () => host.querySelector('[data-pt-forces-canvas]')._ptForceDraft;
  const app = { root, host, record, announce, xp, click, frame, api, leave: () => render(false), enter: () => render(true), saved: () => saved,
    persist(snapshot) { act(() => saveExternal(prev => ({ ...prev, draft: snapshot }))); } };
  roots.push(app); return app;
}
function input(app, selector, value) {
  const node = app.host.querySelector(selector), proto = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, String(value));
  act(() => node.dispatchEvent(new window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })));
}
function predict(app, kind = 'cut') {
  app.click('[data-pt-forces-' + kind + ']');
  act(() => app.host.querySelectorAll('[data-pt-forces-predict] input')[1].click());
  app.click('[data-pt-forces-lock]');
}
const ui = patch => ({ pending: null, choice: null, watch: null, probes: [], probeKm: 400, probeSide: 'A', ...patch });

describe('Force snapshots and quiet restoration', () => {
  it('accepts actual terminal worlds and recomputes derived fields rather than trusting saved values', () => {
    const physics = window.__alloPtForces, storage = window.__alloPtForceDraft;
    for (const kind of ['free', 'cut', 'continent']) {
      const world = physics.make(); if (kind !== 'free') physics[kind](world);
      for (let i = 0; i < 12000 && !world.ended; i++) physics.step(world, .05);
      expect(world.ended).toBe('ridge');
      const draft = storage.capture(world, ui()); expect(draft).not.toBeNull();
      expect(draft.world.events).toBeUndefined(); expect(draft.world.vA).toBeUndefined();
      expect(storage.read({ ...draft, world: { ...draft.world, vA: Infinity, fsp: 100000 } })).toEqual(draft);
    }
  });
  it('rejects malformed, oversized, incoherent snapshots without mutation', () => {
    const world = window.__alloPtForces.make(); window.__alloPtForces.step(world, 1);
    const valid = window.__alloPtForceDraft.capture(world, ui());
    for (const patch of [{ t: Infinity }, { xR: 6000 }, { S: -1 }, { broke: true }, { stripsA: Array(513).fill(world.stripsA[0]) }, { contA: { x0: 4600, x1: 3900 } }]) expect(window.__alloPtForceDraft.read({ ...valid, world: { ...valid.world, ...patch } })).toBeNull();
    expect(window.__alloPtForceDraft.read({ ...valid, probes: Array(7).fill({ side: 'A', dist: 400, age: 8, t: 0 }) })).toBeNull();
    expect(window.__alloPtForceDraft.read({ ...valid, probeKm: '9'.repeat(30) })).toBeNull();
    const before = structuredClone(valid); window.__alloPtForceDraft.read(valid); expect(valid).toEqual(before);
  });
  it('mounts, idles and leaves an untouched or malformed draft without records or announcements', () => {
    for (const seed of [{}, { draft: { version: 1, world: { t: Infinity } } }]) {
      const app = mount(seed); app.frame(50); app.leave(); app.enter(); app.frame(50);
      expect(app.record).not.toHaveBeenCalled(); expect(app.announce).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled();
    }
  });
  it('restores an unfinished prediction without recording the prediction twice', () => {
    const app = mount(); app.click('[data-pt-forces-cut]'); act(() => app.host.querySelectorAll('[data-pt-forces-predict] input')[2].click());
    const saved = structuredClone(app.saved().draft), count = app.record.mock.calls.length;
    app.leave(); app.enter(); app.frame(30);
    expect(app.api().getSnapshot()).toEqual(saved); expect(app.record).toHaveBeenCalledTimes(count);
    expect(app.host.querySelectorAll('[data-pt-forces-predict] input')[2].checked).toBe(true); expect(app.saved().preds).toBeUndefined();
    act(() => { const lock = app.host.querySelector('[data-pt-forces-lock]'); lock.click(); lock.click(); });
    expect(app.saved().preds).toHaveLength(1); expect(app.record.mock.calls.filter(([patch]) => patch.preds)).toHaveLength(1);
  });
  it('retains a paused continent watch at the exact world time without resume or completion callbacks', () => {
    const app = mount(); predict(app, 'continent'); app.click('[data-pt-forces-run]'); app.click('[data-pt-forces-step]');
    const before = app.api().getSnapshot(), count = app.record.mock.calls.length, notices = app.announce.mock.calls.length;
    expect(before.world.t).toBeCloseTo(1); expect(before.watch.kind).toBe('continent');
    app.leave(); app.enter(); app.frame(50);
    expect(app.api().getSnapshot()).toEqual(before); expect(app.host.querySelector('[data-pt-forces-run]').dataset.ptForcesRun).toBe('false');
    expect(app.record).toHaveBeenCalledTimes(count); expect(app.announce).toHaveBeenCalledTimes(notices); expect(app.saved().observations).toBeUndefined();
  });
  it('checkpoints changed running work once on real unmount, without per-frame writes', () => {
    const app = mount(); predict(app, 'continent'); const count = app.record.mock.calls.length;
    app.frame(7); expect(app.record).toHaveBeenCalledTimes(count); const before = app.api().getSnapshot();
    expect(before.world.t).toBeCloseTo(.7); app.leave(); expect(app.record).toHaveBeenCalledTimes(count + 1);
    expect(app.saved().draft).toEqual(before); app.enter(); app.frame(30); expect(app.api().getSnapshot()).toEqual(before);
    expect(app.record).toHaveBeenCalledTimes(count + 1); expect(app.xp).not.toHaveBeenCalled();
  });
  it('does not repeat a centrally acknowledged navigation save during cleanup', () => {
    const app = mount(); app.click('[data-pt-forces-run]'); app.frame(4); const api = app.api(), snapshot = api.getSnapshot();
    app.persist(snapshot); api.acknowledgeSnapshot(snapshot); const count = app.record.mock.calls.length;
    app.leave(); app.enter(); expect(app.record).toHaveBeenCalledTimes(count); expect(app.api().getSnapshot()).toEqual(snapshot);
  });
  it('restores standalone probes and input choices, without fabricating completed force evidence', () => {
    const app = mount(); app.click('[data-pt-forces-probe-go]'); input(app, '[data-pt-forces-probe-km]', 600); app.click('[data-pt-forces-probe-go]');
    input(app, '[data-pt-forces-probe] select', 'B'); const before = app.api().getSnapshot(), count = app.record.mock.calls.length;
    expect(before.probes).toHaveLength(2); app.leave(); app.enter();
    expect(app.api().getSnapshot()).toEqual(before); expect(app.host.querySelector('[data-pt-forces-probe-km]').value).toBe('600');
    expect(app.host.querySelector('[data-pt-forces-probe] select').value).toBe('B'); expect(app.record).toHaveBeenCalledTimes(count); expect(app.saved().observations).toBeUndefined();
  });
  it('keeps the world when probe numeric entry is temporarily outside its saved bounds', () => {
    const app = mount(); app.click('[data-pt-forces-step]'); input(app, '[data-pt-forces-probe-km]', 100001);
    expect(app.saved().draft.world.t).toBeCloseTo(1); expect(app.saved().draft.probeKm).toBe('');
    app.leave(); app.enter(); expect(app.api().getSnapshot().world.t).toBeCloseTo(1); expect(app.host.querySelector('[data-pt-forces-probe-km]').value).toBe('');
  });
  it('does not auto-complete a restored watch even if its snapshot is already at the completion threshold', () => {
    const world = window.__alloPtForces.make(), before = world.vA; window.__alloPtForces.cut(world); const after = world.vA;
    for (let i = 0; i < 80; i++) window.__alloPtForces.step(world, .05);
    const draft = window.__alloPtForceDraft.capture(world, ui({ choice: 1, watch: { kind: 'cut', choice: 1, vBefore: before, vAfter: after, t0: 0 } }));
    const app = mount({ draft, preds: [{ a: 'cut', c: 1, ok: true, t: 0 }] }); app.frame(50);
    expect(app.record).not.toHaveBeenCalled(); expect(app.saved().observations).toBeUndefined();
    app.click('[data-pt-forces-step]'); expect(app.saved().observations).toHaveLength(1); expect(app.saved().draft.watch).toBeNull();
    const count = app.record.mock.calls.length; app.leave(); app.enter(); app.frame(30);
    expect(app.record).toHaveBeenCalledTimes(count); expect(app.saved().observations).toHaveLength(1); expect(app.saved().preds).toHaveLength(1);
  });
  it('clears only the draft on explicit Reset and does not resurrect it on unmount', () => {
    const observations = [{ a: 'cut', vBefore: 8, vAfter: 1, t: 3, mountainKm: null }], preds = [{ a: 'cut', c: 1, ok: true, t: 0 }];
    const app = mount({ observations, preds }); app.click('[data-pt-forces-step]'); app.click('[data-pt-forces-reset]');
    expect(app.saved().draft).toBeNull(); expect(app.saved().observations).toEqual(observations); expect(app.saved().preds).toEqual(preds);
    const count = app.record.mock.calls.length; app.leave(); app.enter(); app.frame(30);
    expect(app.record).toHaveBeenCalledTimes(count); expect(app.api().getSnapshot()).toBeNull(); expect(app.xp).not.toHaveBeenCalled();
  });
});

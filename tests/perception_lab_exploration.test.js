import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer, locked, requestLock, exitLock;
const descriptors = [];
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const tick = async () => act(async () => vi.advanceTimersByTime(300));
const seed = (activity = 'ring', patch = {}) => walk.normalize({ activity, player: walk.spawn(activity), ...patch });

function define(target, key, descriptor) {
  descriptors.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { configurable: true, ...descriptor });
}
function setLock(target) { locked = target; document.dispatchEvent(new Event('pointerlockchange')); }
async function look(x, y) {
  await act(async () => {
    const event = new MouseEvent('mousemove', { bubbles: true });
    Object.defineProperties(event, { movementX: { value: x }, movementY: { value: y } });
    document.dispatchEvent(event);
  });
}
async function pointer(selector, type, x = 20, y = 30) {
  const target = query(selector);
  target.setPointerCapture ||= vi.fn(); target.hasPointerCapture ||= () => true; target.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } });
    target.dispatchEvent(event);
  });
}
async function mount(activity = 'ring', patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(activity, patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
function allSolved(activity = 'ring') {
  const state = seed(activity);
  for (const id of Object.keys(state.progress)) state.progress[id].solved = true;
  for (const id of ['rotation', 'relief', 'shape', 'motion', 'frame', 'weave', 'landing', 'aperture', 'length']) state[id].completed = [0, 1];
  state.change.completed = [0, 1, 2];
  return walk.normalize(state);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); locked = null;
  requestLock = vi.fn(function () { setLock(this); });
  exitLock = vi.fn(() => setLock(null));
  define(HTMLElement.prototype, 'requestPointerLock', { writable: true, value: requestLock });
  define(document, 'pointerLockElement', { get: () => locked });
  define(document, 'exitPointerLock', { writable: true, value: exitLock });
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))();
  walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready',
      onStatusChange: fn => { report = fn; }, report: value => report(value), pick: vi.fn(() => null), onLayout: vi.fn() };
    return viewer;
  }) };
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = root = null;
  while (descriptors.length) {
    const [target, key, descriptor] = descriptors.pop();
    if (descriptor) Object.defineProperty(target, key, descriptor); else delete target[key];
  }
  vi.useRealTimers(); vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('room itinerary', () => {
  it('advances one room in either direction without wrapping the gallery edges', () => {
    const ids = Object.keys(seed().progress);
    ids.forEach((id, index) => {
      expect(walk.nextRoom(seed(id), 1)).toBe(ids[index + 1] || null);
      expect(walk.nextRoom(seed(id), -1)).toBe(ids[index - 1] || null);
    });
  });

  it('wraps next-unsolved selection while skipping solved rooms and the active room', () => {
    const state = allSolved('weave'); state.progress.context.solved = false;
    expect(walk.nextRoom(state, 1, true)).toBe('context');
    state.activity = 'context'; expect(walk.nextRoom(state, 1, true)).toBeNull();
    state.progress.scale.solved = false; expect(walk.nextRoom(state, 1, true)).toBe('scale');
  });

  it('leaves assisted puzzles available and does not mutate saved progress', () => {
    const state = allSolved('frame');
    state.progress.weave = { solved: false, assisted: true, hints: 2 }; state.notes.weave = 'Revisit from the side.';
    const before = structuredClone(state);
    expect(walk.nextRoom(state, 1, true)).toBe('weave'); expect(state).toEqual(before);
    expect(walk.nextRoom(allSolved(), 1, true)).toBeNull();
  });

  it('normalizes old saves before looking for unfinished rooms', () => {
    expect(walk.nextRoom(undefined, 1)).toBe('scale');
    expect(walk.nextRoom({ activity: 'unknown', progress: null }, 1, true)).toBe('scale');
    expect(walk.nextRoom({ activity: 'frame', progress: { weave: { solved: true } } }, 1, true)).toBe('weave');
  });

  it('keeps every room reachable in the compact strip and expands it without changing saved state', async () => {
    await mount('weave', { notes: { weave: 'Crossings matter.' } });
    const before = structuredClone(latest), toggle = query('[data-walk-all-rooms]');
    expect(host.querySelectorAll('[data-walk-activity]')).toHaveLength(18);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const nav = document.getElementById(toggle.getAttribute('aria-controls')); expect(nav).toBeTruthy();
    await click('[data-walk-all-rooms]'); expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await click('[data-walk-all-rooms]'); expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(latest).toEqual(before); expect(query('[data-walk-activity="weave"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('navigates in order with correct edge states while preserving notes and puzzle work', async () => {
    await mount('ring', { weave: { depths: [1, 0.2, -1], completed: [0] }, notes: { ring: 'Try another view.' }, progress: { scale: { solved: true } } });
    const original = structuredClone(latest.perceptionWalk);
    expect(query('[data-walk-previous-room]').disabled).toBe(true);
    await click('[data-walk-next-room]'); expect(latest.perceptionWalk.activity).toBe('scale'); expect(latest.perceptionWalk.player).toEqual(walk.spawn('scale'));
    await click('[data-walk-next-unsolved]'); expect(latest.perceptionWalk.activity).toBe('occlusion');
    await click('[data-walk-previous-room]'); expect(latest.perceptionWalk.activity).toBe('scale');
    await click('[data-walk-activity="length"]'); expect(query('[data-walk-next-room]').disabled).toBe(true);
    expect(latest.perceptionWalk.weave).toEqual(original.weave); expect(latest.perceptionWalk.notes).toEqual(original.notes);
    expect(latest.perceptionWalk.progress).toEqual(original.progress); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('disables next unsolved if only the current room remains unfinished', async () => {
    const state = allSolved('weave'); state.weave.completed = [];
    await mount('weave', state); expect(query('[data-walk-next-unsolved]').disabled).toBe(true);
    await click('[data-walk-activity="frame"]'); expect(query('[data-walk-next-unsolved]').disabled).toBe(false);
    await click('[data-walk-next-unsolved]'); expect(latest.perceptionWalk.activity).toBe('weave');
  });

  it.each([
    ['scale', '[data-walk-previous-room]', 'ring'],
    ['aperture', '[data-walk-next-room]', 'length']
  ])('moves focus from the disabled edge command when leaving %s', async (from, selector, destination) => {
    await mount(from); query(selector).focus(); await click(selector);
    expect(query(selector).disabled).toBe(true);
    expect(document.activeElement).toBe(query(`[data-walk-activity="${destination}"]`));
  });

  it('focuses the destination when next unsolved reaches the only unfinished room', async () => {
    const state = allSolved('frame'); state.weave.completed = [];
    await mount('frame', state); query('[data-walk-next-unsolved]').focus(); await click('[data-walk-next-unsolved]');
    expect(query('[data-walk-next-unsolved]').disabled).toBe(true);
    expect(document.activeElement).toBe(query('[data-walk-activity="weave"]'));
  });

  it('retains command focus while more rooms remain in that direction', async () => {
    await mount('ring'); query('[data-walk-next-room]').focus(); await click('[data-walk-next-room]');
    expect(latest.perceptionWalk.activity).toBe('scale'); expect(query('[data-walk-next-room]').disabled).toBe(false);
    expect(document.activeElement).toBe(query('[data-walk-next-room]'));
  });

  it('keeps the selected room visible on strip resize and cleans up each observer', async () => {
    const observers = [], scrollPage = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    define(globalThis, 'ResizeObserver', { value: class {
      constructor(callback) { this.callback = callback; this.observe = vi.fn(); this.disconnect = vi.fn(); observers.push(this); }
    } });
    await mount('weave'); const selected = query('[data-walk-activity="weave"]'), nav = selected.parentElement;
    expect(observers).toHaveLength(1); expect(observers[0].observe).toHaveBeenCalledWith(nav);
    nav.getBoundingClientRect = () => ({ left: 0, right: 200 });
    selected.getBoundingClientRect = () => ({ left: 120, right: 280 });
    await act(async () => observers[0].callback()); expect(nav.scrollLeft).toBe(84);
    selected.getBoundingClientRect = () => ({ left: -20, right: 140 });
    await act(async () => observers[0].callback()); expect(nav.scrollLeft).toBe(60);
    expect(scrollPage).not.toHaveBeenCalled();
    await click('[data-walk-activity="frame"]'); expect(observers[0].disconnect).toHaveBeenCalledTimes(1); expect(observers).toHaveLength(2);
    await click('[data-walk-all-rooms]'); expect(observers[1].disconnect).toHaveBeenCalledTimes(1); expect(observers).toHaveLength(2);
    await click('[data-walk-all-rooms]'); expect(observers).toHaveLength(3); expect(observers[2].observe).toHaveBeenCalledWith(nav);
    await act(async () => root.unmount()); root = null; expect(observers[2].disconnect).toHaveBeenCalledTimes(1);
  });

  it('falls back to window resizing and removes that listener when the strip unmounts', async () => {
    define(globalThis, 'ResizeObserver', { value: undefined });
    const added = vi.spyOn(window, 'addEventListener'), removed = vi.spyOn(window, 'removeEventListener');
    await mount('weave'); const selected = query('[data-walk-activity="weave"]'), nav = selected.parentElement;
    const callback = added.mock.calls.find(call => call[0] === 'resize')?.[1]; expect(callback).toBeTypeOf('function');
    nav.getBoundingClientRect = () => ({ left: 0, right: 200 }); selected.getBoundingClientRect = () => ({ left: 120, right: 280 });
    await act(async () => window.dispatchEvent(new Event('resize'))); expect(nav.scrollLeft).toBe(84);
    await act(async () => root.unmount()); root = null;
    expect(removed).toHaveBeenCalledWith('resize', callback);
    await act(async () => window.dispatchEvent(new Event('resize'))); expect(nav.scrollLeft).toBe(84);
  });

  it('stops playback and held movement when changing rooms', async () => {
    await mount('motion'); vi.useFakeTimers();
    await click('[data-walk-motion-play]'); await tick(); expect(latest.perceptionWalk.motion.phase).toBeGreaterThan(0);
    await click('[data-walk-next-room]'); const phase = latest.perceptionWalk.motion.phase; await tick();
    expect(latest.perceptionWalk.motion.phase).toBe(phase); expect(vi.getTimerCount()).toBe(0);
    await pointer('[data-walk-move="forward"]', 'pointerdown'); await tick();
    await click('[data-walk-next-room]'); const player = { ...latest.perceptionWalk.player }; await tick();
    expect(latest.perceptionWalk.player).toEqual(player); expect(vi.getTimerCount()).toBe(0);
  });
});

describe('optional first-person mouse look', () => {
  it('never captures the cursor until explicitly requested and reflects actual lock ownership', async () => {
    await mount(); expect(requestLock).not.toHaveBeenCalled(); expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
    await look(30, 20); expect(latest.perceptionWalk.player).toEqual(walk.spawn('ring'));
    await click('[data-walk-mouse-look]'); expect(requestLock).toHaveBeenCalledTimes(1);
    expect(locked).toBe(query('[data-walk-stage]')); expect(document.activeElement).toBe(locked);
    expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('true');
    await click('[data-walk-mouse-look]'); expect(locked).toBeNull(); expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
    const before = { ...latest.perceptionWalk.player }; await look(100, 100); expect(latest.perceptionWalk.player).toEqual(before);
  });

  it('uses relative motion with normalized yaw and bounded pitch without changing puzzle state', async () => {
    await mount('weave', { notes: { weave: 'Keep these beams.' }, weave: { depths: [1, 0, -1], seen: 3 } });
    const before = structuredClone(latest.perceptionWalk);
    await click('[data-walk-mouse-look]'); await look(100, 100);
    expect(latest.perceptionWalk.player).toEqual({ ...before.player, yaw: 20, pitch: -17 });
    await look(1000, -1000); expect(latest.perceptionWalk.player.yaw).toBe(-140); expect(latest.perceptionWalk.player.pitch).toBe(45);
    await look(0, 1000); expect(latest.perceptionWalk.player.pitch).toBe(-45);
    expect(latest.perceptionWalk.weave).toEqual(before.weave); expect(latest.perceptionWalk.progress).toEqual(before.progress);
    expect(latest.perceptionWalk.notes).toEqual(before.notes); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('honors fine movement sensitivity and ignores malformed motion values', async () => {
    await mount('scale', { precise: true }); await click('[data-walk-mouse-look]'); await look(100, 100);
    expect(latest.perceptionWalk.player.yaw).toBe(5); expect(latest.perceptionWalk.player.pitch).toBeCloseTo(-4.25);
    const before = { ...latest.perceptionWalk.player }; await look(NaN, Infinity); expect(latest.perceptionWalk.player).toEqual(before);
  });

  it('interacts at the crosshair while locked instead of starting an object drag', async () => {
    await mount('parallax');
    query('[data-walk-stage]').getBoundingClientRect = () => ({ left: 10, top: 20, width: 300, height: 200 });
    viewer.pick.mockReturnValue({ id: 'parallax-C' }); await click('[data-walk-mouse-look]');
    await pointer('[data-walk-stage]', 'pointerdown', 44, 55); await pointer('[data-walk-stage]', 'pointermove', 144, 155); await pointer('[data-walk-stage]', 'pointerup', 144, 155);
    expect(viewer.pick).toHaveBeenCalledExactlyOnceWith(160, 120); expect(latest.perceptionWalk.parallax.choice).toBe('C');
    expect(latest.perceptionWalk.player).toEqual(walk.spawn('parallax'));
  });

  it('retains keyboard movement and interaction while locked', async () => {
    await mount('parallax'); await click('[data-walk-mouse-look]'); viewer.pick.mockReturnValue({ id: 'parallax-B' });
    await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true })));
    expect(latest.perceptionWalk.player.z).toBeCloseTo(8.8); expect(locked).toBe(query('[data-walk-stage]'));
    await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })));
    expect(latest.perceptionWalk.parallax.choice).toBe('B');
  });

  it('returns keyboard focus to the mouse-look control when the browser releases capture', async () => {
    await mount(); await click('[data-walk-mouse-look]');
    await act(async () => setLock(null));
    expect(document.activeElement).toBe(query('[data-walk-mouse-look]')); expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
  });

  it.each(['Escape', 'Tab'])('exits and returns focus on %s without requiring a mouse click', async key => {
    await mount(); await click('[data-walk-mouse-look]');
    await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
    expect(locked).toBeNull(); expect(document.activeElement).toBe(query('[data-walk-mouse-look]'));
  });

  it.each(['[data-walk-next-room]', '[data-walk-home]', '[data-walk-face]', '[data-walk-diagram-toggle]'])('releases capture on %s', async selector => {
    await mount('scale'); await click('[data-walk-mouse-look]'); await click(selector);
    expect(locked).toBeNull(); expect(exitLock).toHaveBeenCalledTimes(1);
    const player = { ...latest.perceptionWalk.player }; await look(100, 100); expect(latest.perceptionWalk.player).toEqual(player);
  });

  it.each(['blur', 'hidden', 'renderer failure'])('releases capture on %s and permits later explicit re-entry', async reason => {
    await mount('scale'); await click('[data-walk-mouse-look]');
    await act(async () => {
      if (reason === 'blur') window.dispatchEvent(new Event('blur'));
      else if (reason === 'hidden') { define(document, 'hidden', { get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }
      else viewer.report('failed');
    });
    expect(locked).toBeNull(); expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
    if (reason === 'hidden') define(document, 'hidden', { get: () => false });
    if (reason === 'renderer failure') await act(async () => viewer.report('ready'));
    await click('[data-walk-mouse-look]'); expect(locked).toBe(query('[data-walk-stage]'));
  });

  it('does not move the camera or release another widget\'s pointer lock', async () => {
    await mount(); const other = document.createElement('div');
    await act(async () => setLock(other)); await look(100, 100);
    expect(latest.perceptionWalk.player).toEqual(walk.spawn('ring')); expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
    await click('[data-walk-next-room]'); expect(exitLock).not.toHaveBeenCalled(); expect(locked).toBe(other);
    await act(async () => root.unmount()); root = null; expect(exitLock).not.toHaveBeenCalled(); expect(locked).toBe(other);
  });

  it('disables mouse look without support, in Plan view and behind the closed shutter', async () => {
    define(HTMLElement.prototype, 'requestPointerLock', { value: undefined });
    await mount('change'); expect(query('[data-walk-mouse-look]').disabled).toBe(true);
    define(HTMLElement.prototype, 'requestPointerLock', { value: requestLock });
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-mouse-look]').disabled).toBe(true);
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-mouse-look]').disabled).toBe(false);
    await click('[data-walk-change-shutter]'); expect(query('[data-walk-mouse-look]').disabled).toBe(true);
    await click('[data-walk-mouse-look]'); expect(requestLock).not.toHaveBeenCalled();
    await click('[data-walk-change-shutter]'); expect(query('[data-walk-mouse-look]').disabled).toBe(false);
  });

  it.each(['throw', 'reject', 'event'])('recovers from a %s request failure without disabling normal exploration', async failure => {
    requestLock.mockImplementation(() => {
      if (failure === 'throw') throw new Error('denied');
      if (failure === 'reject') return Promise.reject(new Error('denied'));
      document.dispatchEvent(new Event('pointerlockerror'));
    });
    await mount(); await click('[data-walk-mouse-look]');
    expect(locked).toBeNull(); expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
    expect(query('[data-walk-status]').textContent).toMatch(/unavailable/i);
    await click('[data-walk-next-room]'); expect(latest.perceptionWalk.activity).toBe('scale');
    requestLock.mockImplementation(function () { setLock(this); }); await click('[data-walk-mouse-look]'); expect(locked).toBe(query('[data-walk-stage]'));
  });

  it('cancels pending capture when leaving the room and rejects a late lock acquisition', async () => {
    let resolveRequest; requestLock.mockImplementation(() => new Promise(resolve => { resolveRequest = resolve; }));
    await mount(); const stage = query('[data-walk-stage]'); await click('[data-walk-mouse-look]');
    expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
    await click('[data-walk-next-room]');
    await act(async () => { setLock(stage); resolveRequest(); });
    expect(locked).toBeNull(); expect(latest.perceptionWalk.activity).toBe('scale');
    expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
  });

  it('ignores an old rejected promise while a fresh capture request is pending', async () => {
    let rejectOld;
    requestLock.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject; })).mockImplementationOnce(() => undefined);
    await mount(); await click('[data-walk-mouse-look]'); await click('[data-walk-next-room]');
    await click('[data-walk-mouse-look]'); await act(async () => rejectOld(new Error('old cancellation')));
    expect(query('[data-walk-status]').textContent).toBe('');
    await act(async () => setLock(query('[data-walk-stage]')));
    expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('true');
    await look(10, 0); expect(latest.perceptionWalk.player.yaw).toBe(2);
  });

  it('uses request-specific promises instead of an unidentified error event for a newer request', async () => {
    let rejectOld, resolveNew;
    requestLock.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject; }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve; }));
    await mount('scale'); await click('[data-walk-mouse-look]'); await click('[data-walk-home]');
    await click('[data-walk-mouse-look]');
    await act(async () => { document.dispatchEvent(new Event('pointerlockerror')); rejectOld(new Error('old cancellation')); });
    expect(query('[data-walk-status]').textContent).toBe('');
    await act(async () => { setLock(query('[data-walk-stage]')); resolveNew(); });
    expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('true');
    await look(10, 0); expect(latest.perceptionWalk.player.yaw).toBe(2);
  });

  it('waits for the actual browser event and cancels late legacy void requests', async () => {
    requestLock.mockImplementation(() => undefined);
    await mount(); const stage = query('[data-walk-stage]'); await click('[data-walk-mouse-look]');
    expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
    await look(50, 50); expect(latest.perceptionWalk.player).toEqual(walk.spawn('ring'));
    await click('[data-walk-home]'); await act(async () => setLock(stage));
    expect(locked).toBeNull(); expect(query('[data-walk-mouse-look]').getAttribute('aria-pressed')).toBe('false');
  });

  it('stops movement and playback timers before entering mouse look', async () => {
    await mount('motion'); vi.useFakeTimers(); await click('[data-walk-motion-play]'); await tick();
    await click('[data-walk-mouse-look]'); const phase = latest.perceptionWalk.motion.phase; await tick();
    expect(latest.perceptionWalk.motion.phase).toBe(phase); expect(vi.getTimerCount()).toBe(0);
    await click('[data-walk-mouse-look]'); await pointer('[data-walk-move="forward"]', 'pointerdown'); await tick();
    await click('[data-walk-mouse-look]'); const player = { ...latest.perceptionWalk.player }; await tick();
    expect(latest.perceptionWalk.player).toEqual(player); expect(vi.getTimerCount()).toBe(0);
  });

  it('releases an owned lock and removes document listeners when the component unmounts', async () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    await mount(); await click('[data-walk-mouse-look]'); const instance = viewer;
    await act(async () => root.unmount()); root = null;
    expect(locked).toBeNull(); expect(instance.dispose).toHaveBeenCalledTimes(1);
    for (const type of ['pointerlockchange', 'pointerlockerror', 'mousemove']) expect(remove.mock.calls.some(call => call[0] === type)).toBe(true);
  });

  it('releases a late successful request even after unmount', async () => {
    let resolveRequest; requestLock.mockImplementation(() => new Promise(resolve => { resolveRequest = resolve; }));
    await mount(); const stage = query('[data-walk-stage]'); await click('[data-walk-mouse-look]');
    await act(async () => root.unmount()); root = null;
    await act(async () => { setLock(stage); resolveRequest(); }); expect(locked).toBeNull();
  });
});

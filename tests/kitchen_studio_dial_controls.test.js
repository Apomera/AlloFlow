import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const G = require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const body = readFileSync('stem_lab/kitchen_studio/index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const touchSource = readFileSync('stem_lab/kitchen_studio/kitchen_studio_touch.js', 'utf8');
const mounted = [];
const origin = { x: 100, y: 100 };
const moved = dy => ({ x: origin.x, y: origin.y + dy });
const copy = value => JSON.parse(JSON.stringify(value));
const levels = ['off', 'low', 'medium', 'high'];

function trace(initial, dy, unit = 1) {
  return G.move(G.begin('dial', origin, { level: initial, unit }), moved(dy));
}

function fixture({ initial = 0, closeup = false, height = 420 } = {}) {
  document.body.innerHTML = body;
  window.KitchenStudio = K;
  window.KitchenStudioGestures = G;
  vm.runInNewContext(touchSource, { window });
  const canvas = document.createElement('canvas');
  document.getElementById('scene').appendChild(canvas);
  const rect = { left: 100, top: 80, width: 600, height };
  const bounds = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height });
  canvas.getBoundingClientRect = bounds;
  let hidden = false, blocked = false, visible = true, state = K.start('heat');
  if (initial) state = K.act(state, levels[initial]);
  canvas.getClientRects = () => visible ? [bounds()] : [];
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const captured = new Set();
  canvas.setPointerCapture = vi.fn(id => captured.add(id));
  canvas.hasPointerCapture = vi.fn(id => captured.has(id));
  canvas.releasePointerCapture = vi.fn(id => captured.delete(id));
  const dial = { id: 'dial', name: 'heat dial', station: 'heat', kind: 'dial', objects: [{ visible: true }], hint: 'Turn the rim or drag the centre up or down toward Off.' };
  const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const events = [];
  const host = {
    canvas, orbit: { enabled: true }, getState: () => state,
    hidden: () => hidden, locked: () => hidden || blocked || state.done || state.submitted,
    pick: () => dial, inputTool: info => info,
    point: e => ({ x: e.clientX, y: 1.65, z: e.clientY }), dialPoint: () => ({ x: 0, z: 0 }),
    capture: () => [], highlight: vi.fn(), draw: vi.fn(),
    preview: vi.fn(g => events.push(g ? 'preview' : 'clear')),
    feedback: vi.fn(), tools: () => [dial], available: id => id === 'dial', reveal: vi.fn(() => true),
    keyboardPoint: () => ({ ...centre }), keyboardTargets: () => [],
    destination: vi.fn(() => ({ action: null, message: 'No carry destination.' })),
    act: vi.fn(action => { events.push('act:' + action); state = K.act(state, action); }),
    view: vi.fn(), inspect: vi.fn(), select: vi.fn(), interactionMode: vi.fn(), fridgeOpen: () => false,
    dialCloseup: () => closeup, panCloseup: () => false, boardCloseup: () => false,
    probeCloseup: () => false, containerCloseup: () => false, measureInspecting: () => false,
    panMode: () => 'arrange', platingMode: () => 'quick', pourMode: () => 'portion',
    probeDepth: () => 0, lidsOpen: () => false
  };
  const adapter = window.KitchenStudioTouch.mount(host);
  mounted.push(adapter);
  return { adapter, host, canvas, centre, events, state: () => state,
    setState: next => { state = next; }, setBlocked: next => { blocked = next; },
    setHidden: next => { hidden = next; }, setVisible: next => { visible = next; } };
}

function pointer(f, type, dy = 0, id = 77) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: f.centre.x, clientY: f.centre.y + dy });
  Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'mouse' }, isPrimary: { value: true } });
  f.canvas.dispatchEvent(event);
}

function oneHeatAction(before, after, setting) {
  expect(after.log).toHaveLength(before.log.length + 1);
  expect(after.log.at(-1)).toMatchObject({ action: setting, accepted: true });
  expect(after.values.heat).toBe(setting === 'off' ? null : setting);
  expect({ ...after.values, heat: null }).toEqual({ ...before.values, heat: null });
  expect(after.done).toBe(before.done);
}

afterEach(() => {
  mounted.splice(0).forEach(adapter => adapter.dispose());
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Four-setting centre dial movement', () => {
  it.each([0, 1, 2, 3])('retains the actual starting setting %i without an action', level => {
    const start = G.begin('dial', origin, { level, dialPoint: { x: 0, z: 0 } });
    expect(start).toMatchObject({ initialLevel: level, level, turn: null });
    expect(G.finish(start)).toMatchObject({ complete: false, action: null });
    expect(G.progress(start)).toBe(0);
  });

  it.each([[0, 1], [0, 2], [0, 3], [1, 0], [1, 2], [1, 3], [2, 0], [2, 1], [2, 3], [3, 0], [3, 1], [3, 2]])('moves from setting %i to %i through the centre', (from, to) => {
    const result = trace(from, (from - to) * 20);
    expect(result).toMatchObject({ level: to, phase: 'ready', invalid: false });
    expect(G.finish(result)).toMatchObject({ complete: true, action: levels[to] });
    expect(G.progress(result)).toBe(1);
  });

  it.each([[0, -11], [1, 11], [2, -11], [3, 11]])('requires deliberate travel from %i even when a candidate has rounded at %i pixels', (level, dy) => {
    expect(trace(level, dy).level).not.toBe(level);
    expect(G.finish(trace(level, dy))).toMatchObject({ complete: false, action: null });
  });

  it.each([[0, -12, 'low'], [1, 12, 'off'], [2, -12, 'high'], [3, 12, 'medium']])('accepts the exact deliberate threshold from %i', (level, dy, action) => {
    expect(G.finish(trace(level, dy))).toMatchObject({ complete: true, action });
  });

  it.each([[0, 200], [3, -200]])('keeps outward movement at the %i stop inactive', (level, dy) => {
    const start = G.begin('dial', origin, { level });
    const beyond = G.move(start, moved(dy));
    expect(beyond).toMatchObject({ level, phase: 'adjust', invalid: false });
    expect(G.progress(beyond)).toBe(0);
    expect(G.finish(beyond)).toMatchObject({ complete: false, action: null });
    for (const retraced of [dy / 2, 0]) {
      const returned = G.move(beyond, moved(retraced));
      expect(G.finish(returned)).toMatchObject({ complete: false, action: null });
      expect(G.progress(returned)).toBe(0);
    }
  });

  it.each([0, 1, 2, 3])('allows returning to initial %i after previewing a different setting', initial => {
    const start = G.begin('dial', origin, { level: initial });
    const candidate = G.move(start, moved(initial === 3 ? 20 : -20));
    expect(G.finish(candidate).complete).toBe(true);
    const returned = G.move(candidate, origin);
    expect(returned.level).toBe(initial);
    expect(G.finish(returned)).toMatchObject({ complete: false, action: null });
    expect(G.progress(returned)).toBe(0);
  });

  it.each([[.5, 6], [1, 12], [2, 24]])('scales the Low-to-Off threshold at unit %s', (unit, pixels) => {
    expect(G.finish(trace(1, pixels - .01, unit)).complete).toBe(false);
    expect(G.finish(trace(1, pixels, unit))).toMatchObject({ complete: true, action: 'off' });
    expect(G.progress(trace(0, pixels * 3, unit))).toBe(0);
  });

  it.each([['cut'], ['pour'], ['grip'], ['dry'], ['door']])('preserves the prior non-dial level domain for %s', kind => {
    expect(G.begin(kind, origin, { level: 0 }).initialLevel).toBe(1);
  });

  it('retains fractional progress before readiness and maps Off to explicit release guidance', () => {
    expect(G.progress(trace(1, 6))).toBe(.5);
    expect(G.finish(trace(1, 12)).message).toMatch(/release.*off/i);
  });

  it('cannot revive invalid contact and does not mutate earlier preview frames', () => {
    const start = G.begin('dial', origin, { level: 1 }), before = copy(start);
    const candidate = G.move(start, moved(20));
    expect(start).toEqual(before);
    const invalid = G.move(candidate, { x: NaN, y: 120 });
    expect(G.finish(G.move(invalid, moved(-20)))).toMatchObject({ complete: false, action: null });
    expect(G.progress(invalid)).toBe(0);
  });
});

describe('Four-setting dial through the actual touch keyboard adapter', () => {
  it.each([false, true])('previews Low-to-Off and commits once on keyboard release (closeup=%s)', closeup => {
    const f = fixture({ initial: 1, closeup }), before = copy(f.state());
    expect(f.adapter.keyboardBegin('dial')).toBe(true);
    expect(f.state()).toEqual(before);
    expect(f.adapter.keyboardMove(0, 12)).toBe(true);
    expect(f.canvas.dataset.phase).toBe('ready');
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.adapter.keyboardRelease()).toBe(true);
    oneHeatAction(before, f.state(), 'off');
    expect(f.events.indexOf('clear')).toBeLessThan(f.events.indexOf('act:off'));
    expect(f.adapter.keyboardRelease()).toBe(false);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('off');
    expect(f.canvas.setPointerCapture).not.toHaveBeenCalled();
    expect(f.canvas.hasPointerCapture).not.toHaveBeenCalled();
    expect(f.canvas.releasePointerCapture).not.toHaveBeenCalled();
  });

  it.each([false, true])('starts from the actual Off state and reaches Low only after deliberate keyboard movement (closeup=%s)', closeup => {
    const f = fixture({ closeup }), before = copy(f.state());
    expect(before.values.heat).toBeUndefined();
    f.adapter.keyboardBegin('dial');
    f.adapter.keyboardMove(0, -11);
    expect(f.canvas.dataset.phase).toBe('adjust');
    expect(f.state()).toEqual(before);
    f.adapter.keyboardMove(0, -1);
    expect(f.canvas.dataset.phase).toBe('ready');
    expect(f.state()).toEqual(before);
    f.adapter.keyboardRelease();
    oneHeatAction(before, f.state(), 'low');
  });

  it.each([[0, 80], [3, -80]])('does not commit or signal readiness beyond the %i end stop', (initial, dy) => {
    const f = fixture({ initial }), before = copy(f.state());
    f.adapter.keyboardBegin('dial');
    f.adapter.keyboardMove(0, dy);
    expect(f.canvas.dataset.phase).toBe('adjust');
    expect(document.getElementById('studioTouchProgress').value).toBe(0);
    expect(f.host.feedback.mock.calls.flat().some(signal => signal.type === 'ready')).toBe(false);
    f.adapter.keyboardRelease();
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('cancels a changed preview by retracing to the original detent before release', () => {
    const f = fixture({ initial: 2 }), before = copy(f.state());
    f.adapter.keyboardBegin('dial');
    f.adapter.keyboardMove(0, -20);
    expect(f.canvas.dataset.phase).toBe('ready');
    f.adapter.keyboardMove(0, 20);
    expect(f.canvas.dataset.phase).toBe('adjust');
    f.adapter.keyboardRelease();
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each([[420, 12], [210, 6], [840, 24]])('uses the final native release sample to turn Low off at canvas height %i', (height, pixels) => {
    const f = fixture({ initial: 1, height }), before = copy(f.state());
    pointer(f, 'pointerdown');
    expect(f.state()).toEqual(before);
    pointer(f, 'pointerup', pixels);
    oneHeatAction(before, f.state(), 'off');
    expect(f.canvas.setPointerCapture).toHaveBeenCalledExactlyOnceWith(77);
    expect(f.canvas.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(77);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('off');
  });

  it.each(['Escape', 'pointercancel', 'hidden', 'blocked', 'invisible'])('cancels an Off preview on %s without a heat action', condition => {
    const f = fixture({ initial: 1 }), before = copy(f.state());
    f.adapter.keyboardBegin('dial');
    f.adapter.keyboardMove(0, 20);
    if (condition === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    if (condition === 'pointercancel') pointer(f, 'pointercancel');
    if (condition === 'hidden') { f.setHidden(true); f.adapter.update(); }
    if (condition === 'blocked') { f.setBlocked(true); f.adapter.update(); }
    if (condition === 'invisible') { f.setVisible(false); f.adapter.update(); }
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.adapter.keyboardRelease()).toBe(false);
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('never applies a held Off preview to a replacement source', () => {
    const f = fixture({ initial: 1 });
    f.adapter.keyboardBegin('dial');
    f.adapter.keyboardMove(0, 20);
    const replacement = K.act(K.start('heat'), 'high');
    f.setState(replacement);
    f.adapter.update();
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.adapter.keyboardRelease()).toBe(false);
    expect(f.state()).toBe(replacement);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each(['blocked', 'done', 'submitted'])('does not begin a locked dial in the %s state', condition => {
    const f = fixture({ initial: 1, closeup: true });
    if (condition === 'blocked') f.setBlocked(true);
    else f.setState({ ...f.state(), [condition]: true });
    const before = copy(f.state());
    f.adapter.update();
    expect(f.adapter.keyboardBegin('dial')).toBe(false);
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });
});

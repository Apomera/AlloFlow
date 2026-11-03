import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const G = require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const Lid = require('../stem_lab/kitchen_studio/kitchen_studio_lid.js');
const touchSource = readFileSync('stem_lab/kitchen_studio/kitchen_studio_touch.js', 'utf8');
const body = readFileSync('stem_lab/kitchen_studio/index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const mounted = [];
const clone = value => JSON.parse(JSON.stringify(value));
const readonlyHint = 'This view is read-only. Return to a live attempt to use this tool.';
const expectClear = f => expect(f.discover.mock.calls.some(([info]) => info === null)).toBe(true);

function pointer(canvas, type, at = { x: 220, y: 150 }, id = 1) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: at.x, clientY: at.y });
  Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: true }, pointerType: { value: 'mouse' } });
  canvas.dispatchEvent(event);
  return event;
}

function escape() {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event;
}

function fixture(station = 'prep', options = {}) {
  document.body.innerHTML = body;
  window.KitchenStudio = K;
  window.KitchenStudioGestures = G;
  window.KitchenStudioLid = Lid;
  vm.runInNewContext(touchSource, { window });
  const canvas = document.createElement('canvas');
  document.getElementById('scene').append(canvas);
  const rect = { left: 100, top: 80, width: 600, height: 420 };
  const bounds = () => ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height });
  let visible = true, hidden = false, blocked = false, doorOpen = false, state = K.start(station);
  let transform = info => info, reveal = () => true;
  const unavailable = new Set();
  canvas.getBoundingClientRect = bounds;
  canvas.getClientRects = () => visible ? [bounds()] : [];
  const captures = new Set();
  canvas.setPointerCapture = vi.fn(id => captures.add(id));
  canvas.hasPointerCapture = vi.fn(id => captures.has(id));
  canvas.releasePointerCapture = vi.fn(id => {
    captures.delete(id);
    pointer(canvas, 'lostpointercapture', { x: 220, y: 150 }, id);
  });
  const documentHidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const tool = (id, name, kind, hint, at = station, extra = {}) => ({ id, name, kind, hint, station: at, objects: [{ visible: true }], ...extra });
  const soap = tool('soap', 'soap', 'tap', 'Use soap.', 'prep', { action: 'wash' });
  const faucet = tool('faucet', 'faucet', 'tap', 'Rinse hands.', 'prep', { action: 'rinse' });
  const basket = tool('vegetableBasket', 'vegetables', 'prepare', 'Carry vegetables.', 'prep');
  const tub = tool('deepContainer', 'leftovers', 'store', 'Carry the leftovers to a storage destination.', 'chill');
  const door = tool('fridgeHandle', 'refrigerator handle', 'door', 'Pull to open.', 'chill', { viewOnly: true, viewTap: true });
  const probe = tool('thermometer', 'thermometer', 'probe', 'Carry the thermometer to the food.', 'probe');
  const spatula = tool('spatula', 'spatula', 'spatula', 'Carry the spatula across the pan.', 'heat');
  const carton = tool('stockCarton', 'stock carton', 'stock', 'Carry the carton to the jug.', 'measure');
  const tools = { prep: [soap, faucet, basket], chill: [tub, door], probe: [probe], heat: [spatula], measure: [carton] };
  const points = { soap: { x: 220, y: 150 }, faucet: { x: 240, y: 150 }, vegetableBasket: { x: 260, y: 220 }, deepContainer: { x: 280, y: 200 }, fridgeHandle: { x: 500, y: 180 }, thermometer: { x: 280, y: 220 }, prepBoardTarget: { x: 470, y: 220 } };
  let picked = tools[station][0];
  const events = [], cues = [];
  const host = {
    canvas, orbit: { enabled: true }, getState: () => state,
    hidden: () => hidden, locked: () => hidden || blocked || state.done || state.submitted,
    pick: vi.fn(() => picked && transform(picked)), inputTool: info => transform(info),
    point: event => ({ x: event.clientX / 100, y: 1.65, z: event.clientY / 100 }),
    capture: () => [], highlight: vi.fn(), draw: vi.fn(), preview: vi.fn(),
    tools: id => tools[id] || [], available: id => !unavailable.has(id), reveal: vi.fn(id => reveal(id)),
    keyboardPoint: id => points[id] ? { ...points[id] } : null,
    keyboardTargets: info => info.kind === 'prepare' ? [{ id: 'prepBoardTarget', label: 'Preparation board' }] : [],
    destination: g => g.hit.kind === 'prepare' && g.current.x >= 4 ? { action: 'prepare', message: 'Release here.' } : { action: null, message: 'Carry to a target.' },
    act: vi.fn(action => { events.push('act:' + action); state = K.act(state, action); }),
    view: vi.fn(result => { doorOpen = result.open; }), inspect: vi.fn(), select: vi.fn(), interactionMode: vi.fn(),
    fridgeOpen: () => doorOpen, ovenOpen: () => false, ovenCloseup: () => false,
    probeCloseup: () => false, containerCloseup: () => false, panCloseup: () => false, boardCloseup: () => false,
    measureInspecting: () => false, panMode: () => 'arrange', platingMode: () => 'quick', pourMode: () => 'portion',
    probeDepth: () => 0, lidsOpen: () => false, dialPoint: () => null,
    feedback: vi.fn(signal => cues.push({ ...signal }))
  };
  const discover = vi.fn((info, hint, readOnly) => {
    events.push(info ? 'discover:' + info.id : 'discover:clear');
    if (options.throwing) throw new Error('Optional discovery UI unavailable');
  });
  if (!options.absent) host.discover = discover;
  const adapter = window.KitchenStudioTouch.mount(host);
  mounted.push(adapter);
  discover.mockClear(); events.length = 0;
  return {
    adapter, host, canvas, documentHidden, discover, cues, events, points, soap, faucet, basket, tub, door, probe, spatula, carton, unavailable,
    state: () => state, setState: next => { state = next; }, setPicked: next => { picked = next; },
    setBlocked: next => { blocked = next; }, setHidden: next => { hidden = next; }, setVisible: next => { visible = next; },
    setTransform: next => { transform = next; }, setReveal: next => { reveal = next; },
    hover: () => pointer(canvas, 'pointermove'),
    find: id => document.querySelector('[data-studio-tool="' + id + '"]').click(),
    shown: () => discover.mock.calls.filter(call => call[0]),
    hint: () => document.getElementById('studioTouchHint').textContent,
    status: () => document.getElementById('studioTouchStatus').textContent
  };
}

afterEach(() => {
  mounted.splice(0).forEach(adapter => adapter.dispose());
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Kitchen discovery through the real direct-gesture adapter', () => {
  it('publishes an idle tool and its current mechanic without a decision or sensory cue', () => {
    const f = fixture(), before = clone(f.state());
    f.hover();
    expect(f.discover).toHaveBeenLastCalledWith(f.soap, 'Use soap.', false);
    expect(f.hint()).toBe('Use soap.');
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.host.feedback).not.toHaveBeenCalled();
    expect(f.host.preview).not.toHaveBeenCalled();
  });

  it('keeps the last discovery when hovering empty space and replaces it at another tool', () => {
    const f = fixture();
    f.hover();
    f.discover.mockClear();
    f.setPicked(null); f.hover();
    expect(f.discover).not.toHaveBeenCalled();
    f.setPicked(f.faucet); f.hover();
    expect(f.discover).toHaveBeenLastCalledWith(f.faucet, f.faucet.hint, false);
  });

  it.each(['other-station', 'unavailable', 'hidden-object', 'hidden-ancestor', 'no-effective-kind'])('does not discover a %s target', reason => {
    const f = fixture();
    if (reason === 'other-station') f.setPicked(f.door);
    if (reason === 'unavailable') f.unavailable.add(f.soap.id);
    if (reason === 'hidden-object') f.soap.objects[0].visible = false;
    if (reason === 'hidden-ancestor') f.soap.objects[0].parent = { visible: false };
    if (reason === 'no-effective-kind') f.setTransform(info => ({ ...info, kind: null }));
    f.hover();
    expect(f.shown()).toEqual([]);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each(['blocked', 'done', 'submitted', 'document-hidden', 'canvas-hidden'])('does not hover-discover a %s action tool', reason => {
    const f = fixture();
    if (reason === 'blocked') f.setBlocked(true);
    if (reason === 'done') f.setState({ ...f.state(), done: true });
    if (reason === 'submitted') f.setState({ ...f.state(), submitted: true });
    if (reason === 'document-hidden') f.documentHidden.mockReturnValue(true);
    if (reason === 'canvas-hidden') f.setVisible(false);
    f.hover();
    expect(f.shown()).toEqual([]);
  });

  it('allows a view-only refrigerator mechanic in a locked attempt', () => {
    const f = fixture('chill');
    f.setPicked(f.door); f.setBlocked(true); f.hover();
    expect(f.discover).toHaveBeenLastCalledWith(f.door, f.door.hint, false);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('uses the physical tap-to-place instruction for both hover and Find', () => {
    const f = fixture();
    document.getElementById('studioCarryMode').click();
    f.setPicked(f.basket); f.hover();
    const [, hint, readOnly] = f.discover.mock.calls.at(-1);
    expect(hint).toMatch(/Tap to pick up vegetables, then tap a destination to place it/);
    expect(readOnly).toBe(false);
    expect(f.hint()).toBe(hint);
    f.find(f.basket.id);
    expect(f.discover).toHaveBeenLastCalledWith(f.basket, hint, false);
    expect(f.hint()).toBe(hint);
    expect(f.status()).toContain(hint);
  });

  it('explains the effective lid mechanic instead of the raw container carry instruction', () => {
    const f = fixture('chill');
    f.setTransform(info => info.id === f.tub.id ? { ...info, kind: 'lid', viewOnly: true } : info);
    document.getElementById('studioCarryMode').click();
    f.hover();
    const [info, hint, readOnly] = f.discover.mock.calls.at(-1);
    expect(info.kind).toBe('lid');
    expect(hint).toMatch(/lift/i);
    expect(hint).toMatch(/close/i);
    expect(hint).not.toContain('Carry the leftovers');
    expect(hint).not.toContain('Tap to pick up');
    expect(readOnly).toBe(false);
    f.find(f.tub.id);
    expect(f.discover).toHaveBeenLastCalledWith(expect.objectContaining({ id: f.tub.id, kind: 'lid' }), hint, false);
    expect(f.hint()).toBe(hint);
  });

  it.each([
    ['probe', 'insertProbe', 'Drag the display down to insert or up to withdraw.'],
    ['heat', 'stir', 'Follow one full circle, then release to stir.'],
    ['heat', 'tipPlate', 'Tip the pan toward the plate, return level, then release.'],
    ['measure', 'tipPour', 'Tip the carton into the jug, return upright, then release.']
  ])('resolves the current %s inspection mode as %s', (station, kind, hint) => {
    const f = fixture(station);
    f.setTransform(info => ({ ...info, kind, hint }));
    f.hover();
    expect(f.discover).toHaveBeenLastCalledWith(expect.objectContaining({ kind }), hint, false);
    expect(f.hint()).toBe(hint);
    f.find(f.shown()[0][0].id);
    expect(f.discover).toHaveBeenLastCalledWith(expect.objectContaining({ kind }), hint, false);
    expect(f.status()).toContain(hint);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('resolves Find again after reveal changes the effective mechanic', () => {
    const f = fixture('probe');
    f.setReveal(() => {
      f.setTransform(info => ({ ...info, kind: 'insertProbe', hint: 'Insert to a marker, then release.' }));
      return true;
    });
    f.find(f.probe.id);
    expect(f.host.reveal).toHaveBeenCalledExactlyOnceWith(f.probe.id);
    expect(f.discover).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'insertProbe' }), 'Insert to a marker, then release.', false);
    expect(f.hint()).toBe('Insert to a marker, then release.');
    expect(f.status()).toContain('Insert to a marker, then release.');
  });

  it('makes a locked Find read-only in the card, touch hint and live status', () => {
    const f = fixture(), before = clone(f.state());
    f.setBlocked(true);
    f.find(f.soap.id);
    expect(f.discover).toHaveBeenLastCalledWith(f.soap, readonlyHint, true);
    expect(f.hint()).toBe(readonlyHint);
    expect(f.status()).toContain(readonlyHint);
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.host.feedback).not.toHaveBeenCalled();
  });

  it('keeps Find for an effective view-only lid interactive when the engine is locked', () => {
    const f = fixture('chill');
    f.setBlocked(true);
    f.setTransform(info => info.id === f.tub.id ? { ...info, kind: 'lid', viewOnly: true } : info);
    f.find(f.tub.id);
    const [info, hint, readOnly] = f.discover.mock.calls.at(-1);
    expect(info.kind).toBe('lid');
    expect(readOnly).toBe(false);
    expect(hint).toMatch(/lift/i);
    expect(hint).not.toBe(readonlyHint);
    expect(f.status()).toContain(hint);
  });

  it.each(['reveal-failed', 'unavailable-after-reveal', 'hidden-after-reveal', 'station-changed'])('does not republish stale Find content when %s', reason => {
    const f = fixture(); f.hover(); f.discover.mockClear();
    f.setReveal(() => {
      if (reason === 'unavailable-after-reveal') f.unavailable.add(f.soap.id);
      if (reason === 'hidden-after-reveal') f.soap.objects[0].parent = { visible: false };
      if (reason === 'station-changed') f.setState(K.start('chill'));
      return reason !== 'reveal-failed';
    });
    f.find(f.soap.id);
    expect(f.shown()).toEqual([]);
    expectClear(f);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('clears on canvas leave while preserving evidence and sensory silence', () => {
    const f = fixture(), before = clone(f.state()); f.hover(); f.discover.mockClear();
    pointer(f.canvas, 'pointerleave');
    expectClear(f);
    expect(f.state()).toEqual(before);
    expect(f.host.feedback).not.toHaveBeenCalled();
  });

  it('clears on Escape without claiming the camera key or moving focus when no tool is held', () => {
    const f = fixture(); f.hover(); f.discover.mockClear();
    const focus = document.getElementById('studioCarryMode'); focus.focus();
    const event = escape();
    expectClear(f);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(focus);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.host.feedback).not.toHaveBeenCalled();
  });

  it('clears on empty-canvas down without creating a gesture or evidence', () => {
    const f = fixture(); f.hover(); f.discover.mockClear(); f.setPicked(null);
    pointer(f.canvas, 'pointerdown'); pointer(f.canvas, 'pointerup');
    expectClear(f);
    expect(f.canvas.dataset.held || '').toBe('');
    expect(f.canvas.setPointerCapture).not.toHaveBeenCalled();
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.host.feedback).not.toHaveBeenCalled();
  });

  it('clears before a physical pickup and does not rediscover while the tool is held', () => {
    const f = fixture(); f.setPicked(f.basket); f.hover(); f.discover.mockClear();
    f.events.length = 0;
    pointer(f.canvas, 'pointerdown', f.points.vegetableBasket);
    pointer(f.canvas, 'pointermove', f.points.prepBoardTarget);
    expectClear(f);
    expect(f.shown()).toEqual([]);
    expect(f.events[0]).toBe('discover:clear');
    expect(f.cues.map(cue => cue.type)).toEqual(['pickup', 'ready']);
    expect(f.host.act).not.toHaveBeenCalled();
    pointer(f.canvas, 'pointerup', f.points.prepBoardTarget);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare');
  });

  it('clears on a keyboard pickup and retains its existing cancellation semantics', () => {
    const f = fixture(); f.hover(); f.discover.mockClear();
    expect(f.adapter.keyboardBegin(f.basket.id)).toBe(true);
    expectClear(f);
    expect(f.shown()).toEqual([]);
    expect(escape().defaultPrevented).toBe(true);
    expect(f.canvas.dataset.held).toBe('');
    expect(f.cues.map(cue => cue.type)).toEqual(['pickup', 'cancel']);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.canvas.setPointerCapture).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'context-update', 'carry-mode', 'look-around', 'cut-size', 'blur', 'hidden', 'pagehide', 'dispose'])('clears idle discovery on %s without recording an action', reason => {
    const f = fixture(), before = clone(f.state()); f.hover(); f.discover.mockClear();
    if (reason === 'cancel') f.adapter.cancel();
    if (reason === 'context-update') { f.setState(clone(f.state())); f.adapter.update(); }
    if (reason === 'carry-mode') document.getElementById('studioCarryMode').click();
    if (reason === 'look-around') document.getElementById('studioInteractionMode').click();
    if (reason === 'cut-size') document.getElementById('studioCutSize').dispatchEvent(new Event('change'));
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'hidden') { f.documentHidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); }
    if (reason === 'pagehide') window.dispatchEvent(new Event('pagehide'));
    if (reason === 'dispose') f.adapter.dispose();
    expectClear(f);
    expect(f.shown()).toEqual([]);
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.host.feedback).not.toHaveBeenCalled();
  });

  it('does not rediscover tools in Look around mode or after disposal', () => {
    const f = fixture();
    document.getElementById('studioInteractionMode').click(); f.discover.mockClear();
    f.hover(); expect(f.discover).not.toHaveBeenCalled();
    f.adapter.handsOn(); f.adapter.dispose(); f.discover.mockClear();
    f.hover(); pointer(f.canvas, 'pointerdown'); escape();
    expect(f.discover).not.toHaveBeenCalled();
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each(['absent', 'throwing'])('preserves exactly one native engine commit with an %s discovery hook', mode => {
    const f = fixture('prep', { [mode]: true });
    f.hover(); f.find(f.soap.id);
    pointer(f.canvas, 'pointerdown', f.points.soap);
    pointer(f.canvas, 'pointerup', f.points.soap);
    pointer(f.canvas, 'pointerup', f.points.soap);
    f.adapter.keyboardRelease();
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('wash');
    expect(f.state().log).toHaveLength(1);
    expect(f.state().log[0]).toMatchObject({ action: 'wash', accepted: true });
    expect(f.cues.map(cue => cue.type)).toEqual(['pickup', 'release']);
    expect(f.canvas.dataset.held).toBe('');
    if (mode === 'throwing') expect(f.discover).toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const G = require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const touchSource = readFileSync('stem_lab/kitchen_studio/kitchen_studio_touch.js', 'utf8');
const body = readFileSync('stem_lab/kitchen_studio/index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const mounted = [];
const clone = value => JSON.parse(JSON.stringify(value));

function fixture(station = 'prep') {
  document.body.innerHTML = body;
  window.KitchenStudio = K;
  window.KitchenStudioGestures = G;
  vm.runInNewContext(touchSource, { window });
  const canvas = document.createElement('canvas');
  document.getElementById('scene').append(canvas);
  const rect = { left: 100, top: 80, width: 600, height: 420 };
  const bounds = () => ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height });
  let visible = true, hidden = false, blocked = false, doorOpen = false, state = K.start(station);
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
  const soap = { id: 'soap', name: 'soap', station: 'prep', kind: 'tap', action: 'wash', hint: 'Use soap.', objects: [{ visible: true }] };
  const faucet = { id: 'faucet', name: 'faucet', station: 'prep', kind: 'tap', action: 'rinse', hint: 'Rinse hands.', objects: [{ visible: true }] };
  const basket = { id: 'vegetableBasket', name: 'vegetables', station: 'prep', kind: 'prepare', hint: 'Carry vegetables.', objects: [{ visible: true }] };
  const door = { id: 'fridgeHandle', name: 'refrigerator handle', station: 'chill', kind: 'door', viewOnly: true, viewTap: true, hint: 'Pull to open.', objects: [{ visible: true }] };
  const tools = { prep: [soap, faucet, basket], chill: [door] };
  const points = { soap: { x: 220, y: 150 }, faucet: { x: 240, y: 150 }, vegetableBasket: { x: 260, y: 220 }, fridgeHandle: { x: 500, y: 180 }, prepBoardTarget: { x: 470, y: 220 } };
  let picked = tools[station][0];
  const cues = [], events = [];
  const host = {
    canvas, orbit: { enabled: true }, getState: () => state,
    hidden: () => hidden, locked: () => hidden || blocked || state.done || state.submitted,
    pick: vi.fn(() => picked), point: event => ({ x: event.clientX / 100, y: 1.65, z: event.clientY / 100 }),
    capture: () => [], highlight: vi.fn(), draw: () => events.push('draw'),
    preview: g => events.push(g ? 'preview' : 'clear'),
    tools: id => tools[id] || [], inputTool: info => info, available: () => true, reveal: () => true,
    keyboardPoint: id => points[id] ? { ...points[id] } : null,
    keyboardTargets: info => info.kind === 'prepare' ? [{ id: 'prepBoardTarget', label: 'Preparation board' }] : [],
    destination: g => g.hit.kind === 'prepare' && g.current.x >= 4 ? { action: 'prepare', message: 'Release here.' } : { action: null, message: 'Carry to a target.' },
    act: vi.fn(action => { events.push('act:' + action); state = K.act(state, action); }),
    view: vi.fn(result => { events.push('view:' + result.view); doorOpen = result.open; }),
    inspect: vi.fn(() => events.push('inspect')), select: vi.fn(), interactionMode: vi.fn(),
    fridgeOpen: () => doorOpen, probeCloseup: () => false, containerCloseup: () => false, panCloseup: () => false,
    boardCloseup: () => false, measureInspecting: () => false, panMode: () => 'arrange', platingMode: () => 'quick',
    pourMode: () => 'portion', probeDepth: () => 0, lidsOpen: () => false, dialPoint: () => null,
    feedback: vi.fn(signal => {
      events.push('cue:' + signal.type);
      cues.push({ signal: { ...signal }, held: canvas.dataset.held, state: clone(state) });
    })
  };
  const adapter = window.KitchenStudioTouch.mount(host);
  mounted.push(adapter);
  events.length = 0;
  return {
    adapter, host, canvas, rect, cues, events, points, soap, faucet, basket, door, documentHidden,
    state: () => state, setState: next => { state = next; }, setPicked: value => { picked = value; },
    setBlocked: value => { blocked = value; }, setHidden: value => { hidden = value; }, setVisible: value => { visible = value; },
    types: () => cues.map(cue => cue.signal.type)
  };
}

function pointer(canvas, type, at = { x: 220, y: 150 }, id = 1) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: at.x, clientY: at.y });
  Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: true }, pointerType: { value: 'mouse' } });
  canvas.dispatchEvent(event);
}

function startBasket(f) {
  f.setPicked(f.basket);
  pointer(f.canvas, 'pointerdown', f.points.vegetableBasket);
}

afterEach(() => {
  mounted.splice(0).forEach(adapter => adapter.dispose());
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Kitchen tool feedback at the shared gesture gateway', () => {
  it('announces pickup after the visual preview, without changing evidence', () => {
    const f = fixture(), before = clone(f.state());
    pointer(f.canvas, 'pointerdown', f.points.soap);
    expect(f.types()).toEqual(['pickup']);
    expect(f.cues[0]).toEqual({ signal: { type: 'pickup', id: 'soap', kind: 'tap', keyboard: false }, held: 'soap', state: before });
    expect(f.events.slice(-3)).toEqual(['preview', 'draw', 'cue:pickup']);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('clears and commits one tap before its neutral release cue, with no cancel cue', () => {
    const f = fixture();
    pointer(f.canvas, 'pointerdown', f.points.soap);
    pointer(f.canvas, 'pointerup', f.points.soap);
    expect(f.types()).toEqual(['pickup', 'release']);
    expect(f.cues[1].held).toBe('');
    expect(f.cues[1].state.log).toEqual([{ ...f.state().log[0] }]);
    expect(f.state().log[0]).toMatchObject({ action: 'wash', accepted: true });
    expect(f.events.indexOf('clear')).toBeLessThan(f.events.indexOf('act:wash'));
    expect(f.events.indexOf('act:wash')).toBeLessThan(f.events.indexOf('cue:release'));
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('wash');
  });

  it('uses the same neutral tap cue for an accepted wash and rejected water-only rinse', () => {
    const accepted = fixture();
    pointer(accepted.canvas, 'pointerdown', accepted.points.soap);
    pointer(accepted.canvas, 'pointerup', accepted.points.soap);
    const washCue = accepted.cues.at(-1).signal;
    accepted.adapter.dispose();
    const rejected = fixture();
    rejected.setPicked(rejected.faucet);
    pointer(rejected.canvas, 'pointerdown', rejected.points.faucet);
    pointer(rejected.canvas, 'pointerup', rejected.points.faucet);
    expect(rejected.state().log[0]).toMatchObject({ action: 'rinse', accepted: false });
    expect(rejected.cues.at(-1).signal).toEqual({ ...washCue, id: 'faucet' });
    expect(Object.keys(washCue).sort()).toEqual(['id', 'keyboard', 'kind', 'type']);
  });

  it('emits release-ready once per hold even after leaving and returning to the target', () => {
    const f = fixture(), before = clone(f.state());
    startBasket(f);
    for (const x of [470, 480, 300, 470, 490]) pointer(f.canvas, 'pointermove', { x, y: 220 });
    expect(f.types()).toEqual(['pickup', 'ready']);
    expect(f.state()).toEqual(before);
    pointer(f.canvas, 'pointerup', { x: 490, y: 220 });
    expect(f.types()).toEqual(['pickup', 'ready', 'release']);
    expect(f.state().log[0]).toMatchObject({ action: 'prepare', accepted: false });
    startBasket(f);
    pointer(f.canvas, 'pointermove', f.points.prepBoardTarget);
    pointer(f.canvas, 'pointerup', f.points.prepBoardTarget);
    expect(f.types()).toEqual(['pickup', 'ready', 'release', 'pickup', 'ready', 'release']);
  });

  it('includes a coalesced final move in readiness before one release', () => {
    const f = fixture();
    f.setState(K.act(K.act(f.state(), 'wash'), 'board'));
    startBasket(f);
    pointer(f.canvas, 'pointerup', f.points.prepBoardTarget);
    expect(f.types()).toEqual(['pickup', 'ready', 'release']);
    expect(f.state().done).toBe(true);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare');
  });

  it('matches pointer cues through the keyboard begin, aim and release gateway', () => {
    const f = fixture();
    f.adapter.keyboardBegin('vegetableBasket');
    f.adapter.keyboardAimNext();
    f.adapter.keyboardMove(8, 0);
    f.adapter.keyboardRelease();
    expect(f.types()).toEqual(['pickup', 'ready', 'release']);
    expect(f.cues.map(c => c.signal)).toEqual(['pickup', 'ready', 'release'].map(type => ({ type, id: 'vegetableBasket', kind: 'prepare', keyboard: true })));
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare');
    expect(f.canvas.setPointerCapture).not.toHaveBeenCalled();
  });

  it('does not repeat feedback or actions after duplicate pointer and keyboard releases', () => {
    const f = fixture();
    pointer(f.canvas, 'pointerdown', f.points.soap);
    pointer(f.canvas, 'pointerup', f.points.soap);
    pointer(f.canvas, 'pointerup', f.points.soap);
    f.adapter.keyboardRelease();
    expect(f.types()).toEqual(['pickup', 'release']);
    expect(f.host.act).toHaveBeenCalledTimes(1);
  });

  it('does not cue readiness merely from a tap being held or dragged', () => {
    const f = fixture();
    pointer(f.canvas, 'pointerdown', f.points.soap);
    pointer(f.canvas, 'pointermove', { x: 240, y: 150 });
    pointer(f.canvas, 'pointerup', { x: 240, y: 150 });
    expect(f.types()).toEqual(['pickup', 'cancel']);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('silently ignores hover, empty-space orbit and another station selection', () => {
    const f = fixture();
    pointer(f.canvas, 'pointermove');
    f.setPicked(null);
    pointer(f.canvas, 'pointerdown');pointer(f.canvas, 'pointerup');
    f.setPicked(f.door);
    pointer(f.canvas, 'pointerdown');pointer(f.canvas, 'pointerup');
    expect(f.cues).toEqual([]);
    expect(f.host.select).toHaveBeenCalledExactlyOnceWith('chill');
  });

  it.each(['blocked', 'done', 'submitted', 'document-hidden', 'canvas-hidden'])('does not cue a locked %s tool', lock => {
    const f = fixture();
    if (lock === 'blocked') f.setBlocked(true);
    if (lock === 'done') f.setState({ ...f.state(), done: true });
    if (lock === 'submitted') f.setState({ ...f.state(), submitted: true });
    if (lock === 'document-hidden') f.documentHidden.mockReturnValue(true);
    if (lock === 'canvas-hidden') f.setVisible(false);
    pointer(f.canvas, 'pointerdown', f.points.soap);pointer(f.canvas, 'pointerup', f.points.soap);
    expect(f.cues).toEqual([]);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each(['Escape', 'pointercancel', 'capture-loss', 'blur', 'hidden', 'source-change', 'locked', 'explicit-cancel', 'dispose'])('cancels a held preview once on %s without a release or decision', reason => {
    const f = fixture(), before = clone(f.state());
    startBasket(f);
    pointer(f.canvas, 'pointermove', f.points.prepBoardTarget);
    if (reason === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    if (reason === 'pointercancel') pointer(f.canvas, 'pointercancel');
    if (reason === 'capture-loss') f.canvas.releasePointerCapture(1);
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'hidden') { f.documentHidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); }
    if (reason === 'source-change') { f.setState(clone(f.state())); f.adapter.update(); }
    if (reason === 'locked') { f.setBlocked(true); f.adapter.update(); }
    if (reason === 'explicit-cancel') f.adapter.cancel('Stop.');
    if (reason === 'dispose') f.adapter.dispose();
    pointer(f.canvas, 'pointerup', f.points.prepBoardTarget);
    f.adapter.cancel();
    expect(f.types()).toEqual(['pickup', 'ready', 'cancel']);
    expect(f.cues.at(-1).held).toBe('');
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('cancels incomplete and off-canvas releases without a decision', () => {
    const f = fixture(), before = clone(f.state());
    startBasket(f);pointer(f.canvas, 'pointerup', { x: 280, y: 220 });
    expect(f.types()).toEqual(['pickup', 'cancel']);
    startBasket(f);pointer(f.canvas, 'pointermove', f.points.prepBoardTarget);
    pointer(f.canvas, 'pointerup', { x: 740, y: 220 });
    expect(f.types()).toEqual(['pickup', 'cancel', 'pickup', 'ready', 'cancel']);
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('does not repeat a cue when a foreign pointer moves or releases a hold', () => {
    const f = fixture();
    startBasket(f);
    pointer(f.canvas, 'pointermove', f.points.prepBoardTarget, 2);
    pointer(f.canvas, 'pointerup', f.points.prepBoardTarget, 2);
    expect(f.types()).toEqual(['pickup']);
    expect(f.canvas.dataset.held).toBe('vegetableBasket');
    f.adapter.cancel();
    expect(f.types()).toEqual(['pickup', 'cancel']);
  });

  it.each(['done', 'replay'])('keeps neutral view-only door cues available for %s work', mode => {
    const f = fixture('chill');
    if (mode === 'done') f.setState({ ...f.state(), done: true });
    else f.setBlocked(true);
    const before = clone(f.state());
    pointer(f.canvas, 'pointerdown', f.points.fridgeHandle);
    pointer(f.canvas, 'pointermove', { x: 500, y: 240 });
    pointer(f.canvas, 'pointerup', { x: 500, y: 240 });
    expect(f.types()).toEqual(['pickup', 'ready', 'release']);
    expect(f.host.view).toHaveBeenCalledOnce();
    expect(f.host.view.mock.calls[0][0]).toMatchObject({ view: 'fridge', open: true });
    expect(f.events.indexOf('clear')).toBeLessThan(f.events.indexOf('view:fridge'));
    expect(f.events.indexOf('view:fridge')).toBeLessThan(f.events.indexOf('cue:release'));
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('releases an inspection before its neutral cue and never offers an action', () => {
    const f = fixture();
    f.soap.inspect = true;
    const before = clone(f.state());
    pointer(f.canvas, 'pointerdown', f.points.soap);pointer(f.canvas, 'pointerup', f.points.soap);
    expect(f.types()).toEqual(['pickup', 'release']);
    expect(f.events.indexOf('inspect')).toBeLessThan(f.events.indexOf('cue:release'));
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.state()).toEqual(before);
  });

  it.each(['absent', 'throwing'])('preserves gestures when the optional feedback hook is %s', mode => {
    const f = fixture();
    if (mode === 'absent') delete f.host.feedback;
    else f.host.feedback = vi.fn(() => { throw new Error('Device feedback unavailable'); });
    startBasket(f);
    pointer(f.canvas, 'pointermove', f.points.prepBoardTarget);
    pointer(f.canvas, 'pointerup', f.points.prepBoardTarget);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare');
    expect(f.state().log).toHaveLength(1);
    expect(f.canvas.dataset.held).toBe('');
  });

  it('gives feedback a separate signal object without exposing mutable gesture state', () => {
    const f = fixture();
    const original = f.host.feedback;
    f.host.feedback = signal => { original(signal); signal.id = 'injected'; signal.kind = 'injected'; signal.type = 'injected'; };
    f.adapter.keyboardBegin('soap');f.adapter.keyboardRelease();
    expect(f.cues.map(c => c.signal.id)).toEqual(['soap', 'soap']);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('wash');
    expect(f.state().log[0].accepted).toBe(true);
  });
});

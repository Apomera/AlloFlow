import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const G = require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const touchSource = readFileSync('stem_lab/kitchen_studio/kitchen_studio_touch.js', 'utf8');
const studioBody = readFileSync('stem_lab/kitchen_studio/index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const mounted = [];
const copy = value => JSON.parse(JSON.stringify(value));

function fixture(station = 'prep') {
  document.body.innerHTML = studioBody;
  window.KitchenStudio = K;
  window.KitchenStudioGestures = G;
  vm.runInNewContext(touchSource, { window });
  const canvas = document.createElement('canvas');
  document.getElementById('scene').append(canvas);
  const rect = { left: 100, top: 80, right: 700, bottom: 500, width: 600, height: 420 };
  let visible = true, hidden = false, blocked = false, doorOpen = false, state = K.start(station);
  const bounds = () => ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height });
  canvas.getBoundingClientRect = bounds;
  canvas.getClientRects = () => visible ? [bounds()] : [];
  const captures = new Set();
  canvas.setPointerCapture = vi.fn(id => captures.add(id));
  canvas.hasPointerCapture = vi.fn(id => captures.has(id));
  canvas.releasePointerCapture = vi.fn(id => captures.delete(id));
  const documentHidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const soap = { id: 'soap', station: 'prep', name: 'soap', kind: 'tap', objects: [{ visible: true }], action: 'wash', hint: 'Use soap.' };
  const vegetables = { id: 'vegetableBasket', station: 'prep', name: 'vegetables', kind: 'prepare', objects: [{ visible: true }], hint: 'Carry vegetables to the board.' };
  const tub = { id: 'tub', station: 'chill', name: 'leftovers', kind: 'store', objects: [{ visible: true }], hint: 'Carry the container.' };
  const door = { id: 'fridgeHandle', station: 'chill', name: 'refrigerator handle', kind: 'door', objects: [{ visible: true }], viewOnly: true, viewTap: true, hint: 'Pull down to open.' };
  const tools = { prep: [soap, vegetables], chill: [tub, door] };
  const unavailable = new Set();
  const points = {
    soap: { x: 220, y: 150 }, vegetableBasket: { x: 260, y: 220 },
    tub: { x: 350, y: 250 }, fridgeHandle: { x: 500, y: 180 },
    prepBoardTarget: { x: 470, y: 220 }, otherTarget: { x: 300, y: 350 },
    shallowTray: { x: 280, y: 330 }, fridge: { x: 500, y: 240 }
  };
  const events = [];
  let picked = tools[station][0];
  const host = {
    canvas, orbit: { enabled: true }, getState: () => state,
    hidden: () => hidden, locked: () => hidden || blocked || state.done || state.submitted,
    pick: vi.fn(() => picked), point: e => ({ x: e.clientX / 100, y: 1.65, z: e.clientY / 100 }),
    capture: vi.fn(() => []), highlight: vi.fn(), draw: vi.fn(),
    preview: vi.fn(g => events.push(g ? 'preview' : 'clear')),
    tools: id => tools[id] || [], available: id => !unavailable.has(id),
    inputTool: info => info, reveal: vi.fn(() => true),
    keyboardPoint: id => points[id] ? { ...points[id] } : null,
    keyboardTargets: info => info.kind === 'prepare'
      ? [{ id: 'prepBoardTarget', label: 'Preparation board' }, { id: 'otherTarget', label: 'Other place' }]
      : info.kind === 'store' ? [{ id: 'shallowTray', label: 'Shallow tray' }, { id: 'fridge', label: 'Refrigerator' }] : [],
    destination: vi.fn(g => g.hit.kind === 'prepare' && g.current.x >= 4
      ? { action: 'prepare', message: 'Release to prepare.' }
      : { action: null, message: 'Carry to a target.' }),
    act: vi.fn(action => { events.push('act:' + action); state = K.act(state, action); }),
    view: vi.fn(result => { doorOpen = result.open; }),
    inspect: vi.fn(), select: vi.fn(id => { state = K.start(id); }),
    interactionMode: vi.fn(), fridgeOpen: () => doorOpen,
    probeCloseup: () => false, containerCloseup: () => false, panCloseup: () => false,
    boardCloseup: () => false, measureInspecting: () => false,
    panMode: () => 'arrange', platingMode: () => 'quick', pourMode: () => 'portion',
    probeDepth: () => 0, lidsOpen: () => false, dialPoint: () => null
  };
  const adapter = window.KitchenStudioTouch.mount(host);
  mounted.push(adapter);
  return {
    adapter, host, canvas, rect, events, points, tools, soap, vegetables, tub, door, unavailable, documentHidden,
    state: () => state, setState: next => { state = next; }, setStation: id => { state = K.start(id); picked = tools[id][0]; adapter.update(); },
    setHidden: value => { hidden = value; }, setBlocked: value => { blocked = value; },
    setVisible: value => { visible = value; }, setPicked: value => { picked = value; }
  };
}

function pointer(canvas, type, at = { x: 220, y: 150 }, id = 1) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: at.x, clientY: at.y });
  Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: true }, pointerType: { value: 'mouse' } });
  canvas.dispatchEvent(event);
}

afterEach(() => {
  mounted.splice(0).forEach(adapter => adapter.dispose());
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Kitchen direct keyboard adapter', () => {
  it('starts a tap without acting, then clears the preview before one engine action', () => {
    const f = fixture(), before = copy(f.state());
    expect(f.adapter.keyboardBegin('soap')).toBe(true);
    expect(f.adapter.keyboardState()).toMatchObject({ id: 'soap', name: 'soap', point: f.points.soap });
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.host.orbit.enabled).toBe(false);
    expect(f.adapter.keyboardRelease()).toBe(true);
    expect(f.state().log).toHaveLength(1);
    expect(f.state().log[0]).toMatchObject({ action: 'wash', accepted: true });
    expect(f.events.indexOf('clear')).toBeLessThan(f.events.indexOf('act:wash'));
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.host.orbit.enabled).toBe(true);
    expect(f.canvas.setPointerCapture).not.toHaveBeenCalled();
    expect(f.canvas.hasPointerCapture).not.toHaveBeenCalled();
    expect(f.canvas.releasePointerCapture).not.toHaveBeenCalled();
  });

  it('ignores duplicate releases and movement without a keyboard hold', () => {
    const f = fixture();
    expect(f.adapter.keyboardRelease()).toBe(false);
    expect(f.adapter.keyboardMove(8, 0)).toBe(false);
    expect(f.adapter.keyboardAimNext()).toBe(false);
    f.adapter.keyboardBegin('soap');
    f.adapter.keyboardRelease();
    const finished = copy(f.state());
    expect(f.adapter.keyboardRelease()).toBe(false);
    expect(f.adapter.keyboardMove(0, 8)).toBe(false);
    expect(f.state()).toEqual(finished);
    expect(f.host.act).toHaveBeenCalledTimes(1);
  });

  it('aims and drops vegetables through the same existing preparation action', () => {
    const f = fixture();
    f.setState(K.act(K.act(f.state(), 'wash'), 'board'));
    f.adapter.update();
    const before = copy(f.state());
    expect(f.adapter.keyboardBegin('vegetableBasket')).toBe(true);
    expect(f.adapter.keyboardAimNext()).toBe(true);
    expect(f.adapter.keyboardState().point).toEqual(f.points.prepBoardTarget);
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.adapter.keyboardRelease()).toBe(true);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare');
    expect(f.state().log).toHaveLength(before.log.length + 1);
    expect(f.state().done).toBe(true);
  });

  it('cycles all offered targets without selecting a correct answer or committing', () => {
    const f = fixture(), before = copy(f.state());
    f.adapter.keyboardBegin('vegetableBasket');
    for (const target of ['prepBoardTarget', 'otherTarget', 'prepBoardTarget']) {
      expect(f.adapter.keyboardAimNext()).toBe(true);
      expect(f.adapter.keyboardState().point).toEqual(f.points[target]);
      expect(f.state()).toEqual(before);
    }
    f.adapter.cancel('Cancelled.');
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.adapter.keyboardState()).toBeNull();
  });

  it('cancels a keyboard carry without recording or leaving the orbit disabled', () => {
    const f = fixture(), before = copy(f.state());
    f.adapter.keyboardBegin('vegetableBasket');
    f.adapter.keyboardAimNext();
    f.adapter.cancel('Cancelled.');
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.host.orbit.enabled).toBe(true);
    expect(f.canvas.dataset.held).toBe('');
  });

  it('cancels on source identity changes even when the station is unchanged', () => {
    const f = fixture();
    f.adapter.keyboardBegin('soap');
    const replacement = K.start('prep');
    f.setState(replacement);
    f.adapter.keyboardMove(8, 0);
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.state()).toBe(replacement);
  });

  it.each(['lock', 'hidden', 'invisible', 'document-hidden'])('fails closed when %s changes during a keyboard hold', condition => {
    const f = fixture(), before = copy(f.state());
    f.adapter.keyboardBegin('soap');
    if (condition === 'lock') f.setBlocked(true);
    if (condition === 'hidden') f.setHidden(true);
    if (condition === 'invisible') f.setVisible(false);
    if (condition === 'document-hidden') f.documentHidden.mockReturnValue(true);
    f.adapter.update();
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.adapter.keyboardRelease()).toBe(false);
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', 'unknown', 'fridgeHandle'])('does not begin an unavailable/current-station-mismatched tool %j', id => {
    const f = fixture(), before = copy(f.state());
    expect(f.adapter.keyboardBegin(id)).toBe(false);
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('lists unavailable tools as disabled and does not reveal them', () => {
    const f = fixture();
    f.unavailable.add('soap');
    expect(f.adapter.keyboardTools().find(t => t.id === 'soap').enabled).toBe(false);
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    expect(f.host.reveal).not.toHaveBeenCalled();
    f.setHidden(true);
    expect(f.adapter.keyboardTools()).toEqual([]);
  });

  it('uses the current mode-resolved tool and rechecks availability after reveal', () => {
    const f = fixture();
    f.host.inputTool = info => info.id === 'soap' ? null : info;
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    expect(f.host.act).not.toHaveBeenCalled();
    f.host.inputTool = info => info;
    f.host.reveal.mockImplementation(() => { f.setBlocked(true); return true; });
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    expect(f.adapter.keyboardState()).toBeNull();
  });

  it('does not select a tool hidden through its scene ancestry', () => {
    const f = fixture();
    f.soap.objects[0].parent = { visible: false };
    expect(f.adapter.keyboardTools().find(t => t.id === 'soap').enabled).toBe(false);
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each(['move', 'aim', 'release'])('cancels before %s if the canvas has moved or resized', operation => {
    const f = fixture(), before = copy(f.state());
    f.adapter.keyboardBegin(operation === 'aim' ? 'vegetableBasket' : 'soap');
    if (operation === 'move') f.rect.left += 4;
    if (operation === 'aim') f.rect.top += 4;
    if (operation === 'release') f.rect.width -= 4;
    const result = operation === 'move' ? f.adapter.keyboardMove(8, 0)
      : operation === 'aim' ? f.adapter.keyboardAimNext() : f.adapter.keyboardRelease();
    expect(result).toBe(false);
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each(['availability', 'mode', 'station'])('rechecks %s after revealing a tool', change => {
    const f = fixture();
    f.host.reveal.mockImplementation(() => {
      if (change === 'availability') f.unavailable.add('soap');
      if (change === 'mode') f.host.inputTool = () => null;
      if (change === 'station') f.setState(K.start('chill'));
      return true;
    });
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('honours a mode-resolved view-only tool in recorded state', () => {
    const f = fixture('chill');
    f.setBlocked(true);
    f.host.inputTool = info => info.id === 'tub'
      ? { ...info, kind: 'door', viewOnly: true, viewTap: true } : info;
    expect(f.adapter.keyboardTools().find(t => t.id === 'tub').enabled).toBe(true);
    expect(f.adapter.keyboardBegin('tub')).toBe(true);
    f.adapter.keyboardMove(0, 32);
    f.adapter.keyboardRelease();
    expect(f.host.view).toHaveBeenCalledWith(expect.objectContaining({ view: 'fridge', open: true }));
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('does not begin a tool that cannot be revealed or projected on the canvas', () => {
    const f = fixture();
    f.host.reveal.mockReturnValue(false);
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    f.host.reveal.mockReturnValue(true);
    f.points.soap = { x: 80, y: 140 };
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    f.points.soap = { x: NaN, y: 140 };
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('reads the tool position after revealing and turns Look around back to Hands on', () => {
    const f = fixture();
    document.getElementById('studioInteractionMode').click();
    expect(document.getElementById('studioInteractionMode').getAttribute('aria-pressed')).toBe('false');
    f.host.reveal.mockImplementation(() => { f.points.soap = { x: 245, y: 175 }; return true; });
    expect(f.adapter.keyboardBegin('soap')).toBe(true);
    expect(f.adapter.keyboardState().point).toEqual({ x: 245, y: 175 });
    expect(document.getElementById('studioInteractionMode').getAttribute('aria-pressed')).toBe('true');
    expect(f.host.interactionMode).toHaveBeenLastCalledWith(true);
  });

  it('keeps recorded state read-only while allowing the refrigerator view', () => {
    const f = fixture('chill');
    f.setState({ ...f.state(), done: true });
    f.adapter.update();
    const before = copy(f.state()), available = f.adapter.keyboardTools();
    expect(available.find(t => t.id === 'tub').enabled).toBe(false);
    expect(available.find(t => t.id === 'fridgeHandle').enabled).toBe(true);
    expect(f.adapter.keyboardBegin('tub')).toBe(false);
    expect(f.adapter.keyboardBegin('fridgeHandle')).toBe(true);
    f.adapter.keyboardMove(0, 32);
    expect(f.adapter.keyboardRelease()).toBe(true);
    expect(f.host.view).toHaveBeenCalledWith(expect.objectContaining({ view: 'fridge', open: true }));
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.state()).toEqual(before);
  });

  it('clamps keyboard movement inside the canvas', () => {
    const f = fixture();
    f.adapter.keyboardBegin('vegetableBasket');
    expect(f.adapter.keyboardMove(1e9, 1e9)).toBe(true);
    expect(f.adapter.keyboardState().point).toEqual({ x: 698, y: 498 });
    expect(f.adapter.keyboardMove(-1e9, -1e9)).toBe(true);
    expect(f.adapter.keyboardState().point).toEqual({ x: 102, y: 82 });
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it.each([[NaN, 0], [0, Infinity], ['8', 0], [0, undefined]])('rejects invalid movement deltas %j without changing the hold', (dx, dy) => {
    const f = fixture();
    f.adapter.keyboardBegin('vegetableBasket');
    const before = copy(f.adapter.keyboardState());
    expect(f.adapter.keyboardMove(dx, dy)).toBe(false);
    expect(f.adapter.keyboardState()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });

  it('publishes isolated snapshots and allows unsubscribing', () => {
    const f = fixture(), received = [], listener = vi.fn(snapshot => received.push(snapshot));
    const unsubscribe = f.adapter.subscribeKeyboard(listener);
    expect(listener).toHaveBeenCalledOnce();
    expect(received[0]).toBeNull();
    f.adapter.keyboardBegin('soap');
    expect(received.some(s => s?.id === 'soap')).toBe(true);
    received.find(s => s?.id === 'soap').point.x = -888;
    expect(f.adapter.keyboardState().point).toEqual(f.points.soap);
    const snapshot = f.adapter.keyboardState();
    snapshot.point.x = -999;
    snapshot.id = 'changed';
    expect(f.adapter.keyboardState()).toMatchObject({ id: 'soap', point: f.points.soap });
    unsubscribe();
    const count = listener.mock.calls.length;
    f.adapter.cancel('Cancelled.');
    f.adapter.update();
    expect(listener).toHaveBeenCalledTimes(count);
  });

  it('retains native pointer capture and the default soap tap', () => {
    const f = fixture();
    pointer(f.canvas, 'pointerdown');
    expect(f.canvas.setPointerCapture).toHaveBeenCalledExactlyOnceWith(1);
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.adapter.keyboardMove(8, 0)).toBe(false);
    expect(f.adapter.keyboardAimNext()).toBe(false);
    expect(f.adapter.keyboardRelease()).toBe(false);
    expect(f.canvas.releasePointerCapture).not.toHaveBeenCalled();
    expect(f.host.act).not.toHaveBeenCalled();
    pointer(f.canvas, 'pointerup');
    expect(f.canvas.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('wash');
    expect(f.state().values.washed).toBe(true);
  });

  it('interrupts a keyboard hold safely before a new physical pointer can act', () => {
    const f = fixture(), before = copy(f.state());
    f.adapter.keyboardBegin('vegetableBasket');
    f.adapter.keyboardAimNext();
    pointer(f.canvas, 'pointerdown');
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.canvas.setPointerCapture).not.toHaveBeenCalled();
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.state()).toEqual(before);
    pointer(f.canvas, 'pointerdown');
    pointer(f.canvas, 'pointerup');
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('wash');
  });

  it('does not react to late keyboard commands after disposal', () => {
    const f = fixture(), before = copy(f.state());
    f.adapter.keyboardBegin('soap');
    f.adapter.dispose();
    expect(f.adapter.keyboardState()).toBeNull();
    expect(f.adapter.keyboardBegin('soap')).toBe(false);
    expect(f.adapter.keyboardMove(8, 0)).toBe(false);
    expect(f.adapter.keyboardRelease()).toBe(false);
    expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
  });
});

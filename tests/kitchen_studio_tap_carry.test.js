import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const K = require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const G = require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const helpers = {
  KitchenStudioWash: require('../stem_lab/kitchen_studio/kitchen_studio_wash.js'),
  KitchenStudioPour: require('../stem_lab/kitchen_studio/kitchen_studio_pour.js'),
  KitchenStudioPlating: require('../stem_lab/kitchen_studio/kitchen_studio_plating.js'),
  KitchenStudioStir: require('../stem_lab/kitchen_studio/kitchen_studio_stir.js'),
  KitchenStudioLid: require('../stem_lab/kitchen_studio/kitchen_studio_lid.js'),
  KitchenStudioProbeDepth: require('../stem_lab/kitchen_studio/kitchen_studio_probe_depth.js'),
  KitchenStudioOvenDoor: require('../stem_lab/kitchen_studio/kitchen_studio_oven_door.js')
};
const touchSource = readFileSync('stem_lab/kitchen_studio/kitchen_studio_touch.js', 'utf8');
const body = readFileSync('stem_lab/kitchen_studio/index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const mounted = [];
const clone = value => JSON.parse(JSON.stringify(value));

function pointer(target, type, at = { x: 260, y: 220 }, id = 1, options = {}) {
  const event = new MouseEvent(type, {
    bubbles: true, cancelable: true, button: options.button ?? 0,
    buttons: options.buttons ?? (type === 'pointerup' ? 0 : 1), clientX: at.x, clientY: at.y
  });
  Object.defineProperties(event, {
    pointerId: { value: id }, pointerType: { value: options.pointerType || 'mouse' },
    isPrimary: { value: options.isPrimary ?? true }
  });
  target.dispatchEvent(event);
  return event;
}

function fixture(station = 'prep') {
  document.body.innerHTML = body;
  Object.assign(window, { KitchenStudio: K, KitchenStudioGestures: G }, helpers);
  vm.runInNewContext(touchSource, { window });
  const canvas = document.createElement('canvas');
  document.getElementById('scene').append(canvas);
  const rect = { left: 100, top: 80, width: 600, height: 420 };
  const bounds = () => ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height });
  canvas.getBoundingClientRect = bounds;
  let visible = true, hidden = false, blocked = false, state = K.start(station), doorOpen = false;
  canvas.getClientRects = () => visible ? [bounds()] : [];
  const captures = new Set(), captureIds = [];
  canvas.setPointerCapture = vi.fn(id => { captureIds.push(id); captures.add(id); });
  canvas.hasPointerCapture = vi.fn(id => { captureIds.push(id); return captures.has(id); });
  canvas.releasePointerCapture = vi.fn(id => {
    captureIds.push(id); captures.delete(id);
    pointer(canvas, 'lostpointercapture', { x: 260, y: 220 }, id);
  });
  const documentHidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const make = (id, kind, stationId = station, extra = {}) => ({
    id, kind, station: stationId, name: id, hint: 'Use ' + id + '.', objects: [{ visible: true }], ...extra
  });
  const basket = make('vegetableBasket', 'prepare', 'prep');
  const soap = make('soap', 'tap', 'prep', { action: 'wash' });
  const probe = make('probe', 'probe', 'probe', { tapAction: 'read' });
  const carton = make('stockCarton', 'stock', 'measure');
  const tub = make('tub', 'store', 'chill');
  const door = make('fridgeHandle', 'door', 'chill', { viewOnly: true, viewTap: true });
  const tools = { prep: [basket, soap], probe: [probe], measure: [carton], chill: [tub, door], knife: [], heat: [] };
  const points = {
    vegetableBasket: { x: 260, y: 220 }, soap: { x: 220, y: 150 }, probe: { x: 260, y: 220 },
    stockCarton: { x: 260, y: 220 }, tub: { x: 260, y: 220 }, fridgeHandle: { x: 500, y: 180 },
    destination: { x: 470, y: 220 }, elsewhere: { x: 310, y: 300 }
  };
  let picked = tools[station]?.[0];
  const events = [], cues = [], previews = [], pose = [{ sentinel: 'captured original pose' }];
  const host = {
    canvas, orbit: { enabled: true }, getState: () => state,
    hidden: () => hidden, locked: () => hidden || blocked || state.done || state.submitted || state.log.length >= 500,
    pick: vi.fn(() => picked), point: vi.fn(event => ({ x: event.clientX / 100, y: 1.65, z: event.clientY / 100 })),
    capture: vi.fn(() => pose), highlight: vi.fn(), draw: vi.fn(),
    preview: vi.fn((g, old) => {
      events.push(g ? 'preview' : 'clear');
      previews.push(g ? {
        id: g.id, hit: g.hit, source: g.source, start: g.start, point: g.point, original: g.original,
        last: { ...g.last }, latched: g.latched
      } : { clear: true, old });
    }),
    tools: id => tools[id] || [], inputTool: info => info, available: () => true, reveal: () => true,
    keyboardPoint: id => points[id] ? { ...points[id] } : null,
    keyboardTargets: () => [{ id: 'destination', label: 'Destination' }],
    destination: vi.fn(g => {
      const action = { prepare: 'prepare', stock: 'add150', probe: 'thick', store: 'shallow' }[g.hit.kind];
      return action && g.current.x >= 4 && Math.hypot(g.last.x - g.start.x, g.last.y - g.start.y) >= 10
        ? { action, message: 'Release at the destination.' } : { action: null, message: 'Carry to a destination.' };
    }),
    act: vi.fn(action => { events.push('act:' + action); state = K.act(state, action); }),
    view: vi.fn(result => { doorOpen = result.open; }), inspect: vi.fn(), select: vi.fn(), interactionMode: vi.fn(),
    fridgeOpen: () => doorOpen, ovenOpen: () => false, ovenCloseup: () => false,
    probeCloseup: () => false, containerCloseup: () => false, panCloseup: () => false, boardCloseup: () => false,
    measureInspecting: () => false, panMode: () => 'arrange', platingMode: () => 'quick', pourMode: () => 'portion',
    probeDepth: () => 0, lidsOpen: () => false, dialPoint: () => null, stirPoint: () => ({ x: -.23, z: 0 }),
    platingTarget: () => null, pourMouth: () => null, washWater: () => null, pourInstruction: () => 'Carry the carton.',
    feedback: vi.fn(signal => { events.push('cue:' + signal.type); cues.push({ ...signal }); })
  };
  const adapter = window.KitchenStudioTouch.mount(host);
  const mode = document.getElementById('studioCarryMode'), cancel = document.getElementById('studioCarryCancel');
  const notice = document.getElementById('studioCarryNotice');
  expect(mode, 'The delivered studio registers tap-to-place controls').not.toBeNull();
  expect(cancel).not.toBeNull(); expect(notice).not.toBeNull();
  const f = {
    adapter, host, canvas, rect, captures, captureIds, documentHidden, basket, soap, probe, carton, tub, door,
    points, mode, cancel, notice, events, cues, previews, pose, make,
    state: () => state, setState: next => { state = next; }, setPicked: value => { picked = value; },
    setHidden: value => { hidden = value; }, setBlocked: value => { blocked = value; }, setVisible: value => { visible = value; },
    enable: () => { if (mode.getAttribute('aria-pressed') !== 'true') mode.click(); },
    types: () => cues.map(cue => cue.type)
  };
  mounted.push(f);
  return f;
}

function firstTap(f, id = 1, pointerType = 'mouse') {
  pointer(f.canvas, 'pointerdown', f.points.vegetableBasket, id, { pointerType });
  pointer(f.canvas, 'pointerup', f.points.vegetableBasket, id, { pointerType });
}
function secondTap(f, at = f.points.destination, id = 2, pointerType = 'mouse') {
  pointer(f.canvas, 'pointerdown', at, id, { pointerType });
  pointer(f.canvas, 'pointerup', at, id, { pointerType });
}
function expectIdle(f) {
  expect(f.canvas.dataset.held).toBe('');
  expect(f.canvas.dataset.carryLatched).not.toBe('true');
  expect(f.notice.hidden).toBe(true);
  expect(f.host.orbit.enabled).toBe(true);
  expect(f.captures.size).toBe(0);
}
function expectLatched(f) {
  expect(f.canvas.dataset.carryLatched).toBe('true');
  expect(f.canvas.dataset.held).not.toBe('');
  expect(f.notice.hidden).toBe(false);
  expect(f.cancel.disabled).toBe(false);
  expect(f.host.orbit.enabled).toBe(false);
  expect(f.captures.size).toBe(0);
  expect(f.adapter.keyboardState()).toBeNull();
}

afterEach(() => {
  mounted.splice(0).forEach(f => {
    f.adapter.dispose();
    expect(f.captureIds.every(id => typeof id === 'number' && Number.isFinite(id) && id >= 0), 'Null/virtual IDs never reach native capture APIs').toBe(true);
  });
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Kitchen native tap-to-place carrying', () => {
  it('starts off and preserves the existing one-contact drag release', () => {
    const f = fixture(), before = clone(f.state());
    expect(f.mode.getAttribute('aria-pressed')).toBe('false');
    pointer(f.canvas, 'pointerdown', f.points.vegetableBasket);
    pointer(f.canvas, 'pointermove', f.points.destination);
    expect(f.state()).toEqual(before);
    pointer(f.canvas, 'pointerup', f.points.destination);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare');
    expect(f.state().log.at(-1)).toMatchObject({ action: 'prepare', accepted: false });
    expectIdle(f);
  });

  it('latches an opted-in first tap without an action, completion cue, or capture owner', () => {
    const f = fixture(); f.enable(); const source = f.state(), before = clone(source);
    firstTap(f);
    expectLatched(f);
    expect(f.state()).toBe(source); expect(f.state()).toEqual(before);
    expect(f.host.act).not.toHaveBeenCalled();
    expect(f.types()).toEqual(['pickup']);
    expect(f.host.capture).toHaveBeenCalledTimes(1);
    expect(f.canvas.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1);
    expect(f.previews.filter(p => p.clear)).toEqual([]);
  });

  it('retains the original hit, start, world point, source and captured poses through the second contact', () => {
    const f = fixture(); f.enable();
    pointer(f.canvas, 'pointerdown', f.points.vegetableBasket, 11, { pointerType: 'touch' });
    const initial = f.previews.at(-1);
    pointer(f.canvas, 'pointerup', f.points.vegetableBasket, 11, { pointerType: 'touch' });
    f.setPicked(f.soap);
    pointer(f.canvas, 'pointerdown', f.points.destination, 42, { pointerType: 'touch' });
    const placing = f.previews.at(-1);
    for (const key of ['hit', 'start', 'point', 'source', 'original']) expect(placing[key]).toBe(initial[key]);
    expect(placing.id).toBe(42);
    expect(f.host.pick).toHaveBeenCalledTimes(1);
    expect(f.host.capture).toHaveBeenCalledTimes(1);
    expect(f.state().log).toEqual([]);
    pointer(f.canvas, 'pointerup', f.points.destination, 42, { pointerType: 'touch' });
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare'); expectIdle(f);
  });

  it.each(['prepare', 'mat', 'spatula', 'plate', 'stock', 'probe', 'chicken', 'store', 'label'])('supports resolved simple carry kind %s', kind => {
    const f = fixture(); f.enable(); const tool = f.make('simple-' + kind, kind, 'prep'); f.setPicked(tool);
    firstTap(f); expectLatched(f); expect(f.canvas.dataset.held).toBe(tool.id); expect(f.state().log).toEqual([]);
  });

  it.each(['tap', 'cut', 'pour', 'dial', 'dry', 'grip', 'door', 'ovenDoor', 'lid', 'handwash', 'stir', 'tipPlate', 'tipPour', 'insertProbe'])('keeps staged, vertical or tap kind %s on its existing release path', kind => {
    const f = fixture(); f.enable(); f.setPicked(f.make('other-' + kind, kind, 'prep', kind === 'tap' ? { action: 'wash' } : {}));
    firstTap(f); expectIdle(f);
    expect(f.canvas.dataset.carryLatched).not.toBe('true');
  });

  it('does not latch a view-only remap even when its kind resembles a carry tool', () => {
    const f = fixture(); f.enable(); f.setPicked(f.make('view-only', 'prepare', 'prep', { viewOnly: true }));
    firstTap(f); expectIdle(f); expect(f.host.act).not.toHaveBeenCalled();
  });

  it('uses the existing engine judgement after second release, for both accepted and rejected preparation', () => {
    for (const accepted of [false, true]) {
      const f = fixture(); f.enable();
      if (accepted) f.setState(K.act(K.act(f.state(), 'wash'), 'board'));
      const before = clone(f.state()); firstTap(f);
      pointer(f.canvas, 'pointerdown', f.points.destination, 2);
      expect(f.state()).toEqual(before); expect(f.host.act).not.toHaveBeenCalled();
      pointer(f.canvas, 'pointerup', f.points.destination, 2);
      expect(f.state().log).toHaveLength(before.log.length + 1);
      expect(f.state().log.at(-1)).toMatchObject({ action: 'prepare', accepted });
      expect(f.state().done).toBe(accepted);
      expect(f.events.indexOf('clear')).toBeLessThan(f.events.indexOf('act:prepare'));
      expect(f.events.indexOf('act:prepare')).toBeLessThan(f.events.indexOf('cue:release'));
      expectIdle(f); f.adapter.dispose();
    }
  });

  it('previews a mouse hover and latches first readiness once, with no premature action', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    pointer(f.canvas, 'pointermove', f.points.destination, 99, { buttons: 0 });
    expect(f.canvas.dataset.phase).toBe('ready'); expect(f.state()).toEqual(before);
    pointer(f.canvas, 'pointermove', f.points.elsewhere, 99, { buttons: 0 });
    pointer(f.canvas, 'pointermove', f.points.destination, 99, { buttons: 0 });
    expect(f.types()).toEqual(['pickup', 'ready']);
    secondTap(f); expect(f.types()).toEqual(['pickup', 'ready', 'release']); expectIdle(f);
  });

  it('allows pen hover but ignores unpressed touch movement and touch pointerleave', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f, 7, 'touch');
    pointer(f.canvas, 'pointerleave', f.points.vegetableBasket, 7, { pointerType: 'touch' });
    expectLatched(f);
    const count = f.host.destination.mock.calls.length;
    pointer(f.canvas, 'pointermove', f.points.destination, 8, { pointerType: 'touch', buttons: 0 });
    expect(f.host.destination).toHaveBeenCalledTimes(count);
    expect(f.state()).toEqual(before);
    pointer(f.canvas, 'pointermove', f.points.destination, 9, { pointerType: 'pen', buttons: 0 });
    expect(f.canvas.dataset.phase).toBe('ready');
    secondTap(f, f.points.destination, 10, 'touch'); expectIdle(f);
  });

  it('retains ordinary dragging when the first opted-in contact travels eight pixels or more', () => {
    const f = fixture(); f.enable();
    pointer(f.canvas, 'pointerdown', f.points.vegetableBasket);
    pointer(f.canvas, 'pointermove', f.points.destination);
    pointer(f.canvas, 'pointerup', f.points.destination);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare');
    expect(f.types()).toEqual(['pickup', 'ready', 'release']); expectIdle(f);
  });

  it('uses maximum first-contact travel rather than its final position to decide whether to latch', () => {
    const f = fixture(); f.enable(); const before = clone(f.state());
    pointer(f.canvas, 'pointerdown', f.points.vegetableBasket);
    pointer(f.canvas, 'pointermove', { x: f.points.vegetableBasket.x + 9, y: f.points.vegetableBasket.y });
    pointer(f.canvas, 'pointerup', f.points.vegetableBasket);
    expectIdle(f); expect(f.state()).toEqual(before); expect(f.types()).toEqual(['pickup', 'cancel']);
  });

  it('uses the destination release position even when the browser coalesces the final move', () => {
    const f = fixture(); f.enable(); firstTap(f);
    pointer(f.canvas, 'pointerdown', f.points.elsewhere, 2);
    pointer(f.canvas, 'pointerup', f.points.destination, 2);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('prepare'); expectIdle(f);
  });

  it('ignores stray or duplicate ups while idle-latched and after placement', () => {
    const f = fixture(); f.enable(); firstTap(f);
    pointer(f.canvas, 'pointerup', f.points.destination, 1);
    pointer(f.canvas, 'pointerup', f.points.destination, 99);
    expectLatched(f); expect(f.host.act).not.toHaveBeenCalled();
    secondTap(f); const after = clone(f.state());
    pointer(f.canvas, 'pointerup', f.points.destination, 2);
    pointer(f.canvas, 'pointerup', f.points.destination, 2);
    expect(f.state()).toEqual(after); expect(f.host.act).toHaveBeenCalledTimes(1); expectIdle(f);
  });

  it('keeps an incomplete second tap evidence-free and restores the original view', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f); secondTap(f, f.points.elsewhere);
    expect(f.state()).toEqual(before); expect(f.host.act).not.toHaveBeenCalled();
    expect(f.types()).toEqual(['pickup', 'cancel']); expectIdle(f);
  });

  it('never turns a same-origin latched probe placement into a thermometer reading', () => {
    const f = fixture('probe'); f.enable(); const before = clone(f.state()); firstTap(f);
    secondTap(f, f.points.probe);
    expect(f.state()).toEqual(before); expect(f.host.act).not.toHaveBeenCalled(); expectIdle(f);
  });

  it('still supports ordinary probe tap-to-read when tap-to-place is off', () => {
    const f = fixture('probe'); firstTap(f);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('read');
    expect(f.state().log.at(-1).action).toBe('read'); expectIdle(f);
  });

  it.each([['measure', 'add150'], ['probe', 'thick'], ['chill', 'shallow']])('retains one existing %s carry action after destination release', (station, action) => {
    const f = fixture(station); f.enable(); const before = clone(f.state()); firstTap(f);
    expect(f.state()).toEqual(before); secondTap(f);
    expect(f.state().log).toHaveLength(before.log.length + 1);
    expect(f.state().log.at(-1)).toMatchObject({ action, accepted: true });
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith(action); expectIdle(f);
  });

  it('explicit cancellation restores without attempting a native null-ID release', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    f.cancel.click(); expectIdle(f); expect(f.state()).toEqual(before);
    expect(f.canvas.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1);
    expect(f.types()).toEqual(['pickup', 'cancel']);
  });

  it.each(['Escape', 'Tab'])('%s cancels the idle carry without consuming normal Tab navigation', key => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); document.dispatchEvent(event);
    expectIdle(f); expect(f.state()).toEqual(before);
    if (key === 'Tab') expect(event.defaultPrevented).toBe(false);
  });

  it('cancels before an outside control performs its own action', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    const button = document.createElement('button'); document.body.append(button);
    let heldAtControl = 'unvisited'; button.addEventListener('pointerdown', () => { heldAtControl = f.canvas.dataset.held; });
    const event = pointer(button, 'pointerdown', { x: 30, y: 30 }, 2);
    expect(heldAtControl).toBe(''); expect(event.defaultPrevented).toBe(false);
    expect(f.state()).toEqual(before); expectIdle(f);
  });

  it.each(['blur', 'pagehide', 'resize'])('%s clears the idle carry and all temporary ownership', type => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    window.dispatchEvent(new Event(type)); expectIdle(f); expect(f.state()).toEqual(before);
  });

  it('cancels when the document hides', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    f.documentHidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    expectIdle(f); expect(f.state()).toEqual(before);
  });

  it('cancels mouse canvas leave while keeping touch lift-off available for the next tap', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    pointer(f.canvas, 'pointerleave', f.points.vegetableBasket, 1, { pointerType: 'mouse' });
    expectIdle(f); expect(f.state()).toEqual(before);
  });

  it('ignores a queued scroll with unchanged geometry and cancels real canvas movement', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    window.dispatchEvent(new Event('scroll')); expectLatched(f);
    f.rect.top += 4; window.dispatchEvent(new Event('scroll'));
    expectIdle(f); expect(f.state()).toEqual(before);
  });

  it.each(['hover', 'second-down', 'release'])('rechecks the canvas rectangle before %s', step => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    if (step === 'release') pointer(f.canvas, 'pointerdown', f.points.destination, 2);
    f.rect.left += 5;
    if (step === 'hover') pointer(f.canvas, 'pointermove', f.points.destination, 77, { buttons: 0 });
    else if (step === 'second-down') pointer(f.canvas, 'pointerdown', f.points.destination, 2);
    else pointer(f.canvas, 'pointerup', f.points.destination, 2);
    expectIdle(f); expect(f.state()).toEqual(before); expect(f.host.act).not.toHaveBeenCalled();
  });

  it('changing the carry mode or Hands on mode cancels an existing carry', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f); f.mode.click();
    expect(f.mode.getAttribute('aria-pressed')).toBe('false'); expectIdle(f); expect(f.state()).toEqual(before);
    f.enable(); firstTap(f); document.getElementById('studioInteractionMode').click();
    expectIdle(f); expect(f.state()).toEqual(before);
  });

  it.each(['source', 'station', 'blocked', 'hidden'])('context %s changes cancel without dropping', change => {
    const f = fixture(); f.enable(); firstTap(f);
    if (change === 'source') f.setState({ ...f.state(), plan: 'A new source object' });
    if (change === 'station') f.setState(K.start('knife'));
    if (change === 'blocked') f.setBlocked(true);
    if (change === 'hidden') f.setHidden(true);
    const afterChange = clone(f.state()); f.adapter.update();
    expectIdle(f); expect(f.state()).toEqual(afterChange); expect(f.host.act).not.toHaveBeenCalled();
  });

  it('capture loss during the second contact cancels without committing', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    pointer(f.canvas, 'pointerdown', f.points.destination, 22, { pointerType: 'touch' });
    f.canvas.releasePointerCapture(22);
    pointer(f.canvas, 'pointerup', f.points.destination, 22, { pointerType: 'touch' });
    expectIdle(f); expect(f.state()).toEqual(before); expect(f.host.act).not.toHaveBeenCalled();
  });

  it('pointer cancellation during placement cannot become a late drop', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    pointer(f.canvas, 'pointerdown', f.points.destination, 22, { pointerType: 'touch' });
    pointer(f.canvas, 'pointercancel', f.points.destination, 22, { pointerType: 'touch' });
    pointer(f.canvas, 'pointerup', f.points.destination, 22, { pointerType: 'touch' });
    expectIdle(f); expect(f.state()).toEqual(before); expect(f.types()).toEqual(['pickup', 'ready', 'cancel']);
  });

  it('an off-canvas second release restores the source without an action', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    pointer(f.canvas, 'pointerdown', f.points.destination, 2);
    pointer(f.canvas, 'pointerup', { x: 750, y: 220 }, 2);
    expectIdle(f); expect(f.state()).toEqual(before); expect(f.host.act).not.toHaveBeenCalled();
  });

  it('keyboard pickup interrupts the physical carry and keeps its own ordinary release behavior', () => {
    const f = fixture(); f.enable(); firstTap(f);
    expect(f.adapter.keyboardBegin('soap')).toBe(true);
    expect(f.adapter.keyboardState()).toMatchObject({ id: 'soap' });
    expect(f.canvas.dataset.carryLatched).not.toBe('true');
    expect(f.adapter.keyboardRelease()).toBe(true);
    expect(f.host.act).toHaveBeenCalledExactlyOnceWith('wash');
    expect(f.types()).toEqual(['pickup', 'cancel', 'pickup', 'release']); expectIdle(f);
  });

  it('keeps keyboard pickup instructions while native pickup explains tap-to-place', () => {
    const f = fixture(); f.enable();
    expect(f.adapter.keyboardBegin('vegetableBasket')).toBe(true);
    expect(document.getElementById('studioTouchHint').textContent).toBe(f.basket.hint + ' · Esc to cancel');
    expect(document.getElementById('studioTouchHint').textContent).not.toMatch(/tap to pick up/i);
    f.adapter.cancel();
    pointer(f.canvas, 'pointerdown', f.points.vegetableBasket);
    expect(document.getElementById('studioTouchHint').textContent).toMatch(/tap to pick up.*then tap a destination/i);
    pointer(f.canvas, 'pointerup', f.points.vegetableBasket);
    expectLatched(f);
    expect(document.getElementById('studioTouchHint').textContent).toMatch(/tap a destination/i);
    expect(f.state().log).toEqual([]);
  });

  it('blocked and historical action tools cannot start a carry', () => {
    const f = fixture(); f.enable(); f.setBlocked(true); const before = clone(f.state()); firstTap(f);
    expectIdle(f); expect(f.state()).toEqual(before); expect(f.types()).toEqual([]);
  });

  it('disposal clears an idle latch exactly once and detaches the new mode controls', () => {
    const f = fixture(); f.enable(); const before = clone(f.state()); firstTap(f);
    f.adapter.dispose(); f.adapter.dispose(); expectIdle(f); expect(f.state()).toEqual(before);
    expect(f.types()).toEqual(['pickup', 'cancel']);
    const pressed = f.mode.getAttribute('aria-pressed'); f.mode.click(); expect(f.mode.getAttribute('aria-pressed')).toBe(pressed);
  });
});

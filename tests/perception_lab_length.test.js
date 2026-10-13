import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const query = selector => host.querySelector(selector);
const seed = patch => walk.normalize({ activity: 'length', player: walk.spawn('length'), ...patch });
const defaults = (round = 0) => ({ round, value: round ? 3.8 : 2.2, visible: true, seen: 1, completed: [] });
const match = state => walk.setLengthVisible(walk.setLengthValue(state, 3), false);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
async function input(selector, value) {
  const node = query(selector); expect(node).toBeTruthy();
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function pointer(type, x, y, pointerType = 'mouse') {
  const stage = query('[data-walk-stage]');
  stage.setPointerCapture ||= vi.fn(); stage.hasPointerCapture ||= () => true; stage.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } }); stage.dispatchEvent(event);
  });
}
async function key(key, repeat = false) {
  await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key, repeat, bubbles: true })));
}
async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))(); walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready', onStatusChange: fn => { report = fn; }, report: value => report(value), onLayout: vi.fn(), pick: vi.fn(() => null), lengthCoordinate: vi.fn(x => 192 + x / 100) };
    return viewer;
  }) };
});

afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); host = root = null;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('length room geometry and saved state', () => {
  it('adds the eighteenth room without mutating earlier room saves', () => {
    const raw = { activity: 'aperture', aperture: { phase: 90, speed: 0.5, completed: [0] }, notes: { aperture: 'Trace the endpoints.' } }, before = structuredClone(raw), state = walk.normalize(raw);
    expect(state.length).toEqual(defaults()); expect(walk.activities).toHaveLength(18); expect(walk.activities.at(-1).id).toBe('length');
    expect(walk.nextRoom(state, 1)).toBe('length'); expect(walk.nextRoom(seed(), 1)).toBeNull();
    expect(state.aperture).toMatchObject(raw.aperture); expect(state.notes.aperture).toBe(raw.notes.aperture); expect(raw).toEqual(before); expect(walk.normalize(state)).toEqual(state);
    expect(walk.normalizePlayer({ x: 999 }).x).toBe(199.3);
  });

  it('normalizes bounds, observation bits and unique earned rounds', () => {
    const state = seed({ length: { round: 99, value: 99, visible: false, seen: 99, completed: [0, 0, 1, 2, -1, '1', null] } });
    expect(state.length).toEqual({ round: 1, value: 4.2, visible: false, seen: 3, completed: [0, 1] }); expect(state.progress.length.solved).toBe(true);
    expect(seed({ length: { value: -99, visible: false, seen: -1 } }).length).toEqual({ ...defaults(), value: 1.8, visible: false, seen: 2 });
    expect(seed({ length: { visible: true, seen: 0 } }).length.seen).toBe(1);
    expect(seed({ length: { visible: false, seen: 0 } }).length.seen).toBe(2);
    expect(seed({ progress: { length: { solved: true } } }).progress.length.solved).toBe(false);
    expect(seed({ length: { completed: [0, 1] }, progress: { length: { assisted: true } } }).progress.length.solved).toBe(false);
  });

  it('uses round-specific defaults and rejects malformed saved values', () => {
    for (const round of [0, 1]) {
      expect(walk.lengthDefaults(round)).toEqual(defaults(round));
      for (const value of [null, '', 'bad', Infinity, -Infinity, NaN, {}, true]) expect(seed({ length: { round, value } }).length).toEqual(defaults(round));
    }
    for (const length of [null, [], 'bad', { round: 'bad', value: NaN, seen: NaN, completed: 'bad' }]) expect(seed({ length }).length).toEqual(defaults());
    expect(seed({ length: { value: '2.75' } }).length.value).toBe(2.75);
    expect(seed({ length: { visible: 0 } }).length.visible).toBe(true);
  });

  it('builds exact centered shafts and four equal diagonal fins for both trials', () => {
    for (const round of [0, 1]) for (const value of [1.8, 2.2, 3, 3.8, 4.2]) {
      const geometry = walk.lengthObjects(round, value);
      for (const [id, length, y] of [['reference', 3, 3.3], ['adjustable', value, 1.35]]) {
        const rod = geometry[id]; expect(rod.from).toEqual({ x: 192 - length / 2, y, z: 0.2 }); expect(rod.to).toEqual({ x: 192 + length / 2, y, z: 0.2 }); expect(rod.length).toBe(length);
        expect(rod.fins).toHaveLength(4);
        for (const fin of rod.fins) {
          expect([rod.from, rod.to]).toContainEqual(fin.from);
          const dx = fin.to.x - fin.from.x, dy = fin.to.y - fin.from.y;
          expect(Math.hypot(dx, dy)).toBeCloseTo(0.6, 12); expect(Math.abs(dx)).toBeCloseTo(Math.abs(dy), 12); expect(fin.to.z).toBe(0.2);
          for (const point of [fin.from, fin.to]) for (const coordinate of ['x', 'y', 'z']) expect(Number.isFinite(point[coordinate])).toBe(true);
        }
        expect(rod.fins.filter(fin => fin.from.x === rod.from.x)).toHaveLength(2); expect(rod.fins.filter(fin => fin.from.x === rod.to.x)).toHaveLength(2);
      }
      const a = geometry.reference.fins[0], b = geometry.adjustable.fins[0];
      expect(Math.sign(a.to.x - a.from.x)).toBe(-Math.sign(b.to.x - b.from.x));
    }
  });

  it('reverses only fin context between trials and returns independent bounded geometry', () => {
    const first = walk.lengthObjects(0, 3), second = walk.lengthObjects(1, 3);
    for (const id of ['reference', 'adjustable']) {
      expect(first[id].from).toEqual(second[id].from); expect(first[id].to).toEqual(second[id].to);
      first[id].fins.forEach((fin, index) => expect(fin.to.x - fin.from.x).toBeCloseTo(-(second[id].fins[index].to.x - second[id].fins[index].from.x), 12));
    }
    expect(walk.lengthObjects(0, -99).adjustable.length).toBe(1.8); expect(walk.lengthObjects(1, 99).adjustable.length).toBe(4.2);
    for (const value of [null, '', NaN, Infinity]) expect(walk.lengthObjects(1, value).adjustable.length).toBe(3.8);
    first.reference.from.x = 999; first.adjustable.fins[0].to.y = 999;
    expect(walk.lengthObjects(0, 3).reference.from.x).toBe(190.5); expect(walk.lengthObjects(0, 3).adjustable.fins[0].to.y).not.toBe(999);
  });
});

describe('length observations and scoring', () => {
  it('invalidates a comparison only when the shaft actually changes', () => {
    let state = walk.setLengthVisible(seed(), false); expect(state.length.seen).toBe(3);
    expect(walk.setLengthValue(state, state.length.value)).toEqual(state);
    state = walk.setLengthValue(state, 3); expect(state.length.seen).toBe(2); expect(walk.lengthMatches(state)).toBe(false);
    state = walk.setLengthVisible(state, true); expect(state.length.seen).toBe(3); expect(walk.lengthMatches(state)).toBe(true);
    state = walk.setLengthValue(state, 3.02); expect(state.length.seen).toBe(1); expect(walk.lengthMatches(state)).toBe(false);
    expect(walk.setLengthVisible(state, true)).toEqual(state);
    expect(walk.setLengthVisible(state, false).length.seen).toBe(3);
  });

  it('rejects invalid changes and preserves notes, viewpoints and sibling puzzles', () => {
    const state = walk.saveViewpoint(seed({ notes: { length: 'Compare the plain shafts.' }, aperture: { phase: 90, completed: [0] }, progress: { ring: { solved: true } } }), 'A'), before = structuredClone(state);
    for (const value of [null, '', 'bad', Infinity, -Infinity, NaN, {}, true]) expect(walk.setLengthValue(state, value)).toEqual(state);
    const changed = walk.setLengthVisible(walk.setLengthValue(state, '3.25'), false);
    expect(changed.length).toEqual({ ...state.length, value: 3.25, visible: false, seen: 3 });
    for (const field of ['player', 'notes', 'viewpoints', 'aperture', 'progress']) expect(changed[field]).toEqual(state[field]); expect(state).toEqual(before);
    expect(walk.setLengthValue(state, -10).length.value).toBe(1.8); expect(walk.setLengthValue(state, 10).length.value).toBe(4.2);
  });

  it.each([{ activity: 'aperture' }, { player: { x: 186.4, z: 10, yaw: 30, pitch: 0 } }, { player: { x: 197.6, z: 10, yaw: -30, pitch: 0 } },
    { player: { x: 192, z: 2.9, yaw: 0, pitch: 0 } }, { player: { x: 192, z: 13.1, yaw: 0, pitch: 0 } },
    { player: { x: 192, z: 10, yaw: 180, pitch: 0 } }, { player: { x: 192, z: 10, yaw: 0, pitch: 20 } }])('gates adjustment, fin switching and scoring outside the viewing area: %j', patch => {
    const state = seed({ length: { value: 3, seen: 3 }, ...patch });
    expect(walk.canObserveLength(state)).toBe(false); expect(walk.setLengthValue(state, 2.5)).toEqual(state); expect(walk.setLengthVisible(state, false)).toEqual(state);
    expect(walk.lengthMatches(state)).toBe(false); expect(walk.checkLength(state).length.completed).toEqual([]);
  });

  it('includes each viewing boundary and physical control in the observation gate', () => {
    for (const x of [186.5, 192, 197.5]) for (const z of [3, 13]) expect(walk.canObserveLength(seed({ player: { x, z, yaw: Math.atan2(192 - x, z) * 180 / Math.PI, pitch: 0 } }))).toBe(true);
    for (const { player } of walk.lengthInspectionViews()) for (const target of [{ x: 188.5, y: 1.1, z: 2.2 }, { x: 193.1, y: 1.35, z: 0.2 }]) {
      const dx = target.x - player.x, dz = player.z - target.z;
      const state = seed({ player: { ...player, yaw: Math.atan2(dx, dz) * 180 / Math.PI, pitch: Math.atan2(target.y - 1.65, Math.hypot(dx, dz)) * 180 / Math.PI } });
      expect(walk.canObserveLength(state)).toBe(true); expect(walk.setLengthValue(state, 3).length.value).toBe(3); expect(walk.setLengthVisible(state, false).length.visible).toBe(false);
    }
  });

  it.each([0, 1])('requires a matched shaft and both contexts in trial %i', round => {
    for (const visible of [true, false]) expect(walk.lengthMatches(seed({ length: { round, value: 3, visible } }))).toBe(false);
    for (const value of [1.8, 2.949, 3.051, 4.2]) expect(walk.lengthMatches(seed({ length: { round, value, seen: 3 } }))).toBe(false);
    for (const value of [2.95, 3, 3.05]) expect(walk.lengthMatches(seed({ length: { round, value, seen: 3 } }))).toBe(true);
    const state = match(seed({ length: { round } })); expect(state.length.completed).toEqual([]); expect(walk.checkAnswer(state)).toBe(false);
  });

  it('awards each trial once and resets only the next experiment', () => {
    const initial = walk.saveViewpoint(seed({ notes: { length: 'Both contexts matter.' } }), 'A'); expect(walk.nextLength(initial)).toEqual(initial);
    let state = match(initial); expect(walk.nextLength(state)).toEqual(state); state = walk.checkLength(state);
    expect(state.length.completed).toEqual([0]); expect(walk.checkLength(state)).toEqual(state); expect(state.progress.length.solved).toBe(false);
    state = walk.nextLength(state); expect(state.length).toEqual({ ...defaults(1), completed: [0] }); expect(state.player).toEqual(walk.spawn('length'));
    expect(state.notes).toEqual(initial.notes); expect(state.viewpoints).toEqual(initial.viewpoints);
    state = walk.checkLength(match(state)); expect(state.length.completed).toEqual([0, 1]); expect(state.progress.length.solved).toBe(true); expect(walk.checkAnswer(state)).toBe(true);
    expect(walk.nextLength(state).length).toEqual({ ...defaults(), completed: [0, 1] }); expect(walk.nextLength(state).progress.length.solved).toBe(true);
  });

  it('allows assisted practice without awarding earned rounds or navigating from another room', () => {
    const state = match(seed({ progress: { length: { assisted: true } } })); expect(walk.checkLength(state).length.completed).toEqual([]);
    const next = walk.nextLength(state); expect(next.length).toEqual(defaults(1)); expect(next.progress.length.assisted).toBe(true);
    const other = seed({ activity: 'aperture', length: { completed: [0] } }); expect(walk.nextLength(other)).toEqual(other);
  });

  it.each(['front', 'left', 'right'])('offers a %s inspection pose without changing evidence or saved work', side => {
    const state = match(seed()), inspected = walk.inspectLength(state, side);
    expect(walk.canObserveLength(inspected)).toBe(true); expect(inspected.length).toEqual(state.length);
    const other = { ...state, activity: 'aperture' }; expect(walk.inspectLength(other, side)).toEqual(walk.normalize(other));
  });
});

describe('length first-person controls', () => {
  it('adjusts with buttons and slider, compares both contexts, and earns both trials', async () => {
    await mount(); expect(query('[data-walk-length-next]').disabled).toBe(true); expect(query('[data-walk-length-visible]').checked).toBe(true);
    await click('[data-walk-length-longer]'); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.3); await click('[data-walk-length-shorter]'); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.2);
    await click('[data-walk-precision]'); await click('[data-walk-length-longer]'); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.225);
    for (const round of [0, 1]) {
      await input('[data-walk-length-value]', 3); await click('[data-walk-check]'); expect(latest.perceptionWalk.length.completed).not.toContain(round);
      await click('[data-walk-length-visible]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.length.completed).toContain(round);
      if (!round) await click('[data-walk-length-next]');
    }
    expect(latest.perceptionWalk.progress.length).toMatchObject({ solved: true, assisted: false }); expect(latest.otherTool).toEqual({ preserved: 37 });
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.length.assisted).toBe(false);
  });

  it('keeps revealed practice separate and resets only this room while preserving saved viewpoints', async () => {
    await mount({ notes: { length: 'Keep this note.' }, aperture: { phase: 90, completed: [0] }, progress: { ring: { solved: true } } });
    await click('[data-walk-viewpoint-save="A"]'); const saved = structuredClone(latest.perceptionWalk.viewpoints);
    await click('[data-walk-reveal]'); await input('[data-walk-length-value]', 3); await click('[data-walk-length-visible]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.length.assisted).toBe(true); expect(latest.perceptionWalk.length.completed).toEqual([]); expect(query('[data-walk-length-next]').disabled).toBe(false);
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.length).toEqual(defaults()); expect(latest.perceptionWalk.progress.length).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.notes.length).toBe('Keep this note.'); expect(latest.perceptionWalk.aperture.completed).toEqual([0]); expect(latest.perceptionWalk.progress.ring.solved).toBe(true); expect(latest.perceptionWalk.viewpoints).toEqual(saved);
  });

  it.each(['front', 'left', 'right'])('renders a finite interactive %s fallback with reveal guides', async side => {
    await mount(); await click('[data-walk-length-view="' + side + '"]'); await click('[data-walk-diagram-toggle]');
    const plan = query('[data-walk-length-plan]'); expect(plan).toBeTruthy(); expect(plan.outerHTML).not.toMatch(/NaN|Infinity/);
    const before = plan.innerHTML; await input('[data-walk-length-value]', 3); expect(plan.innerHTML).not.toBe(before);
    const decorated = plan.innerHTML; await click('[data-walk-length-visible]'); expect(plan.innerHTML).not.toBe(decorated); expect(plan.outerHTML).not.toMatch(/NaN|Infinity/);
    await click('[data-walk-reveal]'); expect(query('[data-walk-length-guides]')).toBeTruthy();
  });

  it('retains manual matching controls after WebGL fails', async () => {
    await mount(); await act(async () => viewer.report('failed')); expect(query('[data-walk-length-plan]')).toBeTruthy();
    await input('[data-walk-length-value]', 3); await click('[data-walk-length-visible]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.length.completed).toEqual([0]);
  });

  it('drags the physical endpoint using world coordinates without moving the camera', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'length-handle' }); const player = structuredClone(latest.perceptionWalk.player);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 140, 100); await pointer('pointerup', 140, 100);
    expect(latest.perceptionWalk.length.value).toBeCloseTo(3); expect(latest.perceptionWalk.player).toEqual(player); expect(latest.perceptionWalk.length.completed).toEqual([]);
  });

  it('applies fine movement to both mouse and horizontal touch dragging', async () => {
    await mount({ precise: true }); viewer.pick.mockReturnValue({ id: 'length-handle' }); const player = structuredClone(latest.perceptionWalk.player);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 140, 100); await pointer('pointerup', 140, 100); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.4);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 140, 102, 'touch'); await pointer('pointerup', 140, 102, 'touch');
    expect(latest.perceptionWalk.length.value).toBeCloseTo(2.5); expect(latest.perceptionWalk.player).toEqual(player);
  });

  it.each([
    ['mouse', false, 140, 2.2], ['mouse', false, 60, 3.8], ['mouse', true, 140, 2.8],
    ['touch', false, 140, 2.6], ['touch', true, 140, 2.9]
  ])('keeps left-end %s dragging under the pointer with fine=%s and x=%s', async (pointerType, precise, endX, expected) => {
    await mount({ precise, length: { value: 3 } }); viewer.pick.mockReturnValue({ id: 'length-rod' });
    viewer.lengthCoordinate.mockImplementation(x => 190 + x / 100);
    const player = structuredClone(latest.perceptionWalk.player), leftBefore = walk.lengthObjects(0, 3).adjustable.from.x;
    await pointer('pointerdown', 100, 100, pointerType); await pointer('pointermove', endX, 101, pointerType); await pointer('pointerup', endX, 101, pointerType);
    expect(latest.perceptionWalk.length.value).toBeCloseTo(expected);
    const leftAfter = walk.lengthObjects(0, latest.perceptionWalk.length.value).adjustable.from.x;
    expect(Math.sign(leftAfter - leftBefore)).toBe(Math.sign(endX - 100));
    expect(latest.perceptionWalk.player).toEqual(player); expect(latest.perceptionWalk.length.completed).toEqual([]);
  });

  it('preserves vertical touch scrolling and maps horizontal gestures to shaft length', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'length-handle' }); const before = structuredClone(latest.perceptionWalk);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 102, 150, 'touch'); await pointer('pointerup', 102, 150, 'touch'); expect(latest.perceptionWalk).toEqual(before);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 140, 102, 'touch'); await pointer('pointerup', 140, 102, 'touch');
    expect(latest.perceptionWalk.length.value).toBeCloseTo(2.6); expect(latest.perceptionWalk.player).toEqual(before.player);
  });

  it.each(['pointercancel', 'lostpointercapture', 'blur', 'room', 'home', 'plan'])('ends shaft dragging on %s', async action => {
    await mount(); viewer.pick.mockReturnValue({ id: 'length-handle' });
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 120, 100); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.6);
    if (action === 'blur') await act(async () => window.dispatchEvent(new Event('blur')));
    else if (action === 'room') await click('[data-walk-activity="aperture"]');
    else if (action === 'home') await click('[data-walk-home]');
    else if (action === 'plan') await click('[data-walk-diagram-toggle]');
    else await pointer(action, 120, 100);
    const before = structuredClone(latest.perceptionWalk.length);
    await pointer('pointermove', 160, 100); await pointer('pointerup', 160, 100); expect(latest.perceptionWalk.length).toEqual(before);
  });

  it('steps clicked or keyboard-selected shafts once and toggles the physical fin switch', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'length-rod' }); const player = structuredClone(latest.perceptionWalk.player);
    await pointer('pointerdown', 100, 100); await pointer('pointerup', 100, 100); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.3);
    await key('e'); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.4); await key('e', true); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.4);
    await click('[data-walk-precision]'); await key('e'); expect(latest.perceptionWalk.length.value).toBeCloseTo(2.425);
    viewer.pick.mockReturnValue({ id: 'length-fins' }); await key('e'); expect(latest.perceptionWalk.length.visible).toBe(false); expect(latest.perceptionWalk.length.seen).toBe(3);
    await click('[data-walk-interact]'); expect(latest.perceptionWalk.length.visible).toBe(true); expect(latest.perceptionWalk.player).toEqual(player);
  });

  it('keeps physical and panel controls gated when facing away', async () => {
    await mount({ player: { x: 192, z: 10, yaw: 180, pitch: 0 } }); viewer.pick.mockReturnValue({ id: 'length-handle' });
    const before = structuredClone(latest.perceptionWalk.length); expect(query('[data-walk-length-value]').disabled).toBe(true);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 120, 100); await pointer('pointerup', 120, 100); await key('e');
    viewer.pick.mockReturnValue({ id: 'length-fins' }); await key('e'); expect(latest.perceptionWalk.length).toEqual(before);
  });
});

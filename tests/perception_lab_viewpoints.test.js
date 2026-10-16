import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer, replace;
const query = selector => host.querySelector(selector);
const seed = (activity = 'ring', patch = {}) => walk.normalize({ activity, player: walk.spawn(activity), ...patch });
const selector = (action, slot = 'A') => `[data-walk-viewpoint-${action}="${slot}"]`;
const click = async target => { expect(query(target)).toBeTruthy(); await act(async () => query(target).click()); };
const tick = async () => act(async () => vi.advanceTimersByTime(300));
const withoutPlayer = state => { const { player, ...rest } = state; return rest; };

async function mount(activity = 'ring', patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(activity, patch), otherTool: { preserved: 37 } });
    latest = data;
    replace = patch => setData(current => ({ ...current, perceptionWalk: walk.normalize({ ...current.perceptionWalk, ...patch }) }));
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}

async function startWalking() {
  const target = query('[data-walk-move="forward"]');
  target.setPointerCapture ||= vi.fn(); target.hasPointerCapture ||= () => true; target.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent('pointerdown', { bubbles: true, button: 0 });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } });
    target.dispatchEvent(event);
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))(); walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready', onStatusChange: fn => { report = fn; }, onLayout: vi.fn(), pick: vi.fn(() => null) };
    return viewer;
  }) };
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = root = null;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('saved viewpoint normalization', () => {
  it('upgrades old saves with two empty slots per room without mutating input', () => {
    const raw = { activity: 'weave', weave: { depths: [1, 0, -1], completed: [0] }, notes: { weave: 'Compare crossings.' } }, before = structuredClone(raw);
    const state = walk.normalize(raw);
    expect(Object.keys(state.viewpoints)).toEqual(walk.activities.map(room => room.id));
    for (const room of walk.activities) expect(state.viewpoints[room.id]).toEqual({ A: null, B: null });
    expect(walk.normalize(state)).toEqual(state); expect(raw).toEqual(before); expect(state.notes.weave).toBe(raw.notes.weave);
  });

  it('accepts complete finite poses and numeric strings, wrapping yaw without extra fields', () => {
    const state = seed('aperture', { viewpoints: { aperture: { A: { x: '180', z: '11', yaw: '450', pitch: '-12', ignored: true }, B: { x: 181, z: 10, yaw: -450, pitch: 45 } }, unknown: { A: walk.spawn('ring') } } });
    expect(state.viewpoints.aperture).toEqual({ A: { x: 180, z: 11, yaw: 90, pitch: -12 }, B: { x: 181, z: 10, yaw: -90, pitch: 45 } });
    expect(state.viewpoints.unknown).toBeUndefined(); expect(walk.normalize(state)).toEqual(state);
  });

  it('rejects malformed slots and incomplete, nonfinite, nonnumeric, and out-of-world poses', () => {
    const valid = { x: 0, z: 9, yaw: 0, pitch: 0 };
    const invalid = [null, [], 'pose', 5, true, {}, { x: 0, z: 9, yaw: 0 }, { ...valid, x: -19.31 }, { ...valid, x: 223.31 }, { ...valid, z: -7.31 }, { ...valid, z: 13.31 }, { ...valid, pitch: -45.01 }, { ...valid, pitch: 45.01 }];
    for (const coordinate of ['x', 'z', 'yaw', 'pitch']) for (const value of [null, undefined, '', ' ', 'bad', NaN, Infinity, -Infinity, [], {}, true]) invalid.push({ ...valid, [coordinate]: value });
    for (const pose of invalid) expect(seed('scale', { viewpoints: { scale: { A: pose } } }).viewpoints.scale).toEqual({ A: null, B: null });
    for (const viewpoints of [null, [], 'bad', { scale: [] }, { scale: 'bad' }]) expect(seed('scale', { viewpoints }).viewpoints.scale).toEqual({ A: null, B: null });
  });

  it('rejects poses filed under another room and respects every room boundary', () => {
    const ids = walk.activities.map(room => room.id);
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index], own = walk.spawn(id), other = walk.spawn(ids[(index + 1) % ids.length]);
      const state = seed(id, { viewpoints: { [id]: { A: own, B: other } } });
      expect(state.viewpoints[id]).toEqual({ A: own, B: null });
      if (index > 0) {
        const boundary = -6 + (index - 1) * 12;
        const pose = { x: boundary, z: 12, yaw: 0, pitch: 0 };
        const owner = index === 1 ? id : ids[index - 1];
        expect(seed(id, { viewpoints: { [id]: { A: pose } } }).viewpoints[id].A).toEqual(owner === id ? pose : null);
        expect(seed(id, { viewpoints: { [id]: { A: { ...pose, x: boundary + 0.0001 } } } }).viewpoints[id].A).toEqual({ ...pose, x: boundary + 0.0001 });
      }
    }
    const edges = { ring: { x: -19.3, z: -7.3, yaw: 0, pitch: -45 }, anamorphosis: { x: 223.3, z: 13.3, yaw: 0, pitch: 45 } };
    for (const [id, pose] of Object.entries(edges)) expect(seed(id, { viewpoints: { [id]: { A: pose } } }).viewpoints[id].A).toEqual(pose);
  });

  it('does not move a stored pose when current movable geometry overlaps it', () => {
    const pose = { x: 1.45, z: 5, yaw: 23, pitch: -4 };
    const state = seed('scale', { blockZ: 5, viewpoints: { scale: { A: pose } } });
    expect(state.viewpoints.scale.A).toEqual(pose); expect(walk.normalize(state).viewpoints.scale.A).toEqual(pose);
  });

  it('retains saved aperture viewpoints beside the previous end wall', () => {
    const pose = { x: 187.3, z: 10, yaw: -20, pitch: 5 };
    const state = seed('aperture', { viewpoints: { aperture: { A: pose, B: { ...pose, x: 187.31 } } } });
    expect(state.viewpoints.aperture).toEqual({ A: pose, B: null });
    expect(walk.recallViewpoint(state, 'A').player).toEqual(pose);
    expect(walk.normalize(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(walk.canSaveViewpoint({ ...state, player: pose })).toBe(false);
  });

  it('retains saved length viewpoints beside its former end wall without allowing new cross-room saves', () => {
    for (const x of [198.0001, 199.3]) {
      const pose = { x, z: 10, yaw: -20, pitch: 5 };
      const state = seed('length', { viewpoints: { length: { A: pose, B: { ...pose, x: 199.31 } } } });
      expect(state.viewpoints.length).toEqual({ A: pose, B: null });
      expect(walk.recallViewpoint(state, 'A').player).toEqual(pose);
      expect(walk.normalize(JSON.parse(JSON.stringify(state)))).toEqual(state);
      expect(walk.canSaveViewpoint({ ...state, player: pose })).toBe(false);
      expect(walk.saveViewpoint({ ...state, player: pose }, 'B').viewpoints.length.B).toBeNull();
    }
  });
});

describe('saved viewpoint actions', () => {
  it('saves independent A and B poses in every room and survives JSON persistence', () => {
    let state = seed();
    for (const { id } of walk.activities) {
      state = walk.normalize({ ...state, activity: id, player: walk.spawn(id) }); state = walk.saveViewpoint(state, 'A');
      const pose = { ...state.player, z: state.player.z - 0.4, yaw: 35, pitch: -8 };
      state = walk.saveViewpoint({ ...state, player: pose }, 'B');
      expect(state.viewpoints[id]).toEqual({ A: walk.spawn(id), B: pose });
    }
    expect(walk.normalize(JSON.parse(JSON.stringify(state)))).toEqual(state);
    for (const { id } of walk.activities) expect(state.viewpoints[id].A).toEqual(walk.spawn(id));
  });

  it('overwrites and clears only the named slot, preserving state and input objects', () => {
    const initial = seed('weave', { notes: { weave: 'Keep the comparison.' }, weave: { depths: [1, 0, -1], completed: [0] }, progress: { ring: { solved: true } } });
    const saved = walk.saveViewpoint(walk.saveViewpoint(initial, 'A'), 'B'), before = structuredClone(saved);
    const changed = { ...saved, player: { ...saved.player, x: 157, yaw: 22 } }, overwritten = walk.saveViewpoint(changed, 'A');
    expect(overwritten).toEqual({ ...changed, viewpoints: { ...changed.viewpoints, weave: { A: changed.player, B: saved.player } } });
    expect(walk.clearViewpoint(overwritten, 'B')).toEqual({ ...overwritten, viewpoints: { ...overwritten.viewpoints, weave: { A: changed.player, B: null } } });
    expect(saved).toEqual(before); expect(initial.viewpoints.weave).toEqual({ A: null, B: null });
  });

  it('recalls only camera state without changing adjustments, observations, credit, or notes', () => {
    const pose = { x: 181, z: 10, yaw: -6, pitch: 3 };
    const state = seed('aperture', { viewpoints: { aperture: { A: pose } }, aperture: { phase: 90, speed: 0.5, masked: false, seenMasked: 7, seenOpen: 5, choice: 'horizontal', completed: [0] }, notes: { aperture: 'Observe the endpoints.' }, landing: { lightAngle: 12, completed: [0] }, progress: { ring: { solved: true }, aperture: { hints: 1 } } });
    const before = structuredClone(state), recalled = walk.recallViewpoint(state, 'A');
    expect(recalled.player).toEqual(pose); expect(withoutPlayer(recalled)).toEqual(withoutPlayer(state)); expect(state).toEqual(before);
    recalled.player.x = 183; expect(recalled.viewpoints.aperture.A).toEqual(pose); expect(state.viewpoints.aperture.A).toEqual(pose);
  });

  it('recalls against the current collision geometry while retaining the original bookmark', () => {
    const pose = { x: 1.45, z: 5, yaw: 23, pitch: -4 };
    const saved = walk.saveViewpoint(seed('scale', { player: pose }), 'A');
    const state = walk.normalize({ ...saved, player: walk.spawn('scale'), blockZ: 5 }), recalled = walk.recallViewpoint(state, 'A');
    expect(recalled.player).toEqual({ ...pose, x: 1.55 }); expect(recalled.viewpoints.scale.A).toEqual(pose);
    expect(withoutPlayer(recalled)).toEqual(withoutPlayer(state));
    const restored = walk.recallViewpoint({ ...recalled, blockZ: -1 }, 'A'); expect(restored.player).toEqual(pose);
  });

  it('rejects invalid slots and leaves missing recalls and clears harmless', () => {
    const state = walk.saveViewpoint(seed(), 'A');
    for (const slot of ['', 'a', 'C', 0, 1, null, undefined, {}, ['A'], '__proto__']) for (const action of ['saveViewpoint', 'recallViewpoint', 'clearViewpoint']) expect(walk[action](state, slot)).toEqual(state);
    expect(walk.recallViewpoint(state, 'B')).toEqual(state); expect(walk.clearViewpoint(state, 'B')).toEqual(state);
  });

  it('only saves within the active room but permits recall into that room', () => {
    const state = walk.saveViewpoint(seed('scale'), 'A'), elsewhere = walk.normalize({ ...state, player: walk.spawn('ring') });
    expect(walk.canSaveViewpoint(state)).toBe(true); expect(walk.canSaveViewpoint(elsewhere)).toBe(false); expect(walk.saveViewpoint(elsewhere, 'B')).toEqual(elsewhere);
    expect(walk.recallViewpoint(elsewhere, 'A').player).toEqual(state.player);
    for (const { id } of walk.activities) expect(walk.canSaveViewpoint(seed(id))).toBe(true);
  });

  it('blocks all three actions only while the active Change Room shutter is closed', () => {
    const saved = walk.saveViewpoint(seed('change'), 'A'), closed = walk.normalize({ ...saved, change: { ...saved.change, closed: true } });
    expect(walk.canSaveViewpoint(closed)).toBe(false);
    for (const action of ['saveViewpoint', 'recallViewpoint', 'clearViewpoint']) expect(walk[action](closed, 'A')).toEqual(closed);
    const otherRoom = walk.normalize({ ...closed, activity: 'aperture', player: walk.spawn('aperture') });
    expect(walk.canSaveViewpoint(otherRoom)).toBe(true); expect(walk.saveViewpoint(otherRoom, 'A').viewpoints.aperture.A).toEqual(otherRoom.player);
  });
});

describe('saved viewpoint controls', () => {
  it('provides accessible disabled empty slots, saves the pose, and reflects the actual camera', async () => {
    await mount('aperture');
    for (const slot of ['A', 'B']) {
      for (const action of ['save', 'recall', 'clear']) expect(query(selector(action, slot)).getAttribute('aria-label')).toBeTruthy();
      expect(query(selector('save', slot)).disabled).toBe(false); expect(query(selector('recall', slot)).disabled).toBe(true); expect(query(selector('clear', slot)).disabled).toBe(true);
    }
    await click(selector('save')); const pose = { ...latest.perceptionWalk.player };
    expect(query(selector('recall')).disabled).toBe(false); expect(query(selector('clear')).disabled).toBe(false); expect(query(selector('recall')).getAttribute('aria-pressed')).toBe('true');
    await act(async () => replace({ player: { ...pose, yaw: 12, pitch: 5 } }));
    expect(query(selector('recall')).getAttribute('aria-pressed')).toBe('false');
    const before = structuredClone(latest.perceptionWalk); await click(selector('recall'));
    expect(latest.perceptionWalk.player).toEqual(pose); expect(withoutPlayer(latest.perceptionWalk)).toEqual(withoutPlayer(before));
    expect(viewer.push.mock.calls.at(-1)[0].player).toEqual(pose); expect(query(selector('recall')).getAttribute('aria-pressed')).toBe('true'); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('uses camera tolerance rather than a latched selected slot', async () => {
    const pose = { x: 180, z: 11, yaw: 0, pitch: 0 };
    await mount('aperture', { viewpoints: { aperture: { A: pose } } });
    await act(async () => replace({ player: { ...pose, x: pose.x + 0.0000005 } })); expect(query(selector('recall')).getAttribute('aria-pressed')).toBe('true');
    for (const coordinate of ['x', 'z', 'yaw', 'pitch']) {
      await act(async () => replace({ player: { ...pose, [coordinate]: pose[coordinate] + 0.000002 } })); expect(query(selector('recall')).getAttribute('aria-pressed')).toBe('false');
    }
  });

  it('preserves viewpoints across room navigation and reset, clearing only by explicit action', async () => {
    await mount('aperture', { notes: { aperture: 'Return here.' }, aperture: { phase: 90, completed: [0] } });
    await click(selector('save')); const saved = { ...latest.perceptionWalk.viewpoints.aperture.A };
    await click('[data-walk-activity="weave"]'); expect(query(selector('recall')).disabled).toBe(true); await click(selector('save', 'B'));
    const weave = { ...latest.perceptionWalk.viewpoints.weave.B }; await click('[data-walk-activity="aperture"]');
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.aperture.completed).toEqual([]); expect(latest.perceptionWalk.viewpoints.aperture.A).toEqual(saved); expect(latest.perceptionWalk.viewpoints.weave.B).toEqual(weave); expect(latest.perceptionWalk.notes.aperture).toBe('Return here.');
    await click(selector('clear')); expect(latest.perceptionWalk.viewpoints.aperture.A).toBeNull(); expect(query(selector('recall')).disabled).toBe(true); expect(latest.perceptionWalk.viewpoints.weave.B).toEqual(weave);
  });

  it('disables every viewpoint action during the closed shutter and restores them when opened', async () => {
    await mount('change', { viewpoints: { change: { A: walk.spawn('change') } }, change: { closed: true } });
    const before = structuredClone(latest);
    for (const action of ['save', 'recall', 'clear']) for (const slot of ['A', 'B']) {
      expect(query(selector(action, slot)).disabled).toBe(true); await click(selector(action, slot));
    }
    expect(latest).toEqual(before); await click('[data-walk-change-shutter]');
    for (const action of ['save', 'recall', 'clear']) expect(query(selector(action)).disabled).toBe(false);
    expect(query(selector('recall', 'B')).disabled).toBe(true);
  });

  it.each(['save', 'recall', 'clear'])('stops playback and held movement before %s', async action => {
    await mount('aperture', { viewpoints: { aperture: { A: walk.spawn('aperture') } } }); vi.useFakeTimers();
    await click('[data-walk-aperture-play]'); await tick(); expect(latest.perceptionWalk.aperture.phase).toBeGreaterThan(0);
    await click(selector(action)); const phase = latest.perceptionWalk.aperture.phase; await tick(); expect(latest.perceptionWalk.aperture.phase).toBe(phase); expect(vi.getTimerCount()).toBe(0);
    if (action === 'clear') await click(selector('save'));
    await startWalking(); await tick(); const moved = { ...latest.perceptionWalk.player }; expect(moved.z).toBeLessThan(walk.spawn('aperture').z);
    await click(selector(action)); const player = { ...latest.perceptionWalk.player }; await tick(); expect(latest.perceptionWalk.player).toEqual(player); expect(vi.getTimerCount()).toBe(0);
  });

  it('recalls and preserves saved views in the non-WebGL plan fallback', async () => {
    const pose = { x: 181, z: 10, yaw: -6, pitch: 2 };
    await mount('aperture', { viewpoints: { aperture: { B: pose } } }); await click('[data-walk-diagram-toggle]');
    expect(query('[data-walk-aperture-plan]')).toBeTruthy(); await click(selector('recall', 'B'));
    expect(latest.perceptionWalk.player).toEqual(pose); expect(query(selector('recall', 'B')).getAttribute('aria-pressed')).toBe('true');
    await click(selector('save')); expect(latest.perceptionWalk.viewpoints.aperture.A).toEqual(pose);
  });
});

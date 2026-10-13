import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const threeModule = { exports: {} };
new Function('module', 'exports', readFileSync(resolve('vendor/three-r128/three.min.js'), 'utf8'))(threeModule, threeModule.exports);
const THREE = threeModule.exports;
let walk, host, root, latest, viewer;
const seed = patch => walk.normalize({ activity: 'shape', player: walk.spawn('shape'), ...patch });
const defaults = () => ({ round: 0, angles: [68, 347], tilts: [4, 4], selected: 0, choice: '', completed: [] });
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };

async function input(selector, value) {
  const node = query(selector); expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
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
  host?.remove(); host = root = null; vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('shape constancy geometry', () => {
  it('offers exactly one circle and one genuine oval in each round', () => {
    for (const round of [0, 1]) {
      const objects = walk.shapeObjects(round, [31, 279], [-22, 61]);
      expect(objects.map(item => item.id)).toEqual(['shape-A', 'shape-B']);
      expect(objects.map(item => item.choice)).toEqual(['A', 'B']);
      expect(objects.map(item => [item.x, item.y, item.z])).toEqual([[118, 2.3, 0], [122, 2.3, 0]]);
      expect(objects.map(item => [item.yaw, item.pitch, item.tube])).toEqual([[31, -22, 0.075], [279, 61, 0.075]]);
      expect(objects.filter(item => item.rx === item.ry).map(item => item.choice)).toEqual([walk.shapeTarget(round)]);
      const circle = objects.find(item => item.choice === walk.shapeTarget(round));
      expect(circle.rx).toBe(1.3); expect(circle.ry).toBe(1.3);
      const oval = objects.find(item => item.choice !== walk.shapeTarget(round));
      expect([oval.rx, oval.ry]).toEqual(round === 0 ? [0.75, 1.3] : [1.3, 0.75]);
      objects[0].rx = 99; expect(walk.shapeObjects(round)[0].rx).not.toBe(99);
    }
    expect(walk.shapeTarget(0)).toBe('A'); expect(walk.shapeTarget(1)).toBe('B');
  });

  it('transforms every ring point with the same rigid YXZ rotation as Three.js', () => {
    for (const round of [0, 1]) for (const angles of [[68, 347], [0, 90], [181, 270], [17, 359]]) for (const tilts of [[4, 4], [-75, 75], [0, 59]]) {
      for (const item of walk.shapeObjects(round, angles, tilts)) {
        const rotation = new THREE.Euler(item.pitch * Math.PI / 180, item.yaw * Math.PI / 180, 0, 'YXZ');
        for (let index = 0; index < 12; index++) {
          const angle = index * Math.PI / 6, local = { x: item.rx * Math.cos(angle), y: item.ry * Math.sin(angle), z: 0 };
          const expected = new THREE.Vector3(local.x, local.y, local.z).applyEuler(rotation).add(new THREE.Vector3(item.x, item.y, item.z));
          const actual = walk.shapePoint(item, local);
          for (const axis of ['x', 'y', 'z']) expect(actual[axis]).toBeCloseTo(expected[axis], 10);
        }
      }
    }
  });

  it('preserves the real diameters at every turn and tilt rather than resizing the rings', () => {
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    for (const round of [0, 1]) for (const angles of [[0, 0], [68, 347], [90, 270]]) for (const tilts of [[0, 0], [-75, 75], [4, 59]]) {
      for (const item of walk.shapeObjects(round, angles, tilts)) {
        const width = distance(walk.shapePoint(item, { x: -item.rx, y: 0, z: 0 }), walk.shapePoint(item, { x: item.rx, y: 0, z: 0 }));
        const height = distance(walk.shapePoint(item, { x: 0, y: -item.ry, z: 0 }), walk.shapePoint(item, { x: 0, y: item.ry, z: 0 }));
        expect(width).toBeCloseTo(item.rx * 2, 12); expect(height).toBeCloseTo(item.ry * 2, 12);
        expect(Math.abs(width - height) < 1e-10).toBe(item.choice === walk.shapeTarget(round));
      }
    }
  });
});

describe('shape constancy state and scoring', () => {
  it('migrates existing progress without disturbing earlier puzzles or notes', () => {
    const old = { activity: 'relief', player: walk.spawn('relief'), relief: { completed: [0, 1] },
      rotation: { completed: [0, 1] }, notes: { relief: 'Keep both light pairs.', rotation: 'Keep the sculpture note.' } };
    const before = structuredClone(old), state = walk.normalize(old);
    expect(state.shape).toEqual(defaults()); expect(state.progress.shape).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(state.notes.shape).toBe(''); expect(state.notes.relief).toBe(old.notes.relief);
    expect(state.progress.relief.solved).toBe(true); expect(state.progress.rotation.solved).toBe(true);
    expect(state.player).toEqual(old.player); expect(old).toEqual(before); expect(walk.normalize(state)).toEqual(state);
  });

  it('normalizes malformed saves, angle wrapping, tilt bounds and unique completed rounds', () => {
    expect(seed().shape).toEqual(defaults());
    const raw = { shape: { round: 8, angles: [-25, 945], tilts: [-999, 999], selected: 3, choice: 'C', completed: [-1, 0, 0, 1, 2, 0.5, '1', null] } };
    const before = structuredClone(raw), state = seed(raw);
    expect(state.shape).toEqual({ round: 1, angles: [335, 225], tilts: [-75, 75], selected: 1, choice: '', completed: [0, 1] });
    expect(state.progress.shape.solved).toBe(true); expect(raw).toEqual(before);
    expect(seed({ progress: { shape: { solved: true } } }).progress.shape.solved).toBe(false);
    expect(seed({ shape: { completed: [0, 1] }, progress: { shape: { assisted: true } } }).progress.shape.solved).toBe(false);
    for (const shape of [null, [], { round: 'bad', angles: [NaN, Infinity], tilts: [null, 'bad'], selected: 'bad', completed: 'bad' }]) {
      expect(seed({ shape }).shape).toEqual(defaults());
    }
  });

  it('turns and tilts only the selected reachable ring without altering answers or sibling work', () => {
    const state = seed({ notes: { shape: 'Its diameter stays fixed.' }, relief: { lightAngle: 270, completed: [0] } }), before = structuredClone(state);
    const a = walk.turnShape(state, 0, -25, 999);
    expect(a.shape).toEqual({ ...defaults(), angles: [335, 347], tilts: [75, 4] });
    const b = walk.turnShape(a, 1, 945, -999);
    expect(b.shape).toEqual({ ...defaults(), angles: [335, 225], tilts: [75, -75], selected: 1 });
    expect(b.relief).toEqual(state.relief); expect(b.notes).toEqual(state.notes); expect(b.player).toEqual(state.player);
    for (const value of [null, '', 'bad', Infinity, NaN]) expect(walk.turnShape(state, 0, value, value)).toEqual(state);
    for (const index of [-1, 2, 0.5, '0', null]) expect(walk.turnShape(state, index, 45, 30)).toEqual(state);
    expect(state).toEqual(before);
  });

  it('limits turning to the front of the reachable candidate and the active room', () => {
    const state = seed(); expect(walk.canTurnShape(state, 0)).toBe(true); expect(walk.canTurnShape(state, 1)).toBe(true);
    for (const patch of [{ activity: 'relief' }, { player: { x: 118, z: -2, yaw: 0, pitch: 0 } }, { player: { x: 100, z: 9, yaw: 0, pitch: 0 } }]) {
      const unreachable = seed(patch);
      expect(walk.canTurnShape(unreachable, 0)).toBe(false); expect(walk.canTurnShape(unreachable, 1)).toBe(false);
      expect(walk.turnShape(unreachable, 0, 90, 45)).toEqual(unreachable);
    }
    for (const index of [-1, 2, 0.5, '0', null]) expect(walk.canTurnShape(state, index)).toBe(false);
  });

  it('rejects invalid answers without changing the rings, player or prior observations', () => {
    const state = seed({ notes: { shape: 'A different angle changed its image.' }, shape: { completed: [0] } });
    const original = structuredClone(state);
    for (const choice of ['', 'R', 'C', 'a', null, 0, {}, ['A']]) expect(walk.chooseShape(state, choice)).toEqual(state);
    for (const choice of ['A', 'B']) {
      const result = walk.chooseShape(state, choice);
      expect(result.shape).toEqual({ ...state.shape, choice }); expect(result.player).toEqual(state.player);
      expect(result.progress).toEqual(state.progress); expect(result.notes).toEqual(state.notes);
    }
    expect(state).toEqual(original);
  });

  it('requires a correct answer and a valid observation view before awarding a round', () => {
    expect(walk.shapeMatches(seed({ shape: { choice: 'A' } }))).toBe(true);
    for (const patch of [{ activity: 'relief' }, { shape: { choice: 'B' } }, { shape: { choice: '' } },
      { player: { x: 113, z: 9, yaw: 0, pitch: 0 } }, { player: { x: 127, z: 9, yaw: 0, pitch: 0 } },
      { player: { x: 120, z: 12.1, yaw: 0, pitch: 0 } }, { player: { x: 120, z: -2, yaw: 0, pitch: 0 } },
      { player: { x: 120, z: 9, yaw: 180, pitch: 0 } }, { player: { x: 120, z: 9, yaw: 0, pitch: 45 } }]) {
      const state = seed({ shape: { choice: 'A' }, ...patch });
      expect(walk.shapeMatches(state)).toBe(false); expect(walk.checkShape(state).shape.completed).toEqual([]);
    }
  });

  it('scores each pair once, advances with new poses and preserves earned solves on replay', () => {
    const first = walk.checkShape(seed({ shape: { choice: 'A' } }));
    expect(first.shape.completed).toEqual([0]); expect(first.progress.shape.solved).toBe(false);
    expect(walk.checkShape(first)).toEqual(first);
    const second = walk.nextShape(first);
    expect(second.shape).toEqual({ round: 1, angles: [13, 347], tilts: [4, 59], selected: 0, choice: '', completed: [0] });
    const completed = walk.checkShape(walk.chooseShape(second, 'B'));
    expect(completed.shape.completed).toEqual([0, 1]); expect(completed.progress.shape.solved).toBe(true);
    const replay = walk.nextShape(completed);
    expect(replay.shape).toEqual({ ...defaults(), completed: [0, 1] }); expect(replay.progress.shape.solved).toBe(true);
  });

  it('gates unsolved rounds but permits revealed exploration without scoring it', () => {
    const initial = seed(); expect(walk.nextShape(initial)).toEqual(initial);
    const wrong = seed({ shape: { choice: 'B' } }); expect(walk.nextShape(wrong)).toEqual(wrong);
    const assisted = seed({ shape: { choice: 'A' }, progress: { shape: { assisted: true } } });
    expect(walk.checkShape(assisted).shape.completed).toEqual([]);
    const second = walk.nextShape(assisted);
    expect(second.shape.round).toBe(1); expect(second.shape.completed).toEqual([]);
    expect(second.progress.shape).toEqual(assisted.progress.shape);
    const other = seed({ activity: 'relief', shape: { completed: [0, 1] } }); expect(walk.nextShape(other)).toEqual(other);
  });
});

describe('shape constancy inspection', () => {
  it('offers six safe poses aimed at the center of either ring', () => {
    const views = walk.shapeInspectionViews();
    expect(views).toHaveLength(6); expect(new Set(views.map(view => view.choice + '-' + view.side)).size).toBe(6);
    expect(walk.spawn('shape')).toEqual({ x: 120, z: 9, yaw: 0, pitch: 0 });
    for (const view of views) {
      const x = view.choice === 'A' ? 118 : 122, p = view.player;
      expect(['A', 'B']).toContain(view.choice); expect(['front', 'left', 'right']).toContain(view.side);
      expect(Math.hypot(p.x - x, p.z)).toBeCloseTo(4.5, 12);
      expect(p.yaw).toBeCloseTo(Math.atan2(x - p.x, p.z) * 180 / Math.PI, 10);
      expect(p.pitch).toBeCloseTo(Math.atan2(0.65, 4.5) * 180 / Math.PI, 10);
      expect(p.x).toBeGreaterThan(114); expect(p.x).toBeLessThan(126); expect(p.z).toBeGreaterThan(1.3);
      for (const key of ['x', 'z', 'yaw', 'pitch']) {
        expect(seed({ player: p }).player[key]).toBeCloseTo(p[key], 12);
        expect(walk.movePlayer(p, 'forward', 0)[key]).toBeCloseTo(p[key], 12);
      }
      const state = seed({ player: p, shape: { choice: 'A' } });
      expect(walk.canTurnShape(state, view.choice === 'A' ? 0 : 1)).toBe(true); expect(walk.shapeMatches(state)).toBe(true);
    }
    views[0].player.x = -999; views[1].choice = 'invalid';
    expect(walk.shapeInspectionViews()[0].player.x).toBe(118); expect(walk.shapeInspectionViews()[1].choice).toBe('A');
  });

  it('changes only camera and selected ring, preserving the answer, physical poses and progress', () => {
    const state = seed({ shape: { round: 1, angles: [37, 215], tilts: [9, -36], choice: 'B', completed: [0, 1] },
      notes: { shape: 'Keep this observation.' }, relief: { completed: [0, 1] } });
    const before = structuredClone(state);
    for (const view of walk.shapeInspectionViews()) {
      const result = walk.inspectShape(state, view.choice, view.side);
      expect(result).toEqual({ ...state, player: view.player, shape: { ...state.shape, selected: view.choice === 'A' ? 0 : 1 } });
      expect(result.progress.shape.solved).toBe(true);
      expect(walk.shapeInspection(JSON.parse(JSON.stringify(result)))).toEqual(view);
    }
    expect(state).toEqual(before);
  });

  it('rejects invalid inspections and clears their selection after free walking or looking', () => {
    const state = seed(); expect(walk.shapeInspection(state)).toBeNull();
    for (const choice of ['', 'R', 'C', null, 0, {}, ['A']]) expect(walk.inspectShape(state, choice, 'front')).toEqual(state);
    for (const side of ['', 'back', 'LEFT', null, 0, {}, ['left']]) expect(walk.inspectShape(state, 'A', side)).toEqual(state);
    const other = seed({ activity: 'relief' });
    expect(walk.inspectShape(other, 'A', 'front')).toEqual(other); expect(walk.shapeInspection(other)).toBeNull();
    for (const view of walk.shapeInspectionViews()) {
      const inspected = walk.inspectShape(state, view.choice, view.side);
      for (const key of ['x', 'z', 'yaw', 'pitch']) expect(walk.shapeInspection({ ...inspected, player: { ...inspected.player, [key]: inspected.player[key] + 0.01 } })).toBeNull();
      const returned = walk.shapeInspection(inspected); returned.player.x = 0; expect(walk.shapeInspection(inspected)).toEqual(view);
    }
  });
});

describe('shape constancy interactive controls', () => {
  it('turns and tilts the chosen ring independently and completes both scored pairs', async () => {
    await mount(); expect(query('[data-walk-shape-next]').disabled).toBe(true);
    await input('[data-walk-shape-yaw]', 51); await input('[data-walk-shape-tilt]', 24);
    expect(latest.perceptionWalk.shape.angles).toEqual([51, 347]); expect(latest.perceptionWalk.shape.tilts).toEqual([24, 4]);
    await click('[data-walk-shape-piece="1"]'); await input('[data-walk-shape-yaw]', 173);
    expect(latest.perceptionWalk.shape.angles).toEqual([51, 173]);
    await click('[data-walk-shape-choice="A"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.shape.completed).toEqual([0]); expect(query('[data-walk-shape-next]').disabled).toBe(false);
    await click('[data-walk-shape-next]');
    expect(latest.perceptionWalk.shape).toEqual({ round: 1, angles: [13, 347], tilts: [4, 59], selected: 0, choice: '', completed: [0] });
    await click('[data-walk-shape-choice="B"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.shape).toMatchObject({ solved: true, assisted: false });
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('inspects either ring from three sides without overwriting its answer or orientation', async () => {
    await mount({ shape: { angles: [57, 206], tilts: [6, -19], choice: 'B' }, notes: { shape: 'Saved observation.' } });
    const before = structuredClone(latest.perceptionWalk);
    await click('[data-walk-shape-inspect="A"]'); await click('[data-walk-shape-view="left"]');
    expect(walk.shapeInspection(latest.perceptionWalk)).toMatchObject({ choice: 'A', side: 'left' });
    await click('[data-walk-shape-inspect="B"]'); await click('[data-walk-shape-view="right"]');
    expect(walk.shapeInspection(latest.perceptionWalk)).toMatchObject({ choice: 'B', side: 'right' });
    expect(latest.perceptionWalk.shape).toEqual({ ...before.shape, selected: 1 });
    expect(latest.perceptionWalk.notes).toEqual(before.notes); expect(latest.perceptionWalk.progress).toEqual(before.progress);
    await click('[data-walk-shape-overview]'); expect(latest.perceptionWalk.player).toEqual(before.player);
  });

  it('keeps rotation, inspection and answer alternatives usable in Plan and failed WebGL', async () => {
    await mount(); await click('[data-walk-diagram-toggle]');
    expect(query('[data-walk-shape-plan]')).toBeTruthy(); expect(query('[data-walk-shape-diameters]')).toBeNull();
    const before = query('[data-walk-shape-plan]').innerHTML;
    await input('[data-walk-shape-yaw]', 15); expect(query('[data-walk-shape-plan]').innerHTML).not.toBe(before);
    await click('[data-walk-shape-inspect="A"]'); await click('[data-walk-shape-view="left"]');
    expect(walk.shapeInspection(latest.perceptionWalk)).toMatchObject({ choice: 'A', side: 'left' });
    await click('[data-walk-shape-overview]'); await click('[data-walk-diagram-toggle]');
    await act(async () => viewer.report('failed')); expect(query('[data-walk-shape-plan]')).toBeTruthy();
    await click('[data-walk-shape-piece="1"]'); await input('[data-walk-shape-tilt]', -35);
    expect(latest.perceptionWalk.shape.tilts[1]).toBe(-35);
    await click('[data-walk-shape-choice="A"]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.shape.completed).toEqual([0]);
  });

  it('preserves earned solves on reveal and resets only this challenge while keeping notes', async () => {
    await mount({ shape: { completed: [0, 1], choice: 'B' }, relief: { completed: [0, 1] }, notes: { shape: 'A circle remains a circle.' } });
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.shape).toMatchObject({ solved: true, assisted: false });
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.shape).toEqual(defaults()); expect(latest.perceptionWalk.notes.shape).toBe('A circle remains a circle.');
    expect(latest.perceptionWalk.progress.relief.solved).toBe(true); expect(latest.otherTool).toEqual({ preserved: 37 });
    await click('[data-walk-diagram-toggle]'); await click('[data-walk-reveal]');
    expect(query('[data-walk-shape-diameters]')).toBeTruthy(); expect(latest.perceptionWalk.progress.shape).toMatchObject({ solved: false, assisted: true });
    await click('[data-walk-shape-choice="A"]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.shape.completed).toEqual([]);
    await click('[data-walk-shape-next]'); expect(latest.perceptionWalk.shape.round).toBe(1); expect(latest.perceptionWalk.progress.shape.solved).toBe(false);
  });
});

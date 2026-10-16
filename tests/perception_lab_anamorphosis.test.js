import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const seed = patch => walk.normalize({ activity: 'anamorphosis', player: walk.spawn('anamorphosis'), ...patch });
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
async function input(value) {
  await act(async () => {
    const node = query('[data-walk-anamorphosis-offset]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const aligned = state => walk.anamorphosisTargets(state.anamorphosis.round, state.anamorphosis.set).reduce((next, offset, index) => walk.setAnamorphosisOffset(next, index, offset), state);
const observed = state => walk.inspectAnamorphosis(walk.recordAnamorphosis(walk.inspectAnamorphosis(walk.recordAnamorphosis(walk.inspectAnamorphosis(state, 'front')), 'side')), 'front');
const solve = state => walk.checkAnamorphosis(observed(aligned(state)));
async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function pointer(type, x, y, pointerType = 'mouse') {
  const stage = query('[data-walk-stage]'); stage.setPointerCapture ||= vi.fn(); stage.hasPointerCapture ||= () => true; stage.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } }); stage.dispatchEvent(event);
  });
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))(); walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready', onStatusChange: fn => { report = fn; }, report: value => report(value), onLayout: vi.fn(), pick: vi.fn(() => null) }; return viewer;
  }) };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); host = root = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('anamorphic perspective geometry', () => {
  it('adds room20 while preserving old puzzle state and last-room bookmarks', () => {
    const pose = { x: 211.3, z: 10, yaw: -20, pitch: 5 };
    const raw = { activity: 'silhouette', silhouette: { set: 1, angle: 43, completed: [0] }, notes: { silhouette: 'Keep the side view' }, viewpoints: { silhouette: { A: pose, B: { ...pose, x: 211.31 } } } };
    const before = structuredClone(raw), state = walk.normalize(raw);
    expect(walk.activities).toHaveLength(20); expect(walk.activities.at(-1).id).toBe('anamorphosis');
    expect(walk.nextRoom(state, 1)).toBe('anamorphosis'); expect(walk.nextRoom(seed(), 1)).toBeNull();
    expect(state.silhouette).toMatchObject(raw.silhouette); expect(state.viewpoints.silhouette).toEqual({ A: pose, B: null });
    expect(walk.recallViewpoint(state, 'A').player).toEqual(pose); expect(raw).toEqual(before);
    expect(walk.normalizePlayer({ x: 999 }).x).toBe(223.3);
    expect(walk.normalize(state)).toEqual(state);
  });
  it.each([0, 1])('joins all projected endpoints in arrangement%s without physically joining the beams', round => {
    const state = aligned(seed({ anamorphosis: { round } })), objects = walk.anamorphosisObjects(round, state.anamorphosis.offsets);
    expect(objects.map(item => item.choice)).toEqual(['A', 'B', 'C']); expect(objects.map(item => item.index)).toEqual([-1, 0, 1]);
    const project = q => [(q.x - 216) / (10 - q.z), (q.y - 1.65) / (10 - q.z)];
    for (const [index, object] of objects.entries()) {
      const next = objects[(index + 1) % 3], a = project(object.to), b = project(next.from);
      expect(a[0]).toBeCloseTo(b[0], 10); expect(a[1]).toBeCloseTo(b[1], 10);
      expect(Math.hypot(object.to.x - next.from.x, object.to.y - next.from.y, object.to.z - next.from.z)).toBeGreaterThan(1);
      expect(object.radius / (10 - object.from.z)).toBeCloseTo(.0085, 10);
    }
    expect(walk.anamorphosisError(state)).toBeLessThan(1e-10);
    expect(walk.anamorphosisError(walk.inspectAnamorphosis(state, 'side'))).toBeGreaterThan(.02);
    expect(walk.anamorphosisError(seed({ anamorphosis: { round } }))).toBeGreaterThan(.08);
  });
  it('blocks walking through the exhibit while preserving observation poses and the old boundary corridor', () => {
    const moved = walk.movePlayer(walk.spawn('anamorphosis'), 'forward', 10);
    expect(moved.z).toBeGreaterThanOrEqual(2.45); expect(moved.z).toBeLessThan(4);
    for (const view of walk.anamorphosisInspectionViews()) expect(seed({ player: view.player }).player).toEqual(walk.normalizePlayer(view.player));
    const oldEdge = { x: 211.3, z: 0, yaw: 0, pitch: 0 }; expect(walk.normalize({ activity: 'silhouette', player: oldEdge }).player).toEqual(oldEdge);
    for (const round of [0, 1]) for (const offsets of [[-1.2, 1.2], [1.2, -1.2]]) for (const item of walk.anamorphosisObjects(round, offsets)) for (const point of [item.from, item.to]) {
      expect(point.x - item.radius).toBeGreaterThan(211.7); expect(point.x + item.radius).toBeLessThan(221.5);
      expect(point.z - item.radius).toBeGreaterThan(-2.45); expect(point.z + item.radius).toBeLessThan(2.45);
    }
  });
  it('keeps the fixed anchor immutable and returns independent geometry', () => {
    const base = walk.anamorphosisObjects(0, [-1.2, 1.2]), moved = walk.anamorphosisObjects(0, [1.2, -1.2]);
    expect(base[0]).toEqual(moved[0]); expect(base[1].from.x).not.toBe(moved[1].from.x);
    base[0].from.x = 999; expect(walk.anamorphosisObjects(0, [0, 0])[0].from.x).not.toBe(999);
  });
  it('normalizes malformed data and cannot restore solved from a flag alone', () => {
    for (const anamorphosis of [null, [], 'bad', { round: NaN, offsets: [NaN, Infinity] }]) {
      const state = seed({ anamorphosis }); expect(state.anamorphosis.round).toBe(0); expect(state.anamorphosis.offsets).toEqual([-.9, .9]);
    }
    const state = seed({ anamorphosis: { round: 99, offsets: [-9, 9], seen: 99, selected: 9, completed: [1, 1, 0, '0', 2] } });
    expect(state.anamorphosis).toMatchObject({ round: 1, offsets: [-1.2, 1.2], seen: 3, selected: 1, completed: [0, 1] });
    expect(state.progress.anamorphosis.solved).toBe(true);
    expect(seed({ progress: { anamorphosis: { solved: true } } }).progress.anamorphosis.solved).toBe(false);
    expect(seed({ anamorphosis: { completed: [0, 1] }, progress: { anamorphosis: { assisted: true } } }).progress.anamorphosis.solved).toBe(false);
  });
  it.each([{ x: 216, z: 10, yaw: 180, pitch: 0 }, { x: 204, z: 10, yaw: 0, pitch: 0 }, { x: 216, z: -5, yaw: 0, pitch: 0 }])('rejects remote or rear manipulations at %o', player => {
    const state = seed({ player });
    expect(walk.canManipulateAnamorphosis(state)).toBe(false);
    expect(walk.setAnamorphosisOffset(state, 0, 0)).toEqual(state); expect(walk.selectAnamorphosis(state, 1)).toEqual(state);
    expect(walk.recordAnamorphosis(state)).toEqual(state); expect(walk.checkAnamorphosis(state).anamorphosis.completed).toEqual([]);
  });
  it('rejects invalid indices and nonfinite offsets without mutating input', () => {
    const state = seed(), before = structuredClone(state);
    for (const index of [-1, 2, .5, NaN, '0']) expect(walk.setAnamorphosisOffset(state, index, .2)).toEqual(state);
    for (const value of [null, '', {}, NaN, Infinity]) expect(walk.setAnamorphosisOffset(state, 0, value).anamorphosis.offsets).toEqual(state.anamorphosis.offsets);
    expect(walk.setAnamorphosisOffset(state, 0, 9).anamorphosis.offsets[0]).toBe(1.2); expect(state).toEqual(before);
    const other = seed({ activity: 'silhouette' }); expect(walk.inspectAnamorphosis(other, 'front')).toEqual(other);
    expect(walk.inspectAnamorphosis(state, 'back')).toEqual(state);
  });
});

describe('earned viewpoint comparisons', () => {
  it('requires a current front and side observation and the front check position', () => {
    const state = aligned(seed()); expect(walk.anamorphosisMatches(state)).toBe(false);
    const front = walk.recordAnamorphosis(state); expect(front.anamorphosis.seen).toBe(1);
    expect(walk.recordAnamorphosis(front).anamorphosis.seen).toBe(1); expect(walk.checkAnamorphosis(front).anamorphosis.completed).toEqual([]);
    const side = walk.recordAnamorphosis(walk.inspectAnamorphosis(front, 'side')); expect(side.anamorphosis.seen).toBe(3);
    expect(walk.anamorphosisMatches(side)).toBe(false); expect(walk.anamorphosisMatches(walk.inspectAnamorphosis(side, 'front'))).toBe(true);
  });
  it('invalidates evidence only when the geometry actually changes', () => {
    const state = observed(aligned(seed()));
    expect(walk.setAnamorphosisOffset(state, 0, state.anamorphosis.offsets[0]).anamorphosis.seen).toBe(3);
    expect(walk.selectAnamorphosis(state, 1).anamorphosis.seen).toBe(3);
    expect(walk.setAnamorphosisOffset(state, 0, state.anamorphosis.offsets[0] + .01).anamorphosis.seen).toBe(0);
    expect(walk.inspectAnamorphosis(state, 'side').anamorphosis).toEqual(state.anamorphosis);
  });
  it('earns two distinct trials and survives a JSON round trip', () => {
    const start = seed({ notes: { anamorphosis: 'The joins separate from the side.' } }); expect(walk.nextAnamorphosis(start)).toEqual(start);
    const first = solve(start); expect(first.anamorphosis.completed).toEqual([0]); expect(walk.checkAnamorphosis(first).anamorphosis.completed).toEqual([0]);
    const next = walk.nextAnamorphosis(first); expect(next.anamorphosis).toMatchObject({ round: 1, seen: 0, offsets: [.9, -.9], completed: [0] });
    const second = solve(next); expect(second.progress.anamorphosis.solved).toBe(true); expect(second.anamorphosis.completed).toEqual([0, 1]);
    expect(walk.checkAnswer(second)).toBe(true); expect(walk.normalize(JSON.parse(JSON.stringify(second)))).toEqual(second); expect(second.notes).toEqual(start.notes);
  });
  it('keeps assisted practice available without awarding progress', () => {
    const state = solve(seed({ progress: { anamorphosis: { assisted: true } } }));
    expect(state.anamorphosis.completed).toEqual([]); expect(state.progress.anamorphosis.solved).toBe(false); expect(walk.checkAnswer(state)).toBe(false);
    expect(walk.nextAnamorphosis(state).anamorphosis.round).toBe(1);
  });
  it('saves both actual observation poses without changing the beam settings', () => {
    let state = observed(aligned(seed())); state = walk.saveViewpoint(state, 'A'); state = walk.inspectAnamorphosis(state, 'side'); state = walk.saveViewpoint(state, 'B');
    const before = structuredClone(state.anamorphosis);
    expect(walk.anamorphosisView(walk.recallViewpoint(state, 'A'))).toBe('front');
    expect(walk.anamorphosisView(walk.recallViewpoint(state, 'B'))).toBe('side'); expect(walk.recallViewpoint(state, 'A').anamorphosis).toEqual(before);
  });
});

describe('depth alignment puzzle set', () => {
  it.each([0, 1])('changes only physical depth in arrangement%s and joins the perspective image', round => {
    const start = seed({ anamorphosis: { round, set: 1 } }), target = aligned(start);
    const initial = walk.anamorphosisObjects(round, start.anamorphosis.offsets, 1), objects = walk.anamorphosisObjects(round, target.anamorphosis.offsets, 1);
    const project = q => [(q.x - 216) / (10 - q.z), (q.y - 1.65) / (10 - q.z)];
    const length = o => Math.hypot(o.to.x - o.from.x, o.to.y - o.from.y, o.to.z - o.from.z);
    expect(initial[0]).toEqual(objects[0]);
    for (const [i, object] of objects.entries()) {
      expect(length(object)).toBeCloseTo(length(initial[i]), 12); expect(object.radius).toBe(initial[i].radius);
      for (const end of ['from', 'to']) { expect(object[end].x).toBe(initial[i][end].x); expect(object[end].y).toBe(initial[i][end].y); }
      if (i) expect(object.from.z).not.toBe(initial[i].from.z);
      const next = objects[(i + 1) % 3], a = project(object.to), b = project(next.from);
      expect(a[0]).toBeCloseTo(b[0], 10); expect(a[1]).toBeCloseTo(b[1], 10);
      expect(Math.hypot(object.to.x - next.from.x, object.to.y - next.from.y, object.to.z - next.from.z)).toBeGreaterThan(1);
    }
    expect(walk.anamorphosisError(start)).toBeGreaterThan(.025);
    expect(walk.anamorphosisError(target)).toBeLessThan(1e-10);
    expect(walk.anamorphosisError(walk.inspectAnamorphosis(target, 'side'))).toBeGreaterThan(.02);
    expect(walk.anamorphosisMatches(target)).toBe(false); expect(walk.anamorphosisMatches(observed(target))).toBe(true);
    const nearer = walk.anamorphosisObjects(round, [1.2, 1.2], 1), farther = walk.anamorphosisObjects(round, [-1.2, -1.2], 1);
    for (const i of [1, 2]) expect(length(nearer[i]) / (10 - nearer[i].from.z)).toBeGreaterThan(length(farther[i]) / (10 - farther[i].from.z));
  });
  it('keeps the original set compatible and protects all rail travel from walk-throughs', () => {
    for (const round of [0, 1]) {
      expect(walk.anamorphosisObjects(round, [.2, -.3])).toEqual(walk.anamorphosisObjects(round, [.2, -.3], 0));
      expect(walk.anamorphosisTargets(round)).toEqual(walk.anamorphosisTargets(round, 0));
      for (const offsets of [[-1.2, 1.2], [1.2, -1.2]]) for (const item of walk.anamorphosisObjects(round, offsets, 1)) for (const q of [item.from, item.to]) {
        expect(q.x - item.radius).toBeGreaterThan(211.7); expect(q.x + item.radius).toBeLessThan(221.5);
        expect(q.z - item.radius).toBeGreaterThan(-2.45); expect(q.z + item.radius).toBeLessThan(3.2);
      }
    }
    expect(walk.movePlayer(walk.spawn('anamorphosis'), 'forward', 10).z).toBeGreaterThanOrEqual(3.2);
  });
  it('migrates earned progress, validates sets and does not grant mastery for assisted old completions', () => {
    const legacy = seed({ anamorphosis: { completed: [0, 1] } }); expect(legacy.anamorphosis).toMatchObject({ set: 0, mastered: true });
    expect(walk.normalize(legacy)).toEqual(legacy);
    expect(seed({ anamorphosis: { set: 99 } }).anamorphosis.set).toBe(2);
    for (const set of [null, '', {}, NaN, Infinity]) expect(seed({ anamorphosis: { set } }).anamorphosis.set).toBe(0);
    const assisted = seed({ anamorphosis: { completed: [0, 1] }, progress: { anamorphosis: { assisted: true } } });
    expect(assisted.anamorphosis.mastered).toBe(false); expect(assisted.progress.anamorphosis.solved).toBe(false);
  });
  it('gates sets and requires fresh comparisons while preserving earlier mastery, notes and bookmarks', () => {
    let state = seed({ notes: { anamorphosis: 'Size changes with depth' }, viewpoints: { anamorphosis: { A: walk.spawn('anamorphosis') } } });
    expect(walk.advanceAnamorphosisSet(state)).toEqual(state); expect(walk.advanceAnamorphosisSet(solve(state)).anamorphosis.set).toBe(0);
    state = solve(walk.nextAnamorphosis(solve(state))); const before = structuredClone(state), next = walk.advanceAnamorphosisSet(state);
    expect(next.anamorphosis).toMatchObject({ set: 1, round: 0, seen: 0, completed: [], mastered: true });
    expect(next.progress.anamorphosis).toEqual({ solved: true, assisted: false, hints: 0 }); expect(walk.checkAnswer(next)).toBe(false);
    expect(next.notes).toEqual(before.notes); expect(next.viewpoints).toEqual(before.viewpoints); expect(state).toEqual(before);
    const first = solve(next); expect(first.anamorphosis.completed).toEqual([0]); expect(walk.checkAnswer(first)).toBe(false);
    const second = solve(walk.nextAnamorphosis(first)); expect(second.anamorphosis).toMatchObject({ set: 1, completed: [0, 1] });
    expect(walk.checkAnswer(second)).toBe(true); expect(walk.normalize(JSON.parse(JSON.stringify(second)))).toEqual(second);
    expect(walk.advanceAnamorphosisSet(second).anamorphosis).toMatchObject({ set: 2, mastered: true, completed: [] });
  });
  it('lets assisted practice change sets without awarding credit and rejects off-room switches', () => {
    const practice = solve(seed({ progress: { anamorphosis: { assisted: true } } }));
    expect(practice.anamorphosis.completed).toEqual([]); const next = walk.advanceAnamorphosisSet(practice);
    expect(next.anamorphosis).toMatchObject({ set: 1, mastered: false }); expect(next.progress.anamorphosis.assisted).toBe(false);
    const other = { ...practice, activity: 'silhouette' }; expect(walk.advanceAnamorphosisSet(other)).toEqual(other);
  });
  it('resets recorded views after a depth edit, but not after selecting or inspecting a beam', () => {
    const state = observed(aligned(seed({ anamorphosis: { set: 1 } })));
    expect(walk.selectAnamorphosis(state, 1).anamorphosis.seen).toBe(3);
    expect(walk.setAnamorphosisOffset(state, 0, state.anamorphosis.offsets[0]).anamorphosis.seen).toBe(3);
    expect(walk.setAnamorphosisOffset(state, 0, state.anamorphosis.offsets[0] + .01).anamorphosis.seen).toBe(0);
  });
  it('shows depth controls and fresh-round feedback instead of reusing the old solved status', async () => {
    await mount({ anamorphosis: { completed: [0, 1] }, notes: { anamorphosis: 'Keep this' } });
    await click('[data-walk-anamorphosis-set-next]'); expect(query('[data-walk-anamorphosis-set-label]').textContent).toBe('Depth alignment');
    expect(query('[data-walk-anamorphosis-set-next]').disabled).toBe(true); expect(query('[data-walk-anamorphosis-left]')).toBeNull();
    await click('[data-walk-anamorphosis-nearer]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.85);
    await click('[data-walk-anamorphosis-farther]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.9);
    for (const [index, value] of walk.anamorphosisTargets(0, 1).entries()) { await click('[data-walk-anamorphosis-choice="' + index + '"]'); await input(value); }
    await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-check]');
    expect(query('[data-walk-status]').textContent).toContain('next arrangement'); expect(latest.perceptionWalk.anamorphosis.completed).toEqual([0]);
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.anamorphosis).toMatchObject({ solved: true, assisted: true });
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.anamorphosis).toMatchObject({ set: 0, mastered: false }); expect(latest.perceptionWalk.notes.anamorphosis).toBe('Keep this');
  });
  it('uses actual depth coordinates for mouse dragging and a horizontal touch alternative', async () => {
    await mount({ anamorphosis: { set: 1 } }); const camera = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'anamorphosis-B' }); viewer.anamorphosisCoordinate = vi.fn((x, y) => y * .01);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 100, 140); await pointer('pointerup', 100, 140);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.5);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 140, 101, 'touch'); await pointer('pointerup', 140, 101, 'touch');
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.1);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 101, 140, 'touch'); await pointer('pointerup', 101, 140, 'touch');
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.1); expect(latest.perceptionWalk.player).toEqual(camera);
  });
  it('holds the last depth when a valid drag leaves the usable ray plane', async () => {
    await mount({ anamorphosis: { set: 1 } }); viewer.pick.mockReturnValue({ id: 'anamorphosis-C' });
    viewer.anamorphosisCoordinate = vi.fn((x, y) => y < 180 ? y * .01 : null);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 100, 120);
    expect(latest.perceptionWalk.anamorphosis.offsets[1]).toBeCloseTo(1.1);
    await pointer('pointermove', 100, 200); expect(latest.perceptionWalk.anamorphosis.offsets[1]).toBeCloseTo(1.1);
    await pointer('pointermove', 100, 110); expect(latest.perceptionWalk.anamorphosis.offsets[1]).toBeCloseTo(1);
    await pointer('pointerup', 100, 110);
  });
  it('renders changing apparent size with accessible Plan selection and target guides', async () => {
    await mount({ anamorphosis: { set: 1 } }); await act(async () => viewer.report('failed'));
    const beam = () => query('[data-walk-anamorphosis-solid="B"]'); const first = beam().outerHTML;
    await input(.45); expect(beam().outerHTML).not.toBe(first);
    await click('[data-walk-reveal]'); expect(host.querySelectorAll('[data-walk-anamorphosis-guide]')).toHaveLength(3);
    expect(query('[data-walk-anamorphosis-plan]').innerHTML).not.toMatch(/NaN|Infinity/);
  });
});

describe('interactive anamorphosis controls', () => {
  it('selects and adjusts both beams, records views, and earns both arrangements', async () => {
    await mount();
    for (const round of [0, 1]) {
      for (const [index, offset] of walk.anamorphosisTargets(round).entries()) { await click('[data-walk-anamorphosis-choice="' + index + '"]'); await input(offset); }
      await click('[data-walk-check]'); expect(latest.perceptionWalk.anamorphosis.completed).not.toContain(round);
      await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]'); await click('[data-walk-anamorphosis-record]');
      await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.anamorphosis.completed).toContain(round);
      if (!round) await click('[data-walk-anamorphosis-next]');
    }
    expect(latest.perceptionWalk.progress.anamorphosis.solved).toBe(true); expect(latest.otherTool.preserved).toBe(37);
  });
  it('drags beams without changing the camera and cancels on a viewpoint change', async () => {
    await mount(); const player = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'anamorphosis-B' }); await pointer('pointerdown', 100, 100); await pointer('pointermove', 140, 100);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.5, 8); expect(latest.perceptionWalk.player).toEqual(player);
    await click('[data-walk-anamorphosis-view="side"]'); const offsets = latest.perceptionWalk.anamorphosis.offsets.slice();
    await pointer('pointermove', 180, 100); await pointer('pointerup', 180, 100); expect(latest.perceptionWalk.anamorphosis.offsets).toEqual(offsets);
  });
  it('keeps assisted reveals and reset isolated from notes and other tools', async () => {
    await mount({ notes: { anamorphosis: 'Keep my note' } }); await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.progress.anamorphosis.assisted).toBe(true);
    await click('[data-walk-anamorphosis-next]'); expect(latest.perceptionWalk.anamorphosis.completed).toEqual([]);
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.anamorphosis).toMatchObject({ round: 0, offsets: [-.9, .9], seen: 0, completed: [] });
    expect(latest.perceptionWalk.notes.anamorphosis).toBe('Keep my note'); expect(latest.otherTool.preserved).toBe(37);
  });
  it('keeps Plan geometry finite, selectable and responsive without WebGL', async () => {
    await mount(); await act(async () => viewer.report('failed'));
    const svg = query('[data-walk-anamorphosis-plan]'); expect(svg).toBeTruthy(); const before = svg.innerHTML;
    await click('[data-walk-anamorphosis-choice="1"]'); await input(.2);
    expect(query('[data-walk-anamorphosis-plan]').innerHTML).not.toBe(before); expect(query('[data-walk-anamorphosis-plan]').innerHTML).not.toMatch(/NaN|Infinity/);
    await click('[data-walk-anamorphosis-view="side"]'); expect(query('[data-walk-anamorphosis-record]').disabled).toBe(false);
  });
});

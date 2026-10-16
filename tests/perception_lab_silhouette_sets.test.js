import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const seed = patch => walk.normalize({ activity: 'silhouette', player: walk.spawn('silhouette'), ...patch });
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const solve = state => walk.checkSilhouette(walk.selectSilhouette(walk.setSilhouetteAngle(walk.setSilhouetteAngle(state, 0), 90), walk.silhouetteTarget(state.silhouette.round, state.silhouette.set)));
const master = state => solve(walk.nextSilhouette(solve(state)));
async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function pointer(type, x, y) {
  const stage = query('[data-walk-stage]'); stage.setPointerCapture ||= vi.fn(); stage.hasPointerCapture ||= () => true; stage.releasePointerCapture ||= vi.fn();
  await act(async () => { const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }); Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } }); stage.dispatchEvent(event); });
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

describe('additional silhouette puzzle set', () => {
  it.each([0, 1])('keeps both set%s pairs connected, ambiguous in front and unique from the side', set => {
    for (const round of [0, 1]) {
      const reference = walk.silhouetteReference(round, set), objects = walk.silhouetteObjects(round, 45, set);
      expect(walk.silhouetteTarget(round, set)).toBe((round + set) % 2 ? 'B' : 'A');
      for (const object of objects) {
        const cells = object.cells; expect(cells).toHaveLength(set ? 10 : 8);
        expect(new Set(cells.map(cell => cell.join(','))).size).toBe(cells.length);
        const visited = new Set([0]), queue = [0];
        while (queue.length) {
          const index = queue.shift();
          cells.forEach((cell, i) => { if (!visited.has(i) && cell.reduce((sum, value, axis) => sum + Math.abs(value - cells[index][axis]), 0) === 1) { visited.add(i); queue.push(i); } });
        }
        expect(visited.size).toBe(cells.length);
        expect(walk.silhouetteProjection(cells, 'front')).toEqual(reference.front);
        expect(JSON.stringify(walk.silhouetteProjection(cells, 'side')) === JSON.stringify(reference.side)).toBe(object.choice === walk.silhouetteTarget(round, set));
      }
    }
  });
  it('keeps the first set backward compatible and returns independent geometry', () => {
    for (const round of [0, 1]) expect(walk.silhouetteObjects(round, 30)).toEqual(walk.silhouetteObjects(round, 30, 0));
    const first = walk.silhouetteObjects(0, 0, 1); first[0].cells[0][0] = 99;
    expect(walk.silhouetteObjects(0, 0, 1)[0].cells[0][0]).not.toBe(99);
    expect(walk.silhouetteReference(0, 1).front).not.toEqual(walk.silhouetteReference(0, 0).front);
  });
  it('normalizes set values and migrates old earned completions without accepting a forged solved flag', () => {
    const legacy = seed({ silhouette: { completed: [0, 1] } });
    expect(legacy.silhouette).toMatchObject({ set: 0, mastered: true }); expect(legacy.progress.silhouette.solved).toBe(true);
    expect(seed({ progress: { silhouette: { solved: true } } }).progress.silhouette.solved).toBe(false);
    expect(seed({ silhouette: { set: 99 } }).silhouette.set).toBe(1);
    for (const set of [null, '', {}, NaN, Infinity]) expect(seed({ silhouette: { set } }).silhouette.set).toBe(0);
    expect(walk.normalize(legacy)).toEqual(legacy);
  });
  it('does not promote assisted old completions to mastery', () => {
    const state = seed({ silhouette: { completed: [0, 1] }, progress: { silhouette: { assisted: true } } });
    expect(state.silhouette.mastered).toBe(false); expect(state.progress.silhouette.solved).toBe(false);
  });
  it('gates new sets and preserves earned mastery, notes and bookmarks', () => {
    let state = seed({ notes: { silhouette: 'Depth needs another view' }, viewpoints: { silhouette: { A: walk.spawn('silhouette') } } });
    expect(walk.advanceSilhouetteSet(state)).toEqual(state);
    state = master(state); const saved = structuredClone(state), next = walk.advanceSilhouetteSet(state);
    expect(next.silhouette).toMatchObject({ set: 1, round: 0, angle: 0, seen: 1, choice: '', completed: [], mastered: true });
    expect(next.progress.silhouette).toMatchObject({ solved: true, assisted: false, hints: 0 });
    expect(walk.checkAnswer(next)).toBe(false);
    expect(next.notes).toEqual(saved.notes); expect(next.viewpoints).toEqual(saved.viewpoints); expect(state).toEqual(saved);
    expect(walk.advanceSilhouetteSet(next)).toEqual(next);
    const second = master(next); expect(second.silhouette.set).toBe(1); expect(second.silhouette.completed).toEqual([0, 1]);
    expect(walk.advanceSilhouetteSet(second).silhouette).toMatchObject({ set: 0, mastered: true, completed: [] });
  });
  it('lets practice move on without awarding either trial or room mastery', () => {
    const practice = solve(seed({ progress: { silhouette: { assisted: true } } }));
    expect(practice.silhouette.completed).toEqual([]); expect(practice.silhouette.mastered).toBe(false);
    const next = walk.advanceSilhouetteSet(practice); expect(next.silhouette.set).toBe(1); expect(next.silhouette.mastered).toBe(false); expect(next.progress.silhouette.assisted).toBe(false);
  });
  it('retains previously earned mastery while the current set is assisted', () => {
    const state = walk.advanceSilhouetteSet(master(seed())); state.progress.silhouette.assisted = true;
    const result = solve(state); expect(result.silhouette.completed).toEqual([]); expect(result.progress.silhouette.solved).toBe(true); expect(result.silhouette.mastered).toBe(true);
  });
});

describe('close first-person inspection', () => {
  it.each([['A', 'front'], ['A', 'side'], ['B', 'front'], ['B', 'side']])('moves only the camera to %s %s', (choice, side) => {
    const state = seed({ silhouette: { set: 1, angle: 37, seen: 1, choice: 'B', completed: [0], mastered: true }, notes: { silhouette: 'Keep this' } });
    const next = walk.inspectSilhouette(state, choice, side), pose = walk.silhouetteInspectionViews(choice).find(view => view.side === side);
    expect(next.player).toEqual(pose.player); expect(next.silhouette).toEqual(state.silhouette); expect(next.progress).toEqual(state.progress); expect(next.notes).toEqual(state.notes); expect(next.viewpoints).toEqual(state.viewpoints);
    expect(walk.silhouetteInspection(next)).toMatchObject({ choice, side }); expect(walk.canObserveSilhouette(next)).toBe(true);
    expect(walk.normalize(next)).toEqual(next);
    expect(walk.setSilhouetteAngle(next, 90).silhouette.angle).toBe(90);
    expect(walk.selectSilhouette(next, 'A').silhouette.choice).toBe('A');
  });
  it.each([['A', 'front'], ['A', 'side'], ['B', 'front'], ['B', 'side']])('retains %s %s inspection through small steps and looks without locking the camera', (choice, side) => {
    const state = walk.inspectSilhouette(seed({ silhouette: { set: 1, angle: 37, choice: 'B' } }), choice, side);
    for (const offset of [{ x: .2, z: 0 }, { x: -.2, z: 0 }, { x: 0, z: .2 }, { x: 0, z: -.2 }]) for (const turn of [-10, 10]) {
      const nearby = walk.normalize({ ...state, player: { ...state.player, x: state.player.x + offset.x, z: state.player.z + offset.z, yaw: state.player.yaw + turn, pitch: state.player.pitch + turn } });
      expect(walk.silhouetteInspection(nearby)).toMatchObject({ choice, side });
      expect(walk.canObserveSilhouette(nearby)).toBe(true); expect(nearby.silhouette).toEqual(state.silhouette);
      expect(nearby.player).not.toEqual(state.player);
    }
    for (const delta of [{ x: state.player.x + .4 }, { yaw: state.player.yaw + 15 }, { pitch: state.player.pitch + 15 }]) {
      expect(walk.silhouetteInspection({ ...state, player: { ...state.player, ...delta } })).toBeNull();
    }
  });
  it('rejects invalid inspection requests and does not enable distant or rear side views', () => {
    const state = seed(); expect(walk.inspectSilhouette(state, 'C', 'front')).toEqual(state); expect(walk.inspectSilhouette(state, 'A', 'back')).toEqual(state);
    expect(walk.silhouetteInspectionViews('C')).toEqual([]); expect(walk.silhouetteInspection(state)).toBeNull();
    for (const player of [{ x: 198.6, z: -6, yaw: 90, pitch: 0 }, { x: 198.6, z: 0, yaw: -90, pitch: 0 }, { x: 210, z: 0, yaw: 90, pitch: 0 }]) expect(walk.canObserveSilhouette(seed({ player }))).toBe(false);
    const other = seed({ activity: 'length' }); expect(walk.inspectSilhouette(other, 'A', 'side')).toEqual(other);
  });
  it('saves and recalls exact close-up viewpoints without resetting the puzzle set', () => {
    let state = walk.inspectSilhouette(seed({ silhouette: { set: 1, angle: 43 } }), 'B', 'side');
    state = walk.saveViewpoint(state, 'A'); const pose = state.player; state.player = walk.spawn('silhouette');
    const recalled = walk.recallViewpoint(JSON.parse(JSON.stringify(state)), 'A'); expect(recalled.player).toEqual(pose); expect(recalled.silhouette.set).toBe(1); expect(recalled.silhouette.angle).toBe(43);
  });
});

describe('new-set and inspection controls', () => {
  it('advances an earned set without losing its room completion and reports the current trial correctly', async () => {
    await mount({ silhouette: { completed: [0, 1] } }); await click('[data-walk-silhouette-set-next]');
    expect(latest.perceptionWalk.silhouette).toMatchObject({ set: 1, mastered: true, completed: [] }); expect(latest.perceptionWalk.progress.silhouette.solved).toBe(true);
    await click('[data-walk-silhouette-side]'); await click('[data-walk-silhouette-choice="B"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.silhouette.completed).toEqual([0]); expect(query('[data-walk-status]').textContent).toMatch(/next pair/i);
    expect(latest.otherTool.preserved).toBe(37);
  });
  it('marks a new-set reveal as assisted while preserving earlier mastery', async () => {
    await mount({ silhouette: { completed: [0, 1] } }); await click('[data-walk-silhouette-set-next]'); await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.progress.silhouette).toMatchObject({ solved: true, assisted: true });
    await click('[data-walk-silhouette-side]'); await click('[data-walk-silhouette-choice="B"]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.silhouette.completed).toEqual([]);
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.silhouette).toMatchObject({ set: 0, mastered: false }); expect(latest.perceptionWalk.progress.silhouette.solved).toBe(false);
  });
  it('inspects either candidate and returns to overview without changing an answer or orientation', async () => {
    await mount({ silhouette: { set: 1, angle: 31, choice: 'B' } }); const before = structuredClone(latest.perceptionWalk.silhouette);
    await click('[data-walk-silhouette-inspect="A"]'); await click('[data-walk-silhouette-view="side"]');
    expect(walk.silhouetteInspection(latest.perceptionWalk)).toMatchObject({ choice: 'A', side: 'side' });
    await click('[data-walk-silhouette-inspect="B"]'); expect(walk.silhouetteInspection(latest.perceptionWalk)).toMatchObject({ choice: 'B', side: 'side' });
    await click('[data-walk-silhouette-overview]'); expect(latest.perceptionWalk.player).toEqual(walk.spawn('silhouette')); expect(latest.perceptionWalk.silhouette).toEqual(before);
  });
  it('stops a live dial drag when entering inspection', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'silhouette-dial' }); await pointer('pointerdown', 100, 100); await pointer('pointermove', 130, 100);
    await click('[data-walk-silhouette-inspect="A"]'); const angle = latest.perceptionWalk.silhouette.angle;
    await pointer('pointermove', 190, 100); await pointer('pointerup', 190, 100); expect(latest.perceptionWalk.silhouette.angle).toBe(angle);
  });
  it('keeps close-up Plan geometry finite and responsive to orientation', async () => {
    await mount({ silhouette: { set: 1 } }); await act(async () => viewer.report('failed'));
    await click('[data-walk-silhouette-inspect="B"]'); await click('[data-walk-silhouette-view="side"]');
    const before = query('[data-walk-silhouette-plan]').innerHTML; expect(before).not.toMatch(/NaN|Infinity/);
    await click('[data-walk-silhouette-side]'); expect(query('[data-walk-silhouette-plan]').innerHTML).not.toBe(before); expect(query('[data-walk-silhouette-plan]').innerHTML).not.toMatch(/NaN|Infinity/);
  });
});

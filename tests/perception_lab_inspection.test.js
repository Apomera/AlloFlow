import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const query = selector => host.querySelector(selector);
const seed = patch => walk.normalize({ activity: 'rotation', player: walk.spawn('rotation'), ...patch });
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const keyboard = async key => act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));

async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
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
  host?.remove(); root = host = null; vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('rotation inspection viewpoints', () => {
  it('offers nine fresh, collision-free poses aimed at the corresponding sculpture', () => {
    const views = walk.rotationInspectionViews();
    expect(views).toHaveLength(9); expect(new Set(views.map(view => view.choice + '-' + view.side)).size).toBe(9);
    for (const view of views) {
      const x = 92.5 + ['R', 'A', 'B'].indexOf(view.choice) * 3.5, p = view.player;
      expect(['front', 'left', 'right']).toContain(view.side);
      expect(Math.hypot(p.x - x, p.z)).toBeCloseTo(3.8, 12);
      expect(p.yaw).toBeCloseTo(Math.atan2(x - p.x, p.z) * 180 / Math.PI, 10);
      expect(p.pitch).toBeCloseTo(Math.atan2(0.45, 3.8) * 180 / Math.PI, 10);
      expect(p.x).toBeGreaterThan(90); expect(p.x).toBeLessThan(103.3); expect(p.z).toBeGreaterThan(1.65); expect(p.z).toBeLessThan(4);
      expect(seed({ player: p }).player).toEqual(p);
    }
    views[0].player.x = -999; views[1].choice = 'invalid';
    expect(walk.rotationInspectionViews()[0].player.x).toBe(92.5); expect(walk.rotationInspectionViews()[1].choice).toBe('R');
  });

  it('changes only viewpoint and candidate selection, never answers, sculpture poses or progress', () => {
    const state = seed({ rotation: { round: 1, angles: [47, 208], tilts: [15, -20], selected: 1, choice: 'B', completed: [0, 1] },
      notes: { rotation: 'Keep this observation.', change: 'Keep the scene.' }, progress: { shadow: { solved: true } } });
    const original = structuredClone(state);
    for (const view of walk.rotationInspectionViews()) {
      const result = walk.inspectRotation(state, view.choice, view.side);
      expect(result.player).toEqual(view.player);
      expect(result.rotation).toEqual({ ...state.rotation, selected: view.choice === 'A' ? 0 : 1 });
      expect(result.progress).toEqual(state.progress); expect(result.notes).toEqual(state.notes); expect(result.change).toEqual(state.change);
      expect(result.progress.rotation).toMatchObject({ solved: true, assisted: false });
    }
    expect(state).toEqual(original);
  });

  it('rejects invalid targets and sides and leaves other activities unchanged', () => {
    const state = seed();
    for (const choice of ['', 'C', 'r', 0, null, {}, ['A']]) expect(walk.inspectRotation(state, choice, 'front')).toEqual(state);
    for (const side of ['', 'back', 'LEFT', 0, null, {}, ['left']]) expect(walk.inspectRotation(state, 'A', side)).toEqual(state);
    const other = seed({ activity: 'shadow' }); expect(walk.inspectRotation(other, 'A', 'front')).toEqual(other);
    expect(walk.rotationInspection(other)).toBeNull();
  });

  it('recognizes saved inspection poses but clears the selection after free walking or looking', () => {
    expect(walk.rotationInspection(seed())).toBeNull();
    for (const view of walk.rotationInspectionViews()) {
      const state = walk.inspectRotation(seed(), view.choice, view.side);
      expect(walk.rotationInspection(JSON.parse(JSON.stringify(state)))).toEqual(view);
      for (const key of ['x', 'z', 'yaw', 'pitch']) {
        const moved = { ...state, player: { ...state.player, [key]: state.player[key] + 0.01 } };
        expect(walk.rotationInspection(moved)).toBeNull();
      }
      const returned = walk.rotationInspection(state); returned.player.x = 0;
      expect(walk.rotationInspection(state)).toEqual(view);
    }
  });

  it('does not award a correct answer from a close-up outside the observation area', () => {
    for (const view of walk.rotationInspectionViews()) {
      const state = walk.inspectRotation(seed({ rotation: { choice: 'A' } }), view.choice, view.side);
      expect(walk.checkRotation(state).rotation.completed).toEqual([]);
      state.player = walk.spawn('rotation');
      expect(walk.checkRotation(state).rotation.completed).toEqual([0]);
    }
  });
});

describe('rotation inspection controls', () => {
  it('starts in overview with disabled side selectors, then focuses an inspection without changing the puzzle', async () => {
    await mount(); const before = structuredClone(latest);
    expect(query('[data-walk-rotation-inspection]')).toBeTruthy();
    for (const side of ['front', 'left', 'right']) expect(query('[data-walk-rotation-view="' + side + '"]').disabled).toBe(true);
    await click('[data-walk-rotation-inspect="R"]');
    expect(walk.rotationInspection(latest.perceptionWalk)).toMatchObject({ choice: 'R', side: 'front' });
    expect(document.activeElement).toBe(query('[data-walk-stage]'));
    expect(latest.perceptionWalk.rotation).toEqual(before.perceptionWalk.rotation);
    expect(latest.perceptionWalk.progress).toEqual(before.perceptionWalk.progress); expect(latest.otherTool).toEqual(before.otherTool);
    for (const control of ['yaw', 'tilt', 'left', 'right', 'up', 'down']) expect(query('[data-walk-rotation-' + control + ']').disabled).toBe(true);
    expect(host.querySelectorAll('[data-walk-rotation-piece]:checked')).toHaveLength(0);
  });

  it('retains the side when inspecting another object or selecting a candidate to turn', async () => {
    await mount(); await click('[data-walk-rotation-inspect="R"]'); await click('[data-walk-rotation-view="left"]');
    await click('[data-walk-rotation-inspect="A"]');
    expect(walk.rotationInspection(latest.perceptionWalk)).toMatchObject({ choice: 'A', side: 'left' });
    expect(latest.perceptionWalk.rotation.selected).toBe(0);
    expect(query('[data-walk-rotation-yaw]').disabled).toBe(false);
    await click('[data-walk-rotation-piece="1"]');
    expect(walk.rotationInspection(latest.perceptionWalk)).toMatchObject({ choice: 'B', side: 'left' });
    expect(latest.perceptionWalk.rotation.selected).toBe(1);
    await click('[data-walk-rotation-inspect="R"]'); await click('[data-walk-rotation-piece="0"]');
    expect(walk.rotationInspection(latest.perceptionWalk)).toMatchObject({ choice: 'A', side: 'left' });
  });

  it('returns to comparison with saved puzzle data and transfers keyboard focus to walking', async () => {
    await mount({ rotation: { choice: 'A', completed: [0], angles: [50, 120] }, notes: { rotation: 'My observation.' } });
    const before = structuredClone(latest.perceptionWalk);
    await click('[data-walk-rotation-inspect="R"]'); await click('[data-walk-rotation-view="right"]');
    await click('[data-walk-rotation-overview]');
    expect(latest.perceptionWalk).toEqual(before); expect(document.activeElement).toBe(query('[data-walk-stage]'));
    await keyboard('w'); expect(latest.perceptionWalk.player.z).toBeCloseTo(8.8, 10);
    await click('[data-walk-rotation-inspect="R"]'); await keyboard('ArrowLeft');
    expect(walk.rotationInspection(latest.perceptionWalk)).toBeNull(); expect(query('[data-walk-rotation-view="front"]').disabled).toBe(true);
  });

  it('preserves earned solves and assisted exploration across inspection and return', async () => {
    await mount({ rotation: { completed: [0, 1] }, progress: { shadow: { solved: true } }, notes: { rotation: 'Both pairs solved.' } });
    await click('[data-walk-reveal]'); const solved = structuredClone(latest.perceptionWalk.progress);
    await click('[data-walk-rotation-inspect="B"]'); await click('[data-walk-rotation-view="right"]'); await click('[data-walk-rotation-overview]');
    expect(latest.perceptionWalk.progress).toEqual(solved); expect(latest.perceptionWalk.progress.rotation).toMatchObject({ solved: true, assisted: false });
    expect(viewer.push.mock.calls.at(-1)[0].reveal).toBe(true);
    await click('[data-walk-reset]'); await click('[data-walk-reveal]'); const assisted = structuredClone(latest.perceptionWalk.progress);
    await click('[data-walk-rotation-inspect="A"]'); await click('[data-walk-rotation-overview]');
    expect(latest.perceptionWalk.progress).toEqual(assisted); expect(latest.perceptionWalk.notes.rotation).toBe('Both pairs solved.');
  });

  it('restores a persisted view and removes inspection-only restrictions in fallback', async () => {
    const saved = walk.inspectRotation(seed({ notes: { rotation: 'Saved side view.' } }), 'R', 'left');
    await mount(JSON.parse(JSON.stringify(saved)));
    expect(query('[data-walk-rotation-inspect="R"]').getAttribute('aria-pressed')).toBe('true');
    expect(query('[data-walk-rotation-view="left"]').getAttribute('aria-pressed')).toBe('true');
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-rotation-inspection]')).toBeNull();
    expect(query('[data-walk-rotation-yaw]').disabled).toBe(false); expect(latest.perceptionWalk.player).toEqual(saved.player);
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-rotation-inspection]')).toBeTruthy();
    await act(async () => viewer.report('failed')); expect(query('[data-walk-rotation-inspection]')).toBeNull();
    expect(query('[data-walk-rotation-yaw]').disabled).toBe(false); expect(latest.perceptionWalk.notes).toEqual(saved.notes);
  });
});

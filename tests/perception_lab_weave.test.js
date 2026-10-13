import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const seed = patch => walk.normalize({ activity: 'weave', player: walk.spawn('weave'), ...patch });
const defaults = (round = 0) => ({ round, depths: round ? [1.2, 0, -1.2] : [-1.2, 1.2, 0], selected: 0, seen: 0, completed: [] });
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const solution = round => round ? [0, -1, 1] : [1, 0, -1];
const measured = raw => walk.recordWeaveView(walk.inspectWeave(walk.recordWeaveView(walk.inspectWeave(raw, 'front')), 'right'));
const answer = raw => measured(solution(raw.weave.round).reduce((state, value, index) => walk.setWeaveDepth(state, index, value), raw));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

async function input(selector, value) {
  const node = query(selector); expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function pointer(type, x, y, pointerType = 'mouse') {
  const stage = query('[data-walk-stage]');
  stage.setPointerCapture ||= vi.fn(); stage.hasPointerCapture ||= () => true; stage.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } }); stage.dispatchEvent(event);
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
async function solveInUI(round) {
  for (const [index, depth] of solution(round).entries()) {
    await click(`[data-walk-weave-piece="${index}"]`); await input('[data-walk-weave-depth]', depth);
  }
  await click('[data-walk-weave-view="front"]'); await click('[data-walk-weave-record]');
  await click('[data-walk-weave-view="right"]'); await click('[data-walk-weave-record]');
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))();
  walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready',
      onStatusChange: fn => { report = fn; }, report: value => report(value), pick: vi.fn(() => null), weaveCoordinate: vi.fn(x => x / 100), onLayout: vi.fn() };
    return viewer;
  }) };
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = root = null; vi.useRealTimers(); vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('crossing-ribbon geometry', () => {
  it('moves three rigid crossing ribbons only along the depth axis', () => {
    const pairs = [
      [{ x: 153.5, y: 1.8 }, { x: 158.5, y: 1.8 }],
      [{ x: 153.7, y: 1.105 }, { x: 158.3, y: 4.095 }],
      [{ x: 153.7, y: 4.095 }, { x: 158.3, y: 1.105 }]
    ];
    for (const depths of [[-1.5, 0, 1.5], [1, 0, -1], [0, 0, 0]]) {
      const objects = walk.weaveObjects(depths);
      expect(objects).toHaveLength(3);
      objects.forEach((object, index) => {
        expect(object).toMatchObject({ id: `weave-${'ABC'[index]}`, index, choice: 'ABC'[index], depth: depths[index] });
        expect(object.from).toEqual({ ...pairs[index][0], z: depths[index] });
        expect(object.to).toEqual({ ...pairs[index][1], z: depths[index] });
        expect(distance(object.from, object.to)).toBeCloseTo(index ? Math.hypot(4.6, 2.99) : 5, 10);
      });
    }
  });

  it('keeps all three pairwise crossings within the physical spans without coincident triple junctions', () => {
    const objects = walk.weaveObjects([0, 0, 0]), crossings = [];
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const a = objects[i], b = objects[j];
      const u = { x: a.to.x - a.from.x, y: a.to.y - a.from.y }, v = { x: b.to.x - b.from.x, y: b.to.y - b.from.y };
      const d = { x: b.from.x - a.from.x, y: b.from.y - a.from.y }, det = u.x * v.y - u.y * v.x;
      expect(Math.abs(det)).toBeGreaterThan(0);
      const t = (d.x * v.y - d.y * v.x) / det, s = (d.x * u.y - d.y * u.x) / det;
      expect(t).toBeGreaterThan(0); expect(t).toBeLessThan(1); expect(s).toBeGreaterThan(0); expect(s).toBeLessThan(1);
      crossings.push({ x: a.from.x + t * u.x, y: a.from.y + t * u.y, z: 0 });
    }
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(distance(crossings[i], crossings[j])).toBeGreaterThan(1);
  });

  it('returns fresh layouts and target orders for two different front-to-back arrangements', () => {
    expect(walk.weaveOrder(0)).toEqual(['A', 'B', 'C']); expect(walk.weaveOrder(1)).toEqual(['C', 'A', 'B']);
    expect(walk.weaveDefaults(0)).toEqual({ depths: [-1.2, 1.2, 0], selected: 0 });
    expect(walk.weaveDefaults(1)).toEqual({ depths: [1.2, 0, -1.2], selected: 0 });
    const depths = [1, 0, -1], before = [...depths], objects = walk.weaveObjects(depths);
    objects[0].from.x = 999; objects[0].to.z = 999; objects[0].depth = 999;
    const order = walk.weaveOrder(0); order.reverse();
    const initial = walk.weaveDefaults(0); initial.depths[0] = 999;
    expect(depths).toEqual(before); expect(walk.weaveObjects(depths)[0].from.x).toBe(153.5);
    expect(walk.weaveObjects(depths)[0].to.z).toBe(1); expect(walk.weaveOrder(0)).toEqual(['A', 'B', 'C']);
    expect(walk.weaveDefaults(0).depths).toEqual([-1.2, 1.2, 0]);
  });
});

describe('crossing-ribbon observation and scoring', () => {
  it('migrates older saves without disturbing existing achievements, position or notes', () => {
    const old = { activity: 'frame', player: walk.spawn('frame'), frame: { completed: [0, 1] }, notes: { frame: 'Compare the surround.' } };
    const before = structuredClone(old), state = walk.normalize(old);
    expect(state.weave).toEqual(defaults()); expect(state.notes.weave).toBe('');
    expect(state.progress.weave).toEqual({ solved: false, assisted: false, hints: 0 }); expect(state.progress.frame.solved).toBe(true);
    expect(state.notes.frame).toBe(old.notes.frame); expect(state.player).toEqual(old.player); expect(old).toEqual(before);
    expect(walk.normalize(state)).toEqual(state);
    expect(seed({ progress: { weave: { solved: true } } }).progress.weave.solved).toBe(false);
    expect(seed({ weave: { completed: [0, 1] }, progress: { weave: { assisted: true } } }).progress.weave.solved).toBe(false);
  });

  it('normalizes malformed depths, selection, observation flags and round completions without mutation', () => {
    const raw = { weave: { round: 9, depths: [-999, Infinity, 999, 5], selected: 99, seen: 99, completed: [-1, 0, 0, 1, 2, 0.5, '1', null] } };
    const before = structuredClone(raw), state = seed(raw);
    expect(state.weave).toEqual({ round: 1, depths: [-1.5, 0, 1.5], selected: 2, seen: 3, completed: [0, 1] });
    expect(state.progress.weave.solved).toBe(true); expect(raw).toEqual(before);
    for (const weave of [null, [], { round: 'bad', depths: 'bad', selected: NaN, seen: NaN, completed: 'bad' }]) expect(seed({ weave }).weave).toEqual(defaults());
    expect(seed({ weave: { round: -1, selected: -9, seen: -9 } }).weave).toEqual(defaults());
    expect(seed({ weave: { round: 1, depths: [NaN] } }).weave).toEqual(defaults(1));
  });

  it('gates manipulation to the active bay and facing direction', () => {
    expect(walk.canManipulateWeave(seed())).toBe(true);
    for (const patch of [{ activity: 'frame' }, { player: { x: 150.7, z: 9, yaw: 0, pitch: 0 } },
      { player: { x: 161.3, z: 9, yaw: 0, pitch: 0 } }, { player: { x: 156, z: 12.1, yaw: 0, pitch: 0 } },
      { player: { x: 156, z: 9, yaw: 180, pitch: 0 } }, { player: { x: 156, z: 9, yaw: 0, pitch: 20 } }]) {
      const state = seed(patch); expect(walk.canManipulateWeave(state)).toBe(false);
      expect(walk.setWeaveDepth(state, 0, 1)).toEqual(state); expect(walk.selectWeave(state, 1)).toEqual(state);
      expect(walk.recordWeaveView(state)).toEqual(state); expect(walk.weaveMatches(state)).toBe(false);
    }
    for (const x of [150.8, 156, 161.2]) for (const z of [3, 12]) {
      const state = seed({ player: { x, z, yaw: Math.atan2(156 - x, z) * 180 / Math.PI, pitch: 0 } });
      expect(walk.canManipulateWeave(state)).toBe(true);
    }
  });

  it('changes one depth at a time, clamps live input and preserves unrelated state', () => {
    const initial = seed({ frame: { completed: [0, 1] }, notes: { weave: 'Depth order changes the crossing.' } }), before = structuredClone(initial);
    const adjusted = walk.setWeaveDepth(initial, 2, 0.9);
    expect(adjusted.weave).toEqual({ ...defaults(), depths: [-1.2, 1.2, 0.9], selected: 2 });
    expect(adjusted.player).toEqual(initial.player); expect(adjusted.progress).toEqual(initial.progress);
    expect(adjusted.frame).toEqual(initial.frame); expect(adjusted.notes).toEqual(initial.notes);
    expect(walk.setWeaveDepth(initial, 0, 99).weave.depths[0]).toBe(1.5);
    expect(walk.setWeaveDepth(initial, 0, -99).weave.depths[0]).toBe(-1.5);
    for (const value of [null, '', 'bad', NaN, Infinity]) expect(walk.setWeaveDepth(initial, 0, value)).toEqual(initial);
    for (const index of [-1, 3, 0.5, null, NaN, Infinity, '1']) {
      expect(walk.setWeaveDepth(initial, index, 1)).toEqual(initial); expect(walk.selectWeave(initial, index)).toEqual(initial);
    }
    expect(initial).toEqual(before);
  });

  it('offers front and two side viewpoints without counting navigation as observation', () => {
    const initial = seed(), views = walk.weaveInspectionViews(); expect(views.map(view => view.side)).toEqual(['front', 'left', 'right']);
    for (const view of views) {
      const inspected = walk.inspectWeave(initial, view.side); expect(inspected.player).toEqual(view.player);
      expect(inspected.weave).toEqual(initial.weave); expect(walk.canManipulateWeave(inspected)).toBe(true);
      expect(walk.weaveView(inspected)).toBe(view.side === 'front' ? 'front' : 'side');
      expect(walk.recordWeaveView(inspected).weave.seen).toBe(view.side === 'front' ? 1 : 2);
    }
    for (const key of ['x', 'z', 'yaw', 'pitch']) expect(views[0].player[key]).toBeCloseTo(walk.spawn('weave')[key], 10);
    expect(views[1].player.x).toBeCloseTo(151.6); expect(views[2].player.x).toBeCloseTo(160.4);
    expect(views[1].player.z).toBe(5.5); expect(views[2].player.z).toBe(5.5);
    expect(walk.inspectWeave(initial, 'bad')).toEqual(initial);
    const other = seed({ activity: 'frame' }); expect(walk.inspectWeave(other, 'left')).toEqual(other);
    views[0].player.x = 999; expect(walk.weaveInspectionViews()[0].player.x).toBe(156);
  });

  it('records front and side evidence once and rejects intermediate or wrongly faced observations', () => {
    const initial = seed(), front = walk.recordWeaveView(initial); expect(front.weave.seen).toBe(1);
    expect(walk.recordWeaveView(front)).toEqual(front);
    const side = walk.recordWeaveView(walk.inspectWeave(initial, 'left')); expect(side.weave.seen).toBe(2);
    const combined = walk.recordWeaveView(walk.inspectWeave(side, 'front')); expect(combined.weave.seen).toBe(3);
    for (const player of [{ x: 158, z: 9, yaw: -12, pitch: 0 }, { x: 156, z: 6, yaw: 0, pitch: 0 },
      { x: 160.4, z: 9, yaw: -26, pitch: 0 }, { x: 156, z: 9, yaw: 180, pitch: 0 }]) {
      const state = seed({ player }); expect(walk.weaveView(state)).toBe(''); expect(walk.recordWeaveView(state).weave.seen).toBe(0);
    }
  });

  it('invalidates both observations only after an actual geometry change', () => {
    const observed = measured(seed()), before = structuredClone(observed); expect(observed.weave.seen).toBe(3);
    const selected = walk.selectWeave(observed, 2); expect(selected.weave).toEqual({ ...observed.weave, selected: 2 });
    const unchanged = walk.setWeaveDepth(observed, 1, observed.weave.depths[1]); expect(unchanged.weave.seen).toBe(3); expect(unchanged.weave.selected).toBe(1);
    expect(walk.setWeaveDepth(observed, 1, 0.9).weave.seen).toBe(0);
    const clamped = measured(seed({ weave: { depths: [1.5, 0, -1.5] } }));
    expect(walk.setWeaveDepth(clamped, 0, 9).weave.seen).toBe(3);
    expect(observed).toEqual(before);
  });

  it('requires both recorded views of the current layout, not just correct depths', () => {
    const correct = seed({ weave: { depths: solution(0) } });
    expect(walk.weaveMatches(correct)).toBe(false); expect(walk.checkWeave(correct).weave.completed).toEqual([]);
    const front = walk.recordWeaveView(correct); expect(walk.weaveMatches(front)).toBe(false);
    const side = walk.recordWeaveView(walk.inspectWeave(correct, 'left')); expect(walk.weaveMatches(side)).toBe(false);
    const both = measured(correct); expect(walk.weaveMatches(both)).toBe(true);
    const shifted = walk.setWeaveDepth(both, 0, 1.2); expect(walk.weaveMatches(shifted)).toBe(false);
    expect(walk.weaveMatches(measured(shifted))).toBe(true);
    expect(walk.weaveMatches({ ...both, player: { ...both.player, yaw: 180 } })).toBe(false);
  });

  it('accepts any correctly spaced order, including the inclusive gap threshold in each round', () => {
    for (const round of [0, 1]) for (const front of [0.55, 0.8, 1.5]) {
      const order = walk.weaveOrder(round), depths = [0, 0, 0];
      order.forEach((choice, index) => { depths['ABC'.indexOf(choice)] = front - index * 0.55; });
      expect(walk.weaveMatches(seed({ weave: { round, depths, seen: 3 } }))).toBe(true);
    }
    for (const round of [0, 1]) {
      const correct = solution(round); expect(walk.weaveMatches(seed({ weave: { round, depths: correct, seen: 3 } }))).toBe(true);
      expect(walk.weaveMatches(seed({ weave: { round, depths: [0, 0, 0], seen: 3 } }))).toBe(false);
      expect(walk.weaveMatches(seed({ weave: { round, depths: solution(1 - round), seen: 3 } }))).toBe(false);
      const order = walk.weaveOrder(round), tight = [...correct]; tight['ABC'.indexOf(order[0])] = tight['ABC'.indexOf(order[1])] + 0.549;
      expect(walk.weaveMatches(seed({ weave: { round, depths: tight, seen: 3 } }))).toBe(false);
    }
  });

  it('scores each round once, resets the layout and evidence, and retains earned replay credit', () => {
    const first = walk.checkWeave(answer(seed())); expect(first.weave.completed).toEqual([0]); expect(first.progress.weave.solved).toBe(false);
    expect(walk.checkWeave(first)).toEqual(first); expect(walk.checkAnswer(first)).toBe(false);
    const second = walk.nextWeave(first); expect(second.weave).toEqual({ ...defaults(1), completed: [0] });
    const completed = walk.checkWeave(answer(second)); expect(completed.weave.completed).toEqual([0, 1]);
    expect(completed.progress.weave.solved).toBe(true); expect(walk.checkAnswer(completed)).toBe(true);
    const replay = walk.nextWeave(completed); expect(replay.weave).toEqual({ ...defaults(), completed: [0, 1] }); expect(replay.progress.weave.solved).toBe(true);
  });

  it('blocks unearned progression and permits assisted practice without assigning new scores', () => {
    const initial = seed(); expect(walk.nextWeave(initial)).toEqual(initial);
    const correct = answer(initial); expect(walk.nextWeave(correct)).toEqual(correct);
    const assisted = { ...correct, progress: { ...correct.progress, weave: { solved: false, assisted: true, hints: 0 } } };
    expect(walk.checkWeave(assisted).weave.completed).toEqual([]);
    const next = walk.nextWeave(assisted); expect(next.weave).toEqual(defaults(1)); expect(next.progress.weave).toEqual(assisted.progress.weave);
    const other = seed({ activity: 'frame', weave: { completed: [0, 1] } }); expect(walk.nextWeave(other)).toEqual(other);
  });
});

describe('crossing-ribbon interactive controls', () => {
  it('selects and drags physical beams and rails while preserving evidence until geometry changes', async () => {
    await mount({ weave: { depths: [0, 0, 0], seen: 3 } }); viewer.pick.mockReturnValue({ id: 'weave-B' });
    await pointer('pointerdown', 100, 100); expect(latest.perceptionWalk.weave.selected).toBe(1); expect(latest.perceptionWalk.weave.seen).toBe(3);
    await pointer('pointermove', 140, 100); await pointer('pointerup', 140, 100);
    expect(latest.perceptionWalk.weave.depths).toEqual([0, 0.6, 0]); expect(latest.perceptionWalk.weave.seen).toBe(0);
    viewer.pick.mockReturnValue({ id: 'weave-rail-2' }); await pointer('pointerdown', 100, 100);
    await pointer('pointermove', 160, 100); await pointer('pointerup', 160, 100);
    expect(latest.perceptionWalk.weave.depths[2]).toBeCloseTo(0.6); expect(latest.perceptionWalk.weave.selected).toBe(2);
    expect(viewer.weaveCoordinate).toHaveBeenCalled();
    const before = structuredClone(latest.perceptionWalk.weave); await pointer('pointerdown', 100, 100);
    await pointer('pointercancel', 100, 100); await pointer('pointermove', 200, 100); expect(latest.perceptionWalk.weave).toEqual(before);
  });

  it('leaves vertical touch gestures to scrolling without moving the selected beam or camera', async () => {
    await mount({ weave: { depths: [0, 0, 0], seen: 3 } }); viewer.pick.mockReturnValue({ id: 'weave-A' });
    const before = structuredClone(latest.perceptionWalk); await pointer('pointerdown', 100, 100, 'touch');
    await pointer('pointermove', 104, 145, 'touch'); await pointer('pointerup', 104, 145, 'touch');
    expect(latest.perceptionWalk.weave).toEqual(before.weave); expect(latest.perceptionWalk.player).toEqual(before.player);
  });

  it('exposes selection, a native depth slider, reversible steps and two complete scored rounds', async () => {
    await mount(); expect(query('[data-walk-weave-next]').disabled).toBe(true); expect(query('[data-walk-weave-depth]').type).toBe('range');
    await click('[data-walk-weave-piece="1"]'); expect(latest.perceptionWalk.weave.selected).toBe(1);
    const before = latest.perceptionWalk.weave.depths[1]; await click('[data-walk-weave-far]');
    expect(latest.perceptionWalk.weave.depths[1]).toBeLessThan(before); await click('[data-walk-weave-near]'); expect(latest.perceptionWalk.weave.depths[1]).toBeCloseTo(before);
    for (const round of [0, 1]) {
      await solveInUI(round); await click('[data-walk-check]'); expect(latest.perceptionWalk.weave.completed).toContain(round);
      if (round === 0) await click('[data-walk-weave-next]');
    }
    expect(latest.perceptionWalk.progress.weave).toMatchObject({ solved: true, assisted: false }); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('does not automatically record navigation and clears recorded views after changing a ribbon', async () => {
    await mount(); await click('[data-walk-weave-view="left"]'); expect(latest.perceptionWalk.weave.seen).toBe(0);
    await click('[data-walk-weave-record]'); expect(latest.perceptionWalk.weave.seen).toBe(2);
    await click('[data-walk-weave-view="front"]'); expect(latest.perceptionWalk.weave.seen).toBe(2);
    await click('[data-walk-weave-record]'); expect(latest.perceptionWalk.weave.seen).toBe(3);
    await click('[data-walk-weave-piece="2"]'); expect(latest.perceptionWalk.weave.seen).toBe(3);
    await input('[data-walk-weave-depth]', 1); expect(latest.perceptionWalk.weave.seen).toBe(0);
    await click('[data-walk-check]'); expect(latest.perceptionWalk.weave.completed).toEqual([]);
  });

  it('keeps visible geometry and all manual controls functional in Plan and failed WebGL', async () => {
    await mount(); await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-weave-plan]')).toBeTruthy();
    const before = query('[data-walk-weave-plan]').innerHTML; await input('[data-walk-weave-depth]', 1);
    expect(query('[data-walk-weave-plan]').innerHTML).not.toBe(before);
    await solveInUI(0); await click('[data-walk-check]'); expect(latest.perceptionWalk.weave.completed).toEqual([0]);
    await click('[data-walk-weave-next]'); await click('[data-walk-diagram-toggle]'); await act(async () => viewer.report('failed'));
    expect(query('[data-walk-weave-plan]')).toBeTruthy(); await solveInUI(1); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.weave.solved).toBe(true);
  });

  it.each([0, 1])('frames fallback labels and geometry from all viewpoints at extreme depths in round %s', async round => {
    await mount({ weave: { round } }); await click('[data-walk-diagram-toggle]');
    for (const depths of [[-1.5, 1.5, 0], [1.5, 0, -1.5]]) {
      for (const [index, depth] of depths.entries()) {
        await click(`[data-walk-weave-piece="${index}"]`); await input('[data-walk-weave-depth]', depth);
      }
      for (const reveal of [false, true]) {
        if (reveal) await click('[data-walk-reveal]');
        for (const side of ['front', 'left', 'right']) {
          await click(`[data-walk-weave-view="${side}"]`);
          const plan = query('[data-walk-weave-plan]'), labels = [...plan.querySelectorAll('text')];
          expect(labels.map(label => label.textContent).sort()).toEqual(['A', 'B', 'C']);
          for (const label of labels) {
            const x = Number(label.getAttribute('x')), y = Number(label.getAttribute('y'));
            expect(x).toBeGreaterThanOrEqual(20); expect(x).toBeLessThanOrEqual(780);
            expect(y).toBeGreaterThanOrEqual(42); expect(y).toBeLessThanOrEqual(590);
          }
          const lines = [...plan.querySelectorAll('line')]; expect(lines.length).toBeGreaterThanOrEqual(6);
          for (const line of lines) for (const end of ['1', '2']) {
            const x = Number(line.getAttribute('x' + end)), y = Number(line.getAttribute('y' + end));
            expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(800);
            expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(600);
          }
          expect(!!query('[data-walk-weave-guides]')).toBe(reveal);
        }
        if (reveal) await click('[data-walk-reveal]');
      }
    }
  });

  it('preserves earned reveals and resets only this puzzle while keeping written observations', async () => {
    await mount({ weave: { completed: [0, 1], depths: [1, 0, -1], seen: 3 }, frame: { completed: [0, 1] }, notes: { weave: 'The nearer ribbon hides the crossing.' } });
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.weave).toMatchObject({ solved: true, assisted: false });
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.weave).toEqual(defaults());
    expect(latest.perceptionWalk.notes.weave).toBe('The nearer ribbon hides the crossing.'); expect(latest.perceptionWalk.progress.frame.solved).toBe(true);
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-weave-guides]')).toBeNull();
    await click('[data-walk-reveal]'); expect(query('[data-walk-weave-guides]')).toBeTruthy();
    expect(latest.perceptionWalk.progress.weave).toMatchObject({ solved: false, assisted: true });
    await solveInUI(0); await click('[data-walk-check]'); expect(latest.perceptionWalk.weave.completed).toEqual([]);
    await click('[data-walk-weave-next]'); expect(latest.perceptionWalk.weave.round).toBe(1); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('retains depth settings, inspection evidence and notes across room visits without autonomous movement', async () => {
    await mount({ notes: { weave: 'Look from the side.' }, frame: { adjustment: -17, surround: -15, visible: false, seen: 3 } });
    await input('[data-walk-weave-depth]', 0.8); await click('[data-walk-weave-record]');
    const before = structuredClone(latest.perceptionWalk.weave);
    vi.useFakeTimers(); await act(async () => vi.advanceTimersByTime(1000)); expect(latest.perceptionWalk.weave).toEqual(before); vi.useRealTimers();
    await click('[data-walk-activity="frame"]'); expect(latest.perceptionWalk.frame).toMatchObject({ adjustment: -17, surround: -15, visible: false, seen: 3 });
    await click('[data-walk-activity="weave"]'); expect(latest.perceptionWalk.weave).toEqual(before);
    expect(latest.perceptionWalk.notes.weave).toBe('Look from the side.'); expect(latest.perceptionWalk.player).toEqual(walk.spawn('weave'));
  });
});

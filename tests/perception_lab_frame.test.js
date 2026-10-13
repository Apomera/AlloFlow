import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const seed = patch => walk.normalize({ activity: 'frame', player: walk.spawn('frame'), ...patch });
const defaults = (round = 0) => ({ round, adjustment: 0, surround: round ? -22 : 22, visible: true, seen: 1, completed: [] });
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const answer = state => walk.setFrameAdjustment(walk.setFrameVisible(state, false), state.frame.round ? 24 : -18);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

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
  host?.remove(); host = root = null; vi.useRealTimers(); vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('rod-and-frame geometry', () => {
  it('uses physical rod angles and a rigid square in both alignment rounds', () => {
    for (const round of [0, 1]) for (const adjustment of [-45, -18, 0, 24, 45]) for (const surround of [-30, 0, 30]) {
      const objects = walk.frameObjects(round, adjustment, surround), { center, rod, corners } = objects;
      expect(center).toEqual({ x: 144, y: 2.6, z: 0 }); expect(corners).toHaveLength(4);
      expect(objects.angle).toBe((round ? 66 : 18) + adjustment);
      expect(distance(rod.from, rod.to)).toBeCloseTo(2.9, 10);
      expect((rod.from.x + rod.to.x) / 2).toBeCloseTo(center.x, 10);
      expect((rod.from.y + rod.to.y) / 2).toBeCloseTo(center.y, 10);
      expect(rod.from.z).toBe(0.15); expect(rod.to.z).toBe(0.15);
      const radians = objects.angle * Math.PI / 180, vector = { x: rod.to.x - rod.from.x, y: rod.to.y - rod.from.y };
      expect(Math.abs(vector.x * Math.cos(radians) - vector.y * Math.sin(radians))).toBeLessThan(1e-10);
      for (let index = 0; index < 4; index++) {
        expect(distance(corners[index], center)).toBeCloseTo(Math.SQRT2 * 1.8, 10);
        expect(distance(corners[index], corners[(index + 1) % 4])).toBeCloseTo(3.6, 10);
        expect(corners[index].z).toBe(0); expect(corners[index].y).toBeGreaterThan(0);
      }
    }
  });

  it('changes the surrounding reference independently of the rod and returns independent geometry', () => {
    const first = walk.frameObjects(0, -18, 22), rotated = walk.frameObjects(0, -18, -22);
    expect(first.rod).toEqual(rotated.rod); expect(first.angle).toBe(0); expect(first.corners).not.toEqual(rotated.corners);
    const adjusted = walk.frameObjects(0, 20, 22);
    expect(adjusted.corners).toEqual(first.corners); expect(adjusted.rod).not.toEqual(first.rod);
    const surround = 22 * Math.PI / 180;
    for (const x of [-1.8, 1.8]) for (const y of [-1.8, 1.8]) {
      const expected = { x: 144 + x * Math.cos(surround) + y * Math.sin(surround), y: 2.6 - x * Math.sin(surround) + y * Math.cos(surround), z: 0 };
      expect(first.corners.some(point => distance(point, expected) < 1e-10)).toBe(true);
    }
    first.center.x = 999; first.rod.from.y = 999; first.corners[0].z = 999;
    expect(walk.frameObjects(0, -18, 22).center.x).toBe(144);
    expect(walk.frameObjects(0, -18, 22).rod.from.y).not.toBe(999);
    expect(walk.frameObjects(0, -18, 22).corners[0].z).toBe(0);
  });

  it('offers reachable vertical and horizontal solutions without aligning to the tilted surround', () => {
    const vertical = walk.frameObjects(0, -18, 22), horizontal = walk.frameObjects(1, 24, -22);
    expect(vertical.rod.from.x).toBeCloseTo(vertical.rod.to.x, 10);
    expect(horizontal.rod.from.y).toBeCloseTo(horizontal.rod.to.y, 10);
    expect(vertical.angle).toBe(0); expect(horizontal.angle).toBe(90);
    expect(walk.frameObjects(0, 0, 22).rod.from.x).not.toBeCloseTo(walk.frameObjects(0, 0, 22).rod.to.x, 3);
    expect(walk.frameObjects(1, 0, -22).rod.from.y).not.toBeCloseTo(walk.frameObjects(1, 0, -22).rod.to.y, 3);
  });
});

describe('rod-and-frame observations and scoring', () => {
  it('migrates older saves with isolated defaults and preserves previous achievements and notes', () => {
    const old = { activity: 'motion', player: walk.spawn('motion'), motion: { completed: [0, 1] }, notes: { motion: 'Shared movement.' } };
    const before = structuredClone(old), state = walk.normalize(old);
    expect(state.frame).toEqual(defaults()); expect(walk.frameDefaults(0)).toEqual({ adjustment: 0, surround: 22 }); expect(walk.frameDefaults(1)).toEqual({ adjustment: 0, surround: -22 });
    expect(state.progress.frame).toEqual({ solved: false, assisted: false, hints: 0 }); expect(state.notes.frame).toBe('');
    expect(state.progress.motion.solved).toBe(true); expect(state.notes.motion).toBe(old.notes.motion); expect(state.player).toEqual(old.player);
    expect(old).toEqual(before); expect(walk.normalize(state)).toEqual(state);
    expect(seed({ progress: { frame: { solved: true } } }).progress.frame.solved).toBe(false);
    expect(seed({ frame: { completed: [0, 1] }, progress: { frame: { assisted: true } } }).progress.frame.solved).toBe(false);
    const mutable = walk.frameDefaults(0); mutable.adjustment = 999; expect(walk.frameDefaults(0)).toEqual({ adjustment: 0, surround: 22 });
  });

  it('bounds malformed values, deduplicates completions and records the currently visible reference', () => {
    const raw = { frame: { round: 8, adjustment: -999, surround: 999, visible: false, seen: 1, completed: [-1, 0, 0, 1, 2, 0.5, '1', null] } };
    const before = structuredClone(raw), state = seed(raw);
    expect(state.frame).toEqual({ round: 1, adjustment: -45, surround: 30, visible: false, seen: 3, completed: [0, 1] });
    expect(state.progress.frame.solved).toBe(true); expect(raw).toEqual(before);
    for (const frame of [null, [], { round: 'bad', adjustment: Infinity, surround: NaN, seen: NaN, completed: 'bad' }]) expect(seed({ frame }).frame).toEqual(defaults());
    expect(seed({ frame: { round: 1, adjustment: 999, surround: -999, seen: 999 } }).frame).toEqual({ ...defaults(1), adjustment: 45, surround: -30, seen: 3 });
    expect(seed({ frame: { round: -1, visible: true, seen: 2 } }).frame.seen).toBe(3);
    expect(seed({ frame: { visible: false, seen: 2 } }).frame.seen).toBe(2);
    expect(seed({ frame: { seen: -9 } }).frame.seen).toBe(1);
  });

  it('gates all manipulations to the active observation area and facing direction', () => {
    expect(walk.canObserveFrame(seed())).toBe(true);
    for (const patch of [{ activity: 'motion' }, { player: { x: 139.9, z: 9, yaw: 0, pitch: 0 } }, { player: { x: 148.1, z: 9, yaw: 0, pitch: 0 } },
      { player: { x: 144, z: 3.9, yaw: 0, pitch: 0 } }, { player: { x: 144, z: 12.1, yaw: 0, pitch: 0 } },
      { player: { x: 144, z: 9, yaw: 180, pitch: 0 } }, { player: { x: 144, z: 9, yaw: 0, pitch: 20 } }]) {
      const state = seed(patch);
      expect(walk.canObserveFrame(state)).toBe(false); expect(walk.setFrameAdjustment(state, -18)).toEqual(state);
      expect(walk.setFrameSurround(state, -20)).toEqual(state); expect(walk.setFrameVisible(state, false)).toEqual(state);
    }
    for (const x of [140, 144, 148]) for (const z of [4, 12]) {
      const state = seed({ player: { x, z, yaw: Math.atan2(144 - x, z) * 180 / Math.PI, pitch: 0 } });
      expect(walk.canObserveFrame(state)).toBe(true);
    }
  });

  it('adjusts independently without mutation and ignores invalid live input', () => {
    const state = seed({ motion: { completed: [0, 1] }, notes: { frame: 'Compare reference frames.' } }), before = structuredClone(state);
    const adjusted = walk.setFrameAdjustment(state, -18), surrounded = walk.setFrameSurround(state, -22), hidden = walk.setFrameVisible(state, false);
    expect(adjusted.frame).toEqual({ ...defaults(), adjustment: -18 });
    expect(surrounded.frame).toEqual({ ...defaults(), surround: -22 });
    expect(hidden.frame).toEqual({ ...defaults(), visible: false, seen: 3 });
    for (const result of [adjusted, surrounded, hidden]) {
      expect(result.player).toEqual(state.player); expect(result.progress).toEqual(state.progress);
      expect(result.notes).toEqual(state.notes); expect(result.motion).toEqual(state.motion);
    }
    for (const value of [null, '', 'bad', Infinity, NaN]) {
      expect(walk.setFrameAdjustment(state, value)).toEqual(state); expect(walk.setFrameSurround(state, value)).toEqual(state);
    }
    for (const value of [null, '', 'false', 0, 1, {}]) expect(walk.setFrameVisible(state, value)).toEqual(state);
    expect(walk.setFrameAdjustment(state, 999).frame.adjustment).toBe(45); expect(walk.setFrameAdjustment(state, -999).frame.adjustment).toBe(-45);
    expect(walk.setFrameSurround(state, 999).frame.surround).toBe(30); expect(walk.setFrameSurround(state, -999).frame.surround).toBe(-30);
    expect(state).toEqual(before);
  });

  it('requires comparison with and without the frame, not simply a correct guess', () => {
    const guessed = walk.setFrameAdjustment(seed(), -18);
    expect(walk.frameMatches(guessed)).toBe(false); expect(walk.checkFrame(guessed).frame.completed).toEqual([]);
    const hiddenOnly = seed({ frame: { adjustment: -18, visible: false, seen: 2 } });
    expect(walk.frameMatches(hiddenOnly)).toBe(false);
    const observed = walk.setFrameVisible(hiddenOnly, true);
    expect(observed.frame.seen).toBe(3); expect(walk.frameMatches(observed)).toBe(true);
    const hiddenAgain = walk.setFrameVisible(observed, false);
    expect(hiddenAgain.frame.seen).toBe(3); expect(walk.frameMatches(hiddenAgain)).toBe(true);
    expect(walk.frameMatches({ ...hiddenAgain, player: { ...hiddenAgain.player, yaw: 180 } })).toBe(false);
  });

  it('accepts the inclusive two-degree alignment tolerance for both tasks independently of surround angle', () => {
    for (const round of [0, 1]) for (const surround of [-30, -22, 0, 22, 30]) {
      const target = round ? 24 : -18;
      for (const error of [-2, 0, 2]) expect(walk.frameMatches(seed({ frame: { round, adjustment: target + error, surround, seen: 3 } }))).toBe(true);
      for (const error of [-2.001, 2.001, -10, 10]) expect(walk.frameMatches(seed({ frame: { round, adjustment: target + error, surround, seen: 3 } }))).toBe(false);
    }
  });

  it('awards each round once, resets comparison evidence, and retains earned replay progress', () => {
    const initial = seed(), first = walk.checkFrame(answer(initial));
    expect(first.frame.completed).toEqual([0]); expect(first.progress.frame.solved).toBe(false); expect(walk.checkFrame(first)).toEqual(first);
    expect(walk.checkAnswer(first)).toBe(false);
    const next = walk.nextFrame(first);
    expect(next.frame).toEqual({ ...defaults(1), completed: [0] }); expect(next.player).toEqual(initial.player);
    const completed = walk.checkFrame(answer(next)); expect(completed.frame.completed).toEqual([0, 1]); expect(completed.progress.frame.solved).toBe(true);
    expect(walk.checkAnswer(completed)).toBe(true);
    const replay = walk.nextFrame(completed); expect(replay.frame).toEqual({ ...defaults(), completed: [0, 1] }); expect(replay.progress.frame.solved).toBe(true);
  });

  it('blocks unearned progression while permitting assisted exploration without scores', () => {
    const initial = seed(); expect(walk.nextFrame(initial)).toEqual(initial);
    const correct = answer(initial); expect(walk.nextFrame(correct)).toEqual(correct);
    const assisted = { ...correct, progress: { ...correct.progress, frame: { solved: false, assisted: true, hints: 0 } } };
    expect(walk.checkFrame(assisted).frame.completed).toEqual([]);
    const second = walk.nextFrame(assisted); expect(second.frame).toEqual(defaults(1)); expect(second.progress.frame).toEqual(assisted.progress.frame);
    const other = seed({ activity: 'motion', frame: { completed: [0, 1] } }); expect(walk.nextFrame(other)).toEqual(other);
  });
});

describe('rod-and-frame interactive controls', () => {
  it('exposes reversible steps and native sliders and completes both independently scored rounds', async () => {
    await mount(); expect(query('[data-walk-frame-next]').disabled).toBe(true);
    expect(query('[data-walk-frame-adjustment]').type).toBe('range'); expect(query('[data-walk-frame-surround]').type).toBe('range');
    await click('[data-walk-frame-left]'); expect(latest.perceptionWalk.frame.adjustment).toBeLessThan(0);
    await click('[data-walk-frame-right]'); expect(latest.perceptionWalk.frame.adjustment).toBe(0);
    for (const round of [0, 1]) {
      await input('[data-walk-frame-adjustment]', round ? 24 : -18);
      await click('[data-walk-check]'); expect(latest.perceptionWalk.frame.completed).not.toContain(round);
      await click('[data-walk-frame-visible]'); expect(latest.perceptionWalk.frame.visible).toBe(false);
      await click('[data-walk-check]'); expect(latest.perceptionWalk.frame.completed).toContain(round);
      if (round === 0) await click('[data-walk-frame-next]');
    }
    expect(latest.perceptionWalk.progress.frame).toMatchObject({ solved: true, assisted: false }); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('keeps surrounding-frame rotation independent and does not automatically animate', async () => {
    await mount(); vi.useFakeTimers();
    const initial = structuredClone(latest.perceptionWalk.frame);
    await act(async () => vi.advanceTimersByTime(1000)); expect(latest.perceptionWalk.frame).toEqual(initial);
    await input('[data-walk-frame-surround]', -30);
    expect(latest.perceptionWalk.frame).toEqual({ ...initial, surround: -30 });
    await input('[data-walk-frame-adjustment]', 7);
    expect(latest.perceptionWalk.frame).toEqual({ ...initial, surround: -30, adjustment: 7 });
  });

  it('keeps manual controls and visible geometry working in Plan and failed WebGL', async () => {
    await mount(); await click('[data-walk-diagram-toggle]');
    expect(query('[data-walk-frame-plan]')).toBeTruthy();
    const before = query('[data-walk-frame-plan]').innerHTML; await input('[data-walk-frame-adjustment]', -18);
    expect(query('[data-walk-frame-plan]').innerHTML).not.toBe(before);
    await click('[data-walk-frame-visible]'); expect(latest.perceptionWalk.frame.visible).toBe(false);
    await click('[data-walk-check]'); expect(latest.perceptionWalk.frame.completed).toEqual([0]);
    await click('[data-walk-frame-next]'); await click('[data-walk-diagram-toggle]'); await act(async () => viewer.report('failed'));
    expect(query('[data-walk-frame-plan]')).toBeTruthy();
    await input('[data-walk-frame-adjustment]', 24); await click('[data-walk-frame-visible]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.frame.solved).toBe(true);
  });

  it('preserves earned solves on reveal and resets only this room while retaining notes', async () => {
    await mount({ frame: { completed: [0, 1], adjustment: 10 }, motion: { completed: [0, 1] }, notes: { frame: 'The surround tilted my reference.' } });
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.frame).toMatchObject({ solved: true, assisted: false });
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.frame).toEqual(defaults());
    expect(latest.perceptionWalk.notes.frame).toBe('The surround tilted my reference.'); expect(latest.perceptionWalk.progress.motion.solved).toBe(true);
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-frame-guides]')).toBeNull(); await click('[data-walk-reveal]');
    expect(query('[data-walk-frame-guides]')).toBeTruthy(); expect(latest.perceptionWalk.progress.frame).toMatchObject({ solved: false, assisted: true });
    await input('[data-walk-frame-adjustment]', -18); await click('[data-walk-frame-visible]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.frame.completed).toEqual([]); await click('[data-walk-frame-next]'); expect(latest.perceptionWalk.frame.round).toBe(1);
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('retains independent adjustments, comparison evidence and notes when visiting another room', async () => {
    await mount({ notes: { frame: 'Compare without the border.' }, motion: { phase: 90, selected: ['A'] } });
    await input('[data-walk-frame-adjustment]', -17); await input('[data-walk-frame-surround]', -15); await click('[data-walk-frame-visible]');
    const before = structuredClone(latest.perceptionWalk.frame);
    await click('[data-walk-activity="motion"]'); expect(latest.perceptionWalk.motion).toMatchObject({ phase: 90, selected: ['A'] });
    await click('[data-walk-activity="frame"]'); expect(latest.perceptionWalk.frame).toEqual(before);
    expect(latest.perceptionWalk.notes.frame).toBe('Compare without the border.'); expect(latest.perceptionWalk.player).toEqual(walk.spawn('frame'));
  });
});

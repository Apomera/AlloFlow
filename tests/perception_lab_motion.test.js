import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const choices = ['A', 'B', 'C', 'D', 'E', 'F'];
let walk, host, root, latest, viewer, media, mediaListeners;
const seed = patch => walk.normalize({ activity: 'motion', player: walk.spawn('motion'), ...patch });
const defaults = () => ({ round: 0, phase: 0, seen: 1, selected: [], completed: [] });
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const observe = state => walk.setMotionPhase(walk.setMotionPhase(state, 90), 180);
const answer = state => walk.motionTargets(state.motion.round).reduce((result, choice) => walk.toggleMotion(result, choice), observe(state));

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
async function tick(milliseconds = 300) { await act(async () => { vi.advanceTimersByTime(milliseconds); }); }
async function setReducedMotion(matches) {
  await act(async () => { media.matches = matches; mediaListeners.forEach(listener => listener({ matches })); });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  mediaListeners = new Set();
  media = { matches: false, media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((type, listener) => mediaListeners.add(listener)), removeEventListener: vi.fn((type, listener) => mediaListeners.delete(listener)),
    addListener: vi.fn(listener => mediaListeners.add(listener)), removeListener: vi.fn(listener => mediaListeners.delete(listener)) };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
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
  host?.remove(); host = root = null; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('common-fate motion geometry', () => {
  it('starts both patterns with the same six equally sized spheres and no positional answer cue', () => {
    const first = walk.motionObjects(0, 0), second = walk.motionObjects(1, 0);
    expect(first.map(({ offset, ...item }) => item)).toEqual(second.map(({ offset, ...item }) => item));
    expect(first.map(item => item.id)).toEqual(choices.map(choice => 'motion-' + choice));
    expect(first.map(item => item.choice)).toEqual(choices);
    expect(first.map(item => [item.x, item.y, item.z])).toEqual([[129, 3.15, 0], [132, 3.15, 0], [135, 3.15, 0], [129, 1.4, 0], [132, 1.4, 0], [135, 1.4, 0]]);
    for (const item of [...first, ...second]) { expect(item.radius).toBe(0.27); for (const axis of ['x', 'y', 'z']) expect(item.offset[axis]).toBeCloseTo(0, 12); expect(item.base).toEqual({ x: item.x, y: item.y, z: item.z }); }
    expect(walk.motionTargets(0)).toEqual(['A', 'C', 'E']); expect(walk.motionTargets(1)).toEqual(['B', 'D', 'F']);
  });

  it('has exactly one shared trajectory of three spheres throughout a complete cycle', () => {
    for (const round of [0, 1]) {
      const targets = walk.motionTargets(round), trajectories = Object.fromEntries(choices.map(choice => [choice, []]));
      for (let phase = 0; phase < 360; phase += 15) {
        const objects = walk.motionObjects(round, phase), targetObjects = objects.filter(item => targets.includes(item.choice));
        for (const item of objects) {
          trajectories[item.choice].push(item.offset);
          for (const axis of ['x', 'y', 'z']) { expect(Number.isFinite(item[axis])).toBe(true); expect(item[axis]).toBeCloseTo(item.base[axis] + item.offset[axis], 12); }
        }
        for (const item of targetObjects) expect(item.offset).toEqual(targetObjects[0].offset);
        for (let i = 0; i < targetObjects.length; i++) for (let j = i + 1; j < targetObjects.length; j++) {
          const a = targetObjects[i], b = targetObjects[j];
          expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeCloseTo(Math.hypot(a.base.x - b.base.x, a.base.y - b.base.y, a.base.z - b.base.z), 12);
        }
      }
      const groups = new Map();
      for (const choice of choices) { const key = JSON.stringify(trajectories[choice]); groups.set(key, [...(groups.get(key) || []), choice]); }
      expect([...groups.values()].map(group => group.length).sort()).toEqual([1, 1, 1, 3]);
      expect([...groups.values()].find(group => group.length === 3)).toEqual(targets);
      expect(trajectories[targets[0]].some(offset => Math.hypot(offset.x, offset.y, offset.z) > 0.1)).toBe(true);
      expect(walk.motionObjects(round, 360)).toEqual(walk.motionObjects(round, 0));
      expect(walk.motionObjects(round, -45)).toEqual(walk.motionObjects(round, 315));
    }
  });

  it('keeps the spheres separate and returns independent geometry and target arrays', () => {
    for (const round of [0, 1]) for (let phase = 0; phase < 360; phase += 5) {
      const objects = walk.motionObjects(round, phase);
      for (let i = 0; i < objects.length; i++) for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i], b = objects[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(a.radius + b.radius);
      }
    }
    const objects = walk.motionObjects(0, 0), targets = walk.motionTargets(0);
    objects[0].base.x = 999; objects[1].offset.y = 999; objects[2].radius = 99; targets[0] = 'F';
    expect(walk.motionObjects(0, 0)[0].base.x).toBe(129); expect(walk.motionObjects(0, 0)[1].offset.y).toBe(0);
    expect(walk.motionObjects(0, 0)[2].radius).toBe(0.27); expect(walk.motionTargets(0)).toEqual(['A', 'C', 'E']);
  });
});

describe('common-fate observations and scoring', () => {
  it('migrates earlier saves and normalizes independent motion progress without mutation', () => {
    const old = { activity: 'shape', player: walk.spawn('shape'), shape: { completed: [0, 1] }, notes: { shape: 'The tilted circle.' } };
    const before = structuredClone(old), state = walk.normalize(old);
    expect(state.motion).toEqual(defaults()); expect(state.progress.motion).toEqual({ solved: false, assisted: false, hints: 0 }); expect(state.notes.motion).toBe('');
    expect(state.progress.shape.solved).toBe(true); expect(state.notes.shape).toBe(old.notes.shape); expect(state.player).toEqual(old.player);
    expect(old).toEqual(before); expect(walk.normalize(state)).toEqual(state);
    expect(seed({ progress: { motion: { solved: true } } }).progress.motion.solved).toBe(false);
    expect(seed({ motion: { completed: [0, 1] }, progress: { motion: { assisted: true } } }).progress.motion.solved).toBe(false);
  });

  it('bounds and deduplicates malformed saved phase, observation masks and choices', () => {
    const raw = { motion: { round: 9, phase: -45, seen: 99, selected: ['A', 'A', 'bad', 'F', 'B', 'E'], completed: [-1, 0, 0, 1, 2, 0.5, '1', null] } };
    const before = structuredClone(raw), state = seed(raw);
    expect(state.motion).toEqual({ round: 1, phase: 315, seen: 15, selected: ['A', 'F', 'B'], completed: [0, 1] });
    expect(state.progress.motion.solved).toBe(true); expect(raw).toEqual(before);
    for (const motion of [null, [], { phase: Infinity, round: 'bad', seen: NaN, selected: 'A', completed: 'bad' }]) expect(seed({ motion }).motion).toEqual(defaults());
    expect(seed({ motion: { phase: 765, seen: -5, round: -3 } }).motion).toEqual({ ...defaults(), phase: 45 });
    expect(seed({ motion: { seen: 6.9 } }).motion.seen).toBe(6);
  });

  it('counts each separated observation once with inclusive quarter-phase boundaries', () => {
    const initial = seed(); expect(walk.observedMotion(initial)).toBe(1);
    for (const phase of [0, 22.5, 45, 67.499, 337.5, 359]) expect(walk.setMotionPhase(initial, phase).motion.seen).toBe(1);
    for (const [start, end, mask] of [[67.5, 112.5, 3], [157.5, 202.5, 5], [247.5, 292.5, 9]]) {
      for (const phase of [start, (start + end) / 2, end]) expect(walk.setMotionPhase(initial, phase).motion.seen).toBe(mask);
    }
    const observed = walk.setMotionPhase(observe(initial), -90);
    expect(observed.motion.seen).toBe(15); expect(walk.observedMotion(observed)).toBe(4); expect(observed.motion.phase).toBe(270);
    expect(walk.setMotionPhase(observed, 630).motion.seen).toBe(15);
    for (const mask of [1, 2, 4, 8]) expect(walk.observedMotion(seed({ motion: { seen: mask } }))).toBe(1);
    for (const mask of [3, 5, 6, 9, 10, 12]) expect(walk.observedMotion(seed({ motion: { seen: mask } }))).toBe(2);
  });

  it('records and selects only while facing the active room from its observation area', () => {
    expect(walk.canObserveMotion(seed())).toBe(true);
    for (const patch of [{ activity: 'shape' }, { player: { x: 127.9, z: 9, yaw: 0, pitch: 0 } }, { player: { x: 136.1, z: 9, yaw: 0, pitch: 0 } },
      { player: { x: 132, z: 3.9, yaw: 0, pitch: 0 } }, { player: { x: 132, z: 12.1, yaw: 0, pitch: 0 } },
      { player: { x: 132, z: 9, yaw: 180, pitch: 0 } }, { player: { x: 132, z: 9, yaw: 0, pitch: 20 } }]) {
      const state = seed(patch);
      expect(walk.canObserveMotion(state)).toBe(false); expect(walk.setMotionPhase(state, 90)).toEqual(state); expect(walk.toggleMotion(state, 'A')).toEqual(state);
    }
    for (const x of [128, 132, 136]) for (const z of [4, 12]) {
      const state = seed({ player: { x, z, yaw: Math.atan2(132 - x, z) * 180 / Math.PI, pitch: 0 } });
      expect(walk.canObserveMotion(state)).toBe(true);
    }
  });

  it('changes phase without mutating camera, selected answers, notes or sibling work', () => {
    const state = seed({ motion: { selected: ['B'] }, shape: { completed: [0, 1] }, notes: { motion: 'Watch the spacing.' } }), before = structuredClone(state);
    const result = walk.setMotionPhase(state, 450);
    expect(result.motion).toEqual({ ...state.motion, phase: 90, seen: 3 }); expect(result.player).toEqual(state.player);
    expect(result.notes).toEqual(state.notes); expect(result.progress).toEqual(state.progress); expect(result.shape).toEqual(state.shape);
    for (const value of [null, '', 'bad', Infinity, NaN]) expect(walk.setMotionPhase(state, value)).toEqual(state);
    expect(state).toEqual(before);
  });

  it('allows up to three distinct choices and permits deselection without changing observations', () => {
    const initial = observe(seed()), before = structuredClone(initial);
    const selected = ['A', 'B', 'C'].reduce((state, choice) => walk.toggleMotion(state, choice), initial);
    expect(selected.motion.selected).toEqual(['A', 'B', 'C']); expect(walk.toggleMotion(selected, 'D')).toEqual(selected);
    const changed = walk.toggleMotion(walk.toggleMotion(selected, 'B'), 'F');
    expect(changed.motion.selected).toEqual(['A', 'C', 'F']); expect(changed.motion.seen).toBe(initial.motion.seen);
    for (const choice of ['', 'a', 'G', null, 1, {}, ['A']]) expect(walk.toggleMotion(initial, choice)).toEqual(initial);
    expect(initial).toEqual(before);
  });

  it('requires three observed phases and exactly the correct group before scoring', () => {
    const correct = answer(seed()); expect(walk.motionMatches(correct)).toBe(true); expect(walk.checkAnswer(correct)).toBe(false);
    for (const selected of [[], ['A'], ['A', 'C'], ['A', 'B', 'C'], ['B', 'D', 'F']]) {
      const state = seed({ motion: { seen: 15, selected } }); expect(walk.motionMatches(state)).toBe(false); expect(walk.checkMotion(state).motion.completed).toEqual([]);
    }
    for (const seen of [1, 3, 5, 9]) expect(walk.checkMotion(seed({ motion: { selected: ['A', 'C', 'E'], seen } })).motion.completed).toEqual([]);
    expect(walk.motionMatches(seed({ motion: { selected: ['E', 'A', 'C'], seen: 11 } }))).toBe(true);
    expect(walk.checkMotion({ ...correct, player: { ...correct.player, yaw: 180 } }).motion.completed).toEqual([]);
  });

  it('awards each pattern once, resets observations for the second pattern and preserves earned replay', () => {
    const initial = seed(), first = walk.checkMotion(answer(initial));
    expect(first.motion.completed).toEqual([0]); expect(first.progress.motion.solved).toBe(false); expect(walk.checkMotion(first)).toEqual(first);
    const next = walk.nextMotion(first);
    expect(next.motion).toEqual({ ...defaults(), round: 1, completed: [0] }); expect(next.player).toEqual(initial.player);
    const completed = walk.checkMotion(answer(next)); expect(completed.motion.completed).toEqual([0, 1]); expect(completed.progress.motion.solved).toBe(true); expect(walk.checkAnswer(completed)).toBe(true);
    const replay = walk.nextMotion(completed); expect(replay.motion).toEqual({ ...defaults(), completed: [0, 1] }); expect(replay.progress.motion.solved).toBe(true);
  });

  it('gates unearned progression and permits assisted exploration without awarding progress', () => {
    const initial = seed(); expect(walk.nextMotion(initial)).toEqual(initial);
    const correct = answer(initial); expect(walk.nextMotion(correct)).toEqual(correct);
    const assisted = { ...correct, progress: { ...correct.progress, motion: { solved: false, assisted: true, hints: 0 } } };
    expect(walk.checkMotion(assisted).motion.completed).toEqual([]);
    const second = walk.nextMotion(assisted); expect(second.motion.round).toBe(1); expect(second.motion.completed).toEqual([]); expect(second.progress.motion).toEqual(assisted.progress.motion);
    const other = seed({ activity: 'shape', motion: { completed: [0, 1] } }); expect(walk.nextMotion(other)).toEqual(other);
  });
});

describe('common-fate interactive controls', () => {
  it('steps and scrubs motion and completes both independently scored patterns', async () => {
    await mount(); expect(query('[data-walk-motion-next]').disabled).toBe(true);
    await click('[data-walk-motion-forward]'); expect(latest.perceptionWalk.motion.phase).toBe(45);
    await click('[data-walk-motion-back]'); expect(latest.perceptionWalk.motion.phase).toBe(0);
    for (const round of [0, 1]) {
      for (const choice of walk.motionTargets(round)) await click('[data-walk-motion-choice="' + choice + '"]');
      await click('[data-walk-check]'); expect(latest.perceptionWalk.motion.completed).not.toContain(round);
      await input('[data-walk-motion-phase]', 90); await input('[data-walk-motion-phase]', 180);
      await click('[data-walk-check]'); expect(latest.perceptionWalk.motion.completed).toContain(round);
      if (round === 0) await click('[data-walk-motion-next]');
    }
    expect(latest.perceptionWalk.progress.motion).toMatchObject({ solved: true, assisted: false }); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('keeps the manual phase and selection controls usable in Plan and failed WebGL', async () => {
    await mount(); await click('[data-walk-diagram-toggle]');
    expect(query('[data-walk-motion-plan]')).toBeTruthy(); expect(query('[data-walk-motion-play]').disabled).toBe(true);
    const before = query('[data-walk-motion-plan]').innerHTML; await input('[data-walk-motion-phase]', 90);
    expect(query('[data-walk-motion-plan]').innerHTML).not.toBe(before); await click('[data-walk-motion-choice="A"]');
    expect(query('[data-walk-motion-choice="A"]').checked).toBe(true);
    await click('[data-walk-diagram-toggle]'); await act(async () => viewer.report('failed'));
    expect(query('[data-walk-motion-plan]')).toBeTruthy(); expect(query('[data-walk-motion-play]').disabled).toBe(true);
    await input('[data-walk-motion-phase]', 180); await click('[data-walk-motion-choice="C"]'); await click('[data-walk-motion-choice="E"]');
    await click('[data-walk-check]'); expect(latest.perceptionWalk.motion.completed).toEqual([0]);
  });

  it('preserves earned solves on reveal and resets only this puzzle while retaining notes', async () => {
    await mount({ motion: { completed: [0, 1], selected: ['A'] }, shape: { completed: [0, 1] }, notes: { motion: 'The spacing stays fixed.' } });
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.motion).toMatchObject({ solved: true, assisted: false });
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.motion).toEqual(defaults());
    expect(latest.perceptionWalk.notes.motion).toBe('The spacing stays fixed.'); expect(latest.perceptionWalk.progress.shape.solved).toBe(true);
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-motion-links]')).toBeNull(); await click('[data-walk-reveal]');
    expect(query('[data-walk-motion-links]')).toBeTruthy(); expect(latest.perceptionWalk.progress.motion).toMatchObject({ solved: false, assisted: true });
    await input('[data-walk-motion-phase]', 90); await input('[data-walk-motion-phase]', 180);
    for (const choice of ['A', 'C', 'E']) await click('[data-walk-motion-choice="' + choice + '"]');
    await click('[data-walk-check]'); expect(latest.perceptionWalk.motion.completed).toEqual([]);
    await click('[data-walk-motion-next]'); expect(latest.perceptionWalk.motion.round).toBe(1); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('never starts playback automatically and pauses on command or manual scrubbing', async () => {
    await mount(); vi.useFakeTimers(); await tick(); expect(latest.perceptionWalk.motion.phase).toBe(0);
    await click('[data-walk-motion-play]'); await tick(); expect(latest.perceptionWalk.motion.phase).toBeCloseTo(13.5);
    expect(latest.perceptionWalk.motion).not.toHaveProperty('playing');
    await click('[data-walk-motion-play]'); const paused = latest.perceptionWalk.motion.phase; await tick(); expect(latest.perceptionWalk.motion.phase).toBe(paused);
    await click('[data-walk-motion-play]'); await input('[data-walk-motion-phase]', 90); await tick(); expect(latest.perceptionWalk.motion.phase).toBe(90);
  });

  it('stops playback on lost focus, activity changes and unavailable rendering', async () => {
    await mount(); vi.useFakeTimers();
    await click('[data-walk-motion-play]'); await tick(); await act(async () => window.dispatchEvent(new Event('blur')));
    const blurred = latest.perceptionWalk.motion.phase; await tick(); expect(latest.perceptionWalk.motion.phase).toBe(blurred);
    await click('[data-walk-motion-play]'); await tick(); await click('[data-walk-activity="shape"]');
    const away = latest.perceptionWalk.motion.phase; await tick(); expect(latest.perceptionWalk.motion.phase).toBe(away);
    await click('[data-walk-activity="motion"]'); await tick(); expect(latest.perceptionWalk.motion.phase).toBe(away);
    await click('[data-walk-motion-play]'); await tick(); await act(async () => viewer.report('failed'));
    const failed = latest.perceptionWalk.motion.phase; await tick(); expect(latest.perceptionWalk.motion.phase).toBe(failed);
    expect(query('[data-walk-motion-play]').disabled).toBe(true);
  });

  it('honors reduced motion at startup and when the preference changes, with manual alternatives', async () => {
    media.matches = true; await mount(); vi.useFakeTimers();
    expect(query('[data-walk-motion-play]').disabled).toBe(true); await tick(); expect(latest.perceptionWalk.motion.phase).toBe(0);
    await click('[data-walk-motion-forward]'); expect(latest.perceptionWalk.motion.phase).toBe(45);
    await setReducedMotion(false); expect(query('[data-walk-motion-play]').disabled).toBe(false);
    await click('[data-walk-motion-play]'); await tick(); expect(latest.perceptionWalk.motion.phase).toBeGreaterThan(45);
    await setReducedMotion(true); const stopped = latest.perceptionWalk.motion.phase; await tick(); expect(latest.perceptionWalk.motion.phase).toBe(stopped);
    expect(query('[data-walk-motion-play]').disabled).toBe(true); await input('[data-walk-motion-phase]', 90); expect(latest.perceptionWalk.motion.phase).toBe(90);
    await act(async () => root.unmount()); root = null; expect(mediaListeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
});

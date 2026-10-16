import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, scene, host, root, latest, replace, viewers;
const choices = ['C', 'A', 'B'];
const samples = () => [{ x: 24, z: 9, yaw: 0, pitch: 0 }, { x: 22.8, z: 9, yaw: 0, pitch: 0 }];
const seed = patch => walk.normalize({ activity: 'parallax', player: walk.spawn('parallax'), ...patch });
const ready = (round, patch = {}) => seed({ parallax: { round, choice: choices[round], samples: samples() }, ...patch });
const query = selector => host.querySelector(selector);
const click = async selector => {
  const node = query(selector); expect(node).toBeTruthy();
  await act(async () => node.click());
};
async function mount(patch = {}, strict = false) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } });
    latest = data; replace = setData;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  const component = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, component) : component));
}
async function moveTo(player) {
  await act(async () => replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, player } })));
}
async function pointer(type, x, y) {
  const node = query('[data-walk-stage]');
  node.setPointerCapture ||= vi.fn(); node.hasPointerCapture ||= () => true; node.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } });
    node.dispatchEvent(event);
  });
}
const sphereProjection = () => [...query('[data-walk-parallax-plan]').querySelectorAll('circle')].map(node => ['cx', 'cy', 'r'].map(key => node.getAttribute(key)));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  for (const file of ['stem_lab/perception_walk.js', 'stem_lab/perception_walk_scene.js']) new Function(readFileSync(resolve(file), 'utf8'))();
  walk = window.StemLab.PerceptionWalk; scene = window.StemLab.PerceptionWalkScene; viewers = [];
  scene.createViewer = vi.fn(() => {
    let report = () => {};
    const viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready',
      onStatusChange: fn => { report = fn; }, report: value => report(value), onLayout: vi.fn(), pick: vi.fn(() => null) };
    viewers.push(viewer); return viewer;
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('first-person parallax arrangements', () => {
  it.each([0, 1, 2])('keeps equal projected sizes but changes the nearest and fastest-shifting sphere in round %s', round => {
    const objects = walk.parallaxObjects(round), original = structuredClone(objects);
    expect(objects.map(item => item.id)).toEqual(['parallax-A', 'parallax-B', 'parallax-C']);
    expect(objects.map(item => item.choice)).toEqual(['A', 'B', 'C']);
    expect(objects.map(item => item.x)).toEqual(round === 2 ? [21.6, 24, 28.3] : [22.4, 24, 25.8]);
    expect(objects.map(item => item.z)).toEqual([[1, -3, 4], [4, -3, 1], [1, 4, -3]][round]);
    objects.forEach(item => { expect(item.y).toBe(1.65); expect(item.radius / (9 - item.z)).toBeCloseTo(.07, 12); });
    const shifts = objects.map(item => ({ choice: item.choice, shift: Math.abs((item.x - 24) / (9 - item.z) - (item.x - 22.8) / (9 - item.z)) }));
    shifts.sort((a, b) => b.shift - a.shift);
    expect(shifts[0].choice).toBe(choices[round]); expect(shifts[0].shift).toBeGreaterThan(shifts[1].shift);
    expect(walk.parallaxTarget(round)).toBe(choices[round]); expect(scene.parallaxObjects(round)).toEqual(objects);
    objects[0].radius = 999; objects[1].z = 999; expect(walk.parallaxObjects(round)).toEqual(original);
  });

  it.each([0, 1, 2])('keeps all round %s sphere silhouettes separated across the observation area', round => {
    const objects = walk.parallaxObjects(round);
    for (let x = 22.8; x <= 25.40001; x += .2) for (let z = 8.5; z <= 11.00001; z += .25) {
      const silhouettes = objects.map(item => {
        const dx = item.x - x, depth = z - item.z;
        const center = Math.atan2(dx, depth), radius = Math.asin(item.radius / Math.hypot(dx, depth));
        return { left: center - radius, right: center + radius };
      }).sort((a, b) => a.left - b.left);
      expect(silhouettes[0].right).toBeLessThan(silhouettes[1].left);
      expect(silhouettes[1].right).toBeLessThan(silhouettes[2].left);
      expect(silhouettes[0].left).toBeGreaterThan(-40 * Math.PI / 180);
      expect(silhouettes[2].right).toBeLessThan(40 * Math.PI / 180);
    }
  });

  it('preserves the original round-zero objects and default helper behavior', () => {
    expect(walk.parallaxObjects()).toEqual(walk.parallaxObjects(0));
    expect(scene.parallaxObjects()).toEqual(walk.parallaxObjects(0));
    expect(walk.parallaxObjects()[0].radius).toBe(.56);
    const player = { x: 24, z: 5, yaw: 0, pitch: 0 };
    expect(walk.movePlayer(player, 'forward', 2, -1)).toEqual(walk.movePlayer(player, 'forward', 2, -1, 0));
  });

  it('normalizes unique bounded completion, retains legacy records and isolates caller arrays', () => {
    const rawSamples = samples(), completed = [2, 0, 2, 1, -1, 3, null, '1', .5];
    const state = seed({ parallax: { round: 99, completed, choice: 'B', samples: rawSamples } });
    expect(state.parallax).toEqual({ round: 2, completed: [0, 1, 2], choice: 'B', samples: rawSamples });
    expect(state.progress.parallax.solved).toBe(true); expect(walk.normalize(state)).toEqual(state);
    completed.length = 0; rawSamples[0].x = 999; expect(state.parallax.completed).toEqual([0, 1, 2]); expect(state.parallax.samples[0].x).toBe(24);
    for (const parallax of [null, [], 'bad', {}, { round: Infinity, completed: {} }, { round: 'bad', completed: '012' }]) {
      expect(seed({ parallax }).parallax).toEqual({ round: 0, completed: [], choice: '', samples: [] });
    }
    expect(seed({ parallax: { round: '2' } }).parallax.round).toBe(2);
    expect(seed({ parallax: { round: -3 } }).parallax.round).toBe(0);
    expect(seed({ parallax: { round: 1.9 } }).parallax.round).toBe(1);
  });

  it('migrates independent old saves without treating explicit new trial data as credit', () => {
    const progress = { parallax: { solved: true } };
    expect(seed({ progress }).parallax.completed).toEqual([0]);
    const old = { choice: 'C', samples: samples() };
    const migrated = seed({ parallax: old, progress });
    expect(migrated.parallax).toEqual({ ...old, round: 0, completed: [0] });
    expect(walk.normalize(migrated)).toEqual(migrated);
    expect(seed({ parallax: old, progress: { parallax: { solved: true, assisted: true } } }).parallax.completed).toEqual([]);
    for (const parallax of [{ round: 1 }, { completed: [] }, { round: 0, completed: [] }]) {
      const state = seed({ parallax, progress });
      expect(state.parallax.completed).toEqual([]); expect(state.progress.parallax.solved).toBe(true);
      expect(walk.nextParallax(state)).toEqual(state);
    }
  });

  it.each([0, 1, 2])('awards only the evidence-backed current nearest choice in round %s', round => {
    const state = ready(round), before = structuredClone(state);
    expect(walk.checkAnswer(state)).toBe(true);
    const solved = walk.checkParallax(state);
    expect(solved.parallax.completed).toEqual([round]); expect(solved.progress.parallax.solved).toBe(true);
    expect(walk.checkParallax(solved).parallax.completed).toEqual([round]); expect(state).toEqual(before);
    for (const choice of ['', 'A', 'B', 'C'].filter(value => value !== choices[round])) {
      const wrong = seed({ parallax: { ...state.parallax, choice } });
      expect(walk.checkAnswer(wrong)).toBe(false); expect(walk.checkParallax(wrong).parallax.completed).toEqual([]);
    }
    for (const evidence of [[], samples().slice(0, 1), [{ x: 24, z: 9 }, { x: 24.5, z: 9 }], [{ x: 24, z: 9 }, { x: 22.8, z: 9.5 }]]) {
      const missing = seed({ parallax: { round, choice: choices[round], samples: evidence } });
      expect(walk.checkAnswer(missing)).toBe(false); expect(walk.checkParallax(missing).parallax.completed).toEqual([]);
    }
    const assisted = ready(round, { progress: { parallax: { assisted: true } } });
    expect(walk.checkAnswer(assisted)).toBe(true); expect(walk.checkParallax(assisted).parallax.completed).toEqual([]);
    expect(walk.checkParallax(assisted).progress.parallax.solved).toBe(false);
  });

  it('never substitutes earlier credit for the current answer or new evidence', () => {
    const prior = ready(1, { parallax: { round: 1, completed: [0], choice: 'C', samples: samples() } });
    expect(prior.progress.parallax.solved).toBe(true); expect(walk.checkAnswer(prior)).toBe(false);
    expect(walk.checkParallax(prior).parallax.completed).toEqual([0]); expect(walk.nextParallax(prior)).toEqual(prior);
    const withoutEvidence = seed({ parallax: { round: 1, completed: [0, 1], choice: 'A', samples: [] } });
    expect(walk.checkAnswer(withoutEvidence)).toBe(false); expect(walk.checkParallax(withoutEvidence).parallax.completed).toEqual([0, 1]);
    const assisted = ready(1, { parallax: { round: 1, completed: [0], choice: 'A', samples: samples() }, progress: { parallax: { assisted: true } } });
    expect(walk.checkParallax(assisted).parallax.completed).toEqual([0]); expect(walk.checkParallax(assisted).progress.parallax.solved).toBe(true);
  });

  it('cycles earned or assisted arrangements with fresh observations and preserves unrelated work', () => {
    let state = seed({ notes: { parallax: 'Sideways motion reveals depth.' }, viewpoints: { parallax: { A: { x: 22.8, z: 9, yaw: 0, pitch: 0 } } }, progress: { ring: { solved: true } } });
    expect(walk.nextParallax(state)).toEqual(state);
    for (let round = 0; round < 3; round++) {
      state = walk.checkParallax({ ...state, parallax: { ...state.parallax, choice: choices[round], samples: samples() } });
      const before = structuredClone(state), next = walk.nextParallax(state);
      expect(next.parallax).toEqual({ round: (round + 1) % 3, completed: Array.from({ length: round + 1 }, (_, i) => i), samples: [], choice: '' });
      expect(next.player).toEqual(walk.spawn('parallax')); expect(next.progress.parallax).toEqual({ solved: true, assisted: false, hints: 0 });
      expect(next.notes).toEqual(state.notes); expect(next.viewpoints).toEqual(state.viewpoints); expect(next.progress.ring).toEqual(state.progress.ring);
      expect(state).toEqual(before); state = next;
    }
    const assisted = ready(2, { progress: { parallax: { assisted: true, hints: 2 } } });
    const next = walk.nextParallax(assisted);
    expect(next.parallax).toEqual({ round: 0, completed: [], samples: [], choice: '' });
    expect(next.progress.parallax).toEqual({ solved: false, assisted: false, hints: 0 });
  });

  it('requires the active room for trial checks, recording and advancement', () => {
    const state = ready(1, { activity: 'ring', progress: { parallax: { assisted: true } } });
    expect(walk.checkParallax(state)).toEqual(state); expect(walk.nextParallax(state)).toEqual(state);
    expect(walk.recordView(state)).toEqual(state);
  });

  it.each([0, 1, 2])('records only separated same-depth straight-ahead observations in round %s', round => {
    const start = seed({ parallax: { round }, player: { x: 24, z: 9, yaw: 35, pitch: -15 } });
    const first = walk.recordView(start);
    expect(first.parallax.samples).toEqual([{ x: 24, z: 9, yaw: 0, pitch: 0 }]);
    expect(first.player).toEqual(first.parallax.samples[0]); expect(first.parallax.round).toBe(round);
    for (const player of [{ x: 24.5, z: 9 }, { x: 22.8, z: 9.5 }, { x: 26, z: 9 }, { x: 22.8, z: 8 }]) {
      expect(walk.recordView({ ...first, player }).parallax.samples).toEqual(first.parallax.samples);
    }
    const second = walk.recordView({ ...first, player: { x: 22.8, z: 9, yaw: 80, pitch: 10 } });
    expect(second.parallax.samples).toEqual(samples());
    expect(walk.recordView({ ...second, player: { x: 25.4, z: 9 } }).parallax.samples).toEqual(samples());
    expect(start.parallax.samples).toEqual([]);
  });

  it.each([0, 1, 2])('uses the round %s sphere bounds for imported players and movement', round => {
    for (const item of walk.parallaxObjects(round)) {
      const clearance = item.radius + .3;
      const recovered = seed({ parallax: { round }, player: { x: item.x, z: item.z, yaw: 0, pitch: 0 } }).player;
      expect(Math.hypot(recovered.x - item.x, recovered.z - item.z)).toBeGreaterThanOrEqual(clearance - 1e-8);
      let player = { x: item.x, z: item.z + clearance + .5, yaw: 0, pitch: 0 };
      for (let step = 0; step < 5; step++) player = walk.movePlayer(player, 'forward', 2, -1, round);
      expect(player.z).toBeGreaterThanOrEqual(item.z + clearance - 1e-8);
      expect(Object.values(player).every(Number.isFinite)).toBe(true);
    }
    if (round === 1) {
      const vacated = { x: 22.4, z: 1, yaw: 0, pitch: 0 };
      expect(seed({ parallax: { round }, player: vacated }).player).toEqual(vacated);
    }
  });

  it('recalls bookmarks against the new geometry while preserving the original pose', () => {
    const pose = { x: 22.4, z: 4, yaw: 0, pitch: 0 };
    const saved = walk.saveViewpoint(seed({ player: pose }), 'A');
    expect(saved.viewpoints.parallax.A).toEqual(pose);
    const next = seed({ ...saved, parallax: { round: 1, completed: [0] }, player: walk.spawn('parallax') });
    const before = structuredClone(next), recalled = walk.recallViewpoint(next, 'A');
    const item = walk.parallaxObjects(1)[0];
    expect(Math.hypot(recalled.player.x - item.x, recalled.player.z - item.z)).toBeGreaterThanOrEqual(item.radius + .3 - 1e-8);
    expect(recalled.viewpoints.parallax.A).toEqual(pose); expect(recalled.parallax).toEqual(next.parallax); expect(next).toEqual(before);
  });

  it('retains round, evidence, choice and credit through JSON and room re-entry', () => {
    let state = ready(2, { parallax: { round: 2, choice: 'B', samples: samples(), completed: [0, 1] }, notes: { parallax: 'The nearest sphere changes.' } });
    state = walk.saveViewpoint(state, 'A'); const saved = structuredClone(state);
    expect(walk.normalize(JSON.parse(JSON.stringify(state)))).toEqual(saved);
    state = walk.normalize({ ...state, activity: 'scale', player: walk.spawn('scale') });
    state = walk.normalize({ ...state, activity: 'parallax', player: walk.spawn('parallax') });
    state = walk.recallViewpoint(state, 'A');
    expect(state.parallax).toEqual(saved.parallax); expect(state.notes).toEqual(saved.notes); expect(state.player).toEqual(saved.player);
  });
});

describe('parallax arrangement controls and perspective fallback', () => {
  it.each([0, 1, 2])('records, revisits and independently solves round %s through the controls', async round => {
    await mount({ parallax: { round } });
    expect(query('[data-walk-parallax-trial]').textContent).toContain(String(round + 1));
    expect(query('[data-walk-parallax-trial]').textContent).toContain('3');
    expect(query('[data-walk-parallax-completed]').textContent).toContain('0'); expect(query('[data-walk-parallax-next]').disabled).toBe(true);
    await click(`[data-walk-choice="${choices[round]}"]`); await click('[data-walk-check]');
    expect(latest.perceptionWalk.parallax.completed).toEqual([]);
    await click('[data-walk-record]'); await moveTo({ x: 22.8, z: 9, yaw: 0, pitch: 0 }); await click('[data-walk-record]');
    await click('[data-walk-view="0"]'); expect(latest.perceptionWalk.player).toEqual(samples()[0]);
    await click('[data-walk-view="1"]'); expect(latest.perceptionWalk.player).toEqual(samples()[1]);
    await click('[data-walk-check]'); expect(latest.perceptionWalk.parallax.completed).toEqual([round]);
    expect(query('[data-walk-parallax-next]').disabled).toBe(false); expect(query('[data-walk-parallax-completed]').textContent).toContain('1');
    await click('[data-walk-parallax-next]');
    expect(latest.perceptionWalk.parallax).toEqual({ round: (round + 1) % 3, completed: [round], choice: '', samples: [] });
    expect(query('[data-walk-parallax-next]').disabled).toBe(true); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('marks a revealed new trial assisted despite the previously earned room badge', async () => {
    await mount({ parallax: { round: 1, completed: [0], choice: 'A', samples: samples() } });
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.parallax).toMatchObject({ solved: true, assisted: true });
    await click('[data-walk-check]'); expect(latest.perceptionWalk.parallax.completed).toEqual([0]);
    expect(query('[data-walk-parallax-next]').disabled).toBe(false); await click('[data-walk-parallax-next]');
    expect(latest.perceptionWalk.parallax).toEqual({ round: 2, completed: [0], samples: [], choice: '' });
    expect(latest.perceptionWalk.progress.parallax).toEqual({ solved: true, assisted: false, hints: 0 });
    expect(query('[data-walk-explanation]')).toBeFalsy();
  });

  it('resets trial work while retaining notes, bookmarks, other rooms and other tools', async () => {
    const note = 'Matching size alone is not matching distance.', pose = { x: 22.8, z: 9, yaw: 0, pitch: 0 };
    await mount({ parallax: { round: 2, completed: [0, 1, 2], choice: 'B', samples: samples() }, notes: { parallax: note }, viewpoints: { parallax: { A: pose } }, progress: { parallax: { assisted: true, hints: 2 }, ring: { solved: true } } });
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.parallax).toEqual({ round: 0, completed: [], choice: '', samples: [] });
    expect(latest.perceptionWalk.progress.parallax).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.notes.parallax).toBe(note); expect(query('[data-walk-note]').value).toBe(note);
    expect(latest.perceptionWalk.viewpoints.parallax.A).toEqual(pose); expect(latest.perceptionWalk.progress.ring.solved).toBe(true);
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('changes sphere projections while walking and turning in Plan view', async () => {
    await mount({ parallax: { round: 1, completed: [0] } }); await click('[data-walk-diagram-toggle]');
    expect(query('[data-walk-parallax-plan]')).toBeTruthy();
    const before = sphereProjection(); expect(before.length).toBeGreaterThanOrEqual(3);
    expect(before.flat().every(value => value !== null && Number.isFinite(Number(value)))).toBe(true);
    await click('[data-walk-move="left"]'); const moved = sphereProjection(); expect(moved).not.toEqual(before);
    await click('[data-walk-move="turnRight"]'); expect(sphereProjection()).not.toEqual(moved);
    expect(latest.perceptionWalk.parallax.round).toBe(1); expect(latest.perceptionWalk.parallax.completed).toEqual([0]);
    await click('[data-walk-face]'); await click('[data-walk-record]');
    await moveTo({ x: 25.4, z: 9, yaw: 0, pitch: 0 }); await click('[data-walk-record]');
    await click('[data-walk-choice="A"]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.parallax.completed).toEqual([0, 1]);
  });

  it('draws perspective spheres far-to-near when viewing the arrangement from behind', async () => {
    await mount({ parallax: { round: 0 }, player: { x: 24, z: -7, yaw: 180, pitch: 0 } });
    await click('[data-walk-diagram-toggle]');
    const spheres = [...query('[data-walk-parallax-plan]').querySelectorAll('[data-parallax-plan-choice]')];
    expect(spheres.map(node => node.getAttribute('data-parallax-plan-choice'))).toEqual(['C', 'A', 'B']);
  });

  it('keeps trials playable after renderer failure and cleans up strict-mode viewers', async () => {
    await mount({ parallax: { round: 2, choice: 'B', samples: samples() } }, true);
    const before = structuredClone(latest.perceptionWalk); await act(async () => viewers.at(-1).report('failed'));
    expect(query('[data-walk-parallax-plan]')).toBeTruthy(); expect(latest.perceptionWalk).toEqual(before);
    await click('[data-walk-check]'); expect(latest.perceptionWalk.parallax.completed).toEqual([2]);
    await click('[data-walk-parallax-next]'); expect(latest.perceptionWalk.parallax.round).toBe(0);
    await act(async () => root.unmount()); root = null; expect(viewers.every(viewer => viewer.dispose.mock.calls.length > 0)).toBe(true);
  });

  it('uses actual trial collision bounds for first-person controls and room re-entry', async () => {
    await mount({ parallax: { round: 2 }, player: { x: 24, z: 5, yaw: 0, pitch: 0 } });
    for (let i = 0; i < 6; i++) await click('[data-walk-move="forward"]');
    expect(latest.perceptionWalk.player.z).toBeGreaterThanOrEqual(4.65 - 1e-8);
    await click('[data-walk-activity="scale"]'); await click('[data-walk-activity="parallax"]');
    expect(latest.perceptionWalk.parallax.round).toBe(2);
    await moveTo({ x: 24, z: 5, yaw: 0, pitch: 0 });
    for (let i = 0; i < 6; i++) await click('[data-walk-move="forward"]');
    expect(latest.perceptionWalk.player.z).toBeGreaterThanOrEqual(4.65 - 1e-8);
  });

  it('cancels active look gestures on trial advance and reset', async () => {
    await mount({ parallax: { completed: [0] } });
    await pointer('pointerdown', 100, 100); await click('[data-walk-parallax-next]');
    const advanced = structuredClone(latest.perceptionWalk.player); await pointer('pointermove', 150, 120);
    expect(latest.perceptionWalk.player).toEqual(advanced); expect(latest.perceptionWalk.parallax.round).toBe(1);
    await pointer('pointerup', 150, 120); await pointer('pointerdown', 100, 100); await click('[data-walk-reset]');
    const reset = structuredClone(latest.perceptionWalk.player); await pointer('pointermove', 160, 140);
    expect(latest.perceptionWalk.player).toEqual(reset); expect(latest.perceptionWalk.parallax.round).toBe(0);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, scene, host, root, latest, replace, viewers;
const seed = patch => walk.normalize({ activity: 'ring', player: walk.spawn('ring'), ...patch });
const target = round => walk.normalizePlayer(walk.ringConfiguration(round).eye);
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
async function pointer(type, x, y) {
  const node = query('[data-walk-stage]');
  node.setPointerCapture ||= vi.fn(); node.hasPointerCapture ||= () => true; node.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } });
    node.dispatchEvent(event);
  });
}
async function moveTo(player) {
  await act(async () => replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, player } })));
}
function project(point, eye) {
  const yaw = eye.yaw * Math.PI / 180, dx = point.x - eye.x, dz = point.z - eye.z;
  const depth = dx * Math.sin(yaw) - dz * Math.cos(yaw);
  return { x: (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / depth, y: (point.y - 1.65) / depth, depth };
}
const pathData = () => [...query('[data-walk-ring-plan]').querySelectorAll('path, polyline')].map(node => node.getAttribute('d') || node.getAttribute('points'));

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

describe('viewpoint circle arrangements', () => {
  it.each([0, 1, 2])('projects the separated fragments to one closed circle at the round %s eye', round => {
    const config = walk.ringConfiguration(round), parts = walk.ringParts(round);
    expect(config.round).toBe(round); expect(parts).toHaveLength(12);
    expect(new Set(parts.map(part => part.depth)).size).toBe(3);
    expect(new Set(parts.map(part => part.depth))).toEqual(new Set(config.depths));
    const first = project(parts[0].points[0], config.eye), radius = Math.hypot(first.x, first.y);
    expect(radius).toBeGreaterThan(.05); expect(radius).toBeLessThan(.3);
    parts.forEach((part, index) => {
      expect(part.index).toBe(index); expect(part.radius).toBeGreaterThan(0); expect(part.points.length).toBeGreaterThan(4);
      part.points.forEach((point, step) => {
        const projected = project(point, config.eye);
        expect(Object.values(point).every(Number.isFinite)).toBe(true);
        expect(point.z).toBe(part.depth); expect(projected.depth).toBeGreaterThan(0);
        expect(Math.hypot(projected.x, projected.y)).toBeCloseTo(radius, 10);
        const single = walk.ringPoint(round, index, step / (part.points.length - 1));
        for (const axis of ['x', 'y', 'z']) expect(single[axis]).toBeCloseTo(point[axis], 12);
      });
      const end = project(part.points.at(-1), config.eye), start = project(parts[(index + 1) % 12].points[0], config.eye);
      expect(end.x).toBeCloseTo(start.x, 10); expect(end.y).toBeCloseTo(start.y, 10);
    });
    expect(scene.ringParts(round)).toEqual(parts);
  });

  it('preserves every original round-zero point and tube radius', () => {
    expect(walk.ringConfiguration(0)).toMatchObject({ eye: { x: -12, z: 9, yaw: 0, pitch: 0 }, radius: 1.35, depths: [-3, 0, 3] });
    const parts = walk.ringParts(0);
    parts.forEach((part, index) => {
      const depth = [-3, 0, 3][index % 3], scale = (9 - depth) / 9;
      expect(part.radius).toBeCloseTo(.065 * scale, 12);
      part.points.forEach((point, step) => {
        const theta = Math.PI / 6 + (index + step / 16) * Math.PI / 6;
        expect(point.x).toBeCloseTo(-12 + 1.35 * Math.cos(theta) * scale, 12);
        expect(point.y).toBeCloseTo(1.65 + 1.35 * Math.sin(theta) * scale, 12); expect(point.z).toBe(depth);
      });
    });
    expect(scene.ringParts()).toEqual(parts);
  });

  it('keeps each new target eye in the room and isolates returned geometry', () => {
    const expected = [[-12, 9], [-9.6, 7.6], [-14.6, 11.4]];
    for (let round = 0; round < 3; round++) {
      const config = walk.ringConfiguration(round), original = structuredClone(config);
      expect([config.eye.x, config.eye.z]).toEqual(expected[round]); expect(config.eye.pitch).toBe(0);
      expect(config.eye.yaw).toBeCloseTo(Math.atan2(-12 - config.eye.x, config.eye.z) * 180 / Math.PI, 10);
      const normalizedEye = seed({ player: config.eye }).player;
      for (const key of ['x', 'z', 'yaw', 'pitch']) expect(normalizedEye[key]).toBeCloseTo(config.eye[key], 10);
      const parts = walk.ringParts(round), before = structuredClone(parts);
      parts[0].points[0].x = 999; parts[0].radius = 999; config.eye.x = 999; config.depths[0] = 999;
      expect(walk.ringConfiguration(round)).toEqual(original); expect(walk.ringParts(round)).toEqual(before);
    }
    expect(walk.ringParts(0)).not.toEqual(walk.ringParts(1)); expect(walk.ringParts(1)).not.toEqual(walk.ringParts(2));
  });

  it.each([0, 1, 2])('requires the current physical viewpoint and facing direction in round %s', round => {
    const state = seed({ ring: { round }, player: target(round) }), before = structuredClone(state);
    expect(walk.checkAnswer(state)).toBe(true);
    const solved = walk.checkRing(state);
    expect(solved.ring.completed).toEqual([round]); expect(solved.progress.ring.solved).toBe(true);
    expect(walk.checkRing(solved).ring.completed).toEqual([round]); expect(state).toEqual(before);
    const away = [
      { ...state.player, x: state.player.x + 2 }, { ...state.player, z: state.player.z - 2 },
      { ...state.player, yaw: state.player.yaw + 180 }, { ...state.player, pitch: 45 },
      { ...state.player, z: -5, yaw: 180 }
    ];
    for (const player of away) {
      const wrong = seed({ ring: { round }, player });
      expect(walk.checkAnswer(wrong)).toBe(false); expect(walk.checkRing(wrong).ring.completed).toEqual([]);
    }
    for (let other = 0; other < 3; other++) if (other !== round) {
      expect(walk.checkAnswer(seed({ ring: { round }, player: target(other) }))).toBe(false);
    }
  });

  it('normalizes bounded, unique round credit without retaining caller arrays', () => {
    const completed = [2, 0, 2, 1, -1, 3, null, '1', .5];
    const normalized = seed({ ring: { round: 99, completed } });
    expect(normalized.ring).toEqual({ round: 2, completed: [0, 1, 2] }); expect(normalized.progress.ring.solved).toBe(true);
    completed.length = 0; expect(normalized.ring.completed).toEqual([0, 1, 2]);
    for (const ring of [null, [], 'bad', {}, { round: Infinity, completed: {} }, { round: 'bad', completed: '012' }]) {
      expect(seed({ ring }).ring).toEqual({ round: 0, completed: [] });
    }
    expect(seed({ ring: { round: '2', completed: '012' } }).ring).toEqual({ round: 2, completed: [] });
    expect(seed({ ring: { round: -3 } }).ring.round).toBe(0); expect(seed({ ring: { round: 1.9 } }).ring.round).toBe(1);
    expect(walk.normalize(normalized)).toEqual(normalized);
  });

  it('migrates only absent-ring independent legacy completion', () => {
    expect(seed({ progress: { ring: { solved: true } } }).ring.completed).toEqual([0]);
    expect(seed({ progress: { ring: { solved: true, assisted: true } } }).ring.completed).toEqual([]);
    for (const ring of [{ round: 1, completed: [] }, {}, null]) {
      const state = seed({ ring, progress: { ring: { solved: true } } });
      expect(state.ring.completed).toEqual([]); expect(state.progress.ring.solved).toBe(true);
      expect(walk.nextRing(state)).toEqual(state);
    }
  });

  it('does not substitute old credit for the current physical answer or assisted credit', () => {
    const oldCredit = seed({ ring: { round: 1, completed: [0] }, player: target(0) });
    expect(oldCredit.progress.ring.solved).toBe(true); expect(walk.checkAnswer(oldCredit)).toBe(false);
    expect(walk.checkRing(oldCredit).ring.completed).toEqual([0]); expect(walk.nextRing(oldCredit)).toEqual(oldCredit);
    const assisted = seed({ ring: { round: 1, completed: [0] }, player: target(1), progress: { ring: { assisted: true, hints: 2 } } });
    expect(walk.checkAnswer(assisted)).toBe(true); expect(walk.checkRing(assisted).ring.completed).toEqual([0]);
    expect(walk.checkRing(assisted).progress.ring.solved).toBe(true);
    const unearned = seed({ ring: { round: 1 }, player: target(1), progress: { ring: { assisted: true } } });
    expect(walk.checkRing(unearned).ring.completed).toEqual([]); expect(walk.checkRing(unearned).progress.ring.solved).toBe(false);
  });

  it('cycles only earned or assisted arrangements and preserves room work', () => {
    let state = seed({ notes: { ring: 'Fragments stay separated.' }, viewpoints: { ring: { A: target(0) } } });
    expect(walk.nextRing(state)).toEqual(state);
    for (let round = 0; round < 3; round++) {
      state = walk.checkRing({ ...state, player: target(round) });
      const prior = structuredClone(state), next = walk.nextRing(state);
      expect(next.ring.round).toBe((round + 1) % 3); expect(next.ring.completed).toEqual(Array.from({ length: round + 1 }, (_, i) => i));
      expect(next.player).toEqual(walk.spawn('ring')); expect(next.progress.ring).toEqual({ solved: true, assisted: false, hints: 0 });
      expect(next.notes).toEqual(state.notes); expect(next.viewpoints).toEqual(state.viewpoints); expect(state).toEqual(prior); state = next;
    }
    const assisted = seed({ ring: { round: 2 }, progress: { ring: { assisted: true, hints: 2 } } }), next = walk.nextRing(assisted);
    expect(next.ring).toEqual({ round: 0, completed: [] }); expect(next.progress.ring).toEqual({ solved: false, assisted: false, hints: 0 });
  });

  it('ignores ring checks and advancement while another room is active', () => {
    for (const completed of [[], [0]]) {
      const state = seed({ activity: 'scale', player: target(0), ring: { round: 0, completed }, progress: { ring: { assisted: true } } });
      expect(walk.checkRing(state)).toEqual(state); expect(walk.nextRing(state)).toEqual(state);
    }
  });

  it('retains arrangement and credit through JSON, saved viewpoints and room visits', () => {
    let state = seed({ ring: { round: 2, completed: [0, 1] }, player: target(2), notes: { ring: 'The circle closes from the left.' } });
    state = walk.saveViewpoint(state, 'A'); const saved = structuredClone(state);
    state = walk.normalize(JSON.parse(JSON.stringify(state))); expect(state).toEqual(saved);
    state = walk.normalize({ ...state, activity: 'scale', player: walk.spawn('scale') });
    state = walk.normalize({ ...state, activity: 'ring', player: walk.spawn('ring') }); state = walk.recallViewpoint(state, 'A');
    expect(state.ring).toEqual(saved.ring); expect(state.notes).toEqual(saved.notes); expect(state.player).toEqual(saved.player);
  });
});

describe('first-person circle trial controls', () => {
  it('shows current arrangement and earned count, gating the next arrangement', async () => {
    await mount({ player: target(0) });
    expect(query('[data-walk-ring-trial]').textContent).toMatch(/1/); expect(query('[data-walk-ring-trial]').textContent).toMatch(/3/);
    expect(query('[data-walk-ring-completed]').textContent).toMatch(/0/); expect(query('[data-walk-ring-next]').disabled).toBe(true);
    await click('[data-walk-check]'); expect(latest.perceptionWalk.ring.completed).toEqual([0]);
    expect(query('[data-walk-ring-next]').disabled).toBe(false); expect(query('[data-walk-ring-completed]').textContent).toMatch(/1/);
    await click('[data-walk-ring-next]'); expect(latest.perceptionWalk.ring.round).toBe(1); expect(query('[data-walk-ring-next]').disabled).toBe(true);
    expect(query('[data-walk-ring-trial]').textContent).toMatch(/2/); expect(latest.otherTool).toEqual({ preserved: 37 });
    await click('[data-walk-check]'); expect(latest.perceptionWalk.ring.completed).toEqual([0]);
    await moveTo(target(1)); await click('[data-walk-check]'); expect(latest.perceptionWalk.ring.completed).toEqual([0, 1]);
  });

  it('marks reveal on an unearned arrangement assisted even after earlier room credit', async () => {
    await mount({ ring: { round: 1, completed: [0] }, player: target(1) });
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.ring).toMatchObject({ solved: true, assisted: true });
    await click('[data-walk-check]'); expect(latest.perceptionWalk.ring.completed).toEqual([0]);
    expect(query('[data-walk-ring-next]').disabled).toBe(false); await click('[data-walk-ring-next]');
    expect(latest.perceptionWalk.ring).toEqual({ round: 2, completed: [0] });
    expect(latest.perceptionWalk.progress.ring).toEqual({ solved: true, assisted: false, hints: 0 });
    expect(query('[data-walk-explanation]')).toBeFalsy();
  });

  it('resets the circle trials while preserving notes, bookmarks and other tools', async () => {
    const note = 'A side step exposes the separate depths.', viewpoint = target(1);
    await mount({ ring: { round: 2, completed: [0, 1, 2] }, notes: { ring: note }, viewpoints: { ring: { A: viewpoint } }, progress: { ring: { hints: 2, assisted: true }, scale: { solved: true } } });
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.ring).toEqual({ round: 0, completed: [] });
    expect(latest.perceptionWalk.progress.ring).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.notes.ring).toBe(note); expect(query('[data-walk-note]').value).toBe(note);
    expect(latest.perceptionWalk.viewpoints.ring.A).toEqual(viewpoint); expect(latest.perceptionWalk.progress.scale.solved).toBe(true);
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('updates perspective paths while walking in Plan view and preserves earned state', async () => {
    await mount({ ring: { round: 2, completed: [0, 1] }, player: target(2) });
    await click('[data-walk-diagram-toggle]'); expect(query('[data-walk-ring-plan]')).toBeTruthy();
    const before = pathData(); expect(before.length).toBeGreaterThanOrEqual(12); expect(before.every(d => d && !/NaN|Infinity/.test(d))).toBe(true);
    await click('[data-walk-move="right"]'); expect(pathData()).not.toEqual(before);
    expect(latest.perceptionWalk.ring).toEqual({ round: 2, completed: [0, 1] });
    await moveTo(target(2)); await click('[data-walk-check]'); expect(latest.perceptionWalk.ring.completed).toEqual([0, 1, 2]);
    await click('[data-walk-ring-next]'); expect(latest.perceptionWalk.ring.round).toBe(0); expect(pathData()).not.toEqual(before);
  });

  it('keeps circle trials playable after renderer failure and cleans up strict-mode viewers', async () => {
    await mount({ ring: { round: 1 }, player: target(1) }, true);
    const before = structuredClone(latest.perceptionWalk);
    await act(async () => viewers.at(-1).report('failed'));
    expect(query('[data-walk-ring-plan]')).toBeTruthy(); expect(latest.perceptionWalk).toEqual(before);
    await click('[data-walk-check]'); expect(latest.perceptionWalk.ring.completed).toEqual([1]);
    await click('[data-walk-ring-next]'); expect(latest.perceptionWalk.ring.round).toBe(2);
    await act(async () => root.unmount()); root = null;
    expect(viewers.every(viewer => viewer.dispose.mock.calls.length > 0)).toBe(true);
  });

  it('cancels an in-progress look gesture when advancing or resetting an arrangement', async () => {
    await mount({ ring: { completed: [0] } });
    await pointer('pointerdown', 100, 100); await click('[data-walk-ring-next]');
    const afterNext = structuredClone(latest.perceptionWalk.player); await pointer('pointermove', 150, 120);
    expect(latest.perceptionWalk.player).toEqual(afterNext); expect(latest.perceptionWalk.ring.round).toBe(1);
    await pointer('pointerup', 150, 120); await pointer('pointerdown', 100, 100); await click('[data-walk-reset]');
    const afterReset = structuredClone(latest.perceptionWalk.player); await pointer('pointermove', 150, 120);
    expect(latest.perceptionWalk.player).toEqual(afterReset); expect(latest.perceptionWalk.ring.round).toBe(0);
  });
});

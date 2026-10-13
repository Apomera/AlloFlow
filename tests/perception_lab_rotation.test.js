import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const load = file => new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
const threeModule = { exports: {} };
new Function('module', 'exports', readFileSync(resolve(process.cwd(), 'vendor/three-r128/three.min.js'), 'utf8'))(threeModule, threeModule.exports);
const THREE = threeModule.exports;
let walk, host, root, latest, replace, viewer;
const query = selector => host.querySelector(selector);
const seed = patch => walk.normalize({ activity: 'rotation', player: walk.spawn('rotation'), ...patch });
const defaults = () => ({ round: 0, angles: [125, 225], tilts: [20, -25], selected: 0, choice: '', completed: [] });

function canonical(points) {
  const minimum = [0, 1, 2].map(axis => Math.min(...points.map(point => point[axis])));
  return points.map(point => point.map((value, axis) => Math.round((value - minimum[axis]) * 1e6)).join(',')).sort().join(';');
}
function properRotations(points) {
  const permutations = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]], variants = [];
  for (const axes of permutations) {
    const inversions = axes.reduce((total, axis, i) => total + axes.slice(i + 1).filter(other => axis > other).length, 0);
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      if ((inversions % 2 ? -1 : 1) * x * y * z !== 1) continue;
      variants.push(points.map(point => axes.map((axis, i) => point[axis] * [x, y, z][i])));
    }
  }
  return variants;
}

async function click(selector) {
  const node = query(selector);
  expect(node).toBeTruthy();
  await act(async () => node.click());
}
async function input(selector, value) {
  const node = query(selector);
  expect(node).toBeTruthy();
  await act(async () => {
    const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function pointer(type, x, y, pointerType = 'mouse') {
  const stage = query('[data-walk-stage]');
  stage.setPointerCapture = vi.fn(); stage.hasPointerCapture = () => true; stage.releasePointerCapture = vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } });
    stage.dispatchEvent(event);
  });
}
async function keyboard(key) {
  await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
}
async function patchState(patch) {
  await act(async () => replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, ...patch } })));
}
async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch),
      perceptionGallery: { note: 'Keep gallery observations.' }, otherTool: { preserved: 37 } });
    latest = data; replace = setData;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function chooseAndCheck(choice) {
  await click('[data-walk-rotation-choice="' + choice + '"]'); await click('[data-walk-check]');
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); load('stem_lab/perception_walk.js'); load('stem_lab/perception_walk_scene.js');
  walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene.createViewer = vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready',
      onStatusChange: fn => { report = fn; }, report: value => report(value), pick: vi.fn(() => null), onLayout: vi.fn() };
    return viewer;
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('mental rotation models', () => {
  it('offers exactly one congruent copy and a genuinely chiral mirror in each pair', () => {
    for (const round of [0, 1]) {
      const objects = walk.rotationObjects(round), points = item => item.cells.map(cell => [cell.x, cell.y, cell.z]);
      expect(objects.map(item => item.id)).toEqual(['rotation-R', 'rotation-A', 'rotation-B']);
      expect(objects.map(item => item.choice)).toEqual(['R', 'A', 'B']);
      expect(objects.map(item => [item.x, item.y, item.z])).toEqual([[92.5, 2.1, 0], [96, 2.1, 0], [99.5, 2.1, 0]]);
      objects.forEach(item => {
        expect(item.cells).toHaveLength(6 + round);
        expect(item.cells.every(cell => cell.size === 0.58 && [cell.x, cell.y, cell.z].every(Number.isFinite))).toBe(true);
        expect(new Set(points(item).map(point => point.join(','))).size).toBe(6 + round);
      });
      const reference = canonical(points(objects[0])), matches = [];
      for (const candidate of objects.slice(1)) {
        const rotations = properRotations(points(candidate)); expect(rotations).toHaveLength(24);
        if (rotations.some(points => canonical(points) === reference)) matches.push(candidate.choice);
      }
      expect(matches).toEqual([walk.rotationMatch(round)]);
      const mirror = objects.find(item => item.choice !== 'R' && item.choice !== walk.rotationMatch(round));
      expect(canonical(points(mirror).map(([x, y, z]) => [-x, y, z]))).toBe(reference);
      objects[0].cells[0].x = -999;
      expect(walk.rotationObjects(round)[0].cells[0].x).not.toBe(-999);
    }
  });

  it('transforms every cube corner using the same three-dimensional YXZ rotation as Three.js', () => {
    for (const round of [0, 1]) for (const angles of [[125, 225], [0, 90], [180, 270], [17, 359]]) for (const tilts of [[20, -25], [-75, 75], [15, 0]]) {
      const objects = walk.rotationObjects(round, angles, tilts);
      expect(objects[0]).toMatchObject({ yaw: -25, pitch: 15 });
      expect(objects.slice(1).map(item => item.yaw)).toEqual(angles); expect(objects.slice(1).map(item => item.pitch)).toEqual(tilts);
      for (const item of objects) {
        const rotation = new THREE.Euler(item.pitch * Math.PI / 180, item.yaw * Math.PI / 180, 0, 'YXZ');
        for (const cell of item.cells) for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) {
          const corner = { x: cell.x + dx * cell.size, y: cell.y + dy * cell.size, z: cell.z + dz * cell.size };
          const expected = new THREE.Vector3(corner.x, corner.y, corner.z).applyEuler(rotation).add(new THREE.Vector3(item.x, item.y, item.z));
          const actual = walk.rotationPoint(item, corner);
          expect(actual.x).toBeCloseTo(expected.x, 10); expect(actual.y).toBeCloseTo(expected.y, 10); expect(actual.z).toBeCloseTo(expected.z, 10);
        }
      }
    }
  });

  it('normalizes partial and malformed saved pairs without mutating sibling progress', () => {
    expect(seed().rotation).toEqual(defaults());
    const raw = { rotation: { round: 8, angles: [-25, 945], tilts: [-999, 999], selected: 3, choice: 'R', completed: [-1, 0, 0, 1, 2, 0.5, '1', null] },
      notes: { rotation: 'The bends keep their handedness.', change: 'Keep the first scene.' },
      change: { round: 1, completed: [0] }, progress: { shadow: { solved: true }, rotation: { solved: false } } };
    const before = structuredClone(raw), state = seed(raw);
    expect(state.rotation).toEqual({ round: 1, angles: [335, 225], tilts: [-75, 75], selected: 1, choice: '', completed: [0, 1] });
    expect(state.progress.rotation.solved).toBe(true); expect(state.progress.shadow.solved).toBe(true);
    expect(state.change).toMatchObject({ round: 1, completed: [0] }); expect(state.notes).toMatchObject(raw.notes);
    expect(raw).toEqual(before); expect(walk.normalize(state)).toEqual(state);
    expect(seed({ progress: { rotation: { solved: true } } }).progress.rotation.solved).toBe(false);
    expect(seed({ rotation: { completed: [0, 1] }, progress: { rotation: { assisted: true } } }).progress.rotation.solved).toBe(false);
    for (const rotation of [null, [], { round: 'bad', angles: [NaN, Infinity], tilts: [null, 'bad'], selected: 'bad', completed: 'bad' }]) {
      expect(seed({ rotation }).rotation).toEqual(defaults());
    }
  });

  it('wraps yaw, clamps tilt, and updates only the reachable selected candidate', () => {
    const initial = seed({ notes: { rotation: 'Keep this observation.' }, shadowAngle: 80 }), before = structuredClone(initial);
    const a = walk.turnRotation(initial, 0, -25, 999);
    expect(a.rotation).toEqual({ ...defaults(), angles: [335, 225], tilts: [75, -25] });
    const b = walk.turnRotation(a, 1, 945, -999);
    expect(b.rotation).toEqual({ ...defaults(), angles: [335, 225], tilts: [75, -75], selected: 1 });
    expect(b.shadowAngle).toBe(80); expect(b.notes.rotation).toBe('Keep this observation.');
    for (const value of [null, '', 'bad', Infinity, NaN]) expect(walk.turnRotation(initial, 0, value, value)).toEqual(initial);
    for (const index of [-1, 2, 0.5, '0', null]) expect(walk.turnRotation(initial, index, 45, 30)).toEqual(initial);
    expect(initial).toEqual(before);
  });

  it('limits turning and selection to the front-side three-dimensional reach of each candidate', () => {
    const initial = seed();
    const x = 96 - Math.sqrt(14 ** 2 - 9 ** 2 - 0.45 ** 2);
    const boundary = seed({ player: { x, z: 9, yaw: 0, pitch: 0 } });
    expect(walk.canTurnRotation(boundary, 0)).toBe(true);
    expect(walk.canTurnRotation({ ...boundary, player: { ...boundary.player, x: x - 0.001 } }, 0)).toBe(false);
    for (const patch of [{ activity: 'change' }, { player: { x: 102, z: 1.649, yaw: 0, pitch: 0 } }, { player: { x: 82, z: 9, yaw: 0, pitch: 0 } }]) {
      const state = seed(patch), before = structuredClone(state);
      expect(walk.canTurnRotation(state, 0)).toBe(false); expect(walk.canTurnRotation(state, 1)).toBe(false);
      expect(walk.turnRotation(state, 0, 90, 45)).toEqual(before);
      expect(walk.chooseRotation(state, 'A')).toEqual(before);
    }
    for (const choice of ['', 'R', 'C', null, 0, {}, ['A']]) expect(walk.chooseRotation(initial, choice)).toEqual(initial);
    expect(walk.chooseRotation(initial, 'A').rotation.choice).toBe('A');
    expect(walk.chooseRotation(initial, 'B').rotation.choice).toBe('B');
  });

  it('requires a correct choice and a facing observation position rather than an exact pose', () => {
    expect([0, 1].map(walk.rotationMatch)).toEqual(['A', 'B']);
    const initial = seed({ rotation: { choice: 'A', angles: [17, 290], tilts: [-65, 60] } });
    expect(walk.rotationMatches(initial)).toBe(true);
    for (const x of [92, 94, 96, 98, 100]) for (const z of [4, 8, 12]) {
      const state = seed({ ...initial, player: { x, z, yaw: 0, pitch: 0 } }); state.player = walk.faceExhibit(state);
      expect(walk.rotationMatches(state)).toBe(true);
    }
    for (const player of [{ x: 91.99 }, { x: 100.01 }, { z: 3.99 }, { z: 12.01 }, { yaw: 180 }, { pitch: 20 }]) {
      const state = { ...initial, player: { ...initial.player, ...player } };
      expect(walk.rotationMatches(state)).toBe(false);
      expect(walk.checkRotation(state).rotation.completed).toEqual([]);
    }
    expect(walk.rotationMatches({ ...initial, activity: 'shadow' })).toBe(false);
    expect(walk.rotationMatches({ ...initial, rotation: { ...initial.rotation, choice: 'B' } })).toBe(false);
  });

  it('requires two independent pairs and leaves assisted practice unscored', () => {
    let state = seed(); const original = structuredClone(state);
    expect(walk.nextRotation(state)).toEqual(state);
    for (const round of [0, 1]) {
      expect(state.rotation.round).toBe(round);
      const target = walk.rotationMatch(round), wrong = target === 'A' ? 'B' : 'A';
      expect(walk.checkRotation(walk.chooseRotation(state, wrong)).rotation.completed).toEqual(state.rotation.completed);
      const chosen = walk.chooseRotation(state, target), before = structuredClone(chosen);
      state = walk.checkRotation(chosen);
      expect(chosen).toEqual(before); expect(state.rotation.completed).toEqual(round === 0 ? [0] : [0, 1]);
      expect(state.progress.rotation.solved).toBe(round === 1); expect(walk.checkAnswer(state)).toBe(round === 1);
      expect(walk.checkRotation(state)).toEqual(state);
      if (!round) {
        state = walk.nextRotation(state);
        expect(state.rotation).toEqual({ ...defaults(), round: 1, completed: [0] });
      }
    }
    expect(original.rotation).toEqual(defaults());
    expect(walk.nextRotation(state).rotation).toEqual({ ...defaults(), completed: [0, 1] });
    const assisted = seed({ rotation: { choice: 'A' }, progress: { rotation: { assisted: true } } });
    expect(walk.checkRotation(assisted).rotation.completed).toEqual([]);
    expect(walk.checkRotation(assisted).progress.rotation.solved).toBe(false);
    expect(walk.nextRotation(assisted).rotation.round).toBe(1);
  });

  it('blocks all three pedestals and the rear wall while leaving an inspection route', () => {
    for (const x of [92.5, 96, 99.5]) {
      const player = { x, z: 9, yaw: 0, pitch: 0 }, front = walk.movePlayer(player, 'forward', 10, -1);
      expect(front.z).toBeGreaterThanOrEqual(1.65);
      const recovered = seed({ player: { ...player, z: 0 } }).player;
      expect(recovered.x !== x || recovered.z !== 0).toBe(true);
      expect(Object.values(recovered).every(Number.isFinite)).toBe(true);
    }
    const wall = walk.movePlayer({ x: 96, z: -2, yaw: 0, pitch: 0 }, 'forward', 10, -1);
    expect(wall.z).toBeGreaterThanOrEqual(-4.15);
    const side = walk.movePlayer(walk.spawn('rotation'), 'left', 5.9, -1);
    let behind = walk.movePlayer(side, 'forward', 10, -1); behind = walk.movePlayer(behind, 'forward', 6, -1);
    expect(behind.x).toBeCloseTo(90.1); expect(behind.z).toBeLessThan(-4.85);
  });
});

describe('rotation studio first-person controls', () => {
  it('rotates and tilts picked candidates without selecting an answer or moving the camera', async () => {
    await mount(); const before = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'rotation-A', distance: 9 });
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 220, 160);
    expect(latest.perceptionWalk.rotation).toMatchObject({ angles: [185, 225], tilts: [-1, -25], selected: 0, choice: '' });
    expect(latest.perceptionWalk.player).toEqual(before);
    await pointer('pointercancel', 220, 160); await pointer('pointermove', 300, 200);
    expect(latest.perceptionWalk.rotation.angles).toEqual([185, 225]);
    viewer.pick.mockReturnValue({ id: 'rotation-B', distance: 9 });
    await pointer('pointerdown', 100, 100); await pointer('pointerup', 100, 100);
    expect(latest.perceptionWalk.rotation.selected).toBe(1); expect(latest.perceptionWalk.rotation.choice).toBe('');
  });

  it('allows horizontal touch rotation while preserving vertical page gestures and tilt', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'rotation-A', distance: 9 });
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 102, 160, 'touch');
    expect(latest.perceptionWalk.rotation.angles).toEqual([125, 225]); expect(latest.perceptionWalk.rotation.tilts).toEqual([20, -25]);
    await pointer('pointercancel', 102, 160, 'touch');
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 220, 102, 'touch');
    expect(latest.perceptionWalk.rotation.angles).toEqual([185, 225]); expect(latest.perceptionWalk.rotation.tilts).toEqual([20, -25]);
    expect(latest.perceptionWalk.player).toEqual(walk.spawn('rotation'));
    await pointer('pointerup', 220, 102, 'touch');
  });

  it('offers labeled sliders, candidate selection, precision controls, and reach-safe disabling', async () => {
    await mount();
    for (const selector of ['[data-walk-rotation-yaw]', '[data-walk-rotation-tilt]']) {
      expect(query(selector).type).toBe('range'); expect(query(selector).labels[0].textContent.trim()).toBeTruthy();
    }
    for (const suffix of ['left', 'right', 'up', 'down']) expect(query('[data-walk-rotation-' + suffix + ']').getAttribute('aria-label')).toBeTruthy();
    await click('[data-walk-rotation-piece="1"]'); await input('[data-walk-rotation-yaw]', 355); await input('[data-walk-rotation-tilt]', 70);
    await click('[data-walk-rotation-left]'); await click('[data-walk-rotation-up]');
    expect(latest.perceptionWalk.rotation).toMatchObject({ angles: [125, 0], tilts: [20, 75], selected: 1 });
    await click('[data-walk-precision]'); await click('[data-walk-rotation-right]'); await click('[data-walk-rotation-down]');
    expect(latest.perceptionWalk.rotation).toMatchObject({ angles: [125, 359], tilts: [20, 74] });
    await patchState({ player: { x: 102, z: 1, yaw: 0, pitch: 0 } });
    for (const suffix of ['yaw', 'tilt', 'left', 'right', 'up', 'down']) expect(query('[data-walk-rotation-' + suffix + ']').matches(':disabled')).toBe(true);
    expect(query('[data-walk-rotation-choice="B"]').matches(':disabled')).toBe(true);
    await click('[data-walk-rotation-left]'); expect(latest.perceptionWalk.rotation.angles[1]).toBe(359);
  });

  it('requires both correct pairs and persists completed observations through navigation and restoration', async () => {
    await mount(); expect(query('[data-walk-rotation-next]').disabled).toBe(true);
    await chooseAndCheck('B'); expect(latest.perceptionWalk.rotation.completed).toEqual([]);
    await chooseAndCheck('A'); expect(latest.perceptionWalk.rotation.completed).toEqual([0]);
    expect(latest.perceptionWalk.progress.rotation.solved).toBe(false);
    await input('[data-walk-note]', 'The reversed bend cannot be turned into the reference.');
    await click('[data-walk-rotation-next]'); await input('[data-walk-rotation-yaw]', 60);
    const saved = structuredClone(latest.perceptionWalk.rotation);
    await click('[data-walk-activity="change"]'); await click('[data-walk-activity="rotation"]');
    expect(latest.perceptionWalk.rotation).toEqual(saved);
    const serialized = JSON.parse(JSON.stringify(latest.perceptionWalk));
    await act(async () => root.unmount()); root = null; host.remove(); host = null; await mount(serialized);
    expect(latest.perceptionWalk.rotation).toEqual(saved); expect(latest.perceptionWalk.notes.rotation).toContain('reversed bend');
    await chooseAndCheck('B'); expect(latest.perceptionWalk.rotation.completed).toEqual([0, 1]);
    expect(latest.perceptionWalk.progress.rotation.solved).toBe(true);
    expect(latest.perceptionGallery).toEqual({ note: 'Keep gallery observations.' }); expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('keeps revealed practice assisted and resets only rotation while retaining observations', async () => {
    await mount({ shadowAngle: 75, precise: true, change: { round: 1, completed: [0] },
      progress: { shadow: { solved: true, hints: 1, assisted: false } }, notes: { shadow: 'Keep the silhouette.' } });
    await input('[data-walk-note]', 'Follow the bends in depth.'); await chooseAndCheck('A');
    await click('[data-walk-rotation-next]'); await click('[data-walk-hint]'); await click('[data-walk-reveal]');
    const angle = latest.perceptionWalk.rotation.angles.slice(), tilt = latest.perceptionWalk.rotation.tilts.slice();
    expect(latest.perceptionWalk.progress.rotation.assisted).toBe(true);
    await chooseAndCheck('B'); expect(latest.perceptionWalk.rotation.completed).toEqual([0]);
    expect(latest.perceptionWalk.rotation.angles).toEqual(angle); expect(latest.perceptionWalk.rotation.tilts).toEqual(tilt);
    await click('[data-walk-reveal]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.progress.rotation.solved).toBe(false);
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.rotation).toEqual(defaults()); expect(latest.perceptionWalk.progress.rotation).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.change).toMatchObject({ round: 1, completed: [0] });
    expect(latest.perceptionWalk.notes).toMatchObject({ rotation: 'Follow the bends in depth.', shadow: 'Keep the silhouette.' });
    expect(latest.perceptionWalk.shadowAngle).toBe(75); expect(latest.perceptionWalk.precise).toBe(true);
    expect(latest.perceptionWalk.progress.shadow).toEqual({ solved: true, hints: 1, assisted: false });
  });

  it('preserves an independently earned solve when the explanation is revealed afterward', async () => {
    await mount(); await chooseAndCheck('A'); await click('[data-walk-rotation-next]'); await chooseAndCheck('B');
    const completed = structuredClone(latest.perceptionWalk.rotation);
    await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.rotation).toEqual(completed); expect(latest.perceptionWalk.progress.rotation).toEqual({ solved: true, assisted: false, hints: 0 });
    await click('[data-walk-reveal]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.rotation).toEqual({ solved: true, assisted: false, hints: 0 });
  });

  it('cancels stale drags on rendering failure and remains solvable in the fallback view', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'rotation-A', distance: 9 });
    await pointer('pointerdown', 100, 100); await act(async () => viewer.report('failed')); await pointer('pointermove', 220, 160);
    expect(latest.perceptionWalk.rotation).toEqual(defaults());
    expect(query('[data-walk-rotation-plan]')).toBeTruthy(); expect(query('[data-walk-rotation-plan]').getAttribute('aria-label')).toBeTruthy();
    expect(query('[data-walk-rotation-comparison]')).toBeNull();
    const labels = Array.from(query('[data-walk-rotation-plan]').querySelectorAll('text'), node => ({ choice: node.textContent, x: Number(node.getAttribute('x')) }));
    const points = node => node.getAttribute('points').trim().split(/\s+/).map(point => point.split(',').map(Number));
    const nearestLabel = x => labels.reduce((nearest, label) => Math.abs(label.x - x) < Math.abs(nearest.x - x) ? label : nearest).choice;
    const visible = { R: 0, A: 0, B: 0 };
    for (const face of query('[data-walk-rotation-plan]').querySelectorAll('polygon')) {
      const vertices = points(face), choice = nearestLabel(vertices.reduce((sum, point) => sum + point[0], 0) / vertices.length);
      const color = face.getAttribute('fill'); expect(color).toMatch(/^#[\da-f]{6}$/i);
      const [red, green, blue] = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16));
      if (choice === 'R') { expect(red).toBeGreaterThan(green); expect(red).toBeGreaterThan(blue); }
      else { expect(green).toBeGreaterThan(red); expect(blue).toBeGreaterThan(red); }
      visible[choice]++;
    }
    expect(Object.values(visible).every(count => count > 0)).toBe(true);
    await input('[data-walk-rotation-yaw]', 335); await input('[data-walk-rotation-tilt]', 15);
    await chooseAndCheck('A'); await click('[data-walk-rotation-next]'); await chooseAndCheck('B');
    expect(latest.perceptionWalk.progress.rotation.solved).toBe(true);
    await click('[data-walk-reveal]');
    const comparison = query('[data-walk-rotation-comparison]'); expect(comparison).toBeTruthy();
    const lines = Array.from(comparison.querySelectorAll('polyline')); expect(lines.length).toBeGreaterThan(0);
    const allPoints = [];
    for (const line of lines) {
      const vertices = points(line);
      expect(vertices.every(point => point.length === 2 && point.every(Number.isFinite))).toBe(true);
      expect(new Set(vertices.map(point => point.join(','))).size).toBeGreaterThan(1);
      expect(line.getAttribute('fill')).toBe('none'); expect(line.getAttribute('stroke')).toBeTruthy();
      expect(Number(line.getAttribute('stroke-width'))).toBeGreaterThan(0); allPoints.push(...vertices);
    }
    expect(nearestLabel(allPoints.reduce((sum, point) => sum + point[0], 0) / allPoints.length)).toBe('B');
    await click('[data-walk-reveal]'); expect(query('[data-walk-rotation-comparison]')).toBeNull();
  });

  it('enters the tenth bay on foot and requires a facing observation before confirming', async () => {
    await mount({ activity: 'change', player: { x: 89.95, z: 9, yaw: 0, pitch: 0 } });
    await keyboard('d'); expect(latest.perceptionWalk.activity).toBe('rotation'); expect(latest.perceptionWalk.player.x).toBeCloseTo(90.15);
    await click('[data-walk-activity="rotation"]'); await click('[data-walk-rotation-choice="A"]');
    await patchState({ player: { ...walk.spawn('rotation'), yaw: 180 } });
    await click('[data-walk-check]'); expect(latest.perceptionWalk.rotation.completed).toEqual([]);
    await click('[data-walk-face]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.rotation.completed).toEqual([0]);
  });
});

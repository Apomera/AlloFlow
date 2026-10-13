import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const load = file => new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
const threeModule = { exports: {} };
new Function('module', 'exports', readFileSync(resolve(process.cwd(), 'vendor/three-r128/three.min.js'), 'utf8'))(threeModule, threeModule.exports);
const THREE = threeModule.exports;
let walk, host, root, latest, replace, viewer, createSceneViewer;
const query = selector => host.querySelector(selector);

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
  stage.setPointerCapture = vi.fn();
  stage.hasPointerCapture = () => true;
  stage.releasePointerCapture = vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } });
    stage.dispatchEvent(event);
  });
}
async function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: { activity: 'shadow', player: walk.spawn('shadow'), ...seed },
      perceptionGallery: { note: 'Keep gallery observations.' }, otherTool: { preserved: 37 } });
    latest = data; replace = setData;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function patchState(patch) {
  await act(async () => replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, ...patch } })));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); load('stem_lab/perception_walk.js'); load('stem_lab/perception_walk_scene.js');
  walk = window.StemLab.PerceptionWalk;
  createSceneViewer = window.StemLab.PerceptionWalkScene.createViewer;
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

describe('shadow projection and first-person reach', () => {
  it('declines scene initialization when its model geometry dependency is absent or incomplete', () => {
    const factory = vi.spyOn(window.StemLab, 'makeOrbitViewer');
    const incompleteModels = [undefined, {}, ...['shadowGeometry', 'shadowProfile', 'shadowOutline'].map(key => ({ ...walk, [key]: null }))];
    for (const model of incompleteModels) {
      window.StemLab.PerceptionWalk = model;
      expect(createSceneViewer()).toBeNull();
    }
    expect(factory).not.toHaveBeenCalled();
  });

  it('projects the transformed vertices of every solid cube onto the rendered wall profile', () => {
    const direction = new THREE.Vector3(0.5, 0, -1), wall = new THREE.Plane(new THREE.Vector3(0, 0, 1), 4);
    for (const rotation of [0, 17, 45, 90, 137, 180, 225, 270, 359]) {
      const blocks = walk.shadowGeometry(rotation), profile = walk.shadowProfile(rotation);
      const intervals = profile.map(() => []);
      for (const block of blocks) {
        const geometry = new THREE.BoxGeometry(block.size, block.size, block.size);
        geometry.rotateY(block.angle * Math.PI / 180); geometry.translate(block.x, block.y, block.z);
        const vertices = geometry.getAttribute('position'), projected = [];
        for (let index = 0; index < vertices.count; index++) {
          const point = new THREE.Vector3().fromBufferAttribute(vertices, index);
          const onWall = new THREE.Ray(point, direction).intersectPlane(wall, new THREE.Vector3());
          expect(onWall.z).toBeCloseTo(-4);
          projected.push(onWall.x);
        }
        geometry.dispose();
        const left = Math.min(...projected), right = Math.max(...projected);
        expect(left).toBeCloseTo(block.projectedX - block.projectedWidth / 2, 4);
        expect(right).toBeCloseTo(block.projectedX + block.projectedWidth / 2, 4);
        intervals[block.row].push({ left, right });
      }
      intervals.forEach((row, index) => {
        row.sort((a, b) => a.left - b.left);
        let right = row[0].right;
        row.slice(1).forEach(part => { expect(part.left).toBeLessThanOrEqual(right + 0.0001); right = Math.max(right, part.right); });
        expect(profile[index].left).toBeCloseTo(row[0].left, 4);
        expect(profile[index].right).toBeCloseTo(right, 4);
      });
    }
  });

  it('distinguishes the target from other quarter turns and requires an observation viewpoint', () => {
    const answer = { activity: 'shadow', player: walk.spawn('shadow'), shadowAngle: 90 };
    expect(walk.checkAnswer(answer)).toBe(true);
    expect(walk.evidence(answer).shadowError).toBeCloseTo(0);
    for (const shadowAngle of [0, 180, 270]) expect(walk.checkAnswer({ ...answer, shadowAngle })).toBe(false);
    for (const player of [{ x: 70.79 }, { x: 73.21 }, { z: 6.99 }, { z: 11.01 }, { yaw: 180 }, { pitch: 25 }]) {
      expect(walk.checkAnswer({ ...answer, player: { ...answer.player, ...player } })).toBe(false);
    }
    const faced = walk.faceExhibit({ ...answer, player: { ...answer.player, yaw: 130, pitch: 25 } });
    expect(faced).toMatchObject({ x: 72, z: 9, pitch: 0 });
    expect(walk.checkAnswer({ ...answer, player: faced })).toBe(true);
  });

  it('wraps rotation without mutating saved work or sharing returned geometry', () => {
    const seed = walk.normalize({ activity: 'shadow', player: walk.spawn('shadow'), shadowAngle: -270,
      notes: { shadow: 'The hidden row changes the outline.' }, continuityOffset: 0.3, progress: { ring: { solved: true } } });
    const before = structuredClone(seed);
    expect(seed.shadowAngle).toBe(90);
    expect(walk.rotateShadow(seed, 810).shadowAngle).toBe(90);
    expect(walk.rotateShadow(seed, -450).shadowAngle).toBe(270);
    for (const value of [null, '', 'bad', Infinity, NaN]) expect(walk.rotateShadow(seed, value).shadowAngle).toBe(90);
    const next = walk.rotateShadow(seed, 130);
    expect(next).toEqual({ ...seed, shadowAngle: 130 });
    expect(seed).toEqual(before);
    expect(walk.normalize(seed)).toEqual(seed);
    const geometry = walk.shadowGeometry(90), profile = walk.shadowProfile(90);
    geometry[0].x = -999; profile[0].left = -999;
    expect(walk.shadowGeometry(90)[0].x).not.toBe(-999);
    expect(walk.shadowProfile(90)[0].left).not.toBe(-999);
  });

  it('bounds manipulation by front-side reach and accepts the complete marked observation area', () => {
    const seed = { activity: 'shadow', player: walk.spawn('shadow'), shadowAngle: 30 };
    const depthAtReach = 1 + Math.sqrt(12 ** 2 - 0.15 ** 2);
    expect(walk.canRotateShadow({ ...seed, player: { x: 70, z: depthAtReach, yaw: 0, pitch: 0 } })).toBe(true);
    expect(walk.canRotateShadow({ ...seed, player: { x: 70, z: depthAtReach + 0.001, yaw: 0, pitch: 0 } })).toBe(false);
    for (const patch of [{ activity: 'continuity' }, { player: { x: 73, z: 3.099, yaw: 0, pitch: 0 } }, { player: { x: 78, z: 11, yaw: 0, pitch: 0 } }]) {
      const unreachable = walk.normalize({ ...seed, ...patch });
      expect(walk.canRotateShadow(unreachable)).toBe(false);
      expect(walk.rotateShadow(unreachable, 90)).toEqual(unreachable);
    }
    for (const x of [70.8, 71.4, 72, 72.6, 73.2]) for (const z of [7, 8, 9, 10, 11]) {
      const state = { ...seed, player: { x, z, yaw: 0, pitch: 0 } };
      expect(walk.normalize(state).player).toEqual(state.player);
      expect(walk.canRotateShadow(state)).toBe(true);
      expect(walk.checkAnswer(walk.rotateShadow(state, 90))).toBe(true);
    }
  });

  it('stops at the turntable and projection wall while allowing a route around each edge', () => {
    let front = { x: 70, z: 9, yaw: 0, pitch: 0 };
    front = walk.movePlayer(front, 'forward', 10, -1);
    expect(front.z).toBeGreaterThanOrEqual(3.1);
    const aroundTable = walk.movePlayer(walk.movePlayer(front, 'right', 4, -1), 'forward', 5, -1);
    expect(aroundTable.x).toBeCloseTo(74); expect(aroundTable.z).toBeLessThan(-1.1);
    const wall = walk.movePlayer(aroundTable, 'forward', 10, -1);
    expect(wall.z).toBeGreaterThanOrEqual(-3.7);
    const behind = walk.movePlayer(walk.movePlayer(wall, 'right', 4, -1), 'forward', 3, -1);
    expect(behind.x).toBeCloseTo(78); expect(behind.z).toBeLessThan(-4.55);
    for (const player of [{ x: 70, z: 1, yaw: 0, pitch: 0 }, { x: 72, z: -4, yaw: 0, pitch: 0 }]) {
      const recovered = walk.normalize({ activity: 'shadow', player }).player;
      expect(recovered.x !== player.x || recovered.z !== player.z).toBe(true);
      expect(Object.values(recovered).every(Number.isFinite)).toBe(true);
    }
  });
});

describe('shadow workshop controls', () => {
  it('rotates a directly picked sculpture without changing the camera and cancels stale drags', async () => {
    await mount({ shadowAngle: 0 });
    const before = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'shadow-block-0', distance: 8 });
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 280, 100);
    expect(latest.perceptionWalk.shadowAngle).toBe(90);
    expect(latest.perceptionWalk.player).toEqual(before);
    expect(viewer.push.mock.lastCall[0]).toMatchObject({ shadowAngle: 90, selected: true });
    await pointer('pointercancel', 280, 100); await pointer('pointermove', 360, 100);
    expect(latest.perceptionWalk.shadowAngle).toBe(90);
    await click('[data-walk-check]'); expect(latest.perceptionWalk.progress.shadow.solved).toBe(true);
  });

  it('supports horizontal touch manipulation without consuming vertical scroll gestures', async () => {
    await mount({ shadowAngle: 30 });
    viewer.pick.mockReturnValue({ id: 'shadow-block-2', distance: 8 });
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 102, 160, 'touch');
    expect(latest.perceptionWalk.shadowAngle).toBe(30);
    await pointer('pointercancel', 102, 160, 'touch');
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 220, 102, 'touch');
    expect(latest.perceptionWalk.shadowAngle).toBe(90);
    expect(latest.perceptionWalk.player).toEqual(walk.spawn('shadow'));
    await pointer('pointerup', 220, 102, 'touch');
  });

  it('provides labeled slider and precision button alternatives and disables unreachable controls', async () => {
    await mount({ shadowAngle: 0 });
    const slider = query('[data-walk-shadow-angle]');
    expect(slider.type).toBe('range'); expect(slider.labels[0].textContent).toContain('Turntable angle');
    expect(query('[data-walk-shadow-left]').getAttribute('aria-label')).toBeTruthy();
    expect(query('[data-walk-shadow-right]').getAttribute('aria-label')).toBeTruthy();
    await click('[data-walk-shadow-right]'); expect(latest.perceptionWalk.shadowAngle).toBe(355);
    await click('[data-walk-precision]');
    await click('[data-walk-shadow-left]'); expect(latest.perceptionWalk.shadowAngle).toBe(356);
    await input('[data-walk-shadow-angle]', 90); expect(latest.perceptionWalk.shadowAngle).toBe(90);
    await patchState({ player: { x: 78, z: 11, yaw: 0, pitch: 0 } });
    expect(query('[data-walk-shadow-angle]').disabled).toBe(true);
    expect(query('[data-walk-shadow-left]').disabled).toBe(true);
    expect(query('[data-walk-shadow-right]').disabled).toBe(true);
    await click('[data-walk-shadow-left]'); expect(latest.perceptionWalk.shadowAngle).toBe(90);
  });

  it('keeps notes and sibling work through a scoped reset and counts only independent matches', async () => {
    await mount({ shadowAngle: 90, continuityOffset: 0.25, precise: true,
      progress: { continuity: { solved: true, hints: 1, assisted: false } }, notes: { continuity: 'Keep the rod evidence.' } });
    await input('[data-walk-note]', 'The same shadow can hide depth.');
    await click('[data-walk-hint]'); await click('[data-walk-reveal]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.shadow).toEqual({ solved: false, assisted: true, hints: 1 });
    await click('[data-walk-reveal]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.shadow.solved).toBe(false);
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.shadowAngle).toBe(0);
    expect(latest.perceptionWalk.progress.shadow).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.notes).toMatchObject({ shadow: 'The same shadow can hide depth.', continuity: 'Keep the rod evidence.' });
    expect(latest.perceptionWalk.progress.continuity).toEqual({ solved: true, hints: 1, assisted: false });
    expect(latest.perceptionWalk.continuityOffset).toBe(0.25); expect(latest.perceptionWalk.precise).toBe(true);
    expect(latest.perceptionGallery).toEqual({ note: 'Keep gallery observations.' });
    expect(latest.otherTool).toEqual({ preserved: 37 });
    await input('[data-walk-shadow-angle]', 90); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.shadow).toEqual({ solved: true, assisted: false, hints: 0 });
  });

  it('keeps the puzzle solvable in diagram mode and cancels a drag on rendering failure', async () => {
    await mount({ shadowAngle: 0 });
    viewer.pick.mockReturnValue({ id: 'shadow-block-1', distance: 8 });
    await pointer('pointerdown', 100, 100);
    await act(async () => viewer.report('failed'));
    await pointer('pointermove', 280, 100);
    expect(latest.perceptionWalk.shadowAngle).toBe(0);
    expect(query('[data-walk-shadow-plan]').getAttribute('aria-label')).toBe('Wall silhouette and its target outline');
    await input('[data-walk-shadow-angle]', 90); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.shadow.solved).toBe(true);
    await click('[data-walk-reset]'); await click('[data-walk-reveal]');
    expect(query('[data-walk-shadow-plan]').textContent).toContain('Matching orientation');
    expect(latest.perceptionWalk.progress.shadow.assisted).toBe(true);
  });

  it('enters the eighth bay on foot and refuses to confirm while facing away', async () => {
    await mount({ activity: 'continuity', player: { x: 65.95, z: 9, yaw: 0, pitch: 0 }, shadowAngle: 90 });
    await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true })));
    expect(latest.perceptionWalk.activity).toBe('shadow'); expect(latest.perceptionWalk.player.x).toBeCloseTo(66.15);
    await click('[data-walk-activity="shadow"]');
    await patchState({ player: { ...walk.spawn('shadow'), yaw: 180 } });
    expect(query('[data-walk-evidence]').textContent).toContain('Out of view');
    await click('[data-walk-check]'); expect(latest.perceptionWalk.progress.shadow.solved).toBe(false);
    await click('[data-walk-face]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.shadow.solved).toBe(true);
  });
});

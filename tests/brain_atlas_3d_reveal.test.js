import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { mountBrainAtlasScene, THREE } from './helpers/brain_atlas_3d_scene.js';

const selected = 'Allen_body_of_hippocampus_L';
let state, frames;

beforeEach(() => {
  resetStemLab();
  frames = new Map();
  let next = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++next, callback); return next; });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
});

afterEach(() => {
  state?.cleanup();
  state = null;
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function draw(now) {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(now));
}

async function mount({ width = 800, height = 450, reduce = true, initialState = {} } = {}) {
  vi.stubGlobal('matchMedia', () => ({ matches: reduce }));
  const root = new THREE.Group();
  function piece(name, size, position) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size));
    mesh.name = name;
    mesh.position.set(...position);
    root.add(mesh);
    return mesh;
  }
  // Separate pieces of one structure share its key. Unrelated tissue extends
  // beyond them so a fit of the entire atlas would produce a different pose.
  const first = piece(selected, [1, .34, .4], [-.4, .15, -.1]);
  const second = piece(selected, [.8, .35, .5], [.35, .3, .05]);
  piece('Allen_precentral_gyrus_R', [.6, .7, .8], [1.4, .15, .35]);
  const scene = await mountBrainAtlasScene(root, { width, height, initialState });
  state = scene.state;
  expect(state.ready).toBe(true);
  draw(performance.now());
  return { ...scene, pieces: [first, second] };
}

function matchingBounds(pieces) {
  const bounds = new THREE.Box3();
  pieces.forEach(mesh => bounds.expandByObject(mesh));
  return bounds;
}

function expectVector(actual, expected) {
  expect(actual.distanceTo(expected)).toBeLessThan(1e-7);
}

describe('Brain Atlas structure camera framing', () => {
  it.each([[360, 510], [900, 460]])('fits both matching pieces from the current camera angle at %i × %i', async (width, height) => {
    const { pieces } = await mount({ width, height });
    const oldTarget = new THREE.Vector3(-.45, .21, .3);
    state.controls.target.copy(oldTarget);
    state.camera.position.set(2.4, 1.2, 4);
    state.controls.update();
    const direction = state.camera.position.clone().sub(oldTarget).normalize();
    expect(state.revealStructure(selected, null, false, true)).toBe(true);
    expect(state.cameraTween).toBeFalsy();
    const box = matchingBounds(pieces);
    expectVector(state.controls.target, box.getCenter(new THREE.Vector3()));
    expectVector(state.camera.position.clone().sub(state.controls.target).normalize(), direction);
    state.camera.updateMatrixWorld(true);
    let outermost = 0;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const point = new THREE.Vector3(x, y, z).project(state.camera);
      expect(point.z).toBeGreaterThan(-1);
      expect(point.z).toBeLessThan(1);
      outermost = Math.max(outermost, Math.abs(point.x), Math.abs(point.y));
    }
    // A selection should occupy about two-thirds of its limiting viewport
    // dimension. Merely landing somewhere inside the frustum is insufficient.
    expect(outermost).toBeCloseTo(1 / 1.5, 5);
  });

  it('uses the rendered Recenter button without changing layer, focus, or cutaway depth', async () => {
    const { pieces, nodes, store } = await mount({ initialState: {
      selected3DStructure: selected, brain3DLayer: 'left', brain3DFocus: 'isolate',
      brain3DSliceAxis: 'sagittal', brain3DSlicePosition: 52, brain3DSliceFlip: false
    } });
    const bounds = matchingBounds(pieces);
    const fullCenter = bounds.getCenter(new THREE.Vector3());
    const planeX = -state.clipPlane.constant / state.clipPlane.normal.x;
    expect(planeX).toBeGreaterThan(new THREE.Box3().setFromObject(pieces[0]).max.x);
    const retainedPiece = new THREE.Box3().setFromObject(pieces[1]);
    expect(planeX).toBeGreaterThan(retainedPiece.min.x);
    expect(planeX).toBeLessThan(retainedPiece.max.x);
    retainedPiece.min.x = planeX;
    const expected = retainedPiece.getCenter(new THREE.Vector3());
    const recenter = nodes().find(node => node.type === 'button' && node.props['aria-label']?.startsWith('Recenter the 3D camera on '));
    expect(recenter).toBeDefined();
    recenter.props.onClick();
    expectVector(state.controls.target, expected);
    expect(state.controls.target.distanceTo(fullCenter)).toBeGreaterThan(.1);
    expect(state).toMatchObject({ layer: 'left', focus: 'isolate', sliceAxis: 'sagittal', slicePosition: 52 });
    expect(store.toolData.brainAtlas).toMatchObject({ selected3DStructure: selected, brain3DLayer: 'left', brain3DFocus: 'isolate', brain3DSliceAxis: 'sagittal', brain3DSlicePosition: 52 });
    // At the far boundary, only the unrelated right-side tissue remains. A
    // request for the clipped-away selection must leave the camera in place.
    state.slicePosition = 100;
    state.updateSlicePlane();
    const position = state.camera.position.clone();
    const target = state.controls.target.clone();
    expect(state.revealStructure(selected, null, false, true)).toBe(false);
    expectVector(state.camera.position, position);
    expectVector(state.controls.target, target);
  });

  it.each([[6, 8, 6], [.35, .6, .6]])('respects the live orbit range %s–%s', async (min, max, expectedDistance) => {
    await mount();
    state.controls.minDistance = min;
    state.controls.maxDistance = max;
    expect(state.revealStructure(selected, null, false, true)).toBe(true);
    expect(state.camera.position.distanceTo(state.controls.target)).toBeCloseTo(expectedDistance, 7);
    expect(state.controls.minDistance).toBe(min);
    expect(state.controls.maxDistance).toBe(max);
  });

  it.each(['orbit', 'keyboard'])('yields to %s input midway through reveal and never snaps back', async input => {
    const { canvas } = await mount({ reduce: false });
    const started = performance.now();
    const initial = state.camera.position.clone();
    expect(state.revealStructure(selected, null, false, true)).toBe(true);
    expect(state.cameraTween).toBeTruthy();
    draw(started + 160);
    expect(state.camera.position.distanceTo(initial)).toBeGreaterThan(.01);
    if (input === 'orbit') {
      state.controls.dispatchEvent({ type: 'start' });
      state.camera.position.add(new THREE.Vector3(.37, -.12, .09));
      state.controls.update();
      state.controls.dispatchEvent({ type: 'change' });
    } else {
      const midway = state.camera.position.clone();
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      expect(state.camera.position.distanceTo(midway)).toBeGreaterThan(.01);
    }
    expect(state.cameraTween).toBeFalsy();
    const position = state.camera.position.clone(), target = state.controls.target.clone();
    for (const elapsed of [280, 560, 720, 900]) draw(started + elapsed);
    expectVector(state.camera.position, position);
    expectVector(state.controls.target, target);
    expect(frames.size).toBe(0);
  });
});

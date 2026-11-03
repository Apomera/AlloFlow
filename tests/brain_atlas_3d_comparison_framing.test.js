import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { mountBrainAtlasScene, THREE } from './helpers/brain_atlas_3d_scene.js';

const hippocampus = 'Allen_body_of_hippocampus_L';
const amygdala = 'Allen_amygdaloid_complex_L';
const other = 'Allen_lateral_hemisphere_of_cerebellum_R';
let state, frames;

beforeEach(() => {
  resetStemLab();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  frames = new Map();
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', frame => frames.delete(frame));
});

afterEach(() => {
  state?.cleanup();
  state = null;
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount({ width = 880, height = 460, initialState = {} } = {}) {
  const root = new THREE.Group();
  function piece(name, size, position) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size));
    mesh.name = name;
    mesh.position.set(...position);
    root.add(mesh);
    return mesh;
  }
  const a1 = piece(hippocampus, [.25, .24, .36], [-1, -.2, -.45]);
  const a2 = piece(hippocampus, [.35, .45, .22], [-.72, .33, -.15]);
  const b = piece(amygdala, [.34, .26, .31], [.45, .43, .55]);
  const c = piece(other, [.65, .8, .8], [2.4, .9, 1.1]);
  const scene = await mountBrainAtlasScene(root, { width, height, initialState: { brain3DCompareActive: true, ...initialState } });
  state = scene.state;
  expect(state.ready).toBe(true);
  const refresh = (updates = {}) => {
    Object.assign(scene.store.toolData.brainAtlas, updates);
    scene.nodes().find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(scene.canvas);
  };
  const hit = vi.spyOn(state, 'pickAt');
  const pick = mesh => {
    hit.mockReturnValueOnce({ object: mesh });
    state.onPointerDown({ clientX: 100, clientY: 90 });
    state.onPointerUp({ clientX: 100, clientY: 90 });
    refresh();
  };
  return { ...scene, a1, a2, b, c, refresh, pick };
}

function heading() { return state.camera.position.clone().sub(state.controls.target).normalize(); }
function customView() {
  state.camera.position.set(2.2, 1.1, 3.7);
  state.controls.target.set(-.7, .24, .53);
  state.controls.update();
  return { position: state.camera.position.clone(), target: state.controls.target.clone() };
}
function expectUnchanged(view) {
  expect(state.camera.position.distanceTo(view.position)).toBeLessThan(1e-7);
  expect(state.controls.target.distanceTo(view.target)).toBeLessThan(1e-7);
}
function expectPairFramed(pieces, direction) {
  const bounds = new THREE.Box3();
  for (const mesh of pieces) bounds.expandByObject(mesh);
  expect(state.controls.target.distanceTo(bounds.getCenter(new THREE.Vector3()))).toBeLessThan(1e-7);
  expect(heading().distanceTo(direction)).toBeLessThan(1e-7);
  state.camera.updateMatrixWorld(true);
  let furthest = 0;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(x, y, z).project(state.camera);
    expect(point.z).toBeGreaterThan(-1);
    expect(point.z).toBeLessThan(1);
    furthest = Math.max(furthest, Math.abs(point.x), Math.abs(point.y));
  }
  expect(furthest).toBeCloseTo(1 / 1.5, 5);
}

describe('Brain Atlas comparison framing', () => {
  it.each([[360, 510], [900, 460]])('fits a new pair including every mesh from the current angle at %i × %i', async (width, height) => {
    const s = await mount({ width, height });
    const view = customView();
    const direction = heading();
    s.pick(s.a1);
    expectUnchanged(view);
    s.pick(s.b);
    expectPairFramed([s.a1, s.a2, s.b], direction);
  }, 15000);

  it('fits an initially saved pair after the model and all of its meshes load', async () => {
    const s = await mount({ initialState: { brain3DCompareStructures: [hippocampus, amygdala] } });
    const lateral = new THREE.Vector3(4.6, .15, .15).normalize();
    expectPairFramed([s.a1, s.a2, s.b], lateral);
  });

  it('preserves manual framing and A/B identity until a different pair is completed', async () => {
    const s = await mount();
    const fit = vi.spyOn(state, 'fitComparison');
    const preset = () => s.nodes().find(node => node.props?.className === 'brainatlas-3d-compare-preset' && node.key === 'memory-salience');
    preset().props.onClick();
    s.refresh();
    expect(fit).toHaveBeenCalledOnce();
    expect(state.compareStructures).toEqual([hippocampus, amygdala]);
    const view = customView();
    s.refresh();
    state.setHover(hippocampus, { x: 50, y: 60 });
    s.pick(s.a1);
    expect(s.store.toolData.brainAtlas.selected3DStructure).toBe(hippocampus);
    expect(state.compareStructures).toEqual([hippocampus, amygdala]);
    preset().props.onClick();
    s.refresh();
    expect(fit).toHaveBeenCalledOnce();
    expectUnchanged(view);
    const direction = heading();
    s.pick(s.c);
    expect(state.compareStructures).toEqual([amygdala, other]);
    expect(fit).toHaveBeenCalledTimes(2);
    expectPairFramed([s.b, s.c], direction);
  });

  it.each(['missing', 'hidden', 'fully clipped'])('preserves the camera when a %s member prevents framing the full pair', async kind => {
    const s = await mount();
    const view = customView();
    if (kind === 'missing') s.refresh({ brain3DCompareStructures: [hippocampus, 'absent'] });
    if (kind === 'hidden') {
      s.refresh({ brain3DLayer: 'left', brain3DCompareStructures: [hippocampus, other] });
      expect(s.c.visible).toBe(false);
    }
    if (kind === 'fully clipped') {
      s.refresh({ brain3DSliceAxis: 'sagittal', brain3DSlicePosition: 35, brain3DCompareStructures: [hippocampus, amygdala] });
      // This plane leaves some of B visible while clipping both pieces of A.
      for (const a of [s.a1, s.a2]) expect(state.clipPlane.distanceToPoint(new THREE.Box3().setFromObject(a).max)).toBeLessThan(0);
      expect(state.clipPlane.distanceToPoint(new THREE.Box3().setFromObject(s.b).max)).toBeGreaterThan(0);
    }
    expectUnchanged(view);
    expect(state.fitComparison()).toBe(false);
    expectUnchanged(view);
  });
});

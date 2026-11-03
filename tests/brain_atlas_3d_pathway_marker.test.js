import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStemLab, loadTool, makeCtx, newStore, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { THREE } from './helpers/brain_atlas_3d_scene.js';
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

async function mountPathwayScene(model, initialState = {}) {
  class Renderer {
    setClearColor() {}
    setPixelRatio() {}
    setSize() {}
    render = vi.fn(scene => scene.updateMatrixWorld(true));
    dispose = vi.fn();
  }
  class Controls extends THREE.EventDispatcher {
    target = new THREE.Vector3();
    constructor(camera) { super(); this.camera = camera; }
    update() { this.camera.lookAt(this.target); }
    dispose() {}
  }
  class Loader {
    setMeshoptDecoder() {}
    load(url, onLoad) { onLoad({ scene: model }); }
  }
  window.__alloBrainAtlas3DDependencies = Promise.resolve({
    THREE: { ...THREE, WebGLRenderer: Renderer, OrbitControls: Controls, GLTFLoader: Loader },
    MeshoptDecoder: {}
  });
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', brain3DPathway: 'motor', ...initialState } });
  const nodes = () => flatten(tool.render(makeCtx({}, store)));
  const stage = document.createElement('div');
  Object.defineProperties(stage, { clientWidth: { value: 400 }, clientHeight: { value: 300 } });
  const rect = { left: 80, top: 40, width: 400, height: 300 };
  vi.spyOn(stage, 'getBoundingClientRect').mockImplementation(() => rect);
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  document.body.appendChild(stage);
  nodes().find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(canvas);
  await Promise.resolve();
  const state = canvas._brain3DState;
  const overlayHost = document.createElement('div');
  stage.appendChild(overlayHost);
  const overlayRoot = ReactDOMClient.createRoot(overlayHost);
  const refresh = async updates => {
    Object.assign(store.toolData.brainAtlas, updates);
    const tree = nodes();
    tree.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(canvas);
    const marker = tree.find(node => node.props?.['data-brainatlas-pathway-marker'] !== undefined);
    await React.act(async () => overlayRoot.render(marker || null));
    return tree;
  };
  await refresh({});
  return {
    state, canvas, stage, rect, store, nodes, refresh,
    unmount: async () => { state.cleanup(); await React.act(async () => overlayRoot.unmount()); stage.remove(); }
  };
}




const MOTOR = [
  'Allen_precentral_gyrus_L',
  'Allen_cerebral_peduncle_crus_cerebri_L',
  'Allen_basilar_part_of_pons_L',
  'Allen_middle_cerebellar_peduncle_L',
  'Allen_lateral_hemisphere_of_cerebellum_L',
  'Allen_superior_cerebellar_peduncle_brachium_conjunctivum_L'
];
const MEMORY = [
  'Allen_body_of_hippocampus_L', 'Allen_fornix_L', 'Allen_mammillary_region_of_HTH_L',
  'Allen_mammillothalamic_tract_L', 'Allen_anterior_nuclear_complex_of_thalamus_L',
  'Allen_cingulate_gyrus_caudal_posterior_part_L', 'Allen_anterior_parahippocampal_gyrus_L'
];
let scene, frames;
beforeEach(() => {
  resetStemLab();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  frames = new Map();
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', frame => frames.delete(frame));
});
afterEach(async () => {
  await scene?.unmount();
  scene = null;
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function draw() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(performance.now()));
}
function triangle(model, key, coordinates) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3));
  const mesh = new THREE.Mesh(geometry);
  mesh.name = key;
  model.add(mesh);
  return mesh;
}
function modelFor(keys) {
  const model = new THREE.Group();
  keys.forEach((key, index) => {
    const x = index * .8;
    triangle(model, key, [x, 0, 0, x + .3, .5, .2, x + .5, -.3, -.1]);
  });
  return model;
}
async function mount(model, initial = {}) {
  scene = await mountPathwayScene(model, initial);
  expect(scene.state.ready).toBe(true);
  scene.state.camera.position.set(0, 0, 6);
  scene.state.controls.target.set(0, 0, 0);
  scene.state.controls.update();
  scene.state.requestRender();
  draw();
  return scene;
}
function marker() {
  const overlay = scene.stage.querySelector('[data-brainatlas-pathway-marker]');
  const badge = overlay?.querySelector('[data-brainatlas-pathway-marker-badge]');
  const line = overlay?.querySelector('[data-brainatlas-pathway-marker-leader]');
  const dot = overlay?.querySelector('[data-brainatlas-pathway-marker-anchor]');
  const hidden = !overlay || overlay.hidden || !badge || badge.hidden;
  if (!hidden) {
    expect(line.hasAttribute('hidden')).toBe(false);
    expect(dot.hasAttribute('hidden')).toBe(false);
    expect(Number(line.getAttribute('x1'))).toBeCloseTo(Number(dot.getAttribute('cx')), 6);
    expect(Number(line.getAttribute('y1'))).toBeCloseTo(Number(dot.getAttribute('cy')), 6);
  }
  return { overlay, badge, line, dot, hidden, anchor: dot ? [Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))] : null };
}
function points(key) {
  return scene.state.meshes.filter(mesh => mesh.userData.brainAtlas3D.structureKey === key).flatMap(mesh => {
    const positions = mesh.geometry.getAttribute('position');
    return Array.from({ length: positions.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld));
  });
}
function project(point) {
  const projected = point.clone().project(scene.state.camera);
  return [(projected.x + 1) * scene.stage.clientWidth / 2, (1 - projected.y) * scene.stage.clientHeight / 2];
}
function anchorVertex(key) {
  const current = marker();
  expect(current.hidden).toBe(false);
  expect(current.badge.getAttribute('data-structure')).toBe(key);
  const found = points(key).find(point => {
    const pixel = project(point);
    return Math.hypot(pixel[0] - current.anchor[0], pixel[1] - current.anchor[1]) < .0001;
  });
  expect(found, 'The locator must point to a real vertex of the active structure').toBeDefined();
  return found;
}
function children(kind) {
  return scene.state.pathwayGroup?.children.filter(object => object.userData.pathwayKind === kind) || [];
}

describe('Candidate Brain Atlas active pathway locator', () => {
  it('retains original indices around a missing middle structure and connects only authored adjacent steps', async () => {
    await mount(modelFor([MOTOR[0], MOTOR[2], MOTOR[3]]), { brain3DPathwayStep: 2, selected3DStructure: MOTOR[0] });
    expect(scene.state.pathwaySlots.map(slot => slot?.key ?? null)).toEqual([MOTOR[0], null, MOTOR[2], MOTOR[3], null, null]);
    expect(children('node').map(node => node.userData.pathwayStepIndex)).toEqual([0, 2, 3]);
    expect(children('segment').map(segment => segment.userData.pathwayStepIndex)).toEqual([2]);
    expect(children('node').filter(node => node.scale.x > 1).map(node => node.userData.pathwayStepIndex)).toEqual([2]);
    const gold = scene.state.meshes.filter(mesh => mesh.material.color.getHex() === 0xfbbf24);
    expect(gold.map(mesh => mesh.userData.brainAtlas3D.structureKey)).toEqual([MOTOR[2]]);
    anchorVertex(MOTOR[2]);
    await scene.refresh({ brain3DPathwayStep: 1 });
    draw();
    expect(marker().hidden).toBe(true);
    expect(children('node').some(node => node.scale.x > 1)).toBe(false);
    expect(scene.state.meshes.some(mesh => mesh.material.color.getHex() === 0xfbbf24)).toBe(false);
  });

  it('allows the authored closing edge of a loop while leaving its missing internal steps disconnected', async () => {
    await mount(modelFor([MEMORY[0], MEMORY[6]]), { brain3DPathway: 'papez', brain3DPathwayStep: 6 });
    expect(scene.state.pathwaySlots).toHaveLength(7);
    expect(children('node').map(node => node.userData.pathwayStepIndex)).toEqual([0, 6]);
    expect(children('segment').map(segment => segment.userData.pathwayStepIndex)).toEqual([6]);
    anchorVertex(MEMORY[6]);
  });

  it('shows one available authored step as a node and locator without inventing a segment', async () => {
    await mount(modelFor([MOTOR[2]]), { brain3DPathwayStep: 2 });
    expect(scene.state.pathwaySlots).toHaveLength(6);
    expect(children('node').map(node => node.userData.pathwayStepIndex)).toEqual([2]);
    expect(children('segment')).toHaveLength(0);
    anchorVertex(MOTOR[2]);
    expect(marker().overlay.getAttribute('aria-hidden')).toBe('true');
    expect(marker().overlay.querySelector('button, a, [tabindex]')).toBeNull();
  });

  it('keeps a stale selection out of the active-step gold state when every route structure is unavailable', async () => {
    await mount(modelFor([MEMORY[0]]), { brain3DPathway: 'motor', selected3DStructure: MEMORY[0] });
    expect(scene.state.pathwaySlots).toEqual(Array(6).fill(null));
    expect(scene.state.pathwayKeys).toEqual([]);
    expect(scene.state.pathwayGroup).toBeFalsy();
    expect(marker().hidden).toBe(true);
    expect(scene.state.selectedStructure).toBe(MEMORY[0]);
    const selected = scene.state.meshes.find(mesh => mesh.userData.brainAtlas3D.structureKey === MEMORY[0]);
    expect(selected.material.color.getHex()).not.toBe(0xfbbf24);
    expect(selected.material.opacity).toBeLessThan(.25);
  });

  it('projects a real surface vertex across multiple matching pieces and reuses it on camera and scroll updates', async () => {
    const model = new THREE.Group();
    const far = triangle(model, MOTOR[0], [-2.5, 0, 0, -2.2, .3, .15, -2.3, -.1, .03]);
    const near = triangle(model, MOTOR[0], [-.75, 0, 0, -.55, .55, .2, -.35, -.3, -.12]);
    triangle(model, MOTOR[1], [.5, .1, -.15, .8, .65, .2, .95, -.3, -.12]);
    await mount(model);
    const anchor = anchorVertex(MOTOR[0]);
    const geometry = [far, near].map(mesh => Array.from(mesh.geometry.attributes.position.array));
    const scans = [far, near].map(mesh => vi.spyOn(mesh.geometry.attributes.position, 'getX'));
    scene.state.camera.position.set(1.2, 1.4, 4.2);
    scene.state.controls.update();
    scene.state.requestRender();
    scene.state.requestRender();
    expect(frames.size).toBe(1);
    draw();
    const expected = project(anchor);
    expect(marker().anchor[0]).toBeCloseTo(expected[0], 6);
    expect(marker().anchor[1]).toBeCloseTo(expected[1], 6);
    scans.forEach(scan => expect(scan).not.toHaveBeenCalled());
    const renders = scene.state.renderer.render.mock.calls.length;
    scene.rect.top = 120;
    window.dispatchEvent(new Event('scroll'));
    expect(scene.state.renderer.render).toHaveBeenCalledTimes(renders);
    expect(frames.size).toBe(0);
    expect([far, near].map(mesh => Array.from(mesh.geometry.attributes.position.array))).toEqual(geometry);
  });

  it('refreshes the active anchor on step, route and cut changes and hides anatomy excluded by a layer', async () => {
    await mount(modelFor([MOTOR[0], MOTOR[1], MEMORY[0]]));
    anchorVertex(MOTOR[0]);
    expect(marker().badge.querySelector('span').textContent).toBe('1');
    expect(marker().badge.querySelector('strong').textContent).toBe('Precentral gyrus');
    await scene.refresh({ brain3DPathwayStep: 1 });
    draw();
    anchorVertex(MOTOR[1]);
    expect(marker().badge.querySelector('span').textContent).toBe('2');
    expect(marker().badge.querySelector('strong').textContent).toBe('Cerebral peduncle');
    await scene.refresh({ brain3DPathway: 'papez', brain3DPathwayStep: 0 });
    draw();
    anchorVertex(MEMORY[0]);
    expect(marker().badge.querySelector('span').textContent).toBe('1');
    expect(marker().badge.querySelector('strong').textContent).toBe('Hippocampus');
    await scene.refresh({ brain3DLayer: 'right' });
    draw();
    expect(marker().hidden).toBe(true);
    await scene.refresh({ brain3DLayer: 'all', brain3DPathway: 'motor', brain3DPathwayStep: 0 });
    draw();
    const original = anchorVertex(MOTOR[0]);
    const maxX = Math.max(...points(MOTOR[0]).map(point => point.x));
    const range = scene.state.modelBounds;
    const depth = coordinate => (coordinate - range.min.x) * 100 / (range.max.x - range.min.x);
    await scene.refresh({ brain3DSliceAxis: 'sagittal', brain3DSlicePosition: depth((original.x + maxX) / 2) });
    draw();
    const retained = anchorVertex(MOTOR[0]);
    expect(scene.state.clipPlane.distanceToPoint(retained)).toBeGreaterThanOrEqual(-.000001);
    await scene.refresh({ brain3DSlicePosition: Math.min(100, Math.ceil(depth(maxX)) + 1) });
    draw();
    expect(marker().hidden).toBe(true);
  });

  it('hides offscreen and behind-camera anchors and clears the overlay when its route closes', async () => {
    await mount(modelFor([MOTOR[0], MOTOR[1]]));
    anchorVertex(MOTOR[0]);
    for (const [position, target] of [[[8, 0, 3], [8, 0, 0]], [[0, 0, -4], [0, 0, -6]]]) {
      scene.state.camera.position.fromArray(position);
      scene.state.controls.target.fromArray(target);
      scene.state.controls.update();
      scene.state.requestRender();
      draw();
      expect(marker().hidden).toBe(true);
    }
    await scene.refresh({ brain3DPathway: 'off' });
    draw();
    expect(marker().hidden).toBe(true);
    expect(scene.state.pathwaySlots).toEqual([]);
    expect(scene.state.pathwayGroup).toBeNull();
  });

  it('follows the camera during a reveal tween drawn outside the queued render frame', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    await mount(modelFor([MOTOR[0], MOTOR[1], MOTOR[2]]));
    const anchor = anchorVertex(MOTOR[0]);
    const original = marker().anchor;
    const started = performance.now();
    expect(scene.state.revealStructure(MOTOR[0], null, false, true)).toBe(true);
    const tween = frames.get(scene.state.cameraTween);
    expect(tween).toBeTypeOf('function');
    frames.delete(scene.state.cameraTween);
    tween(started + 180);
    const current = marker();
    const expected = project(anchor);
    expect(current.hidden).toBe(false);
    expect(current.anchor[0]).toBeCloseTo(expected[0], 6);
    expect(current.anchor[1]).toBeCloseTo(expected[1], 6);
    expect(Math.hypot(current.anchor[0] - original[0], current.anchor[1] - original[1])).toBeGreaterThan(1);
  });

  it.each(['brain3DChallengeActive', 'brain3DSavedQuizActive', 'brain3DCompareActive'])('suppresses the locator immediately for %s and disposes without an idle loop', async mode => {
    await mount(modelFor([MOTOR[0], MOTOR[1]]));
    const original = marker().overlay;
    expect(marker().hidden).toBe(false);
    await scene.refresh({ [mode]: true });
    expect(marker().hidden).toBe(true);
    expect(original.hidden || !original.isConnected).toBe(true);
    await scene.refresh({ [mode]: false });
    draw();
    expect(marker().hidden).toBe(false);
    const geometries = children('node').map(node => vi.spyOn(node.geometry, 'dispose'));
    const live = marker();
    scene.state.cleanup();
    expect(live.badge.hidden).toBe(true);
    expect(live.line.hasAttribute('hidden')).toBe(true);
    expect(live.dot.hasAttribute('hidden')).toBe(true);
    geometries.forEach(dispose => expect(dispose).toHaveBeenCalledTimes(1));
    expect(frames.size).toBe(0);
  });
});

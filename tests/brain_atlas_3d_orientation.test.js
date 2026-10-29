import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const flatten = node => !node || typeof node !== 'object' ? [] : (Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]);
const directions = { L: [-1, 0, 0], R: [1, 0, 0], A: [0, 0, 1], P: [0, 0, -1], S: [0, 1, 0], I: [0, -1, 0] };
let frames, nextFrame, activeState;

beforeEach(() => {
  resetStemLab();
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
});

afterEach(() => {
  activeState?.cleanup();
  activeState = null;
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function drawRequestedFrame() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(0));
}

async function mountScene({ deferred = false, compass = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  mesh.name = 'Allen_precentral_gyrus_L';
  const root = new THREE.Group();
  root.add(mesh);
  let load, fail;
  class Renderer {
    setClearColor() {}
    setPixelRatio() {}
    setSize() {}
    render = vi.fn(scene => scene.updateMatrixWorld(true));
    dispose = vi.fn();
  }
  class Controls extends THREE.EventDispatcher {
    target = new THREE.Vector3();
    update() {}
    dispose() {}
  }
  class Loader {
    setMeshoptDecoder() {}
    load(url, onLoad, onProgress, onError) {
      load = () => onLoad({ scene: root });
      fail = onError;
      if (!deferred) load();
    }
  }
  window.__alloBrainAtlas3DDependencies = Promise.resolve({
    THREE: { ...THREE, WebGLRenderer: Renderer, OrbitControls: Controls, GLTFLoader: Loader }, MeshoptDecoder: {}
  });
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d' } });
  const nodes = flatten(tool.render(makeCtx({}, store)));
  const canvasNode = nodes.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true');
  const stage = document.createElement('div');
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  if (compass) {
    const labels = Object.keys(directions).map(letter => `<span data-brainatlas-orientation-axis="${letter}">${letter}</span>`).join('');
    const lines = Object.keys(directions).map(letter => `<line data-brainatlas-orientation-line="${letter}"></line>`).join('');
    stage.insertAdjacentHTML('beforeend', `<div data-brainatlas-orientation data-ready="false"><svg>${lines}</svg>${labels}</div>`);
  }
  document.body.appendChild(stage);
  canvasNode.ref(canvas);
  await Promise.resolve();
  activeState = canvas._brain3DState;
  return { state: activeState, stage, canvas, tool, store, load, fail };
}

function endpoint(stage, letter) {
  const element = stage.querySelector(`[data-brainatlas-orientation-axis="${letter}"]`);
  return { element, x: parseFloat(element.style.left), y: parseFloat(element.style.top) };
}

function assertReadableEndpoints(stage) {
  const visible = [];
  for (const letter of Object.keys(directions)) {
    const point = endpoint(stage, letter);
    const line = stage.querySelector(`[data-brainatlas-orientation-line="${letter}"]`);
    expect(line.style.visibility).toBe(point.element.style.visibility);
    if (point.element.style.visibility !== 'hidden') visible.push(point);
  }
  expect(visible.length).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
    expect(Math.hypot(visible[i].x - visible[j].x, visible[i].y - visible[j].y)).toBeGreaterThanOrEqual(24);
  }
  return visible.map(point => point.element.textContent).join('');
}

describe('Brain Atlas orientation compass', () => {
  it('exposes all six full translated directions without adding a keyboard stop or live announcements', () => {
    const translations = {
      'stem.brainatlas.d3_orientation': 'Orientation traduite',
      'stem.anatomy.angle_left': 'Gauche',
      'stem.anatomy.angle_right': 'Droite',
      'stem.brainatlas.d3_angle_front': 'Avant',
      'stem.anatomy.angle_back': 'Arrière',
      'stem.brainatlas.d3_angle_top': 'Haut',
      'stem.brainatlas.d3_angle_bottom': 'Bas'
    };
    const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
    const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d' } });
    const nodes = flatten(tool.render(makeCtx({ t: (key, fallback) => translations[key] || fallback || key }, store)));
    const compass = nodes.find(node => node.props?.['data-brainatlas-orientation'] === 'true');
    expect(compass.props.role).toBe('img');
    expect(compass.props['aria-label']).toBe('Orientation traduite: L: Gauche; R: Droite; A: Avant; P: Arrière; S: Haut; I: Bas');
    expect(flatten(compass).some(node => node.props?.tabIndex >= 0 || node.props?.['aria-live'] === 'polite' || node.props?.['aria-live'] === 'assertive')).toBe(false);
  });

  it.each([
    ['lateral', 'A', 'P', 'S', 'I', 'R', 'L'],
    ['medial', 'P', 'A', 'S', 'I', 'L', 'R'],
    ['front', 'L', 'R', 'S', 'I', 'A', 'P'],
    ['top', 'L', 'R', 'P', 'A', 'S', 'I'],
    ['bottom', 'L', 'R', 'A', 'P', 'I', 'S']
  ])('shows anatomical directions correctly in the %s preset', async (preset, left, right, top, bottom, near, far) => {
    const { state, stage } = await mountScene();
    state.setPreset(preset, false);
    drawRequestedFrame();
    expect(stage.querySelector('[data-brainatlas-orientation]').dataset.ready).toBe('true');
    expect(endpoint(stage, left).x).toBeLessThan(21);
    expect(endpoint(stage, right).x).toBeGreaterThan(91);
    expect(endpoint(stage, top).y).toBeLessThan(21);
    expect(endpoint(stage, bottom).y).toBeGreaterThan(91);
    expect(endpoint(stage, near).element.dataset.facing).toBe('front');
    expect(endpoint(stage, near).element.style.visibility).toBe('');
    expect(endpoint(stage, far).element.style.visibility).toBe('hidden');
    expect(Number(endpoint(stage, near).element.style.zIndex)).toBeGreaterThan(Number(endpoint(stage, far).element.style.zIndex));
  });

  it.each([
    ['diagonal', [1, 1, .05], ['L', 'I'], ['S', 'R']],
    ['oblique', [2.8, 1.8, 3.1], ['L', 'P'], ['A', 'R']]
  ])('keeps nearer labels readable at the %s collision found in browser QA', async (name, position, hidden, shown) => {
    const { state, stage } = await mountScene();
    state.camera.up.set(0, 1, 0);
    state.camera.position.set(...position);
    state.camera.lookAt(0, 0, 0);
    state.requestRender();
    drawRequestedFrame();
    for (const letter of hidden) expect(endpoint(stage, letter).element.style.visibility).toBe('hidden');
    for (const letter of shown) expect(endpoint(stage, letter).element.style.visibility).toBe('');
    const visible = assertReadableEndpoints(stage);
    state.requestRender();
    drawRequestedFrame();
    expect(assertReadableEndpoints(stage)).toBe(visible);
  });

  it('keeps at least three readable endpoints through swept rotation and roll without reordering DOM', async () => {
    const { state, stage } = await mountScene();
    const originalOrder = [...stage.querySelectorAll('[data-brainatlas-orientation-axis]')];
    for (let azimuth = 0; azimuth < 360; azimuth += 30) {
      for (const elevation of [-85, -60, -30, 0, 30, 60, 85]) {
        for (const roll of [0, Math.PI / 4]) {
          const theta = azimuth * Math.PI / 180;
          const phi = elevation * Math.PI / 180;
          state.camera.up.set(0, 1, 0);
          state.camera.position.set(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta));
          state.camera.lookAt(0, 0, 0);
          state.camera.rotateZ(roll);
          state.requestRender();
          drawRequestedFrame();
          assertReadableEndpoints(stage);
          expect(frames.size).toBe(0);
        }
      }
    }
    expect([...stage.querySelectorAll('[data-brainatlas-orientation-axis]')]).toEqual(originalOrder);
  });

  it('follows an arbitrary world rotation and remains independent of zoom or translated focus', async () => {
    const { state, stage } = await mountScene();
    // A rotated parent also catches accidentally reading the camera's local quaternion.
    const rig = new THREE.Group();
    state.scene.add(rig);
    rig.add(state.camera);
    rig.rotation.set(.23, -.41, .12);
    state.camera.rotation.set(-.43, .67, -.28);
    state.requestRender();
    drawRequestedFrame();
    const before = {};
    for (const [letter, direction] of Object.entries(directions)) {
      // Independently derive camera coordinates with its actual view matrix.
      const projected = new THREE.Vector3(...direction).transformDirection(state.camera.matrixWorldInverse);
      const point = endpoint(stage, letter);
      expect(point.x).toBeCloseTo(56 + projected.x * 37, 2);
      expect(point.y).toBeCloseTo(56 - projected.y * 37, 2);
      const line = stage.querySelector(`[data-brainatlas-orientation-line="${letter}"]`);
      expect(Number(line.getAttribute('x2'))).toBe(point.x);
      expect(Number(line.getAttribute('y2'))).toBe(point.y);
      expect(line.dataset.facing).toBe(point.element.dataset.facing);
      before[letter] = [point.x, point.y];
    }
    state.camera.position.set(-12, 8, 7);
    state.controls.target.set(-4, 2, .7);
    state.camera.zoom = 2.3;
    state.camera.updateProjectionMatrix();
    state.requestRender();
    drawRequestedFrame();
    for (const letter of Object.keys(directions)) {
      const point = endpoint(stage, letter);
      expect([point.x, point.y]).toEqual(before[letter]);
    }
  });

  it('updates in a coalesced requested frame only, and hides on cleanup without adding an idle loop', async () => {
    const { state, stage } = await mountScene();
    const update = vi.spyOn(state, 'updateOrientation');
    const compass = stage.querySelector('[data-brainatlas-orientation]');
    expect(compass.dataset.ready).toBe('false');
    state.requestRender();
    state.requestRender();
    expect(frames.size).toBe(1);
    expect(update).not.toHaveBeenCalled();
    drawRequestedFrame();
    expect(update).toHaveBeenCalledTimes(1);
    expect(state.renderer.render).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    state.requestRender();
    state.cleanup();
    expect(compass.dataset.ready).toBe('false');
    expect(state.orientation).toBeNull();
    drawRequestedFrame();
    expect(state.renderer.render).toHaveBeenCalledTimes(1);
    expect(state.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it('keeps orientation hidden before model readiness and after a model-load failure', async () => {
    const { state, stage, fail } = await mountScene({ deferred: true });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    drawRequestedFrame();
    expect(stage.querySelector('[data-brainatlas-orientation]').dataset.ready).toBe('false');
    fail(new Error('Offline model fixture'));
    expect(state.ready).toBe(false);
    expect(stage.querySelector('[data-brainatlas-orientation]').dataset.ready).toBe('false');
    expect(errors).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it('still renders when a host has no compass markup', async () => {
    const { state } = await mountScene({ compass: false });
    expect(() => drawRequestedFrame()).not.toThrow();
    expect(state.renderer.render).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it.each([
    ['sagittal', 'x', 'L', 'R'],
    ['coronal', 'z', 'P', 'A'],
    ['axial', 'y', 'I', 'S']
  ])('matches %s cutaway endpoint labels to the actual numeric clipping coordinates', async (axis, coordinate, start, end) => {
    const { state, tool, store } = await mountScene();
    store.toolData.brainAtlas.brain3DSliceAxis = axis;
    const nodes = flatten(tool.render(makeCtx({}, store)));
    const navigator = nodes.find(node => node.props?.className === 'brainatlas-3d-slice-map');
    const labels = flatten(navigator).filter(node => node.type === 'text').map(node => node.props.children);
    expect(labels).toEqual([start, end]);
    state.sliceAxis = axis;
    for (const [depth, side] of [[0, 'min'], [100, 'max']]) {
      state.slicePosition = depth;
      for (const flipped of [false, true]) {
        state.sliceFlip = flipped;
        state.updateSlicePlane();
        const point = new THREE.Vector3();
        point[coordinate] = state.modelBounds[side][coordinate];
        expect(state.clipPlane.distanceToPoint(point)).toBeCloseTo(0, 10);
      }
    }
  });
});

it('confirms compass world-axis signs against multiple landmarks in the shipped atlas asset', () => {
  const data = readFileSync('stem_lab/assets/brainatlas/alloflow-brain-atlas-meshopt.glb');
  const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
  const centers = new Map();
  function visit(index, parent) {
    const node = gltf.nodes[index];
    const local = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
      new THREE.Vector3(...(node.translation || [0, 0, 0])),
      new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1])),
      new THREE.Vector3(...(node.scale || [1, 1, 1]))
    );
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      const bounds = new THREE.Box3();
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        const position = gltf.accessors[primitive.attributes.POSITION];
        const divisor = position.normalized ? ({ 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[position.componentType] || 1) : 1;
        const decode = values => values.map(value => position.normalized && [5120, 5122].includes(position.componentType) ? Math.max(-1, value / divisor) : value / divisor);
        bounds.union(new THREE.Box3(new THREE.Vector3(...decode(position.min)), new THREE.Vector3(...decode(position.max))).applyMatrix4(world));
      }
      centers.set(node.name, bounds.getCenter(new THREE.Vector3()));
    }
    for (const child of node.children || []) visit(child, world);
  }
  for (const node of gltf.scenes[gltf.scene || 0].nodes) visit(node, new THREE.Matrix4());
  for (const structure of ['precentral_gyrus', 'superior_frontal_gyrus', 'body_of_hippocampus']) {
    expect(centers.get(`Allen_${structure}_R`).x).toBeGreaterThan(centers.get(`Allen_${structure}_L`).x);
  }
  for (const hemisphere of ['L', 'R']) {
    expect(centers.get(`Allen_superior_frontal_gyrus_${hemisphere}`).y).toBeGreaterThan(centers.get(`Allen_pyramidal_part_of_medulla_oblongata_${hemisphere}`).y);
    for (const anterior of ['middle_frontal_gyrus', 'lateral_orbital_gyrus', 'olfactory_bulb']) {
      expect(centers.get(`Allen_${anterior}_${hemisphere}`).z).toBeGreaterThan(centers.get(`Allen_occipital_pole_${hemisphere}`).z);
    }
  }
});

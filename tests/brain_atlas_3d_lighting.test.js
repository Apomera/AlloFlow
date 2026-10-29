import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const flatten = node => !node || typeof node !== 'object' ? [] : (Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]);
let frames;
let nextFrame;
let activeState;

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
  vi.unstubAllGlobals();
});

function drawRequestedFrame() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(0));
}

async function mountScene() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const positions = geometry.attributes.position.array.slice();
  const normals = geometry.attributes.normal;
  const originalMaterial = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, originalMaterial);
  mesh.name = 'Allen_precentral_gyrus_L';
  const root = new THREE.Group();
  root.add(mesh);

  // Keep actual THREE scene, camera, materials, lights, and matrix transforms.
  // Only the GPU boundary, pointer controls, and network model load are stubbed.
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
    load(url, onLoad) { onLoad({ scene: root }); }
  }
  window.__alloBrainAtlas3DDependencies = Promise.resolve({
    THREE: { ...THREE, WebGLRenderer: Renderer, OrbitControls: Controls, GLTFLoader: Loader },
    MeshoptDecoder: {}
  });
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d' } });
  const nodes = flatten(tool.render(makeCtx({}, store)));
  const canvasNode = nodes.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true');
  const stage = document.createElement('div');
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  document.body.appendChild(stage);
  canvasNode.ref(canvas);
  await Promise.resolve();
  activeState = canvas._brain3DState;
  expect(activeState.ready).toBe(true);
  originalMaterial.dispose();
  return { state: activeState, geometry, positions, normals };
}

function viewDirection(light, camera) {
  return light.getWorldPosition(new THREE.Vector3())
    .sub(light.target.getWorldPosition(new THREE.Vector3()))
    .normalize().transformDirection(camera.matrixWorldInverse);
}

describe('Brain Atlas lighting during navigation', () => {
  it('keeps directional lighting fixed relative to every viewing angle and moved focus', async () => {
    const { state } = await mountScene();
    drawRequestedFrame();
    const lights = [];
    state.scene.traverse(object => { if (object.isLight) lights.push(object); });
    expect(lights).toHaveLength(4);
    const directions = lights.filter(light => light.isDirectionalLight);
    expect(directions).toHaveLength(3);
    expect(lights.find(light => light.isHemisphereLight).parent).toBe(state.scene);
    const initial = directions.map(light => viewDirection(light, state.camera));
    const originalWorld = directions[0].getWorldPosition(new THREE.Vector3());

    for (const preset of ['medial', 'front', 'top', 'bottom', 'lateral']) {
      state.setPreset(preset, false);
      drawRequestedFrame();
      directions.forEach((light, index) => {
        expect(light.parent).toBe(state.camera);
        expect(light.target.parent).toBe(state.camera);
        expect(viewDirection(light, state.camera).distanceTo(initial[index])).toBeLessThan(1e-10);
      });
      if (preset === 'medial') expect(directions[0].getWorldPosition(new THREE.Vector3()).distanceTo(originalWorld)).toBeGreaterThan(1);
    }
    state.camera.position.set(3, 4, 5);
    state.controls.target.set(-.7, .3, .9);
    state.camera.lookAt(state.controls.target);
    state.requestRender();
    drawRequestedFrame();
    directions.forEach((light, index) => expect(viewDirection(light, state.camera).distanceTo(initial[index])).toBeLessThan(1e-10));
  });

  it('preserves imported geometry and coalesces rendering without an idle animation loop', async () => {
    const { state, geometry, positions, normals } = await mountScene();
    expect(geometry.attributes.normal).toBe(normals);
    expect(geometry.attributes.position.array).toEqual(positions);
    expect(state.meshes[0].material.flatShading).toBe(false);
    expect(frames.size).toBe(1);
    state.requestRender();
    state.requestRender();
    expect(frames.size).toBe(1);
    drawRequestedFrame();
    expect(state.renderer.render).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    state.requestRender();
    state.cleanup();
    drawRequestedFrame();
    expect(state.renderer.render).toHaveBeenCalledTimes(1);
    expect(state.renderer.dispose).toHaveBeenCalledTimes(1);
  });
});

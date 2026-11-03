import { createRequire } from 'node:module';
import { vi } from 'vitest';
import { loadTool, makeCtx, newStore } from './stem_widgets_smoke_harness.js';

export const THREE = createRequire(import.meta.url)('../../vendor/three-r128/three.min.js');
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

// Mount the production renderer entry point. Keep THREE's real camera, matrices,
// meshes and materials while replacing the GPU boundary and network model loader.
export async function mountBrainAtlasScene(root, { width = 800, height = 620, initialState = {} } = {}) {
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
    load(url, onLoad) { onLoad({ scene: root }); }
  }
  window.__alloBrainAtlas3DDependencies = Promise.resolve({
    THREE: { ...THREE, WebGLRenderer: Renderer, OrbitControls: Controls, GLTFLoader: Loader },
    MeshoptDecoder: {}
  });
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', ...initialState } });
  const nodes = () => flatten(tool.render(makeCtx({}, store)));
  const stage = document.createElement('div');
  Object.defineProperties(stage, { clientWidth: { value: width }, clientHeight: { value: height } });
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  document.body.appendChild(stage);
  nodes().find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(canvas);
  await Promise.resolve();
  return { state: canvas._brain3DState, canvas, nodes, store };
}

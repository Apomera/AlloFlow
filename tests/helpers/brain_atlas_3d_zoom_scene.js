import { createRequire } from 'node:module';
import { vi } from 'vitest';
import { loadTool, makeCtx, newStore, React, ReactDOMClient } from './stem_widgets_smoke_harness.js';

export const THREE = createRequire(import.meta.url)('../../vendor/three-r128/three.min.js');
export const SELECTED = 'Allen_body_of_hippocampus_L';
export const NEIGHBOR = 'Allen_precentral_gyrus_R';
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

// Real cameras, geometry and production React handlers; only GPU/network boundaries are replaced.
export async function mountZoomScene({ initialState = {}, context = {}, deferred = false, width = 600, height = 420 } = {}) {
  const model = new THREE.Group();
  for (const [name, x] of [[SELECTED, -.8], [NEIGHBOR, .8]]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.65, .55, .4));
    mesh.name = name; mesh.position.set(x, .15, .1); model.add(mesh);
  }
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
    dispose = vi.fn();
  }
  let resolveModel, rejectModel;
  class Loader {
    setMeshoptDecoder() {}
    load(url, onLoad, progress, onError) {
      resolveModel = () => onLoad({ scene: model });
      rejectModel = () => onError(new Error('Synthetic model failure'));
      if (!deferred) resolveModel();
    }
  }
  window.__alloBrainAtlas3DDependencies = Promise.resolve({
    THREE: { ...THREE, WebGLRenderer: Renderer, OrbitControls: Controls, GLTFLoader: Loader }, MeshoptDecoder: {}
  });
  const sourcePath = 'stem_lab/stem_tool_brainatlas.js';
  const tool = loadTool(sourcePath, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', ...initialState } });
  const nodes = () => flatten(tool.render(makeCtx(context, store)));
  const host = document.createElement('div'); document.body.appendChild(host);
  const mainRoot = ReactDOMClient.createRoot(host);
  const stage = document.createElement('div');
  Object.defineProperties(stage, { clientWidth: { value: width }, clientHeight: { value: height } });
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 20, width, height });
  const canvas = document.createElement('canvas'); stage.appendChild(canvas);
  const overlayHost = document.createElement('div'); stage.appendChild(overlayHost);
  const overlayRoot = ReactDOMClient.createRoot(overlayHost);
  const attachStage = mount => { if (mount && stage.parentNode !== mount) mount.appendChild(stage); };
  const attributes = ['data-brainatlas-selected-marker', 'data-brainatlas-hover-label', 'data-brainatlas-pathway-marker'];
  let state;
  const refresh = async (updates = {}) => {
    Object.assign(store.toolData.brainAtlas, updates);
    const tree = nodes();
    const canvasNode = tree.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true');
    canvas.id = canvasNode.props.id; canvas.tabIndex = canvasNode.props.tabIndex;
    const overlays = attributes.map(attribute => {
      const node = tree.find(node => node.props?.[attribute] !== undefined);
      return node ? React.cloneElement(node, { key: attribute }) : null;
    });
    const loading = tree.find(node => node.props?.className === 'brainatlas-3d-loading');
    if (loading) overlays.push(React.cloneElement(loading, { key: 'loading' }));
    await React.act(async () => {
      mainRoot.render(React.createElement('div', { className: 'brainatlas-tool-shell' },
        React.createElement('div', { className: 'brainatlas-canvas-shell' },
          tree.find(node => node.props?.className === 'brainatlas-canvas-header'),
          tree.find(node => node.props?.['data-brainatlas-3d-controls'] === 'true'),
          tree.find(node => node.props?.className === 'brainatlas-3d-model-meta'),
          React.createElement('div', { ref: attachStage }))));
      overlayRoot.render(React.createElement(React.Fragment, null, ...overlays));
    });
    for (const element of overlayHost.querySelectorAll('[data-brainatlas-selected-marker-badge], [data-brainatlas-pathway-marker-badge], [data-brainatlas-hover-label]')) {
      Object.defineProperties(element, { offsetWidth: { configurable: true, get: () => 180 }, offsetHeight: { configurable: true, get: () => 60 } });
    }
    canvasNode.ref(canvas);
    await Promise.resolve();
    state = canvas._brain3DState;
    return tree;
  };
  await refresh();
  await refresh();
  return {
    state, canvas, stage, host, store, nodes, refresh,
    button: direction => host.querySelector('[data-brainatlas-3d-zoom="' + direction + '"]'),
    click: async direction => { await React.act(async () => host.querySelector('[data-brainatlas-3d-zoom="' + direction + '"]').click()); },
    resolveModel: async () => { await React.act(async () => resolveModel()); await refresh(); },
    rejectModel: async () => { await React.act(async () => rejectModel()); },
    cleanup: async () => {
      state?.cleanup();
      await React.act(async () => { overlayRoot.unmount(); mainRoot.unmount(); });
      host.remove();
    }
  };
}

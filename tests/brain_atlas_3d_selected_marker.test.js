import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStemLab, loadTool, makeCtx, newStore, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { THREE } from './helpers/brain_atlas_3d_scene.js';
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

async function mountSelectedScene(model, initialState = {}, context = {}) {
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
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', ...initialState } });
  const nodes = () => flatten(tool.render(makeCtx(context, store)));
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
  const attributes = ['data-brainatlas-selected-marker', 'data-brainatlas-hover-label', 'data-brainatlas-pathway-marker'];
  const refresh = async updates => {
    Object.assign(store.toolData.brainAtlas, updates);
    const tree = nodes();
    tree.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(canvas);
    const overlays = attributes.map(attribute => {
      const element = tree.find(node => node.props?.[attribute] !== undefined);
      return element ? React.cloneElement(element, { key: attribute }) : null;
    });
    await React.act(async () => overlayRoot.render(React.createElement(React.Fragment, null, ...overlays)));
    for (const element of overlayHost.querySelectorAll('[data-brainatlas-selected-marker-badge], [data-brainatlas-pathway-marker-badge], [data-brainatlas-hover-label]')) {
      Object.defineProperties(element, {
        offsetWidth: { configurable: true, get: () => 180 },
        offsetHeight: { configurable: true, get: () => 60 }
      });
    }
    return tree;
  };
  await refresh({});
  return {
    state, canvas, stage, rect, store, nodes, refresh,
    unmount: async () => { state.cleanup(); await React.act(async () => overlayRoot.unmount()); stage.remove(); }
  };
}




const A = 'Allen_precentral_gyrus_L';
const B = 'Allen_amygdaloid_complex_R';
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
async function mount(initial = {}, context = {}) {
  const model = new THREE.Group();
  triangle(model, A, [-2.5, 0, 0, -2.2, .3, .15, -2.3, -.1, .03]);
  triangle(model, A, [-.75, 0, 0, -.55, .55, .2, -.35, -.3, -.12]);
  triangle(model, B, [.5, .1, -.15, .8, .65, .2, .95, -.3, -.12]);
  scene = await mountSelectedScene(model, { selected3DStructure: A, ...initial }, context);
  expect(scene.state.ready).toBe(true);
  scene.state.camera.position.set(0, 0, 6);
  scene.state.controls.target.set(0, 0, 0);
  scene.state.controls.update();
  scene.state.requestRender();
  draw();
  return scene;
}
function marker() {
  const overlay = scene.stage.querySelector('[data-brainatlas-selected-marker]');
  const badge = overlay?.querySelector('[data-brainatlas-selected-marker-badge]');
  const line = overlay?.querySelector('[data-brainatlas-selected-marker-leader]');
  const dot = overlay?.querySelector('[data-brainatlas-selected-marker-anchor]');
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
  const ndc = point.clone().project(scene.state.camera);
  return [(ndc.x + 1) * scene.stage.clientWidth / 2, (1 - ndc.y) * scene.stage.clientHeight / 2];
}
function anchorVertex(key) {
  const current = marker();
  expect(current.hidden).toBe(false);
  expect(current.badge.getAttribute('data-structure')).toBe(key);
  const vertex = points(key).find(point => {
    const pixel = project(point);
    return Math.hypot(pixel[0] - current.anchor[0], pixel[1] - current.anchor[1]) < .0001;
  });
  expect(vertex, 'The marker must attach to an actual vertex of the selected anatomy').toBeDefined();
  return vertex;
}

describe('Candidate Brain Atlas selected anatomy locator', () => {
  it('attaches to a real vertex across multiple pieces, renders the selected name and preserves translated text', async () => {
    await mount({}, { t: key => key === 'stem.brainatlas.d3_selected_structure' ? 'Elegido' : key });
    anchorVertex(A);
    const current = marker();
    expect(current.badge.querySelector('small').textContent).toBe('Elegido');
    expect(current.badge.querySelector('strong').textContent).toBe('Precentral Gyrus (left)');
    expect(current.overlay.getAttribute('aria-hidden')).toBe('true');
    expect(current.overlay.querySelector('button, a, [tabindex], [aria-live]')).toBeNull();
    const matrices = scene.state.meshes.map(mesh => mesh.matrixWorld.toArray());
    const positions = scene.state.meshes.map(mesh => Array.from(mesh.geometry.attributes.position.array));
    scene.state.updateSelectedMarker();
    expect(scene.state.meshes.map(mesh => mesh.matrixWorld.toArray())).toEqual(matrices);
    expect(scene.state.meshes.map(mesh => Array.from(mesh.geometry.attributes.position.array))).toEqual(positions);
  });

  it('projects the cached anchor on orbit and scroll without rescanning geometry or starting an idle loop', async () => {
    await mount();
    const anchor = anchorVertex(A);
    const scans = scene.state.meshes.filter(mesh => mesh.name === A).map(mesh => vi.spyOn(mesh.geometry.attributes.position, 'getX'));
    scene.state.camera.position.set(1.2, 1.4, 4.2);
    scene.state.controls.update();
    scene.state.requestRender();
    scene.state.requestRender();
    expect(frames.size).toBe(1);
    draw();
    const expected = project(anchor);
    expect(marker().anchor[0]).toBeCloseTo(expected[0], 6);
    expect(marker().anchor[1]).toBeCloseTo(expected[1], 6);
    await scene.refresh({});
    draw();
    scans.forEach(scan => expect(scan).not.toHaveBeenCalled());
    const renders = scene.state.renderer.render.mock.calls.length;
    scene.rect.top = window.innerHeight - 230;
    window.dispatchEvent(new Event('scroll'));
    const current = marker();
    expect(current.hidden).toBe(false);
    const x = parseFloat(current.badge.style.left), y = parseFloat(current.badge.style.top);
    expect(x).toBeGreaterThanOrEqual(10);
    expect(x + current.badge.offsetWidth).toBeLessThanOrEqual(scene.stage.clientWidth - 10);
    expect(y).toBeGreaterThanOrEqual(10);
    expect(y + current.badge.offsetHeight + scene.rect.top).toBeLessThanOrEqual(window.innerHeight - 10);
    expect(scene.state.renderer.render).toHaveBeenCalledTimes(renders);
    expect(frames.size).toBe(0);
  });

  it('places the badge above the selected bounds, or below when top space is insufficient, while retaining its surface anchor', async () => {
    await mount();
    const anchor = anchorVertex(A);
    const bounds = new THREE.Box3();
    scene.state.meshes.filter(mesh => mesh.name === A).forEach(mesh => bounds.union(new THREE.Box3().setFromObject(mesh)));
    for (const [cameraY, side] of [[0, 'above'], [-1.2, 'below']]) {
      scene.state.camera.position.set(0, cameraY, 6);
      scene.state.controls.target.set(0, cameraY, 0);
      scene.state.controls.update();
      scene.state.requestRender();
      draw();
      const corners = [];
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        corners.push(project(new THREE.Vector3(x, y, z)));
      }
      const top = Math.min(...corners.map(point => point[1]));
      const bottom = Math.max(...corners.map(point => point[1]));
      const current = marker();
      expect(current.hidden).toBe(false);
      const badgeTop = parseFloat(current.badge.style.top);
      const badgeBottom = badgeTop + current.badge.offsetHeight;
      if (side === 'above') {
        expect(top - 14 - current.badge.offsetHeight).toBeGreaterThanOrEqual(10);
        expect(badgeBottom).toBeLessThanOrEqual(top - 14 + .000001);
      } else {
        expect(top - 14 - current.badge.offsetHeight).toBeLessThan(10);
        expect(bottom + 14 + current.badge.offsetHeight).toBeLessThanOrEqual(scene.stage.clientHeight - 10);
        expect(badgeTop).toBeGreaterThanOrEqual(bottom + 14 - .000001);
      }
      const expected = project(anchor);
      expect(current.anchor[0]).toBeCloseTo(expected[0], 6);
      expect(current.anchor[1]).toBeCloseTo(expected[1], 6);
      expect(Number(current.line.getAttribute('x1'))).toBeCloseTo(expected[0], 6);
      expect(Number(current.line.getAttribute('y1'))).toBeCloseTo(expected[1], 6);
    }
  });

  it('replaces both name and anatomical anchor when selection changes and follows the actual Clear handler', async () => {
    await mount();
    anchorVertex(A);
    await scene.refresh({ selected3DStructure: B });
    draw();
    anchorVertex(B);
    expect(marker().badge.querySelector('strong').textContent).toBe('Amygdaloid Complex (right)');
    const old = marker();
    const button = scene.nodes().find(node => node.props?.['data-brainatlas-clear-selection'] !== undefined);
    expect(button).toBeDefined();
    button.props.onClick();
    await scene.refresh({});
    draw();
    expect(scene.state.selectedStructure).toBe('');
    expect(marker().hidden).toBe(true);
    expect(old.badge.hidden || !old.badge.isConnected).toBe(true);
  });

  it('hides missing or layer-excluded anatomy and anchors to the retained portion of a partial cut', async () => {
    await mount();
    await scene.refresh({ brain3DLayer: 'right' });
    draw();
    expect(marker().hidden).toBe(true);
    await scene.refresh({ brain3DLayer: 'all', selected3DStructure: 'Allen_missing_structure_L' });
    draw();
    expect(marker().hidden).toBe(true);
    await scene.refresh({ selected3DStructure: A });
    draw();
    const original = anchorVertex(A);
    const maxX = Math.max(...points(A).map(point => point.x));
    const range = scene.state.modelBounds;
    const depth = coordinate => (coordinate - range.min.x) * 100 / (range.max.x - range.min.x);
    await scene.refresh({ brain3DSliceAxis: 'sagittal', brain3DSlicePosition: depth((original.x + maxX) / 2) });
    draw();
    const retained = anchorVertex(A);
    expect(scene.state.clipPlane.distanceToPoint(original)).toBeLessThan(0);
    expect(scene.state.clipPlane.distanceToPoint(retained)).toBeGreaterThanOrEqual(-.000001);
    await scene.refresh({ brain3DSlicePosition: Math.min(100, Math.ceil(depth(maxX)) + 1) });
    draw();
    expect(marker().hidden).toBe(true);
    await scene.refresh({ brain3DSliceFlip: true });
    draw();
    expect(scene.state.clipPlane.distanceToPoint(anchorVertex(A))).toBeGreaterThanOrEqual(-.000001);
  });

  it('hides offscreen, behind-camera and insufficiently visible stage placements', async () => {
    await mount();
    for (const [position, target] of [[[8, 0, 3], [8, 0, 0]], [[0, 0, -4], [0, 0, -6]]]) {
      scene.state.camera.position.fromArray(position);
      scene.state.controls.target.fromArray(target);
      scene.state.controls.update();
      scene.state.requestRender();
      draw();
      expect(marker().hidden).toBe(true);
    }
    scene.state.camera.position.set(0, 0, 6);
    scene.state.controls.target.set(0, 0, 0);
    scene.state.controls.update();
    scene.state.requestRender();
    draw();
    expect(marker().hidden).toBe(false);
    scene.rect.top = window.innerHeight - 60;
    window.dispatchEvent(new Event('scroll'));
    expect(marker().hidden).toBe(true);
    scene.rect.top = 40;
    window.dispatchEvent(new Event('scroll'));
    expect(marker().hidden).toBe(false);
    expect(frames.size).toBe(0);
  });

  it('lets a hover preview take priority and restores the selected label when the pointer leaves', async () => {
    await mount();
    for (const key of [A, B]) {
      scene.state.setHover(key, { x: 270, y: 180 });
      draw();
      expect(scene.state.hoveredStructure).toBe(key);
      expect(marker().hidden).toBe(true);
      const hover = scene.stage.querySelector('[data-brainatlas-hover-label]');
      expect(hover.hidden).toBe(false);
      scene.state.cancelHover();
      draw();
      expect(hover.hidden).toBe(true);
      expect(marker().hidden).toBe(false);
      expect(marker().badge.getAttribute('data-structure')).toBe(A);
    }
  });

  it.each([
    ['2D quiz', { quizMode: true }],
    ['Find It', { brain3DChallengeActive: true }],
    ['saved quiz', { brain3DSavedQuizActive: true }],
    ['comparison', { brain3DCompareActive: true }],
    ['pathway', { brain3DPathway: 'motor' }]
  ])('gives %s priority over the normal selection label', async (name, mode) => {
    await mount();
    const old = marker();
    const tree = await scene.refresh(mode);
    draw();
    expect(tree.some(node => node.props?.['data-brainatlas-selected-marker'] !== undefined)).toBe(false);
    expect(marker().hidden).toBe(true);
    expect(old.badge.hidden || !old.badge.isConnected).toBe(true);
    if (name === 'pathway') {
      expect(scene.stage.querySelector('[data-brainatlas-pathway-marker-badge]').hidden).toBe(false);
      expect(scene.state.pathwaySlots[0].key).toBe(A);
    }
    await scene.refresh({ quizMode: false, brain3DChallengeActive: false, brain3DSavedQuizActive: false, brain3DCompareActive: false, brain3DPathway: 'off' });
    draw();
    anchorVertex(A);
  });

  it('updates during reveal frames and clears its DOM and frame work when the renderer is disposed', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    await mount();
    const anchor = anchorVertex(A);
    const original = marker().anchor;
    const started = performance.now();
    expect(scene.state.revealStructure(A, null, false, true)).toBe(true);
    const tween = frames.get(scene.state.cameraTween);
    expect(tween).toBeTypeOf('function');
    frames.delete(scene.state.cameraTween);
    tween(started + 180);
    const expected = project(anchor);
    const current = marker();
    expect(current.hidden).toBe(false);
    expect(current.anchor[0]).toBeCloseTo(expected[0], 6);
    expect(current.anchor[1]).toBeCloseTo(expected[1], 6);
    expect(Math.hypot(current.anchor[0] - original[0], current.anchor[1] - original[1])).toBeGreaterThan(1);
    scene.state.cleanup();
    expect(current.badge.hidden).toBe(true);
    expect(current.line.hasAttribute('hidden')).toBe(true);
    expect(current.dot.hasAttribute('hidden')).toBe(true);
    expect(scene.state.selectedMarker).toBeNull();
    expect(scene.state.renderer.dispose).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });
});

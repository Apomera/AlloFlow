import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const key = 'Allen_precentral_gyrus_L';
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
let state, frames;

beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  frames = new Map();
  let next = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++next, callback); return next; });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
});

afterEach(() => {
  state?.cleanup();
  state = null;
  for (const name of Object.keys(window).filter(name => name.startsWith('__alloBrainAtlas3D'))) delete window[name];
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllTimers();
  vi.useRealTimers();
});

function draw() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(0));
}

async function setup(extra = {}) {
  class Controls extends THREE.EventDispatcher { target = new THREE.Vector3(); update() {} dispose() {} }
  class Renderer { setClearColor() {} setPixelRatio() {} setSize() {} dispose() {} render(scene) { scene.updateMatrixWorld(true); } }
  class Loader {
    setMeshoptDecoder() {}
    load(url, onLoad) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      mesh.name = key;
      const root = new THREE.Group();
      root.add(mesh);
      onLoad({ scene: root });
    }
  }
  window.__alloBrainAtlas3DDependencies = Promise.resolve({ THREE: { ...THREE, WebGLRenderer: Renderer, OrbitControls: Controls, GLTFLoader: Loader }, MeshoptDecoder: {} });
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', ...extra } });
  const nodes = () => flatten(tool.render(makeCtx({}, store)));
  const initial = nodes();
  const shell = document.createElement('div');
  shell.className = 'brainatlas-canvas-shell';
  shell.innerHTML = ReactDOMServer.renderToStaticMarkup(initial.find(node => node.props?.className === 'brainatlas-3d-model-meta')) + ReactDOMServer.renderToStaticMarkup(initial.find(node => node.props?.['data-brainatlas-3d-stage'] === 'true'));
  document.body.appendChild(shell);
  const canvas = shell.querySelector('canvas');
  const stage = canvas.parentNode;
  const bounds = { left: 100, top: 50, width: 480, height: 400 };
  vi.spyOn(stage, 'getBoundingClientRect').mockImplementation(() => bounds);
  vi.spyOn(canvas, 'getBoundingClientRect').mockImplementation(() => bounds);
  const label = stage.querySelector('[data-brainatlas-hover-label]');
  if (label) {
    Object.defineProperty(label, 'offsetWidth', { get: () => 140 });
    Object.defineProperty(label, 'offsetHeight', { get: () => 50 });
  }
  initial.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(canvas);
  await Promise.resolve();
  state = canvas._brain3DState;
  expect(state.ready).toBe(true);
  draw();
  const refresh = overrides => {
    Object.assign(store.toolData.brainAtlas, overrides);
    const tree = nodes();
    tree.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(canvas);
    return tree;
  };
  const move = (x, y, pointerType = 'mouse', buttons = 0) => state.onPointerMove({ clientX: x, clientY: y, pointerType, buttons });
  const hover = (...args) => { move(...args); vi.advanceTimersByTime(120); };
  return { canvas, label, bounds, store, refresh, move, hover, readout: shell.querySelector('[data-brainatlas-3d-structure-readout]') };
}

describe('Brain Atlas 3D hover identification', () => {
  it('uses the sampled mesh name and family, following the same key without redrawing the model', async () => {
    const s = await setup();
    const appearance = vi.spyOn(state, 'applyAppearance');
    expect(s.label.hidden).toBe(true);
    s.hover(340, 250);
    expect(s.label.hidden).toBe(false);
    expect(s.label.getAttribute('aria-hidden')).toBe('true');
    expect(s.label.querySelector('[data-brainatlas-hover-name]').textContent).toMatch(/precentral gyrus.*left/i);
    expect(s.label.querySelector('[data-brainatlas-hover-family]').textContent).toBeTruthy();
    expect(s.readout.dataset.brainatlasPreviewMode).toBe('hover');
    expect(appearance).toHaveBeenCalledOnce();
    const left = parseFloat(s.label.style.left);
    draw();
    s.hover(350, 255);
    expect(parseFloat(s.label.style.left)).toBe(left + 10);
    expect(appearance).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    s.hover(101, 51);
    expect(s.label.hidden).toBe(true);
    expect(state.hoveredStructure).toBe('');
  });

  it.each([
    ['stage corner', 100, 50, 575, 446],
    ['window bottom', 100, 670, 340, 760],
    ['partially offscreen left', -120, 50, 3, 250]
  ])('fits the label in the visible stage at the %s and puts its marker on the sample', async (name, left, top, x, y) => {
    const s = await setup();
    Object.assign(s.bounds, { left, top });
    vi.spyOn(state, 'pickAt').mockReturnValue({ object: state.meshes[0] });
    s.hover(x, y);
    const px = parseFloat(s.label.style.left);
    const py = parseFloat(s.label.style.top);
    expect(left + px).toBeGreaterThanOrEqual(Math.max(left, 0) + 8);
    expect(top + py).toBeGreaterThanOrEqual(Math.max(top, 0) + 8);
    expect(left + px + s.label.offsetWidth).toBeLessThanOrEqual(Math.min(left + s.bounds.width, window.innerWidth) - 8);
    expect(top + py + s.label.offsetHeight).toBeLessThanOrEqual(Math.min(top + s.bounds.height, window.innerHeight) - 8);
    expect(left + px + parseFloat(s.label.style.getPropertyValue('--ba-hover-hit-x'))).toBe(x);
    expect(top + py + parseFloat(s.label.style.getPropertyValue('--ba-hover-hit-y'))).toBe(y);
  });

  it.each(['brain3DChallengeActive', 'brain3DSavedQuizActive'])('cancels a pending pick and stale names when %s starts and still admits actual answers', async mode => {
    const s = await setup();
    s.hover(340, 250);
    const pick = vi.spyOn(state, 'pickAt');
    s.move(350, 255);
    expect(state.hoverTimer).toBeTruthy();
    const tree = s.refresh({ [mode]: true });
    expect(tree.some(node => node.props?.['data-brainatlas-hover-label'])).toBe(false);
    vi.advanceTimersByTime(240);
    s.hover(340, 250);
    expect(pick).not.toHaveBeenCalled();
    expect(s.label.hidden).toBe(true);
    expect(s.readout.textContent).not.toMatch(/precentral|under pointer/i);
    expect(s.readout.dataset.brainatlasHoveredStructure).toBe('');
    state.onPointerDown({ clientX: 340, clientY: 250 });
    state.onPointerUp({ clientX: 340, clientY: 250 });
    expect(pick).toHaveBeenCalledOnce();
    expect(s.store.toolData.brainAtlas.selected3DStructure).toBe(key);
    s.refresh({ [mode]: false });
    s.hover(340, 250);
    expect(s.label.hidden).toBe(false);
  });

  it('clears the label on camera, scroll, resize, drag, comparison and cleanup without scheduling idle frames', async () => {
    const s = await setup();
    const cancellations = [
      () => state.controls.dispatchEvent({ type: 'change' }),
      () => s.canvas.dispatchEvent(new Event('scroll')),
      () => window.dispatchEvent(new Event('resize')),
      () => { state.onPointerDown({ clientX: 340, clientY: 250 }); state.onPointerUp({ clientX: 360, clientY: 260 }); },
      () => state.onPointerLeave(),
      () => s.refresh({ brain3DCompareActive: true, brain3DCompareStructures: [key] }),
      () => state.cleanup()
    ];
    for (const cancel of cancellations) {
      s.hover(340, 250);
      expect(s.label.hidden).toBe(false);
      s.move(350, 255);
      cancel();
      expect(state.hoverTimer).toBeNull();
      expect(s.label.hidden).toBe(true);
      vi.advanceTimersByTime(240);
      expect(state.hoveredStructure).toBe('');
      draw();
      expect(frames.size).toBe(0);
    }
  });

  it('ignores touch and pressed motion but keeps taps and idle pens available', async () => {
    const s = await setup();
    const pick = vi.spyOn(state, 'pickAt');
    s.hover(340, 250, 'touch');
    s.hover(340, 250, 'pen', 1);
    expect(pick).not.toHaveBeenCalled();
    expect(s.label.hidden).toBe(true);
    s.hover(340, 250, 'pen');
    expect(s.label.hidden).toBe(false);
    state.onPointerDown({ clientX: 340, clientY: 250, pointerType: 'touch' });
    state.onPointerUp({ clientX: 340, clientY: 250, pointerType: 'touch' });
    expect(s.store.toolData.brainAtlas.selected3DStructure).toBe(key);
    expect(s.label.hidden).toBe(true);
  });

  it('dismisses visible hover with Escape inside or outside the canvas, then restores ordinary Escape behavior', async () => {
    const s = await setup({ selected3DStructure: key });
    const escape = element => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    for (const element of [document.body, s.canvas]) {
      s.hover(340, 250);
      escape(element);
      expect(s.label.hidden).toBe(true);
      expect(s.store.toolData.brainAtlas.selected3DStructure).toBe(key);
    }
    escape(s.canvas);
    expect(s.store.toolData.brainAtlas.selected3DStructure).toBe('');
  });
});

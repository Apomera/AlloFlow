import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Real shipped geometry and frame logic; the companion browser review uses
// Chromium WebGL. Count render calls to detect work on an unchanged held scene.
let gl, canvas, scene, renders = 0, frameId = 0, model;
const frames = new Map();
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({
    measureText: text => ({ width: String(text).length * 23 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} })
  }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  window.THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(nextScene, camera) { renders++; scene = nextScene; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  };
  window.StemLab.ensureThree = () => Promise.resolve(window.THREE);
  (0, eval)(fs.readFileSync('stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloVentGL;
});
afterEach(() => { gl?.unmount(); frames.clear(); canvas?.remove(); canvas = scene = null; renders = 0; });
function frame(count = 1) {
  for (let i = 0; i < count; i++) { const pending = [...frames]; frames.clear(); pending.forEach(([, callback]) => callback(performance.now())); }
  expect(gl.debug().state).toBe('ready');
}
async function mount() {
  canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: 358 }); Object.defineProperty(canvas, 'clientHeight', { value: 470 });
  model = { active: true, paused: true, tick: 130, motionClock: 130, dark: false, labels: true, magma: 'andesite' };
  gl.resetView(); gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame(3);
}
function update(patch) { model = { ...model, ...patch }; gl.submit(model); frame(3); }
function particles() {
  const result = []; scene.traverse(node => { if (node.isPoints) result.push({ count: node.geometry.drawRange.count, positions: Array.from(node.geometry.attributes.position.array) }); }); return result;
}
function assertHeld() {
  const before = gl.debug(), pose = gl.getCam(), points = particles(), count = renders;
  frame(1200); expect(renders).toBe(count); expect(gl.debug()).toEqual(before); expect(gl.getCam()).toEqual(pose); expect(particles()).toEqual(points);
}

describe('A held volcano scene stops painting until something changes', () => {
  it('keeps active paused stages and inspection notifications unchanged without extra draws', async () => {
    await mount(); gl.selectAnatomy('chamber'); frame(3);
    const notifications = []; gl.onInspection(value => notifications.push(value)); const before = [...notifications];
    assertHeld(); expect(notifications).toEqual(before);
  });
  it('renders paused view controls and selections, then settles again without advancing the eruption', async () => {
    await mount();
    const controls = [() => gl.nudge(12, 20), () => gl.zoom(0.15), () => gl.setCut(4), () => gl.selectAnatomy('chamber'),
      () => { model = { ...model, dark: true, labels: false }; gl.submit(model); }, () => gl.resetView(),
      () => window.dispatchEvent(new Event('resize'))];
    for (const control of controls) { const count = renders, points = particles(); control(); frame(3); expect(renders).toBeGreaterThan(count); expect(gl.debug().tick).toBe(130); expect(particles()).toEqual(points); assertHeld(); }
    expect(gl.getInspection()).toMatchObject({ id: 'chamber', visible: true });
  });
  it('updates paused stage, composition and lifecycle changes and resumes from the next source tick', async () => {
    await mount(); update({ tick: 520, motionClock: 520, magma: 'rhyolite' });
    expect(gl.debug()).toMatchObject({ phase: 'caldera', fill: 0.55, magma: 'rhyolite' }); expect(gl.debug().summit).toBeLessThan(1); assertHeld();
    update({ tick: 20, motionClock: 20 }); expect(gl.debug()).toMatchObject({ phase: 'pressure', summit: 1 }); expect(gl.debug().fill).toBeCloseTo(0.9); assertHeld();
    update({ active: false, tick: 0, motionClock: 20 }); expect(gl.debug().phase).toBe('repose'); assertHeld();
    update({ active: true, tick: 0, motionClock: 20, magma: 'basalt' }); expect(gl.debug()).toMatchObject({ phase: 'pressure', summit: 1, fill: 0.85 }); assertHeld();
    for (let tick = 1; tick <= 130; tick++) update({ paused: false, tick, motionClock: 20 + tick });
    expect(gl.debug().lava + gl.debug().glow + gl.debug().ash).toBeGreaterThan(0);
    update({ paused: true }); const held = particles(); assertHeld();
    update({ paused: false, tick: 131, motionClock: 151 }); expect(gl.debug().tick).toBe(131); expect(particles()).not.toEqual(held);
  });
});

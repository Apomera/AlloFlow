import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Real shipped Three geometry; only the GPU and 2D text painting are stubbed.
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
let gl, THREE, scene, camera, canvas, frameId = 0;
const frames = new Map();
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({
    measureText: text => ({ width: String(text).length * 23 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} })
  }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
  (0, eval)(read('desktop/web-app/node_modules/react/umd/react.production.min.js'));
  (0, eval)(read('vendor/three-r128/three.min.js'));
  THREE = window.THREE;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(nextScene, nextCamera) { scene = nextScene; camera = nextCamera; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  };
  (0, eval)(read('stem_lab/stem_lab_module.js'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js'));
  gl = window.__alloVentGL;
});
afterEach(() => { gl?.unmount(); frames.clear(); canvas?.remove(); scene = camera = canvas = null; });
function frame() {
  const next = frames.entries().next().value;
  expect(next).toBeTruthy(); frames.delete(next[0]); next[1](performance.now());
  expect(gl.debug().state).toBe('ready');
}
async function mount(width = 352) {
  canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: width }); Object.defineProperty(canvas, 'clientHeight', { value: 470 });
  gl.setCam(-7, -17); gl.setCut(0);
  gl.submit({ active: false, tick: 0, dark: false, labels: true, magma: 'andesite' });
  gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
}
function labels() { return gl.debug().anatomy.filter(label => label.visible).map(label => label.label); }
function assertLayout(width) {
  const rects = gl.debug().labelRects;
  for (let i = 0; i < rects.length; i++) {
    const a = rects[i];
    expect(a.height).toBeGreaterThanOrEqual(18);
    expect(a.x).toBeGreaterThanOrEqual(0); expect(a.y).toBeGreaterThanOrEqual(0);
    expect(a.x + a.width).toBeLessThanOrEqual(width); expect(a.y + a.height).toBeLessThanOrEqual(470);
    for (let j = i + 1; j < rects.length; j++) {
      const b = rects[j];
      const dx = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const dy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      expect(dx > 0.01 && dy > 0.01, `${a.text} overlaps ${b.text}`).toBe(false);
    }
  }
}
describe('Volcano annotations describe the actual retained slice', () => {
  it('restores the starting zoom, pose and exposed slice without restarting the eruption', async () => {
    await mount();
    gl.submit({ active: true, paused: true, tick: 100, motionClock: 100, dark: false, labels: true, magma: 'rhyolite' });
    gl.setCam(-50, 80); gl.zoom(1.2); gl.setCut(null); frame();
    const before = gl.debug();
    gl.resetView(); frame();
    expect(gl.getCam()).toEqual({ rotX: -7, rotY: -17, scale: 1, cut: 0 });
    expect(gl.debug().tick).toBe(before.tick);
    expect(gl.debug().phase).toBe(before.phase);
    expect(gl.debug().magma).toBe(before.magma);
    expect(labels()).toContain('magma chamber');
    assertLayout(352);
  });
  it('hides buried plumbing in a shallow slice and removed anatomy in a deep slice', async () => {
    await mount();
    expect(labels()).toEqual(['vent', 'conduit', 'magma chamber', 'dike', 'sill']);
    for (const label of gl.debug().anatomy.filter(label => label.label !== 'vent')) expect(label.anchor[2]).toBeCloseTo(0);
    gl.setCut(20); frame(); expect(labels()).toEqual(['vent']);
    gl.setCut(-20); frame(); expect(labels()).toEqual([]);
    gl.setCut(null); frame(); expect(labels()).toEqual(['vent']);
    gl.setCut(0); frame(); expect(labels()).toHaveLength(5);
  });
  it('uses geometry intersection rather than a box to label the tapered conduit and changing chamber', async () => {
    await mount();
    gl.setCut(4); frame();
    expect(labels()).toEqual(['vent', 'magma chamber', 'sill']);
    const chamber = gl.debug().anatomy.find(label => label.label === 'magma chamber');
    expect(chamber.anchor[2]).toBeCloseTo(4);
    gl.setCut(2); frame();
    const conduit = gl.debug().anatomy.find(label => label.label === 'conduit');
    expect(conduit.visible).toBe(true); expect(conduit.anchor[2]).toBeCloseTo(2);
    expect(conduit.anchor[1]).toBeLessThan(1); // narrow upper conduit no longer reaches this cut
    gl.setCut(6); frame(); expect(labels()).toContain('magma chamber');
    gl.submit({ active: true, tick: 380, dark: false, labels: true, magma: 'andesite' }); frame();
    expect(labels()).not.toContain('magma chamber'); // drainage shrinks z-radius from7.65 to4.95
  });
  it('keeps rotated phone and desktop labels bounded, separate and attached to their true depths', async () => {
    for (const width of [334, 352, 1100]) {
      if (canvas) { gl.unmount(); canvas.remove(); frames.clear(); }
      await mount(width);
      for (const [rx, ry] of [[-7, -17], [-7, 80], [-40, -70]]) {
        gl.setCam(rx, ry); frame(); assertLayout(width);
        const depthLabels = [];
        scene.traverse(object => { if (object.isSprite && ['surface', '5 km', '10 km'].includes(object.userData.ventLabelText)) depthLabels.push(object); });
        expect(depthLabels).toHaveLength(3);
        depthLabels.forEach(label => {
          const expectedDepth = { surface: 0, '5 km': -12.5, '10 km': -25 }[label.userData.ventLabelText];
          expect(label.userData.ventAnchor[1]).toBe(expectedDepth);
          const line = label.userData.ventLeader.geometry.attributes.position;
          expect(line.getY(1)).toBeCloseTo(expectedDepth);
        });
      }
    }
  });
  it('does not revive a clipped-away vent during eruption frames', async () => {
    await mount(); gl.setCut(-20);
    gl.submit({ active: true, tick: 100, dark: false, labels: true, magma: 'andesite' });
    for (let i = 0; i < 3; i++) { frame(); expect(labels()).not.toContain('vent'); }
  });
});

import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Use the shipped Three geometry. Only the GPU and canvas text painting are
// stubbed here; the companion browser QA renders these contours with WebGL.
let gl, THREE, scene, canvas, frameId = 0, renders = 0;
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
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  THREE = window.THREE;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(nextScene, camera) { renders++; scene = nextScene; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloVentGL;
});
afterEach(() => { gl?.unmount(); frames.clear(); canvas?.remove(); scene = canvas = null; });
function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    const pending = [...frames]; frames.clear();
    for (const [_id, callback] of pending) callback(performance.now());
    expect(gl.debug().state).toBe('ready');
  }
}
async function mount() {
  canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: 358 }); Object.defineProperty(canvas, 'clientHeight', { value: 470 });
  gl.resetView(); gl.submit({ active: false, paused: true, tick: 0, motionClock: 0, dark: false, labels: true, magma: 'andesite' });
  gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame(2);
}
const outline = () => scene.getObjectByName('vent-anatomy-outline');
const marker = () => scene.getObjectByName('vent-anatomy-anchor');
function points() {
  const line = outline(), positions = line.geometry.attributes.position;
  return Array.from({ length: line.geometry.drawRange.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i));
}

describe('Volcano anatomy inspection follows exposed geometry', () => {
  it('outlines both actual dike intersections without moving their rock geometry', async () => {
    await mount(); gl.selectAnatomy('dike'); frame();
    const selection = gl.getInspection(), contour = points();
    expect(selection).toMatchObject({ id: 'dike', visible: true, reason: 'exposed' });
    expect(selection.segments).toBe(contour.length / 2);
    expect(contour.some(point => point.x < 0)).toBe(true); expect(contour.some(point => point.x > 0)).toBe(true);
    const dikes = scene.children.filter(object => object.geometry?.parameters?.width === 1.3);
    expect(dikes).toHaveLength(2);
    for (const point of contour) {
      expect(point.z).toBeCloseTo(0.08, 5); // small render bias in front of the exact cut
      const surfacePoint = point.clone(); surfacePoint.z -= 0.08;
      expect(dikes.some(mesh => {
        const local = mesh.worldToLocal(surfacePoint.clone()), halfY = mesh.geometry.parameters.height / 2;
        return Math.abs(local.x) <= 0.651 && Math.abs(local.y) <= halfY + 0.001 && Math.abs(local.z) <= 3.501 && (Math.abs(Math.abs(local.x) - 0.65) < 0.001 || Math.abs(Math.abs(local.y) - halfY) < 0.001);
      })).toBe(true);
    }
    expect(marker().position.toArray()).toEqual(selection.anchor);
  });
  it('hides buried or removed anatomy without clearing the selection and restores the correct slice contour', async () => {
    await mount(); gl.selectAnatomy('chamber'); frame();
    gl.setCut(null); frame(); expect(gl.getInspection()).toMatchObject({ id: 'chamber', visible: false, reason: 'closed', anchor: null, segments: 0 });
    expect(outline().visible).toBe(false); expect(marker().visible).toBe(false);
    gl.setCut(20); frame(); expect(gl.getInspection().reason).toBe('outside-slice');
    gl.setCut(4); frame(); expect(gl.getInspection().visible).toBe(true);
    points().forEach(point => expect(point.z).toBeCloseTo(4.08, 5));
    expect(gl.getInspection().anchor[2]).toBeCloseTo(4, 5);
  });
  it('marks the retained vent opening and distinguishes a collapsed vent from a slice that misses it', async () => {
    await mount(); gl.selectAnatomy('vent'); frame();
    expect(gl.getInspection()).toMatchObject({ visible: true, reason: 'exposed', segments: 0 });
    expect(marker().visible).toBe(true); expect(outline().visible).toBe(false);
    gl.setCut(-20); frame(); expect(gl.getInspection().reason).toBe('outside-slice');
    gl.setCut(0); gl.submit({ active: true, paused: true, tick: 520, motionClock: 520, dark: false, labels: true, magma: 'rhyolite' }); frame();
    expect(gl.getInspection()).toMatchObject({ visible: false, reason: 'collapsed' });
    expect(marker().visible).toBe(false);
  });
  it('notifies only selection or availability changes, rather than every animation or camera frame', async () => {
    await mount(); const notifications = []; gl.onInspection(value => notifications.push(value));
    gl.selectAnatomy('sill'); frame(); frame(8);
    expect(notifications.map(value => value.reason)).toEqual(['none', 'exposed']);
    gl.setCut(2); gl.setCam(-40, -70); frame(); expect(notifications).toHaveLength(2);
    gl.setCut(20); frame(); expect(notifications.at(-1).reason).toBe('outside-slice');
    gl.setCut(null); frame(); expect(notifications.at(-1).reason).toBe('closed');
    gl.selectAnatomy(null); frame(); expect(notifications.at(-1).reason).toBe('none');
    expect(notifications).toHaveLength(5);
    gl.onInspection(null); gl.selectAnatomy('vent'); frame(); expect(notifications).toHaveLength(5);
  });
  it('reuses GPU resources, preserves model and camera state, and settles back to idle', async () => {
    await mount(); const geometry = outline().geometry, texture = marker().material.map, pose = gl.getCam(), before = gl.debug();
    for (const id of ['chamber', 'sill', 'conduit', 'dike', 'vent', null]) { gl.selectAnatomy(id); frame(); }
    expect(outline().geometry).toBe(geometry); expect(marker().material.map).toBe(texture);
    expect(gl.getCam()).toEqual(pose);
    for (const key of ['tick', 'fill', 'summit', 'ash', 'lava', 'glow', 'flows', 'bubbles']) expect(gl.debug()[key]).toBe(before[key]);
    const count = renders; frame(20); expect(renders).toBe(count);
    gl.selectAnatomy(null); frame(); expect(renders).toBe(count);
  });
  it('keeps a deliberate selection visible when general captions are off and rejects unknown features', async () => {
    await mount(); gl.selectAnatomy('chamber');
    gl.submit({ active: false, paused: true, tick: 0, motionClock: 0, dark: true, labels: false, magma: 'andesite' }); frame();
    expect(gl.getInspection().visible).toBe(true); expect(marker().visible).toBe(true);
    expect(gl.debug().anatomy.some(label => label.visible)).toBe(false);
    expect(gl.selectAnatomy('invented-part')).toBe(false); expect(gl.getInspection().id).toBe('chamber');
    const copy = gl.getInspection(); copy.anchor[0] = 999;
    expect(gl.getInspection().anchor[0]).not.toBe(999);
  });
  it('disposes inspection geometry, materials and texture and clears selection and callback on unmount', async () => {
    await mount(); gl.selectAnatomy('dike'); frame();
    const resources = [outline().geometry, outline().material, marker().material, marker().material.map], disposed = new Set(), notifications = [];
    resources.forEach(resource => resource.addEventListener('dispose', () => disposed.add(resource)));
    gl.onInspection(value => notifications.push(value)); gl.unmount();
    expect(disposed.size).toBe(resources.length); expect(gl.getInspection().id).toBeNull(); expect(frames.size).toBe(0);
    const count = notifications.length; await mount(); gl.selectAnatomy('vent'); frame(); expect(notifications).toHaveLength(count);
  });
});

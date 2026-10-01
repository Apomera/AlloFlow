import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Shipped Three geometry and projection math; only drawing/text painting stubbed.
let THREE, gl, scene, camera, canvas, signature = 0, frameId = 0, renders = 0;
const frames = new Map();
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({ measureText: text => ({ width: String(text).length * 23 }) }, {
    get: (target, key) => key in target ? target[key] : () => ({ addColorStop() {} }),
    set: (target, key, value) => { target[key] = value; return true; }
  });
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  THREE = window.THREE;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(nextScene, nextCamera) { renders++; scene = nextScene; camera = nextCamera; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloTectGL;
});
afterEach(() => { gl?.unmount(); canvas?.remove(); frames.clear(); canvas = scene = camera = null; });
function frame(count = 1) {
  for (let i = 0; i < count; i++) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(performance.now())); }
  expect(gl.debug().state).toBe('ready');
}
async function mount(mode, width) {
  canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: width }); Object.defineProperty(canvas, 'clientHeight', { value: 340 });
  let model = { mode, mountainHeight: 7000, rift: 180, offset: 192, quakes: [], rotX: -67, rotY: 2, scale: 1, cut: 0, showScale: true, surfaceView: false, sig: String(++signature) };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  return next => { model = { ...model, ...next, sig: String(++signature) }; gl.submit(model); frame(); };
}
function arrows() { const found = []; scene.traverse(object => { if (object.userData.feature === 'plate-motion') found.push(object); }); return found; }
function projectedArrow(arrow) {
  // Project actual shaft/cone vertices, independently of the production
  // layout's more conservative world-box projection.
  const points = [];
  arrow.traverse(part => {
    const positions = part.geometry?.attributes.position;
    if (positions) for (let i = 0; i < positions.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld).project(camera);
      points.push({ x: (p.x + 1) * canvas.clientWidth / 2, y: (1 - p.y) * canvas.clientHeight / 2 });
    }
  });
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
function overlaps(a, b) { return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.1; }
function checkLayout() {
  const labels = gl.debug().labelRects, features = labels.filter(label => !['surface', '70 km', '300 km', '700 km'].includes(label.text));
  expect(arrows()).toHaveLength(2); expect(features.length).toBeGreaterThan(0);
  for (const arrow of arrows()) for (const label of features) expect(overlaps(projectedArrow(arrow), label), label.text + ' obscures a motion arrow').toBe(false);
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    expect(label.x).toBeGreaterThanOrEqual(0); expect(label.y).toBeGreaterThanOrEqual(0);
    expect(label.x + label.width).toBeLessThanOrEqual(canvas.clientWidth); expect(label.y + label.height).toBeLessThanOrEqual(canvas.clientHeight);
    for (let j = i + 1; j < labels.length; j++) expect(overlaps(label, labels[j]), label.text + ' overlaps ' + labels[j].text).toBe(false);
  }
}

describe('Plate motion stays visible behind rotated feature labels', () => {
  it.each(['convergent', 'divergent', 'transform'].flatMap(mode => [366, 1076].map(width => [mode, width])))('keeps %s arrows, depth labels and captions separate at %s pixels', async (mode, width) => {
    const update = await mount(mode, width);
    checkLayout();
    for (const [rotX, rotY] of [[-67, 82], [-7, -78], [-37, 42], [-22, -38]]) { update({ rotX, rotY }); checkLayout(); }
  });
  it('moves only captions while preserving anchors and arrow geometry, then remains idle', async () => {
    const update = await mount('convergent', 366), originalArrows = arrows(), builds = gl.debug().geometryBuilds;
    const leaders = [];
    scene.traverse(object => { if (object.isLine && object.renderOrder === 9) leaders.push({ object, target: Array.from(object.geometry.attributes.position.array).slice(0, 3) }); });
    expect(leaders.length).toBeGreaterThan(0);
    update({ rotX: -37, rotY: 42 });
    expect(arrows()).toEqual(originalArrows); expect(gl.debug().geometryBuilds).toBe(builds);
    for (const leader of leaders) expect(Array.from(leader.object.geometry.attributes.position.array).slice(0, 3)).toEqual(leader.target);
    const rendered = renders; frame(20); expect(renders).toBe(rendered);
  });
});

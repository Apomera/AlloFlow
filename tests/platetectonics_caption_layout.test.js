import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// The scene uses shipped Three.js and the actual instanced-marker helper.
// Stub only the GPU renderer and canvas painting; verify painted views in Chromium.
let THREE, gl, place, rendered, frameId = 0, modelId = 0, renderCount = 0;
const frames = new Map(), canvases = [];

beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({
      measureText: text => ({ width: String(text).length * 23 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} })
    }, {
      get: (target, key) => key in target ? target[key] : () => {},
      set: (target, key, value) => { target[key] = value; return true; }
    });
  };
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  THREE = window.THREE;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(scene, camera) {
      renderCount++; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      rendered = { scene, camera };
    }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloTectGL; place = window.__alloTectNearestLabelPlacement;
  expect(gl).toBeTruthy(); expect(place).toBeTypeOf('function');
});

afterEach(() => {
  gl?.unmount(); frames.clear(); rendered = null;
  while (canvases.length) canvases.pop().remove();
  vi.restoreAllMocks();
});

const square = { left: 0, right: 100, top: 0, bottom: 100 };
const obstacle = (x, y, width, height) => ({ x, y, width, height });
function expectLocation(actual, x, y) {
  expect(actual).not.toBeNull(); expect(actual.x).toBeCloseTo(x, 8); expect(actual.y).toBeCloseTo(y, 8);
}

describe('Nearest caption placement in a bounded frame', () => {
  it('retains a free preferred position without mutating inputs', () => {
    const preferred = Object.freeze({ x: 43.125, y: 51.75 }), occupied = Object.freeze([]);
    expect(place(preferred, 30, 20, Object.freeze({ ...square }), occupied, 4)).toEqual(preferred);
  });

  it('clamps an off-frame preference to the legal canvas limits', () => {
    expectLocation(place({ x: -100, y: 300 }, 20, 10, { left: 18, right: 82, top: 13, bottom: 87 }, [], 4), 18, 87);
  });

  it('uses lower y to resolve equally near exits from a centered square', () => {
    expectLocation(place({ x: 50, y: 50 }, 10, 10, square, [obstacle(40, 40, 20, 20)], 4), 50, 31);
  });

  it('moves vertically around a wide, short obstruction', () => {
    expectLocation(place({ x: 50, y: 50 }, 10, 10, square, [obstacle(20, 45, 60, 10)], 4), 50, 36);
  });

  it('moves horizontally around a narrow, tall obstruction and favors lower x', () => {
    expectLocation(place({ x: 50, y: 50 }, 10, 10, square, [obstacle(45, 20, 10, 60)], 4), 36, 50);
  });

  it('leaves a fully blocked row for the nearest legal row', () => {
    expectLocation(place({ x: 50, y: 50 }, 10, 10, square, [obstacle(-10, 40, 120, 20)], 4), 50, 31);
  });

  it('preserves an exact gap-sized corridor between touching forbidden intervals', () => {
    const occupied = [obstacle(0, -10, 41, 120), obstacle(59, -10, 41, 120)];
    expectLocation(place({ x: 51, y: 50 }, 10, 10, square, occupied, 4), 50, 50);
  });

  it('merges truly overlapping exclusions before choosing the closest horizontal exit', () => {
    const occupied = [obstacle(10, -10, 40, 120), obstacle(40, -10, 40, 120)];
    expectLocation(place({ x: 50, y: 50 }, 10, 10, square, occupied, 4), 89, 50);
  });

  it('allows a caption to sit exactly at the requested obstacle gap', () => {
    expectLocation(place({ x: 31, y: 50 }, 10, 10, square, [obstacle(40, 40, 20, 20)], 4), 31, 50);
  });

  it('returns null when every center inside the frame is obstructed', () => {
    expect(place({ x: 50, y: 50 }, 10, 10, { left: 40, right: 60, top: 40, bottom: 60 }, [obstacle(0, 0, 100, 100)], 4)).toBeNull();
  });

  it('finds a nearer corner when either direct axis escape would be farther', () => {
    const occupied = [obstacle(40, 0, 20, 70), obstacle(0, 40, 100, 20)];
    expectLocation(place({ x: 50, y: 50 }, 10, 10, square, occupied, 4), 31, 31);
  });

  it('preserves fractional dimensions and clearance without rounding the nearest exit', () => {
    expectLocation(place({ x: 45.25, y: 45.625 }, 8.5, 6.25, square, [obstacle(40.125, 40.375, 10.25, 10.5)], 3.5), 45.25, 33.75);
  });

  it('keeps a decimal halo boundary legal without pushing a caption to the far frame edge', () => {
    const rect = obstacle(-20, .7511650212109089, 180, 10.4);
    expectLocation(place({ x: 60, y: 23.151165021210907 }, 20, 18,
      { left: 18, right: 102, top: 17, bottom: 282 }, [rect], 4), 60, 24.151165021210907);
  });

  it('chooses the same minimum and tie result regardless of obstacle order', () => {
    const occupied = [obstacle(40, 0, 20, 70), obstacle(0, 40, 100, 20), obstacle(80, 80, 20, 20)];
    const preferred = { x: 50, y: 50 };
    const normal = place(preferred, 10, 10, square, occupied, 4);
    expect(normal).toEqual(place(preferred, 10, 10, square, [...occupied].reverse(), 4));
    expectLocation(normal, 31, 31);
  });
});

function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach(callback => callback(performance.now()));
  }
}
async function mountModel(extra = {}, initialWidth = 300, initialHeight = 340) {
  let width = initialWidth, height = initialHeight, resizeCallback;
  globalThis.ResizeObserver = window.ResizeObserver = class {
    constructor(callback) { resizeCallback = callback; } observe() {} disconnect() {}
  };
  const canvas = document.createElement('canvas'); canvases.push(canvas); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { get: () => width });
  Object.defineProperty(canvas, 'clientHeight', { get: () => height });
  let model = {
    mode: 'convergent', mountainHeight: 3000, rift: 60, offset: 100, quakes: [],
    rotX: 0, rotY: 0, scale: 1, cut: 0, showScale: true, surfaceView: false,
    observationProjection: null, observationSample: null, ...extra, sig: String(++modelId)
  };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  expect(gl.debug().state).toBe('ready'); expect(rendered).toBeTruthy();
  return {
    get model() { return model; }, get scene() { return rendered.scene; }, get camera() { return rendered.camera; },
    get width() { return width; }, get height() { return height; },
    update(patch, cameraOnly = false) {
      model = { ...model, ...patch, sig: cameraOnly ? model.sig : String(++modelId) };
      gl.submit(model); frame();
    },
    resize(nextWidth, nextHeight) { width = nextWidth; height = nextHeight; resizeCallback(); frame(); }
  };
}
function batch(model, name = 'observation-sample-marker-batch') { return model.scene.getObjectByName(name); }
function instanceMatrix(mesh, index) { const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix); return matrix; }
function instancePosition(mesh, index) { return new THREE.Vector3().setFromMatrixPosition(instanceMatrix(mesh, index)).toArray(); }
function expectPoint(actual, expected) {
  expect(actual).toHaveLength(3); actual.forEach((coordinate, index) => expect(coordinate).toBeCloseTo(expected[index], 5));
}
function pixelPoint(model, world) {
  const point = world.clone().project(model.camera);
  return { x: (point.x + 1) * model.width / 2, y: (1 - point.y) * model.height / 2 };
}
function haloRect(model, index) {
  const mesh = batch(model, 'observation-sample-halo-batch'), matrix = instanceMatrix(mesh, index), attribute = mesh.geometry.attributes.position;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (let vertex = 0; vertex < attribute.count; vertex++) {
    const pixel = pixelPoint(model, new THREE.Vector3().fromBufferAttribute(attribute, vertex).applyMatrix4(matrix));
    left = Math.min(left, pixel.x); right = Math.max(right, pixel.x);
    top = Math.min(top, pixel.y); bottom = Math.max(bottom, pixel.y);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}
function overlaps(a, b, epsilon = .01) {
  return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > epsilon &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > epsilon;
}
const fixedDepthNames = new Set(['surface', '70 km', '300 km', '700 km']);
function movableLabels() { return gl.debug().labelRects.filter(label => !fixedDepthNames.has(label.text)); }
function expectSampleClear(model) {
  const core = batch(model);
  for (let index = 0; index < core.count; index++) {
    const marker = haloRect(model, index);
    for (const label of movableLabels()) expect(overlaps(label, marker), label.text + ' covers sample event ' + index).toBe(false);
  }
}
function pointBelowCaption(model, name) {
  const caption = gl.debug().labelRects.find(label => label.text === name); expect(caption).toBeTruthy();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((caption.x + caption.width / 2) / model.width * 2 - 1, 1 - (caption.y + caption.height / 2) / model.height * 2), model.camera);
  const world = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), .04), new THREE.Vector3());
  expect(world).not.toBeNull();
  const point = { x: world.x / .1, z: -world.y / .1 };
  expect(Math.abs(point.x)).toBeLessThan(760); expect(point.z).toBeGreaterThanOrEqual(0); expect(point.z).toBeLessThan(800);
  return { point, caption: { ...caption } };
}
function sample(points, captured = true) { return { points, captured }; }
function retainedRock(model) {
  const slab = model.scene.children.find(child => child.isMesh && child.rotation.z < -.1);
  const mantle = model.scene.children.find(child => child.userData.feature === 'solid-mantle-envelope');
  expect(slab).toBeTruthy(); expect(mantle).toBeTruthy();
  return { slab, slabGeometry: slab.geometry, mantle, mantleGeometry: mantle.geometry, builds: gl.debug().geometryBuilds };
}
function expectRock(model, rock) {
  expect(model.scene.children).toContain(rock.slab); expect(rock.slab.geometry).toBe(rock.slabGeometry);
  expect(model.scene.children).toContain(rock.mantle); expect(rock.mantle.geometry).toBe(rock.mantleGeometry);
  expect(gl.debug().geometryBuilds).toBe(rock.builds);
}

describe('Recorded sample circles stay clear of movable 3D captions', () => {
  it('moves the selected-event caption away from an independently positioned record beneath it', async () => {
    const selected = { x: 245.375, z: 185.625, index: 0, captured: true };
    const model = await mountModel({ observationProjection: selected });
    const { point, caption } = pointBelowCaption(model, 'Projected event 1');
    const points = [selected, point]; model.update({ observationSample: sample(points) });
    expect(overlaps(caption, haloRect(model, 1)), 'the record challenges the old caption footprint').toBe(true);
    expectSampleClear(model);
    expectPoint(instancePosition(batch(model), 1), [point.x * .1, -point.z * .1, -.04]);
    expect(gl.debug().observationProjection.point).toEqual([24.5375, -18.5625, -.02]);
    expect(gl.debug().observationSample.points.map(entry => [entry.index, entry.x, entry.z])).toEqual(points.map((entry, index) => [index, entry.x, entry.z]));
  });

  it('keeps static coordinates clear when the whole arc process and slab inspection are present', async () => {
    const points = [{ x: 200, z: 350 }, { x: 245.375, z: 185.625 }, { x: 150, z: 120 }, { x: 350, z: 350 }];
    const model = await mountModel({ observationSample: sample(points), observationProjection: { ...points[1], index: 1, captured: true }, arcProcessStep: 'all', inspectionId: 'slab' });
    expect(gl.debug().arcProcess.visible).toBe(true); expect(gl.debug().inspection.visible).toBe(true);
    expect(movableLabels().filter(label => ['1', '2', '3'].includes(label.text))).toHaveLength(3);
    expectSampleClear(model);
    for (let index = 0; index < points.length; index++) expectPoint(instancePosition(batch(model), index), [points[index].x * .1, -points[index].z * .1, -.04]);
  });

  it('preserves signed decimals and coincident records in all boundary modes', async () => {
    const points = [{ x: -120.125, z: 45.375 }, { x: 200.625, z: 350.875 }, { x: 200.625, z: 350.875 }];
    const original = structuredClone(points), model = await mountModel({ observationSample: sample(points) });
    for (const mode of ['convergent', 'divergent', 'transform']) {
      model.update({ mode }); expectSampleClear(model);
      expect(gl.debug().observationSample.points.map(point => point.index)).toEqual([0, 1, 2]);
      expect(instancePosition(batch(model), 1)).toEqual(instancePosition(batch(model), 2));
      points.forEach((point, index) => expectPoint(instancePosition(batch(model), index), [point.x * .1, -point.z * .1, -.04]));
    }
    expect(points).toEqual(original);
  });

  it('retains pooled geometry while recalculating caption clearance after resize, zoom and source changes', async () => {
    const points = [{ x: 200, z: 350 }, { x: 245.375, z: 185.625 }, { x: 350, z: 350 }];
    const model = await mountModel({ observationSample: sample(points), observationProjection: { ...points[1], index: 1, captured: true } });
    const rock = retainedRock(model), core = batch(model), halo = batch(model, 'observation-sample-halo-batch');
    const coreGeometry = core.geometry, haloGeometry = halo.geometry, attribute = core.instanceMatrix;
    for (const [width, height, scale, rotX, rotY] of [[300, 340, .4, 0, 0], [900, 500, 1, -22, -38], [390, 450, 2.6, 0, 0], [300, 340, 1, 0, 0]]) {
      model.resize(width, height); model.update({ scale, rotX, rotY }, true); expectSampleClear(model);
      expect(core).toBe(batch(model)); expect(core.geometry).toBe(coreGeometry); expect(halo.geometry).toBe(haloGeometry);
      expect(core.instanceMatrix).toBe(attribute); expectRock(model, rock);
      points.forEach((point, index) => expectPoint(instancePosition(core, index), [point.x * .1, -point.z * .1, -.04]));
    }
    model.update({ observationSample: sample(points, false), darkMode: true }); expectSampleClear(model);
    expect(gl.debug().observationSample.captured).toBe(false); expect(core.geometry).toBe(coreGeometry); expectRock(model, rock);
  });

  it('clears reservation effects when the sample is hidden and restores the same caption placement', async () => {
    const selected = { x: 245.375, z: 185.625, index: 0, captured: true }, model = await mountModel({ observationProjection: selected });
    const baseline = structuredClone(gl.debug().labelRects), { point } = pointBelowCaption(model, 'Projected event 1');
    model.update({ observationSample: sample([point]) }); expectSampleClear(model);
    expect(gl.debug().labelRects).not.toEqual(baseline);
    model.update({ observationSample: null });
    expect(batch(model).count).toBe(0); expect(gl.debug().labelRects).toEqual(baseline);
  });

  it('drops stale reservations in a rear view and restores them on the exposed face', async () => {
    const points = [{ x: 200, z: 350 }, { x: 350, z: 350 }], model = await mountModel({ observationSample: sample(points) });
    const core = batch(model); model.update({ rotY: 180 }, true);
    expect(gl.debug().observationSample.visible).toBe(false); expect(core.count).toBe(0);
    const hiddenLabels = structuredClone(gl.debug().labelRects);
    model.update({ observationSample: null }); expect(gl.debug().labelRects).toEqual(hiddenLabels);
    model.update({ observationSample: sample(points) }); expect(gl.debug().labelRects).toEqual(hiddenLabels);
    model.update({ rotY: 0 }, true); expect(core.count).toBe(2); expectSampleClear(model);
  });

  it('drops stale reservations from an overhead view and an uncut block', async () => {
    const points = [{ x: 200, z: 350 }], model = await mountModel({ observationSample: sample(points) });
    for (const patch of [{ rotX: -88, surfaceView: true }, { rotX: 0, surfaceView: false, cut: null }]) {
      model.update(patch); expect(gl.debug().observationSample.visible).toBe(false); expect(batch(model).count).toBe(0);
      const hiddenLabels = structuredClone(gl.debug().labelRects);
      model.update({ observationSample: null }); expect(gl.debug().labelRects).toEqual(hiddenLabels);
      model.update({ observationSample: sample(points) }); expect(gl.debug().labelRects).toEqual(hiddenLabels);
    }
    model.update({ cut: 0 }); expectSampleClear(model); expect(batch(model).count).toBe(1);
  });

  it('handles a dense 200-record sample without dropping records, separating duplicates or rebuilding rock', async () => {
    const points = Array.from({ length: 200 }, (_, index) => ({ x: 180.125 + (index % 20) * 4, z: 200.375 + Math.floor(index / 20) * 3 }));
    points[1] = { ...points[0] }; const original = structuredClone(points);
    const model = await mountModel(), rock = retainedRock(model);
    model.update({ observationSample: sample(points), observationProjection: { ...points[100], index: 100, captured: true }, arcProcessStep: 'all' });
    const core = batch(model); expect(core.count).toBe(200); expect(gl.debug().observationSample.points).toHaveLength(200);
    expectSampleClear(model); expectRock(model, rock);
    points.forEach((point, index) => expectPoint(instancePosition(core, index), [point.x * .1, -point.z * .1, -.04]));
    expect(instancePosition(core, 0)).toEqual(instancePosition(core, 1)); expect(points).toEqual(original);
    const replacement = points.map(point => ({ x: point.x + 30.125, z: point.z + 20.375 }));
    model.update({ observationSample: sample(replacement, false) }); expectSampleClear(model);
    expect(batch(model)).toBe(core); expect(core.count).toBe(200); expectRock(model, rock);
  });

  it('settles after layout without redraws, matrix writes or callbacks through 1200 frames', async () => {
    const points = [{ x: 200, z: 350 }, { x: 245.375, z: 185.625 }];
    const callbacks = Object.fromEntries(['onReady', 'onFail', 'onInspection'].map(key => [key, vi.fn()]));
    const model = await mountModel({ ...callbacks, observationSample: sample(points), observationProjection: { ...points[1], index: 1, captured: true }, arcProcessStep: 'all' });
    expectSampleClear(model); Object.values(callbacks).forEach(callback => callback.mockClear());
    const core = batch(model), matrixVersion = core.instanceMatrix.version, draws = renderCount, labels = structuredClone(gl.debug().labelRects), builds = gl.debug().geometryBuilds;
    frame(1200);
    expect(renderCount).toBe(draws); expect(core.instanceMatrix.version).toBe(matrixVersion);
    expect(gl.debug().labelRects).toEqual(labels); expect(gl.debug().geometryBuilds).toBe(builds);
    Object.values(callbacks).forEach(callback => expect(callback).not.toHaveBeenCalled());
  });
});

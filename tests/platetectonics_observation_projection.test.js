import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Exercise the shipped Three.js scene and instanced-marker helper. Only GPU
// drawing and canvas painting are stubbed; browser checks cover the final view.
let THREE, gl, rendered, frameId = 0, modelId = 0, renderCount = 0;
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
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js']) {
    (0, eval)(fs.readFileSync(file, 'utf8'));
  }
  THREE = window.THREE;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(scene, camera) {
      renderCount++;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      rendered = { scene, camera };
    }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloTectGL;
  expect(gl).toBeTruthy();
});

afterEach(() => {
  gl?.unmount(); frames.clear(); rendered = null;
  while (canvases.length) canvases.pop().remove();
  vi.restoreAllMocks();
});

function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach(callback => callback(performance.now()));
  }
}
async function mountModel(extra = {}, width = 366, height = 340) {
  const canvas = document.createElement('canvas'); canvases.push(canvas); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: width }); Object.defineProperty(canvas, 'clientHeight', { value: height });
  let model = {
    mode: 'convergent', mountainHeight: 3000, rift: 60, offset: 100,
    quakes: [{ depthKm: 340.5, distKm: 343.25, strikeKm: -80, m: 5 }, { depthKm: 36, distKm: 34, strikeKm: -30, m: 4 }],
    rotX: 0, rotY: 0, scale: 1, cut: 0, showScale: true, surfaceView: false,
    observationProjection: null, ...extra, sig: String(++modelId)
  };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  expect(gl.debug().state).toBe('ready'); expect(rendered).toBeTruthy();
  return {
    get model() { return model; },
    get scene() { return rendered.scene; },
    get camera() { return rendered.camera; },
    update(patch, cameraOnly = false) {
      model = { ...model, ...patch, sig: cameraOnly ? model.sig : String(++modelId) };
      gl.submit(model); frame();
    }
  };
}
function descendants(object, predicate) {
  const found = []; object.traverse(child => { if (predicate(child)) found.push(child); }); return found;
}
function projectionGroup(model) { return model.scene.getObjectByName('sample-observation-projection'); }
function visibleProjectionParts(model) {
  const group = projectionGroup(model);
  return group.visible ? descendants(group, child => child.visible && (child.isMesh || child.isLine || child.isSprite)) : [];
}
function snapshot() { return gl.debug().observationProjection; }
function projectedLabel(model) { return descendants(projectionGroup(model), child => child.isSprite && typeof child.userData.label === 'string'); }
function dotPositions(model) {
  const batch = descendants(model.scene, child => child.isInstancedMesh && child.count > 0)[0];
  const positions = [];
  for (let i = 0; i < batch.count; i++) {
    const matrix = new THREE.Matrix4(); batch.getMatrixAt(i, matrix);
    positions.push(new THREE.Vector3().setFromMatrixPosition(matrix).toArray());
  }
  return positions;
}
function guidePoints(line) {
  return Array.from({ length: line.geometry.attributes.position.count }, (_, index) =>
    new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position, index).applyMatrix4(line.matrixWorld).toArray());
}
function expectPoint(actual, expected) {
  expect(actual).toHaveLength(3); actual.forEach((coordinate, index) => expect(coordinate).toBeCloseTo(expected[index], 5));
}

describe('Selected sample observations project onto an exposed 3D face', () => {
  it('starts quiet without a selection and stops drawing an unchanged idle scene', async () => {
    const model = await mountModel();
    expect(snapshot()).toMatchObject({ visible: false, reason: 'none', point: null });
    expect(visibleProjectionParts(model)).toHaveLength(0);
    expect(gl.debug().focusAnnotation).toBeTruthy();
    const draws = renderCount, builds = gl.debug().geometryBuilds;
    frame(200);
    expect(renderCount).toBe(draws); expect(gl.debug().geometryBuilds).toBe(builds);
  });

  it('preserves signed distance and decimal depth in every boundary mode', async () => {
    const observed = { x: -8.125, z: 2.75, index: 3, captured: false };
    const model = await mountModel({ observationProjection: observed });
    for (const mode of ['convergent', 'divergent', 'transform']) {
      model.update({ mode });
      expect(snapshot()).toMatchObject({ visible: true, reason: 'exposed', index: 3, distanceKm: -8.125, depthKm: 2.75, captured: false });
      expectPoint(snapshot().point, [-0.8125, -0.275, -0.02]);
      expect(projectionGroup(model).visible).toBe(true);
      expect(projectedLabel(model).map(label => label.userData.label)).toEqual(['Projected event 4']);
      const marker = descendants(projectionGroup(model), child => child.userData.feature === 'observation-marker')[0];
      const halo = descendants(projectionGroup(model), child => child.userData.feature === 'observation-marker-halo')[0];
      expect(marker.geometry.type).toBe('RingGeometry'); expect(marker.geometry.parameters.thetaSegments).toBe(4);
      expect(marker.geometry.parameters.innerRadius).toBeGreaterThan(0);
      expect(marker.material.color.getHex()).toBe(0x67e8f9); expect(halo.material.color.getHex()).toBe(0x0f172a);
    }
    model.update({ mode: 'convergent', observationProjection: { ...observed, x: 365.25, z: 342.875 } });
    expectPoint(snapshot().point, [36.525, -34.2875, -0.02]);
    expect(snapshot().distanceKm).toBe(365.25); expect(snapshot().depthKm).toBe(342.875);
  });

  it('distinguishes coincident event numbers and checked versus live sources while reusing rock', async () => {
    const observed = { x: 180.25, z: 176.5, index: 0, captured: true };
    const model = await mountModel({ observationProjection: observed });
    const group = projectionGroup(model), builds = gl.debug().geometryBuilds, camera = gl.debug().camera;
    const rock = descendants(model.scene, child => child.isMesh && child.rotation.z < -0.5)[0], geometry = rock.geometry;
    model.update({ observationProjection: { ...observed, index: 1 } });
    expect(projectedLabel(model)[0].userData.label).toBe('Projected event 2');
    expect(snapshot()).toMatchObject({ index: 1, captured: true });
    const point = [...snapshot().point];
    model.update({ observationProjection: { ...observed, index: 1, captured: false } });
    expect(snapshot()).toMatchObject({ index: 1, captured: false }); expect(snapshot().point).toEqual(point);
    expect(projectionGroup(model)).toBe(group); expect(gl.debug().geometryBuilds).toBe(builds);
    expect(rock.geometry).toBe(geometry); expect(gl.debug().camera).toEqual(camera);
    for (const darkMode of [false, true, false]) {
      model.update({ darkMode });
      const guides = descendants(projectionGroup(model), child => child.isLine && child.material.type === 'LineDashedMaterial');
      expect(guides).toHaveLength(2);
      for (const guide of guides) expect(guide.material.color.getHex()).toBe(darkMode ? 0x67e8f9 : 0x0e7490);
      expect(snapshot()).toMatchObject({ visible: true, reason: 'exposed', index: 1, captured: false });
      expect(snapshot().point).toEqual(point); expect(projectionGroup(model)).toBe(group);
      expect(gl.debug().geometryBuilds).toBe(builds); expect(rock.geometry).toBe(geometry);
    }
  });

  it('moves only the projection plane with the cut and retains exact coordinate-guide endpoints', async () => {
    const observed = { x: 365.25, z: 342.875, index: 5, captured: true };
    const model = await mountModel({ observationProjection: observed });
    const quakes = model.model.quakes, dots = dotPositions(model), builds = gl.debug().geometryBuilds;
    for (const cut of [-24.8, -11, 0, 14, 24.8]) {
      model.update({ cut });
      const expected = [36.525, -34.2875, cut - 0.02]; expectPoint(snapshot().point, expected);
      const guides = descendants(projectionGroup(model), child => child.isLine && child.material.type === 'LineDashedMaterial');
      expect(guides).toHaveLength(2);
      const endpoints = guides.map(line => guidePoints(line));
      expect(endpoints.some(points => points.some(point => Math.abs(point[0] - expected[0]) < 1e-5 && Math.abs(point[1]) < 1e-5))).toBe(true);
      expect(endpoints.some(points => points.some(point => Math.abs(point[0]) < 1e-5 && Math.abs(point[1] - expected[1]) < 1e-5))).toBe(true);
      for (const guide of guides) {
        expect(guide.material.clippingPlanes[0].constant).toBe(cut);
        expect(guidePoints(guide).some(point => point.every((coordinate, index) => Math.abs(coordinate - expected[index]) < 1e-5))).toBe(true);
        for (const point of guidePoints(guide)) expect(point[2]).toBeCloseTo(cut - 0.02, 5);
      }
      expect(model.model.quakes).toBe(quakes); expect(dotPositions(model)).toEqual(dots);
      expect(gl.debug().geometryBuilds).toBe(builds);
    }
  });

  it('hides uncut or discarded faces and updates rear and overhead visibility on camera-only turns', async () => {
    const model = await mountModel({ observationProjection: { x: 220, z: 218, index: 2, captured: false } });
    for (const cut of [null, -25, 25]) {
      model.update({ cut }); expect(snapshot()).toMatchObject({ visible: false, reason: 'cut-face', point: null });
      expect(visibleProjectionParts(model)).toHaveLength(0);
      expect(!!gl.debug().focusAnnotation).toBe(cut == null || model.model.quakes.some(quake => quake.strikeKm * 0.1 <= cut));
    }
    model.update({ cut: 0 }); expect(snapshot().visible).toBe(true);
    for (const camera of [{ rotX: -88, rotY: 0 }, { rotX: 0, rotY: 130 }, { rotX: 0, rotY: 180 }, { rotX: 75, rotY: 0 }]) {
      model.update(camera, true);
      expect(snapshot()).toMatchObject({ visible: false, reason: 'view-angle', point: null });
      expect(visibleProjectionParts(model)).toHaveLength(0); expect(gl.debug().focusAnnotation).toBeTruthy();
      expect(projectedLabel(model)).toHaveLength(0);
    }
    model.update({ rotX: -22, rotY: -38 }, true);
    expect(snapshot()).toMatchObject({ visible: true, reason: 'exposed' });
    expect(gl.debug().focusAnnotation).toBeNull();
  });

  it('rejects malformed observations and returns to the quiet empty state after clearing', async () => {
    const valid = { x: 210, z: 212, index: 0, captured: true };
    const model = await mountModel({ observationProjection: valid });
    for (const [observationProjection, reason] of [
      [{ ...valid, x: NaN }, 'invalid'], [{ ...valid, z: Infinity }, 'invalid'],
      [{ ...valid, z: -1 }, 'outside-block'], [{ ...valid, index: -1 }, 'invalid'], [{ ...valid, index: 1.5 }, 'invalid']
    ]) {
      model.update({ observationProjection });
      expect(snapshot()).toMatchObject({ visible: false, reason, point: null });
      expect(visibleProjectionParts(model)).toHaveLength(0); expect(gl.debug().focusAnnotation).toBeTruthy();
    }
    model.update({ observationProjection: null });
    expect(snapshot()).toMatchObject({ visible: false, reason: 'none', point: null });
    const draws = renderCount; frame(100); expect(renderCount).toBe(draws);
  });

  it('retains valid 800 km metadata outside the block instead of snapping it to an edge', async () => {
    const model = await mountModel({ observationProjection: { x: 800, z: 650, index: 9, captured: true } });
    expect(snapshot()).toMatchObject({ visible: false, reason: 'outside-block', index: 9, distanceKm: 800, depthKm: 650, captured: true, point: null });
    expect(visibleProjectionParts(model)).toHaveLength(0); expect(projectedLabel(model)).toHaveLength(0);
    model.update({ observationProjection: { x: 760, z: 650, index: 9, captured: true } });
    expect(snapshot()).toMatchObject({ visible: true, reason: 'exposed', distanceKm: 760 });
    expectPoint(snapshot().point, [76, -65, -0.02]);
  });

  it('suppresses only the newest focus guide while leaving every live spherical focus intact', async () => {
    const model = await mountModel(); const dots = dotPositions(model), count = gl.debug().quakeCount;
    expect(gl.debug().focusAnnotation).toBeTruthy();
    model.update({ observationProjection: { x: 350, z: 352, index: 7, captured: true } });
    expect(gl.debug().focusAnnotation).toBeNull();
    expect(descendants(model.scene, child => child.userData.feature === 'focus-depth-label')).toHaveLength(0);
    expect(dotPositions(model)).toEqual(dots); expect(gl.debug().quakeCount).toBe(count);
    expect(descendants(projectionGroup(model), child => child.geometry?.type === 'SphereGeometry')).toHaveLength(0);
    model.update({ observationProjection: null });
    expect(gl.debug().focusAnnotation.depthKm).toBe(36);
    expect(descendants(model.scene, child => child.userData.feature === 'focus-depth-label')).toHaveLength(1);
    expect(dotPositions(model)).toEqual(dots); expect(gl.debug().quakeCount).toBe(count);
  });

  it('keeps the projected caption separate from the full arc trace and slab inspection labels', async () => {
    const model = await mountModel({ observationProjection: { x: 220.25, z: 218.75, index: 11, captured: true }, arcProcessStep: 'all', inspectionId: 'slab' }, 300, 340);
    for (const [rotX, rotY] of [[0, 0], [-22, -38], [-37, -58], [-50, 50]]) {
      model.update({ rotX, rotY });
      const labels = gl.debug().labelRects, selected = labels.find(label => label.text === 'Projected event 12');
      expect(selected).toBeTruthy(); expect(selected.height).toBeGreaterThanOrEqual(20);
      expect(selected.x).toBeGreaterThanOrEqual(0); expect(selected.x + selected.width).toBeLessThanOrEqual(300);
      expect(labels.filter(label => ['1', '2', '3'].includes(label.text))).toHaveLength(3);
      expect(gl.debug().inspection.id).toBe('slab');
      for (const other of labels.filter(label => label !== selected)) {
        const x = Math.min(selected.x + selected.width, other.x + other.width) - Math.max(selected.x, other.x);
        const y = Math.min(selected.y + selected.height, other.y + other.height) - Math.max(selected.y, other.y);
        expect(x > 0.01 && y > 0.01, 'selected observation overlaps ' + other.text).toBe(false);
      }
    }
  });

  it('disposes annotation geometry, textures and materials and starts clean when remounted', async () => {
    const model = await mountModel({ observationProjection: { x: 360, z: 358, index: 6, captured: true } });
    const group = projectionGroup(model), resources = new Set();
    group.traverse(child => {
      // Sprite geometry belongs to Three.js and is shared between labels.
      if (child.geometry && !child.isSprite) resources.add(child.geometry);
      const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
      materials.forEach(material => { resources.add(material); if (material.map) resources.add(material.map); });
    });
    expect(resources.size).toBeGreaterThan(0);
    const disposals = [...resources].map(resource => vi.spyOn(resource, 'dispose'));
    gl.unmount(); disposals.forEach(dispose => expect(dispose).toHaveBeenCalled());
    expect(frames.size).toBe(0); expect(gl.debug().state).toBe('idle');
    const fresh = await mountModel();
    expect(projectionGroup(fresh)).not.toBe(group);
    expect(snapshot()).toMatchObject({ visible: false, reason: 'none', point: null });
    expect(projectedLabel(fresh)).toHaveLength(0); expect(gl.debug().focusAnnotation).toBeTruthy();
  });
});

// Read actual instance matrices and colors independently of the debug summary.
function sampleSnapshot() { return gl.debug().observationSample; }
function sampleGroup(model) { return model.scene.getObjectByName('earthquake-sample-projection'); }
function sampleCore(model) { return sampleGroup(model).getObjectByName('observation-sample-marker-batch'); }
function sampleHalo(model) { return sampleGroup(model).getObjectByName('observation-sample-halo-batch'); }
function instancePosition(batch, index) {
  const matrix = new THREE.Matrix4(); batch.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix).toArray();
}
function instanceColor(batch, index) { const color = new THREE.Color(); batch.getColorAt(index, color); return color; }
function expectColor(actual, hex) {
  const expected = new THREE.Color(hex);
  for (const channel of ['r', 'g', 'b']) expect(actual[channel]).toBeCloseTo(expected[channel], 6);
}
function markerPixelWidth(model, index) {
  const matrix = new THREE.Matrix4(); sampleCore(model).getMatrixAt(index, matrix);
  const left = new THREE.Vector3(-1, 0, 0).applyMatrix4(matrix).project(model.camera);
  const right = new THREE.Vector3(1, 0, 0).applyMatrix4(matrix).project(model.camera);
  return Math.abs(right.x - left.x) * gl.debug().canvas.w / 2;
}
async function mountResizableSample(extra, initialWidth = 300, initialHeight = 340) {
  let width = initialWidth, height = initialHeight, resizeCallback;
  globalThis.ResizeObserver = window.ResizeObserver = class {
    constructor(callback) { resizeCallback = callback; } observe() {} disconnect() {}
  };
  const canvas = document.createElement('canvas'); canvases.push(canvas); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { get: () => width });
  Object.defineProperty(canvas, 'clientHeight', { get: () => height });
  let model = {
    mode: 'convergent', mountainHeight: 3000, rift: 60, offset: 100,
    quakes: [{ depthKm: 36, distKm: 34, strikeKm: -30, m: 4 }],
    rotX: 0, rotY: 0, scale: 1, cut: 0, showScale: true, surfaceView: false,
    observationProjection: null, ...extra, sig: String(++modelId)
  };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  expect(gl.debug().state).toBe('ready');
  return {
    get model() { return model; }, get scene() { return rendered.scene; }, get camera() { return rendered.camera; },
    update(patch, cameraOnly = false) {
      model = { ...model, ...patch, sig: cameraOnly ? model.sig : String(++modelId) }; gl.submit(model); frame();
    },
    resize(nextWidth, nextHeight) { width = nextWidth; height = nextHeight; resizeCallback(); frame(); }
  };
}

describe('Whole earthquake samples project quietly onto the measured cut face', () => {
  it('starts disabled and retains two empty batches without requesting idle draws', async () => {
    const model = await mountModel();
    expect(sampleSnapshot()).toMatchObject({ enabled: false, visible: false, reason: 'none', total: 0, inBounds: 0, outside: 0, invalid: 0, points: [], drawnCount: 0 });
    expect(sampleGroup(model)).toBeUndefined();
    model.update({ observationSample: { points: [{ x: 300, z: 290 }], captured: true } });
    const core = sampleCore(model), halo = sampleHalo(model);
    model.update({ observationSample: null });
    expect(core.isInstancedMesh).toBe(true); expect(halo.isInstancedMesh).toBe(true);
    expect(core.count).toBe(0); expect(halo.count).toBe(0);
    const draws = renderCount, builds = gl.debug().geometryBuilds;
    frame(200); expect(renderCount).toBe(draws); expect(gl.debug().geometryBuilds).toBe(builds);
  });

  it('draws exact signed decimals and original event indices in every boundary mode', async () => {
    const points = [{ x: -8.125, z: 2.75 }, { x: 365.25, z: 342.875 }, { x: 760, z: 800 }];
    const model = await mountModel({ observationSample: { points, captured: true } });
    for (const mode of ['convergent', 'divergent', 'transform']) {
      model.update({ mode });
      expect(sampleSnapshot()).toMatchObject({ enabled: true, visible: true, reason: 'exposed', total: 3, inBounds: 3, outside: 0, invalid: 0, captured: true, drawnCount: 3 });
      expect(sampleSnapshot().points.map(point => [point.index, point.x, point.z])).toEqual([[0, -8.125, 2.75], [1, 365.25, 342.875], [2, 760, 800]]);
      points.forEach((point, index) => {
        expectPoint(instancePosition(sampleCore(model), index), [point.x * .1, -point.z * .1, -.04]);
        expectPoint(sampleSnapshot().points[index].point, [point.x * .1, -point.z * .1, -.04]);
      });
      expect(sampleGroup(model).children).toHaveLength(2);
      expect(descendants(sampleGroup(model), child => child.isSprite || child.isLine)).toHaveLength(0);
    }
    const debug = sampleSnapshot(); debug.points[0].x = 999; debug.points[0].point[0] = 999;
    expect(sampleSnapshot().points[0].x).toBe(-8.125); expect(sampleSnapshot().points[0].point[0]).toBe(-.8125);
    expect(points[0]).toEqual({ x: -8.125, z: 2.75 });
  });

  it('uses the graph depth bands at 70 and 300 km with contrasting hollow halos', async () => {
    const points = [0, 69.999, 70, 299.999, 300, 800].map((z, index) => ({ x: index * 40, z }));
    const model = await mountModel({ observationSample: { points, captured: false }, darkMode: false });
    const core = sampleCore(model), halo = sampleHalo(model);
    expect(core.instanceColor.count).toBe(200); // Later live windows can grow without reallocating the batch.
    expect(core.geometry.type).toBe('RingGeometry'); expect(core.geometry.parameters.thetaSegments).toBe(12);
    expect(core.geometry.parameters.innerRadius).toBeCloseTo(.65); expect(core.geometry.parameters.outerRadius).toBe(1);
    expect(halo.geometry.parameters.innerRadius).toBeCloseTo(.5); expect(halo.geometry.parameters.outerRadius).toBeCloseTo(1.3);
    for (const darkMode of [false, true, false]) {
      model.update({ darkMode });
      const palette = darkMode ? [0xfb7185, 0xfdba74, 0xc4b5fd] : [0xbe123c, 0xc2410c, 0x6d28d9];
      points.forEach((point, index) => expectColor(instanceColor(core, index), palette[index < 2 ? 0 : index < 4 ? 1 : 2]));
      expectColor(halo.material.color, darkMode ? 0x0f172a : 0xffffff);
      expect(core).toBe(sampleCore(model)); expect(halo).toBe(sampleHalo(model));
    }
  });

  it('keeps duplicate observations coincident and replaces a full same-length 200-event window', async () => {
    const points = Array.from({ length: 200 }, (_, index) => ({ x: index === 1 ? 0 : index * 3.25, z: index === 1 ? 0 : index * 3.5 }));
    const model = await mountModel({ observationSample: { points, captured: false } });
    const core = sampleCore(model), halo = sampleHalo(model), geometry = core.geometry;
    expect(core.count).toBe(200); expect(core.instanceMatrix.count).toBe(200);
    expect(instancePosition(core, 0)).toEqual(instancePosition(core, 1));
    expect(sampleSnapshot().points.slice(0, 2).map(point => point.index)).toEqual([0, 1]);
    const replacement = points.map((point, index) => ({ x: point.x - 15.125, z: point.z + (index % 2 ? .375 : .125) }));
    model.update({ observationSample: { points: replacement, captured: true } });
    expect(sampleSnapshot()).toMatchObject({ total: 200, inBounds: 200, captured: true, drawnCount: 200 });
    for (const index of [0, 1, 100, 199]) expectPoint(instancePosition(core, index), [replacement[index].x * .1, -replacement[index].z * .1, -.04]);
    expect(sampleCore(model)).toBe(core); expect(sampleHalo(model)).toBe(halo); expect(core.geometry).toBe(geometry);
    expect(points[0]).toEqual({ x: 0, z: 0 });
  });

  it('counts mixed invalid and outside events while preserving eligible original indices', async () => {
    const points = [
      { x: 800, z: 650 }, { x: 365.25, z: 342.875 }, { x: NaN, z: 70 }, { x: -760, z: 0 },
      { x: 0, z: -1 }, null, { x: 0, z: 801 }, { x: '20', z: 25 }
    ];
    points.length = 9; // A sparse hole is invalid and still occupies an event index.
    const model = await mountModel({ observationSample: { points, captured: true } });
    expect(sampleSnapshot()).toMatchObject({ enabled: true, visible: true, reason: 'exposed', total: 9, inBounds: 2, outside: 3, invalid: 4, drawnCount: 2 });
    expect(sampleSnapshot().total).toBe(sampleSnapshot().inBounds + sampleSnapshot().outside + sampleSnapshot().invalid);
    expect(sampleSnapshot().points.map(point => point.index)).toEqual([1, 3]);
    expectPoint(instancePosition(sampleCore(model), 0), [36.525, -34.2875, -.04]);
    expectPoint(instancePosition(sampleCore(model), 1), [-76, 0, -.04]);
    expect(points[0]).toEqual({ x: 800, z: 650 });
    expect(sampleSnapshot().points.some(point => point.x === 800)).toBe(false);
  });

  it('clears stale batch counts for empty, all-outside, malformed and oversized requests', async () => {
    const model = await mountModel({ observationSample: { points: [{ x: 360, z: 350 }], captured: true } });
    const cases = [
      [{ points: [], captured: true }, 'empty', 0, 0, 0],
      [{ points: [{ x: 800, z: 650 }, { x: -761, z: 1 }], captured: true }, 'outside-block', 2, 2, 0],
      [{ points: [{ x: Infinity, z: 2 }, null], captured: true }, 'invalid', 2, 0, 2],
      [{ points: Array(2), captured: true }, 'invalid', 2, 0, 2],
      [{ points: 'invalid', captured: true }, 'invalid', 0, 0, 0],
      [{ points: Array.from({ length: 201 }, () => ({ x: 200, z: 200 })), captured: true }, 'invalid', 201, 0, 0]
    ];
    for (const [observationSample, reason, total, outside, invalid] of cases) {
      model.update({ observationSample });
      expect(sampleSnapshot()).toMatchObject({ enabled: true, visible: false, reason, total, outside, invalid, inBounds: 0, points: [], drawnCount: 0 });
      expect(sampleCore(model).count).toBe(0); expect(sampleHalo(model).count).toBe(0);
      expect(gl.debug().focusAnnotation).toBeTruthy();
    }
    model.update({ observationSample: null });
    expect(sampleSnapshot()).toMatchObject({ enabled: false, reason: 'none', drawnCount: 0 });
  });

  it('moves the plane exactly and gates both batches on camera-only rear and overhead turns', async () => {
    const points = [{ x: 300.25, z: 290.875 }, { x: -1.5, z: 2.375 }];
    const model = await mountModel({ observationSample: { points, captured: false } });
    for (const cut of [-24.8, -11, 0, 14, 24.8]) {
      model.update({ cut });
      points.forEach((point, index) => expectPoint(instancePosition(sampleCore(model), index), [point.x * .1, -point.z * .1, cut - .04]));
      expect(sampleSnapshot()).toMatchObject({ visible: true, reason: 'exposed', cut, drawnCount: 2 });
    }
    for (const cut of [null, -25, 25]) {
      model.update({ cut });
      expect(sampleSnapshot()).toMatchObject({ visible: false, reason: 'cut-face', drawnCount: 0 });
      expect(sampleSnapshot().points.every(point => point.point === null)).toBe(true);
    }
    model.update({ cut: 0 });
    for (const camera of [{ rotX: -88, rotY: 0 }, { rotX: 0, rotY: 130 }, { rotX: 0, rotY: 180 }, { rotX: 75, rotY: 0 }]) {
      model.update(camera, true);
      expect(sampleSnapshot()).toMatchObject({ visible: false, reason: 'view-angle', drawnCount: 0 });
      expect(sampleCore(model).count).toBe(0); expect(sampleHalo(model).count).toBe(0);
    }
    model.update({ rotX: -22, rotY: -38 }, true);
    expect(sampleSnapshot()).toMatchObject({ visible: true, reason: 'exposed', drawnCount: 2 });
  });

  it('coexists with the selected diamond and suppresses only the newest live focus guide', async () => {
    const model = await mountModel(); const dots = dotPositions(model), quakeCount = gl.debug().quakeCount;
    model.update({ observationSample: { points: [{ x: 350, z: 352 }, { x: 365, z: 362 }], captured: true } });
    expect(gl.debug().focusAnnotation).toBeNull(); expect(gl.debug().quakeCount).toBe(quakeCount); expect(dotPositions(model)).toEqual(dots);
    model.update({ observationProjection: { x: 350, z: 352, index: 0, captured: true } });
    expect(snapshot()).toMatchObject({ visible: true, index: 0 }); expect(sampleSnapshot().drawnCount).toBe(2);
    expect(projectedLabel(model)).toHaveLength(1);
    model.update({ observationSample: null });
    expect(snapshot().visible).toBe(true); expect(gl.debug().focusAnnotation).toBeNull();
    model.update({ observationProjection: null });
    expect(gl.debug().focusAnnotation.depthKm).toBe(36); expect(dotPositions(model)).toEqual(dots);
    expect(gl.debug().quakeCount).toBe(quakeCount);
  });

  it('retains owned geometry and dynamic matrices across resize, zoom and source changes', async () => {
    const model = await mountResizableSample({ observationSample: { points: [{ x: 300.125, z: 330.375 }], captured: true } });
    const core = sampleCore(model), halo = sampleHalo(model), geometry = core.geometry, material = core.material;
    const matrixAttribute = core.instanceMatrix, builds = gl.debug().geometryBuilds;
    expect(matrixAttribute.usage).toBe(THREE.DynamicDrawUsage); expect(halo.instanceMatrix.usage).toBe(THREE.DynamicDrawUsage);
    for (const [width, height, scale] of [[300, 340, .25], [900, 340, 1], [390, 450, 2.5], [300, 340, 1]]) {
      model.resize(width, height); model.update({ scale }, true);
      expect(markerPixelWidth(model, 0)).toBeGreaterThanOrEqual(7.99);
      expectPoint(instancePosition(core, 0), [30.0125, -33.0375, -.04]);
      const coreMatrix = new THREE.Matrix4(), haloMatrix = new THREE.Matrix4(); core.getMatrixAt(0, coreMatrix); halo.getMatrixAt(0, haloMatrix);
      expect(Array.from(haloMatrix.elements)).toEqual(Array.from(coreMatrix.elements));
      expect(sampleCore(model)).toBe(core); expect(core.geometry).toBe(geometry); expect(core.material).toBe(material); expect(core.instanceMatrix).toBe(matrixAttribute);
      expect(gl.debug().geometryBuilds).toBe(builds);
    }
    model.update({ observationSample: { points: [{ x: 300.125, z: 330.375 }], captured: false } });
    expect(sampleSnapshot().captured).toBe(false); expect(core.geometry).toBe(geometry);
    const draws = renderCount, version = matrixAttribute.version; frame(200);
    expect(renderCount).toBe(draws); expect(matrixAttribute.version).toBe(version); expect(gl.debug().geometryBuilds).toBe(builds);
  });

  it('disposes each owned batch resource and remounts without sample state', async () => {
    const model = await mountModel({ observationSample: { points: [{ x: 300, z: 290 }], captured: true } });
    const group = sampleGroup(model), resources = new Set();
    group.traverse(child => { if (child.geometry) resources.add(child.geometry); if (child.material) resources.add(child.material); });
    expect(resources.size).toBe(4); const disposals = [...resources].map(resource => vi.spyOn(resource, 'dispose'));
    const batchDisposals = [sampleCore(model), sampleHalo(model)].map(batch => vi.spyOn(batch, 'dispose'));
    gl.unmount(); [...disposals, ...batchDisposals].forEach(dispose => expect(dispose).toHaveBeenCalledTimes(1));
    expect(frames.size).toBe(0); expect(gl.debug().state).toBe('idle');
    const fresh = await mountModel(); expect(sampleGroup(fresh)).not.toBe(group);
    expect(sampleSnapshot()).toMatchObject({ enabled: false, visible: false, reason: 'none', drawnCount: 0 });
    expect(sampleGroup(fresh)).toBeUndefined(); expect(gl.debug().focusAnnotation).toBeTruthy();
  });
});

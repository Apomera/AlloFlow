import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Use the shipped Three.js geometry/material classes and the host's real
// instanced-marker helper. Only WebGL drawing and canvas painting are stubbed.
// These tests inspect the scene that the renderer receives; browser captures
// cover whether those objects remain legible in the finished view.
const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
let THREE;
let gl;
let rendered;
let frameId = 0;
let modelId = 0;
const frames = new Map();
const canvases = [];

beforeAll(() => {
  const context = (canvas) => new Proxy({
    fillRect(x, y, width, height) {
      (canvas.__rects || (canvas.__rects = [])).push({ x, y, width, height, color: this.fillStyle });
    },
    measureText: (text) => ({ width: String(text).length * 23 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} })
  }, {
    get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; }
  });
  window.HTMLCanvasElement.prototype.getContext = function () { return context(this); };
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  globalThis.ResizeObserver = window.ResizeObserver = class {
    observe() {} disconnect() {}
  };
  globalThis.requestAnimationFrame = window.requestAnimationFrame = (callback) => {
    const id = ++frameId;
    frames.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = (id) => frames.delete(id);

  (0, eval)(read('desktop/web-app/node_modules/react/umd/react.production.min.js'));
  (0, eval)(read('vendor/three-r128/three.min.js'));
  THREE = window.THREE;
  expect(THREE).toBeTruthy();
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(scene, camera) {
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      rendered = { scene, camera };
    }
  };
  (0, eval)(read('stem_lab/stem_lab_module.js'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js'));
  gl = window.__alloTectGL;
  expect(gl).toBeTruthy();
});

afterEach(() => {
  gl?.unmount();
  frames.clear();
  rendered = null;
  while (canvases.length) canvases.pop().remove();
});

function drawFrame() {
  const pending = frames.entries().next().value;
  expect(pending, 'the model schedules a render').toBeTruthy();
  frames.delete(pending[0]);
  pending[1](performance.now());
  expect(rendered, 'the 3D scene reaches the renderer').toBeTruthy();
  return rendered;
}

async function mountModel(patch = {}, width = 900, height = 620) {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'clientWidth', { value: width });
  Object.defineProperty(canvas, 'clientHeight', { value: height });
  document.body.appendChild(canvas);
  canvases.push(canvas);
  let model = {
    mode: 'convergent', mountainHeight: 3000, rift: 60, offset: 100,
    quakes: [{ depthKm: 350, distKm: 350, strikeKm: 0, m: 5 }],
    rotX: -22, rotY: -38, scale: 1, cut: null, showScale: true,
    ...patch,
    sig: String(++modelId)
  };
  gl.submit(model);
  gl.mount(canvas);
  await Promise.resolve();
  await Promise.resolve();
  expect(gl.debug().state).toBe('ready');
  drawFrame();
  return {
    get scene() { return rendered.scene; },
    get camera() { return rendered.camera; },
    update(next) {
      model = { ...model, ...next, sig: String(++modelId) };
      gl.submit(model);
      return drawFrame();
    }
  };
}

function features(scene, value) {
  const found = [];
  scene.traverse((child) => { if (child.userData.feature === value) found.push(child); });
  return found;
}

function descendingSlab(scene) {
  return scene.children.find((child) => child.isMesh && Math.abs(child.rotation.z) > 0.1);
}

describe('Plate tectonics 3D scientific clarity', () => {
  it('keeps deep earthquakes on the descending slab to the right of the trench', async () => {
    const model = await mountModel();
    const slab = descendingSlab(model.scene);
    expect(slab, 'a descending slab is present').toBeTruthy();
    expect(slab.position.x).toBeGreaterThan(0);
    expect(slab.position.y).toBeLessThan(0);
    expect(slab.rotation.z).toBeCloseTo(-Math.PI / 4);
    const quakes = [];
    model.scene.traverse((child) => { if (child.isInstancedMesh && child.count > 0) quakes.push(child); });
    expect(quakes).toHaveLength(1);
    const marker = new THREE.Matrix4();
    quakes[0].getMatrixAt(0, marker);
    const point = new THREE.Vector3().setFromMatrixPosition(marker);
    expect(point.x).toBeCloseTo(35);
    expect(point.y).toBeCloseTo(-35);
    expect(point.z).toBeCloseTo(0);
    slab.geometry.computeBoundingBox();
    const top = new THREE.Vector3(0, slab.geometry.boundingBox.max.y, 0).applyMatrix4(slab.matrixWorld);
    expect(top.x + top.y, 'the quake plane follows the top of the slab').toBeCloseTo(0);
  });

  it('keeps the descending slab inside the solid mantle envelope', async () => {
    const model = await mountModel();
    const mantle = features(model.scene, 'solid-mantle-envelope');
    expect(mantle).toHaveLength(1);
    const envelope = new THREE.Box3().setFromObject(mantle[0]);
    const slab = new THREE.Box3().setFromObject(descendingSlab(model.scene));
    expect(slab.min.x).toBeGreaterThanOrEqual(envelope.min.x);
    expect(slab.max.x).toBeLessThanOrEqual(envelope.max.x);
    expect(slab.min.y).toBeGreaterThanOrEqual(envelope.min.y);
    const colors = mantle[0].geometry.attributes.color;
    // Mantle rock should not look like the model's saturated molten fissure.
    for (let i = 0; i < colors.count; i++) {
      const hsl = {};
      new THREE.Color(colors.getX(i), colors.getY(i), colors.getZ(i)).getHSL(hsl);
      expect(hsl.s).toBeLessThan(0.4);
    }
  });

  it('shows internal earthquake markers through rock while keeping the cut plane and labels readable', async () => {
    const model = await mountModel({ cut: 0, quakes: [
      { depthKm: 10, distKm: 10, strikeKm: 100, m: 4 },
      { depthKm: 20, distKm: 20, strikeKm: -100, m: 4 }
    ] });
    const meshes = [];
    model.scene.traverse((child) => { if (child.isInstancedMesh && child.count > 0) meshes.push(child); });
    expect(meshes).toHaveLength(1);
    const markers = meshes[0];
    expect(markers.material.isMeshBasicMaterial, 'marker depth colours stay independent of lighting').toBe(true);
    expect(markers.material.transparent).toBe(true);
    expect(markers.material.depthTest).toBe(false);
    expect(markers.material.depthWrite).toBe(false);
    expect(markers.renderOrder).toBeGreaterThan(0);
    expect(markers.material.clippingPlanes).toHaveLength(1);
    const plane = markers.material.clippingPlanes[0];
    const matrix = new THREE.Matrix4();
    markers.getMatrixAt(0, matrix);
    expect(plane.distanceToPoint(new THREE.Vector3().setFromMatrixPosition(matrix)), 'front-half marker is still clipped').toBeLessThan(0);
    markers.getMatrixAt(1, matrix);
    expect(plane.distanceToPoint(new THREE.Vector3().setFromMatrixPosition(matrix)), 'retained internal marker remains visible').toBeGreaterThan(0);
    const labels = [];
    model.scene.traverse((child) => { if (child.isSprite && child.userData.label) labels.push(child); });
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label) => expect(label.renderOrder).toBeGreaterThan(markers.renderOrder));
  });

  it('shows crust as the thin top layer of each lithospheric plate', async () => {
    const model = await mountModel({ cut: 0 });
    const plates = [];
    model.scene.traverse((child) => {
      if (child.isMesh && Array.isArray(child.material) && child.children.some((part) => part.userData.feature === 'cut-rock-face')) plates.push(child);
    });
    expect(plates).toHaveLength(2);
    const layers = plates.sort((a, b) => a.position.x - b.position.x).map((plate) => {
      plate.geometry.computeBoundingBox();
      const side = plate.material.find((material) => material.map && material.map !== plate.material[2].map);
      expect(side).toBeTruthy();
      const image = side.map.image;
      const crust = image.__rects.find((rect) => rect.x === 0 && rect.y === 0 && rect.width === image.width && rect.height < image.height);
      expect(crust, 'a separate crust band is painted at the top').toBeTruthy();
      const thicknessKm = (plate.geometry.boundingBox.max.y - plate.geometry.boundingBox.min.y) * 10;
      const crustKm = thicknessKm * crust.height / image.height;
      expect(crustKm).toBeLessThan(thicknessKm / 2);
      expect(plate.children.find((part) => part.userData.feature === 'cut-rock-face').material.map).toBe(side.map);
      return crustKm;
    });
    expect(layers[0]).toBeGreaterThanOrEqual(5);
    expect(layers[0]).toBeLessThanOrEqual(10);
    expect(layers[1]).toBeGreaterThanOrEqual(25);
    expect(layers[1]).toBeLessThanOrEqual(50);
  });

  it('keeps the overriding forearc above the descending slab instead of overlapping it', async () => {
    const model = await mountModel({ cut: 0 });
    const plate = features(model.scene, 'overriding-plate')[0];
    expect(plate).toBeTruthy();
    const positions = plate.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(plate.matrixWorld);
      expect(point.x + point.y, 'forearc rock stays above the 45-degree slab surface').toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it.each([
    ['convergent', [1, 0], [-1, 0]],
    ['divergent', [-1, 0], [1, 0]],
    ['transform', [0, 1], [0, -1]]
  ])('draws the correct two motion directions for %s boundaries', async (mode, left, right) => {
    const model = await mountModel({ mode });
    const arrows = features(model.scene, 'plate-motion').sort((a, b) => a.position.x - b.position.x);
    expect(arrows).toHaveLength(2);
    arrows.forEach((arrow, index) => {
      const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(arrow.quaternion);
      const expected = index === 0 ? left : right;
      expect(direction.x).toBeCloseTo(expected[0]);
      expect(direction.y).toBeCloseTo(0);
      expect(direction.z).toBeCloseTo(expected[1]);
    });
  });

  it('makes transform slip visible through matching markers attached to each plate', async () => {
    const model = await mountModel({ mode: 'transform', offset: 0 });
    const markerPositions = () => features(model.scene, 'matching-marker').map((marker) => ({
      localZ: marker.position.z,
      world: marker.getWorldPosition(new THREE.Vector3())
    }));
    const before = markerPositions();
    expect(before).toHaveLength(4);
    const sameBand = before.filter((marker) => marker.localZ === before[0].localZ);
    expect(sameBand).toHaveLength(2);
    expect(sameBand[0].world.z).toBeCloseTo(sameBand[1].world.z);
    model.update({ offset: 160 });
    const after = markerPositions().filter((marker) => marker.localZ === before[0].localZ).sort((a, b) => a.world.x - b.world.x);
    expect(after[0].world.z).toBeGreaterThan(sameBand[0].world.z);
    expect(after[1].world.z).toBeLessThan(sameBand[0].world.z);
    expect(after[0].world.z - sameBand[0].world.z).toBeCloseTo(sameBand[0].world.z - after[1].world.z);
  });

  it('keeps cut rock faces and depth ticks on the selected section plane', async () => {
    const model = await mountModel({ mode: 'transform', cut: 0, offset: 160 });
    for (const cut of [0, -10, 10]) {
      model.update({ cut });
      const caps = features(model.scene, 'cut-rock-face').filter((cap) => cap.visible);
      expect(caps.length).toBeGreaterThanOrEqual(2);
      caps.forEach((cap) => expect(cap.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(cut));
      const ticks = [];
      const mantleWidth = new THREE.Box3().setFromObject(features(model.scene, 'solid-mantle-envelope')[0]).getSize(new THREE.Vector3()).x;
      model.scene.traverse((child) => {
        const positions = child.geometry?.attributes.position;
        if (child.isLineSegments && positions?.count === 2 && Math.abs(positions.getX(0) - positions.getX(1)) > mantleWidth * 0.9) ticks.push(child);
      });
      expect(ticks).toHaveLength(4);
      ticks.forEach((tick) => {
        const positions = tick.geometry.attributes.position;
        expect(positions.getZ(0)).toBeCloseTo(cut);
        expect(positions.getZ(1)).toBeCloseTo(cut);
      });
    }
    model.update({ cut: null });
    expect(features(model.scene, 'cut-rock-face').every((cap) => !cap.visible)).toBe(true);
  });

  it('shows a narrow molten fissure within solid newly formed seafloor', async () => {
    const model = await mountModel({ mode: 'divergent', rift: 180 });
    const solid = features(model.scene, 'new-solid-crust')[0];
    const fissure = features(model.scene, 'ridge-fissure')[0];
    expect(solid).toBeTruthy();
    expect(fissure).toBeTruthy();
    const solidWidth = new THREE.Box3().setFromObject(solid).getSize(new THREE.Vector3()).x;
    const fissureWidth = new THREE.Box3().setFromObject(fissure).getSize(new THREE.Vector3()).x;
    expect(fissureWidth).toBeLessThan(solidWidth / 4);
    const rockMaterials = Array.isArray(solid.material) ? solid.material : [solid.material];
    rockMaterials.forEach((material) => expect(material.emissive.getHex()).toBe(0));
  });

  it('updates evidence, camera and cut depth without replacing the rock geometry', async () => {
    const model = await mountModel();
    const initial = descendingSlab(model.scene);
    model.update({ quakes: [{ depthKm: 600, distKm: 600, strikeKm: -100, m: 6 }] });
    expect(descendingSlab(model.scene)).toBe(initial);
    model.update({ rotY: 55, rotX: -12 });
    expect(descendingSlab(model.scene)).toBe(initial);
    model.update({ cut: 0 });
    expect(descendingSlab(model.scene)).toBe(initial);
  });

  it('keeps named boundary features when the depth ruler is hidden or viewed from above', async () => {
    for (const [mode, words] of [['convergent', ['trench', 'volcanic arc']], ['divergent', ['ridge axis']], ['transform', ['transform fault']]]) {
      gl.unmount();
      rendered = null;
      const model = await mountModel({ mode, showScale: false }, 334, 300);
      const initial = gl.debug().geometryBuilds;
      expect(gl.debug().depthLabelCount).toBe(0);
      expect(gl.debug().labelRects.map(label => label.text)).toEqual([...words, 'Focus · 350 km']);
      model.update({ showScale: true, surfaceView: true, rotX: -88, rotY: 0, cut: null });
      expect(gl.debug().depthLabelCount).toBe(0);
      expect(gl.debug().labelRects.map(label => label.text)).toEqual([...words, 'Focus · 350 km']);
      expect(gl.debug().geometryBuilds).toBe(initial);
      model.update({ surfaceView: false, rotX: 0, rotY: 0, cut: 0 });
      expect(gl.debug().depthLabelCount).toBe(4);
      expect(gl.debug().featureLabelCount).toBe(words.length);
      const rects = gl.debug().labelRects;
      for (let i = 0; i < rects.length; i++) {
        const a = rects[i];
        expect(a.x).toBeGreaterThanOrEqual(-0.01);
        expect(a.y).toBeGreaterThanOrEqual(-0.01);
        expect(a.x + a.width).toBeLessThanOrEqual(334.01);
        expect(a.y + a.height).toBeLessThanOrEqual(300.01);
        for (let j = i + 1; j < rects.length; j++) {
          const b = rects[j];
          const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          expect(overlapX > 0.01 && overlapY > 0.01, `${mode}: ${a.text} overlaps ${b.text}`).toBe(false);
        }
      }
    }
  });

  it('connects the labeled internal focus to the surface directly above its true coordinates', async () => {
    const model = await mountModel({ quakes: [{ depthKm: 520, distKm: 505, strikeKm: -120, m: 5 }] }, 334, 300);
    const guide = features(model.scene, 'focus-depth-guide')[0];
    const surface = features(model.scene, 'focus-surface-projection')[0];
    expect(guide.material.isLineDashedMaterial).toBe(true);
    expect(Array.from(guide.geometry.attributes.position.array)).toEqual([50.5, 0, -12, 50.5, -52, -12]);
    expect(surface.position.toArray()).toEqual([50.5, 0, -12]);
    expect(surface.geometry.type).toBe('RingGeometry');
    const viewDepth = -surface.position.clone().applyMatrix4(model.camera.matrixWorldInverse).z;
    const pixelsPerUnit = 300 / (2 * viewDepth * Math.tan(model.camera.fov * Math.PI / 360));
    expect(surface.scale.x * 3.8 * pixelsPerUnit).toBeCloseTo(8);
    expect(surface.quaternion.angleTo(model.camera.quaternion)).toBeCloseTo(0);
    expect(guide.material.depthTest).toBe(false);
    expect(features(model.scene, 'focus-depth-label')[0].userData.label).toBe('Focus · 520 km');
    const builds = gl.debug().geometryBuilds;
    model.update({ surfaceView: true, rotX: -88, rotY: 0, showScale: false });
    expect(gl.debug().depthLabelCount).toBe(0);
    expect(gl.debug().focusAnnotation).toEqual({ depthKm: 520, point: { x: 50.5, y: -52, z: -12 }, surface: { x: 50.5, y: 0, z: -12 } });
    expect(features(model.scene, 'focus-depth-label')[0].userData.label).toBe('Focus · 520 km');
    expect(gl.debug().geometryBuilds).toBe(builds);
  });

  it('labels the newest retained focus and removes its guide when all observations are clipped or cleared', async () => {
    const retained = { depthKm: 180, distKm: 180, strikeKm: -100, m: 5 };
    const removed = { depthKm: 520, distKm: 520, strikeKm: 100, m: 5 };
    const model = await mountModel({ quakes: [retained, removed] }, 334, 300);
    expect(gl.debug().focusAnnotation.depthKm).toBe(520);
    model.update({ cut: 0 });
    expect(gl.debug().focusAnnotation.depthKm).toBe(180);
    expect(features(model.scene, 'focus-depth-guide')).toHaveLength(1);
    const guide = features(model.scene, 'focus-depth-guide')[0];
    let disposed = false;
    guide.geometry.addEventListener('dispose', () => { disposed = true; });
    model.update({ quakes: [removed] });
    expect(disposed).toBe(true);
    expect(gl.debug().focusAnnotation).toBeNull();
    expect(features(model.scene, 'focus-depth-guide')).toHaveLength(0);
    expect(gl.debug().labelRects.some(label => /Focus/.test(label.text))).toBe(false);
    model.update({ cut: null, quakes: [retained] });
    expect(gl.debug().focusAnnotation.depthKm).toBe(180);
    model.update({ quakes: [] });
    expect(gl.debug().focusAnnotation).toBeNull();
    expect(features(model.scene, 'focus-depth-label')).toHaveLength(0);
  });

  it('fits the complete slab and depth scale into a narrow screen at the default zoom', async () => {
    const model = await mountModel({}, 360, 620);
    const slab = new THREE.Box3().setFromObject(descendingSlab(model.scene));
    for (const x of [slab.min.x, slab.max.x]) for (const y of [slab.min.y, slab.max.y]) for (const z of [slab.min.z, slab.max.z]) {
      const projected = new THREE.Vector3(x, y, z).project(model.camera);
      expect(Math.abs(projected.x)).toBeLessThan(1);
      expect(Math.abs(projected.y)).toBeLessThan(1);
    }
    const labels = [];
    model.scene.traverse((child) => { if (child.isSprite && /^(surface|70 km|300 km|700 km)$/.test(child.userData.label || '')) labels.push(child); });
    expect(labels).toHaveLength(4);
    labels.forEach((label) => {
      const projected = label.getWorldPosition(new THREE.Vector3()).project(model.camera);
      expect(Math.abs(projected.x)).toBeLessThan(1);
      expect(Math.abs(projected.y)).toBeLessThan(1);
    });
    const rects = gl.debug().labelRects;
    expect(rects.length).toBeGreaterThanOrEqual(4);
    rects.forEach((rect) => {
      expect(rect.height).toBeGreaterThanOrEqual(20);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(360);
      expect(rect.y + rect.height).toBeLessThanOrEqual(620);
    });
    const depthRects = rects.filter((rect) => /^(surface|70 km|300 km|700 km)$/.test(rect.text)).sort((a, b) => a.y - b.y);
    for (let i = 1; i < depthRects.length; i++) expect(depthRects[i].y).toBeGreaterThanOrEqual(depthRects[i - 1].y + depthRects[i - 1].height);
  });

  it('keeps trench and volcanic-arc captions separate during rotation on desktop and a 390px phone', async () => {
    // Browser reproduction: Turn left, then Tilt up, from the home view.
    // A 390px phone viewport gives the embedded canvas 334px of usable width.
    for (const [width, height] of [[693, 516], [334, 300], [390, 300]]) {
      gl.unmount();
      rendered = null;
      const model = await mountModel({ cut: 0 }, width, height);
      for (const [rotX, rotY] of [[-22, -38], [-37, -58], [-60, -95], [-22, 30]]) {
        model.update({ rotX, rotY });
        const labels = [];
        model.scene.traverse((child) => {
          if (!child.isSprite || !child.userData.label) return;
          const world = child.getWorldPosition(new THREE.Vector3());
          const screen = world.clone().project(model.camera);
          const depth = -world.applyMatrix4(model.camera.matrixWorldInverse).z;
          const scale = child.getWorldScale(new THREE.Vector3());
          const pixelsPerUnit = height / (2 * depth * Math.tan(model.camera.fov * Math.PI / 360));
          const w = scale.x * pixelsPerUnit, h = scale.y * pixelsPerUnit;
          labels.push({ text: child.userData.label, x: (screen.x + 1) * width / 2 - w / 2, y: (1 - screen.y) * height / 2 - h / 2, width: w, height: h });
        });
        const captions = labels.filter((label) => label.text === 'trench' || label.text === 'volcanic arc');
        expect(captions, 'both boundary captions are present').toHaveLength(2);
        captions.forEach((caption) => {
          const view = `${width}x${height}, rotation ${rotX}/${rotY}, ${caption.text}`;
          expect(caption.x, view).toBeGreaterThanOrEqual(-0.01);
          expect(caption.y, view).toBeGreaterThanOrEqual(-0.01);
          expect(caption.x + caption.width, view).toBeLessThanOrEqual(width + 0.01);
          expect(caption.y + caption.height, view).toBeLessThanOrEqual(height + 0.01);
          labels.filter((other) => other !== caption).forEach((other) => {
            const overlapX = Math.min(caption.x + caption.width, other.x + other.width) - Math.max(caption.x, other.x);
            const overlapY = Math.min(caption.y + caption.height, other.y + other.height) - Math.max(caption.y, other.y);
            expect(overlapX > 0.01 && overlapY > 0.01, `${view} overlaps ${other.text}`).toBe(false);
          });
        });
      }
    }
  });
});

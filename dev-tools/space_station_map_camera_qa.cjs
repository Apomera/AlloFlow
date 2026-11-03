#!/usr/bin/env node
'use strict';

// Native camera and lighting-guide QA against an already running local preview.
//   node dev-tools/space_station_map_camera_qa.cjs
//   node dev-tools/space_station_map_camera_qa.cjs --widths=1440,390 --base=http://127.0.0.1:4179
// Add --visitors-only for the vehicle inspection, layout and cleanup checks.
// Add --labels-only for selected/hover labels and native recentering checks.
// Add --compass-only for camera-basis, end-on and accessible compass checks.
// Add --pan-only for native keyboard, mouse and touch camera translation.
// Add --selection-only for geometry-derived 2D selection brackets.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const match = process.argv.slice(2).find(value => value.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-camera-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
const visitorsOnly = process.argv.includes('--visitors-only');
const labelsOnly = process.argv.includes('--labels-only');
const compassOnly = process.argv.includes('--compass-only');
const panOnly = process.argv.includes('--pan-only');
const selectionOnly = process.argv.includes('--selection-only');
assert([visitorsOnly, labelsOnly, compassOnly, panOnly, selectionOnly].filter(Boolean).length <= 1, 'Choose one targeted camera QA path');
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-6) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Expected finite values: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const moved = (a, b) => Math.hypot(...a.map((value, index) => value - b[index])) > 1e-5;

// Observe the real camera after render, independently of the public snapshot.
function instrumentCameraRender() {
  const Original = window.THREE.WebGLRenderer;
  window.__issCameraQAContexts = [];
  window.__issCameraQADraw = null;
  window.__issVisitorQA = { scene: null, camera: null, resources: {} };
  let sequence = 0;
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issCameraQAContexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = render.apply(this, arguments);
      if (scene.name === 'iss-station-inspection') {
        const state = renderer.domElement._issCameraState?.();
        const station = scene.getObjectByName('iss-inspected-station');
        if (state && station) {
          window.__issVisitorQA.scene = scene;
          window.__issVisitorQA.camera = camera;
          const projected = new window.THREE.Vector3(...state.target).project(camera);
          const rotation = new window.THREE.Quaternion(); station.getWorldQuaternion(rotation);
          window.__issCameraQADraw = { sequence: ++sequence, position: camera.position.toArray(),
            selected: renderer.domElement._issWantSel, cutaway: !!renderer.domElement._issCutaway,
            projectedTarget: projected.toArray(), stationQuaternion: rotation.toArray(),
            rotation: camera.quaternion.toArray(), fov: camera.fov,
            right: new window.THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).toArray(),
            up: new window.THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).toArray(),
            height: renderer.domElement.getBoundingClientRect().height,
            gpu: { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls },
            selectionRings: scene.children.filter(node => node.isMesh && node.geometry?.type === 'TorusGeometry').length,
            guides: scene.children.filter(object => object instanceof window.THREE.ArrowHelper).map(arrow => {
              const orientation = new window.THREE.Quaternion(); arrow.getWorldQuaternion(orientation);
              return { color: arrow.line.material.color.getHex(), visible: arrow.visible,
                direction: new window.THREE.Vector3(0, 1, 0).applyQuaternion(orientation).toArray() };
            }) };
        }
      }
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype;
  Object.setPrototypeOf(ObservedRenderer, Original);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

const visitors = [
  { id: 'dragon', host: 'harmony', port: [0, 0, -4.2] },
  { id: 'progress', host: 'zvezda', port: [0, 0, 6.2] },
  { id: 'cygnus', host: 'unity', port: [0, -.6, .2] }
];

// Read the geometry submitted to WebGL. The expected extent comes from the
// rendered vertices and the host port, independently of the camera fit helper.
function vehicleGeometry({ id, port }) {
  const { scene, camera, resources } = window.__issVisitorQA;
  const group = scene.getObjectByName('iss-visitor-' + id);
  if (!group) throw new Error(`Missing visiting vehicle group: ${id}`);
  const station = scene.getObjectByName('iss-inspected-station');
  const portWorld = station.localToWorld(new THREE.Vector3(...port));
  const world = new THREE.Box3().setFromObject(group).expandByPoint(portWorld);
  const projected = new THREE.Box3().expandByPoint(portWorld.clone().project(camera));
  const materials = new Map(), partIds = new Set(), solarSurfaces = [], fans = [];
  let vertices = 0, gap = Infinity;
  function track(resource) {
    if (!resources[resource.uuid]) {
      resources[resource.uuid] = { kind: resource.type, name: resource.name || null, texture: !!resource.isTexture, disposed: false };
      resource.addEventListener('dispose', () => { resources[resource.uuid].disposed = true; });
    }
  }
  group.traverse(mesh => {
    const positions = mesh.geometry?.getAttribute('position');
    if (!positions) return;
    partIds.add(`${mesh._issVisitorId}/${mesh._issParentId}`);
    const box = new THREE.Box3().setFromObject(mesh);
    gap = Math.min(gap, box.distanceToPoint(portWorld));
    track(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.set(material.uuid, material.opacity);
      track(material);
      if (material.map) track(material.map);
    }
    const parameters = mesh.geometry.parameters || {};
    if (mesh.name === 'iss-dragon-solar-sleeve' || id === 'progress' && parameters.width === .98 && parameters.height === .02 ||
        id === 'cygnus' && mesh.name === 'iss-cygnus-ultraflex') {
      const material = mesh.material, map = material.map; let colors = null;
      if (map?.image instanceof HTMLCanvasElement) {
        const pixels = map.image.getContext('2d').getImageData(0, 0, map.image.width, map.image.height).data, unique = new Set();
        for (let i = 0; i < pixels.length; i += 4) unique.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]);
        colors = unique.size;
      }
      solarSurfaces.push({ name: mesh.name, materialId: material.uuid, color: material.color.getHex(), emissive: material.emissive.getHex(),
        roughness: material.roughness, metalness: material.metalness, emissiveMap: !!material.emissiveMap,
        doubleSided: material.side === THREE.DoubleSide, transparent: material.transparent,
        textureSlots: Object.keys(material).filter(key => material[key]?.isTexture).sort(),
        map: map ? { id: map.uuid, name: map.name, width: map.image?.width, height: map.image?.height, canvas: map.image instanceof HTMLCanvasElement,
          srgb: map.encoding === THREE.sRGBEncoding, clamp: map.wrapS === THREE.ClampToEdgeWrapping && map.wrapT === THREE.ClampToEdgeWrapping,
          repeat: map.repeat.toArray(), colors } : null });
    }
    if (mesh.name === 'iss-cygnus-ultraflex') {
      const normal = mesh.geometry.getAttribute('normal'), uv = mesh.geometry.getAttribute('uv');
      const radii = [], gores = Array(10).fill(false); let finite = true, planar = true, normalForward = true, uvRadial = true, ringsValid = true, centerCount = 0;
      for (let i = 0; i < positions.count; ++i) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i), radius = Math.hypot(x, y);
        finite &&= [x, y, z].every(Number.isFinite); planar &&= Math.abs(z) < 1e-8; radii.push(radius);
        if (radius < 1e-7) centerCount++; else ringsValid &&= Math.abs(radius - .5) < 1e-7;
        normalForward &&= !!normal && Math.abs(normal.getX(i)) < 1e-8 && Math.abs(normal.getY(i)) < 1e-8 && Math.abs(normal.getZ(i) - 1) < 1e-8;
        uvRadial &&= !!uv && Math.abs(uv.getX(i) - (x + .5)) < 1e-7 && Math.abs(uv.getY(i) - (y + .5)) < 1e-7;
        for (let gore = 0; gore < 10; ++gore) if (Math.hypot(x - .5 * Math.cos(gore * Math.PI / 5), y - .5 * Math.sin(gore * Math.PI / 5)) < 1e-7) gores[gore] = true;
      }
      fans.push({ position: mesh.position.toArray(), rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z], scale: mesh.scale.toArray(),
        vertices: positions.count, triangles: mesh.geometry.index.count / 3, segments: parameters.segments, thetaStart: parameters.thetaStart, thetaLength: parameters.thetaLength,
        minRadius: Math.min(...radii), maxRadius: Math.max(...radii), finite, planar, normalForward, uvRadial, ringsValid, centerCount, gores });
    }
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positions.count; ++i) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera);
      projected.expandByPoint(vertex);
      ++vertices;
    }
  });
  const host = scene.getObjectByName('iss-module-hull-' + group.userData.hostId);
  if (!host) throw new Error(`Missing host module hull: ${group.userData.hostId}`);
  function ends(name) {
    const part = group.getObjectByName(name);
    if (!part) return null;
    const positions = part.geometry.getAttribute('position'), normals = part.geometry.getAttribute('normal'), rings = new Map();
    let finite = true, maxRadius = 0;
    for (let i = 0; i < positions.count; ++i) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i), radius = Math.hypot(x, z);
      finite &&= [x, y, z].every(Number.isFinite); maxRadius = Math.max(maxRadius, radius);
      rings.set(y, Math.max(radius, rings.get(y) || 0));
    }
    const profile = Array.from(rings, ([y, radius]) => ({ y, radius })).sort((a, b) => a.y - b.y);
    const bottom = profile[0], top = profile[profile.length - 1];
    return { top: part.localToWorld(new THREE.Vector3(0, top.y, 0)).z,
      bottom: part.localToWorld(new THREE.Vector3(0, bottom.y, 0)).z,
      topRadius: top.radius, bottomRadius: bottom.radius, localMinY: bottom.y, localMaxY: top.y, maxRadius, profile, finite,
      normalsFinite: !!normals && Array.from(normals.array).every(Number.isFinite),
      uvFinite: !!part.geometry.getAttribute('uv') && Array.from(part.geometry.getAttribute('uv').array).every(value => Number.isFinite(value) && value >= 0 && value <= 1),
      parameters: part.geometry.parameters,
      vertices: positions.count, triangles: part.geometry.index ? part.geometry.index.count / 3 : positions.count / 3 };
  }
  return { host: group.userData.hostId, label: group.userData.label, port: group.userData.port, partIds: [...partIds], vertices,
    center: world.getCenter(new THREE.Vector3()).toArray(), radius: world.getBoundingSphere(new THREE.Sphere()).radius,
    min: projected.min.toArray(), max: projected.max.toArray(), materials: Object.fromEntries(materials), gap,
    hostGap: new THREE.Box3().setFromObject(host).distanceToPoint(portWorld),
    capsule: ends('iss-dragon-capsule'), engine: ends('iss-progress-engine'),
    trunk: ends('iss-dragon-trunk'), sleeve: ends('iss-dragon-solar-sleeve'), solarSurfaces, fans,
    cygnusAtlasIndependent: id !== 'cygnus' || solarSurfaces.every(solar => solar.map?.id !== scene.getObjectByName('iss-dragon-solar-sleeve')?.material.map?.uuid) };
}

function verifyDragonCapsule(capsule) {
  assert(capsule?.finite && capsule.normalsFinite, 'The rendered capsule has finite vertices and normals');
  near(capsule.localMinY, -.36); near(capsule.localMaxY, .36); near(capsule.maxRadius, .3);
  near(capsule.topRadius, .09); near(capsule.bottomRadius, .3);
  near(capsule.top, -4.32); near(capsule.bottom, -5.04);
  assert(capsule.top > capsule.bottom, 'The blunt capsule neck faces Harmony and its base faces the trunk');
  assert(capsule.vertices > 0 && capsule.vertices <= 450 && capsule.triangles > 0 && capsule.triangles <= 800,
    'The single capsule mesh keeps a bounded geometry budget');
  assert(capsule.profile.length >= 4, 'The capsule includes a shaped shoulder instead of one conical wall');
  let nonlinear = false;
  for (let i = 0; i < capsule.profile.length; ++i) {
    const ring = capsule.profile[i]; assert(Number.isFinite(ring.y) && Number.isFinite(ring.radius));
    assert(ring.radius > 0 && ring.radius <= .300001 && ring.y >= -.360001 && ring.y <= .360001);
    if (i) assert(ring.y > capsule.profile[i - 1].y, 'Profile rings stay ordered along the capsule axis');
    const straight = .3 + (.09 - .3) * ((ring.y + .36) / .72);
    nonlinear ||= Math.abs(ring.radius - straight) > .015;
  }
  assert(nonlinear, 'The capsule shoulder departs from a straight cone or frustum');
}

function verifyVisitorSolar(id, geometry) {
  if (id === 'progress') {
    assert.equal(geometry.solarSurfaces.length, 2, 'Progress retains its two original solar surfaces');
    for (const solar of geometry.solarSurfaces) {
      assert.equal(solar.name, 'iss-progress-solar-wing');
      assert.equal(solar.color, 0xffffff); assert.equal(solar.emissive, 0);
      assert.equal(solar.roughness, .38); assert.equal(solar.metalness, .3); assert.equal(solar.emissiveMap, false);
      assert.equal(solar.textureSlots.length, 1); assert.equal(solar.textureSlots[0], 'map');
      assert(solar.map?.canvas && solar.map.srgb && solar.map.clamp);
      assert.equal(solar.map.name, 'iss-progress-solar-cells', 'Progress retains its own atlas, without a Dragon or Cygnus leak');
      assert.equal(solar.map.width, 512); assert.equal(solar.map.height, 256); vectorNear(solar.map.repeat, [1, 1]);
      assert(solar.map.colors > 1);
    }
    assert.equal(geometry.solarSurfaces[0].materialId, geometry.solarSurfaces[1].materialId);
    assert.equal(geometry.solarSurfaces[0].map.id, geometry.solarSurfaces[1].map.id);
    return;
  }
  if (id === 'cygnus') {
    assert.equal(geometry.fans.length, 2); assert.equal(geometry.solarSurfaces.length, 2);
    const ordered = geometry.fans.slice().sort((a, b) => a.position[0] - b.position[0]);
    for (const [index, fan] of ordered.entries()) {
      vectorNear(fan.position, [index ? 1.06 : -1.06, -2.39, .2]); vectorNear(fan.rotation, [0, 0, 0]); vectorNear(fan.scale, [1, 1, 1]);
      assert.equal(fan.segments, 60); assert.equal(fan.vertices, 62); assert.equal(fan.triangles, 60);
      near(fan.thetaStart, 0); near(fan.thetaLength, 2 * Math.PI); assert.equal(fan.centerCount, 1); assert(fan.ringsValid);
      near(fan.minRadius, 0); near(fan.maxRadius, .5);
      assert(fan.finite && fan.planar && fan.normalForward && fan.uvRadial, 'Both fan discs stay finite, planar and radially mapped');
      assert(fan.gores.length === 10 && fan.gores.every(Boolean), 'All ten existing rib angles retain exact perimeter vertices');
    }
    for (const solar of geometry.solarSurfaces) {
      assert.equal(solar.name, 'iss-cygnus-ultraflex'); assert.equal(solar.color, 0xffffff); assert.equal(solar.emissive, 0);
      assert.equal(solar.roughness, .38); assert.equal(solar.metalness, .3); assert.equal(solar.emissiveMap, false);
      assert(solar.doubleSided && solar.transparent, 'The fan remains visible from both sides and supports host cutaway');
      assert.equal(solar.textureSlots.length, 1); assert.equal(solar.textureSlots[0], 'map');
      assert(solar.map?.canvas && solar.map.srgb && solar.map.clamp); assert.equal(solar.map.name, 'iss-cygnus-solar-cells');
      assert.equal(solar.map.width, 512); assert.equal(solar.map.height, 512); vectorNear(solar.map.repeat, [1, 1]); assert(solar.map.colors > 1);
    }
    assert.equal(geometry.solarSurfaces[0].materialId, geometry.solarSurfaces[1].materialId, 'Both fans reuse one private material');
    assert.equal(geometry.solarSurfaces[0].map.id, geometry.solarSurfaces[1].map.id, 'Both fans reuse one atlas texture');
    assert(geometry.cygnusAtlasIndependent, 'The Cygnus atlas is independent of Dragon');
    return;
  }
  for (const [name, radius, height, zTop, zBottom] of [['trunk', .3, .82, -5.04, -5.86], ['sleeve', .308, .7, -5.1, -5.8]]) {
    const part = geometry[name]; assert(part?.finite && part.normalsFinite && part.uvFinite);
    near(part.localMinY, -height / 2); near(part.localMaxY, height / 2); near(part.maxRadius, radius);
    near(part.top, zTop); near(part.bottom, zBottom); near(part.topRadius, radius); near(part.bottomRadius, radius);
    assert.equal(part.parameters.radialSegments, 32); near(part.parameters.height, height);
    assert(part.vertices > 0 && part.vertices <= (name === 'trunk' ? 196 : 66)); assert(part.triangles > 0 && part.triangles <= (name === 'trunk' ? 128 : 64));
  }
  assert.equal(geometry.trunk.parameters.openEnded, false, 'The trunk retains both closed end caps');
  assert.equal(geometry.sleeve.parameters.openEnded, true);
  near(geometry.sleeve.parameters.thetaStart, -Math.PI * .62); near(geometry.sleeve.parameters.thetaLength, Math.PI * 1.24);
  assert.equal(geometry.solarSurfaces.length, 1);
  const solar = geometry.solarSurfaces[0]; assert.equal(solar.name, 'iss-dragon-solar-sleeve');
  assert.equal(solar.color, 0xffffff); assert.equal(solar.emissive, 0); assert.equal(solar.emissiveMap, false);
  assert.equal(solar.roughness, .38); assert.equal(solar.metalness, .3);
  assert(solar.map?.canvas && solar.map.srgb && solar.map.clamp, 'The private Dragon atlas uses sRGB and clamped edges');
  assert.equal(solar.map.name, 'iss-dragon-solar-cells');
  assert.equal(solar.textureSlots.length, 1); assert.equal(solar.textureSlots[0], 'map', 'The solar atlas is a color map only');
  assert.equal(solar.map.width, 512); assert.equal(solar.map.height, 256); vectorNear(solar.map.repeat, [1, 1]);
  assert(solar.map.colors > 1, 'The rendered solar sleeve uses painted cells, not a flat blue image');
}

// Choose a visible point using the drawable meshes, then let the native canvas
// event make the selection. HUD elements and modules in front are excluded.
function visibleVisitorPoint(id) {
  const { scene, camera } = window.__issVisitorQA;
  const canvas = document.querySelector('.iss-station-stage canvas'), box = canvas.getBoundingClientRect();
  const group = scene.getObjectByName('iss-visitor-' + id), projected = new THREE.Box3();
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.getAttribute('position'), vertex = new THREE.Vector3();
    for (let i = 0; i < positions.count; ++i) projected.expandByPoint(vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera));
  });
  const visibleMeshes = [];
  scene.getObjectByName('iss-inspected-station').traverseVisible(mesh => { if (mesh.isMesh) visibleMeshes.push(mesh); });
  const ray = new THREE.Raycaster();
  for (const xPart of [.5, .4, .6, .3, .7, .2, .8, .1, .9]) {
    for (const yPart of [.5, .4, .6, .3, .7, .2, .8, .1, .9]) {
      const x = projected.min.x + xPart * (projected.max.x - projected.min.x);
      const y = projected.min.y + yPart * (projected.max.y - projected.min.y);
      const clientX = Math.round(box.left + (x + 1) * box.width / 2), clientY = Math.round(box.top + (1 - y) * box.height / 2);
      if (document.elementFromPoint(clientX, clientY) !== canvas) continue;
      ray.setFromCamera(new THREE.Vector2(2 * (clientX - box.left) / box.width - 1, 1 - 2 * (clientY - box.top) / box.height), camera);
      if (ray.intersectObjects(visibleMeshes, false)[0]?.object._issVisitorId === id) return { x: clientX, y: clientY };
    }
  }
  return null;
}

// Derive the anchor from the actual selected hull, and read SVG coordinates in
// screen space so a mismatched canvas size or CSS transform cannot pass.
function selectionLabelGeometry() {
  const { scene, camera, resources } = window.__issVisitorQA;
  const canvas = document.querySelector('.iss-station-stage canvas');
  let hull;
  scene.getObjectByName('iss-inspected-station').traverse(mesh => { if (mesh._issId === canvas._issWantSel) hull = mesh; });
  if (!hull) throw new Error('Selected module has no rendered hull');
  for (const resource of [hull.geometry, hull.material]) {
    if (!resources[resource.uuid]) {
      resources[resource.uuid] = { kind: resource.type, disposed: false };
      resource.addEventListener('dispose', () => { resources[resource.uuid].disposed = true; });
    }
  }
  const rect = node => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
  const bounds = rect(canvas), projected = hull.getWorldPosition(new THREE.Vector3()).project(camera);
  const marker = canvas.parentElement.querySelector('[data-iss-module-marker]'), chip = marker.querySelector('span');
  const circle = marker.querySelector('svg circle'), path = marker.querySelector('svg path');
  if (!circle || !path) throw new Error('Selected label requires an SVG leader and anchor');
  const screen = (node, x, y) => { const p = new DOMPoint(x, y).matrixTransform(node.getScreenCTM()); return [p.x, p.y]; };
  const pathPoint = distance => { const p = path.getPointAtLength(distance); return screen(path, p.x, p.y); };
  const offscreen = canvas.closest('.iss-root').querySelector('[data-iss-selection-offscreen]');
  return { id: canvas._issWantSel, hull: hull.name, projected: projected.toArray(), canvas: bounds,
    world: hull.getWorldPosition(new THREE.Vector3()).toArray(),
    anchor: [bounds.left + (projected.x + 1) * bounds.width / 2, bounds.top + (1 - projected.y) * bounds.height / 2],
    visible: !marker.hidden && getComputedStyle(marker).display !== 'none' && Number(getComputedStyle(marker).opacity) > .9,
    chip: rect(chip), text: chip.textContent,
    circle: screen(circle, circle.cx.baseVal.value, circle.cy.baseVal.value),
    line: [pathPoint(0), pathPoint(path.getTotalLength())],
    offscreen: { visible: !!offscreen && !offscreen.hidden && getComputedStyle(offscreen).display !== 'none',
      text: offscreen?.textContent, tag: offscreen?.tagName, bounds: offscreen ? rect(offscreen) : null } };
}

// Find genuinely exposed module geometry, then use trusted native pointer input.
// Returning edge candidates lets the hover assertion exercise real clamping.
function visibleModulePoints(id) {
  const { scene, camera } = window.__issVisitorQA;
  const canvas = document.querySelector('.iss-station-stage canvas'), bounds = canvas.getBoundingClientRect();
  const meshes = [];
  scene.getObjectByName('iss-inspected-station').traverseVisible(mesh => { if (mesh.isMesh) meshes.push(mesh); });
  const ray = new THREE.Raycaster(), points = [];
  for (let row = 1; row < 30; ++row) for (let column = 1; column < 40; ++column) {
    const x = Math.round(bounds.left + bounds.width * column / 40), y = Math.round(bounds.top + bounds.height * row / 30);
    if (document.elementFromPoint(x, y) !== canvas) continue;
    ray.setFromCamera(new THREE.Vector2(2 * (x - bounds.left) / bounds.width - 1, 1 - 2 * (y - bounds.top) / bounds.height), camera);
    const mesh = ray.intersectObjects(meshes, false)[0]?.object;
    if (!mesh || mesh._issVisitorId || (mesh._issId || mesh._issParentId) !== id) continue;
    points.push({ x, y, edge: Math.min(x - bounds.left, bounds.right - x, y - bounds.top, bounds.bottom - y) });
  }
  return points.sort((a, b) => a.edge - b.edge);
}

function verifySelectionLabel(label) {
  const inside = label.projected.every(value => value >= -1 && value <= 1);
  if (!inside) {
    assert.equal(label.visible, false, 'A projected-outside hull must not leave a floating selected label');
    assert.equal(label.offscreen.visible, true, 'An off-screen selection offers a native recenter action');
    assert.equal(label.offscreen.tag, 'BUTTON');
    assert.match(label.offscreen.text, new RegExp(label.id, 'i'));
    return label;
  }
  assert.equal(label.visible, true, 'The selected hull has a visible attached label');
  assert.equal(label.offscreen.visible, false);
  assert.match(label.text, new RegExp(label.id, 'i'));
  const c = label.canvas, b = label.chip;
  assert(b.width > 0 && b.height > 0);
  assert(b.left >= c.left - 1 && b.right <= c.right + 1 && b.bottom <= c.bottom + 1, `Selected chip stays in its canvas: ${JSON.stringify(label)}`);
  assert(b.top >= c.top + 52 - 1, 'Selected chip leaves the top HUD clear');
  vectorNear(label.circle, label.anchor, .12);
  const distance = point => Math.hypot(point[0] - label.anchor[0], point[1] - label.anchor[1]);
  const anchored = distance(label.line[0]) < distance(label.line[1]) ? 0 : 1;
  vectorNear(label.line[anchored], label.anchor, .12);
  const other = label.line[1 - anchored];
  assert(other[0] >= b.left - 1 && other[0] <= b.right + 1 && other[1] >= b.top - 1 && other[1] <= b.bottom + 1,
    'Leader terminates at the selected chip');
  return label;
}

// An orientation compass uses basis directions, never projected points. Read
// actual render matrices, independently of the product's projection helper.
function compassObservation() {
  const { scene, camera, resources } = window.__issVisitorQA;
  const station = scene.getObjectByName('iss-inspected-station');
  const widget = document.querySelector('[data-iss-orientation-widget]');
  const reading = document.querySelector('[data-iss-orientation-reading]');
  const visible = node => !!node && !node.hidden && getComputedStyle(node).display !== 'none' &&
    getComputedStyle(node).visibility !== 'hidden' && Number(getComputedStyle(node).opacity) > 0;
  const bbox = node => { const b = node.getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
  const rect = node => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
  const axes = ['x', 'y', 'z'].map((id, index) => {
    const basis = new THREE.Vector3(); basis.setComponent(index, 1);
    const world = basis.clone().transformDirection(station.matrixWorld);
    const direction = world.clone().transformDirection(camera.matrixWorldInverse).normalize();
    const line = widget.querySelector(`[data-iss-axis="${id}"]`), tip = widget.querySelector(`[data-iss-axis-tip="${id}"]`);
    const label = widget.querySelector(`[data-iss-axis-label="${id}"]`);
    const placement = tip.transform.baseVal.consolidate().matrix;
    const fraction = Math.hypot(direction.x, direction.y);
    return { id, direction: direction.toArray(), fraction,
      expected: [56 + 31 * direction.x, 56 - 31 * direction.y],
      expectedMode: fraction < .12 ? (direction.z > 0 ? 'toward' : 'away') : 'across',
      origin: [line.x1.baseVal.value, line.y1.baseVal.value], end: [line.x2.baseVal.value, line.y2.baseVal.value],
      tip: [placement.e, placement.f], lineVisible: visible(line), dashed: !!line.getAttribute('stroke-dasharray'),
      mode: line.dataset.mode, depth: Number(line.dataset.depth), ring: visible(tip.querySelector(`[data-iss-axis-ring="${id}"]`)),
      dot: visible(tip.querySelector(`[data-iss-axis-dot="${id}"]`)),
      cross: visible(tip.querySelector(`[data-iss-axis-cross="${id}"]`)),
      head: visible(tip.querySelector(`[data-iss-axis-head="${id}"]`)),
      label: { text: label.textContent, visible: visible(label), bounds: bbox(label) } };
  });
  // Observe one actual render resource for the shared teardown assertion.
  const hull = scene.getObjectByName('iss-module-hull-zarya');
  for (const resource of [hull.geometry, hull.material]) if (!resources[resource.uuid]) {
    resources[resource.uuid] = { kind: resource.type, disposed: false };
    resource.addEventListener('dispose', () => { resources[resource.uuid].disposed = true; });
  }
  return { axes, viewBox: widget.getAttribute('viewBox'), bounds: rect(widget), canvas: rect(document.querySelector('.iss-station-stage canvas')),
    visible: visible(widget), reading: reading?.textContent, live: reading?.closest('[aria-live],[role="status"],[role="alert"]')?.outerHTML || null,
    readingHidden: !reading || reading.closest('[aria-hidden="true"],[hidden]') !== null,
    helpOpen: !!document.querySelector('[data-iss-compass-help]')?.open };
}

function verifyCompass(observed) {
  assert.equal(observed.viewBox, '0 0 112 126');
  assert(observed.visible && observed.bounds.width > 0 && observed.bounds.height > 0);
  assert.equal(observed.live, null, 'The continuously updated orientation reading must not be a live region');
  assert.equal(observed.readingHidden, false, 'The compass reading remains in the accessibility tree');
  for (const axis of observed.axes) {
    vectorNear(axis.origin, [56, 56]); vectorNear(axis.end, axis.expected, .011);
    vectorNear(axis.tip, axis.expected, .011);
    near(axis.depth, axis.direction[2], .00011);
    assert.equal(axis.mode, axis.expectedMode);
    assert.equal(axis.dot, axis.mode === 'toward');
    assert.equal(axis.cross, axis.mode === 'away');
    assert.equal(axis.head, axis.mode === 'across');
    assert.equal(axis.ring, axis.mode !== 'across'); assert.equal(axis.lineVisible, axis.mode === 'across');
    assert.equal(axis.dashed, axis.depth < 0);
    near(Math.hypot(axis.end[0] - 56, axis.end[1] - 56), 31 * axis.fraction, .015);
    const label = axis.label.bounds;
    assert(axis.label.visible && label.width > 0 && label.height > 0);
    assert(label.x >= 0 && label.y >= 0 && label.x + label.width <= 112 && label.y + label.height <= 126,
      `Axis label remains within the widget: ${JSON.stringify(axis)}`);
    assert.match(axis.label.text, new RegExp(axis.id, 'i'));
    assert(Math.hypot(label.x + label.width / 2 - axis.end[0], label.y + label.height / 2 - axis.end[1]) < 25,
      'Each axis name follows its own arrow tip');
    const directionWord = axis.mode === 'across' ? 'across' : axis.mode === 'toward' ? 'toward' : 'away';
    assert.match(observed.reading, new RegExp(axis.id + '[^.;]*' + directionWord, 'i'));
  }
  return observed;
}

function verifyPanCamera(before, after, dx, dy, bounded = false) {
  const old = before.camera, next = after.camera, draw = before.draw;
  const translation = next.target.map((value, i) => value - old.target[i]);
  vectorNear(next.position.map((value, i) => value - old.position[i]), translation);
  vectorNear(next.position.map((value, i) => value - next.target[i]), old.position.map((value, i) => value - old.target[i]));
  vectorNear(after.draw.rotation, draw.rotation); near(next.distance, old.distance);
  assert(moved(next.target, old.target), 'A nonzero unblocked pan translates the camera target');
  assert.equal(next.fit, null); assert.equal(next.focusId, null); assert.equal(next.panned, true);
  assert.equal(next.view, 'custom');
  assert(next.target[0] >= -24 - 1e-7 && next.target[0] <= 24 + 1e-7);
  assert(next.target[2] >= -24 - 1e-7 && next.target[2] <= 24 + 1e-7);
  assert(next.target[1] >= -3.8 - 1e-7 && next.target[1] <= 24 + 1e-7 && next.position[1] >= -3.8 - 1e-7);
  const perPixel = 2 * old.distance * Math.tan(draw.fov * Math.PI / 360) / draw.height;
  const requested = draw.right.map((value, i) => (-dx * value + dy * draw.up[i]) * perPixel);
  if (!bounded) vectorNear(translation, requested, 1e-5);
  else {
    const fraction = dot(translation, requested) / dot(requested, requested);
    assert(fraction > 0 && fraction < 1, 'A boundary shortens the requested pan');
    vectorNear(translation, requested.map(value => value * fraction), 1e-5);
  }
  return { translation, requested, perPixel };
}

function selectionBracketGeometry() {
  const { scene, camera } = window.__issVisitorQA;
  const cv = document.querySelector('.iss-station-stage canvas'), rect = cv.getBoundingClientRect();
  let hull; scene.getObjectByName('iss-inspected-station').traverse(node => { if (node._issId === cv._issWantSel) hull = node; });
  if (!hull.geometry.boundingBox) hull.geometry.computeBoundingBox();
  const box = hull.geometry.boundingBox, corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(hull.matrixWorld).project(camera);
    corners.push([(p.x + 1) * rect.width / 2, (1 - p.y) * rect.height / 2, p.z]);
  }
  const anchor = hull.getWorldPosition(new THREE.Vector3()).project(camera);
  const marker = document.querySelector('[data-iss-module-marker]');
  const path = marker.querySelector('[data-iss-selection-brackets]'), backing = marker.querySelector('[data-iss-selection-backing]');
  if (!path || !backing) throw new Error('Selection requires both a bracket path and its dark backing');
  const d = path.getAttribute('d') || '', length = d ? path.getTotalLength() : 0;
  const samples = [];
  if (length > 0) for (let i = 0; i < 4; ++i) {
    samples.push([i * length / 4 + 1e-4, (i + .5) * length / 4, (i + 1) * length / 4 - 1e-4].map(distance => {
      const p = path.getPointAtLength(distance), screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM());
      return [screen.x - rect.left, screen.y - rect.top];
    }));
  }
  const style = getComputedStyle(path), backStyle = getComputedStyle(backing);
  return { id: cv._issWantSel, width: rect.width, height: rect.height, corners, anchor: anchor.toArray(),
    d, backingD: backing.getAttribute('d') || '', length, samples,
    visible: !!d && !marker.hidden && Number(getComputedStyle(marker).opacity) > .9 && style.visibility !== 'hidden' && style.display !== 'none',
    stroke: style.stroke, backingStroke: backStyle.stroke, strokeWidth: Number.parseFloat(style.strokeWidth), backingWidth: Number.parseFloat(backStyle.strokeWidth),
    rings: scene.children.filter(node => node.isMesh && node.geometry?.type === 'TorusGeometry').length };
}

function verifySelectionBrackets(measured) {
  assert.equal(measured.rings, 0, 'Selection must not add a physical torus to the station scene');
  const finite = measured.corners.flat().every(Number.isFinite);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const left = clamp(Math.min(...measured.corners.map(p => p[0])) - 6, 8, measured.width - 8);
  const right = clamp(Math.max(...measured.corners.map(p => p[0])) + 6, 8, measured.width - 8);
  const top = clamp(Math.min(...measured.corners.map(p => p[1])) - 6, 8, measured.height - 8);
  const bottom = clamp(Math.max(...measured.corners.map(p => p[1])) + 6, 8, measured.height - 8);
  const visible = finite && measured.anchor.slice(0, 2).every(value => value >= -1 && value <= 1) && measured.anchor[2] > -1 && measured.anchor[2] < 1 &&
    measured.corners.every(p => p[2] > -1 && p[2] < 1) && right - left > 8 && bottom - top > 8;
  assert.equal(measured.visible, visible, 'Bracket visibility follows the actual hull bounds and anchor');
  assert.equal(measured.backingD, measured.d, 'Dark backing follows the exact same corner path');
  if (!visible) return { visible, left, right, top, bottom };
  near(measured.strokeWidth, 2); near(measured.backingWidth, 5);
  const warm = measured.stroke.match(/[\d.]+/g)?.map(Number), dark = measured.backingStroke.match(/[\d.]+/g)?.map(Number);
  assert(warm?.length >= 3 && warm[0] >= 220 && warm[1] >= 130 && warm[2] < 90, 'Selection uses an amber stroke');
  assert(dark?.length >= 3 && dark.slice(0, 3).every(value => value < 70), 'A dark backing keeps the thin corners readable');
  const leg = Math.min(14, (right - left) * .25, (bottom - top) * .25);
  near(measured.length, 8 * leg, .15);
  const expected = [[left, top], [right, top], [right, bottom], [left, bottom]], used = new Set();
  assert.equal(measured.samples.length, 4);
  for (const [start, corner, end] of measured.samples) {
    const index = expected.findIndex(p => Math.hypot(p[0] - corner[0], p[1] - corner[1]) < .08);
    assert(index >= 0 && !used.has(index), `Each broken bracket turns at a different geometry-derived corner: ${JSON.stringify(measured)}`); used.add(index);
    for (const point of [start, end]) {
      near(Math.hypot(point[0] - corner[0], point[1] - corner[1]), leg, .08);
      assert(Math.abs(point[0] - corner[0]) < .08 || Math.abs(point[1] - corner[1]) < .08);
      assert(point[0] >= left - .08 && point[0] <= right + .08 && point[1] >= top - .08 && point[1] <= bottom + .08);
    }
    assert(Math.abs((start[0] - corner[0]) * (end[0] - corner[0]) + (start[1] - corner[1]) * (end[1] - corner[1])) < .1,
      'Corner legs meet at right angles');
  }
  return { visible, left, right, top, bottom, leg };
}

function verifySnapshot(snapshot) {
  const c = snapshot.camera, light = snapshot.light;
  for (const key of ['position', 'target', 'projectedTarget', 'guideSun', 'guideNormal']) {
    assert(Array.isArray(c[key]) && c[key].length === 3 && c[key].every(Number.isFinite), `${key} is a finite vector`);
  }
  assert(Array.isArray(c.stationQuaternion) && c.stationQuaternion.length === 4);
  near(Math.hypot(...c.stationQuaternion), 1);
  vectorNear(c.stationQuaternion, [0, 0, 0, 1]);
  near(c.distance, Math.hypot(...c.position.map((value, index) => value - c.target[index])));
  assert(c.minDistance > 0 && c.maxDistance >= c.minDistance);
  assert(c.distance >= c.minDistance - 1e-6 && c.distance <= c.maxDistance + 1e-6);
  assert(c.position[1] >= -3.8 - 1e-6, 'Camera remains above the Earth inspection floor');
  near(c.projectedTarget[0], 0); near(c.projectedTarget[1], 0);
  assert(c.projectedTarget[2] > -1 && c.projectedTarget[2] < 1, 'The focus target remains inside the camera clipping range');
  assert.equal(c.tweening, false, 'Reduced-motion camera changes settle immediately');
  assert.equal(c.activePointers, 0, 'Completed gestures release their active pointers');
  assert.equal(typeof c.guides, 'boolean');
  assert(['overview', 'truss', 'labs', 'russian', 'nadir', 'custom'].includes(c.view));
  assert(c.renderCount > 0);
  assert.equal(light.playing, false);
  vectorNear(c.guideSun, light.sun); vectorNear(c.guideNormal, light.wingNormal);
  near(Math.hypot(...c.guideSun), 1); near(Math.hypot(...c.guideNormal), 1);
  const cosine = Math.max(-1, Math.min(1, dot(light.sun, light.wingNormal)));
  near(light.incidence, Math.max(0, cosine));
  near(light.generation, light.eclipse ? 0 : Math.max(0, cosine));
  assert.match(snapshot.angleText, /°|deg/i);
  near(snapshot.angle, Math.acos(cosine) * 180 / Math.PI, .100001);
  assert.equal(snapshot.guidePressed, String(c.guides));
  const activeViews = snapshot.viewButtons.filter(button => button.pressed === 'true');
  assert.equal(activeViews.length, c.view === 'custom' ? 0 : 1);
  if (c.view !== 'custom') assert.equal(activeViews[0].view, c.view);
  assert(snapshot.draw, 'The renderer proxy must observe an actual station draw');
  vectorNear(snapshot.draw.position, c.position);
  vectorNear(snapshot.draw.projectedTarget, c.projectedTarget);
  vectorNear(snapshot.draw.stationQuaternion, c.stationQuaternion);
  for (const [color, direction] of [[0xfbbf24, light.sun], [0x67e8f9, light.wingNormal]]) {
    const arrow = snapshot.draw.guides.find(guide => guide.color === color);
    assert(arrow, 'The station scene contains both physical direction guides');
    assert.equal(arrow.visible, c.guides);
    if (c.guides) vectorNear(arrow.direction, direction);
  }
  assert.equal(snapshot.glLost, false);
  return snapshot;
}

function unchangedPhysics(before, after) {
  vectorNear(after.camera.stationQuaternion, before.camera.stationQuaternion);
  for (const key of ['phase', 'beta', 'incidence', 'generation', 'sunIntensity', 'earthSunIntensity']) near(after.light[key], before.light[key]);
  for (const key of ['tracking', 'eclipse', 'playing']) assert.equal(after.light[key], before.light[key]);
  vectorNear(after.light.sun, before.light.sun); vectorNear(after.light.wingNormal, before.light.wingNormal);
}

function preservedFocus(before, after) {
  unchangedPhysics(before, after);
  vectorNear(after.camera.target, before.camera.target);
  assert.equal(after.camera.focusId, before.camera.focusId);
  assert.equal(after.selected, before.selected, 'Camera gestures must not select another module');
  assert.equal(after.camera.view, 'custom');
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [];
  const result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    window.AlloPostFXEnabled = false;
  });
  await page.route('**/vendor/three-r128/three.min.js', async route => {
    const response = await route.fetch(); assert(response.ok());
    await route.fulfill({ response, body: (await response.text()) + '\n;(' + instrumentCameraRender.toString() + ')();\n' });
  });
  if (labelsOnly) await page.route(base + '/?tab=map', async route => {
    const response = await route.fetch(), body = await response.text();
    const old = 'announceToSR: noop';
    assert(body.includes(old), 'Preview host offers the expected announcement hook');
    await route.fulfill({ response, body: body.replace(old,
      'announceToSR: function (message) { (window.__issLabelAnnouncements || (window.__issLabelAnnouncements = [])).push(message); }') });
  });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const controls = page.locator('.iss-map-controls'), cameraTools = page.locator('[data-iss-camera-tools]');
  const lighting = page.locator('[data-iss-lighting-panel]');
  const guides = page.locator('[data-iss-light-guides]');
  const zoom = direction => page.locator(`[data-iss-camera-zoom="${direction}"]`);
  const reset = page.locator('[data-iss-camera-reset]');
  const activate = async locator => {
    if (phone) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); }
  };
  const read = () => canvas.evaluate(cv => {
    const angleText = document.querySelector('[data-iss-lighting-reading="angle"]').textContent;
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { camera: cv._issCameraState(), light: cv._issLightingState(), selected: cv._issWantSel,
      angleText, angle: Number.parseFloat(angleText), guidePressed: document.querySelector('[data-iss-light-guides]').getAttribute('aria-pressed'),
      viewButtons: Array.from(document.querySelectorAll('[data-iss-camera-view]'), button => ({ view: button.dataset.issCameraView, pressed: button.getAttribute('aria-pressed') })),
      draw: window.__issCameraQADraw, scrollY, glLost: gl ? gl.isContextLost() : null };
  });
  const waitCamera = (predicate, arg) => page.waitForFunction(({ source, arg }) => {
    const cv = document.querySelector('.iss-station-stage canvas');
    return cv?._issCameraState && Function('c', 'arg', 'return (' + source + ')(c, arg)')(cv._issCameraState(), arg);
  }, { source: predicate.toString(), arg }, { timeout: 30000, polling: 100 });
  const afterAction = async (before, predicate = c => !c.tweening && c.activePointers === 0) => {
    await waitCamera(predicate);
    await waitCamera((c, count) => {
      const draw = window.__issCameraQADraw;
      return c.renderCount > count && draw && draw.position.every((value, index) => Math.abs(value - c.position[index]) < 1e-6) &&
        draw.projectedTarget.every((value, index) => Math.abs(value - c.projectedTarget[index]) < 1e-6) &&
        draw.guides.every(guide => guide.visible === c.guides);
    }, before.camera.renderCount);
    return verifySnapshot(await read());
  };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur());
    const name = `map-camera-${label}-${width}.png`;
    const image = await stage.screenshot({ path: path.join(output, name), animations: 'disabled' });
    result.screenshots.push(name);
    return image;
  };
  const surface = async () => {
    await canvas.hover();
    const box = await canvas.boundingBox(); assert(box && box.width > 200 && box.height >= 300);
    return { box, x: box.x + box.width / 2, y: box.y + box.height * .5 };
  };
  const touchGesture = async (points, moves, cancel = false) => {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
      for (const touchPoints of moves) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints });
      await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    } finally { await session.detach(); }
  };
  const moduleProgress = () => page.evaluate(() => {
    const data = window.__toolData.spaceStation;
    return { selected: data.selModule, seen: { ...data.seenModules } };
  });
  async function inspectLabels() {
    const observations = [], announcements = [];
    const picker = id => page.locator('.iss-module-picker').getByRole('button', { name: new RegExp('^' + id + '$', 'i') });
    const label = async () => verifySelectionLabel(await page.evaluate(selectionLabelGeometry));
    const data = () => page.evaluate(() => { const saved = { ...window.__toolData.spaceStation }; delete saved.mapView; return saved; });
    const messages = () => page.evaluate(() => (window.__issLabelAnnouncements || []).slice());
    const assertCentered = async (before, saved, oldMessages, id) => {
      await waitCamera((camera, id) => camera.focusId === id, id);
      const after = await afterAction(before), measured = await label();
      unchangedPhysics(before, after); assert.deepEqual(await data(), saved);
      vectorNear(after.camera.target, measured.world);
      const emitted = (await messages()).slice(oldMessages.length);
      assert.equal(emitted.length, 1, 'One center action produces exactly one screen-reader announcement');
      assert.match(emitted[0], new RegExp('Camera centered on ' + id, 'i'));
      announcements.push(emitted[0]); observations.push(measured);
      return after;
    };

    for (const id of ['harmony', 'columbus', 'zvezda']) {
      const before = await read();
      await activate(picker(id));
      await waitCamera(() => document.querySelector('.iss-station-stage canvas')._issWantSel === document.querySelector('[data-iss-focus-module]').getAttribute('data-iss-focus-module'));
      const selected = await afterAction(before);
      assert.equal(selected.selected, id); unchangedPhysics(before, selected);
      observations.push(await label());
      const saved = await data(), oldMessages = await messages();
      await activate(page.locator(`[data-iss-focus-module="${id}"]`));
      let focused = await assertCentered(selected, saved, oldMessages, id);
      await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp');
      const orbited = await afterAction(focused); preservedFocus(focused, orbited);
      assert.deepEqual(await data(), saved); observations.push(await label());
      const beforeF = await messages(); await page.keyboard.press('f');
      focused = await assertCentered(orbited, saved, beforeF, id);
      await capture('label-' + id);
    }

    // Keep the Zvezda inspection pinned while selecting Harmony. Selection and
    // camera target are independent until the learner explicitly recenters.
    let before = await read();
    await activate(picker('harmony'));
    let after = await afterAction(before);
    assert.equal(after.selected, 'harmony'); assert.equal(after.camera.focusId, 'zvezda');
    vectorNear(after.camera.target, before.camera.target); unchangedPhysics(before, after);
    const pinnedData = await data();
    observations.push(await label());
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    for (let step = 0; step < 24; ++step) {
      const measured = await page.evaluate(selectionLabelGeometry);
      if (measured.projected.some(value => value < -1 || value > 1)) break;
      before = await read();
      await page.keyboard.press(step < 14 ? '=' : 'ArrowRight');
      after = await afterAction(before); preservedFocus(before, after);
    }
    const offscreen = verifySelectionLabel(await page.evaluate(selectionLabelGeometry));
    assert.equal(offscreen.offscreen.visible, true, 'Zooming about an alternate target moves the selection off screen');
    assert.deepEqual(await data(), pinnedData); observations.push(offscreen);
    await capture('label-offscreen');
    before = await read(); const beforeRecenter = await messages();
    const recenter = page.locator('[data-iss-selection-offscreen]');
    await activate(recenter);
    after = await assertCentered(before, pinnedData, beforeRecenter, 'harmony');
    assert.equal(await canvas.evaluate(cv => document.activeElement === cv), true, 'Recenter returns focus to the canvas');
    await capture('label-recentered');

    // Scan exposed geometry rather than clicking a hard-coded screenshot point.
    // Mouse down/up keeps the pointer stationary during selection on both sizes.
    before = after; await activate(picker('zarya')); after = await afterAction(before);
    let points = [];
    for (const view of ['overview', 'labs', 'nadir', 'truss', 'russian']) {
      before = after; await activate(page.locator(`[data-iss-camera-view="${view}"]`)); after = await afterAction(before);
      await canvas.scrollIntoViewIfNeeded(); points = await page.evaluate(visibleModulePoints, 'harmony');
      if (points.length) break;
    }
    assert(points.length, 'Harmony has an exposed native module target');
    const point = points[0];
    await page.mouse.move(point.x, point.y);
    await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')._issHoverId === 'harmony' &&
      Number(getComputedStyle(document.querySelector('[data-iss-hover-name]')).opacity) > .9);
    const hover = await page.evaluate(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), chip = document.querySelector('[data-iss-hover-name]');
      const r = node => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
      window.__issLabelPointer = { moves: 0, trusted: false, afterClickOpacity: null };
      cv.addEventListener('pointermove', () => { window.__issLabelPointer.moves++; });
      cv.addEventListener('click', event => {
        window.__issLabelPointer.trusted = event.isTrusted;
        queueMicrotask(() => { window.__issLabelPointer.afterClickOpacity = chip.style.opacity; });
      }, { once: true });
      return { canvas: r(cv), chip: r(chip), text: chip.textContent };
    });
    assert(hover.chip.left >= hover.canvas.left && hover.chip.right <= hover.canvas.right &&
      hover.chip.top >= hover.canvas.top + 52 && hover.chip.bottom <= hover.canvas.bottom, 'Hovered name stays within the canvas HUD-safe area');
    before = await read(); const beforePick = await data();
    await page.mouse.down(); await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')._issWantSel === 'harmony');
    after = await afterAction(before); unchangedPhysics(before, after);
    const pointer = await page.evaluate(() => window.__issLabelPointer);
    assert.deepEqual(pointer, { moves: 0, trusted: true, afterClickOpacity: '0' }, 'Selecting a module immediately clears its stale hover chip without another pointer move');
    const pickedData = await data(); delete beforePick.selModule; delete beforePick.seenModules;
    const unchanged = { ...pickedData }; delete unchanged.selModule; delete unchanged.seenModules;
    assert.deepEqual(unchanged, beforePick); observations.push(await label());
    await page.mouse.move(0, 0); await page.mouse.move(point.x, point.y);
    await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')._issHoverId === 'harmony' &&
      document.querySelector('[data-iss-hover-name]').style.opacity === '0');
    result.checks.labels = { observations, announcements, hover, pointer, selectedHoverSuppressed: true };
    console.log(`Selected anchors, label bounds, off-screen recovery and native hover passed at ${width}px`);
  }
  async function inspectSelection() {
    const observations = [], gpu = [];
    const picker = id => page.locator('.iss-module-picker').getByRole('button', { name: id === 'truss' ? 'Integrated Truss + Solar Arrays' : new RegExp('^' + id + '$', 'i') });
    const data = () => page.evaluate(() => { const saved = { ...window.__toolData.spaceStation }; delete saved.mapView; return saved; });
    const observe = async name => {
      const geometry = await page.evaluate(selectionBracketGeometry), bounds = verifySelectionBrackets(geometry);
      const label = verifySelectionLabel(await page.evaluate(selectionLabelGeometry));
      observations.push({ name, geometry, bounds, label });
      return { geometry, bounds, label };
    };
    const save = async name => {
      await capture('selection-' + name);
      console.log(`Selection screenshot: ${path.join(output, `map-camera-selection-${name}-${width}.png`)}`);
    };
    let before = await read(), after;
    await observe('initial'); await save('overview');

    // At an unchanged camera, selection itself must not create GPU resources
    // or add a draw call. These include hulls along all three station axes.
    const baselineGPU = before.draw.gpu;
    for (const id of ['zarya', 'columbus', 'nauka', 'truss']) {
      before = await read(); await activate(picker(id)); after = await afterAction(before);
      assert.equal(after.selected, id); unchangedPhysics(before, after);
      vectorNear(after.camera.position, before.camera.position); vectorNear(after.camera.target, before.camera.target);
      assert.deepEqual(after.draw.gpu, baselineGPU, 'Selecting another hull adds no WebGL allocations or draw calls');
      gpu.push({ id, ...after.draw.gpu }); await observe('overview-' + id);
    }
    let saved = await data(); before = after;
    await activate(page.locator('[data-iss-focus-module="truss"]')); after = await afterAction(before);
    unchangedPhysics(before, after); assert.deepEqual(await data(), saved);
    await observe('focused-truss'); await save('truss-day');

    // Native camera operations change only the view and keep the rectangle
    // registered to the actual hull corners submitted to WebGL.
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    for (const key of ['ArrowRight', 'ArrowUp', '=', 'Shift+ArrowLeft']) {
      before = after; await page.keyboard.press(key); after = await afterAction(before);
      unchangedPhysics(before, after); assert.deepEqual(await data(), saved); await observe('truss-' + key);
    }
    before = after; await page.keyboard.press('f'); after = await afterAction(before);
    unchangedPhysics(before, after); assert.deepEqual(await data(), saved); await observe('truss-recenter');

    before = after; await activate(page.locator('[data-iss-lighting-preset="midnight"]')); after = await afterAction(before);
    assert.equal(after.light.eclipse, true); vectorNear(after.camera.position, before.camera.position);
    vectorNear(after.camera.target, before.camera.target); await observe('truss-eclipse'); await save('truss-eclipse');
    before = after; await activate(page.locator('[data-iss-lighting-preset="noon"]')); after = await afterAction(before);
    assert.equal(after.light.eclipse, false); await observe('truss-day-restored');

    // A translucent hull still owns its original exterior framing, rather
    // than framing just the newly visible interior racks.
    before = after; await activate(picker('columbus')); after = await afterAction(before);
    before = after; await activate(page.locator('[data-iss-focus-module="columbus"]')); after = await afterAction(before);
    const opaque = await observe('columbus-opaque');
    before = after; await activate(page.locator('[data-iss-cutaway]')); after = await afterAction(before);
    unchangedPhysics(before, after); const cutaway = await observe('columbus-cutaway');
    assert.deepEqual(cutaway.geometry.corners, opaque.geometry.corners);
    assert.equal(cutaway.geometry.d, opaque.geometry.d); await save('cutaway');
    before = after; await activate(page.locator('[data-iss-cutaway]')); after = await afterAction(before);

    // Move a close selected hull toward the HUD and frame edge with native
    // pan keys. Its clipped corners remain in the canvas until the anchor
    // itself leaves, then the separate return button restores the selection.
    saved = await data(); await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    let partial = null, nearHUD = null;
    for (let step = 0; step < 12; ++step) {
      const measured = await observe('pan-up-' + step);
      if (!measured.bounds.visible) break;
      if (measured.bounds.top < 52) { nearHUD = measured; break; }
      before = after; await page.keyboard.press('Shift+ArrowUp'); after = await afterAction(before);
      unchangedPhysics(before, after); assert.deepEqual(await data(), saved);
    }
    assert(nearHUD, 'A native pan brings the selection bracket near the HUD');
    const stacking = await page.evaluate(() => {
      const marker = document.querySelector('[data-iss-module-marker]');
      return { marker: Number(getComputedStyle(marker).zIndex), overlays: Array.from(document.querySelectorAll('.iss-stage-hud,.iss-stage-help,.iss-radiator-caption,.iss-orientation-widget'), node => ({ className: node.getAttribute('class'), zIndex: Number(getComputedStyle(node).zIndex) })) };
    });
    assert(stacking.overlays.length >= 3 && stacking.overlays.every(item => item.zIndex > stacking.marker), 'HUD, help, captions and compass stay above decorative selection brackets');
    await save('near-hud');
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    before = after; await page.keyboard.press('f'); after = await afterAction(before);
    for (let step = 0; step < 20; ++step) {
      const measured = await observe('pan-right-' + step);
      if (!measured.bounds.visible) break;
      if (measured.geometry.corners.some(p => p[0] > measured.geometry.width - 8)) { partial = measured; break; }
      before = after; await page.keyboard.press('Shift+ArrowRight'); after = await afterAction(before);
      unchangedPhysics(before, after); assert.deepEqual(await data(), saved);
    }
    assert(partial, 'Native pan partially clips the hull while its anchor remains visible');
    near(partial.bounds.right, partial.geometry.width - 8); await save('partial');
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    let offscreen;
    for (let step = 0; step < 20; ++step) {
      const measured = await observe('offscreen-' + step);
      if (!measured.label.visible) { offscreen = measured; break; }
      before = after; await page.keyboard.press('Shift+ArrowRight'); after = await afterAction(before);
      unchangedPhysics(before, after); assert.deepEqual(await data(), saved);
    }
    assert(offscreen && !offscreen.bounds.visible && offscreen.label.offscreen.visible);
    await save('offscreen'); before = after;
    await activate(page.locator('[data-iss-selection-offscreen]')); after = await afterAction(before);
    unchangedPhysics(before, after); assert.deepEqual(await data(), saved);
    assert.equal(await canvas.evaluate(cv => document.activeElement === cv), true);
    assert.equal((await observe('recentered')).bounds.visible, true); await save('recentered');
    before = after; await activate(reset); after = await afterAction(before);
    unchangedPhysics(before, after); assert.deepEqual(await data(), saved); await observe('home');
    result.checks.selection = { observations, gpu, stacking, noPhysicalRing: true };
    console.log(`Actual hull bounds, selection-only GPU invariance, native view actions and recovery passed at ${width}px`);
  }
  async function inspectPan() {
    const observations = [], mode = value => page.locator(`[data-iss-camera-drag="${value}"]`);
    const savedData = () => page.evaluate(() => { const data = { ...window.__toolData.spaceStation }; delete data.mapView; return data; });
    const initial = await read(), originalData = await savedData();
    const verifyState = async (before, after) => { unchangedPhysics(before, after); assert.deepEqual(await savedData(), originalData); };
    const verifyPan = async (label, before, after, dx, dy, bounded = false) => {
      const movement = verifyPanCamera(before, after, dx, dy, bounded); await verifyState(before, after);
      const projected = await page.evaluate(target => {
        const { camera } = window.__issVisitorQA, cv = document.querySelector('.iss-station-stage canvas');
        const point = new THREE.Vector3(...target).project(camera), box = cv.getBoundingClientRect();
        return [point.x * box.width / 2, -point.y * box.height / 2];
      }, before.camera.target);
      if (!bounded) vectorNear(projected, [dx, dy], 1e-4);
      const ui = await page.evaluate(() => ({
        target: document.querySelector('[data-iss-camera-target]').textContent,
        visitorHidden: document.querySelector('[data-iss-visitor-caption]').hidden,
        radiatorHidden: document.querySelector('[data-iss-radiator-caption]').hidden,
        fitNoteHidden: document.querySelector('[data-iss-camera-fit-note]').hidden,
        pressed: Array.from(document.querySelectorAll('[data-iss-camera-fit]')).filter(node => node.getAttribute('aria-pressed') === 'true').length,
        focusGuides: ['iss-radiator-focus', 'iss-array-focus'].map(name => {
          const node = window.__issVisitorQA.scene.getObjectByName(name); return { name, exists: !!node, visible: node?.visible };
        })
      }));
      assert.match(ui.target, /custom target/i); assert(ui.visitorHidden && ui.radiatorHidden && ui.fitNoteHidden);
      assert.equal(ui.pressed, 0); assert(ui.focusGuides.every(node => node.exists && !node.visible));
      observations.push({ label, before: before.camera, after: after.camera, ...movement, projected, ui });
    };
    assert.equal(initial.camera.dragMode, 'orbit'); assert.equal(initial.camera.panned, false);
    assert.equal(await mode('orbit').getAttribute('aria-pressed'), 'true');

    let before = initial;
    await activate(page.locator('[data-iss-camera-view="nadir"]'));
    let after = await afterAction(before);
    near(after.camera.position[1], -3.8); assert.equal(after.camera.panned, false);
    before = after; await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    await page.keyboard.press('Shift+ArrowUp'); after = await afterAction(before);
    vectorNear(after.camera.position, before.camera.position); vectorNear(after.camera.target, before.camera.target);
    assert.equal(after.camera.panned, false); assert.equal(after.camera.view, 'nadir');
    assert.equal(after.camera.fit, before.camera.fit); assert.equal(after.camera.focusId, before.camera.focusId);
    await verifyState(before, after); result.checks.panBlockedAtFloor = { before: before.camera, after: after.camera };
    before = after; await activate(reset); after = await afterAction(before);
    before = after;
    await activate(page.locator('[data-iss-camera-fit="dragon"]'));
    after = await afterAction(before); assert.equal(after.camera.focusId, 'dragon');
    before = after; await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    await page.keyboard.press('Shift+ArrowRight'); after = await afterAction(before);
    await verifyPan('Shift+ArrowRight from visitor fit', before, after, 32, 0);
    assert.equal(after.camera.dragMode, 'orbit');
    before = after; await page.keyboard.press('Shift+ArrowDown'); after = await afterAction(before);
    await verifyPan('Shift+ArrowDown', before, after, 0, 32);
    before = after; await page.keyboard.press('ArrowLeft'); after = await afterAction(before);
    await verifyState(before, after); vectorNear(after.camera.target, before.camera.target);
    assert(moved(after.camera.position, before.camera.position)); assert.equal(after.camera.panned, true);
    before = after; await activate(zoom('out')); after = await afterAction(before);
    await verifyState(before, after); vectorNear(after.camera.target, before.camera.target); assert.equal(after.camera.panned, true);
    before = after; await canvas.focus(); await page.keyboard.press('Home'); after = await afterAction(before);
    vectorNear(after.camera.target, initial.camera.target); vectorNear(after.camera.position, initial.camera.position);
    assert.equal(after.camera.panned, false); await verifyState(before, after);

    // Shift is sampled when the pointer starts: releasing it during the drag
    // must not turn the second half of the gesture into an orbit.
    before = after; await activate(page.locator('[data-iss-camera-fit="radiator-a"]')); after = await afterAction(before);
    assert.equal(after.camera.focusId, 'radiator-a');
    let area = await surface(), start = { x: Math.round(area.x), y: Math.round(area.y) };
    before = after; await page.mouse.move(start.x, start.y); await page.keyboard.down('Shift'); await page.mouse.down();
    await page.mouse.move(start.x + 20, start.y - 8, { steps: 3 }); await page.keyboard.up('Shift');
    await page.mouse.move(start.x + 60, start.y - 24, { steps: 4 }); await page.mouse.up();
    after = await afterAction(before); await verifyPan('Shift drag remains pan after Shift release', before, after, 60, -24);
    await capture('pan-shift-drag');

    before = after; await activate(reset); after = await afterAction(before);
    before = after; await activate(mode('pan')); after = await afterAction(before);
    vectorNear(after.camera.position, before.camera.position); vectorNear(after.camera.target, before.camera.target);
    assert.equal(after.camera.dragMode, 'pan'); assert.equal(after.camera.panned, false);
    assert.equal(await mode('pan').getAttribute('aria-pressed'), 'true'); assert.equal(await mode('orbit').getAttribute('aria-pressed'), 'false');
    await verifyState(before, after);
    area = await surface(); start = { x: Math.round(area.x), y: Math.round(area.y) }; before = after;
    if (phone) await touchGesture([{ ...start, id: 1 }], [
      [{ x: start.x + 20, y: start.y - 8, id: 1 }], [{ x: start.x + 48, y: start.y - 20, id: 1 }]
    ]);
    else {
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      await page.mouse.move(start.x + 48, start.y - 20, { steps: 5 }); await page.mouse.up();
    }
    after = await afterAction(before); await verifyPan(phone ? 'single-finger Pan mode' : 'mouse Pan mode', before, after, 48, -20);
    await capture('pan-mode');
    const controlsName = `map-camera-pan-controls-${width}.png`;
    await cameraTools.screenshot({ path: path.join(output, controlsName), animations: 'disabled' }); result.screenshots.push(controlsName);
    const combinedName = `map-camera-pan-subject-and-controls-${width}.png`;
    const clip = await page.evaluate(() => {
      const stage = document.querySelector('.iss-station-stage').getBoundingClientRect();
      const controls = document.querySelector('[data-iss-camera-tools]').getBoundingClientRect();
      const x = Math.floor(Math.min(stage.left, controls.left) + scrollX), y = Math.floor(stage.top + scrollY);
      return { x, y, width: Math.ceil(Math.max(stage.right, controls.right) + scrollX - x), height: Math.ceil(controls.bottom + scrollY - y) };
    });
    const captureSession = await page.context().newCDPSession(page);
    try {
      const screenshot = await captureSession.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
      await fs.writeFile(path.join(output, combinedName), Buffer.from(screenshot.data, 'base64'));
    } finally { await captureSession.detach(); }
    result.screenshots.push(combinedName);

    if (phone) {
      area = await surface(); const halfSpan = Math.round(area.box.width * .12); before = after;
      await touchGesture([{ x: area.x - halfSpan, y: area.y, id: 1 }, { x: area.x + halfSpan, y: area.y, id: 2 }], [
        [{ x: area.x - halfSpan * 1.3, y: area.y, id: 1 }, { x: area.x + halfSpan * 1.3, y: area.y, id: 2 }],
        [{ x: area.x - halfSpan * 1.6, y: area.y, id: 1 }, { x: area.x + halfSpan * 1.6, y: area.y, id: 2 }]
      ]);
      after = await afterAction(before); await verifyState(before, after);
      vectorNear(after.camera.target, before.camera.target); vectorNear(after.draw.rotation, before.draw.rotation);
      assert(after.camera.distance < before.camera.distance * .8); assert.equal(after.camera.dragMode, 'pan');
      assert.equal(after.camera.panned, true); result.checks.panPinch = { before: before.camera, after: after.camera };
    }

    area = await surface(); start = { x: Math.round(area.x), y: Math.round(area.y) }; before = after;
    if (phone) await touchGesture([{ ...start, id: 1 }], [[{ x: start.x + 24, y: start.y + 10, id: 1 }]], true);
    else {
      await canvas.evaluate(cv => cv.addEventListener('pointerdown', event => { window.__issPanPointerId = event.pointerId; }, { once: true }));
      await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x + 24, start.y + 10);
      await canvas.evaluate(cv => cv.releasePointerCapture(window.__issPanPointerId)); await page.mouse.up();
    }
    after = await afterAction(before); await verifyPan(phone ? 'touch cancel' : 'lost pointer capture', before, after, 24, 10);
    before = after; await page.mouse.move(start.x + 65, start.y + 40); await page.waitForTimeout(100);
    after = verifySnapshot(await read()); vectorNear(after.camera.target, before.camera.target); vectorNear(after.camera.position, before.camera.position);
    assert.equal(after.camera.activePointers, 0); await verifyState(before, after);

    // Uniform clipping preserves the camera plane even at the exploration edge.
    before = after; await activate(reset); after = await afterAction(before);
    before = after; await canvas.evaluate(cv => cv._issCameraPan(100000, 100000)); after = await afterAction(before);
    await verifyPan('bounded diagonal pan', before, after, 100000, 100000, true);
    assert(Math.abs(Math.abs(after.camera.target[0]) - 24) < 1e-6 || Math.abs(Math.abs(after.camera.target[2]) - 24) < 1e-6 ||
      Math.abs(after.camera.target[1] - 24) < 1e-6 || Math.abs(after.camera.target[1] + 3.8) < 1e-6 || Math.abs(after.camera.position[1] + 3.8) < 1e-6);
    await capture('pan-boundary');
    before = after; await activate(page.locator('[data-iss-camera-fit="station"]')); after = await afterAction(before);
    assert.equal(after.camera.fit, 'station'); assert.equal(after.camera.panned, false); await verifyState(before, after);
    before = after; await activate(mode('orbit')); after = await afterAction(before);
    assert.equal(after.camera.dragMode, 'orbit'); vectorNear(after.camera.position, before.camera.position);
    vectorNear(after.camera.target, before.camera.target); assert.equal(after.camera.fit, 'station');
    before = after; await canvas.focus(); await page.keyboard.press('f'); after = await afterAction(before);
    assert.equal(after.camera.focusId, initial.selected); assert.equal(after.camera.panned, false); await verifyState(before, after);
    await page.evaluate(compassObservation); // track actual graphics for teardown

    // A view gesture also preserves running simulation time; most precision
    // comparisons above deliberately used the paused model.
    await activate(page.locator('[data-iss-live-play]'));
    await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')._issLightingState().playing);
    before = await read(); await canvas.focus(); await page.keyboard.press('Shift+ArrowRight');
    await waitCamera((camera, count) => camera.renderCount > count && window.__issCameraQADraw.position.every((v, i) => Math.abs(v - camera.position[i]) < 1e-6), before.camera.renderCount);
    await page.waitForTimeout(180); after = await read();
    verifyPanCamera(before, after, 32, 0); assert.equal(after.light.playing, true);
    assert.notEqual(after.light.phase, before.light.phase); assert.equal(after.light.beta, before.light.beta); assert.equal(after.light.tracking, before.light.tracking);
    assert.deepEqual(await savedData(), originalData);
    result.checks.panLivePlayback = { before: { phase: before.light.phase, playing: before.light.playing }, after: { phase: after.light.phase, playing: after.light.playing } };
    await activate(page.locator('[data-iss-live-play]'));
    await page.waitForFunction(() => !document.querySelector('.iss-station-stage canvas')._issLightingState().playing);
    result.checks.pan = { observations, shiftFrozenAtPointerDown: true, canceledPointerReleased: true, fitAndHomeRecovery: true };
    console.log(`Native camera panning, bounds, gesture modes and preserved simulation passed at ${width}px`);
  }
  async function inspectCompass() {
    const observations = [], widget = page.locator('[data-iss-orientation-widget]');
    const help = page.locator('[data-iss-compass-help]');
    const savedData = () => page.evaluate(() => { const data = { ...window.__toolData.spaceStation }; delete data.mapView; return data; });
    await page.evaluate(source => { window.__issReadCompassQA = Function('return (' + source + ')')(); }, compassObservation.toString());
    const compass = async label => {
      // The production widget refreshes every few animation frames. Wait for
      // its real rendered directions, not an arbitrary frame-count delay.
      await page.waitForFunction(() => {
        const reading = window.__issReadCompassQA();
        return reading.axes.every(axis => axis.end.every((v, i) => Math.abs(v - axis.expected[i]) <= .011));
      });
      const measured = verifyCompass(await page.evaluate(compassObservation));
      observations.push({ label, ...measured }); return measured;
    };
    const sameCompass = (before, after) => before.axes.forEach((axis, index) => {
      const other = after.axes[index]; vectorNear(other.end, axis.end, .011); near(other.depth, axis.depth, .00011);
      assert.equal(other.mode, axis.mode);
    });
    const orient = direction => canvas.evaluate((cv, direction) => {
      const c = cv._issCameraState(), old = c.position.map((value, i) => value - c.target[i]);
      const azimuth = v => Math.atan2(v[0], v[2]);
      const polar = v => Math.acos(Math.max(-1, Math.min(1, v[1] / Math.hypot(...v))));
      cv._issCameraOrbit(azimuth(direction) - azimuth(old), polar(direction) - polar(old));
    }, direction);
    const initial = await read(), originalData = await savedData();
    const overview = await compass('initial overview');
    near(overview.bounds.width, phone ? 104 : 128, .1); near(overview.bounds.height, phone ? 117 : 144, .1);
    assert(overview.bounds.left >= 0 && overview.bounds.right <= width);
    if (phone) assert(overview.bounds.top >= overview.canvas.bottom, 'The phone compass has its own row below the canvas');
    await activate(help.locator('summary'));
    const explained = await compass('help open'); assert.equal(explained.helpOpen, true); sameCompass(overview, explained);
    const helpText = await help.innerText();
    for (const word of ['starboard', 'zenith', 'aft', 'dot', 'cross']) assert.match(helpText, new RegExp(word, 'i'));
    assert.deepEqual(await savedData(), originalData); unchangedPhysics(initial, await read());
    const helpName = `map-camera-compass-help-${width}.png`;
    await help.screenshot({ path: path.join(output, helpName), animations: 'disabled' }); result.screenshots.push(helpName);

    let before = await read(), after;
    for (const view of ['truss', 'labs', 'russian', 'nadir', 'overview']) {
      await activate(page.locator(`[data-iss-camera-view="${view}"]`)); after = await afterAction(before);
      unchangedPhysics(initial, after); assert.deepEqual(await savedData(), originalData);
      await compass('preset ' + view); before = after;
    }
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    const beforeKeys = await compass('before keyboard orbit');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp');
    after = await afterAction(before); unchangedPhysics(before, after);
    assert(moved(after.camera.position, before.camera.position)); assert.deepEqual(await savedData(), originalData);
    const afterKeys = await compass('keyboard orbit');
    assert(afterKeys.axes.some((axis, i) => moved(axis.direction, beforeKeys.axes[i].direction)));
    before = after;
    const drag = await surface();
    if (phone) await touchGesture([{ x: drag.x - 24, y: drag.y + 10, id: 1 }], [
      [{ x: drag.x, y: drag.y, id: 1 }], [{ x: drag.x + 38, y: drag.y - 14, id: 1 }]
    ]);
    else {
      await page.mouse.move(drag.x - 24, drag.y + 10); await page.mouse.down();
      await page.mouse.move(drag.x + 38, drag.y - 14, { steps: 6 }); await page.mouse.up();
    }
    after = await afterAction(before); unchangedPhysics(before, after); assert(moved(after.camera.position, before.camera.position));
    assert.deepEqual(await savedData(), originalData); await compass(phone ? 'native touch orbit' : 'native mouse orbit');
    await capture('compass-native-orbit');

    // A different native focus target must not change an orientation-only
    // compass once the same camera direction is restored with the public hook.
    before = after;
    const direction = before.camera.position.map((value, i) => value - before.camera.target[i]);
    const beforeTarget = await compass('before target change');
    await activate(page.locator('.iss-module-picker').getByRole('button', { name: 'Harmony', exact: true }));
    after = await afterAction(before); const selectedData = await savedData();
    before = after; await activate(page.locator('[data-iss-focus-module="harmony"]'));
    after = await afterAction(before); assert(moved(after.camera.target, before.camera.target));
    await orient(direction); after = await afterAction(after);
    unchangedPhysics(initial, after); assert.deepEqual(await savedData(), selectedData);
    sameCompass(beforeTarget, await compass('same direction at Harmony target'));
    const beforeZoom = await compass('before zoom'); before = after;
    await activate(zoom('in')); after = await afterAction(before);
    assert(after.camera.distance < before.camera.distance); unchangedPhysics(before, after);
    sameCompass(beforeZoom, await compass('zoomed in'));
    before = after; await activate(zoom('out')); after = await afterAction(before);
    assert(after.camera.distance > before.camera.distance); sameCompass(beforeZoom, await compass('zoomed out'));
    assert.deepEqual(await savedData(), selectedData);

    // Exact horizontal end-on directions are mathematically arranged via the
    // same bounded orbit hook as native gestures. No scene/camera object writes.
    const fixtures = [
      { name: 'short-axis', direction: [.2, 0, Math.sqrt(.96)], axis: 'z', mode: 'across', fraction: .2 },
      { name: 'toward', direction: [0, 0, 1], axis: 'z', mode: 'toward', fraction: 0 },
      { name: 'away', direction: [0, 0, -1], axis: 'z', mode: 'away', fraction: 0 },
      { name: 'starboard-toward', direction: [1, 0, 0], axis: 'x', mode: 'toward', fraction: 0 },
      { name: 'zenith-toward', direction: [0, 1, 0], axis: 'y', mode: 'toward', fraction: Math.sin(.06) }
    ];
    for (const fixture of fixtures) {
      before = await read(); await orient(fixture.direction); after = await afterAction(before);
      unchangedPhysics(initial, after); assert.deepEqual(await savedData(), selectedData);
      const measured = await compass(fixture.name), axis = measured.axes.find(axis => axis.id === fixture.axis);
      assert.equal(axis.mode, fixture.mode); near(axis.fraction, fixture.fraction, 1e-6);
      if (fixture.name === 'short-axis') assert(Math.hypot(axis.end[0] - 56, axis.end[1] - 56) < 7, 'A foreshortened axis is not stretched to a full arrow');
      if (['short-axis', 'toward', 'away'].includes(fixture.name)) await capture('compass-' + fixture.name);
    }
    before = after; await activate(reset); after = await afterAction(before);
    const ordinary = await compass('restored overview');
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await compass('forced colors'); sameCompass(ordinary, forced);
    await capture('compass-forced-colors'); await page.emulateMedia({ forcedColors: 'none' });
    assert.deepEqual(await savedData(), selectedData); unchangedPhysics(initial, await read());
    result.checks.compass = { observations, touch: phone, unchangedSimulation: true, unchangedZoomDirection: true, unchangedTargetDirection: true };
    console.log(`Camera-basis compass, end-on directions, native input and independent state passed at ${width}px`);
  }
  async function inspectVisitors() {
    const initialProgress = await moduleProgress(), inspections = {};
    for (const vehicle of visitors) {
      const before = await read();
      const button = page.locator(`[data-iss-camera-fit="${vehicle.id}"]`);
      await activate(button);
      await waitCamera((camera, id) => camera.fit === id && camera.focusId === id, vehicle.id);
      const fitted = await afterAction(before);
      unchangedPhysics(before, fitted);
      assert.deepEqual(await moduleProgress(), initialProgress);
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      const caption = page.locator('[data-iss-visitor-caption]');
      assert(await caption.isVisible());
      assert.match(await caption.textContent(), new RegExp(vehicle.id, 'i'));
      const geometry = await page.evaluate(vehicleGeometry, vehicle);
      assert.equal(geometry.host, vehicle.host);
      assert.match(geometry.label, new RegExp(vehicle.id, 'i'));
      vectorNear(geometry.port, vehicle.port);
      assert.deepEqual(geometry.partIds, [`${vehicle.id}/${vehicle.host}`]);
      assert(geometry.vertices > 0);
      verifyVisitorSolar(vehicle.id, geometry);
      assert(geometry.gap <= .05, `${vehicle.id} connects to its modeled port`);
      assert(geometry.hostGap < 1e-6, `${vehicle.host} meets the same port`);
      vectorNear(fitted.camera.fitCenter, geometry.center);
      vectorNear(fitted.camera.target, geometry.center);
      near(fitted.camera.fitRadius, geometry.radius);
      near(fitted.camera.minDistance, 1.2);
      geometry.min.forEach(value => assert(value >= -1 - 1e-6, `${vehicle.id} fits in the camera frustum`));
      geometry.max.forEach(value => assert(value <= 1 + 1e-6, `${vehicle.id} fits in the camera frustum`));
      if (vehicle.id === 'dragon') {
        assert(geometry.capsule, 'Rendered Dragon capsule is present');
        verifyDragonCapsule(geometry.capsule);
      } else if (vehicle.id === 'progress') {
        assert(geometry.engine, 'Rendered Progress engine is present');
        const engine = geometry.engine;
        assert(engine.topRadius < engine.bottomRadius && engine.bottom > engine.top, 'Progress nozzle widens aft');
      }
      await capture('visitor-' + vehicle.id);

      // Pick from an ordinary station view. The craft must earn its focus
      // through this native event, and its hover label starts unsuppressed.
      let unfitted = fitted, point = null;
      for (const view of ['overview', 'nadir', 'truss', 'russian', 'labs']) {
        await activate(page.locator(`[data-iss-camera-view="${view}"]`));
        unfitted = await afterAction(unfitted);
        assert.equal(unfitted.camera.fit, null);
        assert.equal(unfitted.camera.focusId, null);
        await canvas.scrollIntoViewIfNeeded();
        point = await page.evaluate(visibleVisitorPoint, vehicle.id);
        if (point) break;
      }
      assert(point, `${vehicle.id} offers an exposed native pointer target`);
      if (!phone) {
        await page.mouse.move(point.x, point.y);
        await page.waitForFunction(id => {
          const cv = document.querySelector('.iss-station-stage canvas'), chip = document.querySelector('[data-iss-hover-name]');
          return cv._issHoverId === id && chip.textContent.toLowerCase().includes(id) && Number(getComputedStyle(chip).opacity) > .9;
        }, vehicle.id);
      }
      await canvas.evaluate(cv => {
        window.__issVisitorQA.trustedClick = false;
        cv.addEventListener('click', event => { window.__issVisitorQA.trustedClick = event.isTrusted; }, { capture: true, once: true });
      });
      if (phone) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
      await waitCamera((camera, id) => camera.fit === id && camera.focusId === id, vehicle.id);
      const picked = await afterAction(unfitted);
      unchangedPhysics(unfitted, picked);
      vectorNear(picked.camera.target, geometry.center);
      assert.deepEqual(await moduleProgress(), initialProgress);
      assert.equal(await page.evaluate(() => window.__issVisitorQA.trustedClick), true);
      await page.waitForFunction(() => {
        const chip = document.querySelector('[data-iss-hover-name]');
        return chip.style.opacity === '0' && Number(getComputedStyle(chip).opacity) === 0;
      });
      if (!phone) {
        const focusedPoint = await page.evaluate(visibleVisitorPoint, vehicle.id);
        assert(focusedPoint);
        await page.mouse.move(0, 0);
        await page.mouse.move(focusedPoint.x, focusedPoint.y);
        await page.waitForFunction(id => {
          const cv = document.querySelector('.iss-station-stage canvas'), chip = document.querySelector('[data-iss-hover-name]');
          return cv._issHoverId === id && chip.style.opacity === '0' && Number(getComputedStyle(chip).opacity) === 0;
        }, vehicle.id);
      }
      inspections[vehicle.id] = { geometry, point, distance: picked.camera.distance, selected: picked.selected,
        hoverVisibleBeforePick: phone ? null : true, hoverHiddenAfterPick: true, hoverSuppressedWhileFocused: phone ? null : true };
    }

    // Release the visitor fit so only the selected module owns cutaway focus.
    const beforeReset = await read();
    await activate(reset);
    await afterAction(beforeReset);
    const cutaway = page.locator('[data-iss-cutaway]');
    assert.equal(await cutaway.getAttribute('aria-pressed'), 'false');
    await activate(cutaway);
    for (const host of ['harmony', 'unity']) {
      const before = await read();
      await activate(page.locator('.iss-module-picker').getByRole('button', { name: host === 'harmony' ? 'Harmony' : 'Unity', exact: true }));
      await afterAction(before);
      await page.waitForFunction(id => {
        const cv = document.querySelector('.iss-station-stage canvas');
        const draw = window.__issCameraQADraw;
        return cv._issWantSel === id && cv._issCutaway && draw?.selected === id && draw.cutaway;
      }, host);
      const known = new Set();
      for (const vehicle of visitors) {
        const geometry = await page.evaluate(vehicleGeometry, vehicle);
        for (const [uuid, opacity] of Object.entries(geometry.materials)) {
          assert(!known.has(uuid), 'Visiting vehicles do not share a mutable cutaway material across different hosts');
          near(opacity, vehicle.host === host ? 1 : .05);
          known.add(uuid);
        }
      }
    }
    const beforeRestore = await read();
    await activate(cutaway);
    await afterAction(beforeRestore);
    result.checks.visitingVehicles = { inspections, cutawayHosts: ['harmony', 'unity'] };
    console.log(`Visiting vehicle geometry, framing, pointer inspection and cutaway passed at ${width}px`);
  }
  async function verifyCameraControls(initial, idle) {
    // Parked panels expose accidental station rotation that ideal tracking could conceal.
    await activate(page.locator('[data-iss-array-tracking]'));
    const parked = await afterAction(idle);
    assert.equal(parked.light.tracking, false);

    const presets = [];
    for (const view of ['truss', 'labs', 'russian', 'nadir', 'overview']) {
      const before = await read();
      await activate(page.locator(`[data-iss-camera-view="${view}"]`));
      const after = await afterAction(before);
      assert.equal(after.camera.view, view); assert.equal(after.camera.focusId, null);
      unchangedPhysics(parked, after); assert(moved(before.camera.position, after.camera.position));
      presets.push(after.camera);
    }
    result.checks.presets = presets;
    await activate(page.locator('.iss-module-picker').getByRole('button', { name: 'Harmony', exact: true }));
    const beforeFocus = await read();
    await activate(page.locator('[data-iss-focus-module="harmony"]'));
    await waitCamera(c => c.focusId === 'harmony');
    const focused = await afterAction(beforeFocus);
    assert.equal(focused.selected, 'harmony'); unchangedPhysics(parked, focused);
    assert(moved(focused.camera.target, initial.camera.target));
    const closeupBefore = await capture('closeup-before');

    let before = await read();
    await canvas.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp');
    let after = await afterAction(before);
    preservedFocus(before, after); assert(moved(before.camera.position, after.camera.position));
    near(before.camera.distance, after.camera.distance);
    result.checks.keyboardOrbit = after.camera;

    const drag = await surface(); before = await read();
    if (phone) {
      await touchGesture([{ x: drag.x - 35, y: drag.y + 18, id: 1 }], [
        [{ x: drag.x - 10, y: drag.y + 8, id: 1 }], [{ x: drag.x + 42, y: drag.y - 12, id: 1 }]
      ]);
    } else {
      await page.mouse.move(drag.x - 35, drag.y + 18); await page.mouse.down();
      await page.mouse.move(drag.x + 42, drag.y - 12, { steps: 6 }); await page.mouse.up();
    }
    after = await afterAction(before);
    preservedFocus(before, after); assert(moved(before.camera.position, after.camera.position));
    near(before.camera.distance, after.camera.distance); near(after.scrollY, before.scrollY, 1);
    const closeupAfter = await capture('closeup-orbit');
    assert.notEqual(Buffer.compare(closeupBefore, closeupAfter), 0, 'Native camera movement changes the rendered closeup');
    result.checks.nativeOrbit = after.camera;

    before = await read(); await activate(zoom('in')); after = await afterAction(before);
    preservedFocus(before, after); assert(after.camera.distance < before.camera.distance);
    before = after; await activate(zoom('out')); after = await afterAction(before);
    preservedFocus(before, after); assert(after.camera.distance > before.camera.distance);
    await canvas.focus(); before = after; await page.keyboard.press('='); after = await afterAction(before);
    preservedFocus(before, after); assert(after.camera.distance < before.camera.distance);
    before = after; await page.keyboard.press('-'); after = await afterAction(before);
    preservedFocus(before, after); assert(after.camera.distance > before.camera.distance);

    before = after;
    for (let i = 0; i < 40; i++) await page.keyboard.press('=');
    const minimum = await afterAction(before);
    preservedFocus(before, minimum); near(minimum.camera.distance, minimum.camera.minDistance);
    before = minimum;
    for (let i = 0; i < 40; i++) await page.keyboard.press('-');
    const maximum = await afterAction(before);
    preservedFocus(before, maximum); near(maximum.camera.distance, maximum.camera.maxDistance);
    result.checks.zoomBounds = { minimum: minimum.camera, maximum: maximum.camera };
    await activate(page.locator('[data-iss-focus-module="harmony"]'));
    const refocused = await afterAction(maximum); assert.equal(refocused.camera.focusId, 'harmony');

    if (phone) {
      const pinch = await surface(), span = pinch.box.width * .12;
      before = await read();
      await touchGesture([{ x: pinch.x - span, y: pinch.y, id: 1 }, { x: pinch.x + span, y: pinch.y, id: 2 }], [
        [{ x: pinch.x - span * 1.3, y: pinch.y, id: 1 }, { x: pinch.x + span * 1.3, y: pinch.y, id: 2 }],
        [{ x: pinch.x - span * 1.7, y: pinch.y, id: 1 }, { x: pinch.x + span * 1.7, y: pinch.y, id: 2 }]
      ]);
      after = await afterAction(before);
      preservedFocus(before, after); assert(after.camera.distance < before.camera.distance * .95, 'Spreading two fingers zooms in');
      near(after.scrollY, before.scrollY, 1);
      result.checks.pinch = { before: before.camera, after: after.camera };
      for (const count of [1, 2]) {
        const cancelSurface = await surface(); before = await read();
        const points = count === 1 ? [{ x: cancelSurface.x - 20, y: cancelSurface.y, id: 1 }] :
          [{ x: cancelSurface.x - span, y: cancelSurface.y, id: 1 }, { x: cancelSurface.x + span, y: cancelSurface.y, id: 2 }];
        const motion = points.map((point, index) => ({ ...point, x: point.x + (count === 1 ? 35 : index === 0 ? 10 : -10), y: point.y - 10 }));
        await touchGesture(points, [motion], true);
        after = await afterAction(before); preservedFocus(before, after);
        assert.equal(after.camera.activePointers, 0);
        const canceled = after;
        await page.mouse.move(cancelSurface.x + 60, cancelSurface.y + 15);
        await page.waitForTimeout(150);
        after = verifySnapshot(await read());
        vectorNear(after.camera.position, canceled.camera.position); assert.equal(after.selected, canceled.selected);
        result.checks['cancel' + count] = after.camera;
      }
    } else {
      // Hovering alone leaves wheel input available for ordinary page scrolling.
      await controls.locator('button').first().focus(); await surface();
      before = await read();
      assert.equal(await canvas.evaluate(cv => document.activeElement === cv), false);
      await page.mouse.wheel(0, 180);
      await page.waitForFunction(y => Math.abs(scrollY - y) > 1, before.scrollY, { timeout: 5000 });
      after = verifySnapshot(await read());
      vectorNear(after.camera.position, before.camera.position); preservedFocus(before, after);
      result.checks.hoverWheel = { beforeScroll: before.scrollY, afterScroll: after.scrollY };
      await surface(); await canvas.focus(); before = await read();
      await page.mouse.wheel(0, -180);
      await waitCamera((c, distance) => c.distance < distance, before.camera.distance);
      after = await afterAction(before); preservedFocus(before, after);
      near(after.scrollY, before.scrollY, 1);
      result.checks.focusedWheel = { before: before.camera, after: after.camera };
    }
    console.log(`Camera orbit, focused target, zoom and pointer cleanup passed at ${width}px`);

    // The guide origin is on a real array wing; overview keeps it on screen.
    before = await read(); await activate(reset); after = await afterAction(before);
    unchangedPhysics(before, after); assert.equal(after.camera.view, 'overview');
    before = after; const withoutGuides = await capture('guides-off');
    await activate(guides); after = await afterAction(before);
    assert.equal(after.camera.guides, true); unchangedPhysics(before, after);
    vectorNear(after.camera.position, before.camera.position); vectorNear(after.camera.target, before.camera.target);
    near(after.camera.distance, before.camera.distance); assert.equal(after.camera.focusId, before.camera.focusId);
    const withGuides = await capture('guides-on');
    assert.notEqual(Buffer.compare(withoutGuides, withGuides), 0, 'Guide toggle changes the actual station visualization');
    result.checks.guidesParked = after;
    const controlsName = `map-camera-controls-${width}.png`, toolsName = `map-camera-tools-${width}.png`;
    const lightingName = `map-camera-guide-controls-${width}.png`;
    await controls.screenshot({ path: path.join(output, controlsName), animations: 'disabled' });
    await cameraTools.screenshot({ path: path.join(output, toolsName), animations: 'disabled' });
    await lighting.screenshot({ path: path.join(output, lightingName), animations: 'disabled' });
    result.screenshots.push(controlsName, toolsName, lightingName);
    before = after;
    await activate(page.locator('[data-iss-array-tracking]')); after = await afterAction(before);
    assert.equal(after.light.tracking, true); near(dot(after.camera.guideSun, after.camera.guideNormal), 1);
    near(after.angle, 0, .100001); vectorNear(after.camera.position, before.camera.position);
    vectorNear(after.camera.target, before.camera.target);
    result.checks.guidesTracking = after;
    await capture('guides-tracking');
    before = after; await activate(guides); after = await afterAction(before);
    assert.equal(after.camera.guides, false); unchangedPhysics(before, after);
    vectorNear(after.camera.position, before.camera.position); vectorNear(after.camera.target, before.camera.target);

    before = after; await activate(reset); after = await afterAction(before);
    assert.equal(after.camera.view, 'overview'); assert.equal(after.camera.focusId, null);
    vectorNear(after.camera.position, initial.camera.position); vectorNear(after.camera.target, initial.camera.target);
    unchangedPhysics(before, after);
    await canvas.focus(); before = after; await page.keyboard.press('f');
    await waitCamera(c => c.focusId === 'harmony'); after = await afterAction(before);
    assert.equal(after.camera.focusId, 'harmony'); vectorNear(after.camera.target, focused.camera.target);
    before = after; await page.keyboard.press('Home'); after = await afterAction(before);
    assert.equal(after.camera.view, 'overview'); assert.equal(after.camera.focusId, null);
    vectorNear(after.camera.position, initial.camera.position); vectorNear(after.camera.target, initial.camera.target);
    result.checks.resetAndKeyboardFocus = after;
  }

  try {
    console.log(`Checking ${selectionOnly ? 'projected selection brackets' : panOnly ? 'camera panning' : compassOnly ? 'station orientation compass' : labelsOnly ? 'selected module labels' : visitorsOnly ? 'visiting vehicle inspection' : 'camera and light guides'} at ${width}px`);
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' });
    await guides.waitFor();
    await waitCamera(c => c.renderCount > 0);
    const initial = verifySnapshot(await read());
    assert.equal(initial.camera.view, 'overview'); assert.equal(initial.camera.focusId, null);
    assert.equal(initial.camera.guides, false);
    await page.waitForTimeout(300);
    const idle = verifySnapshot(await read());
    vectorNear(idle.camera.position, initial.camera.position); unchangedPhysics(initial, idle);
    result.checks.initial = initial;
    if (selectionOnly) await inspectSelection();
    else if (panOnly) await inspectPan();
    else if (compassOnly) await inspectCompass();
    else if (labelsOnly) await inspectLabels();
    else {
      if (!visitorsOnly) await verifyCameraControls(initial, idle);
      await inspectVisitors();
    }

    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      nodes: Array.from(document.querySelectorAll('.iss-map-controls,.iss-map-controls button,[data-iss-camera-tools],[data-iss-camera-tools] button,[data-iss-lighting-panel]'), node => {
        const box = node.getBoundingClientRect(); return { label: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 100),
          left: box.left, right: box.right, width: box.width, height: box.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.scrollWidth <= width + 1);
    for (const node of layout.nodes) {
      assert(node.left >= -1 && node.right <= width + 1, `Control leaves the viewport: ${JSON.stringify(node)}`);
      assert(node.width > 0 && node.height > 0);
      assert(node.scrollWidth <= node.clientWidth + 1, `Control contents overflow: ${JSON.stringify(node)}`);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checks = await axe.run({ include: ['.iss-map-controls', '[data-iss-camera-tools]', '[data-iss-lighting-panel]', '[data-iss-selection-offscreen]', '[data-iss-compass-help]', '[data-iss-orientation-reading]'] }, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } }
      });
      return { passes: checks.passes.length, violations: checks.violations.map(v => ({ id: v.id,
        nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, []);
    result.checks.layout = layout; result.checks.accessibility = accessibility;
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true;
    console.log(`Responsive camera controls and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null);
    if (compassOnly) result.lastCompass = await page.evaluate(compassObservation).catch(() => null);
    if (selectionOnly) result.lastSelection = await page.evaluate(selectionBracketGeometry).catch(() => null);
    await page.screenshot({ path: path.join(output, `map-camera-failure-${width}.png`), fullPage: true }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false });
        window.__destroy?.();
        return { contexts: window.__issCameraQAContexts?.length || 0,
          lost: (window.__issCameraQAContexts || []).map(gl => gl.isContextLost()),
          visitorResources: Object.values(window.__issVisitorQA?.resources || {}),
          canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) {
        assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean));
        assert(result.checks.cleanup.visitorResources.length > 0 && result.checks.cleanup.visitorResources.every(resource => resource.disposed));
        assert.equal(result.checks.cleanup.canvases, 0); assert.deepEqual(errors, []);
      }
    } catch (error) {
      if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; }
      result.cleanupFailure = error.stack || error.message;
    } finally { await page.close(); }
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = []; let failure;
  try {
    for (const width of widths) {
      try { results.push(await runWidth(browser, width)); }
      catch (error) { results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); failure = error; break; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ base, results }, null, 2) + '\n'); }
    }
  } finally { await browser.close(); }
  if (failure) throw failure;
  console.log(`Map-camera browser checks passed: ${widths.join(', ')}px. Results: ${output}`);
}

function selftestLabels() {
  const good = { id: 'harmony', projected: [0, 0, 0], canvas: { left: 0, top: 0, right: 390, bottom: 400 },
    visible: true, chip: { left: 210, right: 300, top: 170, bottom: 200, width: 90, height: 30 }, text: 'HARMONY',
    anchor: [195, 200], circle: [195, 200], line: [[195, 200], [210, 185]], offscreen: { visible: false, tag: 'BUTTON', text: 'Center Harmony' } };
  verifySelectionLabel(good);
  assert.throws(() => verifySelectionLabel({ ...good, circle: [207, 200] }), /should equal/);
  assert.throws(() => verifySelectionLabel({ ...good, line: [[207, 200], [210, 185]] }), /should equal/);
  assert.throws(() => verifySelectionLabel({ ...good, chip: { ...good.chip, top: 45 } }), /HUD/);
  assert.throws(() => verifySelectionLabel({ ...good, chip: { ...good.chip, right: 395 } }), /stays in/);
  assert.throws(() => verifySelectionLabel({ ...good, projected: [1.1, 0, 0] }), /floating/);
  verifySelectionLabel({ ...good, projected: [1.1, 0, 0], visible: false, offscreen: { ...good.offscreen, visible: true } });
  console.log('Label QA oracle self-test passed, including shifted-anchor, clipped-chip and stale-label mutants.');
}

function selftestCompass() {
  const good = { viewBox: '0 0 112 126', visible: true, bounds: { width: 128, height: 144 }, live: null, readingHidden: false,
    reading: 'X across the view. Y across the view. Z toward you.', axes: ['x', 'y', 'z'].map((id, i) => {
      const direction = [0, 0, 0]; direction[i] = 1;
      const end = [56 + 31 * direction[0], 56 - 31 * direction[1]], mode = i === 2 ? 'toward' : 'across';
      return { id, direction, expected: end, fraction: i === 2 ? 0 : 1, expectedMode: mode, origin: [56, 56], end,
        mode, depth: direction[2], dot: i === 2, cross: false, head: i !== 2, tip: end, lineVisible: i !== 2, ring: i === 2, dashed: false,
        label: { visible: true, text: id.toUpperCase(), bounds: { x: end[0] - 5, y: end[1] - 6, width: 10, height: 12 } } };
    }) };
  verifyCompass(good);
  const mutant = change => { const copy = structuredClone(good); change(copy); return copy; };
  assert.throws(() => verifyCompass(mutant(value => { value.axes[2].end = [87, 56]; })), /should equal/);
  assert.throws(() => verifyCompass(mutant(value => { value.axes[2].depth = -1; })), /should equal/);
  assert.throws(() => verifyCompass(mutant(value => { value.axes[2].dot = false; value.axes[2].cross = true; })), /equal/);
  assert.throws(() => verifyCompass(mutant(value => { value.axes[1].label.bounds.x = 110; })), /within/);
  assert.throws(() => verifyCompass(mutant(value => { value.live = 'polite'; })), /live region/);
  console.log('Compass QA oracle self-test passed, including stretched-axis, depth-sign, symbol, clipped-label and live-region mutants.');
}

function selftestPan() {
  const before = { camera: { position: [0, 0, 10], target: [0, 0, 0], distance: 10 },
    draw: { rotation: [0, 0, 0, 1], right: [1, 0, 0], up: [0, 1, 0], fov: 90, height: 500 } };
  const after = { camera: { position: [-1, -.4, 10], target: [-1, -.4, 0], distance: 10, fit: null, focusId: null, panned: true, view: 'custom' },
    draw: { ...before.draw } };
  verifyPanCamera(before, after, 25, -10);
  const mutant = change => { const copy = structuredClone(after); change(copy); return copy; };
  assert.throws(() => verifyPanCamera(before, mutant(value => { value.camera.position[0] = -.5; }), 25, -10), /should equal/);
  assert.throws(() => verifyPanCamera(before, mutant(value => { value.camera.target[0] = value.camera.position[0] = 1; }), 25, -10), /should equal/);
  assert.throws(() => verifyPanCamera(before, mutant(value => { value.draw.rotation = [0, .1, 0, .99]; }), 25, -10), /should equal/);
  assert.throws(() => verifyPanCamera(before, mutant(value => { value.camera.focusId = 'dragon'; }), 25, -10), /equal/);
  const clipped = mutant(value => { value.camera.position = [-24, 0, 10]; value.camera.target = [-24, 0, 0]; });
  verifyPanCamera(before, clipped, 100000, 0, true);
  assert.throws(() => verifyPanCamera(before, { ...clipped, camera: { ...clipped.camera, position: [-24, 1, 10], target: [-24, 1, 0] } }, 100000, 0, true), /should equal/);
  console.log('Pan QA oracle self-test passed, including partial translation, reversed direction, rotation, stale focus and nonplanar clipping mutants.');
}

function selftestSelection() {
  const fixture = (xs = [26, 174], ys = [36, 144]) => {
    const left = Math.max(8, xs[0] - 6), right = Math.min(192, xs[1] + 6);
    const top = Math.max(8, ys[0] - 6), bottom = Math.min(192, ys[1] + 6), leg = Math.min(14, (right - left) / 4, (bottom - top) / 4);
    return { width: 200, height: 200, anchor: [0, 0, 0], corners: xs.flatMap(x => ys.flatMap(y => [-.5, .5].map(z => [x, y, z]))),
      visible: true, d: 'fixture', backingD: 'fixture', rings: 0, strokeWidth: 2, backingWidth: 5, stroke: 'rgb(251, 191, 36)', backingStroke: 'rgb(6, 18, 28)', length: 8 * leg,
      samples: [[[left + leg, top], [left, top], [left, top + leg]], [[right - leg, top], [right, top], [right, top + leg]],
        [[right, bottom - leg], [right, bottom], [right - leg, bottom]], [[left, bottom - leg], [left, bottom], [left + leg, bottom]]] };
  };
  const good = fixture(); verifySelectionBrackets(good); verifySelectionBrackets(fixture([-25, 225], [0, 190]));
  assert.throws(() => verifySelectionBrackets({ ...good, rings: 1 }), /physical torus/);
  assert.throws(() => verifySelectionBrackets({ ...good, backingD: 'wrong' }), /backing/);
  assert.throws(() => verifySelectionBrackets({ ...good, length: 400 }), /should equal/);
  const shifted = structuredClone(good); shifted.samples[0][1][0] += 8;
  assert.throws(() => verifySelectionBrackets(shifted), /geometry-derived corner/);
  const clipped = structuredClone(good); clipped.corners[0][2] = 1.01;
  assert.throws(() => verifySelectionBrackets(clipped), /visibility/);
  verifySelectionBrackets({ ...clipped, visible: false, d: '', backingD: '' });
  assert.throws(() => verifySelectionBrackets({ ...good, anchor: [1.1, 0, 0] }), /visibility/);
  console.log('Selection QA oracle self-test passed, including physical-ring, backing, solid-outline, shifted-corner and clipping mutants.');
}

function selftestDragon() {
  const good = { finite: true, normalsFinite: true, localMinY: -.36, localMaxY: .36, maxRadius: .3,
    topRadius: .09, bottomRadius: .3, top: -4.32, bottom: -5.04, vertices: 363, triangles: 640,
    profile: [{ y: -.36, radius: .3 }, { y: -.24, radius: .3 }, { y: .1, radius: .22 }, { y: .36, radius: .09 }] };
  verifyDragonCapsule(good);
  const mutant = change => { const value = structuredClone(good); change(value); return value; };
  assert.throws(() => verifyDragonCapsule(mutant(value => { value.topRadius = 0; })), /should equal/);
  assert.throws(() => verifyDragonCapsule(mutant(value => { value.top = -5.04; value.bottom = -4.32; })), /should equal/);
  assert.throws(() => verifyDragonCapsule(mutant(value => { value.maxRadius = .35; })), /should equal/);
  assert.throws(() => verifyDragonCapsule(mutant(value => { value.normalsFinite = false; })), /finite vertices and normals/);
  assert.throws(() => verifyDragonCapsule(mutant(value => { value.triangles = 2000; })), /budget/);
  assert.throws(() => verifyDragonCapsule(mutant(value => { value.profile.forEach(ring => { ring.radius = .3 + (.09 - .3) * ((ring.y + .36) / .72); }); })), /shoulder departs/);
  console.log('Dragon QA oracle self-test passed, including pointed-neck, reversed, oversized, invalid-normal, geometry-budget and straight-frustum mutants.');
}

function selftestVisitorSolar() {
  const part = (r, h, top, bottom) => ({ finite: true, normalsFinite: true, uvFinite: true, localMinY: -h / 2, localMaxY: h / 2,
    maxRadius: r, topRadius: r, bottomRadius: r, top, bottom, vertices: 66, triangles: 64,
    parameters: { radialSegments: 32, height: h, openEnded: true, thetaStart: -Math.PI * .62, thetaLength: Math.PI * 1.24 } });
  const good = { trunk: part(.3, .82, -5.04, -5.86), sleeve: part(.308, .7, -5.1, -5.8), solarSurfaces: [{ name: 'iss-dragon-solar-sleeve', color: 0xffffff,
    emissive: 0, roughness: .38, metalness: .3, emissiveMap: false, doubleSided: true, transparent: true, textureSlots: ['map'], map: { name: 'iss-dragon-solar-cells', width: 512, height: 256, canvas: true, srgb: true, clamp: true, repeat: [1, 1], colors: 30 } }] };
  good.trunk.parameters.openEnded = false; good.trunk.vertices = 196; good.trunk.triangles = 128;
  verifyVisitorSolar('dragon', good);
  const mutant = change => { const value = structuredClone(good); change(value); return value; };
  for (const change of [v => { v.trunk.parameters.openEnded = true; }, v => { v.sleeve.parameters.radialSegments = 16; }, v => { v.sleeve.maxRadius = .35; }, v => { v.solarSurfaces[0].map.width = 1024; },
    v => { v.solarSurfaces[0].map.clamp = false; }, v => { v.solarSurfaces[0].map.colors = 1; }, v => { v.solarSurfaces[0].emissive = 0x0a1836; }, v => { v.solarSurfaces[0].textureSlots.push('normalMap'); }]) {
    assert.throws(() => verifyVisitorSolar('dragon', mutant(change)));
  }
  const other = { solarSurfaces: Array.from({ length: 2 }, () => ({ ...structuredClone(good.solarSurfaces[0]), name: 'iss-progress-solar-wing', materialId: 'progress-private', map: { ...structuredClone(good.solarSurfaces[0].map), id: 'progress-atlas', name: 'iss-progress-solar-cells' } })) };
  verifyVisitorSolar('progress', other);
  other.solarSurfaces[0].map = good.solarSurfaces[0].map; assert.throws(() => verifyVisitorSolar('progress', other), /leak/);
  const cygnus = { cygnusAtlasIndependent: true,
    fans: [-1, 1].map(side => ({ position: [side * 1.06, -2.39, .2], rotation: [0, 0, 0], scale: [1, 1, 1], vertices: 62, triangles: 60, segments: 60,
      minRadius: 0, maxRadius: .5, finite: true, planar: true, normalForward: true, uvRadial: true, ringsValid: true, centerCount: 1, thetaStart: 0, thetaLength: 2 * Math.PI, gores: Array(10).fill(true) })),
    solarSurfaces: [0, 1].map(() => ({ ...structuredClone(good.solarSurfaces[0]), name: 'iss-cygnus-ultraflex', materialId: 'cygnus-private',
      map: { ...structuredClone(good.solarSurfaces[0].map), id: 'cygnus-atlas', name: 'iss-cygnus-solar-cells', height: 512 } })) };
  verifyVisitorSolar('cygnus', cygnus);
  for (const change of [value => { value.fans[0].segments = 10; }, value => { value.fans[0].maxRadius = .6; }, value => { value.fans[0].uvRadial = false; }, value => { value.fans[0].ringsValid = false; },
    value => { value.fans[0].gores[3] = false; }, value => { value.solarSurfaces[1].materialId = 'duplicate-material'; }, value => { value.solarSurfaces[1].map.id = 'duplicate-texture'; },
    value => { value.solarSurfaces[0].map.height = 256; }, value => { value.cygnusAtlasIndependent = false; }]) {
    const changed = structuredClone(cygnus); change(changed); assert.throws(() => verifyVisitorSolar('cygnus', changed));
  }
  console.log('Visitor solar QA self-test passed, including coarse geometry, enlarged sleeve, wrong resolution, repeating/blank map, emissive cells and leaked-map mutants.');
}

if (process.argv.includes('--selftest')) { selftestLabels(); selftestCompass(); selftestPan(); selftestSelection(); selftestDragon(); selftestVisitorSolar(); }
else main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

// Every executable fixture comes from the shipped source, never a temporary
// draft. Fixed historical digests protect unrelated geometry and camera math.
const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;
function expression(start) {
  if (start < 0) throw new Error('Required Cupola integration is absent');
  const node = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
  return source.slice(node.start, node.end);
}
function namedFunction(name) { return expression(source.indexOf('function ' + name + '(')); }
const geometryFactory = new Function('return ' + namedFunction('issCupolaGeometry'))();
const resources = new Set();
function keep(resource) {
  if (!resources.has(resource)) {
    resources.add(resource);
    resource.addEventListener('dispose', () => resources.delete(resource));
  }
  return resource;
}
afterEach(() => { for (const resource of [...resources]) resource.dispose(); });
function geometry(radius = .42) {
  const parts = geometryFactory(THREE, radius);
  Object.values(parts).forEach(keep);
  return parts;
}
function positions(g, start = 0, count = g.getAttribute('position').count) {
  const p = g.getAttribute('position');
  return Array.from({ length: count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, start + i));
}
function uniquePoints(points) {
  return [...new Map(points.map(point => [point.toArray().map(value => Number(value.toFixed(7))).join(','), point])).values()];
}
function trianglePlanes(g) {
  // Group actual coplanar triangles independently of the descriptive pane IDs.
  const p = positions(g), groups = [];
  for (let i = 0; i < p.length; i += 3) {
    const vertices = p.slice(i, i + 3), normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
    expect(normal.length()).toBeGreaterThan(1e-10);
    normal.normalize();
    const distance = normal.dot(vertices[0]);
    let group = groups.find(item => item.normal.distanceTo(normal) < 1e-5 && Math.abs(item.distance - distance) < 1e-6);
    if (!group) { group = { normal, distance, points: [] }; groups.push(group); }
    group.points.push(...vertices);
  }
  for (const group of groups) {
    group.points = uniquePoints(group.points);
    group.center = group.points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / group.points.length);
  }
  return groups;
}
function paneRay(point, normal, range = .15) {
  return new THREE.Raycaster(point.clone().addScaledVector(normal, range), normal.clone().negate(), 0, range + 1e-5);
}
function localMeshes(parts) {
  const material = keep(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
  return Object.fromEntries(Object.entries(parts).map(([key, part]) => [key, new THREE.Mesh(part, material)]));
}

describe('physical seven-window Cupola geometry', () => {
  it('returns fresh finite nonindexed geometry inside the original radius with unit normals', () => {
    const parts = geometry(), second = geometry();
    expect(Object.keys(parts).sort()).toEqual(['frame', 'glazing']);
    let triangleCount = 0;
    for (const [key, g] of Object.entries(parts)) {
      expect(g.isBufferGeometry).toBe(true); expect(g.index).toBeNull(); expect(g).not.toBe(second[key]);
      const p = g.getAttribute('position'), n = g.getAttribute('normal');
      expect(p.count % 3).toBe(0); expect(p.count).toBeGreaterThan(20); expect(n.count).toBe(p.count);
      triangleCount += p.count / 3;
      for (const a of Object.values(g.attributes)) expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
      for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
      for (const point of positions(g)) expect(point.length()).toBeLessThanOrEqual(.42 + 1e-7);
      expect(g.userData.windowCount).toBe(7); expect(g.userData.sideWindowCount).toBe(6);
      const original = second[key].getAttribute('position').getX(0);
      p.setX(0, 99); expect(second[key].getAttribute('position').getX(0)).toBe(original);
      expect(g.userData).not.toBe(second[key].userData);
    }
    expect(triangleCount).toBeLessThan(3200);
  });

  it('has exactly six equally spaced trapezoidal planes and one circular nadir plane', () => {
    const { glazing } = geometry(), planes = trianglePlanes(glazing);
    expect(planes).toHaveLength(7);
    const nadir = planes.filter(plane => plane.normal.y > .999), sides = planes.filter(plane => plane.normal.y < .999);
    expect(nadir).toHaveLength(1); expect(sides).toHaveLength(6);
    expect(nadir[0].center.x).toBeCloseTo(0, 6); expect(nadir[0].center.z).toBeCloseTo(0, 6);
    const ring = nadir[0].points.filter(point => Math.hypot(point.x, point.z) > .001);
    expect(ring.length).toBeGreaterThanOrEqual(24);
    const radius = Math.hypot(ring[0].x, ring[0].z);
    expect(radius).toBeGreaterThan(.1);
    for (const point of ring) expect(Math.hypot(point.x, point.z)).toBeCloseTo(radius, 6);
    const angles = sides.map(plane => {
      expect(plane.points).toHaveLength(4); expect(plane.normal.y).toBeGreaterThan(0);
      expect(plane.normal.dot(plane.center)).toBeGreaterThan(0);
      return (Math.atan2(plane.normal.z, plane.normal.x) + 2 * Math.PI) % (2 * Math.PI);
    }).sort((a, b) => a - b);
    for (let i = 0; i < 6; i++) expect((angles[(i + 1) % 6] - angles[i] + 2 * Math.PI) % (2 * Math.PI)).toBeCloseTo(Math.PI / 3, 5);
    const panes = glazing.userData.panes;
    expect(panes.map(pane => pane.id).sort()).toEqual(['nadir', 'side-1', 'side-2', 'side-3', 'side-4', 'side-5', 'side-6']);
    expect(panes.map(pane => pane.count).reduce((a, b) => a + b, 0)).toBe(glazing.getAttribute('position').count);
    for (const pane of panes) {
      expect(pane.start % 3).toBe(0); expect(pane.count % 3).toBe(0);
      const normal = new THREE.Vector3().fromArray(pane.normal), center = new THREE.Vector3().fromArray(pane.center);
      expect(normal.length()).toBeCloseTo(1, 6);
      for (const point of positions(glazing, pane.start, pane.count)) expect(Math.abs(point.sub(center).dot(normal))).toBeLessThan(1e-7);
      expect(pane.kind).toBe(pane.id === 'nadir' ? 'circle' : 'trapezoid');
    }
  });

  it('lets rays through broad interior samples of all seven frame openings onto real glass', () => {
    const parts = geometry(), meshes = localMeshes(parts);
    for (const pane of trianglePlanes(parts.glazing)) {
      const samples = [pane.center, ...pane.points.filter(point => point.distanceTo(pane.center) > .01)
        .map(point => point.clone().lerp(pane.center, .45))];
      for (const point of samples) {
        const ray = paneRay(point, pane.normal);
        expect(ray.intersectObject(meshes.frame), 'frame must leave the visible pane aperture open').toHaveLength(0);
        const hits = ray.intersectObject(meshes.glazing);
        expect(hits.length).toBeGreaterThan(0);
        expect(hits[0].point.distanceTo(point)).toBeLessThan(1e-6);
        expect(hits[0].face.normal.dot(pane.normal)).toBeGreaterThan(.99999);
      }
    }
  });

  it('makes the opening oracle reject an opaque painted cap across the nadir aperture', () => {
    const parts = geometry(), pane = trianglePlanes(parts.glazing).find(item => item.normal.y > .999);
    const cap = keep(new THREE.CircleGeometry(.18, 32)); cap.rotateX(-Math.PI / 2); cap.translate(0, pane.center.y + .003, 0);
    const falseFrame = new THREE.Mesh(cap, keep(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })));
    expect(paneRay(pane.center, pane.normal).intersectObject(falseFrame).length).toBeGreaterThan(0);
  });

  it('preserves unrelated camera, arm and hardware helper implementations', () => {
    const hashes = {
      issMapCameraFit: '843f5f17dd3b2ffcc09bad33b441193d9739ad3781a8b99a3988cf6392e61fd0',
      issMapCameraPose: 'f90b2052aedf8de7c8258521994ed8fb84cc873a36bc3e439c6088b249dd777e',
      issMapCameraPan: '0d5e8812aa6a42ae9225836aea8ae79971c0fe79eaa77f31b0e99a12b09700fc',
      issMapArmPose: '2fd95b2566b54de6ef723019a538293ee417de334ca80bce8c9d2b1b5596be0d',
      issMapArmTarget: 'fe7e0c35d1a2e5042b3f53593356fe5640849c3f79454351c31fd3054e774217',
      issMapArmStep: 'b33cc9a182fcefe964cff6969104abede7df992f8261438f3381b88ed2ef5053',
      issModuleHardwareGeometry: '022d18adc3c818e08bf412834e6e4fcb47b7d31cf56ec873b6bab7704af50691',
      issDestinyWindowGeometry: '0d5d495e8c8bd7bdd14a938d7e3d214eb610e47d84ce8180c3e3d3db099a98ee',
      issAmsGeometry: '8ec112739daefdb0ab79d914f90f44f69feb9c3ddea2e0050738829968031d08',
      issArmHandGeometry: '2fc914a739fd0c8786ad9ab8ac5850034bfef034e9a129365d29b9d84010bad4'
    };
    for (const [name, hash] of Object.entries(hashes)) expect(createHash('sha256').update(namedFunction(name).replace(/\r\n/g, '\n')).digest('hex'), name).toBe(hash);
  });
});

const modules = runInNewContext(expression(source.indexOf('[', source.indexOf('  var MODULES ='))), { ISS_TRUSS_Y: .9 });
const assemblyStart = source.lastIndexOf('          var station =', source.indexOf('MODULES.forEach(function (m)'));
const assemblyEnd = source.indexOf('          // Shared cell and insulation atlases', assemblyStart);
if (assemblyStart < 0 || assemblyEnd < assemblyStart) throw new Error('Station module assembly block missing');
const assembly = source.slice(assemblyStart, assemblyEnd);
function stationFixture(withInterior = false) {
  const painter = vi.fn(kind => withInterior && kind === 'interior' ? document.createElement('canvas') : null);
  const context = { THREE, MODULES: modules, ISS_TRUSS_Y: .9, scene: new THREE.Scene(),
    issCupolaGeometry: geometryFactory, issHullCanvas: painter, issModuleEndcapCanvas: () => null,
    issTexture: canvas => {
      if (!withInterior) throw new Error('Cupola should not allocate a painted window atlas');
      return keep(new THREE.Texture(canvas));
    }
  };
  for (const name of ['issOpenTrussGeometry', 'issTrussHardwareGeometry', 'issAmsGeometry', 'issModuleHardwareGeometry', 'issDestinyWindowGeometry', 'issKiboFacilityGeometry', 'issQuestGeometry', 'issCommsGeometry']) context[name] = new Function('return ' + namedFunction(name))();
  runInNewContext(assembly, context); context.scene.updateMatrixWorld(true);
  context.scene.traverse(object => { if (object.geometry) keep(object.geometry); if (object.material) keep(object.material); });
  context.frame = context.scene.getObjectByName('iss-cupola-frame');
  context.glazing = context.scene.getObjectByName('iss-cupola-glazing');
  context.painter = painter;
  return context;
}
function updateDetails(context, daylight = 1) {
  Object.assign(context, { earthLightsMat: null, earthExposureMat: null, milkyWay: { userData: { starMaterial: {} } }, daylight01: daylight });
  if (!context.setLabToolData) context.setLabToolData = vi.fn();
  const start = source.indexOf('            var lampOn =', assemblyEnd), end = source.indexOf('            if (curSel)', start);
  if (start < 0 || end < start) throw new Error('Station lighting/detail update missing');
  runInNewContext(source.slice(start, end), context);
}

describe('Cupola renderer integration', () => {
  it('keeps one original module anchor and mounts private non-emissive glazing without a painted atlas', () => {
    const context = stationFixture(), second = stationFixture();
    expect(context.clickable).toHaveLength(13);
    expect(context.clickable.filter(mesh => mesh._issId === 'cupola')).toEqual([context.frame]);
    expect(context.frame.position.toArray()).toEqual([-1.2, -.75, .2]); expect(context.frame.rotation.x).toBe(Math.PI);
    expect(context.glazing.position.toArray()).toEqual(context.frame.position.toArray());
    expect(context.glazing.quaternion.toArray()).toEqual(context.frame.quaternion.toArray());
    expect(context.glazing._issParentId).toBe('cupola'); expect(context.moduleDetails).toContain(context.glazing);
    expect(context.moduleCapPickers).toContain(context.glazing); expect(context.clickable).not.toContain(context.glazing);
    expect(context.painter.mock.calls.flat()).not.toContain('cupola');
    for (const key of ['frame', 'glazing']) {
      const mesh = context[key];
      expect(mesh.material.isMeshStandardMaterial).toBe(true); expect(mesh.material.emissive.getHex()).toBe(0);
      for (const [name, value] of Object.entries(mesh.material)) if (name === 'map' || /Map$/.test(name)) expect(value, name).toBeNull();
      expect(mesh.geometry).not.toBe(second[key].geometry); expect(mesh.material).not.toBe(second[key].material);
    }
    expect(context.frame.material).not.toBe(context.glazing.material);
  });

  it('picks each real pane through the frame with the same Cupola module ownership', () => {
    const context = stationFixture(); context.station.rotation.set(.25, -.3, .18); context.scene.updateMatrixWorld(true);
    for (const plane of trianglePlanes(context.glazing.geometry)) {
      const center = plane.center.clone().applyMatrix4(context.glazing.matrixWorld);
      const normal = plane.normal.clone().transformDirection(context.glazing.matrixWorld);
      const ray = paneRay(center, normal);
      const hits = ray.intersectObjects(context.clickable.concat(context.moduleCapPickers), false);
      expect(hits.length).toBeGreaterThan(0); expect(hits[0].object).toBe(context.glazing);
      expect(hits[0].object._issParentId).toBe('cupola');
      expect(hits[0].point.distanceTo(center)).toBeLessThan(1e-6);
    }
  });

  it('releases both private geometries and materials exactly once with scene cleanup', () => {
    const context = stationFixture(), disposed = [];
    const parts = [context.frame.geometry, context.glazing.geometry, context.frame.material, context.glazing.material];
    parts.forEach(part => part.addEventListener('dispose', () => disposed.push(part.uuid)));
    const start = source.indexOf('var geometries = new Set()', assemblyEnd), end = source.indexOf('renderer.dispose();', start) + 'renderer.dispose();'.length;
    if (start < 0 || end < start) throw new Error('Station cleanup missing');
    context.planetScene = new THREE.Scene(); context.renderer = { dispose: vi.fn() };
    runInNewContext(source.slice(start, end), context);
    expect(disposed).toHaveLength(4); expect(new Set(disposed).size).toBe(4); expect(context.renderer.dispose).toHaveBeenCalledOnce();
  });

  it('shows an opaque exterior in macro for either selection, then restores ordinary cutaway surfaces', () => {
    const context = stationFixture(true), colour = context.glazing.material.color.getHex();
    Object.assign(context, { cv: { _issWantSel: 'cupola', _issCutaway: true }, cameraFocusId: 'cupola', cameraMinDistance: .72 });
    const core = context.moduleCores.find(mesh => mesh._issParentId === 'cupola');
    expect(core).toBeDefined();
    for (const selected of ['cupola', 'unity']) for (const daylight of [1, 0, .5]) {
      context.cv._issWantSel = selected; updateDetails(context, daylight);
      expect(context.frame.material.opacity).toBe(1); expect(context.frame.material.depthWrite).toBe(true);
      expect(context.glazing.material.opacity).toBe(1); expect(context.glazing.material.depthWrite).toBe(true);
      expect(context.glazing.material.color.getHex()).toBe(colour); expect(context.glazing.material.emissive.getHex()).toBe(0);
      expect(core.visible).toBe(false);
      for (const plane of trianglePlanes(context.glazing.geometry)) {
        const point = plane.center.clone().applyMatrix4(context.glazing.matrixWorld), normal = plane.normal.clone().transformDirection(context.glazing.matrixWorld);
        const hits = paneRay(point, normal).intersectObjects([context.frame, context.glazing, core], false);
        expect(hits[0].object).toBe(context.glazing);
      }
    }
    for (const selected of ['cupola', 'unity']) for (const focus of [null, 'cupola']) {
      context.cv._issWantSel = selected; context.cameraFocusId = focus; context.cameraMinDistance = 1.6;
      updateDetails(context);
      expect(context.frame.material.opacity).toBe(selected === 'cupola' ? .26 : .1);
      expect(context.glazing.material.opacity).toBe(selected === 'cupola' ? .26 : .1);
      expect(context.glazing.material.depthWrite).toBe(false);
      expect(core.visible).toBe(selected === 'cupola');
      expect(context.cv._issCutaway).toBe(true); expect(context.cv._issWantSel).toBe(selected);
    }
    expect(context.setLabToolData).not.toHaveBeenCalled();
  });
});

const cameraMath = new Function(['issFlightNumber', 'issMapCameraPose', 'issMapCameraPan', 'issMapCameraFit'].map(namedFunction).join('\n') +
  '\nreturn {pose:issMapCameraPose,pan:issMapCameraPan,fit:issMapCameraFit};')();
function cameraFixture(aspect = 1.6) {
  const context = stationFixture();
  Object.assign(context, {
    cv: { _issWantSel: 'cupola' }, cleaned: false, _prefersReducedMotion: true,
    camera: new THREE.PerspectiveCamera(46, aspect, .01, 1000), cameraTarget: new THREE.Vector3(0, 0, 1),
    cameraFocusId: null, cameraFitMode: null, cameraFitResult: null, cameraTween: null,
    cameraPanned: false, cameraView: 'overview', cameraMinDistance: 3.2, cameraMaxDistance: 30,
    Hc: 500, visitorTargets: Object.create(null), radiatorTargets: Object.create(null),
    stationEnvelope: { center: new THREE.Vector3(0, 1, 0), radius: 9 },
    armBase: new THREE.Vector3(0, 2, -1), armVelocity: { enabled: false },
    wings: [{}, {}, { position: new THREE.Vector3(4, 2, -1) }], arrayFocus: { visible: false },
    finishJointDrag: vi.fn(), finishArmDrag: vi.fn(), finishMotionDrag: vi.fn(),
    onUp: vi.fn(), onLeave: vi.fn(), syncCameraHUD: vi.fn(), announceToSR: vi.fn(), upd: vi.fn(),
    __alloT: (key, fallback) => fallback,
    __alloFill: (text, values) => text.replace(/\{([^}]+)\}/g, (_, key) => String(values[key])),
    issMapCameraPose: cameraMath.pose, issMapCameraPan: cameraMath.pan, issMapCameraFit: cameraMath.fit,
    _lastFrameSig: 'before'
  });
  context.camera.position.set(8, 4, 10);
  runInNewContext(['applyCameraPose', 'settleCameraFit', 'cancelCameraTween', 'moveCamera', 'onKey'].map(namedFunction).join('\n'), context);
  for (const key of ['_issCameraOrbit', '_issCameraZoom', '_issCameraPan', '_issSetView', '_issFitCamera', '_issFocusModule']) {
    const start = source.indexOf('cv.' + key + ' = function');
    runInNewContext('cv.' + key + ' = ' + expression(source.indexOf('function', start)) + ';', context);
  }
  return context;
}
function actualBounds(context) {
  context.station.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  for (const part of [context.frame, context.glazing]) bounds.union(new THREE.Box3().setFromObject(part));
  return bounds.getBoundingSphere(new THREE.Sphere());
}
function outward(context) { return new THREE.Vector3(0, 1, 0).transformDirection(context.frame.matrixWorld); }

describe('Cupola close-inspection camera', () => {
  it('fits the combined actual transformed geometry with a bounded outward view at both aspect ratios', () => {
    for (const aspect of [1.6, .7]) {
      const context = cameraFixture(aspect); context.station.rotation.set(.25, -.3, .18);
      context.cv._issFitCamera('cupola');
      const sphere = actualBounds(context), offset = context.camera.position.clone().sub(context.cameraTarget);
      expect(context.cameraTarget.distanceTo(sphere.center)).toBeLessThan(1e-12);
      expect(context.cameraFitResult.radius).toBeCloseTo(sphere.radius, 12);
      expect(context.cameraFocusId).toBe('cupola'); expect(context.cameraFitMode).toBe('cupola');
      expect(context.cameraMinDistance).toBe(.72); expect(context.cameraMaxDistance).toBe(2.6);
      expect(offset.length()).toBeGreaterThanOrEqual(.72 - 1e-12); expect(offset.length()).toBeLessThanOrEqual(2.6 + 1e-12);
      expect(offset.normalize().dot(outward(context))).toBeGreaterThan(.85);
      context.camera.updateMatrixWorld(true);
      for (const part of [context.frame, context.glazing]) for (const local of positions(part.geometry)) {
        const ndc = local.applyMatrix4(part.matrixWorld).project(context.camera);
        expect(Math.abs(ndc.x)).toBeLessThan(1); expect(Math.abs(ndc.y)).toBeLessThan(1);
        expect(ndc.z).toBeGreaterThan(-1); expect(ndc.z).toBeLessThan(1);
      }
      expect(context.arrayFocus.visible).toBe(false); expect(context.upd).not.toHaveBeenCalled();
    }
  });

  it('keeps orbit direction on resize and the exterior guard after minimum and maximum zoom', () => {
    const context = cameraFixture(); context.station.rotation.set(.25, -.3, .18);
    context.cv._issFitCamera('cupola'); context.cv._issCameraOrbit(.35, -.2);
    const direction = context.camera.position.clone().sub(context.cameraTarget).normalize();
    context.camera.aspect = .7; context.camera.updateProjectionMatrix(); context.cv._issFitCamera('cupola', true);
    expect(context.camera.position.clone().sub(context.cameraTarget).normalize().distanceTo(direction)).toBeLessThan(1e-11);
    for (const [factor, distance] of [[.001, .72], [1000, 2.6]]) {
      context.cv._issCameraZoom(factor);
      expect(context.cameraFitMode).toBeNull(); expect(context.cameraFocusId).toBe('cupola');
      expect(context.cameraMinDistance).toBe(.72); expect(context.cameraMaxDistance).toBe(2.6);
      for (let i = 0; i < 60; i++) {
        context.cv._issCameraOrbit(i % 2 ? .8 : -.4, i < 30 ? -.09 : .09);
        const offset = context.camera.position.clone().sub(context.cameraTarget);
        expect(offset.length()).toBeCloseTo(distance, 11);
        expect(offset.dot(outward(context))).toBeGreaterThanOrEqual(.08 * distance - 1e-11);
        expect(context.camera.position.y).toBeGreaterThanOrEqual(-3.8 - 1e-11);
      }
    }
  });

  it('exits the macro when centering the same module, panning or returning home', () => {
    for (const action of ['focus', 'pan', 'home']) {
      const context = cameraFixture(); context.cv._issFitCamera('cupola');
      context.cv._issCutaway = true; updateDetails(context);
      expect(context.glazing.material.opacity).toBe(1);
      if (action === 'focus') context.cv._issFocusModule('cupola');
      else if (action === 'pan') context.cv._issCameraPan(32, 0);
      else context.cv._issSetView('overview');
      expect(context.cameraFitMode).not.toBe('cupola');
      if (action === 'focus') {
        expect(context.cameraFocusId).toBe('cupola'); expect(context.cameraMinDistance).toBeGreaterThanOrEqual(1.6);
        expect(context.cameraMaxDistance).toBe(30);
        expect(context.cameraTarget.distanceTo(context.frame.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);
      } else expect(context.cameraFocusId).not.toBe('cupola');
      updateDetails(context);
      expect(context.glazing.material.opacity).toBe(.26); expect(context.glazing.material.depthWrite).toBe(false);
      expect(context.cv._issCutaway).toBe(true); expect(context.cv._issWantSel).toBe('cupola');
      expect(context.upd).not.toHaveBeenCalled();
      const position = context.camera.position.toArray(); context.cleaned = true; context.cv._issFitCamera('cupola');
      expect(context.camera.position.toArray()).toEqual(position);
    }
  });
});

const require = createRequire(import.meta.url), modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React, save = vi.fn();
const Study = runInNewContext(namedFunction('IssCupolaStudy') + '\nIssCupolaStudy;', { document, setLabToolData: save });
const mounts = [];
let previousActEnvironment;
beforeAll(() => { previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(() => {
  for (const { root, host } of mounts.splice(0)) {
    host.querySelectorAll('style').forEach(style => style.remove());
    act(() => root.unmount()); host.remove();
  }
  save.mockClear();
});
function mountStudy(props = {}) {
  const host = document.createElement('div'); host.setAttribute('data-iss-map', ''); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const render = () => act(() => root.render(React.createElement(Study, { React, ...props })));
  render();
  return { host, render, state: () => host.querySelector('[data-iss-cupola-study]'),
    layer(value) { act(() => host.querySelector(`[data-iss-cupola-layer="${value}"]`).click()); }
  };
}
function addCamera(view) {
  const stage = document.createElement('div'); stage.className = 'iss-station-stage'; stage.scrollIntoView = vi.fn();
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas._issFitCamera = vi.fn();
  stage.appendChild(canvas); view.host.appendChild(stage); return { canvas, stage };
}

describe('local Cupola window-layer study', () => {
  it('keeps four physical panes and the separate shutter synchronized with native layer controls', () => {
    const view = mountStudy(), ids = ['scratch', 'pressure', 'debris', 'shutter'];
    for (const selected of [...ids, 'scratch']) {
      view.layer(selected);
      expect(view.state().dataset.issCupolaStudy).toBe(selected);
      expect(view.host.querySelectorAll('[data-iss-cupola-pane]')).toHaveLength(4);
      expect(view.host.querySelectorAll('[data-iss-cupola-shutter]')).toHaveLength(1);
      for (const id of ids) {
        const button = view.host.querySelector(`[data-iss-cupola-layer="${id}"]`);
        expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
        expect(button.getAttribute('aria-pressed')).toBe(String(selected === id));
      }
      const highlighted = [...view.host.querySelectorAll('[data-iss-cupola-pane][data-selected="true"]')].map(node => node.dataset.issCupolaPane).sort();
      expect(highlighted).toEqual(selected === 'pressure' ? ['pressure-inner', 'pressure-outer'] : selected === 'shutter' ? [] : [selected]);
      expect(view.host.querySelector('[data-iss-cupola-shutter]').getAttribute('data-selected')).toBe(String(selected === 'shutter'));
      const label = view.host.querySelector(`[data-iss-cupola-layer="${selected}"]`).textContent;
      expect(view.host.querySelector('[data-iss-cupola-description]').textContent).toContain(label);
      expect(view.host.querySelector('svg[role="img"]').getAttribute('aria-label')).toContain(label);
    }
  });

  it('keeps layer exploration local across mounts and never writes saved station state or moves the camera', () => {
    const data = Object.freeze({ selModule: 'cupola', mapPhase: 61, mapPlaying: true, mapCutaway: true,
      armShoulder: 50, armElbow: -90, seenModules: Object.freeze(['zarya', 'cupola']) });
    const onChange = vi.fn(), updateData = vi.fn();
    const a = mountStudy({ data, onChange, updateData }), b = mountStudy({ data });
    const aCamera = addCamera(a), bCamera = addCamera(b), original = JSON.stringify(data);
    a.layer('shutter'); a.render();
    expect(a.state().dataset.issCupolaStudy).toBe('shutter'); expect(b.state().dataset.issCupolaStudy).toBe('scratch');
    expect(JSON.stringify(data)).toBe(original); expect(save).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled(); expect(updateData).not.toHaveBeenCalled();
    expect(aCamera.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
  });

  it('opens only its own Cupola camera and does nothing if that map has no canvas', () => {
    const a = mountStudy(), b = mountStudy(), aCamera = addCamera(a), bCamera = addCamera(b);
    act(() => a.host.querySelector('[data-iss-cupola-inspect]').click());
    expect(aCamera.canvas._issFitCamera).toHaveBeenCalledExactlyOnceWith('cupola');
    expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(aCamera.canvas); expect(aCamera.stage.scrollIntoView).toHaveBeenCalledOnce();
    aCamera.stage.remove(); aCamera.canvas._issFitCamera.mockClear();
    act(() => a.host.querySelector('[data-iss-cupola-inspect]').click());
    expect(aCamera.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
  });

  it('distinguishes the real pressure stack and dated milestones from the schematic glass', () => {
    const view = mountStudy(); view.layer('shutter');
    expect(view.host.querySelector('[data-iss-cupola-description]').textContent).toMatch(/not the cabin pressure seal/i);
    expect(view.host.textContent).toMatch(/four glass panes/i);
    expect(view.host.textContent).toMatch(/one opaque(?: illustrative)? surface per window/i);
    const milestones = [...view.host.querySelectorAll('dt')].map(node => [node.textContent, node.nextElementSibling.textContent]);
    expect(milestones.map(entry => entry[0])).toEqual(['8 February 2010', '15 February 2010', '17 February 2010']);
    expect(milestones[0][1]).toMatch(/launch/i); expect(milestones[1][1]).toMatch(/relocat|install/i); expect(milestones[2][1]).toMatch(/open/i);
    const links = [...view.host.querySelectorAll('a')]; expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(['www.esa.int', 'www.nasa.gov']).toContain(new URL(link.href).hostname);
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
  });
});

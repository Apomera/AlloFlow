import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;
function expression(start) {
  if (start < 0) throw new Error('Required Destiny window integration is absent');
  const node = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
  return source.slice(node.start, node.end);
}
function namedFunction(name) { return expression(source.indexOf('function ' + name + '(')); }
const geometryFactory = new Function('return ' + namedFunction('issDestinyWindowGeometry'))();
const hardwareFactory = new Function('return ' + namedFunction('issModuleHardwareGeometry'))();
const cupolaFactory = new Function('return ' + namedFunction('issCupolaGeometry'))();
const cameraHelpers = new Function(namedFunction('issFlightNumber') + '\n' + namedFunction('issMapCameraFit') + '\n' +
  namedFunction('issMapCameraPose') + '\nreturn {fit:issMapCameraFit,pose:issMapCameraPose};')();
const modules = runInNewContext(expression(source.indexOf('[', source.indexOf('  var MODULES ='))), { ISS_TRUSS_Y: 0 });
const destiny = modules.find(module => module.id === 'destiny');
const loopStart = source.indexOf('MODULES.forEach(function (m)');
const assemblyStart = source.lastIndexOf('          var station =', loopStart);
const assemblyEnd = source.indexOf('          // Shared cell and insulation atlases', loopStart);
if (assemblyStart < 0 || assemblyEnd < loopStart) throw new Error('Station module assembly block not found');
const assembly = source.slice(assemblyStart, assemblyEnd);
const fitStart = source.indexOf('cv._issFitCamera = function');
const fitFunction = expression(source.indexOf('function', fitStart));
const updateStart = source.indexOf('            var lampOn =', assemblyEnd);
const updateEnd = source.indexOf('            if (curSel)', updateStart);
if (updateStart < 0 || updateEnd < updateStart) throw new Error('Station lighting/detail update block not found');
const detailUpdate = source.slice(updateStart, updateEnd);
const cleanupStart = source.indexOf('var geometries = new Set()', assemblyEnd);
const cleanupEnd = source.indexOf('renderer.dispose();', cleanupStart) + 'renderer.dispose();'.length;
if (cleanupStart < 0 || cleanupEnd < cleanupStart) throw new Error('Station resource cleanup block not found');
const cleanupBody = source.slice(cleanupStart, cleanupEnd);

const resources = new Set();
function track(resource) {
  if (!resources.has(resource)) {
    resources.add(resource);
    resource.addEventListener('dispose', () => resources.delete(resource));
  }
  return resource;
}
afterEach(() => { for (const resource of [...resources]) resource.dispose(); });
function geometries() {
  const parts = geometryFactory(THREE);
  Object.values(parts).forEach(track);
  return parts;
}
function fixture() {
  const context = {
    THREE, MODULES: modules.filter(module => module.id !== 'truss'), scene: new THREE.Scene(),
    issDestinyWindowGeometry: geometryFactory, issModuleHardwareGeometry: hardwareFactory,
    issCupolaGeometry: cupolaFactory,
    issKiboFacilityGeometry: new Function('return ' + namedFunction('issKiboFacilityGeometry'))(),
    issCommsGeometry: new Function('return ' + namedFunction('issCommsGeometry'))(),
    issQuestGeometry: new Function('return ' + namedFunction('issQuestGeometry'))(),
    issHullCanvas: () => null, issModuleEndcapCanvas: () => null,
    issTexture: () => { throw new Error('The isolated assembly should not create a texture'); }
  };
  // Execute the actual renderer's module/window assembly with real Three.
  // Null painters omit unrelated canvases; no window material may need one.
  runInNewContext(assembly, context);
  context.scene.updateMatrixWorld(true);
  context.scene.traverse(object => {
    if (object.geometry) track(object.geometry);
    if (object.material) track(object.material);
  });
  return context;
}
function points(geometry) {
  const p = geometry.getAttribute('position');
  return Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i));
}
function triangles(geometry) {
  const p = geometry.getAttribute('position'), index = geometry.index;
  const count = index ? index.count : p.count, result = [];
  for (let i = 0; i < count; i += 3) result.push([0, 1, 2].map(offset =>
    new THREE.Vector3().fromBufferAttribute(p, index ? index.getX(i + offset) : i + offset)));
  return result;
}
function meshFor(geometry) { return new THREE.Mesh(geometry, track(new THREE.MeshStandardMaterial())); }
function rayAt(x = 0, y = 0) { return new THREE.Raycaster(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1)); }
function projectedTriangleDistance(vertices) {
  const points = vertices.map(p => new THREE.Vector3(p.x, p.y, 0));
  const [a, b, c] = points, origin = new THREE.Vector3(), closest = new THREE.Vector3();
  if (Math.abs(b.clone().sub(a).cross(c.clone().sub(a)).z) > 1e-14) {
    new THREE.Triangle(a, b, c).closestPointToPoint(origin, closest);
    return closest.length();
  }
  // Annular side walls project to line segments, not 2-D triangles.
  // Three's triangle closest-point formula can divide by zero for this case.
  return Math.min(...points.map((start, index) => {
    const delta = points[(index + 1) % 3].clone().sub(start), lengthSq = delta.lengthSq();
    const t = lengthSq ? Math.max(0, Math.min(1, -start.dot(delta) / lengthSq)) : 0;
    return start.clone().addScaledVector(delta, t).length();
  }));
}
function setupCamera(context, aspect = 1.6) {
  Object.assign(context, {
    cv: {}, cleaned: false, camera: new THREE.PerspectiveCamera(46, aspect, .01, 1000),
    cameraTarget: new THREE.Vector3(0, 0, 1), cameraFocusId: null, cameraPanned: true,
    cameraFitMode: null, cameraFitResult: null, cameraView: 'overview', cameraMinDistance: 3.2, cameraMaxDistance: 30,
    visitorTargets: Object.create(null), radiatorTargets: Object.create(null),
    stationEnvelope: { center: new THREE.Vector3(0, 1, 0), radius: 9 },
    armBase: new THREE.Vector3(0, 2, -1), armVelocity: { enabled: false },
    wings: [{}, {}, { position: new THREE.Vector3(4, 2, -1) }], arrayFocus: { visible: false },
    onUp: vi.fn(), onLeave: vi.fn(), announceToSR: vi.fn(), _lastFrameSig: 'before',
    __alloT: (key, fallback) => fallback, __alloFill: text => text, issMapCameraFit: cameraHelpers.fit,
    issMapCameraPose: cameraHelpers.pose, finishJointDrag: vi.fn(), finishArmDrag: vi.fn(), syncCameraHUD: vi.fn()
  });
  context.camera.position.set(8, 4, 10);
  for (const id of ['dragon', 'progress', 'cygnus']) context.visitorTargets[id] = {
    envelope: { center: new THREE.Vector3(1, 0, 2), radius: .9 }, info: { direction: [1, .5, 1], name: id }
  };
  for (const id of ['radiator-a', 'radiator-b']) context.radiatorTargets[id] = { position: new THREE.Vector3(3, 2, 0) };
  context.moveCamera = vi.fn((destination, target) => {
    context.camera.position.copy(destination); context.cameraTarget.copy(target);
  });
  runInNewContext('cv._issFitCamera = ' + fitFunction + ';', context);
  return context;
}

describe('Destiny science-window geometry', () => {
  it('supplies three fresh geometries with finite positions, unit normals, UVs and a bounded triangle budget', () => {
    const parts = geometries(), other = geometries();
    expect(Object.keys(parts).sort()).toEqual(['gasket', 'pane', 'rim']);
    let vertexCount = 0, triangleCount = 0;
    for (const [name, geometry] of Object.entries(parts)) {
      expect(geometry.isBufferGeometry, name).toBe(true);
      expect(geometry).not.toBe(other[name]);
      const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
      expect(p.count, name).toBeGreaterThan(20);
      expect(n.count, name).toBe(p.count); expect(uv.count, name).toBe(p.count);
      for (const attribute of [p, n, uv]) expect(Array.from(attribute.array).every(Number.isFinite), name).toBe(true);
      for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)), name).toBeCloseTo(1, 5);
      vertexCount += p.count; triangleCount += (geometry.index ? geometry.index.count : p.count) / 3;
    }
    expect(vertexCount).toBeLessThanOrEqual(2000);
    expect(triangleCount).toBeLessThanOrEqual(700);
    parts.pane.getAttribute('position').setX(0, 10);
    expect(other.pane.getAttribute('position').getX(0)).toBe(0);
  });

  it('keeps an open annular rim around a recessed pane, with the gasket behind the pane', () => {
    const parts = geometries();
    const rimPoints = points(parts.rim), panePoints = points(parts.pane), gasketPoints = points(parts.gasket);
    expect(Math.max(...rimPoints.map(p => Math.hypot(p.x, p.y)))).toBeCloseTo(.118, 6);
    expect(Math.min(...rimPoints.map(p => p.z))).toBeCloseTo(0, 7);
    expect(Math.max(...rimPoints.map(p => p.z))).toBeCloseTo(.029, 6);
    for (const p of panePoints) expect(p.z).toBeCloseTo(.010, 7);
    for (const p of gasketPoints) expect(p.z).toBeCloseTo(.008, 7);
    expect(Math.max(...panePoints.map(p => Math.hypot(p.x, p.y)))).toBeCloseTo(.073, 6);
    expect(Math.min(...gasketPoints.map(p => Math.hypot(p.x, p.y)))).toBeCloseTo(.073, 6);
    expect(Math.max(...gasketPoints.map(p => Math.hypot(p.x, p.y)))).toBeCloseTo(.083, 6);
    // Test projected triangle interiors, not only the vertex radii: a mistaken
    // face across the aperture can have every vertex on its outer edge.
    for (const vertices of triangles(parts.rim)) {
      expect(projectedTriangleDistance(vertices)).toBeGreaterThan(.081);
    }
    const meshes = Object.fromEntries(Object.entries(parts).map(([name, geometry]) => [name, meshFor(geometry)]));
    for (const [x, y] of [[0, 0], [.05, 0], [-.05, 0], [0, .05], [0, -.05]]) {
      const ray = rayAt(x, y);
      expect(ray.intersectObject(meshes.rim)).toHaveLength(0);
      expect(ray.intersectObject(meshes.gasket)).toHaveLength(0);
      const hits = ray.intersectObject(meshes.pane);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].point.z).toBeCloseTo(.010, 7);
    }
  });

  it('makes the aperture oracle reject a solid face while accepting an edge-on annular wall', () => {
    const filled = [0, 1, 2].map(index => new THREE.Vector3(.1 * Math.cos(index * 2 * Math.PI / 3), .1 * Math.sin(index * 2 * Math.PI / 3), .025));
    expect(projectedTriangleDistance(filled)).toBeCloseTo(0, 10);
    const wall = [[.082, 0, 0], [.082, 0, .025], [.082, .01, .025]].map(p => new THREE.Vector3(...p));
    expect(projectedTriangleDistance(wall)).toBeCloseTo(.082, 10);
  });

  it('batches eight evenly spaced raised fasteners into the rim', () => {
    const p = points(geometries().rim).filter(point => point.z > .028);
    const unique = [...new Map(p.map(point => [point.toArray().map(n => n.toFixed(7)).join(','), point])).values()];
    const groups = [];
    for (const point of unique) {
      let group = groups.find(items => items.some(item => item.distanceTo(point) < .012));
      if (!group) { group = []; groups.push(group); }
      group.push(point);
    }
    expect(groups).toHaveLength(8);
    const centers = groups.map(group => group.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / group.length));
    const angles = centers.map(center => {
      expect(Math.hypot(center.x, center.y)).toBeCloseTo(.101, 6);
      return (Math.atan2(center.y, center.x) + Math.PI * 2) % (Math.PI * 2);
    }).sort((a, b) => a - b);
    for (let i = 0; i < angles.length; i++) expect((angles[(i + 1) % 8] - angles[i] + Math.PI * 2) % (Math.PI * 2)).toBeCloseTo(Math.PI / 4, 5);
  });

  it('winds the pane and gasket toward local +Z', () => {
    const parts = geometries();
    for (const geometry of [parts.pane, parts.gasket]) {
      const n = geometry.getAttribute('normal');
      for (let i = 0; i < n.count; i++) {
        expect(n.getX(i)).toBeCloseTo(0, 7); expect(n.getY(i)).toBeCloseTo(0, 7); expect(n.getZ(i)).toBeCloseTo(1, 7);
      }
      for (const [a, b, c] of triangles(geometry)) expect(b.clone().sub(a).cross(c.clone().sub(a)).z).toBeGreaterThan(0);
    }
  });
});

describe('Destiny science-window renderer integration', () => {
  it('mounts three private non-emissive parts outside the hull, facing nadir and between its seams', () => {
    const context = fixture(), parts = context.destinyWindowParts;
    expect(parts.map(part => part.name).sort()).toEqual(['iss-destiny-window-gasket', 'iss-destiny-window-pane', 'iss-destiny-window-rim']);
    expect(new Set(parts.map(part => part.material)).size).toBe(3);
    for (const part of parts) {
      expect(part._issParentId).toBe('destiny');
      expect(context.moduleDetails.includes(part)).toBe(true);
      expect(context.moduleCapPickers.includes(part)).toBe(true);
      expect(context.clickable.includes(part)).toBe(false); // keep the original hull selection anchor
      expect(part.material.type).toBe('MeshStandardMaterial');
      expect(part.material.map).toBeNull(); expect(part.material.emissiveMap).toBeNull();
      expect(part.material.emissive.getHex()).toBe(0);
      expect(new THREE.Vector3(0, 0, 1).transformDirection(part.matrixWorld).distanceTo(new THREE.Vector3(0, -1, 0))).toBeLessThan(1e-10);
      for (const local of points(part.geometry)) {
        const world = local.applyMatrix4(part.matrixWorld);
        expect(world.y).toBeLessThanOrEqual(destiny.pos[1] - destiny.size[0] - .0029);
        for (const offset of [-.26, 0, .26]) expect(Math.abs(world.z - (destiny.pos[2] + offset * destiny.size[1]))).toBeGreaterThan(.2);
      }
    }
  });

  it('keeps the main hull and Cupola geometry/anchors and removes the eleven generic window beads', () => {
    const context = fixture();
    expect(destiny.pos).toEqual([0, 0, -1.6]); expect(destiny.size).toEqual([.58, 2.6]);
    expect(context.clickable).toHaveLength(12); // all MODULES except the separately tested open truss
    const hull = context.clickable.find(mesh => mesh._issId === 'destiny');
    expect(hull.position.toArray()).toEqual([0, 0, -1.6]);
    expect(hull.geometry.parameters).toMatchObject({ radiusTop: .58, radiusBottom: .58, height: 2.6, radialSegments: 32, openEnded: true });
    const cupola = context.clickable.find(mesh => mesh._issId === 'cupola');
    expect(cupola.position.toArray()).toEqual([-1.2, -.75, .2]);
    expect(cupola.name).toBe('iss-cupola-frame');
    expect(points(cupola.geometry).every(point => point.length() <= .42 + 1e-7)).toBe(true);
    expect(cupola.rotation.x).toBe(Math.PI);
    const beads = [];
    context.station.traverse(object => {
      const parameters = object.geometry && object.geometry.parameters;
      if (parameters && parameters.radius === .075 && parameters.widthSegments === 10 && parameters.heightSegments === 8) beads.push(object);
    });
    expect(beads).toHaveLength(0);
    expect(source.includes('viewportMats')).toBe(false);
  });

  it('picks the visible pane before the untouched cylinder and keeps its Destiny ownership', () => {
    const context = fixture(), pane = context.destinyWindowParts.find(part => part.name.endsWith('-pane'));
    const center = new THREE.Vector3(0, 0, .01).applyMatrix4(pane.matrixWorld);
    const ray = new THREE.Raycaster(center.clone().add(new THREE.Vector3(0, -1, 0)), new THREE.Vector3(0, 1, 0));
    const hits = ray.intersectObjects(context.clickable.concat(context.moduleCapPickers), false);
    expect(hits[0].object).toBe(pane);
    expect(hits[0].object._issParentId).toBe('destiny');
    expect(/raycaster\.intersectObjects\(clickable\.concat\(moduleCapPickers,\s*visitorPickers\)/.test(source)).toBe(true);
  });

  it('does not turn the pane into a light in eclipse or hide a focused window in cutaway', () => {
    const context = fixture(), colours = context.destinyWindowParts.map(part => part.material.color.getHex());
    Object.assign(context, { earthLightsMat: null, earthExposureMat: null, milkyWay: { userData: { starMaterial: {} } },
      setLabToolData() {}, cv: { _issWantSel: 'unity', _issCutaway: true }, cameraFocusId: 'window' });
    for (const daylight of [1, 0, .5]) {
      context.daylight01 = daylight;
      runInNewContext(detailUpdate, context);
      context.destinyWindowParts.forEach((part, index) => {
        expect(part.material.color.getHex()).toBe(colours[index]);
        expect(part.material.emissive.getHex()).toBe(0);
        expect(part.material.opacity).toBe(1);
        expect(part.material.depthWrite).toBe(true);
      });
    }
    context.cameraFocusId = null;
    runInNewContext(detailUpdate, context);
    expect(context.destinyWindowParts.every(part => part.material.opacity === .05)).toBe(true);
  });

  it('fits the actual window bounds from the outward side and honors the close-view zoom minimum', () => {
    for (const aspect of [1.6, .7]) {
      const context = setupCamera(fixture(), aspect);
      context.station.rotation.set(.25, -.3, .18);
      context.cv._issFitCamera('window');
      const box = new THREE.Box3();
      context.destinyWindowParts.forEach(part => box.union(new THREE.Box3().setFromObject(part)));
      expect(context.cameraTarget.distanceTo(box.getCenter(new THREE.Vector3()))).toBeLessThan(1e-10);
      expect(context.cameraFitResult.radius).toBeCloseTo(box.getBoundingSphere(new THREE.Sphere()).radius, 10);
      expect(context.cameraMinDistance).toBe(.55);
      expect(context.cameraFitMode).toBe('window'); expect(context.cameraFocusId).toBe('window');
      const direction = context.camera.position.clone().sub(context.cameraTarget).normalize();
      const outward = new THREE.Vector3(0, -1, 0).applyQuaternion(context.station.getWorldQuaternion(new THREE.Quaternion()));
      expect(direction.dot(outward)).toBeGreaterThan(.95);
      expect(context.cameraFitResult.distance).toBeCloseTo(Math.max(.55, context.cameraFitResult.requiredDistance), 10);
      runInNewContext(namedFunction('applyCameraPose') + '\napplyCameraPose(camera.position, cameraTarget, {zoom:.001});', context);
      expect(context.camera.position.distanceTo(context.cameraTarget)).toBeCloseTo(.55, 10);
    }
  });

  it('requires an explicit close-inspection opt-in without changing ordinary camera limits', () => {
    for (const closeInspection of [undefined, false, 'true', 1]) {
      expect(cameraHelpers.fit({ radius: .1, minDistance: .55, closeInspection }).distance).toBe(1);
      expect(cameraHelpers.pose([0, 0, 2], [0, 0, 0], { minDistance: .55, zoom: .01, closeInspection }).distance).toBe(1);
    }
    expect(cameraHelpers.fit({ radius: .1, minDistance: .55, closeInspection: true }).distance).toBe(.55);
    expect(cameraHelpers.pose([0, 0, 2], [0, 0, 0], { minDistance: .55, zoom: .01, closeInspection: true }).distance).toBe(.55);
    expect(cameraHelpers.pose([0, 0, 10], [0, 0, 0], { zoom: .01 }).distance).toBe(3.2);
  });

  it('retains fixed pre-guard camera results when no exterior normal is supplied', () => {
    const cases = [
      [[8.2, 4.8, 10.4], [0, 0, 1], { yaw: .12, pitch: -.09, zoom: .88 }, [7.839341769953449, 5.193509821077031, 8.064771217261008], 11.761752250408952, .8373217051394488, 1.1134606149419115],
      [[0, 0, 10], [0, 0, 0], { yaw: Math.PI / 2 }, [10, 6.123233995736766e-16, 6.123233995736766e-16], 10, Math.PI / 2, Math.PI / 2],
      [[0, -3.8, 5.6], [0, 0, .5], { pitch: 2 }, [0, -3.8000000000000003, 5.6], 6.360031446463138, 0, 2.2111527918657394],
      [[5, 3, -7], [1, 2, -4], { zoom: .001, minDistance: 1.8, maxDistance: 40 }, [2.4120361729949256, 2.353009043248731, -5.059027129746194], 1.8, 2.214297435588181, 1.373400766945016],
      [[0, 0, 0], [0, 0, 0], {}, [0, 3.7139067635410377, 9.284766908852593], 10, 0, 1.1902899496825317],
      [[0, 9.98, .6], [0, 0, 0], { pitch: -8, yaw: -.12 }, [-.07177002104934488, 9.98002876657695, .5952099481486937], 9.99801980394118, -.12, .06]
    ];
    for (const [eye, target, options, position, distance, azimuth, polar] of cases) {
      const result = cameraHelpers.pose(eye, target, options);
      expect(result.target).toEqual(target);
      // Reference values can differ by an ulp across JS runtimes' trig libraries.
      result.position.forEach((value, axis) => expect(value).toBeCloseTo(position[axis], 12));
      expect(result.distance).toBeCloseTo(distance, 12);
      expect(result.azimuth).toBeCloseTo(azimuth, 12);
      expect(result.polar).toBeCloseTo(polar, 12);
    }
  });

  it('strictly validates exterior normals without changing caller-owned coordinates or options', () => {
    const eye = Object.freeze([2, 1, 3]), target = Object.freeze([.2, -.4, 1]);
    const base = Object.freeze({ minDistance: .55, maxDistance: 40, closeInspection: true, yaw: 2.4, pitch: -.2 });
    const ordinary = cameraHelpers.pose(eye, target, base);
    for (const invalid of [undefined, null, '0,-1,0', {}, [], [0, -1], [0, -1, 0, 0], ['0', -1, 0],
      [0, NaN, 0], [0, Infinity, 0], [0, 0, 0], [0, 1e-12, 0], new Float32Array([0, -1, 0])]) {
      const normal = Array.isArray(invalid) ? Object.freeze(invalid) : invalid;
      const options = Object.freeze({ ...base, outwardNormal: normal });
      expect(cameraHelpers.pose(eye, target, options)).toEqual(ordinary);
      expect(options.outwardNormal).toBe(normal);
    }
    const normal = Object.freeze([0, -7, 0]), options = Object.freeze({ ...base, outwardNormal: normal });
    const guarded = cameraHelpers.pose(eye, target, options);
    expect(guarded).toEqual(cameraHelpers.pose(eye, target, { ...base, outwardNormal: [0, -1, 0] }));
    expect(normal).toEqual([0, -7, 0]); expect(eye).toEqual([2, 1, 3]); expect(target).toEqual([.2, -.4, 1]);
    expect(options).toEqual({ ...base, outwardNormal: [0, -7, 0] });
  });

  it('projects a purely inward offset onto a finite exterior boundary and reports the corrected angles', () => {
    const options = { minDistance: .55, closeInspection: true, outwardNormal: [1, 0, 0] };
    const state = cameraHelpers.pose([-2, 0, 0], [0, 0, 0], options);
    expect(state.position.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...state.position)).toBeCloseTo(2, 12);
    expect(state.distance).toBe(2);
    expect(state.position[0]).toBeCloseTo(.08 * state.distance, 12);
    const reconstructed = [state.distance * Math.sin(state.polar) * Math.sin(state.azimuth),
      state.distance * Math.cos(state.polar), state.distance * Math.sin(state.polar) * Math.cos(state.azimuth)];
    reconstructed.forEach((value, axis) => expect(value).toBeCloseTo(state.position[axis], 12));
    expect(cameraHelpers.pose([-2, 0, 0], [0, 0, 0], options)).toEqual(state);
  });

  it('keeps repeated native window orbits outside the hull at a fixed distance using its actual world normal', () => {
    const context = setupCamera(fixture());
    Object.assign(context, { finishMotionDrag: vi.fn(), settleCameraFit: vi.fn(), cancelCameraTween: vi.fn() });
    runInNewContext(namedFunction('applyCameraPose'), context);
    const orbitStart = source.indexOf('cv._issCameraOrbit = function');
    runInNewContext('cv._issCameraOrbit = ' + expression(source.indexOf('function', orbitStart)) + ';', context);
    const moves = [
      ...Array.from({ length: 30 }, () => [0, -.09]),
      ...Array.from({ length: 30 }, () => [0, .09]),
      ...Array.from({ length: 30 }, (_, i) => [i % 2 ? -Math.PI * 1.7 : Math.PI * 2.3, 0])
    ];
    for (const rotation of [[0, 0, 0], [.25, -.3, .18]]) {
      context.station.rotation.set(...rotation);
      context.cv._issFitCamera('window');
      context.applyCameraPose(context.camera.position, context.cameraTarget, { zoom: .001 });
      const target = context.cameraTarget.clone(), normal = new THREE.Vector3(0, -1, 0).applyQuaternion(context.station.getWorldQuaternion(new THREE.Quaternion()));
      const inverseStation = context.station.matrixWorld.clone().invert();
      for (const [yaw, pitch] of moves) {
        context.cv._issCameraOrbit(yaw, pitch);
        const offset = context.camera.position.clone().sub(context.cameraTarget);
        expect(offset.length()).toBeCloseTo(.55, 10);
        expect(offset.dot(normal)).toBeGreaterThanOrEqual(.08 * .55 - 1e-10);
        expect(context.camera.position.clone().applyMatrix4(inverseStation).y).toBeLessThan(-destiny.size[0] - .003);
        expect(context.cameraTarget.distanceTo(target)).toBeLessThan(1e-12);
        expect(context.camera.position.y).toBeGreaterThanOrEqual(-3.8 - 1e-10);
      }
    }
    // The exterior constraint is local to the window inspection. Other fits
    // still receive the ordinary camera pose even at the same coordinates.
    context.cameraFocusId = 'arrays';
    const eye = context.camera.position.toArray(), target = context.cameraTarget.toArray();
    const expected = cameraHelpers.pose(eye, target, { minDistance: .55, maxDistance: 40, closeInspection: true, pitch: -1.7, yaw: 1.4 });
    context.applyCameraPose(context.camera.position, context.cameraTarget, { pitch: -1.7, yaw: 1.4 });
    expect(context.camera.position.toArray()).toEqual(expected.position);
  });

  it('preserves the inspected direction on resize, supports existing fit kinds and ignores fits after cleanup', () => {
    const context = setupCamera(fixture());
    context.cv._issFitCamera('window');
    const offset = new THREE.Vector3(.7, -.5, .4);
    context.camera.position.copy(context.cameraTarget).add(offset);
    context.cv._issFitCamera('window', true);
    expect(context.camera.position.clone().sub(context.cameraTarget).normalize().distanceTo(offset.normalize())).toBeLessThan(1e-10);
    for (const kind of ['station', 'array', 'motion', 'arm', 'radiator-a', 'radiator-b', 'dragon', 'progress', 'cygnus']) {
      context.moveCamera.mockClear(); context.cv._issFitCamera(kind, true);
      expect(context.cameraFitMode).toBe(kind); expect(context.moveCamera).toHaveBeenCalledOnce();
    }
    context.cleaned = true; context.moveCamera.mockClear();
    context.cv._issFitCamera('window');
    expect(context.moveCamera).not.toHaveBeenCalled();
    expect(context.cameraFitMode).toBe('cygnus');
  });

  it('disposes all three window geometries and private materials through the existing scene cleanup', () => {
    const context = fixture(), disposed = [];
    for (const part of context.destinyWindowParts) for (const resource of [part.geometry, part.material]) {
      resource.addEventListener('dispose', () => disposed.push(resource.uuid));
    }
    context.planetScene = new THREE.Scene(); context.renderer = { dispose: vi.fn() };
    runInNewContext(cleanupBody, context);
    expect(disposed).toHaveLength(6);
    expect(new Set(disposed).size).toBe(6);
    expect(context.renderer.dispose).toHaveBeenCalledOnce();
  });
});

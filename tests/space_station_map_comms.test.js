import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

const sourcePath = process.env.ISS_COMMS_SOURCE || 'stem_lab/stem_tool_spacestation.js';
const source = readFileSync(sourcePath, 'utf8'), vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;
function expression(start) {
  if (start < 0) throw new Error('Required communications integration is absent: ' + sourcePath);
  const node = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
  return source.slice(node.start, node.end);
}
function named(name) { return expression(source.indexOf('function ' + name + '(')); }
const factory = new Function('return ' + named('issCommsGeometry'))();
const resources = new Set();
function keep(resource) {
  if (!resources.has(resource)) { resources.add(resource); resource.addEventListener('dispose', () => resources.delete(resource)); }
  return resource;
}
afterEach(() => { for (const resource of [...resources]) resource.dispose(); });
function geometry() { return keep(factory(THREE)); }
function points(geo, component) {
  const p = geo.getAttribute('position'), start = component?.start || 0, count = component?.count ?? p.count;
  return Array.from({ length: count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, start + i));
}
function component(geo, name) {
  const part = geo.userData.components.find(item => item.name === name);
  if (!part) throw new Error('Missing physical component: ' + name);
  return part;
}
function dishFrame(geo) {
  const reflector = geo.userData.reflector, center = new THREE.Vector3().fromArray(reflector.center), normal = new THREE.Vector3().fromArray(reflector.normal);
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal), inverse = rotation.clone().invert();
  return { reflector, center, normal, rotation, local: point => point.clone().sub(center).applyQuaternion(inverse) };
}
function paraboloidError(geo) {
  const frame = dishFrame(geo);
  return Math.max(...points(geo, component(geo, 'reflector-front')).map(point => {
    const p = frame.local(point);
    return Math.abs(p.y - (p.x * p.x + p.z * p.z) / (4 * frame.reflector.focalLength));
  }));
}

describe('Z1 support and Ku-band reflector geometry', () => {
  it('builds fresh bounded finite buffers with unit normals using the bundled Three API', () => {
    expect(THREE.REVISION).toBe('128');
    const a = geometry(), b = geometry();
    expect(a).not.toBe(b); expect(a.index).toBeNull(); expect(a.userData.kind).toBe('z1-comms'); expect(a.userData.illustrative).toBe(true);
    const p = a.getAttribute('position'), n = a.getAttribute('normal'), c = a.getAttribute('color');
    expect(p.count % 3).toBe(0); expect(p.count).toBeGreaterThan(1000); expect(p.count / 3).toBeLessThan(10000);
    expect(n.count).toBe(p.count); expect(c.count).toBe(p.count);
    for (const attribute of Object.values(a.attributes)) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
    expect(Array.from(c.array).every(value => value >= 0 && value <= 1)).toBe(true);
    for (const point of points(a)) {
      expect(point.x).toBeGreaterThan(-.5); expect(point.x).toBeLessThan(1.2);
      expect(point.y).toBeGreaterThan(-.11); expect(point.y).toBeLessThan(1.3);
      expect(Math.abs(point.z)).toBeLessThan(.7);
    }
    const original = b.attributes.position.getX(0); p.setX(0, 100); expect(b.attributes.position.getX(0)).toBe(original);
  });

  it('uses a genuine concave paraboloid with a feed at its focus and rejects a flat dish mutant', () => {
    const geo = geometry(), frame = dishFrame(geo), front = points(geo, component(geo, 'reflector-front')).map(frame.local);
    expect(frame.normal.length()).toBeCloseTo(1, 12);
    expect(frame.reflector.focalLength).toBeCloseTo(frame.reflector.radius ** 2 / (4 * frame.reflector.depth), 12);
    expect(paraboloidError(geo)).toBeLessThan(1e-7);
    expect(Math.max(...front.map(p => Math.hypot(p.x, p.z)))).toBeCloseTo(.36, 6);
    expect(Math.max(...front.map(p => p.y)) - Math.min(...front.map(p => p.y))).toBeCloseTo(.10, 6);
    const feed = new THREE.Box3().setFromPoints(points(geo, component(geo, 'feed')).map(frame.local)).getCenter(new THREE.Vector3());
    expect(feed.distanceTo(new THREE.Vector3(0, frame.reflector.focalLength, 0))).toBeLessThan(1e-7);
    // Independent reflection law: incoming axial rays converge at the focus.
    for (const radius of [.06, .18, .30]) for (const angle of [.2, 1.3, 3.2]) {
      const p = new THREE.Vector3(radius * Math.cos(angle), radius ** 2 / (4 * frame.reflector.focalLength), radius * Math.sin(angle));
      const normal = new THREE.Vector3(-p.x / (2 * frame.reflector.focalLength), 1, -p.z / (2 * frame.reflector.focalLength)).normalize();
      const reflected = new THREE.Vector3(0, -1, 0).reflect(normal);
      const focus = p.clone().addScaledVector(reflected, (frame.reflector.focalLength - p.y) / reflected.y);
      expect(focus.distanceTo(new THREE.Vector3(0, frame.reflector.focalLength, 0))).toBeLessThan(1e-12);
    }
    const mutant = keep(geo.clone()), part = component(mutant, 'reflector-front'), positions = mutant.attributes.position;
    for (let i = part.start; i < part.start + part.count; i++) {
      const p = frame.local(new THREE.Vector3().fromBufferAttribute(positions, i)); p.y = 0; p.applyQuaternion(frame.rotation).add(frame.center);
      positions.setXYZ(i, p.x, p.y, p.z);
    }
    expect(paraboloidError(mutant)).toBeGreaterThan(.09);
  });

  it('presents the reflector front to incoming rays and separates the back, rim and three feed supports', () => {
    const geo = geometry(), frame = dishFrame(geo), front = component(geo, 'reflector-front'), back = component(geo, 'reflector-back');
    const mesh = new THREE.Mesh(geo, keep(new THREE.MeshStandardMaterial())); mesh.updateMatrixWorld(true);
    for (const angle of [.55, 2.65, 4.75]) {
      const local = new THREE.Vector3(.20 * Math.cos(angle), 1, .20 * Math.sin(angle));
      const ray = new THREE.Raycaster(local.applyQuaternion(frame.rotation).add(frame.center), frame.normal.clone().negate());
      const hits = ray.intersectObject(mesh); expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].faceIndex * 3).toBeGreaterThanOrEqual(front.start); expect(hits[0].faceIndex * 3).toBeLessThan(front.start + front.count);
      expect(hits[0].face.normal.dot(frame.normal)).toBeGreaterThan(.8);
    }
    const backError = points(geo, back).map(frame.local).map(p => p.y - (p.x * p.x + p.z * p.z) / (4 * frame.reflector.focalLength));
    expect(Math.max(...backError)).toBeCloseTo(-.009, 6); expect(Math.min(...backError)).toBeCloseTo(-.009, 6);
    expect(geo.userData.components.filter(part => /^feed-strut-/.test(part.name))).toHaveLength(3);
    expect(component(geo, 'reflector-rim').count).toBeGreaterThan(0);
  });

  it('connects the frame to Unity and identifies four separate schematic CMG enclosures', () => {
    const geo = geometry(), metadata = geo.userData; let end = 0;
    for (const part of metadata.components) { expect(part.start).toBe(end); expect(part.count).toBeGreaterThan(0); expect(part.count % 3).toBe(0); end += part.count; }
    expect(end).toBe(geo.attributes.position.count); expect(new Set(metadata.components.map(part => part.name)).size).toBe(metadata.components.length);
    expect(metadata.cmgCount).toBe(4); expect(metadata.cmgEnclosures).toHaveLength(4);
    expect(new Set(metadata.cmgEnclosures.map(item => item.center.join(','))).size).toBe(4);
    for (const item of metadata.cmgEnclosures) {
      const box = new THREE.Box3().setFromPoints(points(geo, component(geo, item.name)));
      expect(box.getCenter(new THREE.Vector3()).distanceTo(new THREE.Vector3().fromArray(item.center))).toBeLessThan(1e-7);
      expect(box.getSize(new THREE.Vector3()).toArray().every(size => size > .25)).toBe(true);
    }
    const attachment = new THREE.Box3().setFromPoints(points(geo, component(geo, 'unity-attachment')));
    expect(attachment.min.y).toBeLessThan(0); expect(attachment.max.y).toBeGreaterThan(.07);
    const spokes = metadata.components.filter(part => /^attachment-spoke-/.test(part.name)); expect(spokes).toHaveLength(4);
    for (const spoke of spokes) {
      const p = points(geo, spoke), radial = p.map(point => Math.hypot(point.x, point.z));
      expect(Math.min(...radial)).toBeLessThan(.30); expect(Math.max(...radial)).toBeGreaterThan(.60);
    }
  });

  it('disposes temporary construction buffers and leaves just one returned geometry per call', () => {
    const seen = new Map(), facade = Object.create(THREE);
    function observe(geo) {
      if (!seen.has(geo)) {
        seen.set(geo, 0); geo.addEventListener('dispose', () => seen.set(geo, seen.get(geo) + 1));
        const original = geo.toNonIndexed.bind(geo); geo.toNonIndexed = () => observe(original());
      }
      return geo;
    }
    for (const name of ['BufferGeometry', 'BoxGeometry', 'CylinderGeometry', 'LatheGeometry', 'TorusGeometry']) facade[name] = function (...args) { return observe(new THREE[name](...args)); };
    const geo = keep(factory(facade)); expect(seen.size).toBeGreaterThan(50);
    for (const [item, count] of seen) expect(count).toBe(item === geo ? 0 : 1);
    geo.dispose(); expect([...seen.values()].every(count => count === 1)).toBe(true);
  });
});

const modules = runInNewContext(expression(source.indexOf('[', source.indexOf('  var MODULES ='))), { ISS_TRUSS_Y: .9 });
const assemblyStart = source.lastIndexOf('          var station =', source.indexOf('MODULES.forEach(function (m)'));
const assemblyEnd = source.indexOf('          // Shared cell and insulation atlases', assemblyStart);
if (assemblyStart < 0 || assemblyEnd < assemblyStart) throw new Error('Station module assembly missing');
function fixture() {
  const context = { THREE, MODULES: modules, ISS_TRUSS_Y: .9, scene: new THREE.Scene(), issCommsGeometry: factory,
    issHullCanvas: () => null, issModuleEndcapCanvas: () => null, issTexture: image => keep(new THREE.Texture(image)) };
  for (const name of ['issOpenTrussGeometry', 'issTrussHardwareGeometry', 'issAmsGeometry', 'issModuleHardwareGeometry', 'issDestinyWindowGeometry', 'issCupolaGeometry', 'issKiboFacilityGeometry', 'issQuestGeometry']) context[name] = new Function('return ' + named(name))();
  runInNewContext(source.slice(assemblyStart, assemblyEnd), context); context.scene.updateMatrixWorld(true);
  context.scene.traverse(object => { if (object.geometry) keep(object.geometry); if (object.material) keep(object.material); });
  context.instrument = context.scene.getObjectByName('iss-z1-comms'); return context;
}
function hashArray(attribute) { const a = attribute.array; return createHash('sha256').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex'); }
function protectedRecord(context) {
  const record = [];
  context.station.traverse(object => {
    if (!object.geometry || object.name === 'iss-z1-comms') return;
    const attributes = Object.fromEntries(Object.entries(object.geometry.attributes).map(([key, value]) => [key, hashArray(value)]));
    if (object.geometry.index) attributes.index = hashArray(object.geometry.index);
    record.push({ name: object.name, id: object._issId || null, parent: object._issParentId || null,
      position: object.position.toArray(), quaternion: object.quaternion.toArray(), attributes });
  });
  return record;
}
function updateDetails(context, daylight = 1) {
  Object.assign(context, { earthLightsMat: null, earthExposureMat: null, milkyWay: { userData: { starMaterial: {} } }, daylight01: daylight });
  if (!context.setLabToolData) context.setLabToolData = vi.fn();
  const start = source.indexOf('            var lampOn =', assemblyEnd), end = source.indexOf('            if (curSel)', start);
  if (start < 0 || end < start) throw new Error('Station detail update missing');
  runInNewContext(source.slice(start, end), context);
}

describe('Communications renderer integration', () => {
  it('adds one private untextured science detail without adding a module or altering the Unity hull', () => {
    const a = fixture(), b = fixture(), mesh = a.instrument;
    expect(mesh?.isMesh).toBe(true); expect(mesh.position.toArray()).toEqual([0, .6, .2]);
    expect(mesh._issParentId).toBe('unity'); expect(mesh._issScienceId).toBe('comms'); expect(mesh._issId).toBeUndefined();
    expect(a.clickable).toHaveLength(13); expect(a.clickable).not.toContain(mesh); expect(a.moduleDetails).toContain(mesh); expect(a.moduleCapPickers).toContain(mesh);
    expect(mesh.geometry).not.toBe(b.instrument.geometry); expect(mesh.material).not.toBe(b.instrument.material);
    expect(mesh.material.isMeshStandardMaterial).toBe(true); expect(mesh.material.vertexColors).toBe(true); expect(mesh.material.emissive.getHex()).toBe(0);
    for (const [name, value] of Object.entries(mesh.material)) if (name === 'map' || /Map$/.test(name)) expect(value, name).toBeNull();
    expect(a.clickable.find(part => part._issId === 'unity').position.toArray()).toEqual([0, 0, .2]);
  });

  it('preserves every preexisting assembly buffer and pose and detects mutation of a protected hull', () => {
    const record = protectedRecord(fixture());
    // Derived from the accepted 18c375826bb3 baseline, before the addition.
    const expected = '48f2e93152bd06881e309f2f06dc8d1d58bed8122f38715f67591c219fe61f7c';
    expect(record).toHaveLength(91);
    expect(createHash('sha256').update(JSON.stringify(record)).digest('hex')).toBe(expected);
    const corrupt = JSON.parse(JSON.stringify(record)); corrupt.find(item => item.id === 'unity').position[0] += .01;
    expect(createHash('sha256').update(JSON.stringify(corrupt)).digest('hex')).not.toBe(expected);
  });

  it('keeps the assembly outside rotating-array and planar-arm envelopes and above adjacent hulls', () => {
    const context = fixture(), bounds = new THREE.Box3().setFromObject(context.instrument);
    // The independent all-vertex array/feather sweep gives the inner edge
    // ±3.1109812635262504; arm rotations leave all physical vertices at Z≤−1.525.
    expect(bounds.max.x).toBeLessThan(3.1109812635262504 - 1.9);
    expect(bounds.min.x).toBeGreaterThan(-3.1109812635262504 + 2.5);
    expect(bounds.min.z - (-1.525)).toBeGreaterThan(1.1);
    for (const id of ['quest', 'tranquility', 'zarya']) {
      const other = context.clickable.find(mesh => mesh._issId === id), box = new THREE.Box3().setFromObject(other);
      // Test each physical part, not the whole assembly's loose AABB: the
      // high dish and low adapter occupy different horizontal positions.
      for (const part of context.instrument.geometry.userData.components) {
        const own = new THREE.Box3().setFromPoints(points(context.instrument.geometry, part).map(point => point.applyMatrix4(context.instrument.matrixWorld)));
        const overlap = ['x', 'y', 'z'].map(axis => Math.min(own.max[axis], box.max[axis]) - Math.max(own.min[axis], box.min[axis]));
        expect(Math.min(...overlap), id + ':' + part.name).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it('science-picks the actual reflector without discovery, XP or saved-state writes', () => {
    const context = fixture(), mesh = context.instrument, frame = dishFrame(mesh.geometry);
    Object.assign(context, { camera: new THREE.PerspectiveCamera(46, 1, .01, 100), mouseV: new THREE.Vector2(), raycaster: new THREE.Raycaster(),
      visitorPickers: [], dragTravel: 0, gestureMultiple: false, onLeave: vi.fn(), upd: vi.fn(), markSeen: vi.fn(), awardXP: vi.fn() });
    const target = new THREE.Vector3(.16, .16 ** 2 / (4 * frame.reflector.focalLength), .10).applyQuaternion(frame.rotation).add(frame.center).add(mesh.position);
    context.camera.position.copy(target).addScaledVector(frame.normal, 3); context.camera.lookAt(target); context.camera.updateMatrixWorld(true);
    context.cv = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 500 }), _issFitCamera: vi.fn() };
    runInNewContext(named('pick'), context); context.pick({ clientX: 250, clientY: 250, button: 0 });
    expect(context.cv._issFitCamera).toHaveBeenCalledExactlyOnceWith('comms'); expect(context.onLeave).toHaveBeenCalledOnce();
    expect(context.upd).not.toHaveBeenCalled(); expect(context.markSeen).not.toHaveBeenCalled(); expect(context.awardXP).not.toHaveBeenCalled();
  });
});

const cameraMath = runInNewContext(['issFlightNumber', 'issMapCameraPose', 'issMapCameraPan', 'issMapCameraFit'].map(named).join('\n') + '\n({pose:issMapCameraPose,pan:issMapCameraPan,fit:issMapCameraFit});');
function cameraFixture(aspect = 1.6) {
  const context = fixture();
  Object.assign(context, {
    cv: { _issWantSel: 'destiny' }, cleaned: false, _prefersReducedMotion: true,
    camera: new THREE.PerspectiveCamera(46, aspect, .01, 1000), cameraTarget: new THREE.Vector3(0, 0, 1),
    cameraFocusId: null, cameraFitMode: null, cameraFitResult: null, cameraTween: null,
    cameraPanned: false, cameraView: 'overview', cameraMinDistance: 3.2, cameraMaxDistance: 30,
    Hc: 500, visitorTargets: Object.create(null), radiatorTargets: Object.create(null),
    stationEnvelope: { center: new THREE.Vector3(0, 1, 0), radius: 9 }, armBase: new THREE.Vector3(0, 2, -1), armVelocity: { enabled: false },
    wings: [{}, {}, { position: new THREE.Vector3(4, 2, -1) }], arrayFocus: { visible: false },
    finishJointDrag: vi.fn(), finishArmDrag: vi.fn(), finishMotionDrag: vi.fn(), onUp: vi.fn(), onLeave: vi.fn(),
    syncCameraHUD: vi.fn(), announceToSR: vi.fn(), upd: vi.fn(), __alloT: (key, fallback) => fallback,
    __alloFill: (text, values) => text.replace(/\{([^}]+)\}/g, (_, key) => String(values[key])),
    issMapCameraPose: cameraMath.pose, issMapCameraPan: cameraMath.pan, issMapCameraFit: cameraMath.fit, _lastFrameSig: 'before'
  });
  context.camera.position.set(8, 4, 10);
  runInNewContext(['applyCameraPose', 'settleCameraFit', 'cancelCameraTween', 'moveCamera', 'onKey'].map(named).join('\n'), context);
  for (const key of ['_issCameraOrbit', '_issCameraZoom', '_issCameraPan', '_issSetView', '_issFitCamera', '_issFocusModule']) {
    const start = source.indexOf('cv.' + key + ' = function');
    runInNewContext('cv.' + key + ' = ' + expression(source.indexOf('function', start)) + ';', context);
  }
  return context;
}
function offset(context) { return context.camera.position.clone().sub(context.cameraTarget); }
function outward(context) { return new THREE.Vector3(0, 1, 0).transformDirection(context.instrument.matrixWorld); }

describe('Communications inspection camera', () => {
  it('frames the actual transformed assembly at desktop and phone aspects and preserves the selected module', () => {
    for (const aspect of [1.6, .7]) {
      const context = cameraFixture(aspect); context.station.rotation.set(.25, -.3, .18); context.cv._issFitCamera('comms');
      const sphere = new THREE.Box3().setFromObject(context.instrument).getBoundingSphere(new THREE.Sphere());
      expect(context.cameraTarget.distanceTo(sphere.center)).toBeLessThan(1e-12); expect(context.cameraFitResult.radius).toBeCloseTo(sphere.radius, 12);
      expect(context.cameraFocusId).toBe('comms'); expect(context.cameraFitMode).toBe('comms');
      expect(context.cameraMinDistance).toBe(1.6); expect(context.cameraMaxDistance).toBe(5);
      const projected = points(context.instrument.geometry).map(point => point.applyMatrix4(context.instrument.matrixWorld).project(context.camera));
      expect(projected.every(point => point.toArray().every(Number.isFinite) && point.z > -1 && point.z < 1)).toBe(true);
      expect(Math.max(...projected.map(point => Math.abs(point.x)))).toBeLessThan(1); expect(Math.max(...projected.map(point => Math.abs(point.y)))).toBeLessThan(1);
      expect(context.cv._issWantSel).toBe('destiny'); expect(context.upd).not.toHaveBeenCalled();
    }
  });

  it('retains the outward constraint after zoom and resize through adversarial orbit motions', () => {
    const context = cameraFixture(); context.cv._issFitCamera('comms'); context.cv._issCameraOrbit(.2, -.15);
    const direction = offset(context).normalize(); context.camera.aspect = .7; context.camera.updateProjectionMatrix(); context.cv._issFitCamera('comms', true);
    expect(offset(context).normalize().distanceTo(direction)).toBeLessThan(1e-11);
    for (const [factor, distance] of [[.001, 1.6], [1000, 5]]) {
      context.cv._issCameraZoom(factor); expect(context.cameraFitMode).toBeNull(); expect(context.cameraFocusId).toBe('comms');
      expect(offset(context).length()).toBeCloseTo(distance, 11);
      for (let i = 0; i < 120; i++) {
        context.cv._issCameraOrbit(i % 2 ? .8 : -.4, i < 60 ? -.09 : .09);
        const delta = offset(context); expect(delta.dot(outward(context))).toBeGreaterThanOrEqual(.08 * delta.length() - 1e-11);
        expect(context.camera.position.y).toBeGreaterThanOrEqual(-3.8 - 1e-11);
        expect(delta.length()).toBeGreaterThanOrEqual(1.6 - 1e-11); expect(delta.length()).toBeLessThanOrEqual(5 + 1e-11);
      }
    }
  });

  it('keeps the formerly unsafe downward view above the Z1 support instead of entering Quest', () => {
    function requestedView(context) {
      context.cv._issFitCamera('comms'); context.cv._issCameraZoom(1.8 / offset(context).length());
      const delta = offset(context), yaw = Math.atan2(delta.x, delta.z), polar = Math.acos(delta.y / delta.length());
      context.cv._issCameraOrbit(-2.792526803190927 - yaw, 2.8801531433504737 - polar);
    }
    const context = cameraFixture(); requestedView(context);
    expect(offset(context).length()).toBeCloseTo(1.8, 11);
    expect(context.camera.position.y - context.cameraTarget.y).toBeGreaterThanOrEqual(.08 * 1.8 - 1e-11);
    const quest = context.clickable.find(mesh => mesh._issId === 'quest'), box = new THREE.Box3().setFromObject(quest);
    expect(box.containsPoint(context.camera.position)).toBe(false);
    // The reflector's tilted radio axis is physically correct, but it is the
    // wrong camera exclusion plane for hardware mounted above inhabited hulls.
    const mutant = cameraFixture();
    mutant.issMapCameraPose = (position, target, options) => cameraMath.pose(position, target, {
      ...options, outwardNormal: new THREE.Vector3().fromArray(mutant.instrument.geometry.userData.reflector.normal).transformDirection(mutant.instrument.matrixWorld).toArray()
    });
    requestedView(mutant);
    expect(mutant.camera.position.y - mutant.cameraTarget.y).toBeLessThan(0);
    expect(box.containsPoint(mutant.camera.position)).toBe(true);
  });

  it('detects removal of the exterior guard and restores ordinary cutaway on exit', () => {
    const mutant = cameraFixture(); mutant.cv._issFitCamera('comms'); mutant.cv._issCameraZoom(.001);
    mutant.issMapCameraPose = (position, target, options) => cameraMath.pose(position, target, { ...options, outwardNormal: null });
    let projection = Infinity;
    for (let i = 0; i < 60; i++) { mutant.cv._issCameraOrbit(.12, .09); projection = Math.min(projection, offset(mutant).normalize().dot(outward(mutant))); }
    expect(projection).toBeLessThan(-.2);
    for (const action of ['focus', 'pan', 'home', 'station']) {
      const context = cameraFixture(); context.cv._issCutaway = true; context.cv._issFitCamera('comms'); updateDetails(context, 0);
      expect(context.instrument.material.opacity).toBe(1); expect(context.instrument.material.depthWrite).toBe(true); expect(context.instrument.material.emissive.getHex()).toBe(0);
      if (action === 'focus') context.cv._issFocusModule('unity'); else if (action === 'pan') context.cv._issCameraPan(32, 0);
      else if (action === 'home') context.cv._issSetView('overview'); else context.cv._issFitCamera('station');
      expect(context.cameraFocusId).not.toBe('comms'); updateDetails(context, 0); expect(context.instrument.material.opacity).toBe(.05);
      expect(context.cv._issWantSel).toBe('destiny'); expect(context.cv._issCutaway).toBe(true); expect(context.upd).not.toHaveBeenCalled();
      const before = context.camera.position.toArray(); context.cleaned = true; context.cv._issFitCamera('comms'); expect(context.camera.position.toArray()).toEqual(before);
    }
  });
});

const require = createRequire(import.meta.url), modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react')), ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React, save = vi.fn();
const Study = runInNewContext(named('issCommsRayDiagram') + '\n' + named('IssCommsReflectorStudy') + '\n' + named('IssCommsStudy') + '\nIssCommsStudy;', { document, setLabToolData: save });
const mounts = []; let previousActEnvironment;
beforeAll(() => { previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(() => { for (const { root, host } of mounts.splice(0)) { host.querySelectorAll('style').forEach(style => style.remove()); act(() => root.unmount()); host.remove(); } save.mockClear(); });
function mountStudy(props = {}) {
  const host = document.createElement('div'); host.setAttribute('data-iss-map', ''); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const render = () => act(() => root.render(React.createElement(Study, { React, ...props }))); render();
  return { host, render, state: () => host.querySelector('[data-iss-comms-study]'), select(id) { act(() => host.querySelector(`[data-iss-comms-hop="${id}"]`).click()); } };
}
function addCamera(view) {
  const stage = document.createElement('div'); stage.className = 'iss-station-stage'; stage.scrollIntoView = vi.fn();
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas._issFitCamera = vi.fn(); stage.appendChild(canvas); view.host.appendChild(stage); return { stage, canvas };
}

describe('Radio relay learning workflow', () => {
  it('keeps native node buttons, highlighted zones and accessible description synchronized', () => {
    const view = mountStudy(), ids = ['station', 'relay', 'ground'];
    expect(view.host.querySelectorAll('[data-iss-comms-zone]')).toHaveLength(3);
    for (const selected of [...ids, 'station']) {
      view.select(selected); expect(view.state().dataset.issCommsStudy).toBe(selected);
      for (const id of ids) {
        const button = view.host.querySelector(`[data-iss-comms-hop="${id}"]`), zone = view.host.querySelector(`[data-iss-comms-zone="${id}"]`);
        expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.getAttribute('aria-pressed')).toBe(String(selected === id));
        expect(zone.getAttribute('data-selected')).toBe(String(selected === id));
      }
      const label = view.host.querySelector(`[data-iss-comms-hop="${selected}"]`).textContent;
      expect(view.host.querySelector('[data-iss-comms-description]').textContent).toContain(label); expect(view.host.querySelector('svg[role="img"]').getAttribute('aria-label')).toContain(label);
    }
  });

  it('keeps node selection local and frames only the owning map without writing saved state', () => {
    const data = Object.freeze({ selModule: 'quest', mapPhase: 61, mapPlaying: true, mapCutaway: true, seenModules: Object.freeze(['unity']) });
    const updateData = vi.fn(), onChange = vi.fn(), a = mountStudy({ data, updateData, onChange }), b = mountStudy({ data }), ac = addCamera(a), bc = addCamera(b);
    const before = JSON.stringify(data); a.select('ground'); a.render();
    expect(a.state().dataset.issCommsStudy).toBe('ground'); expect(b.state().dataset.issCommsStudy).toBe('station');
    expect(ac.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bc.canvas._issFitCamera).not.toHaveBeenCalled();
    act(() => a.host.querySelector('[data-iss-comms-inspect]').click());
    expect(ac.canvas._issFitCamera).toHaveBeenCalledExactlyOnceWith('comms'); expect(bc.canvas._issFitCamera).not.toHaveBeenCalled(); expect(document.activeElement).toBe(ac.canvas);
    expect(ac.stage.scrollIntoView).toHaveBeenCalledOnce(); ac.stage.remove(); ac.canvas._issFitCamera.mockClear();
    act(() => a.host.querySelector('[data-iss-comms-inspect]').click()); expect(ac.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bc.canvas._issFitCamera).not.toHaveBeenCalled();
    expect(JSON.stringify(data)).toBe(before); expect(updateData).not.toHaveBeenCalled(); expect(onChange).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
  });

  it('distinguishes an illustrative two-way relay path from live coverage or an operational S-band antenna on Z1', () => {
    const view = mountStudy(); expect(view.host.textContent).toMatch(/both directions/i); expect(view.host.textContent).toMatch(/radio waves.*vacuum/i);
    view.select('station'); expect(view.host.querySelector('[data-iss-comms-description]').textContent).toMatch(/S-band.*separate/i);
    view.select('relay'); expect(view.host.querySelector('[data-iss-comms-description]').textContent).toMatch(/geosynchronous/i); expect(view.host.textContent).toMatch(/does not predict a live connection/i);
    view.select('ground'); expect(view.host.querySelector('[data-iss-comms-description]').textContent).toMatch(/White Sands.*Guam/);
    expect(view.host.textContent).toMatch(/feed.*focus/i); expect(view.host.textContent).toMatch(/does not calculate coverage, radio power, bandwidth or network latency/i);
    expect([...view.host.querySelectorAll('dt')].map(node => node.textContent).slice(0, 2)).toEqual(['11 October 2000', '14 October 2000']);
    expect(view.host.textContent).toMatch(/P6.*2007/); expect(view.host.textContent).toMatch(/mixed-era.*not a dated hardware inventory/i);
  });

  it('adds one source-linked topic and preserves all prior guide evidence except the documented CMG and Zvezda additions', () => {
    const entries = runInNewContext(expression(source.indexOf('[', source.indexOf('  var ISS_COMPONENT_GUIDE ='))), {});
    expect(entries).toHaveLength(29); expect(new Set(entries.map(entry => entry.id)).size).toBe(29);
    const entry = entries.find(item => item.id === 'comms'); expect(entry.focusId).toBe('comms'); expect(entry.moduleId).toBeUndefined(); expect(entry.group).toBe('Operations');
    expect(entry.model).toMatch(/one fixed Ku-band dish.*schematic/i); expect(entry.sources.length).toBeGreaterThanOrEqual(2);
    for (const item of entry.sources) { const url = new URL(item.url); expect(url.protocol).toBe('https:'); expect(url.hostname).toMatch(/(^|\.)(nasa\.gov|jaxa\.jp)$/); }
    const old = JSON.parse(JSON.stringify(entries.filter(item => item.id !== 'comms'))), cmgs = old.find(item => item.id === 'cmgs');
    expect(cmgs.model).toMatch(/^Four schematic CMG enclosures are shown on Z1; internal rotors and gimbals are not modeled\./);
    cmgs.model = cmgs.model.replace(/^Four schematic CMG enclosures are shown on Z1; internal rotors and gimbals are not modeled\./, 'The gyroscopes are not drawn individually.');
    // Normalize only the documented Zvezda solar-guide additions before the historical guard.
    const zvezda = old.find(item => item.id === 'zvezda');
    expect(zvezda.metric).toEqual({value:'29.7 m',label:'span across both solar wings'});
    expect(zvezda.milestone.date).toBe('July 26, 2000 (UTC)');
    expect(zvezda.science).toMatch(/own two solar wings.*97\.5 feet/);
    expect(zvezda.model).toMatch(/fixed deployed pose.*do not track the Sun or add generation/);
    zvezda.metric = {"value":"13","label":"windows"};
    zvezda.milestone.date = 'July 26, 2000';
    zvezda.science = zvezda.science.replace(" Its own two solar wings supplied electrical power during early station assembly. NASA gives their combined span as 97.5 feet (about 29.7 m).", '');
    zvezda.model = zvezda.model.replace(" Its added solar pair has schematic proportions, cell bays and a fixed deployed pose; the wings do not track the Sun or add generation to the separate U.S. array model.", '');
    expect(createHash('sha256').update(JSON.stringify(old)).digest('hex')).toBe('96eddf85b85183d309c59e777ff8913d2d40bfe415d72a55632907f0bb439234');
    expect(named('IssComponentGuide')).toContain("topic.id === 'comms' ? h(IssCommsStudy");
  });
});


const rayDiagram = new Function('return ' + named('issCommsRayDiagram'))();
function pathNumbers(value) { return value.match(/-?\d+(?:\.\d+)?/g).map(Number); }
function unit2(vector) { const length = Math.hypot(...vector); return vector.map(value => value / length); }
function difference2(a, b) { return a.map((value, index) => value - b[index]); }

describe('Parabolic reflector direction study', () => {
  it('matches the actual 3D profile and independently obeys the reflection law in both directions', () => {
    const reflector = geometry().userData.reflector, receive = rayDiagram('receive');
    const scale = receive.focalLength / reflector.focalLength;
    expect(scale).toBeCloseTo(250, 12);
    expect(receive.focus[0] - receive.vertex[0]).toBe(receive.focalLength);
    expect(receive.focus[1]).toBe(receive.vertex[1]);
    const curve = pathNumbers(receive.curve), points = Array.from({ length: curve.length / 2 }, (_, i) => curve.slice(i * 2, i * 2 + 2));
    expect(Math.max(...points.map(point => Math.abs(point[1] - receive.vertex[1]))) / scale).toBeCloseTo(reflector.radius, 12);
    expect(Math.max(...points.map(point => point[0] - receive.vertex[0])) / scale).toBeCloseTo(reflector.depth, 12);
    for (const mode of ['receive', 'transmit']) {
      const diagram = rayDiagram(mode);
      for (const ray of diagram.rays) {
        const radial = ray.surface[1] - diagram.vertex[1], axial = ray.surface[0] - diagram.vertex[0];
        expect(axial / scale).toBeCloseTo((radial / scale) ** 2 / (4 * reflector.focalLength), 12);
        const incoming = unit2(difference2(ray.points[1], ray.points[0]));
        const outgoing = unit2(difference2(ray.points[2], ray.points[1]));
        // Gradient of x - vertexX - (y - vertexY)^2/(4f), independent of helper paths.
        const normal = unit2([1, -radial / (2 * diagram.focalLength)]);
        const dot = incoming[0] * normal[0] + incoming[1] * normal[1];
        const reflected = incoming.map((value, i) => value - 2 * dot * normal[i]);
        expect(outgoing[0]).toBeCloseTo(reflected[0], 12);
        expect(outgoing[1]).toBeCloseTo(reflected[1], 12);
        if (mode === 'receive') { expect(incoming).toEqual([-1, 0]); expect(ray.points[2]).toEqual(diagram.focus); }
        else { expect(ray.points[0]).toEqual(diagram.focus); expect(outgoing).toEqual([1, 0]); }
      }
    }
  });

  it('reverses the same paths and points every rendered arrow along its actual segment', () => {
    const receive = rayDiagram('receive'), transmit = rayDiagram('transmit');
    expect(transmit.curve).toBe(receive.curve); expect(transmit.focus).toEqual(receive.focus);
    expect(transmit.rays).toHaveLength(receive.rays.length);
    for (let i = 0; i < receive.rays.length; i++) expect(transmit.rays[i].points).toEqual([...receive.rays[i].points].reverse());
    for (const diagram of [receive, transmit]) for (const ray of diagram.rays) for (const segment of ray.segments) {
      const coordinates = pathNumbers(segment.path), arrow = pathNumbers(segment.arrow);
      expect(coordinates).toHaveLength(4); expect(arrow).toHaveLength(6);
      for (let i = 0; i < 4; i++) expect(coordinates[i]).toBeCloseTo([...segment.from, ...segment.to][i], 3);
      const arrowDirection = [arrow[2] - (arrow[0] + arrow[4]) / 2, arrow[3] - (arrow[1] + arrow[5]) / 2];
      const segmentDirection = unit2(difference2(segment.to, segment.from));
      expect(arrowDirection[0] * segmentDirection[0] + arrowDirection[1] * segmentDirection[1]).toBeGreaterThan(7.99);
      expect(Math.abs(arrowDirection[0] * segmentDirection[1] - arrowDirection[1] * segmentDirection[0])).toBeLessThan(.002);
      for (const values of [coordinates, arrow]) values.forEach((value, i) => { expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThan(0); expect(value).toBeLessThan(i % 2 ? 270 : 360); });
    }
    expect(rayDiagram('invalid').mode).toBe('receive');
  });

  it('keeps direction, route selection and separate instances independent without camera or saved-state writes', () => {
    const data = Object.freeze({ selModule: 'unity', mapPhase: 42, mapPlaying: true, mapCutaway: false, seenModules: Object.freeze(['unity']) });
    const updateData = vi.fn(), onChange = vi.fn(), a = mountStudy({ data, updateData, onChange }), b = mountStudy({ data });
    const ac = addCamera(a), bc = addCamera(b), before = JSON.stringify(data);
    const panel = view => view.host.querySelector('[data-iss-reflector-mode]');
    const paths = view => [...panel(view).querySelectorAll('[data-iss-reflector-path]')].map(node => node.getAttribute('d'));
    const initialPaths = paths(a), surface = panel(a).querySelector('[data-iss-reflector-surface]').getAttribute('d');
    expect(panel(a).dataset.issReflectorMode).toBe('receive');
    a.select('ground');
    const transmit = panel(a).querySelector('[data-iss-reflector-direction="transmit"]');
    expect(transmit.tagName).toBe('BUTTON'); expect(transmit.type).toBe('button'); transmit.focus();
    act(() => transmit.click()); a.render();
    expect(document.activeElement).toBe(transmit);
    expect(panel(a).dataset.issReflectorMode).toBe('transmit'); expect(panel(b).dataset.issReflectorMode).toBe('receive');
    expect(a.state().dataset.issCommsStudy).toBe('ground'); b.select('relay'); expect(a.state().dataset.issCommsStudy).toBe('ground');
    expect(paths(a)).not.toEqual(initialPaths); expect(paths(b)).toEqual(initialPaths);
    expect(panel(a).querySelector('[data-iss-reflector-surface]').getAttribute('d')).toBe(surface);
    expect(panel(a).querySelector('svg').getAttribute('aria-label')).toMatch(/^Transmit:/);
    expect(panel(a).querySelector('[data-iss-reflector-reading]').textContent).toMatch(/^Transmit:/);
    for (const mode of ['receive', 'transmit']) expect(panel(a).querySelector('[data-iss-reflector-direction="' + mode + '"]').getAttribute('aria-pressed')).toBe(String(mode === 'transmit'));
    act(() => panel(a).querySelector('[data-iss-reflector-direction="receive"]').click());
    expect(paths(a)).toEqual(initialPaths); expect(a.state().dataset.issCommsStudy).toBe('ground');
    expect(panel(a).querySelector('svg').getAttribute('aria-label')).toMatch(/^Receive:/);
    expect(panel(a).textContent).toMatch(/diffract.*beam has width.*sidelobes/i);
    expect(panel(a).textContent).toMatch(/omit feed blockage, losses and off-axis reception/i);
    expect(ac.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bc.canvas._issFitCamera).not.toHaveBeenCalled();
    expect(JSON.stringify(data)).toBe(before); expect(updateData).not.toHaveBeenCalled(); expect(onChange).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
  });
});

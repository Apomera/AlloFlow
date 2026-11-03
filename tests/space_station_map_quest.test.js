import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8'), vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;
function expression(start) {
  if (start < 0) throw new Error('Required Quest integration is absent');
  const node = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
  return source.slice(node.start, node.end);
}
function namedFunction(name) { return expression(source.indexOf('function ' + name + '(')); }
const factory = new Function('return ' + namedFunction('issQuestGeometry'))();
const resources = new Set();
function keep(resource) {
  if (!resources.has(resource)) { resources.add(resource); resource.addEventListener('dispose', () => resources.delete(resource)); }
  return resource;
}
afterEach(() => { for (const resource of [...resources]) resource.dispose(); });
function geometries(radius = .45, length = 1.2) { const parts = factory(THREE, radius, length); Object.values(parts).forEach(keep); return parts; }
function points(geometry, start = 0, count = geometry.getAttribute('position').count) {
  const p = geometry.getAttribute('position'); return Array.from({ length: count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, start + i));
}
function radialProfile(geometry) {
  const levels = new Map();
  for (const p of points(geometry)) {
    const key = Number(p.y.toFixed(7)), radius = Math.hypot(p.x, p.z);
    levels.set(key, Math.max(levels.get(key) || 0, radius));
  }
  return [...levels].sort((a, b) => a[0] - b[0]);
}
function radiusAt(profile, y) {
  if (y < profile[0][0] - 1e-7 || y > profile.at(-1)[0] + 1e-7) return -1;
  for (let i = 1; i < profile.length; i++) if (y <= profile[i][0] + 1e-9) {
    const [a, b] = [profile[i - 1], profile[i]], t = (y - a[0]) / (b[0] - a[0]);
    return a[1] + Math.max(0, Math.min(1, t)) * (b[1] - a[1]);
  }
  return profile.at(-1)[1];
}
function coreProtrusion(hull, core) {
  const profile = radialProfile(hull), samples = points(core), p = samples.slice();
  // Include intersections of core triangle edges with every outer profile
  // breakpoint. Checking only vertices can miss a contracted shoulder.
  for (let i = 0; i < p.length; i += 3) for (let edge = 0; edge < 3; edge++) {
    const a = p[i + edge], b = p[i + (edge + 1) % 3];
    if (Math.abs(a.y - b.y) < 1e-9) continue;
    for (const [y] of profile) {
      const t = (y - a.y) / (b.y - a.y);
      if (t > 0 && t < 1) samples.push(a.clone().lerp(b, t));
    }
  }
  return Math.max(...samples.map(point => Math.hypot(point.x, point.z) - radiusAt(profile, point.y)));
}

describe('Quest two-chamber exterior geometry', () => {
  it('returns fresh finite bounded geometries with usable normals and hull UVs', () => {
    const parts = geometries(), other = geometries();
    expect(Object.keys(parts).sort()).toEqual(['hardware', 'hull']);
    let triangles = 0;
    for (const [key, geometry] of Object.entries(parts)) {
      expect(geometry.isBufferGeometry).toBe(true); expect(geometry.index).toBeNull(); expect(geometry).not.toBe(other[key]);
      const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
      expect(p.count % 3).toBe(0); expect(p.count).toBeGreaterThan(50); expect(n.count).toBe(p.count); triangles += p.count / 3;
      for (const a of Object.values(geometry.attributes)) expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
      for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
      for (const point of points(geometry)) {
        expect(Math.hypot(point.x, point.z)).toBeLessThanOrEqual(.45 + 1e-7);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(.6 + 1e-7);
      }
      const original = other[key].getAttribute('position').getX(0); p.setX(0, 99);
      expect(other[key].getAttribute('position').getX(0)).toBe(original);
    }
    expect(triangles).toBeLessThan(12000);
    expect(parts.hull.getAttribute('uv').count).toBe(parts.hull.getAttribute('position').count);
    expect(parts.hardware.getAttribute('color').count).toBe(parts.hardware.getAttribute('position').count);
    expect(Array.from(parts.hardware.getAttribute('color').array).every(value => value >= 0 && value <= 1)).toBe(true);
  });

  it('places the wider equipment chamber inboard and the smaller crew lock outboard within the original ends', () => {
    const { hull } = geometries(), profile = radialProfile(hull);
    expect(profile[0][0]).toBeCloseTo(-.6, 6); expect(profile.at(-1)[0]).toBeCloseTo(.6, 6);
    expect(radiusAt(profile, .2)).toBeCloseTo(.315, 5); expect(radiusAt(profile, -.4)).toBeCloseTo(.207, 5);
    expect(radiusAt(profile, .2)).toBeGreaterThan(radiusAt(profile, -.4) * 1.4);
    const mesh = new THREE.Mesh(hull, keep(new THREE.MeshStandardMaterial())); mesh.rotation.z = Math.PI / 2; mesh.position.set(1.1, 0, .2); mesh.updateMatrixWorld(true);
    const equipment = new THREE.Vector3(0, .2, 0).applyMatrix4(mesh.matrixWorld), crew = new THREE.Vector3(0, -.4, 0).applyMatrix4(mesh.matrixWorld);
    expect(equipment.x).toBeLessThan(crew.x); expect(equipment.x).toBeCloseTo(.9, 12); expect(crew.x).toBeCloseTo(1.5, 12);
    // End-on rays must hit a real pressure shell, not an open-ended cylinder.
    for (const sign of [-1, 1]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(0, sign * 2, 0), new THREE.Vector3(0, -sign, 0));
      const local = new THREE.Mesh(hull, keep(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })));
      const hits = ray.intersectObject(local); expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].point.y).toBeCloseTo(sign * .6, 6);
    }
  });

  it('keeps the original linear axial texture density through differently spaced profile sections', () => {
    for (const length of [1.2, 2.4]) {
      const { hull } = geometries(.45, length), p = hull.getAttribute('position'), uv = hull.getAttribute('uv');
      let maximumError = 0;
      for (let i = 0; i < p.count; i++) maximumError = Math.max(maximumError, Math.abs(uv.getY(i) - (p.getY(i) / length + .5)));
      expect(maximumError).toBeLessThan(2e-7);
      const values = Array.from({ length: uv.count }, (_, i) => uv.getY(i));
      expect(Math.min(...values)).toBeCloseTo(0, 6); expect(Math.max(...values)).toBeCloseTo(1, 6);
      // The old Lathe profile-index coordinate would give .4 at the -.20
      // section, where linear height mapping requires 1/3 instead.
      const section = Array.from({ length: p.count }, (_, i) => i).find(i => Math.abs(p.getY(i) + length / 6) < 1e-6);
      expect(section).toBeDefined(); expect(uv.getY(section)).toBeCloseTo(1 / 3, 6); expect(Math.abs(uv.getY(section) - .4)).toBeGreaterThan(.06);
    }
  });

  it('keeps the scaled cutaway shell inside both chambers and rejects the former constant-radius core', () => {
    const { hull } = geometries(), core = keep(hull.clone()); core.scale(.8, .94, .8);
    expect(coreProtrusion(hull, core)).toBeLessThan(1e-6);
    const wrong = keep(new THREE.CylinderGeometry(.36, .36, 1.128, 18, 1, true).toNonIndexed());
    expect(coreProtrusion(hull, wrong)).toBeGreaterThan(.1);
  });

  it('batches four separate historical gas tanks with real capsule ends inside the existing envelope', () => {
    const { hardware } = geometries(), metadata = hardware.userData;
    expect(metadata.tankCount).toBe(4); expect(metadata.configuration).toBe('STS-104 2001 schematic');
    expect(metadata.tanks.map(tank => tank.id)).toEqual(['tank-1', 'tank-2', 'tank-3', 'tank-4']);
    expect(metadata.tanks.map(tank => tank.gas).sort()).toEqual(['nitrogen', 'nitrogen', 'oxygen', 'oxygen']);
    let end = 0;
    for (const component of metadata.components) {
      expect(component.start).toBe(end); expect(component.count % 3).toBe(0); expect(component.count).toBeGreaterThan(0); end += component.count;
    }
    expect(end).toBe(hardware.getAttribute('position').count);
    const angles = [];
    for (const tank of metadata.tanks) {
      const component = metadata.components.find(part => part.name === tank.id); expect(component).toBeDefined();
      const center = new THREE.Vector3().fromArray(tank.center), local = points(hardware, component.start, component.count).map(point => point.sub(center));
      const radius = Math.max(...local.map(point => Math.hypot(point.x, point.z)));
      expect(radius).toBeCloseTo(tank.radius, 6);
      expect(Math.max(...local.map(point => point.y)) - Math.min(...local.map(point => point.y))).toBeCloseTo(tank.length, 6);
      const cap = local.filter(point => Math.abs(point.y) > tank.length / 2 - .002);
      expect(cap.length).toBeGreaterThan(0); expect(Math.max(...cap.map(point => Math.hypot(point.x, point.z)))).toBeLessThan(tank.radius * .1);
      expect(center.y).toBeGreaterThan(0); expect(Math.hypot(center.x, center.z) - radius).toBeGreaterThan(.315 - 1e-6);
      angles.push((Math.atan2(center.z, center.x) + 2 * Math.PI) % (2 * Math.PI));
    }
    angles.sort((a, b) => a - b);
    for (let i = 0; i < 4; i++) expect((angles[(i + 1) % 4] - angles[i] + 2 * Math.PI) % (2 * Math.PI)).toBeCloseTo(Math.PI / 2, 12);
  });

  it('shows the closed EVA hatch on the nadir side before the pressure shell, with an outward normal', () => {
    const parts = geometries(), metadata = parts.hardware.userData;
    expect(metadata.hatch.center).toEqual([-.214, -.4, 0]); expect(metadata.hatch.normal).toEqual([-1, 0, 0]);
    const door = metadata.components.find(part => part.name === 'eva-hatch-door'); expect(door).toBeDefined();
    const hardware = new THREE.Mesh(parts.hardware, keep(new THREE.MeshStandardMaterial())), hull = new THREE.Mesh(parts.hull, keep(new THREE.MeshStandardMaterial()));
    const ray = new THREE.Raycaster(new THREE.Vector3(-1, -.34, .045), new THREE.Vector3(1, 0, 0));
    const hits = ray.intersectObjects([hardware, hull]); expect(hits[0].object).toBe(hardware);
    expect(hits[0].faceIndex * 3).toBeGreaterThanOrEqual(door.start); expect(hits[0].faceIndex * 3).toBeLessThan(door.start + door.count);
    expect(hits[0].face.normal.x).toBeLessThan(-.9999);
    hardware.rotation.z = Math.PI / 2; hardware.position.set(1.1, 0, .2); hardware.updateMatrixWorld(true);
    const normal = new THREE.Vector3().fromArray(metadata.hatch.normal).transformDirection(hardware.matrixWorld);
    expect(normal.distanceTo(new THREE.Vector3(0, -1, 0))).toBeLessThan(1e-12);
  });

  it('disposes every temporary construction geometry while returning only two live private buffers', () => {
    const observed = new Map(), facade = Object.create(THREE);
    function observe(geometry) {
      if (!observed.has(geometry)) {
        observed.set(geometry, 0); geometry.addEventListener('dispose', () => observed.set(geometry, observed.get(geometry) + 1));
        const original = geometry.toNonIndexed.bind(geometry);
        geometry.toNonIndexed = () => observe(original());
      }
      return geometry;
    }
    for (const name of ['BufferGeometry', 'LatheGeometry', 'BoxGeometry', 'TorusGeometry', 'CylinderGeometry', 'TubeGeometry', 'CircleGeometry']) {
      facade[name] = function (...args) { return observe(new THREE[name](...args)); };
    }
    const parts = factory(facade, .45, 1.2), live = Object.values(parts);
    expect(observed.size).toBeGreaterThan(40);
    for (const [geometry, disposals] of observed) expect(disposals).toBe(live.includes(geometry) ? 0 : 1);
    live.forEach(geometry => { keep(geometry); geometry.dispose(); });
    expect([...observed.values()].every(disposals => disposals === 1)).toBe(true);
  });
});

const modules = runInNewContext(expression(source.indexOf('[', source.indexOf('  var MODULES ='))), { ISS_TRUSS_Y: .9 });
const assemblyStart = source.lastIndexOf('          var station =', source.indexOf('MODULES.forEach(function (m)'));
const assemblyEnd = source.indexOf('          // Shared cell and insulation atlases', assemblyStart);
if (assemblyStart < 0 || assemblyEnd < assemblyStart) throw new Error('Station module assembly missing');
function fixture(withTextures = false) {
  const images = new Map();
  const painter = kind => {
    if (!withTextures) return null;
    if (!images.has(kind)) images.set(kind, document.createElement('canvas'));
    return images.get(kind);
  };
  const context = { THREE, MODULES: modules, ISS_TRUSS_Y: .9, scene: new THREE.Scene(), issQuestGeometry: factory,
    issHullCanvas: painter, issModuleEndcapCanvas: () => painter('endcap'),
    issTexture: image => keep(new THREE.Texture(image)) };
  for (const name of ['issOpenTrussGeometry', 'issTrussHardwareGeometry', 'issAmsGeometry', 'issModuleHardwareGeometry', 'issDestinyWindowGeometry', 'issCupolaGeometry', 'issKiboFacilityGeometry', 'issCommsGeometry']) context[name] = new Function('return ' + namedFunction(name))();
  runInNewContext(source.slice(assemblyStart, assemblyEnd), context); context.scene.updateMatrixWorld(true);
  context.scene.traverse(object => { if (object.geometry) keep(object.geometry); if (object.material) keep(object.material); });
  context.hull = context.scene.getObjectByName('iss-quest-hull'); context.hardware = context.scene.getObjectByName('iss-quest-hardware');
  context.core = context.moduleCores.find(mesh => mesh._issParentId === 'quest'); context.images = images;
  return context;
}
function updateDetails(context, daylight = 1) {
  Object.assign(context, { earthLightsMat: null, earthExposureMat: null, milkyWay: { userData: { starMaterial: {} } }, daylight01: daylight });
  if (!context.setLabToolData) context.setLabToolData = vi.fn();
  const start = source.indexOf('            var lampOn =', assemblyEnd), end = source.indexOf('            if (curSel)', start);
  if (start < 0 || end < start) throw new Error('Station detail update missing');
  runInNewContext(source.slice(start, end), context);
}

describe('Quest renderer integration', () => {
  it('preserves the logical anchor and existing hull skin while replacing only Quest generic hardware', () => {
    const context = fixture(true), { hull, hardware, core } = context;
    expect(hull?.isMesh).toBe(true); expect(hardware?.isMesh).toBe(true); expect(core?.isMesh).toBe(true);
    expect(context.clickable).toHaveLength(13); expect(context.clickable.filter(mesh => mesh._issId === 'quest')).toEqual([hull]);
    expect(hull.position.toArray()).toEqual([1.1, 0, .2]); expect(hull.rotation.z).toBe(Math.PI / 2);
    expect(hull.material.map.image).toBe(context.images.get('panel')); expect(hull.material.map.repeat.toArray()).toEqual([1, 1]);
    expect(hardware._issParentId).toBe('quest'); expect(hardware._issQuestHardware).toBe(true); expect(hardware._issScienceId).toBeUndefined();
    expect(context.moduleDetails.filter(mesh => mesh._issParentId === 'quest')).toEqual([hardware]);
    expect(context.moduleCapPickers.filter(mesh => mesh._issParentId === 'quest')).toEqual([hardware]);
    expect(hardware.position.toArray()).toEqual(hull.position.toArray()); expect(hardware.quaternion.toArray()).toEqual(hull.quaternion.toArray());
    expect(core.position.toArray()).toEqual(hull.position.toArray()); expect(core.quaternion.toArray()).toEqual(hull.quaternion.toArray());
    expect(context.scene.getObjectByName('iss-module-endcaps-quest')).toBeUndefined();
    expect(context.scene.getObjectByName('iss-module-handrails-quest')).toBeUndefined();
    const owned = context.station.children.filter(mesh => mesh._issId === 'quest' || mesh._issParentId === 'quest');
    expect(owned).toHaveLength(3); expect(new Set(owned.map(mesh => mesh.geometry)).size).toBe(3); expect(new Set(owned.map(mesh => mesh.material)).size).toBe(3);
    expect(core.material.map.image).toBe(context.images.get('interior')); expect(core.material.side).toBe(THREE.BackSide);
    expect(coreProtrusion(hull.geometry, core.geometry)).toBeLessThan(1e-6);
  });

  it('owns fresh untextured non-emissive hardware and disposes all three Quest parts once', () => {
    const context = fixture(true), second = fixture(true), { hardware } = context, disposed = [];
    expect(hardware.material.isMeshStandardMaterial).toBe(true); expect(hardware.material.vertexColors).toBe(true); expect(hardware.material.emissive.getHex()).toBe(0);
    for (const [name, value] of Object.entries(hardware.material)) if (name === 'map' || /Map$/.test(name)) expect(value, name).toBeNull();
    for (const key of ['hull', 'hardware', 'core']) for (const kind of ['geometry', 'material']) {
      expect(context[key][kind]).not.toBe(second[key][kind]);
      context[key][kind].addEventListener('dispose', () => disposed.push(context[key][kind].uuid));
    }
    const start = source.indexOf('var geometries = new Set()', assemblyEnd), end = source.indexOf('renderer.dispose();', start) + 'renderer.dispose();'.length;
    context.planetScene = new THREE.Scene(); context.renderer = { dispose: vi.fn() }; runInNewContext(source.slice(start, end), context);
    expect(disposed).toHaveLength(6); expect(new Set(disposed).size).toBe(6); expect(context.renderer.dispose).toHaveBeenCalledOnce();
  });

  it('keeps macro inspection opaque for either selection and restores normal cutaway after exit', () => {
    const context = fixture(true);
    Object.assign(context, { cv: { _issWantSel: 'quest', _issCutaway: true }, cameraFocusId: 'quest-exterior', cameraMinDistance: 1.5 });
    for (const selected of ['quest', 'unity']) for (const daylight of [1, 0, .5]) {
      context.cv._issWantSel = selected; updateDetails(context, daylight);
      for (const part of [context.hull, context.hardware]) {
        expect(part.material.opacity).toBe(1); expect(part.material.depthWrite).toBe(true); expect(part.material.emissive.getHex()).toBe(0);
      }
      expect(context.core.visible).toBe(false);
    }
    for (const selected of ['quest', 'unity']) for (const focus of [null, 'quest']) {
      context.cv._issWantSel = selected; context.cameraFocusId = focus; updateDetails(context);
      expect(context.hull.material.opacity).toBe(selected === 'quest' ? .26 : .1);
      expect(context.hardware.material.opacity).toBe(selected === 'quest' ? 1 : .05);
      expect(context.core.visible).toBe(selected === 'quest'); expect(context.cv._issCutaway).toBe(true);
    }
    expect(context.setLabToolData).not.toHaveBeenCalled();
  });

  it('keeps both pressure-shell and hatch hits on normal Quest selection and XP behavior', () => {
    for (const kind of ['hull', 'hardware']) {
      const context = fixture(), angle = Math.PI / 8;
      const localPoint = kind === 'hull' ? new THREE.Vector3(.315 * Math.cos(angle), .4, .315 * Math.sin(angle)) : new THREE.Vector3(-.224, -.34, .045);
      const localNormal = kind === 'hull' ? new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)) : new THREE.Vector3(-1, 0, 0);
      const target = localPoint.applyMatrix4(context.hull.matrixWorld), normal = localNormal.transformDirection(context.hull.matrixWorld);
      const camera = new THREE.PerspectiveCamera(46, 1.6, .01, 100); camera.up.set(0, 0, 1); camera.position.copy(target).addScaledVector(normal, 1.2); camera.lookAt(target); camera.updateMatrixWorld(true);
      Object.assign(context, { camera, dragTravel: 0, gestureMultiple: false, visitorPickers: [], mouseV: new THREE.Vector2(), raycaster: new THREE.Raycaster(),
        onLeave: vi.fn(), upd: vi.fn(), markSeen: vi.fn(), awardXP: vi.fn(), announceToSR: vi.fn(),
        __alloT: (key, fallback) => fallback, __alloFill: (text, values) => text.replace(/\{([^}]+)\}/g, (_, key) => String(values[key])),
        cv: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 500 }), _issFitCamera: vi.fn() } });
      context.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      expect(context.raycaster.intersectObjects(context.clickable.concat(context.moduleCapPickers), false)[0].object).toBe(context[kind]);
      runInNewContext(namedFunction('pick') + '\npick({clientX:400,clientY:250,button:0});', context);
      expect(context.upd).toHaveBeenCalledExactlyOnceWith({ selModule: 'quest' });
      expect(context.markSeen).toHaveBeenCalledExactlyOnceWith('seenModules', 'quest'); expect(context.awardXP).toHaveBeenCalledExactlyOnceWith(1);
      expect(context.cv._issFitCamera).not.toHaveBeenCalled(); expect(context.onLeave).toHaveBeenCalled();
    }
  });
});

const cameraMath = new Function(['issFlightNumber', 'issMapCameraPose', 'issMapCameraPan', 'issMapCameraFit'].map(namedFunction).join('\n') +
  '\nreturn {pose:issMapCameraPose,pan:issMapCameraPan,fit:issMapCameraFit};')();
function cameraFixture(aspect = 1.6) {
  const context = fixture();
  Object.assign(context, {
    cv: { _issWantSel: 'unity' }, cleaned: false, _prefersReducedMotion: true,
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
  runInNewContext(['applyCameraPose', 'settleCameraFit', 'cancelCameraTween', 'moveCamera', 'onKey'].map(namedFunction).join('\n'), context);
  for (const key of ['_issCameraOrbit', '_issCameraZoom', '_issCameraPan', '_issSetView', '_issFitCamera', '_issFocusModule']) {
    const start = source.indexOf('cv.' + key + ' = function');
    runInNewContext('cv.' + key + ' = ' + expression(source.indexOf('function', start)) + ';', context);
  }
  return context;
}
function outward(context) { return new THREE.Vector3(0, -1, 0).transformDirection(context.hull.matrixWorld); }
function offset(context) { return context.camera.position.clone().sub(context.cameraTarget); }

describe('Quest exterior camera', () => {
  it('fits actual hull and hardware bounds at both aspect ratios with the original logical anchor intact', () => {
    for (const aspect of [1.6, .7]) {
      const context = cameraFixture(aspect); context.cv._issFitCamera('quest-exterior');
      const unrotated = new THREE.Box3(); [context.hull, context.hardware].forEach(part => unrotated.union(new THREE.Box3().setFromObject(part)));
      const smallRadius = unrotated.getBoundingSphere(new THREE.Sphere()).radius;
      expect(smallRadius).toBeLessThan(1); expect(context.cameraFitResult.radius).toBeCloseTo(smallRadius, 12);
      context.station.rotation.set(.25, -.3, .18); context.cv._issFitCamera('quest-exterior');
      const bounds = new THREE.Box3(); [context.hull, context.hardware].forEach(part => bounds.union(new THREE.Box3().setFromObject(part)));
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      expect(context.cameraFitResult.radius).toBeCloseTo(sphere.radius, 12);
      expect(context.cameraTarget.distanceTo(sphere.center)).toBeLessThan(1e-12);
      expect(context.cameraFocusId).toBe('quest-exterior'); expect(context.cameraFitMode).toBe('quest-exterior');
      expect(context.cameraMinDistance).toBe(1.5); expect(context.cameraMaxDistance).toBe(3.6);
      expect(offset(context).dot(outward(context))).toBeGreaterThanOrEqual(.08 * offset(context).length() - 1e-11);
      const projected = [context.hull, context.hardware].flatMap(part => points(part.geometry).map(point => point.applyMatrix4(part.matrixWorld).project(context.camera)));
      expect(projected.every(point => point.toArray().every(Number.isFinite))).toBe(true);
      expect(Math.max(...projected.map(point => Math.abs(point.x)))).toBeLessThan(1);
      expect(Math.max(...projected.map(point => Math.abs(point.y)))).toBeLessThan(1);
      expect(projected.every(point => point.z > -1 && point.z < 1)).toBe(true);
      expect(context.cv._issWantSel).toBe('unity'); expect(context.upd).not.toHaveBeenCalled();
    }
  });

  it('preserves the inspected direction on resize and the outward floor-safe guard after zoom', () => {
    const context = cameraFixture(); context.cv._issFitCamera('quest-exterior'); context.cv._issCameraOrbit(.2, -.15);
    const direction = offset(context).normalize();
    context.camera.aspect = .7; context.camera.updateProjectionMatrix(); context.cv._issFitCamera('quest-exterior', true);
    expect(offset(context).normalize().distanceTo(direction)).toBeLessThan(1e-11);
    for (const [factor, distance] of [[.001, 1.5], [1000, 3.6]]) {
      context.cv._issCameraZoom(factor);
      expect(context.cameraFitMode).toBeNull(); expect(context.cameraFocusId).toBe('quest-exterior'); expect(offset(context).length()).toBeCloseTo(distance, 11);
      for (let i = 0; i < 60; i++) {
        context.cv._issCameraOrbit(i % 2 ? .8 : -.4, i < 30 ? -.09 : .09);
        const delta = offset(context);
        expect(delta.dot(outward(context))).toBeGreaterThanOrEqual(.08 * delta.length() - 1e-11);
        expect(context.camera.position.y).toBeGreaterThanOrEqual(-3.8 - 1e-11);
        expect(delta.length()).toBeGreaterThanOrEqual(1.5 - 1e-11); expect(delta.length()).toBeLessThanOrEqual(3.6 + 1e-11);
      }
    }
  });

  it('makes the orbit oracle reject a missing exterior guard and exits on normal view actions', () => {
    const mutant = cameraFixture(); mutant.cv._issFitCamera('quest-exterior'); mutant.cv._issCameraZoom(.001);
    mutant.issMapCameraPose = (position, target, options) => cameraMath.pose(position, target, { ...options, outwardNormal: null });
    let leastProjection = Infinity;
    for (let i = 0; i < 60; i++) { mutant.cv._issCameraOrbit(.12, 0); leastProjection = Math.min(leastProjection, offset(mutant).normalize().dot(outward(mutant))); }
    expect(leastProjection).toBeLessThan(-.2);
    for (const action of ['focus', 'pan', 'home', 'station']) {
      const context = cameraFixture(); context.cv._issCutaway = true; context.cv._issFitCamera('quest-exterior'); updateDetails(context);
      expect(context.hardware.material.opacity).toBe(1);
      if (action === 'focus') context.cv._issFocusModule('quest'); else if (action === 'pan') context.cv._issCameraPan(32, 0);
      else if (action === 'home') context.cv._issSetView('overview'); else context.cv._issFitCamera('station');
      expect(context.cameraFocusId).not.toBe('quest-exterior'); expect(context.cameraFitMode).not.toBe('quest-exterior');
      updateDetails(context); expect(context.hull.material.opacity).toBe(.1); expect(context.hardware.material.opacity).toBe(.05);
      expect(context.cv._issWantSel).toBe('unity'); expect(context.cv._issCutaway).toBe(true); expect(context.upd).not.toHaveBeenCalled();
      const position = context.camera.position.toArray(); context.cleaned = true; context.cv._issFitCamera('quest-exterior'); expect(context.camera.position.toArray()).toEqual(position);
    }
  });
});

const require = createRequire(import.meta.url), modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react')), ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React, save = vi.fn();
const Study = runInNewContext(namedFunction('IssQuestStudy') + '\nIssQuestStudy;', { document, setLabToolData: save });
const mounts = [];
let previousActEnvironment;
beforeAll(() => { previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(() => {
  for (const { root, host } of mounts.splice(0)) {
    host.querySelectorAll('style').forEach(style => style.remove()); act(() => root.unmount()); host.remove();
  }
  save.mockClear();
});
function mountStudy(props = {}) {
  const host = document.createElement('div'); host.setAttribute('data-iss-map', ''); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const render = () => act(() => root.render(React.createElement(Study, { React, ...props }))); render();
  return { host, render, state: () => host.querySelector('[data-iss-quest-study]'),
    zone(value) { act(() => host.querySelector(`[data-iss-quest-chamber="${value}"]`).click()); } };
}
function addCamera(view) {
  const stage = document.createElement('div'); stage.className = 'iss-station-stage'; stage.scrollIntoView = vi.fn();
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas._issFitCamera = vi.fn();
  stage.appendChild(canvas); view.host.appendChild(stage); return { stage, canvas };
}

describe('Quest chamber and pressure-boundary study', () => {
  it('synchronizes native chamber controls with the diagram and accessible explanation', () => {
    const view = mountStudy(), ids = ['equipment', 'bulkhead', 'crew'];
    expect(view.host.querySelectorAll('[data-iss-quest-zone]')).toHaveLength(3);
    for (const selected of [...ids, 'equipment']) {
      view.zone(selected); expect(view.state().dataset.issQuestStudy).toBe(selected);
      for (const id of ids) {
        const button = view.host.querySelector(`[data-iss-quest-chamber="${id}"]`), zone = view.host.querySelector(`[data-iss-quest-zone="${id}"]`);
        expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.getAttribute('aria-pressed')).toBe(String(selected === id));
        expect(zone.getAttribute('data-selected')).toBe(String(selected === id));
      }
      const label = view.host.querySelector(`[data-iss-quest-chamber="${selected}"]`).textContent;
      expect(view.host.querySelector('[data-iss-quest-description]').textContent).toContain(label);
      expect(view.host.querySelector('svg[role="img"]').getAttribute('aria-label')).toContain(label);
    }
  });

  it('keeps exploration local and preserves the independent pressure lab and all saved data', () => {
    const data = Object.freeze({ selModule: 'unity', mapPhase: 61, mapPlaying: true, mapCutaway: true,
      opsPressureMinute: 7.25, opsPressureStart: 14.7, opsPressureTarget: 4.3, seenModules: Object.freeze(['zarya']) });
    const onChange = vi.fn(), updateData = vi.fn(), a = mountStudy({ data, onChange, updateData }), b = mountStudy({ data });
    const aCamera = addCamera(a), bCamera = addCamera(b), original = JSON.stringify(data);
    a.zone('crew'); a.render();
    expect(a.state().dataset.issQuestStudy).toBe('crew'); expect(b.state().dataset.issQuestStudy).toBe('equipment');
    expect(JSON.stringify(data)).toBe(original); expect(onChange).not.toHaveBeenCalled(); expect(updateData).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    expect(aCamera.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
    expect(a.host.querySelectorAll('input')).toHaveLength(0);
  });

  it('opens only the matching map exterior and does nothing when its canvas is absent', () => {
    const a = mountStudy(), b = mountStudy(), aCamera = addCamera(a), bCamera = addCamera(b);
    act(() => a.host.querySelector('[data-iss-quest-inspect]').click());
    expect(aCamera.canvas._issFitCamera).toHaveBeenCalledExactlyOnceWith('quest-exterior'); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(aCamera.canvas); expect(aCamera.stage.scrollIntoView).toHaveBeenCalledOnce();
    aCamera.stage.remove(); aCamera.canvas._issFitCamera.mockClear(); act(() => a.host.querySelector('[data-iss-quest-inspect]').click());
    expect(aCamera.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
  });

  it('qualifies the schematic chambers, historical gas set and pressure-load explanation with official sources', () => {
    const view = mountStudy(); view.zone('equipment');
    expect(view.host.querySelector('[data-iss-quest-description]').textContent).toMatch(/not permanently fixed at one pressure/i);
    view.zone('crew'); expect(view.host.querySelector('[data-iss-quest-description]').textContent).toMatch(/Earth-facing.*nadir/i);
    expect(view.host.textContent).toMatch(/2001 delivered gas set/i); expect(view.host.textContent).toMatch(/two oxygen and two nitrogen/i);
    expect(view.host.textContent).toMatch(/uniform pressure difference.*flat area/i); expect(view.host.textContent).toContain('Δp × A');
    expect(view.host.textContent).toMatch(/Microgravity does not remove this load/i);
    expect(view.host.textContent).toMatch(/does not animate hatches, pressure cycles/i);
    expect([...view.host.querySelectorAll('dt')].map(node => node.textContent).slice(0, 2)).toEqual(['12 July 2001', '15 July 2001']);
    const links = [...view.host.querySelectorAll('a')]; expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      const url = new URL(link.href); expect(url.protocol).toBe('https:'); expect(url.hostname).toMatch(/(^|\.)nasa\.gov$/);
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
  });
});

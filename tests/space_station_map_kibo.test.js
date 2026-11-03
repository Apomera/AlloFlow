import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8'), vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;
function expression(start) {
  if (start < 0) throw new Error('Required Kibo integration is absent');
  const node = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
  return source.slice(node.start, node.end);
}
function namedFunction(name) { return expression(source.indexOf('function ' + name + '(')); }
const factory = new Function('return ' + namedFunction('issKiboFacilityGeometry'))();
const resources = new Set();
function keep(resource) {
  if (!resources.has(resource)) {
    resources.add(resource); resource.addEventListener('dispose', () => resources.delete(resource));
  }
  return resource;
}
afterEach(() => { for (const resource of [...resources]) resource.dispose(); });
function positions(geometry, start = 0, count = geometry.getAttribute('position').count) {
  const p = geometry.getAttribute('position');
  return Array.from({ length: count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, start + i));
}
const attachment = new THREE.Vector3(-2.775, -.20, -3.4);
function worldPoints(geometry, component) {
  return positions(geometry, component?.start, component?.count).map(point => point.add(attachment));
}
function hashAttribute(attribute) {
  const a = attribute.array;
  return createHash('sha256').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
}

describe('illustrative Kibo Exposed Facility geometry', () => {
  it('returns fresh finite nonindexed geometry with unit normals, colours and a bounded cost', () => {
    const geometry = keep(factory(THREE)), second = keep(factory(THREE));
    expect(geometry.isBufferGeometry).toBe(true); expect(geometry.index).toBeNull(); expect(geometry).not.toBe(second);
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), c = geometry.getAttribute('color');
    expect(p.count % 3).toBe(0); expect(p.count).toBeGreaterThan(100); expect(p.count / 3).toBeLessThan(3000);
    expect(n.count).toBe(p.count); expect(c.count).toBe(p.count);
    for (const a of Object.values(geometry.attributes)) expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
    expect(Array.from(c.array).every(value => value >= 0 && value <= 1)).toBe(true);
    expect(geometry.userData.kind).toBe('kibo-ef'); expect(geometry.userData.illustrative).toBe(true);
    const original = second.getAttribute('position').getX(0);
    p.setX(0, 100); expect(second.getAttribute('position').getX(0)).toBe(original);
    expect(geometry.userData).not.toBe(second.userData); expect(c.array).not.toBe(second.getAttribute('color').array);
  });

  it('keeps the body in its clearance envelope and connects only the short coupling to the hull', () => {
    const geometry = keep(factory(THREE)), components = geometry.userData.components;
    expect(components.length).toBeGreaterThan(10);
    let end = 0, coupling = [];
    for (const component of components) {
      expect(component.start).toBe(end); expect(component.count).toBeGreaterThan(0); expect(component.count % 3).toBe(0);
      end += component.count;
      for (const p of worldPoints(geometry, component)) {
        expect(p.x).toBeGreaterThanOrEqual(-3 - 1e-7); expect(p.x).toBeLessThanOrEqual(-2.48 + 1e-7);
        expect(p.y).toBeGreaterThanOrEqual(-.34 - 1e-7); expect(p.y).toBeLessThanOrEqual(.16 + 1e-7);
        expect(p.z).toBeGreaterThanOrEqual(-3.95 - 1e-7); expect(p.z).toBeLessThanOrEqual(-2.85 + 1e-7);
        if (p.x > -2.55 + 1e-7) {
          expect(component.name).toMatch(/coupl|attach/i); coupling.push(p);
        }
      }
    }
    expect(end).toBe(geometry.getAttribute('position').count); expect(coupling.length).toBeGreaterThan(0);
    const point = new THREE.Vector3().fromArray(geometry.userData.attachmentPoint).add(attachment);
    expect(point.distanceTo(new THREE.Vector3(-2.48, 0, -3.4))).toBeLessThan(1e-12);
    expect(Math.max(...coupling.map(p => p.x))).toBeCloseTo(point.x, 6);
    expect(point.x).toBeGreaterThan(-2.5); // overlaps the existing outboard cap, not a floating pallet
  });

  it('provides six distinct illustrative interfaces backed by actual geometry and three payloads', () => {
    const geometry = keep(factory(THREE)), metadata = geometry.userData;
    expect(metadata.interfaces.map(item => item.id).sort()).toEqual(Array.from({ length: 6 }, (_, i) => 'interface-' + (i + 1)));
    const centers = metadata.interfaces.map(item => item.position.join(',')); expect(new Set(centers).size).toBe(6);
    for (const item of metadata.interfaces) {
      expect(item.position.every(Number.isFinite)).toBe(true);
      const component = metadata.components.find(part => part.name === item.id); expect(component).toBeDefined();
      const box = new THREE.Box3().setFromPoints(positions(geometry, component.start, component.count));
      const center = new THREE.Vector3().fromArray(item.position);
      expect(box.clone().expandByScalar(1e-6).containsPoint(center)).toBe(true);
      expect(box.getSize(new THREE.Vector3()).length()).toBeGreaterThan(.025);
    }
    for (const id of ['payload-1', 'payload-2', 'payload-3']) expect(metadata.components.some(part => part.name === id && part.count >= 36)).toBe(true);
  });
});

const modules = runInNewContext(expression(source.indexOf('[', source.indexOf('  var MODULES ='))), { ISS_TRUSS_Y: .9 });
const assemblyStart = source.lastIndexOf('          var station =', source.indexOf('MODULES.forEach(function (m)'));
const assemblyEnd = source.indexOf('          // Shared cell and insulation atlases', assemblyStart);
if (assemblyStart < 0 || assemblyEnd < assemblyStart) throw new Error('Station module assembly missing');
function fixture() {
  const context = { THREE, MODULES: modules, ISS_TRUSS_Y: .9, scene: new THREE.Scene(),
    issKiboFacilityGeometry: factory, issHullCanvas: () => null, issModuleEndcapCanvas: () => null,
    issTexture: () => { throw new Error('Kibo facility must not require a new atlas'); }
  };
  for (const name of ['issOpenTrussGeometry', 'issTrussHardwareGeometry', 'issAmsGeometry', 'issModuleHardwareGeometry', 'issDestinyWindowGeometry', 'issCupolaGeometry', 'issQuestGeometry', 'issCommsGeometry']) context[name] = new Function('return ' + namedFunction(name))();
  runInNewContext(source.slice(assemblyStart, assemblyEnd), context); context.scene.updateMatrixWorld(true);
  context.scene.traverse(object => { if (object.geometry) keep(object.geometry); if (object.material) keep(object.material); });
  context.facility = context.scene.getObjectByName('iss-kibo-exposed-facility');
  return context;
}
function legacyGeometryRecord(context) {
  const record = [];
  context.station.traverse(object => {
    if (!object.geometry || object.name === 'iss-z1-comms' || object.name === 'iss-kibo-exposed-facility' || object._issId === 'quest' || object._issParentId === 'quest') return;
    const attributes = Object.fromEntries(Object.entries(object.geometry.attributes).map(([key, value]) => [key, hashAttribute(value)]));
    if (object.geometry.index) attributes.index = hashAttribute(object.geometry.index);
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

describe('Kibo facility renderer and physical clearance', () => {
  it('mounts one private untextured science detail without adding a discovery module', () => {
    const context = fixture(), other = fixture(), mesh = context.facility;
    expect(mesh?.isMesh).toBe(true); expect(mesh.position.toArray()).toEqual(attachment.toArray());
    expect(mesh._issParentId).toBe('kibo'); expect(mesh._issScienceId).toBe('kibo-ef');
    expect(context.moduleDetails).toContain(mesh); expect(context.moduleCapPickers).toContain(mesh); expect(context.clickable).not.toContain(mesh);
    expect(context.clickable).toHaveLength(13); expect(context.clickable.filter(part => part._issId === 'kibo')).toHaveLength(1);
    expect(mesh.material.isMeshStandardMaterial).toBe(true); expect(mesh.material.vertexColors).toBe(true); expect(mesh.material.emissive.getHex()).toBe(0);
    for (const [name, value] of Object.entries(mesh.material)) if (name === 'map' || /Map$/.test(name)) expect(value, name).toBeNull();
    expect(mesh.geometry).not.toBe(other.facility.geometry); expect(mesh.material).not.toBe(other.facility.material);
  });

  it('preserves the 88 unchanged original module meshes, including Kibo hull, cap and rails, byte for byte', () => {
    // Captured from source 06e60c641d98ab0b21698ec5a332d74978c5c90dcc4ed5015965c17c95717a85
    // with real Three r128 and unrelated canvas painters omitted exactly as above.
    // The Quest pass replaces exactly its 8 old null-interior records. The
    // former 96-record digest was 1527af0fc609508eab4b2e2dbb7f06151c023ca1ea18c882eddda2ff4dd5d7c2.
    // This 88-record digest was derived from the untouched e283ef31fa6984542643b9795ec326dae733ddf6580add00237014ea36e2967a
    // baseline, excluding only those Quest-owned records, never the candidate.
    const context = fixture(), record = legacyGeometryRecord(context), expected = 'cc4a4714c74d0821bf5e86afc16dbf9cd674206024c8651168bb6bbbd5e34f74';
    expect(record).toHaveLength(88);
    expect(createHash('sha256').update(JSON.stringify(record)).digest('hex')).toBe(expected);
    const corrupted = structuredClone(record); corrupted.find(item => item.id === 'kibo').position[0] += .01;
    expect(createHash('sha256').update(JSON.stringify(corrupted)).digest('hex')).not.toBe(expected);
    const hull = context.clickable.find(mesh => mesh._issId === 'kibo');
    expect(hull.position.toArray()).toEqual([-1.5, 0, -3.4]); expect(hull.rotation.z).toBe(Math.PI / 2);
    expect(hull.geometry.parameters).toMatchObject({ radiusTop: .6, radiusBottom: .6, height: 2, radialSegments: 32, openEnded: true });
  });

  it('keeps a strict separating gap from every actual array vertex over all allowed joint angles', () => {
    const context = fixture();
    Object.assign(context, { arrayFrontMap: null, arrayBackMap: null, issRosaCanvas: () => null });
    const start = source.indexOf('          var wings = []', assemblyEnd), end = source.indexOf('          // Thermal hardware:', start);
    if (start < 0 || end < start) throw new Error('Array assembly missing');
    runInNewContext(source.slice(start, end), context); context.station.updateMatrixWorld(true);
    context.station.traverse(object => { if (object.geometry) keep(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(keep); });
    const platformMin = new THREE.Box3().setFromObject(context.facility).min.x;
    let nearest = -Infinity;
    for (const wing of context.wings.filter(wing => wing.position.x < 0)) {
      const inverse = wing.matrixWorld.clone().invert();
      wing.traverse(mesh => {
        if (!mesh.geometry) return;
        for (const point of positions(mesh.geometry)) {
          point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
          // For Rx(alpha) Rz(feather), X is independent of alpha. The exact
          // maximum of x*cos(f)-y*sin(f) occurs at an endpoint or atan2(-y,x).
          const critical = Math.atan2(-point.y, point.x), angles = [-Math.PI / 2, Math.PI / 2];
          if (critical >= -Math.PI / 2 && critical <= Math.PI / 2) angles.push(critical);
          for (const angle of angles) nearest = Math.max(nearest, wing.position.x + point.x * Math.cos(angle) - point.y * Math.sin(angle));
        }
      });
    }
    expect(nearest).toBeCloseTo(-3.1109812635262504, 12);
    expect(platformMin - nearest).toBeGreaterThan(.11);
    // This guard would reject an otherwise plausible outboard deck extension.
    expect(-3.12 - nearest).toBeLessThan(0);
  });

  it('picks the physical platform through the science branch without changing module discovery', () => {
    const context = fixture(), mesh = context.facility;
    mesh.geometry.computeBoundingBox();
    const bounds = new THREE.Box3().setFromObject(mesh), center = bounds.getCenter(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(46, 1.6, .01, 100);
    camera.position.copy(center).add(new THREE.Vector3(-.2, .8, -1.4)); camera.lookAt(center); camera.updateMatrixWorld(true);
    Object.assign(context, { camera, dragTravel: 0, gestureMultiple: false, visitorPickers: [], mouseV: new THREE.Vector2(), raycaster: new THREE.Raycaster(),
      onLeave: vi.fn(), upd: vi.fn(), markSeen: vi.fn(), awardXP: vi.fn(), announceToSR: vi.fn(),
      cv: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 500 }), _issFitCamera: vi.fn() } });
    context.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    expect(context.raycaster.intersectObjects(context.clickable.concat(context.moduleCapPickers), false)[0].object).toBe(mesh);
    runInNewContext(namedFunction('pick') + '\npick({clientX:400,clientY:250,button:0});', context);
    expect(context.cv._issFitCamera).toHaveBeenCalledExactlyOnceWith('kibo-ef'); expect(context.onLeave).toHaveBeenCalled();
    expect(context.upd).not.toHaveBeenCalled(); expect(context.markSeen).not.toHaveBeenCalled(); expect(context.awardXP).not.toHaveBeenCalled();
  });

  it('keeps focused external hardware visible in cutaway and releases its resources once', () => {
    const context = fixture(), mesh = context.facility, colour = mesh.material.color.getHex(), disposed = [];
    Object.assign(context, { cv: { _issWantSel: 'unity', _issCutaway: true }, cameraFocusId: 'kibo-ef', cameraMinDistance: 1 });
    for (const daylight of [1, 0, .5]) {
      updateDetails(context, daylight); expect(mesh.material.opacity).toBe(1); expect(mesh.material.depthWrite).toBe(true);
      expect(mesh.material.emissive.getHex()).toBe(0); expect(mesh.material.color.getHex()).toBe(colour);
    }
    context.cameraFocusId = null; updateDetails(context); expect(mesh.material.opacity).toBe(.05); expect(mesh.material.depthWrite).toBeFalsy();
    context.cv._issWantSel = 'kibo'; updateDetails(context); expect(mesh.material.opacity).toBe(1);
    [mesh.geometry, mesh.material].forEach(part => part.addEventListener('dispose', () => disposed.push(part.uuid)));
    const start = source.indexOf('var geometries = new Set()', assemblyEnd), end = source.indexOf('renderer.dispose();', start) + 'renderer.dispose();'.length;
    context.planetScene = new THREE.Scene(); context.renderer = { dispose: vi.fn() };
    runInNewContext(source.slice(start, end), context);
    expect(disposed).toHaveLength(2); expect(new Set(disposed).size).toBe(2); expect(context.renderer.dispose).toHaveBeenCalledOnce();
    expect(context.setLabToolData).not.toHaveBeenCalled();
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
    stationEnvelope: { center: new THREE.Vector3(0, 1, 0), radius: 9 },
    armBase: new THREE.Vector3(0, 2, -1), armVelocity: { enabled: false },
    wings: [{}, {}, { position: new THREE.Vector3(4, 2, -1) }], arrayFocus: { visible: false },
    finishJointDrag: vi.fn(), finishArmDrag: vi.fn(), finishMotionDrag: vi.fn(),
    onUp: vi.fn(), onLeave: vi.fn(), syncCameraHUD: vi.fn(), announceToSR: vi.fn(), upd: vi.fn(),
    __alloT: (key, fallback) => fallback,
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
function outward(context) { return new THREE.Vector3(-1, 0, 0).transformDirection(context.facility.matrixWorld); }
function offset(context) { return context.camera.position.clone().sub(context.cameraTarget); }

describe('Kibo platform inspection camera', () => {
  it('uses the actual transformed sphere and complete portrait framing without enlarging it to the old radius floor', () => {
    for (const aspect of [1.6, .7]) {
      const context = cameraFixture(aspect); context.station.rotation.set(.25, -.3, .18);
      context.cv._issFitCamera('kibo-ef');
      const sphere = new THREE.Box3().setFromObject(context.facility).getBoundingSphere(new THREE.Sphere());
      expect(context.cameraTarget.distanceTo(sphere.center)).toBeLessThan(1e-12);
      expect(sphere.radius).toBeLessThan(1); expect(context.cameraFitResult.radius).toBeCloseTo(sphere.radius, 12);
      expect(context.cameraFocusId).toBe('kibo-ef'); expect(context.cameraFitMode).toBe('kibo-ef');
      expect(context.cameraMinDistance).toBe(1); expect(context.cameraMaxDistance).toBe(3.6);
      expect(offset(context).dot(outward(context))).toBeGreaterThanOrEqual(.08 * offset(context).length() - 1e-11);
      for (const point of positions(context.facility.geometry)) {
        const ndc = point.applyMatrix4(context.facility.matrixWorld).project(context.camera);
        expect(Math.abs(ndc.x)).toBeLessThan(1); expect(Math.abs(ndc.y)).toBeLessThan(1);
        expect(ndc.z).toBeGreaterThan(-1); expect(ndc.z).toBeLessThan(1);
      }
      expect(context.cv._issWantSel).toBe('unity'); expect(context.upd).not.toHaveBeenCalled();
    }
  });

  it('preserves direction on resize and keeps the exterior guard after zoom clears the fit mode', () => {
    const context = cameraFixture(); context.station.rotation.set(.25, -.3, .18);
    context.cv._issFitCamera('kibo-ef'); context.cv._issCameraOrbit(.25, -.15);
    const direction = offset(context).normalize();
    context.camera.aspect = .7; context.camera.updateProjectionMatrix(); context.cv._issFitCamera('kibo-ef', true);
    expect(offset(context).normalize().distanceTo(direction)).toBeLessThan(1e-11);
    for (const [factor, distance] of [[.001, 1], [1000, 3.6]]) {
      context.cv._issCameraZoom(factor);
      expect(context.cameraFitMode).toBeNull(); expect(context.cameraFocusId).toBe('kibo-ef'); expect(offset(context).length()).toBeCloseTo(distance, 11);
      for (let i = 0; i < 60; i++) {
        context.cv._issCameraOrbit(i % 2 ? .8 : -.4, i < 30 ? -.09 : .09);
        const delta = offset(context);
        expect(delta.length()).toBeGreaterThanOrEqual(1 - 1e-11); expect(delta.length()).toBeLessThanOrEqual(3.6 + 1e-11);
        expect(delta.dot(outward(context))).toBeGreaterThanOrEqual(.08 * delta.length() - 1e-11);
        expect(context.camera.position.y).toBeGreaterThanOrEqual(-3.8 - 1e-11);
      }
    }
  });

  it('makes the adversarial orbit oracle detect a missing exterior-normal guard', () => {
    const context = cameraFixture(); context.cv._issFitCamera('kibo-ef'); context.cv._issCameraZoom(.001);
    context.issMapCameraPose = (position, target, options) => cameraMath.pose(position, target, { ...options, outwardNormal: null });
    let leastProjection = Infinity;
    for (let i = 0; i < 60; i++) {
      context.cv._issCameraOrbit(.12, 0);
      leastProjection = Math.min(leastProjection, offset(context).normalize().dot(outward(context)));
    }
    expect(leastProjection).toBeLessThan(-.2);
  });

  it('stays above Earth at the former far-zoom floor counterexample', () => {
    function startEquatorial(context) {
      context.cv._issFitCamera('kibo-ef');
      const delta = offset(context), yaw = Math.atan2(delta.x, delta.z), polar = Math.acos(delta.y / delta.length());
      context.cv._issCameraOrbit(-Math.PI / 2 - yaw, Math.PI / 2 - polar);
      expect(offset(context).normalize().distanceTo(new THREE.Vector3(-1, 0, 0))).toBeLessThan(1e-12);
    }
    const context = cameraFixture(); startEquatorial(context); context.cv._issCameraZoom(1000);
    context.cv._issCameraOrbit(Math.PI, Math.PI / 2);
    expect(context.camera.position.y).toBeGreaterThanOrEqual(-3.8 - 1e-11);
    expect(offset(context).length()).toBeLessThanOrEqual(3.6 + 1e-11);
    expect(offset(context).dot(outward(context))).toBeGreaterThanOrEqual(.08 * offset(context).length() - 1e-11);
    // The former 4-unit cap is a real failure fixture, not an arbitrary limit.
    const former = cameraFixture(); startEquatorial(former); former.cameraMaxDistance = 4; former.cv._issCameraZoom(1000);
    former.cv._issCameraOrbit(Math.PI, Math.PI / 2);
    expect(former.camera.position.y).toBeLessThan(-3.8);
  });

  it('leaves platform inspection on legacy view actions without changing selection or simulation', () => {
    for (const action of ['focus', 'pan', 'home', 'station', 'array']) {
      const context = cameraFixture(); context.cv._issCutaway = true; context.cv._issFitCamera('kibo-ef');
      updateDetails(context); expect(context.facility.material.opacity).toBe(1);
      if (action === 'focus') context.cv._issFocusModule('kibo');
      else if (action === 'pan') context.cv._issCameraPan(32, 0);
      else if (action === 'home') context.cv._issSetView('overview');
      else context.cv._issFitCamera(action);
      expect(context.cameraFocusId).not.toBe('kibo-ef'); expect(context.cameraFitMode).not.toBe('kibo-ef');
      updateDetails(context); expect(context.facility.material.opacity).toBe(.05);
      expect(context.cv._issWantSel).toBe('unity'); expect(context.cv._issCutaway).toBe(true); expect(context.upd).not.toHaveBeenCalled();
      const position = context.camera.position.toArray(); context.cleaned = true; context.cv._issFitCamera('kibo-ef');
      expect(context.camera.position.toArray()).toEqual(position);
    }
  });
});

const require = createRequire(import.meta.url), modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react')), ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React, save = vi.fn();
const Study = runInNewContext(namedFunction('IssKiboStudy') + '\nIssKiboStudy;', { document, setLabToolData: save });
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
  return { host, render, state: () => host.querySelector('[data-iss-kibo-study]'),
    zone(value) { act(() => host.querySelector(`[data-iss-kibo-environment="${value}"]`).click()); } };
}
function addCamera(view) {
  const stage = document.createElement('div'); stage.className = 'iss-station-stage'; stage.scrollIntoView = vi.fn();
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas._issFitCamera = vi.fn();
  stage.appendChild(canvas); view.host.appendChild(stage); return { stage, canvas };
}

describe('Kibo environment and assembly study', () => {
  it('synchronizes native environment controls, diagram regions and the accessible explanation', () => {
    const view = mountStudy(), ids = ['inside', 'airlock', 'outside'];
    expect(view.host.querySelectorAll('[data-iss-kibo-zone]')).toHaveLength(3);
    for (const selected of [...ids, 'inside']) {
      view.zone(selected); expect(view.state().dataset.issKiboStudy).toBe(selected);
      for (const id of ids) {
        const button = view.host.querySelector(`[data-iss-kibo-environment="${id}"]`), zone = view.host.querySelector(`[data-iss-kibo-zone="${id}"]`);
        expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.getAttribute('aria-pressed')).toBe(String(selected === id));
        expect(zone.getAttribute('data-selected')).toBe(String(selected === id));
      }
      const label = view.host.querySelector(`[data-iss-kibo-environment="${selected}"]`).textContent;
      expect(view.host.querySelector('[data-iss-kibo-description]').textContent).toContain(label);
      expect(view.host.querySelector('svg[role="img"]').getAttribute('aria-label')).toContain(label);
    }
  });

  it('keeps zone choices local to each study without changing physics, saved data or camera state', () => {
    const data = Object.freeze({ selModule: 'unity', mapPhase: 61, mapPlaying: true, mapCutaway: true, seenModules: Object.freeze(['zarya']) });
    const onChange = vi.fn(), updateData = vi.fn(), a = mountStudy({ data, onChange, updateData }), b = mountStudy({ data });
    const aCamera = addCamera(a), bCamera = addCamera(b), original = JSON.stringify(data);
    a.zone('outside'); a.render();
    expect(a.state().dataset.issKiboStudy).toBe('outside'); expect(b.state().dataset.issKiboStudy).toBe('inside');
    expect(JSON.stringify(data)).toBe(original); expect(onChange).not.toHaveBeenCalled(); expect(updateData).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    expect(aCamera.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
  });

  it('opens only its own exterior inspection and tolerates an absent local map canvas', () => {
    const a = mountStudy(), b = mountStudy(), aCamera = addCamera(a), bCamera = addCamera(b);
    act(() => a.host.querySelector('[data-iss-kibo-inspect]').click());
    expect(aCamera.canvas._issFitCamera).toHaveBeenCalledExactlyOnceWith('kibo-ef'); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(aCamera.canvas); expect(aCamera.stage.scrollIntoView).toHaveBeenCalledOnce();
    aCamera.stage.remove(); aCamera.canvas._issFitCamera.mockClear();
    act(() => a.host.querySelector('[data-iss-kibo-inspect]').click());
    expect(aCamera.canvas._issFitCamera).not.toHaveBeenCalled(); expect(bCamera.canvas._issFitCamera).not.toHaveBeenCalled();
  });

  it('distinguishes equipment transfer, services, real interface counts and dated assembly from the model', () => {
    const view = mountStudy();
    view.zone('inside'); expect(view.host.querySelector('[data-iss-kibo-description]').textContent).toMatch(/microgravity.*outside/i);
    view.zone('airlock'); expect(view.host.querySelector('[data-iss-kibo-description]').textContent).toMatch(/large external payloads were not passed through/i);
    view.zone('outside'); expect(view.host.querySelector('[data-iss-kibo-description]').textContent).toMatch(/power, data and coolant/i);
    expect(view.host.textContent).toMatch(/six interface markers.*schematic/i); expect(view.host.textContent).toMatch(/not a count of 12 available science bays/i);
    expect(view.host.textContent).toMatch(/JEMRMS is separate from Canadarm2/i);
    const dates = [...view.host.querySelectorAll('dt')].map(node => node.textContent);
    expect(dates).toEqual(['31 May 2008', '15 July 2009', '18–19 July 2009']);
    expect(view.host.textContent).toMatch(/23:40 UTC.*18 July.*08:40 Japan Standard Time.*19 July/i);
    const links = [...view.host.querySelectorAll('a')]; expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(['humans-in-space.jaxa.jp', 'iss.jaxa.jp', 'www.nasa.gov']).toContain(new URL(link.href).hostname);
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

// Product functions always come from the shipped source. Historical truss
// digests below are fixed evidence, not a fallback implementation.
const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;
function expression(start) {
  if (start < 0) throw new Error('Required AMS integration is absent');
  const node = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
  return source.slice(node.start, node.end);
}
function namedFunction(name) { return expression(source.indexOf('function ' + name + '(')); }
const geometryFactory = new Function('return ' + namedFunction('issAmsGeometry'))();
const trussFactory = new Function('return ' + namedFunction('issTrussHardwareGeometry'))();
const trackModel = new Function('return ' + namedFunction('issAmsTrack'))();
const resources = new Set();
function keep(resource) {
  if (!resources.has(resource)) {
    resources.add(resource);
    resource.addEventListener('dispose', () => resources.delete(resource));
  }
  return resource;
}
afterEach(() => { for (const resource of [...resources]) resource.dispose(); });
function digest(attribute) {
  const array = attribute.array;
  return createHash('sha256').update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest('hex');
}

describe('AMS-02 instrument geometry', () => {
  it('returns fresh bounded nonindexed geometry with finite unit normals and vertex colours', () => {
    const geometry = keep(geometryFactory(THREE)), other = keep(geometryFactory(THREE));
    expect(geometry.isBufferGeometry).toBe(true);
    expect(geometry.index).toBeNull(); expect(geometry).not.toBe(other);
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), c = geometry.getAttribute('color');
    expect(p.count % 3).toBe(0); expect(p.count / 3).toBeLessThan(2000);
    expect(p.count).toBeGreaterThan(150);
    for (const a of [n, c]) expect(a.count).toBe(p.count);
    for (const a of [p, n, c]) expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
    expect(Array.from(c.array).every(value => value >= 0 && value <= 1)).toBe(true);
    const colours = new Set(Array.from({ length: c.count }, (_, i) => [c.getX(i), c.getY(i), c.getZ(i)].join(',')));
    expect(colours.size).toBeGreaterThanOrEqual(4);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const box = geometry.boundingBox;
    for (const axis of ['x', 'z']) {
      expect(box.min[axis]).toBeGreaterThanOrEqual(-.2);
      expect(box.max[axis]).toBeLessThanOrEqual(.2);
      expect(box.max[axis] - box.min[axis]).toBeGreaterThan(.25);
    }
    expect(box.min.y).toBeGreaterThanOrEqual(-1e-7);
    expect(box.max.y).toBeGreaterThan(.25); expect(box.max.y).toBeLessThan(.4);
    expect(geometry.boundingSphere.radius).toBeGreaterThan(0);
    const original = other.getAttribute('position').getX(0);
    p.setX(0, 50);
    expect(other.getAttribute('position').getX(0)).toBe(original);
    expect(other.getAttribute('color').array).not.toBe(c.array);
  });

  it('has a covered zenith face rather than an open optical bore', () => {
    const geometry = keep(geometryFactory(THREE)), material = keep(new THREE.MeshStandardMaterial({ vertexColors: true }));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    for (const [x, z] of [[0, 0], [.035, 0], [-.035, 0], [0, .035], [0, -.035]]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0));
      const hits = ray.intersectObject(mesh);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].point.y).toBeGreaterThan(.25);
      expect(hits[0].face.normal.y).toBeGreaterThan(.5);
    }
  });

  it('preserves every non-AMS truss position, normal and colour byte', () => {
    // Generated with real Three r128 from source-before.js SHA256
    // d040fc1288d63fa6d398ef32b5b8dd299577ba26cefc04629773c54c2812b701,
    // deleting only the old AMS cylinder/add and its two box calls.
    const positions = [
      [.9, '1e7bfd9c458359f27419a2fcd4fbf4346ce6b10b90440b7b4c00d315215e90a3'],
      [.95, 'f7ce1a094c9998b1a56881fd7a8856a31abe9f4d44ab18065357733dba800e68'],
      [1.1, 'aa91e3ee8073430f70d7cc76e23d67dd764f1255eadec53a5e32f0ce92159ee6']
    ];
    for (const [height, hash] of positions) {
      const geometry = keep(trussFactory(THREE, height));
      expect(geometry.userData.partCount).toBe(46);
      expect(Object.keys(geometry.attributes).sort()).toEqual(['color', 'normal', 'position']);
      for (const a of Object.values(geometry.attributes)) expect(a.count).toBe(3168);
      expect(digest(geometry.getAttribute('position'))).toBe(hash);
      expect(digest(geometry.getAttribute('normal'))).toBe('e8a3061d63aca86d0e9b4ef55937478baf034dc41a6cdd82dec3b7f35a9b0068');
      expect(digest(geometry.getAttribute('color'))).toBe('27b21b1b18c23b12a883d944fbb8daa483f28ff06366101ff0ff2d433ae54fca');
    }
  });
});

describe('AMS uniform-field teaching track', () => {
  it('follows a circle with the correct Lorentz-force direction for both charge signs', () => {
    for (const charge of [-1, 1]) for (const momentum of [1, 2.5, 5]) {
      const result = trackModel({ charge, momentum });
      expect(result.charge).toBe(charge); expect(result.momentum).toBe(momentum);
      expect(result.radius).toBe(190 * momentum);
      expect(result.points).toHaveLength(49);
      expect(result.path).toMatch(/^M/); expect(result.path).not.toMatch(/NaN|Infinity/);
      const pathCoordinates = result.path.match(/-?\d+(?:\.\d+)?/g).map(Number);
      expect(pathCoordinates).toHaveLength(98);
      result.points.forEach((point, index) => {
        const [x, y] = Array.isArray(point) ? point : [point.x, point.y];
        const depth = 160 * index / 48;
        expect(y).toBeCloseTo(45 + depth, 12);
        expect(Math.abs(pathCoordinates[index * 2] - x)).toBeLessThanOrEqual(.000500001);
        expect(Math.abs(pathCoordinates[index * 2 + 1] - y)).toBeLessThanOrEqual(.000500001);
        // Circle centre lies left for positive charge: downward motion in an
        // out-of-page field bends left in this screen-coordinate convention.
        expect(Math.hypot(x - (320 - charge * result.radius), y - 45)).toBeCloseTo(result.radius, 10);
        if (index) expect(charge * (320 - x)).toBeGreaterThan(0);
      });
      expect(result.deflection).toBe(Math.abs(result.points[48].x - 320));
      expect(result.bend).toBe(charge === 1 ? 'left' : 'right');
    }
  });

  it('mirrors the charge tracks and decreases deflection as momentum increases', () => {
    let previous = Infinity;
    for (const momentum of [1, 1.25, 2, 3, 4, 5]) {
      const plus = trackModel({ charge: 1, momentum }), minus = trackModel({ charge: -1, momentum });
      for (let i = 0; i < plus.points.length; i++) {
        const a = plus.points[i], b = minus.points[i];
        const [ax, ay] = Array.isArray(a) ? a : [a.x, a.y], [bx, by] = Array.isArray(b) ? b : [b.x, b.y];
        expect(ax + bx).toBeCloseTo(640, 12); expect(ay).toBe(by);
      }
      expect(Math.abs(plus.deflection)).toBeCloseTo(Math.abs(minus.deflection), 12);
      expect(Math.abs(plus.deflection)).toBeGreaterThan(0);
      expect(Math.abs(plus.deflection)).toBeLessThan(previous);
      previous = Math.abs(plus.deflection);
    }
  });

  it('bounds malformed inputs and keeps every returned point finite without mutating input', () => {
    const input = Object.freeze({ charge: -1, momentum: 2.75 });
    expect(trackModel(input).momentum).toBe(2.75);
    expect(input).toEqual({ charge: -1, momentum: 2.75 });
    const a = trackModel(input), b = trackModel(input);
    a.points[0].x = 900;
    expect(b.points[0].x).toBe(320);
    for (const options of [undefined, null, {}, { charge: 0, momentum: NaN },
      { charge: Infinity, momentum: Infinity }, { charge: 'bad', momentum: 'bad' },
      { charge: 1, momentum: -100 }, { charge: -1, momentum: 100 }]) {
      const result = trackModel(options);
      expect([-1, 1]).toContain(result.charge);
      expect(result.momentum).toBeGreaterThanOrEqual(1); expect(result.momentum).toBeLessThanOrEqual(5);
      expect(Number.isFinite(result.radius)).toBe(true); expect(Number.isFinite(result.deflection)).toBe(true);
      expect(result.points).toHaveLength(49);
      for (const point of result.points) expect((Array.isArray(point) ? point : [point.x, point.y]).every(Number.isFinite)).toBe(true);
      expect(result.path).not.toMatch(/NaN|Infinity/);
    }
    expect(trackModel({ momentum: -100 }).momentum).toBe(1);
    expect(trackModel({ momentum: 100 }).momentum).toBe(5);
  });
});

const modules = runInNewContext(expression(source.indexOf('[', source.indexOf('  var MODULES ='))), { ISS_TRUSS_Y: .9 });
const assemblyStart = source.lastIndexOf('          var station =', source.indexOf('MODULES.forEach(function (m)'));
const assemblyEnd = source.indexOf('          // Shared cell and insulation atlases', assemblyStart);
if (assemblyStart < 0 || assemblyEnd < assemblyStart) throw new Error('Station module assembly block missing');
const assembly = source.slice(assemblyStart, assemblyEnd);
const fitStart = source.indexOf('cv._issFitCamera = function');
const fitFunction = expression(source.indexOf('function', fitStart));
const cameraFit = new Function(namedFunction('issFlightNumber') + '\n' + namedFunction('issMapCameraFit') + '\nreturn issMapCameraFit;')();
const updateStart = source.indexOf('            var lampOn =', assemblyEnd);
const updateEnd = source.indexOf('            if (curSel)', updateStart);
const cleanupStart = source.indexOf('var geometries = new Set()', assemblyEnd);
const cleanupEnd = source.indexOf('renderer.dispose();', cleanupStart) + 'renderer.dispose();'.length;
if (updateStart < 0 || updateEnd < updateStart || cleanupStart < 0 || cleanupEnd < cleanupStart) {
  throw new Error('Station detail update or resource cleanup block missing');
}
function stationFixture() {
  const context = {
    THREE, MODULES: modules, ISS_TRUSS_Y: .9, scene: new THREE.Scene(),
    issAmsGeometry: geometryFactory, issTrussHardwareGeometry: trussFactory,
    issOpenTrussGeometry: new Function('return ' + namedFunction('issOpenTrussGeometry'))(),
    issModuleHardwareGeometry: new Function('return ' + namedFunction('issModuleHardwareGeometry'))(),
    issDestinyWindowGeometry: new Function('return ' + namedFunction('issDestinyWindowGeometry'))(),
    issCupolaGeometry: new Function('return ' + namedFunction('issCupolaGeometry'))(),
    issKiboFacilityGeometry: new Function('return ' + namedFunction('issKiboFacilityGeometry'))(),
    issCommsGeometry: new Function('return ' + namedFunction('issCommsGeometry'))(),
    issQuestGeometry: new Function('return ' + namedFunction('issQuestGeometry'))(),
    issHullCanvas: () => null, issModuleEndcapCanvas: () => null,
    issTexture: () => { throw new Error('AMS assembly must not allocate a texture'); }
  };
  runInNewContext(assembly, context);
  context.scene.updateMatrixWorld(true);
  context.scene.traverse(object => {
    if (object.geometry) keep(object.geometry);
    if (object.material) keep(object.material);
  });
  context.ams = context.scene.getObjectByName('iss-ams02-instrument');
  return context;
}
function fitFixture(context, aspect = 1.6) {
  Object.assign(context, {
    cv: {}, cleaned: false, camera: new THREE.PerspectiveCamera(46, aspect, .01, 1000),
    cameraTarget: new THREE.Vector3(0, 0, 1), cameraFocusId: null, cameraPanned: true,
    cameraFitMode: null, cameraFitResult: null, cameraView: 'overview', cameraMinDistance: 3.2, cameraMaxDistance: 30,
    visitorTargets: Object.create(null), radiatorTargets: Object.create(null),
    stationEnvelope: { center: new THREE.Vector3(0, 1, 0), radius: 9 },
    armBase: new THREE.Vector3(0, 2, -1), armVelocity: { enabled: false },
    wings: [{}, {}, { position: new THREE.Vector3(4, 2, -1) }], arrayFocus: { visible: false },
    onUp: vi.fn(), onLeave: vi.fn(), announceToSR: vi.fn(), _lastFrameSig: 'before',
    __alloT: (key, fallback) => fallback,
    __alloFill: (text, values) => text.replace(/\{([^}]+)\}/g, (_, key) => String(values[key])),
    issMapCameraFit: cameraFit
  });
  context.camera.position.set(8, 4, 10);
  context.moveCamera = vi.fn((destination, target) => {
    context.camera.position.copy(destination); context.cameraTarget.copy(target);
  });
  runInNewContext('cv._issFitCamera = ' + fitFunction + ';', context);
  return context;
}

describe('AMS renderer integration', () => {
  it('mounts one private untextured instrument on S3 and registers it as a truss detail and picker', () => {
    const context = stationFixture(), mesh = context.ams;
    expect(mesh?.isMesh).toBe(true);
    expect(context.station.children.filter(item => item.name === mesh.name)).toHaveLength(1);
    expect(mesh.position.toArray()).toEqual([2.24, 1.1, -1.6]);
    expect(mesh._issParentId).toBe('truss'); expect(mesh._issScienceId).toBe('ams02');
    expect(context.moduleDetails).toContain(mesh); expect(context.moduleCapPickers).toContain(mesh);
    expect(context.clickable).not.toContain(mesh);
    expect(mesh.material.isMeshStandardMaterial).toBe(true);
    expect(mesh.material.vertexColors).toBe(true); expect(mesh.material.emissive.getHex()).toBe(0);
    for (const [name, value] of Object.entries(mesh.material)) if (/Map$/.test(name) || name === 'map') expect(value, name).toBeNull();
    expect(context.moduleDetails.filter(item => item.material === mesh.material)).toEqual([mesh]);
    const hull = context.clickable.find(item => item._issId === 'truss');
    expect(hull.position.toArray()).toEqual([0, .9, -1.6]);
  });

  it('fits its actual transformed bounds and preserves direction on resize without discovery writes', () => {
    for (const aspect of [1.6, .7]) {
      const context = fitFixture(stationFixture(), aspect);
      context.upd = vi.fn(); context.markSeen = vi.fn();
      context.station.rotation.set(.25, -.3, .18);
      context.cv._issFitCamera('ams02');
      const bounds = new THREE.Box3().setFromObject(context.ams);
      expect(context.cameraTarget.distanceTo(bounds.getCenter(new THREE.Vector3()))).toBeLessThan(1e-10);
      expect(context.cameraFitResult.radius).toBeCloseTo(bounds.getBoundingSphere(new THREE.Sphere()).radius, 10);
      expect(context.cameraMinDistance).toBe(1);
      expect(context.cameraFitMode).toBe('ams02'); expect(context.cameraFocusId).toBe('ams02');
      expect(context.cameraPanned).toBe(false); expect(context.arrayFocus.visible).toBe(false);
      const direction = new THREE.Vector3(.7, .5, -.4);
      context.camera.position.copy(context.cameraTarget).add(direction);
      context.cv._issFitCamera('ams02', true);
      expect(context.camera.position.clone().sub(context.cameraTarget).normalize().distanceTo(direction.normalize())).toBeLessThan(1e-10);
      expect(context.upd).not.toHaveBeenCalled(); expect(context.markSeen).not.toHaveBeenCalled();
      context.cleaned = true; context.moveCamera.mockClear(); context.cv._issFitCamera('ams02');
      expect(context.moveCamera).not.toHaveBeenCalled();
    }
  });

  it('raycasts the instrument into inspection without selecting a module or awarding discovery', () => {
    const context = fitFixture(stationFixture());
    const center = new THREE.Box3().setFromObject(context.ams).getCenter(new THREE.Vector3());
    context.camera.position.copy(center).add(new THREE.Vector3(.3, 1, .4));
    context.camera.lookAt(center); context.camera.updateMatrixWorld(true);
    Object.assign(context, { dragTravel: 0, gestureMultiple: false, visitorPickers: [],
      mouseV: new THREE.Vector2(), raycaster: new THREE.Raycaster(), upd: vi.fn(), markSeen: vi.fn(), awardXP: vi.fn() });
    context.cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
    const fit = context.cv._issFitCamera;
    context.cv._issFitCamera = vi.fn(fit);
    context.raycaster.setFromCamera(new THREE.Vector2(0, 0), context.camera);
    const hits = context.raycaster.intersectObjects(context.clickable.concat(context.moduleCapPickers), false);
    expect(hits[0].object).toBe(context.ams);
    runInNewContext(namedFunction('pick') + '\npick({clientX:400,clientY:250,button:0});', context);
    expect(context.cv._issFitCamera).toHaveBeenCalledExactlyOnceWith('ams02');
    expect(context.cameraFocusId).toBe('ams02'); expect(context.onLeave).toHaveBeenCalled();
    expect(context.upd).not.toHaveBeenCalled(); expect(context.markSeen).not.toHaveBeenCalled(); expect(context.awardXP).not.toHaveBeenCalled();
    context.cv._issFitCamera.mockClear(); context.dragTravel = 7;
    runInNewContext('pick({clientX:400,clientY:250,button:0});', context);
    expect(context.cv._issFitCamera).not.toHaveBeenCalled();
  });

  it('keeps a focused instrument visible in cutaway and never brightens its material in eclipse', () => {
    const context = stationFixture(), mesh = context.ams;
    const color = mesh.material.color.getHex(), vertexColours = digest(mesh.geometry.getAttribute('color'));
    Object.assign(context, { earthLightsMat: null, earthExposureMat: null, milkyWay: { userData: { starMaterial: {} } },
      setLabToolData() {}, cv: { _issWantSel: 'unity', _issCutaway: true }, cameraFocusId: 'ams02' });
    for (const daylight of [1, 0, .5]) {
      context.daylight01 = daylight;
      runInNewContext(source.slice(updateStart, updateEnd), context);
      expect(mesh.material.color.getHex()).toBe(color);
      expect(digest(mesh.geometry.getAttribute('color'))).toBe(vertexColours);
      expect(mesh.material.emissive.getHex()).toBe(0); expect(mesh.material.opacity).toBe(1);
      expect(mesh.material.depthWrite).toBe(true);
    }
    context.cameraFocusId = null;
    runInNewContext(source.slice(updateStart, updateEnd), context);
    expect(mesh.material.opacity).toBe(.05);
  });

  it('releases the instrument geometry and private material through normal scene cleanup', () => {
    const context = stationFixture(), disposed = [];
    for (const resource of [context.ams.geometry, context.ams.material]) resource.addEventListener('dispose', () => disposed.push(resource.uuid));
    context.planetScene = new THREE.Scene(); context.renderer = { dispose: vi.fn() };
    runInNewContext(source.slice(cleanupStart, cleanupEnd), context);
    expect(disposed).toHaveLength(2); expect(new Set(disposed).size).toBe(2);
    expect(context.renderer.dispose).toHaveBeenCalledOnce();
  });
});

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React;
const save = vi.fn();
const Study = runInNewContext(namedFunction('IssAmsStudy') + '\nIssAmsStudy;', {
  document, issAmsTrack: trackModel, _issAmsStudyId: 0,
  __alloT: (key, fallback) => fallback,
  __alloFill: (text, values) => text.replace(/\{([^}]+)\}/g, (_, key) => String(values[key])),
  setLabToolData: save
});
const mounts = [];
let previousActEnvironment;
beforeAll(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(() => {
  for (const { root, host } of mounts.splice(0)) {
    host.querySelectorAll('style').forEach(style => style.remove());
    act(() => root.unmount()); host.remove();
  }
  save.mockClear();
});
function mountStudy(props = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounts.push({ root, host });
  const render = () => act(() => root.render(React.createElement(Study, { React, ...props })));
  render();
  return { host, render, state: () => host.querySelector('[data-iss-ams-study]'),
    charge(value) { act(() => host.querySelector(`[data-iss-ams-charge="${value}"]`).click()); },
    momentum(value) {
      const input = host.querySelector('[data-iss-ams-momentum]');
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  };
}

describe('AMS local particle study', () => {
  it('uses native charge and momentum controls to update both modeled paths', () => {
    const view = mountStudy();
    const slider = view.host.querySelector('[data-iss-ams-momentum]');
    expect(slider.tagName).toBe('INPUT'); expect(slider.type).toBe('range');
    expect(Number(slider.min)).toBe(1); expect(Number(slider.max)).toBe(5); expect(Number(slider.step)).toBe(.5);
    for (const charge of [-1, 1]) {
      const control = view.host.querySelector(`[data-iss-ams-charge="${charge}"]`);
      expect(control.tagName).toBe('BUTTON');
      view.charge(charge); view.momentum(charge === -1 ? 4.5 : 1);
      const momentum = charge === -1 ? 4.5 : 1;
      expect(Number(view.state().dataset.charge)).toBe(charge);
      expect(Number(view.state().dataset.momentum)).toBe(momentum);
      expect(control.getAttribute('aria-pressed')).toBe('true');
      expect(view.host.querySelector(`[data-iss-ams-charge="${-charge}"]`).getAttribute('aria-pressed')).toBe('false');
      expect(view.host.querySelector('[data-iss-ams-track="current"]').getAttribute('d'))
        .toBe(trackModel({ charge, momentum }).path);
      expect(view.host.querySelector('[data-iss-ams-track="opposite"]').getAttribute('d'))
        .toBe(trackModel({ charge: -charge, momentum }).path);
    }
  });

  it('keeps studies independent and never saves or alters station data', () => {
    const evidence = Object.freeze({ selModule: 'truss', seenModules: Object.freeze(['zarya']),
      mapPhase: 61, opsMinute: 38.25, mapPlaying: true });
    const onChange = vi.fn(), updateData = vi.fn();
    const a = mountStudy({ data: evidence, onChange, updateData }), b = mountStudy({ data: evidence });
    const initial = { charge: b.state().dataset.charge, momentum: b.state().dataset.momentum,
      path: b.host.querySelector('[data-iss-ams-track="current"]').getAttribute('d') };
    a.charge(-Number(initial.charge)); a.momentum(4.5);
    a.render();
    expect(a.state().dataset.charge).toBe(String(-Number(initial.charge)));
    expect(a.state().dataset.momentum).toBe('4.5');
    expect(b.state().dataset.charge).toBe(initial.charge); expect(b.state().dataset.momentum).toBe(initial.momentum);
    expect(b.host.querySelector('[data-iss-ams-track="current"]').getAttribute('d')).toBe(initial.path);
    expect(onChange).not.toHaveBeenCalled(); expect(updateData).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    expect(evidence).toEqual({ selModule: 'truss', seenModules: ['zarya'], mapPhase: 61, opsMinute: 38.25, mapPlaying: true });
  });

  it('associates unique labels, places nine idealized hits on the track and explains the model limits', () => {
    const a = mountStudy(), b = mountStudy();
    const slider = a.host.querySelector('[data-iss-ams-momentum]');
    expect(slider.id).not.toBe(b.host.querySelector('[data-iss-ams-momentum]').id);
    expect(a.host.querySelector(`label[for="${slider.id}"]`)).not.toBeNull();
    a.charge(-1); a.momentum(2.5);
    const svg = a.host.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toMatch(/out of the page/i);
    expect(svg.getAttribute('aria-label')).toMatch(/negative.*right/i);
    const hits = [...svg.querySelectorAll('circle')].filter(circle => Number(circle.getAttribute('r')) === 4);
    const modeled = trackModel({ charge: -1, momentum: 2.5 }).points.filter((_, i) => i % 6 === 0);
    expect(hits).toHaveLength(9);
    hits.forEach((hit, i) => {
      expect(Number(hit.getAttribute('cx'))).toBe(modeled[i].x);
      expect(Number(hit.getAttribute('cy'))).toBe(modeled[i].y);
    });
    expect(a.host.textContent).toMatch(/permanent magnet/i);
    expect(a.host.textContent).toMatch(/uniform field/i);
    expect(a.host.textContent).toMatch(/not measurements/i);
    expect(a.host.textContent).toMatch(/tracker.*carbon.dioxide cooling/i);
    expect(a.host.textContent).toMatch(/25 January 2020/);
    for (const link of a.host.querySelectorAll('a')) {
      expect(['ams02.space', 'www.nasa.gov']).toContain(new URL(link.href).hostname);
      expect(link.target).toBe('_blank');
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
  });
});

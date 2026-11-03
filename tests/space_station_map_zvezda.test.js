import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

const source = readFileSync(process.env.ISS_ZVEZDA_SOURCE || 'stem_lab/stem_tool_spacestation.js', 'utf8');
const start = source.indexOf('function issZvezdaSolarAssembly(');
if (start < 0) throw new Error('Zvezda solar assembly is absent');
const node = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
const build = runInNewContext(source.slice(node.start, node.end) + '\nissZvezdaSolarAssembly;');
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE, resources = new Set();
function keep(resource) { resources.add(resource); return resource; }
function assembly(texture = null) {
  const group = build(THREE, texture);
  group.traverse(part => { if (part.geometry) keep(part.geometry); for (const material of part.material ? [].concat(part.material) : []) keep(material); });
  return group;
}
afterEach(() => { for (const resource of resources) resource.dispose(); resources.clear(); });
function materials(group) { return new Set(group.children.flatMap(part => [].concat(part.material))); }
function bounds(part) { part.updateMatrixWorld(true); return new THREE.Box3().setFromObject(part); }
function pointAt(attribute, index) { return new THREE.Vector3().fromBufferAttribute(attribute, index); }

describe('Zvezda fixed schematic solar wings', () => {
  it('returns three physical meshes with two geometries and four private materials', () => {
    const a = assembly(), b = assembly();
    expect(a.name).toBe('iss-zvezda-solar-pair'); expect(a.userData.illustrative).toBe(true); expect(a.userData.fixedPose).toBe(true);
    expect(a.children.map(part => part.name)).toEqual(['iss-zvezda-solar-panel-1', 'iss-zvezda-solar-panel-2', 'iss-zvezda-solar-hardware']);
    expect(a.children.every(part => part.isMesh && part._issParentId === 'zvezda' && part.castShadow && part.receiveShadow)).toBe(true);
    expect(new Set(a.children.map(part => part.geometry)).size).toBe(2); expect(materials(a).size).toBe(4);
    expect(a.children[0].geometry).toBe(a.children[1].geometry); expect(a.children[0].material).toBe(a.children[1].material);
    for (const geometry of a.children.map(part => part.geometry)) expect(b.children.some(part => part.geometry === geometry)).toBe(false);
    for (const material of materials(a)) { expect(materials(b).has(material)).toBe(false); expect(material.transparent).toBe(true); expect(material.emissive.getHex()).toBe(0); }
    const original = b.children[0].geometry.attributes.position.getX(0);
    a.children[0].geometry.attributes.position.setX(0, 99); expect(b.children[0].geometry.attributes.position.getX(0)).toBe(original);
  });

  it('provides finite unit normals, full cell UVs and correctly facing front/back coatings', () => {
    const group = assembly(), panel = group.children[0];
    for (const geometry of new Set(group.children.map(part => part.geometry))) {
      const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
      expect(p.count).toBe(n.count); expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
      for (let i = 0; i < n.count; i++) expect(pointAt(n, i).length()).toBeCloseTo(1, 6);
      expect((geometry.index ? geometry.index.count : p.count) / 3).toBeLessThan(600);
    }
    const uv = panel.geometry.getAttribute('uv'), normal = panel.geometry.getAttribute('normal');
    expect(uv.count).toBe(panel.geometry.getAttribute('position').count);
    expect(Array.from(uv.array).every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
    for (const [slot, sign] of [[2, 1], [3, -1]]) {
      const face = panel.geometry.groups.find(group => group.materialIndex === slot);
      expect(face).toBeTruthy();
      const faceUvs = [];
      for (let i = face.start; i < face.start + face.count; i++) {
        const index = panel.geometry.index.getX(i); expect(normal.getY(index)).toBe(sign); faceUvs.push([uv.getX(index), uv.getY(index)]);
      }
      for (const axis of [0, 1]) { expect(Math.min(...faceUvs.map(value => value[axis]))).toBe(0); expect(Math.max(...faceUvs.map(value => value[axis]))).toBe(1); }
    }
    expect(panel.material[2]).not.toBe(panel.material[3]);
  });

  it('fits the agreed envelope and leaves clearance from Nauka, Progress and the full U.S. array sweep', () => {
    const group = assembly(), local = bounds(group);
    expect(local.min.x).toBeCloseTo(-3.6, 6); expect(local.max.x).toBeCloseTo(3.6, 6);
    expect(local.min.z).toBeCloseTo(-.55, 6); expect(local.max.z).toBeCloseTo(.55, 6);
    expect(local.min.y).toBeGreaterThanOrEqual(-.084); expect(local.max.y).toBeLessThanOrEqual(.084);
    for (const panel of group.children.slice(0, 2)) {
      const box = bounds(panel), near = Math.min(Math.abs(box.min.x), Math.abs(box.max.x)), far = Math.max(Math.abs(box.min.x), Math.abs(box.max.x));
      expect(near).toBeCloseTo(.65, 6); expect(far).toBeCloseTo(3.6, 6);
      expect(near - .55).toBeGreaterThan(.099); // Both the host and Nauka have radius .55.
    }
    const hardware = group.children[2].geometry, p = hardware.getAttribute('position');
    for (const part of hardware.userData.components) for (let i = part.start; i < part.start + part.count; i++) {
      const absX = Math.abs(p.getX(i));
      expect(absX).toBeGreaterThanOrEqual(.51999);
      if (absX < .55) expect(part.name).toMatch(/^mount-(hub|collar)-/);
    }
    expect(hardware.userData.components.filter(part => part.name.startsWith('bay-rib-'))).toHaveLength(4);
    group.position.set(0, 0, 4.6); const world = bounds(group);
    expect(world.min.z).toBeGreaterThan(-1.6 + 3.9); // Conservative full alpha/feather and iROSA envelope.
    expect(world.max.z).toBeLessThan(6.2); // Zvezda aft port; Progress is farther aft.
    expect(world.min.y).toBeGreaterThan(-3.8); // Shared Earth-side camera/scene floor.
  });

  it('borrows the existing texture without cloning, modifying or disposing it', () => {
    const texture = keep(new THREE.Texture()); texture.name = 'existing-progress-map'; texture.repeat.set(2, 3); texture.offset.set(.1, .2); texture.rotation = .25;
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; texture.encoding = THREE.sRGBEncoding;
    const snapshot = () => ({ name: texture.name, version: texture.version, repeat: texture.repeat.toArray(), offset: texture.offset.toArray(), rotation: texture.rotation, wrapS: texture.wrapS, wrapT: texture.wrapT, encoding: texture.encoding });
    const before = snapshot(), a = assembly(texture), b = assembly(texture); let disposed = 0;
    texture.addEventListener('dispose', () => disposed++);
    expect(a.children[0].material[2].map).toBe(texture); expect(b.children[1].material[2].map).toBe(texture);
    expect(a.children[0].material[2].color.getHex()).toBe(0xffffff);
    for (const material of materials(a)) if (material !== a.children[0].material[2]) expect(material.map).toBeNull();
    a.children[0].material[2].opacity = .05;
    expect(b.children[0].material[2].opacity).toBe(1);
    for (const material of materials(a)) material.dispose();
    expect(disposed).toBe(0); expect(snapshot()).toEqual(before);
    const fallback = assembly(); expect(fallback.children[0].material[2].map).toBeNull(); expect(fallback.children[0].material[2].color.getHex()).toBe(0x263b5c);
  });
});


function expressionAt(text, position) { const parsed = parseExpressionAt(text, position, { ecmaVersion: 'latest' }); return text.slice(parsed.start, parsed.end); }
function named(name) { return expressionAt(source, source.indexOf('function ' + name + '(')); }
const cameraMath = runInNewContext(['issFlightNumber', 'issMapCameraPose', 'issMapCameraPan', 'issMapCameraFit'].map(named).join('\n') + '\n({pose:issMapCameraPose,pan:issMapCameraPan,fit:issMapCameraFit});');
function cameraFixture(width = 800, height = 500) {
  const station = new THREE.Group(), solar = assembly(); solar.position.set(0, 0, 4.6); station.add(solar);
  solar.children.forEach(part => { part._issScienceId = 'zvezda-arrays'; });
  const hull = new THREE.Mesh(keep(new THREE.CylinderGeometry(.55, .55, 3.2, 32)), keep(new THREE.MeshStandardMaterial()));
  hull.rotation.x = Math.PI / 2; hull.position.set(0, 0, 4.6); hull._issId = 'zvezda'; station.add(hull);
  const context = {
    THREE, station, zvezdaSolarGroup: solar, zvezdaSolarEnvelope: new THREE.Sphere(), clickable: [hull],
    cv: { _issWantSel: 'destiny', isConnected: true, clientWidth: width, clientHeight: height }, cleaned: false, _prefersReducedMotion: true,
    camera: new THREE.PerspectiveCamera(46, width / height, .01, 1000), cameraTarget: new THREE.Vector3(0, 0, 1),
    cameraFocusId: null, cameraFitMode: null, cameraFitResult: null, cameraTween: null, cameraPanned: false, cameraView: 'overview', cameraMinDistance: 3.2, cameraMaxDistance: 30,
    Wc: width, Hc: height, visitorTargets: Object.create(null), radiatorTargets: Object.create(null),
    stationEnvelope: { center: new THREE.Vector3(0, 1, 0), radius: 9 }, armBase: new THREE.Vector3(0, 2, -1), armVelocity: { enabled: false },
    wings: [{}, {}, { position: new THREE.Vector3(4, 2, -1) }], arrayFocus: { visible: false },
    finishJointDrag: vi.fn(), finishArmDrag: vi.fn(), finishMotionDrag: vi.fn(), onUp: vi.fn(), onLeave: vi.fn(),
    syncCameraHUD: vi.fn(), announceToSR: vi.fn(), upd: vi.fn(), __alloT: (key, fallback) => fallback,
    __alloFill: (text, values) => text.replace(/\{([^}]+)\}/g, (_, key) => String(values[key])),
    issMapCameraPose: cameraMath.pose, issMapCameraPan: cameraMath.pan, issMapCameraFit: cameraMath.fit, _lastFrameSig: 'before',
    renderer: { setSize: vi.fn() }, composer: null, bloomRes: 1
  };
  context.camera.position.set(8, 4, 10);
  runInNewContext(['applyCameraPose', 'settleCameraFit', 'cancelCameraTween', 'moveCamera', 'mapFieldOfView', 'resizeScene'].map(named).join('\n'), context);
  for (const key of ['_issCameraOrbit', '_issCameraZoom', '_issCameraPan', '_issSetView', '_issFitCamera', '_issFocusModule']) {
    const position = source.indexOf('cv.' + key + ' = function');
    runInNewContext('cv.' + key + ' = ' + expressionAt(source, source.indexOf('function', position)) + ';', context);
  }
  return context;
}
function cameraOffset(context) { return context.camera.position.clone().sub(context.cameraTarget); }
function assertSubjectInFrame(context) {
  context.station.updateMatrixWorld(true);
  for (const part of [...context.zvezdaSolarGroup.children, ...context.clickable]) {
    const p = part.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const ndc = pointAt(p, i).applyMatrix4(part.matrixWorld).project(context.camera);
      expect(ndc.toArray().every(Number.isFinite)).toBe(true);
      expect(Math.abs(ndc.x)).toBeLessThan(1); expect(Math.abs(ndc.y)).toBeLessThan(1); expect(ndc.z).toBeGreaterThan(-1); expect(ndc.z).toBeLessThan(1);
    }
  }
}

describe('Zvezda complete-module framing and cutaway', () => {
  it('frames actual transformed hull and wing bounds on desktop and phone without changing selection', () => {
    for (const width of [1440, 390]) {
      const context = cameraFixture(width); context.station.rotation.set(.2, -.3, .1);
      context.cv._issFocusModule('zvezda');
      const box = new THREE.Box3().setFromObject(context.zvezdaSolarGroup).union(new THREE.Box3().setFromObject(context.clickable[0])), sphere = box.getBoundingSphere(new THREE.Sphere());
      expect(context.cameraTarget.distanceTo(sphere.center)).toBeLessThan(1e-12); expect(context.cameraFitResult.radius).toBeCloseTo(sphere.radius, 12);
      expect(context.cameraFitMode).toBe('zvezda-arrays'); expect(context.cameraFocusId).toBe('zvezda-arrays'); expect(context.cameraMinDistance).toBe(4.8);
      assertSubjectInFrame(context);
      expect(context.cv._issWantSel).toBe('destiny'); expect(context.upd).not.toHaveBeenCalled();
    }
  });

  it('refits on real resize, preserves manual zoom and exits through ordinary view controls', () => {
    const context = cameraFixture(); context.cv._issFitCamera('zvezda-arrays'); context.cv._issCameraOrbit(.2, -.1);
    const direction = cameraOffset(context).normalize(); context.cv.clientWidth = 390; context.resizeScene();
    expect(cameraOffset(context).normalize().distanceTo(direction)).toBeLessThan(1e-11);
    expect(context.cameraFitMode).toBe('zvezda-arrays'); assertSubjectInFrame(context);
    context.cv._issCameraZoom(.9); const manualPosition = context.camera.position.toArray(), manualTarget = context.cameraTarget.toArray();
    expect(context.cameraFitMode).toBeNull(); expect(context.cameraFocusId).toBe('zvezda-arrays');
    context.cv.clientWidth = 1440; context.resizeScene(); expect(context.camera.position.toArray()).toEqual(manualPosition); expect(context.cameraTarget.toArray()).toEqual(manualTarget);
    context.cv._issSetView('overview'); expect(context.cameraFocusId).toBeNull(); expect(context.cameraFitMode).toBeNull();
    context.cv._issFocusModule('zvezda'); context.cv._issCameraPan(32, 0); expect(context.cameraFocusId).toBeNull(); expect(context.cameraPanned).toBe(true);
    expect(context.cv._issWantSel).toBe('destiny'); expect(context.upd).not.toHaveBeenCalled();
  });

  it('updates all shared panel material slots and preserves the prior single-material cutaway behavior', () => {
    const group = assembly(), single = { _issParentId: 'destiny', _issHullCap: true, material: keep(new THREE.MeshStandardMaterial()) };
    group.children.forEach(part => { part._issScienceId = 'zvezda-arrays'; });
    const context = { moduleDetails: [...group.children, single], wantId: 'destiny', cameraFocusId: 'zvezda-arrays', cutaway: true, cupolaInspect: false, questInspect: false, cv: { _issHoverId: null } };
    const begin = source.indexOf('            for (var di = 0; di < moduleDetails.length; di++)'), end = source.indexOf('            if (curSel)', begin);
    const update = () => runInNewContext(source.slice(begin, end), context);
    update();
    for (const material of materials(group)) { expect(material.opacity).toBe(1); expect(material.depthWrite).toBe(true); expect(material.emissive.getHex()).toBe(0); }
    expect(single.material.opacity).toBe(.26); expect(single.material.depthWrite).toBe(false); expect(single.material.emissive.getHex()).toBe(0x073b55);
    context.cameraFocusId = null; update(); for (const material of materials(group)) { expect(material.opacity).toBe(.05); expect(material.depthWrite).toBe(false); }
    context.wantId = 'zvezda'; update(); for (const material of materials(group)) expect(material.opacity).toBe(1);
    expect(single.material.opacity).toBe(.1); expect(single.material.emissive.getHex()).toBe(0);
    context.cutaway = false; update(); for (const material of [...materials(group), single.material]) { expect(material.opacity).toBe(1); expect(material.depthWrite).toBe(true); }
  });
});

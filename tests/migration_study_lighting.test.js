import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), process.env.MIGRATION_STUDY_LIGHTING_CANDIDATE || 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing Study lighting source: ' + start);
  return source.slice(first, last);
}
const createLighting = new Function(section('      function createMigrationStudyLighting(', '      function initMigrationFlightScene(') + '\nreturn createMigrationStudyLighting;')();
const themes = new Function(section('          var SKY_THEME = {', '          function paintSky(mode) {') + '\nreturn SKY_THEME;')();
const installTheme = new Function('THREE', 'engine', 'SKY_THEME', 'paintSky', 'skyTex', 'nightStars', 'scene', 'renderer', 'hemi', 'sun', 'rim', 'sunDisc', 'sunGlow', 'cloudMat', 'cirrusMat', 'riverDetailMat',
  section('          engine.applyTheme = function(isDarkNow) {', '          // ── Land belt ──'));
const frameLighting = new Function('engineNow', 'live', section('          engineNow.camera.lookAt(engineNow.cameraTarget);', '          engineNow.updateAnatomy('));

function fixture(library = THREE) {
  const scene = new THREE.Scene(), rig = new THREE.Group(), camera = new THREE.PerspectiveCamera(54, 1.4, .1, 900);
  scene.add(rig); rig.add(camera); camera.position.set(6, 4, 8);
  const target = new THREE.Vector3(1.1, 2.3, -3.4); camera.lookAt(target);
  const hemi = new THREE.HemisphereLight(0xcfe6f5, 0x2f4a2c, .72);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.05); sun.position.set(-28, 34, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -35; sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
  const rim = new THREE.DirectionalLight(0x9fd0ec, .42); rim.position.set(22, 12, -40);
  scene.add(hemi, sun, rim); scene.updateMatrixWorld(true); camera.updateWorldMatrix(true, false);
  const controller = createLighting(library, hemi, sun, rim);
  const engine = { _skyMode: null, studyLighting: controller };
  const disc = new THREE.Object3D(), glow = new THREE.Object3D();
  disc.material = { color: new THREE.Color() }; glow.material = { color: new THREE.Color(), opacity: 0 };
  const paintSky = vi.fn(), renderer = { setClearColor: vi.fn() };
  installTheme(THREE, engine, themes, paintSky, { needsUpdate: false }, { visible: false }, scene, renderer, hemi, sun, rim, disc, glow, null, null, null);
  return { scene, rig, camera, target, hemi, sun, rim, controller, engine, paintSky, renderer,
    originalTargets: [sun.target, rim.target],
    update(enabled = true) { return controller.update(enabled, camera, target); },
    theme(dark) { engine.applyTheme(dark); }
  };
}
function colors(f) {
  return [f.hemi.color.getHex(), f.hemi.groundColor.getHex(), f.hemi.intensity,
    f.sun.color.getHex(), f.sun.intensity, f.rim.color.getHex(), f.rim.intensity];
}
function expectedTheme(dark) {
  const cfg = themes[dark ? 'night' : 'day'];
  return [cfg.hemiSky, cfg.hemiGround, cfg.hemiI, cfg.sunColor, cfg.sunI, cfg.rimColor, cfg.rimI];
}
function world(node) { return new THREE.Vector3().setFromMatrixPosition(node.matrixWorld); }
function expectPoint(actual, expected, tolerance = 1e-9) { expect(actual.distanceTo(expected)).toBeLessThan(tolerance); }
function expectStudy(f) {
  expect(f.controller.userData.active).toBe(true);
  expect(colors(f)).toEqual([0xe4ecf0, 0x46515c, .62, 0xfff5e8, .82, 0xc6d8e5, .34]);
  expect([f.hemi, f.sun, f.rim].every(light => light.userData.migrationStudyLighting === true)).toBe(true);
  expectPoint(world(f.sun.target), f.target); expectPoint(world(f.rim.target), f.target);
  const inverse = f.camera.matrixWorld.clone().invert();
  const center = f.target.clone().applyMatrix4(inverse);
  const key = world(f.sun).applyMatrix4(inverse).sub(center), rim = world(f.rim).applyMatrix4(inverse).sub(center);
  expectPoint(key, new THREE.Vector3(-4, 5, 7)); expectPoint(rim, new THREE.Vector3(5, 2, -4));
}
function expectCorridor(f, dark = false) {
  expect(f.controller.userData.active).toBe(false); expect(colors(f)).toEqual(expectedTheme(dark));
  expect(f.hemi.position.toArray()).toEqual([0, 1, 0]); expect(f.sun.position.toArray()).toEqual([-28, 34, 18]);
  expect(f.rim.position.toArray()).toEqual([22, 12, -40]);
  expect(f.sun.target).toBe(f.originalTargets[0]); expect(f.rim.target).toBe(f.originalTargets[1]);
  expect(f.sun.target.position.toArray()).toEqual([0, 0, 0]); expect(f.rim.target.position.toArray()).toEqual([0, 0, 0]);
  expectPoint(world(f.sun), new THREE.Vector3(-28, 34, 18)); expectPoint(world(f.rim), new THREE.Vector3(22, 12, -40));
  expectPoint(world(f.sun.target), new THREE.Vector3()); expectPoint(world(f.rim.target), new THREE.Vector3());
  expect([f.hemi, f.sun, f.rim].every(light => light.userData.migrationStudyLighting === false)).toBe(true);
}

describe('Pooled camera-relative migration Study lighting', () => {
  it('uses only the three existing lights and preserves their targets and shadow resources', () => {
    const f = fixture(), nodes = [...f.scene.children], targets = [f.sun.target, f.rim.target];
    const shadows = [f.sun.shadow, f.rim.shadow], cameras = shadows.map(shadow => shadow.camera), mapSize = f.sun.shadow.mapSize;
    f.theme(false); f.update(); expectStudy(f); f.update(false); expectCorridor(f);
    expect(f.scene.children).toEqual(nodes); expect([f.sun.target, f.rim.target]).toEqual(targets);
    expect(f.sun.target.parent).toBeNull(); expect(f.rim.target.parent).toBeNull();
    expect([f.sun.shadow, f.rim.shadow]).toEqual(shadows); expect(shadows.map(shadow => shadow.camera)).toEqual(cameras);
    expect(f.sun.shadow.mapSize).toBe(mapSize); expect(mapSize.toArray()).toEqual([1024, 1024]);
    expect(f.sun.castShadow).toBe(true); expect(f.rim.castShadow).toBe(false);
    const lights = []; f.scene.traverse(node => { if (node.isLight) lights.push(node); }); expect(lights).toEqual([f.hemi, f.sun, f.rim]);
  });

  it.each([[180, 10], [90, 10], [0, 60], [-75, -10], [35, 15], [0, -60], [180, -60], [90, -45]])('keeps actual light offsets camera-relative at yaw %s elevation %s', (yaw, pitch) => {
    const f = fixture(); f.theme(true);
    const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
    f.camera.position.copy(f.target).add(new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)).multiplyScalar(11));
    f.camera.lookAt(f.target); f.camera.updateWorldMatrix(true, false);
    const cameraState = [f.camera.position.toArray(), f.camera.quaternion.toArray()], target = f.target.toArray();
    expect(f.update()).toBe(true); expectStudy(f);
    expect([f.camera.position.toArray(), f.camera.quaternion.toArray()]).toEqual(cameraState); expect(f.target.toArray()).toEqual(target);
    f.update(false); expectCorridor(f, true);
  });

  it('reads the actual camera after lookAt without depending on a previous-frame quaternion', () => {
    const f = fixture(); f.theme(false);
    f.camera.position.set(-9, 3, -4); f.camera.lookAt(0, 10, 0); f.camera.updateWorldMatrix(true, false);
    const old = f.camera.quaternion.clone();
    const frame = { camera: f.camera, cameraTarget: f.target, studyTarget: f.target, studyLighting: f.controller };
    frameLighting(frame, { flightCamera: 'study' }); expectStudy(f); expect(f.camera.quaternion.equals(old)).toBe(false);
    frameLighting(frame, { flightCamera: 'chase' }); expectCorridor(f);
  });

  it('captures current theme colors while active and restores original corridor positions through repeated day/night changes', () => {
    const f = fixture(); f.theme(false); const capture = vi.spyOn(f.controller, 'captureTheme');
    f.update(); expectStudy(f);
    for (const dark of [true, false, true, false]) {
      f.theme(dark); const version = f.controller.userData.themeVersion;
      f.update(); expectStudy(f); f.theme(dark); expect(f.controller.userData.themeVersion).toBe(version);
      f.update(false); expectCorridor(f, dark); f.update(); expectStudy(f);
    }
    expect(capture).toHaveBeenCalledTimes(4); f.update(false); expectCorridor(f, false);
  });

  it.each([
    ['missing camera', f => null],
    ['wrong camera kind', f => new THREE.OrthographicCamera(-2, 2, 2, -2, .1, 900)],
    ['singular camera', f => { f.rig.scale.x = 0; return f.camera; }],
    ['nonfinite camera', f => { f.camera.matrixAutoUpdate = false; f.camera.matrix.elements[12] = NaN; return f.camera; }],
    ['invalid projection', f => { f.camera.projectionMatrix.elements[8] = NaN; return f.camera; }],
    ['invalid clipping', f => { f.camera.near = f.camera.far; return f.camera; }],
    ['nonfinite target', f => { f.target.x = NaN; return f.camera; }],
    ['infinite target', f => { f.target.z = Infinity; return f.camera; }]
  ])('restores the actual corridor lights after %s instead of retaining stale Study directions', (_, change) => {
    const f = fixture(); f.theme(true); f.update(); expectStudy(f);
    const camera = change(f); expect(f.controller.update(true, camera, f.target)).toBe(false); expectCorridor(f, true);
  });

  it.each(['sun', 'rim', 'sunTarget', 'rimTarget'])('composes restored matrices after the owned %s rejects manual matrix updates', key => {
    const f = fixture(); f.theme(false); f.update(); expectStudy(f);
    const node = key === 'sunTarget' ? f.sun.target : key === 'rimTarget' ? f.rim.target : f[key];
    node.matrixAutoUpdate = false; expect(f.update()).toBe(false); expectCorridor(f);
    expect(node.matrixAutoUpdate).toBe(false); expect(node.matrix.elements.every(Number.isFinite)).toBe(true);
  });

  it.each(['sun', 'rim'])('restores the original %s target identity after a stale replacement', key => {
    const f = fixture(); f.theme(false); f.update(); expectStudy(f);
    f[key].target = new THREE.Object3D(); f[key].target.position.set(91, 32, -8);
    expect(f.update()).toBe(false); expectCorridor(f);
  });

  it('uses each light and target parent coordinate space and still restores their original local transforms', () => {
    const f = fixture(), lightParent = new THREE.Group(), targetParent = new THREE.Group();
    lightParent.position.set(4, -2, 1); lightParent.rotation.set(.2, -.3, .1); lightParent.scale.set(-1.2, .8, 1.4);
    targetParent.position.set(-3, 1, 2); targetParent.rotation.set(-.1, .25, .15); targetParent.scale.set(.7, 1.3, .9);
    f.scene.add(lightParent, targetParent); lightParent.add(f.sun, f.rim); targetParent.add(f.sun.target, f.rim.target);
    f.scene.updateMatrixWorld(true); f.theme(false); f.update(); expectStudy(f);
    f.update(false);
    expect(f.sun.position.toArray()).toEqual([-28, 34, 18]); expect(f.rim.position.toArray()).toEqual([22, 12, -40]);
    expect(f.sun.target.position.toArray()).toEqual([0, 0, 0]); expect(f.rim.target.position.toArray()).toEqual([0, 0, 0]);
    expectPoint(world(f.sun), new THREE.Vector3(-28, 34, 18).applyMatrix4(lightParent.matrixWorld));
    expectPoint(world(f.sun.target), new THREE.Vector3().applyMatrix4(targetParent.matrixWorld));
  });

  it('rolls back an invalid theme capture to the last finite themed policy', () => {
    const f = fixture(); f.theme(true); f.update(); expectStudy(f); const version = f.controller.userData.themeVersion;
    f.hemi.intensity = NaN; expect(f.controller.captureTheme()).toBe(false); expectCorridor(f, true);
    expect(f.controller.userData.themeVersion).toBe(version);
  });

  it('keeps every math object pooled through views, modes and theme captures', () => {
    const library = { ...THREE }; let allocations = 0;
    for (const key of ['Vector3', 'Matrix4', 'Color']) library[key] = class extends THREE[key] { constructor(...args) { super(...args); allocations++; } };
    const f = fixture(library); f.theme(false); const count = allocations, nodes = [...f.scene.children];
    for (let index = 0; index < 48; index++) {
      f.camera.position.set(6 + index / 10, 4, 8); f.camera.lookAt(f.target);
      f.update(); f.update(false); expect(f.controller.captureTheme()).toBe(true);
    }
    expect(allocations).toBe(count); expect(f.scene.children).toEqual(nodes); expectCorridor(f);
  });
});

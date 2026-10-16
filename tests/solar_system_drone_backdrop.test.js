import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
let syncBackdrop, disposeBackdrop;

beforeAll(() => {
  const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
  function helper(name) {
    const start = source.indexOf('function ' + name + '(');
    if (start < 0) throw new Error('Missing backdrop helper: ' + name);
    const end = source.indexOf('\n}', start);
    if (end < start) throw new Error('Missing top-level close: ' + name);
    return source.slice(start, end + 2);
  }
  const code = helper('solarSyncDroneBackdrop') + '\n' + helper('solarDisposeDroneBackdrop');
  ({ syncBackdrop, disposeBackdrop } = new Function('THREE', code +
    '\nreturn {syncBackdrop:solarSyncDroneBackdrop,disposeBackdrop:solarDisposeDroneBackdrop};')(THREE));
});

const translations = [[0, 5, 0], [180, 40, -180], [-115, 2, 115]];
function skyFixture() {
  const scene = new THREE.Scene(), backdrop = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(65, 1.7, 0.1, 1000);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), new THREE.MeshBasicMaterial());
  sun.position.set(30, 25, -200);
  const star = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)), new THREE.PointsMaterial());
  star.position.set(-50, 60, -300);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial());
  moon.position.set(20, -15, -160);
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ transparent: true }));
  corona.position.copy(sun.position);
  backdrop.add(sun, star, moon, corona); scene.add(backdrop, camera);
  camera.updateMatrixWorld(true);
  return { scene, backdrop, camera, sun, star, moon, corona };
}
function translateCamera(f, position) {
  f.camera.position.set(...position); f.camera.updateMatrixWorld(true);
  syncBackdrop(f.backdrop, f.camera, f.corona);
}
function projectedCenter(object, camera) {
  // Deliberately use matrixWorld directly: the helper must refresh its children
  // before rendering. getWorldPosition() would repair stale matrices for it.
  return new THREE.Vector3().setFromMatrixPosition(object.matrixWorld).project(camera);
}
function expectSameVector(actual, expected) {
  for (const component of ['x', 'y', 'z']) expect(actual[component]).toBeCloseTo(expected[component], 10);
}
function countDisposals(resources) {
  const counts = new Map(resources.map(resource => [resource, 0]));
  resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1)));
  return resource => counts.get(resource);
}
function sharedResourceFixture() {
  const scene = new THREE.Scene(), backdrop = new THREE.Group(), nested = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(2, 2), texture = new THREE.Texture();
  const firstMaterial = new THREE.MeshBasicMaterial({ map: texture }), secondMaterial = new THREE.MeshBasicMaterial({ map: texture });
  backdrop.add(new THREE.Mesh(geometry, firstMaterial), nested);
  nested.add(new THREE.Mesh(geometry, [firstMaterial, secondMaterial]), new THREE.Mesh(geometry, secondMaterial));
  scene.add(backdrop);
  const resources = [geometry, texture, firstMaterial, secondMaterial];
  return { scene, backdrop, nested, resources, count: countDisposals(resources) };
}

describe('drone distant backdrop follows camera position without false parallax', () => {
  it.each(translations)('keeps Sun, star and moon projection fixed after translation to (%s, %s, %s)', (x, y, z) => {
    const f = skyFixture();
    translateCamera(f, [0, 0, 0]);
    const distant = [f.sun, f.star, f.moon], expected = distant.map(object => projectedCenter(object, f.camera));
    const localPositions = distant.map(object => object.position.toArray());
    translateCamera(f, [x, y, z]);
    distant.forEach((object, i) => {
      expectSameVector(projectedCenter(object, f.camera), expected[i]);
      expect(object.position.toArray()).toEqual(localPositions[i]);
    });
    expect(f.backdrop.position.toArray()).toEqual([x, y, z]);
    disposeBackdrop(f.backdrop);
  });

  it('responds to yaw, pitch and roll while leaving the backdrop rotation world-aligned', () => {
    const f = skyFixture();
    translateCamera(f, [0, 0, 0]);
    const initial = projectedCenter(f.sun, f.camera);
    for (const [pitch, yaw, roll] of [[0.2, 0.3, 0], [-0.15, -0.35, 0.1], [0, 0, 0.4]]) {
      f.camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
      translateCamera(f, [0, 0, 0]);
      const expected = [f.sun, f.star, f.moon].map(object => projectedCenter(object, f.camera));
      expect(projectedCenter(f.sun, f.camera).distanceTo(initial), 'looking around must move the sky on screen').toBeGreaterThan(0.01);
      translateCamera(f, [180, 40, -180]);
      [f.sun, f.star, f.moon].forEach((object, i) => expectSameVector(projectedCenter(object, f.camera), expected[i]));
      expect(f.backdrop.quaternion.toArray()).toEqual([0, 0, 0, 1]);
      expect(f.backdrop.scale.toArray()).toEqual([1, 1, 1]);
    }
    disposeBackdrop(f.backdrop);
  });

  it('preserves perspective framing as field of view changes without introducing translation parallax', () => {
    const f = skyFixture();
    translateCamera(f, [0, 0, 0]);
    const baselineFov = f.camera.fov, baseline = projectedCenter(f.moon, f.camera);
    for (const fov of [40, 52, 90]) {
      f.camera.fov = fov; f.camera.updateProjectionMatrix();
      translateCamera(f, [0, 0, 0]);
      const expected = projectedCenter(f.moon, f.camera);
      const factor = Math.tan(baselineFov * Math.PI / 360) / Math.tan(fov * Math.PI / 360);
      expect(expected.x).toBeCloseTo(baseline.x * factor, 10);
      expect(expected.y).toBeCloseTo(baseline.y * factor, 10);
      for (const position of translations) {
        translateCamera(f, position);
        expectSameVector(projectedCenter(f.moon, f.camera), expected);
      }
    }
    disposeBackdrop(f.backdrop);
  });

  it('keeps the translated corona plane facing the camera rather than the world origin', () => {
    const f = skyFixture();
    f.camera.quaternion.setFromEuler(new THREE.Euler(0.2, -0.3, 0.1));
    for (const position of translations) {
      translateCamera(f, position);
      // A renderer updates the billboard's local rotation after lookAt. Only the
      // normal orientation is under test here; translation freshness is above.
      f.corona.updateMatrixWorld(true);
      const worldCenter = new THREE.Vector3().setFromMatrixPosition(f.corona.matrixWorld);
      const facing = new THREE.Vector3(0, 0, 1).transformDirection(f.corona.matrixWorld);
      const towardCamera = f.camera.position.clone().sub(worldCenter).normalize();
      expect(facing.dot(towardCamera)).toBeCloseTo(1, 10);
      expectSameVector(worldCenter.clone().sub(f.camera.position), f.sun.position);
    }
    disposeBackdrop(f.backdrop);
  });

  it('leaves nearby terrain world-fixed so vehicle movement still produces ground parallax', () => {
    const f = skyFixture(), ground = new THREE.Object3D();
    ground.position.set(2, -2, -15); f.scene.add(ground); ground.updateMatrixWorld(true);
    translateCamera(f, [0, 0, 0]);
    const initialGround = projectedCenter(ground, f.camera), initialSun = projectedCenter(f.sun, f.camera);
    const world = ground.matrixWorld.toArray(), local = ground.position.toArray();
    translateCamera(f, [5, 1, 0]);
    expect(ground.parent).toBe(f.scene);
    expect(ground.position.toArray()).toEqual(local); expect(ground.matrixWorld.toArray()).toEqual(world);
    expect(projectedCenter(ground, f.camera).distanceTo(initialGround)).toBeGreaterThan(0.1);
    expectSameVector(projectedCenter(f.sun, f.camera), initialSun);
    disposeBackdrop(f.backdrop);
  });
});

describe('drone backdrop cleanup owns only its resources', () => {
  it('disposes shared geometry, material arrays and shared map texture exactly once', () => {
    const f = sharedResourceFixture();
    disposeBackdrop(f.backdrop);
    expect(f.backdrop.parent).toBeNull(); expect(f.scene.children).not.toContain(f.backdrop);
    f.resources.forEach(resource => expect(f.count(resource)).toBe(1));
  });

  it('is idempotent even when teardown is requested after removal from the scene', () => {
    const f = sharedResourceFixture();
    f.scene.remove(f.backdrop);
    disposeBackdrop(f.backdrop); disposeBackdrop(f.backdrop); disposeBackdrop(f.backdrop);
    expect(f.backdrop.userData.droneBackdropDisposed).toBe(true);
    f.resources.forEach(resource => expect(f.count(resource)).toBe(1));
  });

  it('does not remove or dispose neighboring terrain geometry, materials or textures', () => {
    const f = sharedResourceFixture(), texture = new THREE.Texture();
    const geometry = new THREE.BoxGeometry(4, 2, 4), material = new THREE.MeshBasicMaterial({ map: texture });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.position.set(20, -4, 10); f.scene.add(terrain); terrain.updateMatrixWorld(true);
    const world = terrain.matrixWorld.toArray(), count = countDisposals([texture, geometry, material]);
    disposeBackdrop(f.backdrop);
    expect(terrain.parent).toBe(f.scene); expect(f.scene.children).toContain(terrain);
    expect(terrain.matrixWorld.toArray()).toEqual(world);
    [texture, geometry, material].forEach(resource => expect(count(resource)).toBe(0));
    expect(terrain.userData.droneBackdropDisposed).toBeUndefined();
    texture.dispose(); geometry.dispose(); material.dispose();
  });
});

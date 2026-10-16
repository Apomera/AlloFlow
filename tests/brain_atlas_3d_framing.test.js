import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_brainatlas.js', 'utf8');
const start = source.indexOf('function brainAtlas3DVisibleBounds(');
const end = source.indexOf('function brainAtlasLoad3DDependencies(', start);
const { visibleBounds, fitPose } = new Function(source.slice(start, end) + '\nreturn { visibleBounds: brainAtlas3DVisibleBounds, fitPose: brainAtlas3DFitPose };')();

function mesh(size, x, opacity = 1, visible = true) {
  const result = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ opacity }));
  result.position.x = x;
  result.visible = visible;
  result.updateMatrixWorld(true);
  return result;
}

describe('Brain Atlas framing visible anatomy', () => {
  it('fits solid visible anatomy without enclosing faded or hidden tissue', () => {
    const target = mesh(2, 3), context = mesh(20, 0, .015), hidden = mesh(40, 0, 1, false);
    const bounds = visibleBounds(THREE, [target, context, hidden], null);
    expect(bounds.min.toArray()).toEqual([2, -1, -1]);
    expect(bounds.max.toArray()).toEqual([4, 1, 1]);
    target.visible = false;
    expect(visibleBounds(THREE, [target, context, hidden], null).getSize(new THREE.Vector3()).toArray()).toEqual([20, 20, 20]);
  });

  it('fits only the retained side of an axis-aligned cutaway, including its flip', () => {
    const tissue = mesh(4, 0);
    const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -.5);
    const retained = visibleBounds(THREE, [tissue], plane);
    expect(retained.min.x).toBe(.5);
    expect(retained.max.x).toBe(2);
    plane.negate();
    const flipped = visibleBounds(THREE, [tissue], plane);
    expect(flipped.min.x).toBe(-2);
    expect(flipped.max.x).toBe(.5);
    expect(visibleBounds(THREE, [tissue], new THREE.Plane(new THREE.Vector3(1, 0, 0), -3)).isEmpty()).toBe(true);
  });

  it.each([.42, 1, 2.3])('keeps every corner in frame at aspect %s while preserving the viewing angle', aspect => {
    const camera = new THREE.PerspectiveCamera(40, aspect, .01, 100);
    const target = new THREE.Vector3(.2, -.3, .1);
    camera.position.set(4, 3, 5);
    camera.lookAt(target);
    const direction = camera.position.clone().sub(target).normalize();
    const bounds = new THREE.Box3(new THREE.Vector3(-.8, -.4, -1.2), new THREE.Vector3(.4, 1.5, .7));
    const pose = fitPose(THREE, camera, bounds, target);
    expect(pose.position.clone().sub(pose.center).normalize().distanceTo(direction)).toBeLessThan(1e-8);
    camera.position.copy(pose.position);
    camera.lookAt(pose.center);
    camera.updateMatrixWorld(true);
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      expect(Math.abs(point.x)).toBeLessThanOrEqual(1 / 1.12 + 1e-6);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(1 / 1.12 + 1e-6);
      expect(point.z).toBeLessThan(1);
      expect(point.z).toBeGreaterThan(-1);
    }
    expect(fitPose(THREE, camera, new THREE.Box3(), target)).toBeNull();
  });
});

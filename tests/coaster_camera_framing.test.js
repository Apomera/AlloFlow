import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('function fittedOrbitRadius('), source.indexOf('/* @clab-camera-fit-end */'));
const fit = new Function(block + '; return fittedOrbitRadius;')();
const bounds = { min: { x: -260, y: -3, z: -260 }, max: { x: 263, y: 48, z: 263 } };
describe('Coaster perspective camera framing', () => {
  for(const aspect of [0.33, 0.5, 1, 1.8, 4]){
    it.each([[-0.95, 0.42], [0, 1.55], [0, 0.08], [2.1, 0.8]])('keeps every bounds corner in view at aspect ' + aspect + ' and angle %j/%j', (theta, phi) => {
      const radius = fit(bounds, theta, phi, aspect, 0.72);
      const camera = new THREE.PerspectiveCamera(55, aspect, 0.1, radius + 1500);
      const center = new THREE.Vector3().addVectors(bounds.min, bounds.max).multiplyScalar(0.5);
      camera.position.set(center.x + radius * Math.cos(phi) * Math.sin(theta), center.y + radius * Math.sin(phi), center.z + radius * Math.cos(phi) * Math.cos(theta));
      camera.lookAt(center); camera.updateMatrixWorld();
      for(const x of [bounds.min.x, bounds.max.x]) for(const y of [bounds.min.y, bounds.max.y]) for(const z of [bounds.min.z, bounds.max.z]){
        const p = new THREE.Vector3(x, y, z).project(camera);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(0.860001);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(0.720001);
        expect(p.z).toBeGreaterThan(-1);
        expect(p.z).toBeLessThan(1);
      }
    });
  }
  it('is independent of world position and handles flat or tiny designs', () => {
    const offset = { x: 700, y: 300, z: -900 };
    const moved = Object.fromEntries(Object.entries(bounds).map(([key, p]) => [key, Object.fromEntries(Object.entries(p).map(([axis, value]) => [axis, value + offset[axis]]))]));
    expect(fit(moved, -0.95, 0.42, 1)).toBeCloseTo(fit(bounds, -0.95, 0.42, 1), 8);
    expect(fit({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, 0, 0.42, 1)).toBe(15);
    expect(Number.isFinite(fit({ min: { x: -100, y: 0, z: -100 }, max: { x: 100, y: 0, z: 100 } }, 0, 1.55, 0.5))).toBe(true);
  });
  it.each([0, -1, NaN, Infinity])('uses a finite fallback for unavailable aspect %j', aspect => {
    expect(fit(bounds, 0, 0.4, aspect)).toBe(175);
  });
});

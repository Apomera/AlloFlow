// Geometry Sandbox — orientation triad projection.
//
// The viewport shows a small X/Y/Z triad that follows the camera. Its geometry
// comes from geoProjectAxes(q): each world axis rotated into camera space by the
// camera quaternion's conjugate. The frame loop feeds the projection straight
// into an SVG, so a wrong sign here would silently draw a mirrored or spinning
// triad that no jsdom render test can see. Pin the math against three.js itself
// (vendored r128), not against hand-typed numbers, for a spread of orientations.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let P;
beforeAll(() => {
  loadAlloModule('vendor/three-r128/three.min.js');
  loadAlloModule('stem_lab/stem_tool_geosandbox.js');
  P = window.StemLab && window.StemLab.geoPure;
  if (!P || typeof P.geoProjectAxes !== 'function') throw new Error('geoProjectAxes not exposed on StemLab.geoPure');
});

function viaThree(q) {
  const THREE = window.THREE;
  const inv = new THREE.Quaternion(q.x, q.y, q.z, q.w).normalize().conjugate();
  return ['x', 'y', 'z'].map((axis, i) => {
    const v = new THREE.Vector3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0).applyQuaternion(inv);
    return { axis, x: v.x, y: v.y, depth: v.z };
  });
}

function close(a, b) {
  expect(a.axis).toBe(b.axis);
  expect(a.x).toBeCloseTo(b.x, 9);
  expect(a.y).toBeCloseTo(b.y, 9);
  expect(a.depth).toBeCloseTo(b.depth, 9);
}

describe('geoProjectAxes', () => {
  it('leaves the axes alone for an identity camera: X right, Y up, Z at the viewer', () => {
    const out = P.geoProjectAxes({ x: 0, y: 0, z: 0, w: 1 });
    expect(out.map((a) => a.axis)).toEqual(['x', 'y', 'z']);
    close(out[0], { axis: 'x', x: 1, y: 0, depth: 0 });
    close(out[1], { axis: 'y', x: 0, y: 1, depth: 0 });
    close(out[2], { axis: 'z', x: 0, y: 0, depth: 1 });
  });

  it('matches three.js for the sandbox default pose and every camera-bar preset', () => {
    const THREE = window.THREE;
    const poses = [[6, 5, 8], [0, 0, 8], [8, 0, 0], [0, 8, 0.001], [8, 6, 8], [-5, 2, -7], [3, -4, 5]];
    for (const eye of poses) {
      const cam = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1000);
      cam.position.set(eye[0], eye[1], eye[2]);
      cam.lookAt(0, 0, 0);
      cam.updateMatrixWorld(true);
      const q = cam.quaternion;
      const mine = P.geoProjectAxes({ x: q.x, y: q.y, z: q.z, w: q.w });
      const ref = viaThree(q);
      for (let i = 0; i < 3; i++) close(mine[i], ref[i]);
    }
  });

  it('agrees with three.js on a spread of arbitrary rotations and keeps every axis unit length', () => {
    const THREE = window.THREE;
    let seed = 7;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let k = 0; k < 40; k++) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.3 - 3.15, rand() * 6.3 - 3.15, rand() * 6.3 - 3.15));
      const mine = P.geoProjectAxes({ x: q.x, y: q.y, z: q.z, w: q.w });
      const ref = viaThree(q);
      for (let i = 0; i < 3; i++) {
        close(mine[i], ref[i]);
        expect(Math.hypot(mine[i].x, mine[i].y, mine[i].depth)).toBeCloseTo(1, 9);
      }
    }
  });

  it('normalises an unnormalised quaternion instead of scaling the triad', () => {
    const out = P.geoProjectAxes({ x: 0, y: 0, z: 0, w: 3 });
    close(out[0], { axis: 'x', x: 1, y: 0, depth: 0 });
  });

  it('a quarter turn of the camera about Y points world X straight at the viewer', () => {
    // Camera yawed +90° about Y looks down world -X, so +X is behind it and
    // -X points at the viewer... unless the sign is wrong. three.js says:
    const s = Math.SQRT1_2;
    const out = P.geoProjectAxes({ x: 0, y: s, z: 0, w: s });
    const ref = viaThree({ x: 0, y: s, z: 0, w: s });
    close(out[0], ref[0]);
    expect(Math.abs(out[0].depth)).toBeCloseTo(1, 9);
    expect(Math.abs(out[0].x)).toBeCloseTo(0, 9);
  });
});

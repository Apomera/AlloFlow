import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const require = createRequire(import.meta.url);
const THREE = require(resolve('vendor/three-r128/three.min.js'));
const { dinoSurfaceGeometry, dinoFrameDistance } = internals();

describe('Dino Lab smooth surface geometry', () => {
  for (const size of [0.1, 1, 12]) {
    it('keeps a curved tapered loft finite, outward-facing and closed at scale ' + size, () => {
      const points = [[0,0,0],[1,0.3,0],[2,0.4,0],[3,0.8,0]].map(p => new THREE.Vector3(...p).multiplyScalar(size));
      const geometry = dinoSurfaceGeometry(THREE, points, [0.5,0.4,0.2,0.03].map(r=>r*size));
      for (const attr of ['position','normal','uv']) expect([...geometry.attributes[attr].array].every(Number.isFinite)).toBe(true);
      expect(geometry.index.count).toBe(48*24*6+24*6);
      expect(geometry.boundingSphere.radius).toBeGreaterThan(size);
      const normals = geometry.attributes.normal, pos = geometry.attributes.position;
      // Shared UV seam must not create a visible lighting crease.
      for (let ring = 0; ring <= 48; ring++) {
        const a = ring*25, b=a+24;
        expect(new THREE.Vector3().fromBufferAttribute(normals,a).distanceTo(new THREE.Vector3().fromBufferAttribute(normals,b))).toBeLessThan(1e-6);
      }
      const sample = new THREE.Vector3().fromBufferAttribute(pos,25*24);
      const normal = new THREE.Vector3().fromBufferAttribute(normals,25*24);
      const center = new THREE.CatmullRomCurve3(points,false,'centripetal').getPoint(0.5);
      expect(normal.dot(sample.sub(center))).toBeGreaterThan(0);
      geometry.dispose();
    });
  }
  it('retains an elliptical cross-section for deep or broad tails', () => {
    const g = dinoSurfaceGeometry(THREE,[new THREE.Vector3(0,0,0),new THREE.Vector3(4,0,0)],[[2,0.5],[2,0.5]]);
    expect(g.boundingBox.max.y).toBeCloseTo(2);
    expect(g.boundingBox.max.z).toBeCloseTo(0.5);
    g.dispose();
  });
});

describe('Dino Lab camera fitting', () => {
  for (const aspect of [0.55, 1, 2.4]) {
    it('keeps the nearest bounding corners in view at aspect ' + aspect, () => {
      const camera = new THREE.PerspectiveCamera(42,aspect,0.005,1000);
      camera.position.z = dinoFrameDistance(12,5,3,42,aspect);
      camera.lookAt(0,0,0); camera.updateMatrixWorld(true);
      for (const x of [-12,12]) for (const y of [-5,5]) for (const z of [-3,3]) {
        const projected = new THREE.Vector3(x,y,z).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);
        expect(Math.abs(projected.y)).toBeLessThan(1);
      }
    });
  }
  it('increases viewing distance when a long animal enters portrait layout', () => {
    expect(dinoFrameDistance(10,2,1,42,0.6)).toBeGreaterThan(dinoFrameDistance(10,2,1,42,2));
  });
});

describe('Dino Lab anatomical feature surfaces', () => {
  const { dinoFeatherGeometry, dinoPlateGeometry, dinoMembraneGeometry } = internals();
  function finiteGeometry(geometry) {
    for (const key of ['position','normal']) expect([...geometry.attributes[key].array].every(Number.isFinite)).toBe(true);
    expect(geometry.index.count).toBeGreaterThan(100);
  }
  for (const scale of [0.1,1,10]) {
    it('creates a curved, tapered feather with a stable root at scale '+scale,()=>{
      const g=dinoFeatherGeometry(THREE,scale,scale*0.15);finiteGeometry(g);
      expect(g.boundingBox.min.y).toBeCloseTo(0);expect(g.boundingBox.max.y).toBeCloseTo(scale);
      expect(g.boundingBox.max.z).toBeGreaterThan(0);
      expect(g.attributes.position.getX(0)).toBeCloseTo(0);
      expect(g.attributes.position.getX(g.attributes.position.count-1)).toBeCloseTo(0);
      expect(g.boundingBox.max.x).toBeGreaterThan(-g.boundingBox.min.x);
      g.dispose();
    });
    it('creates a broad plate with physical thickness at scale '+scale,()=>{
      const g=dinoPlateGeometry(THREE,scale,scale*1.5,scale*0.08);
      for(const key of ['position','normal'])expect([...g.attributes[key].array].every(Number.isFinite)).toBe(true);
      expect(g.boundingBox.max.y).toBeGreaterThan(scale*1.45);
      expect(g.boundingBox.max.z-g.boundingBox.min.z).toBeGreaterThan(scale*0.079);
      g.dispose();
    });
    it('connects the sail continuously between both boundary curves at scale '+scale,()=>{
      const bottom=[new THREE.Vector3(-scale,0,0),new THREE.Vector3(0,0,0),new THREE.Vector3(scale,0,0)];
      const top=[new THREE.Vector3(-scale,0.1*scale,0),new THREE.Vector3(0,scale,0),new THREE.Vector3(scale,0.1*scale,0)];
      const g=dinoMembraneGeometry(THREE,bottom,top);finiteGeometry(g);
      expect(g.boundingBox.min.y).toBeCloseTo(0);expect(g.boundingBox.max.y).toBeCloseTo(scale);
      expect(g.index.count).toBe(40*8*6);g.dispose();
    });
  }
});

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
  for (const aspect of [0.4, 320 / 340, 1.8, 2.4]) {
    it('retains the same edge margin for every rotated corner at aspect ' + aspect, () => {
      for (const half of [[6, 2, 0.7], [0.06, 0.025, 0.012], [8, 7, 1]]) {
        for (const yaw of [-Math.PI, -1.2, -0.35, 0, 0.35, Math.PI / 2, 2.6]) for (const pitch of [-0.2, 0, 0.18, 0.7, 1.25]) {
          const distance = dinoFrameDistance(...half, 52, aspect, yaw, pitch);
          expect(distance).toBeGreaterThan(0); expect(Number.isFinite(distance)).toBe(true);
          const camera = new THREE.PerspectiveCamera(52, aspect, distance / 1000, distance * 10);
          camera.position.set(0, Math.sin(pitch) * distance, Math.cos(pitch) * distance);
          camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
          let largest = 0;
          for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of [-half[2], half[2]]) {
            const point = new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).project(camera);
            largest = Math.max(largest, Math.abs(point.x), Math.abs(point.y));
            expect(point.z).toBeGreaterThan(-1); expect(point.z).toBeLessThan(1);
          }
          expect(largest).toBeCloseTo(1 / 1.24, 9);
        }
      }
    });
  }
  it('removes only excess distance from oblique views and retains the original unoriented API', () => {
    const half = [6, 2, 0.7], aspect = 320 / 340, fov = 52;
    for (const yaw of [0, 0.35, 0.8, 1.2, Math.PI / 2]) for (const pitch of [0, 0.18, 0.7, 1.25]) {
      const across = Math.abs(Math.cos(yaw)) * half[0] + Math.abs(Math.sin(yaw)) * half[2];
      const along = Math.abs(Math.sin(yaw)) * half[0] + Math.abs(Math.cos(yaw)) * half[2];
      const up = half[1] * Math.cos(pitch) + along * Math.sin(pitch), depth = half[1] * Math.sin(pitch) + along * Math.cos(pitch);
      const conservative = dinoFrameDistance(across, up, depth, fov, aspect);
      expect(dinoFrameDistance(...half, fov, aspect, yaw, pitch)).toBeLessThanOrEqual(conservative + 1e-10);
    }
    expect(dinoFrameDistance(...half, fov, aspect, 0.35, 0.18)).toBeLessThan(dinoFrameDistance(
      Math.cos(0.35) * half[0] + Math.sin(0.35) * half[2],
      half[1] * Math.cos(0.18) + (Math.sin(0.35) * half[0] + Math.cos(0.35) * half[2]) * Math.sin(0.18),
      half[1] * Math.sin(0.18) + (Math.sin(0.35) * half[0] + Math.cos(0.35) * half[2]) * Math.cos(0.18), fov, aspect) * 0.96);
    for (const angles of [[undefined, undefined], [0, NaN], [Infinity, 0]]) {
      expect(dinoFrameDistance(...half, fov, aspect, ...angles)).toBe(dinoFrameDistance(...half, fov, aspect));
    }
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
      expect(g.index.count).toBe(40*16*6);g.dispose();
    });
  }
});

describe('Dino Lab shared skin coordinates', () => {
  const { dinoSkinCoordinates } = internals();
  it('gives coincident points the same skin coordinates across separate meshes', () => {
    const a=new THREE.BoxGeometry(2,2,2), b=new THREE.BoxGeometry(2,2,2);
    b.translate(-4,2,-1);
    dinoSkinCoordinates(THREE,a,new THREE.Matrix4());
    dinoSkinCoordinates(THREE,b,new THREE.Matrix4().makeTranslation(4,-2,1));
    expect([...b.attributes.dinoSkinPosition.array]).toEqual([...a.attributes.dinoSkinPosition.array]);
    expect([...b.attributes.dinoSkinNormal.array]).toEqual([...a.attributes.dinoSkinNormal.array]);
    a.dispose();b.dispose();
  });
  it('normalizes transformed skin normals on scaled and rotated anatomy', () => {
    const g=new THREE.SphereGeometry(1,16,12);
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(-2,4,1),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),0.6),new THREE.Vector3(3,0.2,1));
    dinoSkinCoordinates(THREE,g,matrix);
    const normals=g.attributes.dinoSkinNormal,positions=g.attributes.dinoSkinPosition;
    expect(positions.count).toBe(g.attributes.position.count);
    for(let i=0;i<normals.count;i++){
      const n=new THREE.Vector3().fromBufferAttribute(normals,i);
      expect(n.length()).toBeCloseTo(1,5);
      const p=new THREE.Vector3().fromBufferAttribute(positions,i);
      expect(Number.isFinite(p.x+p.y+p.z)).toBe(true);
    }
    g.dispose();
  });
});

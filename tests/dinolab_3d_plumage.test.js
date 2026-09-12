import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const require=createRequire(import.meta.url), THREE=require(resolve('vendor/three-r128/three.min.js'));
const { dinoFeatherFrame, dinoFeatherGeometry }=internals();
describe('Dino Lab feather tract orientation',()=>{
  for(const size of [0.01,1,20]) for(const side of [-1,1]){
    it('aligns a broad wing vane with its limb at size '+size+' side '+side,()=>{
      const direction=new THREE.Vector3(1,-0.2,side*0.4).multiplyScalar(size);
      const spread=new THREE.Vector3(0.2,-0.8,side*0.03);
      const originalDirection=direction.clone(),originalSpread=spread.clone();
      const frame=dinoFeatherFrame(THREE,direction,spread);
      expect(frame.length()).toBeCloseTo(1,7);
      const along=new THREE.Vector3(0,1,0).applyQuaternion(frame);
      const across=new THREE.Vector3(1,0,0).applyQuaternion(frame);
      expect(along.distanceTo(direction.clone().normalize())).toBeLessThan(1e-6);
      expect(across.dot(spread.clone().normalize())).toBeGreaterThan(0.8);
      expect(Math.abs(across.dot(along))).toBeLessThan(1e-6);
      const normal=new THREE.Vector3(0,0,1).applyQuaternion(frame);
      expect(new THREE.Vector3().crossVectors(across,along).distanceTo(normal)).toBeLessThan(1e-6);
      const g=dinoFeatherGeometry(THREE,direction.length(),size*0.14);
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(frame));g.computeBoundingBox();
      // A side study must see vertical vane width, not only the raised shaft.
      expect(g.boundingBox.max.y-g.boundingBox.min.y).toBeGreaterThan(size*0.20);
      expect(direction.toArray()).toEqual(originalDirection.toArray());
      expect(spread.toArray()).toEqual(originalSpread.toArray());g.dispose();
    });
  }
  for(const axis of [[1,0,0],[0,1,0],[0,0,1]]){
    it('has a finite orthonormal fallback for parallel axis '+axis,()=>{
      const direction=new THREE.Vector3(...axis),frame=dinoFeatherFrame(THREE,direction,direction);
      expect(frame.toArray().every(Number.isFinite)).toBe(true);
      expect(frame.length()).toBeCloseTo(1);
      expect(new THREE.Vector3(0,1,0).applyQuaternion(frame).distanceTo(direction)).toBeLessThan(1e-6);
    });
  }
  it('rejects a zero length shaft',()=>expect(dinoFeatherFrame(THREE,new THREE.Vector3(),new THREE.Vector3(1,0,0))).toBeNull());
});

describe('Dino Lab preserved Anchiornis plumage',()=>{
  const { byId, skeletalAnatomyProfileFor, reconstructionHypothesesFor }=internals();
  for(const mode of ['evidence','conservative','avian','classic']){
    it('uses the four-limb profile in '+mode+' reconstruction',()=>{
      const species=byId('anchiornis'),skeleton=skeletalAnatomyProfileFor(species);
      const hypothesis=reconstructionHypothesesFor(species,skeleton,mode).active;
      expect(species.clade).toBe('Paraves');
      expect(skeleton.wingFeathers).toBe(true);expect(skeleton.hindWingFeathers).toBe(true);
      expect(hypothesis.wingFeathers).toBe(mode!=='classic');expect(hypothesis.hindWingFeathers).toBe(mode!=='classic');
      expect(hypothesis.featureScales).toBe(mode==='classic');
    });
  }
});

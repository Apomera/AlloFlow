import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const {dinoSurfaceAnchor}=internals();

describe('Dino Lab surface anchors',()=>{
  for(const scale of [0.03,1,12]) {
    it('finds the visible surface and outward normal at scale '+scale,()=>{
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(scale,32,24),new THREE.MeshBasicMaterial());
      const hit=dinoSurfaceAnchor(THREE,mesh,new THREE.Vector3(0,0,scale*4),new THREE.Vector3(0,0,-3),scale*8);
      expect(hit).not.toBeNull();expect(hit.point.z).toBeCloseTo(scale,5);
      expect(hit.normal.z).toBeGreaterThan(0.99);expect(hit.normal.length()).toBeCloseTo(1,5);
      mesh.geometry.dispose();mesh.material.dispose();
    });
    it('keeps an attached root seated after its parent scales and rotates at scale '+scale,()=>{
      const group=new THREE.Group();
      const surface=new THREE.Mesh(new THREE.SphereGeometry(scale,32,24),new THREE.MeshBasicMaterial());
      surface.position.set(2*scale,0,0);group.add(surface);
      const hit=dinoSurfaceAnchor(THREE,surface,new THREE.Vector3(2*scale,0,scale*4),new THREE.Vector3(0,0,-1),scale*8);
      const detail=new THREE.Object3D();detail.position.copy(hit.point);group.add(detail);surface.attach(detail);
      const root=surface.worldToLocal(hit.point.clone());
      surface.rotation.set(0.3,-0.4,0.12);surface.scale.set(1,1.02,1.01);group.rotation.y=1.2;group.updateMatrixWorld(true);
      expect(detail.getWorldPosition(new THREE.Vector3()).distanceTo(surface.localToWorld(root))).toBeLessThan(scale*1e-6);
      surface.geometry.dispose();surface.material.dispose();
    });
  }
  it('returns no anchor for missing surfaces, invalid rays, or missed geometry',()=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial());
    expect(dinoSurfaceAnchor(THREE,null,new THREE.Vector3(),new THREE.Vector3(0,1,0),4)).toBeNull();
    expect(dinoSurfaceAnchor(THREE,mesh,new THREE.Vector3(),new THREE.Vector3(),4)).toBeNull();
    expect(dinoSurfaceAnchor(THREE,mesh,new THREE.Vector3(0,0,4),new THREE.Vector3(0,0,-1),-1)).toBeNull();
    expect(dinoSurfaceAnchor(THREE,mesh,new THREE.Vector3(0,0,4),new THREE.Vector3(0,1,0),8)).toBeNull();
    mesh.geometry.dispose();mesh.material.dispose();
  });
  it('transforms normals correctly on a rotated nonuniformly scaled surface',()=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshBasicMaterial());
    mesh.rotation.y=Math.PI/2;mesh.scale.set(2,1,0.5);mesh.position.set(4,3,2);
    const hit=dinoSurfaceAnchor(THREE,mesh,new THREE.Vector3(4,3,8),new THREE.Vector3(0,0,-1),12);
    expect(hit.point.z).toBeCloseTo(4);expect(hit.normal.z).toBeGreaterThan(0.99);
    expect(hit.normal.length()).toBeCloseTo(1,5);
    mesh.geometry.dispose();mesh.material.dispose();
  });
});

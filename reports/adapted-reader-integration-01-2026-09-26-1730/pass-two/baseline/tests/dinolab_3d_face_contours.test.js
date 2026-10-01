import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const {dinoFacialStripGeometry}=internals();

describe('Surface-projected facial contours',()=>{
 for(const size of [.03,1,12])for(const side of [-1,1])for(const relief of [0,.05]){
  it('conforms to a curved, translated head at scale '+size+', side '+side+', relief '+relief,()=>{
   const surface=new T.Mesh(new T.SphereGeometry(1,64,48),new T.MeshBasicMaterial());
   surface.position.set(2*size,3*size,.2*size);surface.scale.set(1.2*size,.8*size,.6*size);surface.updateMatrixWorld(true);
   const points=[[-.6,-.15,0],[0,-.2,0],[.6,-.15,0]].map(p=>new T.Vector3(...p).multiplyScalar(size).add(surface.position));
   const width=.035*size,g=dinoFacialStripGeometry(T,surface,points,{width,side,relief:relief*size});
   expect(g).not.toBeNull();expect(g.parameters.projected).toBe(g.parameters.samples);
   const p=g.attributes.position,roots=g.attributes.dinoFaceRoot,n=g.attributes.normal;
   let maxRelief=0;
   for(let i=0;i<p.count;i++){
    const local=new T.Vector3().fromBufferAttribute(p,i),world=surface.localToWorld(local.clone()),root=surface.localToWorld(new T.Vector3().fromBufferAttribute(roots,i));
    const height=world.distanceTo(root);maxRelief=Math.max(maxRelief,height);
    expect(height).toBeGreaterThanOrEqual(width*.06-size*1e-6);expect(height).toBeLessThanOrEqual(width*.06+relief*size+size*1e-6);
    const hit=new T.Raycaster(new T.Vector3(root.x,root.y,surface.position.z+side*size*3),new T.Vector3(0,0,-side)).intersectObject(surface,false)[0];
    expect(hit).toBeDefined();expect(root.distanceTo(hit.point)).toBeLessThan(size*1e-6);
    expect(Number.isFinite(local.length())).toBe(true);expect(new T.Vector3().fromBufferAttribute(n,i).length()).toBeCloseTo(1,5);expect(n.getZ(i)*side).toBeGreaterThan(0);
    expect(g.boundingBox.containsPoint(local)).toBe(true);
   }
   expect(maxRelief).toBeCloseTo(width*.06+relief*size,5);
   const rowWidth=row=>surface.localToWorld(new T.Vector3().fromBufferAttribute(roots,row*5)).distanceTo(surface.localToWorld(new T.Vector3().fromBufferAttribute(roots,row*5+4)));
   expect(rowWidth(0)).toBeLessThan(rowWidth(16)*.03);expect(rowWidth(32)).toBeLessThan(rowWidth(16)*.03);
   const child=new T.Mesh(g,new T.MeshBasicMaterial());surface.add(child);surface.rotation.y=.4;surface.updateMatrixWorld(true);
   const localRoot=new T.Vector3().fromBufferAttribute(roots,80);
   expect(child.localToWorld(localRoot.clone()).distanceTo(surface.localToWorld(localRoot.clone()))).toBeLessThan(size*1e-6);
   g.dispose();child.material.dispose();surface.geometry.dispose();surface.material.dispose();
  });
 }
 it('omits strips whose path never reaches the head',()=>{
  const surface=new T.Mesh(new T.SphereGeometry(1),new T.MeshBasicMaterial());
  expect(dinoFacialStripGeometry(T,surface,[new T.Vector3(3,3,0),new T.Vector3(4,3,0)],{width:.03,side:1})).toBeNull();
  surface.geometry.dispose();surface.material.dispose();
 });
 it('does not connect triangles across missing surface samples',()=>{
  const surface=new T.Mesh(new T.SphereGeometry(1,48,32),new T.MeshBasicMaterial());
  const g=dinoFacialStripGeometry(T,surface,[new T.Vector3(-1.4,0,0),new T.Vector3(0,0,0),new T.Vector3(1.4,0,0)],{width:.03,side:1});
  expect(g.parameters.projected).toBeLessThan(g.parameters.samples);expect(g.index.count).toBeGreaterThan(0);
  const roots=g.attributes.dinoFaceRoot;for(const i of g.index.array)expect(Math.abs(roots.getX(i))).toBeLessThan(1);
  g.dispose();surface.geometry.dispose();surface.material.dispose();
 });
});

import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_SURFACE_BLEND_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const start=source.indexOf('  function dinoBlendSurfaceNormals('),end=source.indexOf('\n  function ',start+4);
if(start<0||end<0)throw Error('Surface normal helper missing');
const blend=new Function(source.slice(start,end)+'\nreturn dinoBlendSurfaceNormals;')();
const vec=(attr,i)=>new T.Vector3().fromBufferAttribute(attr,i);
function smoothPair(scale=1,transform=false){
 const parent=new T.Group();
 const a=new T.Mesh(new T.SphereGeometry(scale,24,16),new T.MeshBasicMaterial());
 const b=new T.Mesh(new T.SphereGeometry(scale,24,16),a.material);
 b.position.x=scale*.72;parent.add(a,b);
 if(transform){parent.position.set(2*scale,-3*scale,.4*scale);parent.rotation.set(.2,-.5,.3);parent.scale.set(1.3,.8,1.1);}
 parent.updateMatrixWorld(true);return {parent,a,b};
}
function planes(scale=1,transform=false){
 const parent=new T.Group(),a=new T.Mesh(new T.PlaneGeometry(2*scale,2*scale,4,4),new T.MeshBasicMaterial()),b=new T.Mesh(a.geometry.clone(),a.material);
 for(let i=0;i<b.geometry.attributes.normal.count;i++)b.geometry.attributes.normal.setXYZ(i,0,.6,.8);
 parent.add(a,b);if(transform){parent.position.set(3*scale,-2*scale,scale);parent.rotation.set(.3,.8,-.2);parent.scale.set(1.3,.7,.9);}
 parent.updateMatrixWorld(true);return {parent,a,b};
}
function snapshot(mesh){
 mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
 return {position:Array.from(mesh.geometry.attributes.position.array),normal:Array.from(mesh.geometry.attributes.normal.array),uv:Array.from(mesh.geometry.attributes.uv.array),index:mesh.geometry.index?Array.from(mesh.geometry.index.array):null,matrix:mesh.matrixWorld.toArray(),local:mesh.matrix.toArray(),box:[mesh.geometry.boundingBox.min.toArray(),mesh.geometry.boundingBox.max.toArray()],radius:mesh.geometry.boundingSphere.radius};
}
function assertPreserved(mesh,before){const now=snapshot(mesh);delete now.normal;const old={...before};delete old.normal;expect(now).toEqual(old);}
function unitNormals(mesh){const n=mesh.geometry.attributes.normal;for(let i=0;i<n.count;i++){const value=vec(n,i);expect(value.toArray().every(Number.isFinite)).toBe(true);expect(value.length()).toBeCloseTo(1,5);}}
function dispose(f){f.a.geometry.dispose();f.b.geometry.dispose();f.a.material.dispose();}
describe('Local smoothing at overlapping life-surface joins',()=>{
 for(const scale of [.03,1,12])for(const transform of [false,true])it('averages coincident world normals symmetrically at scale '+scale+', transformed '+transform,()=>{
  const f=planes(scale,transform),before=[snapshot(f.a),snapshot(f.b)],nm=new T.Matrix3().getNormalMatrix(f.a.matrixWorld);
  const expected=new T.Vector3(0,0,1).applyMatrix3(nm).normalize().add(new T.Vector3(0,.6,.8).applyMatrix3(nm).normalize()).normalize();
  try{blend(T,f.a,f.b,scale*.2);for(const mesh of [f.a,f.b]){unitNormals(mesh);for(let i=0;i<mesh.geometry.attributes.normal.count;i++)expect(vec(mesh.geometry.attributes.normal,i).applyMatrix3(nm).normalize().distanceTo(expected)).toBeLessThan(2e-6);}assertPreserved(f.a,before[0]);assertPreserved(f.b,before[1]);}finally{dispose(f);}
 });
 it('preserves distant normals and the geometry, transforms, and attached anchors',()=>{
  const f=smoothPair(),before=[snapshot(f.a),snapshot(f.b)],anchor=new T.Object3D();anchor.position.set(.3,.2,.7);f.a.add(anchor);const anchorBefore=anchor.getWorldPosition(new T.Vector3());
  try{blend(T,f.a,f.b,.22);unitNormals(f.a);unitNormals(f.b);let changed=0,far=0;
   for(const [mesh,other,index] of [[f.a,f.b,0],[f.b,f.a,1]]){for(let i=0;i<mesh.geometry.attributes.normal.count;i++){
    const p=mesh.localToWorld(vec(mesh.geometry.attributes.position,i)),distance=Math.abs(p.distanceTo(other.getWorldPosition(new T.Vector3()))-1),n=vec(mesh.geometry.attributes.normal,i),old=new T.Vector3().fromArray(before[index].normal,i*3);
    if(n.distanceTo(old)>1e-7)changed++;if(distance>.25){far++;expect(n.toArray()).toEqual(old.toArray());}
   }assertPreserved(mesh,before[index]);}expect(changed).toBeGreaterThan(20);expect(far).toBeGreaterThan(20);expect(anchor.getWorldPosition(new T.Vector3()).toArray()).toEqual(anchorBefore.toArray());
  }finally{dispose(f);}
 });
 it('produces the same result when mesh order is reversed',()=>{
  const left=smoothPair(1,true),right=smoothPair(1,true);try{blend(T,left.a,left.b,.3);blend(T,right.b,right.a,.3);expect(Array.from(left.a.geometry.attributes.normal.array)).toEqual(Array.from(right.a.geometry.attributes.normal.array));expect(Array.from(left.b.geometry.attributes.normal.array)).toEqual(Array.from(right.b.geometry.attributes.normal.array));}finally{dispose(left);dispose(right);}
 });
 it('keeps duplicated UV seam vertices smoothly shaded',()=>{
  const f=smoothPair();try{blend(T,f.a,f.b,.3);for(const mesh of [f.a,f.b])for(let ring=0;ring<=16;ring++)expect(vec(mesh.geometry.attributes.normal,ring*25).distanceTo(vec(mesh.geometry.attributes.normal,ring*25+24))).toBeLessThan(2e-6);}finally{dispose(f);}
 });
 it('keeps every normal in front of the anatomical limit byte-identical',()=>{
  const f=planes(),before=[snapshot(f.a),snapshot(f.b)];try{blend(T,f.a,f.b,.3,0);let changed=0;for(const [mesh,j] of [[f.a,0],[f.b,1]])for(let i=0;i<mesh.geometry.attributes.normal.count;i++){
   const original=before[j].normal.slice(i*3,i*3+3),n=vec(mesh.geometry.attributes.normal,i).toArray();if(mesh.geometry.attributes.position.getX(i)<=0)expect(n).toEqual(original);else if(n.some((v,k)=>v!==original[k]))changed++;
  }expect(changed).toBeGreaterThan(0);}finally{dispose(f);}
 });
 it('leaves opposing surface normals intact',()=>{
  const f=planes();for(let i=0;i<f.b.geometry.attributes.normal.count;i++)f.b.geometry.attributes.normal.setXYZ(i,0,0,-1);const before=[snapshot(f.a),snapshot(f.b)];try{blend(T,f.a,f.b,.3);expect(Array.from(f.a.geometry.attributes.normal.array)).toEqual(before[0].normal);expect(Array.from(f.b.geometry.attributes.normal.array)).toEqual(before[1].normal);}finally{dispose(f);}
 });
 it('supports non-indexed surfaces without changing topology',()=>{
  const f=planes();for(const mesh of [f.a,f.b]){const old=mesh.geometry;mesh.geometry=old.toNonIndexed();old.dispose();}const before=[snapshot(f.a),snapshot(f.b)];try{blend(T,f.a,f.b,.3);unitNormals(f.a);unitNormals(f.b);assertPreserved(f.a,before[0]);assertPreserved(f.b,before[1]);expect(Array.from(f.a.geometry.attributes.normal.array)).not.toEqual(before[0].normal);}finally{dispose(f);}
 });
 it('is a no-op for separated surfaces',()=>{
  const f=smoothPair();f.b.position.x=8;f.parent.updateMatrixWorld(true);const before=[snapshot(f.a),snapshot(f.b)];try{blend(T,f.a,f.b,.3);expect(snapshot(f.a)).toEqual(before[0]);expect(snapshot(f.b)).toEqual(before[1]);}finally{dispose(f);}
 });
 for(const width of [0,-1,NaN,Infinity])it('does not mutate surfaces for invalid width '+width,()=>{
  const f=smoothPair(),before=[snapshot(f.a),snapshot(f.b)];try{blend(T,f.a,f.b,width);expect(snapshot(f.a)).toEqual(before[0]);expect(snapshot(f.b)).toEqual(before[1]);}finally{dispose(f);}
 });
 it('does not alter a valid mesh when its partner is missing',()=>{const f=smoothPair(),before=snapshot(f.a);try{blend(T,f.a,null,.2);expect(snapshot(f.a)).toEqual(before);}finally{dispose(f);}});
});

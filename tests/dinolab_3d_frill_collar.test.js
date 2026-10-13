import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_FRILL_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const start=source.indexOf('// DINO_DISPLAY_SHELL_START'),end=source.indexOf('// DINO_DISPLAY_SHELL_END',start);
if(start<0||end<start)throw Error('Display shell helper markers missing.');
const {dinoFrillGeometry,dinoPlateGeometry}=new Function(source.slice(start,end)+'\nreturn {dinoFrillGeometry,dinoPlateGeometry};')();
const axis=new THREE.Vector3(1,-.60,0).normalize();
const sides=128,backOffset=1+9*sides;
function depth(g,ring,side){const p=g.attributes.position;return new THREE.Vector3().fromBufferAttribute(p,1+ring*sides+side).sub(new THREE.Vector3().fromBufferAttribute(p,backOffset+1+ring*sides+side)).dot(axis);}
function bufferHash(g){const hash=createHash('sha256');for(const key of ['position','normal','uv']){const a=g.attributes[key].array;hash.update(key);hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}hash.update('index');const a=g.index.array;hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));return hash.digest('hex');}
function closedSurface(g,scale){
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,index=g.index.array,vertices=[],edges=new Map();let volume=0;
 expect(p.count).toBe(2178);expect(index.length/3).toBe(4352);expect(n.count).toBe(p.count);expect(uv.count).toBe(p.count);
 for(let i=0;i<p.count;i++){
  const v=new THREE.Vector3().fromBufferAttribute(p,i),normal=new THREE.Vector3().fromBufferAttribute(n,i);vertices.push(v);
  expect([...v.toArray(),...normal.toArray(),uv.getX(i),uv.getY(i)].every(Number.isFinite)).toBe(true);expect(normal.length()).toBeCloseTo(1,5);
  expect(g.boundingBox.containsPoint(v)).toBe(true);expect(v.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius+scale*1e-7);
 }
 for(let i=0;i<index.length;i+=3){
  const a=index[i],b=index[i+1],c=index[i+2],cross=vertices[b].clone().sub(vertices[a]).cross(vertices[c].clone().sub(vertices[a]));
  expect(cross.lengthSq()).toBeGreaterThan(scale**4*1e-18);expect(cross.dot(axis)*(i<index.length/2?1:-1)).toBeGreaterThan(scale*scale*1e-9);
  volume+=vertices[a].dot(vertices[b].clone().cross(vertices[c]))/6;
  for(const [from,to]of [[a,b],[b,c],[c,a]]){expect(from).not.toBe(to);const low=Math.min(from,to),key=low+':'+Math.max(from,to),entry=edges.get(key)||{count:0,orientation:0};entry.count++;entry.orientation+=from===low?1:-1;edges.set(key,entry);}
 }
 for(const edge of edges.values()){expect(edge.count).toBe(2);expect(edge.orientation).toBe(0);}expect(p.count-edges.size+index.length/3).toBe(2);expect(volume).toBeGreaterThan(scale**3*1e-6);
}
function nativeFrill(species,present=true){
 const a=source.indexOf('            function addFrillSurface('),b=source.indexOf('            var hasHighSail',a);if(a<0||b<a)throw Error('Native frill caller missing.');
 const model=new THREE.Group(),material=new THREE.MeshStandardMaterial(),bone=new THREE.MeshStandardMaterial(),marks=[];
 const add=new Function('THREE','hasAnatomyPart','cranialSurface','head','vec','len','ht','surfaceBodyDepth','boneMat','model','dinoMarkSpecialPart','dinoFrillGeometry','props',source.slice(a,b)+'\nreturn addFrillSurface;')
  (THREE,part=>present&&part==='frill',{frillScale:1},new THREE.Vector3(-2,1.8,0),(x,y,z)=>new THREE.Vector3(x,y,z),8,3,.8,bone,model,(mesh,part)=>marks.push([mesh,part]),dinoFrillGeometry,{species:{id:species}});
 const mesh=add(material,1);return {model,material,mesh,marks,dispose(){mesh?.geometry.dispose();material.dispose();bone.dispose();}};
}

describe('Triceratops solid caudal collar',()=>{
 for(const scale of [.03,1,12]){
  it('is closed, outward and finite within the bounded refinement budget at scale '+scale,()=>{const g=dinoFrillGeometry(THREE,scale,.82*scale,.13*scale,true);closedSurface(g,scale);expect(g.userData.dinoDisplayShell.thicknessIsInterpretive).toBe(true);g.dispose();});
  it('has a fuller caudal collar than the central sheet and lower root at scale '+scale,()=>{const g=dinoFrillGeometry(THREE,scale,.82*scale,.13*scale,true),sheet=depth(g,2,sides/4),collar=depth(g,5,sides/4),root=depth(g,5,sides*3/4);expect(sheet).toBeGreaterThan(0);expect(collar/sheet).toBeGreaterThan(1.8);expect(collar/sheet).toBeLessThan(2.4);expect(root/collar).toBeLessThan(.55);for(let ring=0;ring<8;ring++)for(let side=0;side<sides;side++){expect(depth(g,ring,side)).toBeGreaterThan(0);expect(depth(g,ring,side)).toBeLessThanOrEqual(g.userData.dinoDisplayShell.maxThickness*1.00001);}g.dispose();});
  it('retains every established outer-rim coordinate at scale '+scale,()=>{
   const g=dinoFrillGeometry(THREE,scale,.82*scale,.13*scale,true),plain=dinoFrillGeometry(THREE,scale,.82*scale,.13*scale),p=g.attributes.position;
   for(let side=0;side<sides;side++){const angle=side/sides*Math.PI*2,edge=1+.025*Math.cos(angle*14),y=Math.max(-scale*.48,Math.sin(angle)*scale*edge),i=1+8*sides+side;for(let component=0;component<3;component++)expect(p.array[i*3+component]).toBe(plain.attributes.position.array[i*3+component]);expect(p.getY(i)).toBeCloseTo(y,5);expect(p.getZ(i)).toBeCloseTo(Math.cos(angle)*.82*scale*edge,5);expect(p.getX(i)).toBeCloseTo(y*.60+.13*scale,5);}
   expect(g.index.array).toEqual(plain.index.array);expect(g.attributes.uv.array).toEqual(plain.attributes.uv.array);g.dispose();plain.dispose();
  });
 }
 for(const species of ['triceratops','protoceratops','psittacosaurus','aquilops'])it('native caller keeps one classified frill and target-only depth for '+species,()=>{
  const r=nativeFrill(species);expect(r.model.children).toHaveLength(1);expect(r.mesh.parent).toBe(r.model);expect(r.mesh.material).toBe(r.material);expect(r.mesh.userData.dinoFeature).toBe('frill');expect(r.marks).toEqual([[r.mesh,'frill']]);expect(r.mesh.geometry.userData.dinoDisplayShell.depthProfile).toBe(species==='triceratops'?'solid-caudal-collar':undefined);expect(r.mesh.castShadow&&r.mesh.receiveShadow).toBe(true);
  const p=r.mesh.geometry.attributes.position,outer=1+8*sides;expect(p.getX(outer)).toBeCloseTo(-1.72,5);expect(p.getY(outer)).toBeCloseTo(1.956,5);expect(p.getZ(outer)).toBeCloseTo(.8*.86*1.025,5);expect(p.getY(outer+sides/4)).toBeCloseTo(1.956+.6*.975,5);expect(p.getY(outer+sides*3/4)).toBeCloseTo(1.956-.6*.48,5);r.dispose();
 });
 it('native absent-anatomy gate adds no mesh or classification',()=>{const r=nativeFrill('triceratops',false);expect(r.mesh).toBeNull();expect(r.model.children).toHaveLength(0);expect(r.marks).toEqual([]);r.dispose();});
 // All legacy frill positions and UVs are guarded by dinolab_3d_frill_refinement.
 // Keep the original independent plate buffer reference unchanged.
 it('keeps absent and false solid-collar inputs identical at the refined resolution',()=>{const g=dinoFrillGeometry(THREE,3*.20,.8*.86,8*.010),off=dinoFrillGeometry(THREE,3*.20,.8*.86,8*.010,false);expect(g.attributes.position.count).toBe(2178);expect(bufferHash(off)).toBe(bufferHash(g));g.dispose();off.dispose();});
 it('retains the representative Stegosaurus plate buffers',()=>{const g=dinoPlateGeometry(THREE,.7,1.2,.07);expect(bufferHash(g)).toBe('f44d719978d6da1b211e3088cd6d3417c6bd4a582c41f76c33c9a616278d8033');g.dispose();});
});

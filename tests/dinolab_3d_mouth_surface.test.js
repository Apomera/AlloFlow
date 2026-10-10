import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_MOUTH_SURFACE_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
function extract(name){const start=source.indexOf('  function '+name+'(');if(start<0)throw Error(name);let cursor=source.indexOf('{',start),depth=1;const open=cursor++;while(depth&&cursor<source.length){if(source[cursor]==='{')depth++;if(source[cursor]==='}')depth--;cursor++;}if(depth)throw Error('Unclosed '+name);return source.slice(start,cursor);}
const strip=new Function(extract('dinoSurfaceAnchor')+'\n'+extract('dinoFacialStripGeometry')+'\nreturn dinoFacialStripGeometry;')();
const digest=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const vector=(attribute,index)=>new T.Vector3().fromBufferAttribute(attribute,index);
const GOLDEN=[{"size":0.03,"side":-1,"position":"eeaab2c418ac99f2c28902189f8ac8324ed37d264c09b300b7d85c41ce16348d","dinoFaceRoot":"a23990acc10a267ac7e3840d66b64143a3cffcb759f043ed8242c8c50f9cca99","uv":"4cc27e448ab56cd6f02f351265bd5195f64f225cc7fd959930a97fcbc3b46626","normal":"f25e65249e2f135ac74dd99a614be05a22061e95b092640d69e37e2b2bce5a01","index":"e07c26ee39630fbb7ff4ad93583622a483cbf3e631dc831f0b88be97a116aa1e","min":[-0.5167699456214905,0.09658954292535782,-1.0526902675628662],"max":[0.40578705072402954,0.297400563955307,-0.8521980047225952],"center":[-0.05549144744873047,0.1969950534403324,-0.9524441361427307],"radius":0.48219289829225354},{"size":0.03,"side":1,"position":"e6ba682e87c6f4ec07bbe7111b303f6367bad3f0d5744ee415523cc997b1b261","dinoFaceRoot":"ce09f3f90c2e6170776d11fdbec33868268e6c71692836aa4898e1c49cea2313","uv":"4cc27e448ab56cd6f02f351265bd5195f64f225cc7fd959930a97fcbc3b46626","normal":"160ee58c7c26ff83658408f0b5c67cbe2a5b3bfe558f1e03a680fba814c87cbb","index":"5aa438e35a8009d3356fa54c54527d62683a34ee89609877689d251a1f90af3c","min":[-0.40071460604667664,0.18417175114154816,0.8341144323348999],"max":[0.5213528275489807,0.3911638855934143,1.0217828750610352],"center":[0.06031911075115204,0.28766781836748123,0.9279486536979675],"radius":0.48017613203984466},{"size":1,"side":-1,"position":"eeaab2c418ac99f2c28902189f8ac8324ed37d264c09b300b7d85c41ce16348d","dinoFaceRoot":"a23990acc10a267ac7e3840d66b64143a3cffcb759f043ed8242c8c50f9cca99","uv":"4cc27e448ab56cd6f02f351265bd5195f64f225cc7fd959930a97fcbc3b46626","normal":"f25e65249e2f135ac74dd99a614be05a22061e95b092640d69e37e2b2bce5a01","index":"e07c26ee39630fbb7ff4ad93583622a483cbf3e631dc831f0b88be97a116aa1e","min":[-0.5167699456214905,0.09658954292535782,-1.0526902675628662],"max":[0.40578705072402954,0.297400563955307,-0.8521980047225952],"center":[-0.05549144744873047,0.1969950534403324,-0.9524441361427307],"radius":0.48219289829225354},{"size":1,"side":1,"position":"e6ba682e87c6f4ec07bbe7111b303f6367bad3f0d5744ee415523cc997b1b261","dinoFaceRoot":"ce09f3f90c2e6170776d11fdbec33868268e6c71692836aa4898e1c49cea2313","uv":"4cc27e448ab56cd6f02f351265bd5195f64f225cc7fd959930a97fcbc3b46626","normal":"160ee58c7c26ff83658408f0b5c67cbe2a5b3bfe558f1e03a680fba814c87cbb","index":"5aa438e35a8009d3356fa54c54527d62683a34ee89609877689d251a1f90af3c","min":[-0.40071460604667664,0.18417175114154816,0.8341144323348999],"max":[0.5213528275489807,0.3911638855934143,1.0217828750610352],"center":[0.06031911075115204,0.28766781836748123,0.9279486536979675],"radius":0.48017613203984466},{"size":12,"side":-1,"position":"eeaab2c418ac99f2c28902189f8ac8324ed37d264c09b300b7d85c41ce16348d","dinoFaceRoot":"a23990acc10a267ac7e3840d66b64143a3cffcb759f043ed8242c8c50f9cca99","uv":"4cc27e448ab56cd6f02f351265bd5195f64f225cc7fd959930a97fcbc3b46626","normal":"f25e65249e2f135ac74dd99a614be05a22061e95b092640d69e37e2b2bce5a01","index":"e07c26ee39630fbb7ff4ad93583622a483cbf3e631dc831f0b88be97a116aa1e","min":[-0.5167699456214905,0.09658954292535782,-1.0526902675628662],"max":[0.40578705072402954,0.297400563955307,-0.8521980047225952],"center":[-0.05549144744873047,0.1969950534403324,-0.9524441361427307],"radius":0.48219289829225354},{"size":12,"side":1,"position":"e6ba682e87c6f4ec07bbe7111b303f6367bad3f0d5744ee415523cc997b1b261","dinoFaceRoot":"ce09f3f90c2e6170776d11fdbec33868268e6c71692836aa4898e1c49cea2313","uv":"4cc27e448ab56cd6f02f351265bd5195f64f225cc7fd959930a97fcbc3b46626","normal":"160ee58c7c26ff83658408f0b5c67cbe2a5b3bfe558f1e03a680fba814c87cbb","index":"5aa438e35a8009d3356fa54c54527d62683a34ee89609877689d251a1f90af3c","min":[-0.40071460604667664,0.18417175114154816,0.8341144323348999],"max":[0.5213528275489807,0.3911638855934143,1.0217828750610352],"center":[0.06031911075115204,0.28766781836748123,0.9279486536979675],"radius":0.48017613203984466}];
function dispose(scene,geometry){if(geometry)geometry.dispose();scene.traverse(part=>{if(part.geometry)part.geometry.dispose();if(part.material)part.material.dispose();});}
function makeMesh(parent,center,scale,rotation=[0,0,0]){
 const mesh=new T.Mesh(new T.SphereGeometry(1,64,48),new T.MeshBasicMaterial());
 mesh.position.set(...center);mesh.scale.set(...scale);mesh.rotation.set(...rotation);parent.add(mesh);return mesh;
}
function fixtures(size,transformed){
 const scene=new T.Group(),ownerFrame=new T.Group(),jawFrame=new T.Group();scene.add(ownerFrame,jawFrame);
 const center=new T.Vector3(2*size,-size,.7*size);
 if(transformed){
  ownerFrame.position.copy(center);ownerFrame.rotation.set(.13,-.24,.12);ownerFrame.scale.set(1.1,.93,.87);
  jawFrame.position.copy(center).add(new T.Vector3(.52*size,-.025*size,.07*size));jawFrame.rotation.set(-.18,.29,-.14);jawFrame.scale.set(.92,1.07,1.13);
 }else{ownerFrame.position.copy(center);jawFrame.position.copy(center).add(new T.Vector3(.52*size,-.025*size,.07*size));}
 const owner=makeMesh(ownerFrame,[-.15*size,0,0],[1.14*size,.67*size,.65*size],[.04,.11,-.03]);
 const jaw=makeMesh(jawFrame,[.02*size,0,0],[1.05*size,.56*size,.73*size],[-.05,-.08,.06]);
 scene.updateMatrixWorld(true);
 const points=[[-.95,.01,0],[.05,-.055,0],[1.15,.025,0]].map(p=>new T.Vector3(...p).multiplyScalar(size).add(center));
 return {scene,owner,jaw,points,size};
}
// This oracle casts directly at every mesh and independently chooses the first
// visible hit. It does not use the projection helper under test.
function visibleHit(meshes,point,side){
 const bounds=new T.Box3();meshes.forEach(mesh=>bounds.union(new T.Box3().setFromObject(mesh)));
 const span=Math.max(bounds.getSize(new T.Vector3()).length(),1);
 const origin=new T.Vector3(point.x,point.y,side>0?bounds.max.z+span:bounds.min.z-span);
 const ray=new T.Raycaster(origin,new T.Vector3(0,0,-side),0,span*4);
 let nearest=null;
 meshes.forEach(mesh=>{const hit=ray.intersectObject(mesh,false)[0];if(hit&&(!nearest||hit.distance<nearest.distance))nearest=hit;});
 return nearest;
}
function normalAt(hit){
 const mesh=hit.object,p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
 const local=mesh.worldToLocal(hit.point.clone()),face=hit.face;
 const bary=T.Triangle.getBarycoord(local,vector(p,face.a),vector(p,face.b),vector(p,face.c),new T.Vector3());
 return vector(n,face.a).multiplyScalar(bary.x).addScaledVector(vector(n,face.b),bary.y).addScaledVector(vector(n,face.c),bary.z)
  .applyMatrix3(new T.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize();
}
function assertVisible(f,g,side,width,relief,rings=64){
 const roots=g.attributes.dinoFaceRoot,positions=g.attributes.position,uv=g.attributes.uv;
 let ownerCount=0,jawCount=0;
 for(let vertex=0;vertex<roots.count;vertex++){
  const root=f.owner.localToWorld(vector(roots,vertex)),point=f.owner.localToWorld(vector(positions,vertex));
  const hit=visibleHit([f.owner,f.jaw],root,side);
  expect(hit).toBeDefined();expect(root.distanceTo(hit.point)).toBeLessThan(f.size*2e-6);
  if(hit.object===f.owner)ownerCount++;if(hit.object===f.jaw)jawCount++;
  const t=uv.getX(vertex),v=uv.getY(vertex)*2-1;
  const taper=.02+.98*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.65);
  const expected=hit.point.clone().addScaledVector(normalAt(hit),width*.06+relief*taper*(1-v*v));
  expect(point.distanceTo(expected)).toBeLessThan(f.size*3e-6);
  expect(point.clone().sub(root).dot(normalAt(hit))).toBeGreaterThan(0);
  expect(g.boundingBox.containsPoint(vector(positions,vertex))).toBe(true);
 }
 expect(ownerCount).toBeGreaterThan(5);expect(jawCount).toBeGreaterThan(5);
 expect(g.parameters.projected).toBe(g.parameters.samples);expect(g.parameters.samples).toBe((rings+1)*5);
 expect(g.index.count).toBe(rings*4*6);expect(g.parameters.surfaceCount).toBe(2);
}
describe('Mouth strips follow the nearest visible head and jaw surface',()=>{
 for(const size of [.03,1,12])for(const side of [-1,1])for(const transformed of [false,true]){
  it('seats both crossing envelopes at scale '+size+', side '+side+', transformed '+transformed,()=>{
   const f=fixtures(size,transformed),width=.025*size,relief=.018*size;
   const g=strip(T,f.owner,f.points,{width,relief,side,rings:64,occluders:[f.jaw]});
   try{expect(g).not.toBeNull();assertVisible(f,g,side,width,relief);}finally{dispose(f.scene,g);}
  });
 }
 it('seats both visible envelopes at the application mouth resolution',()=>{
  for(const side of [-1,1]){
   const f=fixtures(1,true),width=.025,relief=.018;
   const g=strip(T,f.owner,f.points,{width,relief,side,rings:128,occluders:[f.jaw]});
   try{expect(g).not.toBeNull();assertVisible(f,g,side,width,relief,128);}finally{dispose(f.scene,g);}
  }
 });
 for(const side of [-1,1])it('includes a distant occluder in the world ray bounds on side '+side,()=>{
  const scene=new T.Group(),owner=makeMesh(scene,[.5,-.3,.4],[1.2,.75,.5]),jaw=makeMesh(scene,[.5,-.3,side*7],[1.2,.75,.5]);
  jaw.rotation.set(.06,.15,-.08);scene.updateMatrixWorld(true);
  const points=[[-.2,-.31,0],[.5,-.36,0],[1.2,-.31,0]].map(p=>new T.Vector3(...p));
  const g=strip(T,owner,points,{width:.02,side,rings:64,occluders:[jaw]});
  try{
   expect(g).not.toBeNull();expect(g.parameters.projected).toBe(g.parameters.samples);
   for(let i=0;i<g.attributes.dinoFaceRoot.count;i++){
    const root=owner.localToWorld(vector(g.attributes.dinoFaceRoot,i)),hit=visibleHit([owner,jaw],root,side);
    expect(hit.object).toBe(jaw);expect(root.distanceTo(hit.point)).toBeLessThan(2e-6);
   }
  }finally{dispose(scene,g);}
 });
 it('ignores missing and duplicate occluders while preserving the ordered input list',()=>{
  const f=fixtures(1,true),occluders=[null,f.owner,f.jaw,undefined,{},f.jaw];
  const before=occluders.slice(),options={width:.025,side:1,rings:64,occluders};
  const a=strip(T,f.owner,f.points,options),b=strip(T,f.owner,f.points,{width:.025,side:1,rings:64,occluders:[f.jaw]});
  try{
   expect(a.parameters.surfaceCount).toBe(2);expect(occluders).toEqual(before);expect(options.occluders).toBe(occluders);
   for(const name of ['position','dinoFaceRoot','uv','normal'])expect(Array.from(a.attributes[name].array)).toEqual(Array.from(b.attributes[name].array));
   expect(Array.from(a.index.array)).toEqual(Array.from(b.index.array));
  }finally{a.dispose();dispose(f.scene,b);}
 });
 it('preserves the control curve, source geometry, transforms and options',()=>{
  const f=fixtures(1,true),points=f.points.map(p=>p.toArray()),occluders=[f.jaw];
  const options={width:.025,relief:.018,side:-1,rings:64,occluders};
  const before=[f.owner,f.jaw].map(mesh=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),attributes:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,a])=>[name,digest(a.array)])),index:digest(mesh.geometry.index.array)}));
  const g=strip(T,f.owner,f.points,options);
  try{
   expect(f.points.map(p=>p.toArray())).toEqual(points);expect(options).toEqual({width:.025,relief:.018,side:-1,rings:64,occluders});
   [f.owner,f.jaw].forEach((mesh,index)=>{
    expect(mesh.position.toArray()).toEqual(before[index].position);expect(mesh.quaternion.toArray()).toEqual(before[index].quaternion);expect(mesh.scale.toArray()).toEqual(before[index].scale);
    for(const [name,a] of Object.entries(mesh.geometry.attributes))expect(digest(a.array)).toBe(before[index].attributes[name]);
    expect(digest(mesh.geometry.index.array)).toBe(before[index].index);
   });
  }finally{dispose(f.scene,g);}
 });
 for(const side of [-1,1])it('leaves a gap wherever neither head nor jaw is hit on side '+side,()=>{
  const scene=new T.Group(),owner=makeMesh(scene,[-.9,0,0],[.55,.6,.4]),jaw=makeMesh(scene,[.9,0,.05],[.55,.6,.45]);scene.updateMatrixWorld(true);
  const points=[new T.Vector3(-1.3,0,0),new T.Vector3(0,0,0),new T.Vector3(1.3,0,0)];
  const g=strip(T,owner,points,{width:.035,side,rings:64,occluders:[jaw]});
  try{
   expect(g).not.toBeNull();expect(g.parameters.projected).toBeLessThan(g.parameters.samples);
   const roots=g.attributes.dinoFaceRoot,seated=[];
   for(let i=0;i<roots.count;i++){const root=owner.localToWorld(vector(roots,i)),hit=visibleHit([owner,jaw],root,side);seated.push(!!hit);if(hit)expect(root.distanceTo(hit.point)).toBeLessThan(2e-6);}
   expect(seated.filter(Boolean).length).toBe(g.parameters.projected);
   let quads=0;for(let row=0;row<64;row++)for(let column=0;column<4;column++){const a=row*5+column,b=a+5;if([a,b,a+1,b+1].every(i=>seated[i]))quads++;}
   expect(g.index.count).toBe(quads*6);expect(quads).toBeGreaterThan(0);expect(quads).toBeLessThan(64*4);
   for(let i=0;i<g.index.count;i+=3){const ids=Array.from(g.index.array.slice(i,i+3));expect(ids.every(id=>seated[id])).toBe(true);const rows=ids.map(id=>Math.floor(id/5));expect(Math.max(...rows)-Math.min(...rows)).toBe(1);}
  }finally{dispose(scene,g);}
 });
 it('returns no geometry when all supplied envelopes miss the path',()=>{
  const f=fixtures(1,false);
  try{expect(strip(T,f.owner,[new T.Vector3(5,5,0),new T.Vector3(6,5,0)],{width:.025,rings:64,occluders:[f.jaw]})).toBeNull();}finally{dispose(f.scene);}
 });
});
function browFixture(size,side){
 const scene=new T.Group(),surface=makeMesh(scene,[2*size,3*size,.2*size],[1.2*size,.8*size,.6*size]);
 surface.rotation.set(.07,-.13,.03);scene.updateMatrixWorld(true);
 const points=[[-.55,.1,0],[0,.24,0],[.55,.13,0]].map(p=>new T.Vector3(...p).multiplyScalar(size).add(surface.position));
 return {scene,surface,points,options:{width:.035*size,relief:.05*size,side}};
}
describe('The unchanged single-surface brow retains its prior geometry',()=>{
 for(const row of GOLDEN)it('keeps exact baseline brow arrays at scale '+row.size+', side '+row.side,()=>{
  const f=browFixture(row.size,row.side),g=strip(T,f.surface,f.points,f.options);
  try{
   expect(g).not.toBeNull();for(const name of ['position','dinoFaceRoot','uv','normal'])expect(digest(g.attributes[name].array)).toBe(row[name]);
   expect(digest(g.index.array)).toBe(row.index);expect(g.boundingBox.min.toArray()).toEqual(row.min);expect(g.boundingBox.max.toArray()).toEqual(row.max);
   expect(g.boundingSphere.center.toArray()).toEqual(row.center);expect(g.boundingSphere.radius).toBe(row.radius);
   expect(g.parameters.rings).toBe(32);expect(g.parameters.projected).toBe(g.parameters.samples);expect(g.parameters.surfaceCount).toBe(1);
  }finally{dispose(f.scene,g);}
 });
});

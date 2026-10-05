import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const source=fs.readFileSync(process.env.SCALE_VIRUS_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8'),sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.virusChecks={sites:VIRUS_SITES,route:VIRUS_ROUTE,point:virusPoint,view:virusRouteView,index:virusRouteIndex,number:virusRouteNumber,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup,items:ITEMS,limit:inspectionLimit};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const v=sandbox.window.virusChecks,plain=value=>JSON.parse(JSON.stringify(value)),details=()=>v.details('virus',(k,f)=>f);
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
function model(){
 const resources=new Set(),context={T,VIRUS_SITES:v.sites,track:value=>(resources.add(value),value)};
 context.sphere=context.track(new T.SphereGeometry(.5,32,24));
 context.material=(color,options)=>{const m=context.track(new T.MeshStandardMaterial(Object.assign({color,roughness:.78,metalness:0},options||{})));m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();return m;};
 context.mesh=(g,geo,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.scale.set(sx||1,sy||sx||1,sz||sx||1);g.add(m);return m;};
 context.ball=(g,mat,x,y,z,sx,sy,sz)=>context.mesh(g,context.sphere,mat,x,y,z,sx,sy,sz);
 context.rod=(g,a,b,r,mat)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5),length=av.distanceTo(bv);const m=context.mesh(g,context.track(new T.CylinderGeometry(r,r,length,8,1)),mat,...mid.toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;};
 context.tube=(g,points,radius,mat)=>context.mesh(g,context.track(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(16,points.length*4),radius,10,false)),mat);
 context.random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 vm.runInNewContext(source.slice(source.indexOf('  function virusModel(g)'),source.indexOf('    function model(item)')),context);
 const g=new T.Group();context.virusModel(g);g.updateMatrixWorld(true);return{g,virus:g.userData.virus,resources,paint:context.virusPaint};
}

describe('Scale Explorer influenza surface and genome journey',()=>{
 it('provides fourteen cited views while preserving the 100 nm particle reference',()=>{
  expect(plain(v.route)).toEqual(['ha','na','lipid-envelope','m2-channel','m1-matrix',...Array.from({length:8},(_,i)=>'rnp-'+(i+1)),'polymerase']);
  const all=details();expect(all).toHaveLength(14);expect(new Set(all.map(d=>d.id)).size).toBe(14);
  for(const d of all){expect(d.virusSite).toBe(true);expect(d.marker).toBe(false);expect(d.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...d.view)).toBeCloseTo(1,9);expect(d.zoom).toBeLessThanOrEqual(5);expect(d.source).toMatch(/^https:\/\//);}
  expect(all.slice(0,4).every(d=>d.cutaway===false)).toBe(true);expect(all.slice(4).every(d=>d.cutaway===true)).toBe(true);
  expect(v.items.find(i=>i.id==='virus')).toMatchObject({size:1e-7,dim:'across'});expect(v.items.find(i=>i.id==='virus').describe).toContain('eight RNA segments');expect(v.items.find(i=>i.id==='virus').describe).toContain('enveloped');expect(v.limit('virus')).toBe(5);
 });
 it('bounds the route without coercing malformed input or ambiguous structure IDs',()=>{
  expect([0,1,2.4,2.5,14,100].map(v.number)).toEqual([1,1,2,3,14,14]);expect([null,undefined,'14',NaN,Infinity,{},[]].map(v.number)).toEqual([1,1,1,1,1,1,1]);
  expect(Array.from(v.route).map(v.index)).toEqual(Array.from({length:14},(_,i)=>i+1));expect(['rnp-1 ','RNP-1',null,{},2].map(v.index)).toEqual([0,0,0,0,0]);expect(v.point('rnp-9')).toBeNull();
 });
 it('returns detached coordinates and eight distinct RNA viewpoints',()=>{
  const original=plain(v.sites),bundles=Array.from({length:8},(_,i)=>v.view(i+6));expect(new Set(bundles.map(p=>p.at.join(','))).size).toBe(8);
  for(const p of bundles){expect(Math.hypot(...p.view)).toBeCloseTo(1,9);p.at[0]=99;p.view[0]=99;}
  expect(plain(v.sites)).toEqual(original);expect(v.view(6).at[0]).not.toBe(99);
 });
 it('preserves an exact RNA observation through notebook backups and rejects nonexistent bundles',()=>{
  const raw=[{itemId:'virus',detailId:'rnp-8',cutaway:true,zoom:4,note:'The central bundle sits among seven others.'},{itemId:'virus',detailId:'rnp-9'}],notes=plain(v.notes(raw));
  expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject({itemId:'virus',detailId:'rnp-8',size:1e-7,zoom:4,cutaway:true,note:raw[0].note});
  const parsed=v.parse(v.backup({observations:notes}));expect(parsed.error).toBeUndefined();expect(plain(parsed.notebook.observations)).toEqual(notes);
  expect(plain(v.drafts({'virus:rnp-8':'Eight separate segments.','virus:rnp-9':'Invalid.'}))).toEqual({'virus:rnp-8':'Eight separate segments.'});
 });
 it('creates native surface types and exactly eight independently inspectable genome bundles',()=>{
  const {virus}=model();expect(virus.rnps).toHaveLength(8);expect(virus.stats).toMatchObject({rnpBundles:8,haSubunits:3,naSubunits:4,m2Helices:4});
  for(const id of Array.from(v.route))expect(virus.meshes.some(m=>m.userData.virusDetailId===id),id).toBe(true);
  for(let i=0;i<8;i++){const tagged=[];virus.rnps[i].traverse(m=>{if(m.isMesh&&m.userData.virusDetailId==='rnp-'+(i+1))tagged.push(m);});expect(tagged.length).toBeGreaterThan(0);}
  expect(virus.stats.triangles).toBeLessThan(300000);expect(virus.stats.drawables).toBeLessThan(70);
 });
 it('keeps all geometry finite, tracked, and compatible with WebGL 1 element indices',()=>{
  const {g,resources}=model(),geometries=new Set();g.traverse(m=>{if(m.geometry)geometries.add(m.geometry);});
  for(const geo of geometries){expect(resources.has(geo)).toBe(true);if(geo.index)expect(geo.index.array.BYTES_PER_ELEMENT).toBe(2);const a=geo.attributes.position,n=geo.attributes.normal;
   for(let i=0;i<a.count;i++){if(!Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i)))throw Error('Invalid position');if(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.001)throw Error('Invalid normal');}
  }
 });
 it('opens an actual section while preserving measured width and all resource identities',()=>{
  const {g,virus,resources,paint}=model(),count=resources.size,uuids=virus.meshes.map(m=>[m.geometry.uuid,m.material.uuid]);expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});
  const bounds=new T.Box3().setFromObject(g);expect(bounds.max.x).toBeLessThanOrEqual(.505);expect(bounds.min.x).toBeGreaterThanOrEqual(-.505);expect(bounds.max.x-bounds.min.x).toBeGreaterThan(.9);
  expect(virus.cover.visible).toBe(true);expect(virus.inside.visible).toBe(false);paint(virus,true,'rnp-8');expect(virus.cover.visible).toBe(false);expect(virus.inside.visible).toBe(true);expect(virus.cutEdge.visible).toBe(true);
  expect(virus.rnps[7].children.every(m=>m.material.opacity===1&&m.material.depthWrite&&!m.material.transparent)).toBe(true);expect(virus.rnps.slice(0,7).every(p=>p.children.every(m=>m.material.opacity===.18&&!m.material.depthWrite&&m.material.transparent))).toBe(true);
  const settledVersions=virus.rnps.map(p=>p.children.map(m=>m.material.version));for(let n=0;n<100;n++)paint(virus,true,'rnp-8');expect(virus.rnps.map(p=>p.children.map(m=>m.material.version))).toEqual(settledVersions);
  paint(virus,true,'rnp-8',.5);expect(virus.rnps[7].children.every(m=>m.material.opacity===.5&&m.material.transparent)).toBe(true);expect(virus.rnps[0].children.every(m=>m.material.opacity===.09)).toBe(true);paint(virus,true,'rnp-8',NaN);expect(virus.rnps[7].children.every(m=>m.material.opacity===1&&!m.material.transparent)).toBe(true);
  g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);expect(g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0)))).toBeCloseTo(3,10);
  for(let n=0;n<1000;n++)paint(virus,n%2===0,v.route[n%14]);expect(resources.size).toBe(count);expect(virus.meshes.map(m=>[m.geometry.uuid,m.material.uuid])).toEqual(uuids);
  paint(virus,false,'');expect(virus.cover.visible).toBe(true);expect(virus.inside.visible).toBe(false);expect(virus.cutEdge.visible).toBe(false);expect(g.userData.extent).toBe(1);expect(virus.rnps.every(p=>p.children.every(m=>m.material.opacity===1&&m.material.depthWrite&&!m.material.transparent))).toBe(true);
 });
 it('tracks and disposes the composed particle without retaining its custom GPU resources',()=>{
  const {resources}=model();let disposed=0;for(const r of resources){r.addEventListener('dispose',()=>disposed++);r.dispose();}expect(disposed).toBe(resources.size);
 });
});

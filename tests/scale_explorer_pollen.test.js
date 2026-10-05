import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const source=fs.readFileSync(process.env.SCALE_POLLEN_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8'),sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.pollenChecks={sites:POLLEN_SITES,path:POLLEN_TUBE_PATH,tube:pollenTubePoint,route:POLLEN_ROUTE,point:pollenPoint,view:pollenRouteView,index:pollenRouteIndex,number:pollenRouteNumber,growth:pollenGrowthValue,details:atlasDetails,detail:pollenDetail,notes:readObservations,drafts:readObservationDrafts,items:ITEMS,limit:inspectionLimit};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const p=sandbox.window.pollenChecks,plain=v=>JSON.parse(JSON.stringify(v)),details=()=>p.details('pollen',(k,f)=>f);
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
function model(){
 const resources=new Set(),context={T,POLLEN_SITES:p.sites,POLLEN_TUBE_PATH:p.path,track:v=>(resources.add(v),v)};
 context.sphere=context.track(new T.SphereGeometry(.5,32,24));
 context.material=(color,options)=>{const m=context.track(new T.MeshStandardMaterial(Object.assign({color,roughness:.78,metalness:0},options||{})));m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();return m;};
 context.mesh=(g,geo,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.scale.set(sx||1,sy||sx||1,sz||sx||1);g.add(m);return m;};
 context.ball=(g,mat,x,y,z,sx,sy,sz)=>context.mesh(g,context.sphere,mat,x,y,z,sx,sy,sz);
 context.tube=(g,points,radius,mat)=>context.mesh(g,context.track(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),Math.max(16,points.length*4),radius,10,false)),mat);
 context.random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 vm.runInNewContext(source.slice(source.indexOf('    function pollenModel(g)'),source.indexOf('    function model(item)')),context);
 const g=new T.Group();context.pollenModel(g);g.updateMatrixWorld(true);return {g,pollen:g.userData.pollen,resources,paint:context.pollenPaint};
}
describe('Scale Explorer botanical pollen journey',()=>{
 it('provides eight cited anatomical views and preserves the grain reference',()=>{
  expect(plain(p.route)).toEqual(['exine','colpus-1','colpus-2','colpus-3','intine','vegetative-nucleus','generative-cell','pollen-tube']);
  const all=details();expect(all).toHaveLength(8);expect(new Set(all.map(d=>d.id)).size).toBe(8);
  for(const d of all){expect(d.marker).toBe(false);expect(d.pollenSite).toBe(true);expect(d.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...d.view)).toBeCloseTo(1,9);expect(d.zoom).toBeLessThanOrEqual(5);expect(d.source).toMatch(/^https:\/\//);}
  expect(all.filter(d=>d.cutaway).map(d=>d.id)).toEqual(['intine','vegetative-nucleus','generative-cell']);expect(p.items.find(i=>i.id==='pollen')).toMatchObject({size:2.5e-5,dim:'across'});expect(p.limit('pollen')).toBe(5);expect(p.limit('earth')).toBe(2.5);
 });
 it('bounds routes and extension without coercing malformed input',()=>{
  expect([0,1,2.4,2.5,8,100].map(p.number)).toEqual([1,1,2,3,8,8]);expect([null,undefined,'8',NaN,Infinity,{},[]].map(p.number)).toEqual([1,1,1,1,1,1,1]);
  expect([-.2,0,.45,1,2].map(p.growth)).toEqual([0,0,.45,1,1]);expect([null,'1',NaN,Infinity].map(p.growth)).toEqual([0,0,0,0]);
  expect(Array.from(p.route).map(p.index)).toEqual([1,2,3,4,5,6,7,8]);expect(['colpus-1 ','COLPUS-1',null,{},2].map(p.index)).toEqual([0,0,0,0,0]);expect(p.point('missing')).toBeNull();
 });
 it('returns detached camera coordinates and three distinct aperture bearings',()=>{
  const before=plain(p.sites),colpi=[2,3,4].map(n=>p.view(n,.5));expect(new Set(colpi.map(d=>d.at.join(','))).size).toBe(3);
  for(const c of colpi){expect(Math.hypot(...c.view)).toBeCloseTo(1,9);c.at[0]=99;c.view[0]=99;}
  expect(plain(p.sites)).toEqual(before);expect(p.view(2).at[0]).not.toBe(99);
 });
 it('follows the chosen Bezier path continuously and attaches it to the first aperture',()=>{
  expect(p.tube(0).at).toEqual(p.path[0]);expect(p.tube(1).at).toEqual(p.path[3]);expect(p.tube(.5).at.every(Number.isFinite)).toBe(true);
  let previous=p.tube(0).at;for(let n=1;n<=100;n++){const at=p.tube(n/100).at;expect(Math.hypot(...at.map((v,i)=>v-previous[i]))).toBeLessThan(.02);previous=at;}
  const detail=details().find(d=>d.id==='pollen-tube');expect(p.detail(detail,.7).at).toEqual(p.tube(.7).at);expect(detail.at).toEqual(p.tube(0).at);
 });
 it('persists exact landmark and extension values and rejects invalid targets',()=>{
  const notes=plain(p.notes([{itemId:'pollen',detailId:'pollen-tube',pollenGrowth:.73,cutaway:false,zoom:3.4,note:'A chosen extension.'},{itemId:'pollen',detailId:'intine',pollenGrowth:999,cutaway:true},{itemId:'pollen',detailId:'colpus-1',pollenGrowth:'1'},{itemId:'pollen',detailId:'colpus-4'}]));
  expect(notes.map(n=>n.pollenGrowth)).toEqual([.73,1,0]);expect(notes[0]).toMatchObject({size:2.5e-5,detailId:'pollen-tube',cutaway:false,zoom:3.4,note:'A chosen extension.'});expect(notes[1].cutaway).toBe(true);
  expect(plain(p.drafts({'pollen:intine':'Two walls.','pollen:colpus-4':'Invalid.'}))).toEqual({'pollen:intine':'Two walls.'});
  expect(p.notes([{itemId:'earth',pollenGrowth:.7}])[0].pollenGrowth).toBe(0);
 });
 it('creates a reticulated wall, three genuine aperture meshes and bounded interior geometry',()=>{
  const {g,pollen,resources}=model();expect(g.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});expect(pollen.stats.apertures).toBe(3);expect(pollen.stats.reticulumCells).toBeGreaterThan(100);expect(pollen.stats.reticulumEdges).toBeGreaterThan(300);expect(pollen.stats.triangles).toBeLessThan(250000);expect(pollen.stats.drawables).toBeLessThan(40);
  for(const id of ['exine','colpus-1','colpus-2','colpus-3','intine','vegetative-nucleus','generative-cell','pollen-tube'])expect(pollen.meshes.some(m=>m.userData.pollenDetailId===id)).toBe(true);
  const geometries=new Set();g.traverse(m=>{if(m.geometry)geometries.add(m.geometry);});for(const geo of geometries){expect(resources.has(geo)).toBe(true);const a=geo.attributes.position,n=geo.attributes.normal;for(let i=0;i<a.count;i++){if(!Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i)))throw Error('Invalid position');if(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.0001)throw Error('Invalid normal');}}
 });
 it('opens the front section without changing the measured frame or allocating new resources',()=>{
  const {g,pollen,resources,paint}=model(),initialCount=resources.size,uuids=pollen.meshes.map(m=>[m.geometry.uuid,m.material.uuid]);
  expect(pollen.cover.visible).toBe(true);expect(pollen.inside.visible).toBe(false);paint(pollen,true,'intine',0);expect(pollen.cover.visible).toBe(false);expect(pollen.inside.visible).toBe(true);expect(pollen.cutEdge.visible).toBe(true);
  g.scale.setScalar(3);g.rotation.y=.7;g.updateMatrixWorld(true);const width=g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0)));expect(width).toBeCloseTo(3,10);
  for(let n=0;n<1000;n++)paint(pollen,n%2===0,n%3?'intine':'pollen-tube',(n%101)/100);expect(resources.size).toBe(initialCount);expect(pollen.meshes.map(m=>[m.geometry.uuid,m.material.uuid])).toEqual(uuids);expect(g.userData.extent).toBe(1);
  paint(pollen,false,'',0);expect(pollen.cover.visible).toBe(true);expect(pollen.inside.visible).toBe(false);expect(pollen.cutEdge.visible).toBe(false);expect(pollen.tube.visible).toBe(false);
 });
 it('moves the actual tube endpoint to each controlled fraction and resets draw range exactly',()=>{
  const {pollen,paint}=model(),positions=pollen.extension.geometry.attributes.position.array,indices=pollen.extension.geometry.index.count;paint(pollen,false,'pollen-tube',1);const baseline=positions.slice();
  for(const growth of [.01,.3,.73,1,.2]){paint(pollen,false,'pollen-tube',growth);expect(pollen.apex.position.toArray()).toEqual(p.tube(growth).at);expect(pollen.extension.geometry.drawRange.count).toBe(Math.ceil(growth*96)*12*6);expect(pollen.extension.geometry.drawRange.count).toBeLessThanOrEqual(indices);}
  paint(pollen,false,'',0);expect(pollen.extension.geometry.drawRange.count).toBe(0);paint(pollen,false,'pollen-tube',1);expect(Array.from(positions)).toEqual(Array.from(baseline));
 });
});

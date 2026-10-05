import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import path from 'node:path';

const source=fs.readFileSync(process.env.SCALE_RIBO_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.riboChecks={data:RIBOSOME_STRUCTURE,route:RIBO_ROUTE,number:riboRouteNumber,index:riboRouteIndex,point:riboPoint,view:riboRouteView,detail:riboDetail,details:atlasDetails,observations:readObservations,drafts:readObservationDrafts,items:ITEMS,limit:inspectionLimit};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const r=sandbox.window.riboChecks,plain=v=>JSON.parse(JSON.stringify(v));
const details=id=>r.details(id,(k,f)=>f);
const T=createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));
function model(data=r.data){
 const resources=new Set(),context={T,RIBOSOME_STRUCTURE:data,track:v=>(resources.add(v),v)};
 context.material=(color,opts)=>{const m=context.track(new T.MeshStandardMaterial(Object.assign({color,roughness:.78,metalness:0},opts||{})));m.color.convertSRGBToLinear();m.emissive.convertSRGBToLinear();return m;};
 context.mesh=(g,geometry,material)=>{const m=new T.Mesh(geometry,material);g.add(m);return m;};
 vm.runInNewContext(source.slice(source.indexOf('    function ribosomeModel(g)'),source.indexOf('    function model(item)')),context);
 const group=new T.Group();context.ribosomeModel(group);group.updateMatrixWorld(true);
 return {group,ribo:group.userData.ribosome,resources,paint:context.ribosomePaint,slice:context.ribosomeSlice};
}
describe('Scale Explorer experimental bacterial ribosome',()=>{
 it('includes one declared assembly with the deposited ligand identities',()=>{
  expect(r.data.provenance).toMatchObject({pdb:'4V5D',assemblyId:'1',method:'X-ray diffraction',resolutionAngstrom:3.5,organism:'Thermus thermophilus HB8',operationIds:['1']});
  expect(r.data.chains).toHaveLength(57);expect(r.data.chains.filter(c=>c.kind==='protein')).toHaveLength(50);expect(r.data.chains.filter(c=>c.kind==='rna')).toHaveLength(7);
  expect(r.data.chains.reduce((n,c)=>n+c.residues.length,0)).toBe(10596);
  expect(['trna-a','trna-p','trna-e','mrna'].map(part=>r.data.chains.find(c=>c.part===part).auth)).toEqual(['AY','AV','AW','AX']);
  expect(r.data.chains.find(c=>c.part==='mrna').residues.map(v=>v[0])).toEqual([12,13,14,15,16,17,18,19,20,21,22]);
  expect(r.data.provenance.coordinateSource).toBe('https://files.rcsb.org/download/4V5D.cif.gz');expect(r.data.provenance.gzipSha256).toMatch(/^[a-f0-9]{64}$/);
 });
 it('retains finite representative coordinates and polymer order inside the padded reference',()=>{
  for(const c of r.data.chains){expect(c.sequenceIds).toHaveLength(c.residues.length);for(let i=0;i<c.residues.length;i++){
   expect(c.residues[i].slice(2).every(Number.isFinite)).toBe(true);expect(Math.abs(c.residues[i][2])).toBeLessThanOrEqual(.494001);if(i)expect(c.sequenceIds[i]).toBeGreaterThan(c.sequenceIds[i-1]);
  }}
  expect(r.data.normalization).toMatchObject({width:1,radiusPadding:.006,catalogueReferenceMeters:2.5e-8});
  const rotation=r.data.normalization.rotation;for(let i=0;i<3;i++){expect(Math.hypot(...rotation[i])).toBeCloseTo(1,12);for(let j=i+1;j<3;j++)expect(rotation[i].reduce((n,v,k)=>n+v*rotation[j][k],0)).toBeCloseTo(0,12);}
 });
 it('provides seven distinct landmarks and a five-stop route with scientific sources',()=>{
  expect(plain(r.route)).toEqual(['mrna-channel','trna-a','trna-p','peptide-center','trna-e']);
  const all=details('ribosome');expect(all).toHaveLength(7);expect(new Set(all.map(d=>d.id)).size).toBe(7);
  expect(all.filter(d=>d.riboRoute).map(d=>d.id)).toEqual(r.route);
  for(const d of all){expect(d.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...d.view)).toBeCloseTo(1,9);expect(d.zoom).toBeLessThanOrEqual(5);expect(d.source).toMatch(/^https:\/\//);expect(d.marker).toBe(false);}
  expect(all.find(d=>d.id==='peptide-center').riboPart).toBe('large');expect(details('ecoli').find(d=>d.id==='ribosomes').visit).toBe('ribosome');
 });
 it('bounds route numbers without accepting coercible input or malformed IDs',()=>{
  expect([0,1,2.49,2.5,5,99].map(r.number)).toEqual([1,1,2,3,5,5]);expect([null,undefined,NaN,Infinity,'5',{},[]].map(r.number)).toEqual([1,1,1,1,1,1,1]);
  expect(Array.from(r.route).map(r.index)).toEqual([1,2,3,4,5]);expect(['TRNA-A','trna-a ',' trna-a','small-subunit',null,3,{}].map(r.index)).toEqual([0,0,0,0,0,0,0]);
  expect(r.point('trna-a ')).toBeNull();expect(r.point({})).toBeNull();expect(r.view(NaN).id).toBe('mrna-channel');
 });
 it('shifts only subunit landmarks in a separated view without mutating native coordinates',()=>{
  const before=plain(r.data.landmarks);
  for(const p of r.data.landmarks){const a=r.point(p.id,false),b=r.point(p.id,true),offset=p.part==='small'?-.16:p.part==='large'?.16:0;
   expect(b.at[0]).toBe(a.at[0]);expect(b.at[1]-a.at[1]).toBeCloseTo(offset,12);expect(b.at[2]).toBe(a.at[2]);
   a.at[0]=99;a.view[0]=99;expect(r.point(p.id,false).at[0]).not.toBe(99);
  }
  expect(plain(r.data.landmarks)).toEqual(before);const d=details('ribosome').find(d=>d.id==='peptide-center'),shifted=r.detail(d,true);expect(shifted).not.toBe(d);expect(shifted.at[1]-d.at[1]).toBeCloseTo(.16,12);expect(r.detail(null,true)).toBeNull();
 });
 it('round trips exact route notes, drafts and deep inspection in the existing notebook schema',()=>{
  const notes=plain(r.observations([{itemId:'ribosome',detailId:'trna-p',zoom:4,cutaway:true,note:'P site.'},{itemId:'ribosome',detailId:'peptide-center',zoom:100,yaw:.2,pitch:.1},{itemId:'ribosome',detailId:'trna-px'}]));
  expect(notes.map(n=>n.detailId)).toEqual(['trna-p','peptide-center']);expect(notes[0]).toMatchObject({size:2.5e-8,zoom:4,cutaway:true,note:'P site.'});expect(notes[1]).toMatchObject({zoom:5,pitch:.1});expect(notes[1].yaw).toBeCloseTo(.2,12);
  expect(plain(r.drafts({'ribosome:trna-p':'Bound RNA.','ribosome:trna-px':'Invalid.'}))).toEqual({'ribosome:trna-p':'Bound RNA.'});
  expect(r.items.find(i=>i.id==='ribosome')).toMatchObject({size:2.5e-8,dim:'across'});expect(r.limit('ribosome')).toBe(5);expect(r.limit('earth')).toBe(2.5);
 });
 it('builds bounded batched paths with finite unit normals and tracked resources',()=>{
  const {group,ribo,resources}=model(),bounds=new T.Box3().setFromObject(group);expect(group.userData).toMatchObject({dimension:'x',extent:1,measureCenter:0});
  expect(bounds.min.x).toBeGreaterThanOrEqual(-.5);expect(bounds.max.x).toBeLessThanOrEqual(.5);expect(ribo.stats.residues).toBe(10596);expect(ribo.stats.drawables).toBe(8);expect(ribo.stats.triangles).toBeLessThan(190000);expect(resources.size).toBe(16);
  for(const m of ribo.meshes){expect(resources.has(m.geometry)).toBe(true);expect(resources.has(m.material)).toBe(true);const p=m.geometry.attributes.position,n=m.geometry.attributes.normal;
   for(let i=0;i<p.count;i++){if(!Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)))throw Error('Invalid position');if(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>1e-5)throw Error('Invalid normal');}
  }
 });
 it('changes pose and protein visibility without changing the reference, bound RNA or resources',()=>{
  const {group,ribo,resources,paint}=model(),bounds=new T.Box3().setFromObject(group),geometry=ribo.meshes.map(m=>m.geometry),materials=ribo.meshes.map(m=>m.material);
  paint(ribo,true,'trna-a',false);expect(ribo.small.position.y).toBe(-.16);expect(ribo.large.position.y).toBe(.16);for(const k of ['mrna','trnaA','trnaP','trnaE'])expect(ribo[k].position.length()).toBe(0);
  expect(ribo.proteinMeshes.every(m=>!m.visible)).toBe(true);expect(ribo.meshes.filter(m=>m.userData.ribosomeKind==='rna').every(m=>m.visible)).toBe(true);
  for(let i=0;i<1000;i++)paint(ribo,i%2===0,i%3===0?'peptide-center':'trna-a',i%4===0);expect(resources.size).toBe(16);expect(ribo.meshes.map(m=>m.geometry)).toEqual(geometry);expect(ribo.meshes.map(m=>m.material)).toEqual(materials);
  paint(ribo,false,'',true);group.updateMatrixWorld(true);expect(new T.Box3().setFromObject(group).equals(bounds)).toBe(true);expect(ribo.proteinMeshes.every(m=>m.visible)).toBe(true);expect(group.userData.extent).toBe(1);
 });
 it('transforms the preallocated catalytic slice with the separated subunit and clears it on exit',()=>{
  const {group,ribo,paint,slice,resources}=model();group.scale.setScalar(3);group.position.set(2,4,-3);group.rotation.set(.1,.7,.2);paint(ribo,true,'peptide-center',true);group.updateMatrixWorld(true);slice(ribo);
  expect(ribo.sliceActive).toBe(true);const p=r.point('peptide-center',false),onPlane=new T.Vector3(p.at[0],p.at[1],p.at[2]+.035);ribo.large.localToWorld(onPlane);expect(ribo.sliceWorld.distanceToPoint(onPlane)).toBeCloseTo(0,10);
  const front=ribo.large.localToWorld(new T.Vector3(p.at[0],p.at[1],p.at[2]+.10)),back=ribo.large.localToWorld(new T.Vector3(p.at[0],p.at[1],p.at[2]));expect(ribo.sliceWorld.distanceToPoint(front)).toBeLessThan(0);expect(ribo.sliceWorld.distanceToPoint(back)).toBeGreaterThan(0);
  expect(ribo.meshes.filter(m=>m.userData.ribosomePart==='large').every(m=>m.material.clippingPlanes===ribo.slicePlanes)).toBe(true);expect(ribo.meshes.filter(m=>m.userData.ribosomePart!=='large').every(m=>!m.material.clippingPlanes)).toBe(true);
  for(let i=0;i<1000;i++)slice(ribo);expect(resources.size).toBe(16);paint(ribo,true,'trna-p',true);expect(ribo.sliceActive).toBe(false);expect(ribo.meshes.every(m=>!m.material.clippingPlanes)).toBe(true);
  paint(ribo,false,'peptide-center',true);expect(ribo.sliceActive).toBe(false);
 });
 it('does not bridge missing polymer sequence IDs and disposes every owned render resource',()=>{
  const synthetic=plain(r.data);synthetic.chains=[{id:'test',part:'mrna',kind:'rna',residues:[[1,'A',-.03,0,0],[2,'U',-.01,0,0],[4,'G',.01,0,0],[5,'C',.03,0,0]],sequenceIds:[1,2,4,5]}];
  const {ribo,resources}=model(synthetic);expect(ribo.stats.gaps).toBe(1);expect(ribo.stats.segments).toBe(2);const disposed=[];for(const resource of resources){resource.addEventListener('dispose',()=>disposed.push(resource));resource.dispose();}expect(new Set(disposed).size).toBe(resources.size);
 });
});

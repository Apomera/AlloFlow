import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.galcentreChecks={reference:GALCENTRE_REFERENCE_M,pc:GALCENTRE_PC_M,ly:GALCENTRE_LY_M,disk:GALCENTRE_DISK_M,routeIndex:galcentreRouteIndex,progress:galcentreProgressValue,point:galcentrePoint,clipNear:galcentreClipNear,limit:inspectionLimit,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.galcentreChecks,plain=x=>JSON.parse(JSON.stringify(x));
const ids=['gc-overview','gc-sun','gc-dust','gc-bulge','gc-cmz','gc-cluster','gc-core'];
const details=plain(api.details('galactic-centre',(_,fallback)=>fallback));
const closeVector=(actual,expected,digits=12)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};

describe('Galactic Centre distance atlas and saved logarithmic passage',()=>{
 it('keeps the catalog distance distinct from the surrounding galactic disc',()=>{
  expect(api.items.find(item=>item.id==='galactic-centre')).toMatchObject({size:2.5e20,dim:'distance'});expect(api.reference).toBe(2.5e20);expect(api.pc).toBe(3.0856775814913673e16);expect(api.ly).toBe(9.4607304725808e15);expect(api.disk).toBe(9.5e20);expect(api.disk/api.reference).toBeCloseTo(3.8,14);
 });
 it('offers seven sourced landmarks and exactly 101 separately identified journey positions',()=>{
  expect(details).toHaveLength(108);expect(details.filter(d=>!d.galcentreSample).map(d=>d.id)).toEqual(ids);expect(new Set(details.map(d=>d.id)).size).toBe(108);
  for(const d of details){const p=api.point(d.id);expect([...p.at,...p.view,p.zoom,p.progress,p.fraction,p.remainingPc,p.spanPc].every(Number.isFinite)).toBe(true);expect(p.at).toHaveLength(3);expect(p.view).toHaveLength(3);expect(Math.hypot(...p.view)).toBeGreaterThan(0);expect(p.zoom).toBeGreaterThanOrEqual(1);expect(p.zoom).toBeLessThanOrEqual(api.limit('galactic-centre'));closeVector(d.at,p.at);closeVector(d.view,p.view);expect(d.zoom).toBe(p.zoom);expect(d.label.trim()).toBeTruthy();expect(d.body.trim()).toBeTruthy();expect(d.source).toMatch(/^https:\/\//);}
  expect(details.filter(d=>d.galcentreSample).map(d=>d.id)).toEqual(Array.from({length:101},(_,n)=>'gc-passage-'+n));
 });
 it('accepts only canonical encoded passage IDs and finite numeric progress',()=>{
  for(let n=0;n<=100;n++)expect(api.routeIndex('gc-passage-'+n)).toBe(n);
  for(const id of [undefined,null,0,true,{},[],'','gc-overview','gc-passage-','gc-passage--1','gc-passage-101','gc-passage-01','gc-passage-1.0','gc-passage-+1','gc-passage-1x','gc-passage-1\n','constructor','__proto__'])expect(api.routeIndex(id)).toBe(null);
  for(const n of [0,1,25,50,75,99,100])expect(api.progress(n)).toBe(n);
  for(const n of [-1,-Infinity,NaN,Infinity,undefined,null,'50',[],{},true])expect(api.progress(n)).toBe(0);
  expect(api.progress(101)).toBe(100);expect(api.progress(Number.MAX_VALUE)).toBe(100);
 });
 it('approaches the centre logarithmically while keeping metre distances linear in the scene',()=>{
  const r0=2.5e20/3.0856775814913673e16,ratio=(10/r0)**.01;
  let previous=null;
  for(let n=0;n<=100;n++){
   const p=api.point('gc-passage-'+n),remaining=r0*ratio**n;
   expect(p.remainingPc).toBeCloseTo(remaining,8);expect(p.progress).toBe(n);expect(p.fraction).toBeCloseTo(1-remaining/r0,12);expect(p.zoom).toBeCloseTo(4*r0/remaining,8);closeVector(p.at,[.5-remaining/r0,0,0],12);expect((.5-p.at[0])*r0).toBeCloseTo(remaining,9);
   if(previous){expect(p.remainingPc).toBeLessThan(previous.remainingPc);expect(p.at[0]).toBeGreaterThan(previous.at[0]);expect(p.zoom).toBeGreaterThan(previous.zoom);expect(p.remainingPc/previous.remainingPc).toBeCloseTo(ratio,12);}previous=p;
  }
  closeVector(api.point('gc-passage-0').at,[-.5,0,0]);expect(api.point('gc-passage-100').remainingPc).toBeCloseTo(10,10);expect(api.point('gc-passage-100').at[0]).toBeLessThan(.5);
 });
 it('uses safe overview defaults and returns independent camera vectors',()=>{
  const overview=plain(api.point('gc-overview'));for(const id of [undefined,null,'',NaN,Infinity,[],{},true,'missing','constructor','__proto__'])expect(plain(api.point(id))).toEqual(overview);
  for(const id of [...ids,'gc-passage-50']){const original=plain(api.point(id)),edited=api.point(id);edited.at[0]=12345;edited.view[1]=-54321;expect(plain(api.point(id))).toEqual(original);}
 });
 it('keeps close-up camera depth planes finite and inside the view distance',()=>{
  for(const d of details){const p=api.point(d.id),distance=18/p.zoom,near=api.clipNear(distance);expect(Number.isFinite(near)).toBe(true);expect(near).toBeGreaterThan(0);expect(near).toBeLessThan(distance);expect(near).toBeLessThanOrEqual(.05);}
  for(const bad of [undefined,null,NaN,Infinity,-Infinity,0,-1,'1',{},[]]){const near=api.clipNear(bad);expect(Number.isFinite(near)).toBe(true);expect(near).toBeGreaterThan(0);expect(near).toBeLessThanOrEqual(.05);}
  expect(api.clipNear(Number.MIN_VALUE)).toBe(1e-9);
 });
 it('restores all landmarks and passage positions with their saved camera',()=>{
  for(const d of details){const raw={itemId:'galactic-centre',detailId:d.id,note:'Observe '+d.id,zoom:d.zoom,yaw:.34,pitch:.22,view:'atlas'},notes=plain(api.notes([raw]));expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject(raw);expect(notes[0].size).toBe(2.5e20);closeVector(api.point(notes[0].detailId).at,api.point(d.id).at);}
 });
 it('rejects malformed saved routes and bounds damaged camera inputs',()=>{
  for(const id of ['gc-passage-101','gc-passage-01','gc-passage-1.0','gc-missing','constructor'])expect(api.notes([{itemId:'galactic-centre',detailId:id}])).toHaveLength(0);
  expect(api.notes([{itemId:'galactic-centre',detailId:'gc-core',zoom:1e9}])[0].zoom).toBe(api.limit('galactic-centre'));expect(api.notes([{itemId:'galactic-centre',detailId:'gc-core',zoom:NaN}])[0].zoom).toBe(1);
 });
 it('retains drafts for real landmarks and intermediate journey positions',()=>{
  const drafts=Object.fromEntries(details.map(d=>['galactic-centre:'+d.id,'Saved '+d.id]));expect(plain(api.drafts({...drafts,'galactic-centre:gc-missing':'bad','galactic-centre:gc-passage-01':'bad','galactic-centre:constructor':'bad'}))).toEqual(drafts);
 });
});

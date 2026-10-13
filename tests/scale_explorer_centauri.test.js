import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
if(!source.includes('centauriSystem'))throw new Error('Centauri helpers missing');
vm.runInNewContext(source.replace(marker,'  window.centauriChecks={reference:CENTAURI_REFERENCE_M,au:CENTAURI_AU_M,period:CENTAURI_PERIOD_YR,binary:CENTAURI_BINARY,stars:CENTAURI_STARS,phase:centauriPhaseValue,system:centauriSystem,point:centauriPoint,clipNear:centauriClipNear,safeCamera:centauriSafeCamera,limit:inspectionLimit,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.centauriChecks;
const plain=x=>JSON.parse(JSON.stringify(x));
const closeVector=(actual,expected,digits=10)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};
const ids=['cen-overview','cen-system','cen-binary','cen-a','cen-b','cen-proxima','cen-sun'];
const details=plain(api.details('alpha-cen-dist',(_,fallback)=>fallback));
const referenceM=4.1e16;

describe('Alpha Centauri measured observatory and saved exploration',()=>{
 it('preserves the rounded interstellar catalog distance',()=>{
  const item=api.items.find(item=>item.id==='alpha-cen-dist');
  expect(item.size).toBe(referenceM);expect(item.dim).toBe('distance');
  expect(api.reference).toBe(referenceM);expect(api.au).toBe(149597870700);expect(api.period).toBe(79.929);
 });

 it('accepts only finite number phases and clamps the endpoints',()=>{
  for(const phase of [0,.5,1,25,50,75,99.75,100])expect(api.phase(phase)).toBe(phase);
  for(const phase of [-1,-Number.MAX_VALUE])expect(api.phase(phase)).toBe(0);
  for(const phase of [101,Number.MAX_VALUE])expect(api.phase(phase)).toBe(100);
  for(const invalid of [undefined,null,NaN,-Infinity,Infinity,'50',true,false,{},[],[50]])expect(api.phase(invalid)).toBe(0);
 });

 it('has seven finite, distinct inspection destinations at every phase',()=>{
  expect(details.map(d=>d.id)).toEqual(ids);expect(new Set(details.map(d=>d.id)).size).toBe(7);
  for(const phase of [0,25,50,75,100])for(const d of details){
   const p=api.point(d.id,phase);expect(d.centauriSite).toBe(true);expect(d.marker).toBe(false);
   expect(p.at).toHaveLength(3);expect(p.view).toHaveLength(3);
   expect([...p.at,...p.view,p.zoom].every(Number.isFinite)).toBe(true);
   expect(Math.hypot(...p.view)).toBeGreaterThan(0);expect(p.zoom).toBeGreaterThanOrEqual(1);expect(p.zoom).toBeLessThanOrEqual(api.limit('alpha-cen-dist'));
   expect(d.label.trim()).toBeTruthy();expect(d.body.trim()).toBeTruthy();expect(d.source).toMatch(/^https:\/\//);
  }
  for(const d of details){const p=api.point(d.id,0);closeVector(d.at,p.at,12);closeVector(d.view,p.view,12);expect(d.zoom).toBe(p.zoom);}
  for(const invalid of ['',undefined,null,NaN,'cen-missing','constructor','toString','__proto__'])expect(plain(api.point(invalid,25))).toEqual(plain(api.point('cen-overview',25)));
 });

 it('closes the orbit after one phase cycle without moving fixed context',()=>{
  for(const id of ids){const start=api.point(id,0),end=api.point(id,100);closeVector(start.at,end.at,12);closeVector(start.view,end.view,12);expect(start.zoom).toBe(end.zoom);}
  for(const id of ['cen-overview','cen-system','cen-binary','cen-proxima','cen-sun'])for(const phase of [25,50,75])closeVector(api.point(id,phase).at,api.point(id,0).at,12);
  expect(plain(api.point('cen-a',25).at)).not.toEqual(plain(api.point('cen-a',0).at));
  expect(plain(api.point('cen-b',25).at)).not.toEqual(plain(api.point('cen-b',0).at));
 });

 it('solves Kepler motion around a fixed mass weighted barycenter',()=>{
  const binary=api.binary,totalMass=binary.massA+binary.massB,system0=api.system(0);
  expect(plain(binary)).toEqual({aAU:23.5448,e:.5208,massA:1.1055,massB:.9373});
  for(let phase=0;phase<=100;phase++){
   const s=api.system(phase),a=s.at.a,b=s.at.b,c=s.at.barycenter;
   closeVector(s.at.sun,[-.5,0,0],15);closeVector(c,[.5,0,0],15);closeVector(s.at.proxima,system0.at.proxima,15);
   const separation=Math.hypot(...a.map((value,i)=>value-b[i]))*referenceM/api.au;
   expect(separation).toBeCloseTo(s.separationAU,8);
   expect(s.separationAU).toBeGreaterThanOrEqual(binary.aAU*(1-binary.e)-1e-10);
   expect(s.separationAU).toBeLessThanOrEqual(binary.aAU*(1+binary.e)+1e-10);
   const ar=Math.hypot(...a.map((v,i)=>v-c[i])),br=Math.hypot(...b.map((v,i)=>v-c[i]));
   expect(ar/br).toBeCloseTo(binary.massB/binary.massA,9);
   for(let i=0;i<3;i++)expect((a[i]*binary.massA+b[i]*binary.massB)/totalMass).toBeCloseTo(c[i],14);
   const e=s.eccentricAnomaly,m=s.meanAnomaly;
   expect(e-binary.e*Math.sin(e)).toBeCloseTo(m,11);
   expect(s.separationAU).toBeCloseTo(binary.aAU*(1-binary.e*Math.cos(e)),11);
   closeVector(api.point('cen-a',phase).at,a,14);closeVector(api.point('cen-b',phase).at,b,14);
  }
  expect(api.system(0).separationAU).toBeCloseTo(binary.aAU*(1-binary.e),10);
  expect(api.system(50).separationAU).toBeCloseTo(binary.aAU*(1+binary.e),10);
  expect(api.system(25).eccentricAnomaly).toBeGreaterThan(Math.PI/2);
 });

 it('keeps measured stellar diameters tiny relative to the interstellar distance',()=>{
  for(const id of ['sun','a','b','proxima']){
   const star=api.stars[id];expect(star.diameterM).toBeGreaterThan(0);expect(star.scale).toBeCloseTo(star.diameterM/referenceM,20);expect(star.scale).toBeLessThan(1e-7);
  }
  expect(api.stars.a.scale).toBeGreaterThan(api.stars.sun.scale);expect(api.stars.sun.scale).toBeGreaterThan(api.stars.b.scale);expect(api.stars.b.scale).toBeGreaterThan(api.stars.proxima.scale);
 });

 it('keeps camera clipping finite through the interstellar to photosphere zoom range',()=>{
  for(const d of details){const point=api.point(d.id,50),distance=6.8/point.zoom,near=api.clipNear(distance);expect(Number.isFinite(near)).toBe(true);expect(near).toBeGreaterThan(0);expect(near).toBeLessThanOrEqual(.05);expect(near).toBeLessThan(distance*.2);}
  for(const invalid of [undefined,null,NaN,Infinity,-Infinity,-1,0,'invalid',{},[]]){const near=api.clipNear(invalid);expect(Number.isFinite(near)).toBe(true);expect(near).toBeGreaterThan(0);expect(near).toBeLessThanOrEqual(.05);}
 });

 it('normalizes bad camera inputs without mutating valid coordinates',()=>{
  for(const p of [[0,0,0],[0,.1,2],[-.6,0,0],[.51,0,0]]){const before=[...p];expect(plain(api.safeCamera(p,50))).toEqual(before);expect(p).toEqual(before);}
  for(const p of [undefined,null,NaN,[],[1,2],[0,0,Infinity],[0,NaN,0],'invalid',{}]){const next=api.safeCamera(p,50);expect(next).toHaveLength(3);expect(next.every(Number.isFinite)).toBe(true);}
  for(const phase of [0,25,50,100])for(const id of ['sun','a','b','proxima']){
   const center=api.system(phase).at[id],r=api.stars[id].scale/2;
   for(const delta of [[0,0,0],[r*.2,0,0],[0,r*.5,0],[0,0,-r*.5]]){
    const input=center.map((v,i)=>v+delta[i]),before=[...input],next=api.safeCamera(input,phase);
    expect(input).toEqual(before);expect(next.every(Number.isFinite)).toBe(true);expect(Math.hypot(...next.map((v,i)=>v-center[i]))).toBeGreaterThan(r);
   }
  }
 });

 it('restores every phase and destination without losing photosphere zoom',()=>{
  for(const phase of [0,25,50,100])for(const d of details){
   const raw={itemId:'alpha-cen-dist',detailId:d.id,note:'Remember '+d.id,centauriPhase:phase,zoom:api.point(d.id,phase).zoom,yaw:.34,pitch:.22,view:'atlas'};
   const notes=plain(api.notes([raw]));expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject(raw);expect(notes[0].size).toBe(referenceM);
   closeVector(api.point(notes[0].detailId,notes[0].centauriPhase).at,api.point(d.id,phase).at,12);
  }
  for(const phase of [undefined,null,'50',NaN,Infinity])expect(api.notes([{itemId:'alpha-cen-dist',detailId:'cen-a',centauriPhase:phase}])[0].centauriPhase).toBe(0);
  expect(api.notes([{itemId:'alpha-cen-dist',detailId:'cen-b',centauriPhase:150}])[0].centauriPhase).toBe(100);
  expect(api.notes([{itemId:'alpha-cen-dist',detailId:'cen-proxima',centauriPhase:-20}])[0].centauriPhase).toBe(0);
  expect(api.notes([{itemId:'alpha-cen-dist',detailId:'cen-a',zoom:Number.MAX_VALUE}])[0].zoom).toBe(api.limit('alpha-cen-dist'));
  expect(api.notes([{itemId:'alpha-cen-dist',detailId:'cen-missing'}])).toHaveLength(0);
  expect(api.notes([{itemId:'sun',centauriPhase:50}])[0].centauriPhase).toBeUndefined();
 });

 it('retains drafts only for real Centauri targets',()=>{
  const drafts=Object.fromEntries(details.map(d=>['alpha-cen-dist:'+d.id,'Saved '+d.id]));
  expect(plain(api.drafts({...drafts,'alpha-cen-dist:cen-missing':'Unknown','alpha-cen-dist:constructor':'Inherited'}))).toEqual(drafts);
 });
});

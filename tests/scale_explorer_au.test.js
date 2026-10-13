import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const REFERENCE_M=1.496e11,EXACT_M=149597870700,SUN_M=1.392e9,EARTH_M=1.2742e7,LIGHT_M_S=299792458;
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
if(!source.includes('AU_REFERENCE_M'))throw new Error('AU helpers missing');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.auChecks={reference:AU_REFERENCE_M,exact:AU_EXACT_M,sun:AU_SUN_DIAMETER_M,earth:AU_EARTH_DIAMETER_M,sunScale:AU_SUN_SCALE,earthScale:AU_EARTH_SCALE,routeIndex:auRouteIndex,routeFraction:auRouteFraction,routePoint:auRoutePoint,point:auPoint,clipNear:auClipNear,safeCamera:auSafeCamera,limit:inspectionLimit,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.auChecks;
const plain=x=>JSON.parse(JSON.stringify(x));
const closeVector=(actual,expected,digits=10)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};
const coreIds=['au-overview','au-sun','au-midway','au-approach','au-earth','au-terminator'];
const sampleIds=Array.from({length:101},(_,i)=>'au-passage-'+i);
const details=plain(api.details('au',(_,fallback)=>fallback));

describe('Earth–Sun distance, camera precision and saved exploration',()=>{
 it('keeps the rounded catalog distance distinct from the exact astronomical unit',()=>{
  expect(api.reference).toBe(REFERENCE_M);expect(api.exact).toBe(EXACT_M);
  expect(api.items.find(item=>item.id==='au').size).toBe(REFERENCE_M);
  expect(api.items.find(item=>item.id==='au').dim).toBe('distance');
  expect(api.exact/LIGHT_M_S).toBeCloseTo(499.00478383615643,9);
  expect(api.reference/LIGHT_M_S).toBeCloseTo(499.01188641643546,8);
  expect(Math.abs((api.reference-api.exact)/LIGHT_M_S)).toBeLessThan(.01);
 });

 it('preserves Sun and Earth diameters relative to the same 1 AU reference',()=>{
  expect(api.sun).toBe(SUN_M);expect(api.earth).toBe(EARTH_M);
  expect(api.sunScale).toBeCloseTo(SUN_M/REFERENCE_M,14);
  expect(api.earthScale).toBeCloseTo(EARTH_M/REFERENCE_M,14);
  expect(api.sunScale/api.earthScale).toBeCloseTo(SUN_M/EARTH_M,10);
  expect(api.items.find(item=>item.id==='sun').size).toBe(SUN_M);
  expect(api.items.find(item=>item.id==='earth').size).toBe(EARTH_M);
  expect(api.sunScale).toBeLessThan(.01);expect(api.earthScale).toBeLessThan(.0001);
 });

 it('accepts all 101 canonical route IDs and rejects malformed or inherited names',()=>{
  for(let i=0;i<=100;i++)expect(api.routeIndex(sampleIds[i])).toBe(i);
  for(const invalid of ['',undefined,null,NaN,100,'au-overview','au-passage-','au-passage--1','au-passage-101','au-passage-1.5','au-passage-1e2','au-passage-1junk','au-passage-01','au-passage-00','au-passage-100 ',' au-passage-1','other-passage-1','constructor','toString','__proto__'])expect(api.routeIndex(invalid)).toBe(null);
 });

 it('places the route at the two body centers and clamps input without accepting coercions',()=>{
  for(let i=0;i<=100;i++){expect(api.routeFraction(i/100)).toBe(i/100);closeVector(api.routePoint(i/100),[-.5+i/100,0,0],12);}
  for(const invalid of [undefined,null,NaN,-Infinity,Infinity,'invalid','0.5',{},[]]){expect(api.routeFraction(invalid)).toBe(0);closeVector(api.routePoint(invalid),[-.5,0,0],12);}
  for(const f of [-1,-Number.MAX_VALUE]){expect(api.routeFraction(f)).toBe(0);closeVector(api.routePoint(f),[-.5,0,0],12);}
  for(const f of [2,Number.MAX_VALUE]){expect(api.routeFraction(f)).toBe(1);closeVector(api.routePoint(f),[.5,0,0],12);}
  const a=api.routePoint(0),b=api.routePoint(1);expect(Math.hypot(...b.map((v,i)=>v-a[i]))).toBe(1);
 });

 it('has six named views and 101 distinct finite route samples within the inspection limit',()=>{
  expect(api.limit('au')).toBe(20000);expect(details).toHaveLength(107);
  expect(details.slice(0,6).map(d=>d.id)).toEqual(coreIds);expect(details.slice(6).map(d=>d.id)).toEqual(sampleIds);
  expect(new Set(details.map(d=>d.id)).size).toBe(107);
  for(const d of details){
   const p=api.point(d.id);expect(d.auSite).toBe(true);expect(d.marker).toBe(false);
   expect(p.at).toHaveLength(3);expect(p.view).toHaveLength(3);
   expect([...p.at,...p.view,p.zoom,p.fraction].every(Number.isFinite)).toBe(true);
   expect(Math.hypot(...p.view)).toBeGreaterThan(0);expect(p.zoom).toBeGreaterThanOrEqual(1);expect(p.zoom).toBeLessThanOrEqual(api.limit('au'));
   expect(p.fraction).toBeGreaterThanOrEqual(0);expect(p.fraction).toBeLessThanOrEqual(1);
   closeVector(d.at,p.at,12);closeVector(d.view,p.view,12);expect(d.zoom).toBe(p.zoom);
   expect(d.label.trim()).toBeTruthy();expect(d.body.trim()).toBeTruthy();expect(d.source).toMatch(/^https:\/\//);
  }
  expect(details.slice(6).every(d=>d.auSample===true)).toBe(true);
  expect(api.point('au-earth').zoom).toBeGreaterThan(1000);expect(api.point('au-terminator').zoom).toBeGreaterThan(1000);
 });

 it('resolves route samples in monotonically ordered physical coordinates',()=>{
  for(let i=0;i<=100;i++){const p=api.point(sampleIds[i]);expect(p.fraction).toBeCloseTo(i/100,12);closeVector(p.at,[-.5+i/100,0,0],12);}
  for(const invalid of ['',undefined,null,NaN,'au-missing','au-passage-101','constructor','toString','__proto__'])expect(plain(api.point(invalid))).toEqual(plain(api.point('au-overview')));
 });

 it('keeps the near plane in front of the lens and behind the nearest Earth surface',()=>{
  const earthRadius=3*EARTH_M/REFERENCE_M/2;
  for(const zoom of [1,10,100,1000,2500,5000,10000,12000,15000,20000]){
   const distance=6.8/zoom,near=api.clipNear(distance);
   expect(Number.isFinite(near)).toBe(true);expect(near).toBeGreaterThan(0);expect(near).toBeLessThanOrEqual(.05);
   expect(near).toBeLessThan(distance*.2);
   expect(near).toBeLessThan(distance-earthRadius);
  }
  expect(api.clipNear(6.8/15000)).toBeLessThan(.0001);
  for(const invalid of [undefined,null,NaN,Infinity,-Infinity,-1,0,'invalid',{},[]]){const near=api.clipNear(invalid);expect(Number.isFinite(near)).toBe(true);expect(near).toBeGreaterThan(0);expect(near).toBeLessThanOrEqual(.05);}
 });

 it('keeps the camera outside both physical surfaces without altering valid coordinates',()=>{
  const spheres=[[-.5,SUN_M/REFERENCE_M/2],[.5,EARTH_M/REFERENCE_M/2]];
  for(const [x,r] of spheres){for(const p of [[x,0,0],[x+r*.2,0,0],[x,r*.5,0],[x,0,-r*.5]]){const before=[...p],next=api.safeCamera(p);expect(p).toEqual(before);expect(next.every(Number.isFinite)).toBe(true);expect(Math.hypot(next[0]-x,next[1],next[2])).toBeGreaterThan(r);}}
  for(const p of [[0,0,0],[0,.1,2],[-.6,0,0],[.51,0,0]])expect(plain(api.safeCamera(p))).toEqual(p);
  for(const p of [undefined,null,NaN,[],[1,2],[0,0,Infinity],[0,NaN,0],'invalid',{}]){const next=api.safeCamera(p);expect(next).toHaveLength(3);expect(next.every(Number.isFinite)).toBe(true);}
 });

 it('restores all guided views and route samples without truncating Earth zoom',()=>{
  for(const d of details){
   const raw={itemId:'au',detailId:d.id,note:'Remember '+d.id,zoom:d.zoom,yaw:.34,pitch:.22,view:'atlas'};
   const notes=plain(api.notes([raw]));expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject(raw);expect(notes[0].size).toBe(REFERENCE_M);
   closeVector(api.point(notes[0].detailId).at,d.at,12);
  }
  const valid=[...coreIds,'au-passage-0','au-passage-50','au-passage-100'].map(detailId=>({itemId:'au',detailId}));
  const invalid=['au-missing','au-passage--1','au-passage-101','au-passage-01'].map(detailId=>({itemId:'au',detailId}));
  expect(plain(api.notes(valid.concat(invalid))).map(n=>n.detailId)).toEqual(valid.map(n=>n.detailId));
  expect(api.notes([{itemId:'au',detailId:'au-earth',zoom:100000}])[0].zoom).toBe(20000);
 });

 it('retains drafts for real targets and rejects malformed passage targets',()=>{
  const drafts=Object.fromEntries(details.map(d=>['au:'+d.id,'Saved '+d.id]));
  expect(plain(api.drafts({...drafts,'au:au-missing':'Unknown','au:au-passage-101':'Beyond range','au:au-passage-01':'Noncanonical'}))).toEqual(drafts);
 });

 it('routes AU through its measured scene before the generic distance marker',()=>{
  const model=source.slice(source.indexOf('function model(item)'),source.indexOf('function trimModelCache'));
  expect(model.indexOf('auDistanceModel(g)')).toBeGreaterThanOrEqual(0);
  expect(model.indexOf('auDistanceModel(g)')).toBeLessThan(model.indexOf("item.dim === 'distance'"));
  expect(source).toMatch(/if\(g\.userData\.au\)return g\.userData\.au\.bounds\.clone\(\)\.applyMatrix4\(g\.matrixWorld\)/);
  expect(source).toContain('lightAuWorlds');expect(source).toContain('!selected.auSite');
 });
});

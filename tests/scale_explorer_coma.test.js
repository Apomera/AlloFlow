import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
if(!source.includes('COMA_DISTANCE_M'))throw new Error('Coma helpers missing');
vm.runInNewContext(source.replace(marker,'  window.comaChecks={distance:COMA_DISTANCE_M,ly:COMA_LY_M,radius:COMA_CLUSTER_RADIUS_LY,core:COMA_CORE,sites:COMA_SITES,routeIndex:comaRouteIndex,routePoint:comaRoutePoint,point:comaPoint,clipNear:comaClipNear,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.comaChecks,plain=x=>JSON.parse(JSON.stringify(x));
const ids=['coma-overview','coma-home','coma-halfway','coma-cluster','coma-core','coma-ngc4874','coma-ngc4889','coma-outskirts'];
const samples=Array.from({length:101},(_,i)=>'coma-passage-'+i);
const details=plain(api.details('coma-dist',(_,fallback)=>fallback));
const vector=(actual,expected,digits=10)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};

describe('Coma distance atlas geometry and navigation',()=>{
 it('preserves the catalog reference and a physically smaller cluster',()=>{
  expect(api.distance).toBe(3e24);expect(api.ly).toBe(299792458*31557600);expect(api.radius).toBe(1e7);
  expect(api.items.find(item=>item.id==='coma-dist').size).toBe(api.distance);
  expect(api.distance/api.ly).toBeGreaterThan(3e8);expect(api.distance/api.ly).toBeLessThan(3.2e8);
  const diameter=api.radius*2*api.ly/api.distance;expect(diameter).toBeGreaterThan(.06);expect(diameter).toBeLessThan(.064);
 });

 it('accepts every canonical route ID and rejects malformed positions',()=>{
  for(let i=0;i<=100;i++)expect(api.routeIndex(samples[i])).toBe(i);
  for(const id of ['',undefined,null,50,'coma-home','coma-passage-','coma-passage--1','coma-passage-101','coma-passage-1.5','coma-passage-1e2','coma-passage-01','coma-passage-00','coma-passage-2junk','coma-passage-100 ',' coma-passage-0'])expect(api.routeIndex(id)).toBe(null);
 });

 it('keeps route samples ordered on the measured line and clamps finite extremes',()=>{
  for(let i=0;i<=100;i++)vector(api.routePoint(i/100),[-.5+i/100,0,0],12);
  vector(api.routePoint(-1),[-.5,0,0]);vector(api.routePoint(2),[.5,0,0]);
  vector(api.routePoint(-Number.MAX_VALUE),[-.5,0,0]);vector(api.routePoint(Number.MAX_VALUE),[.5,0,0]);
  for(const value of [NaN,undefined,null,Infinity,-Infinity,'invalid',{}])expect(api.routePoint(value).every(Number.isFinite)).toBe(true);
 });

 it('keeps both core galaxies distinct, finite and inside the cluster reference',()=>{
  expect(api.core).toHaveLength(2);expect(new Set(api.core.map(g=>g.id)).size).toBe(2);
  const radius=api.radius*api.ly/api.distance;
  for(const galaxy of api.core){
   expect(galaxy.at).toHaveLength(3);expect(galaxy.at.every(Number.isFinite)).toBe(true);
   expect(Math.hypot(galaxy.at[0]-.5,galaxy.at[1],galaxy.at[2])).toBeLessThan(radius);
   expect(galaxy.diameterLY).toBeGreaterThan(0);expect(galaxy.diameterLY).toBeLessThan(api.radius*2);
   expect(galaxy.axisRatio).toBeGreaterThan(0);expect(galaxy.axisRatio).toBeLessThanOrEqual(1);
   const point=api.point('coma-'+galaxy.id);vector(point.at,galaxy.at,12);
  }
  expect(Math.hypot(...api.core[0].at.map((v,i)=>v-api.core[1].at[i]))).toBeGreaterThan(0);
  const baseline=plain(api.core);for(const id of [...ids,...samples])api.point(id);expect(plain(api.core)).toEqual(baseline);
 });

 it('preserves the observed pair separation and north-up east-left sky projection',()=>{
  // Independent rounded ICRS projection at the fixed catalog distance. Named
  // galaxies share a display depth; these coordinates do not infer distances
  // along the line of sight from individual galaxy redshifts.
  const reference={ngc4874:{east:-250326,north:-41057},ngc4889:{east:409320,north:57327}};
  const distanceLy=3e24/9460730472580800;
  for(const galaxy of api.core){
   const ref=reference[galaxy.id];expect(ref).toBeDefined();expect(galaxy.at[0]).toBe(.5);
   expect(galaxy.at[1]*distanceLy).toBeCloseTo(ref.north,5);expect(-galaxy.at[2]*distanceLy).toBeCloseTo(ref.east,5);
  }
  const separation=Math.hypot(...api.core[0].at.map((v,i)=>v-api.core[1].at[i]))*distanceLy;
  expect(Math.abs(separation-666942.468862195)).toBeLessThan(1);
 });

 it('provides finite camera directions and useful clipping across the route',()=>{
  for(const id of [...ids,...samples]){
   const point=api.point(id);expect(point.at).toHaveLength(3);expect(point.view).toHaveLength(3);
   expect([...point.at,...point.view,point.zoom,point.fraction].every(Number.isFinite)).toBe(true);
   expect(Math.hypot(...point.view)).toBeGreaterThan(0);expect(point.zoom).toBeGreaterThan(0);
   expect(point.fraction).toBeGreaterThanOrEqual(0);expect(point.fraction).toBeLessThanOrEqual(1);
  }
  for(const distance of [.00001,.0001,.001,.01,.1,1,10,100]){
   const near=api.clipNear(distance);expect(Number.isFinite(near)).toBe(true);expect(near).toBeGreaterThan(0);expect(near).toBeLessThan(distance);
  }
  for(const value of [undefined,null,NaN,Infinity,-Infinity,-1,0]){const near=api.clipNear(value);expect(Number.isFinite(near)&&near>0).toBe(true);}
 });

 it('shares all eight guide and 101 route coordinates with rendered details',()=>{
  expect(api.sites.map(site=>site.id)).toEqual(ids);expect(details).toHaveLength(109);
  expect(details.map(detail=>detail.id)).toEqual([...ids,...samples]);expect(new Set(details.map(d=>d.id)).size).toBe(109);
  for(const detail of details){
   const point=api.point(detail.id);vector(detail.at,point.at,12);vector(detail.view,point.view,12);expect(detail.zoom).toBeCloseTo(point.zoom,12);
   expect(detail.marker).toBe(false);expect(typeof detail.label==='string'&&detail.label.trim().length>0).toBe(true);expect(typeof detail.body==='string'&&detail.body.trim().length>0).toBe(true);
  }
  for(let i=0;i<=100;i++){const point=api.point(samples[i]);expect(point.fraction).toBeCloseTo(i/100,12);vector(point.at,[-.5+i/100,0,0],12);}
 });

 it('restores guides and passage samples through notebook records and drafts',()=>{
  for(const detail of details){
   const record={itemId:'coma-dist',detailId:detail.id,note:'Inspect '+detail.id,zoom:2,yaw:.3,pitch:.2,view:'atlas'};
   const restored=plain(api.notes([record]));expect(restored).toHaveLength(1);const {yaw,...exact}=record;expect(restored[0]).toMatchObject(exact);expect(restored[0].yaw).toBeCloseTo(yaw,12);expect(restored[0].size).toBe(api.distance);
  }
  const drafts=Object.fromEntries(details.map(d=>['coma-dist:'+d.id,'Saved '+d.id]));
  expect(plain(api.drafts({...drafts,'coma-dist:coma-passage-101':'invalid','coma-dist:coma-missing':'invalid'}))).toEqual(drafts);
 });
});

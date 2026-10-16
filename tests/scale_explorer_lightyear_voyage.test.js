import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.lightYearChecks={distance:LIGHTYEAR_M,c:LIGHTYEAR_C,au:LIGHTYEAR_AU_M,days:LIGHTYEAR_DAYS,sites:LIGHTYEAR_SITES,index:lightYearIndex,fraction:lightYearFraction,position:lightYearPosition,point:lightYearPoint,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.lightYearChecks,plain=x=>JSON.parse(JSON.stringify(x));
const ids=['lightyear-overview','lightyear-solar','lightyear-day','lightyear-month','lightyear-ride','lightyear-arrival'];
const samples=Array.from({length:1001},(_,i)=>'lightyear-time-'+i);
const details=plain(api.details('lightyear',(_,fallback)=>fallback));
const vector=(actual,expected,digits=11)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};

describe('Light-year voyage physical reference and navigation',()=>{
 it('uses the retained catalog distance with exact vacuum light speed and AU',()=>{
  expect(api.items.find(item=>item.id==='lightyear').size).toBe(9.461e15);
  expect(api.distance).toBe(9.461e15);expect(api.c).toBe(299792458);expect(api.au).toBe(149597870700);
  expect(api.days).toBeCloseTo(9.461e15/299792458/86400,11);
  expect(api.days).toBeGreaterThan(365.25);expect(api.days).toBeLessThan(365.27);
  expect(api.point('lightyear-day').days).toBeCloseTo(1,12);
  expect(api.point('lightyear-month').days).toBeCloseTo(30,12);
  expect(api.point('lightyear-solar').fraction*api.distance/api.au).toBeCloseTo(30.07,12);
 });

 it('clamps only finite numeric fractions and places the route endpoints exactly',()=>{
  expect(api.fraction(-1)).toBe(0);expect(api.fraction(2)).toBe(1);
  for(const fraction of [0,.001,.25,.5,.731,1]){expect(api.fraction(fraction)).toBe(fraction);vector(api.position(fraction),[-.5+fraction,0,0]);}
  for(const invalid of [undefined,null,NaN,Infinity,-Infinity,'0.5',{},[]]){expect(api.fraction(invalid)).toBe(0);vector(api.position(invalid),[-.5,0,0]);}
 });

 it('accepts only canonical whole progress IDs',()=>{
  for(let i=0;i<=1000;i++)expect(api.index(samples[i])).toBe(i);
  for(const id of ['',undefined,null,30,'lightyear-overview','lightyear-time-','lightyear-time--1','lightyear-time-1001','lightyear-time-1.5','lightyear-time-1e2','lightyear-time-01','lightyear-time-00','lightyear-time-2junk','lightyear-time-100 ',' lightyear-time-0'])expect(api.index(id)).toBe(null);
 });

 it('provides six finite cameras and 1001 positions on the same physical route',()=>{
  expect(plain(api.sites).map(site=>site.id)).toEqual(ids);
  for(const id of [...ids,...samples]){
   const point=api.point(id);expect(point.at).toHaveLength(3);expect(point.view).toHaveLength(3);
   expect([...point.at,...point.view,point.zoom,point.fraction,point.days].every(Number.isFinite)).toBe(true);
   expect(Math.hypot(...point.view)).toBeGreaterThan(0);expect(point.zoom).toBeGreaterThan(0);
   expect(point.fraction).toBeGreaterThanOrEqual(0);expect(point.fraction).toBeLessThanOrEqual(1);
   expect(point.days).toBeCloseTo(point.fraction*api.distance/api.c/86400,10);
  }
  for(let i=0;i<=1000;i++){
   const point=api.point(samples[i]);expect(point.fraction).toBe(i/1000);vector(point.at,[-.5+i/1000,0,0]);
   vector(point.view,api.point('lightyear-time-500').view);expect(point.zoom).toBe(api.point('lightyear-time-500').zoom);
  }
  expect(plain(api.point('unknown'))).toEqual(plain(api.point(ids[0])));
 });

 it('makes every exact saved progress position available as a distinct detail',()=>{
  expect(details.map(detail=>detail.id)).toEqual([...ids,...samples]);expect(new Set(details.map(d=>d.id)).size).toBe(1007);
  for(const detail of details){
   const point=api.point(detail.id);vector(detail.at,point.at);vector(detail.view,point.view);expect(detail.zoom).toBeCloseTo(point.zoom,12);
   expect(detail.lightYearSite).toBe(true);expect(!!detail.lightYearSample).toBe(detail.id.startsWith('lightyear-time-'));
   expect(typeof detail.label==='string'&&detail.label.trim().length>0).toBe(true);expect(typeof detail.body==='string'&&detail.body.trim().length>0).toBe(true);
  }
 });

 it('restores notebook entries and drafts for every progress step, including the high-zoom solar view',()=>{
  for(const detail of details){
   const record={itemId:'lightyear',detailId:detail.id,note:'Inspect '+detail.id,size:api.distance,zoom:detail.zoom,yaw:.3,pitch:.2,view:'atlas'};
   const restored=plain(api.notes([record]));expect(restored).toHaveLength(1);const {yaw,...exact}=record;expect(restored[0]).toMatchObject(exact);expect(restored[0].yaw).toBeCloseTo(yaw,12);
   const key='lightyear:'+detail.id;expect(plain(api.drafts({[key]:'Saved '+detail.id}))).toEqual({[key]:'Saved '+detail.id});
  }
  expect(plain(api.drafts({'lightyear:lightyear-time-1001':'invalid','lightyear:lightyear-time-050':'invalid','lightyear:missing':'invalid'}))).toEqual({});
 });

 it('keeps the source and public preview module identical',()=>{
  expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js','utf8')).toBe(source);
 });
});

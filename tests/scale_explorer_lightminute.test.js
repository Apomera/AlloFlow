import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.lightMinuteChecks={distance:LIGHT_MINUTE_M,c:LIGHT_SPEED_M_S,earth:LIGHT_MINUTE_EARTH_M,moon:LIGHT_MINUTE_MOON_M,separation:LIGHT_MINUTE_MOON_DISTANCE_M,sites:LIGHT_MINUTE_SITES,index:lightMinuteIndex,point:lightMinutePoint,position:lightMinutePosition,clipNear:lightMinuteClipNear,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.lightMinuteChecks,plain=x=>JSON.parse(JSON.stringify(x));
const ids=['light-minute-overview','light-minute-pair','light-minute-earth','light-minute-moon','light-minute-ten','light-minute-end'];
const samples=Array.from({length:601},(_,i)=>'light-minute-time-'+i);
const details=plain(api.details('light-minute',(_,fallback)=>fallback));
const vector=(actual,expected,digits=11)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};

describe('Light-minute physical references and navigation',()=>{
 it('uses the exact vacuum light-minute and retained planetary references',()=>{
  expect(api.c).toBe(299792458);expect(api.distance).toBe(17987547480);expect(api.distance/api.c).toBe(60);
  expect(api.items.find(item=>item.id==='light-minute').size).toBe(api.distance);
  expect(api.earth).toBe(12742000);expect(api.moon).toBe(3474800);expect(api.separation).toBe(384400000);
  expect(api.separation/api.c).toBeCloseTo(1.2822203819416962,12);
  expect(api.separation/api.earth).toBeCloseTo(30.16794851671637,10);
 });

 it('accepts canonical tenth-second sample IDs and rejects malformed values',()=>{
  for(let i=0;i<=600;i++)expect(api.index(samples[i])).toBe(i);
  for(const id of ['',undefined,null,300,'light-minute-pair','light-minute-time-','light-minute-time--1','light-minute-time-601','light-minute-time-1.5','light-minute-time-1e2','light-minute-time-01','light-minute-time-00','light-minute-time-2junk','light-minute-time-600 ',' light-minute-time-0'])expect(api.index(id)).toBe(null);
 });

 it('maps elapsed time linearly to distance and clamps the ends',()=>{
  for(let i=0;i<=600;i++)vector(api.position(i/10),[-.5+i/600,0,0]);
  vector(api.position(-1),[-.5,0,0]);vector(api.position(61),[.5,0,0]);
  vector(api.position(-Number.MAX_VALUE),[-.5,0,0]);vector(api.position(Number.MAX_VALUE),[.5,0,0]);
  for(const value of [NaN,undefined,null,Infinity,-Infinity,'invalid',{}])expect(api.position(value).every(Number.isFinite)).toBe(true);
 });

 it('keeps every camera finite and every sample on the physical path',()=>{
  for(const id of [...ids,...samples]){
   const point=api.point(id);expect(point.at).toHaveLength(3);expect(point.view).toHaveLength(3);
   expect([...point.at,...point.view,point.zoom,point.seconds,point.fraction].every(Number.isFinite)).toBe(true);
   expect(Math.hypot(...point.view)).toBeGreaterThan(0);expect(point.zoom).toBeGreaterThan(0);
   expect(point.seconds).toBeGreaterThanOrEqual(0);expect(point.seconds).toBeLessThanOrEqual(60);
   expect(point.fraction).toBeCloseTo(point.seconds/60,12);
  }
  for(let i=0;i<=600;i++){const point=api.point(samples[i]);expect(point.seconds).toBeCloseTo(i/10,12);vector(point.at,api.position(i/10));}
 });

 it('places planetary inspection targets at their physical centres',()=>{
  const earth=api.point('light-minute-earth'),moon=api.point('light-minute-moon');
  vector(earth.at,[-.5,0,0]);vector(moon.at,[-.5+api.separation/api.distance,0,0]);
  expect(Math.hypot(...moon.at.map((v,i)=>v-earth.at[i]))*api.distance).toBeCloseTo(api.separation,5);
  expect(earth.zoom).toBeGreaterThan(api.point('light-minute-pair').zoom);expect(moon.zoom).toBeGreaterThan(earth.zoom);
 });

 it('uses positive clipping planes for both planetary and whole-distance views',()=>{
  for(const distance of [.00001,.0001,.001,.01,.1,1,10,100]){
   const near=api.clipNear(distance);expect(Number.isFinite(near)).toBe(true);expect(near).toBeGreaterThan(0);expect(near).toBeLessThan(distance);
  }
  for(const value of [undefined,null,NaN,Infinity,-Infinity,-1,0]){const near=api.clipNear(value);expect(Number.isFinite(near)&&near>0).toBe(true);}
 });

 it('offers six distinct landmarks and all601 tenth-second samples',()=>{
  expect(api.sites.map(site=>site.id)).toEqual(ids);expect(details).toHaveLength(607);
  expect(details.map(detail=>detail.id)).toEqual([...ids,...samples]);expect(new Set(details.map(d=>d.id)).size).toBe(607);
  for(const detail of details){
   const point=api.point(detail.id);vector(detail.at,point.at);vector(detail.view,point.view);expect(detail.zoom).toBeCloseTo(point.zoom,12);
   expect(detail.marker).toBe(false);expect(typeof detail.label==='string'&&detail.label.trim().length>0).toBe(true);expect(typeof detail.body==='string'&&detail.body.trim().length>0).toBe(true);
  }
 });

 it('restores landmarks and time samples through saved observations and drafts',()=>{
  for(const detail of details){
   const record={itemId:'light-minute',detailId:detail.id,note:'Inspect '+detail.id,zoom:2,yaw:.3,pitch:.2,view:'atlas'};
   const restored=plain(api.notes([record]));expect(restored).toHaveLength(1);const {yaw,...exact}=record;expect(restored[0]).toMatchObject(exact);expect(restored[0].yaw).toBeCloseTo(yaw,12);expect(restored[0].size).toBe(api.distance);
  }
  // Draft limits intentionally retain only a bounded set, so verify each key
  // independently rather than requiring607 notes to bypass that limit.
  for(const detail of details){const key='light-minute:'+detail.id;expect(plain(api.drafts({[key]:'Saved '+detail.id}))).toEqual({[key]:'Saved '+detail.id});}
  expect(plain(api.drafts({'light-minute:light-minute-time-601':'invalid','light-minute:light-minute-missing':'invalid'}))).toEqual({});
 });
});

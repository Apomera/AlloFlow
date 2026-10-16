import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.milkyWayChecks={reference:MILKYWAY_REFERENCE_LY,sites:MILKYWAY_SITES,index:milkyWayIndex,height:milkyWayHeight,point:milkyWayPoint,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.milkyWayChecks,plain=x=>JSON.parse(JSON.stringify(x));
const ids=['galaxy-overview','spiral-arms','central-bar','solar-neighbourhood','galactic-disc','dust-window'];
const samples=Array.from({length:101},(_,i)=>'galaxy-slice-'+i);
const details=plain(api.details('milkyway',(_,fallback)=>fallback));
const vector=(actual,expected,digits=11)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};

describe('Milky Way structure study physical reference and navigation',()=>{
 it('retains the catalog diameter and derives the light-year conversion from it',()=>{
  expect(api.items.find(item=>item.id==='milkyway').size).toBe(9.5e20);
  expect(api.reference).toBeCloseTo(9.5e20/(299792458*31557600),10);
  expect(api.height(-5000)).toBe(-4000);expect(api.height(5000)).toBe(4000);
  for(const height of [-4000,-2080,0,800,4000])expect(api.height(height)).toBe(height);
  for(const invalid of [undefined,null,NaN,Infinity,-Infinity,'invalid',{},[]])expect(api.height(invalid)).toBe(0);
 });

 it('accepts only canonical whole slice IDs',()=>{
  for(let i=0;i<=100;i++)expect(api.index(samples[i])).toBe(i);
  for(const id of ['',undefined,null,30,'central-bar','galaxy-slice-','galaxy-slice--1','galaxy-slice-101','galaxy-slice-1.5','galaxy-slice-1e2','galaxy-slice-01','galaxy-slice-00','galaxy-slice-2junk','galaxy-slice-100 ',' galaxy-slice-0'])expect(api.index(id)).toBe(null);
 });

 it('provides six finite study cameras and calibrated layer heights',()=>{
  expect(plain(api.sites).map(site=>site.id)).toEqual(ids);
  for(const id of [...ids,...samples]){
   const point=api.point(id);expect(point.at).toHaveLength(3);expect(point.view).toHaveLength(3);
   expect([...point.at,...point.view,point.zoom,point.heightLy,point.dust].every(Number.isFinite)).toBe(true);
   expect(Math.hypot(...point.view)).toBeGreaterThan(0);expect(point.zoom).toBeGreaterThan(0);
   expect(point.heightLy).toBeGreaterThanOrEqual(-4000);expect(point.heightLy).toBeLessThanOrEqual(4000);
  }
  for(let i=0;i<=100;i++){
   const point=api.point(samples[i]);expect(point.heightLy).toBe(-4000+80*i);expect(point.cut).toBe(true);expect(point.dust).toBe(1);
   vector(point.at,[0,0,0]);vector(point.view,api.point('galaxy-slice-50').view);expect(point.zoom).toBe(api.point('galaxy-slice-50').zoom);
  }
  for(const id of ids){expect(api.point(id).cut).toBe(false);expect(api.point(id).dust).toBe(id==='dust-window'?.12:1);}
 });

 it('exposes the views and all 101 slices to saved observations without losing historic IDs',()=>{
  expect(details.map(detail=>detail.id)).toEqual([...ids,...samples]);expect(new Set(details.map(d=>d.id)).size).toBe(107);
  for(const detail of details){
   const point=api.point(detail.id);vector(detail.at,point.at);vector(detail.view,point.view);expect(detail.zoom).toBeCloseTo(point.zoom,12);
   expect(typeof detail.label==='string'&&detail.label.trim().length>0).toBe(true);expect(typeof detail.body==='string'&&detail.body.trim().length>0).toBe(true);
  }
  for(const id of ['solar-neighbourhood','central-bar','spiral-arms','galactic-disc'])expect(details.some(d=>d.id===id)).toBe(true);
 });

 it('restores view-specific notebook drafts and measured camera positions',()=>{
  for(const detail of details){
   const record={itemId:'milkyway',detailId:detail.id,note:'Inspect '+detail.id,size:9.5e20,zoom:2,yaw:.3,pitch:.2,view:'atlas'};
   const restored=plain(api.notes([record]));expect(restored).toHaveLength(1);const {yaw,...exact}=record;expect(restored[0]).toMatchObject(exact);expect(restored[0].yaw).toBeCloseTo(yaw,12);
   const key='milkyway:'+detail.id;expect(plain(api.drafts({[key]:'Saved '+detail.id}))).toEqual({[key]:'Saved '+detail.id});
  }
  expect(plain(api.drafts({'milkyway:galaxy-slice-101':'invalid','milkyway:galaxy-missing':'invalid'}))).toEqual({});
 });

 it('keeps the shared galaxy renderer used by other destinations unchanged',()=>{
  const start=source.indexOf('    function galaxyModel(g) {'),end=source.indexOf('    function lightVolumes(',start);
  expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
  const fragment=source.slice(start,end);
  expect(createHash('sha256').update(fragment).digest('hex')).toBe('044cc31c1bfc83ff203d5293d68c808a71ddfa9d7f810accf000b781c56206cf');
 });

 it('keeps the source and public preview module identical',()=>{
  expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js','utf8')).toBe(source);
 });
});

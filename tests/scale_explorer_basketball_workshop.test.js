import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.basketballChecks={sites:BASKETBALL_SITES,index:basketballStudyIndex,opening:basketballStudyOpening,point:basketballStudyPoint,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.basketballChecks,plain=x=>JSON.parse(JSON.stringify(x));
const ids=['basketball-whole','basketball-cover','basketball-channel','basketball-valve','basketball-inside','basketball-windings'];
const samples=Array.from({length:101},(_,i)=>'basketball-open-'+i);
const details=plain(api.details('basketball',(_,fallback)=>fallback));
const vector=(actual,expected,digits=11)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};

describe('Basketball workshop physical reference and navigation',()=>{
 it('retains the 24 cm diameter and six distinct study views',()=>{
  expect(api.items.find(item=>item.id==='basketball').size).toBe(.24);
  expect(plain(api.sites).map(site=>site.id)).toEqual(ids);
  expect(ids.map(id=>api.point(id).opening)).toEqual([0,0,0,0,100,80]);
 });

 it('rounds finite numeric openings and clamps to the complete cutaway range',()=>{
  for(const [input,expected] of [[-1,0],[0,0],[.4,0],[.5,1],[12.2,12],[72.8,73],[99.6,100],[100,100],[200,100]])expect(api.opening(input)).toBe(expected);
  for(const invalid of [undefined,null,NaN,Infinity,-Infinity,'73',{},[]])expect(api.opening(invalid)).toBe(0);
 });

 it('accepts only canonical whole opening IDs',()=>{
  for(let i=0;i<=100;i++)expect(api.index(samples[i])).toBe(i);
  for(const id of ['',undefined,null,30,'basketball-whole','basketball-open-','basketball-open--1','basketball-open-101','basketball-open-1.5','basketball-open-1e2','basketball-open-01','basketball-open-00','basketball-open-2junk','basketball-open-100 ',' basketball-open-0'])expect(api.index(id)).toBe(null);
 });

 it('provides finite cameras while cutaway samples share one stable inspection view',()=>{
  for(const id of [...ids,...samples]){
   const point=api.point(id);expect(point.at).toHaveLength(3);expect(point.view).toHaveLength(3);
   expect([...point.at,...point.view,point.zoom,point.opening].every(Number.isFinite)).toBe(true);
   expect(Math.hypot(...point.view)).toBeGreaterThan(0);expect(point.zoom).toBeGreaterThan(0);
   expect(Number.isInteger(point.opening)).toBe(true);expect(point.opening).toBeGreaterThanOrEqual(0);expect(point.opening).toBeLessThanOrEqual(100);
  }
  for(let i=0;i<=100;i++){
   const point=api.point(samples[i]);expect(point.opening).toBe(i);
   vector(point.at,api.point('basketball-open-50').at);vector(point.view,api.point('basketball-open-50').view);expect(point.zoom).toBe(api.point('basketball-open-50').zoom);
  }
  expect(plain(api.point('unknown'))).toEqual(plain(api.point(ids[0])));
 });

 it('makes every exact opening available as a distinct notebook detail',()=>{
  expect(details.map(detail=>detail.id)).toEqual([...ids,...samples]);expect(new Set(details.map(d=>d.id)).size).toBe(107);
  for(const detail of details){
   const point=api.point(detail.id);vector(detail.at,point.at);vector(detail.view,point.view);expect(detail.zoom).toBeCloseTo(point.zoom,12);
   expect(detail.basketballSite).toBe(true);expect(!!detail.basketballSample).toBe(detail.id.startsWith('basketball-open-'));
   expect(typeof detail.label==='string'&&detail.label.trim().length>0).toBe(true);expect(typeof detail.body==='string'&&detail.body.trim().length>0).toBe(true);
  }
 });

 it('restores notebook entries and drafts for every opening and close surface camera',()=>{
  for(const detail of details){
   const record={itemId:'basketball',detailId:detail.id,note:'Inspect '+detail.id,size:.24,zoom:detail.zoom,yaw:.3,pitch:.2,view:'atlas'};
   const restored=plain(api.notes([record]));expect(restored).toHaveLength(1);const {yaw,...exact}=record;expect(restored[0]).toMatchObject(exact);expect(restored[0].yaw).toBeCloseTo(yaw,12);
   const key='basketball:'+detail.id;expect(plain(api.drafts({[key]:'Saved '+detail.id}))).toEqual({[key]:'Saved '+detail.id});
  }
  expect(plain(api.drafts({'basketball:basketball-open-101':'invalid','basketball:basketball-open-073':'invalid','basketball:missing':'invalid'}))).toEqual({});
 });

 it('keeps the source and public preview module identical',()=>{
  expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js','utf8')).toBe(source);
 });
});

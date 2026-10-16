import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.humanStudyChecks={sites:HUMAN_STUDY_SITES,index:humanHeightIndex,point:humanStudyPoint,position:humanHeightPoint,height:humanStudyHeight,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.humanStudyChecks,plain=x=>JSON.parse(JSON.stringify(x));
const ids=['human-whole','human-head','human-shoulders','human-hand','human-knee','human-foot'];
const samples=Array.from({length:101},(_,i)=>'human-height-'+i);
const details=plain(api.details('human',(_,fallback)=>fallback));
const vector=(actual,expected,digits=11)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};

describe('Human stature study measurements and navigation',()=>{
 it('retains the catalog height and validates the complete personal height range',()=>{
  expect(api.items.find(item=>item.id==='human').size).toBe(1.7);
  for(const value of [.5,1,1.7,2.2,2.5])expect(api.height(value)).toBe(value);
  for(const value of [undefined,null,NaN,Infinity,-Infinity,-1,0,.49,2.51,'invalid',{},[]])expect(api.height(value)).toBe(1.7);
 });

 it('accepts only canonical whole percentage sample IDs',()=>{
  for(let i=0;i<=100;i++)expect(api.index(samples[i])).toBe(i);
  for(const id of ['',undefined,null,30,'human-head','human-height-','human-height--1','human-height-101','human-height-1.5','human-height-1e2','human-height-01','human-height-00','human-height-2junk','human-height-100 ',' human-height-0'])expect(api.index(id)).toBe(null);
 });

 it('maps fractional stature linearly from the soles to the crown',()=>{
  for(let i=0;i<=100;i++)vector(api.position(i/100),[0,i/100-.5,0]);
  vector(api.position(-1),[0,-.5,0]);vector(api.position(2),[0,.5,0]);
  for(const value of [NaN,undefined,null,Infinity,-Infinity,'invalid',{}])expect(api.position(value).every(Number.isFinite)).toBe(true);
 });

 it('offers six distinct study cameras and finite cameras at every height',()=>{
  expect(plain(api.sites).map(site=>site.id)).toEqual(ids);
  const landmarkTargets=[];
  for(const id of [...ids,...samples]){
   const point=api.point(id);expect(point.at).toHaveLength(3);expect(point.view).toHaveLength(3);
   expect([...point.at,...point.view,point.zoom,point.fraction].every(Number.isFinite)).toBe(true);
   expect(Math.hypot(...point.view)).toBeGreaterThan(0);expect(point.zoom).toBeGreaterThan(0);
   expect(point.fraction).toBeGreaterThanOrEqual(0);expect(point.fraction).toBeLessThanOrEqual(1);
   if(ids.includes(id))landmarkTargets.push(point.at.join(','));
  }
  expect(new Set(landmarkTargets).size).toBe(ids.length);
  for(let i=0;i<=100;i++){const point=api.point(samples[i]);expect(point.fraction).toBeCloseTo(i/100,12);vector(point.at,api.position(i/100));}
 });

 it('keeps every sampled height physically consistent at representative personal statures',()=>{
  for(const height of [.5,1.2,1.7,2.2,2.5])for(let i=0;i<=100;i++){
   const point=api.point(samples[i]);expect((point.at[1]+.5)*api.height(height)).toBeCloseTo(height*i/100,12);
  }
 });

 it('makes all landmarks and height samples available to the notebook',()=>{
  expect(details).toHaveLength(107);expect(details.map(detail=>detail.id)).toEqual([...ids,...samples]);
  expect(new Set(details.map(d=>d.id)).size).toBe(107);
  for(const detail of details){
   const point=api.point(detail.id);vector(detail.at,point.at);vector(detail.view,point.view);expect(detail.zoom).toBeCloseTo(point.zoom,12);
   expect(detail.marker).toBe(false);expect(typeof detail.label==='string'&&detail.label.trim().length>0).toBe(true);expect(typeof detail.body==='string'&&detail.body.trim().length>0).toBe(true);
  }
 });

 it('preserves recorded personal height, camera, and per-view drafts',()=>{
  for(const detail of details){
   const record={itemId:'human',detailId:detail.id,note:'Inspect '+detail.id,size:2.2,you:true,zoom:2,yaw:.3,pitch:.2,view:'atlas'};
   const restored=plain(api.notes([record]));expect(restored).toHaveLength(1);const {yaw,...exact}=record;expect(restored[0]).toMatchObject(exact);expect(restored[0].yaw).toBeCloseTo(yaw,12);
   const key='human:'+detail.id;expect(plain(api.drafts({[key]:'Saved '+detail.id}))).toEqual({[key]:'Saved '+detail.id});
  }
  expect(plain(api.drafts({'human:human-height-101':'invalid','human:human-missing':'invalid'}))).toEqual({});
  expect(api.notes([{itemId:'human',detailId:'human-height-50',size:2.2}])[0].size).toBe(1.7);
 });
});

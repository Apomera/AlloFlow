import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {guide,read,step}=new Function(pure+';return {guide:titrationWeighingTarget,read:titrationWeighingReading,step:titrationWeighingTransition};')();
const sample=(sampleUnits=5000)=>({closed:true,boat:true,tareUnits:23456,sampleUnits,recordedUnits:null});
describe('weighing target guide',()=>{
 it('uses a fixed full sample range and a fixed close-up around the actual target',()=>{
  expect(guide(sample())).toMatchObject({minUnits:0,maxUnits:20000,targetUnits:5000,lowerUnits:4980,upperUnits:5020,position:0.25,targetPosition:0.25,bandStart:0.249,bandWidth:0.002});
  expect(guide(sample(),true)).toMatchObject({minUnits:4900,maxUnits:5100,position:0.5,targetPosition:0.5,bandStart:0.4,bandWidth:0.2});
 });
 it('treats both activity-band limits as within while keeping the exact signed distance',()=>{
  for(const [units,relation] of [[4979,'below'],[4980,'within'],[4999,'within'],[5000,'within'],[5020,'within'],[5021,'above']])expect(guide(sample(units),true)).toMatchObject({relation,deltaUnits:units-5000,sampleUnits:units});
 });
 it('distinguishes in-range edge points from values beyond the close-up',()=>{
  for(const [units,offscale,position] of [[0,'below',0],[4899,'below',0],[4900,null,0],[5100,null,1],[5101,'above',1],[20000,'above',1]])expect(guide(sample(units),true)).toMatchObject({sampleUnits:units,offscale,position});
 });
 it('does not move the scale or misplace band boundaries as the mass changes',()=>{
  for(const zoom of [false,true])for(let units=0;units<=20000;units+=10){const r=guide(sample(units),zoom),span=r.maxUnits-r.minUnits;expect(r.bandStart*span+r.minUnits).toBeCloseTo(4980,10);expect((r.bandStart+r.bandWidth)*span+r.minUnits).toBeCloseTo(5020,10);expect(r.targetPosition*span+r.minUnits).toBe(5000);expect(r.position).toBeGreaterThanOrEqual(0);expect(r.position).toBeLessThanOrEqual(1);if(!r.offscale)expect(r.position*span+r.minUnits).toBeCloseTo(units,9);}
 });
 it('tracks a retained off-pan sample rather than its negative net display',()=>{
  const s=sample(5010),off={...s,boat:false};expect(read(off).net).toBe(-23456);expect(guide(off,true)).toMatchObject({sampleUnits:5010,deltaUnits:10,relation:'within',offPan:true,position:0.55});expect(guide(s,true).offPan).toBe(false);
 });
 it('keeps current mass distinct from a stale record and preserves actual-mass recording',()=>{
  const s=Object.freeze({...sample(5110),recordedUnits:5000});expect(guide(s,true)).toMatchObject({sampleUnits:5110,relation:'above',offscale:'above'});expect(s.recordedUnits).toBe(5000);expect(step(s,{type:'record'}).recordedUnits).toBe(5110);expect(s.sampleUnits).toBe(5110);
 });
 it('does not alter any trial field when changing scale',()=>{
  const s=Object.freeze({...sample(4990),closed:false,recordedUnits:4900});guide(s,true);guide(s,false);expect(s).toEqual({...sample(4990),closed:false,recordedUnits:4900});
 });
 it('normalizes malformed state and only enables close-up for an explicit boolean',()=>{
  for(const raw of [undefined,null,[],{tareUnits:'23456',sampleUnits:5000},sample(Infinity),sample(NaN)])expect(guide(raw,true)).toMatchObject({sampleUnits:0,deltaUnits:-5000,offscale:'below',position:0});
  expect(guide(sample(999999),true)).toMatchObject({sampleUnits:20000,offscale:'above',position:1});for(const zoom of [null,'true',1,{}])expect(guide(sample(),zoom).closeup).toBe(false);
 });
});

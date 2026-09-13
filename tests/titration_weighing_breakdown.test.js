import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {explain,step,read}=new Function(pure+';return {explain:titrationWeighingBreakdown,step:titrationWeighingTransition,read:titrationWeighingReading};')();
const sample=(sampleUnits=5000,boat=true)=>({closed:true,boat,tareUnits:23456,sampleUnits,recordedUnits:null});
describe('balance reading visual breakdown',()=>{
 it('shows the empty pan with no invented tare or sample',()=>{
  const r=explain();expect(r.situation).toBe('empty');for(const key of ['gross','deduction','net']){expect(r[key].value).toBe(0);expect(r[key].width).toBe(0);expect(r[key].negative).toBe(false);}expect(r.boatMass+r.sampleOnPan+r.sampleOffPan).toBe(0);
 });
 it('distinguishes an untared boat from a tared boat without removing its physical mass',()=>{
  const raw={closed:true,boat:true,tareUnits:0,sampleUnits:0},before=explain(raw),after=explain(step(raw,{type:'tare'}));expect(before.situation).toBe('untared');expect(before.net.value).toBe(23456);expect(after.situation).toBe('tared');expect(after.net.value).toBe(0);expect(before.gross.value).toBe(after.gross.value);expect(after.deduction.value).toBe(-23456);
 });
 it('decomposes the actual loaded pan into boat plus sample and gross minus tare',()=>{
  const r=explain(sample());expect(r.situation).toBe('sample');expect(r.boatMass).toBe(23456);expect(r.sampleOnPan).toBe(5000);expect(r.sampleOffPan).toBe(0);expect(r.gross.value).toBe(28456);expect(r.gross.value+r.deduction.value).toBe(r.net.value);expect(r.net.value).toBe(5000);
 });
 it('retains an off-pan sample while correctly showing the negative tare offset',()=>{
  const raw=sample(5010,false),r=explain(raw);expect(r.situation).toBe('removed');expect(r.gross.value).toBe(0);expect(r.sampleOnPan).toBe(0);expect(r.boatMass).toBe(0);expect(r.sampleOffPan).toBe(5010);expect(r.net.value).toBe(-23456);expect(r.net.negative).toBe(true);
  expect(explain(step({...raw,closed:false},{type:'boat'})).net.value).toBe(5010);
 });
 it('uses a single fixed scale with true signed lengths throughout the sample range',()=>{
  for(const sampleUnits of [0,1,10,4990,5000,5010,10000,20000])for(const boat of [true,false]){
   const r=explain(sample(sampleUnits,boat));expect(r.zero).toBe(25000/70000);
   for(const key of ['gross','deduction','net']){const b=r[key];expect(b.start).toBeGreaterThanOrEqual(0);expect(b.start+b.width).toBeLessThanOrEqual(1);expect(b.width*70000).toBeCloseTo(Math.abs(b.value),8);expect(b.negative).toBe(b.value<0);expect(b.negative?b.start+b.width:b.start).toBeCloseTo(r.zero,12);}
  }
 });
 it('follows the current pan reading instead of a stale record and never modifies either',()=>{
  const raw=Object.freeze({...sample(5100),recordedUnits:5000}),r=explain(raw);expect(r.net.value).toBe(5100);expect(raw.recordedUnits).toBe(5000);expect(raw.sampleUnits).toBe(5100);expect(read(raw).net).toBe(r.net.value);
 });
 it('keeps model stability separate from the mass calculation',()=>{
  const closed=explain(sample()),open=explain({...sample(),closed:false});expect(closed.stable).toBe(true);expect(open.stable).toBe(false);expect(open.net).toEqual(closed.net);expect(open.gross).toEqual(closed.gross);
 });
 it('normalizes malformed inputs through the existing weighing model',()=>{
  for(const raw of [undefined,null,[],{boat:true,tareUnits:'23456',sampleUnits:Infinity},{boat:false,tareUnits:23456,sampleUnits:NaN},{boat:true,tareUnits:23456,sampleUnits:999999}]){const r=explain(raw),reading=read(raw);expect(r.gross.value).toBe(reading.gross);expect(r.deduction.value).toBe(reading.tare?-reading.tare:0);expect(r.net.value).toBe(reading.net);expect(Number.isFinite(r.net.width)).toBe(true);expect(r.net.start+r.net.width).toBeLessThanOrEqual(1);}
 });
});

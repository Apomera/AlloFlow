import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {preview,step,state}=new Function(pure+';return {preview:titrationWeighingAdditions,step:titrationWeighingTransition,state:titrationWeighingState};')();
const ready=(sampleUnits=0)=>({boat:true,closed:false,tareUnits:23456,sampleUnits,recordedUnits:null});
describe('weighing addition comparison',()=>{
 it('compares all three portions using the same current sample, not cumulative predictions',()=>{
  const result=preview(ready(4970));
  expect(result.map(x=>[x.units,x.beforeUnits,x.afterUnits,x.allowed,x.target.relation])).toEqual([[1000,4970,5970,true,'above'],[100,4970,5070,true,'above'],[10,4970,4980,true,'within']]);
 });
 it('identifies exact targets and treats both band boundaries as inclusive',()=>{
  for(const [before,addition] of [[4000,1000],[4900,100],[4990,10]]){
   const p=preview(ready(before)).find(x=>x.units===addition);expect(p.target).toMatchObject({sampleUnits:5000,deltaUnits:0,relation:'within'});
  }
  for(const [before,relation] of [[4969,'below'],[4970,'within'],[5010,'within'],[5011,'above']])expect(preview(ready(before))[2].target).toMatchObject({sampleUnits:before+10,relation});
 });
 it('keeps overshooting additions available and permits recording their actual mass',()=>{
  const s=ready(5020),p=preview(s)[2];expect(p).toMatchObject({allowed:true,afterUnits:5030,reason:null});expect(p.target.relation).toBe('above');
  expect(step(step(step(s,{type:'add',units:10}),{type:'shield'}),{type:'record'}).recordedUnits).toBe(5030);
 });
 it('explains procedure gates without inventing a result for a blocked action',()=>{
  for(const [s,reason] of [[ready(),'none'],[{...ready(),boat:false},'boat'],[{...ready(),tareUnits:0},'tare'],[{...ready(),closed:true},'shield']]){
   for(const p of preview(s))if(reason==='none')expect(p.allowed).toBe(true);else expect(p).toMatchObject({allowed:false,reason,afterUnits:null,target:null});
  }
 });
 it('checks the sample limit separately for each portion and allows exactly 2 g',()=>{
  expect(preview(ready(19900)).map(p=>[p.allowed,p.afterUnits])).toEqual([[false,null],[true,20000],[true,19910]]);
  expect(preview(ready(19990)).map(p=>[p.allowed,p.afterUnits])).toEqual([[false,null],[false,null],[true,20000]]);
  for(const p of preview(ready(20000)))expect(p).toMatchObject({allowed:false,reason:'limit',afterUnits:null,target:null});
 });
 it('matches actual transitions across procedure states, fine values, and capacity boundaries',()=>{
  for(const boat of [false,true])for(const closed of [false,true])for(const tareUnits of [0,23456])for(const sampleUnits of [0,1,4000,4899,4900,4969,4970,4980,4990,5000,5010,5020,19900,19901,19990,19991,20000]){
   const s={boat,closed,tareUnits,sampleUnits,recordedUnits:5000},clean=state(s);
   for(const p of preview(s)){
    const applied=step(s,{type:'add',units:p.units});expect(p.allowed).toBe(applied.sampleUnits!==clean.sampleUnits);
    expect(p.afterUnits).toBe(p.allowed?applied.sampleUnits:null);expect(p.beforeUnits).toBe(clean.sampleUnits);expect(applied.recordedUnits).toBe(clean.recordedUnits);
   }
  }
 });
 it('leaves current and stale saved records intact and retains off-pan mass',()=>{
  for(const recordedUnits of [null,4900,4970]){
   const s=Object.freeze({...ready(4970),recordedUnits});preview(s);expect(s).toEqual({...ready(4970),recordedUnits});
   const off=Object.freeze({...s,boat:false});for(const p of preview(off))expect(p).toMatchObject({beforeUnits:4970,allowed:false,reason:'boat',afterUnits:null});expect(off.recordedUnits).toBe(recordedUnits);
  }
 });
 it('normalizes malformed saved state and does not emit non-finite predictions',()=>{
  for(const raw of [undefined,null,[],{boat:true,closed:false,tareUnits:'23456',sampleUnits:5000},{...ready(),sampleUnits:NaN},{...ready(),sampleUnits:Infinity},{...ready(),sampleUnits:999999}]){
   for(const p of preview(raw)){expect(Number.isFinite(p.beforeUnits)).toBe(true);if(p.afterUnits!==null){expect(Number.isSafeInteger(p.afterUnits)).toBe(true);expect(p.afterUnits).toBeLessThanOrEqual(20000);}else expect(p.allowed).toBe(false);}
  }
 });
});

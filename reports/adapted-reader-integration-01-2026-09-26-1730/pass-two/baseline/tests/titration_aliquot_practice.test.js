import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {state,step,result,available}=new Function(pure+';return {state:titrationAliquotState,step:titrationAliquotTransition,result:titrationAliquotResult,available:titrationAliquotSource};')();
const prepared=units=>({sourceUnits:units,phase:'mixed',volumeUnits:10000,eyeLevel:true});
const load=(units=4800)=>step(undefined,{type:'load'},prepared(units));
const act=(s,type)=>step(s,{type});
const sequence=(actions,initial=load())=>actions.reduce(act,initial);
const adjusted=()=>sequence(['condition','fill','eye','adjust']);
const delivered=()=>sequence(['wall','drain'],adjusted());
describe('volumetric aliquot practice',()=>{
 it('accepts only a completed mixed preparation',()=>{
  expect(available(prepared(4800))).toBe(4800);
  for(const raw of [undefined,{}, {...prepared(4800),phase:'filling'},{...prepared(4800),volumeUnits:10005},{...prepared(4800),eyeLevel:false},{...prepared(4800),sourceUnits:Infinity}]){expect(available(raw)).toBeNull();expect(step(undefined,{type:'load'},raw).sourceUnits).toBeNull();}
 });
 it('requires conditioning before filling and a valid source before any procedure',()=>{
  for(const type of ['condition','fill','eye','adjust','wall','drain','record','blow'])expect(act(undefined,type).sourceUnits).toBeNull();
  const s=load();for(const type of ['fill','eye','adjust','wall','drain','record','blow'])expect(act(s,type)).toEqual(s);
  expect(sequence(['condition','fill']).phase).toBe('filled');
 });
 it('requires eye alignment before setting the meniscus',()=>{
  const s=sequence(['condition','fill']);expect(act(s,'adjust')).toEqual(s);expect(act(s,'wall')).toEqual(s);expect(act(s,'drain')).toEqual(s);
  expect(sequence(['eye','adjust'],s)).toMatchObject({phase:'adjusted',eyeLevel:true,atWall:false});
 });
 it('requires contact with the receiver wall before gravity delivery',()=>{
  const s=adjusted();expect(act(s,'drain')).toEqual(s);expect(act(s,'record')).toEqual(s);
  expect(sequence(['wall','drain'],s)).toMatchObject({phase:'delivered',atWall:true,recorded:false});expect(result(delivered())).toBeNull();
 });
 it('records the calibrated 25 mL without subtracting retained tip liquid',()=>{
  const s=act(delivered(),'record');expect(result(s)).toEqual({volumeMl:25,gramsPerLiter:4.8,massGrams:0.12});
  expect(result(s).massGrams).toBeCloseTo(result(s).gramsPerLiter*result(s).volumeMl/1000,12);
 });
 it('invalidates an earlier record after blowout without inventing an extra volume',()=>{
  const s=act(act(delivered(),'record'),'blow');expect(s).toMatchObject({phase:'blown',recorded:true});expect(result(s)).toBeNull();
  for(const type of ['record','drain','blow','condition','fill','adjust','wall'])expect(act(s,type)).toEqual(s);
 });
 it('also blocks recording if blowout occurs before recording',()=>{
  const s=act(delivered(),'blow');expect(s.recorded).toBe(false);expect(result(act(s,'record'))).toBeNull();
 });
 it('retains the source copy until explicit reload and leaves preparation unchanged',()=>{
  const original=Object.freeze(prepared(4800)),s=Object.freeze(step(undefined,{type:'load'},original));expect(act(s,'condition').sourceUnits).toBe(4800);expect(s.phase).toBe('ready');expect(original.phase).toBe('mixed');
  expect(step(s,{type:'load'},prepared(5000)).sourceUnits).toBe(5000);expect(step(s,{type:'load'},{...prepared(5000),phase:'filling'})).toEqual(s);
 });
 it('restarts with the same solution and clears technique progress and the record',()=>{
  const s=act(act(delivered(),'record'),'blow');expect(act(s,'restart')).toEqual(load());expect(result(act(s,'restart'))).toBeNull();expect(act(s,'unknown')).toEqual(s);
 });
 it('rejects impossible saved sequences and malformed source masses',()=>{
  for(const sourceUnits of [0,-1,20001,NaN,Infinity,'4800',1.5])expect(result({sourceUnits,phase:'delivered',eyeLevel:true,atWall:true,recorded:true})).toBeNull();
  expect(state({sourceUnits:4800,phase:'delivered',recorded:true})).toMatchObject({phase:'filled',recorded:false,atWall:false});
  expect(state({sourceUnits:4800,phase:'blown',eyeLevel:true,recorded:true})).toMatchObject({phase:'adjusted',recorded:false});
  expect(state({sourceUnits:4800,phase:'unknown',eyeLevel:true,atWall:true,recorded:true})).toEqual(load());
 });
 it('preserves concentration and calculates a quarter of the source solute across the supported range',()=>{
  for(const units of [1,10,999,4800,5000,20000]){const r=result(sequence(['condition','fill','eye','adjust','wall','drain','record'],load(units)));expect(r.gramsPerLiter).toBe(units/1000);expect(r.massGrams).toBeCloseTo((units/10000)/4,12);expect(r.massGrams).toBeGreaterThan(0);}
 });
});

import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {state,step,result,available}=new Function(pure+';return {state:titrationPreparationState,step:titrationPreparationTransition,result:titrationPreparationResult,available:titrationPreparationSource};')();
const transfer=(phase='poured',recordedPhase=phase)=>({sourceUnits:5000,residuePermille:40,phase,recordedPhase});
const act=(s,type,units)=>step(s,{type,units});
const load=()=>step(undefined,{type:'load'},transfer());
const filling=()=>act(act(load(),'dissolve'),'transfer');
const atMark=()=>{let s=filling();for(let i=0;i<5;i++)s=act(s,'add',100);return s;};
describe('volumetric preparation practice',()=>{
 it('uses delivered mass from a current recorded transfer, rejecting absent or stale records',()=>{
  expect(available(transfer())).toBe(4800);expect(available(transfer('rinsed'))).toBe(5000);
  for(const raw of [undefined,{},transfer('ready',null),transfer('poured',null),transfer('rinsed','poured')]){expect(available(raw)).toBeNull();expect(step(undefined,{type:'load'},raw).sourceUnits).toBeNull();}
 });
 it('requires dissolution before quantitative transfer and additions',()=>{
  const s=load();expect(s.sourceUnits).toBe(4800);expect(s.volumeUnits).toBe(0);
  for(const type of ['transfer','add','eye','mix'])expect(act(s,type,100)).toEqual(s);
  const dissolved=act(s,'dissolve');expect(dissolved.phase).toBe('dissolved');expect(dissolved.volumeUnits).toBe(0);expect(act(dissolved,'add',100)).toEqual(dissolved);
  expect(act(dissolved,'transfer')).toMatchObject({phase:'filling',volumeUnits:9500,sourceUnits:4800});
 });
 it('accumulates fixed model additions exactly and rejects invalid portions',()=>{
  let s=filling();for(let i=0;i<100;i++)s=act(s,'add',5);expect(s.volumeUnits).toBe(10000);expect(s.sourceUnits).toBe(4800);
  for(const units of [-5,0,1,25,NaN,Infinity,'5',null])expect(act(s,'add',units)).toEqual(s);
 });
 it('requires the mark and eye-level check before mixing can produce a result',()=>{
  expect(result(act(filling(),'mix'))).toBeNull();expect(result(act(act(filling(),'eye'),'mix'))).toBeNull();expect(result(act(atMark(),'mix'))).toBeNull();
  const s=act(act(atMark(),'eye'),'mix');expect(s.phase).toBe('mixed');expect(result(s)).toEqual({massGrams:0.48,volumeMl:100,gramsPerLiter:4.8});
 });
 it('overshooting cannot be mixed or corrected by removing mixed solution',()=>{
  const s=act(act(atMark(),'eye'),'add',5);expect(s.volumeUnits).toBe(10005);expect(result(s)).toBeNull();
  for(const type of ['add','mix','remove'])expect(act(s,type,100)).toEqual(s);
  const reset=act(s,'restart');expect(reset).toEqual({...load(),eyeLevel:false});
 });
 it('represents a larger addition crossing the mark without clipping it back to the target',()=>{
  let s=filling();for(let i=0;i<99;i++)s=act(s,'add',5);s=act(s,'add',100);expect(s.volumeUnits).toBe(10095);expect(result(act(act(s,'eye'),'mix'))).toBeNull();
 });
 it('locks a completed record against further addition and mixing',()=>{
  const s=act(act(atMark(),'eye'),'mix');for(const type of ['add','dissolve','transfer','mix','eye'])expect(act(s,type,100)).toEqual(s);
 });
 it('retains a trial snapshot until explicit reload and does not mutate the transfer record',()=>{
  const original=Object.freeze(transfer()),s=Object.freeze(step(undefined,{type:'load'},original));
  expect(act(s,'dissolve').sourceUnits).toBe(4800);expect(s.phase).toBe('received');expect(original.phase).toBe('poured');
  expect(step(s,{type:'load'},transfer('rinsed'))).toEqual({...load(),sourceUnits:5000});
  expect(step(s,{type:'load'},transfer('rinsed','poured'))).toEqual(s);
 });
 it('restart retains only the selected mass and resets progress and eye alignment',()=>{
  const s=act(act(atMark(),'eye'),'mix');expect(act(s,'restart')).toEqual(load());expect(result(act(s,'restart'))).toBeNull();expect(act(s,'unknown')).toEqual(s);
 });
 it('normalizes malformed saved volumes and prevents impossible completion',()=>{
  for(const sourceUnits of [0,-1,20001,0.5,NaN,Infinity,'5000'])expect(result({sourceUnits,phase:'mixed',volumeUnits:10000,eyeLevel:true})).toBeNull();
  for(const volumeUnits of [0,9495,10105,9501,NaN,Infinity,'10000'])expect(state({sourceUnits:5000,phase:'mixed',volumeUnits,eyeLevel:true})).toMatchObject({phase:'filling',volumeUnits:9500});
  expect(result({sourceUnits:5000,phase:'mixed',volumeUnits:10000,eyeLevel:false})).toBeNull();expect(state({sourceUnits:5000,phase:'unknown',volumeUnits:10000}).volumeUnits).toBe(0);
 });
 it('uses grams per liter consistently across the allowed sample range',()=>{
  for(const sourceUnits of [1,10,999,4800,5000,20000]){const r=result({sourceUnits,phase:'mixed',volumeUnits:10000,eyeLevel:true});expect(r.gramsPerLiter).toBeCloseTo(r.massGrams/(r.volumeMl/1000),12);}
 });
});

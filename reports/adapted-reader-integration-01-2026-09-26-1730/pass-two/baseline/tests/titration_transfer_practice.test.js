import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {state,step,mass,available}=new Function(pure+';return {state:titrationTransferState,step:titrationTransferTransition,mass:titrationTransferMass,available:titrationTransferSource};')();
const weighing=units=>({closed:true,boat:true,tareUnits:23456,sampleUnits:units,recordedUnits:units});
const load=units=>step(undefined,{type:'load'},weighing(units));
const act=(s,type,value)=>step(s,{type,value});

describe('recorded-sample transfer practice',()=>{
  it('accepts a current weighing record but rejects absent or stale measurements',()=>{
    expect(available(weighing(5000))).toBe(5000);
    expect(available({...weighing(5000),boat:false,closed:false})).toBe(5000); // a saved record remains valid off the pan
    for(const w of [undefined,{}, {...weighing(5000),recordedUnits:null},{...weighing(5000),sampleUnits:5010},{...weighing(5000),tareUnits:0}]){
      expect(available(w)).toBeNull();expect(step(undefined,{type:'load'},w).sourceUnits).toBeNull();
    }
  });
  it('tracks a dry transfer and cancels the same boat mass in the difference',()=>{
    const s=act(load(5000),'pour');expect(mass(s)).toEqual({source:5000,remaining:200,received:4800,dryBefore:28456,dryAfter:23656});
    expect(mass(s).dryBefore-mass(s).dryAfter).toBe(mass(s).received);
  });
  it('conserves solid mass across the full residue-setting range, including small rounded samples',()=>{
    for(const units of [1,9,10,99,100,5011,19999,20000])for(let value=0;value<=100;value++){
      const s=act(load(units),'residue',value);
      for(const phase of ['ready','poured','rinsed']){
        const m=mass({...s,phase});expect(m.source).toBe(m.received+m.remaining);expect(Number.isSafeInteger(m.received)).toBe(true);expect(m.received).toBeGreaterThanOrEqual(0);expect(m.remaining).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('locks scenario settings after pouring and blocks out-of-order operations',()=>{
    const empty=state();for(const type of ['pour','rinse','record'])expect(act(empty,type)).toEqual(empty);
    const ready=load(5000);for(const type of ['rinse','record'])expect(act(ready,type)).toEqual(ready);
    for(const value of [-1,101,1.2,NaN,Infinity,'40'])expect(act(ready,'residue',value)).toEqual(ready);
    const poured=act(ready,'pour');expect(act(poured,'residue',80)).toEqual(poured);expect(act(poured,'pour')).toEqual(poured);
  });
  it('moves only the remaining solid during rinsing and withholds a wet after-mass',()=>{
    const poured=act(load(5000),'pour'),rinsed=act(poured,'rinse');expect(mass(rinsed)).toEqual({source:5000,remaining:0,received:5000,dryBefore:28456,dryAfter:null});
    expect(mass(rinsed).received-mass(poured).received).toBe(mass(poured).remaining);expect(act(rinsed,'rinse')).toEqual(rinsed);
  });
  it('retains an earlier dry record until the rinsed result is explicitly recorded',()=>{
    let s=act(act(load(5000),'pour'),'record');expect(s.recordedPhase).toBe('poured');
    s=act(s,'rinse');expect(s.recordedPhase).toBe('poured');expect(mass(s,s.recordedPhase).received).toBe(4800);expect(mass(s).received).toBe(5000);
    s=act(s,'record');expect(s.recordedPhase).toBe('rinsed');expect(mass(s,s.recordedPhase).received).toBe(5000);
  });
  it('retains its source snapshot until explicitly loading a new recorded sample',()=>{
    const original=Object.freeze(act(act(load(5000),'pour'),'record'));
    expect(available(weighing(7000))).toBe(7000);expect(mass(original).source).toBe(5000);
    expect(step(original,{type:'load'},weighing(7000))).toEqual({sourceUnits:7000,residuePermille:40,phase:'ready',recordedPhase:null});
    expect(step(original,{type:'load'},{})).toEqual(original);expect(original.sourceUnits).toBe(5000);
  });
  it('restarts the same trial without consuming the weighing sample',()=>{
    const w=Object.freeze(weighing(5000));const s=step(undefined,{type:'load'},w);const before=JSON.stringify(w);
    const trial=act(act(act(s,'residue',100),'pour'),'record');expect(act(trial,'restart')).toEqual({sourceUnits:5000,residuePermille:100,phase:'ready',recordedPhase:null});expect(JSON.stringify(w)).toBe(before);
  });
  it('handles zero residue without manufacturing an extra rinse or losing a record',()=>{
    const s=act(act(load(5000),'residue',0),'pour');expect(mass(s).received).toBe(5000);expect(act(s,'rinse')).toEqual(s);expect(act(s,'record').recordedPhase).toBe('poured');
  });
  it('rejects corrupt source masses and impossible saved record phases',()=>{
    for(const bad of [-1,0,NaN,Infinity,20001,1.1,'5000'])expect(state({sourceUnits:bad,phase:'rinsed',recordedPhase:'rinsed'})).toMatchObject({sourceUnits:null,phase:'ready',recordedPhase:null});
    expect(state({sourceUnits:5000,phase:'poured',recordedPhase:'rinsed',residuePermille:999})).toEqual({sourceUnits:5000,phase:'poured',recordedPhase:null,residuePermille:100});
    expect(state({sourceUnits:5000,phase:'bogus',recordedPhase:'poured',residuePermille:NaN})).toEqual({sourceUnits:5000,phase:'ready',recordedPhase:null,residuePermille:40});
  });
});

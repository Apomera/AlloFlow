import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {state,step,read}=new Function(pure+';return {state:titrationWeighingState,step:titrationWeighingTransition,read:titrationWeighingReading};')();
const act=(s,type,units)=>step(s,{type,units});
function prepared(){let s=state();for(const type of ['shield','boat','shield','tare'])s=act(s,type);return s;}
function loaded(units=1000){return act(act(prepared(),'shield'),'add',units);}

describe('weighing practice mass and procedure',()=>{
  it('subtracts the container without losing its contribution to gross mass',()=>{
    const empty=prepared();expect(read(empty)).toEqual({gross:23456,tare:23456,net:0});
    expect(read(loaded())).toEqual({gross:24456,tare:23456,net:1000});
  });
  it('requires an empty boat and closed shield for the exercise tare',()=>{
    const start=state();expect(act(start,'tare')).toEqual(start);
    const openBoat=act(act(start,'shield'),'boat');expect(act(openBoat,'tare').tareUnits).toBe(0);
    const full=act(loaded(),'shield');expect(act(full,'tare')).toEqual(full);
  });
  it('cannot add onto an empty pan, through closed doors, or before taring',()=>{
    const open=act(state(),'shield');expect(act(open,'add',1000).sampleUnits).toBe(0);
    expect(act(act(open,'boat'),'add',1000).sampleUnits).toBe(0);
    expect(act(prepared(),'add',1000).sampleUnits).toBe(0);
    for(const amount of [1,999,-10,NaN,Infinity,'1000'])expect(act(act(prepared(),'shield'),'add',amount).sampleUnits).toBe(0);
    expect(act(prepared(),'boat').boat).toBe(true);
  });
  it('accumulates fine portions exactly and enforces the explicit practice limit',()=>{
    let s=act(prepared(),'shield');for(let i=0;i<500;i++)s=act(s,'add',10);expect(s.sampleUnits).toBe(5000);expect(read(s).net/10000).toBe(0.5);
    for(let i=0;i<15;i++)s=act(s,'add',1000);expect(s.sampleUnits).toBe(20000);expect(act(s,'add',10)).toEqual(s);
  });
  it('keeps tare and the sample when the boat is removed and returned',()=>{
    const full=loaded();const off=act(full,'boat');expect(read(off)).toEqual({gross:0,tare:23456,net:-23456});
    expect(off.sampleUnits).toBe(1000);expect(act(off,'add',1000)).toEqual(off);expect(act(off,'boat')).toEqual(full);
  });
  it('records actual stable mass and preserves the earlier record after an addition',()=>{
    let s=loaded();expect(act(s,'record').recordedUnits).toBeNull();
    s=act(act(s,'shield'),'record');expect(s.recordedUnits).toBe(1000); // below target remains a valid measured mass
    s=act(act(s,'shield'),'add',100);expect(s.recordedUnits).toBe(1000);expect(s.sampleUnits).toBe(1100);
    s=act(act(s,'shield'),'record');expect(s.recordedUnits).toBe(1100);
    expect(act(prepared(),'record').recordedUnits).toBeNull();
  });
  it('normalizes damaged persisted state without manufacturing a valid record',()=>{
    for(const bad of [undefined,null,0,'bad',[],{tareUnits:1,sampleUnits:5000,recordedUnits:5000}])expect(state(bad).sampleUnits).toBe(0);
    for(const bad of [Infinity,NaN,0.2,'1000'])expect(state({tareUnits:23456,sampleUnits:bad,recordedUnits:bad})).toMatchObject({sampleUnits:0,recordedUnits:null});
    expect(state({tareUnits:23456,sampleUnits:999999,recordedUnits:999999,boat:'true'})).toMatchObject({sampleUnits:20000,recordedUnits:null,boat:false});
    expect(state({tareUnits:23456,sampleUnits:5000,recordedUnits:4000,boat:true,closed:false})).toEqual({tareUnits:23456,sampleUnits:5000,recordedUnits:4000,boat:true,closed:false});
  });
  it('leaves the previous state untouched and resets only the exercise',()=>{
    const s=Object.freeze(loaded());expect(act(s,'add',100).sampleUnits).toBe(1100);expect(s.sampleUnits).toBe(1000);
    expect(act(s,'reset')).toEqual(state());expect(act(s,'unknown')).toEqual(s);
  });
});

describe('equipment English source catalog',()=>{
  it('registers every literal equipment fallback, including helper component strings',()=>{
    const section=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function TitrationExperimentBench('));
    const en=JSON.parse(fs.readFileSync('dev-tools/i18n/stem_titration_en.json','utf8'));
    const re=/t\('stem\.titration\.([a-z0-9_]+)',\s*('(?:[^'\\]|\\.)*')\)/g;let m,count=0;
    while((m=re.exec(section))){expect(en[m[1]],m[1]).toBe(new Function('return '+m[2])());count++;}expect(count).toBeGreaterThan(100);
  });
});

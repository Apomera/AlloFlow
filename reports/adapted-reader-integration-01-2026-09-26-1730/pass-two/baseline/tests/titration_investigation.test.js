import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const notebook=source.slice(source.indexOf('function titrationBenchNotebook('),source.indexOf('// Guided endpoint investigation.'));
const helpers=source.slice(source.indexOf('function titrationInvestigationState('),source.indexOf('function TitrationInvestigation('));
const api=new Function(notebook+helpers+';return {state:titrationInvestigationState,key:titrationInvestigationKey,capture:titrationInvestigationCapture,progress:titrationInvestigationProgress,append:titrationBenchAppend};')();
const study=(patch={})=>({version:1,active:true,prediction:25,evidence:[],compared:'',explanation:'',completed:false,...patch});
const reading=(id,volume,value,patch={})=>({id,volume,value,preset:'sa_sb',setup:'HCl (0.1 M) + NaOH (0.1 M)',axis:'pH',indicator:'Phenolphthalein',observation:'Simulated reading',note:'',...patch});
const zero=reading(1,0,1),before=reading(2,25,7),after=reading(3,25.1,10.3),records=[zero,before,after];
const withEvidence=(rows=records,patch={})=>study({evidence:rows.map(api.key),...patch});
describe('guided titration investigation',()=>{
  it('normalizes unsupported or malformed saved state',()=>{
    for(const bad of [null,[],{},true,{version:2}])expect(api.state(bad)).toBeNull();
    for(const prediction of [NaN,Infinity,-1,51,'25',0.05])expect(api.state(study({prediction})).prediction).toBeNull();
    expect(api.state(study({prediction:0})).prediction).toBe(0);
    expect(api.state(study({active:'true',completed:'true',evidence:[null,1,'x'],explanation:'x'.repeat(900)}))).toMatchObject({active:false,completed:false,evidence:['x'],explanation:'x'.repeat(700)});
  });
  it('requires each real evidence stage before completion',()=>{
    expect(api.progress(withEvidence(records,{prediction:null,completed:true}),records).step).toBe(0);
    expect(api.progress(withEvidence([before,after]),records).step).toBe(1);
    expect(api.progress(withEvidence([zero,before]),records).step).toBe(2);
    const p=api.progress(withEvidence(),records);expect(p.step).toBe(3);
    const compared=withEvidence(records,{compared:p.pair.key,completed:true,explanation:'  '});expect(api.progress(compared,records).step).toBe(4);
    expect(api.progress({...compared,explanation:'My evidence supports a color-change interval.'},records).step).toBe(5);
  });
  it('never credits existing notebook readings when starting a study or editing their notes',()=>{
    const next=records.map(r=>({...r,note:'My note'}));
    expect(api.capture(study(),records,next,'sa_sb','phenolphthalein').evidence).toEqual([]);
    expect(api.progress(study(),records).step).toBe(1);
  });
  it('credits only newly saved readings after a prediction in the matching active setup',()=>{
    expect(api.capture(study(),[zero],records,'sa_sb','phenolphthalein').evidence).toEqual([api.key(before),api.key(after)]);
    for(const config of [[study({active:false}),'sa_sb','phenolphthalein'],[study({prediction:null}),'sa_sb','phenolphthalein'],[study(),'wa_sb','phenolphthalein'],[study(),'sa_sb','methylOrange']])expect(api.capture(config[0],[],records,config[1],config[2]).evidence).toEqual([]);
  });
  it('does not mix reaction types, axes, setups, or indicators',()=>{
    for(const patch of [{preset:'redox_kmno4'},{axis:'E'},{setup:'Other solution'},{indicator:'Methyl Orange'}]){const rows=[zero,before,{...after,...patch}];expect(api.progress(withEvidence(rows),rows).pair).toBeNull();}
  });
  it('requires a narrow interval with increasing volume across the indicator threshold',()=>{
    for(const [a,b] of [[reading(2,24,3),after],[reading(2,25.1,7),after],[reading(2,25.2,7),after],[before,reading(3,25.1,8.19)],[reading(2,25,8.2),after]]){const rows=[zero,a,b];expect(api.progress(withEvidence(rows),rows).pair).toBeNull();}
    const rows=[zero,reading(2,24.9,2.7),after];expect(api.progress(withEvidence(rows),rows).pair.gap).toBe(0.2);
  });
  it('accepts color change across the 0.1 mL sampling jump without requiring an unreachable indicator-band reading',()=>{
    const p=api.progress(withEvidence(),records);expect(p.pair).toMatchObject({a:before,b:after,gap:0.1});
    expect(p.pair.b.value).toBeGreaterThan(10);
  });
  it('accepts observations collected while revisiting the simulation',()=>{
    const rows=[after,zero,before];expect(api.progress(withEvidence(rows),rows).pair).toMatchObject({a:before,b:after});
  });
  it('retains a reviewed pair when more qualifying evidence is saved',()=>{
    const wide=[zero,reading(4,24.9,2.7),after],p=api.progress(withEvidence(wide),wide),all=wide.concat(before),state=withEvidence(all,{compared:p.pair.key,explanation:'Earlier observations',completed:true});
    expect(api.progress(state,all)).toMatchObject({step:5,pair:{gap:0.2}});
  });
  it('clearing or replacing readings removes their contribution instead of trusting reused numeric ids',()=>{
    const p=api.progress(withEvidence(),records),state=withEvidence(records,{compared:p.pair.key,explanation:'Evidence',completed:true});
    expect(api.progress(state,[]).step).toBe(1);
    expect(api.progress(state,[zero,before,{...after,volume:40}]).step).toBe(2);
    expect(api.capture(state,records,[],'sa_sb','phenolphthalein').evidence).toEqual([]);
  });
  it('note edits preserve evidence, and helpers do not mutate stored data',()=>{
    const frozen=Object.freeze(withEvidence()),next=records.map(r=>({...r,note:'Changed text'}));
    expect(api.progress(frozen,next).pair).not.toBeNull();
    expect(api.capture(frozen,records,next,'sa_sb','phenolphthalein').evidence).toEqual(frozen.evidence);
    expect(frozen.evidence).toHaveLength(3);
  });
  it('shares validated notebook saves, capacity, and numeric id allocation with the bench',()=>{
    const input=Object.freeze([zero,after]),next=api.append(input,before);expect(next.at(-1)).toMatchObject({id:2,volume:25});expect(input).toHaveLength(2);
    expect(api.append(Array.from({length:40},(_,i)=>reading(i+1,i,7)),before)).toBeNull();
    expect(api.append([],reading(1,NaN,7))).toBeNull();
  });
  it('registers the English guide and navigation text',()=>{
    const en=JSON.parse(fs.readFileSync('dev-tools/i18n/stem_titration_en.json','utf8'));let count=0;
    for(const m of source.matchAll(/t\('stem\.titration\.(invest_[a-z0-9_]+)',\s*('(?:[^'\\]|\\.)*')\)/g)){expect(en[m[1]],m[1]).toBe(new Function('return '+m[2])());count++;}
    expect(count).toBeGreaterThan(60);
  });
});

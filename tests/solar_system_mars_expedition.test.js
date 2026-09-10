import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const {progress,record}=new Function(source.slice(source.indexOf('  function marsMissionProgress('),source.indexOf('  var _stableViewTypes'))+';return {progress:marsMissionProgress,record:addMarsTransferTrial};')();
const mission={active:true,startedAt:100,prediction:'meet'};
const trial={from:'earth',to:'mars',progress:1,offset:0,separation:0,days:258.9,timestamp:200};
const evidence=(kind,patch={})=>({source:'drone',planet:'Mars',kind,timestamp:200,observation:'Measured scene evidence',...patch});
describe('connected Mars expedition',()=>{
 it('starts without completed stages or evidence',()=>{expect(progress(null,[],'Mars')).toMatchObject({count:0,surfaceDone:false,transferDone:false,complete:false});});
 it('requires both a fresh Mars environment scan and a collected specimen',()=>{
  const invalid=[null,evidence('Scan',{timestamp:99}),evidence('Scan',{planet:'Earth'}),evidence('Scan',{source:'manual'}),evidence('Scan',{observation:' '}),evidence('Survey')];
  expect(progress(mission,invalid,'Mars').scan).toBeNull();
  expect(progress(mission,[...invalid,evidence('Scan')],'Mars').surfaceDone).toBe(false);
  expect(progress(mission,[...invalid,evidence('Scan'),evidence('Sample')],'Mars')).toMatchObject({surfaceDone:true,count:2});
  expect(progress({},[evidence('Scan'),evidence('Sample')],'Mars').surfaceDone).toBe(false);
 });
 it('records the two actual arrivals immutably and preserves the original prediction',()=>{
  const first=record(mission,trial);const second=record(first,{...trial,offset:30,separation:0.789});
  expect(mission.trials).toBeUndefined();expect(Object.keys(second.trials)).toEqual(['aligned','offset']);
  expect(second.trials.offset.prediction).toBe('meet');expect(progress(second,[],'Mars').transferDone).toBe(true);
  expect(record(second,{...trial,separation:1})).toBe(second);
 });
 it('rejects midflight, other routes, other angles and invalid numeric evidence',()=>{
  for(const patch of [{progress:0.5},{from:'mars'},{to:'earth'},{offset:-30},{offset:NaN},{separation:Infinity},{separation:-1},{days:0},{days:Infinity},{timestamp:99},{timestamp:NaN}])expect(record(mission,{...trial,...patch})).toBe(mission);
 });
 it('requires a prediction and an active unfinished mission',()=>{
  for(const patch of [{prediction:''},{active:false},{completedAt:300}]){const state={...mission,...patch};expect(record(state,trial)).toBe(state);}
 });
 it('restores completed progress from persisted trials and evidence',()=>{
  const state={...record(record(mission,trial),{...trial,offset:30,separation:0.789}),completedAt:400};
  expect(progress(JSON.parse(JSON.stringify(state)),[evidence('Scan'),evidence('Sample')],'Mars')).toMatchObject({count:4,complete:true});
 });
});

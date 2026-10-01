import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const progress=new Function(pure+';return titrationPreparationProgress;')();
const weighing={closed:true,boat:true,tareUnits:23456,sampleUnits:5000,recordedUnits:5000};
const transfer={sourceUnits:5000,residuePermille:40,phase:'poured',recordedPhase:'poured'};
const preparation={sourceUnits:4800,phase:'mixed',volumeUnits:10000,eyeLevel:true};
const aliquot={sourceUnits:4800,phase:'delivered',eyeLevel:true,atWall:true,recorded:true};
const complete=()=>({weighingPractice:{...weighing},transferPractice:{...transfer},preparationPractice:{...preparation},aliquotPractice:{...aliquot}});
const stage=(data,id)=>progress(data).stages.find(s=>s.id===id);
describe('preparation progress overview',()=>{
 it('starts at weighing without inventing records or unlocking later sources',()=>{
  const p=progress();expect(p.completed).toBe(0);expect(p.nextId).toBe('analytical-balance');expect(p.stages.map(s=>s.status)).toEqual(['available','pending','pending','pending']);expect(p.stages.every(s=>s.value===null)).toBe(true);
 });
 it('recognizes opening the balance as existing progress',()=>{expect(stage({weighingPractice:{closed:false}},'analytical-balance').status).toBe('active');});
 it('advances through available activities as records are produced',()=>{
  const data={weighingPractice:weighing};expect(progress(data).nextId).toBe('weighing-boat');expect(progress(data).completed).toBe(1);
  data.transferPractice=transfer;expect(progress(data).nextId).toBe('volumetric-flask');expect(progress(data).completed).toBe(2);
  data.preparationPractice=preparation;expect(progress(data).nextId).toBe('pipette');expect(progress(data).completed).toBe(3);
 });
 it('counts current records and reports their actual units at completion',()=>{
  const p=progress(complete());expect(p.completed).toBe(4);expect(p.nextId).toBe('pipette');expect(p.stages.map(s=>[s.value,s.unit])).toEqual([[5000,'g'],[4800,'g'],[4.8,'g/L'],[25,'mL']]);expect(p.stages.every(s=>s.status==='complete'&&!s.sourceChanged)).toBe(true);
 });
 it('marks an altered weighing record for attention while preserving later copies',()=>{
  const data=complete();data.weighingPractice.sampleUnits=5010;const p=progress(data);expect(p.completed).toBe(3);expect(p.nextId).toBe('analytical-balance');expect(p.stages[0]).toMatchObject({status:'attention',issue:'weighing',value:null});expect(p.stages[1]).toMatchObject({status:'complete',sourceChanged:true,value:4800});expect(p.stages[2].status).toBe('complete');
 });
 it('requires rerecording a rinsed transfer without invalidating a separate preparation copy',()=>{
  const data=complete();data.transferPractice.phase='rinsed';const p=progress(data);expect(p.completed).toBe(3);expect(p.nextId).toBe('weighing-boat');expect(p.stages[1]).toMatchObject({status:'attention',issue:'transfer',value:null});expect(p.stages[2]).toMatchObject({status:'complete',sourceChanged:true,value:4.8});
 });
 it('distinguishes overshoot from an ordinary in-progress preparation',()=>{
  const data=complete();data.preparationPractice={...preparation,phase:'filling',volumeUnits:9995};expect(stage(data,'volumetric-flask').status).toBe('active');expect(progress(data).nextId).toBe('volumetric-flask');
  data.preparationPractice.volumeUnits=10005;expect(stage(data,'volumetric-flask')).toMatchObject({status:'attention',issue:'preparation'});expect(stage(data,'pipette')).toMatchObject({status:'complete',sourceChanged:true});
 });
 it('does not count an aliquot invalidated by blowout',()=>{
  const data=complete();data.aliquotPractice.phase='blown';expect(progress(data)).toMatchObject({completed:3,nextId:'pipette'});expect(stage(data,'pipette')).toMatchObject({status:'attention',issue:'aliquot',value:null});
 });
 it('prioritizes an issue, then existing progress, before an untouched activity',()=>{
  const data={preparationPractice:{...preparation,phase:'filling',volumeUnits:9900}};expect(progress(data).nextId).toBe('volumetric-flask');
  data.transferPractice={...transfer,phase:'rinsed'};expect(progress(data).nextId).toBe('weighing-boat');
  expect(progress({weighingPractice:{...weighing,recordedUnits:null}}).nextId).toBe('analytical-balance');
 });
 it('reports source changes without turning valid copied records into errors',()=>{
  const data=complete();data.weighingPractice={...weighing,sampleUnits:5100,recordedUnits:5100};const p=progress(data);expect(p.completed).toBe(4);expect(p.stages[1]).toMatchObject({status:'complete',sourceChanged:true});
  delete data.preparationPractice;expect(stage(data,'pipette')).toMatchObject({status:'complete',sourceChanged:true,value:25});
 });
 it('handles incomplete loaded activities without counting them as recorded',()=>{
  const data={transferPractice:{...transfer,phase:'ready',recordedPhase:null},preparationPractice:{...preparation,phase:'dissolved',volumeUnits:0},aliquotPractice:{...aliquot,phase:'conditioned',recorded:false}};expect(progress(data).completed).toBe(0);expect(progress(data).stages.slice(1).map(s=>s.status)).toEqual(['active','active','active']);
 });
 it('normalizes malformed persisted data and never mutates source records',()=>{
  const data=complete();Object.values(data).forEach(Object.freeze);Object.freeze(data);expect(progress(data).completed).toBe(4);
  for(const raw of [null,[],42,{weighingPractice:{sampleUnits:Infinity,recordedUnits:NaN},transferPractice:{sourceUnits:'5000',phase:'rinsed',recordedPhase:'rinsed'},preparationPractice:{sourceUnits:Infinity,phase:'mixed'},aliquotPractice:{sourceUnits:20001,phase:'delivered',recorded:true}}])expect(progress(raw).completed).toBe(0);
 });
});

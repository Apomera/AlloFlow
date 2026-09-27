import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const host={};vm.runInNewContext(readFileSync('stem_lab/water_worlds_kernel.js','utf8'),host);
const K=host.WaterWorldsKernel;

describe('Water Worlds land design preview',()=>{
 it('describes only actual changes and preserves the selected world',()=>{
  const s=K.initial(),saved=JSON.stringify(s),plan=K.landPlan(s,0,'paved',false);
  expect(plan).toEqual({targetIndices:[0],indices:[0],changeCount:1,excludedStreams:0,areaM2:400,canApply:true,reason:null});
  plan.indices.push(1);
  expect(JSON.stringify(s)).toBe(saved);
  const unchanged=K.landPlan(s,0,'forest',false);
  expect(unchanged.changeCount).toBe(0);expect(unchanged.areaM2).toBe(0);
  expect(unchanged.canApply).toBe(false);expect(unchanged.reason).toBe('unchanged');
 });
 it('clips corner and edge patches without wrapping to another row',()=>{
  const s=K.initial();
  expect(K.landPlan(s,0,'basin',true).targetIndices).toEqual([0,1,12,13]);
  expect(K.landPlan(s,11,'basin',true).targetIndices).toEqual([10,11,22,23]);
  expect(K.landPlan(s,84,'basin',true).targetIndices).toEqual([72,73,84,85]);
  expect(K.landPlan(s,95,'basin',true).targetIndices).toEqual([82,83,94,95]);
  expect(K.landPlan(s,24,'basin',true).targetIndices).toEqual([12,13,24,25,36,37]);
 });
 it('counts protected stream cells while allowing neighboring land in a patch',()=>{
  const s=K.initial(),single=K.landPlan(s,41,'paved',false),patch=K.landPlan(s,41,'paved',true);
  expect(single.canApply).toBe(false);expect(single.reason).toBe('stream-only');
  expect(single.excludedStreams).toBe(1);expect(single.indices).toEqual([]);
  expect(patch.targetIndices).toHaveLength(9);expect(patch.excludedStreams).toBe(6);
  expect(patch.indices).toEqual([28,40,52]);expect(patch.areaM2).toBe(1200);expect(patch.canApply).toBe(true);
 });
 it('applies exactly the previewed changes across cover boundaries and patch sizes',()=>{
  const s=K.initial();
  for(const selected of [0,11,27,41,46,84,95])for(const cover of ['grass','forest','paved','basin'])for(const patch of [false,true]){
   const plan=K.landPlan(s,selected,cover,patch),edited=K.edit(s,plan.targetIndices,cover);
   const changed=edited.world.cells.flatMap((cell,i)=>cell.cover===s.world.cells[i].cover?[]:[i]);
   expect(changed).toEqual(plan.indices);expect(changed.length).toBe(plan.changeCount);
   expect(plan.areaM2).toBe(changed.length*400);
   expect(edited.world.cells.filter(cell=>cell.cover==='stream')).toHaveLength(16);
  }
 });
 it('keeps the preview readable while blocking changes during running and paused storms',()=>{
  const running=K.begin(K.initial(),false);
  for(const s of [running,{...running,running:false}]){
   const plan=K.landPlan(s,0,'paved',true);
   expect(plan.changeCount).toBe(4);expect(plan.canApply).toBe(false);expect(plan.reason).toBe('active-run');
   expect(K.edit(s,plan.targetIndices,'paved')).toBe(s);
  }
  const finished=K.advance(running,240);
  expect(K.landPlan(finished,0,'paved',true).canApply).toBe(true);
 });
 it('rejects invalid selections and cover choices without changing evidence',()=>{
  const s=K.initial();
  for(const selected of [-1,96,1.5,'0',NaN,Infinity,null]){
   const plan=K.landPlan(s,selected,'forest',true);
   expect(plan.targetIndices).toEqual([]);expect(plan.canApply).toBe(false);expect(plan.reason).toBe('invalid-selection');
  }
  for(const cover of ['stream','unknown','toString','__proto__',null]){
   const plan=K.landPlan(s,0,cover,true);
   expect(plan.canApply).toBe(false);expect(plan.reason).toBe('invalid-cover');
   expect(K.edit(s,plan.targetIndices,cover)).toBe(s);
  }
 });
 it('does not count duplicate or out-of-bounds indices as extra edits',()=>{
  const s=K.initial(),edited=K.edit(s,[0,0,1,-1,96,1.5,'2'],'paved');
  expect(edited.world.cells.flatMap((c,i)=>c.cover===s.world.cells[i].cover?[]:[i])).toEqual([0,1]);
  expect(K.edit(s,null,'paved')).toBe(s);
 });
});

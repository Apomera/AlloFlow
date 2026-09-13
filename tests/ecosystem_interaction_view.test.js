import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
it('frames the recorded cue identity using current poses without modifying the simulation',()=>{
  const c={enabled:{caterpillars:true,bluetits:true}},pair=api.compare(c),frames=api.behaviorTimeline(c,pair.experiment),before=JSON.stringify(frames);let count=0;
  for(const frame of frames)for(const id of ['foxes','owls','bluetits','rabbits','voles']){
    const result=api.interaction(frame,id,0),cue=api.explainBehavior(id,frame[id][0]).cue;
    if(result){count++;expect(result.id).toBe(cue.id);expect(result.index).toBe(cue.index);expect(result.selected).toBe(frame[id][0]);expect(result.other).toBe(frame[cue.id][cue.index]);expect(result.other.active).toBe(true);}
    else expect(cue).toBeNull();
  }
  expect(count).toBeGreaterThan(50);expect(JSON.stringify(frames)).toBe(before);
});
it('does not retain pairs for committed pounces, absent targets or malformed samples',()=>{
  const p={x:0,z:0,altitude:0.1,active:true,state:'Stalking',prey:'voles',preyIndex:1},other={x:1,z:1,altitude:0.02,active:true},f={foxes:[p],voles:[null,other]};
  expect(api.interaction(f,'foxes',0).other).toBe(other);
  for(const state of ['Pouncing','Recovering','Resting'])expect(api.interaction({...f,foxes:[{...p,state}]},'foxes',0)).toBeNull();
  expect(api.interaction({...f,voles:[null,{...other,active:false}]},'foxes',0)).toBeNull();expect(api.interaction({...f,voles:[]},'foxes',0)).toBeNull();expect(api.interaction({...f,voles:[null,{...other,x:NaN}]},'foxes',0)).toBeNull();expect(api.interaction(null,'foxes',0)).toBeNull();
});

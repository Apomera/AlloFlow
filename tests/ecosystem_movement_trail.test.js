import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
it('reconstructs only bounded past positions, preserving altitude and the source samples',()=>{
  const c={event:'none'},pair=api.compare(c),frames=api.behaviorTimeline(c,pair.baseline),before=JSON.stringify(frames);
  for(const id of ['foxes','owls','caterpillars'])for(const step of [0,12,30,31,160,240]){
    const actual=api.trail(frames,id,0,step),expected=frames.slice(Math.max(0,step-30),step+1).map((f,i)=>({step:Math.max(0,step-30)+i,x:f[id][0].x,z:f[id][0].z,altitude:f[id][0].altitude}));
    expect(actual).toEqual(frames[step][id][0].active?expected:[]);expect(actual.length).toBeLessThanOrEqual(31);
  }
  expect(api.trail(frames,'owls',0,90)).toEqual(api.trail(frames,'owls',0,90));expect(JSON.stringify(frames)).toBe(before);
});
it('does not bridge absence, missing poses or invalid coordinates',()=>{
  const p={x:2,z:3,altitude:0.4,active:true},frames=[{foxes:[p]},{foxes:[{...p,active:false}]},{foxes:[p]},{foxes:[{...p,x:4}]}];
  expect(api.trail(frames,'foxes',0,1)).toEqual([]);expect(api.trail(frames,'foxes',0,3).map(p=>p.step)).toEqual([2,3]);
  frames[1]={};expect(api.trail(frames,'foxes',0,3).map(p=>p.step)).toEqual([2,3]);
  frames[2]={foxes:[{...p,x:NaN}]};expect(api.trail(frames,'foxes',0,3).map(p=>p.step)).toEqual([3]);
  for(const step of [-1,4,1.5,NaN])expect(api.trail(frames,'foxes',0,step)).toEqual([]);
  expect(api.trail(frames,'foxes',8,3)).toEqual([]);expect(api.trail(frames,'plants',0,3)).toEqual([]);
});
it('clears a removed predator trail at the intervention while baseline tracking remains available',()=>{
  const c={event:'remove',target:'foxes'},pair=api.compare(c),before=JSON.stringify(pair),a=api.behaviorTimeline(c,pair.baseline),b=api.behaviorTimeline(c,pair.experiment);
  expect(api.trail(b,'foxes',0,79)).toHaveLength(31);expect(api.trail(b,'foxes',0,80)).toEqual([]);expect(api.trail(a,'foxes',0,80)).toHaveLength(31);expect(JSON.stringify(pair)).toBe(before);
});

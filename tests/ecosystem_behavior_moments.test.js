import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
describe('behavior moment indexing',()=>{
  it('covers each sampled action exactly once without merging separate occurrences',()=>{
    const config={enabled:{caterpillars:true,bluetits:true},event:'none'},frames=api.behaviorTimeline(config,api.compare(config).baseline);
    for(const id of ['foxes','rabbits','caterpillars','bluetits'])for(const index of [0,7]){
      const moments=api.behaviorMoments(frames,id,index),expanded=moments.flatMap(m=>Array.from({length:m.end-m.start+1},(_,offset)=>({step:m.start+offset,state:m.state,active:m.active})));
      expect(expanded).toEqual(frames.map((frame,step)=>({step,state:frame[id][index].state,active:frame[id][index].active})));
      expect(moments[0].start).toBe(0);expect(moments.at(-1).end).toBe(240);
      for(let i=1;i<moments.length;i++)expect(moments[i].state!==moments[i-1].state||moments[i].active!==moments[i-1].active).toBe(true);
    }
  });
  it('indexes predator absence at the intervention boundary and leaves both runs untouched',()=>{
    const config={event:'remove',target:'foxes'},pair=api.compare(config),before=JSON.stringify(pair),baseline=api.behaviorTimeline(config,pair.baseline),experiment=api.behaviorTimeline(config,pair.experiment),framesBefore=JSON.stringify(experiment);
    const a=api.behaviorMoments(baseline,'foxes',0),b=api.behaviorMoments(experiment,'foxes',0);
    expect(a.every(m=>m.active)).toBe(true);expect(b.find(m=>!m.active)).toEqual({start:80,end:240,state:'Not present',active:false});
    expect(JSON.stringify(pair)).toBe(before);expect(JSON.stringify(experiment)).toBe(framesBefore);
    expect(api.behaviorMoments(experiment,'foxes',0)).toEqual(b);
  });
  it('handles missing representatives, gaps, and single-sample actions',()=>{
    const pose={state:'Resting',active:true},frames=[{foxes:[pose]},{},{foxes:[pose]},{foxes:[{state:'Listening',active:true}]}];
    expect(api.behaviorMoments(frames,'foxes',0)).toEqual([{start:0,end:0,state:'Resting',active:true},{start:2,end:2,state:'Resting',active:true},{start:3,end:3,state:'Listening',active:true}]);
    expect(api.behaviorMoments(frames,'foxes',5)).toEqual([]);expect(api.behaviorMoments([], 'foxes',0)).toEqual([]);expect(api.behaviorMoments(frames,'plants',0)).toEqual([]);
  });
});

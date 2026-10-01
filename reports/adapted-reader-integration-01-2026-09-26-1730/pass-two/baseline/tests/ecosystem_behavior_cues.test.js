import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={enabled:{caterpillars:true,bluetits:true},event:'remove',target:'foxes'};
describe('recorded behavior explanations',()=>{
  it('distinguishes a current threat from lingering alarm without linking an unrelated predator',()=>{
    const alert={active:true,state:'Alert',threat:'foxes',threatIndex:2,threatDistance:2.6,alarm:1};
    expect(api.explainBehavior('rabbits',alert).cue).toEqual({id:'foxes',index:2,name:'Red foxes'});
    const lingering=api.explainBehavior('rabbits',{...alert,threatDistance:5,alarm:.6});
    expect(lingering.text).toContain('recent threat');expect(lingering.cue).toBe(null);
    expect(api.explainBehavior('rabbits',{...alert,threat:null,threatIndex:null,threatDistance:null}).cue).toBe(null);
  });
  it('does not imply hunger, a current prey target, or capture during scheduled pauses and committed leaps',()=>{
    const leap=api.explainBehavior('foxes',{active:true,state:'Pouncing',prey:null,preyIndex:null});
    expect(leap.text).toContain('does not confirm a capture');expect(leap.cue).toBe(null);
    expect(api.explainBehavior('foxes',{active:true,state:'Resting',prey:'rabbits',preyIndex:0}).cue).toBe(null);
    expect(api.explainBehavior('caterpillars',{active:true,state:'Resting',foodAvailable:false}).text).toContain('Plant food is unavailable');
    expect(api.explainBehavior('foxes',{active:false,state:'Not present',prey:'rabbits',preyIndex:0}).cue).toBe(null);
  });
  it('records distances from the decision input poses rather than recomputing after movement',()=>{
    const pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline);let checked=0;
    for(let t=1;t<frames.length;t+=7)for(const id of ['rabbits','voles','foxes','owls','bluetits']){
      const p=frames[t][id][0],old=frames[t-1][id][0];
      for(const kind of ['threat','prey'])if(p[kind]){
        const target=frames[t-1][p[kind]][p[kind+'Index']];
        expect(p[kind+'Distance']).toBeCloseTo(Math.hypot(target.x-old.x,target.z-old.z),12);checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
  it('only links present representatives, excludes removed predators, and preserves replay and biomass',()=>{
    const pair=api.compare(config),before=JSON.stringify(pair),frames=api.behaviorTimeline(config,pair.experiment);
    for(let t=0;t<frames.length;t++)for(const id of ['rabbits','voles','foxes','owls','bluetits','caterpillars']){
      const pose=frames[t][id][0],explanation=api.explainBehavior(id,pose);
      expect(explanation.text).not.toContain('belongs to the representative animation');
      if(explanation.cue){expect(frames[t][explanation.cue.id][explanation.cue.index].active).toBe(true);if(t>=80)expect(explanation.cue.id).not.toBe('foxes');}
    }
    expect(JSON.stringify(pair)).toBe(before);expect(api.behaviorTimeline(config,pair.experiment)).toEqual(frames);
  });
});

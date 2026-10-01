import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const calm={threatDistance:Infinity,preyDistance:Infinity,food:true,alarm:0};
describe('contextual representative behavior',()=>{
  it('uses nearby threats and lingering alarm to interrupt feeding',()=>{
    expect(api.behavior('rabbits',6,calm).state).toBe('Grazing');
    expect(api.behavior('rabbits',6,{...calm,threatDistance:2.5}).state).toBe('Alert');
    expect(api.behavior('rabbits',6,{...calm,threatDistance:1.4}).mode).toBe('away');
    expect(api.behavior('voles',6,{...calm,alarm:0.6}).state).toBe('Alert');
    expect(api.behavior('rabbits',6,{...calm,food:false}).state).toBe('Searching for food');
  });
  it('requires nearby prey for hunting and includes independent rest and bird states',()=>{
    expect(api.behavior('foxes',6,calm).state).toBe('Searching');
    expect(api.behavior('foxes',1,{...calm,preyDistance:2}).state).toBe('Listening');
    expect(api.behavior('foxes',4,{...calm,preyDistance:2}).state).toBe('Stalking');
    expect(api.behavior('foxes',6,{...calm,preyDistance:1}).state).toBe('Pouncing');
    expect(api.behavior('foxes',11,{...calm,preyDistance:1}).state).toBe('Resting');
    expect(api.behavior('bluetits',6,{...calm,preyDistance:0.3}).state).toBe('Pecking');
    expect(api.behavior('bluetits',11,calm).state).toBe('Preening');
    expect(api.behavior('owls',7,calm).state).toBe('Gliding');
    expect(api.behavior('caterpillars',7,{...calm,food:false}).state).toBe('Resting');
  });
  it('reproduces complete paths without modifying the biomass samples',()=>{
    const config={enabled:{caterpillars:true,bluetits:true},event:'remove',target:'foxes'},pair=api.compare(config),before=JSON.stringify(pair);
    const a=api.behaviorTimeline(config,pair.experiment),b=api.behaviorTimeline(config,pair.experiment);
    for(const t of [0,80,120,240])expect(a[t]).toEqual(b[t]);
    expect(JSON.stringify(pair)).toBe(before);
    for(const id of ['rabbits','voles','foxes','owls','bluetits','caterpillars'])expect([a[0][id][0].x,a[0][id][0].z]).toEqual([api.meadowPose(id,0,0,false).x,api.meadowPose(id,0,0,false).z]);
  });
  it('excludes removed organisms from threat and prey decisions at the exact sample',()=>{
    const config={event:'remove',target:'foxes'},pair=api.compare(config),a=api.behaviorTimeline(config,pair.baseline),b=api.behaviorTimeline(config,pair.experiment);
    expect(a.slice(0,80)).toEqual(b.slice(0,80));
    expect(b[80].foxes.every(p=>!p.active&&p.state==='Not present')).toBe(true);
    expect(b.slice(80).every(f=>f.rabbits.every(p=>p.threat!=='foxes'))).toBe(true);
    expect(a[100].rabbits).not.toEqual(b[100].rabbits);
  });
  it('does not hunt missing food or invent an absent representative',()=>{
    const config={enabled:{rabbits:false,voles:false},event:'none'},pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline);
    expect(frames.every(f=>f.foxes.every(p=>!p.prey&&p.state!=='Pouncing'&&p.state!=='Stalking'))).toBe(true);
    expect(frames.every(f=>f.rabbits.every(p=>!p.active)&&f.voles.every(p=>!p.active))).toBe(true);
  });
  it('keeps active movement finite, bounded, and continuous without sliding during stationary states',()=>{
    const config={enabled:{caterpillars:true,bluetits:true},event:'none'},frames=api.behaviorTimeline(config,api.compare(config).baseline),states=new Set();
    frames.forEach((f,t)=>Object.entries(f).forEach(([id,poses])=>poses.forEach((p,i)=>{
      for(const key of ['x','z','yaw','altitude','gait','moving','forage','alarm','distance','pounce','wingFlap','scan'])expect(Number.isFinite(p[key])).toBe(true);
      expect(Math.abs(p.x)).toBeLessThan(11);expect(Math.abs(p.z)).toBeLessThan(8);expect(p.altitude).toBeGreaterThan(0);
      if(p.active)states.add(p.state);
      if(t){const prior=frames[t-1][id][i],travel=Math.hypot(p.x-prior.x,p.z-prior.z);expect(travel).toBeLessThanOrEqual(0.116);if(p.moving===0)expect(travel).toBe(0);}
    })));
    for(const state of ['Alert','Retreating','Resting','Listening','Stalking','Pouncing','Pecking','Preening','Crawling','Feeding','Gliding'])expect(states.has(state),state).toBe(true);
  });
});

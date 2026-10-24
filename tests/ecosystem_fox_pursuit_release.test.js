import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api;
// A disposable candidate can be verified before the source owner integrates it.
const toolSource=process.env.ECOLOGY_BEHAVIOR_CANDIDATE||'stem_lab/stem_tool_ecosystem.js';
beforeEach(()=>{resetStemLab();loadTool(toolSource,'ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const desired={state:'Tracking prey',speed:.42,mode:'toward',forage:0};
function fixture(){return {index:0,active:true,desired:{...desired},prey:{id:'rabbits',index:1,distance:4},
  old:{active:true,state:'Stalking',x:0,z:0,huntStage:'',searchCue:null,prey:'rabbits',preyIndex:0,preyCueSnapshot:{id:'rabbits',index:0,x:2.1,z:.1}},
  previous:{rabbits:[{active:true,state:'Retreating',x:3,z:0,refugeCue:null},{active:true,state:'Grazing',x:4,z:0}]},counts:{foxes:1,rabbits:2}};}
const release=f=>api.foxBreakoff(f.index,f.old,f.prey,f.previous,f.counts,f.desired,f.active);

describe('bounded fox pursuit release',()=>{
  it('requires the selected rabbit and records its actual prior pose at release, rather than the older available-target point',()=>{
    const f=fixture(),before=JSON.stringify(f),a=release(f),b=release(f);
    expect(a).toEqual({action:{state:'Breaking off pursuit',speed:0,mode:'breakoff',forage:0},cue:{id:'rabbits',index:0,x:3,z:0,decisionDistance:3,age:0,duration:10,reason:'running-gap',turnSide:-1,stage:'brake'},cooldown:0});
    expect(a.cue.x).not.toBe(f.old.preyCueSnapshot.x);a.cue.x=999;expect(release(f)).toEqual(b);expect(JSON.stringify(f)).toBe(before);
  });

  it('does not respond to a different fleeing rabbit, a non-pursuit target or an inside-gap target',()=>{
    for(const mutate of [f=>{f.old.prey='voles';},f=>{f.old.preyIndex=1;},f=>{f.old.preyCueSnapshot.index=1;},f=>{f.old.preyCueSnapshot=null;},f=>{f.old.state='Resting';},f=>{f.previous.rabbits[0].state='Grazing';f.previous.rabbits[1].state='Retreating';},f=>{f.previous.rabbits[0].x=2.2;}]){
      const f=fixture();mutate(f);expect(release(f).cue).toBeNull();
    }
  });

  it('holds the release point fixed for at most ten samples while the live rabbit moves, then cools down',()=>{
    const f=fixture();let result=release(f),ages=[];
    for(let step=0;step<10;step++){
      expect(result.cue).toMatchObject({x:3,z:0,duration:10});ages.push(result.cue.age);expect(result.cue.stage).toBe(step<2?'brake':'reorient');expect(result.action.speed).toBe(step<2?0:.18);
      f.old={...f.old,state:'Breaking off pursuit',breakoffCue:result.cue,breakoffCooldown:result.cooldown,prey:null,preyIndex:null,preyCueSnapshot:null};
      f.previous.rabbits[0].x+=.1;result=release(f);
    }
    expect(ages).toEqual([0,1,2,3,4,5,6,7,8,9]);expect(result).toMatchObject({action:f.desired,cue:null,cooldown:14});
    f.old.breakoffCue=null;f.old.breakoffCooldown=14;for(let step=0;step<20;step++){result=release(f);expect(result.cue).toBeNull();f.old.breakoffCooldown=result.cooldown;}
  });

  it('gives live close prey, reacquisition, hunt commitment, shelter checks and rest priority',()=>{
    for(const mutate of [f=>{f.prey={id:'voles',index:0,distance:2.2};},f=>{f.prey={id:'rabbits',index:0,distance:3};},f=>{f.old.huntStage='prepare';},f=>{f.old.huntStage='airborne';},f=>{f.old.huntStage='recover';},f=>{f.old.searchCue={id:'rabbits',index:0};},f=>{f.desired.state='Resting';},f=>{f.desired.state='Pouncing';},f=>{f.desired.state='Recovering';},f=>{f.previous.rabbits[0].refugeCue={stage:'at-cover'};}]){
      const f=fixture();f.old.breakoffCue=release(f).cue;mutate(f);expect(release(f)).toMatchObject({cue:null,cooldown:14});
    }
  });

  it('clears missing animals and rejects malformed or stale recorded release data',()=>{
    const mutations=[f=>{f.active=false;},f=>{f.old.active=false;},f=>{f.old.x=NaN;},f=>{f.counts.foxes=0;},f=>{f.counts.rabbits=0;},f=>{f.counts.rabbits=.5;},f=>{f.previous=null;},f=>{f.previous.rabbits=[];},f=>{f.previous.rabbits[0].active=false;},f=>{f.previous.rabbits[0].x=Infinity;},f=>{f.previous.rabbits[0].state='Alert';},
      f=>{f.old.breakoffCue.id='voles';},f=>{f.old.breakoffCue.index=-1;},f=>{f.old.breakoffCue.x=NaN;},f=>{f.old.breakoffCue.decisionDistance=Infinity;},f=>{f.old.breakoffCue.decisionDistance=2.2;},f=>{f.old.breakoffCue.duration=600;},f=>{f.old.breakoffCue.reason='scent';},f=>{f.old.breakoffCue.age=9;},f=>{f.old.breakoffCue.age=-1;},f=>{f.old.breakoffCue.age=.5;},f=>{f.old.breakoffCue.turnSide=0;}];
    for(const mutate of mutations){const f=fixture();f.old.breakoffCue=release(f).cue;mutate(f);expect(release(f).cue).toBeNull();}
    for(const index of [-1,.5,16]){const f=fixture();f.index=index;expect(release(f).cue).toBeNull();}
  });
});

describe('recorded pursuit release in the supported rabbit community',()=>{
  const config={enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:10,event:'none'};

  it('makes real target releases reciprocal, preserves fixed provenance and resumes normal actions',()=>{
    const rows=api.compare(config).baseline,frames=api.behaviorTimeline(config,rows);let onsets=0,seen=0,resumed=0,outwardSteps=0;
    for(let step=1;step<frames.length;step++)for(let index=0;index<16;index++){
      const p=frames[step].foxes[index],old=frames[step-1].foxes[index],cue=p.breakoffCue;if(old.breakoffCue&&!cue&&p.active)resumed++;if(!cue)continue;seen++;
      expect(p.active).toBe(true);expect(p.state).toBe('Breaking off pursuit');expect(cue.age).toBeLessThan(10);expect(cue.duration).toBe(10);expect(p.prey).toBeNull();expect(p.preyCueSnapshot).toBeNull();expect(p.searchCue).toBeNull();expect(p.huntStage).toBe('');expect(p.attention).toBeNull();
      const source=frames[step-1].rabbits[cue.index];expect(source.active).toBe(true);expect(source.state).toBe('Retreating');expect(frames[step].rabbits[cue.index].active).toBe(true);expect(Math.hypot(source.x-old.x,source.z-old.z)).toBeGreaterThan(2.2);
      if(cue.age===0){onsets++;expect(old.prey).toBe(cue.id);expect(old.preyIndex).toBe(cue.index);expect(old.preyCueSnapshot).toMatchObject({id:cue.id,index:cue.index});expect(cue.x).toBe(source.x);expect(cue.z).toBe(source.z);expect(cue.decisionDistance).toBeCloseTo(Math.hypot(source.x-old.x,source.z-old.z),10);}
      else {expect(cue).toMatchObject({id:old.breakoffCue.id,index:old.breakoffCue.index,x:old.breakoffCue.x,z:old.breakoffCue.z,decisionDistance:old.breakoffCue.decisionDistance});expect(cue.age).toBe(old.breakoffCue.age+1);}
      if(cue.stage==='reorient'){const gain=Math.hypot(p.x-cue.x,p.z-cue.z)-Math.hypot(old.x-cue.x,old.z-cue.z);expect(gain).toBeGreaterThanOrEqual(-1e-11);if(gain>1e-6&&Math.hypot(p.x-old.x,p.z-old.z)>1e-6)outwardSteps++;}
      expect(api.explainBehavior('foxes',p).text).toContain('recorded position');expect(api.explainBehavior('foxes',p).cue).toBeNull();expect(api.interaction(frames[step],'foxes',index)).toBeNull();
      expect(['x','z','yaw','moving','distance','headTurn','earLeft','earRight'].every(key=>Number.isFinite(p[key]))).toBe(true);expect(Math.hypot(p.x-old.x,p.z-old.z)).toBeLessThanOrEqual(.043);if(p.moving===0)expect([p.x,p.z]).toEqual([old.x,old.z]);
    }
    expect(onsets).toBeGreaterThan(0);expect(seen).toBeGreaterThan(onsets);expect(resumed).toBeGreaterThan(0);expect(outwardSteps).toBeGreaterThan(0);
  });

  it('clears ongoing responses at the exact fox or rabbit removal sample',()=>{
    const base=api.compare(config).baseline,original=api.behaviorTimeline(config,base);let at=null;
    for(let step=1;step<original.length&&!at;step++)for(let index=0;index<16;index++)if(original[step].foxes[index].breakoffCue?.age===1){at={step:step+1,index};break;}
    expect(at).not.toBeNull();
    for(const id of ['foxes','rabbits']){
      const rows=structuredClone(base);for(let step=at.step;step<rows.length;step++)rows[step].values[id]=0;
      const frames=api.behaviorTimeline(config,rows);expect(frames[at.step-1].foxes[at.index].breakoffCue).not.toBeNull();expect(frames.slice(at.step).every(frame=>frame.foxes.every(p=>!p.breakoffCue))).toBe(true);
    }
  });

  it('replays every pose exactly without changing sampled populations or adding a food-web link',()=>{
    const pair=api.compare(config),before=JSON.stringify(pair),a=api.behaviorTimeline(config,pair.baseline),b=api.behaviorTimeline(config,pair.baseline);
    expect(a).toEqual(b);expect(JSON.stringify(pair)).toBe(before);expect(api.links.some(link=>link.consumer==='rabbits'&&link.food==='foxes')).toBe(false);
  });
});

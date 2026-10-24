import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const animal=(extra={})=>({active:true,state:'Grazing',x:0,z:0,foodAvailable:true,alarm:0,directAlarm:false,socialCue:null,refugeCue:null,...extra});
const desired={state:'Grazing',speed:0,mode:'roam',forage:.8};
function fixture(){const old=animal();return {index:1,old,previous:{rabbits:[animal({x:.7}),old]},counts:{rabbits:2},food:true,desired:{...desired},active:true};}
const spacing=f=>api.rabbitSpacing(f.index,f.old,f.previous,f.counts,f.food,f.desired,f.active);

describe('local feeding-neighbor spacing',()=>{
  it('uses a real nearby feeding neighbor and detached exact decision provenance',()=>{
    const f=fixture(),before=JSON.stringify(f),a=spacing(f),b=spacing(f);
    expect(a).toEqual({action:{state:'Giving space',speed:.22,mode:'neighbor-space',forage:0},cue:{id:'rabbits',index:0,x:.7,z:0,decisionDistance:.7,age:0,duration:10,side:1},cooldown:0});
    expect(a.cue).not.toBe(b.cue);a.cue.x=999;expect(spacing(f)).toEqual(b);expect(JSON.stringify(f)).toBe(before);
    f.previous.rabbits[0].x=.8;expect(spacing(f).cue).toMatchObject({x:.8,decisionDistance:.8});
  });

  it('uses a stable lower-index neighbor so a pair never yields to itself or responds in both directions',()=>{
    const f=fixture();expect(spacing(f).cue.index).toBe(0);f.index=0;f.old=f.previous.rabbits[0];expect(spacing(f).cue).toBeNull();
    f.index=3;f.old=animal();f.previous.rabbits=[animal({x:.7}),animal({x:-.7}),animal({x:.9}),f.old];f.counts.rabbits=4;
    expect(spacing(f).cue.index).toBe(0);const first=spacing(f).cue;f.old={...f.old,state:'Giving space',spacingCue:first};f.previous.rabbits[1].x=.2;
    expect(spacing(f).cue.index).toBe(0);
    f.previous.rabbits[0].x=1;f.old.spacingCue=null;f.old.state='Grazing';f.previous.rabbits[1].state='Resting';f.previous.rabbits[2].state='Resting';expect(spacing(f).cue.decisionDistance).toBe(1);
    f.previous.rabbits[0].x=1.00001;expect(spacing(f).cue).toBeNull();
    f.previous.rabbits[0].x=0;expect(spacing(f).cue).toMatchObject({index:0,decisionDistance:0});
  });

  it('holds a live source for at most ten samples, then uses a bounded cooldown',()=>{
    const f=fixture();let result=spacing(f),ages=[];
    for(let step=0;step<10;step++){
      expect(result.cue).not.toBeNull();ages.push(result.cue.age);f.old={...f.old,state:'Giving space',spacingCue:result.cue,spacingCooldown:result.cooldown};
      f.previous.rabbits[0].z=step/100;result=spacing(f);
    }
    expect(ages).toEqual([0,1,2,3,4,5,6,7,8,9]);expect(result.cue).toBeNull();expect(result.cooldown).toBe(16);
    f.old={...f.old,state:'Grazing',spacingCue:null,spacingCooldown:16};
    for(let step=0;step<15;step++){result=spacing(f);expect(result.cue).toBeNull();f.old.spacingCooldown=result.cooldown;}
    expect(spacing(f).cue?.age).toBe(0);
    f.old={...f.old,spacingCue:{id:'rabbits',index:0,duration:10,age:1},spacingCooldown:0};f.previous.rabbits[0].x=1.25;f.previous.rabbits[0].z=0;
    expect(spacing(f)).toMatchObject({cue:null,cooldown:16});
  });

  it('prioritizes predator alert, retreat and refuge responses over local spacing',()=>{
    for(const state of ['Alert','Retreating','Resting','Exploring','Searching for food']){const f=fixture();f.desired={...desired,state};expect(spacing(f).cue).toBeNull();}
    for(const mutate of [f=>{f.old.state='Alert';},f=>{f.old.state='Retreating';},f=>{f.old.directAlarm=true;},f=>{f.old.socialCue={id:'rabbits',index:0};},f=>{f.old.refugeCue={index:0};}]){
      const f=fixture();f.old.spacingCue=spacing(f).cue;mutate(f);expect(spacing(f)).toMatchObject({cue:null,cooldown:16});
    }
  });

  it('clears absent or malformed animals, vanished food and a source that stops feeding',()=>{
    const mutations=[f=>{f.active=false;},f=>{f.food=false;},f=>{f.food=1;},f=>{f.old.active=false;},f=>{f.old.x=NaN;},f=>{f.old.z=Infinity;},f=>{f.counts.rabbits=1;},f=>{f.counts.rabbits=NaN;},f=>{f.counts.rabbits=1.5;},f=>{f.counts=null;},f=>{f.previous=null;},f=>{f.previous.rabbits=[];},
      f=>{f.previous.rabbits[0].active=false;},f=>{f.previous.rabbits[0].state='Alert';},f=>{f.previous.rabbits[0].state='Giving space';},f=>{f.previous.rabbits[0].foodAvailable=false;},f=>{f.previous.rabbits[0].x=Infinity;},f=>{f.previous.rabbits[0].refugeCue={index:0};},f=>{f.previous.rabbits[0].socialCue={index:2};},
      f=>{f.old.spacingCue.id='foxes';},f=>{f.old.spacingCue.index=1;},f=>{f.old.spacingCue.index=-1;},f=>{f.old.spacingCue.age=10;},f=>{f.old.spacingCue.age=.5;},f=>{f.old.spacingCue.duration=100;}];
    for(const mutate of mutations){const f=fixture();f.old.spacingCue=spacing(f).cue;mutate(f);expect(spacing(f).cue).toBeNull();}
    for(const index of [-1,.5,16]){const f=fixture();f.index=index;expect(spacing(f).cue).toBeNull();}
  });
});

describe('recorded neighbor response and fieldwork',()=>{
  const config={enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:10,event:'none'};

  it('occurs in the supported community with short outward steps, exact replay and unchanged biomass',()=>{
    const rows=api.compare(config).baseline,before=JSON.stringify(rows),frames=api.behaviorTimeline(config,rows);let seen=0,moving=0,resumed=0;
    for(let step=1;step<frames.length;step++)for(let i=0;i<16;i++){
      const p=frames[step].rabbits[i],old=frames[step-1].rabbits[i],cue=p.spacingCue;if(old.spacingCue&&!cue&&p.active)resumed++;
      if(!cue)continue;seen++;if(p.moving>0)moving++;
      expect(p.state).toBe('Giving space');expect(p.active).toBe(true);expect(p.foodAvailable).toBe(true);expect(p.directAlarm).toBe(false);expect(p.refugeCue).toBeNull();expect(p.socialCue).toBeNull();
      expect(cue.index).toBeLessThan(i);expect(cue.age).toBeLessThan(10);expect(cue.duration).toBe(10);expect(p.moving).toBeLessThanOrEqual(.22000000001);
      const source=frames[step-1].rabbits[cue.index];expect(source.active).toBe(true);expect(source.state).toBe('Grazing');expect(source.foodAvailable).toBe(true);
      expect(cue.x).toBe(source.x);expect(cue.z).toBe(source.z);expect(cue.decisionDistance).toBeCloseTo(Math.hypot(source.x-old.x,source.z-old.z),10);
      expect(Math.hypot(p.x-cue.x,p.z-cue.z)).toBeGreaterThanOrEqual(cue.decisionDistance-1e-11);
      expect(p.spacing).toBe('rabbits');expect(p.spacingIndex).toBe(cue.index);expect(p.spacingDistance).toBe(cue.decisionDistance);
      if(p.attention){expect(p.attention).toMatchObject({kind:'spacing',id:'rabbits',index:cue.index,x:cue.x,z:cue.z});expect(Math.abs(p.attention.turn)).toBeLessThanOrEqual(.24000000001);}
      expect(Math.abs(p.headTurn-old.headTurn)).toBeLessThanOrEqual(.09000000001);
      if(cue.age===0)expect(cue.decisionDistance).toBeLessThanOrEqual(1);else {expect(old.spacingCue.index).toBe(cue.index);expect(cue.age).toBe(old.spacingCue.age+1);}
    }
    expect(seen).toBeGreaterThan(10);expect(moving).toBeGreaterThan(0);expect(resumed).toBeGreaterThan(0);expect(api.behaviorTimeline(config,rows)).toEqual(frames);expect(JSON.stringify(rows)).toBe(before);
  });

  it('indexes a sustained distinct rabbit pair with a real grazing neighbor, rather than a dietary link',()=>{
    const frames=api.behaviorTimeline(config,api.compare(config).baseline),before=JSON.stringify(frames),e=api.encounters(frames,config).find(e=>e.kind==='spacing');
    expect(e).toBeTruthy();expect(e.actor.id).toBe('rabbits');expect(e.cue.id).toBe('rabbits');expect(e.actor.index).toBeGreaterThan(e.cue.index);expect(e.end-e.start).toBeGreaterThanOrEqual(2);expect(e.expected).toBe('avoid');
    for(let step=e.start;step<=e.end;step++){
      const p=frames[step].rabbits[e.actor.index],pair=api.interaction(frames[step],'rabbits',e.actor.index);
      expect(p.state).toBe('Giving space');expect(pair.id).toBe('rabbits');expect(pair.index).toBe(e.cue.index);expect(pair.other.state).toBe('Grazing');expect(pair.other.active).toBe(true);expect(api.explainBehavior('rabbits',p).cue).toMatchObject({id:'rabbits',index:e.cue.index});
    }
    expect(api.links.some(link=>link.consumer==='rabbits'&&link.food==='rabbits')).toBe(false);expect(JSON.stringify(frames)).toBe(before);
  });

  it('stops immediately when plant food or rabbits are removed, and clears the live cue metadata',()=>{
    const rows=api.compare(config).baseline,original=api.behaviorTimeline(config,rows);let at=null;
    for(let step=1;step<original.length&&!at;step++)for(let i=0;i<16;i++)if(original[step].rabbits[i].spacingCue?.age===1){at={step:step+1,index:i};break;}
    expect(at).not.toBeNull();
    for(const remove of ['plants','rabbits']){
      const changed=structuredClone(rows);for(let step=at.step;step<changed.length;step++)changed[step].values[remove]=0;
      const frames=api.behaviorTimeline(config,changed);expect(frames[at.step-1].rabbits[at.index].spacingCue).not.toBeNull();
      expect(frames.slice(at.step).every(frame=>frame.rabbits.every(p=>!p.spacingCue&&p.spacing===null&&p.spacingIndex===null&&p.spacingDistance===null))).toBe(true);
    }
  });
});

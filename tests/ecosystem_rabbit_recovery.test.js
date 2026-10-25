import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const toolSource=process.env.ECOLOGY_RECOVERY_CANDIDATE||'stem_lab/stem_tool_ecosystem.js';
beforeEach(()=>{resetStemLab();loadTool(toolSource,'ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const quiet={state:'Grazing',speed:0,mode:'roam',forage:.8};
function fixture(){return {index:0,old:{active:true,state:'Retreating',x:0,z:0,speed:1.15,lastDirectThreat:{id:'foxes',index:0,x:1,z:.2,step:6}},threat:{id:'foxes',index:0},previous:{foxes:[{active:true,x:5,z:0}],owls:[{active:true,x:6,z:0}]},counts:{rabbits:1,foxes:1,owls:1},desired:{...quiet},active:true,options:{step:10,directAlarm:false,refuge:false,social:false}};}
const recover=f=>api.rabbitRecovery(f.index,f.old,f.threat,f.previous,f.counts,f.desired,f.active,f.options);

describe('direct-retreat recovery provenance and priorities',()=>{
  it('records only an actual prior predator during direct retreat and keeps that point fixed while retreat continues',()=>{
    const f=fixture();f.desired={state:'Retreating',speed:1.15,mode:'away',forage:0};f.options.directAlarm=true;
    const a=recover(f);expect(a.cue).toBeNull();expect(a.memory).toEqual({id:'foxes',index:0,x:5,z:0,step:10});
    f.old.lastDirectThreat=a.memory;f.options={...f.options,step:11,directAlarm:false};f.previous.foxes[0].x=8;
    expect(recover(f).memory).toEqual(a.memory);
    const saved=JSON.stringify(f),b=recover(f);b.memory.x=999;expect(JSON.stringify(f)).toBe(saved);expect(recover(f).memory.x).toBe(5);
  });

  it('fills only a direct retreat-to-grazing/exploration transition, without stacking onto fading Alert or social/refuge responses',()=>{
    const f=fixture(),a=recover(f);expect(a.cue).toMatchObject({id:'foxes',index:0,x:1,z:.2,sourceStep:6,startStep:10,age:0,duration:12,stillDuration:4,stage:'brake',brakeAge:0,stillAge:null});expect(a.memory).toBeNull();
    f.desired={...quiet,state:'Exploring',speed:.3};expect(recover(f).cue).not.toBeNull();
    for(const state of ['Alert','Resting','Searching for food']){const g=fixture();g.desired={...quiet,state};expect(recover(g)).toMatchObject({action:g.desired,cue:null,memory:null});}
    f.old.state='Alert';expect(recover(f).cue).toBeNull();f.old.state='Grazing';expect(recover(f).cue).toBeNull();
    for(const mutate of [f=>{f.options.social=true;},f=>{f.options.refuge=true;},f=>{f.old.socialMemory=true;},f=>{f.old.socialCue={id:'rabbits',index:1};},f=>{f.old.refugeCue={index:0};}]){const g=fixture();mutate(g);expect(recover(g)).toMatchObject({cue:null,memory:null});}
  });

  it('uses ordinary bounded braking before exactly four still samples, then consumes the opportunity',()=>{
    const f=fixture(),speeds=[1.15,1,.85,.7,.55,.4,.25,.1,0,0,0],ages=[],still=[];let cue;
    for(let k=0;k<speeds.length;k++){
      f.old.speed=speeds[k];f.options.step=10+k;const result=recover(f);cue=result.cue;expect(cue).not.toBeNull();ages.push(cue.age);expect(cue).toMatchObject({x:1,z:.2,sourceStep:6,startStep:10,duration:12});
      if(k<7){expect(cue.stage).toBe('brake');expect(cue.brakeAge).toBe(k);expect(cue.stillAge).toBeNull();}else{expect(cue.stage).toBe('still');still.push(cue.stillAge);expect(cue.brakeAge).toBeNull();}
      f.old={...f.old,state:'Checking after retreat',lastDirectThreat:result.memory,recoveryCue:cue};f.previous.foxes[0].x=10+k;
    }
    expect(ages).toEqual([0,1,2,3,4,5,6,7,8,9,10]);expect(still).toEqual([0,1,2,3]);f.options.step=21;expect(recover(f)).toMatchObject({action:f.desired,cue:null,memory:null});
    f.old.recoveryCue=null;for(let step=22;step<35;step++){f.options.step=step;expect(recover(f).cue).toBeNull();}
  });

  it('cancels immediately for renewed alarm, absence, invalid data and predators without a rabbit food-web link',()=>{
    const changes=[f=>{f.active=false;},f=>{f.old.active=false;},f=>{f.counts.rabbits=0;},f=>{f.counts.foxes=0;},f=>{f.previous.foxes[0].active=false;},f=>{f.previous.foxes=[];},f=>{f.previous.foxes[0].x=NaN;},f=>{f.previous=null;},f=>{f.old.speed=1.16;},f=>{f.old.speed=-1;},f=>{f.old.speed=Infinity;},f=>{f.old.lastDirectThreat.id='owls';},f=>{f.old.lastDirectThreat.id='rabbits';},f=>{f.old.lastDirectThreat.index=1;},f=>{f.old.lastDirectThreat.x=Infinity;},f=>{f.options.step=0;}];
    for(const mutate of changes){const f=fixture();mutate(f);expect(recover(f).cue).toBeNull();}
    for(const state of ['Alert','Retreating']){const f=fixture(),cue=recover(f).cue;f.old={...f.old,state:'Checking after retreat',recoveryCue:cue,lastDirectThreat:null};f.options.step++;f.desired={...quiet,state};expect(recover(f).cue).toBeNull();}
    const f=fixture();f.options.directAlarm=true;f.desired={state:'Retreating'};f.threat={id:'owls',index:0};expect(recover(f).memory).toBeNull();
  });

  it('expires old direct snapshots and rejects inconsistent bounded-stage metadata',()=>{
    const f=fixture();f.options.step=31;expect(recover(f).cue).toBeNull();f.desired={state:'Retreating'};expect(recover(f).memory).toBeNull();f.options.step=30;expect(recover(f).memory).not.toBeNull();
    const changes=[c=>{c.age=11;},c=>{c.age=.5;},c=>{c.startStep--;},c=>{c.sourceStep=11;},c=>{c.duration=100;},c=>{c.stillDuration=50;},c=>{c.stage='follow';},c=>{c.brakeAge=8;},c=>{c.stillAge=0;},c=>{c.x=NaN;}];
    for(const mutate of changes){const g=fixture(),cue=recover(g).cue;mutate(cue);g.old={...g.old,state:'Checking after retreat',recoveryCue:cue,lastDirectThreat:null};g.options.step++;expect(recover(g).cue).toBeNull();}
  });
});

// Each case replays the whole scene; Windows CI under the full verify load took over 5 s.
describe('recorded cautious resumption after direct retreat',()=>{
  const config={enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:10,event:'none'};

  it('occurs in the supported scene with true direct-threat provenance, braking and a bounded still scan',()=>{
    const rows=api.compare(config).baseline,frames=api.behaviorTimeline(config,rows);let onsets=0,brakes=0,stills=0,completed=0;
    for(let step=1;step<frames.length;step++)for(let index=0;index<16;index++){
      const p=frames[step].rabbits[index],old=frames[step-1].rabbits[index],cue=p.recoveryCue;
      if(old.recoveryCue?.stillAge===3&&!cue&&p.active)completed++;
      if(!cue)continue;expect(p.active).toBe(true);expect(p.state).toBe('Checking after retreat');expect(p.directAlarm).toBe(false);expect(p.refugeCue).toBeNull();expect(p.socialCue).toBeNull();expect(p.lastDirectThreat).toBeNull();expect(p.attention).toBeNull();expect(cue.age).toBeLessThan(12);
      const direct=frames[cue.sourceStep].rabbits[index],source=frames[cue.sourceStep-1][cue.id][cue.index];expect(direct.directAlarm).toBe(true);expect(direct.state).toBe('Retreating');expect(source.active).toBe(true);expect([cue.x,cue.z]).toEqual([source.x,source.z]);expect(api.links.some(link=>link.food==='rabbits'&&link.consumer===cue.id)).toBe(true);
      if(cue.age===0){onsets++;expect(old.state).toBe('Retreating');expect(old.lastDirectThreat).toMatchObject({id:cue.id,index:cue.index,x:cue.x,z:cue.z,step:cue.sourceStep});}else {expect(cue).toMatchObject({id:old.recoveryCue.id,index:old.recoveryCue.index,x:old.recoveryCue.x,z:old.recoveryCue.z,sourceStep:old.recoveryCue.sourceStep});expect(cue.age).toBe(old.recoveryCue.age+1);}
      if(cue.stage==='brake'){brakes++;expect(p.speed).toBeCloseTo(Math.max(0,old.speed-.15),10);expect(cue.stillAge).toBeNull();}
      else {stills++;expect(cue.stage).toBe('still');expect(cue.stillAge).toBeLessThan(4);expect(p.speed).toBe(0);expect(p.moving).toBe(0);expect([p.x,p.z,p.yaw]).toEqual([old.x,old.z,old.yaw]);}
      expect(Math.abs(p.headTurn-old.headTurn)).toBeLessThanOrEqual(.09000000001);expect(Math.abs(p.earLeft-old.earLeft)).toBeLessThanOrEqual(.06500000001);expect(Math.hypot(p.x-old.x,p.z-old.z)).toBeLessThanOrEqual(.116);
      expect(api.explainBehavior('rabbits',p).cue).toBeNull();expect(api.explainBehavior('rabbits',p).text).toContain('fixed, previously recorded');expect(api.interaction(frames[step],'rabbits',index)).toBeNull();expect(api.ethogramCategory(p.state)).toBe('attending');
    }
    expect(onsets).toBeGreaterThan(0);expect(brakes).toBeGreaterThan(0);expect(stills).toBeGreaterThan(0);expect(completed).toBeGreaterThan(0);
  },15000);

  it('clears original predator or rabbit removal at the exact sample, without leaving a remembered target',()=>{
    const base=api.compare(config).baseline,original=api.behaviorTimeline(config,base);let at=null;
    for(let step=1;step<original.length&&!at;step++)for(let index=0;index<16;index++)if(original[step].rabbits[index].recoveryCue?.age===1){at={step:step+1,index};break;}
    expect(at).not.toBeNull();
    for(const id of ['foxes','rabbits']){const rows=structuredClone(base);for(let step=at.step;step<rows.length;step++)rows[step].values[id]=0;const frames=api.behaviorTimeline(config,rows);expect(frames[at.step-1].rabbits[at.index].recoveryCue).not.toBeNull();expect(frames.slice(at.step).every(frame=>frame.rabbits.every(p=>!p.recoveryCue&&!p.lastDirectThreat))).toBe(true);}
  },15000);

  it('keeps exact replay and sampled populations unchanged',()=>{
    const pair=api.compare(config),before=JSON.stringify(pair),a=api.behaviorTimeline(config,pair.baseline),b=api.behaviorTimeline(config,pair.baseline);expect(a).toEqual(b);expect(JSON.stringify(pair)).toBe(before);
  },15000);
});

import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const movingPrey=(extra={})=>({active:true,x:2,z:0,moving:.3,...extra});
const fox=(extra={})=>({active:true,x:0,z:0,listenAge:0,listenCooldown:0,listenCue:null,...extra});
const stalk={state:'Stalking',speed:.2,mode:'toward',forage:.25};
function fixture(){return {old:fox(),prey:{id:'rabbits',index:0,x:2,z:0,distance:2},previous:{rabbits:[movingPrey()],voles:[movingPrey({x:3,moving:.24})],foxes:[fox()]},counts:{rabbits:1,voles:1,foxes:1}};}
const listen=(f,desired=stalk,active=true,index=0)=>api.foxListening(index,f.old,f.prey,f.previous,f.counts,desired,active);
const config={event:'none',enabled:{owls:false},initial:{rabbits:90,foxes:6},cover:10};

describe('fox listening prompted by actual prey movement',()=>{
  it('starts from live recorded movement, keeps detached evidence and leaves inputs unchanged',()=>{
    const f=fixture(),saved=JSON.stringify(f),a=listen(f),b=listen(f);
    expect(a).toEqual({action:{state:'Listening',speed:0,mode:'toward',forage:0},age:0,cooldown:0,cue:{id:'rabbits',index:0,distance:2,movement:.3,onsetMovement:.3,age:0}});
    expect(a).toEqual(b);expect(a.cue).not.toBe(b.cue);expect(a.action).not.toBe(b.action);
    a.cue.index=99;a.action.state='changed';expect(JSON.stringify(f)).toBe(saved);
    f.prey={id:'voles',index:0};expect(listen(f).cue).toMatchObject({id:'voles',index:0,movement:.24,onsetMovement:.24,distance:3});
  });

  it('requires a current live diet-linked individual and finite local movement',()=>{
    const changes=[
      f=>{f.prey=null;},f=>{f.prey.id='bluetits';},f=>{f.prey.index=-1;},f=>{f.prey.index=.5;},f=>{f.prey.index=1;},
      f=>{f.previous.rabbits[0].active=false;},f=>{f.previous.rabbits[0].x=NaN;},f=>{f.previous.rabbits[0].z=Infinity;},f=>{f.previous.rabbits[0].moving='0.3';},f=>{f.previous.rabbits[0].moving=NaN;},f=>{f.previous.rabbits[0].moving=-.1;},f=>{f.previous.rabbits[0].moving=.11999;},
      f=>{f.previous.rabbits[0].x=4.50001;},f=>{f.previous.rabbits=[];},f=>{delete f.previous.rabbits;},f=>{f.previous=null;},
      f=>{f.counts.rabbits=0;},f=>{f.counts.rabbits=.5;},f=>{f.counts.foxes=0;},f=>{f.counts=null;},f=>{f.old.x=NaN;}
    ];
    for(const change of changes){const f=fixture();change(f);expect(listen(f).cue).toBeNull();expect(listen(f).action).toBe(stalk);}
    const f=fixture();f.previous.rabbits[0].x=4.5;f.previous.rabbits[0].moving=.12;expect(listen(f).cue).toMatchObject({distance:4.5,movement:.12});
    for(const index of [-1,.5,1,NaN])expect(listen(f,stalk,true,index).cue).toBeNull();
  });

  it('holds only eight samples, preserves onset movement and then resumes with cooldown',()=>{
    const f=fixture();let p=listen(f);expect(p.age).toBe(0);
    for(let age=1;age<=7;age++){
      f.old={...f.old,listenAge:p.age,listenCooldown:p.cooldown,listenCue:p.cue};
      f.previous.rabbits[0].moving=0;p=listen(f);
      expect(p).toMatchObject({age,action:{state:'Listening'},cue:{movement:0,onsetMovement:.3,age}});
    }
    f.old={...f.old,listenAge:p.age,listenCooldown:p.cooldown,listenCue:p.cue};
    const ended=listen(f);expect(ended).toEqual({action:stalk,age:0,cooldown:24,cue:null});
    f.previous.rabbits[0].moving=.3;f.old={...f.old,listenAge:0,listenCue:null,listenCooldown:24};
    for(let n=23;n>=1;n--){const next=listen(f);expect(next.cue).toBeNull();expect(next.cooldown).toBe(n);f.old.listenCooldown=next.cooldown;}
    expect(listen(f).cue).toMatchObject({age:0,onsetMovement:.3});
  });

  it('clears on target change/removal and gives hunt/rest/absence priority',()=>{
    const f=fixture(),began=listen(f);f.old={...f.old,listenCue:began.cue,listenAge:began.age};
    const saved=JSON.stringify(f);
    for(const state of ['Preparing to pounce','Pouncing','Recovering','Resting','Searching','Not present']){
      const desired={...stalk,state},r=listen(f,desired);expect(r).toMatchObject({action:desired,cue:null,cooldown:24});
    }
    expect(JSON.stringify(f)).toBe(saved);
    f.prey={id:'voles',index:0};expect(listen(f)).toMatchObject({cue:null,cooldown:24});
    f.prey={id:'rabbits',index:0};f.counts.rabbits=0;expect(listen(f)).toMatchObject({cue:null,cooldown:24});
    expect(listen(f,stalk,false)).toEqual({action:stalk,age:0,cooldown:0,cue:null});
  });
});

describe('listening in recorded encounters and learning evidence',()=>{
  it('records exact prior positions/movement, stays bounded, and replays without population changes',()=>{
    const pair=api.compare(config),saved=JSON.stringify(pair),frames=api.behaviorTimeline(config,pair.baseline);let count=0,starts=0,ends=0;
    for(let step=1;step<frames.length;step++)for(let index=0;index<16;index++){
      const p=frames[step].foxes[index],cue=p.listenCue,old=frames[step-1].foxes[index];
      if(old.listenCue&&!cue)ends++;
      if(!cue)continue;
      count++;expect(p.active).toBe(true);expect(p.state).toBe('Listening');expect(p.huntStage).toBe('');expect(p.listenAge).toBe(cue.age);expect(cue.age).toBeGreaterThanOrEqual(0);expect(cue.age).toBeLessThan(8);
      const source=frames[step-1][cue.id][cue.index];expect(source.active).toBe(true);expect(frames[step][cue.id][cue.index].active).toBe(true);
      expect(cue.distance).toBeCloseTo(Math.hypot(source.x-old.x,source.z-old.z),12);expect(cue.distance).toBeLessThanOrEqual(4.5);expect(cue.movement).toBe(source.moving);
      expect(cue.id).toBe(p.prey);expect(cue.index).toBe(p.preyIndex);expect(p.attention).toMatchObject({kind:'prey',id:cue.id,index:cue.index});
      if(cue.age===0){starts++;expect(cue.onsetMovement).toBe(source.moving);expect(source.moving).toBeGreaterThanOrEqual(.12);expect(api.explainBehavior('foxes',p).text).toContain('began');}
      else{expect(cue.age).toBe(old.listenAge+1);expect(cue.onsetMovement).toBe(old.listenCue.onsetMovement);}
      expect(api.explainBehavior('foxes',p).text).toContain('sound');expect(api.explainBehavior('foxes',p).cue).toMatchObject({id:cue.id,index:cue.index});
    }
    expect(count).toBeGreaterThan(0);expect(starts).toBeGreaterThan(0);expect(ends).toBeGreaterThan(0);expect(frames).toEqual(api.behaviorTimeline(config,pair.baseline));expect(JSON.stringify(pair)).toBe(saved);
  });

  it('does not invent movement cues with absent or removed prey',()=>{
    const absent={...config,enabled:{rabbits:false,voles:false,owls:false}},none=api.behaviorTimeline(absent,api.compare(absent).baseline);
    expect(none.every(f=>f.foxes.every(p=>!p.listenCue))).toBe(true);
    const removed={...config,enabled:{voles:false,owls:false},event:'remove',target:'rabbits',eventStep:10},frames=api.behaviorTimeline(removed,api.compare(removed).experiment);
    expect(frames.slice(10).every(f=>f.foxes.every(p=>!p.listenCue))).toBe(true);
  });

  it('finds a sustained listening encounter only when its exact movement cue is recorded',()=>{
    const frames=api.behaviorTimeline(config,api.compare(config).baseline),saved=JSON.stringify(frames),e=api.encounters(frames,config).find(e=>e.kind==='listening');
    expect(e).toBeDefined();expect(e.title).toBe('Fox listening encounter');expect(e.expected).toBe('approach');expect(e.end-e.start).toBeGreaterThanOrEqual(2);
    for(let step=e.start;step<=e.end;step++){
      const p=frames[step].foxes[e.actor.index];expect(p.state).toBe('Listening');expect(p.listenCue).toMatchObject({id:e.cue.id,index:e.cue.index});expect(api.interaction(frames[step],'foxes',e.actor.index)).toMatchObject({id:e.cue.id,index:e.cue.index});
    }
    expect(JSON.stringify(frames)).toBe(saved);
    const forged=JSON.parse(JSON.stringify(frames));for(const frame of forged)for(const p of frame.foxes)p.listenCue=null;
    expect(api.encounters(forged,config).some(e=>e.kind==='listening')).toBe(false);
  });

  it('roundtrips listening sightings and rejects mismatched actor/state/food identities',()=>{
    const pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),e=api.encounters(frames,config).find(e=>e.kind==='listening');expect(e).toBeDefined();
    const p=frames[e.step].foxes[e.actor.index],sighting={version:1,kind:'listening',branch:'baseline',actorIndex:e.actor.index,cueId:e.cue.id,cueIndex:e.cue.index,state:p.state,decisionDistance:p.listenCue.distance,before:{step:e.before,state:frames[e.before].foxes[e.actor.index].state},after:{step:e.after,state:frames[e.after].foxes[e.actor.index].state},forecast:'approach',limitation:e.limitation};
    const note=api.capture(config,pair,e.step,'foxes','Pause and listen near moving prey','The prey moved before the fox paused.',1,null,sighting);
    expect(note.sighting).toEqual(sighting);expect(api.notebook(JSON.parse(JSON.stringify([note])))).toEqual([note]);expect(api.notebookText([note])).toContain('The prey moved before the fox paused.');
    for(const changed of [{state:'Stalking'},{cueId:'foxes'},{cueId:'bluetits'}])expect(api.notebook([{...note,sighting:{...sighting,...changed}}])[0]).not.toHaveProperty('sighting');
    expect(api.notebook([{...note,focus:'rabbits'}])[0]).not.toHaveProperty('sighting');
  });
});

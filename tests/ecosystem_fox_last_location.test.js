import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const desired={state:'Searching',speed:.3,mode:'roam',forage:0};
function fixture(){
  return {index:0,active:true,cover:10,desired:{...desired},prey:null,
    old:{active:true,x:-3,z:2.5,huntStage:'',prey:'rabbits',preyIndex:0,preyCueSnapshot:{id:'rabbits',index:0,x:-5.5,z:2.4}},
    previous:{rabbits:[{active:true,state:'Alert',x:-6,z:2.5,refugeCue:{id:'refuge',index:0,x:-6,z:2.5,stage:'at-cover'}}]},counts:{foxes:1,rabbits:1}};
}
const search=f=>api.foxSearch(f.index,f.old,f.prey,f.previous,f.counts,f.cover,f.desired,f.active);

describe('bounded checks of a previously recorded prey location',()=>{
  it('starts only on actual concealment of the earlier available target and retains that earlier position',()=>{
    const f=fixture(),before=JSON.stringify(f),a=search(f),b=search(f);
    expect(a.cue).toEqual({id:'rabbits',index:0,x:-5.5,z:2.4,age:0,duration:10,refugeIndex:0,stage:'check'});
    expect(a.action).toEqual({state:'Checking last location',speed:0,mode:'last-location',forage:0});
    expect(a.cue.x).not.toBe(f.previous.rabbits[0].x);a.cue.x=999;expect(search(f)).toEqual(b);expect(JSON.stringify(f)).toBe(before);
    for(const mutate of [f=>{f.old.preyCueSnapshot=null;},f=>{f.old.prey=null;},f=>{f.old.preyIndex=1;},f=>{f.old.preyCueSnapshot.id='voles';},f=>{f.old.preyCueSnapshot.x=NaN;},f=>{f.previous.rabbits[0].refugeCue=null;},f=>{f.previous.rabbits[0].refugeCue.stage='approaching';},f=>{f.previous.rabbits[0].state='Retreating';}]){
      const changed=fixture();mutate(changed);expect(search(changed)).toEqual({action:changed.desired,cue:null});
    }
  });

  it('checks a fixed point for at most ten samples without following concealed movement or restarting from stale data',()=>{
    const f=fixture(),ages=[];let result=search(f);
    for(let step=0;step<10;step++){
      expect(result.cue).toMatchObject({x:-5.5,z:2.4,duration:10});ages.push(result.cue.age);
      expect(result.cue.stage).toBe(step<2?'check':'approach');expect(result.action.speed).toBe(step<2?0:.18);
      f.old={...f.old,searchCue:result.cue,prey:null,preyIndex:null,preyCueSnapshot:null};
      f.previous.rabbits[0].x=-6+(step%2)*.2;
      result=search(f);
    }
    expect(ages).toEqual([0,1,2,3,4,5,6,7,8,9]);expect(result.cue).toBeNull();expect(result.action).toBe(f.desired);
    f.old.searchCue=null;for(let step=0;step<15;step++)expect(search(f).cue).toBeNull();
  });

  it('slows near the remembered point and prioritizes current close prey, reacquisition and committed hunting',()=>{
    const f=fixture();f.old.x=-4.7;f.old.preyCueSnapshot.x=-5.3;const result=search(f);expect(result.cue.stage).toBe('check');expect(result.action.speed).toBe(0);
    f.prey={id:'voles',index:0,distance:1.1};expect(search(f).cue).toBeNull();
    f.prey={id:'rabbits',index:0,distance:3};expect(search(f).cue).toBeNull();
    f.prey=null;for(const huntStage of ['prepare','airborne','recover']){f.old.huntStage=huntStage;expect(search(f).cue).toBeNull();}
    f.old.huntStage='';for(const state of ['Preparing to pounce','Pouncing','Recovering']){f.desired={...desired,state};expect(search(f).cue).toBeNull();}
  });

  it('clears immediately for vanished patches, removed animals, invalid memory and changed refuge identity',()=>{
    const changes=[f=>{f.active=false;},f=>{f.old.active=false;},f=>{f.old.x=Infinity;},f=>{f.counts.foxes=0;},f=>{f.counts.rabbits=0;},f=>{f.counts.rabbits=.5;},f=>{f.previous.rabbits[0].active=false;},f=>{f.previous.rabbits[0].z=NaN;},f=>{f.previous.rabbits=[];},f=>{f.previous=null;},f=>{f.cover=0;},f=>{f.cover=NaN;},f=>{f.old.searchCue.age=9;},f=>{f.old.searchCue.age=-1;},f=>{f.old.searchCue.age=.5;},f=>{f.old.searchCue.duration=100;},f=>{f.old.searchCue.index=1;},f=>{f.old.searchCue.refugeIndex=1;},f=>{f.old.searchCue.x=Infinity;}];
    for(const mutate of changes){const f=fixture();f.old.searchCue=search(f).cue;mutate(f);expect(search(f).cue).toBeNull();}
    for(const index of [-1,.5,16]){const f=fixture();f.index=index;expect(search(f).cue).toBeNull();}
  });
});

describe('recorded fox search after losing a rabbit at cover',()=>{
  const config={enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:80,event:'none'};

  it('occurs in the supported community with real earlier target provenance, finite duration and exact replay',()=>{
    const rows=api.compare(config).baseline,before=JSON.stringify(rows),frames=api.behaviorTimeline(config,rows);let onsets=0,checks=0,resumed=0;
    for(let step=1;step<frames.length;step++)for(let i=0;i<16;i++){
      const p=frames[step].foxes[i],old=frames[step-1].foxes[i],cue=p.searchCue;
      if(old.searchCue&&!cue&&p.active)resumed++;
      if(!cue)continue;checks++;
      expect(p.active).toBe(true);expect(p.state).toBe('Checking last location');expect(p.prey).toBeNull();expect(p.preyCueSnapshot).toBeNull();
      expect(cue.age).toBeLessThan(10);expect(cue.duration).toBe(10);expect(rows[step].cover).toBeGreaterThan(cue.refugeIndex*10);
      if(cue.age<2){expect(cue.stage).toBe('check');expect(p.speed).toBe(0);expect(p.moving).toBe(0);expect(p.x).toBe(old.x);expect(p.z).toBe(old.z);}
      if(cue.age===2){expect(cue.stage).toBe('approach');expect(p.moving).toBeGreaterThan(0);}
      expect(api.explainBehavior('foxes',p).text).toContain('previously recorded location');expect(api.explainBehavior('foxes',p).cue).toBeNull();expect(api.interaction(frames[step],'foxes',i)).toBeNull();expect(p.attention).toBeNull();
      expect(Math.abs(p.headTurn-old.headTurn)).toBeLessThanOrEqual(.09000000001);expect(Math.abs(p.earLeft-old.earLeft)).toBeLessThanOrEqual(.06500000001);
      const hidden=frames[step-1].rabbits[cue.index];expect(api.refugeConceals('rabbits',cue.index,hidden,old,rows[step].cover)).toBe(true);
      if(cue.age===0){onsets++;expect(old.prey).toBe(cue.id);expect(old.preyIndex).toBe(cue.index);expect(old.preyCueSnapshot).toMatchObject({id:cue.id,index:cue.index,x:cue.x,z:cue.z});}
      else {expect(old.searchCue).toMatchObject({id:cue.id,index:cue.index,x:cue.x,z:cue.z,refugeIndex:cue.refugeIndex});expect(cue.age).toBe(old.searchCue.age+1);}
    }
    expect(onsets).toBeGreaterThan(0);expect(checks).toBeGreaterThan(onsets);expect(resumed).toBeGreaterThan(0);expect(api.behaviorTimeline(config,rows)).toEqual(frames);expect(JSON.stringify(rows)).toBe(before);
  });

  it('clears ongoing search on the exact removal or clearing sample',()=>{
    const base=api.compare(config).baseline,original=api.behaviorTimeline(config,base);
    let sample=null;for(let step=1;step<original.length&&!sample;step++)for(let i=0;i<16;i++)if(original[step].foxes[i].searchCue?.age===1){sample={step:step+1,index:i};break;}
    expect(sample).not.toBeNull();
    for(const remove of ['foxes','rabbits','cover']){
      const rows=structuredClone(base);for(let step=sample.step;step<rows.length;step++){if(remove==='cover')rows[step].cover=0;else rows[step].values[remove]=0;}
      const frames=api.behaviorTimeline(config,rows);expect(frames[sample.step-1].foxes[sample.index].searchCue).not.toBeNull();
      expect(frames.slice(sample.step).every(frame=>frame.foxes.every(p=>!p.searchCue))).toBe(true);
    }
  });
});

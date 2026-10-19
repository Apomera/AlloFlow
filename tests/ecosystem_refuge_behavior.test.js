import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const animal=(extra={})=>({active:true,x:-5,z:2.5,...extra});
function fixture(){return {origin:animal(),threat:{id:'foxes',index:0},previous:{foxes:[animal({x:-2})],owls:[]},counts:{rabbits:1,foxes:1,owls:0},cover:10};}
const target=(f,index=0,id='rabbits')=>api.refugeTarget(id,index,f.origin,f.threat,f.previous,f.counts,f.cover);
function concealedFixture(){
  const f=fixture();f.origin=animal({x:-5.8});
  const cue=target(f),rabbit=animal({x:-5.8,state:'Alert',refugeCue:cue}),fox=animal({x:-3});
  return {rabbit,fox,cover:f.cover};
}
const hides=f=>api.refugeConceals('rabbits',0,f.rabbit,f.fox,f.cover);

describe('exact local refuge decisions',()=>{
  it('records a detached indexed destination and the actual live predator that supplied the decision',()=>{
    const f=fixture(),before=JSON.stringify(f),a=target(f),b=target(f);
    expect(a).toEqual({id:'refuge',index:0,x:-6,z:2.5,decisionDistance:1,distance:1,stage:'approaching',threatId:'foxes',threatIndex:0,threatDistance:3});
    expect(a).not.toBe(b);a.x=999;expect(target(f)).toEqual(b);expect(JSON.stringify(f)).toBe(before);
    f.previous.owls=[animal({x:-2})];f.counts.owls=1;f.threat={id:'owls',index:0};
    expect(target(f)).toMatchObject({index:0,threatId:'owls',threatIndex:0});
  });

  it('uses a bounded reachable destination away from the predator, with a small inside-cover exception',()=>{
    const f=fixture();f.origin.x=-.5;expect(target(f)).toBeNull();
    f.origin.x=-.5001;f.previous.foxes[0].x=1;expect(target(f)?.distance).toBeCloseTo(5.4999,10);
    f.origin.x=-5;f.previous.foxes[0].x=-8;expect(target(f)).toBeNull();
    f.origin.x=-5.8;expect(target(f)).toMatchObject({index:0,stage:'at-cover'});
    f.previous.foxes[0].x=-6.7;expect(target(f)).toMatchObject({index:0,stage:'approaching'});
  });

  it('keeps an eligible recorded destination instead of switching to a newly closer thicket',()=>{
    const f=fixture(),prior=target(f);f.cover=80;f.origin=animal({x:-4.7,z:3.4,refugeCue:prior});f.previous.foxes[0]=animal({x:-4.7,z:6.4});
    const kept=target(f);expect(kept.index).toBe(0);
    delete f.origin.refugeCue;expect(target(f).index).toBe(1);
    f.origin.refugeCue={id:'refuge',index:7};f.origin.x=-4;f.origin.z=-3.6;f.previous.foxes[0]={active:true,x:-2,z:-3.6};
    expect(target(f).index).toBe(7);f.cover=70;expect(target(f)?.index).not.toBe(7);
    f.cover=0;expect(target(f)).toBeNull();
  });

  it('clears invalid, inactive, absent, disabled and non-rabbit decisions',()=>{
    const changes=[f=>{f.origin=null;},f=>{f.origin.active=false;},f=>{f.origin.x=NaN;},f=>{f.origin.z=Infinity;},f=>{f.origin.x='-5';},
      f=>{f.counts.rabbits=0;},f=>{f.counts.rabbits=1.5;},f=>{delete f.counts.rabbits;},f=>{f.counts=null;},f=>{f.previous=null;},
      f=>{f.cover=0;},f=>{f.cover=-10;},f=>{f.cover=Infinity;},f=>{f.cover=NaN;},f=>{f.cover=81;},f=>{f.cover='10';}];
    for(const change of changes){const f=fixture();change(f);expect(target(f)).toBeNull();}
    for(const id of ['voles','foxes','owls','bluetits','caterpillars','plants','unknown'])expect(target(fixture(),0,id)).toBeNull();
    for(const index of [-1,1,.5,NaN])expect(target(fixture(),index)).toBeNull();
  });

  it('requires a finite active predator that is present in the current sample counts',()=>{
    const changes=[f=>{f.threat=null;},f=>{f.threat.id='rabbits';},f=>{f.threat.id='missing';},f=>{f.threat.index=-1;},f=>{f.threat.index=.5;},f=>{f.threat.index=1;},
      f=>{f.previous.foxes[0].active=false;},f=>{f.previous.foxes[0].x=Infinity;},f=>{f.previous.foxes[0].z=NaN;},f=>{f.previous.foxes[0]=null;},f=>{delete f.previous.foxes;},
      f=>{f.counts.foxes=0;},f=>{f.counts.foxes=NaN;},f=>{f.counts.foxes=.5;},f=>{delete f.counts.foxes;}];
    for(const change of changes){const f=fixture();change(f);expect(target(f)).toBeNull();}
  });
});

describe('bounded concealment presentation rule',()=>{
  it('releases only a rabbit actually waiting at its active recorded thicket, while a close fox can still detect it',()=>{
    const f=concealedFixture(),before=JSON.stringify(f);expect(hides(f)).toBe(true);expect(JSON.stringify(f)).toBe(before);
    f.fox.x=f.rabbit.x+1.125;expect(hides(f)).toBe(false);f.fox.x=f.rabbit.x+1.25;expect(hides(f)).toBe(true);
    f.rabbit.x=f.rabbit.refugeCue.x+.46;expect(hides(f)).toBe(false);
  });

  it('clears target release immediately when the patch vanishes or the cue is not genuine arrival evidence',()=>{
    const changes=[f=>{f.cover=0;},f=>{f.cover=NaN;},f=>{f.rabbit.active=false;},f=>{f.fox.active=false;},f=>{f.rabbit.state='Retreating';},f=>{f.rabbit.state='Grazing';},
      f=>{f.rabbit.refugeCue=null;},f=>{f.rabbit.refugeCue.stage='approaching';},f=>{f.rabbit.refugeCue.id='rabbits';},f=>{f.rabbit.refugeCue.index=8;},f=>{f.rabbit.refugeCue.index=-1;},
      f=>{f.rabbit.refugeCue.index=.5;},f=>{f.rabbit.refugeCue.x+=.01;},f=>{f.rabbit.refugeCue.z=NaN;},f=>{f.rabbit.x=Infinity;},f=>{f.fox.z=NaN;}];
    for(const change of changes){const f=concealedFixture();change(f);expect(hides(f)).toBe(false);}
    const f=concealedFixture();for(const id of ['foxes','voles','owls','bluetits','caterpillars'])expect(api.refugeConceals(id,0,f.rabbit,f.fox,f.cover)).toBe(false);
    for(const index of [-1,.5,16])expect(api.refugeConceals('rabbits',index,f.rabbit,f.fox,f.cover)).toBe(false);
    f.rabbit.refugeCue={id:'refuge',index:7,x:-4,z:-3.6,stage:'at-cover'};f.rabbit.x=-4;f.rabbit.z=-3.6;f.fox.z=-3.6;f.fox.x=0;
    f.cover=80;expect(hides(f)).toBe(true);f.cover=70;expect(hides(f)).toBe(false);
  });
});

describe('recorded refuge behavior integration',()=>{
  const config={enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:80,event:'none'};

  it('records reachable patch provenance, arrival and exact replay without altering population rows',()=>{
    const rows=api.compare(config).baseline,before=JSON.stringify(rows),frames=api.behaviorTimeline(config,rows);let seen=0,arrivals=0;
    for(let step=1;step<frames.length;step++)for(let index=0;index<16;index++){
      const p=frames[step].rabbits[index],cue=p.refugeCue;if(!cue)continue;seen++;
      expect(p.active).toBe(true);expect(cue.id).toBe('refuge');expect(cue.index).toBeGreaterThanOrEqual(0);expect(cue.index).toBeLessThan(8);
      expect(rows[step].cover).toBeGreaterThan(cue.index*10);expect(cue.decisionDistance).toBeLessThan(5.5);
      const old=frames[step-1].rabbits[index],threat=frames[step-1][cue.threatId]?.[cue.threatIndex];
      expect(threat?.active).toBe(true);expect(frames[step][cue.threatId][cue.threatIndex].active).toBe(true);
      expect(cue.decisionDistance).toBeCloseTo(Math.hypot(old.x-cue.x,old.z-cue.z),10);
      expect(cue.distance).toBeCloseTo(Math.hypot(p.x-cue.x,p.z-cue.z),10);
      if(cue.stage==='at-cover'){arrivals++;expect(cue.distance).toBeLessThan(.45);expect(p.state).toBe('Alert');expect(api.explainBehavior('rabbits',p).text).toMatch(/thicket|cover|shelter/i);}
      else expect(cue.stage).toBe('approaching');
    }
    expect(seen).toBeGreaterThan(10);expect(arrivals).toBeGreaterThan(0);expect(api.behaviorTimeline(config,rows)).toEqual(frames);expect(JSON.stringify(rows)).toBe(before);
  });

  it('discards vanished patches and invalid predator or rabbit sources at the disturbance sample',()=>{
    for(const change of [{event:'clearCover'},{event:'remove',target:'foxes'},{event:'remove',target:'rabbits'}]){
      const c={...config,...change,eventStep:40},rows=api.compare(c).experiment,frames=api.behaviorTimeline(c,rows);
      expect(frames.slice(40).every(frame=>frame.rabbits.every(p=>!p.refugeCue))).toBe(true);
    }
    for(const c of [{...config,cover:0},{...config,enabled:{...config.enabled,rabbits:false}},{...config,enabled:{...config.enabled,foxes:false}}]){
      const frames=api.behaviorTimeline(c,api.compare(c).baseline);expect(frames.every(frame=>frame.rabbits.every(p=>!p.refugeCue))).toBe(true);
    }
  });
});

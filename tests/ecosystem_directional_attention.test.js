import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const origin={x:0,z:0,yaw:0,headTurn:0,active:true};
const cue=(x,z)=>({id:'voles',index:2,x,z,distance:Math.hypot(x,z)});

it('points toward the cue in body coordinates and limits neck rotation',()=>{
  for(const [id,state,limit] of [['foxes','Stalking',.48],['rabbits','Alert',.42],['voles','Alert',.5],['rabbits','Retreating',.28]]){
    for(const sign of [-1,1]){
      const target=cue(0,-sign),a=api.attention(id,state,origin,target,target);
      expect(a.turn).toBe(sign*limit);expect(a.kind).toBe(id==='foxes'?'prey':'threat');expect(a.index).toBe(2);
      const facing=api.attention(id,state,{...origin,yaw:sign*Math.PI/2},target,target);
      expect(facing.turn).toBeCloseTo(0,12);
    }
  }
  const a=api.attention('foxes','Listening',origin,cue(2,-.2),null);
  expect(a.turn).toBeCloseTo(Math.atan2(.2,2),12);
});

it('avoids rear-seam flips and releases attention during rest, flight, absence and missing cues',()=>{
  for(const sign of [-1,1])for(const z of [-.01,.01])expect(Math.sign(api.attention('foxes','Stalking',{...origin,headTurn:sign*.3},cue(-1,z),null).turn)).toBe(sign);
  for(const state of ['Resting','Pouncing','Landing','Searching'])expect(api.attention('foxes',state,origin,cue(1,1),null)).toBeNull();
  expect(api.attention('foxes','Stalking',{...origin,active:false},cue(1,1),null)).toBeNull();
  expect(api.attention('foxes','Stalking',origin,null,null)).toBeNull();
  expect(api.attention('foxes','Stalking',origin,cue(0,0),null)).toBeNull();
  expect(api.attention('rabbits','Alert',origin,null,cue(4,0))).toBeNull();
  expect(api.attention('owls','Quartering over prey',origin,cue(1,1),null)).toBeNull();
});

it('uses the recorded decision target and eases head and ears toward it without changing saved model data',()=>{
  const c={event:'remove',target:'foxes'},pair=api.compare(c),saved=JSON.stringify(pair),frames=api.behaviorTimeline(c,pair.experiment);
  const seen=new Set();let settled=0;
  for(let t=1;t<frames.length;t++)for(const id of ['foxes','rabbits','voles'])for(let i=0;i<16;i++){
    const p=frames[t][id][i],old=frames[t-1][id][i],a=p.attention;
    expect(Math.abs(p.headTurn-old.headTurn)).toBeLessThanOrEqual(.09+1e-12);
    expect(Math.abs(p.headTurn)).toBeLessThanOrEqual(.5+1e-12);
    if(a){
      seen.add(id);expect(a.id).toBe(p[a.kind]);expect(a.index).toBe(p[a.kind+'Index']);
      const target=frames[t-1][a.id][a.index];expect([a.x,a.z]).toEqual([target.x,target.z]);
      expect(Math.abs(p.headTurn-a.turn)).toBeLessThanOrEqual(Math.abs(old.headTurn-a.turn)+1e-12);
      if(Math.abs(p.headTurn-a.turn)<1e-10){settled++;expect(Math.sign(p.headTurn)).toBe(Math.sign(a.bearing));}
      const angle=a.bearing-p.headTurn,residual=Math.max(-.55,Math.min(.55,Math.atan2(Math.sin(angle),Math.cos(angle)))),scan=Math.sin(t/10*1.4+p.phase)*.09;
      for(const [key,desired] of [['earLeft',residual+scan],['earRight',residual-scan*.7]])expect(p[key]).toBeCloseTo(old[key]+Math.max(-.065,Math.min(.065,desired-old[key])),12);
    }
    if(!p.active||p.state==='Pouncing'||p.state==='Resting')expect(a).toBeNull();
    if(t>=80&&id!=='foxes')expect(a?.id).not.toBe('foxes');
  }
  expect([...seen].sort()).toEqual(['foxes','rabbits','voles']);expect(settled).toBeGreaterThan(20);
  expect(JSON.stringify(pair)).toBe(saved);expect(frames).toEqual(api.behaviorTimeline(c,pair.experiment));
});

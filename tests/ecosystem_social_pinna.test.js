import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const sourceFile=process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js',copy=v=>JSON.parse(JSON.stringify(v));
let api,f,probe;
beforeAll(()=>{
  resetStemLab();loadTool(sourceFile,'ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({soil:{enabled:false},enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none',target:'foxes',eventStep:80}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),hits=[];
  frames.forEach((frame,step)=>frame.rabbits.forEach((p,index)=>{const focus=api.rabbitPinnaFocus(p,false),amount=Math.hypot(focus.left,focus.right);if(amount>.0001)hits.push({step,index,focus,amount});}));
  hits.sort((a,b)=>b.amount-a.amount);expect(hits.length).toBeGreaterThan(0);expect(hits[0].amount).toBeGreaterThan(.003);
  f={config,pair,frames,hits,best:hits[0]};console.info('Recorded social pinna example',JSON.stringify(hits[0]));
  const source=readFileSync(sourceFile,'utf8'),anchor='  window.StemLab.ecosystemFoodWeb.rabbitPinnaFocus=ecoMeadowRabbitPinnaFocus;';expect(source.split(anchor)).toHaveLength(2);
  resetStemLab();new Function(source.replace(anchor,anchor+'\n  window.StemLab.ecosystemFoodWeb.pinnaTestGate=ecoMeadowRabbitPinnaGate;\n  window.StemLab.ecosystemFoodWeb.pinnaTestRecord=ecoMeadowRabbitPinnaRecord;'))();probe=window.StemLab.ecosystemFoodWeb;
},60_000);
const zero=()=>({left:0,right:0,cue:null,episode:null});

describe('recorded rabbit social-alert pinna focus',()=>{
  it('relaxes only the opposite pinna toward neutral using the verified neighbor cue, preserving every other articulation channel and raw field',()=>{
    const before=JSON.stringify({frames:f.frames,pair:f.pair});
    for(const hit of f.hits){const p=f.frames[hit.step].rabbits[hit.index],focus=api.rabbitPinnaFocus(p,false),trace=api.vigilanceTrace(f.frames,hit.step,hit.index),a=api.mammalArticulation('rabbits',p,false),b=api.mammalArticulation('rabbits',copy(p),false),residual=Math.atan2(Math.sin(p.attention.bearing-p.headTurn),Math.cos(p.attention.bearing-p.headTurn));
      expect(focus.cue).toEqual({id:'rabbits',index:trace.source.index,receiverIndex:hit.index,threatId:trace.predator.id,threatIndex:trace.predator.index});expect(focus.episode.start).toBeLessThan(hit.step);expect(focus.episode.end).toBeGreaterThan(hit.step);
      expect(Math.max(Math.abs(focus.left),Math.abs(focus.right))).toBeLessThanOrEqual(.07);expect(a.earLeft-b.earLeft).toBeCloseTo(focus.left,14);expect(a.earRight-b.earRight).toBeCloseTo(focus.right,14);
      if(residual>0){expect(focus.left).toBe(0);expect(focus.right).toBeLessThan(0);}else{expect(focus.right).toBe(0);expect(focus.left).toBeGreaterThan(0);}
      for(const key of Object.keys(a).filter(key=>!['earLeft','earRight'].includes(key)))expect(a[key]).toEqual(b[key]);expect(Object.keys(a)).toEqual(Object.keys(b));
    }
    expect(JSON.stringify({frames:f.frames,pair:f.pair})).toBe(before);expect(api.behaviorTimeline(f.config,f.pair.baseline)).toEqual(f.frames);
  });
  it('neutralizes copied, edited or removed recorded cues and source/predator identities without throwing',()=>{
    const {step,index}=f.best,p=f.frames[step].rabbits[index],original=copy(p),restore=()=>{for(const key of Object.keys(p))delete p[key];Object.assign(p,copy(original));};
    expect(api.rabbitPinnaFocus(copy(p),false)).toEqual(zero());
    for(const mutate of [p=>p.socialCue.index++,p=>p.socialCue.threatIndex++,p=>p.socialDistance+=.01,p=>p.attention.x+=.01,p=>p.attention.kind='threat',p=>p.directAlarm=true,p=>p.headTurn=NaN,p=>p.active=false,p=>p.state='Resting']){mutate(p);expect(api.rabbitPinnaFocus(p,false)).toEqual(zero());restore();expect(Math.hypot(...['left','right'].map(key=>api.rabbitPinnaFocus(p,false)[key]))).toBeGreaterThan(0);}
    const source=f.frames[step].rabbits[p.socialIndex],active=source.active;source.active=false;expect(api.rabbitPinnaFocus(p,false)).toEqual(zero());source.active=active;
    const predator=f.frames[step][p.socialCue.threatId][p.socialCue.threatIndex];predator.active=false;expect(api.rabbitPinnaFocus(p,false)).toEqual(zero());predator.active=true;
    const frame=f.frames[step];f.frames[step]=null;expect(()=>api.rabbitPinnaFocus(p,false)).not.toThrow();expect(api.rabbitPinnaFocus(p,false)).toEqual(zero());f.frames[step]=frame;
    const rabbits=frame.rabbits;frame.rabbits=null;expect(api.rabbitPinnaFocus(p,false)).toEqual(zero());frame.rabbits=rabbits;
  });
  it('has zero added angle at both ends of every episode, including one- and two-sample verified episodes',()=>{
    const episodes=new Map();for(const frame of f.frames)for(const p of frame.rabbits){const focus=api.rabbitPinnaFocus(p,false);if(focus.episode)episodes.set(JSON.stringify(focus.episode),focus.episode);}
    for(const episode of episodes.values())for(const step of [episode.start,episode.end]){const focus=api.rabbitPinnaFocus(f.frames[step].rabbits[episode.index],false);expect([focus.left,focus.right]).toEqual([0,0]);}
    for(const length of [1,2]){const {step,index}=f.best,frames=copy(f.frames.slice(0,step+1));for(let n=0;n<=step-length;n++)frames[n].rabbits[index].attention=null;probe.pinnaTestRecord(frames);for(let n=step-length+1;n<=step;n++){const focus=probe.rabbitPinnaFocus(frames[n].rabbits[index],false);expect(focus.episode).toMatchObject({start:step-length+1,end:step,index});expect([focus.left,focus.right]).toEqual([0,0]);}}
  });
  it('uses a continuous zero gate at rest, height, pounce and the actual shared-flight boundary',()=>{
    const p={active:true,state:'Alert',distance:0,phase:0,moving:0,stride:0,rest:0,pounce:0,altitude:.025};expect(probe.pinnaTestGate(p)).toBe(1);
    for(const [key,edge] of [['rest',.45],['altitude',.04],['pounce',.01]]){const left=probe.pinnaTestGate({...p,[key]:edge-1e-8}),right=probe.pinnaTestGate({...p,[key]:edge+1e-8});expect(left).toBeLessThan(1e-9);expect(right).toBe(0);}
    const flight={...p,moving:1.15,stride:1},blend=t=>({...flight,distance:t*Math.PI*2/28});let low=.5,high=.99;for(let k=0;k<50;k++){const mid=(low+high)/2;if(api.mammalPosture('rabbits',blend(mid)).flightLift>0)high=mid;else low=mid;}const edge=(low+high)/2;expect(probe.pinnaTestGate(blend(edge-1e-7))).toBeLessThan(1e-8);expect(probe.pinnaTestGate(blend(edge+1e-7))).toBe(0);
  });
  it('interpolates only adjacent samples of the same verified episode, stays continuous, and rejects private-provenance mutations',()=>{
    const {step,index}=f.best,a=f.frames[step].rabbits[index],b=f.frames[step+1].rabbits[index];expect(api.rabbitPinnaFocus(b,false).episode).toEqual(api.rabbitPinnaFocus(a,false).episode);
    let previous=api.rabbitPinnaFocus(a,false);for(let k=1;k<=100;k++){const alpha=k/100,p=api.blendPose(a,b,alpha,'rabbits',f.frames[step-1].rabbits[index],f.frames[step+2].rabbits[index]),focus=api.rabbitPinnaFocus(p,false);expect(Math.hypot(focus.left-previous.left,focus.right-previous.right)).toBeLessThan(.002);expect(Math.max(Math.abs(focus.left),Math.abs(focus.right))).toBeLessThanOrEqual(.07);previous=focus;}
    for(const alpha of [.25,.5,.75]){const p=api.blendPose(a,b,alpha,'rabbits'),focus=api.rabbitPinnaFocus(p,false);expect(focus.episode).toEqual(f.best.focus.episode);expect(api.rabbitPinnaFocus({...p},false)).toEqual(zero());const turn=p.headTurn;p.headTurn+=.001;expect(api.rabbitPinnaFocus(p,false)).toEqual(zero());p.headTurn=turn;expect(api.rabbitPinnaFocus(p,false)).toEqual(focus);expect(api.rabbitPinnaFocus(p,true)).toEqual(zero());}
    const other=f.frames[f.best.focus.episode.end+1].rabbits[index];for(const alpha of [.25,.5,.75])expect(api.rabbitPinnaFocus(api.blendPose(a,other,alpha,'rabbits'),false)).toEqual(zero());
  });
  it('freezes all ear articulation for reduced motion and leaves foxes, unrelated poses and original geometry unchanged',()=>{
    for(const {step,index} of f.hits.slice(0,20)){const p=f.frames[step].rabbits[index];expect(api.rabbitPinnaFocus(p,true)).toEqual(zero());expect(api.mammalArticulation('rabbits',p,true)).toEqual(api.mammalArticulation('rabbits',copy(p),true));expect(api.mammalArticulation('foxes',p,false)).toEqual(api.mammalArticulation('foxes',copy(p),false));}
    expect(api.mammalSurface('rabbits','ear')).toEqual(probe.mammalSurface('rabbits','ear'));expect(api.peerRadius('rabbits',f.best.index)).toBe(probe.peerRadius('rabbits',f.best.index));expect(api.encounters(f.frames,f.config)).toEqual(probe.encounters(f.frames,f.config));
  });
});

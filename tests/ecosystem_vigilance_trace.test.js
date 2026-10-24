import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const p=(x,z=0,extra={})=>({active:true,x,z,yaw:0,altitude:.025,state:'Exploring',...extra});
function fixture(predator='foxes'){
  // Receiver S uses rabbit 1 at S-1, whose direct alarm used S-2 inputs.
  // Move each actor between samples so decision and display points differ.
  const cue={id:'rabbits',index:1,distance:1,threatId:predator,threatIndex:0};
  const frames=[
    {rabbits:[p(0),p(1)],foxes:[],owls:[],[predator]:[p(1.8,0,{state:'Searching',altitude:predator==='owls'?2:.025})]},
    {rabbits:[p(0),p(1,0,{state:'Alert',directAlarm:true,socialCue:null,threat:predator,threatIndex:0,threatDistance:.8})],foxes:[],owls:[],[predator]:[p(predator==='owls'?1.9:2.2,0,{state:'Stalking',altitude:predator==='owls'?2:.025})]},
    {rabbits:[p(-.1,0,{state:'Alert',directAlarm:false,socialMemory:true,socialCue:cue,social:'rabbits',socialIndex:1,socialDistance:1,threat:predator,threatIndex:0,threatDistance:predator==='owls'?1.9:2.2}),p(1.1,0,{state:'Retreating'})],foxes:[],owls:[],[predator]:[p(2.4,0,{state:'Searching',altitude:predator==='owls'?2.1:.025})]}
  ];return frames;
}
describe('recorded three-actor vigilance cue trace',()=>{
  it('separates both actual decision generations from all three current poses without mutation',()=>{
    for(const predator of ['foxes']){
      const frames=fixture(predator),before=JSON.stringify(frames),trace=api.vigilanceTrace(frames,2,0);
      expect(api.socialAlarm('rabbits',0,frames[1].rabbits[0],frames[1],{rabbits:2,foxes:1,owls:0})).toEqual(frames[2].rabbits[0].socialCue);
      expect(Math.hypot(frames[0].foxes[0].x-frames[0].rabbits[1].x,frames[0].foxes[0].z-frames[0].rabbits[1].z)).toBeLessThan(2.6);
      expect(Math.hypot(frames[1].foxes[0].x-frames[1].rabbits[0].x,frames[1].foxes[0].z-frames[1].rabbits[0].z)*1.6).toBeGreaterThanOrEqual(3.4);
      expect(trace).toMatchObject({version:1,step:2,neighborDecisionStep:1,directDecisionStep:0,decisionDistance:1,directDistance:.8,receiver:{id:'rabbits',index:0},source:{id:'rabbits',index:1},predator:{id:predator,index:0}});
      for(const actor of [trace.receiver,trace.source,trace.predator]){expect(actor.pose).not.toBe(frames[2][actor.id][actor.index]);expect(actor.pose).toEqual(expect.objectContaining({x:frames[2][actor.id][actor.index].x,z:frames[2][actor.id][actor.index].z}));}
      expect(trace.inputs).toEqual({receiver:[0,0],neighbor:[1,0],directObserver:[1,0],predator:[1.8,0]});
      expect(trace.inputs.predator).not.toEqual([trace.predator.pose.x,trace.predator.pose.z]);expect(trace.inputs.neighbor).not.toEqual([trace.source.pose.x,trace.source.pose.z]);
      expect(api.vigilanceTrace(frames,2,0)).toEqual(trace);expect(JSON.stringify(frames)).toBe(before);
      trace.inputs.predator[0]=900;trace.receiver.pose.x=900;trace.source.pose.z=900;trace.predator.pose.altitude=99;expect(api.vigilanceTrace(frames,2,0).inputs.predator).toEqual([1.8,0]);expect(JSON.stringify(frames)).toBe(before);
    }
    // Owls eat voles in this food web. A permissive low-level social cue is
    // not evidence of an owl→rabbit direct alarm in an actual recording.
    expect(api.links.some(link=>link.food==='rabbits'&&link.consumer==='owls')).toBe(false);
    expect(api.vigilanceTrace(fixture('owls'),2,0)).toBeNull();
  });
  it('rejects missing, absent and nonfinite actors at every required decision/display sample',()=>{
    for(const [step,id,index]of [[2,'rabbits',0],[1,'rabbits',0],[2,'rabbits',1],[1,'rabbits',1],[0,'rabbits',1],[2,'foxes',0],[1,'foxes',0],[0,'foxes',0]]){
      for(const change of [p=>{p.active=false;},p=>{p.x=NaN;},p=>{p.z=Infinity;},p=>{p.altitude=-1;},p=>{p.yaw=NaN;},p=>{p.yaw=Infinity;},p=>{p.yaw='0';},p=>{delete p.yaw;},p=>{p.state=null;},p=>{p.state='';},p=>{p.state='a'.repeat(81);},p=>{p.state=4;}]){const frames=fixture();change(frames[step][id][index]);expect(api.vigilanceTrace(frames,2,0)).toBeNull();}
      const frames=fixture();frames[step][id][index]=null;expect(api.vigilanceTrace(frames,2,0)).toBeNull();
    }
  });
  it('rejects copied, recursive and mismatched neighbor cues or display metadata',()=>{
    const changes=[f=>{f[2].rabbits[0].socialCue.index=0;},f=>{f[2].rabbits[0].socialIndex=0;},f=>{f[2].rabbits[0].socialDistance=.9;},f=>{f[2].rabbits[0].socialCue.distance=.9;f[2].rabbits[0].socialDistance=.9;},f=>{f[2].rabbits[0].directAlarm=true;},f=>{f[2].rabbits[0].socialMemory=false;},f=>{f[2].rabbits[0].state='Grazing';},f=>{f[2].rabbits[0].socialCue.threatId='voles';},f=>{f[2].rabbits[0].socialCue.threatIndex=1;},f=>{f[1].rabbits[1].socialCue={id:'rabbits',index:0};},f=>{f[1].rabbits[1].directAlarm=false;},f=>{f[1].rabbits[1].state='Grazing';},f=>{f[2].rabbits[0].threatDistance=2.1;},f=>{f[1].foxes[0].x=1.8;f[2].rabbits[0].threatDistance=1.8;}];
    for(const change of changes){const frames=fixture();change(frames);expect(api.vigilanceTrace(frames,2,0)).toBeNull();}
  });
  it('requires the source direct alarm to match its own earlier nearest predator and noticed distance',()=>{
    const changes=[f=>{f[1].rabbits[1].threatDistance=1;},f=>{f[1].rabbits[1].threat='owls';},f=>{f[0].foxes[0].x=3.8;f[1].rabbits[1].threatDistance=2.8;},f=>{f[0].foxes.push(p(1.2));f[1].foxes.push(p(1.3));f[2].foxes.push(p(1.4));}];
    for(const change of changes){const frames=fixture();change(frames);expect(api.vigilanceTrace(frames,2,0)).toBeNull();}
    const quiet=fixture();quiet[0].foxes[0].x=2.7;quiet[0].foxes[0].state='Stalking';quiet[1].rabbits[1].threatDistance=1.7;expect(api.vigilanceTrace(quiet,2,0)).toBeNull();
  });
  it('rejects unsupported frame/index inputs and leaves ordinary pair results unchanged',()=>{
    const frames=fixture(),pair=api.interaction(frames[2],'rabbits',0);
    for(const step of [-1,0,1,3,2.1,NaN])expect(api.vigilanceTrace(frames,step,0)).toBeNull();
    for(const index of [-1,16,.5,NaN])expect(api.vigilanceTrace(frames,2,index)).toBeNull();
    for(const raw of [null,{},'bad',[null,null,null]])expect(api.vigilanceTrace(raw,2,0)).toBeNull();
    api.vigilanceTrace(frames,2,0);expect(api.interaction(frames[2],'rabbits',0)).toEqual(pair);expect(pair.other).toBe(frames[2].rabbits[1]);
  });
  it('indexes actual recorded rabbit vigilance and preserves exact rewind, every pose and population row',()=>{
    const config={enabled:{voles:false,owls:false},initial:{rabbits:90,foxes:6},cover:10,event:'none'},pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),before=JSON.stringify(frames),population=JSON.stringify(pair);
    const traces=[];for(let step=2;step<frames.length;step++)for(let index=0;index<16;index++){const trace=api.vigilanceTrace(frames,step,index);if(trace)traces.push(trace);}
    expect(traces.length).toBeGreaterThan(0);const trace=traces[0];expect(api.vigilanceTrace(frames,trace.step,trace.receiver.index)).toEqual(trace);
    for(const trace of traces){const source=frames[trace.step-1].rabbits[trace.source.index];expect(source.directAlarm).toBe(true);expect(source.socialCue).toBeNull();expect(frames[trace.step].rabbits[trace.receiver.index].directAlarm).toBe(false);expect(trace.receiver.pose.state).toBe('Alert');expect(trace.predator.pose.active).toBe(true);expect(trace.inputs.predator).toEqual([frames[trace.step-2][trace.predator.id][trace.predator.index].x,frames[trace.step-2][trace.predator.id][trace.predator.index].z]);}
    expect(JSON.stringify(frames)).toBe(before);expect(JSON.stringify(pair)).toBe(population);expect(api.behaviorTimeline(config,pair.baseline)).toEqual(frames);
  });
});

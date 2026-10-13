import fs from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';

// Execute the real private scene helpers. No production test hook or rendering
// stub is needed to check the time integration independently of WebGL/GPU load.
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8');
const sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
const helperStart=source.indexOf('var responses={}',sceneStart);
const helperEnd=source.indexOf('function particles(',helperStart);
const clockStart=source.indexOf('var animate=p.animate&&!reducedMotion,dt=',helperEnd);
const clockEnd=source.indexOf('lastFrame=timestamp;',clockStart)+'lastFrame=timestamp;'.length;
const frameStart=source.indexOf('dimensionSettling=false;responseSettling=false;var visualProps=',clockEnd);
const frameEnd=source.indexOf('lastVisualPhase=p.phase;',frameStart)+'lastVisualPhase=p.phase;'.length;
if([sceneStart,helperStart,helperEnd,clockStart,frameStart].some(index=>index<0))throw new Error('Renewables scene response helpers were not found');

function createResponse(){
  return vm.runInNewContext(`(function(){
    ${source.slice(helperStart,helperEnd)}
    var lastFrame=0;
    return {
      response:response,motion:motion,cue:cue,shape:shape,
      frame:function(timestamp,p,reducedMotion){
        ${source.slice(clockStart,clockEnd)}
        ${source.slice(frameStart,frameEnd)}
        return visualProps;
      },
      settling:function(){return responseSettling;},
      dimensionSettling:function(){return dimensionSettling;},
      resetSettling:function(){responseSettling=false;dimensionSettling=false;}
    };
  })()`);
}
const playing=dt=>({dt,animate:true,syncResponse:false});
const rotor=()=>({rotation:{z:1.234},userData:{}});

function integrate(parts){
  const h=createResponse();
  h.response('speed',.2,playing(0),.42,true);
  let angle=0,result;
  for(const dt of parts){result=h.response('speed',1.8,playing(dt),.42,true);angle+=result.delta;}
  return {rate:result.value,angle};
}

describe('Renewables visual response integration',()=>{
  it('starts at the current operating point without a fictitious startup from zero',()=>{
    const h=createResponse(),first=h.response('speed',1.25,playing(0),.42,true);
    expect(first.value).toBe(1.25);expect(first.delta).toBe(0);expect(h.settling()).toBe(false);
    expect(h.response('speed',1.25,playing(.1),.42,true).delta).toBeCloseTo(.125,14);
  });

  it.each([10,15,30,60,120])('gives the same final speed and angular travel at %i FPS',fps=>{
    const expected=integrate([1.8]),actual=integrate(Array.from({length:fps*1.8},()=>1/fps));
    expect(actual.rate).toBeCloseTo(expected.rate,12);
    expect(actual.angle).toBeCloseTo(expected.angle,12);
  });

  it('retains the integral through irregular frame partitions',()=>{
    const intervals=[.001,.099,.02,.08,.037,.063,.1,.1,.11,.09,.05,.07,.08];
    const expected=integrate([intervals.reduce((a,b)=>a+b,0)]),actual=integrate(intervals);
    expect(actual.rate).toBeCloseTo(expected.rate,13);expect(actual.angle).toBeCloseTo(expected.angle,13);
  });

  it('approaches positive targets monotonically without overshoot',()=>{
    const h=createResponse();h.response('speed',.2,playing(0),.42,true);
    let previous=.2;
    for(let i=0;i<45;i++){const value=h.response('speed',1.8,playing(1/30),.42,true).value;expect(value).toBeGreaterThan(previous);expect(value).toBeLessThan(1.8);previous=value;}
    for(let i=0;i<45;i++){const value=h.response('speed',.1,playing(1/30),.42,true).value;expect(value).toBeLessThan(previous);expect(value).toBeGreaterThan(.1);previous=value;}
  });

  it('stops a power-dependent cue and its integral on the first zero frame',()=>{
    const h=createResponse(),object=rotor();h.motion(object,'rotor',1.2,playing(.1),.42);
    const before=object.rotation.z;h.motion(object,'rotor',0,playing(.12),.42);
    expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(0);
    h.cue('output',.8,playing(0));expect(h.cue('output',0,playing(.12))).toBe(0);
    const resumed=h.motion(object,'rotor',1.2,playing(.01),.42);
    expect(resumed.value).toBeGreaterThan(0);expect(resumed.value).toBeLessThan(.1);
  });

  it('reverses signed rotation immediately without resetting its pose',()=>{
    const h=createResponse(),object=rotor();h.motion(object,'tidal',.6,playing(.1),.42);
    const before=object.rotation.z;
    h.motion(object,'tidal',-.6,playing(0),.42);
    expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(-.6);
    h.motion(object,'tidal',-.6,playing(.1),.42);
    expect(object.rotation.z-before).toBeCloseTo(.06,14);
  });

  it('follows rapid control changes without stale direction or angular teleportation',()=>{
    const h=createResponse(),object=rotor();h.motion(object,'tidal',.8,playing(0),.42);
    for(const target of [1.2,-.25,.7,-1.7,0,1.1,-.4]){
      const before=object.rotation.z;h.motion(object,'tidal',target,playing(0),.42);
      expect(object.rotation.z).toBe(before);
      h.motion(object,'tidal',target,playing(.02),.42);
      expect(Number.isFinite(object.rotation.z)).toBe(true);
      if(target===0)expect(object.rotation.z).toBe(before);
      else expect(Math.sign(object.rotation.z-before)).toBe(-Math.sign(target));
    }
    for(let i=0;i<120;i++)h.motion(object,'tidal',-.4,playing(1/60),.42);
    expect(object.userData.motionRate).toBeCloseTo(-.4,2);
  });

  it('keeps response state separate for different equipment and stream properties',()=>{
    const h=createResponse();h.response('runner',1,playing(0),.42,true);h.response('stream-strength',.1,playing(0),.22,true);
    h.response('runner',2,playing(.1),.42,true);
    expect(h.response('stream-strength',.1,playing(.1),.22,true).value).toBe(.1);
    expect(h.response('runner',2,playing(0),.42,true).value).toBeGreaterThan(1);
  });

  it('lets pitch cross zero smoothly when zero is a valid position, not a stop command',()=>{
    const h=createResponse();h.response('pitch',-.14,playing(0),.22,false);
    const neutral=h.response('pitch',0,playing(.02),.22,false);
    expect(neutral.value).toBeGreaterThan(-.14);expect(neutral.value).toBeLessThan(0);
    const feather=h.response('pitch',Math.PI/2,playing(.02),.22,false);
    expect(feather.value).toBeGreaterThan(neutral.value);expect(feather.value).toBeLessThan(Math.PI/2);
  });

  it('reports settlement only until the active visual response is close to target',()=>{
    const h=createResponse();h.cue('light',.1,playing(0));h.cue('light',1,playing(.02));expect(h.settling()).toBe(true);
    h.resetSettling();h.cue('light',1,playing(5));expect(h.settling()).toBe(false);
    h.resetSettling();h.cue('light',0,playing(.02));expect(h.settling()).toBe(false);
  });

  it('remains finite and bounded over tiny and large finite cue magnitudes',()=>{
    for(const scale of [1e-250,1e-12,1,1e12,1e250]){
      const h=createResponse();h.response('cue',scale,playing(0),.26,true);
      for(const target of [scale*.1,scale*2,scale*.75,0,scale]){
        const result=h.response('cue',target,playing(.12),.26,true);
        expect(Number.isFinite(result.value)).toBe(true);expect(Number.isFinite(result.delta)).toBe(true);
        expect(result.value).toBeGreaterThanOrEqual(0);expect(result.delta).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(scale*2);
      }
    }
  });
});

describe('Renewables displayed dimensions',()=>{
  it('starts with the requested shape and finishes exactly at a new target',()=>{
    const h=createResponse();
    expect(h.shape('radius',1,playing(0))).toBe(1);
    expect(h.dimensionSettling()).toBe(false);
    const first=h.shape('radius',3,playing(1/60));
    expect(first).toBeGreaterThan(1);expect(first).toBeLessThan(3);
    expect(h.dimensionSettling()).toBe(true);
    let value=first;
    for(let i=0;i<240;i++){
      h.resetSettling();
      const next=h.shape('radius',3,playing(1/60));
      expect(next).toBeGreaterThanOrEqual(value);expect(next).toBeLessThanOrEqual(3);
      value=next;
    }
    expect(value).toBe(3);expect(h.dimensionSettling()).toBe(false);
    expect(h.shape('radius',3,playing(0))).toBe(3);
    expect(h.dimensionSettling()).toBe(false);
  });

  it('retargets from the displayed dimension when a control reverses before settling',()=>{
    const h=createResponse();h.shape('panel-size',1,playing(0));
    const growing=h.shape('panel-size',4,playing(.15));
    expect(growing).toBeGreaterThan(1);expect(growing).toBeLessThan(4);
    expect(h.shape('panel-size',.5,playing(0))).toBe(growing);
    let previous=growing;
    for(let i=0;i<240;i++){
      const value=h.shape('panel-size',.5,playing(1/60));
      expect(value).toBeLessThanOrEqual(previous);expect(value).toBeGreaterThanOrEqual(.5);
      previous=value;
    }
    expect(previous).toBe(.5);
  });

  it.each([10,15,30,60,120])('gives the same displayed dimension at %i FPS before the exact-settlement cutoff',fps=>{
    const single=createResponse(),partitioned=createResponse();
    single.shape('head',1,playing(0));partitioned.shape('head',1,playing(0));
    const expected=single.shape('head',5,playing(.4));
    let actual=1;
    for(let i=0;i<fps*.4;i++)actual=partitioned.shape('head',5,playing(1/fps));
    expect(expected).toBeLessThan(4.9995);
    expect(actual).toBeCloseTo(expected,12);
    expect(single.dimensionSettling()).toBe(true);expect(partitioned.dimensionSettling()).toBe(true);
  });

  it.each(['paused','reduced','scrub'])('%s controls snap dimensions to the exact current selection',mode=>{
    const h=createResponse();
    h.shape('angle',-.7,h.frame(1000,{animate:true,phase:5},false));
    const moving=h.shape('angle',.7,h.frame(1100,{animate:true,phase:5},false));
    expect(moving).toBeGreaterThan(-.7);expect(moving).toBeLessThan(.7);
    const frame=h.frame(1200,{animate:mode!=='paused',phase:mode==='scrub'?25:5},mode==='reduced');
    expect(h.shape('angle',-.25,frame)).toBe(-.25);
    expect(h.dimensionSettling()).toBe(false);
  });

  it('smooths a valid zero angle, then settles exactly instead of treating zero as a stop command',()=>{
    const h=createResponse();h.shape('incidence',-.8,playing(0));
    let value=h.shape('incidence',0,playing(.02));
    expect(value).toBeGreaterThan(-.8);expect(value).toBeLessThan(0);
    expect(h.dimensionSettling()).toBe(true);
    for(let i=0;i<240;i++){h.resetSettling();value=h.shape('incidence',0,playing(1/60));}
    expect(value).toBe(0);expect(h.dimensionSettling()).toBe(false);
  });
});

describe('Renewables scene clock and synchronization',()=>{
  it('keeps a 10 FPS render clock at wall-clock speed and bounds long stalls',()=>{
    const h=createResponse();expect(h.frame(1000,{animate:true,phase:0},false).dt).toBe(0);
    let elapsed=0;for(let i=1;i<=10;i++)elapsed+=h.frame(1000+i*100,{animate:true,phase:0},false).dt;
    expect(elapsed).toBeCloseTo(1,14);
    expect(h.frame(5000,{animate:true,phase:0},false).dt).toBeLessThanOrEqual(.12);
    expect(h.frame(4990,{animate:true,phase:0},false).dt).toBe(0);
  });

  it.each(['paused','reduced'])('%s frames apply new targets without moving the accumulated pose',mode=>{
    const h=createResponse(),object=rotor();h.frame(1000,{animate:true,phase:0},false);
    h.motion(object,'rotor',1,h.frame(1100,{animate:true,phase:0},false),.42);
    const before=object.rotation.z,frame=h.frame(1200,{animate:mode!=='paused',phase:0},mode==='reduced');
    expect(frame.dt).toBe(0);expect(frame.animate).toBe(false);
    h.motion(object,'rotor',.3,frame,.42);
    expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(.3);
    expect(h.cue('output',.7,frame)).toBe(.7);
    const resumed=h.frame(1300,{animate:true,phase:0},false);h.motion(object,'rotor',.3,resumed,.42);
    expect(before-object.rotation.z).toBeCloseTo(.03,14);
  });

  it('synchronizes targets on timeline changes while keeping same-minute controls smooth',()=>{
    const h=createResponse();let frame=h.frame(1000,{animate:true,phase:10},false);
    expect(frame.syncResponse).toBe(true);h.response('speed',.2,frame,.42,true);
    frame=h.frame(1100,{animate:true,phase:10},false);expect(frame.syncResponse).toBe(false);
    expect(h.response('speed',1.8,frame,.42,true).value).toBeLessThan(1.8);
    frame=h.frame(1200,{animate:true,phase:60},false);expect(frame.syncResponse).toBe(true);
    const result=h.response('speed',.8,frame,.42,true);expect(result.value).toBe(.8);expect(result.delta).toBeCloseTo(.08,14);
    frame=h.frame(1300,{animate:true,phase:60},false);expect(frame.syncResponse).toBe(false);
    expect(h.response('speed',1.2,frame,.42,true).value).toBeLessThan(1.2);
  });
});

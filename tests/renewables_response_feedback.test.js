import fs from 'node:fs';
import vm from 'node:vm';
import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8');
const feedbackStart=source.indexOf('  function rnEnergyIllustrationFeedback(');
const feedbackEnd=source.indexOf('  function rnEnergyPointerGesture(',feedbackStart);
if(feedbackStart<0||feedbackEnd<feedbackStart)throw Error('Production illustration feedback helper not found');
const feedback=vm.runInNewContext(source.slice(feedbackStart,feedbackEnd)+'\nrnEnergyIllustrationFeedback;');
const keyExpression=source.match(/var feedbackKey=([\s\S]*?),feedback=rnEnergyIllustrationFeedback/);
if(!keyExpression)throw Error('Production illustration render key not found');
const renderKey=vm.runInNewContext('(function(props,inspection){return '+keyExpression[1]+';})');
const responseStart=source.indexOf('        var responses={}');
const responseEnd=source.indexOf('        function particles(',responseStart);
if(responseStart<0||responseEnd<responseStart)throw Error('Production response helper boundary not found');

function responses(){
  return vm.runInNewContext('(function(){'+source.slice(responseStart,responseEnd)+`
    return {
      response:response,
      beginFrame:function(){responseSettling=false;dimensionSettling=false;},
      settling:function(){return responseSettling;}
    };
  })()`);
}
function render(args={}){
  const values={status:'ready',id:'solarPv',complete:false,reduced:false,animate:true,response:{id:'solarPv',mode:'steady'},...args};
  const before=JSON.stringify(values);
  const result=feedback(values.status,values.id,values.complete,values.reduced,values.animate,values.response,values.currentKey);
  expect(JSON.stringify(values)).toBe(before);
  expect(typeof result.title).toBe('string');expect(result.title.trim().length).toBeGreaterThan(0);
  expect(typeof result.note).toBe('string');expect(result.note.trim().length).toBeGreaterThan(0);
  return result;
}
const preview={animate:true,dt:0,syncResponse:false};
function seed(api,key,value){api.beginFrame();return api.response(key,value,{...preview,animate:false},.3,false);}
function step(api,key,target,dt,tau=.3,zeroStops=false,overrides={}){
  api.beginFrame();return api.response(key,target,{...preview,dt,...overrides},tau,zeroStops);
}
function nearRelative(actual,expected){expect(Math.abs(actual-expected)).toBeLessThanOrEqual(Math.max(Math.abs(expected),Number.MIN_VALUE)*1e-11);}

describe('Illustration feedback mode and current-scene ownership',()=>{
  it.each(['geometry','motion','coasting','steady'])('presents a rendered %s response for the current mechanism',mode=>{
    expect(render({response:{id:'solarPv',mode}}).code).toBe(mode);
  });
  it.each(['geometry','motion','coasting','steady'])('does not publish another mechanism’s %s response',mode=>{
    expect(render({response:{id:'wind',mode}}).code).toBe('waiting');
  });
  it.each([null,undefined,{id:'solarPv',mode:'pending'}])('waits for a confirmed initial render: %j',response=>{
    expect(render({response}).code).toBe('waiting');
  });
  it('keeps a loading scene waiting even when old response and mode overrides are present',()=>{
    expect(render({status:'loading',complete:true,reduced:true,animate:false,response:{id:'solarPv',mode:'motion'}}).code).toBe('waiting');
  });
  it('reports renderer failure before stale settling or playback modes',()=>{
    expect(render({status:'failed',complete:true,reduced:true,animate:false,response:{id:'wind',mode:'geometry'}}).code).toBe('unavailable');
  });
  it('completion takes precedence over reduced motion, pause and stale response',()=>{
    expect(render({complete:true,reduced:true,animate:false,response:{id:'wind',mode:'geometry'}}).code).toBe('complete');
  });
  it.each([true,false])('reduced motion overrides animation=%s after the current scene is rendered',animate=>{
    expect(render({reduced:true,animate,response:{id:'solarPv',mode:'motion'}}).code).toBe('reduced');
  });
  it.each(['geometry','motion','coasting','steady'])('pause does not retain an adjusting %s announcement',mode=>{
    expect(render({animate:false,response:{id:'solarPv',mode}}).code).toBe('paused');
  });
  it('waits for the current scene before reporting pause or reduced motion',()=>{
    expect(render({animate:false,response:{id:'wind',mode:'geometry'}}).code).toBe('waiting');
    expect(render({reduced:true,animate:false,response:{id:'wind',mode:'motion'}}).code).toBe('waiting');
  });
  it('resuming requires a response from the current scene',()=>{
    expect(render({animate:false,response:null}).code).toBe('waiting');
    expect(render({animate:true,response:null}).code).toBe('waiting');
    expect(render({animate:true,response:{id:'solarPv',mode:'motion'}}).code).toBe('motion');
  });
  it.each(['steady','motion','coasting','geometry'])('does not present a %s frame rendered for older controls or inspection settings',mode=>{
    expect(render({currentKey:'new-conditions',response:{id:'solarPv',mode,key:'old-conditions'}}).code).toBe('waiting');
    expect(render({currentKey:'new-conditions',response:{id:'solarPv',mode,key:'new-conditions'}}).code).toBe(mode);
  });
  it('requires current render evidence before announcing pause or reduced motion',()=>{
    const stale={id:'solarPv',mode:'steady',key:'old'};
    expect(render({animate:false,currentKey:'new',response:stale}).code).toBe('waiting');
    expect(render({animate:false,reduced:true,currentKey:'new',response:stale}).code).toBe('waiting');
    expect(render({animate:false,currentKey:'new',response:{...stale,key:'new'}}).code).toBe('paused');
    expect(render({animate:false,reduced:true,currentKey:'new',response:{...stale,key:'new'}}).code).toBe('reduced');
  });
  it('completion remains explicit when the last rendered conditions are stale',()=>{
    expect(render({complete:true,currentKey:'completed',response:{id:'solarPv',mode:'motion',key:'running'}}).code).toBe('complete');
  });
});

describe('Rendered-frame identity includes actual storage dispatch',()=>{
  let energy,microgrid;
  beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');energy=window.StemLab.renewablesEnergyModel;microgrid=window.StemLab.renewablesMicrogridModel;});
  const inspection={cutaway:false,layout:'assembled'};
  function key(run,minute){return renderKey({id:'storage',phase:minute,run},inspection);}
  function changedRun(before,after,minute){
    expect(after.settings).toEqual(before.settings);
    const beforeKey=key(before,minute),afterKey=key(after,minute);
    expect(afterKey).not.toBe(beforeKey);
    const rendered={id:'storage',mode:'steady',key:beforeKey};
    expect(render({id:'storage',currentKey:afterKey,response:rendered}).code).toBe('waiting');
    expect(render({id:'storage',currentKey:afterKey,response:{...rendered,key:afterKey}}).code).toBe('steady');
  }
  it('treats an equivalent recreated run as the same rendered conditions',()=>{
    const run=energy.simulate('storage',{capacity:200,power:80,initial:20,roundtrip:81},45);
    expect(key(JSON.parse(JSON.stringify(run)),45)).toBe(key(run,45));
  });
  it('invalidates an old frame when a different storage schedule changes current flow at the same minute',()=>{
    const settings={capacity:200,power:80,initial:20,roundtrip:81},minute=45;
    const before=energy.scenario('storage',settings,'evening').rows[minute].run;
    const after=energy.scenario('storage',settings,'interrupted').rows[minute].run;
    expect(before.available).toBeGreaterThan(0);expect(after.available).toBe(0);
    changedRun(before,after,minute);
  });
  it('invalidates an old bank gauge even when both schedules currently deliver identical power',()=>{
    const settings={capacity:500,power:25,initial:50,roundtrip:81},minute=210;
    const before=energy.scenario('storage',settings,'evening').rows[minute].run;
    const after=energy.scenario('storage',settings,'interrupted').rows[minute].run;
    expect(before.power).toBe(25);expect(after.power).toBe(before.power);expect(after.available).toBe(before.available);
    expect(after.extra.soc).not.toBe(before.extra.soc);
    changedRun(before,after,minute);
  });
  it('invalidates battery charge/discharge cues when microgrid demand changes at the selected minute',()=>{
    const input={source:'solarPv',sourceSettings:{irradiance:1000,area:20,efficiency:20,incidence:0},profileId:'steady',grid:'island',battery:{capacity:200,power:50,initial:80,roundtrip:81}},minute=30;
    const before=microgrid.simulate({...input,demand:2}).rows[minute].batteryRun;
    const after=microgrid.simulate({...input,demand:20}).rows[minute].batteryRun;
    expect(before.available).toBeGreaterThan(0);expect(before.power).toBe(0);
    expect(after.power).toBeGreaterThan(0);expect(after.available).toBe(0);
    changedRun(before,after,minute);
  });
});

describe('Response settling feedback without changing easing',()=>{
  it('eventually reports a smooth 25 to 0 degree transition settled without snapping its value',()=>{
    const api=responses();seed(api,'temperature',25);
    let result=step(api,'temperature',0,.1);expect(api.settling()).toBe(true);expect(result.value).toBeGreaterThan(0);
    for(let i=1;i<30;i++)result=step(api,'temperature',0,.1);
    expect(api.settling()).toBe(false);expect(result.value).toBeGreaterThan(0);
    nearRelative(result.value,25*Math.exp(-3/.3));
  });
  it.each([[1e-15,2e-15],[2e-15,0]])('does not apply a large absolute tolerance to a tiny channel %s to %s',(initial,target)=>{
    const api=responses();seed(api,'tiny',initial);
    let result=step(api,'tiny',target,.01,.4);expect(api.settling()).toBe(true);
    for(let i=0;i<200;i++)result=step(api,'tiny',target,.02,.4);
    expect(api.settling()).toBe(false);
    nearRelative(result.value,target+(initial-target)*Math.exp(-4.01/.4));
  });
  it('resets the reporting scale for a small new transition after a large transition has settled',()=>{
    const api=responses();seed(api,'changed-target',1);
    let result;for(let i=0;i<80;i++)result=step(api,'changed-target',0,.1,1);
    expect(api.settling()).toBe(false);
    const tinyStart=result.value;
    result=step(api,'changed-target',tinyStart*2,.01,1);
    expect(api.settling()).toBe(true);
    nearRelative(result.value,2*tinyStart-tinyStart*Math.exp(-.01));
    for(let i=0;i<80;i++)result=step(api,'changed-target',0,.1,1);
    expect(api.settling()).toBe(false);expect(result.value).toBeGreaterThan(0);
  });
  it.each([[3,8,.26],[25,0,.3],[-20,65,.3]])('preserves analytic value and integrated motion for %s to %s',(initial,target,tau)=>{
    const duration=1.2,expectedValue=target+(initial-target)*Math.exp(-duration/tau);
    const expectedIntegral=target*duration+(initial-target)*tau*(1-Math.exp(-duration/tau));
    const results=[30,60].map(fps=>{
      const api=responses();seed(api,'analytic',initial);let integral=0,result;
      for(let i=0;i<duration*fps;i++){result=step(api,'analytic',target,1/fps,tau);integral+=result.delta;}
      nearRelative(result.value,expectedValue);nearRelative(integral,expectedIntegral);
      expect(result.target).toBe(target);return {value:result.value,integral};
    });
    nearRelative(results[0].value,results[1].value);nearRelative(results[0].integral,results[1].integral);
  });
  it.each([{animate:false},{syncResponse:true}])('preserves immediate synchronization for %j',override=>{
    const api=responses();seed(api,'sync',25);
    const result=step(api,'sync',-10,.1,.3,false,override);
    expect(result.value).toBe(-10);expect(result.delta).toBe(-1);expect(api.settling()).toBe(false);
  });
  it('preserves immediate zero-stop behavior for motion and flow cues',()=>{
    const api=responses();seed(api,'stopping',2);
    const result=step(api,'stopping',0,.1,.3,true);
    expect(result.value).toBe(0);expect(result.delta).toBe(0);expect(api.settling()).toBe(false);
  });
  it('keeps the frame adjusting when any response channel is still changing',()=>{
    const api=responses();seed(api,'moving',1);seed(api,'fixed',2);api.beginFrame();
    api.response('moving',4,{...preview,dt:.01},.3,false);
    api.response('fixed',2,{...preview,dt:.01},.3,false);
    expect(api.settling()).toBe(true);
  });
});

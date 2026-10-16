import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)'),roots=[];
function helper(name){const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
function section(first,last){const start=source.indexOf(first),end=source.indexOf(last,start);if(start<0||end<0)throw Error('Missing model section '+first);return source.slice(start,end);}
const modelCode=section('function rnNumber(','function rnSettings(')+section('var RN_ENERGY_SPECS=','function rnEnergyPathway(');
const runModel=vm.runInNewContext(`(function(){${modelCode};return rnEnergyRun;})()`);
const helperCode=['material','mesh','box','cylinder','strut','flange','ball','pipe','ring','glow','response','cue','shape','driveMotion','particles','deformTube','rotor','generatorDetail','rotorResourceStreams','rotorPowerConnections'].map(helper).join('\n');
const branchStart=source.indexOf("var marine=id==='tidal';",sceneStart),branch=source.slice(branchStart,source.indexOf("}else if(id==='hydro'){",branchStart));
const tau=.42,cutoff=.001;

// The complete production branch consumes actual model runs. No copied visual
// equations substitute for the rotor, generator or power-stream updaters.
function fixture(id='wind'){
  const f=vm.runInNewContext(`(function(){
    var id=${JSON.stringify(id)},responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[],generatorFocus=null;
    ${helperCode}
    var scene=new THREE.Scene(),context=new THREE.Group(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group(),referencePower=1000;scene.add(context,A,B,C);
    var load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');function label(){}
    ${branch}
    [A,B,C].forEach(function(group,index){group.traverse(function(o){if(o.isMesh)o.userData.component=['resource','converter','generator'][index];});});
    function update(run,dt,options){options=options||{};responseSettling=false;var p={run:run,dt:dt||0,animate:options.animate!==false,syncResponse:!!options.syncResponse,selected:options.selected||'generator',inspection:{trace:!!options.trace,cutaway:!!options.cutaway}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);rotorWiring.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);return {coasting:driveMotion.coasting,settling:responseSettling};}
    function layout(exploded){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);});scene.updateMatrixWorld(true);rotorWiring.update();scene.updateMatrixWorld(true);}
    return {scene,A,B,C,blade,hub,nacelle,generator:generatorAssembly.rotor,wiring:rotorWiring,update,layout,responses};
  })()`,{THREE});roots.push(f.scene);return f;
}
function direct(){return vm.runInNewContext(`(function(){var responses={},responseSettling=false;${helper('response')} ${helper('driveMotion')}return {drive:driveMotion,step:function(object,target,dt,options){options=options||{};responseSettling=false;var result=driveMotion(object,'rotor-speed',target,{dt:dt,animate:options.animate!==false,syncResponse:!!options.syncResponse,run:{status:options.status||'Generating'}});return {result:result,settling:responseSettling,coasting:driveMotion.coasting,tracking:response.tracking};}}})()`);}
const shaft=()=>({rotation:{z:.73},userData:{}});
const marks=route=>route.group.children.filter(o=>/-marker-/.test(o.name));
const phases=f=>f.wiring.routes.map(route=>marks(route)[0].userData.progress);
function shared(f){expect(f.generator.rotation.z).toBe(f.blade.rotation.z);expect(f.generator.userData.motionRate).toBe(f.blade.userData.motionRate);expect(f.generator.userData.motionTarget).toBe(f.blade.userData.motionTarget);expect(f.generator.userData.coasting).toBe(f.blade.userData.coasting);}
function off(f,before){f.wiring.routes.forEach((route,index)=>{expect(marks(route)[0].userData.progress).toBe(before[index]);for(const object of route.group.children.filter(o=>/-marker-|-direction$/.test(o.name))){expect(object.visible).toBe(false);expect(object.userData.power).toBe(0);expect(object.userData.worldFlowRate).toBe(0);}});expect(f.wiring.indicator.material.emissiveIntensity).toBe(0);}
function freeze(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(value);}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe('Finite signed rotor coast',()=>{
  it.each([.96,-.24,1.8,-1.8])('integrates a signed %s rad/s coast only until its exact stopping time',rate=>{
    const f=direct(),object=shaft();f.step(object,rate,0);const initial=object.rotation.z,stop=tau*Math.log(Math.abs(rate)/cutoff);
    const first=f.step(object,0,stop*.4);expect(first.coasting).toBe(true);expect(first.result.coasting).toBe(true);expect(object.userData.coasting).toBe(true);expect(first.settling).toBe(true);
    expect(object.userData.motionRate).toBeCloseTo(rate*Math.exp(-stop*.4/tau),13);
    f.step(object,0,stop*.6+.8);expect(object.userData.motionRate).toBe(0);expect(object.userData.coasting).toBe(false);expect(object.rotation.z).toBeCloseTo(initial-tau*(rate-Math.sign(rate)*cutoff),13);
    const stopped=object.rotation.z;for(const dt of[0,.001,.5,10]){const end=f.step(object,0,dt);expect(object.rotation.z).toBe(stopped);expect(end.settling).toBe(false);expect(end.result.delta).toBe(0);expect(end.coasting).toBe(false);}
  });

  it.each([15,30,60,120])('has the same final phase at %i FPS, including a frame that straddles cessation',fps=>{
    for(const rate of[.96,-.24,.0011]){const whole=direct(),frames=direct(),a=shaft(),b=shaft();whole.step(a,rate,0);frames.step(b,rate,0);const duration=tau*Math.log(Math.abs(rate)/cutoff)+.173;whole.step(a,0,duration);let elapsed=0;while(elapsed<duration){const dt=Math.min(1/fps,duration-elapsed);frames.step(b,0,dt);elapsed+=dt;}expect(b.rotation.z).toBeCloseTo(a.rotation.z,12);expect(a.userData.motionRate).toBe(0);expect(b.userData.motionRate).toBe(0);}
  });

  it('preserves the same phase through irregular partitions before and after the stop boundary',()=>{
    const parts=[.001,.12,.007,.173,.29,.02,.8,.035,1.4,.63],whole=direct(),frames=direct(),a=shaft(),b=shaft();whole.step(a,-1.1,0);frames.step(b,-1.1,0);whole.step(a,0,parts.reduce((a,b)=>a+b,0));parts.forEach(dt=>frames.step(b,0,dt));expect(b.rotation.z).toBeCloseTo(a.rotation.z,13);expect(b.userData.motionRate).toBe(0);
  });

  it.each([.0009,.001,-.0009,-.001])('does not invent travel below the fixed illustrative cutoff at %s',rate=>{
    const f=direct(),object=shaft();f.step(object,rate,0);const before=object.rotation.z,result=f.step(object,0,0);expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(0);expect(result.coasting).toBe(false);expect(result.settling).toBe(false);expect(Math.abs(result.result.delta)).toBe(0);
  });

  it('keeps a pending zero-dt coast visible to the response reporter without changing its phase',()=>{
    const f=direct(),object=shaft();f.step(object,.0011,0);const before=object.rotation.z,result=f.step(object,0,0);expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(.0011);expect(result.coasting).toBe(true);expect(result.settling).toBe(true);expect(result.tracking.targets['rotor-speed']).toBe(0);expect(result.tracking.scales['rotor-speed']).toBe(.0011);
  });

  it.each([1,-1])('retargets a direction %s coast continuously into a nonzero reversal',sign=>{
    const f=direct(),object=shaft();f.step(object,sign*.8,0);f.step(object,0,.2);const before=object.rotation.z,rate=object.userData.motionRate,target=-sign*.6;
    f.step(object,target,0);expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(rate);expect(object.userData.coasting).toBe(false);
    f.step(object,target,.12);expect(object.userData.motionRate).toBeCloseTo(target+(rate-target)*Math.exp(-.12/tau),13);expect(before-object.rotation.z).toBeCloseTo(target*.12+(rate-target)*tau*(1-Math.exp(-.12/tau)),13);
  });

  it.each(['Sequence complete','Cycle complete','Scenario complete'])('forces complete status %s to rest even when passed a stale nonzero target',status=>{
    const f=direct(),object=shaft();f.step(object,.8,.1);const before=object.rotation.z,result=f.step(object,-.6,.1,{status});expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(0);expect(object.userData.motionTarget).toBe(0);expect(result.result.target).toBe(0);expect(result.coasting).toBe(false);
  });
});

describe('Wind and tidal model-driven coast and immediate electrical stop',()=>{
  it.each([['wind',8,2,'Below cut-in'],['wind',20,25,'Protective shutdown'],['tidal',2,0,'Slack water'],['tidal',-2,0,'Slack water']])('%s from speed %s coasts when %s gives %s without adding electrical energy',(id,startSpeed,endSpeed,status)=>{
    const f=fixture(id),running=freeze(runModel(id,{speed:startSpeed},0)),stopped=freeze(runModel(id,{speed:endSpeed},0)),snapshot=JSON.stringify(stopped);expect(stopped.power).toBe(0);expect(stopped.status).toBe(status);
    f.update(running,.1,{animate:false});const rate=f.blade.userData.motionRate,before=f.blade.rotation.z,flow=phases(f);const pending=f.update(stopped,0);expect(pending.coasting).toBe(true);expect(f.blade.rotation.z).toBe(before);expect(f.blade.userData.motionRate).toBe(rate);expect(f.blade.userData.motionTarget).toBe(0);off(f,flow);shared(f);
    f.update(stopped,.12);expect(f.blade.userData.motionRate).toBeCloseTo(rate*Math.exp(-.12/tau),13);expect(before-f.blade.rotation.z).toBeCloseTo(rate*tau*(1-Math.exp(-.12/tau)),13);off(f,flow);shared(f);expect(JSON.stringify(stopped)).toBe(snapshot);expect(runModel(id,{speed:endSpeed},0)).toEqual(stopped);
    f.update(stopped,4);expect(f.blade.userData.motionRate).toBe(0);expect(f.blade.userData.coasting).toBe(false);off(f,flow);shared(f);
  });

  it.each(['wind','tidal'])('%s initial no-resource view starts at rest with no invented coast',id=>{
    const f=fixture(id),state=f.update(runModel(id,{speed:0},0),.1);expect(f.blade.rotation.z).toBe(0);expect(f.blade.userData.motionRate).toBe(0);expect(state.coasting).toBe(false);shared(f);
  });

  it.each(['wind','tidal'])('%s holds phase and snaps rest on paused/reduced or synchronized controls',id=>{
    const f=fixture(id),running=runModel(id,{},0),stopped=runModel(id,{speed:0},0);
    for(const options of[{animate:false},{syncResponse:true}]){f.update(running,0,{animate:false});f.update(stopped,.12);const before=f.blade.rotation.z;f.update(stopped,0,options);expect(f.blade.rotation.z).toBe(before);expect(f.blade.userData.motionRate).toBe(0);expect(f.blade.userData.coasting).toBe(false);shared(f);f.update(stopped,.1,{animate:false});expect(f.blade.rotation.z).toBe(before);}
  });

  it.each(['wind','tidal'])('%s restarts from exact rest without resetting blade or generator pose',id=>{
    const f=fixture(id),running=runModel(id,{},0),stopped=runModel(id,{speed:0},0);f.update(running,0,{animate:false});const target=f.blade.userData.motionRate;f.update(stopped,4);const before=f.blade.rotation.z,flow=phases(f);f.update(running,0);expect(f.blade.rotation.z).toBe(before);expect(f.blade.userData.motionRate).toBe(0);expect(f.blade.userData.motionTarget).toBe(target);expect(f.blade.userData.coasting).toBe(false);expect(phases(f)).toEqual(flow);f.update(running,.1);expect(f.blade.userData.motionRate).toBeCloseTo(target*(1-Math.exp(-.1/tau)),13);shared(f);for(const route of f.wiring.routes)expect(marks(route)[0].userData.power).toBe(running.power);
  });

  it.each(['wind','tidal'])('%s keeps cutaway, trace, layout and retained buffers independent of coast',id=>{
    const f=fixture(id),running=runModel(id,{},0),stopped=runModel(id,{speed:0},0);f.update(running,.1,{animate:false});f.update(stopped,.12);const before=f.blade.rotation.z,rate=f.blade.userData.motionRate,saved=[];f.scene.traverse(o=>{if(o.geometry)saved.push({o,geometry:o.geometry,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,material:o.material});});
    for(const exploded of[true,false])for(const selected of['resource','converter','generator']){f.layout(exploded);f.update(stopped,0,{cutaway:true,trace:true,selected});expect(f.blade.rotation.z).toBe(before);expect(f.blade.userData.motionRate).toBe(rate);expect(f.blade.userData.coasting).toBe(true);shared(f);}
    for(const entry of saved){expect(entry.o.geometry).toBe(entry.geometry);expect(entry.o.material).toBe(entry.material);expect(entry.geometry.attributes.position).toBe(entry.position);expect(entry.geometry.attributes.normal).toBe(entry.normal);}
  });

  it.each(['Sequence complete','Cycle complete','Scenario complete'])('completion %s halts an ongoing coast immediately without advancing the shared drivetrain',status=>{
    for(const id of['wind','tidal']){const f=fixture(id),running=runModel(id,{},0),stopped=runModel(id,{speed:0},0);f.update(running,0,{animate:false});f.update(stopped,.1);const before=f.blade.rotation.z,flow=phases(f);f.update({...stopped,status},.12);expect(f.blade.rotation.z).toBe(before);expect(f.blade.userData.motionRate).toBe(0);expect(f.blade.userData.coasting).toBe(false);shared(f);off(f,flow);}
  });
});

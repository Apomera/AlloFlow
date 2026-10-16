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
const runStorage=vm.runInNewContext(`(function(){${modelCode};return function(settings,minute){return rnEnergyRun('storage',settings,minute);};})()`);
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','motion','cue','particles','cabinet','deformTube','storageBus','storageTransferIndicator','storageConnections','storageRackModules','storageCooling'].map(helper).join('\n');
const branchStart=source.indexOf('var storageSupply=',sceneStart),branchEnd=source.indexOf('Object.keys(groups).forEach',branchStart),branch=source.slice(branchStart,source.lastIndexOf('}',branchEnd));

// Run the complete storage assembly and real selected-minute energy model.
// Only WebGL rendering and screen-space labels are omitted.
function fixture(){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
    var load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');function label(){}
    ${branch}
    [A,B,C].forEach(function(group,index){group.traverse(function(o){if(o.isMesh)o.userData.component=['resource','converter','generator'][index];});});
    function update(run,dt,animate,syncResponse,trace,selected){var p={run:run,dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,selected:selected||'resource',inspection:{trace:!!trace,cutaway:false}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);storageWiring.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);storageWiring.update();scene.updateMatrixWorld(true);}
    return {scene,A,B,C,update,layout,wiring:storageWiring,supply:storageSupply,inverter:storageInverter,responses};
  })()`,{THREE});
  f.cooling=['charge','discharge'].map(key=>f.scene.getObjectByName('energy-storage-'+key+'-cooling'));
  f.fans=f.cooling.map(group=>group.getObjectByName(group.name+'-fan'));
  f.air=f.cooling.map(group=>group.getObjectByName(group.name+'-air'));
  f.marks=f.air.map(air=>air.children.filter(o=>o.name.includes('-air-mark-')));
  roots.push(f.scene);return f;
}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function world(object){return object.getWorldPosition(new THREE.Vector3());}
function lossRate(run,index){const eta=Math.sqrt(run.settings.roundtrip/100);return index===0?run.available*(1-eta):run.power*(1/eta-1);}
function fanRate(run,index){return .9*Math.sqrt(lossRate(run,index)/2.5);}
function immutable(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')immutable(v);});return Object.freeze(value);}
function parts(object){const result=[];object.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function poses(objects){return objects.map(o=>({position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray()}));}
function advance(before,after){return ((after-before)%1+1)%1;}
const cases=[{key:'charge',index:0,minute:30,stage:'resource',stageIndex:0},{key:'discharge',index:1,minute:75,stage:'generator',stageIndex:2}];

afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe.each(cases)('Storage $key outlet airflow',c=>{
  const run=settings=>runStorage({capacity:500,initial:40,power:80,roundtrip:81,...settings},c.minute);

  it('attaches eight marks in four equally spaced lanes to its existing guarded fan',()=>{
    const f=fixture(),air=f.air[c.index],marks=f.marks[c.index];f.update(run(),0,false);
    expect(air.parent).toBe(f.cooling[c.index]);expect(marks).toHaveLength(8);expect(new Set(marks.map(m=>m.userData.lane)).size).toBe(4);
    expect(air.userData.cueMode).toBe('cooling-activity');expect(air.userData.travelLength).toBeCloseTo(Math.hypot(.68,.095*.55,.095*.55),12);expect(air.userData.baseZ).toBe(.31);expect(air.userData.depthLength).toBe(.68);
    for(let lane=0;lane<4;lane++){const pair=marks.filter(m=>m.userData.lane===lane);expect(pair).toHaveLength(2);expect(pair[1].userData.offset-pair[0].userData.offset).toBe(.5);expect(advance(pair[0].userData.progress,pair[1].userData.progress)).toBe(.5);}
    expect(f.fans[c.index].parent).toBe(f.cooling[c.index]);expect(f.cooling[c.index].parent).toBe(c.index===0?f.A:f.C);
  });

  it('matches the derivative of cumulative conversion loss and travels exactly half the fan angle',()=>{
    const f=fixture(),r=run(),air=f.air[c.index],fan=f.fans[c.index];f.update(r,0,false);const phase=air.userData.progress,angle=fan.rotation.z;f.update(r,.2,true);
    const next=runStorage(r.settings,c.minute+.001),derivative=(next.extra.loss-r.extra.loss)*60/.001;
    expect(air.userData.conversionLoss).toBeCloseTo(derivative,7);expect(air.userData.conversionLoss).toBeCloseTo(lossRate(r,c.index),12);expect(air.userData.worldFlowRate).toBeCloseTo(.5*fanRate(r,c.index),12);expect(air.userData.targetWorldFlowRate).toBeCloseTo(.5*fan.userData.motionTarget,12);
    expect(advance(phase,air.userData.progress)*air.userData.travelLength).toBeCloseTo(.5*(angle-fan.rotation.z),12);expect(f.air[1-c.index].visible).toBe(false);expect(f.air[1-c.index].userData.worldFlowRate).toBe(0);
  });

  it('keeps every arrow and tail clear of the fan guard, cabinet and adjacent equipment throughout travel',()=>{
    const f=fixture(),air=f.air[c.index],r=run(),origin=world(f.cooling[c.index]);f.update(r,0,false);
    for(let i=0;i<24;i++){f.update(r,air.userData.travelLength/(24*air.userData.worldFlowRate),false);for(const mark of f.marks[c.index]){const b=bounds(mark);expect(b.min.z-(origin.z+.143)).toBeGreaterThan(.03);expect(b.max.z-origin.z).toBeLessThan(1.05);expect(Math.max(Math.abs(b.min.x-origin.x),Math.abs(b.max.x-origin.x))).toBeLessThan(.19);expect(Math.max(Math.abs(b.min.y-origin.y),Math.abs(b.max.y-origin.y))).toBeLessThan(.19);}}
  });

  it('aims every arrow along its gently spreading path and fades at both ends',()=>{
    const f=fixture(),air=f.air[c.index],marks=f.marks[c.index];f.update(run(),0,false);
    for(const mark of marks){const t=mark.userData.progress,sx=mark.userData.lane%2?1:-1,sy=mark.userData.lane>=2?1:-1,direction=new THREE.Vector3(sx*.095*.55,sy*.095*.55,.68).normalize(),axis=new THREE.Vector3(0,1,0).applyQuaternion(mark.quaternion);
      expect(axis.distanceTo(direction)).toBeLessThan(1e-12);expect(mark.position.x).toBeCloseTo(sx*.095*(1+.55*t),12);expect(mark.position.y).toBeCloseTo(sy*.095*(1+.55*t),12);expect(mark.position.z).toBeCloseTo(.31+.68*t,12);
      const opacity=.72*Math.min(1,t/.18,(1-t)/.22);expect(mark.userData.markerOpacity).toBeCloseTo(opacity,12);for(const part of mark.children)expect(part.material.opacity).toBeCloseTo(opacity,12);
    }
    expect(marks[0].userData.markerOpacity).toBe(0);expect(marks[1].userData.markerOpacity).toBe(.72);expect(marks.at(-1).userData.markerOpacity).toBeLessThan(.72);expect(air.visible).toBe(true);
  });

  it('shares the exact fan response integral during control changes without an additional airflow lag',()=>{
    const f=fixture(),air=f.air[c.index],fan=f.fans[c.index],low=run({power:20,roundtrip:64}),high=run({power:160,roundtrip:64});f.update(low,0,false);const rate=air.userData.worldFlowRate,phase=air.userData.progress,angle=fan.rotation.z,target=.5*fanRate(high,c.index);
    f.update(high,0,true);expect(air.userData.conversionLoss).toBeCloseTo(lossRate(high,c.index),12);expect(air.userData.worldFlowRate).toBe(rate);expect(air.userData.progress).toBe(phase);expect(air.userData.targetWorldFlowRate).toBeCloseTo(target,12);
    f.update(high,.1,true);expect(air.userData.worldFlowRate).toBeCloseTo(target+(rate-target)*Math.exp(-.1/.4),12);expect(air.userData.worldFlowRate).toBeCloseTo(.5*fan.userData.motionRate,12);expect(advance(phase,air.userData.progress)*air.userData.travelLength).toBeCloseTo(.5*(angle-fan.rotation.z),12);
    expect(Object.keys(f.responses).some(key=>/air/.test(key))).toBe(false);
  });

  it('responds to current efficiency losses while capacity and SOC do not create extra cooling',()=>{
    const f=fixture(),air=f.air[c.index],low=run({roundtrip:64}),high=run({roundtrip:96});f.update(low,0,false);const before=air.userData.worldFlowRate;f.update(high,0,false);expect(air.userData.worldFlowRate).toBeLessThan(before);const efficient=air.userData.worldFlowRate;
    for(const settings of[{capacity:400},{initial:65}]){const changed=run({...high.settings,...settings});expect(changed.extra.soc).not.toBe(high.extra.soc);f.update(changed,0,false);expect(air.userData.worldFlowRate).toBeCloseTo(efficient,12);expect(air.userData.conversionLoss).toBeCloseTo(lossRate(high,c.index),12);}
  });

  it('holds phase on paused edits and sync, then advances only the requested manual step',()=>{
    const f=fixture(),air=f.air[c.index],fan=f.fans[c.index],low=run({power:20}),high=run({power:160});f.update(low,.2,true);const phase=air.userData.progress,angle=fan.rotation.z,pose=poses(f.marks[c.index]);
    f.update(high,0,true);expect(air.userData.progress).toBe(phase);expect(poses(f.marks[c.index])).toEqual(pose);f.update(high,0,false);expect(air.userData.worldFlowRate).toBeCloseTo(.5*fanRate(high,c.index),12);expect(air.userData.progress).toBe(phase);
    f.update(low,0,true,true);expect(air.userData.worldFlowRate).toBeCloseTo(.5*fanRate(low,c.index),12);expect(air.userData.progress).toBe(phase);f.update(low,.08,false,true);expect(advance(phase,air.userData.progress)*air.userData.travelLength).toBeCloseTo(.5*(angle-fan.rotation.z),12);
    const stepped=air.userData.progress,steppedPose=poses(f.marks[c.index]);for(let i=0;i<4;i++)f.update(low,0,false);expect(air.userData.progress).toBe(stepped);expect(poses(f.marks[c.index])).toEqual(steppedPose);
  });

  it('stops immediately at ideal efficiency and restarts from the retained air phase',()=>{
    const f=fixture(),air=f.air[c.index],fan=f.fans[c.index],r=run();f.update(r,.2,true);const phase=air.userData.progress,angle=fan.rotation.z;f.update(run({roundtrip:100}),.2,true);
    expect(air.visible).toBe(false);expect(air.userData.worldFlowRate).toBe(0);expect(air.userData.progress).toBe(phase);expect(fan.rotation.z).toBe(angle);expect(f.marks[c.index].every(m=>!m.visible&&m.userData.markerOpacity===0)).toBe(true);
    f.update(r,0,true);expect(air.visible).toBe(true);expect(air.userData.worldFlowRate).toBe(0);expect(air.userData.progress).toBe(phase);f.update(r,.1,true);
    expect(air.userData.worldFlowRate).toBeCloseTo(.5*fanRate(r,c.index)*(1-Math.exp(-.1/.4)),12);expect(advance(phase,air.userData.progress)*air.userData.travelLength).toBeCloseTo(.5*(angle-fan.rotation.z),12);
  });

  it('matches fan angle, airflow phase and marker poses across frame rates and slow playback',()=>{
    const a=fixture(),b=fixture(),d=fixture(),low=run({power:20}),high=run({power:160});for(const f of[a,b,d])f.update(low,0,false);a.update(high,.6,true);for(let i=0;i<30;i++)b.update(high,.02,true);for(let i=0;i<60;i++)d.update(high,.01,true);
    for(const f of[b,d]){expect(f.air[c.index].userData.worldFlowRate).toBeCloseTo(a.air[c.index].userData.worldFlowRate,11);expect(f.air[c.index].userData.progress).toBeCloseTo(a.air[c.index].userData.progress,11);expect(f.fans[c.index].rotation.z).toBeCloseTo(a.fans[c.index].rotation.z,11);f.marks[c.index].forEach((mark,i)=>expect(mark.position.distanceTo(a.marks[c.index][i].position)).toBeLessThan(1e-11));}
  });

  it('changes only brightness when its stage is emphasized or put in context',()=>{
    const f=fixture(),air=f.air[c.index],r=run();f.update(r,.15,true);const phase=air.userData.progress,pose=poses(f.marks[c.index]),normal=f.marks[c.index].map(m=>m.userData.markerOpacity);
    f.update(r,0,true,false,true,'converter');expect(air.userData.traceState).toBe('context');expect(poses(f.marks[c.index])).toEqual(pose);f.marks[c.index].forEach((m,i)=>{expect(m.userData.markerOpacity).toBeLessThan(normal[i]);expect(m.userData.traceState).toBe('context');});
    f.update(r,0,true,false,true,c.stage);expect(air.userData.traceState).toBe('selected');expect(poses(f.marks[c.index])).toEqual(pose);expect(air.userData.progress).toBe(phase);f.marks[c.index].forEach((m,i)=>{expect(m.userData.markerOpacity).toBeGreaterThan(normal[i]);expect(m.scale.toArray()).toEqual([1,1,1]);expect(m.userData.traceState).toBe('selected');});
  });
});

describe('Storage airflow lifecycle and assembly',()=>{
  it.each(['Sequence complete','Cycle complete','Scenario complete'])('stops both air outlets at %s despite retained positive power',status=>{
    const f=fixture();f.update(runStorage({capacity:500,initial:40},30),.2,true);f.update(runStorage({capacity:500,initial:40},75),.2,true);const phases=f.air.map(a=>a.userData.progress),angles=f.fans.map(fan=>fan.rotation.z),r=runStorage({capacity:500,initial:40},30);
    f.update({...r,power:50,status},.2,true);f.air.forEach((air,i)=>{expect(air.visible).toBe(false);expect(air.userData.worldFlowRate).toBe(0);expect(air.userData.targetWorldFlowRate).toBe(0);expect(air.userData.conversionLoss).toBe(0);expect(air.userData.progress).toBe(phases[i]);expect(f.fans[i].rotation.z).toBe(angles[i]);expect(f.marks[i].every(m=>!m.visible&&m.userData.markerOpacity===0)).toBe(true);});
  });

  it.each([['full',{initial:100},0],['empty',{capacity:10,power:200},100],['zero transfer',{power:0},30],['completed real cycle',{},120]])('preserves both phases with no airflow when the bank is %s',(_,settings,minute)=>{
    const f=fixture();f.update(runStorage({capacity:500,initial:40},30),.2,true);f.update(runStorage({capacity:500,initial:40},75),.2,true);const phases=f.air.map(a=>a.userData.progress),angles=f.fans.map(fan=>fan.rotation.z);f.update(runStorage(settings,minute),.2,true);
    f.air.forEach((air,i)=>{expect(air.userData.progress).toBe(phases[i]);expect(air.visible).toBe(false);expect(air.userData.worldFlowRate).toBe(0);expect(f.fans[i].rotation.z).toBe(angles[i]);});
  });

  it('retains independent charge and discharge phases when the selected minute changes',()=>{
    const f=fixture(),settings={capacity:500,initial:40,power:80,roundtrip:81},charge=runStorage(settings,30),discharge=runStorage(settings,75);f.update(charge,.2,true);const a=f.air[0].userData.progress;expect(a).toBeGreaterThan(0);expect(f.air[1].userData.progress).toBe(0);
    f.update(discharge,.2,true);const b=f.air[1].userData.progress;expect(b).toBeGreaterThan(0);expect(f.air[0].userData.progress).toBe(a);expect(f.air[0].visible).toBe(false);
    f.update(charge,0,true);expect(f.air[0].userData.progress).toBe(a);expect(f.air[1].userData.progress).toBe(b);expect(f.air[0].visible).toBe(true);expect(f.air[1].visible).toBe(false);f.update(charge,.1,true);expect(f.air[1].userData.progress).toBe(b);
  });

  it('moves each outlet with its cabinet without changing travel in exploded or isolated views',()=>{
    const f=fixture(),settings={capacity:500,initial:40,power:80};
    for(const c of cases){const r=runStorage(settings,c.minute);f.layout(false,null);f.update(r,.2,true);const air=f.air[c.index],phase=air.userData.progress,pose=poses(f.marks[c.index]),rate=air.userData.worldFlowRate;
      for(const isolated of[0,1,2,null]){f.layout(true,isolated);f.update(r,0,true);expect(visible(air)).toBe(isolated==null||isolated===c.stageIndex);expect(air.userData.progress).toBe(phase);expect(poses(f.marks[c.index])).toEqual(pose);expect(air.userData.worldFlowRate).toBe(rate);}
      const angle=f.fans[c.index].rotation.z;f.update(r,.1,true);expect(advance(phase,air.userData.progress)*air.userData.travelLength).toBeCloseTo(.5*(angle-f.fans[c.index].rotation.z),12);
    }
  });

  it('reuses all air buffers and preserves exact immutable model values through controls and layout',()=>{
    const f=fixture(),r=immutable(runStorage({capacity:500,initial:40,power:80,roundtrip:81},75)),exact=JSON.stringify(r);f.update(r,0,false);const saved=f.air.flatMap(parts).map(o=>({o,geometry:o.geometry,position:o.geometry.attributes.position,array:o.geometry.attributes.position.array,normal:o.geometry.attributes.normal,normalArray:o.geometry.attributes.normal.array,index:o.geometry.index,indexArray:o.geometry.index.array,material:o.material}));
    for(let i=0;i<12;i++){f.layout(i%2===0,null);f.update(r,.05,true,false,true,i%2?'generator':'resource');}expect(JSON.stringify(r)).toBe(exact);
    for(const v of saved){expect(v.o.geometry).toBe(v.geometry);expect(v.geometry.attributes.position).toBe(v.position);expect(v.position.array).toBe(v.array);expect(v.geometry.attributes.normal).toBe(v.normal);expect(v.normal.array).toBe(v.normalArray);expect(v.geometry.index).toBe(v.index);expect(v.index.array).toBe(v.indexArray);expect(v.o.material).toBe(v.material);}
  });

  it('shows electrical transfer at ideal efficiency while both cooling outlets are stopped',()=>{
    const f=fixture();for(const minute of[30,75]){const r=runStorage({capacity:500,initial:40,power:80,roundtrip:100},minute);f.update(r,.2,true);expect(r.available+r.power).toBe(80);expect(f.air.every(a=>!a.visible&&a.userData.worldFlowRate===0)).toBe(true);expect(f.wiring.routes.some(route=>route.group.children.some(o=>/-marker-/.test(o.name)&&o.visible))).toBe(true);}
  });

  it('keeps fixed-size air glyphs shadow-free and softly transparent through power and trace changes',()=>{
    const f=fixture();for(const minute of[30,75])for(const power of[5,200])for(const selected of['resource','converter','generator']){f.update(runStorage({capacity:500,initial:40,power,roundtrip:50},minute),.03,false,false,true,selected);
      for(const air of f.air)for(const part of parts(air)){expect(part.castShadow).toBe(false);expect(part.receiveShadow).toBe(false);expect(part.material.transparent).toBe(true);expect(part.material.depthWrite).toBe(false);expect(part.scale.toArray()).toEqual([1,1,1]);expect(part.material.opacity).toBeGreaterThanOrEqual(0);expect(part.material.opacity).toBeLessThanOrEqual(.92);}
    }
  });
});

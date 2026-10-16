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
const runGeo=vm.runInNewContext(`(function(){${modelCode};return function(settings){return rnEnergyRun('geothermal',settings,0);};})()`);
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','motion','cue','particles','deformTube','valve','waveAnnulus','rotor','runner','runnerReference','generatorDetail','geothermalWells','geothermalCircuit','geothermalDrivetrain','geothermalCooling','electricity'].map(helper).join('\n');
const branchStart=source.indexOf("}else if(id==='geothermal'){",sceneStart),branchEnd=source.indexOf("}else if(id==='solarThermal'){",branchStart),branch=source.slice(branchStart+"}else if(id==='geothermal'){".length,branchEnd);

// Exercise the actual geothermal branch, exact energy model and real meshes.
// The fixture only omits WebGL rendering and canvas labels.
function fixture(){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[],generatorFocus=null,referencePower=2515;
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);function label(){}
    ${branch}
    [A,B,C].forEach(function(group,index){group.traverse(function(o){if(o.isMesh)o.userData.component=['resource','converter','generator'][index];});});
    function update(run,dt,animate,syncResponse,trace,selected){var p={run:run,dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,selected:selected||'generator',inspection:{trace:!!trace,cutaway:false}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);geothermalPrimary.update();geothermalLoop.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);geothermalPrimary.update();geothermalLoop.update();scene.updateMatrixWorld(true);}
    return {scene,A,B,C,update,layout,fan:coolingFan,cooling:geoCooling,driver:rotorGeo,drive:geoDrive,loop:geothermalLoop,primary:geothermalPrimary,condenser};
  })()`,{THREE});
  roots.push(f.scene);return f;
}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function world(object){return object.getWorldPosition(new THREE.Vector3());}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function rejected(run){return Math.max(0,run.available-run.power);}
function rate(run){return .9*Math.sqrt(rejected(run)/15877);}
function immutable(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')immutable(v);});return Object.freeze(value);}
function vertices(object){const result=[];object.updateMatrixWorld(true);object.traverse(node=>{if(!node.geometry)return;const points=node.geometry.attributes.position;for(let i=0;i<points.count;i++)result.push(new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(node.matrixWorld));});return result;}
function expectRoutesAttached(f){for(const route of f.loop.routes){expect(route.group.localToWorld(route.curve.getPointAt(0)).distanceTo(world(route.from))).toBeLessThan(1e-12);expect(route.group.localToWorld(route.curve.getPointAt(1)).distanceTo(world(route.to))).toBeLessThan(1e-12);}}

afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe('Geothermal condenser cooling assembly',()=>{
  it('mounts a five-bladed axial fan above the condenser on its vertical exhaust axis',()=>{
    const f=fixture();f.update(runGeo({}),0,false);expect(world(f.fan).distanceTo(new THREE.Vector3(3.9,1.93,-2))).toBeLessThan(1e-12);
    const axis=new THREE.Vector3(0,0,1).applyQuaternion(f.fan.getWorldQuaternion(new THREE.Quaternion()));expect(axis.distanceTo(new THREE.Vector3(0,1,0))).toBeLessThan(1e-12);
    expect(f.fan.parent.parent).toBe(f.condenser);
    expect(f.cooling.group).toBe(f.fan.parent);expect(f.cooling.marks).toHaveLength(12);
    const blades=[];f.fan.traverse(o=>{if(/^energy-geothermal-fan-blade-/.test(o.name))blades.push(o);});expect(blades).toHaveLength(5);
  });

  it('keeps the swept fan inside its open shroud and clear of the condenser and guard',()=>{
    const f=fixture();f.update(runGeo({}),0,false);const {shroud,guard}=f.cooling,top=bounds(f.condenser).max.y;
    // Condenser bounds include its attached fan; use the actual vessel geometry.
    f.condenser.geometry.computeBoundingBox();const vesselTop=f.condenser.localToWorld(f.condenser.geometry.boundingBox.max.clone()).y,guardMin=bounds(guard).min.y,center=world(f.fan),inner=shroud.userData.innerRadius;
    expect(top).toBeGreaterThan(vesselTop);expect(bounds(shroud).min.y).toBeLessThan(vesselTop);expect(bounds(shroud).max.y).toBeGreaterThan(vesselTop);
    for(let pose=0;pose<24;pose++){f.fan.rotation.z=pose*Math.PI/12;f.scene.updateMatrixWorld(true);for(const point of vertices(f.fan)){expect(inner-Math.hypot(point.x-center.x,point.z-center.z)).toBeGreaterThan(.035);expect(point.y-vesselTop).toBeGreaterThan(.10);expect(guardMin-point.y).toBeGreaterThan(.10);}}
    expect(bounds(f.cooling.axle).min.y).toBeCloseTo(center.y,7);expect(bounds(f.cooling.axle).max.y).toBeCloseTo(world(f.cooling.bearing).y,7);
  });

  it('keeps guard, bearing, shroud and condenser fixed while the fan turns',()=>{
    const f=fixture(),run=runGeo({});f.update(run,0,false);const parts=[f.cooling.shroud,f.cooling.guard,f.cooling.bearing,f.cooling.axle,f.condenser],poses=parts.map(p=>p.matrixWorld.clone()),angle=f.fan.rotation.z;
    f.update(run,.25,true);expect(f.fan.rotation.z).toBeLessThan(angle);parts.forEach((part,i)=>expect(part.matrixWorld.equals(poses[i])).toBe(true));
  });

  it('renders four fixed-width upward lanes clear of the guard, with soft endpoints and no shadows',()=>{
    const f=fixture();f.update(runGeo({}),0,false);const {air,marks,guard}=f.cooling,guardTop=bounds(guard).max.y;
    expect(air.userData.travelLength).toBe(1.02);expect(air.userData.baseY).toBe(1.48);expect(air.userData.cueMode).toBe('cooling-activity');
    expect(new Set(marks.map(m=>m.object.userData.lane)).size).toBe(4);
    for(const {object:mark,x,z}of marks){expect(mark.position.x).toBe(x);expect(mark.position.z).toBe(z);expect(Math.abs(x)).toBe(.23);expect(Math.abs(z)).toBe(.23);expect(bounds(mark).min.y-guardTop).toBeGreaterThan(.02);
      const t=mark.userData.progress,expected=.7*Math.min(1,t/.16,(1-t)/.20);expect(mark.userData.markerOpacity).toBeCloseTo(expected,12);expect(mark.position.y).toBeCloseTo(1.48+t*1.02,12);
      for(const part of mark.children){expect(part.castShadow).toBe(false);expect(part.receiveShadow).toBe(false);expect(part.material.depthWrite).toBe(false);expect(part.material.transparent).toBe(true);expect(part.material.opacity).toBeCloseTo(expected,12);}
      const arrow=mark.children.find(o=>o.geometry.type==='ConeGeometry'),axis=new THREE.Vector3(0,1,0).applyQuaternion(arrow.getWorldQuaternion(new THREE.Quaternion()));expect(axis.distanceTo(new THREE.Vector3(0,1,0))).toBeLessThan(1e-12);
    }
  });

  it('advances outlet air using exactly the fan response integral without a second easing clock',()=>{
    const f=fixture(),low=runGeo({flow:10}),high=runGeo({flow:90});f.update(low,0,false);const start=f.cooling.air.userData.progress,angle=f.fan.rotation.z;f.update(high,.16,true);
    const distance=(angle-f.fan.rotation.z)*.7/.9,expected=((start+distance/1.02)%1+1)%1;expect(f.cooling.air.userData.progress).toBeCloseTo(expected,12);expect(f.cooling.air.userData.worldFlowRate).toBeCloseTo(f.fan.userData.motionRate*.7/.9,12);expect(f.cooling.air.userData.targetWorldFlowRate).toBeCloseTo(rate(high)*.7/.9,12);
    expect(f.cooling.air.userData.rejectedHeat).toBe(rejected(high));expect(f.cooling.group.userData.rejectedHeat).toBe(rejected(high));for(const {object:mark}of f.cooling.marks)expect(mark.userData.worldFlowRate).toBe(f.cooling.air.userData.worldFlowRate);
  });

  it('emphasizes the selected cooling stage without changing arrow size, spacing or motion',()=>{
    const f=fixture(),run=runGeo({});f.update(run,.2,true);const angle=f.fan.rotation.z,phase=f.cooling.air.userData.progress,speed=f.cooling.air.userData.worldFlowRate,marks=f.cooling.marks.map(m=>m.object),positions=marks.map(m=>m.position.clone()),colors=marks.map(m=>m.children[0].material.color.clone()),scales=marks.map(m=>m.scale.clone());
    for(const [selected,trace,state,factor,emissive]of[['converter',true,'context',.32,.04],['generator',true,'selected',.85,.8],['generator',false,'normal',.7,.18]]){
      f.update(run,0,true,false,trace,selected);expect(f.cooling.air.userData.traceState).toBe(state);expect(f.fan.rotation.z).toBe(angle);expect(f.cooling.air.userData.progress).toBe(phase);expect(f.cooling.air.userData.worldFlowRate).toBe(speed);
      marks.forEach((mark,i)=>{expect(mark.userData.traceState).toBe(state);expect(mark.position.equals(positions[i])).toBe(true);expect(mark.scale.equals(scales[i])).toBe(true);const t=mark.userData.progress,expected=factor*Math.min(1,t/.16,(1-t)/.20);for(const part of mark.children){expect(part.material.opacity).toBeCloseTo(expected,12);expect(part.material.emissiveIntensity).toBe(emissive);const color=colors[i].clone().multiplyScalar(state==='context'?.32:1);expect(part.material.color.equals(color)).toBe(true);}});
    }
  });

  it('hides outlet cues in completed scenarios without inventing residual airflow',()=>{
    const f=fixture(),run=runGeo({});f.update(run,.2,true);const phase=f.cooling.air.userData.progress;
    for(const status of['Sequence complete','Cycle complete','Scenario complete']){f.update({...run,status},.2,true);expect(f.cooling.air.visible).toBe(false);expect(f.cooling.air.userData.progress).toBe(phase);expect(f.cooling.air.userData.worldFlowRate).toBe(0);expect(f.cooling.air.userData.targetWorldFlowRate).toBe(0);expect(f.cooling.marks.every(m=>!m.object.visible)).toBe(true);}
  });

  it.each([['flow',{flow:80}],['produced temperature',{hot:260}],['reinjection temperature',{returnTemp:40}],['utilization',{utilization:55}]])('smoothly responds to actual rejected heat when %s changes',(_name,settings)=>{
    const f=fixture(),low=runGeo({}),high=runGeo(settings),initial=rate(low),target=rate(high);expect(target).not.toBe(initial);f.update(low,0,false);const angle=f.fan.rotation.z;
    f.update(high,0,true);expect(f.fan.rotation.z).toBe(angle);expect(f.fan.userData.motionRate).toBeCloseTo(initial,12);expect(f.fan.userData.rejectedHeat).toBe(rejected(high));
    f.update(high,.4,true);expect(f.fan.userData.motionRate).toBeCloseTo(target+(initial-target)*Math.exp(-1),12);expect(angle-f.fan.rotation.z).toBeCloseTo(target*.4+(initial-target)*.4*(1-Math.exp(-1)),12);
    expect(Math.abs(f.fan.userData.motionRate-target)).toBeLessThan(Math.abs(initial-target));
  });

  it('reduces cooling while increasing generator motion at fixed incoming heat',()=>{
    const f=fixture(),low=runGeo({utilization:10}),high=runGeo({utilization:55});f.update(low,0,false);const fan=f.fan.userData.motionRate,shaft=f.driver.userData.motionRate;
    expect(low.available).toBe(high.available);f.update(high,0,false);expect(f.fan.userData.motionRate).toBeLessThan(fan);expect(f.driver.userData.motionRate).toBeGreaterThan(shaft);expect(f.fan.userData.rejectedHeat).toBe(high.available-high.power);
    for(const route of f.loop.routes)expect(route.group.userData.drivingHeat).toBe(high.available);
  });

  it.each([['no circulation',{flow:0}],['no temperature drop',{hot:75,returnTemp:100}]])('stops immediately at %s and resumes without resetting phase',(_name,settings)=>{
    const f=fixture();f.update(runGeo({}),.2,true);const angle=f.fan.rotation.z,phase=f.cooling.air.userData.progress,zero=runGeo(settings);expect(rejected(zero)).toBe(0);f.update(zero,.2,true);expect(f.fan.rotation.z).toBe(angle);expect(f.fan.userData.motionRate).toBe(0);expect(f.fan.userData.rejectedHeat).toBe(0);
    expect(f.cooling.air.userData.progress).toBe(phase);expect(f.cooling.air.visible).toBe(false);expect(f.cooling.air.userData.worldFlowRate).toBe(0);expect(f.cooling.marks.every(m=>!m.object.visible&&m.object.userData.markerOpacity===0)).toBe(true);
    f.update(runGeo({}),.02,true);expect(f.fan.rotation.z).toBeLessThan(angle);expect(f.fan.userData.motionRate).toBeGreaterThan(0);expect(f.fan.userData.motionRate).toBeLessThan(rate(runGeo({})));
  });

  it('holds the paused pose through edits and advances only by an explicit step',()=>{
    const f=fixture();f.update(runGeo({flow:20}),.2,true);const angle=f.fan.rotation.z,phase=f.cooling.air.userData.progress,run=runGeo({flow:90});f.update(run,0,false);expect(f.fan.rotation.z).toBe(angle);expect(f.fan.userData.motionRate).toBeCloseTo(rate(run),12);expect(f.cooling.air.userData.progress).toBe(phase);
    f.update(run,.1,false);expect(f.fan.rotation.z).toBeCloseTo(angle-rate(run)*.1,12);const stepped=f.fan.rotation.z;for(let i=0;i<5;i++)f.update(run,0,false);expect(f.fan.rotation.z).toBe(stepped);
  });

  it('preserves phase while a selected-minute synchronization adopts the exact new rate',()=>{
    const f=fixture(),low=runGeo({flow:20}),high=runGeo({flow:90});f.update(low,.2,true);const angle=f.fan.rotation.z;f.update(high,0,true,true);expect(f.fan.rotation.z).toBe(angle);expect(f.fan.userData.motionRate).toBeCloseTo(rate(high),12);
    f.update(high,.05,true,true);expect(f.fan.rotation.z).toBeCloseTo(angle-rate(high)*.05,12);
  });

  it('keeps fan integration independent of frame partitions and half-speed playback',()=>{
    const a=fixture(),b=fixture(),c=fixture(),low=runGeo({flow:10}),high=runGeo({flow:90});for(const f of[a,b,c])f.update(low,0,false);a.update(high,.8,true);
    for(let i=0;i<24;i++)b.update(high,1/30,true);for(let i=0;i<96;i++)c.update(high,1/60*.5,true);
    for(const f of[b,c]){expect(f.fan.rotation.z).toBeCloseTo(a.fan.rotation.z,11);expect(f.fan.userData.motionRate).toBeCloseTo(a.fan.userData.motionRate,11);expect(f.cooling.air.userData.progress).toBeCloseTo(a.cooling.air.userData.progress,11);expect(f.cooling.air.userData.worldFlowRate).toBeCloseTo(a.cooling.air.userData.worldFlowRate,11);}
  });

  it('remains finite across all control extrema while exact readings remain untouched',()=>{
    const f=fixture();for(const hot of[75,300])for(const returnTemp of[40,100])for(const flow of[0,100])for(const utilization of[10,55]){const run=immutable(runGeo({hot,returnTemp,flow,utilization})),exact=JSON.stringify(run);f.update(run,.1,true);expect(Number.isFinite(f.fan.rotation.z)).toBe(true);expect(f.fan.userData.motionTarget).toBeCloseTo(rate(run),12);expect(f.fan.userData.rejectedHeat).toBe(rejected(run));expect(JSON.stringify(run)).toBe(exact);}
  });

  it('moves the cooling equipment with its condenser while preserving fluid attachments',()=>{
    const f=fixture(),run=runGeo({});f.update(run,.2,true);const origin=world(f.fan),angle=f.fan.rotation.z,phase=f.cooling.air.userData.progress,airOrigins=f.cooling.marks.map(m=>world(m.object));
    for(const isolated of[0,1,2,null]){f.layout(true,isolated);f.update(run,0,true);expect(world(f.fan).clone().sub(origin).distanceTo(new THREE.Vector3(3.4,0,0))).toBeLessThan(1e-12);expect(visible(f.fan)).toBe(isolated==null||isolated===2);expect(f.fan.rotation.z).toBe(angle);expectRoutesAttached(f);expect(f.cooling.air.userData.progress).toBe(phase);f.cooling.marks.forEach((mark,i)=>expect(world(mark.object).clone().sub(airOrigins[i]).distanceTo(new THREE.Vector3(3.4,0,0))).toBeLessThan(1e-12));}
  });

  it('retains geometry, normals and materials throughout repeated control edits',()=>{
    const f=fixture(),saved=[];f.update(runGeo({}),0,false);f.scene.traverse(o=>{if(o.geometry)saved.push({o,geometry:o.geometry,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,index:o.geometry.index,material:o.material});});
    for(let i=0;i<100;i++){f.update(runGeo({flow:i%3===0?0:10+i%90,utilization:10+i%45}),1/60,true);}
    for(const entry of saved){expect(entry.o.geometry).toBe(entry.geometry);expect(entry.geometry.attributes.position).toBe(entry.position);expect(entry.geometry.attributes.normal).toBe(entry.normal);expect(entry.geometry.index).toBe(entry.index);expect(entry.o.material).toBe(entry.material);}
  });
});

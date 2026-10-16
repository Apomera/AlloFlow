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

// Exercise the complete production assembly and energy model. WebGL and labels
// are omitted; geometry, animated updates, and both fluid circuits are real.
function fixture(){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[],generatorFocus=null;
    var referencePower=2515;
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);function label(){}
    ${branch}
    function update(run,dt,animate,cutaway,syncResponse){var p={run:run,dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,inspection:{trace:false,cutaway:!!cutaway}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);geothermalPrimary.update();geothermalLoop.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);geothermalPrimary.update();geothermalLoop.update();scene.updateMatrixWorld(true);}
    return {scene,A,B,C,update,layout,driver:rotorGeo,cooling:coolingFan,drive:geoDrive,focus:generatorFocus,loop:geothermalLoop,primary:geothermalPrimary,condenser,output:geoOutput,loadPort:geoLoadPort,cable:geoCable};
  })()`,{THREE});
  roots.push(f.scene);return f;
}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function world(object){return object.getWorldPosition(new THREE.Vector3());}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function rate(run){return .8*Math.sqrt(Math.max(0,run.power)/2515);}
function immutable(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')immutable(v);});return Object.freeze(value);}
function radialRange(object,origin){let min=Infinity,max=0;object.updateMatrixWorld(true);origin.updateMatrixWorld(true);object.traverse(node=>{if(!node.geometry)return;const points=node.geometry.attributes.position;for(let i=0;i<points.count;i++){const p=new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(node.matrixWorld);origin.worldToLocal(p);const r=Math.hypot(p.x,p.y);min=Math.min(min,r);max=Math.max(max,r);}});return {min,max};}
function expectPhase(f){for(const part of[f.drive.shaft,f.drive.assembly.rotor]){expect(part.rotation.z).toBe(f.driver.rotation.z);expect(part.userData.motionRate).toBe(f.driver.userData.motionRate);expect(part.userData.motionTarget).toBe(f.driver.userData.motionTarget);expect(part.userData.driverName).toBe(f.driver.name);}}

afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe('Geothermal turbine and generator assembly',()=>{
  it('connects the runner, coupling and generator on one continuous shaft axis',()=>{
    const f=fixture();f.update(runGeo({}),0,false);
    for(const part of[f.driver,f.drive.shaft,f.drive.assembly.rotor]){const p=world(part);expect(p.x).toBe(2.4);expect(p.y).toBe(1.5);const axis=new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));expect(axis.distanceTo(new THREE.Vector3(0,0,1))).toBeLessThan(1e-12);}
    expect(world(f.drive.group).z).toBe(-1.35);expect(f.focus).toBe(f.drive.group);
    const axle=bounds(f.drive.shaft.getObjectByName('energy-geothermal-drive-axle')),coreShaft=bounds(f.drive.assembly.rotor.children[0]),coupling=bounds(f.drive.shaft.getObjectByName('energy-geothermal-drive-coupling'));
    expect(axle.min.z).toBeCloseTo(-.70,7);expect(axle.max.z).toBeCloseTo(world(f.driver).z,7);expect(coreShaft.max.z-axle.min.z).toBeGreaterThan(.22);
    expect(coupling.intersectsBox(axle)).toBe(true);expect(coupling.intersectsBox(coreShaft)).toBe(true);
  });

  it('rests on connected supports while clearing the turbine pedestal and condenser',()=>{
    const f=fixture();f.update(runGeo({}),0,false);
    const plinth=bounds(f.drive.group.getObjectByName('energy-geothermal-generator-plinth')),cover=bounds(f.drive.cover),turbinePlinth=bounds(f.scene.getObjectByName('energy-geothermal-turbine-plinth'));
    expect(plinth.min.y).toBeCloseTo(-.07,7);expect(plinth.max.y).toBeCloseTo(.13,7);
    for(let i=0;i<2;i++){const foot=bounds(f.drive.group.getObjectByName('energy-geothermal-generator-foot-'+i));expect(foot.min.y).toBeCloseTo(plinth.max.y,7);expect(foot.intersectsBox(cover)).toBe(true);}
    expect(turbinePlinth.intersectsBox(cover)).toBe(false);expect(turbinePlinth.intersectsBox(bounds(f.drive.shaft.getObjectByName('energy-geothermal-drive-coupling')))).toBe(false);
    expect(bounds(f.condenser).intersectsBox(cover)).toBe(false);expect(bounds(f.condenser).intersectsBox(plinth)).toBe(false);
  });

  it('keeps the rotating core inside stationary windings and clear of its supports at every phase',()=>{
    const f=fixture();f.update(runGeo({}),0,false);
    const windings=f.drive.group.children.filter(o=>o.geometry?.type==='TorusGeometry'&&o.geometry.parameters.radius===.34);expect(windings).toHaveLength(3);
    for(let step=0;step<12;step++){
      f.driver.rotation.z=step*Math.PI/6;f.drive.sync();f.scene.updateMatrixWorld(true);const core=radialRange(f.drive.assembly.rotor,f.drive.group);
      for(const winding of windings)expect(radialRange(winding,f.drive.group).min-core.max).toBeGreaterThan(.018);
      expect(radialRange(f.drive.cover,f.drive.group).min-core.max).toBeGreaterThan(.18);
      for(let i=0;i<2;i++)expect(radialRange(f.drive.group.getObjectByName('energy-geothermal-generator-foot-'+i),f.drive.group).min-core.max).toBeGreaterThan(.10);
    }
  });

  it('routes the complete cooled-return pipe outside the generator, shaft and support geometry',()=>{
    const f=fixture();f.update(runGeo({}),0,false);const route=f.loop.routes.find(r=>r.group.name==='energy-geothermal-cooled-return-pipe');expect(route).toBeTruthy();
    const obstacles=[f.drive.cover,f.drive.assembly.rotor,f.drive.shaft,f.drive.group.getObjectByName('energy-geothermal-generator-plinth'),f.scene.getObjectByName('energy-geothermal-turbine-plinth'),...[0,1].map(i=>f.drive.group.getObjectByName('energy-geothermal-generator-foot-'+i))].map(bounds);
    const tubeRadius=route.body.geometry.parameters.radius;
    for(let i=0;i<=400;i++){const point=route.group.localToWorld(route.curve.getPointAt(i/400));for(const obstacle of obstacles)expect(obstacle.distanceToPoint(point)).toBeGreaterThan(tubeRadius+.01);if(point.x<=3.05)expect(bounds(f.condenser).distanceToPoint(point)).toBeGreaterThan(tubeRadius+.01);}
    const start=route.group.localToWorld(route.curve.getPointAt(0)),end=route.group.localToWorld(route.curve.getPointAt(1));expect(start.distanceTo(world(f.loop.ports['condenser-out']))).toBeLessThan(1e-12);expect(end.distanceTo(world(f.loop.ports['exchanger-in']))).toBeLessThan(1e-12);
  });

  it('takes electrical output from the physical generator terminal through the retained cable',()=>{
    const f=fixture(),run=runGeo({});f.update(run,0,false);const terminal=world(f.output),cover=bounds(f.drive.cover);
    expect(terminal.x).toBeCloseTo(cover.max.x,7);expect(terminal.y).toBe(1.3);expect(terminal.z).toBe(-1.35);expect(f.output.parent).toBe(f.drive.group);
    const tube=f.cable.children.find(o=>o.geometry?.type==='TubeGeometry'),curve=tube.geometry.parameters.path;
    expect(f.cable.localToWorld(curve.getPointAt(0)).distanceTo(terminal)).toBeLessThan(1e-12);expect(f.cable.localToWorld(curve.getPointAt(1)).distanceTo(world(f.loadPort))).toBeLessThan(1e-12);
    const dots=f.cable.children.filter(o=>/-marker-/.test(o.name));expect(dots.some(o=>o.visible)).toBe(true);for(const dot of dots)expect(dot.userData.power).toBe(run.power);
  });
});

describe('Geothermal integrated mechanical response',()=>{
  it.each([0,Math.PI/7,-Math.PI*2.3,Math.PI*15])('copies phase %s exactly without a second animation clock',angle=>{
    const f=fixture();f.update(runGeo({}),0,false);f.driver.rotation.z=angle;f.driver.userData.motionRate=.731;f.driver.userData.motionTarget=1.37;f.drive.sync();expectPhase(f);
  });

  it.each([['flow',{flow:80}],['produced temperature',{hot:260}],['reinjection temperature',{returnTemp:40}],['utilization',{utilization:55}]])('smoothly follows higher output after changing %s',(_name,settings)=>{
    const f=fixture(),low=runGeo({}),high=runGeo(settings);expect(high.power).toBeGreaterThan(low.power);f.update(low,0,false);const initial=rate(low),angle=f.driver.rotation.z,target=rate(high);
    f.update(high,0,true);expect(f.driver.rotation.z).toBe(angle);expect(f.driver.userData.motionRate).toBeCloseTo(initial,12);expect(f.driver.userData.outputPower).toBe(high.power);expectPhase(f);
    let prior=initial;for(let i=0;i<20;i++){f.update(high,.02,true);expect(f.driver.userData.motionRate).toBeGreaterThan(prior);expect(f.driver.userData.motionRate).toBeLessThan(target);prior=f.driver.userData.motionRate;expectPhase(f);}
    expect(prior).toBeCloseTo(target+(initial-target)*Math.exp(-1),12);expect(angle-f.driver.rotation.z).toBeCloseTo(target*.4+(initial-target)*.4*(1-Math.exp(-1)),12);
    f.update(low,.02,true);expect(f.driver.userData.motionRate).toBeLessThan(prior);expect(f.driver.userData.motionRate).toBeGreaterThan(initial);expectPhase(f);
  });

  it('separates generator output from incoming heat and rejected-heat cooling when utilization changes',()=>{
    const f=fixture(),low=runGeo({utilization:10}),high=runGeo({utilization:55});f.update(low,0,false);const fanRate=f.cooling.userData.motionRate,driverRate=f.driver.userData.motionRate;
    f.update(high,0,false);expect(high.available).toBe(low.available);expect(f.driver.userData.motionRate).toBeGreaterThan(driverRate);expect(f.cooling.userData.motionRate).toBeLessThan(fanRate);expect(f.cooling.userData.rejectedHeat).toBe(high.available-high.power);
    for(const route of f.loop.routes)expect(route.group.userData.drivingHeat).toBe(high.available);expectPhase(f);
  });

  it.each([['zero circulation',{flow:0}],['no temperature drop',{hot:75,returnTemp:100}]])('stops both shafts immediately at %s without resetting phase',(_name,settings)=>{
    const f=fixture();f.update(runGeo({}),.2,true);const angle=f.driver.rotation.z,run=runGeo(settings);expect(run.power).toBe(0);f.update(run,.2,true);expect(f.driver.rotation.z).toBe(angle);expect(f.driver.userData.motionRate).toBe(0);expectPhase(f);
    expect(f.cable.children.filter(o=>/-marker-/.test(o.name)).every(o=>!o.visible)).toBe(true);
    f.update(runGeo({}),.02,true);expect(f.driver.rotation.z).toBeLessThan(angle);expect(f.driver.userData.motionRate).toBeGreaterThan(0);expect(f.driver.userData.motionRate).toBeLessThan(rate(runGeo({})));expectPhase(f);
  });

  it('holds phases during paused edits and advances all rotating parts by the same explicit step',()=>{
    const f=fixture();f.update(runGeo({flow:20}),.2,true);const angle=f.driver.rotation.z,run=runGeo({flow:90});f.update(run,0,false);
    expect(f.driver.rotation.z).toBe(angle);expectPhase(f);f.update(run,.1,false,true);expect(f.driver.rotation.z).toBeCloseTo(angle-rate(run)*.1,12);expectPhase(f);
    const stepped=f.driver.rotation.z;for(let i=0;i<5;i++)f.update(run,0,false);expect(f.driver.rotation.z).toBe(stepped);expectPhase(f);
  });

  it('integrates the same phase at different frame rates and half-speed playback',()=>{
    const a=fixture(),b=fixture(),c=fixture(),low=runGeo({flow:10}),high=runGeo({flow:90});for(const f of[a,b,c])f.update(low,0,false);a.update(high,.8,true);
    for(let i=0;i<24;i++)b.update(high,1/30,true);for(let i=0;i<96;i++)c.update(high,1/60*.5,true);
    for(const f of[b,c]){expect(f.driver.rotation.z).toBeCloseTo(a.driver.rotation.z,11);expect(f.driver.userData.motionRate).toBeCloseTo(a.driver.userData.motionRate,11);expectPhase(f);}
  });

  it('opens the generator cover smoothly while all windings and supports remain fixed',()=>{
    const f=fixture(),run=runGeo({});f.update(run,0,false);const fixed=[f.drive.cover,...f.drive.group.children.filter(o=>o.name.startsWith('energy-generator-stator-')||o.name.includes('-generator-foot-'))],matrices=fixed.map(o=>o.matrixWorld.clone()),angle=f.driver.rotation.z;
    expect(f.drive.cover.material.opacity).toBe(1);f.update(run,.05,true,true);expect(f.drive.cover.material.opacity).toBeGreaterThan(.14);expect(f.drive.cover.material.opacity).toBeLessThan(1);expect(f.drive.cover.material.depthWrite).toBe(false);expect(f.driver.rotation.z).toBeLessThan(angle);expectPhase(f);
    for(let i=0;i<180;i++)f.update(run,1/60,true,true);expect(f.drive.cover.material.opacity).toBe(.14);expect(f.drive.assembly.shell.material.opacity).toBeCloseTo(.08,12);fixed.forEach((o,i)=>expect(o.matrixWorld.equals(matrices[i])).toBe(true));
    f.update(run,0,false,false);expect(f.drive.cover.material.opacity).toBe(1);expect(f.drive.cover.material.depthWrite).toBe(true);expectPhase(f);
  });

  it('keeps the whole drivetrain and its electrical lead attached in exploded and isolated views',()=>{
    const f=fixture(),run=runGeo({});f.update(run,.2,true);const parts=[f.driver,f.drive.shaft,f.drive.assembly.rotor,f.output],origins=parts.map(world),angle=f.driver.rotation.z;
    for(const isolated of[0,1,2,null]){
      f.layout(true,isolated);f.update(run,0,true);parts.forEach((part,i)=>{expect(world(part).clone().sub(origins[i]).distanceTo(new THREE.Vector3(3.4,0,0))).toBeLessThan(1e-12);expect(visible(part)).toBe(isolated==null||isolated===2);});expect(visible(f.cable)).toBe(isolated==null||isolated===2);expect(f.driver.rotation.z).toBe(angle);expectPhase(f);
      const route=f.loop.routes.find(r=>r.group.name==='energy-geothermal-cooled-return-pipe');expect(route.group.localToWorld(route.curve.getPointAt(0)).distanceTo(world(f.loop.ports['condenser-out']))).toBeLessThan(1e-12);expect(route.group.localToWorld(route.curve.getPointAt(1)).distanceTo(world(f.loop.ports['exchanger-in']))).toBeLessThan(1e-12);
    }
  });

  it('retains geometry and buffers through repeated controls without changing exact model readings',()=>{
    const f=fixture(),run=immutable(runGeo({hot:215,returnTemp:80,flow:55,utilization:45})),exact=JSON.stringify(run),saved=[];f.update(run,0,false);f.scene.traverse(o=>{if(o.geometry)saved.push({o,geometry:o.geometry,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,index:o.geometry.index,material:o.material});});
    for(let i=0;i<120;i++){f.update(run,1/60,true,i%2===0);expectPhase(f);}expect(JSON.stringify(run)).toBe(exact);
    for(const entry of saved){expect(entry.o.geometry).toBe(entry.geometry);expect(entry.geometry.attributes.position).toBe(entry.position);expect(entry.geometry.attributes.normal).toBe(entry.normal);expect(entry.geometry.index).toBe(entry.index);expect(entry.o.material).toBe(entry.material);}
  });
});

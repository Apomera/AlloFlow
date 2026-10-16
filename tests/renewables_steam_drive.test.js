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
const model=vm.runInNewContext(`(function(){${modelCode};return function(id,settings){return rnEnergyRun(id,settings,0);};})()`);
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','shape','motion','cue','particles','deformTube','valve','cabinet','waveAnnulus','runner','runnerReference','generatorDetail','steamDrivetrain','steamElectricalConnections','cspOpticalConnections','cspThermalConnections','cspReceiverDetail','biomassAuger','biomassConnections','biomassCombustion','electricity'].map(helper).join('\n');
const cases=[
  {id:'solarThermal',key:'csp',next:"}else if(id==='wave'){",driver:'solarRunner',drive:'cspDrive',paths:'cspThermal',x:2.6,y:1.02,generatorZ:-2.5,front:.48,reference:2047.5,controls:[['sunlight',{dni:1100}],['mirror aperture',{area:20000}],['receiver efficiency',{optical:90}],['cycle efficiency',{cycle:45}]],cycleLow:15,cycleHigh:45,zero:{dni:0}},
  {id:'biomass',key:'biomass',next:'}else{',driver:'steamRotor',drive:'biomassDrive',paths:'biomassPaths',x:2.5,y:1.1,generatorZ:-1.8,front:.6,reference:1000/3,controls:[['feed rate',{feed:1000}],['heating value',{heating:18}],['boiler efficiency',{boiler:95}],['cycle efficiency',{cycle:40}]],cycleLow:10,cycleHigh:40,zero:{feed:0}}
];

// Run each complete production power-block branch with the real energy model.
// Only WebGL and canvas labels are omitted; all machinery and flow routes remain.
function fixture(c){
  const opening=`}else if(id==='${c.id}'){`,start=source.indexOf(opening,sceneStart),end=source.indexOf(c.next,start),branch=source.slice(start+opening.length,end);
  const connections=c.key==='csp'?'cspOptics.update();cspThermal.update();':'biomassPaths.update();';
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[],generatorFocus=null,referencePower=${c.reference};
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);function label(){}
    ${branch}
    function update(run,dt,animate,cutaway,syncResponse){var p={run:run,dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,inspection:{trace:false,cutaway:!!cutaway}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);${connections}markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);${connections}scene.updateMatrixWorld(true);}
    return {scene,A,B,C,update,layout,driver:${c.driver},drive:${c.drive},focus:generatorFocus,paths:${c.paths}};
  })()`,{THREE});
  f.key=c.key;f.cable=f.scene.getObjectByName(`energy-${c.key}-output-cable`);f.output=f.scene.getObjectByName(`energy-${c.key}-output-port`);f.loadPort=f.scene.getObjectByName(`energy-${c.key}-load-port`);
  roots.push(f.scene);return f;
}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function world(object){return object.getWorldPosition(new THREE.Vector3());}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function rate(c,run){return .8*Math.sqrt(Math.max(0,run.power)/c.reference);}
function named(f,suffix){const result=f.scene.getObjectByName(`energy-${f.key}-${suffix}`);expect(result,`missing ${f.key} ${suffix}`).toBeTruthy();return result;}
function routes(f){return f.paths.routes||[f.paths.steam];}
function immutable(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')immutable(v);});return Object.freeze(value);}
function radialRange(object,origin){let min=Infinity,max=0;object.updateMatrixWorld(true);origin.updateMatrixWorld(true);object.traverse(node=>{if(!node.geometry)return;const points=node.geometry.attributes.position;for(let i=0;i<points.count;i++){const p=new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(node.matrixWorld);origin.worldToLocal(p);const r=Math.hypot(p.x,p.y);min=Math.min(min,r);max=Math.max(max,r);}});return {min,max};}
function expectPhase(f){for(const part of[f.drive.shaft,f.drive.assembly.rotor]){expect(part.rotation.z).toBe(f.driver.rotation.z);expect(part.userData.motionRate).toBe(f.driver.userData.motionRate);expect(part.userData.motionTarget).toBe(f.driver.userData.motionTarget);expect(part.userData.driverName).toBe(f.driver.name);}}
function expectRoutesAttached(f){for(const route of routes(f)){expect(route.group.localToWorld(route.curve.getPointAt(0)).distanceTo(world(route.from))).toBeLessThan(1e-12);expect(route.group.localToWorld(route.curve.getPointAt(1)).distanceTo(world(route.to))).toBeLessThan(1e-12);}}

afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe.each(cases)('$id connected steam power block',c=>{
  const run=settings=>model(c.id,settings||{});

  it('joins the turbine and generator on one continuous shaft with an exposed coupling',()=>{
    const f=fixture(c);f.update(run(),0,false);
    for(const part of[f.driver,f.drive.shaft,f.drive.assembly.rotor]){const p=world(part);expect(p.x).toBe(c.x);expect(p.y).toBe(c.y);const axis=new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));expect(axis.distanceTo(new THREE.Vector3(0,0,1))).toBeLessThan(1e-12);}
    expect(world(f.drive.group).z).toBe(c.generatorZ);expect(f.focus).toBe(f.drive.group);
    const axle=bounds(named(f,'drive-axle')),coreShaft=bounds(f.drive.assembly.rotor.children[0]),coupling=bounds(named(f,'drive-coupling')),cover=bounds(f.drive.cover);
    expect(axle.min.z).toBeCloseTo(c.generatorZ+.7,7);expect(axle.max.z).toBeCloseTo(c.front,7);expect(coreShaft.max.z-axle.min.z).toBeGreaterThan(.17);
    expect(coupling.intersectsBox(axle)).toBe(true);expect(coupling.intersectsBox(coreShaft)).toBe(true);expect(coupling.min.z-cover.max.z).toBeGreaterThan(.17);
    expect(f.cable.parent).toBe(f.C);expect(f.cable.parent).not.toBe(f.focus);
  });

  it('rests on supports that touch the casing without blocking the shaft or coupling',()=>{
    const f=fixture(c);f.update(run(),0,false);const plinth=bounds(named(f,'generator-plinth')),cover=bounds(f.drive.cover),axle=bounds(named(f,'drive-axle')),coupling=bounds(named(f,'drive-coupling'));
    expect(plinth.min.y).toBeCloseTo(-.07,7);expect(plinth.max.y).toBeCloseTo(.13,7);
    for(let i=0;i<2;i++){const foot=bounds(named(f,'generator-foot-'+i));expect(foot.min.y).toBeCloseTo(plinth.max.y,7);expect(foot.intersectsBox(cover)).toBe(true);expect(foot.intersectsBox(axle)).toBe(false);expect(foot.intersectsBox(coupling)).toBe(false);}
    if(c.key==='biomass'){const pedestal=bounds(named(f,'turbine-plinth'));expect(pedestal.max.y).toBeCloseTo(.4,7);expect(pedestal.max.y).toBeCloseTo(bounds(named(f,'turbine-casing')).min.y,7);expect(pedestal.intersectsBox(axle)).toBe(false);expect(pedestal.intersectsBox(coupling)).toBe(false);}
  });

  it('keeps the rotating core clear of stationary windings and feet at every phase',()=>{
    const f=fixture(c);f.update(run(),0,false);const windings=f.drive.group.children.filter(o=>o.geometry?.type==='TorusGeometry'&&o.geometry.parameters.radius===.34);expect(windings).toHaveLength(3);
    for(let step=0;step<12;step++){f.driver.rotation.z=step*Math.PI/6;f.drive.sync();f.scene.updateMatrixWorld(true);const core=radialRange(f.drive.assembly.rotor,f.drive.group);
      for(const winding of windings)expect(radialRange(winding,f.drive.group).min-core.max).toBeGreaterThan(.018);
      expect(radialRange(f.drive.cover,f.drive.group).min-core.max).toBeGreaterThan(.18);
      for(let i=0;i<2;i++)expect(radialRange(named(f,'generator-foot-'+i),f.drive.group).min-core.max).toBeGreaterThan(.10);
    }
  });

  it('keeps the axle inside the fixed bearing bore with positive coupling clearance',()=>{
    const f=fixture(c);f.update(run(),0,false);const bearing=f.drive.bearing,bore=bearing.geometry.parameters.radius-bearing.geometry.parameters.tube,axle=named(f,'drive-axle'),coupling=bounds(named(f,'drive-coupling'));
    expect(world(bearing).x).toBe(c.x);expect(world(bearing).y).toBe(c.y);expect(bore-axle.geometry.parameters.radiusTop).toBeGreaterThan(.06);
    expect(bounds(bearing).min.z-coupling.max.z).toBeGreaterThan(.03);const pose=bearing.matrixWorld.clone();f.update(run(),.2,true);expect(bearing.matrixWorld.equals(pose)).toBe(true);
  });

  it('preserves physical thermal ports and routes clear of the new generator',()=>{
    const f=fixture(c);f.update(run(),0,false);expectRoutesAttached(f);
    if(c.key==='csp'){expect(world(f.paths.ports['block-hot']).toArray()).toEqual([1.9,.8,.2]);expect(world(f.paths.ports['block-return']).toArray()).toEqual([1.9,.45,-.52]);}
    else{expect(world(f.paths.ports['turbine-in']).toArray()).toEqual([2.5,1.8,.15]);}
    const obstacles=[f.drive.cover,named(f,'generator-plinth'),named(f,'drive-coupling'),named(f,'generator-foot-0'),named(f,'generator-foot-1')].map(bounds);
    for(const route of routes(f))for(let i=0;i<=200;i++){const point=route.group.localToWorld(route.curve.getPointAt(i/200));for(const obstacle of obstacles)expect(obstacle.distanceToPoint(point)).toBeGreaterThan(route.body.geometry.parameters.radius+.01);}
  });

  it('starts electricity at a casing-mounted generator terminal and ends at the load',()=>{
    const f=fixture(c),r=run();f.update(r,0,false);const terminal=world(f.output),cover=bounds(f.drive.cover);
    expect(terminal.x).toBeCloseTo(cover.max.x,7);expect(terminal.y).toBeCloseTo(c.y-.2,12);expect(terminal.z).toBe(c.generatorZ);expect(f.output.parent).toBe(f.drive.group);
    const distanceFromAxis=Math.hypot(terminal.x-c.x,terminal.y-c.y);expect(distanceFromAxis-.48).toBeLessThan(f.output.geometry.parameters.radius);
    const tube=f.cable.children.find(o=>o.geometry?.type==='TubeGeometry'),curve=tube.geometry.parameters.path;
    expect(f.cable.localToWorld(curve.getPointAt(0)).distanceTo(terminal)).toBeLessThan(1e-12);expect(f.cable.localToWorld(curve.getPointAt(1)).distanceTo(world(f.loadPort))).toBeLessThan(1e-12);
    const dots=f.cable.children.filter(o=>/-marker-/.test(o.name));expect(dots.some(o=>o.visible)).toBe(true);for(const dot of dots)expect(dot.userData.power).toBe(r.power);
    const plinth=bounds(named(f,'generator-plinth'));for(let i=0;i<=200;i++)expect(plinth.distanceToPoint(f.cable.localToWorld(curve.getPointAt(i/200)))).toBeGreaterThan(.04);
  });

  it('shares exact unwrapped phase and motion metadata without a second rotation clock',()=>{
    const f=fixture(c);f.update(run(),0,false);for(const angle of[0,Math.PI/7,-Math.PI*2.3,Math.PI*15]){f.driver.rotation.z=angle;f.driver.userData.motionRate=.731;f.driver.userData.motionTarget=1.37;f.drive.sync();expectPhase(f);}
  });

  it.each(c.controls)('smoothly follows output changes from %s',(_name,settings)=>{
    const f=fixture(c),low=run(),high=run(settings);expect(high.power).toBeGreaterThan(low.power);f.update(low,0,false);const initial=rate(c,low),angle=f.driver.rotation.z,target=rate(c,high);
    f.update(high,0,true);expect(f.driver.rotation.z).toBe(angle);expect(f.driver.userData.motionRate).toBeCloseTo(initial,12);expect(f.driver.userData.outputPower).toBe(high.power);expectPhase(f);
    let prior=initial;for(let i=0;i<20;i++){f.update(high,.02,true);expect(f.driver.userData.motionRate).toBeGreaterThan(prior);expect(f.driver.userData.motionRate).toBeLessThan(target);prior=f.driver.userData.motionRate;expectPhase(f);}
    expect(prior).toBeCloseTo(target+(initial-target)*Math.exp(-1),12);expect(angle-f.driver.rotation.z).toBeCloseTo(target*.4+(initial-target)*.4*(1-Math.exp(-1)),12);
    f.update(low,.02,true);expect(f.driver.userData.motionRate).toBeLessThan(prior);expect(f.driver.userData.motionRate).toBeGreaterThan(initial);expectPhase(f);
  });

  it('changes shaft motion and electricity with cycle efficiency while heat flow stays fixed',()=>{
    const f=fixture(c),low=run({cycle:c.cycleLow}),high=run({cycle:c.cycleHigh});f.update(low,0,false);const initial=f.driver.userData.motionRate,heat=low.stages[1].value,markers=routes(f).map(r=>r.group.children.find(o=>/-marker-/.test(o.name))),flows=markers.map(o=>o.userData.worldFlowRate);
    const auger=c.key==='biomass'?named(f,'auger').userData.motionRate:null;f.update(high,0,false);
    expect(high.stages[1].value).toBe(heat);expect(f.driver.userData.motionRate).toBeGreaterThan(initial);markers.forEach((marker,i)=>expect(marker.userData.worldFlowRate).toBe(flows[i]));
    if(auger!==null)expect(named(f,'auger').userData.motionRate).toBe(auger);expectPhase(f);
  });

  it('stops on zero resource without resetting phase and restarts smoothly',()=>{
    const f=fixture(c);f.update(run(),.2,true);const angle=f.driver.rotation.z,r=run(c.zero);expect(r.power).toBe(0);f.update(r,.2,true);
    expect(f.driver.rotation.z).toBe(angle);expect(f.driver.userData.motionRate).toBe(0);expectPhase(f);expect(f.cable.children.filter(o=>/-marker-/.test(o.name)).every(o=>!o.visible)).toBe(true);
    f.update(run(),.02,true);expect(f.driver.rotation.z).toBeLessThan(angle);expect(f.driver.userData.motionRate).toBeGreaterThan(0);expect(f.driver.userData.motionRate).toBeLessThan(rate(c,run()));expectPhase(f);
  });

  it('holds phase through paused edits and advances all parts by one explicit step',()=>{
    const f=fixture(c);f.update(run({cycle:c.cycleLow}),.2,true);const angle=f.driver.rotation.z,r=run({cycle:c.cycleHigh});f.update(r,0,false);expect(f.driver.rotation.z).toBe(angle);expectPhase(f);
    f.update(r,.1,false,true);expect(f.driver.rotation.z).toBeCloseTo(angle-rate(c,r)*.1,12);expectPhase(f);const stepped=f.driver.rotation.z;for(let i=0;i<5;i++)f.update(r,0,false);expect(f.driver.rotation.z).toBe(stepped);
  });

  it('integrates equal elapsed motion across frame partitions and half-speed playback',()=>{
    const a=fixture(c),b=fixture(c),d=fixture(c),low=run({cycle:c.cycleLow}),high=run({cycle:c.cycleHigh});for(const f of[a,b,d])f.update(low,0,false);a.update(high,.8,true);
    for(let i=0;i<24;i++)b.update(high,1/30,true);for(let i=0;i<96;i++)d.update(high,1/60*.5,true);
    for(const f of[b,d]){expect(f.driver.rotation.z).toBeCloseTo(a.driver.rotation.z,11);expect(f.driver.userData.motionRate).toBeCloseTo(a.driver.userData.motionRate,11);expectPhase(f);}
  });

  it('opens its cutaway smoothly while stationary windings and supports hold position',()=>{
    const f=fixture(c),r=run();f.update(r,0,false);const fixed=[f.drive.cover,...f.drive.group.children.filter(o=>o.name.startsWith('energy-generator-stator-')||o.name.includes('-generator-foot-'))],matrices=fixed.map(o=>o.matrixWorld.clone()),angle=f.driver.rotation.z;
    expect(f.drive.cover.material.opacity).toBe(1);f.update(r,.05,true,true);expect(f.drive.cover.material.opacity).toBeGreaterThan(.14);expect(f.drive.cover.material.opacity).toBeLessThan(1);expect(f.drive.cover.material.depthWrite).toBe(false);expect(f.driver.rotation.z).toBeLessThan(angle);expectPhase(f);
    for(let i=0;i<180;i++)f.update(r,1/60,true,true);expect(f.drive.cover.material.opacity).toBe(.14);expect(f.drive.assembly.shell.material.opacity).toBeCloseTo(.08,12);fixed.forEach((o,i)=>expect(o.matrixWorld.equals(matrices[i])).toBe(true));
    f.update(r,0,false,false);expect(f.drive.cover.material.opacity).toBe(1);expect(f.drive.cover.material.depthWrite).toBe(true);expectPhase(f);
  });

  it('keeps the drivetrain and cables connected in exploded and isolated views',()=>{
    const f=fixture(c),r=run();f.update(r,.2,true);const parts=[f.driver,f.drive.shaft,f.drive.assembly.rotor,f.output],origins=parts.map(world),angle=f.driver.rotation.z;
    for(const isolated of[0,1,2,null]){f.layout(true,isolated);f.update(r,0,true);parts.forEach((part,i)=>{expect(world(part).clone().sub(origins[i]).distanceTo(new THREE.Vector3(3.4,0,0))).toBeLessThan(1e-12);expect(visible(part)).toBe(isolated==null||isolated===2);});expect(visible(f.cable)).toBe(isolated==null||isolated===2);expect(f.driver.rotation.z).toBe(angle);expectPhase(f);expectRoutesAttached(f);
      const curve=f.cable.children.find(o=>o.geometry?.type==='TubeGeometry').geometry.parameters.path;expect(f.cable.localToWorld(curve.getPointAt(0)).distanceTo(world(f.output))).toBeLessThan(1e-12);expect(f.cable.localToWorld(curve.getPointAt(1)).distanceTo(world(f.loadPort))).toBeLessThan(1e-12);}
  });

  it('retains mesh buffers through animated edits without mutating exact model values',()=>{
    const f=fixture(c),r=immutable(run({cycle:c.cycleHigh})),exact=JSON.stringify(r),saved=[];f.update(r,0,false);f.scene.traverse(o=>{if(o.geometry)saved.push({o,geometry:o.geometry,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,index:o.geometry.index,material:o.material});});
    for(let i=0;i<100;i++){f.update(r,1/60,true,i%2===0);expectPhase(f);}expect(JSON.stringify(r)).toBe(exact);
    for(const entry of saved){expect(entry.o.geometry).toBe(entry.geometry);expect(entry.geometry.attributes.position).toBe(entry.position);expect(entry.geometry.attributes.normal).toBe(entry.normal);expect(entry.geometry.index).toBe(entry.index);expect(entry.o.material).toBe(entry.material);}
  });
});

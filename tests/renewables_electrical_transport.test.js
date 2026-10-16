import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)'),roots=[];
function helper(name){const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','cue','particles','deformTube','waveAnnulus','waveMechanism','storageConnections','pvElectricalConnections','rotorPowerConnections','wavePowerConnections','electricity','hydroElectricalConnections','steamElectricalConnections'].map(helper).join('\n');
const geoCall=source.match(/electricity\(geoCable,(\[\[[^;]+?\]\])\);/)[1];
const systems=[
  {id:'storage',count:3,setup:'var wiring=storageConnections(A,B,C),routes=wiring.routes;function deform(value){}'},
  {id:'PV',count:2,setup:`var moving=new THREE.Group(),inverter=new THREE.Group();B.add(moving);C.add(inverter);inverter.position.x=.85;moving.position.set(-1.5,.65,0);moving.scale.set(.75,1,.75);var wiring=pvElectricalConnections(B,C,moving,inverter,100,100),routes=wiring.routes;function deform(value){moving.rotation.z=-value*Math.PI/2;moving.scale.set(.375+1.30*value,1,.375+1.30*value);moving.position.y=.65+Math.abs(Math.sin(moving.rotation.z))*1.94*moving.scale.x;}`},
  ...[false,true].map(marine=>({id:marine?'tidal':'wind',count:2,setup:`var moving=new THREE.Group();C.add(moving);moving.position.y=${marine?2.25:3.65};var hub=box(moving,-1.1,0,-.35,1.04,.98,1.4,'#c5dee5'),load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');var wiring=rotorPowerConnections(C,hub,load,100),routes=wiring.routes;function deform(value){moving.position.y=${marine?2.25:3.65}+value*1.1;}`})),
  {id:'wave',count:2,setup:`var guide=waveMechanism(B),cabinet=box(C,2,1.1,0,1.8,2,1.4,'#accad1'),load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de'),equipment=new THREE.Group();C.children.slice().forEach(function(o){equipment.add(o);});C.add(equipment);equipment.position.y=2.1;var wiring=wavePowerConnections(B,C,guide,cabinet,load,equipment,100),routes=wiring.routes;function deform(value){guide.place(.47+value*1.56);}`},
  {id:'hydro and thermal leads',count:5,setup:`
    function route(group,from,to){var body=group.children.find(function(o){return o.geometry&&o.geometry.type==='TubeGeometry';});return {group:group,body:body,curve:body.geometry.parameters.path,from:from,to:to};}
    var hydro=hydroElectricalConnections(C),routes=[route(hydro.incoming,C.getObjectByName('energy-hydro-electrical-port-0'),C.getObjectByName('energy-hydro-electrical-port-1')),route(hydro.outgoing,C.getObjectByName('energy-hydro-electrical-port-2'),C.getObjectByName('energy-hydro-electrical-port-3'))];
    [['csp',2.6,1.02,-2.5],['biomass',2.5,1.1,-1.8]].forEach(function(data){var group=new THREE.Group();group.position.set(data[1],data[2],data[3]);C.add(group);var connection=steamElectricalConnections(C,{group:group},data[0]);routes.push(route(connection.cable,connection.output,connection.loadPort));});
    var geoCable=new THREE.Group();C.add(geoCable);electricity(geoCable,${geoCall});var geoOutput=ball(C,2.88,1.3,-1.35,.065,'#edc873'),geoLoad=ball(C,4.6,.35,2.1,.065,'#edc873');routes.push(route(geoCable,geoOutput,geoLoad));var wiring={update:function(){}};function deform(value){}
  `}
];

// All production electrical creation sites run their real connection helpers.
// Settings only move the physical parents; endpoint deformation remains real.
function fixture(system){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[],referencePower=100;
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
    ${system.setup}
    [A,B,C].forEach(function(g,i){g.traverse(function(o){if(o.isMesh)o.userData.component=['resource','converter','generator'][i];});});
    function layout(fraction){[A,B,C].forEach(function(g,i){g.position.set((i-1)*3.4*fraction,i===1?.8*fraction:0,0);});scene.updateMatrixWorld(true);wiring.update();scene.updateMatrixWorld(true);}
    function update(power,dt,options){options=options||{};if(options.deform!=null)deform(options.deform);var run={power:power,available:options.available==null?power:options.available,stages:[{value:power},{value:options.dc==null?power:options.dc},{value:power}],status:options.status||'Generating'};var p={run:run,dt:dt||0,animate:options.animate!==false,syncResponse:!!options.syncResponse,selected:options.selected||'generator',inspection:{trace:!!options.trace}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);wiring.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);return run;}
    layout(0);return {scene,A,B,C,routes,wiring,layout,update};
  })()`,{THREE});roots.push(f.scene);return f;
}
const marks=r=>r.group.children.filter(o=>/-marker-/.test(o.name));
const arrow=r=>r.group.children.find(o=>/-direction$/.test(o.name));
const phase=r=>marks(r)[0].userData.progress;
const difference=(a,b)=>((a-b)%1+1)%1;
const world=object=>object.getWorldPosition(new THREE.Vector3());
function contacts(f){for(const r of f.routes)for(const[t,port]of[[0,r.from],[1,r.to]])expect(r.group.localToWorld(r.curve.getPointAt(t)).distanceTo(world(port))).toBeLessThan(1e-11);}
function directions(f,sign=1){for(const r of f.routes){for(const[index,m]of marks(r).entries()){const t=(phase(r)+index/6)%1;expect(m.position.distanceTo(r.curve.getPointAt(t))).toBeLessThan(1e-12);const facing=new THREE.Vector3(0,1,0).applyQuaternion(m.quaternion),tangent=r.curve.getTangentAt(t).normalize().multiplyScalar(sign);expect(facing.distanceTo(tangent)).toBeLessThan(1e-10);}expect(new THREE.Vector3(0,1,0).applyQuaternion(arrow(r).quaternion).distanceTo(r.curve.getTangentAt(.72).normalize().multiplyScalar(sign))).toBeLessThan(1e-10);}}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe.each(systems)('$id electrical transport',system=>{
  it('uses directional shadow-free markers with equal travel speed on unequal cable lengths',()=>{
    const f=fixture(system);f.update(100,0,{animate:false});expect(f.routes).toHaveLength(system.count);expect(new Set(f.routes.map(r=>r.curve.getLength().toFixed(6))).size).toBeGreaterThan(1);
    const before=f.routes.map(phase);f.update(100,.1);f.routes.forEach((r,i)=>{expect(difference(phase(r),before[i])*r.curve.getLength()).toBeCloseTo(.07,11);expect(marks(r)).toHaveLength(6);for(const m of [...marks(r),arrow(r)]){expect(m.geometry.type).toBe('ConeGeometry');expect(m.castShadow).toBe(false);expect(m.receiveShadow).toBe(false);expect(m.userData.cueMode).toBe('power-density');expect(m.userData.worldFlowRate).toBeCloseTo(.7,12);expect(m.userData.flowRate*5*r.curve.getLength()).toBeCloseTo(.7,12);}for(const m of marks(r)){expect(m.geometry.parameters.radius).toBe(.095);expect(m.geometry.parameters.height).toBe(.26);}});contacts(f);directions(f);
  });

  it('keeps low-power arrows clear of the cable wall and never shrinks them with power',()=>{
    const f=fixture(system);for(const power of[.00001,1,100,10000])for(const trace of[false,true]){f.update(power,0,{animate:false,trace,selected:'absent-stage'});for(const r of f.routes){const m=marks(r)[0],radius=m.geometry.parameters.radius*m.scale.x;expect(m.visible).toBe(true);expect(m.material.opacity).toBe(1);expect(m.scale.toArray()).toEqual(trace?[.78,.78,.78]:[1,1,1]);expect(radius-r.body.geometry.parameters.radius).toBeGreaterThan(.029);expect(m.userData.power).toBe(power);}}
  });

  it('keeps travelled distance consistent through exploded layouts and changing equipment dimensions',()=>{
    const f=fixture(system);f.update(100,0,{animate:false});for(const value of[1,.2,.8,0]){const before=f.routes.map(phase);f.layout(value);f.update(100,0,{deform:value});f.routes.forEach((r,i)=>expect(phase(r)).toBe(before[i]));contacts(f);directions(f);f.update(100,.025);f.routes.forEach((r,i)=>expect(difference(phase(r),before[i])*r.curve.getLength()).toBeCloseTo(.0175,11));}
  });

  it('reports exact power immediately while six fixed marker phases change density smoothly',()=>{
    const f=fixture(system);f.update(10,0,{animate:false});const before=f.routes.map(r=>({phase:phase(r),strength:marks(r)[0].userData.flowStrength,positions:marks(r).map(m=>m.position.clone())}));f.update(900,0);f.routes.forEach((r,i)=>{expect(phase(r)).toBe(before[i].phase);for(const[index,m]of marks(r).entries()){expect(m.userData.power).toBe(900);expect(m.userData.flowStrength).toBe(before[i].strength);expect(m.position.equals(before[i].positions[index])).toBe(true);}});
    f.update(900,.022);f.routes.forEach((r,i)=>{const reference=marks(r)[0].userData.referencePower,target=900/(900+reference),amount=target+(before[i].strength-target)*Math.exp(-.1);for(const[index,m]of marks(r).entries()){expect(m.userData.flowStrength).toBeCloseTo(amount,12);expect(m.material.opacity).toBeCloseTo(Math.max(0,Math.min(1,1+5*amount-[0,2,4,1,3,5][index])),12);expect(m.userData.worldFlowRate).toBe(.7);}});directions(f);
  });

  it('stops zero-power transfers immediately and restarts without resetting position',()=>{
    const f=fixture(system);f.update(100,.1);const before=f.routes.map(phase);f.update(0,.1);f.routes.forEach((r,i)=>{expect(phase(r)).toBe(before[i]);for(const m of [...marks(r),arrow(r)]){expect(m.visible).toBe(false);expect(m.userData.power).toBe(0);expect(m.userData.worldFlowRate).toBe(0);}});
    f.update(100,0);f.routes.forEach((r,i)=>expect(phase(r)).toBe(before[i]));f.update(100,.022);f.routes.forEach((r,i)=>{expect(marks(r)[0].userData.worldFlowRate).toBeCloseTo(.7*(1-Math.exp(-.1)),12);expect(difference(phase(r),before[i])*r.curve.getLength()).toBeCloseTo(.7*(.022-.22*(1-Math.exp(-.1))),11);});
  });

  it('freezes each route independently on pause and completion while an explicit step moves equal distances',()=>{
    const f=fixture(system);f.update(100,.1);const before=f.routes.map(phase);f.update(300,0,{animate:false});f.routes.forEach((r,i)=>expect(phase(r)).toBe(before[i]));f.update(300,.1,{animate:false});f.routes.forEach((r,i)=>expect(difference(phase(r),before[i])*r.curve.getLength()).toBeCloseTo(.07,11));
    const stepped=f.routes.map(phase);for(const status of['Sequence complete','Cycle complete','Scenario complete']){f.update(300,.1,{status});f.routes.forEach((r,i)=>{expect(phase(r)).toBe(stepped[i]);for(const m of [...marks(r),arrow(r)]){expect(m.visible).toBe(false);expect(m.userData.power).toBe(0);expect(m.userData.worldFlowRate).toBe(0);}});}
  });

  it('retains buffers and tangent alignment while trace emphasis and layout change',()=>{
    const f=fixture(system);f.update(100,.1);const saved=[];f.scene.traverse(o=>{if(o.geometry)saved.push({o,geometry:o.geometry,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,index:o.geometry.index,material:o.material});});
    for(const selected of['resource','converter','generator']){const before=f.routes.map(phase);f.layout(selected==='converter'?1:0);f.update(100,0,{trace:true,selected,deform:selected==='converter'?1:0});f.routes.forEach((r,i)=>{expect(phase(r)).toBe(before[i]);for(const m of [...marks(r),arrow(r)]){expect(m.userData.traceState).toBe(m.userData.component===selected?'selected':'context');expect(m.userData.power).toBe(100);expect(m.userData.worldFlowRate).toBe(.7);}});directions(f);contacts(f);}
    for(const entry of saved){expect(entry.o.geometry).toBe(entry.geometry);expect(entry.geometry.attributes.position).toBe(entry.position);expect(entry.geometry.attributes.normal).toBe(entry.normal);expect(entry.geometry.index).toBe(entry.index);expect(entry.o.material).toBe(entry.material);}
  });
});

describe('Shared electrical transport invariants',()=>{
  it('preserves actual charging/discharging direction and hides the inactive storage routes',()=>{
    const f=fixture(systems[0]);f.update(0,.1,{available:50});expect(marks(f.routes[0])[0].userData.power).toBe(50);expect(marks(f.routes[1]).every(m=>!m.visible)).toBe(true);expect(marks(f.routes[2]).every(m=>!m.visible)).toBe(true);f.update(50,.1,{available:0});expect(marks(f.routes[0]).every(m=>!m.visible)).toBe(true);for(const r of f.routes.slice(1))expect(marks(r)[0].userData.power).toBe(50);directions(f);
  });

  it('carries distinct exact PV DC and AC powers at one common travel speed',()=>{
    const f=fixture(systems[1]);f.update(96,.1,{dc:100});expect(marks(f.routes[0])[0].userData.power).toBe(100);expect(marks(f.routes[1])[0].userData.power).toBe(96);expect(marks(f.routes[0])[0].userData.flowStrength).toBeGreaterThan(marks(f.routes[1])[0].userData.flowStrength);for(const r of f.routes)expect(marks(r)[0].userData.worldFlowRate).toBe(.7);
  });

  it('integrates the same restart distance and power density across frame partitions and half speed',()=>{
    const a=fixture(systems[0]),b=fixture(systems[0]),c=fixture(systems[0]);for(const f of[a,b,c])f.update(0,0,{animate:false});a.update(100,.8);for(let i=0;i<24;i++)b.update(100,1/30);for(let i=0;i<96;i++)c.update(100,1/60*.5);
    for(const f of[b,c])f.routes.forEach((r,i)=>{expect(phase(r)).toBeCloseTo(phase(a.routes[i]),11);expect(marks(r)[0].userData.worldFlowRate).toBeCloseTo(marks(a.routes[i])[0].userData.worldFlowRate,11);expect(marks(r)[0].userData.flowStrength).toBeCloseTo(marks(a.routes[i])[0].userData.flowStrength,11);});
  });

  it('preserves the exponential restart speed when layout changes during acceleration',()=>{
    const a=fixture(systems[1]),b=fixture(systems[1]);for(const f of[a,b]){f.update(0,0,{animate:false});f.update(100,.02);}
    for(const layout of[1,0,.5,1]){const beforeA=a.routes.map(phase),beforeB=b.routes.map(phase);a.layout(layout);a.update(100,.025,{deform:layout});b.update(100,.025);a.routes.forEach((r,i)=>{expect(marks(r)[0].userData.worldFlowRate).toBeCloseTo(marks(b.routes[i])[0].userData.worldFlowRate,12);expect(difference(phase(r),beforeA[i])*r.curve.getLength()).toBeCloseTo(difference(phase(b.routes[i]),beforeB[i])*b.routes[i].curve.getLength(),11);});}
  });

  it('aligns each moving cone with signed tangent direction even across a reversal',()=>{
    const f=vm.runInNewContext(`(function(){var responses={},responseSettling=false,streamCount=0,markerUpdaters=[];${helpers}var scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);var curve=pipe(group,[[0,0,0],[1,0,1],[2,1,1],[4,1,-1]],'#f2bf58',.04),stream=particles(group,curve,'#fff0ac',function(){return true;},function(p){return p.run.speed;},null,{power:function(p){return p.run.power;},referencePower:100},true);function update(speed,dt){markerUpdaters.forEach(function(fn){fn({run:{speed:speed,power:100,status:'Generating'},dt:dt,animate:true,inspection:{trace:false}});});}return{scene,group,curve,stream,update};})()`,{THREE});roots.push(f.scene);const wrapper={routes:[{group:f.group,curve:f.curve}]};f.update(.7,.1);directions(wrapper,1);const initial=phase(wrapper.routes[0]);f.update(-.7,0);expect(phase(wrapper.routes[0])).toBe(initial);directions(wrapper,-1);f.update(-.7,.1);expect(difference(initial,phase(wrapper.routes[0]))*f.curve.getLength()).toBeCloseTo(.07,11);directions(wrapper,-1);
  });

  it('leaves non-electrical particle geometry and normalized travel unchanged',()=>{
    const f=vm.runInNewContext(`(function(){var responses={},responseSettling=false,streamCount=0,markerUpdaters=[];${helpers}var scene=new THREE.Scene(),curve=pipe(scene,[[0,0,0],[0,0,4]],'#add8ef',.05),stream=particles(scene,curve,'#add8ef',function(){return true;},.025);markerUpdaters.forEach(function(fn){fn({run:{status:'Generating'},dt:.1,animate:false,inspection:{trace:false}});});return{scene,stream};})()`,{THREE});roots.push(f.scene);for(const dot of f.stream.dots){expect(dot.geometry.type).toBe('SphereGeometry');expect(dot.userData.progress).toBeCloseTo(.0125,12);expect(dot.userData.worldFlowRate).toBeUndefined();}
  });
});

import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){
  const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);
  let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const common=['material','mesh','box','cylinder','ball','pipe','glow','response','cue','particles','deformTube'];
const systems=[
  {name:'CSP',reference:5850,routeCount:2,helpers:['cspThermalConnections'],setup:`
    var receiver=box(B,.5,4.6,0,.8,.8,.8,'#e99c46');
    var plumbing=cspThermalConnections(B,C,receiver),routes=plumbing.routes;`},
  {name:'Geothermal secondary circuit',reference:18392,routeCount:3,helpers:['geothermalCircuit'],setup:`
    var exchanger=cylinder(B,.5,1.6,0,.7,2,'#d4a465'),turbine=new THREE.Group();turbine.position.set(2.4,1.5,.35);C.add(turbine);
    var condenser=cylinder(C,3.9,.9,-2,.65,1.7,'#afc7c6');
    var plumbing=geothermalCircuit(B,C,exchanger,turbine,condenser),routes=plumbing.routes;`},
  {name:'Biomass steam',reference:4000/3,routeCount:1,helpers:['motion','ring','biomassAuger','biomassConnections'],setup:`
    var hopper=box(A,-3.7,.75,0,2.1,1.4,2.2,'#96815b'),boiler=box(B,-.7,1.45,0,2,2.8,2.1,'#879fa4'),turbine=new THREE.Group();turbine.position.set(2.5,1.1,.15);C.add(turbine);
    var plumbing=biomassConnections(A,B,C,hopper,boiler,turbine),routes=[plumbing.steam];`}
];

// Each system runs its own actual plumbing and particle helpers with independent
// response state. Only rendering and the unrelated energy model are omitted.
function fixture(system){return vm.runInNewContext(`(function(){
  var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
  ${common.concat(system.helpers).map(helper).join('\n')}
  var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
  ${system.setup}
  function layout(fraction){A.position.set(-3.4*fraction,0,0);B.position.set(0,.8*fraction,0);C.position.set(3.4*fraction,0,0);scene.updateMatrixWorld(true);plumbing.update();scene.updateMatrixWorld(true);}
  function update(heat,power,dt,animate,status){
    var run={available:heat,stages:[{value:heat},{value:heat},{value:power}],power:power,settings:{feed:500},status:status||'Generating'};
    var p={run:run,dt:dt,animate:animate!==false,inspection:{trace:false}};
    updaters.forEach(function(fn){fn(p);});markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);return run;
  }
  layout(0);return {scene:scene,routes:routes,plumbing:plumbing,layout:layout,update:update};
})()`,{THREE});}
const markers=route=>route.group.children.filter(object=>/-marker-/.test(object.name));
const arrow=route=>route.group.children.find(object=>/-direction$/.test(object.name));
const phase=route=>markers(route)[0].userData.progress;
const traveled=(route,previous)=>(phase(route)-previous+1)%1*route.curve.getLength();
function checkPositions(route){
  markers(route).forEach((marker,index)=>expect(marker.position.distanceTo(route.curve.getPointAt((phase(route)+index/6)%1))).toBeLessThan(1e-12));
  for(const [fraction,port] of [[0,route.from],[1,route.to]]){
    const actual=route.group.localToWorld(route.curve.getPoint(fraction)),expected=port.getWorldPosition(new THREE.Vector3());
    expect(actual.distanceTo(expected)).toBeLessThan(1e-12);
  }
  expect(arrow(route).position.distanceTo(route.curve.getPointAt(.72))).toBeLessThan(1e-12);
}

describe('Thermal routes share a distance-based illustrative motion law',()=>{
  it('moves every hot, exhaust, return and steam route the same distance through animated layouts',()=>{
    const fixtures=systems.map(system=>({system,f:fixture(system)}));
    const buffers=new Map(),initialLengths=new Map();
    for(const {system,f} of fixtures){
      expect(f.routes).toHaveLength(system.routeCount);f.update(system.reference,system.reference*.25,0,false);
      for(const route of f.routes){buffers.set(route,{geometry:route.body.geometry,position:route.body.geometry.attributes.position,normal:route.body.geometry.attributes.normal});initialLengths.set(route,route.curve.getLength());}
    }
    // Move out and back, including the intermediate lengths where normalized
    // phase-speed filtering would produce a transient surge or lag.
    for(let frame=1;frame<=40;frame++)for(const {system,f} of fixtures){
      const before=f.routes.map(phase),fraction=frame<=20?frame/20:(40-frame)/20;
      f.layout(fraction);f.update(system.reference,system.reference*.25,.02,true);
      f.routes.forEach((route,index)=>{
        expect(traveled(route,before[index])).toBeCloseTo(.75*.02,11);
        const data=markers(route)[0].userData,saved=buffers.get(route);
        expect(data.cueMode).toBe('distance-flow');expect(data.worldFlowRate).toBe(.75);expect(data.targetWorldFlowRate).toBe(.75);
        expect(data.flowRate*5*route.curve.getLength()).toBeCloseTo(.75,12);
        expect(route.body.geometry).toBe(saved.geometry);expect(route.body.geometry.attributes.position).toBe(saved.position);expect(route.body.geometry.attributes.normal).toBe(saved.normal);checkPositions(route);
      });
      if(frame===20)expect(f.routes.some(route=>Math.abs(route.curve.getLength()-initialLengths.get(route))>1)).toBe(true);
    }
    for(const {f} of fixtures){
      const versions=f.routes.map(route=>route.body.geometry.attributes.position.version);f.layout(0);
      f.routes.forEach((route,index)=>expect(route.body.geometry.attributes.position.version).toBe(versions[index]));
    }
  });
});

describe.each(systems)('$name thermal motion',system=>{
  it('smooths positive heat changes before converting to the changing route length',()=>{
    const fixed=fixture(system),moving=fixture(system),low=system.reference/16,high=system.reference*4;
    for(const f of [fixed,moving])f.update(low,low*.25,0,false);
    for(const target of [high,system.reference/4]){
      const phases=moving.routes.map(phase),beforeRate=markers(moving.routes[0])[0].userData.worldFlowRate,targetRate=.75*Math.sqrt(target/system.reference);
      moving.update(target,target*.25,0,true);fixed.update(target,target*.25,0,true);
      moving.routes.forEach((route,index)=>{expect(phase(route)).toBe(phases[index]);expect(markers(route)[0].userData.worldFlowRate).toBe(beforeRate);expect(markers(route)[0].userData.targetWorldFlowRate).toBe(targetRate);});
      for(let frame=1;frame<=12;frame++){
        const moved=moving.routes.map(phase),stayed=fixed.routes.map(phase),previous=markers(moving.routes[0])[0].userData.worldFlowRate,dt=.025;
        moving.layout(frame/12);moving.update(target,target*.25,dt,true);fixed.update(target,target*.25,dt,true);
        moving.routes.forEach((route,index)=>{
          const data=markers(route)[0].userData,distance=traveled(route,moved[index]);
          expect(distance).toBeCloseTo(traveled(fixed.routes[index],stayed[index]),11);
          expect(distance).toBeGreaterThan(Math.min(previous,targetRate)*dt);expect(distance).toBeLessThan(Math.max(previous,targetRate)*dt);
          expect(data.worldFlowRate).toBeGreaterThan(Math.min(beforeRate,targetRate));expect(data.worldFlowRate).toBeLessThan(Math.max(beforeRate,targetRate));
          expect(data.worldFlowRate).toBeCloseTo(markers(fixed.routes[index])[0].userData.worldFlowRate,12);
          expect(data.targetWorldFlowRate).toBe(targetRate);checkPositions(route);
        });
      }
    }
  });

  it('integrates equal world travel at different frame rates while the layout changes',()=>{
    function simulate(dt,frames){
      const f=fixture(system),totals=f.routes.map(()=>0);f.update(system.reference/16,0,0,false);
      for(let i=1;i<=frames;i++){
        const before=f.routes.map(phase);f.layout(i/frames);f.update(system.reference*4,system.reference,dt,true);
        f.routes.forEach((route,index)=>totals[index]+=traveled(route,before[index]));
      }
      return {f,totals};
    }
    const fast=simulate(.01,40),slow=simulate(.05,8);
    fast.f.routes.forEach((route,index)=>{
      expect(fast.totals[index]).toBeCloseTo(slow.totals[index],11);
      expect(markers(route)[0].userData.worldFlowRate).toBeCloseTo(markers(slow.f.routes[index])[0].userData.worldFlowRate,12);
    });
  });

  it('preserves paused phase, advances one explicit step and stops immediately at zero before restarting',()=>{
    const f=fixture(system);f.update(system.reference,system.reference*.25,.1,true);
    const before=f.routes.map(phase);f.layout(1);f.update(system.reference*4,system.reference,0,false);
    f.routes.forEach((route,index)=>{expect(phase(route)).toBe(before[index]);expect(markers(route)[0].userData.worldFlowRate).toBe(1.5);checkPositions(route);});
    f.update(system.reference*4,system.reference,.1,false);
    f.routes.forEach((route,index)=>expect(traveled(route,before[index])).toBeCloseTo(.15,11));
    const stopped=f.routes.map(phase);f.update(0,0,.1,true);f.layout(.45);f.update(0,0,0,false);
    f.routes.forEach((route,index)=>{
      expect(phase(route)).toBe(stopped[index]);expect(route.group.visible).toBe(true);expect(route.body.visible).toBe(true);expect(route.body.material.emissiveIntensity).toBe(0);
      for(const marker of [...markers(route),arrow(route)]){expect(marker.visible).toBe(false);expect(marker.userData.worldFlowRate).toBe(0);expect(marker.userData.targetWorldFlowRate).toBe(0);expect(marker.userData.flowStrength).toBe(0);}
      checkPositions(route);
    });
    f.update(system.reference,system.reference*.25,0,true);
    f.routes.forEach((route,index)=>{expect(phase(route)).toBe(stopped[index]);expect(markers(route).every(marker=>marker.visible)).toBe(true);});
    f.update(system.reference,system.reference*.25,.02,true);
    f.routes.forEach((route,index)=>{expect(traveled(route,stopped[index])).toBeGreaterThan(0);expect(traveled(route,stopped[index])).toBeLessThan(.75*.02);expect(markers(route)[0].userData.worldFlowRate).toBeGreaterThan(0);expect(markers(route)[0].userData.worldFlowRate).toBeLessThan(.75);});
  });

  it('keeps thermal travel independent of electrical conversion efficiency',()=>{
    const low=fixture(system),high=fixture(system),heat=system.reference/4;
    low.update(heat,heat*.15,0,false);high.update(heat,heat*.65,0,false);
    for(const fraction of [0,.4,1]){
      low.layout(fraction);high.layout(fraction);const before=low.routes.map(phase);
      const lowRun=low.update(heat,heat*.15,.1,true),highRun=high.update(heat,heat*.65,.1,true);
      expect(lowRun.power).toBe(heat*.15);expect(highRun.power).toBe(heat*.65);
      low.routes.forEach((route,index)=>{
        const a=markers(route)[0].userData,b=markers(high.routes[index])[0].userData;
        expect(a.progress).toBe(b.progress);expect(a.worldFlowRate).toBe(.375);expect(a.worldFlowRate).toBe(b.worldFlowRate);expect(a.flowStrength).toBe(b.flowStrength);expect(traveled(route,before[index])).toBeCloseTo(.0375,11);
        expect(route.group.userData.thermalPower??route.group.userData.drivingHeat).toBe(heat);
      });
    }
  });

  it('keeps low-heat markers visible through translucent walls without changing their strength rule',()=>{
    const f=fixture(system),heat=system.reference/1000000;f.update(heat,heat*.25,0,false);
    for(const route of f.routes){
      expect(route.body.visible).toBe(true);expect(route.body.material.transparent).toBe(true);expect(route.body.material.opacity).toBe(.48);expect(route.body.material.depthWrite).toBe(false);
      for(const marker of [...markers(route),arrow(route)]){
        expect(marker.visible).toBe(true);expect(marker.userData.worldFlowRate).toBeCloseTo(.00075,12);expect(marker.userData.flowStrength).toBeCloseTo(system.name==='CSP'?.001:1,12);
      }
    }
  });
});

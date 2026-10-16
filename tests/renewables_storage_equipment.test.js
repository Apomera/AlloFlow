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

// Use the complete production storage assembly and real selected-minute model.
// Only the WebGL renderer and screen-space labels are omitted.
function fixture(){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
    var load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');function label(){}
    ${branch}
    function update(run,dt,animate,syncResponse){var p={run:run,dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,inspection:{trace:false,cutaway:false}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);storageWiring.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);storageWiring.update();scene.updateMatrixWorld(true);}
    return {scene,A,B,C,update,layout,wiring:storageWiring,supply:storageSupply,inverter:storageInverter};
  })()`,{THREE});
  f.fills=[0,1,2].map(i=>f.scene.getObjectByName('energy-storage-fill-'+i));
  f.modules=Array.from({length:3},(_,i)=>Array.from({length:5},(_,level)=>f.scene.getObjectByName('energy-storage-module-'+i+'-'+level)));
  f.cooling=['charge','discharge'].map(key=>f.scene.getObjectByName('energy-storage-'+key+'-cooling'));
  f.fans=f.cooling.map(group=>group.getObjectByName(group.name+'-fan'));
  roots.push(f.scene);return f;
}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function lossRate(run,index){const eta=Math.sqrt(run.settings.roundtrip/100);return index===0?run.available*(1-eta):run.power*(1/eta-1);}
function fanRate(run,index){return .9*Math.sqrt(lossRate(run,index)/2.5);}
function immutable(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')immutable(v);});return Object.freeze(value);}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe('Storage modules and state-of-charge gauges',()=>{
  it.each([0,21.375,100])('shows exactly %s percent charge without changing the physical battery modules',soc=>{
    const f=fixture(),run=runStorage({initial:soc,power:0},0);f.update(run,0,false);
    f.fills.forEach((fill,i)=>{
      const x=-1.5+i*1.05,height=soc/100*2.3,b=bounds(fill);
      expect(fill.visible).toBe(soc>0);expect(fill.position.x).toBeCloseTo(x-.38,12);
      expect(fill.position.y).toBeCloseTo(.15+height/2,12);expect(fill.position.z).toBe(.75);expect(fill.userData.soc).toBe(run.extra.soc);
      expect(b.max.y-b.min.y).toBeCloseTo(height,7);expect(b.min.y).toBeCloseTo(.15,7);
      expect(b.max.x-b.min.x).toBeCloseTo(.06,8);expect(b.max.z-b.min.z).toBeCloseTo(.035,8);
      expect(b.min.z).toBeGreaterThan(.70);
      f.modules[i].forEach((module,level)=>{
        expect(module.visible).toBe(true);expect(module.position.toArray()).toEqual([x,.38+level*.46,-.015]);
        const geometry=module.geometry.parameters;expect(geometry.width).toBe(.58);expect(geometry.height).toBe(.37);expect(geometry.depth).toBe(1.08);
        expect(module.scale.toArray()).toEqual([1,1,1]);
      });
    });
  });

  it('updates charge immediately while animated motion is paused or smoothing',()=>{
    const f=fixture();f.update(runStorage({initial:5,power:0},0),0,false);
    const before=f.modules.flat().map(m=>({position:m.position.clone(),scale:m.scale.clone(),geometry:m.geometry}));
    for(const animate of[true,false])for(const soc of[98.123,0,42.25,100]){
      const run=runStorage({initial:soc,power:0},0);f.update(run,.02,animate);
      f.fills.forEach(fill=>expect(fill.scale.y*.1).toBeCloseTo(run.extra.soc/100*2.3,12));
      f.modules.flat().forEach((module,i)=>{expect(module.position.equals(before[i].position)).toBe(true);expect(module.scale.equals(before[i].scale)).toBe(true);expect(module.geometry).toBe(before[i].geometry);});
    }
  });

  it('keeps module trays physically separate and inside their own rack',()=>{
    const f=fixture();f.update(runStorage({},30),0,false);
    for(let i=0;i<3;i++){
      const rack=bounds(f.scene.getObjectByName('energy-storage-rack-'+i));
      f.modules[i].forEach((module,level)=>{
        const b=bounds(module);expect(rack.containsBox(b)).toBe(true);
        if(level>0)expect(b.min.y-bounds(f.modules[i][level-1]).max.y).toBeGreaterThan(.08);
        expect(b.max.z).toBeLessThan(bounds(f.fills[i]).min.z);
      });
    }
  });
});

describe('Storage converter cooling response',()=>{
  it('mounts both guarded five-blade fans on the cabinets with clearance throughout rotation',()=>{
    const f=fixture();f.update(runStorage({},30),0,false);
    f.cooling.forEach((group,index)=>{
      const mount=group.getObjectByName(group.name+'-mount'),housing=group.getObjectByName(group.name+'-housing'),cabinet=index===0?f.supply:f.inverter;
      expect(bounds(mount).min.z).toBeLessThan(bounds(cabinet).max.z);expect(bounds(mount).max.z).toBeGreaterThan(bounds(housing).min.z);
      const rim=group.children.find(o=>o.geometry?.type==='TorusGeometry'),innerRadius=rim.geometry.parameters.radius-rim.geometry.parameters.tube;
      const blades=Array.from({length:5},(_,i)=>group.getObjectByName(group.name+'-blade-'+i));
      expect(new Set(blades).size).toBe(5);const origin=group.getWorldPosition(new THREE.Vector3());
      for(let step=0;step<12;step++){
        f.fans[index].rotation.z=step*Math.PI/6;f.scene.updateMatrixWorld(true);
        for(const blade of blades){
          expect(bounds(blade).min.z-bounds(housing).max.z).toBeGreaterThan(.005);
          expect(bounds(blade).max.z).toBeLessThan(origin.z+.108);
          const positions=blade.geometry.attributes.position;
          for(let i=0;i<positions.count;i++){const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(blade.matrixWorld);expect(Math.hypot(point.x-origin.x,point.y-origin.y)).toBeLessThan(innerRadius-.005);}
        }
      }
    });
  });

  it.each([[30,0],[75,1]])('drives only the converter with active transfer at minute %s', (minute,index)=>{
    const f=fixture(),run=runStorage({capacity:300,power:80,initial:30,roundtrip:81},minute);f.update(run,.2,true);
    for(let i=0;i<2;i++){
      const data=f.cooling[i].userData,active=i===index;
      expect(data.activePower).toBe(active?80:0);expect(data.efficiency).toBeCloseTo(.9,12);
      expect(data.conversionLoss).toBeCloseTo(lossRate(run,i),12);
      expect(f.fans[i].userData.motionRate).toBeCloseTo(fanRate(run,i),12);
      expect(f.fans[i].rotation.z).toBeCloseTo(-fanRate(run,i)*.2,12);
    }
    // Instantaneous heat matches the derivative of the model's cumulative loss.
    const next=runStorage(run.settings,minute+.001),loss=(next.extra.loss-run.extra.loss)*60/.001;
    expect(f.cooling[index].userData.conversionLoss).toBeCloseTo(loss,7);
  });

  it.each([[30,0],[75,1]])('responds smoothly to load changes with exact loss readings at minute %s', (minute,index)=>{
    const f=fixture(),low=runStorage({capacity:300,initial:40,power:20,roundtrip:64},minute),high=runStorage({...low.settings,power:80},minute);
    f.update(low,0,false);const initial=f.fans[index].userData.motionRate,angle=f.fans[index].rotation.z,target=fanRate(high,index);
    f.update(high,0,true);expect(f.fans[index].rotation.z).toBe(angle);expect(f.fans[index].userData.motionRate).toBe(initial);expect(f.cooling[index].userData.conversionLoss).toBeCloseTo(lossRate(high,index),12);
    let previous=initial;
    for(let frame=0;frame<20;frame++){f.update(high,.02,true);expect(f.fans[index].userData.motionRate).toBeGreaterThan(previous);expect(f.fans[index].userData.motionRate).toBeLessThan(target);previous=f.fans[index].userData.motionRate;}
    expect(previous).toBeCloseTo(target+(initial-target)*Math.exp(-1),12);
    expect(f.fans[index].rotation.z-angle).toBeCloseTo(-(target*.4+(initial-target)*.4*(1-Math.exp(-1))),12);
    f.update(low,.02,true);expect(f.fans[index].userData.motionRate).toBeLessThan(previous);expect(f.fans[index].userData.motionRate).toBeGreaterThan(initial);
  });

  it('uses efficiency and current transfer rather than SOC or cumulative past losses to drive the fans',()=>{
    const f=fixture();
    for(const [minute,index] of[[30,0],[75,1]]){
      const a=runStorage({capacity:500,power:50,initial:40,roundtrip:64},minute),b=runStorage({...a.settings,roundtrip:96},minute);
      f.update(a,0,false);const slow=f.fans[index].userData.motionRate;
      f.update(b,0,false);expect(f.fans[index].userData.motionRate).toBeLessThan(slow);expect(f.cooling[index].userData.activePower).toBe(50);
      const c=runStorage({...b.settings,initial:65},minute);f.update(c,0,false);expect(f.fans[index].userData.motionRate).toBeCloseTo(fanRate(b,index),12);expect(c.extra.soc).not.toBe(b.extra.soc);
    }
    const complete=runStorage({roundtrip:64},120);expect(complete.extra.loss).toBeGreaterThan(0);f.update(complete,.2,true);
    f.fans.forEach(fan=>expect(fan.userData.motionRate).toBe(0));
  });

  it('shows no cooling at ideal efficiency even while charge or discharge cables are active',()=>{
    const f=fixture();
    for(const minute of[30,75]){
      const run=runStorage({capacity:300,initial:40,power:80,roundtrip:100},minute);f.update(run,.2,true);
      expect(run.available+run.power).toBe(80);f.cooling.forEach(group=>expect(group.userData.conversionLoss).toBe(0));f.fans.forEach(fan=>expect(fan.userData.motionRate).toBe(0));
      expect(f.wiring.routes.some(route=>route.group.children.some(o=>/-marker-/.test(o.name)&&o.visible))).toBe(true);
    }
  });

  it.each([['full',{initial:100},0],['empty',{capacity:10,power:200},100],['zero transfer',{power:0},30],['completed cycle',{},120]])('stops and preserves phase when the bank is %s',(_label,settings,minute)=>{
    const f=fixture();f.update(runStorage({},30),.2,true);f.update(runStorage({},75),.2,true);const angles=f.fans.map(fan=>fan.rotation.z);
    f.update(runStorage(settings,minute),.2,true);f.fans.forEach((fan,i)=>{expect(fan.rotation.z).toBe(angles[i]);expect(fan.userData.motionRate).toBe(0);expect(f.cooling[i].userData.conversionLoss).toBe(0);});
    const active=runStorage({},30);f.update(active,.02,true);expect(f.fans[0].rotation.z).toBeLessThan(angles[0]);expect(f.fans[0].userData.motionRate).toBeLessThan(fanRate(active,0));expect(f.fans[1].rotation.z).toBe(angles[1]);
  });

  it.each(['Sequence complete','Cycle complete','Scenario complete'])('stops stale converter power at %s',status=>{
    const f=fixture();f.update(runStorage({},30),.2,true);const angles=f.fans.map(fan=>fan.rotation.z);
    f.update({...runStorage({},30),power:50,status},.2,true);
    f.fans.forEach((fan,i)=>{expect(fan.rotation.z).toBe(angles[i]);expect(fan.userData.motionRate).toBe(0);expect(f.cooling[i].userData.activePower).toBe(0);expect(f.cooling[i].userData.conversionLoss).toBe(0);});
  });

  it('preserves fan angles on paused edits and advances only an explicit manual or reduced-motion step',()=>{
    const f=fixture();f.update(runStorage({power:20},30),.2,true);const angle=f.fans[0].rotation.z,run=runStorage({power:150,capacity:300},30);
    f.update(run,0,false);expect(f.fans[0].rotation.z).toBe(angle);expect(f.fans[0].userData.motionRate).toBeCloseTo(fanRate(run,0),12);
    f.update(run,.1,false,true);expect(f.fans[0].rotation.z).toBeCloseTo(angle-fanRate(run,0)*.1,12);
    const stepped=f.fans[0].rotation.z;for(let i=0;i<5;i++)f.update(run,0,false);expect(f.fans[0].rotation.z).toBe(stepped);
  });

  it('preserves integrated fan angle through different frame rates and playback speeds',()=>{
    for(const index of[0,1]){
      const a=fixture(),b=fixture(),c=fixture(),minute=index===0?30:75;
      const low=runStorage({capacity:300,initial:40,power:20},minute),high=runStorage({...low.settings,power:120},minute);
      for(const f of[a,b,c])f.update(low,0,false);a.update(high,.8,true);
      for(let i=0;i<24;i++)b.update(high,1/30,true);for(let i=0;i<96;i++)c.update(high,1/60*.5,true);
      for(const f of[b,c]){expect(f.fans[index].rotation.z).toBeCloseTo(a.fans[index].rotation.z,11);expect(f.fans[index].userData.motionRate).toBeCloseTo(a.fans[index].userData.motionRate,11);}
    }
  });

  it('keeps equipment attached to its stage and preserves buffers and exact run values',()=>{
    const f=fixture(),run=immutable(runStorage({capacity:300,initial:35,power:75,roundtrip:82},78.25)),exact=JSON.stringify(run),saved=[];
    f.scene.traverse(o=>{if(o.geometry)saved.push({o,geometry:o.geometry,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,index:o.geometry.index,material:o.material});});
    f.update(run,.2,true);const angles=f.fans.map(fan=>fan.rotation.z),fillPositions=f.fills.map(fill=>fill.position.clone());
    expect(f.cooling[0].parent).toBe(f.A);expect(f.cooling[1].parent).toBe(f.C);
    for(const isolated of[0,1,2,null]){
      f.layout(true,isolated);f.update(run,0,true);
      expect(visible(f.cooling[0])).toBe(isolated==null||isolated===0);expect(visible(f.cooling[1])).toBe(isolated==null||isolated===2);
      f.fans.forEach((fan,i)=>expect(fan.rotation.z).toBe(angles[i]));f.fills.forEach((fill,i)=>{expect(visible(fill)).toBe(isolated==null||isolated===1);expect(fill.position.equals(fillPositions[i])).toBe(true);});
    }
    for(let i=0;i<60;i++)f.update(run,1/60,true);expect(JSON.stringify(run)).toBe(exact);
    for(const entry of saved){expect(entry.o.geometry).toBe(entry.geometry);expect(entry.geometry.attributes.position).toBe(entry.position);expect(entry.geometry.attributes.normal).toBe(entry.normal);expect(entry.geometry.index).toBe(entry.index);expect(entry.o.material).toBe(entry.material);}
  });
});

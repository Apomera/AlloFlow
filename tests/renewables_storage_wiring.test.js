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
const helpers=['material','mesh','box','cylinder','ball','pipe','glow','response','particles','cabinet','deformTube','storageBus','storageConnections'].map(helper).join('\n');
function fixture(){
  return vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,streamCount=0,markerUpdaters=[];
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
    var supply=cabinet(A,-4,1,0,1.4,2,1.3,'#a7bace'),racks=[-1.5,-.45,.6].map(function(x){return box(B,x,1.3,0,.86,2.6,1.3,'#6c8c94');}),inverter=cabinet(C,2.8,1,0,1.2,1.9,1.4,'#d9e7df'),load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');
    var bus=storageBus(B),wiring=storageConnections(A,B,C);
    function layout(exploded,isolated){[A,B,C].forEach(function(group,index){group.position.set(exploded?(index-1)*3.4:0,exploded&&index===1?.8:0,0);group.visible=isolated==null||isolated===index;});scene.updateMatrixWorld(true);wiring.update();scene.updateMatrixWorld(true);}
    layout(false);
    return {scene:scene,A:A,B:B,C:C,supply:supply,racks:racks,inverter:inverter,load:load,bus:bus,wiring:wiring,layout:layout,
      update:function(available,power,dt,animate,status){markerUpdaters.forEach(function(fn){fn({run:{available:available,power:power,status:status||'Operating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}});});}};
  })()`,{THREE});
}
function path(mesh){return mesh.geometry.parameters.path;}
function markers(route){return route.group.children.filter(object=>/-marker-/.test(object.name));}
function samples(curve,count=40){return Array.from({length:count+1},(_,i)=>curve.getPoint(i/count));}
function checkEndpoints(f){
  f.scene.updateMatrixWorld(true);
  for(const route of f.wiring.routes)for(const [u,port] of [[0,route.from],[1,route.to]]){
    const actual=route.curve.getPoint(u).applyMatrix4(route.group.matrixWorld),expected=port.getWorldPosition(new THREE.Vector3());
    expect(actual.distanceTo(expected)).toBeLessThan(1e-12);
  }
}

describe('Storage polarity bus geometry',()=>{
  it('connects every rack terminal to its matching straight bus',()=>{
    const {bus}=fixture();expect(bus.branches).toHaveLength(6);
    for(const [index,x] of [-1.5,-.45,.6].entries())for(const [name,sign,rail] of [['positive',-1,bus.positive],['negative',1,bus.negative]]){
      const branch=bus.group.getObjectByName('energy-storage-'+name+'-branch-'+index),curve=path(branch),start=curve.getPoint(0),end=curve.getPoint(1);
      expect(start.distanceTo(new THREE.Vector3(x+sign*.2,2.875,0))).toBeLessThan(1e-12);
      const railPath=path(rail),nearest=new THREE.Line3(railPath.getPoint(0),railPath.getPoint(1)).closestPointToPoint(end,true,new THREE.Vector3());
      expect(end.distanceTo(nearest)).toBeLessThan(1e-12);expect(Math.sign(end.z)).toBe(sign);
    }
  });

  it('keeps all positive and negative conductors physically separated',()=>{
    const {bus}=fixture(),positive=[bus.positive,...bus.branches.filter(object=>object.name.includes('-positive-'))],negative=[bus.negative,...bus.branches.filter(object=>object.name.includes('-negative-'))];
    for(const a of positive)for(const b of negative){
      const clearance=a.geometry.parameters.radius+b.geometry.parameters.radius;
      for(const pa of samples(path(a)))for(const pb of samples(path(b)))expect(pa.distanceTo(pb)).toBeGreaterThan(clearance+.01);
    }
    expect(path(bus.positive).getPoint(1).x).toBeCloseTo(.4,12);expect(path(bus.negative).getPoint(1).x).toBeCloseTo(.8,12);
  });
});

describe('Storage external cable attachment',()=>{
  it('lands on actual cabinet and bank surfaces with ports parented to their equipment stage',()=>{
    const f=fixture(),p=f.wiring.ports;
    for(const [key,object,axis,face] of [['charge-supply',f.supply,'x','max'],['charge-bank',f.racks[0],'x','min'],['discharge-bank',f.racks[2],'x','max'],['inverter-input',f.inverter,'x','min'],['inverter-output',f.inverter,'x','max'],['load',f.load,'z','min']]){
      expect(p[key].position[axis]).toBeCloseTo(new THREE.Box3().setFromObject(object)[face][axis],7);
      expect(p[key].parent).toBe(object.parent);
    }
    checkEndpoints(f);
  });

  it('keeps the external spans outside equipment except at the visible terminal joins',()=>{
    const f=fixture(),bodies=[f.supply,...f.racks,f.inverter,f.load].map(object=>new THREE.Box3().setFromObject(object));
    for(const route of f.wiring.routes)for(const point of samples(route.curve,120)){
      if(point.distanceTo(route.from.position)<.11||point.distanceTo(route.to.position)<.11)continue;
      for(const body of bodies)expect(body.distanceToPoint(point)).toBeGreaterThan(.044);
    }
  });

  it('retains real endpoint attachment and every geometry buffer through layout changes',()=>{
    const f=fixture();f.update(50,0,.1);
    const before=f.wiring.routes.map(route=>({geometry:route.body.geometry,positions:route.body.geometry.attributes.position,normals:route.body.geometry.attributes.normal,phase:markers(route)[0].userData.progress}));
    for(const exploded of [true,false,true,false]){
      f.layout(exploded);f.update(50,0,0);checkEndpoints(f);
      f.wiring.routes.forEach((route,index)=>{expect(route.body.geometry).toBe(before[index].geometry);expect(route.body.geometry.attributes.position).toBe(before[index].positions);expect(route.body.geometry.attributes.normal).toBe(before[index].normals);expect(markers(route)[0].userData.progress).toBe(before[index].phase);});
    }
    const versions=f.wiring.routes.map(route=>route.body.geometry.attributes.position.version);f.wiring.update();
    f.wiring.routes.forEach((route,index)=>expect(route.body.geometry.attributes.position.version).toBe(versions[index]));
  });

  it('hides cross-stage cables when either attached stage is isolated away',()=>{
    const f=fixture();
    for(const selected of [0,1,2]){
      f.layout(true,selected);expect(f.wiring.routes[0].group.visible).toBe(false);expect(f.wiring.routes[1].group.visible).toBe(false);expect(f.wiring.routes[2].group.visible).toBe(selected===2);
    }
    f.layout(true);expect(f.wiring.routes.every(route=>route.group.visible)).toBe(true);checkEndpoints(f);
  });
});

describe('Storage transfer route semantics',()=>{
  it('animates only the accepted charging route or the two delivered-output routes',()=>{
    const f=fixture();f.update(50,0,.1);
    expect(markers(f.wiring.routes[0]).some(marker=>marker.visible)).toBe(true);
    for(const route of f.wiring.routes.slice(1))expect(markers(route).every(marker=>!marker.visible)).toBe(true);
    f.update(0,30,0,false);
    expect(markers(f.wiring.routes[0]).every(marker=>!marker.visible)).toBe(true);
    for(const route of f.wiring.routes.slice(1)){expect(markers(route).some(marker=>marker.visible)).toBe(true);for(const marker of markers(route))expect(marker.userData.power).toBe(30);}
    expect(f.bus.group.children.every(object=>!object.name.includes('-marker-'))).toBe(true);
  });

  it('preserves paused phases, stops zero transfer immediately, and shows no final-boundary flow',()=>{
    const f=fixture();f.update(0,50,.1);const phases=f.wiring.routes.map(route=>markers(route)[0].userData.progress);
    f.update(0,100,0,false);f.wiring.routes.forEach((route,index)=>expect(markers(route)[0].userData.progress).toBe(phases[index]));
    f.update(0,0,.1);for(const route of f.wiring.routes)expect(markers(route).every(marker=>!marker.visible&&marker.userData.power===0)).toBe(true);
    f.update(0,50,0);f.wiring.routes.forEach((route,index)=>expect(markers(route)[0].userData.progress).toBe(phases[index]));
    f.update(50,50,.1,true,'Cycle complete');for(const route of f.wiring.routes)expect(markers(route).every(marker=>!marker.visible&&marker.userData.power===0)).toBe(true);
  });
});

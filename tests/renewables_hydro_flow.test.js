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
function declaration(startText,endText){const start=source.indexOf(startText,sceneStart),end=source.indexOf(endText,start);if(start<0||end<0)throw Error(`Missing ${startText}`);return source.slice(start,end+endText.length);}
const helperCode=['material','mesh','box','cylinder','ball','pipe','glow','response','particles','ring','cabinet','generatorDetail','hydroDrivetrain','electricity','hydroElectricalConnections'].map(helper).join('\n');
function fixture(){
  return vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],referencePower=1000;
    ${helperCode}
    var B=new THREE.Group(),C=new THREE.Group(),driver=new THREE.Group();driver.name='energy-hydro-runner';
    var drive=hydroDrivetrain(B,C,driver);
    ${declaration('var hydroSwitchgear=cabinet(C,',"hydroSwitchgear.name='energy-hydro-switchgear';")}
    ${declaration('var load=box(C,',"load.name='energy-output-load';")}
    var routes=hydroElectricalConnections(C);C.updateMatrixWorld(true);
    return {parent:C,drive:drive,switchgear:hydroSwitchgear,load:load,routes:routes,
      update:function(power,dt,animate,status){markerUpdaters.forEach(function(fn){fn({run:{power:power,status:status||'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}});});}};
  })()`,{THREE});
}
function routeMeshes(group){return group.children.filter(object=>object.isMesh);}
function curve(group){return group.children.find(object=>object.geometry?.type==='TubeGeometry').geometry.parameters.path;}
function markers(group){return group.children.filter(object=>/-marker-/.test(object.name));}
function port(f,index){return f.parent.getObjectByName('energy-hydro-electrical-port-'+index);}
function points(path){return Array.from({length:501},(_,i)=>path.getPoint(i/500));}

describe('Hydro generator electrical route geometry',()=>{
  it('meets the generator shell, switchgear side/front, and load back face at visible terminals',()=>{
    const f=fixture();f.parent.updateMatrixWorld(true);
    const cover=new THREE.Box3().setFromObject(f.drive.cover),cabinet=new THREE.Box3().setFromObject(f.switchgear),load=new THREE.Box3().setFromObject(f.load);
    expect(port(f,0).position.x).toBeCloseTo(cover.max.x,7);
    expect(port(f,1).position.x).toBeCloseTo(cabinet.min.x,7);
    expect(port(f,2).position.z).toBeCloseTo(cabinet.max.z,7);
    expect(port(f,3).position.z).toBeCloseTo(load.min.z,7);
    for(const [group,a,b] of [[f.routes.incoming,0,1],[f.routes.outgoing,2,3]]){
      expect(curve(group).getPoint(0).distanceTo(port(f,a).position)).toBeLessThan(1e-12);
      expect(curve(group).getPoint(1).distanceTo(port(f,b).position)).toBeLessThan(1e-12);
    }
  });

  it('departs the switchgear outward instead of curving back through its front face',()=>{
    const f=fixture(),bounds=new THREE.Box3().setFromObject(f.switchgear),path=curve(f.routes.outgoing);
    for(const point of points(path)){
      if(point.x<bounds.max.x+.04)expect(point.z).toBeGreaterThanOrEqual(bounds.max.z-1e-7);
      if(point.distanceTo(port(f,2).position)>.08)expect(bounds.distanceToPoint(point)).toBeGreaterThan(.039);
    }
  });

  it('keeps external cable spans clear of the generator body and the tailrace corridor',()=>{
    const f=fixture(),body=new THREE.Box3().setFromObject(f.drive.cover);
    for(const point of points(curve(f.routes.incoming))){
      if(point.distanceTo(port(f,0).position)>.08)expect(body.distanceToPoint(point)).toBeGreaterThan(.039);
      expect(point.z).toBeLessThan(-.9);
    }
    for(const point of points(curve(f.routes.outgoing))){
      expect(Math.hypot(point.x-1,point.y-.8)).toBeGreaterThan(.84);
      if(point.z>.87)expect(point.x).toBeGreaterThan(4.14);
      expect(point.y).toBeCloseTo(.32,12);
    }
  });

  it('keeps the rotating core and fixed windings unobscured by switchgear in the side projection',()=>{
    const f=fixture(),cabinet=new THREE.Box3().setFromObject(f.switchgear);
    const stators=f.drive.group.children.filter(object=>/^energy-generator-stator-/.test(object.name));
    expect(stators).toHaveLength(8);
    // In the side camera, world z is the horizontal image direction. Disjoint
    // z intervals prevent the cabinet from covering either electrical assembly.
    for(const angle of [0,Math.PI/3,Math.PI/2,Math.PI]){
      f.drive.assembly.rotor.rotation.z=angle;f.parent.updateMatrixWorld(true);
      const core=new THREE.Box3().setFromObject(f.drive.assembly.rotor),windings=new THREE.Box3();
      stators.forEach(stator=>windings.union(new THREE.Box3().setFromObject(stator)));
      expect(core.min.z-cabinet.max.z).toBeGreaterThan(.02);
      expect(windings.min.z-cabinet.max.z).toBeGreaterThan(.02);
    }
  });

  it('keeps both runs attached after generation-stage separation and translation',()=>{
    const f=fixture();f.parent.position.set(3.4,.8,-.2);f.parent.rotation.y=.2;f.parent.updateMatrixWorld(true);
    for(const [group,a,b] of [[f.routes.incoming,0,1],[f.routes.outgoing,2,3]]){
      expect(group.parent).toBe(f.parent);
      for(const [u,index] of [[0,a],[1,b]]){
        const endpoint=curve(group).getPoint(u).applyMatrix4(group.matrixWorld),terminal=port(f,index).getWorldPosition(new THREE.Vector3());
        expect(endpoint.distanceTo(terminal)).toBeLessThan(1e-12);
      }
    }
  });
});

describe('Hydro electrical flow response',()=>{
  it('carries the same exact delivered power through both external runs while strength eases',()=>{
    const f=fixture();f.update(100,0);const initial=markers(f.routes.incoming)[0].userData.flowStrength;
    f.update(500,.1);
    for(const group of [f.routes.incoming,f.routes.outgoing])for(const marker of markers(group)){
      expect(marker.userData.power).toBe(500);expect(marker.userData.flowStrength).toBeGreaterThan(initial);expect(marker.userData.flowStrength).toBeLessThan(1/3);
      expect(marker.userData.flowRate).toBeGreaterThan(0);
    }
    const incoming=markers(f.routes.incoming)[0],outgoing=markers(f.routes.outgoing)[0];
    expect(incoming.userData.worldFlowRate).toBe(.7);expect(outgoing.userData.worldFlowRate).toBe(.7);
    expect(incoming.userData.progress*curve(f.routes.incoming).getLength()).toBeCloseTo(outgoing.userData.progress*curve(f.routes.outgoing).getLength(),12);
  });

  it('preserves marker positions during paused efficiency changes and hides every stopped transfer immediately',()=>{
    const f=fixture();f.update(500,.1);
    const all=[...markers(f.routes.incoming),...markers(f.routes.outgoing)],positions=all.map(marker=>marker.position.clone()),phases=all.map(marker=>marker.userData.progress);
    f.update(250,0,false);
    all.forEach((marker,i)=>{expect(marker.position.equals(positions[i])).toBe(true);expect(marker.userData.progress).toBe(phases[i]);expect(marker.userData.power).toBe(250);});
    f.update(0,.1);
    all.forEach((marker,i)=>{expect(marker.visible).toBe(false);expect(marker.userData.power).toBe(0);expect(marker.userData.progress).toBe(phases[i]);});
    for(const group of [f.routes.incoming,f.routes.outgoing])expect(group.children.find(object=>/-direction$/.test(object.name)).visible).toBe(false);
    f.update(500,0);all.forEach((marker,i)=>expect(marker.userData.progress).toBe(phases[i]));
  });

  it('retains cable geometry and phase when the sequence reaches its final boundary',()=>{
    const f=fixture();f.update(500,.1);
    const objects=[...routeMeshes(f.routes.incoming),...routeMeshes(f.routes.outgoing)],geometries=objects.map(object=>object.geometry),before=markers(f.routes.incoming)[0].userData.progress;
    for(let i=0;i<100;i++)f.update(i%2?100:900,.02);
    objects.forEach((object,index)=>expect(object.geometry).toBe(geometries[index]));
    const phases=[f.routes.incoming,f.routes.outgoing].map(group=>markers(group)[0].userData.progress);expect(phases[0]).not.toBe(before);
    f.update(900,.1,true,'Sequence complete');
    for(const [index,group] of [f.routes.incoming,f.routes.outgoing].entries())for(const marker of markers(group)){expect(marker.visible).toBe(false);expect(marker.userData.progress).toBe(phases[index]);expect(marker.userData.power).toBe(0);}
  });
});

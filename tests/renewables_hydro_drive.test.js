import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(path.resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),scene=source.indexOf('function RenewablesEnergyScene(props)');
function section(first,last){const start=source.indexOf(first,scene),end=source.indexOf(last,start);if(start<0||end<0)throw new Error('Missing hydro drive helper: '+first);return source.slice(start,end);}
const code=[section('function material(','function strut('),section('function ball(','function pipe('),section('var responses={}','function particles('),section('function ring(','function generatorDetail('),section('function generatorDetail(','function label('),section('function runner(','function runnerReference('),section('function hydroDrivetrain(','function electricity(')].join('\n');
const roots=[];
function fixture(){
  const api=vm.runInNewContext(`(function(){${code};return {runner,hydroDrivetrain,motion};})()`,{THREE});
  const scene=new THREE.Group(),converter=new THREE.Group(),generator=new THREE.Group();scene.add(converter,generator);roots.push(scene);
  const driver=api.runner(converter,1,.8,.7,.6,'#edc36e');driver.name='energy-hydro-runner';
  driver.userData.motionRate=.6;driver.userData.motionTarget=.6;
  const drive=api.hydroDrivetrain(converter,generator,driver);scene.updateMatrixWorld(true);
  return {scene,converter,generator,driver,drive,motion:api.motion};
}
function box(object){return new THREE.Box3().setFromObject(object);}
function position(object){return object.getWorldPosition(new THREE.Vector3());}
function worldAxis(object){return new THREE.Vector3(0,0,1).applyQuaternion(object.getWorldQuaternion(new THREE.Quaternion()));}
function radialRange(object,origin){
  let min=Infinity,max=0;object.updateMatrixWorld(true);origin.updateMatrixWorld(true);
  object.traverse(node=>{if(!node.geometry)return;const points=node.geometry.attributes.position;
    for(let index=0;index<points.count;index++){const point=new THREE.Vector3().fromBufferAttribute(points,index).applyMatrix4(node.matrixWorld);origin.worldToLocal(point);const radius=Math.hypot(point.x,point.y);min=Math.min(min,radius);max=Math.max(max,radius);}
  });return {min,max};
}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material)object.material.dispose();});});

describe('Renewables hydro mechanical drive',()=>{
  it('places the turbine, extension, and generator on one physical axis',()=>{
    const {driver,drive}=fixture();
    for(const part of [driver,drive.shaft,drive.assembly.rotor]){const p=position(part);expect(p.x).toBe(1);expect(p.y).toBe(.8);expect(worldAxis(part).distanceTo(new THREE.Vector3(0,0,1))).toBeLessThan(1e-12);}
    expect(drive.group.name).toBe('energy-hydro-generator');expect(position(drive.group).z).toBe(-1.45);
    const axle=drive.shaft.getObjectByName('energy-hydro-drive-axle'),extension=box(axle),generatorAxle=box(drive.assembly.rotor.children[0]);
    expect(extension.min.z).toBeCloseTo(-.60,6);expect(extension.max.z).toBeCloseTo(driver.position.z,6);
    expect(generatorAxle.max.z-extension.min.z).toBeGreaterThan(.029);
    const coupling=box(drive.shaft.getObjectByName('energy-hydro-drive-coupling'));
    expect(coupling.intersectsBox(extension)).toBe(true);expect(coupling.intersectsBox(generatorAxle)).toBe(true);
  });

  it('seats the generator on the floor with connected feet that clear rotating components',()=>{
    const {drive}=fixture(),plinth=box(drive.group.getObjectByName('energy-hydro-generator-plinth'));
    expect(plinth.min.y).toBeCloseTo(-.07,6);
    const core=radialRange(drive.assembly.rotor,drive.group);
    for(let index=0;index<2;index++){
      const foot=drive.group.getObjectByName('energy-hydro-generator-foot-'+index),footBox=box(foot);
      expect(footBox.min.y).toBeCloseTo(plinth.max.y,6);
      expect(radialRange(foot,drive.group).min-core.max).toBeGreaterThan(.10);
      expect(footBox.intersectsBox(box(drive.cover))).toBe(true);
    }
  });

  it('keeps the rotating core inside the fixed windings and removable outer cover',()=>{
    const {drive}=fixture(),core=radialRange(drive.assembly.rotor,drive.group);
    const windings=drive.group.children.filter(object=>object.geometry?.type==='TorusGeometry'&&object.geometry.parameters.radius===.34);
    expect(windings).toHaveLength(3);
    for(const winding of windings)expect(radialRange(winding,drive.group).min-core.max).toBeGreaterThan(.018);
    expect(radialRange(drive.cover,drive.group).min-core.max).toBeGreaterThan(.18);
    expect(drive.cover.geometry.parameters.openEnded).toBe(true);
    expect(drive.cover.material.transparent).toBe(true);
  });

  it.each([0,Math.PI/7,-Math.PI*2.3,Math.PI*15])('copies the runner phase exactly at angle %s without a second animation clock',angle=>{
    const {driver,drive}=fixture();driver.rotation.z=angle;driver.userData.motionRate=.731;driver.userData.motionTarget=1.37;drive.sync();
    for(const part of [drive.shaft,drive.assembly.rotor]){expect(part.rotation.z).toBe(angle);expect(part.userData.motionRate).toBe(.731);expect(part.userData.motionTarget).toBe(1.37);expect(part.userData.driverName).toBe(driver.name);}
  });

  it('keeps core and coupling in phase through smooth acceleration, retargeting, and zero flow',()=>{
    const {driver,drive,motion,scene}=fixture();motion(driver,'hydro-runner',.2,{dt:0,animate:true},.32);drive.sync();
    const stators=drive.group.children.filter(object=>object.name.startsWith('energy-generator-stator-'));
    const stationary=stators.map(object=>object.matrixWorld.clone()),coverStart=drive.cover.matrixWorld.clone();
    for(const target of [3.2,.5,1.8,0,.4])for(let index=0;index<24;index++){
      const before=driver.rotation.z;motion(driver,'hydro-runner',target,{dt:.02,animate:true},.32);drive.sync();scene.updateMatrixWorld(true);
      expect(drive.shaft.rotation.z).toBe(driver.rotation.z);expect(drive.assembly.rotor.rotation.z).toBe(driver.rotation.z);
      expect(drive.assembly.rotor.userData.motionRate).toBe(driver.userData.motionRate);
      if(target===0)expect(driver.rotation.z).toBe(before);
      stators.forEach((object,i)=>expect(object.matrixWorld.equals(stationary[i])).toBe(true));expect(drive.cover.matrixWorld.equals(coverStart)).toBe(true);
    }
  });

  it('holds both shafts while paused and advances both by the exact manual step',()=>{
    const {driver,drive,motion}=fixture();motion(driver,'hydro-runner',.8,{dt:.1,animate:true},.32);drive.sync();const before=driver.rotation.z;
    motion(driver,'hydro-runner',1.2,{dt:0,animate:false},.32);drive.sync();expect(drive.shaft.rotation.z).toBe(before);expect(drive.assembly.rotor.rotation.z).toBe(before);
    motion(driver,'hydro-runner',1.2,{dt:.1,animate:false},.32);drive.sync();expect(before-drive.shaft.rotation.z).toBeCloseTo(.12,14);expect(drive.assembly.rotor.rotation.z).toBe(drive.shaft.rotation.z);
  });

  it('preserves phase and component ownership in separated or isolated inspection layouts',()=>{
    const {converter,generator,driver,drive,scene}=fixture();converter.position.set(0,.8,0);generator.position.set(3.4,0,0);converter.visible=false;
    driver.rotation.z=1.7;drive.sync();scene.updateMatrixWorld(true);
    expect(drive.shaft.parent).toBe(converter);expect(drive.group.parent).toBe(generator);expect(drive.assembly.rotor.parent).toBe(drive.group);
    expect(drive.shaft.rotation.z).toBe(1.7);expect(drive.assembly.rotor.rotation.z).toBe(1.7);
    expect(position(drive.group).x).toBeCloseTo(4.4,12);expect(position(drive.shaft).y).toBeCloseTo(1.6,12);
    expect(drive.group.visible).toBe(true);expect(generator.visible).toBe(true);
  });

  it('reuses all drive geometry and GPU buffers over repeated synchronization',()=>{
    const {driver,drive,scene}=fixture(),saved=[];scene.traverse(object=>{if(object.geometry)saved.push({object,geometry:object.geometry,position:object.geometry.attributes.position,normal:object.geometry.attributes.normal,index:object.geometry.index});});
    for(let index=0;index<300;index++){driver.rotation.z=index*.03;driver.userData.motionRate=index/300;drive.sync();}
    for(const value of saved){expect(value.object.geometry).toBe(value.geometry);expect(value.geometry.attributes.position).toBe(value.position);expect(value.geometry.attributes.normal).toBe(value.normal);expect(value.geometry.index).toBe(value.index);}
  });
});

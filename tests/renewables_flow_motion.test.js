import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url);
const THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8');
const sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
const start=source.indexOf('var responses={}',sceneStart);
const end=source.indexOf('function ring(',start);
if(start<0||end<0)throw new Error('Renewables private stream helpers were not found');

// Execute the real private response and stream routines against the bundled
// THREE geometry library. The fixture omits only the WebGL renderer.
function createStream({electrical=false}={}){
  const parent=new THREE.Group(),markerUpdaters=[];
  const curve=new THREE.CatmullRomCurve3([
    [-2.5,3.7,1.1],[-.8,3,1.1],[.2,.8,1.1],[1,.8,.8]
  ].map(p=>new THREE.Vector3(...p)),false,'centripetal');
  function mesh(parent,geometry,color){const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color}));parent.add(object);return object;}
  function ball(parent,x,y,z,radius,color){return mesh(parent,new THREE.SphereGeometry(radius,16,10),color);}
  function glow(object,color,intensity){object.material.emissive.set(color);object.material.emissiveIntensity=intensity;}
  const particles=vm.runInNewContext(`(function(){${source.slice(start,end)};return particles;})()`,{THREE,markerUpdaters,streamCount:0,mesh,ball,glow});
  const stream=particles(parent,curve,'#fff2ab',p=>p.flow!==0,p=>p.flow,null,electrical?{power:p=>p.power,referencePower:50}:null);
  function update({flow=.04,power=50,dt=0,animate=true,status='Operating',syncResponse=false}={}){
    markerUpdaters[0]({flow,power,dt,animate,syncResponse,run:{status},inspection:{trace:false}});
    return stream;
  }
  return {curve,stream,update};
}

// Independently measure travel distance from a dense polyline in the original
// curve parameter; this detects bunching in short segments and speeding through
// long segments without making the assertion depend on getPointAt itself.
function measuredDistance(curve,point){
  const steps=12000,sample=new THREE.Vector3(),previous=curve.getPoint(0),best={distance:Infinity,length:0};
  let total=0;
  for(let i=0;i<=steps;i++){
    curve.getPoint(i/steps,sample);total+=sample.distanceTo(previous);
    const distance=sample.distanceToSquared(point);
    if(distance<best.distance){best.distance=distance;best.length=total;}
    previous.copy(sample);
  }
  return best.length/total;
}
function phaseDifference(after,before){return (after-before+1)%1;}

describe('Renewables stream distance and response',()=>{
  it('spaces all six markers evenly through a curved hydro pipe',()=>{
    const {curve,stream,update}=createStream();update();
    const locations=stream.dots.map(dot=>measuredDistance(curve,dot.position));
    expect(locations[0]).toBe(0);
    for(let i=1;i<locations.length;i++)expect(locations[i]-locations[i-1]).toBeCloseTo(1/6,3);
    expect(1-locations.at(-1)).toBeCloseTo(1/6,3);
    expect(measuredDistance(curve,stream.arrow.position)).toBeCloseTo(.72,3);
  });

  it('travels equal distances per elapsed interval across short and long pipe segments',()=>{
    const {curve,stream,update}=createStream();update();
    let previous=0;
    for(let i=0;i<40;i++){
      update({dt:.1});
      const location=measuredDistance(curve,stream.dots[0].position);
      expect(phaseDifference(location,previous)).toBeCloseTo(.02,3);
      previous=location;
    }
  });

  it('points forward and backward along the pipe without resetting marker phase',()=>{
    const {curve,stream,update}=createStream();update({dt:.1});
    const phase=stream.dots[0].userData.progress,forward=curve.getTangentAt(.72);
    expect(new THREE.Vector3(0,1,0).applyQuaternion(stream.arrow.quaternion).dot(forward)).toBeCloseTo(1,10);
    update({flow:-.04});
    expect(stream.dots[0].userData.progress).toBe(phase);
    expect(new THREE.Vector3(0,1,0).applyQuaternion(stream.arrow.quaternion).dot(forward)).toBeCloseTo(-1,10);
    update({flow:-.04,dt:.05});
    expect(phaseDifference(phase,stream.dots[0].userData.progress)).toBeCloseTo(.01,12);
  });

  it('preserves distance phase when a reservoir change deforms its pipe',()=>{
    const {curve,stream,update}=createStream();update({dt:.8});
    const phase=stream.dots[0].userData.progress,oldPosition=stream.dots[0].position.clone();
    curve.points[0].y=6;curve.points[1].y=4.5;curve.updateArcLengths();update();
    expect(stream.dots[0].userData.progress).toBe(phase);
    expect(stream.dots[0].position.distanceTo(oldPosition)).toBeGreaterThan(.2);
    expect(measuredDistance(curve,stream.dots[0].position)).toBeCloseTo(phase,3);
    expect(measuredDistance(curve,stream.arrow.position)).toBeCloseTo(.72,3);
  });

  it('retains phase through changing power density and paused control adjustments',()=>{
    const {stream,update}=createStream({electrical:true});update({power:5,dt:.1});
    const phase=stream.dots[0].userData.progress,positions=stream.dots.map(dot=>dot.position.clone());
    update({power:500,dt:0});
    expect(stream.dots[0].userData.progress).toBe(phase);
    stream.dots.forEach((dot,index)=>expect(dot.position.equals(positions[index])).toBe(true));
    update({power:200,flow:.08,dt:0,animate:false});
    expect(stream.dots[0].userData.progress).toBe(phase);
    expect(stream.dots[0].userData.flowRate).toBe(.08);
    expect(stream.dots[0].userData.flowStrength).toBe(.8);
  });

  it('hides stopped streams immediately while retaining their restart positions',()=>{
    const {stream,update}=createStream();update({dt:.1});
    const phase=stream.dots[0].userData.progress;
    update({flow:0,dt:.1});
    expect(stream.dots[0].userData.progress).toBe(phase);
    expect(stream.dots.every(dot=>!dot.visible)).toBe(true);expect(stream.arrow.visible).toBe(false);
    update({dt:0});
    expect(stream.dots[0].userData.progress).toBe(phase);
    update({dt:.1});expect(stream.dots[0].userData.progress).toBeGreaterThan(phase);
  });

  it.each(['Sequence complete','Cycle complete','Scenario complete'])('stops visual transport at %s',status=>{
    const {stream,update}=createStream({electrical:true});update({dt:.1});
    const phase=stream.dots[0].userData.progress;update({status,dt:.1});
    expect(stream.dots[0].userData.progress).toBe(phase);
    expect(stream.dots.every(dot=>!dot.visible&&dot.userData.power===0)).toBe(true);
    expect(stream.arrow.visible).toBe(false);
  });
});

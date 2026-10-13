import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url);
const THREE=require(path.resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8');
const scene=source.indexOf('function RenewablesEnergyScene(props)');
function helpers(first,last){const start=source.indexOf(first,scene),end=source.indexOf(last,start);if(start<0||end<0)throw new Error('Missing scene helper: '+first);return source.slice(start,end);}
const code=[helpers('function material(','function strut('),helpers('function ball(','function pipe('),helpers('var responses={}','function particles('),helpers('function ring(','function generatorDetail('),helpers('function runner(','function electricity(')].join('\n');
if(!code.includes('function runnerReference('))throw new Error('Runner inspection helpers were not found');
const roots=[];
const specs=[
  {name:'hydro',driver:'energy-hydro-runner',size:.6,radius:.79,guard:false},
  {name:'geothermal',driver:'energy-geothermal-turbine',size:.55,radius:.68,guard:true},
  {name:'solar thermal',driver:'energy-csp-turbine',size:.5,radius:.61,guard:false},
  {name:'biomass',driver:'energy-biomass-turbine',size:.6,radius:.73,guard:true}
];
function fixture(spec=specs[0]){
  const api=vm.runInNewContext(`(function(){${code};return {runner,runnerReference,motion};})()`,{THREE});
  const parent=new THREE.Group();roots.push(parent);
  const wheel=api.runner(parent,1.25,1.6,.8,spec.size,'#d6edf1');wheel.name=spec.driver;
  const reference=api.runnerReference(parent,wheel,spec.radius,spec.guard);
  const mark=wheel.getObjectByName('energy-runner-phase-mark');
  const pointer=reference.getObjectByName('energy-runner-fixed-pointer');
  parent.updateMatrixWorld(true);
  return {parent,wheel,reference,mark,pointer,motion:api.motion};
}
function position(object){return object.getWorldPosition(new THREE.Vector3());}
function radialBounds(object,origin){
  let min=Infinity,max=0;object.updateMatrixWorld(true);origin.updateMatrixWorld(true);
  object.traverse(node=>{if(!node.isMesh)return;const vertices=node.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const point=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(node.matrixWorld);origin.worldToLocal(point);
      const radius=Math.hypot(point.x,point.y);min=Math.min(min,radius);max=Math.max(max,radius);
    }
  });return {min,max};
}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material)object.material.dispose();});});

describe('Renewables turbine phase inspection',()=>{
  it.each(specs)('$name has one asymmetric phase mark attached to the moving wheel',spec=>{
    const {wheel,reference,mark,pointer}=fixture(spec);
    expect(mark).toBeTruthy();expect(pointer).toBeTruthy();expect(mark.parent).toBe(wheel);
    expect(reference.parent).toBe(wheel.parent);expect(pointer.parent).toBe(reference);
    expect(wheel.children.filter(child=>child.name==='energy-runner-phase-mark')).toHaveLength(1);
    expect(mark.children).toHaveLength(2);expect(new Set(mark.children.map(child=>child.material.color.getHex())).size).toBe(2);
    expect(mark.position.y).toBe(spec.size);expect(wheel.userData.phaseMarkerName).toBe(mark.name);
    expect(wheel.userData.referenceName).toBe(reference.name);expect(reference.userData.driverName).toBe(wheel.name);
  });

  it.each(specs)('$name keeps the fixed pointer outside the complete rotating mark envelope',spec=>{
    const {parent,wheel,reference,mark,pointer}=fixture(spec),pointerEnvelope=radialBounds(pointer,reference);
    for(let index=0;index<24;index++){
      wheel.rotation.z=index*Math.PI/12;parent.updateMatrixWorld(true);
      const markEnvelope=radialBounds(mark,wheel);
      expect(markEnvelope.max).toBeLessThan(wheel.userData.motionRadius);
      expect(pointerEnvelope.min-markEnvelope.max).toBeGreaterThan(.02);
    }
  });

  it.each(specs)('$name preserves rigid attachment and a stationary casing reference while speed changes',spec=>{
    const {parent,wheel,reference,mark,pointer,motion}=fixture(spec);
    parent.position.set(-3.4,.8,0);parent.rotation.y=.3;parent.updateMatrixWorld(true);
    const pointerStart=position(pointer),referenceStart=reference.matrixWorld.clone(),local=mark.position.clone();
    motion(wheel,'runner',.3,{dt:0,animate:true},.4);
    for(const target of [1.4,.5,.8,0,.2])for(let frame=0;frame<12;frame++){
      motion(wheel,'runner',target,{dt:.02,animate:true},.4);parent.updateMatrixWorld(true);
      expect(mark.position.equals(local)).toBe(true);
      expect(position(mark).distanceTo(local.clone().applyMatrix4(wheel.matrixWorld))).toBeLessThan(1e-12);
      expect(position(pointer).distanceTo(pointerStart)).toBeLessThan(1e-12);
      expect(reference.matrixWorld.equals(referenceStart)).toBe(true);
    }
  });

  it('distinguishes each twelfth-turn position even though the wheel has twelve repeated fins',()=>{
    const {parent,wheel,mark}=fixture(),positions=[];
    for(let index=0;index<12;index++){wheel.rotation.z=index*Math.PI/6;parent.updateMatrixWorld(true);positions.push(position(mark));}
    for(let a=0;a<positions.length;a++)for(let b=a+1;b<positions.length;b++)expect(positions[a].distanceTo(positions[b])).toBeGreaterThan(.25);
    wheel.rotation.z=Math.PI*2;parent.updateMatrixWorld(true);expect(position(mark).distanceTo(positions[0])).toBeLessThan(1e-12);
  });

  it('freezes the phase mark on zero or pause and advances it only by the explicit step',()=>{
    const {parent,wheel,mark,pointer,motion}=fixture();
    motion(wheel,'runner',.8,{dt:.1,animate:true},.4);parent.updateMatrixWorld(true);
    const first=position(mark),pointerStart=position(pointer);
    motion(wheel,'runner',0,{dt:.12,animate:true},.4);parent.updateMatrixWorld(true);expect(position(mark).distanceTo(first)).toBeLessThan(1e-12);
    motion(wheel,'runner',1.2,{dt:0,animate:false},.4);parent.updateMatrixWorld(true);expect(position(mark).distanceTo(first)).toBeLessThan(1e-12);
    const before=wheel.rotation.z;motion(wheel,'runner',1.2,{dt:.1,animate:false},.4);parent.updateMatrixWorld(true);
    expect(before-wheel.rotation.z).toBeCloseTo(.12,14);expect(position(mark).distanceTo(first)).toBeGreaterThan(.06);
    expect(position(pointer).distanceTo(pointerStart)).toBeLessThan(1e-12);
  });

  it('keeps every added stationary guard and support outside the full wheel sweep',()=>{
    for(const spec of specs.filter(spec=>spec.guard)){
      const {wheel,reference}=fixture(spec);
      expect(radialBounds(reference,reference).min).toBeGreaterThan(wheel.userData.motionRadius);
    }
  });

  it('adds stationary guard supports only where an existing casing ring is absent',()=>{
    for(const spec of specs){
      const {reference}=fixture(spec),guards=reference.children.filter(child=>child.geometry?.type==='TorusGeometry');
      expect(guards).toHaveLength(spec.guard?1:0);
      if(spec.guard){expect(guards[0].geometry.parameters.radius).toBe(spec.radius);expect(reference.children.filter(child=>child.geometry?.type==='BoxGeometry')).toHaveLength(2);}
    }
  });
});

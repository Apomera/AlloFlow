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
const helpers=['material','mesh','box','ball','pipe','glow','response','cue','shape','particles','deformTube','cspOpticalConnections'].map(helper).join('\n');
function fixture(){return vm.runInNewContext(`(function(){
  var responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
  ${helpers}
  var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),field=new THREE.Group(),mirrors=[];scene.add(A,B);A.add(field);
  for(var n=0;n<12;n++){var x=-4+(n%4)*1.15,z=-2+Math.floor(n/4)*1.6,mirror=new THREE.Group();mirror.position.set(x,.6,z);field.add(mirror);mirror.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(.5-x,4,-z).normalize().add(new THREE.Vector3(0,1,0)).normalize());box(mirror,0,0,0,.9,.1,.85,'#b5dce3');mirrors.push(mirror);}
  var receiver=box(B,.5,4.6,0,.8,.8,.8,'#e99c46'),optics=cspOpticalConnections(field,mirrors,receiver,A,B);
  function update(dni,area,dt,animate){var p={run:{settings:{dni:dni},status:'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}};var size=shape('test-mirror-size',.6+.4*Math.sqrt(area/10000),p);mirrors.forEach(function(m){m.scale.set(size,1,size);});updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);optics.update();markerUpdaters.forEach(function(fn){fn(p);});}
  function layout(exploded,isolated){A.position.set(exploded?-3.4:0,0,0);B.position.set(0,exploded?.8:0,0);A.visible=isolated==null||isolated==='resource';B.visible=isolated==null||isolated==='converter';scene.updateMatrixWorld(true);optics.update();}
  update(900,10000,0,false);return {scene,A,B,field,mirrors,receiver,optics,update,layout};
})()`,{THREE});}
const markers=route=>route.group.children.filter(o=>/-marker-/.test(o.name));
function contacts(f){
  f.scene.updateMatrixWorld(true);
  for(const route of f.optics.routes){
    const start=route.group.localToWorld(route.curve.getPoint(0)),end=route.group.localToWorld(route.curve.getPoint(1));
    expect(f.mirrors.includes(route.mirror)).toBe(true);
    expect(route.mirror.worldToLocal(start.clone()).distanceTo(new THREE.Vector3(route.offset,.065,0))).toBeLessThan(1e-12);
    const face=f.receiver.worldToLocal(end.clone()),relative=f.receiver.worldToLocal(start.clone());
    expect(Math.max(Math.abs(face.x),Math.abs(face.y),Math.abs(face.z))).toBeCloseTo(.4,12);
    expect(face.clone().normalize().distanceTo(relative.normalize())).toBeLessThan(1e-12);
  }
}

describe('CSP rays follow real reflective surfaces',()=>{
  it.each([1000,10000,30000])('keeps every ray attached at aperture %i in both layouts',area=>{
    const f=fixture();f.update(900,area,0,false);expect(f.optics.routes).toHaveLength(20);
    for(const exploded of [false,true,false]){f.layout(exploded);contacts(f);}
  });
  it('widens the selected beam fans with the smoothed aperture while keeping the mirror normals fixed',()=>{
    const f=fixture();f.update(900,1000,0,false);const mirror=f.mirrors[0],q=mirror.quaternion.clone(),before=mirror.scale.x;
    f.update(900,30000,.02,true);expect(mirror.scale.x).toBeGreaterThan(before);expect(mirror.scale.x).toBeLessThan(.6+.4*Math.sqrt(3));contacts(f);
    const [left,right]=f.optics.routes.filter(r=>r.mirror===mirror&&r.offset!==0);
    expect(left.curve.getPoint(0).distanceTo(right.curve.getPoint(0))).toBeCloseTo(.6*mirror.scale.x,12);
    expect(mirror.quaternion.equals(q)).toBe(true);
  });
  it('retains tube buffers and optical phase through first-frame paused layout and size changes',()=>{
    const f=fixture();f.update(900,10000,.1,true);
    const before=f.optics.routes.map(r=>({geometry:r.body.geometry,position:r.body.geometry.attributes.position,normal:r.body.geometry.attributes.normal,phase:markers(r)[0]?.userData.progress}));
    for(const exploded of [true,false,true]){f.layout(exploded);f.update(900,30000,0,false);contacts(f);f.optics.routes.forEach((r,i)=>{
      expect(r.body.geometry).toBe(before[i].geometry);expect(r.body.geometry.attributes.position).toBe(before[i].position);expect(r.body.geometry.attributes.normal).toBe(before[i].normal);expect(markers(r)[0]?.userData.progress).toBe(before[i].phase);
      for(const [n,m] of markers(r).entries())expect(m.position.distanceTo(r.curve.getPointAt((m.userData.progress+n/6)%1))).toBeLessThan(1e-12);
    });}
    const versions=f.optics.routes.map(r=>r.body.geometry.attributes.position.version);f.optics.update();f.optics.routes.forEach((r,i)=>expect(r.body.geometry.attributes.position.version).toBe(versions[i]));
  });
  it('smooths sunlight brightness without inventing a different light travel speed',()=>{
    const f=fixture();f.update(100,10000,0,false);const route=f.optics.routes[0],before=route.body.material.opacity,mark=markers(route)[0],rate=mark.userData.flowRate;
    f.update(1100,10000,.02,true);expect(route.body.material.opacity).toBeGreaterThan(before);expect(route.body.material.opacity).toBeLessThan(.78);expect(mark.userData.flowRate).toBe(rate);expect(mark.userData.targetFlowStrength).toBe(1);expect(mark.userData.flowStrength).toBeLessThan(1);expect(f.field.userData.dni).toBe(1100);
    const phase=mark.userData.progress;f.update(50,10000,0,false);expect(mark.userData.progress).toBe(phase);expect(f.field.userData.illumination).toBeCloseTo(50/1100,12);
  });
  it('removes all rays immediately at zero sunlight and resumes without resetting phase',()=>{
    const f=fixture();f.update(900,10000,.1,true);const mark=markers(f.optics.routes[0])[0],phase=mark.userData.progress;
    f.update(0,10000,.1,true);expect(f.optics.routes.every(r=>!r.group.visible)).toBe(true);expect(mark.visible).toBe(false);expect(mark.userData.flowRate).toBe(0);expect(mark.userData.progress).toBe(phase);expect(f.field.userData.illumination).toBe(0);
    f.update(900,10000,0,false);expect(mark.userData.progress).toBe(phase);expect(f.optics.routes.every(r=>r.group.visible)).toBe(true);
  });
  it('hides rays when either endpoint is isolated away and restores correct attachment',()=>{
    const f=fixture();for(const selected of ['resource','converter','generator']){f.layout(true,selected);expect(f.optics.routes.every(r=>!r.group.visible)).toBe(true);}
    f.layout(true);expect(f.optics.routes.every(r=>r.group.visible)).toBe(true);contacts(f);
  });
});

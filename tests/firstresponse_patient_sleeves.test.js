import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import geometryDelta from './helpers/firstresponse_manikin_refinement_delta.cjs';

// This fixture retains its fixed historical geometry contract. Reverse only
// the exact later manikin refinement; current head/palm/reach checks use raw source.
const source=geometryDelta.revertManikinRefinement(readFileSync('stem_lab/stem_tool_firstresponse.js','utf8')), THREE={}, scenes=[];
// Captured before the patient wrist connector change. All patient-arm
// transforms and buffers remain locked except the two named wrist geometries
// and sleeves. Draw ranges remain covered by the explicit sleeve assertions.
const originalPatientArms = /* captured baseline */ {
  "adult:0": "b2d8fcd5c953acaccd3fefdf12adfc9d1177c8e49d28efa4d4867a977b51d7f6",
  "adult:2": "b1dc8f89eccbab471c53682d7fb11db4c88b5ea3637db60eb1fd19e8287b7ea0",
  "adult:3": "c8c47da7b8b7a5d60d9900f12c5d57b1f69e016904d4d64adf0bdf1bdc070b32",
  "adult:5": "616610c04558eacddd45418b5e59171412b8909b2e3d865e9da98f8942486944",
  "adult:8": "76cc1cc59b99b0ef80ab4011eb94b6e0f7617cdf91a7def6a8fa16a3f7c6dbb6",
  "child:0": "d53cb99dadac6282572a498d14cce6a33bba152032ec99911f73fa150f2be684",
  "child:2": "1dd5425e13ac28e24510f1b560642234a302bd9f89e411e9e2b875e1c787b4cf",
  "child:3": "acc1c7aa3d12eff6a1b8a85e86ca9abb989d5eb2006301d53879997f131411b9",
  "child:5": "4044ffec88ee35b2667bc5a6fa2cdc6a953a50bd38eae5612822493c2a54a9cb",
  "child:8": "086afe09cee254433cba250ae9e5a3ab951dd2ac9f592166a1ff79260b26d35b",
  "infant:0": "b0216aa5698212e02f112c88e86f87579ea6eed9e0dee12317caad39ac4da227",
  "infant:2": "0fbcef150533cdc33fcaf4d2a12ad70d029b60e1378343ac19cd1c78ced76a02",
  "infant:3": "31dd9dba8e7ebaa5578bec9ef15aaf8a1af37bd21a9ead17e1e840a59ba817c0",
  "infant:5": "6401d047569349f0543b5b722486b7ddb68bc58f935b0dd84acd1876c5ae2433",
  "infant:8": "6206c484d2adc467146ea9894f0388a5fc3823318749bdfc67879ad997cf1184"
};
new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
let previous,build;
beforeAll(()=>{
  previous=window.StemLab;
  window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(config){build=config.buildScene;return {attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};
  new Function(source)();
});
afterAll(()=>{window.StemLab=previous;});
afterEach(()=>{
  const geometries=new Set(),materials=new Set();
  scenes.splice(0).forEach(scene=>scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);}));
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
});
function model(age,contrast=false,phase=0){
  const scene=new THREE.Scene();scenes.push(scene);
  const content=build(THREE,{scene,phase,dark:true,contrast,wantShadow:false,trim:(color,shininess)=>new THREE.MeshPhongMaterial({color,shininess}),sceneProps:{age,tab:phase?'recovery':'depth'}});
  scene.updateMatrixWorld(true);
  return {scene,sample(settings={}){content.frame(0,{depthLab:{age,motion:'release',depth:100,lean:0,...settings},childHands:'two'},true);scene.updateMatrixWorld(true);}};
}
function part(scene,name){const mesh=scene.getObjectByName(name);expect(mesh,name).toBeTruthy();return mesh;}
function point(mesh,i){return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);}
function armFrame(scene,side){
  const arm=part(scene,'fr-patient-'+side+'-upper-arm'),length=arm.geometry.parameters.height;
  const a=new THREE.Vector3(0,-length/2,0).applyMatrix4(arm.matrixWorld),b=new THREE.Vector3(0,length/2,0).applyMatrix4(arm.matrixWorld);
  return {arm,a,b,axis:b.clone().sub(a).normalize(),scale:b.distanceTo(a)/length};
}
function insideTorso(torso,p){
  const side=torso.material.side;torso.material.side=THREE.DoubleSide;
  const ray=new THREE.Raycaster(p,new THREE.Vector3(.217,.871,.321).normalize());
  const inside=ray.intersectObject(torso,false).length%2===1;
  torso.material.side=side;return inside;
}
function fingerprint(scene){
  const root=part(scene,'fr-patient-arms'),hash=createHash('sha256');hash.update(JSON.stringify(root.matrixWorld.toArray()));
  root.traverse(o=>{
    if(/-sleeve$/.test(o.name))return;
    hash.update(JSON.stringify([o.type,o.name,o.matrix.toArray()]));
    // Allow precisely the new patient wrist buffers; keep their transforms.
    if(/^fr-patient-(left|right)-wrist$/.test(o.name)||!o.geometry)return;
    const g=o.geometry;hash.update(g.type);
    for(const key of Object.keys(g.attributes).sort()){
      const a=g.attributes[key],b=a.array;hash.update(JSON.stringify([key,a.itemSize,a.normalized,b.constructor.name]));hash.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));
    }
    if(g.index){const b=g.index.array;hash.update(b.constructor.name);hash.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}
  });return hash.digest('hex');
}
function checkSleeve(scene,side){
  const sleeve=part(scene,'fr-patient-'+side+'-sleeve'),torso=part(scene,'fr-manikin-torso');
  const {arm,a,b,axis,scale}=armFrame(scene,side),g=sleeve.geometry,p=g.parameters,n=p.radialSegments;
  expect(sleeve.material).toBe(torso.material);
  expect(sleeve.material.transparent).toBe(false);expect(sleeve.material.depthWrite).toBe(true);
  expect(sleeve.children).toHaveLength(0);
  expect(p.cuffFraction).toBe(.42);
  const centre=new THREE.Vector3();for(let i=0;i<n;i++)centre.add(point(sleeve,p.cuffOuterStart+i));centre.multiplyScalar(1/n);
  expect(centre.distanceTo(a.clone().lerp(b,.42))/scale).toBeLessThan(1e-6);
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(sleeve.matrixWorld);
  const ray=new THREE.Raycaster();
  for(let i=0;i<n;i++){
    const inner=point(sleeve,p.cuffInnerStart+i),outer=point(sleeve,p.cuffOuterStart+i);
    expect(Math.abs(inner.clone().sub(centre).dot(axis))/scale).toBeLessThan(1e-6);
    expect(Math.abs(outer.clone().sub(centre).dot(axis))/scale).toBeLessThan(1e-6);
    expect(outer.distanceTo(inner)/scale).toBeCloseTo(.006,6);
    const normal=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,p.cuffOuterStart+i).applyMatrix3(normalMatrix).normalize();
    expect(normal.dot(axis)).toBeGreaterThan(.99999);
    // Test vertices and edge midpoints, so the polygon opening also clears skin.
    for(const sample of [inner,inner.clone().lerp(point(sleeve,p.cuffInnerStart+(i+1)%n),.5)]){
      const radial=sample.clone().sub(centre).normalize();
      ray.set(centre.clone().addScaledVector(radial,.5*scale),radial.clone().negate());
      const hit=ray.intersectObject(arm,false)[0];expect(hit,'actual upper-arm surface at the cuff').toBeTruthy();
      expect((sample.distanceTo(centre)-(.5*scale-hit.distance))/scale).toBeGreaterThan(.0007);
    }
    expect(insideTorso(torso,point(sleeve,i)),'open proximal rim is buried in torso').toBe(true);
  }
  // Every proximal section remains behind the original shoulder plane.
  for(let i=0;i<p.shoulderRing*n;i++)expect(point(sleeve,i).sub(a).dot(axis)/scale).toBeLessThan(1e-6);
  for(let i=0;i<g.attributes.normal.count;i++){
    const normal=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i);
    expect(Number.isFinite(normal.length())).toBe(true);expect(normal.length()).toBeCloseTo(1,4);
  }
  // The original arm geometry stays intact; only its hidden proximal disk is excluded.
  expect(arm.geometry.drawRange.start).toBe(0);
  expect(arm.geometry.drawRange.count).toBe(arm.geometry.groups[2].start);
  expect(arm.geometry.index.count).toBeGreaterThan(arm.geometry.drawRange.count);
  ray.set(a.clone().addScaledVector(axis,-.12*scale),axis);
  expect(ray.intersectObject(arm,false).some(hit=>hit.point.distanceTo(a)<1e-5*scale),'proximal disk must not render or raycast').toBe(false);
  // Weld duplicate cuff vertices by position. Exactly two open boundary rings
  // remain: the buried root and the inner cuff; there are no filled end disks.
  const key=i=>{const pnt=new THREE.Vector3().fromBufferAttribute(g.attributes.position,i);return pnt.toArray().map(x=>Math.round(x*1e6)).join(',');};
  const edges=new Map();
  for(let i=0;i<g.index.count;i+=3){
    const v=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
    const q=v.map(j=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,j));
    expect(q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0])).length()).toBeGreaterThan(1e-10);
    for(let j=0;j<3;j++){const edge=[key(v[j]),key(v[(j+1)%3])].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
  }
  expect([...edges.values()].every(count=>count===1||count===2)).toBe(true);
  expect([...edges.values()].filter(count=>count===1)).toHaveLength(2*n);
  return sleeve;
}

describe('First Response patient sleeves',()=>{
  for(const age of ['adult','child','infant'])for(const contrast of [false,true])it(age+' has fitted hollow sleeves in '+(contrast?'contrast':'normal')+' mode',()=>{
    const m=model(age,contrast);m.sample();
    expect(fingerprint(m.scene)).toBe(originalPatientArms[age+':0']);
    const sleeves=['left','right'].map(side=>checkSleeve(m.scene,side));
    const resources=sleeves.map(s=>[s.geometry,s.material,s.geometry.attributes.position,s.geometry.attributes.normal,s.geometry.index]);
    for(const settings of [{motion:'press',lean:2},{motion:'release',lean:2},{motion:'inspect',phase:25,lean:0},{motion:'release',lean:0}]){
      m.sample(settings);
      ['left','right'].forEach((side,i)=>{
        const sleeve=part(m.scene,'fr-patient-'+side+'-sleeve'),torso=part(m.scene,'fr-manikin-torso');
        expect(sleeve).toBe(sleeves[i]);expect([sleeve.geometry,sleeve.material,sleeve.geometry.attributes.position,sleeve.geometry.attributes.normal,sleeve.geometry.index]).toEqual(resources[i]);
        for(let j=0;j<sleeve.geometry.parameters.radialSegments;j++)expect(insideTorso(torso,point(sleeve,j)),'root stays buried during chest movement').toBe(true);
      });
      expect(fingerprint(m.scene)).toBe(originalPatientArms[age+':0']);
    }
  });
  for(const age of ['adult','child','infant'])it(age+' retains connected sleeves through the recovery poses',()=>{
    for(const phase of [2,3,5,8]){
      const m=model(age,false,phase);['left','right'].forEach(side=>checkSleeve(m.scene,side));
      expect(fingerprint(m.scene)).toBe(originalPatientArms[age+':'+phase]);
    }
  });
});

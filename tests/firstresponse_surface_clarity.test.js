import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js','utf8'), THREE = {};
new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
const scenes = [], ages = ['adult','child','infant'];
// Mesh attributes, indices and every local transform of the rescuer hand rig;
// no material or UUID data. First captured from the pre-finish rig (adult
// a4127580, child 2b2163a6, infant d057e77d, still reproduced by reverting
// firstresponse_rescuer_wrist_refinement_delta). Re-captured after the intended
// rescuer wrist, wrist shading and palm symmetry refinements (2026-10-08/09).
const originalRig = {
  adult:'d52548a4e43bb56d77a3bc74ee928c5039d62dcd3344295a06d3f6605707c18f',
  child:'bccda836dd7b46af6df364a5f9b0a45bda3a952ccc9ae03e578294f9b210b75d',
  infant:'fc705471223a9537f60a97696aa9283ee867d5a3647d15731d70653cdced411a',
};
let build, previous;
beforeAll(() => {
  previous = window.StemLab;
  window.StemLab = { isRegistered:()=>false, registerTool() {},
    makeBayViewer(config) { build=config.buildScene; return { attach() {},sync() {},reset() {},nudge() {},zoom() {},status:()=> 'failed' }; } };
  new Function(source)();
});
afterEach(() => {
  const geometries=new Set(),materials=new Set();
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)?object.material:[object.material]) if(material)materials.add(material);
  });
  for(const geometry of geometries)geometry.dispose(); for(const material of materials)material.dispose();
});
afterAll(() => { window.StemLab=previous; });
function model(age,contrast=false,tab='depth',phase=0) {
  const scene=new THREE.Scene(); scenes.push(scene);
  const content=build(THREE,{scene,phase,dark:true,contrast,wantShadow:false,
    trim:(color,shininess)=>new THREE.MeshPhongMaterial({color,shininess:shininess==null?30:shininess,specular:0x6b7688}),sceneProps:{age,tab}});
  return {scene,sample(settings={},childHands='two') {
    content.frame(0,{depthLab:{age,motion:'release',lean:0,...settings},childHands},true);
    scene.updateMatrixWorld(true);return scene;
  }};
}
function object(scene,name) {const result=scene.getObjectByName(name);expect(result,name).toBeTruthy();return result;}
function fingerprint(root) {
  const hash=createHash('sha256');
  root.traverse(object=>{
    hash.update(JSON.stringify([object.type,object.name,object.matrix.toArray()]));
    if(!object.geometry)return;
    const geometry=object.geometry;hash.update(geometry.type);
    for(const key of Object.keys(geometry.attributes).sort()) {
      const attr=geometry.attributes[key],array=attr.array;
      hash.update(JSON.stringify([key,attr.itemSize,attr.normalized,array.constructor.name]));
      hash.update(Buffer.from(array.buffer,array.byteOffset,array.byteLength));
    }
    if(geometry.index) {const array=geometry.index.array;hash.update(array.constructor.name);hash.update(Buffer.from(array.buffer,array.byteOffset,array.byteLength));}
  });
  return hash.digest('hex');
}
function materials(scene) {
  return { skin:object(scene,'fr-rescuer-lower-palm').material,nail:object(scene,'fr-rescuer-lower-nail-0').material,
    patientSkin:object(scene,'fr-patient-left-palm').material,patientNail:object(scene,'fr-patient-left-nail-0').material };
}
function color(actual,expected) {expect(actual.r).toBeCloseTo(expected.r,8);expect(actual.g).toBeCloseTo(expected.g,8);expect(actual.b).toBeCloseTo(expected.b,8);}
function assertPatientMaterials(scene,contrast) {
  const {patientSkin,patientNail}=materials(scene);
  color(patientSkin.color,contrast?new THREE.Color(0xffffff):new THREE.Color(0xc09478).multiplyScalar(.86));
  expect(patientNail.color.getHexString()).toBe(contrast?'777777':'e1c5b2');
  expect(patientSkin.name).not.toMatch(/^fr-rescuer/);expect(patientNail.name).not.toMatch(/^fr-rescuer/);
  expect(patientSkin.userData.frContourStrength).toBeUndefined();expect(patientNail.userData.frContourStrength).toBeUndefined();
  expect(patientNail.userData.frPatientContourStrength).toBeUndefined();
  if(contrast) {expect(patientSkin.name).toBe('fr-patient-arm-skin');expect(patientSkin.userData.frPatientContourStrength).toEqual({value:1});}
  else expect(patientSkin.userData.frPatientContourStrength).toBeUndefined();
  if(!contrast) {expect(patientSkin.specular.getHexString()).toBe('060606');expect(patientNail.specular.getHexString()).toBe('25313b');expect(patientSkin.shininess).toBe(12);expect(patientNail.shininess).toBe(8);}
  expect(object(scene,'fr-depth-reference').material.color.getHexString()).toBe(contrast?'ffffff':'5eead4');
  expect(object(scene,'fr-depth-marker').material.color.getHexString()).toBe(contrast?'ffffff':'fbbf24');
}
function assertScope(scene,age,contrast) {
  const finish=materials(scene),hands=object(scene,'fr-depth-hands');
  expect(finish.skin.name).toBe('fr-rescuer-skin');expect(finish.nail.name).toBe('fr-rescuer-nail');
  expect(finish.skin).not.toBe(finish.patientSkin);expect(finish.nail).not.toBe(finish.patientNail);expect(finish.skin).not.toBe(finish.nail);
  expect(hands.children).toHaveLength(age==='infant'?1:2);
  for(const hand of hands.children) {
    let skinCount=0,nailCount=0,sleeveCount=0;
    hand.traverse(part=>{
      if(!part.isMesh)return;
      if(/-sleeve$/.test(part.name)) {sleeveCount++;expect(part.material).not.toBe(finish.skin);expect(part.material).not.toBe(finish.nail);return;}
      if(/-(nail-[0-3]|thumb-nail)$/.test(part.name)) {nailCount++;expect(part.material,part.name).toBe(finish.nail);}
      else {skinCount++;expect(part.material,part.name||'wrist joint').toBe(finish.skin);}
    });
    expect({skinCount,nailCount,sleeveCount}).toEqual({skinCount:11,nailCount:5,sleeveCount:1});
  }
  scene.traverse(part=>{
    if(part.material!==finish.skin&&part.material!==finish.nail)return;
    let ancestor=part;while(ancestor&&ancestor!==hands)ancestor=ancestor.parent;
    expect(ancestor,'rescuer finish is confined to rescuer geometry').toBe(hands);
  });
  for(const material of [finish.skin,finish.nail]) {
    expect(material.transparent).toBe(false);expect(material.opacity).toBe(1);
    expect(material.depthTest).toBe(true);expect(material.depthWrite).toBe(true);expect(material.side).toBe(THREE.FrontSide);
    expect(material.type).toBe(contrast?'MeshBasicMaterial':'MeshPhongMaterial');
  }
  if(contrast) {
    expect(finish.skin.color.getHexString()).toBe('ffffff');expect(finish.nail.color.getHexString()).toBe('777777');
    expect(finish.skin.userData.frContourStrength).toEqual({value:1});expect(finish.nail.userData.frContourStrength).toBeUndefined();
  } else {
    color(finish.skin.color,new THREE.Color(0xc09478).multiplyScalar(.76));color(finish.nail.color,new THREE.Color(0xe1c5b2).multiplyScalar(.82));
    expect(finish.skin.specular.getHexString()).toBe('000000');expect(finish.nail.specular.getHexString()).toBe('090909');
    expect(finish.skin.userData.frContourStrength).toBeUndefined();expect(finish.nail.userData.frContourStrength).toBeUndefined();
  }
  assertPatientMaterials(scene,contrast);return finish;
}
function resourceSnapshot(root) {
  const records=[];root.traverse(part=>records.push({part,parent:part.parent,geometry:part.geometry,material:part.material,
    position:part.geometry?.attributes.position,normal:part.geometry?.attributes.normal,index:part.geometry?.index,matrix:part.matrix.toArray()}));return records;
}
function assertResources(root,records) {
  const current=[];root.traverse(part=>current.push(part));expect(current).toEqual(records.map(record=>record.part));
  for(const record of records) {
    expect(record.part.parent).toBe(record.parent);expect(record.part.geometry).toBe(record.geometry);expect(record.part.material).toBe(record.material);
    if(record.geometry) {expect(record.geometry.attributes.position).toBe(record.position);expect(record.geometry.attributes.normal).toBe(record.normal);expect(record.geometry.index).toBe(record.index);}
    if(record.part!==root)expect(record.part.matrix.toArray()).toEqual(record.matrix);
  }
}

describe('First Response rescuer surface clarity',()=>{
  it.each(ages.flatMap(age=>[false,true].map(contrast=>[age,contrast])))('preserves %s geometry and scopes finishes through frame changes (contrast %s)',(age,contrast)=>{
    const run=model(age,contrast),scene=run.sample(),hands=object(scene,'fr-depth-hands');
    expect(fingerprint(hands),'recorded hand vertices, normals, indices and local poses').toBe(originalRig[age]);
    const finish=assertScope(scene,age,contrast),resources=resourceSnapshot(hands),skinVersion=finish.skin.version,nailVersion=finish.nail.version;
    const contour=finish.skin.userData.frContourStrength;
    for(const phase of [0,12.5,25,50,75,87.5,100]) {
      run.sample({motion:'inspect',phase,depth:age==='adult'?7:age==='child'?6.5:5.5,lean:1});
      assertResources(hands,resources);expect(finish.skin.version).toBe(skinVersion);expect(finish.nail.version).toBe(nailVersion);
      expect(finish.skin.userData.frContourStrength).toBe(contour);
      const heel=object(scene,'fr-rescuer-lower-heel'),position=heel.getWorldPosition(new THREE.Vector3());
      expect(position.y-heel.getWorldScale(new THREE.Vector3()).y).toBeCloseTo(object(scene,'fr-depth-marker').position.y,7);
    }
    run.sample({hands:false});expect(hands.visible).toBe(false);assertResources(hands,resources);
    run.sample({hands:true});expect(hands.visible).toBe(true);assertResources(hands,resources);assertPatientMaterials(scene,contrast);
  });

  it('transforms the real r128 Basic shaders with a stable normal contour and shared strength uniform',()=>{
    const first=materials(model('adult',true).sample()),second=materials(model('child',true).sample());
    const compile=material=>{
      const shader={uniforms:{},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};
      material.onBeforeCompile(shader);return shader;
    };
    const a=compile(first.skin),b=compile(first.skin),c=compile(second.skin);
    expect(a.uniforms.frContourStrength).toBe(first.skin.userData.frContourStrength);expect(b.uniforms.frContourStrength).toBe(a.uniforms.frContourStrength);
    expect(c.uniforms.frContourStrength).not.toBe(a.uniforms.frContourStrength);
    expect(a.vertexShader).toBe(b.vertexShader);expect(a.fragmentShader).toBe(b.fragmentShader);
    expect(a.vertexShader).toBe(c.vertexShader);expect(a.fragmentShader).toBe(c.fragmentShader);
    expect(a.vertexShader).toContain('normalize(normalMatrix * normal)');expect(a.vertexShader).toContain('frViewPosition = -mvPosition.xyz');
    expect(a.vertexShader.indexOf('#include <project_vertex>')).toBeLessThan(a.vertexShader.indexOf('frViewPosition ='));
    expect(a.fragmentShader).toContain('normalize(frSurfaceNormal)');expect(a.fragmentShader).toContain('normalize(frViewPosition)');
    expect(a.fragmentShader).toContain('abs(dot(');expect(a.fragmentShader).toContain('smoothstep(');expect(a.fragmentShader).toContain('diffuseColor.rgb *=');
    for(const marker of ['#include <clipping_planes_fragment>','#include <alphatest_fragment>','#include <tonemapping_fragment>','#include <encodings_fragment>'])expect(a.fragmentShader).toContain(marker);
    for(const name of ['frSurfaceNormal','frViewPosition']) {
      expect(a.vertexShader.split('varying vec3 '+name+';')).toHaveLength(2);expect(a.fragmentShader.split('varying vec3 '+name+';')).toHaveLength(2);
    }
    expect(first.skin.customProgramCacheKey()).toBe(second.skin.customProgramCacheKey());
    expect(first.skin.customProgramCacheKey()).not.toBe(first.patientSkin.customProgramCacheKey());
    expect(first.skin.customProgramCacheKey()).not.toBe(first.nail.customProgramCacheKey());
    const key=first.skin.customProgramCacheKey();a.uniforms.frContourStrength.value=0;
    expect(first.skin.userData.frContourStrength.value).toBe(0);expect(first.skin.customProgramCacheKey()).toBe(key);
    expect(compile(first.nail).vertexShader).toBe(THREE.ShaderLib.basic.vertexShader);
    const patientShader=compile(first.patientSkin);
    expect(patientShader.uniforms.frPatientContourStrength).toBe(first.patientSkin.userData.frPatientContourStrength);
    expect(patientShader.uniforms.frContourStrength).toBeUndefined();
    expect(patientShader.fragmentShader).toContain('normalize(frPatientSurfaceNormal)');
    expect(patientShader.fragmentShader).toContain('normalize(frPatientViewPosition)');
  });

  it.each([false,true])('retains hidden child-hand resources and material sharing when choices change (contrast %s)',contrast=>{
    const run=model('child',contrast),scene=run.sample({},'one'),hands=object(scene,'fr-depth-hands'),upper=object(scene,'fr-rescuer-upper');
    const finish=assertScope(scene,'child',contrast),resources=resourceSnapshot(hands);
    expect(upper.visible).toBe(false);
    for(const choice of ['two','one','two','one']) {
      run.sample({motion:'inspect',phase:50,depth:6,lean:1},choice);expect(upper.visible).toBe(choice==='two');assertResources(hands,resources);
      expect(object(scene,'fr-rescuer-upper-palm').material).toBe(finish.skin);expect(object(scene,'fr-rescuer-upper-nail-0').material).toBe(finish.nail);
    }
  });

  it.each([false,true])('leaves recovery patient hand materials and poses outside the finish treatment (contrast %s)',contrast=>{
    const run=model('adult',contrast,'recovery',8),scene=run.sample();
    assertPatientMaterials(scene,contrast);expect(object(scene,'fr-depth-hands').visible).toBe(false);
    for(const side of ['left','right']) {
      const patient=object(scene,'fr-patient-'+side+'-hand'),pose=patient.matrix.toArray(),material=object(scene,'fr-patient-'+side+'-palm').material;
      run.sample({motion:'press'});expect(patient.matrix.toArray()).toEqual(pose);expect(object(scene,'fr-patient-'+side+'-palm').material).toBe(material);
      expect(material.name).not.toMatch(/^fr-rescuer/);expect(material.userData.frContourStrength).toBeUndefined();
    }
  });
});

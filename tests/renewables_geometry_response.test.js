import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url);
const THREE=require(path.resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8');
const sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
const helperStart=source.indexOf('function deformTube(object,curve){',sceneStart);
const helperEnd=source.indexOf('function glow(',helperStart);
if(sceneStart<0||helperStart<0||helperEnd<helperStart)throw new Error('Renewables scene tube deformation helper was not found');
const helper=source.slice(helperStart,helperEnd).trim();

// Run the production helper against the same THREE runtime used by the lab.
// A fresh TubeGeometry is the reference for vertex layout, normals, and bounds.
function createDeformer(three=THREE){return vm.runInNewContext('('+helper+')',{THREE:three});}
function fixture(){
  const curve=new THREE.CatmullRomCurve3([[-2.5,3.7,1.1],[-.8,3,1.1],[.2,.8,1.1],[1,.8,.8]].map(point=>new THREE.Vector3(...point)),false,'centripetal');
  const geometry=new THREE.TubeGeometry(curve,40,.19,8,false);
  return {curve,geometry,mesh:new THREE.Mesh(geometry)};
}
function setHead(curve,head){
  const scale=.70+head/180;
  curve.points[0].y=scale*3.8;curve.points[1].y=scale*2.8;curve.updateArcLengths();
}
function expectReference(actual,reference){
  for(const attribute of ['position','normal']){
    expect(Array.from(actual.attributes[attribute].array)).toEqual(Array.from(reference.attributes[attribute].array));
    expect(Array.from(actual.attributes[attribute].array).every(Number.isFinite)).toBe(true);
  }
  expect(actual.boundingBox.equals(reference.boundingBox)).toBe(true);
  expect(actual.boundingSphere.center.equals(reference.boundingSphere.center)).toBe(true);
  expect(actual.boundingSphere.radius).toBe(reference.boundingSphere.radius);
  expect(Number.isFinite(actual.boundingSphere.radius)).toBe(true);
}

describe('Renewables retained tube geometry',()=>{
  it.each([5,150,30,63.782,149.9999,5.0001])('matches a freshly generated tube at displayed head %s m',head=>{
    const {curve,geometry,mesh}=fixture();
    setHead(curve,head);createDeformer()(mesh,curve);
    const reference=new THREE.TubeGeometry(curve,40,.19,8,false);
    reference.computeBoundingBox();reference.computeBoundingSphere();
    expectReference(mesh.geometry,reference);
    reference.dispose();geometry.dispose();
  });

  it('preserves geometry and every GPU buffer through successive expanding and shrinking head changes',()=>{
    const {curve,geometry,mesh}=fixture();
    const original={geometry,position:geometry.attributes.position,normal:geometry.attributes.normal,index:geometry.index,uv:geometry.attributes.uv};
    const arrays=Object.fromEntries(['position','normal','index','uv'].map(key=>[key,original[key].array]));
    const indexValues=Array.from(arrays.index),uvValues=Array.from(arrays.uv);
    let replacements=0,disposals=0;
    const trackedThree=new Proxy(THREE,{get(target,key){
      if(key!=='TubeGeometry')return Reflect.get(target,key);
      return new Proxy(target.TubeGeometry,{construct(Constructor,args){replacements++;return Reflect.construct(Constructor,args);}});
    }});
    const deform=createDeformer(trackedThree);
    geometry.addEventListener('dispose',()=>{disposals++;});
    const positionVersion=original.position.version,normalVersion=original.normal.version;
    const heads=[5,150,30,63.782,149.9999,5.0001,90,10];
    for(const head of heads){
      setHead(curve,head);deform(mesh,curve);
      expect(mesh.geometry).toBe(original.geometry);
      for(const key of ['position','normal','index','uv']){
        const current=key==='index'?mesh.geometry.index:mesh.geometry.attributes[key];
        expect(current).toBe(original[key]);expect(current.array).toBe(arrays[key]);
      }
      const reference=new THREE.TubeGeometry(curve,40,.19,8,false);
      reference.computeBoundingBox();reference.computeBoundingSphere();
      expectReference(mesh.geometry,reference);reference.dispose();
    }
    expect(replacements).toBe(0);expect(disposals).toBe(0);
    expect(Array.from(geometry.index.array)).toEqual(indexValues);
    expect(Array.from(geometry.attributes.uv.array)).toEqual(uvValues);
    expect(geometry.attributes.position.version).toBe(positionVersion+heads.length);
    expect(geometry.attributes.normal.version).toBe(normalVersion+heads.length);
    geometry.dispose();
  });
});

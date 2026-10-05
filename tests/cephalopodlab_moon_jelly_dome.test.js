import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const { reverseMoonJellyDomeFinish }=require('./helpers/cephalopod_moon_jelly_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const reference=reverseMoonJellyDomeFinish(source),fixtures=[];
function builder(text){
  const start=text.indexOf('var jellyfish = [];'),end=text.indexOf('// ─── Surface light rays',start);
  assert.ok(start>=0&&end>start,'Actual moon-jelly construction/update region is missing');
  return new Function('THREE','Math','var scene=new THREE.Scene();'+text.slice(start,end)+';return{scene,jellyfish,update:updateCLHuntMoonJellyVisual};');
}
const construct=builder(source),constructReference=builder(reference);
function fixture(factory=construct){const draws=[],math=Object.assign(Object.create(Math),{random(){const value=((draws.length*31+19)%101)/101;draws.push(value);return value;}}),result=factory(THREE,math);fixtures.push(result);return{...result,draws};}
function bytes(array){return Buffer.from(array.buffer,array.byteOffset,array.byteLength);}
function frame(object){return{name:object.name,position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),rotationOrder:object.rotation.order};}
function geometryRecord(geometry){return{attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([name,attribute])=>[name,{itemSize:attribute.itemSize,normalized:attribute.normalized,type:attribute.array.constructor.name,values:Array.from(attribute.array)}])),index:Array.from(geometry.index.array),parts:geometry.userData};}
function materialRecord(material){if(Array.isArray(material))return material.map(materialRecord);return{type:material.type,color:material.color.toArray(),roughness:material.roughness,metalness:material.metalness,opacity:material.opacity,transparent:material.transparent,
  depthWrite:material.depthWrite,blending:material.blending,side:material.side,vertexColors:material.vertexColors,onBeforeCompile:String(material.onBeforeCompile),programKey:material.customProgramCacheKey(),textures:Object.entries(material).filter(([,value])=>value?.isTexture).map(([name])=>name)};}
function spawnRecord(jelly){const u=jelly.userData;return{frame:frame(jelly),pulsePhase:u.pulsePhase,driftAngle:u.driftAngle,driftSpeed:u.driftSpeed,verticalPhase:u.verticalPhase,tentaclePhases:u.tents.map(entry=>entry.basePhase)};}
function budget(jelly){return{meshes:jelly.children.length,geometries:new Set(jelly.children.map(mesh=>mesh.geometry)).size,materials:new Set(jelly.children.flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material])).size,
  vertices:jelly.children.reduce((sum,mesh)=>sum+mesh.geometry.attributes.position.count,0),triangles:jelly.children.reduce((sum,mesh)=>sum+mesh.geometry.index.count/3,0),
  bytes:jelly.children.reduce((sum,mesh)=>sum+Object.values(mesh.geometry.attributes).reduce((n,attribute)=>n+attribute.array.byteLength,0)+mesh.geometry.index.array.byteLength,0)};}
function profile(jelly){
  const geometry=jelly.userData.bellGeo,p=geometry.attributes.position,meta=geometry.userData.clJellyBell;let radius=0,y=0;
  for(let i=meta.rimStart;i<meta.rimStart+meta.sides;i++){radius+=Math.hypot(p.getX(i),p.getZ(i));y+=p.getY(i);}
  radius/=meta.sides;y/=meta.sides;const crownY=p.getY(meta.crownIndex);return{radius,rimY:y,crownY,aspect:(crownY-y)/radius};
}
function snapshot(jelly){return jelly.children.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,index:mesh.geometry.index,indexArray:mesh.geometry.index.array,indices:new mesh.geometry.index.array.constructor(mesh.geometry.index.array),
  attrs:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,{attribute,array:attribute.array,version:attribute.version,values:new attribute.array.constructor(attribute.array)}])),box:mesh.geometry.boundingBox.clone(),sphere:mesh.geometry.boundingSphere.clone()}));}
function assertOwnedResources(jelly,saved){
  for(const row of saved){assert.equal(row.mesh.geometry,row.geometry);assert.equal(row.mesh.material,row.material);assert.equal(row.geometry.index,row.index);assert.equal(row.index.array,row.indexArray);assert.ok(bytes(row.indexArray).equals(bytes(row.indices)),'Original jelly indices changed');
    assert.ok(row.geometry.boundingBox.equals(row.box));assert.ok(row.geometry.boundingSphere.center.equals(row.sphere.center));assert.equal(row.geometry.boundingSphere.radius,row.sphere.radius);
    for(const [name,prior]of Object.entries(row.attrs)){assert.equal(row.geometry.attributes[name],prior.attribute);assert.equal(prior.attribute.array,prior.array);
      if(row.geometry!==jelly.userData.bellGeo||name==='color'){assert.equal(prior.attribute.version,prior.version);assert.ok(bytes(prior.array).equals(bytes(prior.values)),'Static jelly surface changed');}}
  }
}

afterEach(()=>{const geometries=new Set(),materials=new Set();for(const item of fixtures.splice(0))item.scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));});geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());});

describe('Cephalopod Hunter moon-jelly dome flex',()=>{
  it('retains paired-reference construction, ownership, rest and full lip while changing the actual crown/rim aspect cycle',()=>{
    const current=fixture(),prior=fixture(constructReference);
    expect(current.draws).toEqual(prior.draws);expect(current.draws).toHaveLength(65);expect(current.jellyfish).toHaveLength(5);
    const ownership=current.jellyfish.map(jelly=>new Set(jelly.children.flatMap(mesh=>[mesh.geometry,...(Array.isArray(mesh.material)?mesh.material:[mesh.material])])));
    ownership.forEach(resources=>expect(resources.size).toBe(17));
    for(let i=0;i<ownership.length;i++)for(let j=i+1;j<ownership.length;j++)expect([...ownership[i]].every(resource=>!ownership[j].has(resource))).toBe(true);
    for(let i=0;i<current.jellyfish.length;i++){
      const jelly=current.jellyfish[i],old=prior.jellyfish[i];expect(spawnRecord(jelly)).toEqual(spawnRecord(old));
      expect(budget(jelly)).toEqual({meshes:8,geometries:8,materials:9,vertices:1721,triangles:2970,bytes:79776});
      expect(jelly.children.map(mesh=>[frame(mesh),geometryRecord(mesh.geometry),materialRecord(mesh.material)])).toEqual(old.children.map(mesh=>[frame(mesh),geometryRecord(mesh.geometry),materialRecord(mesh.material)]));
      expect(bytes(jelly.userData.bellBasePos).equals(bytes(old.userData.bellBasePos))).toBe(true);
    }
    const jelly=current.jellyfish[0],old=prior.jellyfish[0],g=jelly.userData.bellGeo,p=g.attributes.position,base=jelly.userData.bellBasePos,saved=snapshot(jelly),profiles=[],oldProfiles=[];
    for(const pulse of [0,.05,.25,.5,.75,.95,1]){
      current.update(jelly.userData,pulse,17000+pulse*1000);prior.update(old.userData,pulse,17000+pulse*1000);
      const op=old.userData.bellGeo.attributes.position;
      for(let i=0;i<p.count;i++){
        assert.equal(p.getX(i),op.getX(i),'Original X at pulse '+pulse);assert.equal(p.getZ(i),op.getZ(i),'Original Z at pulse '+pulse);
        if(base[i*3+1]<=0)assert.equal(p.getY(i),op.getY(i),'Complete original negative-Y lip at pulse '+pulse);
      }
      if(pulse===.5){assert.ok(bytes(p.array).equals(bytes(op.array)),'Complete original rest positions');assert.ok(bytes(g.attributes.normal.array).equals(bytes(old.userData.bellGeo.attributes.normal.array)),'Complete original rest normals');}
      expect(jelly.children.slice(1).map(mesh=>frame(mesh))).toEqual(old.children.slice(1).map(mesh=>frame(mesh)));
      assertOwnedResources(jelly,saved);profiles.push(profile(jelly));oldProfiles.push(profile(old));
    }
    const contracted=profiles[0],expanded=profiles.at(-1);
    expect(contracted.radius).toBeLessThan(expanded.radius);
    expect(contracted.aspect,'Contracted bell should be deeper relative to its real rim width').toBeGreaterThan(expanded.aspect+.15);
    expect(oldProfiles[0].aspect).toBeLessThan(oldProfiles.at(-1).aspect);
    expect(Math.max(...profiles.map(p=>p.crownY))-Math.min(...profiles.map(p=>p.crownY))).toBeLessThan(.01);
    expect(Math.max(...oldProfiles.map(p=>p.crownY))-Math.min(...oldProfiles.map(p=>p.crownY))).toBeGreaterThan(.12);
    expect(current.draws).toHaveLength(65);expect(prior.draws).toHaveLength(65);
  });

  it('keeps the real dome ordered, bounded and clear of all gonad vertices with continuous face-consistent normals through a full forward/reverse pulse',()=>{
    const item=fixture(),jelly=item.jellyfish[0],geometry=jelly.userData.bellGeo,p=geometry.attributes.position,n=geometry.attributes.normal,ix=geometry.index,meta=geometry.userData.clJellyBell,saved=snapshot(jelly);
    const pulses=Array.from({length:31},(_,i)=>i/30).concat(Array.from({length:30},(_,i)=>(29-i)/30));let previousPositions=null,previousNormals=null;
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
    for(const pulse of pulses){
      item.update(jelly.userData,pulse,17000);assertOwnedResources(jelly,saved);
      for(let vertex=0;vertex<p.count;vertex++){
        a.fromBufferAttribute(p,vertex);normal.fromBufferAttribute(n,vertex);
        assert.ok(a.toArray().every(Number.isFinite)&&normal.toArray().every(Number.isFinite));assert.ok(Math.abs(normal.length()-1)<1e-5);
        assert.ok(geometry.boundingBox.distanceToPoint(a)<1e-7);assert.ok(a.distanceTo(geometry.boundingSphere.center)<=geometry.boundingSphere.radius+1e-7);
        if(previousPositions){b.fromArray(previousPositions,vertex*3);assert.ok(a.distanceTo(b)<.007,'Continuous dense-pulse positions');c.fromArray(previousNormals,vertex*3);assert.ok(normal.dot(c)>.99,'Continuous dense-pulse normals');}
      }
      for(let column=0;column<meta.sides;column++){
        let previousY=p.getY(meta.crownIndex),previousRadius=0;
        for(let row=0;row<6;row++){const vertex=1+row*meta.sides+column,radius=Math.hypot(p.getX(vertex),p.getZ(vertex)),y=p.getY(vertex);assert.ok(radius>previousRadius+1e-7&&y<previousY-1e-7,'Actual dome rows must stay ordered above the roll');previousRadius=radius;previousY=y;}
      }
      for(let face=0;face<ix.count;face+=3){
        const ids=[ix.getX(face),ix.getX(face+1),ix.getX(face+2)];a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]).sub(a);c.fromBufferAttribute(p,ids[2]).sub(a);b.cross(c);
        assert.ok(b.length()>1e-10,'Live dome face collapsed');normal.set(0,0,0);ids.forEach(vertex=>normal.add(c.fromBufferAttribute(n,vertex)));assert.ok(b.dot(normal)>0,'Live normal opposes actual face');
      }
      previousPositions=new Float32Array(p.array);previousNormals=new Float32Array(n.array);
    }
    const anatomy=jelly.children[1],organs=anatomy.geometry.userData.clJellyAnatomy,ap=anatomy.geometry.attributes.position;
    const probeMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),probe=new THREE.Mesh(geometry,probeMaterial);probe.updateMatrixWorld(true);
    try{
      for(const pulse of [0,.5,1]){
        item.update(jelly.userData,pulse,17000);anatomy.updateMatrix();
        for(const gonad of organs.gonads)for(let vertex=gonad.vertexStart;vertex<gonad.vertexStart+gonad.vertexCount;vertex++){
          const point=new THREE.Vector3().fromBufferAttribute(ap,vertex).applyMatrix4(anatomy.matrix),hits=new THREE.Raycaster(point,new THREE.Vector3(0,1,0),.000001,.6).intersectObject(probe,false);
          assert.ok(hits.length>0&&hits[0].point.y>point.y+.02,'Actual flexing dome must clear every real gonad vertex');
        }
      }
    }finally{probeMaterial.dispose();}
    assertOwnedResources(jelly,saved);expect(item.draws).toHaveLength(65);
  });
});

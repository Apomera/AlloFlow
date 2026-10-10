import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
// Reconstruct only the previous bell material policy. The complete live geometry,
// gel shading, anatomy, update and spawn remain in both sides of this paired fixture.
const policyStart=source.indexOf('          // Composite the translucent inner surface before the outer crown, including views from beneath.');
const policyLast="bell.name='cl-jelly-bell';root.add(bell);",policyEnd=source.indexOf(policyLast,policyStart)+policyLast.length;
assert.ok(policyStart>=0&&policyEnd>policyStart,'Actual translucent bell policy region is missing');
const originalPolicy="          var bell=new THREE.Mesh(bellGeo,finishCLHuntJellyGel(new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:0.30,metalness:0,transparent:true,opacity:0.34,side:THREE.DoubleSide,depthWrite:false})));bell.name='cl-jelly-bell';root.add(bell);";
const reference=source.slice(0,policyStart)+originalPolicy+source.slice(policyEnd),fixtures=[];
function builder(text){const start=text.indexOf('var jellyfish = [];'),end=text.indexOf('// ─── Surface light rays',start);assert.ok(start>=0&&end>start);return new Function('THREE','Math','var scene=new THREE.Scene();'+text.slice(start,end)+';return{scene,jellyfish,update:updateCLHuntMoonJellyVisual};');}
const construct=builder(source),constructReference=builder(reference);
function fixture(factory=construct){const draws=[],math=Object.assign(Object.create(Math),{random(){const value=((draws.length*31+19)%101)/101;draws.push(value);return value;}}),item=factory(THREE,math);fixtures.push(item);return{...item,draws};}
function materials(mesh){return Array.isArray(mesh.material)?mesh.material:[mesh.material];}
function bytes(array){return Buffer.from(array.buffer,array.byteOffset,array.byteLength);}
function frame(object){return{name:object.name,position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray()};}
function surface(geometry){return{attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([name,attribute])=>[name,{size:attribute.itemSize,type:attribute.array.constructor.name,values:Array.from(attribute.array)}])),index:Array.from(geometry.index.array),metadata:geometry.userData,box:geometry.boundingBox.toArray?geometry.boundingBox.toArray():[geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray()],sphere:[geometry.boundingSphere.center.toArray(),geometry.boundingSphere.radius]};}
function materialRecord(material,side=true){return{type:material.type,color:material.color.toArray(),vertexColors:material.vertexColors,roughness:material.roughness,metalness:material.metalness,transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite,blending:material.blending,...(side?{side:material.side}:{}),onBeforeCompile:String(material.onBeforeCompile),key:material.customProgramCacheKey(),textures:Object.entries(material).filter(([,value])=>value?.isTexture).map(([name])=>name)};}
function spawn(jelly){const u=jelly.userData;return{frame:frame(jelly),pulsePhase:u.pulsePhase,driftAngle:u.driftAngle,driftSpeed:u.driftSpeed,verticalPhase:u.verticalPhase,trails:u.tents.map(entry=>entry.basePhase)};}
function budget(jelly){return{meshes:jelly.children.length,geometries:new Set(jelly.children.map(mesh=>mesh.geometry)).size,materials:new Set(jelly.children.flatMap(materials)).size,vertices:jelly.children.reduce((sum,mesh)=>sum+mesh.geometry.attributes.position.count,0),triangles:jelly.children.reduce((sum,mesh)=>sum+mesh.geometry.index.count/3,0),bytes:jelly.children.reduce((sum,mesh)=>sum+Object.values(mesh.geometry.attributes).reduce((n,attribute)=>n+attribute.array.byteLength,0)+mesh.geometry.index.array.byteLength,0),draws:jelly.children.reduce((sum,mesh)=>sum+(Array.isArray(mesh.material)?mesh.geometry.groups.length:1),0),submittedTriangles:jelly.children.reduce((sum,mesh)=>sum+(Array.isArray(mesh.material)?mesh.geometry.groups.reduce((n,group)=>n+group.count/3,0):mesh.geometry.index.count/3),0)};}
function owned(jelly){return new Set(jelly.children.flatMap(mesh=>[mesh.geometry,...materials(mesh)]));}
afterEach(()=>{const geometries=new Set(),ownedMaterials=new Set();for(const item of fixtures.splice(0))item.scene.traverse(mesh=>{if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)materials(mesh).forEach(material=>ownedMaterials.add(material));});geometries.forEach(geometry=>geometry.dispose());ownedMaterials.forEach(material=>material.dispose());});

describe('Cephalopod Hunter moon-jelly transparency',()=>{
  it('separates inner and outer compositing while preserving paired anatomy, pulse bytes, spawn draws and geometry budgets',()=>{
    const current=fixture(),prior=fixture(constructReference);assert.deepEqual(current.draws,prior.draws);assert.equal(current.draws.length,65);assert.equal(current.jellyfish.length,5);
    const ownership=current.jellyfish.map(owned);ownership.forEach(resources=>assert.equal(resources.size,17));
    for(let i=0;i<ownership.length;i++)for(let j=i+1;j<ownership.length;j++)assert.ok([...ownership[i]].every(resource=>!ownership[j].has(resource)));
    for(let actor=0;actor<current.jellyfish.length;actor++){
      const jelly=current.jellyfish[actor],old=prior.jellyfish[actor],bell=jelly.children[0];assert.deepEqual(spawn(jelly),spawn(old));
      assert.deepEqual(budget(jelly),{meshes:8,geometries:8,materials:9,vertices:1961,triangles:3354,bytes:90720,draws:9,submittedTriangles:4266});
      assert.deepEqual(budget(old),{meshes:8,geometries:8,materials:8,vertices:1961,triangles:3354,bytes:90720,draws:8,submittedTriangles:3354});
      assert.ok(Array.isArray(bell.material));assert.equal(bell.material.length,2);assert.notEqual(bell.material[0],bell.material[1]);
      assert.deepEqual(bell.material.map(material=>material.side),[THREE.BackSide,THREE.FrontSide],'Inner bell must be composited before outer bell');
      assert.deepEqual(bell.geometry.groups,[{start:0,count:2736,materialIndex:0},{start:0,count:2736,materialIndex:1}],'Both shell passes must include the complete original crown and rolled lip');
      bell.material.forEach(material=>assert.deepEqual(materialRecord(material,false),materialRecord(old.children[0].material,false)));
      jelly.children.forEach((mesh,index)=>{assert.deepEqual(frame(mesh),frame(old.children[index]));assert.deepEqual(surface(mesh.geometry),surface(old.children[index].geometry));if(index>0){assert.deepEqual(materialRecord(mesh.material),materialRecord(old.children[index].material));assert.deepEqual(mesh.geometry.groups,[]);}});
      assert.ok(bytes(jelly.userData.bellBasePos).equals(bytes(old.userData.bellBasePos)));
    }
    const jelly=current.jellyfish[0],old=prior.jellyfish[0];
    const saved=jelly.children.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,members:materials(mesh),index:mesh.geometry.index,indexArray:mesh.geometry.index.array,groups:mesh.geometry.groups,groupMembers:mesh.geometry.groups.slice(),attributes:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,{attribute,array:attribute.array}]))}));
    for(const pulse of [0,.05,.25,.5,.75,.95,1]){
      current.update(jelly.userData,pulse,17000+pulse*1000);prior.update(old.userData,pulse,17000+pulse*1000);
      jelly.children.forEach((mesh,index)=>{assert.deepEqual(frame(mesh),frame(old.children[index]));assert.deepEqual(surface(mesh.geometry),surface(old.children[index].geometry),'Material ordering must retain complete pulse geometry and normals');});
      saved.forEach(row=>{assert.equal(row.mesh.geometry,row.geometry);assert.equal(row.mesh.material,row.material);materials(row.mesh).forEach((material,index)=>assert.equal(material,row.members[index]));assert.equal(row.geometry.index,row.index);assert.equal(row.index.array,row.indexArray);assert.equal(row.geometry.groups,row.groups);row.geometry.groups.forEach((group,index)=>assert.equal(group,row.groupMembers[index]));for(const[name,priorAttribute]of Object.entries(row.attributes)){assert.equal(row.geometry.attributes[name],priorAttribute.attribute);assert.equal(priorAttribute.attribute.array,priorAttribute.array);}});
    }
    assert.equal(current.draws.length,65);assert.equal(prior.draws.length,65);
  });

  it('retains the full inside crown and lip from above and beneath, and disposes each separately owned side material',()=>{
    const current=fixture(),prior=fixture(constructReference),jelly=current.jellyfish[0],old=prior.jellyfish[0];
    const shell=new THREE.Mesh(jelly.children[0].geometry,jelly.children[0].material),original=new THREE.Mesh(old.children[0].geometry,old.children[0].material);shell.updateMatrixWorld(true);original.updateMatrixWorld(true);
    const origins=[[.055,1,.031],[-.115,-1,.083],[1,.22,.055],[-.75,.18,-.6],[.7,-.35,.8]];let belowHits=0;
    for(const pulse of [0,.25,.5,.75,1]){
      current.update(jelly.userData,pulse,18000);prior.update(old.userData,pulse,18000);
      for(const coordinates of origins){
        const origin=new THREE.Vector3(...coordinates),direction=new THREE.Vector3(.02,.10,.01).sub(origin).normalize(),ray=new THREE.Raycaster(origin,direction,0,3);
        const hits=ray.intersectObject(shell,false),baselineHits=ray.intersectObject(original,false);assert.ok(baselineHits.length>0,'Ray fixture must exercise actual bell faces');assert.equal(hits.length,baselineHits.length,'Both sides must retain original ray intersections without duplicate faces');
        // BackSide ray/triangle evaluation reverses vertices and can change final arithmetic by roundoff.
        const record=hit=>({face:hit.faceIndex,distance:hit.distance,point:hit.point.toArray()}),actual=hits.map(record).sort((a,b)=>a.face-b.face),expected=baselineHits.map(record).sort((a,b)=>a.face-b.face);
        assert.deepEqual(actual.map(hit=>hit.face),expected.map(hit=>hit.face),'All original intersected faces must remain exact');
        actual.forEach((hit,index)=>{assert.ok(Math.abs(hit.distance-expected[index].distance)<1e-12,'Ray distance differs beyond floating-point roundoff');assert.ok(hit.point.every((value,axis)=>Math.abs(value-expected[index].point[axis])<1e-12),'Ray position differs beyond floating-point roundoff');});
        if(origin.y<0){belowHits+=hits.length;assert.ok(hits.some(hit=>hit.face.materialIndex===0),'A view beneath the dome must include real BackSide shell faces');}
      }
    }
    assert.ok(belowHits>0);assert.equal(current.draws.length,65);
    const resources=owned(jelly),neighbors=owned(current.jellyfish[1]);let ownDisposals=0,neighborDisposals=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>ownDisposals++));neighbors.forEach(resource=>resource.addEventListener('dispose',()=>neighborDisposals++));
    jelly.traverse(mesh=>{if(mesh.geometry)mesh.geometry.dispose();if(mesh.material)materials(mesh).forEach(material=>material.dispose());});jelly.parent.remove(jelly);
    assert.equal(ownDisposals,17,'Each original surface and both side materials must be disposed');assert.equal(neighborDisposals,0);assert.equal(current.scene.children.length,4);
  });
});

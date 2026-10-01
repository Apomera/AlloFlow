import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||process.env.CLH_KELP_TEST_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const accepted=JSON.parse(readFileSync('tests/fixtures/cephalopod_kelp_original.json','utf8'));
assert.equal(accepted.version,1);assert.equal(accepted.baselineSourceSha256,'b34c982127743a9d1f47ed392d0d48d09fa6adba588560bb178ab5e180e5d369');
assert.equal(accepted.factorySha256,'a4925b6238a439f5ab0a7c687984fc6b0c70017c4a852bd8f7635efd38abea46');
assert.equal(createHash('sha256').update(accepted.factorySource).digest('hex'),accepted.factorySha256,'Frozen original factory must stay exact');
function region(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,'Missing actual plant region: '+start);return source.slice(a,b);}
const helpers=region('function shadeCLHuntPlantFlex(','function createCLHuntMarineSnowGeometry(');
const noRandom=Object.create(Math);noRandom.random=()=>{throw new Error('Decorative plant geometry must not consume dive RNG');};
const actual=new Function('Math',helpers+';return{build:createCLHuntPlantGeometry,configure:createCLHuntPlantFlex,shade:shadeCLHuntPlantFlex};')(noRandom);
const oldBuild=new Function('Math',accepted.factorySource+';return createCLHuntPlantGeometry;')(noRandom);
const oldHelpers=helpers.slice(0,helpers.indexOf('function createCLHuntPlantGeometry('))+accepted.factorySource;
function point(geometry,index){return new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index);}
function bytes(array,count=array.length){return Buffer.from(array.buffer,array.byteOffset,count*array.BYTES_PER_ELEMENT);}
function samePrefix(current,previous,count){assert.ok(bytes(current,count).equals(bytes(previous,count)),'Accepted buffer prefix changed');}
function triangles(geometry,part){
  const result=[];
  for(let at=part.indexStart;at<part.indexStart+part.indexCount;at+=3){const ids=[0,1,2].map(offset=>geometry.index.getX(at+offset));result.push({ids,points:ids.map(index=>point(geometry,index))});}
  return result;
}
function rayHits(faces,origin,direction){
  const ray=new THREE.Ray(origin,direction),hits=[];
  for(const {points} of faces){const hit=ray.intersectTriangle(...points,false,new THREE.Vector3());if(hit){const distance=hit.distanceTo(origin);if(!hits.some(existing=>Math.abs(existing-distance)<1e-5))hits.push(distance);}}
  return hits.sort((a,b)=>a-b);
}
const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};actual.shade(shader);
const definition=shader.vertexShader.match(/vec2 clPlantWave\(([^)]*)\)\{([^{}]*)\}/);
assert.ok(definition,'Expected the actual injected wave kernel');
const wave=new Function('sin','cos','vec2','return function('+definition[1].replace(/float /g,'')+'){'+definition[2].replace(/\bfloat /g,'let ')+'};')(Math.sin,Math.cos,(x,y)=>[x,y]);
const xp=shader.vertexShader.match(/clPlantWave\(clPlantT,clPlantMotion\.x\+clPlantInstancePhase,([\d.]+),([\d.]+)\)/);
const zp=shader.vertexShader.match(/clPlantWave\(clPlantT,clPlantMotion\.y\+clPlantInstancePhase\*([\d.]+),([\d.]+),([\d.]+)\)/);
assert.ok(xp&&zp,'Expected actual shader displacement parameters');
function sample(rest,height,phases,enabled=1){
  const t=Math.max(0,Math.min(1,rest.y/Math.max(height,.001))),x=wave(t,phases[0],+xp[1],+xp[2]),z=wave(t,phases[1],+zp[2],+zp[3]);
  return {point:rest.clone().add(new THREE.Vector3(x[0]*height*enabled,0,z[0]*height*enabled)),slope:[x[1]*enabled,z[1]*enabled]};
}
function construct(helperSource=helpers){
  const grass=region('        var grass = [];','        // Terrain-conforming caustics:'),kelp=region('        var kelpStrands = [];','        // ─── Hydrothermal vent');
  const math=Object.create(Math),draws=[];let seed=2741;
  math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed/4294967296;draws.push(value);return value;};
  const result=new Function('THREE','Math',helperSource+';var scene=new THREE.Scene();'+grass+kelp+';return{scene,grass,kelp:kelpStrands};')(THREE,math);
  return {...result,draws};
}
function dispose(fixture){fixture.scene.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});}
const loopAt=source.indexOf('function loop() {'),pauseAt=source.indexOf('if (!gameState.gameOver && !gameState.paused) {',loopAt);
assert.ok(loopAt>=0&&pauseAt>loopAt,'Expected the production pause guard');
const pauseGuard=source.slice(pauseAt,source.indexOf('\n',pauseAt));
const liveSway=new Function('kelpStrands','grass','gameState','now',helpers+';'+pauseGuard+'\n'+region('            kelpStrands.forEach(function(k) {','            // Vent plume rises')+region('            grass.forEach(function(g) {','            // ─── Floor + caustics follow')+'\n}');

describe('Cephalopod Hunter attached kelp gas bladders',()=>{
  it('keeps every accepted141 kelp attribute and504indices byte-exact, with all grass buffers and metadata exact',()=>{
    for(let variant=0;variant<80;variant++){
      const height=.6+variant/79*1.3,current=actual.build(THREE,'grass',height,variant),previous=oldBuild(THREE,'grass',height,variant);
      try{
        assert.equal(current.attributes.position.count,33);assert.equal(current.index.count,120);
        for(const [name,attr] of Object.entries(previous.attributes))samePrefix(current.attributes[name].array,attr.array);
        samePrefix(current.index.array,previous.index.array);assert.deepEqual(current.userData,previous.userData);assert.deepEqual(current.boundingBox,previous.boundingBox);assert.deepEqual(current.boundingSphere,previous.boundingSphere);
      }finally{current.dispose();previous.dispose();}
    }
    for(const height of [5,7,9])for(let variant=0;variant<25;variant++){
      const current=actual.build(THREE,'kelp',height,variant),previous=oldBuild(THREE,'kelp',height,variant);
      try{
        assert.equal(previous.attributes.position.count,141);assert.equal(previous.index.count,504);
        assert.equal(current.attributes.position.count,277);assert.equal(current.index.count/3,424);
        assert.ok(current.attributes.position.count<=300&&current.index.count/3<=430);
        assert.deepEqual(Object.keys(current.attributes).sort(),['color','normal','position','uv']);
        for(const [name,attr] of Object.entries(previous.attributes))samePrefix(current.attributes[name].array,attr.array,141*attr.itemSize);
        samePrefix(current.index.array,previous.index.array,504);
        const {clKelpBladders,...oldMetadata}=current.userData;assert.deepEqual(oldMetadata,previous.userData);
        assert.deepEqual(Object.keys(clKelpBladders).sort(),['latitudeIntervals','parts','sides','version']);assert.equal(clKelpBladders.version,1);assert.equal(clKelpBladders.sides,8);assert.equal(clKelpBladders.latitudeIntervals,5);
        assert.equal(current.boundingBox.min.y,previous.boundingBox.min.y);assert.equal(current.boundingBox.max.y,previous.boundingBox.max.y);
      }finally{current.dispose();previous.dispose();}
    }
  },90000);

  it('builds four separate physically closed outward shells with finite unit normals and valid height/footprint bounds',()=>{
    for(const height of [5,7,9])for(let variant=0;variant<25;variant++){
      const geometry=actual.build(THREE,'kelp',height,variant),p=geometry.attributes.position,n=geometry.attributes.normal,parts=geometry.userData.clKelpBladders.parts;
      try{
        assert.equal(parts.length,4);
        for(const attr of Object.values(geometry.attributes))assert.ok(Array.from(attr.array).every(Number.isFinite));
        for(const value of geometry.attributes.color.array)assert.ok(value>=0&&value<=1);
        for(let vertex=0;vertex<p.count;vertex++){
          const at=point(geometry,vertex);assert.ok(at.y>=0&&at.y<=height);assert.ok(Math.hypot(at.x,at.z)<1.25);
          assert.ok(geometry.boundingBox.containsPoint(at));assert.ok(at.distanceTo(geometry.boundingSphere.center)<=geometry.boundingSphere.radius+1e-6);
          assert.ok(Math.abs(Math.hypot(n.getX(vertex),n.getY(vertex),n.getZ(vertex))-1)<2e-6);
        }
        for(const [number,part] of parts.entries()){
          assert.equal(part.name,'blade-float-'+number);assert.equal(part.vertexStart,141+number*34);assert.equal(part.vertexCount,34);assert.equal(part.indexStart,504+number*192);assert.equal(part.indexCount,192);
          const center=point(geometry,part.rootPole).add(point(geometry,part.bladePole)).multiplyScalar(.5),faces=triangles(geometry,part),edges=new Map();let volume=0;
          const unique=new Set();for(let vertex=part.vertexStart;vertex<part.vertexStart+34;vertex++)unique.add(point(geometry,vertex).toArray().map(value=>Math.round(value*1e7)).join(','));assert.equal(unique.size,34,'No collapsed or copied physical float vertices');
          for(const {ids,points:[a,b,c]} of faces){
            assert.ok(ids.every(index=>Number.isInteger(index)&&index>=part.vertexStart&&index<part.vertexStart+part.vertexCount));
            const normal=b.clone().sub(a).cross(c.clone().sub(a)),faceCenter=a.clone().add(b).add(c).multiplyScalar(1/3);
            assert.ok(normal.length()>1e-8,'No zero-area float triangles');assert.ok(normal.dot(faceCenter.sub(center))>0,'Outward physical winding');
            for(const vertex of ids)assert.ok(normal.dot(new THREE.Vector3().fromBufferAttribute(n,vertex))>0,'Visible smooth normals agree with every incident triangle');
            volume+=a.clone().sub(center).dot(b.clone().sub(center).cross(c.clone().sub(center)))/6;
            for(let edge=0;edge<3;edge++){const from=ids[edge],to=ids[(edge+1)%3],key=Math.min(from,to)+':'+Math.max(from,to),record=edges.get(key)||{count:0,direction:0};record.count++;record.direction+=from<to?1:-1;edges.set(key,record);}
          }
          assert.equal(faces.length,64);assert.equal(edges.size,96);assert.ok(volume>0.002&&volume<0.012);
          for(const edge of edges.values()){assert.equal(edge.count,2,'Closed two-face edge incidence');assert.equal(edge.direction,0,'Opposite directed manifold edges');}
          assert.equal(unique.size-edges.size+faces.length,2,'Closed genus-zero shell');
        }
      }finally{geometry.dispose();}
    }
  },30000);

  it('intersects actual triangle shells twice across radial and axial rays with a visible volumetric silhouette',()=>{
    for(const height of [5,7,9])for(const variant of [0,7,16,24]){
      const geometry=actual.build(THREE,'kelp',height,variant);
      try{for(const part of geometry.userData.clKelpBladders.parts){
        const start=point(geometry,part.rootPole),end=point(geometry,part.bladePole),center=start.clone().add(end).multiplyScalar(.5),axis=end.clone().sub(start).normalize();
        const radial=new THREE.Vector3(axis.y,-axis.x,0).normalize(),other=axis.clone().cross(radial).normalize(),faces=triangles(geometry,part);
        for(const direction of [radial,other,radial.clone().add(other).normalize()]){
          const hits=rayHits(faces,center.clone().addScaledVector(direction,.5),direction.clone().negate());assert.equal(hits.length,2,'A closed float has entry and exit surfaces');
          assert.ok(hits[0]<.5&&hits[1]>.5,'Actual shell contains its center');assert.ok(hits[1]-hits[0]>.17&&hits[1]-hits[0]<.26,'Real radial surface thickness is legible and bounded');
        }
        // Offset the axial probe inside the surface so it crosses real cap faces,
        // rather than relying on floating-point ray behavior at a shared pole.
        const axial=rayHits(faces,center.clone().addScaledVector(radial,.02).addScaledVector(axis,.5),axis.clone().negate());assert.equal(axial.length,2);assert.ok(axial[1]-axial[0]>.20&&axial[1]-axial[0]<.38);
      }}finally{geometry.dispose();}
    }
  });

  it('uses exact existing blade landmarks and keeps both float poles joined through live shader pulse phases and world transforms',()=>{
    const transform=new THREE.Matrix4().compose(new THREE.Vector3(17,-48,23),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,.83,0)),new THREE.Vector3(1,1,1));
    for(const height of [5,7,9])for(let variant=0;variant<25;variant++){
      const geometry=actual.build(THREE,'kelp',height,variant),material=new THREE.MeshStandardMaterial(),mesh=new THREE.Mesh(geometry,material),p=geometry.attributes.position,n=geometry.attributes.normal;
      try{
        actual.configure(THREE,mesh,height);
        for(const [number,part] of geometry.userData.clKelpBladders.parts.entries()){
          const side=(number%2?1:-1)*(variant%2?-1:1);assert.equal(part.rootVertex,(4+number*3)*3+(side<0?0:2));assert.equal(part.bladeVertex,61+number*21);assert.equal(part.rootPole,part.vertexStart);assert.equal(part.bladePole,part.vertexStart+33);
          for(const [pole,anchor] of [[part.rootPole,part.rootVertex],[part.bladePole,part.bladeVertex]]){
            assert.deepEqual(point(geometry,pole).toArray(),point(geometry,anchor).toArray());
            for(const get of ['getX','getY','getZ'])assert.equal(geometry.attributes.color[get](pole),geometry.attributes.color[get](anchor));
          }
        }
        for(let phase=0;phase<Math.PI*2;phase+=.31){
          const phases=[phase,phase*.79];
          for(let vertex=141;vertex<p.count;vertex++){
            const rest=point(geometry,vertex),moved=sample(rest,height,phases).point;assert.ok(geometry.boundingBox.containsPoint(moved));assert.ok(moved.distanceTo(geometry.boundingSphere.center)<=geometry.boundingSphere.radius+1e-6);assert.deepEqual(sample(rest,height,phases,0).point.toArray(),rest.toArray());
          }
          for(const part of geometry.userData.clKelpBladders.parts){
            for(const [pole,anchor] of [[part.rootPole,part.rootVertex],[part.bladePole,part.bladeVertex]])assert.deepEqual(sample(point(geometry,pole),height,phases).point.applyMatrix4(transform).toArray(),sample(point(geometry,anchor),height,phases).point.applyMatrix4(transform).toArray());
            for(const {ids,points} of triangles(geometry,part)){
              const posed=points.map(rest=>sample(rest,height,phases).point),face=posed[1].clone().sub(posed[0]).cross(posed[2].clone().sub(posed[0]));assert.ok(face.length()>1e-8);
              for(const vertex of ids){const rest=point(geometry,vertex),normal=new THREE.Vector3().fromBufferAttribute(n,vertex),{slope}=sample(rest,height,phases);normal.y-=slope[0]*normal.x+slope[1]*normal.z;assert.ok(face.dot(normal)>0,'Live inverse-transpose normal agrees with deformed float winding');}
            }
          }
        }
      }finally{geometry.dispose();material.dispose();}
    }
  },30000);

  it('preserves actual525 spawn draws,25 independent kelp actors, their unchanged material, root frame and camouflage metadata',()=>{
    const current=construct(),previous=construct(oldHelpers);
    try{
      assert.equal(current.draws.length,525);assert.deepEqual(current.draws,previous.draws);assert.equal(current.grass.length,80);assert.equal(current.kelp.length,25);
      const all=[...current.grass,...current.kelp];assert.equal(current.scene.children.length,105);assert.equal(new Set(all.map(plant=>plant.mesh.geometry)).size,105);assert.equal(new Set(all.map(plant=>plant.mesh.material)).size,105);
      for(const [i,plant] of current.kelp.entries()){
        const old=previous.kelp[i],mesh=plant.mesh;assert.equal(mesh.name,'cl-kelp');assert.deepEqual(mesh.position.toArray(),old.mesh.position.toArray());assert.deepEqual(mesh.rotation.toArray(),old.mesh.rotation.toArray());assert.equal(plant.phase,old.phase);assert.equal(plant.baseHeight,old.baseHeight);assert.deepEqual(mesh.userData,old.mesh.userData);
        assert.equal(mesh.material.isMeshStandardMaterial,true);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.opacity,.85);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.side,THREE.DoubleSide);assert.equal(mesh.material.vertexColors,true);assert.equal(mesh.material.roughness,.95);assert.equal(mesh.material.customProgramCacheKey(),'cl-plant-flex-v15');
        assert.equal(mesh.children.length,0);assert.notEqual(mesh.geometry.attributes.position.array.buffer,old.mesh.geometry.attributes.position.array.buffer);assert.notEqual(plant.flex.value,old.flex.value);
      }
    }finally{dispose(current);dispose(previous);}
  });

  it('freezes actual pause/reduced-motion flex, resumes accepted clocks and keeps every owned buffer/material stable until one disposal',()=>{
    const fixture=construct(),all=[...fixture.grass,...fixture.kelp],state={paused:false,gameOver:false,a11y:{reducedMotion:false}},resources=all.map(plant=>({mesh:plant.mesh,geometry:plant.mesh.geometry,material:plant.mesh.material,uniform:plant.flex,value:plant.flex.value,arrays:Object.fromEntries(Object.entries(plant.mesh.geometry.attributes).map(([name,attr])=>[name,{array:attr.array,bytes:Buffer.from(bytes(attr.array)),version:attr.version}])),index:plant.mesh.geometry.index.array,indexBytes:Buffer.from(bytes(plant.mesh.geometry.index.array)),geometryDisposals:0,materialDisposals:0}));
    for(const resource of resources){resource.geometry.addEventListener('dispose',()=>resource.geometryDisposals++);resource.material.addEventListener('dispose',()=>resource.materialDisposals++);}
    try{
      liveSway(fixture.kelp,fixture.grass,state,1200);const moving=all.map(plant=>plant.flex.value.toArray());state.paused=true;liveSway(fixture.kelp,fixture.grass,state,5500);assert.deepEqual(all.map(plant=>plant.flex.value.toArray()),moving);
      state.paused=false;state.a11y.reducedMotion=true;for(const now of [5600,8000,15000]){liveSway(fixture.kelp,fixture.grass,state,now);assert.deepEqual(all.map(plant=>plant.flex.value.toArray()),moving.map(pose=>[...pose.slice(0,3),0]));}
      state.a11y.reducedMotion=false;liveSway(fixture.kelp,fixture.grass,state,16000);
      for(const [i,plant] of all.entries()){
        const saved=resources[i],rate=plant.mesh.isInstancedMesh ? .001 : .0008;assert.equal(plant.flex.value.x,(16000*rate+plant.phase)%(Math.PI*2));assert.equal(plant.flex.value.w,1);assert.equal(plant.mesh.rotation.z,0);
        assert.equal(plant.mesh.geometry,saved.geometry);assert.equal(plant.mesh.material,saved.material);assert.equal(plant.flex,saved.uniform);assert.equal(plant.flex.value,saved.value);
        for(const [name,attr] of Object.entries(plant.mesh.geometry.attributes)){assert.equal(attr.array,saved.arrays[name].array);assert.ok(bytes(attr.array).equals(saved.arrays[name].bytes));assert.equal(attr.version,saved.arrays[name].version);}
        assert.equal(plant.mesh.geometry.index.array,saved.index);assert.ok(bytes(saved.index).equals(saved.indexBytes));assert.equal(saved.geometryDisposals,0);assert.equal(saved.materialDisposals,0);
      }
    }finally{dispose(fixture);}
    for(const resource of resources){assert.equal(resource.geometryDisposals,1);assert.equal(resource.materialDisposals,1);}
  });
});

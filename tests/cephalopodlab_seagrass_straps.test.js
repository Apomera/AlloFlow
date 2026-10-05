import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const {restoreOriginalSeagrassSource}=require('./helpers/cephalopod_seagrass_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||process.env.CLH_KELP_TEST_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const referenceSource=restoreOriginalSeagrassSource(source);
function region(start,end,text=source){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,'Missing actual production region: '+start);return text.slice(a,b);}
const helpers=region('function shadeCLHuntPlantFlex(','function createCLHuntMarineSnowGeometry('),referenceHelpers=region('function shadeCLHuntPlantFlex(','function createCLHuntMarineSnowGeometry(',referenceSource);
const denyRandom=Object.create(Math);denyRandom.random=()=>{throw new Error('Static grass refinement consumed dive RNG');};
const liveBuild=new Function('Math',helpers+';return createCLHuntPlantGeometry;')(denyRandom),originalBuild=new Function('Math',referenceHelpers+';return createCLHuntPlantGeometry;')(denyRandom);
function bytes(array){return Buffer.from(array.buffer,array.byteOffset,array.byteLength);}
function sameBytes(current,original,label){assert.ok(bytes(current).equals(bytes(original)),label+' bytes changed');}
function point(geometry,index){return new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index);}
function widthAt(geometry,row){return point(geometry,row*3).distanceTo(point(geometry,row*3+2));}
function area(geometry,projected=false){let sum=0;const p=geometry.attributes.position,index=geometry.index,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let at=0;at<index.count;at+=3){a.fromBufferAttribute(p,index.getX(at));b.fromBufferAttribute(p,index.getX(at+1)).sub(a);c.fromBufferAttribute(p,index.getX(at+2)).sub(a);b.cross(c);sum+=(projected?Math.abs(b.z):b.length())*.5;}return sum;}
function assertStaticGeometry(geometry){
  const p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index;
  assert.equal(p.count,33);assert.equal(index.count,120);assert.deepEqual(Object.keys(geometry.attributes).sort(),['color','normal','position','uv']);
  assert.equal(Object.values(geometry.attributes).reduce((sum,attribute)=>sum+attribute.array.byteLength,0)+index.array.byteLength,1692,'No new grass GPU bytes');
  for(const attribute of Object.values(geometry.attributes))assert.ok(Array.from(attribute.array).every(Number.isFinite));
  for(let vertex=0;vertex<p.count;vertex++){
    const v=point(geometry,vertex);assert.ok(geometry.boundingBox.containsPoint(v));assert.ok(v.distanceTo(geometry.boundingSphere.center)<=geometry.boundingSphere.radius+1e-6);
    assert.ok(Math.abs(Math.hypot(n.getX(vertex),n.getY(vertex),n.getZ(vertex))-1)<2e-6,'Unit live triangle-derived normals');
  }
  for(let at=0;at<index.count;at+=3){
    const ids=[index.getX(at),index.getX(at+1),index.getX(at+2)];assert.ok(ids.every(id=>Number.isInteger(id)&&id>=0&&id<p.count));
    const a=point(geometry,ids[0]),normal=point(geometry,ids[1]).sub(a).cross(point(geometry,ids[2]).sub(a));
    assert.ok(normal.length()>1e-8,'Noncollapsed live triangles');
    for(const id of ids)assert.ok(normal.dot(new THREE.Vector3().fromBufferAttribute(n,id))>0,'Every live incident normal agrees with face winding');
  }
}
function compareProtectedGrass(live,original){
  assert.deepEqual(live.boundingBox,original.boundingBox,'Actual footprint drives habitat placement');assert.deepEqual(live.userData,original.userData);
  for(const name of ['color','uv'])sameBytes(live.attributes[name].array,original.attributes[name].array,name);sameBytes(live.index.array,original.index.array,'index');
  const a=live.attributes.position,b=original.attributes.position,box=original.boundingBox;
  for(let vertex=0;vertex<b.count;vertex++){
    assert.equal(a.getY(vertex),b.getY(vertex),'All original row heights');
    const at=point(original,vertex),row=Math.floor(vertex/3),pinned=row===0||row===10||vertex%3===1||at.x===box.min.x||at.x===box.max.x||at.z===box.min.z||at.z===box.max.z;
    if(pinned)assert.deepEqual(point(live,vertex).toArray(),at.toArray(),'Actual basal/apex/vein/extreme positions stay exact');
  }
}
function construct(helperText){
  let state=2741;const math=Object.create(Math),draws=[];math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;const value=state/4294967296;draws.push(value);return value;};
  const grass=region('        var grass = [];','        // Terrain-conforming caustics:'),kelp=region('        var kelpStrands = [];','        // ─── Hydrothermal vent');
  const result=new Function('THREE','Math',helperText+';var scene=new THREE.Scene();'+grass+kelp+';return{scene,grass,kelp:kelpStrands};')(THREE,math);
  return {...result,draws,get state(){return state;},next:math.random};
}
function release(fixture){fixture.scene.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});}
const radiusAt=source.indexOf('var box=mesh.geometry.boundingBox,height=mesh.geometry.userData.clPlantHeight;'),radiusEnd=source.indexOf('data=mesh.userData.clHabitat=',radiusAt);
assert.ok(radiusAt>=0&&radiusEnd>radiusAt,'Expected the actual geometry-derived habitat radius');
const actualRadius=new Function('mesh','habitatPool',source.slice(radiusAt,radiusEnd)+'return plantRadius;');

describe('Cephalopod Hunter bounded seagrass strap refinement',()=>{
  it('uniquely reverses only the exact approved insertion while preserving unrelated current source bytes',()=>{
    assert.equal(restoreOriginalSeagrassSource(source),referenceSource);
    assert.throws(()=>restoreOriginalSeagrassSource(referenceSource),/one exact approved/);
    const duplicate=source+source.slice(source.indexOf('        // Fuller seagrass straps'),source.indexOf('        // Four attached folded ribbons'));
    assert.throws(()=>restoreOriginalSeagrassSource(duplicate),/one exact approved/);
    const altered=source.replace('grassGrowth=1+0.70','grassGrowth=1+0.69');assert.notEqual(altered,source);assert.throws(()=>restoreOriginalSeagrassSource(altered),/one exact approved/);
    const unrelated='\n// Unrelated bytes must be retained by the paired reference.\n';assert.equal(restoreOriginalSeagrassSource(source+unrelated),referenceSource+unrelated);
  });

  it('keeps live roots, tips, veins, true extrema and footprint while producing finite fuller upper straps with bounded projected area',()=>{
    let oldProjection=0,newProjection=0,oldSurface=0,newSurface=0,oldUpperWidths=0,newUpperWidths=0,changed=0;
    for(let variant=0;variant<80;variant++){
      const height=.6+variant/79*1.3,live=liveBuild(THREE,'grass',height,variant),original=originalBuild(THREE,'grass',height,variant);
      try{
        assertStaticGeometry(live);compareProtectedGrass(live,original);
        const projected=area(live,true)/area(original,true),surface=area(live)/area(original);
        assert.ok(projected>=1-1e-6&&projected<=1.28,'Per-variant projected coverage remains bounded');assert.ok(surface>=1-1e-6&&surface<=1.28,'Per-variant true surface area remains bounded');
        oldProjection+=area(original,true);newProjection+=area(live,true);oldSurface+=area(original);newSurface+=area(live);
        for(let row=6;row<=9;row++){oldUpperWidths+=widthAt(original,row);newUpperWidths+=widthAt(live,row);}
        for(let i=0;i<live.attributes.position.array.length;i++)if(live.attributes.position.array[i]!==original.attributes.position.array[i])changed++;
        assert.ok(widthAt(live,10)<widthAt(live,5)*.12,'Original narrow apex remains');
      }finally{live.dispose();original.dispose();}
    }
    const projectedRatio=newProjection/oldProjection,surfaceRatio=newSurface/oldSurface;
    assert.ok(projectedRatio>1.03&&projectedRatio<1.23,'Aggregate broadside projected area gains3–23percent');
    assert.ok(surfaceRatio>1.03&&surfaceRatio<1.23,'Aggregate true area gains3–23percent');
    assert.ok(newUpperWidths/oldUpperWidths>1.20,'Actual upper rows broaden visibly');assert.ok(changed>80*8,'Live shape changed across the actual variants');
  },30000);

  it('preserves all kelp bytes,525 real constructor draws and subsequent stream, actor footprints/instances/materials and independent owned resources',()=>{
    const live=construct(helpers),original=construct(referenceHelpers);
    try{
      assert.equal(live.draws.length,525);assert.deepEqual(live.draws,original.draws);assert.equal(live.state,original.state);assert.equal(live.next(),original.next());
      assert.equal(live.grass.length,80);assert.equal(live.kelp.length,25);
      const resources=new Set(),releaseCounts=[];
      for(const [pool,key] of [[1,'grass'],[0,'kelp']])for(let i=0;i<live[key].length;i++){
        const plant=live[key][i],previous=original[key][i],mesh=plant.mesh,oldMesh=previous.mesh;
        assert.deepEqual(mesh.position.toArray(),oldMesh.position.toArray());assert.deepEqual(mesh.rotation.toArray(),oldMesh.rotation.toArray());assert.deepEqual(mesh.scale.toArray(),oldMesh.scale.toArray());
        assert.equal(plant.phase,previous.phase);assert.equal(plant.baseHeight,previous.baseHeight);assert.deepEqual(mesh.userData,oldMesh.userData);
        assert.equal(actualRadius(mesh,pool),actualRadius(oldMesh,pool),'Same real radius input to unchanged habitat placement');
        for(const name of ['transparent','opacity','depthWrite','side','roughness','vertexColors'])assert.equal(mesh.material[name],oldMesh.material[name]);
        assert.equal(mesh.receiveShadow,oldMesh.receiveShadow);assert.equal(mesh.frustumCulled,oldMesh.frustumCulled);
        assert.deepEqual(mesh.geometry.boundingBox,oldMesh.geometry.boundingBox);
        if(pool){
          compareProtectedGrass(mesh.geometry,oldMesh.geometry);assert.equal(mesh.count,7);sameBytes(mesh.instanceMatrix.array,oldMesh.instanceMatrix.array,'Seven original blade instances');
          assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.depthWrite,true);assert.equal(mesh.material.side,THREE.DoubleSide);
        }else{
          for(const [name,attribute] of Object.entries(oldMesh.geometry.attributes))sameBytes(mesh.geometry.attributes[name].array,attribute.array,'All kelp '+name);sameBytes(mesh.geometry.index.array,oldMesh.geometry.index.array,'All kelp indices');
          assert.deepEqual(mesh.geometry.userData,oldMesh.geometry.userData);assert.deepEqual(mesh.geometry.boundingSphere,oldMesh.geometry.boundingSphere);
        }
        assert.notEqual(mesh.geometry,oldMesh.geometry);assert.notEqual(mesh.material,oldMesh.material);
        for(const owned of [mesh.geometry,mesh.material]){assert.ok(!resources.has(owned),'No neighbor resource sharing');resources.add(owned);const record={owned,count:0};owned.addEventListener('dispose',()=>{record.count++;});releaseCounts.push(record);}
        for(const [name,attribute] of Object.entries(mesh.geometry.attributes))assert.notEqual(attribute.array.buffer,oldMesh.geometry.attributes[name].array.buffer,'Paired independent '+name+' buffers');
      }
      assert.equal(resources.size,210);release(live);for(const record of releaseCounts)assert.equal(record.count,1,'Independent exactly-once fixture disposal');
      // Release in this case is intentional; finally must not dispose the live fixture twice.
      live.released=true;
    }finally{if(!live.released)release(live);release(original);}
  },30000);
});

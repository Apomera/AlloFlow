import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const reference=JSON.parse(readFileSync('tests/fixtures/cephalopod_kelp_tip_reference.json','utf8'));
assert.equal(reference.version,1);
assert.equal(reference.baselineSourceSha256,'fa90fb91fca4bf3ccda593d2d5cf1cf1703625a1b6148cdd00716481d447323f');
assert.equal(reference.factorySha256,'622d96130f8e39162cf4d483be96eec889f4ea9b923f378b8f9b5f502a82dc13');
assert.equal(createHash('sha256').update(reference.factorySource).digest('hex'),reference.factorySha256,'Frozen accepted plant factory changed');
const start=source.indexOf('function shadeCLHuntPlantFlex('),end=source.indexOf('function createCLHuntMarineSnowGeometry(',start);
assert.ok(start>=0&&end>start,'Expected current production plant helpers');
const math=Object.create(Math);math.random=()=>{throw Error('Plant geometry must not consume the gameplay RNG');};
const actual=new Function('Math',source.slice(start,end)+';return{build:createCLHuntPlantGeometry,configure:createCLHuntPlantFlex,shade:shadeCLHuntPlantFlex,update:updateCLHuntPlantFlex};')(math);
const oldBuild=new Function('Math',reference.factorySource+';return createCLHuntPlantGeometry;')(math);
const point=(g,index,name='position')=>new THREE.Vector3().fromBufferAttribute(g.attributes[name],index);
const bytes=(attr,first,count)=>Buffer.from(attr.array.buffer,attr.array.byteOffset+first*attr.itemSize*attr.array.BYTES_PER_ELEMENT,count*attr.itemSize*attr.array.BYTES_PER_ELEMENT);
function sameRange(current,previous,name,first,count){assert.ok(bytes(current.attributes[name],first,count).equals(bytes(previous.attributes[name],first,count)),name+' changed in retained vertices '+first+'…'+(first+count-1));}
function pair(height,variant,fn){const current=actual.build(THREE,'kelp',height,variant),previous=oldBuild(THREE,'kelp',height,variant);try{fn(current,previous);}finally{current.dispose();previous.dispose();}}
function tipPath(leaf){const start=57+leaf*21;return [start+12,277+leaf*6,start+15,280+leaf*6,start+18];}
function hullPlanes(vertices){
  const planes=[];
  for(let a=0;a<vertices.length-2;a++)for(let b=a+1;b<vertices.length-1;b++)for(let c=b+1;c<vertices.length;c++){
    const normal=vertices[b].clone().sub(vertices[a]).cross(vertices[c].clone().sub(vertices[a]));if(normal.length()<1e-9)continue;normal.normalize();
    const offset=normal.dot(vertices[a]),distances=vertices.map(p=>normal.dot(p)-offset),lo=Math.min(...distances),hi=Math.max(...distances);
    if(hi<1e-8)planes.push({normal,offset});else if(lo>-1e-8)planes.push({normal:normal.negate(),offset:-offset});
  }
  return planes;
}

describe('Cephalopod Hunter softly recurved kelp blade tips',()=>{
  it('keeps all seagrass bytes, central kelp, proximal blade tissue and closed floats unchanged',()=>{
    for(let variant=0;variant<80;variant++){
      const height=.6+variant/79*1.3,current=actual.build(THREE,'grass',height,variant),previous=oldBuild(THREE,'grass',height,variant);
      try{
        for(const name of Object.keys(previous.attributes))assert.deepEqual(current.attributes[name].array,previous.attributes[name].array);
        assert.deepEqual(current.index.array,previous.index.array);assert.deepEqual(current.userData,previous.userData);assert.deepEqual(current.boundingBox,previous.boundingBox);assert.deepEqual(current.boundingSphere,previous.boundingSphere);
      }finally{current.dispose();previous.dispose();}
    }
    for(const height of [5,7,9])for(let variant=0;variant<25;variant++)pair(height,variant,(current,previous)=>{
      for(const name of ['position','normal','color','uv']){sameRange(current,previous,name,0,57);sameRange(current,previous,name,141,136);}
      assert.deepEqual(current.index.array.slice(0,216),previous.index.array.slice(0,216));
      assert.deepEqual(current.index.array.slice(504,1272),previous.index.array.slice(504,1272));
      assert.deepEqual(current.userData,previous.userData);
      for(let leaf=0;leaf<4;leaf++){
        for(const name of ['position','color','uv'])sameRange(current,previous,name,57+leaf*21,15);
        sameRange(current,previous,'normal',57+leaf*21,12);
        assert.deepEqual(current.index.array.slice(216+leaf*72,264+leaf*72),previous.index.array.slice(216+leaf*72,264+leaf*72));
        const part=current.userData.clKelpBladders.parts[leaf];assert.deepEqual(point(current,part.rootVertex),point(current,part.rootPole));assert.deepEqual(point(current,part.bladeVertex),point(current,part.bladePole));
      }
    });
  },30000);

  it('turns each blade tip gently downward while retaining a broad shoulder, tapered end and monotone authored UVs',()=>{
    for(const height of [5,7,9])for(let variant=0;variant<25;variant++)pair(height,variant,(current,previous)=>{
      for(let leaf=0;leaf<4;leaf++){
        const path=tipPath(leaf),centers=path.map(row=>point(current,row+1)),start=57+leaf*21;
        assert.ok(previous.attributes.position.getY(start+19)>previous.attributes.position.getY(start+16),'Accepted tip rose straight upward');
        assert.ok(centers[4].y<centers[3].y-height*.001,'Actual new terminal segment must descend');
        assert.ok(centers[4].y>centers[0].y+height*.015,'Tip remains above its shoulder');
        assert.ok(centers[3].y>centers[2].y&&centers[2].y>centers[1].y&&centers[1].y>centers[0].y,'Tip begins as a continuous ascending arc');
        const width=row=>point(current,row).distanceTo(point(current,row+2));
        assert.ok(width(path[4])<width(path[0])*.025,'End remains narrowly tapered');
        assert.ok(width(path[4])>.001,'No collapsed tip');
        for(let row=0;row<path.length;row++)for(let column=0;column<3;column++){
          const vertex=path[row]+column;assert.equal(current.attributes.uv.getX(vertex),column/2);
          if(row)assert.ok(current.attributes.uv.getY(vertex)>current.attributes.uv.getY(path[row-1]+column));
        }
        for(let row=1;row<centers.length;row++)assert.ok(centers[row].distanceTo(centers[row-1])>height*.001,'Distinct samples along the curve');
      }
    });
  });

  it('keeps the complete new tip surface inside the accepted leaf convex hull, including under rotation',()=>{
    for(const height of [5,7,9])for(const variant of [0,8,24])pair(height,variant,(current,previous)=>{
      for(let leaf=0;leaf<4;leaf++){
        const controls=Array.from({length:21},(_,i)=>point(previous,57+leaf*21+i)),planes=hullPlanes(controls);assert.ok(planes.length>=6);
        for(const row of tipPath(leaf))for(let column=0;column<3;column++){
          const p=point(current,row+column);for(const plane of planes)assert.ok(plane.normal.dot(p)-plane.offset<3e-7,'A curved tip escaped the old leaf hull');
        }
        for(const yaw of [0,.37,1.2,Math.PI/2]){
          const rotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.09,yaw,-.12));
          const bounds=new THREE.Box3().setFromPoints(controls.map(p=>p.clone().applyMatrix4(rotation))).expandByScalar(4e-7);
          for(const row of tipPath(leaf))for(let column=0;column<3;column++)assert.ok(bounds.containsPoint(point(current,row+column).applyMatrix4(rotation)));
        }
      }
    });
  },30000);

  it('preserves exact conservative placement bounds and bounding spheres for every production variant',()=>{
    for(const height of [5,7,9])for(let variant=0;variant<25;variant++)pair(height,variant,(current,previous)=>{
      assert.deepEqual(current.boundingBox,previous.boundingBox);assert.deepEqual(current.boundingSphere,previous.boundingSphere);
      for(let vertex=0;vertex<current.attributes.position.count;vertex++){
        const p=point(current,vertex);assert.ok(current.boundingBox.containsPoint(p));assert.ok(p.distanceTo(current.boundingSphere.center)<=current.boundingSphere.radius+2e-7);
      }
      for(const yaw of [0,.37,Math.PI/2,2.8]){
        const matrix=new THREE.Matrix4().compose(new THREE.Vector3(17,-32,11),new THREE.Quaternion().setFromEuler(new THREE.Euler(.08,yaw,-.12)),new THREE.Vector3(.72,1.05,.84));
        assert.deepEqual(current.boundingBox.clone().applyMatrix4(matrix),previous.boundingBox.clone().applyMatrix4(matrix));
        const currentMesh=new THREE.Mesh(current),previousMesh=new THREE.Mesh(previous);currentMesh.applyMatrix4(matrix);previousMesh.applyMatrix4(matrix);
        assert.deepEqual(new THREE.Box3().setFromObject(currentMesh),new THREE.Box3().setFromObject(previousMesh),'Three placement footprint changed');
        currentMesh.material.dispose();previousMesh.material.dispose();
      }
    });
  });

  it('builds finite complete buffers, valid normals and nondegenerate triangles with just 24 vertices and 32 triangles added',()=>{
    for(const height of [5,7,9])for(let variant=0;variant<25;variant++)pair(height,variant,(current,previous)=>{
      assert.equal(current.attributes.position.count,301);assert.equal(current.index.count/3,456);assert.equal(current.attributes.position.count-previous.attributes.position.count,24);assert.equal((current.index.count-previous.index.count)/3,32);
      assert.deepEqual(Object.keys(current.attributes).sort(),['color','normal','position','uv']);
      for(const [name,attribute]of Object.entries(current.attributes)){
        assert.equal(attribute.count,301);for(const value of attribute.array)assert.ok(Number.isFinite(value));
        if(name==='color'||name==='uv')for(const value of attribute.array)assert.ok(value>=0&&value<=1);
      }
      for(let vertex=0;vertex<301;vertex++)assert.ok(Math.abs(point(current,vertex,'normal').length()-1)<2e-6);
      const referenced=new Set();
      for(let face=0;face<current.index.count;face+=3){
        const ids=[0,1,2].map(offset=>current.index.getX(face+offset));for(const id of ids){assert.ok(Number.isInteger(id)&&id>=0&&id<301);referenced.add(id);}
        const a=point(current,ids[0]),b=point(current,ids[1]),c=point(current,ids[2]);assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-8);
      }
      assert.equal(referenced.size,301,'Every retained or appended vertex is used');
    });
  },30000);

  it('is deterministic without RNG and extends the real thin-tissue mask without exposing the solid floats',()=>{
    for(const variant of [0,8,24])pair(7,variant,(current,previous)=>{
      const duplicate=actual.build(THREE,'kelp',7,variant),material=new THREE.MeshStandardMaterial(),mesh=new THREE.Mesh(current,material),originalBox=current.boundingBox.clone();
      try{
        for(const name of Object.keys(current.attributes))assert.deepEqual(current.attributes[name].array,duplicate.attributes[name].array);assert.deepEqual(current.index.array,duplicate.index.array);
        const arrays=Object.fromEntries(Object.entries(current.attributes).map(([name,attr])=>[name,attr.array])),motion=actual.configure(THREE,mesh,7,true),mask=current.attributes.clPlantRibbon;
        assert.equal(mask.count,301);for(let vertex=0;vertex<301;vertex++)assert.equal(mask.getX(vertex),vertex>=141&&vertex<277?0:1);
        // The later rib-relief finish in the same commit raised the tissue program key (plant_rib_relief test).
        assert.equal(material.customProgramCacheKey(),'cl-plant-flex-v58-rib-relief');
        assert.equal(current.boundingBox.min.x,originalBox.min.x-7*.12);assert.equal(current.boundingBox.max.x,originalBox.max.x+7*.12);assert.equal(current.boundingBox.min.z,originalBox.min.z-7*.035);assert.equal(current.boundingBox.max.z,originalBox.max.z+7*.035);
        actual.update(motion,1200,.8,.0008,false);assert.equal(motion.value.w,1);actual.update(motion,2000,.8,.0008,true);assert.equal(motion.value.w,0);
        for(const [name,array]of Object.entries(arrays))assert.equal(current.attributes[name].array,array,'Flex must retain '+name+' buffers');
        assert.deepEqual(previous.userData,current.userData);
      }finally{duplicate.dispose();material.dispose();}
    });
  });
});

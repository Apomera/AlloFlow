import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const { reversePreyTailFinish }=require('./helpers/cephalopod_prey_tail_reference.cjs');
const {restorePass39FishSource}=require('./helpers/cephalopod_prey_surface_reference.cjs');
// Preserve the accepted pass23 tail contracts; current surface finish is tested independently.
const source=restorePass39FishSource(readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n'));
const reference=reversePreyTailFinish(source),allocated=[];
const math=Object.assign(Object.create(Math),{random(){throw new Error('Prey-tail construction consumed simulation RNG');}});
function builder(text){
  const start=text.indexOf('function createCLHuntFish('),end=text.indexOf('\n}\n',start)+3;
  assert.ok(start>=0&&end>start,'Actual prey factory is missing');
  assert.equal(text.split('function createCLHuntFish(').length,2,'Prey factory must be unique');
  return new Function('T','index','Math',text.slice(start,end)+';return createCLHuntFish(T,index);');
}
const build=builder(source),buildReference=builder(reference);
function fish(factory=build,index=0){const root=factory(THREE,index,math);allocated.push(root);return root;}
function meshes(root){const result=[];root.traverse(object=>{if(object.isMesh)result.push(object);});return result;}
function section(mesh,name){const part=mesh.geometry.userData.clFishParts.find(item=>item.name===name);assert.ok(part,'Missing actual fish part '+name);return part;}
function attributeRecord(attribute,start=0,count=attribute.count){return{itemSize:attribute.itemSize,normalized:attribute.normalized,arrayType:attribute.array.constructor.name,values:Array.from(attribute.array.slice(start*attribute.itemSize,(start+count)*attribute.itemSize))};}
function surfaceRecord(mesh,partName){
  const geometry=mesh.geometry,part=partName?section(mesh,partName):{start:0,count:geometry.attributes.position.count};
  return{attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([name,attribute])=>[name,attributeRecord(attribute,part.start,part.count)])),
    index:geometry.index?Array.from(geometry.index.array):null,groups:geometry.groups,
    parts:partName?[part]:geometry.userData.clFishParts};
}
function frame(object){return{name:object.name,position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),rotationOrder:object.rotation.order};}
function materialRecord(material){return{type:material.type,color:material.color.toArray(),emissive:material.emissive.toArray(),roughness:material.roughness,metalness:material.metalness,
  side:material.side,vertexColors:material.vertexColors,transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite,
  onBeforeCompile:String(material.onBeforeCompile),programKey:material.customProgramCacheKey(),textures:Object.entries(material).filter(([,value])=>value?.isTexture).map(([name])=>name)};}
function budget(root){const all=meshes(root);return{meshes:all.length,materials:new Set(all.map(mesh=>mesh.material)).size,geometries:new Set(all.map(mesh=>mesh.geometry)).size,
  vertices:all.reduce((sum,mesh)=>sum+mesh.geometry.attributes.position.count,0),triangles:all.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3,0),
  bytes:all.reduce((sum,mesh)=>sum+Object.values(mesh.geometry.attributes).reduce((bytes,attribute)=>bytes+attribute.array.byteLength,0)+(mesh.geometry.index?.array.byteLength||0),0)};}
function triangles(mesh,name){const part=section(mesh,name),p=mesh.geometry.attributes.position,result=[];for(let i=part.start;i<part.start+part.count;i+=3)result.push([0,1,2].map(offset=>new THREE.Vector3().fromBufferAttribute(p,i+offset)));return result;}
function pointArray(point){return point.toArray();}
function f32Point(values){return values.map(Math.fround);}
function project(point,side){return{x:point.y*side,y:point.z};}
function orient(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function strictlyInside(point,a,b,c){const d0=orient(a,b,point),d1=orient(b,c,point),d2=orient(c,a,point);return d0>1e-10&&d1>1e-10&&d2>1e-10||d0< -1e-10&&d1< -1e-10&&d2< -1e-10;}
function properIntersection(a,b,c,d){return orient(a,b,c)*orient(a,b,d)< -1e-16&&orient(c,d,a)*orient(c,d,b)< -1e-16;}
function median(values){return [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];}

afterEach(()=>{
  const geometries=new Set(),materials=new Set();
  for(const root of allocated.splice(0))for(const mesh of meshes(root)){geometries.add(mesh.geometry);materials.add(mesh.material);}
  geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
});

describe('Cephalopod Hunter rounded silver-prey tail',()=>{
  it('preserves paired-reference body, peduncle, material and frames with a measured static two-surface budget',()=>{
    for(const index of [0,7]){
      const current=fish(build,index),prior=fish(buildReference,index),all=meshes(current),old=meshes(prior);
      expect(all.map(mesh=>mesh.name)).toEqual(['cl-fish-body','cl-fish-tail']);
      expect(surfaceRecord(all[0])).toEqual(surfaceRecord(old[0]));
      expect(surfaceRecord(all[1],'peduncle')).toEqual(surfaceRecord(old[1],'peduncle'));
      expect(materialRecord(all[0].material)).toEqual(materialRecord(old[0].material));
      expect(materialRecord(all[0].material)).toMatchObject({type:'MeshStandardMaterial',roughness:.34,metalness:.18,vertexColors:true,transparent:false,opacity:1,textures:[]});
      expect(all[1].material).toBe(all[0].material);
      expect([frame(current),...all.map(frame)]).toEqual([frame(prior),...old.map(frame)]);
      expect(current.rotation.order).toBe('YXZ');expect(all[1].position.toArray()).toEqual([0,0,-.185]);
      expect(current.userData.tail).toBe(all[1]);expect(prior.userData.tail).toBe(old[1]);
      expect(current.userData.swimPhase).toBe(index*1.7);expect(current.userData.swimPhase).toBe(prior.userData.swimPhase);
      expect(budget(current)).toEqual({meshes:2,materials:1,geometries:2,vertices:2358,triangles:786,bytes:84888});
      expect(budget(prior)).toEqual({meshes:2,materials:1,geometries:2,vertices:2334,triangles:778,bytes:84024});
      expect(all.map(mesh=>mesh.geometry.attributes.position.count)).toEqual([2160,198]);
      expect(all.every(mesh=>mesh.geometry.index===null&&mesh.geometry.groups.length===0)).toBe(true);
      for(const mesh of all){
        expect(Object.keys(mesh.geometry.attributes).sort()).toEqual(['color','normal','position']);
        for(const attribute of Object.values(mesh.geometry.attributes)){expect(attribute.itemSize).toBe(3);expect(attribute.count).toBe(mesh.geometry.attributes.position.count);expect(attribute.array.constructor.name).toBe('Float32Array');}
      }
      expect(new Set(all.flatMap(mesh=>Object.values(mesh.geometry.attributes).map(attribute=>attribute.array))).size).toBe(6);
      expect(all.every(mesh=>!old.some(other=>other.geometry===mesh.geometry||other.material===mesh.material))).toBe(true);
    }
  });

  it('forms two genuinely cambered non-overlapping rounded lobes with an open fork and smooth actual tip normals',()=>{
    const current=fish(build,3),tail=current.userData.tail,p=tail.geometry.attributes.position,n=tail.geometry.attributes.normal,c=tail.geometry.attributes.color,contours=[];
    for(const [name,side] of [['caudal-lower',-1],['caudal-upper',1]]){
      const part=section(tail,name),faces=triangles(tail,name),normalRows=[];
      expect(part.count).toBe(27);expect(faces).toHaveLength(9);
      const contour=[faces[0][1],...faces.map(face=>face[2])];contours.push(contour);
      for(let i=0;i<faces.length;i++){
        const [root,a,b]=faces[i];expect(pointArray(root)).toEqual(f32Point([0,0,-.018]));
        if(i>0)expect(pointArray(a)).toEqual(pointArray(faces[i-1][2]));
        const faceNormal=new THREE.Vector3().subVectors(a,root).cross(new THREE.Vector3().subVectors(b,root));
        assert.ok(faceNormal.lengthSq()>1e-16,name+' degenerate actual face '+i);faceNormal.normalize();
        for(let vertex=0;vertex<3;vertex++){
          const index=part.start+i*3+vertex,normal=new THREE.Vector3().fromBufferAttribute(n,index),position=new THREE.Vector3().fromBufferAttribute(p,index);
          assert.ok(position.toArray().every(Number.isFinite),name+' nonfinite actual position');
          assert.ok(new THREE.Vector3().fromBufferAttribute(c,index).toArray().every(value=>Number.isFinite(value)&&value>=0&&value<=1),name+' nonfinite or unbounded actual color');
          assert.ok(normal.toArray().every(Number.isFinite)&&Math.abs(normal.length()-1)<1e-5,name+' nonunit actual normal');
          assert.ok(normal.dot(faceNormal)>.99999,name+' normal opposes actual face '+i);
        }
        normalRows.push(new THREE.Vector3().fromBufferAttribute(n,part.start+i*3));
        assert.ok(orient(project(root,side),project(a,side),project(b,side))< -1e-8,name+' projected fan reversed or collapsed '+i);
      }
      expect(pointArray(contour[0])).toEqual(f32Point([0,side*.018,.004]));
      expect(pointArray(contour.at(-1))).toEqual(f32Point([0,side*0,-.104]));
      expect(Math.max(...contour.map(point=>point.y*side))).toBe(Math.fround(.100));
      expect(Math.min(...contour.map(point=>point.z))).toBe(Math.fround(-.180));
      const maximumX=Math.max(...contour.map(point=>Math.abs(point.x)));
      expect(maximumX,'actual caudal membrane must retain lateral camber').toBeGreaterThan(.003);
      expect(maximumX).toBeLessThanOrEqual(.0035001);
      expect(Math.min(...contour.map(point=>point.x))).toBeGreaterThanOrEqual(0);
      let previousAngle=Infinity;
      for(const point of contour){const angle=Math.atan2(point.y*side,-(point.z+Math.fround(.018)));assert.ok(angle<previousAngle-1e-5,name+' unordered radial contour');previousAngle=angle;}
      const projected=contour.map(point=>project(point,side));
      for(let i=0;i<projected.length-1;i++)for(let j=i+2;j<projected.length-1;j++)assert.ok(!properIntersection(projected[i],projected[i+1],projected[j],projected[j+1]),name+' crossing outer segments');
      for(let i=0;i<faces.length;i++){
        const centroid=project(faces[i][0].clone().add(faces[i][1]).add(faces[i][2]).multiplyScalar(1/3),side);
        for(let j=0;j<faces.length;j++)if(j!==i)assert.ok(!strictlyInside(centroid,...faces[j].map(point=>project(point,side))),name+' overlapping projected actual faces');
      }
      const medianNormal=new THREE.Vector3(median(normalRows.map(normal=>normal.x)),median(normalRows.map(normal=>normal.y)),median(normalRows.map(normal=>normal.z))).normalize();
      expect(normalRows.some(normal=>normal.clone().cross(medianNormal).length()>.015),name+' actual face-normal variation').toBe(true);
      for(const normal of normalRows)assert.ok(normal.dot(medianNormal)>.995,name+' abrupt tip-normal spike');
    }
    for(let i=0;i<contours[0].length;i++){expect(contours[0][i].x).toBe(contours[1][i].x);expect(contours[0][i].y).toBe(-contours[1][i].y);expect(contours[0][i].z).toBe(contours[1][i].z);}
    const probeMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),probe=new THREE.Mesh(tail.geometry,probeMaterial);probe.updateMatrixWorld(true);
    try{
      const ray=(y,z)=>new THREE.Raycaster(new THREE.Vector3(-.03,y,z),new THREE.Vector3(1,0,0),.000001,.06).intersectObject(probe,false);
      expect(ray(0,-.15),'actual fork must remain open behind the center notch').toHaveLength(0);
      expect(ray(.075,-.16).length,'actual upper membrane').toBeGreaterThan(0);
      expect(ray(-.075,-.16).length,'actual lower membrane').toBeGreaterThan(0);
    }finally{probeMaterial.dispose();}
  });
});

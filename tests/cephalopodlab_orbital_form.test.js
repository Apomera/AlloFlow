import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',start);
assert.ok(start>=0&&end>start,'Live animal factory required');
const factory=new Function('T','species','Math',source.slice(start,end)+';return createCLHuntAnimal(T,species);');
const collisionStart=source.indexOf('function createCLHuntRockCollisionFootprint('),collisionEnd=source.indexOf('// Small rock-rooted fragments',collisionStart);
assert.ok(collisionStart>=0&&collisionEnd>collisionStart,'Live wall geometry required');
const collision=new Function(source.slice(collisionStart,collisionEnd)+';return {footprint:createCLHuntRockCollisionFootprint,find:findCLHuntCrevice};')();
const noRandom=Object.create(Math);noRandom.random=()=>{throw Error('Orbital form consumed simulation RNG');};
const targets=['commonOcto','giantPacific','mimicOcto','caribReef','coconutOcto'];
const protectedIds=['blueRinged','humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus'];
const eyeNames=new Set(['cl-eye-rim','cl-iris','cl-pupil','cl-eye-lid']),formNames=new Set(['cl-head',...eyeNames]),owned=[];
const state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',reducedMotion:false,...extra});
function rig(id='commonOcto'){const animal=factory(THREE,{id,bodyColor:0x99775d},noRandom);owned.push(animal);return animal;}
function meshes(animal){const result=[];animal.root.traverse(object=>{if(object.isMesh)result.push(object);});return result;}
function parts(animal,name){return meshes(animal).filter(object=>object.name===name);}
function points(mesh){mesh.updateWorldMatrix(true,false);return Array.from({length:mesh.geometry.attributes.position.count},(_,index)=>new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index).applyMatrix4(mesh.matrixWorld));}
function close(a,b,epsilon=1e-6){assert.ok(Math.abs(a-b)<=epsilon,`${a} differs from ${b}`);}
function formHash(animal){const rows=meshes(animal).filter(object=>formNames.has(object.name)).map(object=>[object.name,Object.entries(object.geometry.attributes).map(([name,attribute])=>[name,Array.from(attribute.array)]),object.geometry.index?Array.from(object.geometry.index.array):null,object.position.toArray(),object.quaternion.toArray(),object.scale.toArray()]);return createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
function corridor(width){
  const rocks=[-1,1].map(side=>{const rock=new THREE.Mesh(new THREE.BoxGeometry(2,2,3),new THREE.MeshBasicMaterial());rock.position.set(side*(1+width/2),1,0);rock.updateMatrixWorld(true);return rock;});
  try{const gap=collision.find({x:0,z:0},.55,rocks,rocks.map(rock=>collision.footprint(THREE,rock)),1,'commonOcto',0,.55);assert.equal(gap?.walls?.length,2);return gap;}finally{for(const rock of rocks){rock.geometry.dispose();rock.material.dispose();}}
}
// Captured directly from accepted f17db4e6 head/eye geometry, with no historical inverse chain.
const protectedForms={
  blueRinged:'e899f653583ffba700765b42851404e6fefa1269b2f659f62454e4d333f8b11c',
  humboldtSquid:'05afe6d5ec7fa2ad65d0d0d85879c7cd0a2df2e6465d895e6a540c8533094d30',
  cuttlefish:'52321a78608a021ff0c10890a33e3e9ac7dab25bb93dadcfcfaa5cc20a34a10f',
  bobtailSquid:'46f94918781911d913cb371e2a7b6603bed657ad2894318672c6f6ac0fac2142',
  vampireSquid:'6b9e84784cb4228495d40edad1f7ba6117e85b10b63af71bdc6be6e498a12a40',
  dumboOcto:'74abfa74c875e3e7a08151eb3cb0546cc84116595988eb79ec122d74deee60f7',
  nautilus:'a3efaf144033eea36cb7feca8f619ff9c528a08eace739abe4ea20b23a9b4fdc'
};
afterEach(()=>{for(const animal of owned.splice(0)){const geometries=new Set(),materials=new Set();for(const mesh of meshes(animal)){geometries.add(mesh.geometry);for(const material of [mesh.material].flat())materials.add(material);}for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();}});

describe('Reef octopus soft head and orbital form',()=>{
  it('contracts the existing head envelope without moving its attachments or introducing normal seams',()=>{
    const prior=new THREE.SphereGeometry(.34,24,16),base=prior.attributes.position;
    try{for(const id of targets){const animal=rig(id),head=parts(animal,'cl-head')[0],geometry=head.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal;
      assert.equal(geometry.userData.clReefHeadForm,'tapered-cheek-v1');assert.equal(position.count,base.count);
      assert.deepEqual(head.position.toArray(),[0,.025*animal.scale,.35*animal.scale]);assert.deepEqual(head.scale.toArray(),[1.18*animal.scale,.9*animal.scale,.92*animal.scale]);
      let changed=0,maxY=0;
      for(let index=0;index<position.count;index++){
        const point=new THREE.Vector3().fromBufferAttribute(position,index),old=new THREE.Vector3().fromBufferAttribute(base,index),n=new THREE.Vector3().fromBufferAttribute(normal,index);
        assert.ok(point.toArray().every(Number.isFinite));assert.ok(n.toArray().every(Number.isFinite));close(n.length(),1);
        close(point.z,old.z);assert.ok(Math.abs(point.x)<=Math.abs(old.x)+1e-7);assert.ok(Math.abs(point.y)<=Math.abs(old.y)+1e-7);assert.ok(point.length()<=.340001);assert.ok(point.dot(n)>0);
        if(point.distanceTo(old)>.01)changed++;maxY=Math.max(maxY,Math.abs(point.y));
      }
      assert.ok(changed>position.count*.35,'Cheek shaping must be visible across more than isolated vertices');assert.ok(maxY<.34*.95,'Dorsal head should become less spherical');
      for(let row=0;row<=16;row++)for(let axis=0;axis<3;axis++)close(normal.array[(row*25)*3+axis],normal.array[(row*25+24)*3+axis]);
      const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),face=new THREE.Vector3(),index=geometry.index.array;
      for(let offset=0;offset<index.length;offset+=3){a.fromBufferAttribute(position,index[offset]);b.fromBufferAttribute(position,index[offset+1]);c.fromBufferAttribute(position,index[offset+2]);face.crossVectors(b.sub(a),c.sub(a));if(face.lengthSq()>1e-16)assert.ok(face.dot(new THREE.Vector3().fromBufferAttribute(normal,index[offset]))>0,'Head face/normal orientation');}
    }}finally{prior.dispose();}
  });

  it('uses mirrored seated orbital tissue with fewer triangles and the same eight eye meshes',()=>{
    const ray=new THREE.Raycaster();
    for(const id of targets){const animal=rig(id);animal.update(0,0,state());animal.root.updateMatrixWorld(true);
      const eyeMeshes=meshes(animal).filter(object=>eyeNames.has(object.name));assert.equal(eyeMeshes.length,8);
      assert.equal(eyeMeshes.reduce((count,mesh)=>count+mesh.geometry.attributes.position.count,0),1916);
      assert.equal(eyeMeshes.reduce((count,mesh)=>count+mesh.geometry.index.count/3,0),3248);
      const [left,right]=parts(animal,'cl-eye-rim'),leftPoints=points(left),rightPoints=points(right),head=parts(animal,'cl-head')[0];
      leftPoints.forEach((point,index)=>{close(point.x,-rightPoints[index].x);close(point.y,rightPoints[index].y);close(point.z,rightPoints[index].z);});
      for(const mesh of [left,right]){
        const geometry=mesh.geometry,meta=geometry.userData.clOctopusOrbitalHood,position=geometry.attributes.position,normal=geometry.attributes.normal,surface=points(mesh);
        assert.equal(meta.rows,10);assert.equal(meta.columns,32);assert.equal(meta.innerRadius,.94);assert.equal(mesh.material,animal.mantleMat);
        assert.deepEqual(mesh.position.toArray(),[meta.side*.310*animal.scale,.075*animal.scale,.410*animal.scale]);
        for(let index=0;index<position.count;index++){assert.ok(Number.isFinite(position.getX(index)+position.getY(index)+position.getZ(index)));close(Math.hypot(normal.getX(index),normal.getY(index),normal.getZ(index)),1,2e-6);assert.ok(normal.getX(index)*meta.side>0,'Outward orbital normals');}
        for(let row=0;row<=meta.rows;row++)for(let axis=0;axis<3;axis++)close(normal.array[(row*33)*3+axis],normal.array[(row*33+32)*3+axis]);
        let seated=0;
        for(let column=0;column<meta.columns;column++){
          const point=surface[meta.rows*33+column];ray.set(new THREE.Vector3(meta.side*3*animal.scale,point.y,point.z),new THREE.Vector3(-meta.side,0,0));
          const hit=ray.intersectObject(head,false)[0];assert.ok(hit,'Outer tissue edge must overlap the rendered head');
          const projection=meta.side*(point.x-hit.point.x);assert.ok(projection<.006*animal.scale,'Orbital tissue must not float above the head');if(projection<=0)seated++;
        }
        assert.ok(seated>=meta.columns*.70,'Most of the outer edge must sink into the rendered head');
      }
      for(const lid of parts(animal,'cl-eye-lid')){assert.equal(lid.geometry.userData.clReefOrbitalFold,'tapered-v1');assert.equal(lid.material,animal.mantleMat);const p=lid.geometry.attributes.position,curve=lid.geometry.parameters.path;for(const row of [0,9,18]){const center=curve.getPointAt(row/18),radius=new THREE.Vector3().fromBufferAttribute(p,row*7).distanceTo(center);close(radius/animal.scale,row===9?.019:.006);}}
    }
  });

  it('preserves the horizontal eye caps and clears actual pupil vertices from the skin at inspection angles',()=>{
    const ray=new THREE.Raycaster();
    for(const id of targets){const animal=rig(id);animal.update(.7,.05,state({moving:true}));animal.root.updateMatrixWorld(true);
      for(const name of ['cl-iris','cl-pupil'])for(const mesh of parts(animal,name)){
        const position=mesh.geometry.attributes.position,side=Math.sign(position.getX(0)),pupil=name==='cl-pupil';assert.equal(position.count,231);
        for(let row=0;row<=6;row++)for(let column=0;column<=32;column++){
          const r=row/6,angle=column/32*Math.PI*2,y=Math.sin(angle)*r*(pupil?.80*.32:.94),z=Math.cos(angle)*r*(pupil?.80:.94),dome=Math.sqrt(Math.max(0,1-y*y-z*z)),index=row*33+column;
          close(position.getX(index),side*(.360+.075*dome+(pupil?.0025:0))*animal.scale);close(position.getY(index),(.075+.126*y)*animal.scale);close(position.getZ(index),(.430+.142*z)*animal.scale);
        }
      }
      const occluders=meshes(animal).filter(object=>['cl-head','cl-mantle','cl-eye-rim','cl-eye-lid'].includes(object.name));
      for(const pupil of parts(animal,'cl-pupil'))for(const point of points(pupil)){
        const side=Math.sign(point.x),origin=new THREE.Vector3(side*3.6*animal.scale,.25*animal.scale,.43*animal.scale),direction=point.clone().sub(origin),distance=direction.length();
        ray.set(origin,direction.normalize());ray.far=distance-.0001*animal.scale;assert.equal(ray.intersectObjects(occluders,false).length,0,id+' skin covers the pupil');
      }
    }
  });

  it('retains static resources through activity, pause and reduced motion, independently owned per animal',()=>{
    for(const id of targets){const animal=rig(id),all=meshes(animal),form=all.filter(object=>formNames.has(object.name)),records=form.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,index:mesh.geometry.index,attributes:Object.entries(mesh.geometry.attributes).map(([name,attribute])=>({name,attribute,array:attribute.array,copy:Array.from(attribute.array)})),transform:[...mesh.position.toArray(),...mesh.quaternion.toArray(),...mesh.scale.toArray()]}));
      for(let step=0;step<12;step++){
        animal.update(step*.1,step>8?0:.05,state({moving:step%2===0,jet:step%3===0,strike:step%4===0?.8:0,camo:.7,substrate:'rock',reducedMotion:step>6}));assert.equal(meshes(animal).length,all.length);
        for(const row of records){assert.equal(row.mesh.geometry,row.geometry);assert.equal(row.mesh.material,row.material);assert.equal(row.geometry.index,row.index);for(const attr of row.attributes){assert.equal(row.geometry.attributes[attr.name],attr.attribute);assert.equal(attr.attribute.array,attr.array);assert.deepEqual(Array.from(attr.array),attr.copy);}assert.deepEqual([...row.mesh.position.toArray(),...row.mesh.quaternion.toArray(),...row.mesh.scale.toArray()],row.transform);}
      }
      const other=rig(id),geometries=new Set(records.map(row=>row.geometry)),materials=new Set(records.map(row=>row.material));assert.ok(meshes(other).filter(mesh=>formNames.has(mesh.name)).every(mesh=>!geometries.has(mesh.geometry)&&!materials.has(mesh.material)));
    }
  });

  it('keeps the hood attached and the pupil visible in finite rotated crevice poses',()=>{
    const ray=new THREE.Raycaster();
    for(const id of targets)for(const yaw of [0,.73,Math.PI/2]){
      const animal=rig(id),width=id==='giantPacific'?.42:.30,gap=corridor(width),before=formHash(animal),body=animal.root.getObjectByName('cl-crevice-body');
      animal.root.position.y=.55*animal.scale;animal.root.rotation.y=yaw;animal.arms.forEach(arm=>{arm.compressCurrent=.55;});
      animal.update(7,0,state({reducedMotion:true,squeezeBlend:1,refugeHideBlend:1,refugePeekBlend:0,crevice:gap}));animal.root.updateMatrixWorld(true);
      assert.ok(body.matrix.elements.every(Number.isFinite));assert.ok(body.matrix.determinant()>1e-5);assert.ok(!body.matrix.equals(new THREE.Matrix4()),'Valid walls must exercise the refuge frame');assert.equal(formHash(animal),before,'Shared frame must retain local eye/head attachment');
      const form=meshes(animal).filter(mesh=>formNames.has(mesh.name));
      for(const mesh of form){const normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),normal=mesh.geometry.attributes.normal;
        for(const point of points(mesh)){assert.ok(point.toArray().every(Number.isFinite));assert.ok(Math.abs(point.x)<=width/2+1e-6,'Eye/head crosses a refuge wall');assert.ok(point.length()<4*animal.scale,'Refuge form remains bounded');}
        for(let index=0;index<normal.count;index++){const n=new THREE.Vector3().fromBufferAttribute(normal,index).applyMatrix3(normalMatrix);assert.ok(n.toArray().every(Number.isFinite));assert.ok(n.length()>.001);}
      }
      const occluders=form.filter(mesh=>mesh.name!=='cl-iris'&&mesh.name!=='cl-pupil');
      for(const pupil of parts(animal,'cl-pupil')){const side=Math.sign(pupil.geometry.attributes.position.getX(0)),origin=new THREE.Vector3(side*3.6*animal.scale,.25*animal.scale,.43*animal.scale).applyMatrix4(body.matrixWorld);
        for(const point of points(pupil)){const direction=point.clone().sub(origin),distance=direction.length();ray.set(origin,direction.normalize());ray.far=distance-.0001*animal.scale;assert.equal(ray.intersectObjects(occluders,false).length,0,id+' refuge hood covers the pupil');}
      }
    }
  });

  it('preserves accepted blue-ringed, swimmer and nautilus head and eye geometry',()=>{
    for(const id of protectedIds){const animal=rig(id);assert.equal(formHash(animal),protectedForms[id],id+' protected form');assert.ok(meshes(animal).every(mesh=>!mesh.geometry.userData.clReefHeadForm&&!mesh.geometry.userData.clOctopusOrbitalHood&&!mesh.geometry.userData.clReefOrbitalFold));}
  });
});

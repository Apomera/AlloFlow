import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_cephalopodlab.js','utf8');
const begin=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',begin);
if(begin<0||end<=begin)throw Error('Cannot find actual animal factory');
const build=new Function('T','species','Math',source.slice(begin,end)+';return createCLHuntAnimal(T,species);');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Octopus eye rig consumed dive RNG');}});
const ids=['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto'];
const eyeNames=new Set(['cl-eye-rim','cl-iris','cl-pupil','cl-eye-highlight','cl-eye-lid']);
const allocated=[];
const state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',reducedMotion:false,...extra});
function rig(id){const animal=build(THREE,{id,bodyColor:0xbc6048},noRandom);allocated.push(animal);return animal;}
function meshes(animal){const result=[];animal.root.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
const eyes=animal=>meshes(animal).filter(o=>eyeNames.has(o.name));
const pair=(animal,name)=>meshes(animal).filter(o=>o.name===name);
function points(mesh){mesh.updateWorldMatrix(true,false);return Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld));}

// Captured before pass-fifteen: exclude only the intentionally replaced shell subtree.
// Pass sixteen excludes only the four approved nautilus eye subtrees; other species and anatomy remain protected.
function insideNautilusEye(o){let eye=false;for(let p=o;p;p=p.parent){if(['cl-eye-rim','cl-iris','cl-pupil','cl-eye-highlight'].includes(p.name))eye=true;if(p.userData.species==='nautilus')return eye;}return false;}
function insideNautilusShell(o){for(let p=o;p;p=p.parent)if(p.name==='cl-shell')return true;return false;}
// Pass twenty-three excludes only Humboldt's intentionally replaced siphon subtree.
function insideSquidSiphon(o){let siphon=false;for(let p=o;p;p=p.parent){if(p.name==='cl-siphon')siphon=true;if(p.userData.species==='humboldtSquid')return siphon;}return false;}
function fingerprint(animal,excludeEyes){const rows=meshes(animal).filter(o=>(!excludeEyes||!eyeNames.has(o.name))&&!insideNautilusShell(o)&&!insideNautilusEye(o)&&!insideSquidSiphon(o)).map(o=>[o.name,Object.entries(o.geometry.attributes).map(([name,attr])=>[name,Array.from(attr.array)]),o.geometry.index?Array.from(o.geometry.index.array):null,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.isInstancedMesh?Array.from(o.instanceMatrix.array):null]);return createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
afterEach(()=>{for(const animal of allocated.splice(0)){const geometries=new Set(),materials=new Set();meshes(animal).forEach(o=>{geometries.add(o.geometry);materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}});

describe('Benthic octopus curved eye surfaces',()=>{
  it('uses finite outward cap geometry with bounded eye draw calls and triangles',()=>{
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cross=new THREE.Vector3(),normal=new THREE.Vector3();
    for(const id of ids){const animal=rig(id),all=eyes(animal);expect(all,id).toHaveLength(8);
      expect(all.reduce((sum,o)=>sum+o.geometry.attributes.position.count,0)).toBe(2040);
      expect(all.reduce((sum,o)=>sum+o.geometry.index.count/3,0)).toBe(3408);
      for(const mesh of all){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true);expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
        for(let i=0;i<n.count;i++)expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i)),id+' '+mesh.name).toBeCloseTo(1,5);
        if(mesh.name!=='cl-iris'&&mesh.name!=='cl-pupil')continue;
        let area=0;const index=mesh.geometry.index.array;
        for(let i=0;i<index.length;i+=3){a.fromBufferAttribute(p,index[i]);b.fromBufferAttribute(p,index[i+1]);c.fromBufferAttribute(p,index[i+2]);cross.crossVectors(b.sub(a),c.sub(a));if(cross.lengthSq()<1e-18)continue;normal.fromBufferAttribute(n,index[i]);expect(cross.dot(normal),id+' inward face').toBeGreaterThan(0);area+=cross.length()/2;}
        expect(area).toBeGreaterThan(.001*animal.scale**2);
      }
    }
  });

  it('mirrors eyes and preserves socket and aperture anchors across all six species scales',()=>{
    for(const id of ids){const animal=rig(id);
      for(const name of ['cl-iris','cl-pupil']){const [left,right]=pair(animal,name),a=points(left),b=points(right);expect(a).toHaveLength(b.length);
        a.forEach((p,i)=>{expect(p.x).toBeCloseTo(-b[i].x,6);expect(p.y).toBeCloseTo(b[i].y,6);expect(p.z).toBeCloseTo(b[i].z,6);});
        const bounds=new THREE.Box3().setFromPoints(a),center=bounds.getCenter(new THREE.Vector3());expect(center.y).toBeCloseTo(.075*animal.scale,6);expect(center.z).toBeCloseTo(.430*animal.scale,6);
      }
      for(const socket of pair(animal,'cl-eye-rim')){expect(Math.abs(socket.position.x)).toBeCloseTo(.310*animal.scale,8);expect(socket.position.y).toBeCloseTo(.075*animal.scale,8);expect(socket.position.z).toBeCloseTo(.410*animal.scale,8);}
      const compatibility=animal.root.children.filter(o=>o.name==='cl-eye-highlight');expect(compatibility).toHaveLength(2);expect(compatibility.every(o=>o.isGroup&&o.children.length===1&&o.children[0].name==='cl-eye-lid')).toBe(true);
    }
  });

  it('seats a horizontal pupil above actual rendered iris triangles with safe edge clearance',()=>{
    const ray=new THREE.Ray(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();
    for(const id of ids){const animal=rig(id),pupils=pair(animal,'cl-pupil'),irises=pair(animal,'cl-iris');
      for(let sideIndex=0;sideIndex<2;sideIndex++){const pupilPoints=points(pupils[sideIndex]),irisPoints=points(irises[sideIndex]),index=irises[sideIndex].geometry.index.array,side=Math.sign(pupilPoints[0].x),irisBounds=new THREE.Box3().setFromPoints(irisPoints),pupilBounds=new THREE.Box3().setFromPoints(pupilPoints),pupilSize=pupilBounds.getSize(new THREE.Vector3());
        expect(pupilSize.y/pupilSize.z).toBeGreaterThan(.2);expect(pupilSize.y/pupilSize.z).toBeLessThan(.4);
        expect(pupilBounds.min.y).toBeGreaterThan(irisBounds.min.y);expect(pupilBounds.max.y).toBeLessThan(irisBounds.max.y);expect(pupilBounds.min.z).toBeGreaterThan(irisBounds.min.z);expect(pupilBounds.max.z).toBeLessThan(irisBounds.max.z);
        for(const point of pupilPoints){ray.origin.set(side*2*animal.scale,point.y,point.z);ray.direction.set(-side,0,0);let nearest=Infinity;
          for(let i=0;i<index.length;i+=3){a.copy(irisPoints[index[i]]);b.copy(irisPoints[index[i+1]]);c.copy(irisPoints[index[i+2]]);if(ray.intersectTriangle(a,b,c,false,hit))nearest=Math.min(nearest,ray.origin.distanceTo(hit));}
          expect(Number.isFinite(nearest),id+' pupil outside iris').toBe(true);const lift=nearest-ray.origin.distanceTo(point);expect(lift).toBeGreaterThan(.001*animal.scale);expect(lift).toBeLessThan(.01*animal.scale);
        }
      }
    }
  });

  it('keeps sockets embedded in the head and actual skin lids clear of each aperture',()=>{
    const ray=new THREE.Raycaster();
    for(const id of ids){const animal=rig(id);animal.update(.75,.05,state({moving:true}));animal.root.updateMatrixWorld(true);
      const head=animal.root.getObjectByName('cl-head'),inverse=head.matrixWorld.clone().invert();
      for(const socket of pair(animal,'cl-eye-rim')){const surface=points(socket),embedded=surface.filter(p=>p.clone().applyMatrix4(inverse).length()<.34*.99);expect(embedded.length/surface.length,id+' floating socket').toBeGreaterThan(.1);}
      const occluders=meshes(animal).filter(o=>['cl-head','cl-mantle','cl-eye-rim','cl-eye-lid'].includes(o.name));
      for(const pupil of pair(animal,'cl-pupil'))for(const point of points(pupil)){const side=Math.sign(point.x),origin=new THREE.Vector3(side*3.6*animal.scale,.25*animal.scale,.43*animal.scale),direction=point.clone().sub(origin),distance=direction.length();ray.set(origin,direction.normalize());ray.far=distance-.0001*animal.scale;expect(ray.intersectObjects(occluders,false),id+' eye aperture covered by skin').toHaveLength(0);}
    }
  });

  it('uses shared linear dark pupil materials and a separate clock-free bundled shader hook',()=>{
    for(const id of ids){const animal=rig(id),[left,right]=pair(animal,'cl-pupil'),material=left.material;
      expect(material).toBe(right.material);expect(material.name).toBe('cl-octopus-pupil-material');expect(material.isMeshPhysicalMaterial).toBe(true);expect(Math.max(...material.color.toArray())).toBeLessThan(.004);expect(material.emissive.getHex()).toBe(0);expect(material.transparent).toBe(false);
      const shader={fragmentShader:THREE.ShaderLib.physical.fragmentShader};material.onBeforeCompile(shader);expect(shader.fragmentShader.match(/vec3 clOctoEyeN=/g)).toHaveLength(1);expect(material.customProgramCacheKey()).toBe('cl-octopus-pupil-water-v13');expect(shader.fragmentShader).not.toMatch(/clPhase|clTime|clOctoEyeTime/);
      const irises=pair(animal,'cl-iris');expect(irises[0].material).toBe(irises[1].material);expect(irises[0].material.name).toBe('cl-octopus-iris-material');expect(irises[0].material.vertexColors).toBe(true);expect(Array.from(irises[0].geometry.attributes.color.array).every(v=>Number.isFinite(v)&&v>0&&v<1)).toBe(true);
      expect(pair(animal,'cl-eye-lid').every(o=>o.material===animal.mantleMat)).toBe(true);
    }
    for(const id of ['humboldtSquid','cuttlefish'])expect(pair(rig(id),'cl-pupil')[0].material.customProgramCacheKey()).not.toBe('cl-octopus-pupil-water-v13');
  });

  it('keeps eye resources static and independently owned through move, jet, strike and frozen updates',()=>{
    for(const id of ids){const animal=rig(id),all=eyes(animal),before=all.map(o=>({geometry:o.geometry,material:o.material,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,vertices:Array.from(o.geometry.attributes.position.array),normals:Array.from(o.geometry.attributes.normal.array),transform:[...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()]}));
      for(let step=0;step<30;step++)animal.update(90+step*.1,step>20?0:.05,state({moving:true,jet:step%3===0,strike:step%5===0?1:0,reducedMotion:step>15}));
      all.forEach((o,i)=>{expect(o.geometry).toBe(before[i].geometry);expect(o.material).toBe(before[i].material);expect(o.geometry.attributes.position).toBe(before[i].position);expect(o.geometry.attributes.normal).toBe(before[i].normal);expect(Array.from(o.geometry.attributes.position.array)).toEqual(before[i].vertices);expect(Array.from(o.geometry.attributes.normal.array)).toEqual(before[i].normals);expect([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()]).toEqual(before[i].transform);});
      const other=rig(id),geometries=new Set(all.map(o=>o.geometry)),materials=new Set(all.map(o=>o.material));expect(eyes(other).every(o=>!geometries.has(o.geometry)&&!materials.has(o.material))).toBe(true);
    }
  });

  it('preserves captured non-eye octopuses, complete squid/four-swimmer rigs and nautilus non-shell/non-eye anatomy',()=>{
    // Captured before pass-thirteen integration; exclusions are only the five named eye surfaces/groups.
    const baseline={
      commonOcto:'fb3c872f587639a3092b7980a5cea4eda017694c688aa422ee81549f9e9abf04',blueRinged:'ea6f4965d8a861670c745ce8917aace25b764808cb51a14e8c6305841b367adc',mimicOcto:'fb3c872f587639a3092b7980a5cea4eda017694c688aa422ee81549f9e9abf04',giantPacific:'041016f41d929ad094747fabd9fe30a2b5b94ce4b7b2a7551f36aa155777ed0f',caribReef:'fb3c872f587639a3092b7980a5cea4eda017694c688aa422ee81549f9e9abf04',coconutOcto:'fb3c872f587639a3092b7980a5cea4eda017694c688aa422ee81549f9e9abf04',
      humboldtSquid:'651dbdf184c597b08a810f7e3b133c34f4c10fc70470f47a180bce9ca6e9b377',nautilus:'3223bcf0ce8d008ac1baf5492a1896e7106e039c25f12313c922d9f0d4a5d85d',cuttlefish:'a0d4bb51fae780771b4dcf1c7c7890cd3c0c7a8e796e9d95ad739eb5e15c8b31',bobtailSquid:'28d6ae5749d749c3d82f9490dab425630b9fd431aa263e213b582433a8761c81',dumboOcto:'bf6090a22eae7b8421c7c0f67107978d4cccd199dd9923d17e12a9fb6fdae55b',vampireSquid:'7bb9a0fb32f9b95dfb53cc7c6664924bc8303155b12cef82870c00c5faaeb232'
    };
    for(const [id,expected]of Object.entries(baseline))expect(fingerprint(rig(id),ids.includes(id)),id).toBe(expected);
  });
});

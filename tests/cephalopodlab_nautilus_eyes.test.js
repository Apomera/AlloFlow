import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',start);
if(start<0||end<=start)throw Error('Animal factory anchors missing');
const build=new Function('T','species','Math',source.slice(start,end)+';return createCLHuntAnimal(T,species);');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Nautilus eye geometry consumed dive RNG');}}),allocated=[];
const names=new Set(['cl-eye-rim','cl-iris','cl-pupil','cl-eye-highlight','cl-eye-lid']),stride=33;
const state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',display:false,reducedMotion:false,...extra});
function rig(id='nautilus'){const a=build(THREE,{id,bodyColor:0x8a7a52},noRandom);allocated.push(a);return a;}
function meshes(a){const result=[];a.root.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function eyes(a){return meshes(a).filter(o=>names.has(o.name));}
function pair(a,name){return eyes(a).filter(o=>o.name===name);}
function compiled(m){const s={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(s,{capabilities:{isWebGL2:true}});return s;}
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function protectedRecords(a){return meshes(a).filter(o=>a.root.userData.species!=='nautilus'||!names.has(o.name)).map(o=>{const g=o.geometry,m=o.material,s=compiled(m);return[o.name,Object.entries(g.attributes).map(([k,v])=>[k,Array.from(v.array)]),g.index?Array.from(g.index.array):null,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.isInstancedMesh?Array.from(o.instanceMatrix.array):null,m.type,m.name,m.color?.toArray(),m.roughness,m.metalness,m.side,m.opacity,m.transparent,m.customProgramCacheKey(),s.vertexShader,s.fragmentShader,Object.fromEntries(Object.entries(s.uniforms).map(([k,v])=>[k,v.value?.toArray?v.value.toArray():v.value]))];});}
function point(mesh,i){return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);}
function ring(mesh,row){return Array.from({length:32},(_,i)=>point(mesh,row*stride+i));}
function centroid(points){return points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/points.length);}
function outerOpening(mesh){return ring(mesh,mesh.geometry.attributes.position.count/stride-1);}
afterEach(()=>{for(const a of allocated.splice(0)){const g=new Set(),m=new Set();meshes(a).forEach(o=>{g.add(o.geometry);m.add(o.material);});g.forEach(v=>v.dispose());m.forEach(v=>v.dispose());}});

describe('Nautilus open pinhole eyes',()=>{
  it('uses six finite smooth eye surfaces under the old geometry budget with no lens or painted glint',()=>{
    const a=rig(),all=eyes(a);expect(THREE.REVISION).toBe('128');expect(all).toHaveLength(6);
    expect(all.reduce((n,m)=>n+m.geometry.attributes.position.count,0)).toBe(1190);expect(all.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBe(1984);
    expect(new Set(all.map(m=>m.material)).size).toBe(2);expect(all.map(m=>m.name)).toEqual(['cl-eye-rim','cl-iris','cl-pupil','cl-eye-rim','cl-iris','cl-pupil']);
    const groups=a.root.children.filter(o=>o.name==='cl-eye-highlight');expect(groups).toHaveLength(2);expect(groups.every(o=>o.isGroup&&o.children.length===0)).toBe(true);
    for(const mesh of all){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,indices=mesh.geometry.index.array;
      expect(Array.from(p.array).every(Number.isFinite)).toBe(true);expect(Array.from(n.array).every(Number.isFinite)).toBe(true);expect(mesh.geometry.boundingBox).not.toBe(null);expect(mesh.geometry.boundingSphere).not.toBe(null);
      for(let i=0;i<n.count;i++)expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,5);
      const v=new THREE.Vector3(),w=new THREE.Vector3(),u=new THREE.Vector3(),normal=new THREE.Vector3();
      for(let i=0;i<indices.length;i+=3){u.fromBufferAttribute(p,indices[i]);v.fromBufferAttribute(p,indices[i+1]).sub(u);w.fromBufferAttribute(p,indices[i+2]).sub(u);normal.fromBufferAttribute(n,indices[i]);expect(v.cross(w).dot(normal),mesh.name+' triangle '+i/3).toBeGreaterThan(0);}
    }
  });

  it('mirrors the cups, retains legacy anchors and buries the complete basal ring in the unchanged head',()=>{
    const a=rig();a.root.updateMatrixWorld(true);const head=a.root.getObjectByName('cl-head'),inverse=new THREE.Matrix4().copy(head.matrixWorld).invert();
    for(const name of ['cl-eye-rim','cl-iris','cl-pupil']){const [left,right]=pair(a,name),lp=left.geometry.attributes.position,rp=right.geometry.attributes.position;expect(lp.count).toBe(rp.count);
      for(let i=0;i<lp.count;i++){const l=point(left,i),r=point(right,i);expect(l.x).toBeCloseTo(-r.x,6);expect(l.y).toBeCloseTo(r.y,6);expect(l.z).toBeCloseTo(r.z,6);const ln=left.geometry.attributes.normal,rn=right.geometry.attributes.normal;expect(ln.getX(i)).toBeCloseTo(-rn.getX(i),6);expect(ln.getY(i)).toBeCloseTo(rn.getY(i),6);expect(ln.getZ(i)).toBeCloseTo(rn.getZ(i),6);}
      const x=name==='cl-eye-rim'?.31:name==='cl-iris'?.375:.423,z=name==='cl-eye-rim'?.41:.43;expect(left.position.toArray()).toEqual([-x,.075,z]);expect(right.position.toArray()).toEqual([x,.075,z]);
    }
    for(const rim of pair(a,'cl-eye-rim'))for(const p of ring(rim,0))expect(p.applyMatrix4(inverse).length()/.34).toBeLessThan(.97);
  });

  it('welds the annular opening to a recessed interior and leaves no front lens or disk across its circular aperture',()=>{
    const a=rig();a.root.updateMatrixWorld(true);const irises=pair(a,'cl-iris'),rims=pair(a,'cl-eye-rim'),pupils=pair(a,'cl-pupil');
    for(let sideIndex=0;sideIndex<2;sideIndex++){const iris=irises[sideIndex],rim=rims[sideIndex],pupil=pupils[sideIndex],opening=outerOpening(iris),center=centroid(opening),side=Math.sign(center.x),out=new THREE.Vector3(side,0,0),innerStart=ring(pupil,0);
      opening.forEach((p,i)=>{expect(p.distanceTo(innerStart[i])).toBeLessThan(1e-7);expect(p.distanceTo(center)).toBeCloseTo(.025,6);expect(p.x).toBeCloseTo(center.x,6);});
      const outer=ring(iris,0),rimEdge=ring(rim,rim.geometry.attributes.position.count/stride-1);outer.forEach((p,i)=>expect(p.distanceTo(rimEdge[i])).toBeLessThan(1e-7));
      for(const offset of [new THREE.Vector3(),new THREE.Vector3(0,.01,0),new THREE.Vector3(0,0,.01)]){const origin=center.clone().add(offset).addScaledVector(out,.2),ray=new THREE.Raycaster(origin,out.clone().negate(),0,.3);
        expect(ray.intersectObjects([rim,iris],false)).toHaveLength(0);const hits=ray.intersectObject(pupil,false);expect(hits.length).toBeGreaterThan(0);expect(hits[0].distance-.2).toBeGreaterThan(.02);expect(hits[0].distance-.2).toBeLessThan(.045);
      }
      const head=a.root.getObjectByName('cl-head'),inverse=new THREE.Matrix4().copy(head.matrixWorld).invert();for(let i=0;i<pupil.geometry.attributes.position.count;i++)expect(point(pupil,i).applyMatrix4(inverse).length()/.34).toBeGreaterThan(1.025);
    }
  });

  it('keeps actual openings clear of the shell and head through seventeen rocking positions and four animation states',()=>{
    const a=rig(),shell=[];a.nautilusShell.traverse(o=>{if(o.isMesh)shell.push(o);});const head=a.root.getObjectByName('cl-head');
    a.root.position.set(2,-1,3);a.root.rotation.set(.13,.71,-.09,'YXZ');
    for(let pose=0;pose<4;pose++){a.update(2+pose*.1,.05,state({moving:pose>0,jet:pose===2,strike:.65,substrate:pose?'rock':'sand',reducedMotion:pose===3}));
      for(let step=0;step<=16;step++){a.nautilusShell.rotation.z=-.04+step*.005;a.root.updateMatrixWorld(true);
        for(const iris of pair(a,'cl-iris')){const center=centroid(outerOpening(iris)),side=Math.sign(iris.position.x),out=new THREE.Vector3(side,0,0).transformDirection(a.root.matrixWorld);
          for(const localDirection of [new THREE.Vector3(side,0,0),new THREE.Vector3(side,.15,.3).normalize()]){const direction=localDirection.transformDirection(a.root.matrixWorld),ray=new THREE.Raycaster(center.clone().addScaledVector(direction,2),direction.clone().negate(),0,1.999);expect(ray.intersectObjects([...shell,head],false),'opening occluded at pose '+pose+' rock '+step).toHaveLength(0);}
          const pupil=pair(a,'cl-pupil').find(o=>Math.sign(o.position.x)===side),ray=new THREE.Raycaster(center.clone().addScaledVector(out,.2),out.clone().negate(),0,.3),hits=ray.intersectObjects([pupil,head,...shell],false);expect(hits[0]?.object).toBe(pupil);
        }
      }
    }
  });

  it('uses plain opaque tissue materials and independent owned resources that remain static through updates',()=>{
    const a=rig(),all=eyes(a),materials=[...new Set(all.map(m=>m.material))];expect(materials.map(m=>m.name).sort()).toEqual(['cl-nautilus-eye-interior-material','cl-nautilus-eye-material']);
    for(const m of materials){expect(m.type).toBe('MeshStandardMaterial');expect(m.transparent).toBe(false);expect(m.opacity).toBe(1);expect(m.metalness).toBe(0);expect(m.emissive.getHex()).toBe(0);expect(m.roughness).toBeGreaterThan(.5);expect(Object.values(m).some(v=>v?.isTexture)).toBe(false);const s=compiled(m);expect(s.vertexShader).toBe(THREE.ShaderLib.standard.vertexShader);expect(s.fragmentShader).toBe(THREE.ShaderLib.standard.fragmentShader);expect(Object.keys(s.uniforms)).toHaveLength(0);}
    const saved=all.map(o=>({geometry:o.geometry,material:o.material,p:o.geometry.attributes.position.array,n:o.geometry.attributes.normal.array,indices:o.geometry.index.array,values:hash([Array.from(o.geometry.attributes.position.array),Array.from(o.geometry.attributes.normal.array),o.position.toArray(),o.quaternion.toArray(),o.scale.toArray()])}));
    for(let i=0;i<24;i++)a.update(i*13,i%3?.05:0,state({moving:true,jet:i%2===0,strike:1,reducedMotion:i>12}));
    all.forEach((o,i)=>{expect(o.geometry).toBe(saved[i].geometry);expect(o.material).toBe(saved[i].material);expect(o.geometry.attributes.position.array).toBe(saved[i].p);expect(o.geometry.attributes.normal.array).toBe(saved[i].n);expect(o.geometry.index.array).toBe(saved[i].indices);expect(hash([Array.from(saved[i].p),Array.from(saved[i].n),o.position.toArray(),o.quaternion.toArray(),o.scale.toArray()])).toBe(saved[i].values);});
    const b=rig(),geometries=new Set(all.map(o=>o.geometry)),owned=new Set(materials);expect(eyes(b).every(o=>!geometries.has(o.geometry)&&!owned.has(o.material))).toBe(true);const disposed=new Set();for(const resource of [...geometries,...owned]){resource.addEventListener('dispose',()=>disposed.add(resource));resource.dispose();}expect(disposed.size).toBe(8);
  });

  it('preserves the entire accepted shell, head, siphon and filament rig and every other species geometry and shader',()=>{
    // Captured from the accepted pass-fifteen factory before the eye-only patch.
    // Nautilus excludes only its four eye names; unlike earlier suites, its complete shell is included.
    const expected={commonOcto:'062749c57c069d1144ba02361e100b9cc357e646e7a6d6cde864cb98f1f36121',blueRinged:'93198a1edb04aa7894c65c563d945ca17483c046c025d04a5a0c0c92e71a2aaf',mimicOcto:'062749c57c069d1144ba02361e100b9cc357e646e7a6d6cde864cb98f1f36121',giantPacific:'bbd7f1259032347eaf63884ca47074e90ccea89f3e37a014395e7a5011c464c0',caribReef:'062749c57c069d1144ba02361e100b9cc357e646e7a6d6cde864cb98f1f36121',coconutOcto:'062749c57c069d1144ba02361e100b9cc357e646e7a6d6cde864cb98f1f36121',humboldtSquid:'ff0ccdb4b94b5ba2dbf1a80f924e17958d21450260a32eb5d60f65c6c97f1e55',nautilus:'ceffdde8ff4212679820bf570bafc0bc0b89de34a34835893eab91cee4be1aac',cuttlefish:'05067cfb886de1799621787d65729da2b9888d0e9f7bab36adce7176b14e14f6',bobtailSquid:'4ee65934d880254c0949288a9955588e46912707c2b6dae5c4e71b02e3291e38',dumboOcto:'fa760b6a4268d0af180653270cf5708467461425420bdfe93db17236104f836b',vampireSquid:'7497d5c70ed65a3b7bf94ecc0d081369d1dcfc124c16dbd12f56da5545751d70'};
    for(const [id,fingerprint]of Object.entries(expected)){const a=rig(id),frames=[];for(let i=0;i<4;i++){a.update(1+i*.05,.05,state({moving:i>0,jet:i===2,strike:i===3?.6:0,camo:.6,substrate:['sand','rock','grass','sand'][i],display:i===2,reducedMotion:i===3}));frames.push(hash(protectedRecords(a)));}expect(hash(frames),id).toBe(fingerprint);}
  },30000);
});

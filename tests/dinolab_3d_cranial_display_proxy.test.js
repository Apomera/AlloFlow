import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_CRANIAL_DISPLAY_PROXY_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
window.StemLab={registerTool(){}};
const nativeHelpers=[...source.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]).join(',');
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__cranialDisplay={DINOS,"+nativeHelpers+"};window.StemLab.registerTool('dinoLab'"))();
const api=globalThis.__cranialDisplay;delete globalThis.__cranialDisplay;
const modes=[{head:.90,neck:.88,body:.91},{head:.97,neck:.97,body:.98},{head:1,neck:1,body:1},{head:1.04,neck:1.07,body:1.05}];
const axis=new THREE.Vector3(1.031,-.577,.137).normalize();
const measurements=[];
function seam(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw new Error('Missing native cranial assembly seam');return source.slice(a,b);}
const assembly=seam('var detailScale = Math.min(1, ht / 2);','var evidenceAnchorPoints =');
const envelope=seam('var surfaceHeadFactor = reconstructionProfile.head','if (headShell) {');
const chain=seam('function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {','function addContourGroup(meshes)');
const ellipsoid=seam('function addSkeletonEllipsoid(pos, scale, mat) {','function addSkeletonCone(base, tip, radius, mat)');
const sizing=seam('var skullLength = Math.max(0.20 * detailScale,','var neckAxis =');
const bulkEnd=['if(!theropodCranium&&!sauropodCranium)addBone(head.clone().add(vec(0, skullHeight * 0.42, 0))','if(!theropodCranium)addBone(head.clone().add(vec(0, skullHeight * 0.42, 0))','addBone(head.clone().add(vec(0, skullHeight * 0.42, 0))'].find(marker=>source.includes(marker));
const bulk=seam('var cranialDisplay = dinoCranialDisplayProfile(THREE, props.species, head, snout,',bulkEnd);
const createSkin=new Function('context','with(context){'+chain+'return addSoftTissueChain;}');
const createBone=new Function('context','with(context){'+ellipsoid+'return addSkeletonEllipsoid;}');
const createEnvelope=new Function('context','with(context){'+assembly+'var surfaceBodyHeight=bodyHeight*surfaceHypothesis.bodyHeightScale;'+envelope+'return {head,snout,shoulder,ceratopsidCranium,armoredCranium,carnotaurusCranium:typeof carnotaurusCranium === "undefined"?null:carnotaurusCranium,stegosaurCranium:typeof stegosaurCranium === "undefined"?null:stegosaurCranium,theropodCranium:typeof theropodCranium === "undefined"?null:theropodCranium,sauropodCranium:typeof sauropodCranium === "undefined"?null:sauropodCranium,headShell,detailScale,len,ht,reconstructionProfile};}');
const createSizing=new Function('context','with(context){'+sizing+'return {skullLength,skullHeight,skullDepth};}');
const createBulk=new Function('context','with(context){'+bulk+'return {vault:cranialVault,rostrum:cranialRostrum,rostrumCenter,profile:cranialDisplay};}');
function build(scale=1,mode=modes[2],id='triceratops',showSkeleton=true){
  const dn=api.DINOS.find(d=>d.id===id),skinModel=new THREE.Group(),boneModel=new THREE.Group();
  const skinMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),boneMaterial=new THREE.MeshBasicMaterial();
  const c={...api,THREE,dn,len:dn.lengthM*scale,ht:dn.heightM*scale,isTheropod:dn.group==='theropod',isSauropod:dn.group==='sauropod',cladeName:dn.clade,
    reconstructionProfile:api.reconstructionProfileFor(dn),posture:api.postureProfileFor(dn),cranialSurface:api.cranialSurfaceProfileFor(dn),postcranialSurface:api.postcranialSurfaceProfileFor(dn),
    surfaceHypothesis:{headSoftTissueScale:mode.head,neckSoftTissueScale:mode.neck,bodyHeightScale:mode.body},
    vec:(x,y,z)=>new THREE.Vector3(x,y,z),headMat:skinMaterial,bodyMat:skinMaterial,model:skinModel,props:{species:dn,showBody:true,showSkeleton},
    dinoTyrannosaurPose:api.dinoTyrannosaurPose,dinoLongSnoutedTyrannosaurAnchors:api.dinoLongSnoutedTyrannosaurAnchors,dinoCervicalEnvelope:api.dinoCervicalEnvelope,dinoNeckJunction:api.dinoNeckJunction,dinoTheropodCranialRadii:api.dinoTheropodCranialRadii,dinoCranialGeometry:api.dinoCranialGeometry,dinoSurfaceGeometry:api.dinoSurfaceGeometry};
  c.addSoftTissueChain=createSkin(c);
  const b=createEnvelope(c);
  const boneContext={...c,...b,model:boneModel,boneMat:boneMaterial};
  // Proxy construction must not inspect the selected soft-tissue hypothesis.
  Object.defineProperty(boneContext,'surfaceHypothesis',{get(){throw new Error('Bone proxy depends on tissue hypothesis');}});
  const dimensions=createSizing(boneContext);
  Object.assign(boneContext,dimensions);
  boneContext.addSkeletonEllipsoid=createBone(boneContext);
  const bones=createBulk(boneContext);
  b.headShell.geometry.computeBoundingBox();b.headShell.geometry.computeBoundingSphere();b.headShell.updateMatrixWorld(true);boneModel.updateMatrixWorld(true);
  return {...b,...bones,...dimensions,scale,dn,skinModel,boneModel,skinMaterial,boneMaterial};
}
function dispose(b){b.headShell.geometry.dispose();b.skinMaterial.dispose();for(const mesh of [b.vault,b.rostrum])if(mesh)mesh.geometry.dispose();b.boneMaterial.dispose();}
function point(mesh,i){return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);}
function samples(mesh){const result=[],index=mesh.geometry.index.array;for(let i=0;i<mesh.geometry.attributes.position.count;i++)result.push(point(mesh,i));
  for(let i=0;i<index.length;i+=3){const a=point(mesh,index[i]),b=point(mesh,index[i+1]),c=point(mesh,index[i+2]);result.push(a.clone().add(b).add(c).multiplyScalar(1/3),a.clone().lerp(b,.5),b.clone().lerp(c,.5),c.clone().lerp(a,.5));}return result;}
function contained(skin,points,scale){const reach=skin.geometry.boundingSphere.radius*4,caster=new THREE.Raycaster();let outside=0,missed=0,minimum=Infinity;
  for(const p of points){caster.set(p.clone().addScaledVector(axis,-reach),axis);const distances=[];
    for(const hit of caster.intersectObject(skin,false))if(!distances.length||hit.distance-distances[distances.length-1]>scale*1e-7)distances.push(hit.distance);
    if(distances.length<2){missed++;continue;}const inside=distances.filter(d=>d<reach).length%2===1;
    minimum=Math.min(minimum,Math.min(...distances.map(d=>Math.abs(d-reach)))*(inside?1:-1));if(!inside)outside++;}
  expect(missed).toBe(0);expect(outside).toBe(0);expect(minimum).toBeGreaterThan(scale*.0001);return {samples:points.length,missed,outside,minimumClearance:minimum};}
function soundSphere(mesh){
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,index=g.index.array,keys=new Map(),ids=[],edges=new Map();
  g.computeBoundingBox();g.computeBoundingSphere();let volume=0,smallest=Infinity;
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i),normal=new THREE.Vector3().fromBufferAttribute(n,i);expect(v.toArray().every(Number.isFinite)).toBe(true);expect(Math.abs(normal.length()-1)).toBeLessThan(1e-6);expect(g.boundingBox.containsPoint(v)).toBe(true);expect(v.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius+1e-6);
    const key=v.toArray().map(x=>Math.round(x/1e-6)).join(',');if(!keys.has(key))keys.set(key,keys.size);ids.push(keys.get(key));}
  const local=i=>new THREE.Vector3().fromBufferAttribute(p,i);
  for(let i=0;i<index.length;i+=3){const a=local(index[i]),b=local(index[i+1]),c=local(index[i+2]);smallest=Math.min(smallest,b.clone().sub(a).cross(c.clone().sub(a)).length());volume+=a.dot(b.clone().cross(c))/6;
    for(let j=0;j<3;j++){const x=ids[index[i+j]],y=ids[index[i+(j+1)%3]],key=Math.min(x,y)+','+Math.max(x,y),e=edges.get(key)||{count:0,direction:0};e.count++;e.direction+=x<y?1:-1;edges.set(key,e);}}
  expect([...edges.values()].every(e=>e.count===2&&e.direction===0)).toBe(true);expect(smallest).toBeGreaterThan(1e-8);expect(volume).toBeGreaterThan(0);
}
describe('Dino Lab fixed cranial display proxies',()=>{
  for(const scale of [.03,1,12])for(const mode of modes)it('nests vertices, triangle interiors and edges at scale '+scale+' and tissue '+mode.head,()=>{
    const b=build(scale,mode);try{for(const [region,mesh] of [['vault',b.vault],['rostrum',b.rostrum]]){soundSphere(mesh);measurements.push({scale,tissue:mode.head,region,...contained(b.headShell,samples(mesh),scale)});}}
    finally{dispose(b);}
  });
  it('uses the actual two native ellipsoid callers and retains the anatomical rostrum landmark',()=>{
    const b=build();try{
      expect(b.boneModel.children).toEqual([b.vault,b.rostrum]);
      for(const [region,mesh] of [['vault',b.vault],['rostrum',b.rostrum]]){expect(mesh.name).toBe('cranial-'+region+'-display-proxy');expect(mesh.userData.dinoCranialDisplayProxy).toEqual({region,interpretive:true,tissueHypothesisIndependent:true});expect(mesh.material).toBe(b.boneMaterial);expect(mesh.castShadow).toBe(true);expect(mesh.quaternion.toArray()).toEqual([0,0,0,1]);expect(mesh.geometry.parameters).toMatchObject({radius:1,widthSegments:24,heightSegments:16});}
      expect(b.rostrumCenter.distanceTo(b.head.clone().lerp(b.snout,.62))).toBeLessThan(1e-12);
      expect(b.rostrum.position.distanceTo(b.rostrumCenter)).toBeGreaterThan(b.scale*.01);
    }finally{dispose(b);}
  });
  it('retains the exact generic volume and transforms for other species and missing identifiers',()=>{
    const head=new THREE.Vector3(.2,.3,.13),snout=new THREE.Vector3(-1,.25,.13);
    for(const species of [undefined,{}, {id:'TRICERATOPS'},...['pachyrhinosaurus','protoceratops','tyrannosaurus','brachiosaurus'].map(id=>api.DINOS.find(d=>d.id===id))])for(const theropod of [false,true]){
      const p=api.dinoCranialDisplayProfile(THREE,species,head,snout,.8,.3,.24,.2,theropod);
      expect(p.refined).toBe(false);expect(p.vaultCenter.toArray()).toEqual(head.toArray());expect(p.vaultScale.toArray()).toEqual([.8*.68,.3,.24]);expect(p.rostrumCenter.toArray()).toEqual(head.clone().lerp(snout,.62).toArray());expect(p.rostrumScale.toArray()).toEqual([Math.max(.09*.2,.8*.62),.3*(theropod?.58:.48),.24*.72]);
    }
    for(const id of ['pachyrhinosaurus','protoceratops','tyrannosaurus','brachiosaurus']){const b=build(1,modes[2],id);try{expect(b.vault.position.toArray()).toEqual(b.head.toArray());expect(b.rostrum.position.toArray()).toEqual(b.rostrumCenter.toArray());expect(b.vault.userData.dinoCranialDisplayProxy).toBeUndefined();expect(b.rostrum.userData.dinoCranialDisplayProxy).toBeUndefined();}finally{dispose(b);}}
  });
  it('uses the shared fixed cranial frame and native sizing for the four reviewed ceratopsids',()=>{
    for(const id of ['triceratops','styracosaurus','centrosaurus','chasmosaurus']){const b=build(1,modes[2],id);try{
      expect(b.profile.refined).toBe(true);expect(b.ceratopsidCranium).not.toBeNull();
      expect(b.head.toArray()).toEqual(b.ceratopsidCranium.head.toArray());expect(b.snout.toArray()).toEqual(b.ceratopsidCranium.snout.toArray());
      expect([b.skullLength,b.skullHeight,b.skullDepth]).toEqual([b.ceratopsidCranium.boneLength,b.ceratopsidCranium.boneHeight,b.ceratopsidCranium.boneDepth]);
      expect(b.vault.position.toArray()).toEqual(b.profile.vaultCenter.toArray());expect(b.rostrum.position.toArray()).toEqual(b.profile.rostrumCenter.toArray());
      expect(b.vault.scale.toArray()).toEqual(b.profile.vaultScale.toArray());expect(b.rostrum.scale.toArray()).toEqual(b.profile.rostrumScale.toArray());
      expect(b.vault.userData.dinoCranialDisplayProxy.tissueHypothesisIndependent).toBe(true);expect(b.rostrum.userData.dinoCranialDisplayProxy.tissueHypothesisIndependent).toBe(true);
    }finally{dispose(b);}}
  });
  it('keeps bone buffers, centers and radii identical across every tissue hypothesis',()=>{
    const builds=modes.map(mode=>build(1,mode));try{for(const b of builds.slice(1))for(const region of ['vault','rostrum']){const first=builds[0][region],mesh=b[region];expect(mesh.position.toArray()).toEqual(first.position.toArray());expect(mesh.scale.toArray()).toEqual(first.scale.toArray());for(const attr of ['position','normal','uv'])expect(mesh.geometry.attributes[attr].array).toEqual(first.geometry.attributes[attr].array);expect(mesh.geometry.index.array).toEqual(first.geometry.index.array);}}
    finally{builds.forEach(dispose);}
  });
  it('returns independent vectors and native geometry buffers without mutating landmarks or the life surface',()=>{
    const b=build(),head=b.head.toArray(),snout=b.snout.toArray(),skin=b.headShell.geometry.attributes.position.array.slice();
    const p=api.dinoCranialDisplayProfile(THREE,b.dn,b.head,b.snout,b.skullLength,b.skullHeight,b.skullDepth,b.detailScale,false),q=api.dinoCranialDisplayProfile(THREE,b.dn,b.head,b.snout,b.skullLength,b.skullHeight,b.skullDepth,b.detailScale,false);
    try{expect(p.vaultCenter).not.toBe(b.head);expect(p.rostrumCenter).not.toBe(b.snout);p.vaultCenter.set(999,999,999);p.rostrumCenter.set(998,998,998);p.vaultScale.set(997,997,997);expect(q.vaultCenter.toArray()).toEqual(b.vault.position.toArray());expect(q.rostrumCenter.toArray()).toEqual(b.rostrum.position.toArray());expect(b.head.toArray()).toEqual(head);expect(b.snout.toArray()).toEqual(snout);
      expect(b.vault.geometry.attributes.position.array).not.toBe(b.rostrum.geometry.attributes.position.array);b.vault.geometry.attributes.position.setX(0,123);expect(b.rostrum.geometry.attributes.position.getX(0)).not.toBe(123);expect(b.headShell.geometry.attributes.position.array).toEqual(skin);
    }finally{dispose(b);}
  });
  it('creates no proxy meshes when the skeleton layer is disabled',()=>{const b=build(1,modes[2],'triceratops',false);try{expect(b.vault).toBeNull();expect(b.rostrum).toBeNull();expect(b.boneModel.children).toHaveLength(0);}finally{dispose(b);}});
  it('moves both proxies rigidly with the established cranial pivot without changing their buffers',()=>{
    const b=build(),rig=new THREE.Group(),neck=new THREE.Object3D(),shoulder=b.shoulder.clone(),rest=neck.quaternion.clone(),snapshots=[b.vault,b.rostrum].map(mesh=>({position:mesh.position.toArray(),scale:mesh.scale.toArray(),buffers:Object.fromEntries(['position','normal','uv'].map(k=>[k,mesh.geometry.attributes[k].array.slice()]))}));
    b.boneModel.add(rig,neck);rig.add(b.vault,b.rostrum);neck.position.copy(shoulder);neck.rotation.set(.04,.08,.02);
    try{api.dinoConnectedCranialPose(THREE,rig,shoulder,neck,rest);b.boneModel.updateMatrixWorld(true);for(const [i,mesh] of [b.vault,b.rostrum].entries()){
      let error=0;for(let j=0;j<mesh.geometry.attributes.position.count;j++){const local=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,j),restPoint=local.clone().multiply(mesh.scale).add(mesh.position),expected=restPoint.sub(shoulder).applyQuaternion(neck.quaternion).add(shoulder);error=Math.max(error,point(mesh,j).distanceTo(expected));}expect(error).toBeLessThan(1e-6);expect(mesh.position.toArray()).toEqual(snapshots[i].position);expect(mesh.scale.toArray()).toEqual(snapshots[i].scale);for(const key of ['position','normal','uv'])expect(mesh.geometry.attributes[key].array).toEqual(snapshots[i].buffers[key]);}
    }finally{dispose(b);}
  });
});


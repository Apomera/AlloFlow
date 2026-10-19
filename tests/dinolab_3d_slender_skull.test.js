import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { baselineCranialDisplayProfile, unchangedConstruction } from './fixtures/dinolab_before_slender_skull.js';

const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_SLENDER_SKULL_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const marker="window.StemLab.registerTool('dinoLab'";
if(!source.includes(marker))throw Error('Missing Dino Lab registration');
window.StemLab={registerTool(){}};
new Function(source.replace(marker,'globalThis.__slenderSkull={DINOS,reconstructionProfileFor,postureProfileFor,cranialSurfaceProfileFor,postcranialSurfaceProfileFor,dinoTyrannosaurPose,dinoLongSnoutedTyrannosaurAnchors,dinoCervicalEnvelope,dinoNeckJunction,dinoSurfaceGeometry,dinoCranialGeometry,dinoTheropodCranialRadii,dinoCranialDisplayProfile,dinoConnectedCranialPose};'+marker))();
const api=globalThis.__slenderSkull;delete globalThis.__slenderSkull;
const targets=['coelophysis','compsognathus','eodromaeus','liliensternus','sarcosaurus','scipionyx','sinosauropteryx','tawa'];
// Conservative minimum is a distinct selectable hypothesis between the lean
// Historical classic envelope and the baseline reconstruction.
const modes={lean:{head:.90,neck:.88,body:.91},conservativeMinimum:{head:.97,neck:.97,body:.98},balanced:{head:1,neck:1,body:1},robust:{head:1.04,neck:1.07,body:1.05}};
function seam(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw Error('Missing native seam '+start);return source.slice(a,b);}
const assembly=seam('var detailScale = Math.min(1, ht / 2);','var evidenceAnchorPoints =');
const envelope=seam('var surfaceHeadFactor = reconstructionProfile.head','if (headShell) {');
const chain=seam('function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {','function addContourGroup(meshes)');
const ellipsoid=seam('function addSkeletonEllipsoid(pos, scale, mat) {','function addSkeletonCone(base, tip, radius, mat)');
const bulk=seam('var cranialDisplay = dinoCranialDisplayProfile(THREE, props.species, head, snout,','addBone(head.clone().add(vec(0, skullHeight * 0.42, 0))');
const createSkin=new Function('context','with(context){'+chain+'return addSoftTissueChain;}');
const createBone=new Function('context','with(context){'+ellipsoid+'return addSkeletonEllipsoid;}');
const createEnvelope=new Function('context','with(context){'+assembly+'var surfaceBodyHeight=bodyHeight*surfaceHypothesis.bodyHeightScale;'+envelope+'return {head,snout,headShell,detailScale,len,ht,reconstructionProfile};}');
const createBulk=new Function('context','with(context){'+bulk+'return {vault:cranialVault,rostrum:cranialRostrum,rostrumCenter,profile:cranialDisplay};}');
function build(id,scale=1,mode=modes.balanced,showSkeleton=true,helper=api.dinoCranialDisplayProfile){
  const dn=api.DINOS.find(d=>d.id===id),skinModel=new T.Group(),boneModel=new T.Group();
  const skinMaterial=new T.MeshBasicMaterial({side:T.DoubleSide}),boneMaterial=new T.MeshBasicMaterial();
  const c={THREE:T,dn,len:dn.lengthM*scale,ht:dn.heightM*scale,isTheropod:dn.group==='theropod',isSauropod:dn.group==='sauropod',cladeName:dn.clade,
    reconstructionProfile:api.reconstructionProfileFor(dn),posture:api.postureProfileFor(dn),cranialSurface:api.cranialSurfaceProfileFor(dn),postcranialSurface:api.postcranialSurfaceProfileFor(dn),
    surfaceHypothesis:{headSoftTissueScale:mode.head,neckSoftTissueScale:mode.neck,bodyHeightScale:mode.body},vec:(x,y,z)=>new T.Vector3(x,y,z),headMat:skinMaterial,bodyMat:skinMaterial,model:skinModel,props:{species:dn,showBody:true,showSkeleton},
    dinoTyrannosaurPose:api.dinoTyrannosaurPose,dinoLongSnoutedTyrannosaurAnchors:api.dinoLongSnoutedTyrannosaurAnchors,dinoCervicalEnvelope:api.dinoCervicalEnvelope,dinoNeckJunction:api.dinoNeckJunction,dinoTheropodCranialRadii:api.dinoTheropodCranialRadii,dinoCranialGeometry:api.dinoCranialGeometry,dinoSurfaceGeometry:api.dinoSurfaceGeometry};
  c.addSoftTissueChain=createSkin(c);const b=createEnvelope(c);
  const skullLength=Math.max(.20*b.detailScale,b.len*(c.isSauropod?.040:.066))*c.reconstructionProfile.head;
  const skullHeight=Math.max(.045*b.detailScale,b.ht*(c.isTheropod?.080:.058))*c.reconstructionProfile.head;
  const skullDepth=Math.max(.035*b.detailScale,b.ht*(c.isTheropod?.073:.058))*c.reconstructionProfile.head;
  const boneContext={...c,...b,model:boneModel,boneMat:boneMaterial,skullLength,skullHeight,skullDepth,dinoCranialDisplayProfile:helper};
  Object.defineProperty(boneContext,'surfaceHypothesis',{get(){throw Error('Skeleton proxy read the selectable tissue hypothesis');}});
  boneContext.addSkeletonEllipsoid=createBone(boneContext);const bones=createBulk(boneContext);
  b.headShell.geometry.computeBoundingSphere();b.headShell.updateMatrixWorld(true);boneModel.updateMatrixWorld(true);
  return {...b,...bones,skullLength,skullHeight,skullDepth,scale,dn,skinModel,boneModel,skinMaterial,boneMaterial};
}
function dispose(b){b.headShell.geometry.dispose();b.skinMaterial.dispose();for(const mesh of [b.vault,b.rostrum])mesh?.geometry.dispose();b.boneMaterial.dispose();}
const at=(a,i)=>new T.Vector3().fromBufferAttribute(a,i);
const bytes=a=>new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength);
function exactBuffers(a,b){expect(Object.keys(a.attributes)).toEqual(Object.keys(b.attributes));for(const name of Object.keys(a.attributes)){expect(a.attributes[name].itemSize).toBe(b.attributes[name].itemSize);expect(bytes(a.attributes[name])).toEqual(bytes(b.attributes[name]));}expect(bytes(a.index)).toEqual(bytes(b.index));expect(a.parameters).toEqual(b.parameters);}
function exactMesh(a,b){exactBuffers(a.geometry,b.geometry);for(const field of ['position','scale','quaternion'])expect(a[field].toArray()).toEqual(b[field].toArray());expect(a.name).toBe(b.name);expect(a.userData).toEqual(b.userData);expect(a.castShadow).toBe(b.castShadow);expect(a.receiveShadow).toBe(b.receiveShadow);}
function sampleMesh(mesh){
  const p=mesh.geometry.attributes.position,index=mesh.geometry.index,world=i=>at(p,i).applyMatrix4(mesh.matrixWorld),samples=[],edges=new Set();
  for(let i=0;i<p.count;i++)samples.push(world(i));
  for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],v=ids.map(world);samples.push(v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3));
    for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=Math.min(a,b)+','+Math.max(a,b);if(edges.has(key))continue;edges.add(key);samples.push(v[j].clone().lerp(v[(j+1)%3],.5));}}
  return samples;
}
function assertContained(skin,points,scale){
  const axis=new T.Vector3(1.031,-.577,.137).normalize(),reach=skin.geometry.boundingSphere.radius*4,ray=new T.Raycaster();let outside=0,missed=0,minClearance=Infinity;
  for(const p of points){ray.set(p.clone().addScaledVector(axis,-reach),axis);const distances=[];for(const hit of ray.intersectObject(skin,false))if(!distances.length||hit.distance-distances.at(-1)>scale*1e-7)distances.push(hit.distance);
    if(distances.length<2){missed++;continue;}if(distances.filter(d=>d<reach).length%2!==1)outside++;minClearance=Math.min(minClearance,...distances.map(d=>Math.abs(d-reach)));}
  expect(missed,'all proxy samples cross the enclosing skin').toBe(0);expect(outside,'all proxy samples lie inside the skin').toBe(0);expect(minClearance,'nonzero visible separation from skin').toBeGreaterThan(scale*1e-5);
}
function assertSound(mesh){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,index=mesh.geometry.index;mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();let volume=0;
  for(let i=0;i<p.count;i++){const v=at(p,i);expect(v.toArray().every(Number.isFinite)).toBe(true);expect(Math.abs(at(n,i).length()-1)).toBeLessThan(1e-6);expect(mesh.geometry.boundingBox.containsPoint(v)).toBe(true);expect(v.distanceTo(mesh.geometry.boundingSphere.center)).toBeLessThanOrEqual(mesh.geometry.boundingSphere.radius+1e-6);}
  for(let i=0;i<index.count;i+=3){const a=at(p,index.getX(i)),b=at(p,index.getX(i+1)),c=at(p,index.getX(i+2)),face=b.clone().sub(a).cross(c.clone().sub(a));expect(face.length()).toBeGreaterThan(1e-8);expect(face.dot(a.clone().add(b).add(c))).toBeGreaterThan(0);volume+=a.dot(b.clone().cross(c))/6;}expect(volume).toBeGreaterThan(0);
}

describe('Slender theropod skeletal display envelopes',()=>{
  for(const id of targets)it('contains the actual '+id+' vault and rostrum in the lean skin, including triangle interiors and edges',()=>{
    const b=build(id,1,modes.lean);try{expect(b.profile.refined).toBe(true);for(const mesh of [b.vault,b.rostrum]){assertSound(mesh);assertContained(b.headShell,sampleMesh(mesh),b.scale);}}finally{dispose(b);}
  });
  for(const scale of [.03,12])it('retains containment at extreme specimen scale '+scale,()=>{const b=build('sinosauropteryx',scale,modes.lean);try{for(const mesh of [b.vault,b.rostrum])assertContained(b.headShell,sampleMesh(mesh),scale);}finally{dispose(b);}});
  for(const [name,mode] of Object.entries(modes).filter(([name])=>name!=='lean'))it('uses one fixed Sinosauropteryx display volume inside '+name+' tissue',()=>{const b=build('sinosauropteryx',1,mode);try{for(const mesh of [b.vault,b.rostrum])assertContained(b.headShell,sampleMesh(mesh),1);}finally{dispose(b);}});
  for(const id of targets)it('keeps '+id+' skeletal transforms and geometry independent of all tissue hypotheses',()=>{
    const builds=Object.values(modes).map(mode=>build(id,1,mode));try{for(const b of builds.slice(1))for(const region of ['vault','rostrum'])exactMesh(b[region],builds[0][region]);}finally{builds.forEach(dispose);}
  });
  it('selects exactly the eight existing slender profiles across the catalog',()=>{
    expect(api.DINOS.filter(d=>api.cranialSurfaceProfileFor(d).id==='slender-theropod').map(d=>d.id).sort()).toEqual(targets);
    const head=new T.Vector3(.2,.3,.13),snout=new T.Vector3(-1,.25,.13);
    for(const dn of api.DINOS){const args=[T,dn,head,snout,.8,.3,.24,.2,dn.group==='theropod'],actual=api.dinoCranialDisplayProfile(...args),old=baselineCranialDisplayProfile(...args);
      if(targets.includes(dn.id)){expect(actual.refined,dn.id).toBe(true);for(const field of ['vaultScale','rostrumScale'])for(const axis of ['x','y','z']){expect(actual[field][axis],dn.id).toBeGreaterThan(0);expect(actual[field][axis],dn.id).toBeLessThan(old[field][axis]);}}
      // Later reviewed Alioramini and baryonychine fills have separate native
      // multi-scale form/containment suites; the original eight targets and
      // every remaining catalog control retain their preceding expectations.
      else if(['alioramus','qianzhousaurus'].includes(dn.id))expect(actual.refined,dn.id).toBe(true);
      else if(['baryonyx','suchomimus'].includes(dn.id))expect(actual.refined,dn.id).toBe(true);
      else expect(actual,dn.id).toEqual(old);
    }
  });
  for(const id of ['triceratops','tyrannosaurus','microraptor','spinosaurus'])it('preserves the complete native '+id+' control from the independent baseline',()=>{
    const current=build(id),old=build(id,1,modes.balanced,true,baselineCranialDisplayProfile);try{for(const region of ['vault','rostrum'])exactMesh(current[region],old[region]);exactBuffers(current.headShell.geometry,old.headShell.geometry);}finally{dispose(current);dispose(old);}
  });
  it('preserves missing and unrelated identifiers and returns independent vectors',()=>{
    const head=new T.Vector3(.2,.3,.13),snout=new T.Vector3(-1,.25,.13),snapshot=[head.toArray(),snout.toArray()];
    for(const species of [undefined,{}, {id:'SINOSAUROPTERYX'},{id:'triceratops'},{id:'sinosauropteryx',clade:'unrelated'}])for(const theropod of [false,true]){
      const args=[T,species,head,snout,.8,.3,.24,.2,theropod];expect(api.dinoCranialDisplayProfile(...args)).toEqual(baselineCranialDisplayProfile(...args));}
    const dn=api.DINOS.find(d=>d.id==='sinosauropteryx'),args=[T,dn,head,snout,.8,.3,.24,.2,true],p=api.dinoCranialDisplayProfile(...args),q=api.dinoCranialDisplayProfile(...args);
    for(const field of ['vaultCenter','vaultScale','rostrumCenter','rostrumScale']){expect(p[field]).not.toBe(q[field]);p[field].set(99,98,97);}expect([head.toArray(),snout.toArray()]).toEqual(snapshot);expect(q.vaultCenter.x).not.toBe(99);
  });
  it('requires the actual theropod assembly gate as well as a slender cranial profile',()=>{
    const head=new T.Vector3(.2,.3,.13),snout=new T.Vector3(-1,.25,.13);
    for(const id of targets)for(const enabled of [undefined,false,0,1,'true']){const dn=api.DINOS.find(d=>d.id===id),args=[T,dn,head,snout,.8,.3,.24,.2,enabled];expect(api.dinoCranialDisplayProfile(...args),id+' '+enabled).toEqual(baselineCranialDisplayProfile(...args));}
  });
  it('changes only the two display meshes and retains anatomical landmarks and independent skin buffers',()=>{
    const current=build('sinosauropteryx'),old=build('sinosauropteryx',1,modes.balanced,true,baselineCranialDisplayProfile);
    try{expect(current.boneModel.children).toEqual([current.vault,current.rostrum]);expect(current.head.toArray()).toEqual(old.head.toArray());expect(current.snout.toArray()).toEqual(old.snout.toArray());expect(current.rostrumCenter.toArray()).toEqual(old.rostrumCenter.toArray());expect(current.rostrumCenter.toArray()).toEqual(current.head.clone().lerp(current.snout,.62).toArray());exactBuffers(current.headShell.geometry,old.headShell.geometry);
      for(const region of ['vault','rostrum']){const mesh=current[region];exactBuffers(mesh.geometry,old[region].geometry);expect(mesh.name).toBe('cranial-'+region+'-display-proxy');expect(mesh.userData.dinoCranialDisplayProxy).toEqual({region,interpretive:true,tissueHypothesisIndependent:true});expect(mesh.material).toBe(current.boneMaterial);expect(mesh.castShadow).toBe(true);expect(mesh.quaternion.toArray()).toEqual([0,0,0,1]);expect(mesh.scale.toArray()).not.toEqual(old[region].scale.toArray());}
      current.vault.geometry.attributes.position.setX(0,123);expect(current.rostrum.geometry.attributes.position.getX(0)).not.toBe(123);exactBuffers(current.headShell.geometry,old.headShell.geometry);
    }finally{dispose(current);dispose(old);}
  });
  it('keeps construction pinned around the reviewed mature-tyrannosaur pose, neck radii and robust section',()=>{
    // These construction seams intentionally add the mature pose, outer neck,
    // robust skull section and a cervical axis following that neck in this task.
    // Reversing those exact additions must still recover the frozen fixture;
    // dentition and all numerical geometry checks stay intact.
    const reviewedHashes={'head landmarks':'b6d9be9507611be25b7d09f92de9a955ce7cee188e81e2170e6dc6af81f1fc22','surface head':'37326154da8deaa9e3b1dee9aaaa06e1b9778352b011a7c8c5c13a518278cedc','skeletal frame and dentition':'8df3a8e66dec20b407dca5122d8f1b95a7bcf789864513e62e76f15e4b2e96b9'};
    const reviewedBaryonychineAnchor = [
      '            var baryonychineRostrum = /^(baryonyx|suchomimus)$/.test(dn.id) ? dinoBaryonychineSnoutAnchor(THREE, dn, head, snout) : { snout: snout, active: false };',
      '            snout = baryonychineRostrum.snout;',
      '            if (baryonychineRostrum.active) {',
      '              var baryonychineProfile = dinoBaryonychineRostrumFor(dn);',
      '              model.userData.dinoBaryonychineRostrum = { profile: baryonychineProfile.id, source: baryonychineProfile.source,',
      '                head: head.toArray(), tip: snout.toArray(), waist: head.clone().lerp(snout, baryonychineProfile.waist).toArray(),',
      '                rosette: head.clone().lerp(snout, baryonychineProfile.tip).toArray(), snoutScale: baryonychineProfile.snoutScale, interpretive: true };',
      '            }', ''
    ].join('\n');
    const reviewedBaryonychineSkin = "            if (/^(baryonyx|suchomimus)$/.test(dn.id)) dinoShapeBaryonychineRostrum(THREE, dn, headShell, head, surfaceSnout, 'upper');\n";
    const reviewedBaryonychineNaris = '(/^(baryonyx|suchomimus)$/.test(dn.id) ? head.clone().lerp(snout, 0.64) : rostrumCenter.clone().lerp(snout, 0.45))';
    for(const addition of [reviewedBaryonychineAnchor,reviewedBaryonychineSkin,reviewedBaryonychineNaris])expect(source.split(addition).length-1).toBe(1);
    for(const guard of unchangedConstruction){
      // The 2026-10-18 nasal addition attaches a species-gated relief child;
      // its native caller and bone independence are exercised numerically in
      // dinolab_nasal_rugosity.test.js. Preserve the preceding frame byte-for-byte.
      // Normalize only the three exact, species-gated rosette additions. Their
      // native geometry, shared anchors and independent bone frame are covered
      // by dinolab_baryonychine_rosette.test.js; retain both historical digests.
      const current=seam(guard.start,guard.end)
        .replace("              if (/^(alioramus|qianzhousaurus)$/.test(dn.id)) dinoAddNasalRugosities(THREE, dn, cranialRostrum, head, snout, skullHeight, boneMat, true);\n",'')
        .replace(reviewedBaryonychineAnchor,'').replace(reviewedBaryonychineSkin,'')
        .replace(reviewedBaryonychineNaris,'rostrumCenter.clone().lerp(snout, 0.45)');
      let historical=current;
      if(guard.label==='head landmarks')historical=historical.replace(/            var matureTyrannosaurPose =[^\n]*\n            head =[^\n]*\n            if \(matureTyrannosaurPose.active\)[^\n]*\n/,'')
        .replace(/            var longSnoutedTyrannosaur =[^\n]*\n            snout = longSnoutedTyrannosaur.snout;\n            if \(longSnoutedTyrannosaur.active\)[^\n]*\n/,'');
      if(guard.label==='surface head')historical=historical.replace(/            if \(matureTyrannosaurPose.active\) neckBaseRadius \*= 1\.20;\n/,'')
        .replace('* (matureTyrannosaurPose.active ? 0.90 : 0.66)','* 0.66')
        .replace('isSauropod, cladeName, matureTyrannosaurPose.active)','isSauropod, cladeName)')
        .replace(/            if \(matureTyrannosaurPose.active\) model.userData.dinoCervicalProfile =[^\n]*\n/,'')
        .replace(', robustSection: cranialSurface.matureTyrannosaur === true','');
      if(guard.label==='skeletal frame and dentition')historical=historical.replace(", 'cervical', matureTyrannosaurPose.active ? dinoCervicalAxisCurve(THREE, cervicalEnvelope, axisCenter) : null)",", 'cervical')");
      expect(createHash('sha256').update(current).digest('hex'),guard.label).toBe(reviewedHashes[guard.label]||guard.sha256);
      expect(createHash('sha256').update(historical).digest('hex'),guard.label+' preceding construction').toBe(guard.sha256);
    }
  });
  it('adds no skeletal display mesh when the skeleton layer is disabled',()=>{const b=build('sinosauropteryx',1,modes.balanced,false);try{expect(b.vault).toBeNull();expect(b.rostrum).toBeNull();expect(b.boneModel.children).toHaveLength(0);}finally{dispose(b);}});
  it('moves both refined volumes rigidly with the established skull pivot without changing their buffers',()=>{
    const b=build('sinosauropteryx'),rig=new T.Group(),neck=new T.Object3D(),shoulder=new T.Vector3(-.2,.14,0),rest=neck.quaternion.clone(),snapshots=[b.vault,b.rostrum].map(mesh=>{
      // Three r128 clones the independent buffers but omits SphereGeometry's
      // scalar construction metadata. Preserve that separately in the snapshot.
      const geometry=mesh.geometry.clone();geometry.parameters={...mesh.geometry.parameters};
      return {position:mesh.position.clone(),scale:mesh.scale.clone(),geometry};
    });
    b.boneModel.add(rig,neck);rig.add(b.vault,b.rostrum);neck.position.copy(shoulder);neck.rotation.set(.04,.08,.02);
    try{api.dinoConnectedCranialPose(T,rig,shoulder,neck,rest);b.boneModel.updateMatrixWorld(true);for(const [i,mesh] of [b.vault,b.rostrum].entries()){exactBuffers(mesh.geometry,snapshots[i].geometry);expect(mesh.position.toArray()).toEqual(snapshots[i].position.toArray());expect(mesh.scale.toArray()).toEqual(snapshots[i].scale.toArray());for(let j=0;j<mesh.geometry.attributes.position.count;j++){const v=at(mesh.geometry.attributes.position,j),actual=v.clone().applyMatrix4(mesh.matrixWorld),expected=v.clone().multiply(mesh.scale).add(mesh.position).sub(shoulder).applyQuaternion(neck.quaternion).add(shoulder);expect(actual.distanceTo(expected)).toBeLessThan(1e-7);}}}finally{snapshots.forEach(s=>s.geometry.dispose());dispose(b);}
  });
});

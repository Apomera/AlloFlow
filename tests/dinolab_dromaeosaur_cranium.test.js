import{describe,it,expect}from'vitest';
import{createHash}from'node:crypto';
import{source,native,cranialBuffers,nativeTheropodFacialDetails,THREE,vec,nativeMeshContains}from'./helpers/dino_native_dromaeosaur_cranium_harness.js';
const ids=['velociraptor','deinonychus'],species=id=>native.art.DINOS.find(d=>d.id===id);
const tag=mesh=>mesh.userData.dinoTheropodCranialElement;
// Fixed skeletal bytes before the living-envelope refinement (source DDADA233
// 089EF2C0132B1F715E49BB47A9B20E059DC6D2095BC3F19C2D58DDD5). Skin refinements
// must not rescale the already-reviewed skull, teeth, atlas, axis or neck bones.
const fixedBoneHashes={velociraptor:{'.05':'a74d37b5f7458c4a8c31bbbd8dfd39509849993382fa36cef456e64150957449',1:'56897664f45698d286b468c49e52578b737938c6c776da509fb8bddb463b65d0',8:'4794b367b490527b1e58198774e85a847dbe4d4a09329efb69b2d0a5cc15e81d'},
 deinonychus:{'.05':'18902ebded5481c7967b64916ed0b4094830cfb8ad14e83d642d375fefa80805',1:'144d96a1bd4b415d0b7b3b75791698a1fc8d7af89e9492b63e4289163a436a9e',8:'4fe4f5442eacc5c1ad9da21c27a731fe8378c7b92424fdd606d452cc2685170f'}};
function signedVolume(g){const p=g.attributes.position,ix=g.index,origin=vec().fromBufferAttribute(p,0);let volume=0;
 for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)).sub(origin),b=vec().fromBufferAttribute(p,ix.getX(i+1)).sub(origin),c=vec().fromBufferAttribute(p,ix.getX(i+2)).sub(origin);volume+=a.dot(b.cross(c))/6;}return volume;}
function closedEdges(g){const a=g.attributes.position,ix=g.index,epsilon=g.boundingSphere.radius*1e-6;
 const keys=Array.from({length:a.count},(_,i)=>vec().fromBufferAttribute(a,i).toArray().map(v=>Math.round(v/epsilon)).join(',')),edges=new Map();let degenerate=0;
 for(let i=0;i<ix.count;i+=3){const vs=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)].map(i=>keys[i]);if(new Set(vs).size<3){degenerate++;continue;}
  for(let j=0;j<3;j++){const edge=[vs[j],vs[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}}
 return{degenerate,nonmanifold:[...edges.values()].filter(n=>n!==2).length};}
function floorAt(mesh,frame,t){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,x=frame.head.x+(frame.snout.x-frame.head.x)*t,ys=[];
 for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){const a=vec().fromBufferAttribute(p,ix.getX(i+j)),b=vec().fromBufferAttribute(p,ix.getX(i+(j+1)%3));
  if(a.x!==b.x&&x>=Math.min(a.x,b.x)&&x<=Math.max(a.x,b.x))ys.push(a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x));}
 return(Math.min(...ys)-(frame.head.y+(frame.snout.y-frame.head.y)*t))/frame.boneHeight;}
function roofAt(mesh,frame,t){const p=mesh.geometry.attributes.position,span=frame.snout.x-frame.head.x,heights=[];
 for(let i=0;i<p.count;i++){const at=(p.getX(i)-frame.head.x)/span;if(Math.abs(at-t)<.018)heights.push((p.getY(i)-(frame.head.y+(frame.snout.y-frame.head.y)*at))/frame.boneHeight);}
 return Math.max(...heights);}
function skinSection(mesh,frame,t){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,base=frame.head.clone().lerp(frame.snout,t),points=[];
 for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){const a=vec().fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(mesh.matrixWorld),b=vec().fromBufferAttribute(p,ix.getX(i+(j+1)%3)).applyMatrix4(mesh.matrixWorld);
  if(a.x!==b.x&&base.x>=Math.min(a.x,b.x)&&base.x<=Math.max(a.x,b.x))points.push(a.clone().lerp(b,(base.x-a.x)/(b.x-a.x)));}
 return{top:Math.max(...points.map(p=>(p.y-base.y)/frame.boneHeight)),bottom:Math.min(...points.map(p=>(p.y-base.y)/frame.boneHeight)),width:Math.max(...points.map(p=>Math.abs(p.z)/frame.boneDepth))};}

describe('reviewed Velociraptor and Deinonychus crania',()=>{
 it('gates the new anatomy to the exact two catalog taxa and retains all other profile scopes',()=>{
  for(const d of native.art.DINOS.filter(d=>!ids.includes(d.id)))expect(native.art.dinoDromaeosaurCraniumProfileFor(d),d.id).toBeNull();
  for(const id of ids){const d=species(id);expect(native.art.dinoDromaeosaurCraniumProfileFor({...d,group:'sauropod'})).toBeNull();expect(native.art.dinoDromaeosaurCraniumProfileFor({...d,clade:'Troodontidae'})).toBeNull();
   expect(native.art.dinoTheropodCraniumFrame(THREE,d,{})).toBeNull();expect(native.art.dinoTheropodCraniumProfileFor(d).dimensionsAreInterpretive).toBe(true);}
  for(const id of['allosaurus','dilophosaurus','coelophysis'])expect(native.art.dinoTheropodCraniumProfileFor(species(id))).toBeTruthy();
  expect(native.art.cranialSurfaceProfileFor(species('tyrannosaurus')).matureTyrannosaur).toBe(true);
 });
 it('distinguishes source specimens and estimated dimensions from actual comparative geometry',()=>{
  const a=native.build('velociraptor',1,.90),b=native.build('deinonychus',1,.90);
  try{
   const v=a.context.theropodCranium,d=b.context.theropodCranium;
   for(const f of[v,d]){expect(f.profile.limit).toContain('inferred');expect(f.profile.limit).toContain('does not demonstrate');expect(f.profile.proportionBasis).toContain('not claimed specimen measurements');
    expect(f.profile.referenceDimensions.measuredModel).toBe(false);expect(f.profile.dentalSamplesAreLiteralFormula).toBe(false);expect(f.profile.sources.every(s=>s.title&&s.url.startsWith('https://'))).toBe(true);}
   expect(v.profile.referenceDimensions).toMatchObject({skullLength:230,temporalWidth:77,skullDepth:66});
   expect(v.profile.openingsEvidence).toMatch(/ZPAL MgD-I\/97.*Shri.*not used/);expect(v.profile.referenceSpecimens).not.toContain('ZPAL MgD-I/97');
   expect(d.profile.referenceDimensions).toMatchObject({skullLength:320,skullWidth:150,skullDepth:115,estimatedComposite:true});
   expect(d.profile.openingsEvidence).toContain('incomplete Yale material');
   const vm=a.bones.filter(tag),dm=b.bones.filter(tag),find=(ms,name)=>ms.find(m=>tag(m).side===1&&tag(m).element===name);
   expect(vm.some(m=>tag(m).element==='prefrontal')).toBe(false);expect(dm.filter(m=>tag(m).element==='prefrontal')).toHaveLength(2);
   expect(roofAt(find(vm,'nasal-frontal-roof'),v,.72)).toBeLessThan(roofAt(find(vm,'nasal-frontal-roof'),v,.86)-.06);
   expect(roofAt(find(dm,'nasal-frontal-roof'),d,.72)).toBeGreaterThan(roofAt(find(dm,'nasal-frontal-roof'),d,.86));
   expect(floorAt(find(vm,'dentary'),v,.95)).toBeGreaterThan(floorAt(find(vm,'dentary'),v,.60)+.025);
   expect(Math.abs(floorAt(find(dm,'dentary'),d,.50)-floorAt(find(dm,'dentary'),d,.75))).toBeLessThan(.005);
   // Remove the shared snout's resting slope before comparing dorsoventral
   // depths; a world-Y box otherwise confounds anatomy with head posture.
   const maxillaDepth=(mesh,f)=>{const p=mesh.geometry.attributes.position,heights=[];for(let i=0;i<p.count;i++){const t=(p.getX(i)-f.head.x)/(f.snout.x-f.head.x);heights.push(p.getY(i)-(f.head.y+(f.snout.y-f.head.y)*t));}return(Math.max(...heights)-Math.min(...heights))/f.head.distanceTo(f.snout);};
   expect(maxillaDepth(find(dm,'maxillary-tooth-bearing-bar'),d)).toBeGreaterThan(maxillaDepth(find(vm,'maxillary-tooth-bearing-bar'),v)*1.4);
  }finally{a.dispose();b.dispose();}
 });
 for(const id of ids)for(const scale of[.05,1,8])it(id+' encloses all actual bones and seats closed, separate tooth rows at scale '+scale,()=>{
  let fixed=null,anchors=null;
  for(const tissue of[.90,1.13]){
   const b=native.build(id,scale,tissue),c=b.context,f=c.theropodCranium;
   try{
    expect(f).toBeTruthy();expect(c.model.userData.dinoTheropodCranium).toMatchObject({species:id,dimensionsAreInterpretive:true,tissueHypothesisIndependentAnchors:true});
    expect(f.head.toArray()).toEqual(c.head.toArray());expect(f.snout.toArray()).toEqual(c.snout.toArray());
    expect(c.snout.distanceTo(c.head.clone().add(vec(-c.len*.085,-c.ht*.020,0)))).toBeLessThan(c.ht*1e-9);
    expect(b.cranialVault).toBeNull();expect(b.cranialRostrum).toBeNull();
    const contains=b.skins.map(mesh=>nativeMeshContains(mesh,c.ht*2e-6));let checked=0,exposed=0;
    for(const mesh of b.bones){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){checked++;const point=vec().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);if(!contains.some(fn=>fn(point)))exposed++;}}
    expect(checked).toBeGreaterThan(45000);expect(exposed).toBe(0);
    const bytes=cranialBuffers(b.bones),frame=JSON.stringify([f.head.toArray(),f.snout.toArray(),f.metadata.skeletalHalfAxes]);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixedBoneHashes[id][scale===.05?'.05':scale]);
    if(fixed===null){fixed=bytes;anchors=frame;}else{expect(bytes).toBe(fixed);expect(frame).toBe(anchors);}
    const elements=b.bones.filter(tag),names=['orbital-rim','antorbital-fenestra-rim','external-naris-rim','lateral-temporal-rim','lacrimal-shaft','dentary','nasal-frontal-roof','maxillary-tooth-bearing-bar'];
    for(const side of[-1,1])for(const element of names)expect(elements.filter(m=>tag(m).side===side&&tag(m).element===element)).toHaveLength(1);
    const crowns=elements.filter(m=>tag(m).socket),upper=crowns.filter(m=>m.userData.dinoToothRow==='upper'),lower=crowns.filter(m=>m.userData.dinoToothRow==='lower');
    expect(upper).toHaveLength((id==='velociraptor'?15:19)*2);expect(lower).toHaveLength((id==='velociraptor'?15:16)*2);
    for(const mesh of crowns){const t=tag(mesh),bearing=elements.find(m=>tag(m).side===t.side&&tag(m).element===(t.toothBearingElement==='maxilla'?'maxillary-tooth-bearing-bar':t.toothBearingElement));
     expect(t.sample).toBe(true);expect(t.dentalFormulaClaimed).toBe(false);
     const position=mesh.geometry.attributes.position,root=vec();for(let i=0;i<12;i++)root.add(vec().fromBufferAttribute(position,i));root.multiplyScalar(1/12);
     expect(root.distanceTo(vec(...t.socket))).toBeLessThan(c.ht*3e-7);
     expect(nativeMeshContains(bearing,c.ht*2e-7)(root),mesh.name).toBe(true);
    }
    // Disjoint actual world bounding boxes are a conservative geometric proof
    // that no opposing upper/lower crown surfaces intersect in the closed pose.
    for(const u of upper)for(const l of lower)expect(new THREE.Box3().setFromObject(u).intersectsBox(new THREE.Box3().setFromObject(l)),u.name+' / '+l.name).toBe(false);
    for(const mesh of [...elements,b.upper,b.lower]){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;let finite=true,min=Infinity,max=0;
     for(let i=0;i<p.count;i++){if(!vec().fromBufferAttribute(p,i).toArray().every(Number.isFinite))finite=false;const L=vec().fromBufferAttribute(n,i).length();min=Math.min(min,L);max=Math.max(max,L);}
     expect(finite,mesh.name).toBe(true);expect(min,mesh.name).toBeGreaterThan(.99);expect(max,mesh.name).toBeLessThan(1.01);
     expect(closedEdges(mesh.geometry),mesh.name).toEqual({degenerate:0,nonmanifold:0});expect(signedVolume(mesh.geometry),mesh.name).toBeGreaterThan(0);
    }
    const opening=c.head.clone().lerp(c.snout,id==='velociraptor'?.49:.56).add(vec(0,f.boneHeight*.05,f.depth*4));
    expect(new THREE.Raycaster(opening,vec(0,0,-1)).intersectObjects(elements,false)).toEqual([]);
    // Geometric quality bounds apply to this authored display, not to fossil
    // tissue measurements: the former tall dome and ventral cheek bulb fail.
    for(const t of[0,.15]){const section=skinSection(b.upper,f,t);expect(section.top).toBeLessThan(tissue===.90?1.08:1.36);expect(section.bottom).toBeGreaterThan(tissue===.90?-.92:-1.15);expect(section.width).toBeLessThan(tissue===.90?1.28:1.58);}
    expect(b.upper.geometry.userData.dinoSectionPower).toBe(.74);
    const orbit=elements.find(m=>tag(m).element==='orbital-rim'),orbitHeight=new THREE.Box3().setFromObject(orbit).getSize(vec()).y;
    for(const face of nativeTheropodFacialDetails(source,b)){expect(face.eye.frame).toBeTruthy();expect(face.nostril.frame).toBeTruthy();expect(face.mouth).toBeTruthy();expect(face.mouth.geometry.parameters.projected).toBe(face.mouth.geometry.parameters.samples);expect(face.eye.radius*2/orbitHeight).toBeGreaterThan(.20);expect(face.eye.radius*2/orbitHeight).toBeLessThan(.35);}
   }finally{b.dispose();}
  }
 });
 it('preserves actual before-pass skull, neck and torso buffers outside the two reviewed species',()=>{
  // Measured from baseline SHA256 7E32942C6BC08B48281E4EBBBD781A5386E9CBCA9197B0C45ECA9C68B2F6B8D8.
  // These committed digests make the regression independent of ignored tmp files.
  const expected={allosaurus:'195de5a078c45f054a6bb2ba90a87e9dd1b8150623b5306921405f4c6b927003',dilophosaurus:'545dc3afae9834453d394621d82db98e21db9acff31bc1e851ed7c2464ea9b57',
   coelophysis:'2e6ab6aa8b50a74e12795f68435bbb39c7d1ef3ef0772806d4c0a27b18d94f69',tyrannosaurus:'9c7d79ab9fe269b5e8582516bc438ca36d04552a66b3fabd9985492d6eaa7e9a',microraptor:'28a5c052e6f0da7a920f70a1431e4f647597533406b0c6ae6b4112c70cfb35e7'};
  for(const[id,digest]of Object.entries(expected)){const b=native.build(id,1,.90);try{expect(createHash('sha256').update(cranialBuffers([b.upper,b.lower,b.neck,b.body,...b.bones])).digest('hex'),id).toBe(digest);}finally{b.dispose();}}
 });
});

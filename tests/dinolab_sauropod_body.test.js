import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {api,species,nativeBuild,THREE,inside,originalRayInside,hash} from './helpers/dino_native_sauropod_harness.js';
const source=readFileSync(process.env.DINO_SAUROPOD_BODY_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const dn=id=>api.DINOS.find(d=>d.id===id);

describe('species-specific sauropod body plans connect the actual skeleton and life geometry',()=>{
  it('matches the original ray classifier on the actual surfaces and exterior points',()=>{
    for(const id of species){
      const built=nativeBuild(id);
      try{
        for(const mesh of [built.body,built.neck,built.head,...built.limbs.flatMap(limb=>limb.coverings)]){
          const box=new THREE.Box3().setFromObject(mesh),center=box.getCenter(vec()),size=box.getSize(vec());
          const points=[center,center.clone().add(vec(size.x+1,size.y+1,size.z+1))];
          const positions=mesh.geometry.attributes.position;
          for(let i=0;i<positions.count;i+=Math.max(1,Math.floor(positions.count/8)))points.push(mesh.localToWorld(vec().fromBufferAttribute(positions,i)).lerp(center,.10));
          for(const point of points)expect(inside(mesh,point,1e-6)).toBe(originalRayInside(mesh,point,1e-6));
        }
      }finally{built.dispose();}
    }
  });
  it('reviews only the four represented species and rejects unsafe frame sizes',()=>{
    expect(species.map(id=>api.dinoSauropodBodyProfileFor(dn(id)).id)).toEqual(['brachiosaurus-body','diplodocus-body','apatosaurus-body','camarasaurus-body']);
    for(const d of api.DINOS.filter(d=>!species.includes(d.id)))expect(api.dinoSauropodBodyProfileFor(d),d.id).toBeNull();
    expect(api.dinoSauropodBodyProfileFor({...dn('brachiosaurus'),group:'other'})).toBeNull();
    expect(api.dinoSauropodBodyProfileFor(null)).toBeNull();
    for(const value of [0,-1,NaN,Infinity,'22'])expect(api.dinoSauropodBodyFrame(THREE,dn('brachiosaurus'),value,12)).toBeNull();
    expect(api.dinoSauropodBodyLimb(THREE,dn('tyrannosaurus'),{})).toBeNull();
    expect(api.dinoSauropodBodyLimb(THREE,dn('brachiosaurus'),{})).toBeNull();
  });

  it('preserves profiles outside the reviewed body groups exactly',()=>{
    // Independently computed from the saved pre-dromaeosaur source with these
    // same exclusions: all 339 remaining taxa match the current source exactly.
    // The reviewed body groups have separate native geometry tests.
    const reviewed=[...species,'triceratops','styracosaurus','centrosaurus','chasmosaurus','ankylosaurus','euoplocephalus','sauropelta','borealopelta','stegosaurus','kentrosaurus','huayangosaurus','tuojiangosaurus','carnotaurus','tyrannosaurus','allosaurus','coelophysis','dilophosaurus','velociraptor','deinonychus'];
    const expected={reconstructionProfileFor:'33ee5e621a01e232adae4e8270c8898a4fa73a76528513eddae3a174c1ce333f',postcranialSurfaceProfileFor:'29760174847041dcc80fd7ca9f5307fe0cdff524a0c6e06a6c7d96371c7279ad',skeletalAnatomyProfileFor:'8f492a81ac5fbc60e62814aa14a9229a499798dc4b68cfdd5532488f8202f44f'};
    for(const [name,fingerprint]of Object.entries(expected)){
      const values=api.DINOS.filter(d=>!reviewed.includes(d.id)).map(d=>[d.id,api[name](d)]);
      expect(createHash('sha256').update(JSON.stringify(values)).digest('hex'),name).toBe(fingerprint);
    }
  });

  it('retains smooth compact diplodocid lofts and differentiates the full-body proportions',()=>{
    const plans=Object.fromEntries(species.map(id=>[id,api.dinoSauropodBodyProfileFor(dn(id))]));
    expect(api.postcranialSurfaceProfileFor(dn('diplodocus')).id).toBe('long-low-sauropod');
    expect(api.postcranialSurfaceProfileFor(dn('apatosaurus')).id).toBe('long-low-sauropod');
    expect(plans.apatosaurus.bodyHeight).toBeGreaterThan(plans.diplodocus.bodyHeight);
    expect(plans.apatosaurus.bodyDepth).toBeGreaterThan(plans.diplodocus.bodyDepth);
    expect(plans.apatosaurus.reconstruction.neckBase*plans.apatosaurus.postcranial.neckFullness).toBeGreaterThan(plans.diplodocus.reconstruction.neckBase*plans.diplodocus.postcranial.neckFullness);
    expect(plans.apatosaurus.skeletal.forelimbRobustness).toBeGreaterThan(plans.diplodocus.skeletal.forelimbRobustness);
    expect(plans.apatosaurus.skeletal.hindlimbRobustness).toBeGreaterThan(plans.diplodocus.skeletal.hindlimbRobustness);
    const tailRatio=p=>(p.tail[0]-p.hip[0])/(p.hip[0]-p.shoulder[0]);
    expect(tailRatio(plans.diplodocus)).toBeGreaterThan(tailRatio(plans.apatosaurus));
    expect(tailRatio(plans.apatosaurus)).toBeGreaterThan(tailRatio(plans.camarasaurus));
    expect(plans.brachiosaurus.shoulder[1]).toBeGreaterThan(plans.brachiosaurus.hip[1]);
    expect(plans.camarasaurus.head[0]-plans.camarasaurus.shoulder[0]).toBeGreaterThan(plans.diplodocus.head[0]-plans.diplodocus.shoulder[0]);
  });

  it.each(species.flatMap(id=>[.04,1,6].map(scale=>({id,scale}))))('builds enclosed, grounded, shared native anatomy for $id at scale $scale',({id,scale})=>{
    const f=nativeBuild(id,scale),full=nativeBuild(id,scale,'full');
    try{
      const meta=f.model.userData.dinoFullBodyAnatomy;
      expect(meta).toMatchObject({family:'sauropods',profile:id+'-body',dimensionsInterpretive:true,poseInterpretive:true,transverseWidthInterpretive:true,tissueThicknessInterpretive:true,neckAxisShared:true,sampledSkeleton:true});
      expect(meta.limbs).toHaveLength(4);expect(meta.anchors).toEqual(full.model.userData.dinoFullBodyAnatomy.anchors);expect(meta.limbs).toEqual(full.model.userData.dinoFullBodyAnatomy.limbs);
      expect(hash([...f.cervical,...f.cervicalRibs])).toBe(hash([...full.cervical,...full.cervicalRibs]));
      expect(hash(f.limbs.flatMap(l=>l.bones))).toBe(hash(full.limbs.flatMap(l=>l.bones)));
      const cervicalCenters=f.cervical.filter(m=>m.userData.dinoCervicalStation!==undefined);
      expect(cervicalCenters).toHaveLength(13);
      const end=f.c.head.clone().add(f.c.shoulder.clone().sub(f.c.head).normalize().multiplyScalar(Math.max(.20*f.c.detailScale,f.c.len*.040)*f.c.reconstructionProfile.head*.84));
      const axis=api.dinoCervicalAxisCurve(THREE,f.c.cervicalEnvelope,end);
      for(const m of cervicalCenters)expect(m.position.distanceTo(axis.getPoint(m.userData.dinoCervicalStation))).toBeLessThan(scale*1e-6);
      let cervicalChecked=0;
      for(const mesh of [...f.cervical,...f.cervicalRibs])for(let i=0;i<mesh.geometry.attributes.position.count;i++){
        const p=mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position,i));cervicalChecked++;
        expect([f.neck,f.head,f.body].some(s=>inside(s,p,scale*1e-6)),`${id} cervical mesh=${mesh.name} vertex=${i}`).toBe(true);
      }
      expect(cervicalChecked).toBeGreaterThan(10000);
      for(const limb of f.limbs){
        const m=meta.limbs.find(e=>e.front===limb.front&&e.side===limb.side);
        expect(m.top[1]).toBeGreaterThan(m.knee[1]);expect(m.knee[1]).toBeGreaterThan(m.ankle[1]);expect(m.ankle[1]).toBeGreaterThan(m.foot[1]);
        expect(m.foot[1]).toBe(Math.max(.008,f.c.ht*.010));
        if(limb.front){
          expect(inside(f.body,vec(...m.top),scale*1e-6),`${id} forejoint inside actual minimum torso`).toBe(true);
          expect(api.dinoSauropodBodyGlenoid(THREE,f.dn,f.c.shoulder,f.c.bodyHeight,f.c.bodyDepth,f.c.detailScale,f.c.skeletalProfile.stanceWidth,limb.side).distanceTo(vec(...m.top))).toBeLessThan(scale*1e-7);
        }
        let checked=0;
        for(const mesh of limb.bones)for(let i=0;i<mesh.geometry.attributes.position.count;i++){
          const p=mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position,i));checked++;
          expect([...limb.coverings,f.body].some(s=>inside(s,p,scale*1e-6)),`${id} front=${limb.front} side=${limb.side} bone=${mesh.name} vertex=${i}`).toBe(true);
        }
        expect(checked).toBeGreaterThan(1000);
      }
      for(const mesh of [f.body,f.neck,f.head,...f.limbs.flatMap(l=>l.coverings)]){
        for(const name of ['position','normal'])expect(Array.from(mesh.geometry.attributes[name].array).every(Number.isFinite)).toBe(true);
        const n=mesh.geometry.attributes.normal;
        for(let i=0;i<n.count;i++)expect(vec().fromBufferAttribute(n,i).length()).toBeCloseTo(1,4);
      }
      const front=meta.limbs.find(l=>l.front),hind=meta.limbs.find(l=>!l.front);
      const ratio=vec(...front.top).distanceTo(vec(...front.knee))/vec(...hind.top).distanceTo(vec(...hind.knee));
      if(id==='brachiosaurus'){expect(ratio).toBeGreaterThan(.90);expect(ratio).toBeLessThan(1.10);}
      else expect(ratio).toBeLessThan(.90);
    }finally{f.dispose();full.dispose();}
  });

  it('documents comparative rather than complete specimen reconstructions and keeps actual callers',()=>{
    for(const id of species){const p=api.dinoSauropodBodyProfileFor(dn(id));expect(p.sources).toContain('https://doi.org/10.7717/peerj.12810');expect(p.limit).toMatch(/not an exact count/);expect(p.limit).toMatch(/reconstructed/);}
    expect(api.dinoSauropodBodyProfileFor(dn('brachiosaurus')).evidence).toMatch(/Giraffatitan/);
    expect(api.dinoSauropodBodyProfileFor(dn('apatosaurus')).evidence).toMatch(/mixed/);
    expect(api.dinoSauropodBodyProfileFor(dn('camarasaurus')).evidence).toMatch(/C\. lentus/);
    for(const call of ['dinoSauropodBodyFrame(THREE,dn,len,ht)','dinoSauropodBodyNeck(THREE,dn,shoulder,head,bodyHeight,neckBaseRadius,neckTipRadius)','dinoCervicalAxisCurve(THREE,cervicalEnvelope,end)','dinoSauropodBodyCervicalRadius(THREE,dn,vertebraT,radius,len,ht,bodyHeight)','dinoSauropodBodyLimb(THREE,dn,'])expect(source).toContain(call);
  });
});

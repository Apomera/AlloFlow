import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { api, source, THREE, vec, nativeCeratopsidCranium, enclosed } from './helpers/dino_native_ceratopsid_cranium_harness.js';
const ids=['triceratops','styracosaurus','centrosaurus','chasmosaurus'];
function hash(x){return createHash('sha256').update(JSON.stringify(x)).digest('hex');}
function boneState(b){return b.allBones.map(m=>({pos:m.position.toArray(),q:m.quaternion.toArray(),scale:m.scale.toArray(),
  attrs:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,v])=>[k,Array.from(v.array)])),index:m.geometry.index?Array.from(m.geometry.index.array):null}));}
describe('reviewed ceratopsid faces and fixed ornaments',()=>{
  it('gates the representative profiles to the exact four catalog species',()=>{
    for(const dn of api.DINOS)expect(!!api.dinoCeratopsidCraniumProfileFor(dn),dn.id).toBe(ids.includes(dn.id));
    expect(api.dinoCeratopsidCraniumProfileFor({id:'triceratops',group:'other',clade:'Ceratopsidae'})).toBeNull();
    expect(api.dinoCeratopsidCraniumFrame(THREE,api.DINOS.find(d=>d.id==='triceratops'),vec(),0,3)).toBeNull();
  });
  it('uses primary sources, explicit reconstruction limits, and distinct representative horn profiles',()=>{
    const profiles=ids.map(id=>api.dinoCeratopsidCraniumProfileFor(api.DINOS.find(d=>d.id===id)));
    expect(new Set(profiles.map(p=>p.id)).size).toBe(4);
    for(const p of profiles){expect(p.source).toMatch(/^https:\/\/doi.org\//);expect(p.limit).toMatch(/representative/);}
    expect(profiles[2].brows).toBe(0);expect(profiles[2].nasal).toBe(1);
    expect(profiles[3].brows).toBeLessThan(profiles[0].brows*.25);
    for(const id of ids)expect(api.cranialSurfaceProfileFor(api.DINOS.find(d=>d.id===id)).muzzleLengthScale).toBe(1);
    expect(source).toContain('model.userData.dinoCeratopsidCranium = ceratopsidCranium.metadata');
  });
  it('preserves frozen numerical profiles and display proxies outside the reviewed heads',()=>{
    // Independently computed from the saved pre-theropod-head source; the same 346
    // unreviewed taxa match the current source with no numerical differences.
    const reviewed=[...ids,'ankylosaurus','euoplocephalus','sauropelta','borealopelta','stegosaurus','kentrosaurus','huayangosaurus','tuojiangosaurus','carnotaurus','allosaurus','dilophosaurus','coelophysis'];
    const other=api.DINOS.filter(d=>!reviewed.includes(d.id));
    expect(hash(other.map(d=>[d.id,api.cranialSurfaceProfileFor(d)]))).toBe('ecb258b7d186369fe6ad137e5c4714ae11f01df58e52fa22fcff57a79276ec7d');
    expect(hash(other.map(d=>[d.id,api.dinoCranialDisplayProfile(THREE,d,vec(0,2),vec(-1,1.9),.7,.4,.3,.8,d.group==='theropod')]))).toBe('4c5f6dbbf7dfd3400a891c48278dca04e529ca7cabd1ea72849f33ec9f5a46b4');
  });
  it.each(ids.flatMap(id=>[.04,1,6].map(scale=>({id,scale}))))('encloses actual skull, jaw, neck transition, frill and horn cores for $id scale $scale',({id,scale})=>{
    const b=nativeCeratopsidCranium(id,scale,.90),c=b.context,failures=[];let checked=0;
    for(const m of b.allBones)for(let i=0;i<m.geometry.attributes.position.count;i++){
      checked++;const p=m.localToWorld(vec().fromBufferAttribute(m.geometry.attributes.position,i));
      if(!enclosed(b,p)&&failures.length<4)failures.push({name:m.name,type:m.geometry.type,p:p.toArray()});
    }
    expect(checked).toBeGreaterThan(7500);expect(failures,JSON.stringify({id,scale,failures})).toEqual([]);
    expect(b.lifeFrill.material).not.toBe(b.boneFrill.material);
    expect(Number.isFinite(b.boneFrill.geometry.userData.dinoDisplayShell.maxThickness)).toBe(true);
    expect(c.surfaceSnout.toArray()).toEqual(c.snout.toArray());
    expect(c.ceratopsidCranium.metadata.dimensionsAreInterpretive).toBe(true);
    expect(c.ceratopsidCranium.metadata.tissueHypothesisIndependentAnchors).toBe(true);
    expect(!!b.neck.userData.dinoCeratopsidNape).toBe(id==='triceratops');
    if(id==='triceratops') {
      const envelope=api.dinoCervicalSkinEnvelope(c.cervicalEnvelope,true);
      const original=api.dinoSurfaceGeometry(THREE,envelope.points,envelope.radii,{smoothProfile:true});
      original.translate(-envelope.points[0].x,-envelope.points[0].y,-envelope.points[0].z);
      const before=original.attributes.position,after=b.neck.geometry.attributes.position;let maxRise=0;
      expect(after.count).toBe(before.count);
      for(let i=0;i<before.count;i++) {
        expect(Math.abs(after.getX(i)-before.getX(i))).toBeLessThan(c.ht*1e-6);
        expect(Math.abs(after.getZ(i)-before.getZ(i))).toBeLessThan(c.ht*1e-6);
        const rise=after.getY(i)-before.getY(i);expect(rise).toBeGreaterThanOrEqual(-c.ht*1e-6);maxRise=Math.max(maxRise,rise);
      }
      expect(maxRise).toBeGreaterThan(c.ht*.005);original.dispose();
    }
    expect(b.lifeHorns.length).toBe(id==='centrosaurus'?1:id==='styracosaurus'?7:3);
    expect(b.boneHorns.length).toBe(b.lifeHorns.length);
    for(const m of [b.upper,b.lower,b.neck,b.lifeFrill,...b.lifeHorns,...b.allBones]) {
      const positions=m.geometry.attributes.position,n=m.geometry.attributes.normal;
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      for(let i=0;i<n.count;i++)expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,4);
    }
    const full=nativeCeratopsidCranium(id,scale,1.13);
    expect(hash(boneState(full))).toBe(hash(boneState(b)));
    expect(full.context.ceratopsidCranium.metadata).toEqual(c.ceratopsidCranium.metadata);
    full.dispose();b.dispose();
  });
});

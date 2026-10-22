import {describe,it,expect} from 'vitest';
import {nativeTheropodCrests,api,THREE,vec,crestGeometryHash} from './helpers/dino_native_theropod_crest_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';
function world(mesh,i){return mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position,i));}
function closed(mesh,tolerance){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map();let volume=0;
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n/tolerance)).join(',');
  for(let i=0;i<ix.count;i+=3){
    const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));
    volume+=a.dot(b.cross(c))/6;
    for(const[a,b]of[[0,1],[1,2],[2,0]]){const x=key(ix.getX(i+a)),y=key(ix.getX(i+b));expect(x).not.toBe(y);const k=[x,y].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}
  }
  for(const count of edges.values())expect(count).toBe(2);expect(volume).toBeGreaterThan(tolerance**3);
}
describe('actual source-aware paired Dilophosaurus and Allosaurus fragilis ornaments',()=>{
  it('limits species and distinguishes documented anatomy from restored outline',()=>{
    for(const dn of api.DINOS)expect(Boolean(api.dinoTheropodCrestProfileFor(dn)),dn.id).toBe(/^(allosaurus|dilophosaurus)$/.test(dn.id));
    const allo=api.DINOS.find(d=>d.id==='allosaurus'),dilo=api.DINOS.find(d=>d.id==='dilophosaurus');
    expect(api.dinoTheropodCrestProfileFor({...allo,group:'sauropod'})).toBeNull();
    expect(api.dinoTheropodCrestLayout(THREE,allo,{})).toBeNull();
    expect(api.dinoTheropodCrestProfileFor(dilo).evidence).toMatch(/premaxillary.*nasals.*lacrimals/);
    expect(api.dinoTheropodCrestProfileFor(dilo).limit).toMatch(/Broken dorsal margins.*complete crest height/);
    expect(api.dinoTheropodCrestProfileFor(allo).evidence).toMatch(/fragilis.*localized.*jimmadseni/);
    const parts=dn=>api.dinoDetailedBodyPartDefinitions(dn,false);
    expect(parts(dilo).find(p=>p.id==='crest').characteristics).toMatch(/paired plates rather than a single midline horn/);
    expect(parts(allo).find(p=>p.id==='brow').characteristics).toMatch(/localized.*jimmadseni/);
    for(const dn of [allo,dilo])for(const s of api.dinoTheropodCrestProfileFor(dn).sources)expect(s.url).toMatch(/^https:\/\/(doi.org|pmc.ncbi.nlm.nih.gov)/);
  });
  it.each(['allosaurus','dilophosaurus'].flatMap(id=>[.05,1,8].map(scale=>[id,scale])))('%s builds closed attached nested ornaments at scale %s',(id,scale)=>{
    const lean=nativeTheropodCrests(id,scale),full=nativeTheropodCrests(id,scale,1.13);
    try{
      expect(lean.cores).toHaveLength(2);expect(lean.coverings).toHaveLength(2);
      const meta=lean.context.model.userData.dinoTheropodCrests;
      expect(meta).toMatchObject({species:id,dimensionInference:true,fixedRoots:true,rootsFromMinimumHead:true,coveringExtentIsInferred:true,internalRecessesNotModeled:true});
      expect(meta.entries).toHaveLength(2);expect(meta.entries.map(e=>e.side)).toEqual([-1,1]);
      expect(full.context.model.userData.dinoTheropodCrests).toEqual(meta);
      expect(crestGeometryHash(full.cores)).toBe(crestGeometryHash(lean.cores));expect(crestGeometryHash(full.coverings)).toBe(crestGeometryHash(lean.coverings));
      const insideHead=nativeMeshContains(lean.upper,scale*2e-6);
      for(const fixture of [lean,full])for(const core of fixture.cores){
        const tag=core.userData.dinoTheropodCranialElement,cover=fixture.coverings.find(m=>m.userData.dinoTheropodCranialElement.id===tag.id);
        expect(cover.userData.dinoTheropodCranialElement.root).toEqual(tag.root);expect(core.position.toArray()).toEqual(cover.position.toArray());
        const insideCover=nativeMeshContains(cover,scale*2e-7);
        for(let i=0;i<core.geometry.attributes.position.count;i++)expect(insideCover(world(core,i)),`${id} ${scale} actual bony ornament vertex ${i}`).toBe(true);
        const support=fixture.bones.filter(m=>m.userData.dinoTheropodCranialElement&&m.userData.dinoTheropodCranialElement.element==='nasal-frontal-roof'&&m.userData.dinoTheropodCranialElement.side===tag.side).map(m=>nativeMeshContains(m,scale*2e-6));
        expect(support).toHaveLength(1);let contacts=0;
        for(const mesh of [core,cover]){
          for(const i of mesh.geometry.userData.dinoTheropodCrestGeometry.baseVertices){
            const point=world(mesh,i);expect(insideHead(point),`${id} ${scale} buried minimum-head base ${i}`).toBe(true);
            if(mesh===core&&support.some(contains=>contains(point)))contacts++;
          }
          expect(mesh.userData.dinoMotionParent).toBe('cranial');expect(fixture.context.cranialMotionParts).toContain(mesh);
          expect(mesh.userData.dinoPartIds).toContain(id==='dilophosaurus'?'crest':'brow');
          for(const key of ['position','normal','dinoKeratin'])expect(Array.from(mesh.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);
          const n=mesh.geometry.attributes.normal;for(let i=0;i<n.count;i++)expect(vec().fromBufferAttribute(n,i).length()).toBeCloseTo(1,4);
          closed(mesh,scale*1e-7);
        }
        expect(contacts,`${id} ${scale} actual bony ornament attaches to actual nasal/lacrimal support`).toBeGreaterThan(core.geometry.userData.dinoTheropodCrestGeometry.rows*.40);
        const box=new THREE.Box3().setFromObject(core),size=box.getSize(vec());expect(size.z).toBeLessThan(size.y*.35);
      }
      if(id==='dilophosaurus'){
        const top=lean.cores[0],size=new THREE.Box3().setFromObject(top).getSize(vec());expect(size.x).toBeGreaterThan(size.y*1.4);
      }
    }finally{lean.dispose();full.dispose();}
  });
  it.each(['allosaurus','dilophosaurus'])('%s preserves identical actual bone and life geometry in separate modes',id=>{
    const both=nativeTheropodCrests(id),bone=nativeTheropodCrests(id,1,.90,{body:false,bone:true}),life=nativeTheropodCrests(id,1,.90,{body:true,bone:false});
    try{
      expect(bone.coverings).toHaveLength(0);expect(life.cores).toHaveLength(0);
      expect(crestGeometryHash(bone.cores)).toBe(crestGeometryHash(both.cores));expect(crestGeometryHash(life.coverings)).toBe(crestGeometryHash(both.coverings));
      expect(bone.context.model.userData.dinoTheropodCrests).toEqual(life.context.model.userData.dinoTheropodCrests);
    }finally{both.dispose();bone.dispose();life.dispose();}
  });
  it('keeps Coelophysis as a control without adding a synthetic display structure',()=>{
    const b=nativeTheropodCrests('coelophysis');try{expect(b.ornaments).toHaveLength(0);expect(b.context.model.userData.dinoTheropodCrests).toBeUndefined();expect(b.context.model.userData.dinoTheropodCranium).toBeTruthy();}finally{b.dispose();}
  });
});

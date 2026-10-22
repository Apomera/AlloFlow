import { describe,it,expect } from 'vitest';
import { nativeArmoredCranium,nativeArmoredNostrilFrames,api,THREE,vec,rayInside,geometryHash } from './helpers/dino_native_armored_cranium_harness.js';
import { nativeMeshContains } from './helpers/dino_native_mesh_contains.js';
const ids=['ankylosaurus','euoplocephalus','sauropelta','borealopelta'];
const dn=id=>api.DINOS.find(d=>d.id===id);
function world(mesh,index){return mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position,index));}
function closed(mesh,epsilon){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map();
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/epsilon)).join(',');
  for(let i=0;i<ix.count;i+=3)for(const [a,b]of [[0,1],[1,2],[2,0]]){
    const x=key(ix.getX(i+a)),y=key(ix.getX(i+b));if(x===y)continue;
    const edge=[x,y].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);
  }
  expect(edges.size).toBeGreaterThan(10);for(const count of edges.values())expect(count).toBe(2);
  let volume=0;
  for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));volume+=a.dot(b.cross(c))/6;}
  expect(volume).toBeGreaterThan(epsilon*epsilon*epsilon);
}
describe('reviewed native armored heads, dermal armor and tail clubs',()=>{
  it('reviews only four catalog species and bounds its scientific claims',()=>{
    for(const d of api.DINOS)expect(Boolean(api.dinoArmoredCraniumProfileFor(d)),d.id).toBe(ids.includes(d.id));
    expect(api.dinoArmoredCraniumProfileFor({...dn('ankylosaurus'),clade:'other'})).toBeNull();
    expect(api.dinoArmoredCraniumFrame(THREE,dn('ankylosaurus'),vec(),NaN,2)).toBeNull();
    for(const id of ids){const p=api.dinoArmoredCraniumProfileFor(dn(id));expect(p.armorSources.every(s=>s.startsWith('https://'))).toBe(true);expect(p.limit).toMatch(/representative|reconstructed|authored|reconstruction/);}
    expect(api.dinoArmoredCraniumProfileFor(dn('ankylosaurus')).limit).toMatch(/fleshy nostrils.*inferred/);
    expect(api.cranialSurfaceProfileFor(dn('ankylosaurus')).nostrilPosition).toBeLessThan(api.cranialSurfaceProfileFor(dn('euoplocephalus')).nostrilPosition);
    expect(api.cranialSurfaceProfileFor(dn('ankylosaurus')).nostrilHeightScale).toBeLessThan(0);
    expect(api.cranialSurfaceProfileFor(dn('borealopelta')).nostrilHeightScale).toBeLessThan(0);
    expect(api.dinoArmoredCraniumProfileFor(dn('borealopelta')).armorSources).toContain('https://doi.org/10.7717/peerj.4066');
  });
  it.each(ids.flatMap(id=>[.04,1,6].map(scale=>({id,scale}))))('builds closed nested actual armor and a shared broad head for $id at $scale',({id,scale})=>{
    const b=nativeArmoredCranium(id,scale);
    try{
      const c=b.context,meta=c.model.userData.dinoArmoredDisplay;
      if(id==='ankylosaurus'||id==='borealopelta'){
        // Execute the native facial seating and quaternion placement against
        // actual lean/full head meshes: the lateral openings must also face down.
        const full=nativeArmoredCranium(id,scale,1.13);
        try{
          for(const model of [b,full])for(const nostril of nativeArmoredNostrilFrames(model)){
            expect(nostril.frame,`${id} ${scale} native nostril surface hit`).toBeTruthy();
            expect(nostril.normal.length()).toBeCloseTo(1,8);
            expect(nostril.normal.y,`${id} ${scale} ventral nostril direction`).toBeLessThan(0);
            expect(nostril.side*nostril.normal.z,`${id} ${scale} lateral nostril direction`).toBeGreaterThan(.7);
          }
        }finally{full.dispose();}
      }
      const skinFor={torso:b.body,head:b.upper,neck:b.neck};
      const skinContains=Object.fromEntries(Object.entries(skinFor).map(([region,mesh])=>[region,nativeMeshContains(mesh,scale*2e-6)]));
      expect(c.model.userData.dinoArmoredCranium).toMatchObject({dimensionsAreInterpretive:true,tissueHypothesisIndependentAnchors:true});
      expect(c.snout.toArray()).toEqual(c.surfaceSnout.toArray());expect(c.snout.toArray()).toEqual(c.armoredCranium.metadata.snout);
      expect(c.armoredCranium.depth).toBeGreaterThan(c.armoredCranium.height*1.5);
      expect(meta).toMatchObject({rootsFromMinimumSurface:true,dermalBoneDistinctFromAxialSkeleton:true,fullArmorInventory:false});
      expect(b.coverings.length).toBeGreaterThan(30);expect(b.coverings.map(m=>m.userData.dinoArmoredElement.id)).toEqual(b.dermalBones.map(m=>m.userData.dinoArmoredElement.id));
      expect(b.coverings.length).toBe(meta.stations.length);
      for(let i=0;i<b.coverings.length;i++){
        const cover=b.coverings[i],bone=b.dermalBones[i],info=bone.userData.dinoArmoredElement;
        expect(info.root).toEqual(cover.userData.dinoArmoredElement.root);
        for(const mesh of [cover,bone]){
          for(const attr of ['position','normal'])expect(Array.from(mesh.geometry.attributes[attr].array).every(Number.isFinite),`${id} ${info.id} ${attr}`).toBe(true);
          const normals=mesh.geometry.attributes.normal;
          for(let v=0;v<normals.count;v++)expect(vec().fromBufferAttribute(normals,v).length(),`${id} ${info.id} normal ${v}`).toBeCloseTo(1,4);
          closed(mesh,scale*1e-7);
        }
        if(info.normal){
          const normal=vec(...info.normal),root=vec(...info.root),surface=skinFor[info.region];
          const hits=new THREE.Raycaster(root.clone().addScaledVector(normal,c.len*2),normal.clone().negate(),0,c.len*4).intersectObject(surface,false);
          expect(hits.length).toBeGreaterThan(0);expect(hits[0].point.distanceTo(root),`${id} ${info.id} actual native skin root`).toBeLessThan(scale*3e-6);
          const baseVertices=cover.geometry.userData.dinoArmoredGeometry.baseVertexCount;
          for(let v=0;v<baseVertices;v++)expect(skinContains[info.region](world(cover,v)),`${id} ${info.id} actual skin buried footprint ${v}`).toBe(true);
        }
        for(let v=0;v<bone.geometry.attributes.position.count;v++)expect(rayInside(cover,world(bone,v),scale*1e-7),`${id} ${info.id} core vertex ${v}`).toBe(true);
        if(info.type==='club-handle')expect(info.dermalBone).toBe(false);else expect(info.dermalBone).toBe(true);
      }
      const rings=b.dermalBones.filter(m=>m.userData.dinoArmoredElement.type==='cervical-band');
      const clubs=b.dermalBones.filter(m=>/^club/.test(m.userData.dinoArmoredElement.type));
      if(/ankylosaurus|euoplocephalus/.test(id)){expect(rings).toHaveLength(2);expect(clubs).toHaveLength(3);}
      else{expect(rings).toHaveLength(0);expect(clubs).toHaveLength(0);expect(b.dermalBones.filter(m=>m.userData.dinoArmoredElement.type==='shoulder-spine')).toHaveLength(2);}
      const contains=b.skins.map(m=>nativeMeshContains(m,scale*2e-6));let vertices=0;
      for(const mesh of b.bones)for(let v=0;v<mesh.geometry.attributes.position.count;v++){
        vertices++;expect(contains.some(fn=>fn(world(mesh,v))),`${id} cranial bone ${mesh.name} vertex ${v}`).toBe(true);
      }
      expect(vertices).toBeGreaterThan(1000);
    }finally{b.dispose();}
  });
  it('enlarges actual Sauropelta cervical spines toward the shoulder on both sides and layers',()=>{
    // Carpenter (1984), doi:10.1139/e84-154: lateral cervical spines enlarge
    // posteriorly and are largest at the anterior body. Sort by actual seated
    // anatomical roots, then measure rendered vertex reach, not ring labels.
    for(const scale of [.04,1,6]){
      const b=nativeArmoredCranium('sauropelta',scale);
      try{
        for(const layer of [b.coverings,b.dermalBones])for(const side of [-1,1]){
          const onSide=mesh=>Math.sign(mesh.userData.dinoArmoredElement.root[2])===side;
          const neck=layer.filter(mesh=>mesh.userData.dinoArmoredElement.type==='cervical-spine'&&onSide(mesh))
            .sort((a,b)=>a.userData.dinoArmoredElement.root[0]-b.userData.dinoArmoredElement.root[0]);
          const reach=mesh=>{
            let maximum=0;const rootZ=mesh.userData.dinoArmoredElement.root[2];
            for(let v=0;v<mesh.geometry.attributes.position.count;v++)maximum=Math.max(maximum,Math.abs(world(mesh,v).z-rootZ));
            return maximum;
          };
          expect(neck).toHaveLength(3);
          for(let i=1;i<neck.length;i++){
            expect(neck[i].userData.dinoArmoredElement.root[0]).toBeGreaterThan(neck[i-1].userData.dinoArmoredElement.root[0]);
            expect(reach(neck[i]),`${scale} ${neck[i].name} posterior spine reach`).toBeGreaterThan(reach(neck[i-1]));
          }
          const shoulder=layer.find(mesh=>mesh.userData.dinoArmoredElement.type==='shoulder-spine'&&onSide(mesh));
          expect(shoulder.userData.dinoArmoredElement.root[0]).toBeGreaterThan(neck.at(-1).userData.dinoArmoredElement.root[0]);
          expect(reach(shoulder),`${scale} shoulder spine is largest`).toBeGreaterThan(reach(neck.at(-1)));
        }
      }finally{b.dispose();}
    }
  });
  it.each(ids)('keeps $id bone geometry and every root fixed through tissue hypotheses',id=>{
    const lean=nativeArmoredCranium(id),full=nativeArmoredCranium(id,1,1.13);
    try{
      expect(full.context.model.userData.dinoArmoredCranium).toEqual(lean.context.model.userData.dinoArmoredCranium);
      expect(full.context.model.userData.dinoArmoredDisplay).toEqual(lean.context.model.userData.dinoArmoredDisplay);
      expect(geometryHash(full.dermalBones)).toBe(geometryHash(lean.dermalBones));
      expect(geometryHash(full.bones)).toBe(geometryHash(lean.bones));
      for(let i=0;i<full.dermalBones.length;i++)for(let v=0;v<full.dermalBones[i].geometry.attributes.position.count;v++)
        expect(rayInside(full.coverings[i],world(full.dermalBones[i],v),1e-7),`${id} full ${full.dermalBones[i].name} vertex ${v}`).toBe(true);
    }finally{lean.dispose();full.dispose();}
  });
});

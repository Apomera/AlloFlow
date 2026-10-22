import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {api,THREE,vec,nativeSauropodExtremities,distalGeometryHash} from './helpers/dino_native_sauropod_extremities_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';
const ids=['brachiosaurus','diplodocus','apatosaurus','camarasaurus'];
const vertex=(m,i)=>m.localToWorld(vec().fromBufferAttribute(m.geometry.attributes.position,i));
const tag=m=>m.userData.dinoSauropodDistalElement;
function closedSolid(mesh,scale){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map();let volume=0;
  for(let i=0;i<ix.count;i+=3){const indices=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],a=vec().fromBufferAttribute(p,indices[0]),b=vec().fromBufferAttribute(p,indices[1]),c=vec().fromBufferAttribute(p,indices[2]);
    expect(b.clone().sub(a).cross(c.clone().sub(a)).length(),mesh.name+' triangle area').toBeGreaterThan(scale*scale*1e-14);volume+=a.dot(b.cross(c))/6;
    for(const[x,y]of[[0,1],[1,2],[2,0]]){const edge=[indices[x],indices[y]].sort((a,b)=>a-b).join(',');edges.set(edge,(edges.get(edge)||0)+1);}}
  for(const count of edges.values())expect(count,mesh.name+' welded edge').toBe(2);expect(volume,mesh.name+' outward volume').toBeGreaterThan(scale**3*1e-12);
}
describe('native comparative sauropod hands and feet',()=>{
  it('classifies the separate intervals of a real concave closed solid',()=>{
    const shape=new THREE.Shape();shape.moveTo(0,0);for(const[x,y]of[[3,0],[3,3],[2,3],[2,1],[1,1],[1,3],[0,3]])shape.lineTo(x,y);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.4,bevelEnabled:false}),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,z,y,x);}geometry.computeVertexNormals();geometry.setIndex(Array.from({length:p.count},(_,i)=>i));
    const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);mesh.position.set(4,-2,1);mesh.updateMatrixWorld(true);
    try{const contains=nativeMeshContains(mesh,1e-7),world=(x,y,z)=>mesh.localToWorld(vec(x,y,z));
      expect(contains(world(.2,2,.5))).toBe(true);expect(contains(world(.2,2,2.5))).toBe(true);expect(contains(world(.2,2,1.5)),'gap between the two arms').toBe(false);
      expect(contains(world(.2,.5,1.5)),'solid connecting the two arms').toBe(true);expect(contains(world(.2,2,1)),'actual boundary').toBe(true);
      expect(contains(world(.2,2,3.5))).toBe(false);
    }finally{geometry.dispose();material.dispose();}
  });
  it('gates only the four reviewed bodies and states reconstruction limits',()=>{
    for(const dn of api.DINOS)expect(Boolean(api.dinoSauropodExtremitiesProfileFor(dn)),dn.id).toBe(ids.includes(dn.id));
    for(const id of ids){const dn=api.DINOS.find(d=>d.id===id),p=api.dinoSauropodExtremitiesProfileFor(dn);expect(api.dinoSauropodExtremitiesProfileFor({...dn,group:'other'})).toBeNull();
      expect(p.referenceDimensions).toBeNull();expect(p.limit).toMatch(/not specimen scans or exact catalog-species formulas/);expect(p.limit).toMatch(/track shape alone does not identify/);
      expect(api.dinoSauropodExtremityFrame(THREE,dn,{root:vec(NaN,0,0),ankle:vec(0,1,0),len:2,ht:1,bodyDepth:.1})).toBeNull();}
  });
  it.each(ids.flatMap(id=>[.05,1,8].map(scale=>[id,scale])))('%s uses five shared actual rays with contained bones at scale %s',(id,scale)=>{
    const b=nativeSauropodExtremities(id,scale);try{
      const metadata=b.model.userData.dinoSauropodExtremities;
      expect(metadata).toMatchObject({species:id,genusInformed:true,dimensionsAreInterpretive:true,poseIsInterpretive:true,referenceDimensions:null,tissueHypothesisIndependentAnchors:true});expect(metadata.limbs).toHaveLength(4);
      for(const front of [false,true])for(const side of [-1,1]){
        const bones=b.bones.filter(m=>tag(m).front===front&&tag(m).side===side),life=b.life.filter(m=>tag(m).front===front&&tag(m).side===side),record=metadata.limbs.find(l=>l.front===front&&l.side===side);
        expect(record.rays.map(r=>r.ray)).toEqual([1,2,3,4,5]);expect(bones.filter(m=>tag(m).element===(front?'metacarpal':'metatarsal'))).toHaveLength(5);
        expect(bones.filter(m=>tag(m).element==='ungual-core').map(m=>tag(m).ray)).toEqual(front?[1]:[1,2,3]);
        expect(side*(record.rays[0].points[0][2]-record.root[2])).toBeLessThan(0);expect(side*(record.rays[4].points[0][2]-record.root[2])).toBeGreaterThan(0);
        if(front){expect(record.rays[2].points[0][0]).toBeLessThan(record.rays[0].points[0][0]);expect(record.rays[2].points[0][0]).toBeLessThan(record.rays[4].points[0][0]);}
        const covers=life.map(m=>nativeMeshContains(m,scale*2e-7));let checked=0;
        for(const m of bones){const own=tag(m).element==='ungual-core'?life.filter(s=>tag(s).element==='ungual-covering'&&tag(s).ray===tag(m).ray).map(s=>nativeMeshContains(s,scale*2e-7)):covers;
          for(let i=0;i<m.geometry.attributes.position.count;i++){checked++;expect(own.some(inside=>inside(vertex(m,i))),`${id} ${scale} actual ${m.name} vertex ${i}`).toBe(true);}}
        expect(checked).toBeGreaterThan(2500);
        if(scale===1){for(const m of bones.filter(m=>/^(carpal|tarsal|tarsal-assembly|metacarpal|metatarsal)$/.test(tag(m).element))){const ix=m.geometry.index;
          for(let i=0;i<ix.count;i+=3){const a=vertex(m,ix.getX(i)),b=vertex(m,ix.getX(i+1)),c=vertex(m,ix.getX(i+2));
            for(const sample of [a.clone().add(b).add(c).multiplyScalar(1/3),a.clone().lerp(b,.5),b.clone().lerp(c,.5),c.clone().lerp(a,.5)])expect(covers.some(inside=>inside(sample)),m.name+' actual face/edge covering').toBe(true);}}
        }
        const leg=b.context.idleMotion.legs.find(l=>l.front===front&&l.side===side).mesh,legContains=nativeMeshContains(leg,scale*2e-7);
        const actualLimb=b.limbs.find(l=>l.front===front&&l.side===side),fullCover=[leg,b.context.bodyShell,...life].map(m=>nativeMeshContains(m,scale*2e-7));
        for(const m of actualLimb.bones.filter(m=>!tag(m)))for(let i=0;i<m.geometry.attributes.position.count;i++)expect(fullCover.some(inside=>inside(vertex(m,i))),m.name+' retained upper-limb/joint vertex '+i).toBe(true);
        if(!front){const pad=life.find(m=>tag(m).element==='plantar-pad'),padContains=nativeMeshContains(pad,scale*2e-7);
          for(const ray of [1,2,3]){const r=record.rays.find(r=>r.ray===ray),last=vec(...r.points.at(-1));expect(legContains(last),'actual toe base must emerge from leg '+ray).toBe(false);expect(padContains(last),'actual toe end must emerge from heel '+ray).toBe(false);
            const claw=life.find(m=>tag(m).ray===ray&&tag(m).element==='ungual-covering'),grain=claw.geometry.attributes.dinoKeratin;let exposed=0,sampled=0;
            for(let i=0;i<grain.count;i++)if(grain.getZ(i)>.60&&grain.getZ(i)<.95){sampled++;const p=vertex(claw,i);if(!padContains(p)&&!legContains(p))exposed++;}
            expect(exposed,'real claw surface emerges from heel and leg '+ray).toBeGreaterThan(sampled*.55);
          }
        }
      }
      expect(new Set(b.meshes.map(m=>m.name)).size).toBe(b.meshes.length);
      for(const m of b.meshes){for(const attribute of ['position','normal'])expect(Array.from(m.geometry.attributes[attribute].array).every(Number.isFinite),m.name).toBe(true);const p=m.geometry.attributes.position;let minY=Infinity;for(let i=0;i<p.count;i++)minY=Math.min(minY,vertex(m,i).y);expect(minY,m.name).toBeGreaterThan(0);}
      if(scale===1)for(const mesh of b.meshes)closedSolid(mesh,scale);
    }finally{b.dispose();}
  });
  it.each(ids)('%s exposes the same anatomy and metadata with either layer hidden',id=>{
    const both=nativeSauropodExtremities(id),bone=nativeSauropodExtremities(id,1,{body:false,bone:true}),life=nativeSauropodExtremities(id,1,{body:true,bone:false});
    try{expect(bone.life).toHaveLength(0);expect(life.bones).toHaveLength(0);expect(both.model.userData.dinoSauropodExtremities).toEqual(bone.model.userData.dinoSauropodExtremities);expect(bone.model.userData.dinoSauropodExtremities).toEqual(life.model.userData.dinoSauropodExtremities);expect(distalGeometryHash(both.bones)).toBe(distalGeometryHash(bone.bones));expect(distalGeometryHash(both.life)).toBe(distalGeometryHash(life.life));}finally{both.dispose();bone.dispose();life.dispose();}
  });
  it('preserves the established body anchors, upper limb axes and planted contacts',()=>{
    const baseline=JSON.parse(readFileSync('tests/fixtures/dinolab_sauropod_extremities_preserved.json','utf8'));
    for(const id of ids){const b=nativeSauropodExtremities(id);try{expect(b.model.userData.dinoFullBodyAnatomy.anchors).toEqual(baseline[id].anchors);expect(b.model.userData.dinoFullBodyAnatomy.limbs).toEqual(baseline[id].limbs);expect(b.context.plantedFootContacts.map(c=>({point:c.point.toArray(),radiusX:c.radiusX,radiusZ:c.radiusZ,part:c.part,side:c.side}))).toEqual(baseline[id].contacts);}finally{b.dispose();}}
  });
});

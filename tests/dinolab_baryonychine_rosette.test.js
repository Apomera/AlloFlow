import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { THREE, vec, nativeRosetteHarness } from './helpers/dino_native_rosette_harness.js';
const source = readFileSync(process.env.DINO_BARYONYCHINE_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8');
const { art, build } = nativeRosetteHarness(source);

function enclosed(built, point) {
  return [built.upper, built.lower].some(mesh => {
    const hits = new THREE.Raycaster(vec(point.x, point.y, built.context.ht * 5), vec(0, 0, -1)).intersectObject(mesh, false);
    return hits.length >= 2 && point.z <= hits[0].point.z + built.context.ht * 1e-6 && point.z >= hits.at(-1).point.z - built.context.ht * 1e-6;
  });
}
function transverseWidth(meshes, x) {
  let minZ=Infinity,maxZ=-Infinity;
  for(const mesh of meshes) {
    const positions=mesh.geometry.attributes.position,index=mesh.geometry.index;
    for(let i=0;i<index.count;i+=3) for(let edge=0;edge<3;edge++) {
      const a=mesh.localToWorld(vec().fromBufferAttribute(positions,index.getX(i+edge))), b=mesh.localToWorld(vec().fromBufferAttribute(positions,index.getX(i+(edge+1)%3)));
      if((a.x-x)*(b.x-x)>0||Math.abs(b.x-a.x)<1e-12) continue;
      const z=a.z+(b.z-a.z)*(x-a.x)/(b.x-a.x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
    }
  }
  return maxZ-minZ;
}

describe('matched Baryonyx and Suchomimus rosettes', () => {
  it('gates the shared shape to the two represented baryonychines', () => {
    for (const dn of art.DINOS) expect(!!art.dinoBaryonychineRostrumFor(dn), dn.id).toBe(['baryonyx','suchomimus'].includes(dn.id));
    expect(art.dinoBaryonychineRostrumFor({ id:'baryonyx',group:'other' })).toBeNull();
    for (const id of ['baryonyx','suchomimus']) {
      const dn = art.DINOS.find(d=>d.id===id), head = vec(0,1), oldSnout = vec(-2,.8);
      const next = art.dinoBaryonychineSnoutAnchor(THREE,dn,head,oldSnout), profile = art.cranialSurfaceProfileFor(dn);
      expect(next.snout.clone().sub(head).multiplyScalar(profile.muzzleLengthScale).toArray()).toEqual(oldSnout.clone().sub(head).multiplyScalar(1.42).toArray());
      const p = art.dinoBaryonychineRostrumFor(dn);
      expect(art.dinoBaryonychineWidthAt(p,.64,false)).toBe(1);
      expect(art.dinoBaryonychineWidthAt(p,p.tip,false)).toBeGreaterThan(art.dinoBaryonychineWidthAt(p,p.waist,false));
    }
  });

  it.each(['baryonyx','suchomimus'].flatMap(id => [.05,1,5].map(scale=>({id,scale}))))('encloses native anterior bone and tooth vertices for $id scale $scale in lean skin', ({id,scale}) => {
    const b=build(id,scale), {head,snout,ht}=b.context, span=head.x-snout.x;
    const failures=[]; let examined=0, transitionBefore=0, transitionAfter=0, newTransitionFailures=0;
    for(const mesh of b.bones) for(let i=0;i<mesh.geometry.attributes.position.count;i++) {
      const p=mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position,i)), t=(head.x-p.x)/span;
      if(t<.30) continue;
      if(t<.68) {
        const before=b.boneBefore.get(mesh)?.[i], wasInside=before && enclosed(b,before), nowInside=enclosed(b,p);
        if(!wasInside) transitionBefore++;
        if(!nowInside) transitionAfter++;
        if(wasInside&&!nowInside) newTransitionFailures++;
        continue;
      }
      examined++;
      if(!enclosed(b,p)) failures.push({type:mesh.geometry.type, tooth:b.teeth.includes(mesh),t,point:p.toArray(), bounds:[b.upper,b.lower].map(skin=>new THREE.Raycaster(vec(p.x,p.y,ht*5),vec(0,0,-1)).intersectObject(skin,false).map(hit=>hit.point.z))});
    }
    expect(examined).toBeGreaterThan(100);
    expect(newTransitionFailures).toBe(0);
    expect(transitionAfter).toBeLessThanOrEqual(transitionBefore);
    expect(failures.slice(0,6),JSON.stringify({id,scale,head:head.toArray(),snout:snout.toArray(),lower:new THREE.Box3().setFromObject(b.lower),total:failures.length,examples:failures.slice(0,6)})).toEqual([]);
    for(const mesh of [b.upper,b.lower,...b.bones]) for(const key of ['position','normal']) expect(Array.from(mesh.geometry.attributes[key].array).every(Number.isFinite)).toBe(true);
    const profile=art.dinoBaryonychineRostrumFor(b.context.dn), waist=head.clone().lerp(snout,profile.waist), tip=head.clone().lerp(snout,profile.tip);
    expect(transverseWidth([b.upper],tip.x)).toBeGreaterThan(transverseWidth([b.upper],waist.x)*1.3);
    expect(transverseWidth([b.lower],tip.x)).toBeGreaterThan(transverseWidth([b.lower],waist.x)*1.3);
    expect(transverseWidth(b.bones,tip.x)).toBeGreaterThan(transverseWidth(b.bones,waist.x)*1.2);
    expect(b.teeth).toHaveLength(18);
    b.dispose();
  });

  it('preserves conical crown buffers and world-pose invariance',()=>{
    const dn=art.DINOS.find(d=>d.id==='baryonyx'), head=vec(0,0),snout=vec(-2,0), parent=new THREE.Group();
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12),new THREE.MeshBasicMaterial());sphere.position.set(-1.8,0,.2);parent.add(sphere);
    const posed=sphere.clone();posed.geometry=sphere.geometry.clone();const rotated=new THREE.Group();rotated.rotation.set(.3,Math.PI/2,.1);rotated.scale.set(2,.7,1.4);rotated.add(posed);
    art.dinoShapeBaryonychineRostrum(THREE,dn,sphere,head,snout,'bone');art.dinoShapeBaryonychineRostrum(THREE,dn,posed,head,snout,'bone');
    expect(posed.geometry.attributes.position.array).toEqual(sphere.geometry.attributes.position.array);
    const tooth=new THREE.Mesh(new THREE.ConeGeometry(.03,.15,10),sphere.material);tooth.position.set(-1.82,0,.2);tooth.rotation.set(.3,.2,.1);parent.add(tooth);
    const before={position:tooth.geometry.attributes.position.array.slice(),normal:tooth.geometry.attributes.normal.array.slice(),uv:tooth.geometry.attributes.uv.array.slice(),index:tooth.geometry.index.array.slice(),scale:tooth.scale.toArray(),quaternion:tooth.quaternion.toArray(),center:tooth.position.clone()};
    art.dinoShapeBaryonychineRostrum(THREE,dn,tooth,head,snout,'bone-tooth');
    for(const name of ['position','normal','uv']) expect(tooth.geometry.attributes[name].array).toEqual(before[name]);
    expect(tooth.geometry.index.array).toEqual(before.index);expect(tooth.scale.toArray()).toEqual(before.scale);expect(tooth.quaternion.toArray()).toEqual(before.quaternion);expect(tooth.position.z).not.toBe(before.center.z);
    for(const mesh of [sphere,posed,tooth])mesh.geometry.dispose();sphere.material.dispose();
  });

  it('keeps the native bone frame and tooth positions independent of tissue hypotheses',()=>{
    for(const id of ['baryonyx','suchomimus']) {
      const lean=build(id,1,.90), full=build(id,1,1.04);
      expect(full.bones).toHaveLength(lean.bones.length);
      lean.bones.forEach((mesh,i)=>{
        const other=full.bones[i];
        expect(other.geometry.attributes.position.array).toEqual(mesh.geometry.attributes.position.array);
        expect(other.geometry.index.array).toEqual(mesh.geometry.index.array);
        expect(other.position.toArray()).toEqual(mesh.position.toArray());
        expect(other.quaternion.toArray()).toEqual(mesh.quaternion.toArray());
        expect(other.scale.toArray()).toEqual(mesh.scale.toArray());
      });
      lean.dispose();full.dispose();
    }
  });

  it('links the actual snout and teeth to a source-supported overhead comparison',()=>{
    for(const id of ['baryonyx','suchomimus']) for(const partId of ['snout','jaw','teeth']) {
      const dn=art.DINOS.find(d=>d.id===id),part={id:partId,region:'head'};
      const guide=art.dinoPartInspectionFor(dn,part),task=art.dinoPartViewpointTaskFor(dn,part);
      expect(guide.source.url).toBe(art.dinoBaryonychineRostrumFor(dn).source);
      expect(guide.limit).toContain('simplified bone widths and depths');
      expect(task.views.map(view=>view.id)).toEqual(['side','overhead']);
      expect(task.limit).toMatch(/illustrative|reconstructed/);
    }
  });

  it('resamples only affected bone cylinders while preserving materials, transforms and mesh count',()=>{
    const dn=art.DINOS.find(d=>d.id==='baryonyx'),parent=new THREE.Group(),head=vec(0,0),snout=vec(-2,0),material=new THREE.MeshBasicMaterial();
    let materialDisposals=0;material.addEventListener('dispose',()=>materialDisposals++);
    const posterior=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.5,9),material);posterior.position.set(.5,0,0);parent.add(posterior);
    const originalPosterior=posterior.geometry,posteriorBytes=originalPosterior.attributes.position.array.slice();
    expect(art.dinoShapeBaryonychineRostrum(THREE,dn,posterior,head,snout,'bone')).toBe(false);
    expect(posterior.geometry).toBe(originalPosterior);expect(posterior.geometry.attributes.position.array).toEqual(posteriorBytes);
    const anterior=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.7,9),material);anterior.position.set(-1.6,0,.1);anterior.rotation.z=Math.PI/2;parent.add(anterior);
    const original=anterior.geometry,transform=[anterior.position.toArray(),anterior.quaternion.toArray(),anterior.scale.toArray()];let oldDisposals=0;
    original.addEventListener('dispose',()=>oldDisposals++);
    expect(art.dinoShapeBaryonychineRostrum(THREE,dn,anterior,head,snout,'bone')).toBe(true);
    expect(anterior.geometry).not.toBe(original);expect(anterior.geometry.parameters.heightSegments).toBe(16);expect(oldDisposals).toBe(1);
    expect(anterior.material).toBe(material);expect(materialDisposals).toBe(0);expect(parent.children).toHaveLength(2);
    expect([anterior.position.toArray(),anterior.quaternion.toArray(),anterior.scale.toArray()]).toEqual(transform);
    posterior.geometry.dispose();anterior.geometry.dispose();material.dispose();
  });
});

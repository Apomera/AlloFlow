import { describe, it, expect } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const baseline = JSON.parse(readFileSync(process.env.DINO_STYRACOSAURUS_FIXTURE || resolve('tests/fixtures/dinolab_styracosaurus_profile_baseline.json'), 'utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
function extract(name) {
  const start = source.indexOf('function ' + name + '('); assert(start >= 0, name);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error('Unterminated helper ' + name);
}
window.StemLab = { registerTool() {} };
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__styOrnaments = { DINOS, cranialSurfaceProfileFor, dinoStyracosaurusOrnaments, dinoStyracosaurusOrnamentGeometry, dinoConnectedCranialPose, dinoFrillGeometry, dinoBonyFrillGeometry, dinoStyracosaurusBonyFrillGeometry, dinoProtoceratopsFrillGeometry }; window.StemLab.registerTool('dinoLab'"))();
const api = globalThis.__styOrnaments; delete globalThis.__styOrnaments;
const species = api.DINOS.find(d => d.id === 'styracosaurus');
const point = (g, i) => new THREE.Vector3().fromBufferAttribute(g.attributes.position, i);
function landmarks(size = 1, id = 'styracosaurus', override = {}) {
  const a = { head: new THREE.Vector3(-2.4, 1.78, .2).multiplyScalar(size), snout: new THREE.Vector3(-3.1, 1.7, .2).multiplyScalar(size), headHeight: .32 * size, length: 8 * size, height: 3 * size, frillScale: 1, bodyDepth: .7 * size, ...override };
  return api.dinoStyracosaurusOrnaments(THREE, id, a.head, a.snout, a.headHeight, a.length, a.height, a.frillScale, a.bodyDepth);
}
function validClosedGeometry(g, size) {
  const edges = new Map(); let volume = 0, minimumArea = Infinity, maximumNormalError = 0;
  for (let i = 0; i < g.attributes.position.count; i++) {
    const p = point(g, i), n = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, i);
    expect([...p.toArray(), ...n.toArray()].every(Number.isFinite)).toBe(true);
    maximumNormalError = Math.max(maximumNormalError, Math.abs(n.length() - 1));
    expect(g.boundingBox.containsPoint(p)).toBe(true);
    expect(p.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius + size * 1e-7);
  }
  const ids = g.index.array;
  for (let i = 0; i < ids.length; i += 3) {
    const a = point(g, ids[i]), b = point(g, ids[i + 1]), c = point(g, ids[i + 2]);
    minimumArea = Math.min(minimumArea, b.clone().sub(a).cross(c.clone().sub(a)).length());
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let e = 0; e < 3; e++) {
      const a = ids[i + e], b = ids[i + (e + 1) % 3], key = Math.min(a,b) + ':' + Math.max(a,b), row = edges.get(key) || [0,0];
      row[0]++; row[1] += a < b ? 1 : -1; edges.set(key,row);
    }
  }
  expect(maximumNormalError).toBeLessThan(1e-6);
  expect(minimumArea).toBeGreaterThan(size * size * 1e-12);
  expect(volume).toBeGreaterThan(0);
  expect([...edges.values()].every(([count,direction]) => count === 2 && direction === 0)).toBe(true);
  expect(g.attributes.position.count - edges.size + ids.length / 3).toBe(2);
}
function enclosed(sheath, core, size, selectedSamples) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), mesh = new THREE.Mesh(sheath, material);
  mesh.updateMatrixWorld(true);
  const axis = new THREE.Vector3(.173, .913, .373).normalize(), reach = sheath.boundingSphere.radius * 5, ray = new THREE.Raycaster();
  function onSurface(p) {
    // A point on a shared root-cap triangle edge can lose that ray hit to rounding.
    // Confirm the same boundary tolerance by distance to the actual surface.
    const triangle=new THREE.Triangle(),closest=new THREE.Vector3();
    for(let i=0;i<sheath.index.count;i+=3) {
      triangle.set(point(sheath,sheath.index.getX(i)),point(sheath,sheath.index.getX(i+1)),point(sheath,sheath.index.getX(i+2)));
      if(triangle.closestPointToPoint(p,closest).distanceTo(p)<size*1e-7)return true;
    }
    return false;
  }
  const samples = selectedSamples || Array.from({ length: core.attributes.position.count }, (_, i) => point(core,i));
  // Face centres catch a core face that bridges outside a curved sheath despite contained vertices.
  if (!selectedSamples) for (let i=0;i<core.index.count;i+=3) samples.push(point(core,core.index.getX(i)).add(point(core,core.index.getX(i+1))).add(point(core,core.index.getX(i+2))).multiplyScalar(1/3));
  let outside = 0, missed = 0;
  for (const p of samples) {
    ray.set(p.clone().addScaledVector(axis,-reach),axis);
    const distances=[];
    for(const hit of ray.intersectObject(mesh,false)) if(!distances.length || hit.distance-distances[distances.length-1]>size*1e-8)distances.push(hit.distance);
    if(!distances.length){if(!onSurface(p))missed++;continue;}
    const boundary=distances.some(d=>Math.abs(d-reach)<size*1e-7);
    if(!boundary && distances.filter(d=>d<reach).length%2!==1 && !onSurface(p))outside++;
  }
  material.dispose(); expect(missed).toBe(0); expect(outside).toBe(0);
}

describe('Styracosaurus ornament profile', () => {
  it('changes only the target ornament description while retaining its head proportions', () => {
    const profile = api.cranialSurfaceProfileFor(species), stable = p => Object.fromEntries(Object.entries(p).filter(([key]) => !['browHornScale','noseHornScale','frillSpikes','shortLabel','label','note'].includes(key)));
    expect(stable(profile)).toEqual(stable(baseline.targetProfile));
    expect(profile.browHornScale).toBe(0); expect(profile.noseHornScale).toBeGreaterThan(baseline.targetProfile.noseHornScale);
    expect(profile.frillSpikes).toBe(6); expect(profile.note).toMatch(/representative|variable|vary|inferred|interpret/i);
  });
  it('preserves all other catalog cranial profiles against the preceding source', () => {
    expect(baseline.baselineSourceHash).toBe('c13a5bc7c0dd71053155a823bdc7be7cc3a55db6d4dd9d5e750cbe894ea2f9ce');
    // Restore only the reviewed later Protoceratops change for this historical comparison.
    expect(sha(JSON.stringify(baseline.historicalProtoceratopsProfile))).toBe('a5f9fcad9289f4ebdf48e75ef0aa2882a996d71aeae4b25c9c50966801e142db');
    const profiles = api.DINOS.filter(d => d.id !== 'styracosaurus').map(d => [d.id, d.id === 'protoceratops' ? baseline.historicalProtoceratopsProfile : api.cranialSurfaceProfileFor(d)]);
    expect(profiles.length).toBe(baseline.otherSpeciesCount); expect(sha(JSON.stringify(profiles))).toBe(baseline.otherProfilesHash);
  });
  it('does not infer the species-specific arrangement from a name, trait, or partial ID', () => {
    for (const id of ['Styracosaurus','styracosaurus-extra','triceratops','protoceratops','',null]) {
      expect(landmarks(1,id)).toEqual([]);
      const profile=api.cranialSurfaceProfileFor({...species,id,name:'Styracosaurus',traits:['frill spikes','nasal horn']});
      expect(profile.frillSpikes).toBeUndefined();
    }
  });
  it('constructs one nasal horn and three distinct mirrored pairs without mutating its inputs', () => {
    const head=new THREE.Vector3(-2.4,1.78,.2),snout=new THREE.Vector3(-3.1,1.7,.2),saved=[head.toArray(),snout.toArray()],all=landmarks(1,'styracosaurus',{head,snout});
    expect(all).toHaveLength(7);expect(new Set(all.map(x=>x.id)).size).toBe(7);
    expect(all.filter(x=>x.placement==='nasal')).toHaveLength(1);expect(all.filter(x=>x.placement==='nasal')[0].side).toBe(0);
    for(const pair of new Set(all.filter(x=>x.placement==='frill').map(x=>x.pair))) {
      const twins=all.filter(x=>x.placement==='frill'&&x.pair===pair);expect(twins.map(x=>x.side).sort()).toEqual([-1,1]);
      const [a,b]=twins;expect(a.base.x).toBe(b.base.x);expect(a.base.y).toBe(b.base.y);expect(a.base.z-head.z).toBeCloseTo(-(b.base.z-head.z),12);
      expect(a.direction.x).toBe(b.direction.x);expect(a.direction.y).toBe(b.direction.y);expect(a.direction.z).toBe(-b.direction.z);
    }
    expect([head.toArray(),snout.toArray()]).toEqual(saved);
  });
  for(const invalid of [{length:0},{height:-1},{bodyDepth:NaN},{frillScale:Infinity},{headHeight:0},{head:null},{snout:new THREE.Vector3(NaN,0,0)}])
    it('rejects invalid geometry input '+JSON.stringify(invalid),()=>expect(landmarks(1,'styracosaurus',invalid)).toEqual([]));
});

describe('Styracosaurus horn and frill spike geometry', () => {
  for(const size of [.03,1,12]) {
    it('keeps all seven closed bony cores enclosed by broad and narrow sheaths at scale '+size,()=>{
      const broad=landmarks(size),narrow=landmarks(size,'styracosaurus',{length:5.5*size,height:1.8*size,bodyDepth:.35*size});
      for(const landmark of [...broad,...narrow]) {
        const sheath=api.dinoStyracosaurusOrnamentGeometry(THREE,landmark,false),core=api.dinoStyracosaurusOrnamentGeometry(THREE,landmark,true);
        try {
          validClosedGeometry(sheath,size);validClosedGeometry(core,size);enclosed(sheath,core,size);
          expect(core.boundingSphere.radius).toBeLessThan(sheath.boundingSphere.radius);
          expect(sheath.userData.dinoCranialOrnament.core).toBe(false);expect(core.userData.dinoCranialOrnament.core).toBe(true);
          expect(sheath.userData.dinoCranialOrnament.interpretive).toBe(true);
        } finally {sheath.dispose();core.dispose();}
      }
    });
    for(const core of [false,true]) it('buries all six '+(core?'bony':'life')+' spike root caps inside broad and narrow frills at scale '+size,()=>{
      for(const dimensions of [{length:8,height:3,bodyDepth:.7},{length:5.5,height:1.8,bodyDepth:.35}]) {
      const built=caller(core),context={...built.context,head:built.context.head.clone().multiplyScalar(size),len:dimensions.length*size,ht:dimensions.height*size,surfaceBodyDepth:dimensions.bodyDepth*size,
        vec:(x,y,z)=>new THREE.Vector3(x,y,z),dinoFrillGeometry:api.dinoFrillGeometry,dinoBonyFrillGeometry:api.dinoBonyFrillGeometry,dinoStyracosaurusBonyFrillGeometry:api.dinoStyracosaurusBonyFrillGeometry,dinoProtoceratopsFrillGeometry:api.dinoProtoceratopsFrillGeometry};
      const add=new Function('context','with(context){'+extract('addFrillSurface')+';return addFrillSurface;}')(context);
      const frill=add(core?built.boneMat:built.keratinMat,core?.95:1);
      try {
        for(const landmark of landmarks(size,'styracosaurus',{length:context.len,height:context.ht,bodyDepth:context.surfaceBodyDepth}).filter(x=>x.placement==='frill')) {
          const spike=api.dinoStyracosaurusOrnamentGeometry(THREE,landmark,core);spike.translate(...landmark.base.toArray());
          try {
            const samples=[],cap=spike.attributes.position.count-1;
            for(let i=0;i<24;i++) {
              const a=point(spike,i),b=point(spike,(i+1)%24),c=point(spike,cap);
              samples.push(a,a.clone().lerp(b,.5),a.clone().add(b).add(c).multiplyScalar(1/3));
            }
            samples.push(point(spike,cap));enclosed(frill.geometry,spike,size,samples);
          } finally {spike.dispose();}
        }
      } finally {built.release();}
      }
    });
  }
  it('keeps independent geometry buffers for the two layers',()=>{
    const landmark=landmarks()[1],a=api.dinoStyracosaurusOrnamentGeometry(THREE,landmark,false),b=api.dinoStyracosaurusOrnamentGeometry(THREE,landmark,true),before=a.attributes.position.array.slice();
    try {b.attributes.position.setX(0,123);expect(a.attributes.position.array).toEqual(before);expect(a.attributes.position.array.buffer).not.toBe(b.attributes.position.array.buffer);}finally{a.dispose();b.dispose();}
  });
});

function caller(core, parts = ['frill','horns'], id = 'styracosaurus') {
  const model=new THREE.Group(),motion=[],boneMat=new THREE.MeshBasicMaterial(),keratinMat=new THREE.MeshBasicMaterial(),seated=[];
  const dn={...species,id},context={THREE,props:{species:dn},head:new THREE.Vector3(-2.4,1.78,.2),surfaceSnout:new THREE.Vector3(-3.1,1.7,.2),surfaceHeadHeight:.32,len:8,ht:3,surfaceBodyDepth:.7,cranialSurface:api.cranialSurfaceProfileFor(dn),model,boneMat,keratinMat,headShell:{},
    hasAnatomyPart:part=>parts.includes(part),dinoStyracosaurusOrnaments:api.dinoStyracosaurusOrnaments,dinoStyracosaurusOrnamentGeometry:api.dinoStyracosaurusOrnamentGeometry,
    dinoSeatHornRoot:(_t,mesh,surface)=>{seated.push({mesh,surface});return true;},dinoMarkSpecialPart:(mesh,part)=>{mesh.userData.dinoPartIds=[part];}};
  const add=new Function('context','with(context){'+extract('addStyracosaurusOrnaments')+';return addStyracosaurusOrnaments;}')(context);
  const capture=new Function('model','cranialMotionParts',extract('registerCranialMotion')+'\n'+extract('captureCranialMotion')+';return captureCranialMotion;')(model,motion);
  const before=model.children.slice();add(core);capture(before);
  return {model,motion,seated,boneMat,keratinMat,context,release(){for(const m of model.children)m.geometry.dispose();boneMat.dispose();keratinMat.dispose();}};
}
describe('Styracosaurus ornament caller and cranial motion',()=>{
  for(const core of [false,true]) {
    it('builds seven ornaments and no generic brow or duplicate nasal horns in the actual '+(core?'fossil':'life')+' branch',()=>{
      const b=caller(core,[]),marker='if (/Ceratops/i.test(cladeName)) {',first=source.indexOf(marker),start=core?source.indexOf(marker,first+marker.length):first;
      expect(start).toBeGreaterThan(0);let depth=0,end=start;
      for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0){end=i+1;break;}}
      const generic=[],frills=[],context={...b.context,cladeName:'Ceratopsia',hasAnatomyPart:()=>true,anatomyAccentMat:b.keratinMat,
        addFrillSurface:(mat,scale)=>frills.push({mat,scale}),captureCranialMotion:()=>{},
        addKeratinCone:()=>{generic.push('life');},addSkeletonCone:()=>{generic.push('bone');}};
      try {
        new Function('context','with(context){'+extract('addStyracosaurusOrnaments')+';'+source.slice(start,end)+'}')(context);
        expect(generic).toEqual([]);expect(b.model.children).toHaveLength(7);expect(frills).toEqual([{mat:core?b.boneMat:b.keratinMat,scale:core?.95:1}]);
        expect(b.model.children.filter(m=>m.userData.dinoCranialOrnament.placement==='nasal')).toHaveLength(1);
      }finally{b.release();}
    });
    it('uses matching landmarks and part ownership for '+(core?'fossil cores':'life sheaths'),()=>{
      const built=caller(core),expected=landmarks();
      try {
        expect(built.model.children).toHaveLength(7);expect(built.motion).toEqual(built.model.children);
        for(const mesh of built.model.children) {
          const mark=mesh.userData.dinoCranialOrnament,p=expected.find(x=>x.id===mark.id);
          expect(mesh.position.distanceTo(p.base)).toBeLessThan(1e-12);expect(mark.core).toBe(core);expect(mesh.material).toBe(core?built.boneMat:built.keratinMat);
          expect(mesh.userData.dinoPartIds).toEqual([mark.placement==='frill'?'frill':'horns']);expect(mesh.userData.dinoMotionParent).toBe('cranial');
          expect(mesh.castShadow&&mesh.receiveShadow).toBe(true);
        }
        expect(built.seated).toHaveLength(core?0:1);
        if(!core)expect(built.seated[0].mesh.userData.dinoCranialOrnament.placement).toBe('nasal');
      }finally{built.release();}
    });
    for(const [parts,count] of [[['frill'],6],[['horns'],1],[[],0]])it('respects available anatomy parts '+parts+' in core='+core,()=>{
      const b=caller(core,parts);try{expect(b.model.children).toHaveLength(count);}finally{b.release();}
    });
  }
  it('leaves non-target callers empty',()=>{const b=caller(false,['frill','horns'],'triceratops');try{expect(b.model.children).toHaveLength(0);expect(b.seated).toHaveLength(0);}finally{b.release();}});
  it('moves every ornament with the head and restores its rest position',()=>{
    const b=caller(false),rig=new THREE.Group(),neck=new THREE.Group(),pivot=new THREE.Vector3(.7,1.2,.2),rest=neck.quaternion.clone();
    try {
      for(const m of [...b.motion])rig.add(m);b.model.add(rig);const saved=rig.children.map(m=>m.position.clone());
      neck.rotation.set(.08,-.24,.04);api.dinoConnectedCranialPose(THREE,rig,pivot,neck,rest);b.model.updateMatrixWorld(true);
      for(let i=0;i<rig.children.length;i++)expect(rig.children[i].getWorldPosition(new THREE.Vector3()).distanceTo(saved[i].clone().sub(pivot).applyQuaternion(neck.quaternion).add(pivot))).toBeLessThan(1e-10);
      neck.quaternion.copy(rest);api.dinoConnectedCranialPose(THREE,rig,pivot,neck,rest);b.model.updateMatrixWorld(true);
      for(let i=0;i<rig.children.length;i++)expect(rig.children[i].getWorldPosition(new THREE.Vector3()).distanceTo(saved[i])).toBeLessThan(1e-10);
      for(const m of [...rig.children])b.model.add(m);b.model.remove(rig);
    }finally{b.release();}
  });
});

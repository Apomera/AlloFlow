import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_FRILL_NESTING_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
window.StemLab = { registerTool() {} };
const nativeHelpers=[...source.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]).join(',');
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__frillNesting = { DINOS,"+nativeHelpers+" };window.StemLab.registerTool('dinoLab'"))();
const api = globalThis.__frillNesting; delete globalThis.__frillNesting;
// Oblique rays avoid coinciding with the shared edges of frill rings.
const axis = new THREE.Vector3(1.031, -.577, .137).normalize(), measurements = [];
const point = (geometry, i) => new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i);
function pair(scale, depth, length) {
  const skin = api.dinoFrillGeometry(THREE, .6*scale, depth*.86*scale, length*.01*scale, true);
  return { skin, bone: api.dinoBonyFrillGeometry(THREE, skin), scale, depth, length };
}
function checkContained(skin, samples, scale) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), mesh = new THREE.Mesh(skin, material);
  mesh.updateMatrixWorld(true);
  const reach = skin.boundingSphere.radius*4, caster = new THREE.Raycaster();
  let minimum = Infinity, missed = 0, outside = 0;
  for (const p of samples) {
    caster.set(p.clone().addScaledVector(axis, -reach), axis);
    const hits = caster.intersectObject(mesh, false), distances = [];
    for (const hit of hits) if (!distances.length || hit.distance-distances[distances.length-1]>scale*1e-7) distances.push(hit.distance);
    if (distances.length < 2) { missed++; continue; }
    const inside = distances.filter(d=>d<reach).length%2===1;
    const clearance = Math.min(...distances.map(d=>Math.abs(d-reach)))*(inside?1:-1);
    minimum = Math.min(minimum, clearance);
    if (!inside) outside++;
  }
  material.dispose();
  expect(missed).toBe(0); expect(outside).toBe(0); expect(minimum).toBeGreaterThan(scale*.0001);
  return { samples: samples.length, outside, missed, minimumClearance: minimum };
}
function closed(geometry, scale) {
  const edges = new Map(), indices = geometry.index.array;
  let volume = 0, smallest = Infinity;
  for (let i=0; i<indices.length; i+=3) {
    const a=point(geometry,indices[i]), b=point(geometry,indices[i+1]), c=point(geometry,indices[i+2]);
    smallest=Math.min(smallest,b.clone().sub(a).cross(c.clone().sub(a)).length());
    volume+=a.dot(b.clone().cross(c))/6;
    for (let j=0;j<3;j++) {
      const x=indices[i+j],y=indices[i+(j+1)%3],key=Math.min(x,y)+','+Math.max(x,y),e=edges.get(key)||{count:0,direction:0};
      e.count++; e.direction+=x<y?1:-1; edges.set(key,e);
    }
  }
  expect([...edges.values()].every(e=>e.count===2&&e.direction===0)).toBe(true);
  expect(volume).toBeGreaterThan(0); expect(smallest).toBeGreaterThan(scale*scale*1e-8);
  const normals=geometry.attributes.normal;
  for(let i=0;i<normals.count;i++) {
    const n=new THREE.Vector3().fromBufferAttribute(normals,i),p=point(geometry,i);
    expect(p.toArray().every(Number.isFinite)).toBe(true);
    expect(Math.abs(n.length()-1)).toBeLessThan(1e-6);
    expect(geometry.boundingBox.containsPoint(p)).toBe(true);
    expect(p.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius+scale*1e-6);
  }
}
function build(id, isBone, observe) {
  const dn=api.DINOS.find(d=>d.id===id), profile=api.cranialSurfaceProfileFor(dn);
  const boneMat=new THREE.MeshBasicMaterial(), bodyMat=new THREE.MeshBasicMaterial(), model=new THREE.Group();
  const head=new THREE.Vector3(-2.4,1.78,0), len=8, ht=3, depth=.70;
  const context={...api,THREE,head,len,ht,bodyDepth:depth,surfaceBodyDepth:depth,
    ceratopsidCranium:api.dinoCeratopsidCraniumFrame(THREE,dn,head,len,ht),cranialSurface:profile,props:{species:dn},boneMat,model,
    vec:(x,y,z)=>new THREE.Vector3(x,y,z),hasAnatomyPart:()=>true,
    dinoMarkSpecialPart:(mesh,id)=>{mesh.userData.dinoPartIds=[id];},
    dinoFrillGeometry:(...args)=>{const g=api.dinoFrillGeometry(...args);if(observe)observe(g);return g;},
    dinoBonyFrillGeometry:api.dinoBonyFrillGeometry,dinoStyracosaurusBonyFrillGeometry:api.dinoStyracosaurusBonyFrillGeometry,dinoProtoceratopsFrillGeometry:api.dinoProtoceratopsFrillGeometry};
  const start=source.indexOf('function addFrillSurface(mat, size) {'),end=source.indexOf('var hasHighSail =',start);
  const create=new Function('context','with(context){'+source.slice(start,end)+'return addFrillSurface;}')(context);
  const mesh=create(isBone?boneMat:bodyMat,isBone?.95:1);
  return {mesh,model,profile,head,len,ht,depth,boneMat,bodyMat};
}
function disposeBuilt(b) {b.mesh.geometry.dispose();b.mesh.material.dispose();b.boneMat.dispose();if(b.mesh.material!==b.bodyMat)b.bodyMat.dispose();}
describe('Dino Lab nested Triceratops frill',()=>{
  for(const scale of [.03,1,12])for(const [depth,length] of [[.60,4],[1.04,12]]) {
    it('contains a closed bony frill at scale '+scale+', depth '+depth+', length '+length,()=>{
      const p=pair(scale,depth,length);
      try {
        closed(p.bone,scale);
        const samples=Array.from({length:p.bone.attributes.position.count},(_,i)=>point(p.bone,i));
        measurements.push({kind:'vertices',scale,depth,length,...checkContained(p.skin,samples,scale)});
        expect(p.bone.attributes.position.count).toBeLessThan(p.skin.attributes.position.count);
        expect(p.bone.userData.dinoDisplayShell.closed).toBe(true);
        expect(p.bone.userData.dinoDisplayShell.thicknessIsInterpretive).toBe(true);
      } finally {p.skin.dispose();p.bone.dispose();}
    });
  }
  it('contains triangle interiors and edge midpoints as well as vertices in narrow and broad envelopes',()=>{
    for(const [depth,length] of [[.60,4],[1.04,12]]) {
      const p=pair(1,depth,length),samples=[],index=p.bone.index.array;
      try {
        for(let i=0;i<index.length;i+=3) {
          const a=point(p.bone,index[i]),b=point(p.bone,index[i+1]),c=point(p.bone,index[i+2]);
          samples.push(a.clone().add(b).add(c).multiplyScalar(1/3),a.clone().lerp(b,.5),b.clone().lerp(c,.5),c.clone().lerp(a,.5));
        }
        measurements.push({kind:'triangle-centroids-and-edge-midpoints',scale:1,depth,length,...checkContained(p.skin,samples,1)});
      } finally {p.skin.dispose();p.bone.dispose();}
    }
  });
  it('keeps the life surface buffers independent and unchanged when building the bony layer',()=>{
    const skin=api.dinoFrillGeometry(THREE,.6,.70*.86,.08,true),saved={};
    for(const key of ['position','normal','uv'])saved[key]=skin.attributes[key].array.slice();
    const indices=skin.index.array.slice(),metadata=JSON.stringify(skin.userData),bone=api.dinoBonyFrillGeometry(THREE,skin);
    try {
      for(const key of Object.keys(saved))expect(skin.attributes[key].array).toEqual(saved[key]);
      expect(skin.index.array).toEqual(indices);expect(JSON.stringify(skin.userData)).toBe(metadata);
      bone.attributes.position.setX(0,123);
      expect(skin.attributes.position.array).toEqual(saved.position);
    } finally {skin.dispose();bone.dispose();}
  });
  it('nests the actual bony caller inside the translated life frill and retains its single tagged mesh',()=>{
    const body=build('triceratops',false),bone=build('triceratops',true);
    try {
      const samples=Array.from({length:bone.mesh.geometry.attributes.position.count},(_,i)=>point(bone.mesh.geometry,i));
      measurements.push({kind:'actual-caller',...checkContained(body.mesh.geometry,samples,1)});
      expect(bone.model.children).toHaveLength(1);expect(bone.mesh.userData.dinoFeature).toBe('frill');
      expect(bone.mesh.userData.dinoPartIds).toEqual(['frill']);expect(bone.mesh.material.side).toBe(THREE.DoubleSide);
      expect(bone.mesh.castShadow&&bone.mesh.receiveShadow).toBe(true);
    } finally {disposeBuilt(body);disposeBuilt(bone);}
  });
  it.each(['styracosaurus','centrosaurus','chasmosaurus'])('nests the %s clipped-root bony frill inside its actual life outline',id=>{
    const body=build(id,false),bone=build(id,true);
    try {
      closed(bone.mesh.geometry,1);
      const samples=Array.from({length:bone.mesh.geometry.attributes.position.count},(_,i)=>point(bone.mesh.geometry,i));
      const index=bone.mesh.geometry.index.array;
      for(let i=0;i<index.length;i+=3) samples.push(point(bone.mesh.geometry,index[i]).add(point(bone.mesh.geometry,index[i+1])).add(point(bone.mesh.geometry,index[i+2])).multiplyScalar(1/3));
      measurements.push({kind:id+'-caller',...checkContained(body.mesh.geometry,samples,1)});
      expect(bone.mesh.geometry.userData.dinoDisplayShell.depthProfile).toBe('nested-bony-frill');
      expect(bone.mesh.geometry.userData.dinoDisplayShell.maxThickness).toBeGreaterThan(0);
      expect(bone.mesh.geometry.userData.dinoDisplayShell.maxThickness).toBeLessThan(body.mesh.geometry.userData.dinoDisplayShell.thickness);
      expect(bone.mesh.userData.dinoPartIds).toEqual(['frill']);
    } finally {disposeBuilt(body);disposeBuilt(bone);}
  });
  it('retains the existing scaled bony frill for other ceratopsians',()=>{
    for(const id of ['psittacosaurus','aquilops']) {
      const b=build(id,true),s=b.profile.frillScale*.95;
      const expected=api.dinoFrillGeometry(THREE,b.ht*.20*s,b.depth*.86*s,b.len*.010,false);
      expected.translate(b.head.x+b.len*.025*s,b.head.y+b.ht*.052,b.head.z);
      try {
        for(const name of ['position','normal','uv'])expect(b.mesh.geometry.attributes[name].array).toEqual(expected.attributes[name].array);
        expect(b.mesh.geometry.index.array).toEqual(expected.index.array);
      } finally {expected.dispose();disposeBuilt(b);}
    }
  });
  it('disposes the temporary skin envelope once and keeps the published bone geometry live',()=>{
    let disposed=0;const observed=[];
    const b=build('triceratops',true,g=>{observed.push(g);g.addEventListener('dispose',()=>disposed++);});
    try {
      expect(disposed).toBe(1);expect(observed).toHaveLength(1);
      expect(b.mesh.geometry===observed[0]).toBe(false);
      expect(b.mesh.geometry.attributes.position.count).toBeGreaterThan(0);
    } finally {disposeBuilt(b);}
  });
});

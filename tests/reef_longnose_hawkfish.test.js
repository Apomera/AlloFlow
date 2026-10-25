import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,ID='longnose_hawkfish',make=(quality='high',options={})=>S.create(T,ID,{quality,seed:7,...options});
function meshes(h){const a=[];h.root.traverse(m=>{if(m.isMesh)a.push(m);});return a;}
function uniforms(m){const s={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>'};m.material.onBeforeCompile(s);return s.uniforms;}
function buffers(h){return meshes(h).map(m=>Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,[...a.array]])));}
function pose(h){const a=[];h.root.traverse(n=>a.push([...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()]));return a;}
function region(m,r){m.updateWorldMatrix(true,false);const b=new T.Box3(),p=new T.Vector3(),a=m.geometry.attributes.position;for(let i=r.first;i<r.first+r.count;i++)b.expandByPoint(p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));return b;}
function shaderPoint(m,i,u){const p=new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,i),s=u.reefSwimShape.value,v=u.reefSwim.value;let f=Math.max(0,Math.min(1,(s.x-p.x)/Math.max(s.x-s.y,.0001)));f=f*f*(3-2*f);p.z+=v.y*s.z*f*f*Math.sin(v.x-v.z*p.x);return p;}

describe('Longnose hawkfish specimen',()=>{
  it('registers an unsexed reef-perched fish with sourced full-length/depth metadata',()=>{
    expect(S.ids).toContain(ID);expect(S.ids.indexOf(ID)).toBeGreaterThan(S.ids.indexOf('leaf_scorpionfish'));
    expect(S.info(ID)).toMatchObject({group:'fish',habit:'bottom',lengthM:.12,depthM:[10,100],origin:'base',healthStates:['healthy']});expect(()=>S.createSchool(T,ID,3)).toThrow();
  });
  for(const quality of ['low','high']){
    it('retains complete finite geometry and original budget at '+quality,()=>{
      for(const seed of [7,23]){const h=make(quality,{seed});try{const ms=meshes(h);expect(ms).toHaveLength(1);const m=ms[0],g=m.geometry,d=g.userData.longnoseHawkfish,b=region(m,{first:0,count:g.attributes.position.count});expect(g.index.count/3).toBeLessThanOrEqual(quality==='high'?6000:1500);expect(b.min.y).toBeCloseTo(0,12);expect(b.getSize(new T.Vector3()).x).toBeGreaterThan(.115);expect(b.getSize(new T.Vector3()).x).toBeLessThan(.125);expect(d.nominalTotalLengthM).toBe(.12);expect(d.appearance).toBe('red-white-unsexed');for(const a of Object.values(g.attributes))expect([...a.array].every(Number.isFinite)).toBe(true);expect([...g.index.array].every(i=>i>=0&&i<g.attributes.position.count)).toBe(true);expect(m.material.transparent).toBe(false);expect(m.material.emissive.getHex()).toBe(0);}finally{h.dispose();}}
    });
    it('retains long narrow jaws, ten cirrus tufts and six supporting rays per side at '+quality,()=>{
      const h=make(quality);try{const m=meshes(h)[0],d=m.geometry.userData.longnoseHawkfish,body=region(m,d.ranges['long-snouted-body']).getSize(new T.Vector3()),tail=region(m,d.ranges['truncate-caudal']);expect(body.x/body.y).toBeGreaterThan(4);expect(d.bodyRows[0][0]-d.bodyRows[3][0]).toBeGreaterThan(.25);expect(d.bodyRows[1][3]).toBeLessThan(.02);expect(d.spines).toBe(10);expect(d.softRays).toBe(13);expect(d.dorsalRays).toHaveLength(23);expect(d.dorsalRays.filter(p=>p.spine)).toHaveLength(10);expect(d.cirrusTufts).toHaveLength(10);expect(d.cirrusTufts.every(t=>t.length===3)).toBe(true);expect(d.supportRays.filter(r=>r.side===1)).toHaveLength(6);expect(d.supportRays.filter(r=>r.side===-1)).toHaveLength(6);expect(d.pectorals.map(p=>p.side)).toEqual([-1,1]);expect(tail.getSize(new T.Vector3()).y).toBeGreaterThan(.02);expect(tail.getSize(new T.Vector3()).z).toBeLessThan(.001);expect(d.ranges['eyes'].count).toBeGreaterThan(20);expect(d.ranges['mouth-gills-nostrils'].count).toBeGreaterThan(80);}finally{h.dispose();}
    });
    it('keeps actual substrate vertices fixed under active shader motion at '+quality,()=>{
      const h=make(quality);try{h.root.position.set(3,-2,4);h.root.rotation.y=.6;const m=meshes(h)[0],u=uniforms(m),g=m.geometry,d=g.userData.longnoseHawkfish,indices=[];for(let i=0;i<g.attributes.position.count;i++)if(g.attributes.position.getX(i)>=-d.staticEnvelopeHeightM)indices.push(i);expect(indices.length).toBeGreaterThan(10);const before=indices.map(i=>shaderPoint(m,i,u).toArray()),root=[...h.root.position.toArray(),...h.root.quaternion.toArray()];let moves=0;const tip=d.ranges['continuous-dorsal'].first+4,tipBefore=shaderPoint(m,tip,u).clone();for(const t of [1,2.3,10,1000]){h.update(.016,t,{current:{x:1,z:.7,strength:1}});expect(indices.map(i=>shaderPoint(m,i,u).toArray())).toEqual(before);moves+=shaderPoint(m,tip,u).distanceTo(tipBefore);}expect(moves).toBeGreaterThan(0);expect([...h.root.position.toArray(),...h.root.quaternion.toArray()]).toEqual(root);}finally{h.dispose();}
    });
  }
  it('places every supporting ray end on its branch with a fixed low envelope',()=>{
    const h=make();try{const d=meshes(h)[0].geometry.userData.longnoseHawkfish;for(const r of d.supportRays){const path=d.branchPaths[r.side<0?1:2];let distance=Infinity;for(let j=0;j<path.length-1;j++){const a=new T.Vector3(...path[j]),b=new T.Vector3(...path[j+1]),p=new T.Vector3(...r.end),v=b.clone().sub(a),u=Math.max(0,Math.min(1,p.clone().sub(a).dot(v)/v.lengthSq()));distance=Math.min(distance,p.distanceTo(a.addScaledVector(v,u)));}expect(distance).toBeLessThan(.014);expect(r.end[1]*d.scaleM).toBeLessThan(d.staticEnvelopeHeightM);}}finally{h.dispose();}
  });
  it('bakes contrasting white cells and fine red crosshatch with no emissive pigment',()=>{
    const h=make();try{const m=meshes(h)[0],image=m.material.map.image;let pale=0,red=0;for(let y=Math.ceil(image.height*.03);y<image.height*.47;y++)for(let x=Math.ceil(image.width*.03);x<image.width*.47;x++){const i=(y*image.width+x)*4,r=image.data[i],g=image.data[i+1],b=image.data[i+2];if(r>220&&g>190&&b>175)pale++;if(r>130&&r>g*1.65&&r>b*1.5)red++;}expect(pale).toBeGreaterThan(1000);expect(red).toBeGreaterThan(500);expect(pale).toBeGreaterThan(red);expect(m.material.emissive.getHex()).toBe(0);}finally{h.dispose();}
  });
  it('preserves biological stations and seeded appearance across tiers',()=>{
    const a=make(),b=make(),lo=make('low'),other=make('high',{seed:8});try{expect(buffers(a)).toEqual(buffers(b));expect(buffers(a)).not.toEqual(buffers(other));const x=meshes(a)[0].geometry.userData.longnoseHawkfish,y=meshes(lo)[0].geometry.userData.longnoseHawkfish;expect(x.scaleM).toBe(y.scaleM);expect(x.dorsalRays).toEqual(y.dorsalRays);expect(x.cirrusTufts).toEqual(y.cirrusTufts);expect(x.supportRays).toEqual(y.supportRays);expect(x.branchPaths).toEqual(y.branchPaths);}finally{a.dispose();b.dispose();lo.dispose();other.dispose();}
  });
  it('uses continuous absolute-time sway without any buffer uploads',()=>{
    const a=make(),b=make();try{const m=meshes(a)[0],u=uniforms(m),ub=uniforms(meshes(b)[0]),before=buffers(a),versions=Object.values(m.geometry.attributes).map(attr=>attr.version);a.update(.016,2);const value=u.reefSwim.value.clone();a.update(.001,2.001);expect(u.reefSwim.value.clone().sub(value).length()).toBeLessThan(.002);a.update(.01,4);b.update(4,4);expect(u.reefSwim.value.toArray()).toEqual(ub.reefSwim.value.toArray());expect(buffers(a)).toEqual(before);expect(Object.values(m.geometry.attributes).map(attr=>attr.version)).toEqual(versions);expect(u.reefSwim.value.y).toBeLessThan(.0025);}finally{a.dispose();b.dispose();}
  });
  it('fully freezes the inspection specimen when reduced motion is requested',()=>{
    const h=make('high',{reducedMotion:true});try{const before=pose(h),geometry=buffers(h),u=uniforms(meshes(h)[0]),v=u.reefSwim.value.toArray();for(const t of [1,100,10000])h.update(.016,t,{current:{x:1,z:1,strength:1}});expect(pose(h)).toEqual(before);expect(buffers(h)).toEqual(geometry);expect(u.reefSwim.value.toArray()).toEqual(v);}finally{h.dispose();}
  });
  it('shares textures and disposes each owned resource once',()=>{
    const a=make(),b=make(),m=meshes(a)[0],other=meshes(b)[0];let ng=0,nm=0,nt=0;m.geometry.addEventListener('dispose',()=>ng++);m.material.addEventListener('dispose',()=>nm++);const ts=new Set([m.material.map,m.material.bumpMap]);for(const t of ts)t.addEventListener('dispose',()=>nt++);expect(m.material.map).toBe(other.material.map);a.dispose();a.dispose();expect([ng,nm,nt]).toEqual([1,1,0]);b.dispose();b.dispose();expect(nt).toBe(ts.size);expect(()=>a.update(.1,2)).not.toThrow();
  });
  it('retains pigment and shape on devices without derivative extensions',()=>{
    const h=make('low',{derivatives:false});try{const m=meshes(h)[0];expect(m.material.bumpMap).toBeNull();expect(m.material.map).toBeTruthy();expect(()=>h.update(.1,2)).not.toThrow();}finally{h.dispose();}
  });
});

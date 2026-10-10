import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const {restorePass42Source}=require('./helpers/cephalopod_pass42_reference.cjs');
const {restorePass41Source}=require('./helpers/cephalopod_pass41_reference.cjs');
const {restorePass40Source}=require('./helpers/cephalopod_pass40_reference.cjs');
const {restorePass39FishSource}=require('./helpers/cephalopod_prey_surface_reference.cjs');
const {restorePass43Source}=require('./helpers/cephalopod_pass43_reference.cjs');
const {restorePass44Source}=require('./helpers/cephalopod_pass44_reference.cjs');
const {restorePass45Source}=require('./helpers/cephalopod_pass45_reference.cjs');
const {restorePass46Source}=require('./helpers/cephalopod_pass46_reference.cjs');
const {restorePass47Source:restorePass47Only}=require('./helpers/cephalopod_pass47_reference.cjs');
const {restorePass48Source:restorePass48Only}=require('./helpers/cephalopod_pass48_reference.cjs');
// These historical hashes predate the current oral tissue surface and motion.
const restorePass47Source=source=>restorePass47Only(restorePass48Source(source));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n'),prior=restorePass39FishSource(source),owned=[];
const math=Object.assign(Object.create(Math),{random(){throw Error('Fish finish consumed simulation RNG');}});
function build(text,index){const a=text.indexOf('function createCLHuntFish('),b=text.indexOf('\n}\n',a)+3;assert.ok(a>=0&&b>a);const f=new Function('T','index','Math',text.slice(a,b)+';return createCLHuntFish(T,index);')(T,index,math);owned.push(f);return f;}
function frame(o){return[o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.rotation.order];}
function attribute(a){return[a.itemSize,a.normalized,a.array.constructor.name,Array.from(a.array)];}
afterEach(()=>{const resources=new Set();for(const f of owned.splice(0))f.traverse(o=>{if(o.isMesh){resources.add(o.geometry);resources.add(o.material);}});resources.forEach(r=>r.dispose());});

describe('Cephalopod Hunter current fish surface finish',()=>{
  it('recovers the exact accepted source and preserves every original geometry, color, frame and static material parameter',()=>{
    expect(createHash('sha256').update(restorePass40Source(restorePass41Source(restorePass42Source(restorePass43Source(restorePass44Source(restorePass45Source(restorePass46Source(restorePass47Source(prior))))))))).digest('hex')).toBe('f65b507f0110ab173584c65708a7f5455d8ace814b3fc9e236694aed447dc690');
    for(let index=0;index<8;index++){
      const f=build(source,index),p=build(prior,index);expect(frame(f)).toEqual(frame(p));expect(f.children.length).toBe(2);expect(f.userData.swimPhase).toBe(p.userData.swimPhase);
      let bytes=0;
      for(let n=0;n<2;n++){
        const a=f.children[n],b=p.children[n];expect(frame(a)).toEqual(frame(b));expect(a.geometry.index).toBe(b.geometry.index);expect(a.geometry.groups).toEqual(b.geometry.groups);expect(a.geometry.userData).toEqual(b.geometry.userData);
        for(const name of ['position','normal','color'])expect(attribute(a.geometry.attributes[name])).toEqual(attribute(b.geometry.attributes[name]));
        expect(a.geometry.boundingBox).toEqual(b.geometry.boundingBox);expect(a.geometry.boundingSphere).toEqual(b.geometry.boundingSphere);
        for(const field of ['type','roughness','metalness','side','vertexColors','transparent','opacity','depthWrite'])expect(a.material[field]).toEqual(b.material[field]);
        expect(a.material.color.toArray()).toEqual(b.material.color.toArray());expect(a.material.emissive.toArray()).toEqual([0,0,0]);expect(Object.values(a.material).some(x=>x?.isTexture)).toBe(false);
        bytes+=Object.values(a.geometry.attributes).reduce((sum,x)=>sum+x.array.byteLength,0);
      }
      expect(bytes).toBe(87246);expect(new Set(f.children.map(m=>m.material)).size).toBe(1);expect(f.children[0].material).not.toBe(p.children[0].material);expect(f.userData.tail).toBe(f.children[1]);
    }
  });

  it('provides exact per-triangle part masks on actual surfaces and excludes every fin, tail and peduncle from skin detail',()=>{
    const f=build(source,2),counts={0:0,1:0,2:0,3:0};
    for(const m of f.children){
      const g=m.geometry,a=g.attributes.clFishPart;expect(Object.keys(g.attributes).sort()).toEqual(['clFishPart','color','normal','position']);expect(a.itemSize).toBe(1);expect(a.normalized).toBe(false);expect(a.array.constructor.name).toBe('Uint8Array');expect(a.count).toBe(g.attributes.position.count);
      for(const p of g.userData.clFishParts){const expected=p.name==='skin'?1:p.name.startsWith('iris-')?2:p.name.startsWith('pupil-')?3:0;for(let i=p.start;i<p.start+p.count;i++){expect(a.getX(i)).toBe(expected);counts[expected]++;}}
      for(let i=0;i<a.count;i+=3){expect(a.getX(i)).toBe(a.getX(i+1));expect(a.getX(i)).toBe(a.getX(i+2));}
    }
    expect(Object.values(counts).every(n=>n>0)).toBe(true);expect(Array.from(f.userData.tail.geometry.attributes.clFishPart.array).every(n=>n===0)).toBe(true);
  });

  it('hooks the actual standard shader with filtered and fallback paths while retaining opaque standard lighting and zero runtime uniforms',()=>{
    const f=build(source,0),m=f.children[0].material;expect(m.customProgramCacheKey()).toBe('cl-fish-surface-v1');expect(m.extensions.derivatives).toBe(true);
    for(const [renderer,filtered]of [[{capabilities:{isWebGL2:true}},true],[{capabilities:{isWebGL2:false},extensions:{has:n=>n==='OES_standard_derivatives'}},true],[{capabilities:{isWebGL2:false},extensions:{has:()=>false}},false],[undefined,false]]){
      const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(shader,renderer);
      expect(shader.vertexShader).toContain('attribute float clFishPart;');expect(shader.vertexShader).toContain('clFishSurfacePart=clFishPart;clFishPosition=position;');expect(shader.vertexShader).toContain('#include <project_vertex>');expect(shader.vertexShader).toContain('#include <defaultnormal_vertex>');
      expect(shader.fragmentShader.includes('#define CL_FISH_FILTERED 1')).toBe(filtered);expect(shader.fragmentShader).toContain('if(part<0.5)return vec4(1.0,1.0,1.0,0.0);');expect(shader.fragmentShader).toContain('vec4 clFishSurface=clFishFinish(clFishPosition,clFishSurfacePart);');expect(shader.fragmentShader).toContain('roughnessFactor=clamp(');expect(shader.fragmentShader).not.toContain('pow(clamp(p.y');expect(shader.fragmentShader).toContain('gillY*gillY');expect(shader.fragmentShader).toContain('#include <lights_fragment_begin>');expect(shader.fragmentShader).toContain('#include <fog_fragment>');expect(shader.uniforms).toEqual({});
      // Derivative-free branches contain no active derivative calls; every feature uses finite positive smoothing widths.
      const active=filtered?shader.fragmentShader:shader.fragmentShader.replace(/#ifdef CL_FISH_FILTERED[\s\S]*?#endif/g,'');if(!filtered)expect(active).not.toMatch(/fwidth\(|dFdx\(|dFdy\(/);
    }
  });
});

// Historical references predate the ink surface. Keep live fixtures on current visuals.
function restorePass48Source(source){return restorePass48Only(require('./helpers/cephalopod_pass49_reference.cjs').restorePass49Source(require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source)))))));}

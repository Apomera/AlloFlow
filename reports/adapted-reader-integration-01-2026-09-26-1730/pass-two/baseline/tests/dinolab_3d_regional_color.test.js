import { describe,it,expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const {dinoSkinCoordinates,dinoSurfaceGeometry,dinoSkinMapping,integumentProfileFor,byId}=internals();
describe('Dino Lab anatomical color coordinates',()=>{
  for(const size of [0.1,1,10])it('keeps tail rings uniform around curved cross-sections at scale '+size,()=>{
    const points=[[0,0,0],[1,.2,0],[2,.25,.15],[3,.15,.3]].map(p=>new THREE.Vector3(...p).multiplyScalar(size));
    const g=dinoSurfaceGeometry(THREE,points,[.4,.3,.2,.01].map(x=>x*size));
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(3,2,-1),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.7),new THREE.Vector3(1,.6,1));
    dinoSkinCoordinates(THREE,g,matrix,true);
    const region=g.attributes.dinoSkinRegion;expect(region.count).toBe(g.attributes.position.count);
    for(let ring=0;ring<=48;ring++)for(let side=0;side<=24;side++){
      expect(region.getX(ring*25+side)).toBeCloseTo(ring/48,6);expect(region.getY(ring*25+side)).toBe(1);
    }
    const before=Array.from(region.array);g.applyMatrix4(new THREE.Matrix4().makeRotationY(.5));
    expect(Array.from(region.array)).toEqual(before);g.dispose();
  });
  it('leaves body, head and limb samples outside the tail pattern',()=>{
    const g=new THREE.SphereGeometry(1,12,8);dinoSkinCoordinates(THREE,g,new THREE.Matrix4());
    expect([...g.attributes.dinoSkinRegion.array].every(value=>value===0)).toBe(true);g.dispose();
  });
  it('remains finite for a geometry without UVs',()=>{
    const g=new THREE.BoxGeometry(1,1,1);g.deleteAttribute('uv');dinoSkinCoordinates(THREE,g,new THREE.Matrix4(),true);
    expect([...g.attributes.dinoSkinRegion.array].every(Number.isFinite)).toBe(true);g.dispose();
  });
});
describe('Dino Lab regional shader palettes',()=>{
  for(const [species,mode,active] of [['sinosauropteryx','evidence',true],['sinosauropteryx','classic',false],['sinosauropteryx','neutral',false],['anchiornis','evidence',false],['microraptor','evidence',false],['psittacosaurus','evidence',false]]){
    it('applies tail bands only to the matching '+species+' '+mode+' palette',()=>{
      const profile=integumentProfileFor(byId(species),{skin:'#78614a',dark:'#3d3329',accent:'#a1845f'},mode);
      const material=new THREE.MeshStandardMaterial();dinoSkinMapping(THREE,material,1,.2,profile);
      const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};
      material.onBeforeCompile(shader);
      expect(shader.uniforms.dinoTailBandTint.value.w).toBe(active?.9:0);
      expect(shader.uniforms.dinoTailBandTint.value.x).toBeGreaterThan(shader.uniforms.dinoTailBandTint.value.z);
      expect(shader.vertexShader).toContain('vDinoSkinRegion = dinoSkinRegion;');
      expect(shader.fragmentShader).toContain('* vDinoSkinRegion.y');
      expect(shader.fragmentShader).toContain('tailBand * dinoTailBandTint.a');
      expect(material.customProgramCacheKey()).toBe('dinolab-specimen-skin-v2');material.dispose();
    });
  }
});

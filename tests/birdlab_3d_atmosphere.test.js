import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/birdlab_3d_engine.js','utf8');
const start=source.indexOf('  function applyHeightFog('),end=source.indexOf('  function mount(',start);
if(start<0||end<0)throw new Error('Missing woodland atmosphere hook');
const applyHeightFog=new Function(`${source.slice(start,end)};return applyHeightFog;`)();
const birdSource=readFileSync('stem_lab/birdlab_3d_bird.js','utf8');

function hawkFixture() {
  const context={};
  for(const method of ['save','restore','translate','rotate','beginPath','closePath','clip',
    'fillRect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','stroke','fill'])context[method]=()=>{};
  context.createLinearGradient=()=>({addColorStop(){}});
  const canvas=()=>({width:16,height:16,getContext:()=>context});
  const local={AvianFeatherArt: { ...loadAvianFeatherArt(),createFlightFeatherCanvas:canvas,
    createVaneDetailCanvases:()=>({normal:canvas(),roughness:canvas()})}};
  new Function('window','document',birdSource)(local,{createElement:canvas});
  return local.BirdLab3DBird.create(THREE);
}
function compileHook(material) {
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader,{});
  return shader;
}

describe('BirdLab scene-local atmosphere',()=>{
  it('preserves existing material hooks, uniforms, cache variants and renderer context',()=>{
    const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial(),renderer={name:'renderer'};
    let calls=0;
    material.onBeforeCompile=function(shader,context){
      expect(this).toBe(material);expect(context).toBe(renderer);calls++;
      shader.uniforms.featherDetail={value:.6};
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n// retained feather deformation');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n// retained plumage pigment');
    };
    material.customProgramCacheKey=function(){expect(this).toBe(material);return 'plumage-variant-7';};
    scene.add(new THREE.Mesh(undefined,material),new THREE.Mesh(undefined,[material,material]));
    applyHeightFog(scene);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    material.onBeforeCompile(shader,renderer);
    expect(calls).toBe(1);
    expect(shader.uniforms.featherDetail.value).toBe(.6);
    expect(shader.vertexShader).toContain('retained feather deformation');
    expect(shader.fragmentShader).toContain('retained plumage pigment');
    expect(material.customProgramCacheKey()).toContain('plumage-variant-7');
    expect(shader.vertexShader).toContain('instanceMatrix*blWoodlandFogWorld');
    expect(shader.fragmentShader.match(/float blWoodlandFogDensity\(/g)).toHaveLength(1);
  });

  it('leaves shared shader chunks, the sky and materials outside this scene untouched',()=>{
    const original={...THREE.ShaderChunk},scene=new THREE.Scene();
    const sky=new THREE.ShaderMaterial({fog:false}),clear=new THREE.MeshStandardMaterial({fog:false});
    const outside=new THREE.MeshStandardMaterial(),inside=new THREE.MeshStandardMaterial();
    const hooks=[sky.onBeforeCompile,clear.onBeforeCompile,outside.onBeforeCompile];
    scene.add(new THREE.Mesh(undefined,sky),new THREE.Mesh(undefined,clear),new THREE.Mesh(undefined,inside));
    applyHeightFog(scene);
    expect(sky.onBeforeCompile).toBe(hooks[0]);expect(clear.onBeforeCompile).toBe(hooks[1]);
    expect(outside.onBeforeCompile).toBe(hooks[2]);expect(THREE.ShaderChunk).toEqual(original);
    expect(inside.onBeforeCompile).not.toBe(hooks[2]);
  });

  it('composes every real hawk material with exactly one atmosphere declaration and function',()=>{
    const bird=hawkFixture(),scene=new THREE.Scene(),materials=new Map();
    scene.add(bird.root);
    try {
      scene.traverse(object=>{
        for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]) {
          if(!materials.has(material))materials.set(material,material.customProgramCacheKey());
        }
      });
      // Decorate the whole graph together, in production traversal order.
      // In particular, the body's hook is wrapped before the breast's hook.
      applyHeightFog(scene);
      expect(materials.size).toBeGreaterThan(10);
      for(const [material,key] of materials) {
        const shader=compileHook(material);
        expect(shader.vertexShader.match(/varying float blWoodlandFogHeight;/g),key).toHaveLength(1);
        expect(shader.fragmentShader.match(/varying float blWoodlandFogHeight;/g),key).toHaveLength(1);
        expect(shader.vertexShader.match(/vec4 blWoodlandFogWorld=/g),key).toHaveLength(1);
        expect(shader.fragmentShader.match(/float blWoodlandFogDensity\(/g),key).toHaveLength(1);
        expect(shader.fragmentShader.match(/float blDensity=/g),key).toHaveLength(1);
        expect(material.customProgramCacheKey()).toBe(key+'|birdlab-height-fog-v1');
      }
      // All five feather shader variants retain their own cache identity.
      const feathers=[...materials.keys()].filter(material=>material.normalMap?.name==='hawk-vane-normal');
      expect(feathers).toHaveLength(5);
      expect(new Set(feathers.map(material=>material.customProgramCacheKey())).size).toBe(feathers.length);
      for(const material of feathers)expect(compileHook(material).fragmentShader.match(/float blVane=/g)).toHaveLength(1);
    } finally {bird.dispose();}
  });

  it('keeps breast pigment and fine contour detail together when body and breast receive fog',()=>{
    const bird=hawkFixture(),scene=new THREE.Scene();scene.add(bird.root);
    try {
      const body=bird.root.getObjectByName('continuous-mantle-and-streaked-breast').material;
      const breast=bird.root.getObjectByName('layered-breast-and-belly-plumes').material;
      const bodyKey=body.customProgramCacheKey(),breastKey=breast.customProgramCacheKey();
      expect(bodyKey).not.toBe(breastKey);
      applyHeightFog(scene);
      const shader=compileHook(breast);
      expect(shader.vertexShader.match(/varying vec3 vBirdBody;/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/varying vec3 vBirdBody;/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/float ink=/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/float mantleMark=/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/float blFiber=/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/float blShaft=/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/float blWoodlandFogDensity\(/g)).toHaveLength(1);
      expect(body.customProgramCacheKey()).toBe(bodyKey+'|birdlab-height-fog-v1');
      expect(breast.customProgramCacheKey()).toBe(breastKey+'|birdlab-height-fog-v1');
    } finally {bird.dispose();}
  });
});

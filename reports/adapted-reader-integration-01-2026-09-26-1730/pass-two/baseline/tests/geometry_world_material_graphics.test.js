import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let THREE, makeShape, random;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;window.THREE=THREE;
  const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(source.slice(source.indexOf('  function createShapeGeometry('),source.indexOf('  // Format fractional volume for display'))+'return createShapeGeometry;')();
  const start=source.indexOf('        function surfaceRandom('),end=source.indexOf('        function makeStoneTexture()',start);
  random=new Function(source.slice(start,end)+'return surfaceRandom;')();
});

describe('Geometry World material mapping',()=>{
  for(const shape of ['halfA','quarter']){
    it('maps every '+shape+' face without stretching its texture',()=>{
      const geo=makeShape(shape),p=geo.getAttribute('position'),uv=geo.getAttribute('uv');
      expect(uv.count).toBe(p.count);
      for(let i=0;i<p.count;i+=3){
        for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){
          const distance3=Math.hypot(p.getX(a)-p.getX(b),p.getY(a)-p.getY(b),p.getZ(a)-p.getZ(b));
          const distance2=Math.hypot(uv.getX(a)-uv.getX(b),uv.getY(a)-uv.getY(b));
          expect(distance2).toBeCloseTo(distance3,5);
        }
        const area=(uv.getX(i+1)-uv.getX(i))*(uv.getY(i+2)-uv.getY(i))-(uv.getX(i+2)-uv.getX(i))*(uv.getY(i+1)-uv.getY(i));
        expect(Math.abs(area)).toBeGreaterThan(0.01);
      }
      geo.dispose();
    });
  }
  it('reproduces a material grain while keeping different materials distinct',()=>{
    const sequence=seed=>{const next=random(seed);return Array.from({length:100},()=>next());};
    expect(sequence(341)).toEqual(sequence(341));expect(sequence(341)).not.toEqual(sequence(1879));
    expect(sequence(341).every(x=>x>=0&&x<1)).toBe(true);
  });
});


describe('Geometry World finish compatibility',()=>{
  it('configures real r128 material clones without mutating the shared template',()=>{
    const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
    const start=source.indexOf('        engine.configureBlockFinish = function');
    const end=source.indexOf('        // Block edge wireframe',start);
    const engine={_renderProfile:{tier:'detail'}};
    new Function('engine','THREE',source.slice(start,end))(engine,THREE);
    const template=new THREE.MeshStandardMaterial(),originalHook=template.onBeforeCompile;
    const cube=template.clone(),slab=template.clone();
    // r128's standard materials do not initialize an extensions object. This
    // used to throw during lesson creation before the engine could be mounted.
    expect(()=>engine.configureBlockFinish(cube,'wood','cube',false)).not.toThrow();
    expect(()=>engine.configureBlockFinish(slab,'gold','halfB',false)).not.toThrow();
    const shader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader});
    const a=shader(),b=shader();cube.onBeforeCompile(a);slab.onBeforeCompile(b);
    expect(a.uniforms.gwBlockHalfSize.value.toArray()).toEqual([0.5,0.5,0.5]);
    expect(b.uniforms.gwBlockHalfSize.value.toArray()).toEqual([0.5,0.25,0.5]);
    expect(a.uniforms.gwBlockBevelStrength).not.toBe(b.uniforms.gwBlockBevelStrength);
    expect(cube.customProgramCacheKey()).toBe(slab.customProgramCacheKey());
    expect(template.onBeforeCompile).toBe(originalHook);
    expect(template._gwBlockFinish).toBeUndefined();
    cube.dispose();slab.dispose();template.dispose();
  });
});

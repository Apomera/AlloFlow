import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let world,shader,exposure;
const flowers=new Map();
function smoothstep(low,high,value){const t=Math.max(0,Math.min(1,(value-low)/(high-low)));return t*t*(3-2*t);}
beforeAll(()=>{
  resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
  world=window.__RR_TEST_EXPORTS__.butterfly.buildWorld(THREE,window.StemMeadow);
  let material;
  world.scene.traverse(object=>{
    if(object.geometry?.getAttribute('bfBloomAnchor')){
      flowers.set(object.geometry.name,object.geometry);
      material=object.material;
    }
  });
  expect(material,'a real meadow flower material exists').toBeDefined();
  shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);
  // Evaluate the actual injected scalar, rather than duplicating its formula.
  // It contains GLSL scalar arithmetic compatible with JavaScript; the two
  // GLSL builtins are supplied explicitly and no renderer is needed.
  const expression=shader.vertexShader.match(/float bfBloomSkyExposure=([^;]+);/)?.[1];
  expect(expression,'flower exposure is computed in the vertex shader').toBeDefined();
  exposure=new Function('bfBloomAnchor','bfBloomAxis','position','mix','smoothstep','return ('+expression+');');
});
afterAll(()=>{
  if(!world)return;
  const resources=new Set();
  world.scene.traverse(object=>{
    if(object.geometry)resources.add(object.geometry);
    if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));
  });
  resources.forEach(resource=>resource.dispose());
});
function light(kind,axisY,height,anchor=2){
  return exposure({w:anchor},{w:kind,y:axisY},{y:height},(a,b,t)=>a+(b-a)*t,smoothstep);
}

describe('Flower internal skylight safety contract',()=>{
  it('links one exposure channel to indirect light while retaining tissue and pigment channels',()=>{
    expect(shader.vertexShader).toMatch(/varying\s+vec4\s+bfCorollaTissue\s*;/);
    expect(shader.fragmentShader).toMatch(/varying\s+vec4\s+bfCorollaTissue\s*;/);
    expect(shader.vertexShader).toMatch(/bfCorollaTissue=vec4\([^;]+bfHeadPigment,bfBloomSkyExposure\);/);
    expect(shader.fragmentShader.match(/bfCorollaTissue\.w/g)).toHaveLength(1);
    expect(shader.fragmentShader).toMatch(/reflectedLight\.indirectDiffuse\s*\*=\s*bfCorollaTissue\.w\s*;/);
    expect(shader.fragmentShader).toContain('bfCorollaTissue.x');
    expect(shader.fragmentShader).toContain('bfCorollaTissue.y');
    expect(shader.fragmentShader).toContain('bfCorollaTissue.z');
  });

  it('uses the geometry-authored species direction and keeps every ordinary and promoted contact cap neutral',()=>{
    // axis.w=1 is milkweed: lower radial florets receive less sky fill.
    expect(light(1,-.9,.4)).toBeLessThan(light(1,.9,.4));
    expect(light(1,-.3,-2)).toBe(light(1,-.3,2));
    // axis.w=0 is bergamot: lower tube walls receive less sky fill.
    expect(light(0,1,.04)).toBeLessThan(light(0,1,.48));
    expect(light(0,-1,.2)).toBe(light(0,1,.2));
    for(const kind of [0,1])for(const anchor of [0,.49]){
      expect(light(kind,-1,.02,anchor)).toBe(1);
      expect(light(kind,1,.5,anchor)).toBe(1);
    }
    for(const name of ['milkweed-flower-umbel','bergamot-tubular-flower-head'])for(const suffix of ['','-close-detail']){
      const geometry=flowers.get(name+suffix);
      expect(geometry,name+suffix).toBeDefined();
      const anchors=geometry.getAttribute('bfBloomAnchor'),axes=geometry.getAttribute('bfBloomAxis'),positions=geometry.getAttribute('position');
      let protectedVertices=0,shadedVertices=0;
      for(let index=0;index<anchors.count;index++){
        const kind=axes.getW(index),anchor=anchors.getW(index),value=light(kind,axes.getY(index),positions.getY(index),anchor);
        expect(value).toBeGreaterThanOrEqual(kind===1?.76:.82);expect(value).toBeLessThanOrEqual(1);
        if(anchor<.5){expect(value).toBe(1);protectedVertices++;}
        else if(value<.98)shadedVertices++;
      }
      expect(protectedVertices,name+suffix+' protected contact vertices').toBeGreaterThan(3);
      expect(shadedVertices,name+suffix+' recessed neighboring vertices').toBeGreaterThan(3);
    }
  });
});

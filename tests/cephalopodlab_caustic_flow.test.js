import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const THREE=require('../vendor/three-r128/three.min.js');
const {restorePass62Source}=require('./helpers/cephalopod_pass62_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const baseline=restorePass62Source(source);
function block(text,name){
  const start=text.indexOf('function '+name+'('),open=text.indexOf('{',start);assert.ok(start>=0&&open>=0,name);
  let depth=0,quote='',line=false,comment=false;
  for(let i=open;i<text.length;i++){
    const c=text[i],next=text[i+1];if(line){if(c==='\n')line=false;continue;}if(comment){if(c==='*'&&next==='/'){comment=false;i++;}continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){comment=true;i++;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}if(c==='{')depth++;if(c==='}'&&!--depth)return text.slice(start,i+1);
  }throw new Error('Unclosed function '+name);
}
function only(text,expression){const result=[...text.matchAll(expression)];assert.equal(result.length,1,String(expression));return result[0][0];}
const helper=block(source,'shadeCLHuntCausticFlow'),fog=block(source,'fadeCLHuntCausticFog');
const visualMath=Object.create(Math);visualMath.random=()=>{throw new Error('Caustic light consumed simulation RNG');};
const shade=new Function('THREE','Math',helper+';return shadeCLHuntCausticFlow;')(THREE,visualMath);
const fade=new Function(fog+';return fadeCLHuntCausticFog;')();
const plain=()=>({uniforms:{sentinel:{value:7}},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader});
function assembled(shared={value:0}){const shader=plain();fade(shader);shade(shader,shared);return shader;}
const fragment=assembled().fragmentShader;
const warpMatch=fragment.match(/vec2 clCausticWarp\(vec2 uv,float time\)\{([^}]+)\}/);assert.ok(warpMatch,'Actual GLSL warp');
const warp=new Function('uv','time','sin','vec2',warpMatch[1].replace(/\bfloat\s+/g,'let '));
const sample=(x,y,t)=>warp({x,y},t,Math.sin,(a,b)=>[a,b]);
const points=[[-8192,1000],[-18,-6],[-.001,.001],[0,0],[.25,.75],[1,1],[6,18],[8192,-1000]];
const phases=[0,.05,.2,1,3,9,20,100,1000,100000];

describe('Cephalopod Hunter evolving shallow-water caustics',()=>{
  it('assembles the real r128 basic shader with one shared phase and the existing single map lookup',()=>{
    assert.equal(THREE.REVISION,'128');const shared={value:0},a=assembled(shared),b=assembled(shared);
    assert.deepEqual(Object.keys(a.uniforms),['sentinel','clCausticFlow']);assert.equal(a.uniforms.clCausticFlow,shared);assert.equal(b.uniforms.clCausticFlow,shared);
    shared.value=1.7;assert.equal(a.uniforms.clCausticFlow.value,1.7);assert.equal(b.uniforms.clCausticFlow.value,1.7);
    assert.equal(a.vertexShader,THREE.ShaderLib.basic.vertexShader);assert.ok(!a.fragmentShader.includes('\\n'),'Shader uses real newlines');
    assert.ok(a.fragmentShader.includes('texture2D( map, clCausticUv )'));assert.ok(!a.fragmentShader.includes('texture2D( map, vUv )'));
    assert.equal((a.fragmentShader.match(/texture2D\s*\(/g)||[]).length,(THREE.ShaderLib.basic.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment).match(/texture2D\s*\(/g)||[]).length);
    assert.ok(a.fragmentShader.includes('mapTexelToLinear( texelColor )'),'Retains texture color-space conversion');
    assert.ok(!/Math\.random|\bnew\s+|\bfor\s*\(|\bwhile\s*\(|fwidth\s*\(|dFdx\s*\(|dFdy\s*\(/.test(helper),'No new resources, RNG, loops or derivatives');
  });

  it('retains additive fog extinction and material ownership exactly while binding the existing surface clock',()=>{
    assert.equal(fog,block(baseline,'fadeCLHuntCausticFog'));
    const matLine=only(source,/        var causticsMat=new THREE\.MeshBasicMaterial\([^\n]+/g);
    assert.equal(matLine,only(baseline,/        var causticsMat=new THREE\.MeshBasicMaterial\([^\n]+/g));
    const callback=only(source,/        causticsMat\.onBeforeCompile=function\(shader\)\{[^\n]+/g);
    const cache=only(source,/        causticsMat\.customProgramCacheKey=function\(\)\{[^\n]+/g);
    const map=new THREE.Texture(),flow={value:0},build=new Function('THREE','causticsTex','surfaceFlow','fadeCLHuntCausticFog','shadeCLHuntCausticFlow',matLine+'\n'+callback+'\n'+cache+'\nreturn causticsMat;');
    const material=build(THREE,map,flow,fade,shade);
    try{
      assert.equal(material.map,map);assert.equal(material.blending,THREE.AdditiveBlending);assert.equal(material.depthWrite,false);assert.equal(material.transparent,true);assert.equal(material.opacity,.065);
      const shader=plain();material.onBeforeCompile(shader);assert.equal(shader.uniforms.clCausticFlow,flow);assert.equal(shader.fragmentShader,assembled(flow).fragmentShader);assert.equal(material.customProgramCacheKey(),'cl-caustic-flow-v62');
      const fogged=plain();fade(fogged);const fogStart=fogged.fragmentShader.indexOf('#ifdef USE_FOG',fogged.fragmentShader.indexOf('#include <premultiplied_alpha_fragment>'));
      if(fogStart>=0)assert.ok(shader.fragmentShader.includes(fogged.fragmentShader.slice(fogStart)));
    }finally{material.dispose();map.dispose();}
  });

  it('starts at exactly the prior caustic UV and bounds displacement and temporal speed across long runtimes',()=>{
    for(const [x,y]of points){assert.deepEqual(sample(x,y,0),[0,0]);for(const t of phases){const a=sample(x,y,t),b=sample(x,y,t+.05);assert.ok(a.every(Number.isFinite));assert.ok(Math.hypot(...a)<.04,'Bounded local light displacement');assert.ok(Math.hypot(b[0]-a[0],b[1]-a[1])<.001,'No temporal jump across a native tick');}}
  });

  it('deforms cells locally with continuous nonfolding UVs rather than translating the whole pattern',()=>{
    const epsilon=1e-5;
    let spatialVariation=0,areaVariation=0;
    for(const t of [.2,1,3,9,20])for(const [x,y]of points){
      const a=sample(x,y,t),neighbor=sample(x+.3,y+.2,t);spatialVariation=Math.max(spatialVariation,Math.hypot(a[0]-neighbor[0],a[1]-neighbor[1]));
      const xp=sample(x+epsilon,y,t),xm=sample(x-epsilon,y,t),yp=sample(x,y+epsilon,t),ym=sample(x,y-epsilon,t);
      const xx=1+(xp[0]-xm[0])/(2*epsilon),xy=(yp[0]-ym[0])/(2*epsilon),yx=(xp[1]-xm[1])/(2*epsilon),yy=1+(yp[1]-ym[1])/(2*epsilon),det=xx*yy-xy*yx;
      assert.ok(det>.75&&det<1.25,'Gentle compression without UV folds');areaVariation=Math.max(areaVariation,Math.abs(det-1));
      assert.ok(Math.hypot(xp[0]-xm[0],xp[1]-xm[1])<epsilon*.5,'Continuous spatial derivative');
    }
    assert.ok(spatialVariation>.004,'Distinct cells move differently');assert.ok(areaVariation>.02,'Visible local compression and expansion');
  });

  it('preserves the world anchoring, depth/night fade, retained geometry and pause/reduced-motion clock source',()=>{
    // These actual update lines are unchanged: the warp samples the already
    // transformed world UV, and gets no wall clock or independent animation loop.
    for(const pattern of [/            if\(!gameState\.a11y\.reducedMotion\)causticPhase\+=dt;/g,/            causticsTex\.offset\.set\([^\n]+/g,/            surfaceFlow\.value=causticPhase;/g,/            caustics\.material\.opacity=[^\n]+/g,/              causticsGeo\.attributes\.position\.array\.set\([^\n]+/g])assert.equal(only(source,pattern),only(baseline,pattern));
    assert.ok(!/Date\.|performance\.|requestAnimationFrame|setInterval|setTimeout/.test(helper));
    assert.ok(fragment.includes('clCausticWarp(vUv,clCausticFlow)'));
    const flow={value:3},shader=assembled(flow);const before=sample(.23,.67,shader.uniforms.clCausticFlow.value);assert.deepEqual(sample(.23,.67,shader.uniforms.clCausticFlow.value),before);
    // Snapped tile translation is cancelled by the existing map offset.
    for(const tile of [-48,-12,0,12,48]){const uv=(5.3-tile)*.08+tile*.08;const anchored=sample(uv,1.19,3),reference=sample(5.3*.08,1.19,3);anchored.forEach((v,i)=>assert.ok(Math.abs(v-reference[i])<1e-15));}
  });
});

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory=dirname(fileURLToPath(import.meta.url)),require=createRequire(import.meta.url);
const repo=process.env.CEPHALOPOD_REPO_ROOT||resolve(directory,'..');
const THREE=require(resolve(repo,'vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||resolve(repo,'stem_lab/stem_tool_cephalopodlab.js'),'utf8').replace(/\r\n/g,'\n');
function extract(name){
  const start=source.indexOf('function '+name+'('),next=source.indexOf('\nfunction ',start+1);
  assert.ok(start>=0&&next>start,'Missing actual helper '+name);
  return source.slice(start,next);
}
// Guard production-owned randomness without intercepting Three.js UUID creation.
const visualMath=Object.create(Math);visualMath.random=()=>{throw Error('Sediment shape consumed global randomness');};
const helpers=new Function('THREE','Math',['createCLHuntSedimentState','updateCLHuntSedimentWake','shadeCLHuntSedimentWake','createCLHuntSedimentWake'].map(extract).join('\n')+'\n;return {create:createCLHuntSedimentWake,update:updateCLHuntSedimentWake};')(THREE,visualMath);
function shaderFor(points){const shader={uniforms:{},vertexShader:THREE.ShaderLib.points.vertexShader,fragmentShader:THREE.ShaderLib.points.fragmentShader};points.material.onBeforeCompile(shader);return shader;}
const fixture=helpers.create(THREE,1.5),shader=shaderFor(fixture);
function glslFunction(text,name){
  const signature=new RegExp('float '+name+'\\(([^)]*)\\)\\{').exec(text);assert.ok(signature,'Missing actual scalar GLSL function '+name);
  const start=signature.index+signature[0].length;let end=start,depth=1;
  for(;end<text.length;end++){if(text[end]==='{')depth++;else if(text[end]==='}'&&!--depth)break;}
  assert.equal(depth,0,'Unclosed GLSL function');
  const args=signature[1].replace(/\bfloat\s+/g,'').split(',').map(v=>v.trim());
  const body=text.slice(start,end).replace(/\bfloat\s+/g,'let ');
  // Execute the shader's own scalar arithmetic. The adapter supplies GLSL's
  // standard scalar functions, not a separately maintained density formula.
  return new Function('sin','cos','pow','sqrt','min','max','abs','clamp','smoothstep','mix','return function('+args.join(',')+'){'+body+'};')(
    Math.sin,Math.cos,Math.pow,Math.sqrt,Math.min,Math.max,Math.abs,
    (v,a,b)=>Math.max(a,Math.min(b,v)),
    (a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);},
    (a,b,t)=>a+(b-a)*t);
}
const density=glslFunction(shader.fragmentShader,'clSedimentDensity');
// This is the accepted Pass63/64 radial envelope, retained as an independent
// reference for the small-particle fallback and maximum optical density.
function priorEnvelope(x,y){const t=Math.max(0,Math.min(1,(x*x+y*y-.04)/.96));return Math.pow(1-t*t*(3-2*t),1.5);}
function dispose(points){points.geometry.dispose();points.material.dispose();}
const step=(fromX,x)=>({fromX,fromZ:0,x,z:0,height:.55,floorRestY:.55,bodyScale:1,jetting:true,substrate:'sand',reducedMotion:false});

describe('Cephalopod Hunter irregular sediment density',()=>{
  it('keeps the previous radial envelope exactly when a particle is too small for detail',()=>{
    for(const phase of [0,.7,2.8,5.9])for(let y=-1.2;y<=1.2;y+=.073)for(let x=-1.2;x<=1.2;x+=.067){
      assert.ok(Math.abs(density(x,y,phase,0)-priorEnvelope(x,y))<1e-12,'small-particle appearance changed');
    }
  });
  it('has bounded finite density and no visible square sprite edges at any detail level',()=>{
    const phases=Array.from(fixture.geometry.getAttribute('clSedimentVariant').array);
    for(const phase of phases)for(const detail of [0,.25,.7,1])for(let y=-1.12;y<=1.12;y+=.08)for(let x=-1.12;x<=1.12;x+=.08){
      const value=density(x,y,phase,detail),reference=priorEnvelope(x,y);
      assert.ok(Number.isFinite(value)&&value>=-1e-12,'invalid density');
      assert.ok(value<=reference+1e-12,'shape became more opaque than the accepted envelope');
      if(x*x+y*y>=1)assert.ok(Math.abs(value)<1e-12,'sprite edge leaked');
    }
  });
  it('creates broad asymmetric clouds with visible variation between stable slots',()=>{
    let difference=0,asymmetry=0,mass=0,referenceMass=0;
    for(let y=-.92;y<=.92;y+=.05)for(let x=-.92;x<=.92;x+=.05){
      const a=density(x,y,.31,1),b=density(x,y,2.71,1);
      difference+=Math.abs(a-b);asymmetry+=Math.abs(a-density(-x,y,.31,1));
      mass+=a;referenceMass+=priorEnvelope(x,y);
    }
    assert.ok(difference/referenceMass>.015,'slots have no meaningful density variation');
    assert.ok(asymmetry/referenceMass>.015,'clouds are still mirrored round puffs');
    assert.ok(mass/referenceMass>.35,'cloud sculpting removed almost all visible sediment');
  });
  it('fades continuously at the outer edge instead of carving a hard lobe boundary',()=>{
    for(const phase of [.2,1.4,3.1,5.2])for(let angle=0;angle<Math.PI*2;angle+=.071){
      const x=Math.cos(angle),y=Math.sin(angle);
      assert.ok(density(x*.999,y*.999,phase,1)<1e-6,'radial edge did not fade smoothly');
      assert.ok(Math.abs(density(x,y,phase,1))<1e-12);
    }
  });
  it('uses final projected size for a smooth, pixel-ratio-independent detail fallback',()=>{
    const matches=[...shader.vertexShader.matchAll(/vClSedimentDetail=([^;]+);/g)];assert.equal(matches.length,1);
    const expression=matches[0][1].replace(/gl_PointSize/g,'pointSize');
    const smoothstep=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
    const detail=new Function('pointSize','clSedimentPixelRatio','smoothstep','max','return '+expression+';');
    const cap=shader.vertexShader.indexOf('gl_PointSize=min('),write=matches[0].index;
    assert.ok(cap>=0&&write>cap,'detail was measured before the final point-size cap');
    let previous=-1;
    for(let cssSize=0;cssSize<=48;cssSize+=.1){
      const expected=detail(cssSize,1,smoothstep,Math.max);
      assert.ok(expected>=previous-1e-12&&expected>=0&&expected<=1);previous=expected;
      if(cssSize<3)assert.equal(expected,0,'subpixel/small sprites retained density detail');
      if(cssSize>24)assert.equal(expected,1,'large sprites never received the new shape');
      for(const ratio of [.75,1.5,2,3])assert.ok(Math.abs(detail(cssSize*ratio,ratio,smoothstep,Math.max)-expected)<1e-12);
    }
  });
  it('assigns deterministic static slot variation without consuming the dive RNG',()=>{
    const a=helpers.create(THREE,1),b=helpers.create(THREE,1);
    const va=a.geometry.getAttribute('clSedimentVariant'),vb=b.geometry.getAttribute('clSedimentVariant');
    assert.ok(va&&vb);assert.equal(va.count,64);assert.equal(va.itemSize,1);
    assert.equal(va.usage,THREE.StaticDrawUsage,'fixed slot variation should not be a streamed buffer');
    assert.deepEqual(Array.from(va.array),Array.from(vb.array));
    assert.equal(new Set(va.array).size,64,'repeated phase on every slot');
    assert.ok(Array.from(va.array).every(Number.isFinite));
    dispose(a);dispose(b);
  });
  it('retains the same variant buffer and values through repeated pool recycling',()=>{
    const points=helpers.create(THREE,1),state=points.userData.clSediment,attribute=points.geometry.getAttribute('clSedimentVariant'),array=attribute.array,before=Array.from(array),version=attribute.version;
    for(let i=0;i<800;i++)helpers.update(state,1/60,step(i*.08,(i+1)*.08),()=>0);
    assert.ok(state.emitted>state.count*3,'fixture did not recycle the pool');
    assert.equal(points.geometry.getAttribute('clSedimentVariant'),attribute);assert.equal(attribute.array,array);
    assert.deepEqual(Array.from(array),before);assert.equal(attribute.version,version,'static variation was uploaded again');
    assert.equal(points.children.length,0);assert.ok(!Array.isArray(points.material));assert.equal(points.material.map,null);
    dispose(points);
  });
});

dispose(fixture);

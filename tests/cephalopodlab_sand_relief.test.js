import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Task-local proposal: copy to tests/ before running, or provide both source/root
// environment overrides. No production ripple coefficients are copied here.
const require=createRequire(import.meta.url);
const directory=dirname(fileURLToPath(import.meta.url));
const repo=process.env.CEPHALOPOD_REPO_ROOT||(existsSync(resolve(directory,'../vendor/three-r128/three.min.js'))?resolve(directory,'..'):resolve(directory,'../../..'));
const THREE=require(resolve(repo,'vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||resolve(repo,'stem_lab/stem_tool_cephalopodlab.js'),'utf8').replace(/\r\n/g,'\n');

function braced(start){
  const open=source.indexOf('{',start);if(start<0||open<0)throw new Error('Missing actual-source block');
  let depth=0,quote='',lineComment=false,blockComment=false;
  for(let i=open;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='/'&&next==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    if(c==='}'&&!--depth)return source.slice(start,i+1);
  }
  throw new Error('Unterminated actual-source block');
}
function section(from,to){const start=source.indexOf(from),end=source.indexOf(to,start);if(start<0||end<=start)throw new Error('Missing actual sand section '+from);return source.slice(start,end);}
function onlyMatch(text,expression,name){const matches=[...text.matchAll(expression)];if(matches.length!==1)throw new Error('Expected one '+name+', found '+matches.length);return matches[0];}
const helper=braced(source.indexOf('function shadeCLHuntSandLight('));
const visualMath=Object.create(Math);visualMath.random=()=>{throw new Error('Sand shader consumed simulation RNG');};
const shade=new Function('Math',helper+';return shadeCLHuntSandLight;')(visualMath);
const callback=onlyMatch(source,/        floor\.material\.onBeforeCompile=function\(shader\)\{[^\n]+\};/g,'actual sand callback')[0];
const cache=onlyMatch(source,/        floor\.material\.customProgramCacheKey=function\(\)\{[^\n]+\};/g,'actual sand cache key')[0];
const materialSource=section('        var floor = new THREE.Mesh(floorGeo,','        var sandDownwelling=');
const downwellingSource=onlyMatch(source,/        var sandDownwelling=\{value:[^\n]+\};/g,'actual sand downwelling object')[0];

function plainShader(){return{uniforms:{sentinel:{value:7}},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};}
function assembled(scalar={value:1}){
  const shader=plainShader();
  shade(shader,scalar);return shader;
}
function ownedInjection(shader,chunk){
  const marker='#include <'+chunk+'>\n',start=shader.fragmentShader.indexOf(marker);
  if(start<0)throw new Error('Missing actual shader stage '+chunk);
  const from=start+marker.length,end=shader.fragmentShader.indexOf('#include <',from);
  if(end<from)throw new Error('Missing following shader stage '+chunk);
  return shader.fragmentShader.slice(from,end).trim();
}
const actual=assembled();
// Execute the actual scalar geology helpers when testing the inherited shallow
// region. Pass61's shelf/deep material and gradients have their own live tests.
const shelfHelpers=[...actual.fragmentShader.matchAll(/float (clShelf\w+)\(([^)]*)\)\{([^}]+)\}/g)].map(([,name,args,body])=>'function '+name+'('+args.replace(/float /g,'')+'){'+body.replace(/\bfloat\s+/g,'let ')+'}').join('\n');
const colorSnippet=ownedInjection(actual,'color_fragment');
const reliefSnippet=ownedInjection(actual,'normal_fragment_maps');
const roughnessSnippet=ownedInjection(actual,'roughnessmap_fragment');
const colorWrite=onlyMatch(colorSnippet,/diffuseColor\.rgb\*=([^\n]+clSandDownwelling\));/g,'actual albedo write');
const colorPrefix=colorSnippet.slice(0,colorWrite.index).trim();
const albedoExpression=colorWrite[1].slice(0,colorWrite[1].indexOf('*mix('));
if(!albedoExpression||!colorWrite[1].includes('*mix('))throw new Error('Cannot isolate the actual pre-downwelling albedo factor');
const gradientWrite=onlyMatch(reliefSnippet,/vec2 clSandGradient=([^\n]+);/g,'actual analytic gradient');
const amplitudeExpression=onlyMatch(gradientWrite[1],/^(\([^)]*\))\*clRippleSlope\*clRipplePhaseGradient\+/g,'actual height amplitude')[1];
const capWrite=onlyMatch(reliefSnippet,/clSandGradient\*=([^\n]+);/g,'actual slope cap')[0];
const rawRelief=reliefSnippet.slice(0,reliefSnippet.indexOf(capWrite)).trim();

// This narrow preprocessor executes only this material's owned capability branch.
// Native compilation/prefix verification remains in the browser profile.
function capabilityBranch(snippet,enabled){
  const lines=snippet.split('\n'),active=[true],out=[];
  for(const raw of lines){
    const line=raw.trim();
    if(line==='#if CL_SAND_DERIVATIVES'){active.push(active.at(-1)&&enabled);continue;}
    if(line==='#endif'){if(active.length===1)throw new Error('Unexpected owned #endif');active.pop();continue;}
    if(line.startsWith('#'))throw new Error('Unsupported owned shader directive '+line);
    if(active.at(-1))out.push(raw);
  }
  if(active.length!==1)throw new Error('Unclosed owned capability branch');
  return out.join('\n');
}
// The gradient prefix ends inside its capability branch, so close that exact
// extracted branch for the adapter before preprocessing; no arithmetic changes.
const closedRawRelief=rawRelief+'\n#endif';
function scalarize(snippet){return snippet.replace(/\b(?:float|vec2)\s+(?=[A-Za-z_]\w*)/g,'let ');}
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const smoothstep=(low,high,value)=>{const t=clamp((value-low)/(high-low),0,1);return t*t*(3-2*t);};
function numerical(enabled){
  const numericColor=capabilityBranch(colorPrefix,enabled),numericRelief=capabilityBranch(closedRawRelief,enabled),numericRoughness=capabilityBranch(roughnessSnippet,enabled);
  const program=scalarize(numericColor+'\n'+numericRelief+'\n'+numericRoughness);
  const component=new Function('clSandWorld','fwidth','vec2','sin','cos','smoothstep','clamp','roughnessFactor','mix','sqrt',shelfHelpers+'\n'+program+'\nreturn {phase:clRipplePhase,patch:clPatches,wave:clRippleWave,aa:clRippleAA,aa2:clRippleHarmonicAA,amplitude:'+amplitudeExpression+',height:('+amplitudeExpression+')*clRippleWave,albedo:'+albedoExpression+',roughness:roughnessFactor,raw:'+(enabled?'clSandGradient':'0')+'};');
  const cap=enabled?new Function('clSandGradient','min','max','length',capWrite+';return clSandGradient;'):()=>0;
  return{
    ownedSource:numericColor+'\n'+numericRelief+'\n'+numericRoughness,
    at(x,z,footprint){
      const world={x,y:0,z},run=axis=>component(world,()=>footprint,(a,b)=>axis?b:a,Math.sin,Math.cos,smoothstep,clamp,0.94,(a,b,t)=>a+(b-a)*t,Math.sqrt);
      const xSample=run(0),zSample=run(1),raw=[xSample.raw,zSample.raw],magnitude=Math.hypot(...raw);
      return{...xSample,raw,capped:raw.map(value=>cap(value,Math.min,Math.max,()=>magnitude))};
    }
  };
}
function liveMaterial(isWebGL2,derivatives){
  const requested=[],renderer={capabilities:{isWebGL2},extensions:{has(name){requested.push(name);return derivatives;}}};
  const build=new Function('THREE','Math','renderer','floorGeo','sandTex','scene',materialSource+downwellingSource+helper+'\n'+callback+'\n'+cache+'\nreturn{floor:floor,sandDownwelling:sandDownwelling};');
  const floorGeo=new THREE.BufferGeometry(),sandTex=new THREE.Texture(),scene=new THREE.Scene();
  const live=build(THREE,visualMath,renderer,floorGeo,sandTex,scene);
  return{...live,floorGeo,sandTex,requested,dispose(){floorGeo.dispose();sandTex.dispose();live.floor.material.dispose();}};
}
// x<=24 is the actual shallow shelf; keep distant world-coordinate coverage.
const xs=[-500,-498.0001,-498,-497.9999,-18.0001,-18,-6,0,6,17.9999,18,18.0001,23.9999,24];
const zs=[-500,-498,-18,-6,0,6,18,497.9999,498,500];
const finiteValues=row=>[row.phase,row.patch,row.wave,row.aa,row.aa2,row.amplitude,row.height,row.albedo,row.roughness,...row.raw,...row.capped];

describe('Cephalopod Hunter inherited shallow static sand relief',()=>{
  it('assembles the actual r128 shader and floor material with shared downwelling, capability defines and no extra texture lookup or RNG',()=>{
    expect(THREE.REVISION).toBe('128');
    expect(THREE.ShaderChunk.roughnessmap_fragment).toContain('float roughnessFactor = roughness;');
    const shared={value:0.6},first=assembled(shared),second=assembled(shared);
    expect(first.uniforms.clSandDownwelling).toBe(shared);expect(second.uniforms.clSandDownwelling).toBe(shared);
    expect(Object.keys(first.uniforms)).toEqual(['sentinel','clSandDownwelling']);
    expect(first.uniforms.sentinel.value).toBe(7);
    expect(first.vertexShader).toContain('clSandWorld=(modelMatrix*vec4(position,1.0)).xyz;');
    for(const chunk of ['color_fragment','roughnessmap_fragment','normal_fragment_maps'])expect(first.fragmentShader).toContain('#include <'+chunk+'>');
    expect(first.fragmentShader.indexOf('clRipplePhase=')).toBeLessThan(first.fragmentShader.indexOf('roughnessFactor=clamp('));
    expect(first.fragmentShader.indexOf('roughnessFactor=clamp(')).toBeLessThan(first.fragmentShader.indexOf('clSandGradient='));
    expect((first.fragmentShader.match(/texture2D\s*\(/g)||[]).length).toBe((THREE.ShaderLib.standard.fragmentShader.match(/texture2D\s*\(/g)||[]).length);
    expect(helper+materialSource+callback+cache).not.toMatch(/Math\.random|\btime\b|\bfor\s*\(|\bwhile\s*\(/);
    expect(first.fragmentShader).not.toContain('\\n');
    for(const [webgl2,extension,expected]of[[true,false,1],[false,true,1],[false,false,0]]){
      const live=liveMaterial(webgl2,extension);
      try{
        expect(live.floor.material.defines.CL_SAND_DERIVATIVES).toBe(expected);
        expect(live.floor.material.extensions.derivatives).toBe(!!expected);
        expect(live.requested).toEqual(webgl2?[]:['OES_standard_derivatives']);
        expect(live.floor.material.map).toBe(live.sandTex);expect(live.floor.geometry).toBe(live.floorGeo);
        expect(live.floor.material.roughness).toBe(0.94);expect(live.floor.material.metalness).toBe(0);
        expect(live.floor.material.transparent).toBe(false);expect(live.floor.material.depthWrite).toBe(true);
        expect(live.floor.receiveShadow).toBe(true);
        const shader=plainShader();live.floor.material.onBeforeCompile(shader);
        expect(shader.uniforms.clSandDownwelling).toBe(live.sandDownwelling);
        live.sandDownwelling.value=0.17;expect(shader.uniforms.clSandDownwelling.value).toBe(0.17);
      }finally{live.dispose();}
    }
  });

  it('matches the actual analytic gradient to an independent height stencil and bounds finite slopes across distant world coordinates and tile boundaries',()=>{
    const field=numerical(true),epsilon=0.0001;
    for(const x of xs)for(const z of zs)for(const footprint of [0,0.15,0.8,1.6,2]){
      const row=field.at(x,z,footprint),neighbors=[field.at(x+epsilon,z,footprint),field.at(x-epsilon,z,footprint),field.at(x,z+epsilon,footprint),field.at(x,z-epsilon,footprint)];
      expect(finiteValues(row).every(Number.isFinite)).toBe(true);
      for(const neighbor of neighbors){expect(neighbor.aa).toBe(row.aa);expect(neighbor.aa2).toBe(row.aa2);}
      const derivative=[(neighbors[0].height-neighbors[1].height)/(2*epsilon),(neighbors[2].height-neighbors[3].height)/(2*epsilon)];
      derivative.forEach((value,axis)=>expect(Math.abs(value-row.raw[axis])).toBeLessThan(0.0000002));
      expect(Math.hypot(...row.capped)).toBeLessThanOrEqual(0.24+1e-12);
      const rawMagnitude=Math.hypot(...row.raw),cappedMagnitude=Math.hypot(...row.capped);
      if(rawMagnitude<0.24)row.capped.forEach((value,axis)=>expect(value).toBe(row.raw[axis]));
      else expect(cappedMagnitude).toBeCloseTo(0.24,12);
      // Direction must survive the bounded cap: an arbitrary component clamp fails here.
      expect(Math.abs(row.raw[0]*row.capped[1]-row.raw[1]*row.capped[0])).toBeLessThan(1e-12);
    }
    // Both sides of an actual twelve-unit snapped-tile boundary use continuous
    // world coordinates, rather than restarting the relief in a local tile.
    for(const boundary of [-498,-18,-6,6,18]){
      const a=field.at(boundary-epsilon,3.17,0),b=field.at(boundary+epsilon,3.17,0);
      expect(Math.abs(a.height-b.height)).toBeLessThan(0.0001);
      expect(Math.abs(a.albedo-b.albedo)).toBeLessThan(0.0001);
    }
  });

  it('filters the actual two harmonics separately to steady coarse tint while maintaining positive albedo, relief envelope and restrained roughness',()=>{
    const field=numerical(true),footprints=[0,0.05,0.2,0.4,0.6,0.9,1.2,1.8,2,10];
    for(const x of xs)for(const z of zs){
      let previous={aa:Infinity,aa2:Infinity};
      for(const footprint of footprints){
        const row=field.at(x,z,footprint);
        expect(row.aa).toBeGreaterThanOrEqual(0);expect(row.aa).toBeLessThanOrEqual(1);expect(row.aa2).toBeGreaterThanOrEqual(0);expect(row.aa2).toBeLessThanOrEqual(1);
        expect(row.aa).toBeLessThanOrEqual(previous.aa);expect(row.aa2).toBeLessThanOrEqual(previous.aa2);
        expect(row.aa2).toBeLessThanOrEqual(row.aa);
        expect(row.amplitude).toBeGreaterThanOrEqual(0.011-1e-12);expect(row.amplitude).toBeLessThanOrEqual(0.027+1e-12);
        expect(row.albedo).toBeGreaterThanOrEqual(0.79764-1e-12);expect(row.albedo).toBeLessThanOrEqual(0.94236+1e-12);
        expect(row.roughness).toBeGreaterThanOrEqual(0.90);expect(row.roughness).toBeLessThanOrEqual(0.98);
        previous=row;
      }
      const near=field.at(x,z,0),separate=field.at(x,z,0.9),far=field.at(x,z,1.8),beyond=field.at(x,z,10);
      expect(near.aa).toBe(1);expect(near.aa2).toBe(1);
      expect(separate.aa).toBeGreaterThan(0);expect(separate.aa2).toBe(0);
      expect(far.aa).toBe(0);expect(far.aa2).toBe(0);expect(far.wave===0).toBe(true);expect(far.raw.every(value=>value===0)).toBe(true);expect(far.capped.every(value=>value===0)).toBe(true);
      expect(beyond.albedo).toBe(far.albedo);expect(beyond.roughness).toBe(far.roughness);expect(beyond.height===0).toBe(true);
    }
  });

  it('uses the actual derivative-unavailable material define to remove owned derivative and normal-relief code and retain steady coarse shading',()=>{
    const live=liveMaterial(false,false);
    try{
      const enabled=!!live.floor.material.defines.CL_SAND_DERIVATIVES,field=numerical(enabled);
      expect(enabled).toBe(false);expect(live.floor.material.extensions.derivatives).toBe(false);
      expect(field.ownedSource).not.toMatch(/\bfwidth\s*\(|\bdFd[xy]\s*\(|clRipplePhaseGradient|clSandGradient\s*=|normal\s*=/);
      expect(capabilityBranch(reliefSnippet,enabled).trim()).toBe('');
      for(const x of xs)for(const z of zs){
        const first=field.at(x,z,0);
        expect(finiteValues(first).every(Number.isFinite)).toBe(true);
        expect(first.aa).toBe(0);expect(first.aa2).toBe(0);expect(first.wave===0).toBe(true);expect(first.raw).toEqual([0,0]);expect(first.capped).toEqual([0,0]);
        expect(first.albedo).toBeGreaterThan(0);expect(first.roughness).toBeGreaterThanOrEqual(0.90);expect(first.roughness).toBeLessThanOrEqual(0.98);
        for(const footprint of [0.2,0.9,1.8,10]){
          const row=field.at(x,z,footprint);
          expect(row.albedo).toBe(first.albedo);expect(row.roughness).toBe(first.roughness);expect(row.height===0).toBe(true);
        }
      }
    }finally{live.dispose();}
  });
});

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
function region(from,to){const start=source.indexOf(from),end=source.indexOf(to,start);assert.ok(start>=0&&end>start,from);return source.slice(start,end);}
const fieldSource=region('        var sandHabitat=','        function shadeCLHuntSandLight(');
const shaderSource=region('        function shadeCLHuntSandLight(','        floor.material.onBeforeCompile=');
const denyRandom=Object.create(Math);denyRandom.random=()=>{throw new Error('Habitat shading consumed simulation RNG');};
const shade=new Function(shaderSource+';return shadeCLHuntSandLight;')();
function field(){return new Function('THREE','Math',fieldSource+';return {uniform:sandHabitat,refresh:updateCLHuntSandHabitat};')(THREE,denyRandom);}
function plain(){return {uniforms:{sentinel:{value:7}},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};}
function stage(shader,name){const marker='#include <'+name+'>\n',start=shader.fragmentShader.indexOf(marker);assert.ok(start>=0,name);const end=shader.fragmentShader.indexOf('#include <',start+marker.length);assert.ok(end>start,name);return shader.fragmentShader.slice(start+marker.length,end);}
const compiled=plain();shade(compiled,{value:1},field().uniform);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const builtins={abs:Math.abs,min:Math.min,max:Math.max,sin:Math.sin,sqrt:Math.sqrt,smoothstep,step:(a,x)=>x<a?0:1};
// Execute the scalar helpers from the actual emitted GLSL. Assertions below use
// independent bounds, protected areas, and continuity rather than copied formulas.
function scalar(name){
  const match=compiled.fragmentShader.match(new RegExp('float '+name+'\\(([^)]*)\\)\\{([^}]+)\\}'));
  assert.ok(match,name);
  const args=match[1].replace(/\b(?:float|vec4)\s+/g,'').split(',');
  const fn=new Function(...Object.keys(builtins),...args,match[2].replace(/\bfloat\s+/g,'let '));
  return (...values)=>fn(...Object.values(builtins),...values);
}
const bed=scalar('clHabitatBed'),clearSand=scalar('clHabitatClearSand'),shallow=scalar('clHabitatShallow');
const blendCode=stage(compiled,'color_fragment').match(/float clHabitatCover=[\s\S]+?float clHabitatWeight=[^;]+;/)?.[0];
assert.ok(blendCode,'Actual habitat blending statements missing');
const blend=new Function('max','clHabitatBed','clHabitatClearSand','clHabitatShallow','clSandX','clSandZ','clSandHabitat','clShelfRock','clShelfDeep',blendCode.replace(/\bfloat\s+/g,'let ')+';return {cover:clHabitatCover,weight:clHabitatWeight};');
function sample(x,z,beds,rock=0,deep=0){return blend(Math.max,bed,clearSand,shallow,x,z,beds,rock,deep);}
function layout(){
  const groves=Array.from({length:5},(_,i)=>({rockIndex:i,phase:.7+i*.61}));
  const rocks=groves.map((_,i)=>({position:{x:-12-i*14,z:8+i*19},userData:{reefFootprint:{minX:-2,maxX:2,minZ:-1,maxZ:1}}}));
  return {groves,rocks};
}

describe('Cephalopod habitat-grounded seabed tones',()=>{
  it('retains five uniform vectors through valid, recycled, missing, and invalid grove anchors without RNG',()=>{
    const {uniform,refresh}=field(),array=uniform.value,vectors=[...array],{groves,rocks}=layout();
    assert.equal(array.length,5);assert.ok(array.every(v=>v.isVector4&&v.toArray().every(Number.isFinite)&&v.z===0),'Initial beds are finite and disabled by their zero radius');
    const before=JSON.stringify({groves,rocks});refresh(uniform,groves,rocks);
    assert.equal(JSON.stringify({groves,rocks}),before,'Visual field mutated habitat actors');
    for(let i=0;i<5;i++){
      assert.equal(array[i],vectors[i]);assert.equal(array[i].x,rocks[i].position.x+Math.cos(groves[i].phase));assert.equal(array[i].y,rocks[i].position.z+Math.sin(groves[i].phase));
      assert.ok(array[i].z>=6&&array[i].z<=10);assert.equal(array[i].w,groves[i].phase);
    }
    const initial=array.map(v=>v.toArray());
    for(let pass=0;pass<8;pass++)refresh(uniform,groves,rocks);
    assert.equal(uniform.value,array);assert.deepEqual(array.map(v=>v.toArray()),initial);
    rocks[0].position.x-=120;rocks[0].position.z+=60;refresh(uniform,groves,rocks);
    assert.ok(Math.abs(array[0].x-(initial[0][0]-120))<1e-12);assert.ok(Math.abs(array[0].y-(initial[0][1]+60))<1e-12);assert.deepEqual(array.slice(1).map(v=>v.toArray()),initial.slice(1));
    groves[0].rockIndex=-1;rocks[1].position.x=NaN;rocks[2].userData.reefFootprint.maxX=Infinity;groves[3].phase=NaN;rocks[4].userData.reefFootprint=null;
    refresh(uniform,groves,rocks);assert.ok(array.every(v=>v.toArray().every(n=>n===0)));assert.deepEqual(array,vectors);
    assert.ok(!/\bnew\b|\.map\(|\.filter\(|\.concat\(/.test(fieldSource.slice(fieldSource.indexOf('function updateCLHuntSandHabitat'))),'Refresh must not allocate pooled resources or scratch arrays');
  });

  it('uses shared uniforms across shader compilation while preserving existing vertex, relief and roughness stages',()=>{
    const {uniform,refresh}=field(),downwelling={value:.6},base=plain(),first=plain(),second=plain();
    shade(base,downwelling);shade(first,downwelling,uniform);shade(second,downwelling,uniform);
    assert.deepEqual(Object.keys(base.uniforms),['sentinel','clSandDownwelling']);
    assert.equal(first.uniforms.clSandHabitat,uniform);assert.equal(second.uniforms.clSandHabitat,uniform);assert.equal(first.uniforms.clSandDownwelling,downwelling);
    assert.equal(first.vertexShader,base.vertexShader);assert.equal(stage(first,'normal_fragment_maps'),stage(base,'normal_fragment_maps'));assert.equal(stage(first,'roughnessmap_fragment'),stage(base,'roughnessmap_fragment'));
    assert.ok(stage(first,'color_fragment').startsWith(stage(base,'color_fragment').trimEnd()),'Existing sand and geology colors must run before habitat tint');
    assert.equal((first.fragmentShader.match(/texture2D\s*\(/g)||[]).length,(base.fragmentShader.match(/texture2D\s*\(/g)||[]).length);
    assert.ok(!/\btime\b|Math\.random/.test(shaderSource));assert.ok(first.vertexShader.includes('clSandWorld=(modelMatrix*vec4(position,1.0)).xyz;'));
    const {groves,rocks}=layout();refresh(uniform,groves,rocks);assert.equal(first.uniforms.clSandHabitat.value[0].x,rocks[0].position.x+Math.cos(groves[0].phase));
  });

  it('keeps the full opening and mission sand route unchanged even when a bed overlaps them',()=>{
    const beds=Array.from({length:5},()=>new THREE.Vector4(2,2,10,.7));
    assert.ok(sample(2,2,beds).cover>.5,'Fixture must put visible habitat coverage across the route');
    for(const [minX,maxX,minZ,maxZ] of [[-4.5,4.5,-5,4.5],[0,7,-5,10]])for(let x=minX;x<=maxX;x+=.5)for(let z=minZ;z<=maxZ;z+=.5){assert.equal(clearSand(x,z),0);assert.equal(sample(x,z,beds).weight,0);}
    assert.equal(clearSand(-7,0),1);assert.equal(clearSand(10,0),1);
    for(const epsilon of [1e-6,1e-4,.01])assert.ok(clearSand(-4.5-epsilon,0)<epsilon*.02,'Protected route must feather smoothly');
  });

  it('excludes exposed rock and deep silt and fades out before the shelf drop-off',()=>{
    const beds=Array.from({length:5},()=>new THREE.Vector4(20,20,10,1.3));
    assert.ok(sample(20,20,beds).weight>.5);
    for(const x of [-500,-20,0,20,21,22,23,24,30,60,500])for(const z of [-100,0,20,100]){
      assert.equal(sample(x,z,beds,1,0).weight,0);assert.equal(sample(x,z,beds,0,1).weight,0);
      if(x>=24)assert.equal(sample(x,z,beds).weight,0);
    }
    assert.equal(shallow(21,0,0),1);assert.equal(shallow(24,0,0),0);assert.equal(shallow(22.5,0,0),.5);assert.equal(shallow(-10,.5,.5),.25);
    for(const edge of [21,24])assert.ok(Math.abs(shallow(edge-1e-5,0,0)-shallow(edge+1e-5,0,0))<1e-8);
  });

  it('bounds irregular feathering without overlap darkening or world-tile discontinuities',()=>{
    const anchor=new THREE.Vector4(-30,30,8,1.3),beds=Array.from({length:5},()=>anchor.clone());
    const cardinal=[[1,0],[0,1],[-1,0],[0,-1]].map(([x,z])=>bed(anchor.x+x*7,anchor.y+z*7,anchor));
    assert.ok(Math.max(...cardinal)-Math.min(...cardinal)>.05,'A circular decal would not ground the irregular grove');
    assert.ok(bed(anchor.x,anchor.y,anchor)>.65);assert.equal(bed(anchor.x+100,anchor.y,anchor),0);assert.equal(bed(-30,30,new THREE.Vector4()),0);
    for(let x=-55;x<=-5;x+=.5)for(let z=5;z<=55;z+=.5){
      const row=sample(x,z,beds);assert.ok(Number.isFinite(row.weight)&&row.weight>=0&&row.weight<=1);assert.equal(row.cover,bed(x,z,anchor),'Overlapping beds must not accumulate darkness');
      for(const channel of [.78,.84,.80])assert.ok(1+(channel-1)*row.weight>=channel);
    }
    for(const x of [-36,-24,-12])for(const z of [18,30,42]){
      const world=sample(x,z,beds).weight;
      for(const tile of [-48,-36,-24,-12,0])assert.equal(sample((x-tile)+tile,z,beds).weight,world);
      assert.ok(Math.abs(sample(x-1e-5,z,beds).weight-sample(x+1e-5,z,beds).weight)<1e-5);
    }
  });

  it('refreshes after initial placement and only after rock recycling in the existing stream',()=>{
    const initial=source.match(/settleCLHuntHabitatPlants\(null,true\);\s*updateCLHuntSandHabitat\(sandHabitat,clHabitatGroves,rocks\);/)?.[0];
    const recycled=source.match(/settleCLHuntHabitatPlants\(octopus.position,reefRocksMoved\);\s*if\(reefRocksMoved\)updateCLHuntSandHabitat\(sandHabitat,clHabitatGroves,rocks\);/)?.[0];
    assert.ok(initial&&recycled,'Both real placement paths must refresh the field');
    const {uniform,refresh}=field(),{groves,rocks}=layout();let settles=0,refreshes=0;
    const settle=()=>{settles++;rocks[0].position.x-=1;};
    const update=(...args)=>{refreshes++;refresh(...args);};
    new Function('settleCLHuntHabitatPlants','updateCLHuntSandHabitat','sandHabitat','clHabitatGroves','rocks',initial)(settle,update,uniform,groves,rocks);
    assert.equal(settles,1);assert.equal(refreshes,1);assert.equal(uniform.value[0].x,rocks[0].position.x+Math.cos(groves[0].phase));
    const stream=new Function('settleCLHuntHabitatPlants','updateCLHuntSandHabitat','sandHabitat','clHabitatGroves','rocks','octopus','reefRocksMoved',recycled),held=uniform.value[0].x;
    stream(settle,update,uniform,groves,rocks,{position:{x:0,z:0}},false);assert.equal(refreshes,1);assert.equal(uniform.value[0].x,held);
    stream(settle,update,uniform,groves,rocks,{position:{x:0,z:0}},true);assert.equal(settles,3);assert.equal(refreshes,2);assert.equal(uniform.value[0].x,rocks[0].position.x+Math.cos(groves[0].phase));
  });
});

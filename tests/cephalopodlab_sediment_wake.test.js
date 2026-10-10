import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url), THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
// Load the production functions rather than a separately maintained test model.
function extract(name){
  const start=source.indexOf('function '+name+'(');
  assert.ok(start>=0,'missing '+name);
  const next=source.indexOf('\nfunction ',start+1);
  assert.ok(next>start,'missing boundary for '+name);
  return source.slice(start,next);
}
const helpers=new Function('THREE',['createCLHuntSedimentState','updateCLHuntSedimentWake','shadeCLHuntSedimentWake','createCLHuntSedimentWake'].map(extract).join('\n')+'\n;return {create:createCLHuntSedimentState,update:updateCLHuntSedimentWake,points:createCLHuntSedimentWake,shade:shadeCLHuntSedimentWake};')(THREE);
const floor=()=>0;
function input(overrides={}){return {fromX:0,fromZ:0,x:.08,z:0,height:.55,floorRestY:.55,bodyScale:1,jetting:true,substrate:'sand',reducedMotion:false,...overrides};}
function snapshot(state){return JSON.stringify(state,(_key,value)=>ArrayBuffer.isView(value)?Array.from(value):value);}
function emit(state,count=16,overrides={},terrain=floor){
  for(let i=0;i<count;i++)helpers.update(state,1/60,input({fromX:i*.08,x:(i+1)*.08,...overrides}),terrain);
  return state;
}

describe('Cephalopod Hunter grounded sediment wake',()=>{
  it('emits only when a jet actually moves close to a sandy floor',()=>{
    const state=helpers.create(64);
    emit(state);
    assert.ok(state.activeCount>0);
    for(const patch of [
      {jetting:false}, {x:0,fromX:0,z:0,fromZ:0}, {x:.001,fromX:0},
      {x:3,fromX:0}, {substrate:'rock'}, {substrate:'coral'},
      {height:1.25},
    ]){
      const rejected=helpers.create(64);
      emit(rejected,16,patch);
      assert.equal(rejected.activeCount,0,JSON.stringify(patch));
    }
    const steep=helpers.create(64);
    for(let i=0;i<16;i++)helpers.update(steep,1/60,input({fromX:i*.08,x:(i+1)*.08,height:(i+1)*.08+.55}),x=>x);
    assert.equal(steep.activeCount,0,'sand should not blow out of a steep cliff');
  });
  it('produces a deterministic local cloud without consuming shared random state',()=>{
    let a,b;const original=Math.random;
    try{
      Math.random=()=>{throw Error('Sediment consumed global randomness');};
      a=helpers.create(64);b=helpers.create(64);
      emit(a,120);emit(b,120);
    }finally{Math.random=original;}
    assert.equal(snapshot(a),snapshot(b));
    assert.ok(a.activeCount>0);
  });
  it('ties emission density to resolved distance across the native timestep range',()=>{
    const emitted=[];
    for(const hz of [60,30,20]){
      const state=helpers.create(64);
      for(let i=0;i<hz;i++)helpers.update(state,1/hz,input({fromX:i*4.8/hz,x:(i+1)*4.8/hz}),floor);
      emitted.push(state.emitted);
    }
    assert.ok(emitted[0]>0);
    assert.deepEqual(emitted,[emitted[0],emitted[0],emitted[0]]);
  });
  it('checks the actual birth locations when a sandy path borders rock',()=>{
    const allSand=helpers.create(64),boundary=helpers.create(64);
    helpers.update(allSand,.05,input({fromX:0,x:1,substrateAt:()=> 'sand'}),floor);
    helpers.update(boundary,.05,input({fromX:0,x:1,substrateAt:x=>x<.5?'rock':'sand'}),floor);
    assert.ok(boundary.emitted>0,'the sandy part of the path should still stir');
    assert.ok(boundary.emitted<allSand.emitted,'rock-side births were not rejected');
    for(let i=0;i<boundary.count;i++)if(boundary.lifetimes[i]>0)assert.ok(boundary.origins[i*3]>=.5);
    const rock=helpers.create(64);
    helpers.update(rock,.05,input({fromX:0,x:1,substrateAt:()=> 'rock'}),floor);
    assert.equal(rock.activeCount,0);assert.equal(rock.emitted,0);assert.equal(rock.cursor,0);
  });
  it('retains a bounded pool and every typed buffer throughout sustained movement',()=>{
    const state=helpers.create(64),buffers=Object.entries(state).filter(([,value])=>ArrayBuffer.isView(value));
    assert.ok(buffers.length>0);
    for(let i=0;i<1200;i++){
      helpers.update(state,1/60,input({fromX:i*.08,x:(i+1)*.08}),floor);
      assert.ok(state.activeCount>=0&&state.activeCount<=64);
      for(const [key,value] of buffers)assert.equal(state[key],value,key+' allocated another buffer');
    }
    assert.ok(state.activeCount>0);
    for(const [,value] of buffers)for(const n of value)assert.ok(Number.isFinite(n));
  });
  it('leaves the entire wake frozen at zero timestep, including reduced-motion input',()=>{
    const state=emit(helpers.create(64)),before=snapshot(state);
    helpers.update(state,0,input(),floor);
    assert.equal(snapshot(state),before);
    helpers.update(state,0,input({reducedMotion:true,x:20,fromX:19}),floor);
    assert.equal(snapshot(state),before);
  });
  it('clears motion effects immediately on a positive reduced-motion step and does not re-emit',()=>{
    const state=emit(helpers.create(64));assert.ok(state.activeCount>0);
    helpers.update(state,1/60,input({reducedMotion:true}),floor);
    assert.equal(state.activeCount,0);
    emit(state,30,{reducedMotion:true});
    assert.equal(state.activeCount,0);
  });
  it('lets a stopped wake settle and expire without needing further player movement',()=>{
    const state=emit(helpers.create(64)),before=snapshot(state);
    helpers.update(state,1/60,input({x:1.28,fromX:1.28,jetting:false}),floor);
    assert.notEqual(snapshot(state),before);
    assert.ok(state.activeCount>0,'a live cloud should not disappear on release');
    emit(state,600,{x:1.28,fromX:1.28,jetting:false});
    assert.equal(state.activeCount,0);
  });
  it('keeps an existing cloud in world space when the player moves elsewhere and above the local bed',()=>{
    const state=emit(helpers.create(64)),origins=Array.from(state.origins),before=Array.from(state.positions);
    const live=Array.from(state.lifetimes).map((life,i)=>life>0?i:-1).filter(i=>i>=0);
    helpers.update(state,.05,input({fromX:100,x:100,fromZ:80,z:80,height:3,jetting:false}),floor);
    assert.deepEqual(Array.from(state.origins),origins);
    for(const i of live){
      assert.ok(Math.abs(state.positions[i*3]-before[i*3])<.05,'player motion translated an existing cloud');
      assert.ok(Math.abs(state.positions[i*3+2]-before[i*3+2])<.05);
      assert.ok(state.positions[i*3+1]>=.0249,'particle penetrated the floor');
    }
    for(let frame=0;frame<100;frame++){
      helpers.update(state,1/60,input({fromX:100,x:100,jetting:false}),floor);
      for(let i=0;i<state.count;i++)if(state.lifetimes[i]>0){assert.ok(state.positions[i*3+1]>=.0249);assert.ok(state.alphas[i]>=0&&state.alphas[i]<.5);}
    }
  });
  it('connects the retained arrays to a single fogged depth-tested Three.js points object',()=>{
    const points=helpers.points(THREE,1.5),state=points.userData.clSediment;
    assert.ok(points instanceof THREE.Points);assert.equal(points.name,'cl-sediment-wake');
    assert.equal(points.geometry.getAttribute('position').array,state.positions);
    assert.equal(points.geometry.getAttribute('clSedimentAlpha').array,state.alphas);
    assert.equal(points.geometry.getAttribute('clSedimentScale').array,state.scales);
    assert.equal(points.material.depthWrite,false);assert.equal(points.material.depthTest,true);assert.equal(points.material.fog,true);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.points.vertexShader,fragmentShader:THREE.ShaderLib.points.fragmentShader};
    points.material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.clSedimentPixelRatio.value,1.5);
    assert.ok(shader.vertexShader.includes('clSedimentScale'));
    assert.ok(shader.fragmentShader.includes('#include <fog_fragment>'));
    assert.ok(shader.fragmentShader.includes('discard'));
    points.geometry.dispose();points.material.dispose();
  });
});

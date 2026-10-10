/* Independent, resource-light verification of the actual Pass55 helper. No browser/GPU. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const work=path.join(__dirname,'pass55-work');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const variant=process.argv[2]||'candidate';
assert.ok(['candidate','refined'].includes(variant),'variant must be candidate or refined');
const THREE=require(path.join(repo,'vendor/three-r128/three.min.js'));
const candidate=fs.readFileSync(path.join(work,variant==='refined'?'refined-source.js':'candidate-source.js'),'utf8');
const baseline=fs.readFileSync(path.join(work,'baseline-source.js'),'utf8');
const helper=fs.readFileSync(path.join(work,variant==='refined'?'refined-shade-water-surface.js':'shade-water-surface.js'),'utf8');
const guards=JSON.parse(fs.readFileSync(path.join(work,variant==='refined'?'refined-change-guards.json':'change-guards.json'),'utf8'));
let checks=[];
function check(name,fn){fn();checks.push(name);}
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const count=(s,t)=>s.split(t).length-1;
let recovered=candidate;
check('candidate and baseline SHA match declared guards',()=>{
  assert.equal(sha(candidate),guards.candidateSHA);assert.equal(sha(baseline),guards.baselineSHA);
});
check('exact inverse reconstructs all accepted gameplay and creature code',()=>{
  for(const g of [...guards.changes].reverse()){
    assert.equal(count(recovered,g.after),1);recovered=recovered.replace(g.after,g.before);
  }
  assert.equal(recovered,baseline);
  assert.equal(guards.changes.length,2);
  assert.ok(guards.changes[0].before.includes('var surfaceSheet'));
  assert.ok(guards.changes[1].before.includes('surfaceMat.opacity'));
});
check('candidate executes the reviewed actual helper',()=>assert.ok(candidate.includes(helper.trimEnd())));
const context={};vm.createContext(context);vm.runInContext(helper+'\nthis.shade=shadeCLHuntWaterSurface;',context);
function transformed(derivatives){
  const s={uniforms:{},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};
  const flow={value:0};context.shade(s,flow,derivatives);return {s,flow};
}
const filtered=transformed(true),plain=transformed(false);
check('vendored Three is r128 and all basic shader insertion anchors occur once',()=>{
  assert.equal(THREE.REVISION,'128');
  for(const [s,a] of [[THREE.ShaderLib.basic.vertexShader,'#include <common>'],[THREE.ShaderLib.basic.vertexShader,'#include <begin_vertex>'],[THREE.ShaderLib.basic.fragmentShader,'#include <common>'],[THREE.ShaderLib.basic.fragmentShader,'#include <color_fragment>']])assert.equal(count(s,a),1);
});
check('filtered shader retains projection, fog, encoding and alpha integration',()=>{
  assert.equal(filtered.s.uniforms.clSurfaceFlow,filtered.flow);
  assert.ok(filtered.s.vertexShader.includes('clSurfaceWorld=(modelMatrix*vec4(position,1.0)).xyz;'));
  for(const c of ['project_vertex','fog_fragment','encodings_fragment','alphamap_fragment','alphatest_fragment'])assert.ok((filtered.s.vertexShader+filtered.s.fragmentShader).includes('#include <'+c+'>'));
  assert.ok(filtered.s.fragmentShader.indexOf('diffuseColor.a*=')<filtered.s.fragmentShader.indexOf('#include <alphatest_fragment>'));
  assert.equal(count(filtered.s.fragmentShader,'fwidth('),2);
});
check('fallback shader contains no derivative instruction',()=>{
  assert.equal(count(plain.s.fragmentShader,'fwidth('),0);
  assert.ok(plain.s.fragmentShader.includes('float clSeaAA=0.0; float clSeaBA=0.0;'));
});
check('material keeps low-power suppression and source declares derivative/cache branches',()=>{
  assert.ok(candidate.includes('surfaceMat.extensions={derivatives:surfaceDerivatives}'));
  assert.ok(candidate.includes("renderer.capabilities.isWebGL2||renderer.extensions.has('OES_standard_derivatives')"));
  assert.ok(candidate.includes("'cl-water-surface-v55-'+(surfaceDerivatives?'filtered':'plain')"));
  const suppression='surfaceSheet.visible = !((!!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));';
  assert.ok(baseline.includes(suppression));assert.ok(candidate.includes(suppression));
});
// Evaluate the actual injected GLSL scalar/vector expressions, rather than a copied wave formula.
function evaluator(shader){
  const marker='#include <color_fragment>\n';
  let block=shader.fragmentShader.split(marker)[1].split('#include')[0].trim();
  block=block.replace('vec2 clSea=clSurfaceWorld.xz;','var clSea=[clSurfaceWorld[0],clSurfaceWorld[2]];')
    .replace('vec3 clSeaView=cameraPosition-clSurfaceWorld;','var clSeaView=cameraPosition.map((v,i)=>v-clSurfaceWorld[i]);')
    .replace(/\bfloat /g,'var ')
    .replace(/clSeaView.y/g,'clSeaView[1]')
    .replace(/diffuseColor.rgb\*=/g,'rgb*=')
    .replace(/diffuseColor.a\*=/g,'alpha*=');
  assert.ok(!/\bvec3\b/.test(block));
  const calculate=new Function('clSurfaceWorld','cameraPosition','clSurfaceFlow','footprints','smoothstep','sin','dot','vec2','abs','max','length','clSurfaceFilter',
    'var rgb=1,alpha=1,at=0;function fwidth(){return footprints[at++];}\n'+block+'\nreturn {rgb,alpha,aa:clSeaAA,ba:clSeaBA,angle:clSeaAngle};');
  return (world,camera,phase,footprints)=>calculate(world,camera,phase,footprints,smoothstep,Math.sin,(a,b)=>a[0]*b[0]+a[1]*b[1],(a,b)=>[a,b],Math.abs,Math.max,a=>Math.hypot(...a),v=>1-smoothstep(0.55,1.75,v));
}
function smoothstep(lo,hi,x){const t=Math.max(0,Math.min(1,(x-lo)/(hi-lo)));return t*t*(3-2*t);}
const evaluate=evaluator(filtered.s),evaluatePlain=evaluator(plain.s);
let ranges={rgb:[Infinity,-Infinity],alpha:[Infinity,-Infinity]},samples=0;
check('actual shader numeric field is finite and respects theoretical color/alpha bounds',()=>{
  for(let n=0;n<8192;n++){
    const x=Math.sin(n*0.731)*1200,z=Math.cos(n*1.271)*1200,phase=n*0.091;
    const camera=[x+Math.cos(n*.17)*300,21-Math.sin(n*.31)*60,z+Math.sin(n*.17)*300];
    const r=evaluate([x,21,z],camera,phase,[(n%41)/16,((n*7)%43)/17]);
    for(const v of Object.values(r))assert.ok(Number.isFinite(v));
    assert.ok(r.rgb>=0.88-1e-12&&r.rgb<=1.32+1e-12);
    const alphaBounds=variant==='refined'?[0.44,1.42]:[0.68,1.14];
    assert.ok(r.alpha>=alphaBounds[0]-1e-12&&r.alpha<=alphaBounds[1]+1e-12);
    for(const k of ['rgb','alpha']){ranges[k][0]=Math.min(ranges[k][0],r[k]);ranges[k][1]=Math.max(ranges[k][1],r[k]);}
    samples++;
  }
});
check('coarse derivative footprint completely restores flat surface',()=>{
  for(const world of [[0,21,0],[73,21,-21],[800,21,999]]){
    const r=evaluate(world,[1,-4,6],12,[2,2]);assert.equal(r.aa,0);assert.equal(r.ba,0);assert.equal(r.rgb,1);assert.equal(r.alpha,1);
  }
  const base=[13,21,-4],camera=[14,3,-3];
  const fine=evaluate(base,camera,10,[0.4,0.4]),mid=evaluate(base,camera,10,[1.15,1.15]),coarse=evaluate(base,camera,10,[1.8,1.8]);
  assert.equal(fine.aa,1);assert.ok(mid.aa>0&&mid.aa<1);assert.equal(coarse.aa,0);
});
check('near-horizon angle removes ripple contrast and singular view stays finite',()=>{
  for(const camera of [[0,21,0],[1000,21,0],[1000,20,0]]){
    const r=evaluate([0,21,0],camera,4,[0,0]);assert.equal(r.rgb,1);assert.equal(r.alpha,1);
  }
});
check('no-derivative path restores flat color independently of position/time/view',()=>{
  for(let n=0;n<128;n++){const r=evaluatePlain([n*17,21,-n*13],[n*11,-10,n*3],n*79,[]);assert.equal(r.rgb,1);assert.equal(r.alpha,1);}
});
check('world position field is continuous across recentering of the real plane transform',()=>{
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(400,400,1,1),new THREE.MeshBasicMaterial());plane.rotation.x=-Math.PI/2;
  const point=new THREE.Vector3(32,21,-17),worlds=[];
  for(const center of [[0,21,0],[12,21,-24],[-60,21,100]]){
    plane.position.set(...center);plane.updateMatrixWorld(true);
    const local=plane.worldToLocal(point.clone()),again=plane.localToWorld(local.clone());
    assert.ok(again.distanceTo(point)<1e-10);worlds.push(again.toArray());
  }
  const sampled=worlds.map(w=>evaluate(w,[1,4,3],5,[.2,.3]));
  for(const r of sampled.slice(1)){assert.ok(Math.abs(r.rgb-sampled[0].rgb)<1e-10);assert.ok(Math.abs(r.alpha-sampled[0].alpha)<1e-10);}
  assert.equal(plane.geometry.attributes.position.count,4);plane.geometry.dispose();plane.material.dispose();
});
check('clock remains inside unchanged world gate and freezes for pause/game-over/reduced motion',()=>{
  const gate='if (!gameState.gameOver && !gameState.paused && dt>0) {';
  const end='\n          }\n\n          if(!gameState.paused||inspection.active)updateDiveCamera(dt);';
  const start=candidate.indexOf(gate),close=candidate.indexOf(end,start),copy=candidate.indexOf('surfaceFlow.value=causticPhase;');
  assert.ok(start>=0&&copy>start&&copy<close);
  const phaseCode=candidate.match(/if\(!gameState\.a11y\.reducedMotion\)causticPhase\+=dt;/)[0];
  const copyCode='surfaceFlow.value=causticPhase;';
  const tick=new Function('gameState','dt','state','var causticPhase=state.phase,surfaceFlow=state.flow;'+gate+phaseCode+copyCode+'}state.phase=causticPhase;');
  const state={phase:7,flow:{value:7}},normal={gameOver:false,paused:false,a11y:{reducedMotion:false}};
  tick({...normal,paused:true},.05,state);assert.equal(state.phase,7);assert.equal(state.flow.value,7);
  tick({...normal,gameOver:true},.05,state);assert.equal(state.phase,7);
  tick({...normal,a11y:{reducedMotion:true}},.05,state);assert.equal(state.phase,7);
  tick(normal,0,state);assert.equal(state.phase,7);
  tick(normal,.05,state);assert.equal(state.phase,7.05);assert.equal(state.flow.value,7.05);
});
check('existing surface opacity, geometry and fog defaults remain unchanged',()=>{
  for(const line of [
    'var surfaceMat = new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });',
    'surfaceMat.opacity = (0.035 + 0.13 * dayMix)*depthLight;',
    'new THREE.PlaneGeometry(400, 400, 1, 1)',
    'surfaceSheet.position.y = 21;'])assert.ok(baseline.includes(line)&&candidate.includes(line));
});
const receipt={status:'passed',variant,checks:checks.length,checkNames:checks,numericSamples:samples,ranges,alphaTheoreticalBounds:variant==='refined'?[0.44,1.42]:[0.68,1.14],threeRevision:THREE.REVISION,candidateSHA:sha(candidate),baselineSHA:sha(baseline),inverseExact:true,scope:'Node helper/ShaderLib/numeric/clock/source verification; GPU compilation and image quality require native validation.'};
fs.writeFileSync(path.join(work,variant==='refined'?'refined-surface-cpu-review.json':'surface-cpu-review.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));

'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const work=path.join(__dirname,'pass55-work');
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const guards=JSON.parse(fs.readFileSync(path.join(work,'refined-change-guards.json'),'utf8'));
const refined=fs.readFileSync(path.join(work,'refined-source.js'),'utf8');
const baseline=fs.readFileSync(path.join(work,'baseline-source.js'),'utf8');
assert.equal(sha(refined),guards.candidateSHA);
assert.equal(sha(baseline),guards.baselineSHA);
const helper55="const assert=require('node:assert/strict');\nconst changes="+JSON.stringify(guards.changes,null,2)+";\n// Pass55 changes only existing surface presentation; preserve earlier exact source baselines.\nfunction restorePass55Source(source){\n  const animalOnly=source.trimStart().startsWith('function createCLHuntAnimal(');\n  assert.ok(animalOnly||source.includes('function initHuntSim3D('),'Pass55 requires the full tool or animal factory');\n  if(animalOnly)return source;\n  for(const c of [...changes].reverse()){assert.equal(source.split(c.after).length-1,1,'Pass55 exact inverse guard');source=source.replace(c.after,c.before);}\n  return source;\n}\nmodule.exports={restorePass55Source};\n";
const helperTask=path.join(work,'cephalopod_pass55_reference.cjs');
fs.writeFileSync(helperTask,helper55);
function moduleFromText(text,resolve){
  const context={module:{exports:{}},require:resolve||require};vm.createContext(context);vm.runInContext(text,context);return context.module.exports;
}
const inverse55=moduleFromText(helper55);
assert.equal(inverse55.restorePass55Source(refined),baseline);
const targets=[
  {path:'tests/cephalopodlab_underwater_lighting.test.js',changes:[
    {before:'surfaceSheet,surfaceMat,shaftGroup',after:'surfaceSheet,surfaceMat,surfaceFlow,shaftGroup'},
    {before:'surfaceMat:{opacity:.165},shaftGroup:',after:'surfaceMat:{opacity:.165},surfaceFlow:{value:0},shaftGroup:'},
    {before:'surface:live.surfaceMat.opacity,top:',after:'surface:live.surfaceMat.opacity,surfaceFlow:live.surfaceFlow.value,top:'}
  ]},
  {path:'tests/helpers/cephalopod_pass54_reference.cjs',changes:[
    {before:'function restorePass54Source(source){',after:"function restorePass54Source(source){\n  if(source.includes('        function shadeCLHuntWaterSurface('))source=require('./cephalopod_pass55_reference.cjs').restorePass55Source(source);"}
  ]}
];
for(const target of targets){
  const original=fs.readFileSync(path.join(repo,target.path),'utf8');let proposed=original;
  for(const c of target.changes){assert.equal(proposed.split(c.before).length-1,1,target.path+' unique replacement');proposed=proposed.replace(c.before,c.after);}
  let restored=proposed;for(const c of [...target.changes].reverse()){assert.equal(restored.split(c.after).length-1,1);restored=restored.replace(c.after,c.before);}
  assert.equal(restored,original);
  target.originalSHA=sha(original);target.proposedSHA=sha(proposed);
  if(target.path.includes('pass54_reference')){
    const old54=moduleFromText(original),new54=moduleFromText(proposed,p=>p==='./cephalopod_pass55_reference.cjs'?inverse55:require(p));
    const expected53=old54.restorePass54Source(baseline);
    assert.equal(new54.restorePass54Source(baseline),expected53);
    assert.equal(new54.restorePass54Source(refined),expected53);
    assert.equal(sha(expected53),'9cf2336d49a85586715b3da91b3b90f37e3f171e2bbb6ac6073014b670591d4b');
    const animal='function createCLHuntAnimal(THREE,species){ return species; }';
    assert.equal(new54.restorePass54Source(animal),animal);assert.equal(inverse55.restorePass55Source(animal),animal);
  }
}
const out={status:'prepared_verified_not_applied',variant:'refined',candidateSHA:guards.candidateSHA,baselineSHA:guards.baselineSHA,edits:targets,newFiles:[{repoPath:'tests/helpers/cephalopod_pass55_reference.cjs',taskPath:helperTask,SHA:sha(helper55)}],verification:{inverse55Exact:true,conditional55To54To53Exact:true,earlier54BaselineUnchanged:true,animalFactoryPassThrough:true,fixtureEditsInvertExactly:true},scope:'Only task files written. Repository edits must apply unique strings and recorded hashes. No runtime or test expectations weakened.'};
fs.writeFileSync(path.join(work,'fixture-edits.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));

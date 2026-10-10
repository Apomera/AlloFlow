'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),stage=__dirname,attempt=path.join(stage,'attempts/route-v1');
fs.mkdirSync(attempt,{recursive:true});
for(const file of ['baseline-renderer.js','candidate-renderer.js','build-route.cjs','route-patch-manifest.json','audit-route.cjs','audit-route.json']){const target=path.join(attempt,file),bytes=fs.readFileSync(path.join(stage,file));if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),hash(bytes),'Existing preserved draft stays exact');else fs.writeFileSync(target,bytes);}
const failedDriver=fs.readFileSync(path.join(stage,'build-route-v2.cjs'));fs.writeFileSync(path.join(stage,'attempts/refinement-preparation-failure.json'),JSON.stringify({driver:'build-route-v2.cjs',driverHash:hash(failedDriver),exitCode:1,error:'Expected unique step/256 occurrence, but the new route has two: curve sampling and parameter storage. The guard stopped before any refined candidate write.',sourceCandidateUnchanged:true},null,2));
const baseline=fs.readFileSync(path.join(stage,'baseline-renderer.js'),'utf8'),original=JSON.parse(fs.readFileSync(path.join(stage,'route-patch-manifest.json'),'utf8'));
assert.equal(hash(baseline),original.baseline);assert.equal(hash(fs.readFileSync(path.join(stage,'candidate-renderer.js'))),original.candidate);
const replacements=original.replacements.map(item=>({...item}));
for(const [before,after,count]of [['step<=256','step<=1024',1],['step/256','step/1024',2]]){assert.equal(replacements[0].after.split(before).length,count+1);replacements[0].after=replacements[0].after.split(before).join(after);}
let candidate=baseline;for(const replacement of replacements){assert.equal(candidate.split(replacement.before).length,2);candidate=candidate.replace(replacement.before,replacement.after);}
let inverse=candidate;for(const replacement of replacements.slice().reverse())inverse=inverse.replace(replacement.after,replacement.before);assert.equal(inverse,baseline);
fs.writeFileSync(path.join(stage,'candidate-v2-renderer.js'),candidate);
const manifest={...original,actualBuildDriver:__filename,actualBuildDriverHash:hash(fs.readFileSync(__filename)),candidate:hash(candidate),replacements,design:{...original.design,arcSamplesPerSegment:1024},refinement:{previousCandidate:original.candidate,reason:'Increase only the new route arc-length lookup resolution to reduce sampled world-velocity jumps at joins; old route samplers remain exact.',preservedOriginalDirectory:attempt}};
fs.writeFileSync(path.join(stage,'route-v2-patch-manifest.json'),JSON.stringify(manifest,null,2));
const auditSource=fs.readFileSync(path.join(stage,'audit-route.cjs'),'utf8');
const auditReplacements=[['candidate-renderer.js','candidate-v2-renderer.js'],['route-patch-manifest.json','route-v2-patch-manifest.json'],['audit-route.json','audit-route-v2.json'],['bbc67cfbf287f906882f085c4e54becdaa57d3f0d368d3fa6bef6b6fa5e78d34',manifest.candidate],['uses256 samples','uses1024 samples']];
let audit=auditSource;for(const [before,after]of auditReplacements){assert.ok(audit.includes(before));audit=audit.split(before).join(after);}
const before='  result.route={metadata,start,end',after='  let crossLow=13,crossHigh=21;for(let step=0;step<64;step++){const middle=(crossLow+crossHigh)/2;if(local(route.atTime(middle).position,model)[1]>0)crossLow=middle;else crossHigh=middle;}const crossTime=(crossLow+crossHigh)/2;\n  result.route={arcSamplesPerSegment:1024,planeCrossing:{seconds:crossTime,sourceFrame:local(route.atTime(crossTime).position,model)},timeAliasesChecked:["negative→start","nonfinite→start","after44→end"],metadata,start,end';
assert.equal(audit.split(before).length,2);audit=audit.replace(before,after);auditReplacements.push([before,after]);
fs.writeFileSync(path.join(stage,'audit-route-v2.cjs'),audit);
fs.writeFileSync(path.join(stage,'audit-v2-derivation.json'),JSON.stringify({completed:true,originalAuditDriverHash:hash(auditSource),candidateAuditDriverHash:hash(audit),replacements:auditReplacements.map(([before,after])=>({before,after})),candidateSourceHash:manifest.candidate,actualPreparationDriverHash:hash(fs.readFileSync(__filename))},null,2));
console.log(JSON.stringify({prepared:true,candidate:manifest.candidate,auditDriver:hash(audit),buildDriverHash:manifest.actualBuildDriverHash,originalCandidateUnchanged:hash(fs.readFileSync(path.join(stage,'candidate-renderer.js')))===original.candidate,arcSamplesPerSegment:1024}));

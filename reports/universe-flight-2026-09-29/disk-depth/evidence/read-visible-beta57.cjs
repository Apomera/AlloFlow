'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=__dirname,report=path.join(stage,'native-beta-visible-report'),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const result=JSON.parse(fs.readFileSync(path.join(report,'check.json'))),execution=JSON.parse(fs.readFileSync(path.join(report,'execution.json')));
assert.equal(result.completed,true);assert.equal(execution.exitCode,0);assert.equal(execution.preservedUnchanged,true);assert.equal(execution.harnessUnchanged,true);assert.equal(result.errors.length,0);assert.equal(sha(path.join(stage,'native-beta-visible-check.cjs')),result.harnessSha256);
assert.equal(result.captures.length,2);
for(const c of result.captures){assert.equal(sha(path.join(report,c.file)),c.hash);assert.ok(c.sumEmittedLuminance>0);assert.ok(c.nonzeroEmittedPixels>0);}
assert.deepEqual(result.captures[0].snapshot,result.captures[1].snapshot);assert.deepEqual(result.math.baseline,result.math.candidate);
console.log(JSON.stringify({completed:true,reportHash:sha(path.join(report,'check.json')),executionHash:sha(path.join(report,'execution.json')),harnessSha256:result.harnessSha256,captures:result.captures.map(({phase,name,file,hash,sumEmittedLuminance,nonzeroEmittedPixels,maxChannel,clippedFraction,actualBeta,diskMarker,chiefRay,apparentAim,snapshot})=>({phase,name,file,hash,sumEmittedLuminance,nonzeroEmittedPixels,maxChannel,clippedFraction,actualBeta,diskMarker,chiefRay,apparentAim,snapshot})),resourceCounts:result.resources,snapshotsMatched:true,mathMatched:true,errors:result.errors,execution},null,2));

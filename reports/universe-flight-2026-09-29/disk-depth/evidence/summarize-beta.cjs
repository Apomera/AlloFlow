'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const r = JSON.parse(fs.readFileSync(path.join(__dirname, 'native-beta-report', 'check.json'), 'utf8'));
assert.equal(r.completed, true);
const finiteMath = r.math.candidate.samples.every(s => Number.isFinite(s.gamma) && s.gamma > 0 && Number.isFinite(s.doppler) && s.doppler > 0 && s.aberrated.every(Number.isFinite) && Math.abs(Math.hypot(...s.aberrated) - 1) < 1e-10);
assert.equal(finiteMath, true);
console.log(JSON.stringify({ completed:r.completed,harnessSha256:r.harnessSha256,finiteMath,mathFunctionCount:Object.keys(r.math.candidate.functions).length,errors:r.errors,captures:r.captures.map(c=>({phase:c.phase,name:c.name,file:c.file,hash:c.hash,actualBeta:c.actualBeta,diskMarker:c.diskMarker,finiteUploads:c.finiteUploads,glError:c.glError,clippedFraction:c.clippedFraction,sumEmittedLuminance:c.sumEmittedLuminance,maxChannel:c.maxChannel})),resources:r.resources },null,2));

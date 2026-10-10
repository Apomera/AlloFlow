'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const reproduction=fs.readFileSync(path.join(__dirname,'build-candidate.cjs'));
let original=reproduction.toString('utf8');
function undo(after,before){assert.equal(original.split(after).length,2,'Unique driver patch preimage');original=original.replace(after,()=>before);}
undo(`  // The guarded renderer is already a closed IIFE. A separate window object
  // isolates its exports while host intrinsics avoid slow VM-global lookups
  // in the millions of procedural atlas samples.
  const window={}; new Function('window',injected)(window); return window;`,
`  const window={}; vm.runInNewContext(injected,{window,Math},{filename:label,timeout:120000}); return window;`);
undo(`console.log('Math audit: generating c0 atlas.');
const bb=b.__diskAudit.galaxyPixels(512);
console.log('Math audit: generating candidate atlas.');
const aa=a.__diskAudit.galaxyPixels(512), colors=a.__diskAudit.diskLight();
console.log('Math audit: checking channel conservation and all byte bounds.');
const gutter=8,span=496,removedTotals=[0,0,0,0,0,0,0,0,0],preTotals=Array(12).fill(0),postTotals=Array(12).fill(0),errorSums=Array(9).fill(0),errorMaxima=Array(9).fill(0); let totalProfile=0,momentProfile=0,maxFaceOnError=0;`,
`const bb=b.__diskAudit.galaxyPixels(512), aa=a.__diskAudit.galaxyPixels(512), colors=a.__diskAudit.diskLight();
const gutter=8,span=496,removedTotals=[0,0,0,0,0,0,0,0,0]; let totalProfile=0,momentProfile=0,maxFaceOnError=0;`);
undo('    if(ch<3){preTotals[tile*3+ch]+=bb[i];postTotals[tile*3+ch]+=aa[i];}\n','');
undo(`    else {assert.ok(aa[i]<=bb[i],'Disk extraction is nonnegative'); removedTotals[tile*3+ch]+=bb[i]-aa[i]; const error=Math.abs(bb[i]-aa[i]-255*p*colors[tile*3+ch]); errorSums[tile*3+ch]+=error; errorMaxima[tile*3+ch]=Math.max(errorMaxima[tile*3+ch],error); maxFaceOnError=Math.max(maxFaceOnError,error);}`,
`    else {assert.ok(aa[i]<=bb[i],'Disk extraction is nonnegative'); removedTotals[tile*3+ch]+=bb[i]-aa[i]; maxFaceOnError=Math.max(maxFaceOnError,Math.abs(bb[i]-aa[i]-255*p*colors[tile*3+ch]));}`);
undo('channelIntegrals:{preTotals,postTotals,reconstructionTotals:postTotals.map((v,i)=>v+(i<9?255*totalProfile*colors[i]:0)),meanAbsoluteByteError:errorSums.map(v=>v/(512*512)),maxAbsoluteByteError:errorMaxima},globalIntegrals:{pre:preTotals.reduce((a,b)=>a+b,0),post:postTotals.reduce((a,b)=>a+b,0),reconstruction:postTotals.reduce((a,b)=>a+b,0)+255*totalProfile*colors.reduce((a,b)=>a+b,0)},','');
undo('models:ar.galaxies.length,ellipticalRanges:ag.ellipticals.length,bulgeRanges:ag.bulges.length,','');
const capturedPath=path.join(__dirname,'build-candidate-capture.cjs');
fs.writeFileSync(capturedPath,original);
const provenance={capturedOriginalDriver:capturedPath,capturedOriginalDriverHash:sha(original),reproductionDriver:path.join(__dirname,'build-candidate.cjs'),reproductionDriverHash:sha(reproduction),actualCommand:'node build-candidate.cjs',actualExecSession:1083,method:'Exact reversal of the single later audit-driver patch; the active process had already loaded this original source.',candidateHash:'8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9',candidateUnchanged:sha(fs.readFileSync(path.join(__dirname,'candidate-renderer.js')))==='8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9'};
assert.ok(provenance.candidateUnchanged);
fs.writeFileSync(path.join(__dirname,'driver-provenance.json'),JSON.stringify(provenance,null,2));
console.log(JSON.stringify(provenance));

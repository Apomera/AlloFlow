const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),vm=require('vm'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-technique-availability-2026-10-09');
const read=f=>fs.readFileSync(path.join(report,f)),json=f=>JSON.parse(read(f)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true}).trim();
const baseline=json('baseline.json'),source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js')),unit=fs.readFileSync(path.join(repo,'tests/dissection_lab_improvements.test.js'));
assert.equal(hash(source),'c7708b29982ee76b498aff5427cdf265672359430f1e559d483265de4f51e39c');
assert(source.equals(fs.readFileSync(path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js'))));
new vm.Script(source.toString());
let reversed=source.toString();
for(const file of ['edits/label-alignment.json','edits/source-edits.json']){
  const receipt=json(file);assert.equal(hash(reversed),receipt.after);
  for(const e of [...receipt.edits].reverse()){assert.equal(reversed.split(e.after).length,2);reversed=reversed.replace(e.after,e.before);}
  assert.equal(hash(reversed),receipt.before);
}
assert.equal(hash(reversed),baseline.source);assert(Buffer.from(reversed).equals(zlib.gunzipSync(read('edits/source-before.js.gz'))));
assert(source.equals(zlib.gunzipSync(read('edits/source-final.js.gz'))));
const u=json('edits/unit-edit.json'),addition=read('edits/unit-addition.js');
assert.equal(hash(unit),u.current);assert.equal(hash(addition),u.addition);
const insertedAddition=Buffer.from('\r\n'+addition.toString().replace(/\r?\n/g,'\r\n'));
assert.equal(insertedAddition.length,u.insertedBytes);
assert(unit.subarray(u.insertionByteOffset,u.insertionByteOffset+insertedAddition.length).equals(insertedAddition));
const originalUnit=Buffer.concat([unit.subarray(0,u.insertionByteOffset),unit.subarray(u.insertionByteOffset+insertedAddition.length)]);
assert.equal(hash(originalUnit),baseline.unit);assert(originalUnit.equals(zlib.gunzipSync(read('edits/unit-before.js.gz'))));
for(const [file,pin] of Object.entries(baseline.protected))assert.equal(hash(fs.readFileSync(path.join(repo,file))),pin,file);
assert.equal(git(['rev-parse','HEAD']),baseline.head);assert.equal(git(['diff','--cached','--name-status']),baseline.staged);
const diffCheck=git(['diff','--check','--','stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js','tests/dissection_lab_improvements.test.js','tests/e2e/dissection-technique-availability.spec.ts']);
assert.equal(diffCheck,'');
const runs={};
for(const name of ['before-1','browser-3','unit-4']){
  const r=json(name+'/run.json');assert.equal(r.exitCode,0);assert.deepEqual(r.startHashes,r.endHashes);
  if(name!=='before-1')for(const [file,pin] of Object.entries(r.endHashes))assert.equal(hash(fs.readFileSync(path.join(repo,file))),pin,file);
  const result=json(name+'/results.json');
  runs[name]={start:r.start,end:r.end,exitCode:r.exitCode,inputHashes:r.endHashes,counts:result.stats||{passed:result.numPassedTests,failed:result.numFailedTests,skipped:result.numPendingTests}};
}
assert.equal(runs['unit-4'].counts.passed,21);assert.equal(runs['unit-4'].counts.failed,0);
assert.equal(runs['browser-3'].counts.expected,4);assert.equal(runs['browser-3'].counts.unexpected,0);
const result={at:new Date().toISOString(),sourceSha256:hash(source),unitSha256:hash(unit),browserFixtureSha256:hash(fs.readFileSync(path.join(repo,'tests/e2e/dissection-technique-availability.spec.ts'))),sourceMirrorIdentical:true,syntaxPassed:true,sourceEditsReversible:true,originalUnitBytesPreserved:true,protectedFilesUnchanged:Object.keys(baseline.protected).length,headUnchanged:baseline.head,indexUnchanged:true,scopedDiffCheckPassed:true,runs};
fs.writeFileSync(path.join(report,'verification.json'),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(report,'edits/unit-final.js.gz'),zlib.gzipSync(unit));
fs.writeFileSync(path.join(report,'edits/browser-final.ts.gz'),zlib.gzipSync(fs.readFileSync(path.join(repo,'tests/e2e/dissection-technique-availability.spec.ts'))));
console.log(JSON.stringify(result,null,2));
console.log('Captures: '+fs.readdirSync(path.join(report,'browser-3/captures')).join(', '));

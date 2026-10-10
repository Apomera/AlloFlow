'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(__dirname,name));
const json=name=>JSON.parse(read(name));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const manifest=json('manifest.json');
for(const file of manifest.files){const bytes=read(file.name);assert.equal(bytes.length,file.bytes,file.name);assert.equal(sha(bytes),file.sha256,file.name);}
const runtimes=['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const sources=runtimes.map(file=>{const source=fs.readFileSync(path.join(root,file),'utf8');assert.equal(sha(source),manifest.sourceSHA256,file);new vm.Script(source,{filename:file});return source;});
assert.equal(sources[0],sources[1]);let restored=sources[0];
for(const name of ['feedback-changes.json','refine-changes.json','changes.json']){
 const delta=json(name);assert.equal(sha(restored),delta.after);
 for(const change of [...delta.changes].reverse()){assert.equal(restored.split(change.after).length,2);restored=restored.replace(change.after,change.before);}
 assert.equal(sha(restored),delta.before);
}
const proof=json('source-verification.json');assert.equal(proof.passed,true);assert.equal(proof.sha256,manifest.sourceSHA256);assert.equal(proof.baselineSHA256,sha(restored));
const delta=json('changes.json');assert.equal(delta.changes.length,2);assert(delta.changes[0].after.startsWith('            function renderStormMoments() {'));assert(delta.changes[1].after.startsWith('  var WC_STORM_MOMENTS_STYLE = '));
const unit=json('unit-run.json');assert.equal(unit.complete,true);assert.equal(unit.exitCode,0);assert.equal(unit.passed,74);assert.equal(unit.failed,0);assert.equal(unit.unchanged,true);assert.equal(unit.expectedSHA256,manifest.sourceSHA256);
for(const file of [...unit.before,...unit.after])assert.equal(sha(fs.readFileSync(path.join(root,file.path))),file.sha256,file.path);
const browser=json('browser/result.json');assert.equal(browser.passed,true);assert.equal(browser.expectedHash,manifest.sourceSHA256);assert.equal(browser.checks.length,1981);assert.equal(browser.accessibility.length,4);assert.equal(browser.captures.length,8);assert.deepEqual(browser.errors,[]);
console.log(JSON.stringify({passed:true,sourceSHA256:manifest.sourceSHA256,unitTests:74,browserAssertions:1981,accessibilityAudits:4,screenshots:8,mirrorsMatch:true,exactReversal:true,artifacts:manifest.files.length}));

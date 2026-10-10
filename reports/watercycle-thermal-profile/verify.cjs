'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(__dirname,name));
const json=name=>JSON.parse(read(name));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const manifest=json('manifest.json');
for(const file of manifest.files) {const data=read(file.name);assert.equal(data.length,file.bytes,file.name);assert.equal(sha(data),file.sha256,file.name);}
const source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'),'utf8');
const mirror=fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'),'utf8');
assert.equal(sha(source),manifest.sourceSHA256);assert.equal(source,mirror);new vm.Script(source);
const changes=json('changes.json');let restored=source;
assert.equal(changes.changes.length,2);
for(const change of [...changes.changes].reverse()) {assert.equal(restored.split(change.after).length,2);restored=restored.replace(change.after,change.before);}
assert.equal(sha(restored),changes.before);assert.equal(changes.after,manifest.sourceSHA256);
assert.equal(changes.changes[0].after.split('function renderThermalLayerInspector()').length,2);
assert(changes.changes[1].after.startsWith('  var WC_THERMAL_LAYER_INSPECTOR_STYLE = '));
const proof=json('source-verification.json');
assert.equal(proof.passed,true);assert.equal(proof.allOtherSourceUnchanged,true);assert.equal(proof.sourceSHA256,manifest.sourceSHA256);
assert.equal(sha(fs.readFileSync(path.join(root,manifest.test.path))),manifest.test.sha256);
const browser=json('validation-f29310e7d0/result.json');
assert.equal(browser.passed,true);assert.equal(browser.checks.length,286);assert(browser.checks.every(check=>check.pass));
assert.equal(browser.cases.length,13);assert.equal(browser.audits.length,4);
assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.failedRequests,[]);
for(const key of ['expectedHash','startHash','mirrorHash','currentDiskHash','loadedRuntimeHash']) assert.equal(browser[key],manifest.sourceSHA256,key);
console.log(JSON.stringify({passed:true,sourceSHA256:manifest.sourceSHA256,artifacts:manifest.files.length,mirrored:true,syntaxPassed:true,exactReversal:true,allOtherSourceUnchanged:true,browserAssertions:286,browserCases:13,accessibilityAudits:4,unitRun:'incomplete: runner timed out'}));

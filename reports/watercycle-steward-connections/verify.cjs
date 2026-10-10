'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.env.WC_REPO||path.resolve(__dirname,'../..');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p));
const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'source-proof.json'),'utf8'));
const previous=JSON.parse(read('reports/watercycle-storm-readouts/presentation-changes.json'));
let baseline=read(previous.baselinePath).toString('utf8');
assert.equal(hash(baseline),previous.baselineSha256);
for(const change of previous.changes){assert.equal(baseline.split(change.original).length,2);baseline=baseline.replace(change.original,change.replacement);}
assert.equal(hash(baseline),proof.baselineSHA256);
assert.equal(proof.baselineSHA256,'e4fc1f8963506efd5d03dbab7cf4ce6204403f513899ff5fbedd225bbf57720c');
assert.equal(proof.changes.length,4);
let candidate=baseline;
for(const change of proof.changes){assert.equal(hash(change.addition),change.sha256);assert.equal(candidate.split(change.anchor).length,2);candidate=candidate.replace(change.anchor,change.addition+change.anchor);}
assert.equal(hash(candidate),proof.candidateSHA256);
new Function(candidate);
if(!process.argv.includes('--snapshot-only')) for(const p of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) assert.equal(hash(read(p)),proof.candidateSHA256,p);
const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'artifact-hashes.json'),'utf8'));
for(const item of inventory){const bytes=fs.readFileSync(path.join(__dirname,item.path));assert.equal(hash(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);}
const unit=JSON.parse(fs.readFileSync(path.join(__dirname,'unit/unit-receipt.json'),'utf8'));
const browser=JSON.parse(fs.readFileSync(path.join(__dirname,'browser/results.json'),'utf8'));
assert.equal(unit.successful,true);assert.equal(unit.sourceSha256,proof.candidateSHA256);assert.equal(unit.exitCode,0);assert.equal(unit.failed,0);assert.equal(unit.skipped,0);assert.equal(unit.passed,unit.total);assert.equal(unit.errors.length,0);
assert.deepEqual(unit.runtimeBefore,unit.runtimeAfter);assert(unit.runtimeBefore.every(x=>x.sha256===proof.candidateSHA256));
for(const key of ['tests','helpers','executionInputs']) assert.deepEqual(unit[key+'Before'],unit[key+'After']);
assert.equal(hash(fs.readFileSync(path.join(__dirname,'unit',unit.resultFile))),unit.resultSha256);
assert.equal(hash(fs.readFileSync(path.join(__dirname,'unit',unit.logFile))),unit.logSha256);
assert.equal(browser.successful,true);assert.equal(browser.sourceSha256,proof.candidateSHA256);assert.equal(browser.publicSourceSha256,proof.candidateSHA256);assert.equal(browser.failed,0);assert.equal(browser.errors.length,0);assert(browser.browserClosed&&browser.serverClosed);
assert.equal(hash(fs.readFileSync(path.join(__dirname,'browser/tested-harness.cjs'))),browser.harnessSha256);
for(const capture of browser.captures) assert.equal(hash(fs.readFileSync(path.join(__dirname,'browser',capture.file))),capture.sha256);
assert(browser.audits.every(x=>x.violations.length===0));
console.log(JSON.stringify({successful:true,sourceSHA256:proof.candidateSHA256,baselineSHA256:proof.baselineSHA256,existingSourceBytesPreserved:true,artifacts:inventory.length,browserChecks:browser.passed,accessibilityAudits:browser.audits.length,unitTests:unit.summary?.passed||unit.tests?.passed||unit.passed||null,snapshotOnly:process.argv.includes('--snapshot-only')}));

const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const dir=__dirname,root=process.env.WC_REPO||path.resolve(dir,'../..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const read=f=>fs.readFileSync(path.join(dir,f));
const json=f=>JSON.parse(read(f));
const proof=json('source-proof.json');
for(const item of json('artifact-hashes.json')){
  assert(!path.isAbsolute(item.file)&&!item.file.split(/[\\/]/).includes('..'),'Invalid artifact path');
  const bytes=read(item.file);assert(bytes.length===item.bytes&&hash(bytes)===item.sha256,'Artifact differs: '+item.file);
}
const source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'),'utf8');
assert(hash(source)===proof.finalSHA,'Installed source differs from tested version');
assert(hash(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_watercycle.js')))===proof.finalSHA,'Public mirror differs');
new vm.Script(source);
let previous=source;
for(const change of [...proof.replacements].reverse()){
  assert(hash(change.before)===change.beforeSHA&&hash(change.after)===change.afterSHA,'Patch metadata differs');
  assert(previous.slice(change.offset,change.offset+change.after.length)===change.after,'Patch location differs');
  previous=previous.slice(0,change.offset)+change.before+previous.slice(change.offset+change.after.length);
}
assert(hash(previous)===proof.baselineSHA,'Unreviewed source change');
const unit=json('unit/unit-receipt.json'),raw=json('unit/vitest-results.json'),loaded=json('unit/loaded-source.json');
assert(unit.passed===true&&unit.exitCode===0&&!unit.signal&&!unit.launchError,'Unit run failed');
assert(unit.expectedSha256===proof.finalSHA&&JSON.stringify(unit.before)===JSON.stringify(unit.after),'Unit input drift');
assert(raw.success&&raw.numPassedTests===unit.tests&&!raw.numFailedTests&&!raw.numPendingTests&&!raw.numTodoTests,'Unit assertions failed');
assert(raw.testResults.flatMap(s=>s.assertionResults).length===unit.tests&&raw.testResults.every(s=>s.assertionResults.every(a=>a.status==='passed')),'Raw test count differs');
assert(loaded.loadedRuntimes.length===2&&loaded.loadedRuntimes.every(r=>r.sha256===proof.finalSHA&&r.bytes===Buffer.byteLength(source)),'VM loaded different runtime');
assert(hash(read('unit/watercycle_ice_growth_visual.test.js'))===loaded.loadedTest.sha256,'Test snapshot differs');
const browser=json('browser/result.json');
assert(browser.passed===true&&browser.sourceSha256===proof.finalSHA&&!browser.errors.length,'Browser run failed');
assert(browser.resources.browserClosed&&browser.resources.serverClosed,'Browser resources not closed');
assert(browser.checkCount===browser.checks.length&&browser.captureCount===browser.captures.length,'Browser coverage differs');
assert(hash(read('browser/tested-harness.cjs'))===browser.harnessSha256,'Browser harness differs');
assert(hash(fs.readFileSync(path.join(root,'dev-tools/watercycle_ice_growth_qa.cjs')))===browser.harnessSha256,'Installed QA differs');
console.log(JSON.stringify({passed:true,sourceSha256:proof.finalSHA,tests:unit.tests,browserChecks:browser.checkCount,captures:browser.captureCount,earlierBytesPreserved:true}));

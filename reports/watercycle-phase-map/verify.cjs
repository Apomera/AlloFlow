const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const dir=__dirname,root=process.env.WC_REPO||path.resolve(dir,'../..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=name=>fs.readFileSync(path.join(dir,name));
const json=name=>JSON.parse(read(name));
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const proof=json('source-proof.json'),inventory=json('artifact-hashes.json');
for(const item of inventory){const bytes=read(item.path);assert(bytes.length===item.bytes&&hash(bytes)===item.sha256,'Artifact changed: '+item.path);}
const source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'));
assert(hash(source)===proof.candidateSHA256,'Installed source changed');
assert(hash(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_watercycle.js')))===proof.candidateSHA256,'Mirror differs');
new vm.Script(source.toString('utf8'));
let baseline=source.toString('utf8');
assert(proof.additions.length===4,'Unexpected addition count');
for(const item of [...proof.additions].reverse()){
 assert(hash(item.addition)===item.sha256&&Buffer.byteLength(item.addition)===item.bytes,'Addition metadata differs: '+item.name);
 assert(baseline.split(item.addition).length===2,'Nonunique addition: '+item.name);
 baseline=baseline.replace(item.addition,'');
}
assert(hash(baseline)===proof.baselineSHA256,'Earlier source bytes changed');
const unit=json('unit/unit-receipt.json'),result=json('unit/'+unit.resultFile);
assert(unit.successful&&unit.exitCode===0&&unit.passed===unit.total&&unit.failed===0&&unit.skipped===0&&!unit.errors.length,'Unit suite did not pass');
assert(unit.sourceSha256===proof.candidateSHA256,'Unit candidate differs');
assert(result.success&&result.numFailedTests===0&&result.numPassedTests===unit.passed,'Unit result differs');
assert(hash(read('unit/'+unit.resultFile))===unit.resultSha256,'Unit result hash differs');
assert(hash(read('unit/'+unit.logFile))===unit.logSha256,'Unit log hash differs');
for(const name of ['runtime','tests','helpers','support','executionInputs'])if(unit[name+'Before'])assert(JSON.stringify(unit[name+'Before'])===JSON.stringify(unit[name+'After']),'Unit inputs changed: '+name);
const browser=json('browser/results.json');
assert(browser.successful&&browser.completed&&browser.failed===0&&!browser.errors.length,'Browser run did not pass');
assert(browser.sourceSha256===proof.candidateSHA256&&browser.publicSourceSha256===proof.candidateSHA256,'Browser source differs');
assert(browser.baselineSha256===proof.baselineSHA256,'Browser baseline differs');
assert(browser.browserClosed&&browser.serverClosed,'Browser resources remained open');
assert(browser.audits.length===8&&browser.audits.every(a=>a.violations.length===0),'Accessibility audit failed');
assert(browser.transitionCases.length===6&&browser.captures.length===10,'Browser coverage differs');
assert(hash(read('browser/tested-harness.cjs'))===browser.harnessSha256,'Browser harness differs');
for(const capture of browser.captures)assert(hash(read('browser/'+capture.file))===capture.sha256,'Capture differs: '+capture.file);
const baselineFlag=process.argv.indexOf('--write-baseline');
if(baselineFlag>=0){const destination=process.argv[baselineFlag+1];assert(destination,'A destination is required');if(fs.existsSync(destination))assert(hash(fs.readFileSync(destination))===proof.baselineSHA256,'Refusing to overwrite another file');else fs.writeFileSync(destination,baseline,{flag:'wx'});}
console.log(JSON.stringify({successful:true,sourceSha256:proof.candidateSHA256,existingSourceBytesPreserved:true,unitTests:unit.passed,browserChecks:browser.passed,accessibilityAudits:browser.audits.length,artifacts:inventory.length}));

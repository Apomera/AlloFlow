const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file)));
const proof=read('source-changes.json'),source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'),'utf8');
assert.equal(hash(source),'acb6c672744a47734694d993f69483c5424445a740c28ad77593cba6dc5296f6');
assert.equal(hash(source),proof.sourceSha256);assert.equal(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_circuit.js'),'utf8'),source);new vm.Script(source);
let before=source;for(const edit of proof.edits.slice().reverse()){assert.equal(before.split(edit.after).length,2);before=before.replace(edit.after,edit.before);}assert.equal(hash(before),proof.baselineSha256);assert.equal(proof.baselineSha256,'ff1a66032c42e744ed5b8ae7d0ba0f2c324755b7fb4193fa6c1e4eec90156540');
const regression=read('regression.json'),browser=read('browser-results.json');
assert.equal(regression.success,true);assert.equal(regression.numPassedTests,66);assert.equal(regression.numFailedTests,0);assert.equal(regression.numPendingTests,0);assert.equal(regression.testResults.length,4);
const added=regression.testResults.find(file=>file.name.endsWith('circuit_live_reference_readings.test.js'));assert.equal(added.assertionResults.length,12);
assert.equal(browser.sourceSha256,hash(source));assert.equal(browser.scriptSha256,hash(fs.readFileSync(path.join(__dirname,'browser-check.cjs'))));assert.equal(browser.passed,true);assert.equal(browser.browserClosed,true);assert.deepEqual(browser.errors,[]);assert.equal(browser.views.length,6);assert.equal(browser.workflows.length,1);
for(const view of browser.views){assert.deepEqual(view.axeViolations,[]);assert.equal(hash(fs.readFileSync(path.join(__dirname,view.file))),view.sha256);}
const paths=['stem_lab/stem_tool_circuit.js','desktop/web-app/public/stem_lab/stem_tool_circuit.js','tests/circuit_live_reference_readings.test.js','reports/circuit-live-reference-2026-10-04'];
const git=args=>execFileSync('git',args,{cwd:root,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},encoding:'utf8'});
git(['diff','--check','--',...paths]);assert.equal(git(['diff','--cached','--name-only','--',...paths]).trim(),'');
const result={passed:true,sourceSha256:hash(source),sourceMirrorEqual:true,priorSourcePreserved:true,tests:66,newTests:12,testFiles:4,browserViews:6,browserWorkflows:1,scopedDiffCheck:true,scopedIndexEmpty:true};
fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

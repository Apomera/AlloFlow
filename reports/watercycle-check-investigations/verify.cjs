const EXPECTED="8e43450261e9faff3de64bdd8d4778ac0495f19a75c1fbe48a91ed66d6279dbb";
const BASELINE="384eca9416719d616d50623847aa6fdabec346106967153f678cd76ee508be6c";
const EXPECTED_BROWSER=1666;
const EXPECTED_AUDITS=22;
const REPORT_PINS={
  "baseline-results.json": "9fd2d3544bd393589c868ab8e4b674e8def22616dcc6a09d822b8676b9bfa7d9",
  "preflight.json": "e776d3c7c18a3baad4fb045b0d7b713a603d7e0648a89d29208d8b23f14986a7",
  "results.json": "8996e56299ab83a4bd641a63f3b20208920e8b84618c4d237c333a4d1945f5df",
  "final-browser-summary.json": "fdf50c780c683ef431e4676244ca5ab50cd964de28260067f87f7006b16d6176",
  "artifact-summary.json": "be235948a483034e222d09c62de647cef14b2ad708c57192506ae2abf13c8cfd",
  "unit-results.json": "0cddb6f0bff46c529dc39ac8af86a101dd87fbc5ba1ba92fb9fdf7bc49decd75",
  "regression-results.json": "b066760b0b675d481d4df0057186e5eb8bc2b0dfef44b38541b06e86deb51bd7",
  "preview-check.json": "4fb21cb05512b40f78310e35927d1fa456112f0a8d30246ebec3d4d3b211e1bd"
};
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),acorn=require('acorn');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),checks=[];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fileSha=file=>hash(fs.readFileSync(path.resolve(root,file)));
const json=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
function check(label,passed){checks.push({label,passed:!!passed});if(!passed)throw new Error(label);}
function git(args){const result=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});if(result.error)throw result.error;check('git '+args.join(' '),result.status===0);return result.stdout.trim();}
for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js','reports/watercycle-check-investigations/tested-runtime.js'])check('Final runtime '+file,fileSha(file)===EXPECTED);
check('Frozen baseline hash',fileSha('reports/watercycle-check-investigations/baseline-runtime.js')===BASELINE);
for(const [file,sha]of Object.entries(REPORT_PINS))check('Report pin '+file,fileSha('reports/watercycle-check-investigations/'+file)===sha);
function assertions(report,total,files){
 const entries=report.testResults.flatMap(file=>file.assertionResults.map(test=>({name:path.relative(root,file.name).replace(/\\/g,'/')+' :: '+test.fullName,status:test.status})));
 check('All '+total+' tests passed',report.success&&report.numTotalTests===total&&report.numPassedTests===total&&report.numFailedTests===0&&report.numPendingTests===0&&report.numTodoTests===0&&entries.length===total&&entries.every(test=>test.status==='passed'));
 const meta=report.waterCycleCheckVerification;
 check('Test runtime pins',meta&&(meta.sourceSha256Before||meta.sourceSha256)===EXPECTED&&(meta.sourceSha256After||meta.finalSourceSha256)===EXPECTED&&meta.publicSha256===EXPECTED&&(!meta.finalPublicSha256||meta.finalPublicSha256===EXPECTED));
 check('Test file pins',report.testResults.length===files&&meta.testFiles.length===files&&meta.testFiles.every(file=>fileSha(file.path)===file.sha256));return entries;
}
const unit=json('unit-results.json'),regression=json('regression-results.json');
const passed=[...assertions(unit,71,3),...assertions(regression,240,9)];check('311 distinct assertions',passed.length===311&&new Set(passed.map(test=>test.name)).size===311);
const before=fs.readFileSync(path.join(__dirname,'baseline-runtime.js'),'utf8').replace(/\r\n/g,'\n');
const after=fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'),'utf8').replace(/\r\n/g,'\n');
const testSource=fs.readFileSync(path.join(root,'tests/watercycle_check_investigations.test.js'),'utf8');
const start=testSource.indexOf('const SOURCE_PATH ='),end=testSource.indexOf('const source =',start);check('Test extractor bounds',start>=0&&end>start);
const extractors=vm.runInNewContext(testSource.slice(start,end).replace('export const waterCycleCheckVerification','const waterCycleCheckVerification')+'\nwaterCycleCheckVerification;',{parse:acorn.parse});
check('Extractor baseline pin',extractors.baselineSha===BASELINE);
const oldNodes=extractors.productionNodes(before,['MYTHS_35','MYTHS_68','MYTHS_912']),newNodes=extractors.productionNodes(after,['MYTHS_35','MYTHS_68','MYTHS_912']);
const names=Object.keys(oldNodes);check('44 model/state/bank anchors',names.length===44&&Object.keys(newNodes).length===44);
for(const name of names)check('Unchanged '+name,oldNodes[name]===newNodes[name]);
const oldScored=extractors.scoredNodes(before),newScored=extractors.scoredNodes(after);check('Two scored callback sets',Object.keys(oldScored).length===2&&Object.keys(newScored).length===2);
for(const name of ['quiz','myth'])check('Unchanged scoring '+name,!!oldScored[name]&&oldScored[name]===newScored[name]);
const meta=unit.waterCycleCheckVerification;
check('41 reported preservation pins',meta.baselinePreservation.length===41&&meta.baselinePreservation.every(pin=>pin.unchanged&&hash(oldNodes[pin.name])===pin.baselineSha256&&hash(newNodes[pin.name])===pin.currentSha256));
check('Two reported scoring pins',meta.scoredPreservation.length===2&&meta.scoredPreservation.every(pin=>pin.unchanged&&hash(oldScored[pin.name])===pin.baselineSha256&&hash(newScored[pin.name])===pin.currentSha256));
const derivations=[];
for(const [first,last]of [['var wcScenarioBaseline = d.wcScenarioBaseline || null;','var wcRouteBaselineActive'],['var wcCausalStageIds = [];','var wcDataTrailStatus']]){
 function slice(text){check('Unique derivation '+first,text.split(first).length===2);const a=text.indexOf(first),b=text.indexOf(last,a);check('Derivation end '+last,b>a);return text.slice(a,b);}
 const oldCode=slice(before),newCode=slice(after);check('Full derivation unchanged '+first,oldCode===newCode);derivations.push({start:first,end:last,sha256:hash(newCode),unchanged:true});
}
const baseline=json('baseline-results.json');check('Baseline inspection closed',baseline.completed&&baseline.successful&&baseline.browserClosed&&baseline.serverClosed&&baseline.errors.length===0&&baseline.sourceSha256===BASELINE);
const preflight=json('preflight.json');check('Final preflight closed',preflight.completed&&preflight.successful&&preflight.browserClosed&&preflight.serverClosed&&preflight.failed===0&&preflight.errors.length===0&&preflight.sourceSha256===EXPECTED);
const browser=json('results.json');
check('Final browser runtime pins',browser.sourceSha256===EXPECTED&&browser.publicSha256===EXPECTED&&browser.finalSourceSha256===EXPECTED&&browser.finalPublicSha256===EXPECTED);
check('All browser checks pass',browser.completed&&browser.successful&&browser.failed===0&&browser.failures.length===0&&browser.errors.length===0&&browser.passed===EXPECTED_BROWSER&&browser.checks.length===EXPECTED_BROWSER&&browser.checks.every(item=>item.pass));
check('Scoped accessibility audits clean',browser.audits.length===EXPECTED_AUDITS&&browser.audits.every(audit=>audit.violations.length===0));check('QA resources closed',browser.browserClosed&&browser.serverClosed);
const captureSummary=json('artifact-summary.json');check('Final capture hashes',captureSummary.sourceSha256===EXPECTED&&captureSummary.captures.length===browser.captures.length&&[...captureSummary.captures,...captureSummary.preflightCaptures].every(capture=>fileSha('reports/watercycle-check-investigations/'+capture.name)===capture.sha256));
const preview=json('preview-check.json');check('Preview serves final runtime',preview.successful&&preview.rootStatus===200&&preview.runtimeStatus===200&&preview.servedRuntimeSha256===EXPECTED&&preview.sourceSha256===EXPECTED&&preview.publicSha256===EXPECTED);
for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js','dev-tools/watercycle_check_investigations_qa.cjs']){new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});check('JavaScript syntax '+file,true);}
for(const match of fs.readFileSync(path.join(__dirname,'README.md'),'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){const target=match[1];if(/^https?:\/\//.test(target)||target==='verification-summary.json')continue;check('Artifact exists '+target,fs.existsSync(path.resolve(__dirname,target)));}
const scope=['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js','tests/watercycle_check_investigations.test.js','tests/watercycle_controls_a11y.test.js','dev-tools/watercycle_check_investigations_qa.cjs','docs/water-cycle-visual-design.md','reports/watercycle-check-investigations'];
git(['diff','--check','--',...scope]);check('No enhancement files staged',git(['diff','--cached','--name-only','--',...scope])==='');
const summary={title:'Water Cycle Check investigations: final verification',recordedAt:new Date().toISOString(),successful:true,sourceSha256:EXPECTED,publicSha256:EXPECTED,baselineSha256:BASELINE,reportSha256:REPORT_PINS,tests:{total:311,passed:311,focused:55,existingAccessibilityAndContent:16,regression:240,distinctFiles:12,skipped:0},browser:{passed:EXPECTED_BROWSER,failed:0,snapshots:browser.cases.length,scopedAccessibilityAudits:EXPECTED_AUDITS,violations:0,browserClosed:true,serverClosed:true},unchangedModelStateAndBankAnchors:44,unchangedFirstAnswerScoringCallbacks:2,derivations,preview,git:{scopedWhitespaceCheckPassed:true,stagedEnhancementFiles:[]},checks};
fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({successful:true,tests:311,browserChecks:EXPECTED_BROWSER,accessibilityAudits:EXPECTED_AUDITS,sourceSha256:EXPECTED,verificationChecks:checks.length,stagedEnhancementFiles:[]},null,2));

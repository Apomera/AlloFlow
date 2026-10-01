const EXPECTED="942198fca1f8aae4c530764920afa5ed2fbd10c29b4fee68d7e4be560814d776";
const BASELINE="239edf53b437848623cec592f72644ee69e6eb000b887e113175e09740b16003";
const EXPECTED_BROWSER=788;
const REPORT_PINS={
  "baseline-results.json": "5af6663875e7d0b5c23a40f3f7e08be5e98af172eab4a61ed2c4fb90278374f5",
  "results.json": "b3c702b8f2d122917c53f15a784720c7eac4d8b8083c2ed19d2949a63ef14e19",
  "unit-results.json": "444a4e1b34d0680ea6d747321c0a1cd19ab0729b9067a851e36b86707a3d3a79",
  "regression-results.json": "ad33f900d081d4693b9b798f62eddaa518853c60c297e50b1bc7e6800afdea46"
};

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const acorn = require('acorn');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const checks = [];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fileSha = file => hash(fs.readFileSync(path.join(root,file)));
const json = file => JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
function check(label, passed) { checks.push({label,passed:!!passed}); if (!passed) throw new Error(label); }
function command(args) {
  const result = spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
  if (result.error) throw result.error;
  check('git '+args.join(' '),result.status===0);
  return result.stdout.trim();
}
function tests(report,count,files) {
  const items=report.testResults.flatMap(f=>f.assertionResults.map(t=>({name:path.relative(root,f.name).replace(/\\/g,'/')+' :: '+t.fullName,status:t.status})));
  check('All '+count+' tests passed without skips',report.success&&report.numTotalTests===count&&report.numPassedTests===count&&report.numFailedTests===0&&report.numPendingTests===0&&report.numTodoTests===0&&items.length===count&&items.every(t=>t.status==='passed'));
  const meta=report.waterCycleComparisonVerification;
  check('Test report pins final source/public',meta.sourceSha256===EXPECTED&&meta.publicSha256===EXPECTED&&meta.sourcePublicIdentical);
  check('Recorded test files match',report.testResults.length===files&&meta.testFiles.length===files&&meta.testFiles.every(f=>fileSha(f.path)===f.sha256));
  return items;
}
function extract(source,names) {
  const nodes=[acorn.parse(source,{ecmaVersion:'latest'})], found={};
  while(nodes.length) {
    const node=nodes.pop(); if(!node||typeof node!=='object') continue;
    const name=(node.type==='FunctionDeclaration'||node.type==='VariableDeclarator')&&node.id&&node.id.name;
    if(names.includes(name)) { if(found[name]) throw new Error('Non-unique anchor '+name); found[name]=source.slice(node.start,node.end); }
    for(const value of Object.values(node)) { if(Array.isArray(value)) nodes.push(...value); else if(value&&typeof value==='object') nodes.push(value); }
  }
  return found;
}
function slice(source,start,end) {
  check('Unique derivation start '+start,source.split(start).length===2);
  const first=source.indexOf(start), last=source.indexOf(end,first);
  check('Derivation end found '+end,last>first);
  return source.slice(first,last);
}
check('Current runtime hash',fileSha('stem_lab/stem_tool_watercycle.js')===EXPECTED);
check('Public mirror hash',fileSha('desktop/web-app/public/stem_lab/stem_tool_watercycle.js')===EXPECTED);
check('Frozen final runtime hash',fileSha('reports/watercycle-comparison-clarity/tested-runtime.js')===EXPECTED);
check('Frozen baseline hash',fileSha('reports/watercycle-comparison-clarity/baseline-runtime.js')===BASELINE);
for(const [file,sha] of Object.entries(REPORT_PINS)) check('Report hash '+file,fileSha('reports/watercycle-comparison-clarity/'+file)===sha);
const before=json('baseline-results.json');
check('Baseline completed with resources closed',before.completed&&before.successful&&before.browserClosed&&before.serverClosed&&before.errors.length===0&&before.sourceSha256===BASELINE);
const browser=json('results.json');
check('Final browser source pinned',browser.sourceSha256===EXPECTED&&browser.publicSha256===EXPECTED&&browser.finalSourceSha256===EXPECTED&&browser.finalPublicSha256===EXPECTED);
check('Final browser checks passed',browser.completed&&browser.successful&&browser.failed===0&&browser.failures.length===0&&browser.errors.length===0&&browser.passed===EXPECTED_BROWSER&&browser.checks.length===EXPECTED_BROWSER&&browser.checks.every(x=>x.pass));
check('16 clean scoped accessibility audits',browser.audits.length===16&&browser.audits.every(a=>a.violations.length===0));
check('QA resources closed',browser.browserClosed&&browser.serverClosed);
const unit=json('unit-results.json'), regression=json('regression-results.json');
const all=[...tests(unit,25,4),...tests(regression,104,5)];
check('129 distinct test assertions',all.length===129&&new Set(all.map(t=>t.name)).size===129);
const anchors=unit.waterCycleComparisonVerification.baselinePreservation;
check('24 unique recorded calculation/state anchors',anchors.length===24&&new Set(anchors.map(a=>a.name)).size===24);
const oldSource=fs.readFileSync(path.join(__dirname,'baseline-runtime.js'),'utf8').replace(/\r\n/g,'\n');
const newSource=fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'),'utf8').replace(/\r\n/g,'\n');
const names=anchors.map(a=>a.name), oldNodes=extract(oldSource,names), newNodes=extract(newSource,names);
for(const anchor of anchors) check('Unchanged calculation/state '+anchor.name,anchor.unchanged&&oldNodes[anchor.name]&&newNodes[anchor.name]&&oldNodes[anchor.name]===newNodes[anchor.name]&&hash(oldNodes[anchor.name])===anchor.baselineSha256&&hash(newNodes[anchor.name])===anchor.currentSha256);
const derivations=[];
for(const [start,end] of [
 ['var wcScenarioBaseline = d.wcScenarioBaseline || null;','var wcRouteBaselineActive'],
 ['var wcCausalStageIds = [];','var wcDataTrailStatus'],
]) {
  const oldCode=slice(oldSource,start,end), newCode=slice(newSource,start,end);
  check('Unchanged full derivation '+start,oldCode===newCode);
  derivations.push({start,end,sha256:hash(newCode),unchanged:true});
}
for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js','dev-tools/watercycle_comparison_clarity_qa.cjs']) {
  new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}); check('JavaScript syntax '+file,true);
}
const scope=[
 'stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
 'tests/watercycle_comparison_clarity.test.js','tests/watercycle_compare_visual.test.js',
 'tests/watercycle_prediction.test.js','tests/watercycle_baseline_restore.test.js',
 'tests/watercycle_experiment_trail.test.js','tests/watercycle_replay_indicator.test.js',
 'dev-tools/watercycle_comparison_clarity_qa.cjs','docs/water-cycle-visual-design.md',
 'reports/watercycle-comparison-clarity',
];
command(['diff','--check','--',...scope]);
check('No enhancement files staged',command(['diff','--cached','--name-only','--',...scope])==='');
const summary={title:'Water Cycle comparison clarity: final verification',recordedAt:new Date().toISOString(),successful:true,sourceSha256:EXPECTED,publicSha256:EXPECTED,baselineSha256:BASELINE,reportSha256:REPORT_PINS,tests:{total:129,passed:129,focused:25,regression:104,distinctFiles:9,skipped:0},browser:{passed:EXPECTED_BROWSER,failed:0,snapshots:browser.cases.length,scopedAccessibilityAudits:16,violations:0,browserClosed:true,serverClosed:true},unchangedCalculationAndStateAnchors:24,derivations,git:{scopedWhitespaceCheckPassed:true,stagedEnhancementFiles:[]},checks};
fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({successful:true,tests:129,browserChecks:EXPECTED_BROWSER,accessibilityAudits:16,sourceSha256:EXPECTED,verificationChecks:checks.length,stagedEnhancementFiles:[]},null,2));

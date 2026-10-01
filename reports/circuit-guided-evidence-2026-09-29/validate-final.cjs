const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const source='stem_lab/stem_tool_circuit.js',mirror='desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const summary={verifiedAt:new Date().toISOString(),passed:false};
try{
  const sourceBytes=fs.readFileSync(path.join(root,source)),sourceHash=hash(sourceBytes);
  assert.ok(sourceBytes.equals(fs.readFileSync(path.join(root,mirror))),'Desktop copy must match source');
  const regressionBytes=fs.readFileSync(path.join(__dirname,'regression.json'));
  const browserBytes=fs.readFileSync(path.join(__dirname,'evidence-results.json'));
  const regression=JSON.parse(regressionBytes),browser=JSON.parse(browserBytes);
  assert.equal(regression.success,true);assert.equal(regression.numFailedTests,0);
  assert.equal(regression.numPendingTests,0);assert.equal(regression.numTodoTests,0);
  assert.equal(regression.numPassedTests,regression.numTotalTests);assert.ok(regression.numTotalTests>0);
  assert.equal(regression.numFailedTestSuites,0);
  const tests=regression.testResults.flatMap(file=>{assert.equal(file.status,'passed');return file.assertionResults;});
  assert.equal(tests.length,regression.numTotalTests);tests.forEach(test=>assert.equal(test.status,'passed',test.fullName));
  assert.ok(regression.startTime>=fs.statSync(path.join(root,source)).mtimeMs-1000,'Tests predate source edit');
  assert.equal(browser.passed,true);assert.equal(browser.baseline,false);assert.ok(!browser.failure);
  assert.equal(browser.sourceSha256,sourceHash);assert.equal(browser.sourceSha256AtEnd,sourceHash);assert.equal(browser.sourceChangedDuringRun,false);
  assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.visualIssues,[]);
  assert.equal(browser.checks.length,4);assert.equal(browser.focus.length,24);assert.equal(browser.motion.length,4);
  for(const name of ['resistance-result','paths-result','loop-result','changed-bench'])for(const width of [1280,390,320]){
    for(const key of ['axe','layouts','charts','screenshots'])assert.equal(browser[key].filter(item=>item.name===name&&item.width===width).length,1,key+' missing '+name+' '+width);
  }
  browser.axe.forEach(scan=>assert.deepEqual(scan.violations,[]));
  browser.layouts.forEach(layout=>assert.ok(layout.scrollWidth<=layout.width+1));
  browser.focus.forEach(check=>{assert.equal(check.focused,true);assert.equal(check.focusVisible,true);assert.equal(check.visible,true);});
  browser.motion.forEach(check=>{assert.equal(check.before.reduced,true);assert.equal(check.before.paused,false);assert.equal(check.after.tick,check.before.tick);assert.equal(check.after.focusEvents,check.before.focusEvents);assert.deepEqual(check.after.animations,[]);});
  browser.actions.flatMap(group=>group.actions).forEach(action=>assert.ok(action.width>=43.9&&action.height>=43.9,action.label));
  summary.screenshots=browser.screenshots.map(shot=>{
    assert.equal(path.basename(shot.file),shot.file);
    const bytes=fs.readFileSync(path.join(__dirname,shot.file));
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0);
    return {file:shot.file,sha256:hash(bytes),bytes:bytes.length};
  });
  const scripts=[source,mirror,path.relative(root,__filename),path.relative(root,path.join(__dirname,'evidence-check.cjs'))];
  scripts.forEach(file=>execFileSync(process.execPath,['--check',file],{cwd:root,windowsHide:true,timeout:30000}));
  const testFiles=regression.testResults.map(file=>path.relative(root,file.name));
  execFileSync('git',['diff','--check','--',source,mirror,...testFiles],{cwd:root,windowsHide:true,timeout:30000});
  assert.equal(hash(fs.readFileSync(path.join(root,source))),sourceHash);
  assert.equal(hash(fs.readFileSync(path.join(root,mirror))),sourceHash);
  assert.equal(hash(fs.readFileSync(path.join(__dirname,'regression.json'))),hash(regressionBytes));
  assert.equal(hash(fs.readFileSync(path.join(__dirname,'evidence-results.json'))),hash(browserBytes));
  Object.assign(summary,{passed:true,sourceSha256:sourceHash,mirrorMatches:true,regression:{passed:regression.numPassedTests,files:regression.testResults.length,sha256:hash(regressionBytes)},browser:{workflows:browser.checks.length,axeScans:browser.axe.length,layoutChecks:browser.layouts.length,chartChecks:browser.charts.length,focusChecks:browser.focus.length,motionChecks:browser.motion.length,screenshots:browser.screenshots.length,errors:0,issues:0,sha256:hash(browserBytes)},syntaxPassed:true,scopedWhitespacePassed:true});
}catch(error){summary.failure=error.stack;process.exitCode=1;}
fs.writeFileSync(path.join(__dirname,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n');
if(summary.passed)console.log('Guided evidence verified: '+summary.regression.passed+' tests, '+summary.browser.axeScans+' axe scans, '+summary.browser.chartChecks+' chart checks; source '+summary.sourceSha256);
else console.error(summary.failure);

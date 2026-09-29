const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),source='stem_lab/stem_tool_circuit.js',mirror='desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const summary={verifiedAt:new Date().toISOString(),passed:false};
try{
  const sourceBytes=fs.readFileSync(path.join(root,source)),sourceHash=hash(sourceBytes);
  assert.ok(sourceBytes.equals(fs.readFileSync(path.join(root,mirror))),'Source/mirror mismatch');
  const regressionBytes=fs.readFileSync(path.join(__dirname,'regression.json')),browserBytes=fs.readFileSync(path.join(__dirname,'navigation-results.json'));
  const regression=JSON.parse(regressionBytes),browser=JSON.parse(browserBytes);
  assert.equal(regression.success,true);assert.equal(regression.numFailedTests,0);assert.equal(regression.numFailedTestSuites,0);
  assert.equal(regression.numPendingTests,0);assert.equal(regression.numTodoTests,0);assert.equal(regression.numPassedTests,regression.numTotalTests);
  const tests=regression.testResults.flatMap(file=>{assert.equal(file.status,'passed',file.name);return file.assertionResults;});
  assert.equal(tests.length,regression.numTotalTests);assert.ok(tests.length>0);tests.forEach(test=>assert.equal(test.status,'passed',test.fullName));
  assert.ok(regression.startTime>=fs.statSync(path.join(root,source)).mtimeMs-1000,'Regression predates final source');
  assert.equal(browser.passed,true);assert.equal(browser.baseline,false);assert.ok(!browser.failure);
  assert.equal(browser.sourceSha256,sourceHash);assert.equal(browser.sourceSha256AtEnd,sourceHash);assert.equal(browser.sourceChangedDuringRun,false);
  assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.visualIssues,[]);assert.ok(browser.checks.length>=3);
  for(const name of ['fresh-invitation','start-active','chooser-open','resumed-result'])for(const width of [1280,390,320]){
    for(const key of ['axe','layouts'])assert.equal(browser[key].filter(check=>check.name===name&&check.width===width).length,1,key+' missing '+name+' '+width);
  }
  for(const width of [390,320])for(const key of ['axe','layouts'])assert.equal(browser[key].filter(check=>check.name==='resumed-result-200pct-text'&&check.width===width&&check.textScale===2).length,1,key+' missing enlarged text');
  browser.axe.forEach(scan=>assert.deepEqual(scan.violations,[]));browser.layouts.forEach(check=>assert.ok(check.scrollWidth<=check.width+1));
  assert.ok(browser.focus.length>=21);browser.focus.forEach(check=>{assert.equal(check.focused,true);assert.equal(check.focusVisible,true);assert.equal(check.visible,true);});
  assert.ok(browser.motion.length>=1);browser.motion.forEach(check=>{assert.equal(check.before.reduced,true);assert.equal(check.before.paused,false);assert.equal(check.after.tick,check.before.tick);assert.deepEqual(check.after.animations,[]);});
  assert.equal(browser.textResize.length,1);assert.equal(browser.textResize[0].scale,2);assert.equal(browser.textResize[0].afterQuestionSize,browser.textResize[0].beforeQuestionSize*2);
  assert.equal(browser.contentBounds.length,15);browser.contentBounds.forEach(check=>check.cards.forEach(card=>{assert.deepEqual(card.violations,[]);assert.ok(card.scrollWidth<=card.clientWidth+1,check.name+' '+card.selector);}));
  assert.equal(browser.readingStress.passed,true);assert.equal(browser.readingStress.lesson,'paths');assert.equal(browser.readingStress.width,320);assert.equal(browser.readingStress.textScale,2);
  assert.deepEqual(browser.readingStress.readings,['90.00 mA','180.00 mA']);assert.equal(browser.readingStress.delta,'+90.00 mA');assert.equal(browser.readingStress.resize.scale,2);
  assert.equal(browser.readingStress.resize.afterQuestionSize,browser.readingStress.resize.beforeQuestionSize*2);assert.equal(browser.readingStress.screenshots.length,1);
  assert.equal(browser.axe.length,15);assert.equal(browser.layouts.length,15);assert.equal(browser.focus.length,27);
  for(const key of ['axe','layouts','contentBounds'])assert.equal(browser[key].filter(check=>check.name==='paths-result-200pct-text'&&check.width===320&&check.textScale===2).length,1,key+' missing longer reading');
  browser.actions.flatMap(group=>group.actions).forEach(action=>assert.ok(action.width>=43.9&&action.height>=43.9,action.label));
  assert.equal(browser.screenshots.length,17);
  summary.screenshots=browser.screenshots.concat(browser.readingStress.screenshots).map(shot=>{assert.equal(path.basename(shot.file),shot.file);const bytes=fs.readFileSync(path.join(__dirname,shot.file));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0);return {file:shot.file,bytes:bytes.length,sha256:hash(bytes)};});
  [source,mirror,path.relative(root,__filename),path.relative(root,path.join(__dirname,'navigation-check.cjs'))].forEach(file=>execFileSync(process.execPath,['--check',file],{cwd:root,windowsHide:true,timeout:30000}));
  const testFiles=regression.testResults.map(file=>path.relative(root,file.name));
  execFileSync('git',['diff','--check','--',source,mirror,...testFiles],{cwd:root,windowsHide:true,timeout:30000});
  assert.equal(hash(fs.readFileSync(path.join(root,source))),sourceHash);assert.equal(hash(fs.readFileSync(path.join(root,mirror))),sourceHash);
  assert.equal(hash(fs.readFileSync(path.join(__dirname,'regression.json'))),hash(regressionBytes));assert.equal(hash(fs.readFileSync(path.join(__dirname,'navigation-results.json'))),hash(browserBytes));
  Object.assign(summary,{passed:true,sourceSha256:sourceHash,mirrorMatches:true,regression:{passed:regression.numPassedTests,files:regression.testResults.length,sha256:hash(regressionBytes)},browser:{workflows:browser.checks.length,axeScans:browser.axe.length,layoutChecks:browser.layouts.length,focusChecks:browser.focus.length,motionChecks:browser.motion.length,enlargedTextChecks:3,contentBoundsChecks:browser.contentBounds.length,readingStressPassed:true,screenshots:summary.screenshots.length,errors:0,issues:0,sha256:hash(browserBytes)},syntaxPassed:true,scopedWhitespacePassed:true});
}catch(error){summary.failure=error.stack;process.exitCode=1;}
fs.writeFileSync(path.join(__dirname,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n');
if(summary.passed)console.log('CircuitTool verified: '+summary.regression.passed+' tests, '+summary.browser.axeScans+' axe scans; source '+summary.sourceSha256);
else console.error(summary.failure);

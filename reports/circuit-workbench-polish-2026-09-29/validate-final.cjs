const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const sourcePath='stem_lab/stem_tool_circuit.js';
const mirrorPath='desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const auditPath='reports/circuit-workbench-polish-2026-09-29/workbench-check.cjs';
const helperPath='reports/circuit-workbench-polish-2026-09-29/validate-final.cjs';
const summary={verifiedAt:new Date().toISOString(),passed:false,checks:[]};
const sha256=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const read=relative=>fs.readFileSync(path.join(root,relative));
function verify(name,fn){
  try{const details=fn();summary.checks.push({name,passed:true,...(details===undefined?{}:{details})});return details;}
  catch(error){summary.checks.push({name,passed:false,error:error.message});throw error;}
}
function run(command,args){
  const result=spawnSync(command,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:5*1024*1024});
  assert.ifError(result.error);
  assert.equal(result.status,0,[command,...args].join(' ')+' failed\n'+(result.stdout||'')+(result.stderr||''));
  return {command:path.basename(command),args,status:result.status,output:((result.stdout||'')+(result.stderr||'')).trim()};
}
try{
  const source=read(sourcePath),mirror=read(mirrorPath),sourceHash=sha256(source),mirrorHash=sha256(mirror);
  const sourceModified=fs.statSync(path.join(root,sourcePath)).mtimeMs;
  const regressionFile=path.join(__dirname,'regression.json'),browserFile=path.join(__dirname,'workbench-results.json');
  const regressionBytes=fs.readFileSync(regressionFile),browserBytes=fs.readFileSync(browserFile);
  const regression=JSON.parse(regressionBytes),browser=JSON.parse(browserBytes);
  summary.inputs={regression:{file:'regression.json',sha256:sha256(regressionBytes)},browser:{file:'workbench-results.json',sha256:sha256(browserBytes)}};
  summary.source={path:sourcePath,sha256:sourceHash,modifiedAt:new Date(sourceModified).toISOString(),mirror:mirrorPath,mirrorSha256:mirrorHash,mirrorMatches:source.equals(mirror)};
  verify('Source, deployed mirror, and browser start/end hashes match',()=>{
    assert.ok(source.equals(mirror),'Source and deployed mirror differ');
    assert.equal(browser.sourceSha256,sourceHash,'Browser start hash does not match the current source');
    assert.equal(browser.sourceSha256AtEnd,sourceHash,'Browser end hash does not match the current source');
    assert.equal(browser.sourceChangedDuringRun,false,'Source changed while browser verification ran');
  });

  verify('Regression completed successfully with every test passed',()=>{
    assert.equal(regression.success,true);assert.ok(regression.numTotalTests>0,'Regression must contain tests');
    assert.equal(regression.numFailedTests,0);assert.equal(regression.numFailedTestSuites,0);
    assert.equal(regression.numPendingTests,0);assert.equal(regression.numTodoTests,0);assert.equal(regression.numPendingTestSuites,0);
    assert.equal(regression.numPassedTests,regression.numTotalTests);
    assert.equal(regression.numPassedTestSuites,regression.numTotalTestSuites);
    assert.ok(Array.isArray(regression.testResults)&&regression.testResults.length>0);
    const assertions=regression.testResults.flatMap(file=>{assert.equal(file.status,'passed',file.name);assert.ok(Array.isArray(file.assertionResults));return file.assertionResults;});
    assert.equal(assertions.length,regression.numTotalTests,'Regression assertion count is inconsistent');
    assertions.forEach(test=>{assert.equal(test.status,'passed',test.fullName);assert.deepEqual(test.failureMessages,[],test.fullName);});
    if(regression.snapshot)assert.equal(regression.snapshot.failure,false);
    assert.ok(Number.isFinite(regression.startTime),'Regression start timestamp is missing');
    // File timestamps have coarser precision on some workspaces; allow a 1s rounding margin.
    assert.ok(regression.startTime>=sourceModified-1000,'Regression predates the final source edit; rerun it before final validation');
    summary.regression={files:regression.testResults.length,suites:regression.numTotalTestSuites,passed:regression.numPassedTests,failed:regression.numFailedTests,pending:regression.numPendingTests,todo:regression.numTodoTests,startedAt:new Date(regression.startTime).toISOString(),startedAfterSourceEdit:regression.startTime>=sourceModified-1000};
  });

  const widths=[1280,390,320],states=['open-loop','closed-loop','3d-loop','parallel-three-parts','parallel-eight-parts'];
  verify('Browser workflows, axe, layout, focus, and motion all passed',()=>{
    assert.equal(browser.baseline,false,'A baseline capture is not final verification');assert.equal(browser.passed,true);assert.ok(!browser.failure,browser.failure);
    assert.deepEqual(browser.errors,[],'Browser page errors');assert.deepEqual(browser.visualIssues,[],'Browser visual issues');
    assert.ok(Array.isArray(browser.checks)&&browser.checks.length>=6,'Missing keyboard/electrical workflows');
    for(const state of states)for(const width of widths){
      const scans=browser.axe.filter(scan=>scan.name===state&&scan.width===width);
      assert.equal(scans.length,1,'Expected one axe scan for '+state+' at '+width);assert.deepEqual(scans[0].violations,[]);
      const layouts=browser.layouts.filter(layout=>layout.name===state&&layout.width===width);
      assert.equal(layouts.length,1,'Expected one layout check for '+state+' at '+width);assert.ok(layouts[0].scrollWidth<=width+1,'Document overflow at '+state+' '+width);
    }
    browser.axe.forEach(scan=>assert.deepEqual(scan.violations,[]));
    browser.layouts.forEach(layout=>assert.ok(layout.scrollWidth<=layout.width+1));
    assert.ok(browser.focus.length>=30,'Missing keyboard-focus checks');
    browser.focus.forEach(focus=>{assert.equal(focus.focused,true,focus.name);assert.equal(focus.focusVisible,true,focus.name);assert.equal(focus.visible,true,focus.name);});
    assert.ok(browser.motion.length>=3,'Missing motion checks');
    browser.motion.forEach(motion=>{assert.equal(motion.before.reduced,true);assert.equal(motion.after.tick,motion.before.tick);assert.deepEqual(motion.after.animations,[]);});
    assert.ok(browser.motion.some(motion=>motion.before.pauseMotion===true),'Explicit pause was not checked');
    assert.ok(browser.motion.some(motion=>motion.before.pauseMotion===false),'System reduced motion was not checked independently of Pause');
    const actions=browser.actions.flatMap(group=>group.actions);assert.ok(actions.length>0,'Missing action measurements');
    actions.forEach(action=>{
      if(action.primary)assert.ok(action.width>=43.9&&action.height>=43.9,'Primary action below44px: '+action.label);
      assert.ok(action.transitionDuration.split(',').every(value=>parseFloat(value)*(value.trim().endsWith('ms')?.001:1)<=.0000101),'Nontrivial reduced-motion transition: '+action.label);
    });
    summary.browser={workflows:browser.checks.length,axeScans:browser.axe.length,violations:0,layoutChecks:browser.layouts.length,keyboardFocusChecks:browser.focus.length,motionChecks:browser.motion.length,primaryActionChecks:actions.filter(action=>action.primary).length,measuredActions:actions.length,visualIssues:0,pageErrors:0,viewportWidths:widths,sourceSha256:browser.sourceSha256,sourceSha256AtEnd:browser.sourceSha256AtEnd,sourceChangedDuringRun:browser.sourceChangedDuringRun};
  });

  verify('All expected focused screenshots exist and are valid nonempty PNG files',()=>{
    const names=['open-loop-schematic','open-loop-components','open-loop-insight','closed-loop-schematic','closed-loop-components','closed-loop-insight','closed-loop-readouts','3d-loop-scene','3d-loop-controls-inspector','parallel-schematic','parallel-components','parallel-insight','parallel-readouts','parallel-eight-schematic'];
    assert.ok(Array.isArray(browser.screenshots));
    for(const name of names)for(const width of widths)assert.equal(browser.screenshots.filter(shot=>shot.name===name&&shot.width===width).length,1,'Missing or duplicate screenshot '+name+' '+width);
    const files=new Set();
    summary.screenshots=browser.screenshots.map(shot=>{
      assert.equal(typeof shot.file,'string');assert.equal(path.basename(shot.file),shot.file,'Screenshot paths must remain within this report directory');
      assert.ok(!files.has(shot.file),'Duplicate screenshot file '+shot.file);files.add(shot.file);
      const filename=path.join(__dirname,shot.file);assert.ok(fs.statSync(filename).isFile(),shot.file);
      const buffer=fs.readFileSync(filename);assert.ok(buffer.length>=24,shot.file+' is empty');
      assert.equal(buffer.subarray(0,8).toString('hex'),'89504e470d0a1a0a',shot.file+' is not a PNG');
      const imageWidth=buffer.readUInt32BE(16),imageHeight=buffer.readUInt32BE(20);assert.ok(imageWidth>0&&imageHeight>0,shot.file);
      return {file:shot.file,viewportWidth:shot.width,imageWidth,imageHeight,bytes:buffer.length,sha256:sha256(buffer)};
    });
    summary.browser.screenshots=summary.screenshots.length;
  });

  summary.syntaxCheck=verify('JavaScript syntax is valid for source, mirror, audit, and validator',()=>[sourcePath,mirrorPath,auditPath,helperPath].map(file=>run(process.execPath,['--check',file])));
  const testPaths=regression.testResults.map(file=>path.relative(root,file.name).split(path.sep).join('/'));
  testPaths.forEach(file=>assert.match(file,/^tests\/circuit[^/]*\.test\.js$/,'Unexpected regression file outside the CircuitTool test scope'));
  const diffScope=[sourcePath,mirrorPath,...testPaths,auditPath,helperPath];
  summary.patchWhitespaceCheck=verify('Scoped working-tree and staged git diffs pass whitespace checks',()=>({scope:diffScope,commands:[run('git',['diff','--check','--',...diffScope]),run('git',['diff','--cached','--check','--',...diffScope])],note:'Git diff checks tracked changes; untracked files are not included by Git.'}));
  verify('Source and result inputs remained unchanged during final validation',()=>{
    assert.equal(sha256(read(sourcePath)),sourceHash);assert.equal(sha256(read(mirrorPath)),mirrorHash);
    assert.equal(sha256(fs.readFileSync(regressionFile)),summary.inputs.regression.sha256);
    assert.equal(sha256(fs.readFileSync(browserFile)),summary.inputs.browser.sha256);
  });
  summary.passed=true;
}catch(error){summary.failure=error.stack;process.exitCode=1;}
finally{fs.writeFileSync(path.join(__dirname,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n');}
if(summary.passed)console.log('Final CircuitTool verification passed: '+summary.regression.passed+' tests, '+summary.browser.workflows+' browser workflows, '+summary.browser.axeScans+' axe scans, '+summary.browser.screenshots+' screenshots; source '+summary.source.sha256+'.');
else console.error('Final CircuitTool verification failed: '+summary.failure);

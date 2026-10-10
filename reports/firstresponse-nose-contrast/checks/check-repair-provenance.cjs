const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function checkRepairProvenance(work,repo,{integrated=false,archive=null}={}){
  const read=n=>JSON.parse(fs.readFileSync(path.join(work,n),'utf8'));
  const repair=read('fixture-opacity-repair.json'),delta=read('delta.json'),contract=read('fixture-contract-check.json');
  assert.equal(repair.failedRun,'native-infant-contrast');assert.equal(repair.backupDirectory,'fixture-before-opacity-repair');
  assert.equal(repair.validationPending,false);assert.equal(repair.browserLaunched,false);
  assert.deepEqual(repair.allowedChangedInputs.slice().sort(),['check-face-fixture.cjs','firstresponse-face-preview.spec.ts','prepare-native.cjs']);
  assert.equal(repair.unchanged['before.js'],delta.beforeSHA256);assert.equal(repair.unchanged['candidate.js'],delta.afterSHA256);
  for(const[name,hash]of Object.entries(repair.before))assert.equal(sha(fs.readFileSync(path.join(work,repair.backupDirectory,repair.backupFiles[name]||name))),hash,'saved fixture input: '+name);
  for(const[name,hash]of Object.entries(repair.after))assert.equal(sha(fs.readFileSync(path.join(work,name))),hash,'repaired fixture input: '+name);
  for(const[name,hash]of Object.entries(repair.unchanged)){
    const file=path.join(fs.existsSync(path.join(work,name))?work:repo,name);
    const expected=integrated&&name==='stem_lab/stem_tool_firstresponse.js'?delta.afterSHA256:hash;
    assert.equal(sha(fs.readFileSync(file)),expected,'repair unchanged input: '+name);
  }
  assert.equal(contract.passed,true);assert.equal(contract.browserLaunched,false);assert.equal(contract.negative.length,12);assert.ok(contract.negative.every(p=>p.rejected));
  assert.equal(contract.listedWorkflows,3);assert.equal(contract.list.status,0);assert.equal(contract.mutationRejected,true);assert.equal(contract.restoreVerified,true);
  assert.equal(contract.fixtureSHA256,repair.after['firstresponse-face-preview.spec.ts']);assert.equal(contract.checkerSHA256,repair.after['check-face-fixture.cjs']);
  assert.equal(repair.validation.contractSHA256,sha(fs.readFileSync(path.join(work,'fixture-contract-check.json'))));
  const failed=read(repair.failedRun+'/failure.json'),inputs=read(repair.failedRun+'/inputs.json'),run=read(repair.failedRun+'/browser-run.json');
  assert.equal(failed.exitCode,1);assert.equal(run.stats.expected,0);assert.equal(run.stats.unexpected,1);assert.equal(run.stats.skipped,0);assert.equal(run.stats.flaky,0);
  assert.ok(JSON.stringify(run).includes('_baseOpacity'),'preserve actual opacity assertion failure');
  assert.equal(inputs.baselineSHA,delta.beforeSHA256);assert.equal(inputs.finalSHA,delta.afterSHA256);assert.deepEqual(inputs.selectedViews,['infant-pose8-contrast']);assert.equal(inputs.workers,1);assert.equal(inputs.retries,0);
  const sourcePaths=new Set(Object.keys(read('history-input-snapshot.json').sourceHashes).map(n=>path.resolve(repo,n).toLowerCase()));
  for(const[file,hash]of Object.entries(inputs.inputs)){
    const name=path.basename(file),isPrivate=path.dirname(path.resolve(file)).toLowerCase()===path.resolve(work).toLowerCase();
    if(isPrivate&&Object.hasOwn(repair.before,name)){assert.equal(hash,repair.before[name]);assert.equal(sha(fs.readFileSync(path.join(work,repair.backupDirectory,repair.backupFiles[name]||name))),hash);}
    else assert.equal(sha(fs.readFileSync(file)),integrated&&sourcePaths.has(path.resolve(file).toLowerCase())?delta.afterSHA256:hash,'failed-run executed input: '+file);
  }
  const deadlineRun='native-adult-contrast',deadlineRecovery='native-adult-contrast-recovered';
  const deadlineFailure=read(deadlineRun+'/failure.json'),deadlineInputs=read(deadlineRun+'/inputs.json'),deadlineBrowser=read(deadlineRun+'/browser-run.json');
  assert.equal(deadlineFailure.error,'Native runner exceeded 900000ms bound');assert.equal(deadlineFailure.exitCode,0);
  assert.ok(!fs.existsSync(path.join(work,deadlineRun,'summary.json')),'deadline failure cannot have an accepted summary');
  assert.equal(deadlineBrowser.stats.expected,1);for(const key of ['unexpected','skipped','flaky'])assert.equal(deadlineBrowser.stats[key],0);
  assert.equal(deadlineBrowser.config.workers,1);assert.equal(deadlineBrowser.config.projects.length,1);assert.equal(deadlineBrowser.config.projects[0].retries,0);assert.equal(deadlineBrowser.config.projects[0].timeout,450000);
  assert.equal(deadlineInputs.baselineSHA,delta.beforeSHA256);assert.equal(deadlineInputs.finalSHA,delta.afterSHA256);assert.deepEqual(deadlineInputs.selectedViews,['adult-pose5-contrast']);assert.equal(deadlineInputs.workers,1);assert.equal(deadlineInputs.retries,0);
  for(const[file,hash]of Object.entries(deadlineInputs.inputs))assert.equal(sha(fs.readFileSync(file)),integrated&&sourcePaths.has(path.resolve(file).toLowerCase())?delta.afterSHA256:hash,'deadline-run executed input: '+file);
  const recoveryInputs=read(deadlineRecovery+'/inputs.json'),recovery=read(deadlineRecovery+'/summary.json');
  assert.deepEqual(recoveryInputs.inputs,deadlineInputs.inputs,'deadline recovery uses the exact same fixture, runner, source, and dependencies');
  for(const key of ['baselineSHA','finalSHA','expectedWorkflows','expectedEvidence','workers','retries'])assert.equal(recoveryInputs[key],deadlineInputs[key]);assert.deepEqual(recoveryInputs.selectedViews,deadlineInputs.selectedViews);
  assert.ok(!fs.existsSync(path.join(work,deadlineRecovery,'failure.json')),'deadline recovery must pass the wrapper');
  assert.equal(recovery.baselineSHA,delta.beforeSHA256);assert.equal(recovery.finalSHA,delta.afterSHA256);assert.equal(recovery.inputsUnchanged,true);assert.equal(recovery.workflows,1);assert.equal(recovery.stats.expected,1);for(const key of ['unexpected','skipped','flaky'])assert.equal(recovery.stats[key],0);
  assert.equal(recovery.workers,1);assert.equal(recovery.retries,0);assert.equal(recovery.perWorkflowTimeoutMs,450000);assert.equal(recovery.runnerTimeoutMs,900000);assert.deepEqual(recovery.selectedViews,['adult-pose5-contrast']);
  const failedAttempts=[{failedRun:repair.failedRun,recoveryRun:'native-infant-contrast-recovered',failureReason:'Fixture expected only contour metadata and rejected the viewer-added _baseOpacity value.',sourceChangedForRecovery:false,fixtureChangedForRecovery:true},{failedRun:deadlineRun,recoveryRun:deadlineRecovery,failureReason:deadlineFailure.error,playwrightTestPassed:true,playwrightStats:deadlineBrowser.stats,runnerExitCode:deadlineFailure.exitCode,sourceChangedForRecovery:false,fixtureChangedForRecovery:false,runnerChangedForRecovery:false,deadlinesChangedForRecovery:false,exactRecoveryInputs:true}];
  const trees=[repair.failedRun,repair.backupDirectory,deadlineRun],files=['fixture-opacity-repair.json','repair-opacity-fixture.cjs','finalize-opacity-repair.cjs','check-repair-provenance.cjs'];
  const hashes={};function pin(relative){const item=path.join(work,relative);if(fs.statSync(item).isDirectory()){for(const name of fs.readdirSync(item))pin(path.join(relative,name));}else hashes[relative]=sha(fs.readFileSync(item));}
  for(const item of [...trees,...files])pin(item);
  if(archive)for(const[relative,hash]of Object.entries(hashes)){const archived=path.join(archive,files.includes(relative)?'checks':'',relative);assert.equal(sha(fs.readFileSync(archived)),hash,'archived failed-run provenance: '+relative);}
  return {verified:true,failedRun:repair.failedRun,recoveryRun:'native-infant-contrast-recovered',failureReason:'Fixture expected only contour metadata and rejected the viewer-added _baseOpacity value.',failedAttempts,failedAttemptCount:failedAttempts.length,sourceChangedForRepair:false,automaticRetries:0,fixtureNegativeChecks:12,savedInputsVerified:Object.keys(repair.before).length,trees,files,hashes};
}
module.exports={checkRepairProvenance};
if(require.main===module){const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';console.log(JSON.stringify(checkRepairProvenance(work,repo)));}

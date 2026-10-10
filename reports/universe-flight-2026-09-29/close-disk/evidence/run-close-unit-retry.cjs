const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,base=path.join(stage,'focused-unit'),primary=path.join(base,'retry-01'),report=path.join(base,'retry-02'),temp=path.join(stage,'unit-temp');
const config=path.join(repo,'reports/universe-flight-2026-09-29/close-projection/unit/node-renderer.config.mjs'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original=JSON.parse(fs.readFileSync(path.join(primary,'execution.json'))),result=JSON.parse(fs.readFileSync(path.join(primary,'results.json')));
assert.equal(original.completed,true);assert.equal(original.exitCode,1);assert.equal(original.inputsUnchanged,true);assert.equal(original.diagnosticsUnchanged,true);
assert.equal(result.numPassedTests,32);assert.equal(result.numFailedTests,7);
assert.deepEqual(result.testResults.filter(file=>file.status==='failed').map(file=>path.relative(repo,file.name).replaceAll('\\','/')),['tests/universe_flight_close_disk.test.js']);
const retained=result.testResults.filter(file=>file.status==='passed');assert.equal(retained.length,2);
for(const input of original.inputs.filter(input=>input.path!=='tests/universe_flight_close_disk.test.js'))assert.equal(sha(path.join(repo,input.path)),input.sha256);
assert.equal(sha(path.join(repo,'tests/universe_flight_close_disk.test.js')),'ed7e3572a4a3ccc5760e2edf408e10e4e9d0bfc4e67a9a135af15e580cb07276');
assert.equal(sha(path.join(repo,'tests/universe_flight_close_disk.test.js')),sha(path.join(stage,'candidate-close-disk.test.js')));
assert.equal(sha(config),sha(path.join(stage,'node-renderer.config.mjs')));
fs.mkdirSync(report,{recursive:true});fs.mkdirSync(temp,{recursive:true});assert.equal(fs.existsSync(path.join(report,'execution.json')),false);
const inputs=original.inputs.map(input=>({path:input.path,sha256:sha(path.join(repo,input.path))}));
const names=['candidate-renderer.js','baseline-renderer.js','candidate-close-disk.test.js','node-renderer.config.mjs','node-renderer-setup.mjs','run-close-unit-retry.cjs','install-test-fix.cjs','test-fix-installation.json'];
const diagnostics=names.map(file=>({path:file,sha256:sha(path.join(stage,file))}));
const args=[path.join(repo,'node_modules/vitest/vitest.mjs'),'run','tests/universe_flight_close_disk.test.js','--config',config,'--pool=forks','--maxWorkers=1','--no-file-parallelism','--no-isolate','--testTimeout=180000','--hookTimeout=180000','--reporter=default','--reporter=json','--outputFile='+path.join(report,'results.json')];
const execution={completed:false,startedAt:new Date().toISOString(),scope:'Retry only the seven new close-disk tests after correcting their duplicate-load-guard exposure helper. The 32 unchanged physics/bulge assertions remain covered by the completed primary run.',environment:'Node canvas/event mock with one shared fork; not a full DOM/native WebGL suite.',previousExecutionHash:sha(path.join(primary,'execution.json')),previousResultsHash:sha(path.join(primary,'results.json')),inputs,diagnostics,args,config:{path:config,sha256:sha(config)}};
fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');const log=fs.createWriteStream(path.join(report,'stdout.txt'));
const child=spawn(process.execPath,args,{cwd:repo,windowsHide:true,env:{...process.env,TEMP:temp,TMP:temp},stdio:['ignore','pipe','pipe']});
for(const stream of[child.stdout,child.stderr])stream.on('data',data=>{process.stdout.write(data);log.write(data);});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{
 execution.completed=true;execution.exitCode=code;execution.finishedAt=new Date().toISOString();execution.inputsUnchanged=inputs.every(input=>sha(path.join(repo,input.path))===input.sha256);execution.diagnosticsUnchanged=diagnostics.every(input=>sha(path.join(stage,input.path))===input.sha256);execution.configUnchanged=sha(config)===execution.config.sha256;
 fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');log.end();process.exitCode=code??1;
 if(code===0){
  const retry=JSON.parse(fs.readFileSync(path.join(report,'results.json')));assert.equal(retry.success,true);assert.equal(retry.numFailedTests,0);assert.equal(retry.testResults.length,1);assert.equal(retry.numPassedTests,7);
  for(const input of original.inputs.filter(input=>input.path!=='tests/universe_flight_close_disk.test.js'))assert.equal(sha(path.join(repo,input.path)),input.sha256);
  const suites=[...retained,...retry.testResults];assert.equal(suites.length,3);assert.ok(suites.every(file=>file.status==='passed'));
  const aggregate={completed:true,allFocusedAssertionsPassed:true,distinctFiles:3,distinctTests:suites.reduce((sum,file)=>sum+file.assertionResults.length,0),fullDomSuiteRun:false,environment:'Focused Node canvas/event diagnostic; real DOM and native WebGL validated separately.',currentInputsUnchanged:execution.inputsUnchanged,diagnosticsUnchanged:execution.diagnosticsUnchanged,originalStartupFailurePreserved:true,primary:{path:'retry-01',executionHash:sha(path.join(primary,'execution.json')),resultsHash:sha(path.join(primary,'results.json')),retainedPassingAssertions:32},retry:{path:'retry-02',executionHash:sha(path.join(report,'execution.json')),resultsHash:sha(path.join(report,'results.json')),passingNewAssertions:7},suites:suites.map(file=>({path:path.relative(repo,file.name).replaceAll('\\','/'),passed:file.assertionResults.length}))};
  assert.equal(aggregate.distinctTests,39);fs.writeFileSync(path.join(base,'aggregate.json'),JSON.stringify(aggregate,null,2)+'\n');console.log(JSON.stringify(aggregate));
 }
});

const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname;
const base=path.join(stage,'focused-unit'),report=path.join(base,'retry-01'),temp=path.join(stage,'unit-temp');
const config=path.join(repo,'reports/universe-flight-2026-09-29/close-projection/unit/node-renderer.config.mjs');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original=JSON.parse(fs.readFileSync(path.join(base,'execution.json')));
assert.equal(original.completed,true);assert.equal(original.exitCode,1);assert.equal(original.inputsUnchanged,true);assert.equal(original.diagnosticsUnchanged,true);
assert.equal(sha(path.join(base,'execution.json')),sha(path.join(base,'attempts/01-config-outside-workspace/execution.json')));
const selected=['tests/universe_flight_physics.test.js','tests/universe_flight_bulges.test.js','tests/universe_flight_close_disk.test.js'];
const names=['candidate-renderer.js','baseline-renderer.js','candidate-close-disk.test.js','node-renderer.config.mjs','node-renderer-setup.mjs','run-focused-unit.cjs','run-focused-unit-retry.cjs'];
assert.equal(sha(path.join(repo,'stem_lab/universe_flight_scene.js')),'6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8');
assert.equal(sha(path.join(repo,'tests/universe_flight_close_disk.test.js')),sha(path.join(stage,'candidate-close-disk.test.js')));
fs.mkdirSync(report,{recursive:true});fs.mkdirSync(temp,{recursive:true});fs.mkdirSync(path.dirname(config),{recursive:true});
assert.equal(fs.existsSync(path.join(report,'execution.json')),false,'Preserve failed retries before another run.');
fs.copyFileSync(path.join(stage,'node-renderer.config.mjs'),config);
const inputs=original.inputs.map(input=>({path:input.path,sha256:sha(path.join(repo,input.path))}));
const diagnostics=names.map(file=>({path:file,sha256:sha(path.join(stage,file))}));
const args=[path.join(repo,'node_modules/vitest/vitest.mjs'),'run',...selected,'--config',config,'--pool=forks','--maxWorkers=1','--no-file-parallelism','--no-isolate','--testTimeout=180000','--hookTimeout=180000','--reporter=default','--reporter=json','--outputFile='+path.join(report,'results.json')];
const execution={completed:false,startedAt:new Date().toISOString(),scope:'Three focused files evaluated directly against installed renderer; identical config copied into repository so Vite bundles inside the writable workspace.',environment:'Node canvas/event mock with one shared fork worker without isolation; not a full DOM/native WebGL suite.',previousAttempt:'../attempts/01-config-outside-workspace',previousExecutionHash:sha(path.join(base,'execution.json')),inputs,diagnostics,args,config:{path:config,sha256:sha(config)}};
fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');
const log=fs.createWriteStream(path.join(report,'stdout.txt'));
const child=spawn(process.execPath,args,{cwd:repo,windowsHide:true,env:{...process.env,TEMP:temp,TMP:temp},stdio:['ignore','pipe','pipe']});
for(const stream of[child.stdout,child.stderr])stream.on('data',data=>{process.stdout.write(data);log.write(data);});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{
 execution.completed=true;execution.exitCode=code;execution.finishedAt=new Date().toISOString();
 execution.inputsUnchanged=inputs.every(input=>sha(path.join(repo,input.path))===input.sha256);
 execution.diagnosticsUnchanged=diagnostics.every(input=>sha(path.join(stage,input.path))===input.sha256);
 execution.configUnchanged=sha(config)===execution.config.sha256;
 fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');log.end();process.exitCode=code??1;
 if(code===0){
  const result=JSON.parse(fs.readFileSync(path.join(report,'results.json')));assert.equal(result.success,true);assert.equal(result.numFailedTests,0);assert.equal(result.testResults.length,3);
  const aggregate={completed:true,distinctFiles:3,distinctTests:result.numPassedTests,allFocusedAssertionsPassed:true,inputsUnchanged:execution.inputsUnchanged,diagnosticsUnchanged:execution.diagnosticsUnchanged,fullDomSuiteRun:false,retryResultsHash:sha(path.join(report,'results.json')),retryExecutionHash:sha(path.join(report,'execution.json')),originalStartupFailurePreserved:true,suites:result.testResults.map(file=>({path:path.relative(repo,file.name).replaceAll('\\','/'),passed:file.assertionResults.length}))};
  fs.writeFileSync(path.join(base,'aggregate.json'),JSON.stringify(aggregate,null,2)+'\n');console.log(JSON.stringify(aggregate));
 }
});

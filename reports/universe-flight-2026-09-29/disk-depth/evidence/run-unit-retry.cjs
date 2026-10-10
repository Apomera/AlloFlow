const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,base=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/unit'),report=path.join(base,'affected-retry'),temp=path.join(stage,'unit-temp');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const primary=JSON.parse(fs.readFileSync(path.join(base,'results.json'))),original=JSON.parse(fs.readFileSync(path.join(base,'execution.json')));
assert.equal(original.completed,true);assert.equal(original.inputsUnchanged,true);assert.equal(original.diagnosticsUnchanged,true);
const selected=['tests/universe_flight_cloud_surfaces.test.js','tests/universe_flight_barred_detail.test.js','tests/universe_flight_two_arm_detail.test.js','tests/universe_flight_spiral_detail.test.js'];
assert.deepEqual(primary.testResults.filter(x=>x.status==='failed').map(x=>path.basename(x.name)).sort(),selected.map(x=>path.basename(x)).sort());
for(const input of original.inputs.filter(x=>!selected.includes(x.path)))assert.equal(sha(path.join(repo,input.path)),input.sha256);
fs.mkdirSync(report,{recursive:true});fs.mkdirSync(temp,{recursive:true});
if(fs.existsSync(path.join(report,'execution.json'))){
 const failed=JSON.parse(fs.readFileSync(path.join(report,'execution.json')));
 assert.equal(failed.completed,true);assert.equal(failed.exitCode,3221226505);
 assert.equal(sha(path.join(report,'execution.json')),sha(path.join(report,'attempts/01-execution.json')));
 assert.equal(sha(path.join(report,'attempts/01-driver.cjs')),failed.diagnostics.find(x=>x.path==='run-unit-retry.cjs').sha256);
}
const config=path.join(report,'node-renderer.config.mjs');fs.copyFileSync(path.join(stage,'node-renderer.config.mjs'),config);
const inputs=original.inputs.map(x=>({path:x.path,sha256:sha(path.join(repo,x.path))}));
const diagnostics=['node-renderer.config.mjs','node-renderer-setup.js','run-unit-retry.cjs'].map(p=>({path:p,sha256:sha(path.join(stage,p))}));
const args=[path.join(repo,'node_modules/vitest/vitest.mjs'),'run',...selected,'--config',config,'--pool=forks','--maxWorkers=1','--no-file-parallelism','--no-isolate','--testTimeout=180000','--hookTimeout=180000','--reporter=default','--reporter=json','--outputFile='+path.join(report,'results.json')];
const execution={completed:false,startedAt:new Date().toISOString(),scope:'Only the four files with intentional atlas/layout changes or a timed-out hook; unchanged passing files retain primary coverage.',previousAttempt:'attempts/01-execution.json',pool:'one shared fork worker without isolation',primaryResultsHash:sha(path.join(base,'results.json')),primaryExecutionHash:sha(path.join(base,'execution.json')),inputs,diagnostics,args};
fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');
const log=fs.createWriteStream(path.join(report,'stdout.txt'));const child=spawn(process.execPath,args,{cwd:repo,windowsHide:true,env:{...process.env,TEMP:temp,TMP:temp},stdio:['ignore','pipe','pipe']});
for(const stream of[child.stdout,child.stderr])stream.on('data',data=>{process.stdout.write(data);log.write(data);});
child.on('error',e=>{console.error(e);process.exitCode=1;});
child.on('exit',code=>{
 execution.completed=true;execution.exitCode=code;execution.finishedAt=new Date().toISOString();execution.inputsUnchanged=inputs.every(x=>sha(path.join(repo,x.path))===x.sha256);execution.diagnosticsUnchanged=diagnostics.every(x=>sha(path.join(stage,x.path))===x.sha256);
 fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');log.end();process.exitCode=code??1;
 if(code===0){
  const retried=JSON.parse(fs.readFileSync(path.join(report,'results.json')));assert.equal(retried.success,true);assert.equal(retried.numFailedTests,0);assert.equal(retried.testResults.length,4);
  const suites=[...primary.testResults.filter(x=>x.status==='passed'),...retried.testResults];assert.equal(suites.length,7);assert.ok(suites.every(x=>x.status==='passed'));
  const aggregate={completed:true,allFocusedAssertionsPassed:true,distinctFiles:7,distinctTests:suites.reduce((n,x)=>n+x.assertionResults.length,0),environment:'Diagnostic Node canvas/events shim; shared workers without isolation. Real DOM/WebGL checked separately.',primary:{resultsHash:sha(path.join(base,'results.json')),passedFiles:3,failedFilesRetried:4},retry:{resultsHash:sha(path.join(report,'results.json')),passedFiles:4},suites:suites.map(x=>({name:path.basename(x.name),passed:x.assertionResults.length})),fullDomSuiteRun:false};
  fs.writeFileSync(path.join(base,'aggregate.json'),JSON.stringify(aggregate,null,2)+'\n');console.log(JSON.stringify(aggregate));
 }
});

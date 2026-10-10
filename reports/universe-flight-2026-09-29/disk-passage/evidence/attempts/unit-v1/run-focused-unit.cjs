const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,report=path.join(stage,'focused-unit'),temp=path.join(stage,'unit-temp');
const config=path.join(repo,'reports/universe-flight-2026-09-29/disk-passage/unit/node-renderer.config.mjs');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sourcePin='255f57893385f5e0ae1a932d00f3ba8e7e98cacc8851bc6ce8985003bd025a75';
assert.equal(sha(path.join(repo,'stem_lab/universe_flight_scene.js')),sourcePin);assert.equal(sha(path.join(stage,'candidate-v2-renderer.js')),sourcePin);
assert.equal(sha(path.join(repo,'tests/universe_flight_navigation.test.js')),sha(path.join(stage,'candidate-navigation.test.js')));
assert.equal(sha(path.join(repo,'tests/universe_flight_disk_passage.test.js')),'b2bc0c1e3f0e26d7062330ae6699d15d42eef4379e481df32dec5de1234b9d1a');
const catalogTitles=[
 'adds six distinct generated destinations while preserving existing catalog IDs and independent metadata',
 'returns independent region-specific route catalogs and preserves the original Halo metadata',
 'preserves the Halo launch, duration, completion target and endpoint after a completed local route',
 'adds one detached cosmic route while retaining every existing generated galaxy',
 'exports named ordered highlights as detached route metadata',
];
const pattern=['Universe spiral disk passage','Universe flight special relativity','Universe flight elapsed clocks and distance','Universe flight directional spectrum','Universe flight round-trip light clock',...catalogTitles].join('|');
const selected=['tests/universe_flight_navigation.test.js','tests/universe_flight_physics.test.js','tests/universe_flight_disk_passage.test.js'];
fs.mkdirSync(report,{recursive:true});fs.mkdirSync(temp,{recursive:true});fs.mkdirSync(path.dirname(config),{recursive:true});assert.equal(fs.existsSync(path.join(report,'execution.json')),false,'Preserve previous unit attempts before retrying.');
fs.copyFileSync(path.join(stage,'node-renderer.config.mjs'),config);
const inputs=['stem_lab/universe_flight_scene.js',...selected].map(file=>({path:file,sha256:sha(path.join(repo,file))}));
const diagnostics=['candidate-v2-renderer.js','candidate-navigation.test.js','candidate-disk-passage.test.js','node-renderer.config.mjs','node-renderer-setup.mjs','run-focused-unit.cjs','test-patch-manifest.json'].map(file=>({path:file,sha256:sha(path.join(stage,file))}));
const args=[path.join(repo,'node_modules/vitest/vitest.mjs'),'run',...selected,'--config',config,'--pool=forks','--maxWorkers=1','--no-file-parallelism','--no-isolate','--testTimeout=180000','--hookTimeout=180000','--testNamePattern',pattern,'--reporter=default','--reporter=json','--outputFile='+path.join(report,'results.json')];
const execution={completed:false,startedAt:new Date().toISOString(),scope:'Filtered navigation coverage: five changed catalog tests only; full physics22 and nine new disk passage tests. The remaining navigation tests are skipped.',environment:'Node canvas/event mock with one shared fork worker; this is not a full DOM or native WebGL suite.',expectedPassingAssertions:36,selectedCatalogTitles:catalogTitles,pattern,inputs,diagnostics,args,config:{path:config,sha256:sha(config)}};
fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');const log=fs.createWriteStream(path.join(report,'stdout.txt'));
const child=spawn(process.execPath,args,{cwd:repo,windowsHide:true,env:{...process.env,TEMP:temp,TMP:temp},stdio:['ignore','pipe','pipe']});
for(const stream of[child.stdout,child.stderr])stream.on('data',data=>{process.stdout.write(data);log.write(data);});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{
 execution.completed=true;execution.exitCode=code;execution.finishedAt=new Date().toISOString();execution.inputsUnchanged=inputs.every(input=>sha(path.join(repo,input.path))===input.sha256);execution.diagnosticsUnchanged=diagnostics.every(input=>sha(path.join(stage,input.path))===input.sha256);execution.configUnchanged=sha(config)===execution.config.sha256;
 fs.writeFileSync(path.join(report,'execution.json'),JSON.stringify(execution,null,2)+'\n');log.end();process.exitCode=code??1;
 if(code===0){
  const result=JSON.parse(fs.readFileSync(path.join(report,'results.json')));assert.equal(result.success,true);assert.equal(result.numFailedTests,0);assert.equal(result.numPassedTests,36);assert.equal(result.testResults.length,3);
  const suites=result.testResults.map(file=>({path:path.relative(repo,file.name).replaceAll('\\','/'),passed:file.assertionResults.filter(test=>test.status==='passed').length,skipped:file.assertionResults.filter(test=>test.status!=='passed').length}));
  assert.deepEqual(suites.map(file=>file.passed).sort((a,b)=>a-b),[5,9,22]);
  const aggregate={completed:true,allPassed:true,distinctFiles:3,distinctTests:36,fullDomSuiteRun:false,environment:execution.environment,inputsUnchanged:execution.inputsUnchanged,diagnosticsUnchanged:execution.diagnosticsUnchanged,configUnchanged:execution.configUnchanged,rendererHash:sourcePin,resultsHash:sha(path.join(report,'results.json')),executionHash:sha(path.join(report,'execution.json')),suites};
  fs.writeFileSync(path.join(report,'aggregate.json'),JSON.stringify(aggregate,null,2)+'\n');console.log(JSON.stringify(aggregate));
 }
});

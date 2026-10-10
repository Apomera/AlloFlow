const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'))),source=fs.readFileSync(path.join(work,'candidate.js'));
const testFiles=['tests/firstresponse_patient_wrists.test.js','tests/firstresponse_hand_surface.test.js'],vendorFile='vendor/three-r128/three.min.js';
const testBytes=Object.fromEntries(testFiles.map(file=>[file,fs.readFileSync(path.join(repo,file))])),vendor=fs.readFileSync(path.join(repo,vendorFile));
assert.equal(sha(source),delta.afterSHA256);
const runtime=['stem_lab/stem_tool_firstresponse.js','desktop/web-app/public/stem_lab/stem_tool_firstresponse.js','desktop/app-build/stem_lab/stem_tool_firstresponse.js','desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'];
const sharedHashes=Object.fromEntries([...runtime,...testFiles,vendorFile].map(file=>[file,sha(fs.readFileSync(path.join(repo,file)))]));
for(const file of runtime)assert.equal(sharedHashes[file],delta.beforeSHA256,'Shared source drift');
const run=path.join(work,'raw-wrist-fold-tests');assert.ok(!fs.existsSync(run),'Preserve previous results');fs.mkdirSync(run);
for(const[name,bytes]of [[runtime[0],source],...Object.entries(testBytes),[vendorFile,vendor]]){const p=path.join(run,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);}
const helperRoot=path.join(work,'history-helper-sandbox'),privateHelpers=path.join(run,'tests/helpers');fs.cpSync(helperRoot,privateHelpers,{recursive:true});
const helperHashes=Object.fromEntries(fs.readdirSync(privateHelpers).map(name=>[name,sha(fs.readFileSync(path.join(privateHelpers,name)))]));
const privateSource=path.join(run,runtime[0]),configPath=path.join(run,'vitest.config.cjs'),resultPath=path.join(run,'candidate-results.json');
const config={root:run,resolve:{alias:{vitest:path.join(repo,'node_modules/vitest/dist/index.js')}},test:{include:testFiles,environment:'jsdom',maxWorkers:1,minWorkers:1,pool:'threads',fileParallelism:false,testTimeout:60000,hookTimeout:60000,reporters:['default','json'],outputFile:resultPath}};
fs.writeFileSync(configPath,'module.exports='+JSON.stringify(config,null,2)+';\n');
const pins={sourceSHA256:sha(source),testHashes:Object.fromEntries(Object.entries(testBytes).map(([f,b])=>[f,sha(b)])),runnerSHA256:sha(fs.readFileSync(__filename)),vendorSHA256:sha(vendor),configSHA256:sha(fs.readFileSync(configPath))};
let selftest={ran:false};
if(process.argv.includes('--selftest')){
  const saved=path.join(run,'saved-candidate.js');fs.writeFileSync(saved,source);let inputMutationRejected=false;
  try{fs.writeFileSync(privateSource,Buffer.concat([source,Buffer.from('\n// deliberate private input mutation\n')]));try{assert.equal(sha(fs.readFileSync(privateSource)),pins.sourceSHA256);}catch{inputMutationRejected=true;}}
  finally{fs.writeFileSync(privateSource,fs.readFileSync(saved));assert.deepEqual(fs.readFileSync(privateSource),source);assert.equal(sha(fs.readFileSync(saved)),pins.sourceSHA256);}
  assert.ok(inputMutationRejected);selftest={ran:true,inputMutationRejected,restoredAndReread:true,browserLaunched:false};
}
const temp=path.join(run,'temp');fs.mkdirSync(temp);
const args=['--no-opt','--no-sparkplug','--max-old-space-size=256',path.join(repo,'node_modules/vitest/vitest.mjs'),'run','--config',configPath];
const logFd=fs.openSync(path.join(run,'candidate.log'),'wx'),startedAt=new Date().toISOString(),timeoutMs=240000;
const child=spawn(process.execPath,args,{cwd:run,env:{...process.env,NODE_PATH:path.join(repo,'node_modules'),TEMP:temp,TMP:temp},windowsHide:true,stdio:['ignore',logFd,logFd]});
const launch={startedAt,pid:child.pid,parentPid:process.pid,args,cwd:run,sourceSHA256:pins.sourceSHA256,runnerSHA256:pins.runnerSHA256,timeoutMs,streamedOutput:true};fs.writeFileSync(path.join(run,'launch.json'),JSON.stringify(launch,null,2)+'\n');
let timedOut=false,spawnError=null;const timer=setTimeout(()=>{timedOut=true;child.kill();},timeoutMs);child.on('error',e=>{spawnError=e.message;});
child.on('close',(code,signal)=>{
clearTimeout(timer);fs.closeSync(logFd);const r={status:code,error:spawnError};
fs.writeFileSync(path.join(run,'exit.json'),JSON.stringify({pid:child.pid,endedAt:new Date().toISOString(),exitCode:code,signal,timedOut,spawnError,logSHA256:sha(fs.readFileSync(path.join(run,'candidate.log')))},null,2)+'\n');
assert.ok(fs.existsSync(resultPath),'Vitest result missing: '+(r.error||r.status));const result=JSON.parse(fs.readFileSync(resultPath));
for(const[file,h]of Object.entries(sharedHashes))assert.equal(sha(fs.readFileSync(path.join(repo,file))),h,'Shared input drift '+file);
for(const[file,h]of [[privateSource,pins.sourceSHA256],[path.join(work,'candidate.js'),pins.sourceSHA256],[configPath,pins.configSHA256],[__filename,pins.runnerSHA256],...Object.entries(pins.testHashes).map(([f,h])=>[path.join(run,f),h])])assert.equal(sha(fs.readFileSync(file)),h,'Private input drift '+file);
for(const[name,h]of Object.entries(helperHashes))assert.equal(sha(fs.readFileSync(path.join(privateHelpers,name))),h);
const stats={exitCode:r.status,numPassedTests:result.numPassedTests,numFailedTests:result.numFailedTests,numTotalTests:result.numTotalTests,numPendingTests:result.numPendingTests};
const passed=stats.exitCode===0&&stats.numPassedTests===56&&stats.numFailedTests===0&&stats.numTotalTests===56&&stats.numPendingTests===0;
const summary={...pins,...stats,passed,selftest,inputsUnchanged:true,sharedFilesWritten:0,sharedHashes,helperHashes};fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...stats,passed,selftest,sourceSHA256:pins.sourceSHA256}));if(!passed)process.exitCode=1;
});

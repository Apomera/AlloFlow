const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'))),edit=JSON.parse(fs.readFileSync(path.join(work,'raw-test-edit.json'))),source=fs.readFileSync(path.join(work,'candidate.js'));
const testFile=edit.file,vendorFile='vendor/three-r128/three.min.js',test=fs.readFileSync(path.join(work,edit.afterFile)),vendor=fs.readFileSync(path.join(repo,vendorFile));
assert.equal(sha(source),delta.afterSHA256);assert.equal(sha(test),edit.afterSHA256);assert.equal(sha(fs.readFileSync(path.join(repo,testFile))),edit.beforeSHA256);
const runtime=['stem_lab/stem_tool_firstresponse.js','desktop/web-app/public/stem_lab/stem_tool_firstresponse.js','desktop/app-build/stem_lab/stem_tool_firstresponse.js','desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'];
const sharedHashes=Object.fromEntries([...runtime,testFile,vendorFile].map(file=>[file,sha(fs.readFileSync(path.join(repo,file)))]));
for(const file of runtime)assert.equal(sharedHashes[file],delta.beforeSHA256,'Shared source drift');
const run=path.join(work,'raw-support-tests');assert.ok(!fs.existsSync(run),'Preserve previous results');fs.mkdirSync(run);
for(const[name,bytes]of [[runtime[0],source],[testFile,test],[vendorFile,vendor]]){const p=path.join(run,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);}
const helperRoot=path.join(work,'history-helper-sandbox'),privateHelpers=path.join(run,'tests/helpers');
fs.cpSync(helperRoot,privateHelpers,{recursive:true});
const helperHashes=Object.fromEntries(fs.readdirSync(privateHelpers).map(name=>[name,sha(fs.readFileSync(path.join(privateHelpers,name)))]));
const dependencyTarget=path.join(repo,'desktop/web-app/node_modules'),dependencyRoot=path.join(run,'desktop/web-app/node_modules');
const dependencyHashes={};
function copyDependency(dir,relative){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){assert.ok(!entry.isSymbolicLink(),'Unexpected dependency link');const rel=path.join(relative,entry.name),from=path.join(dir,entry.name),to=path.join(dependencyRoot,rel);if(entry.isDirectory())copyDependency(from,rel);else{const bytes=fs.readFileSync(from);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes);dependencyHashes[rel]=sha(bytes);}}}
for(const name of ['react','react-dom','scheduler','loose-envify','js-tokens'])copyDependency(path.join(dependencyTarget,name),name);
const privateSource=path.join(run,runtime[0]),configPath=path.join(run,'vitest.config.cjs'),resultPath=path.join(run,'candidate-results.json');
const config={root:run,resolve:{alias:{vitest:path.join(repo,'node_modules/vitest/dist/index.js')}},test:{include:[testFile],environment:'jsdom',maxWorkers:1,minWorkers:1,pool:'threads',fileParallelism:false,testTimeout:60000,hookTimeout:60000,reporters:['default','json'],outputFile:resultPath}};
fs.writeFileSync(configPath,'module.exports='+JSON.stringify(config,null,2)+';\n');
const pins={sourceSHA256:sha(source),testSHA256:sha(test),beforeTestSHA256:edit.beforeSHA256,runnerSHA256:sha(fs.readFileSync(__filename)),vendorSHA256:sha(vendor),configSHA256:sha(fs.readFileSync(configPath))};
let selftest={ran:false};
if(process.argv.includes('--selftest')){
  const saved=path.join(run,'saved-candidate.js');fs.writeFileSync(saved,source);let inputMutationRejected=false;
  try{fs.writeFileSync(privateSource,Buffer.concat([source,Buffer.from('\n// deliberate private input mutation\n')]));try{assert.equal(sha(fs.readFileSync(privateSource)),pins.sourceSHA256);}catch{inputMutationRejected=true;}}
  finally{fs.writeFileSync(privateSource,fs.readFileSync(saved));assert.deepEqual(fs.readFileSync(privateSource),source);assert.equal(sha(fs.readFileSync(saved)),pins.sourceSHA256);}
  assert.ok(inputMutationRejected);selftest={ran:true,inputMutationRejected,restoredAndReread:true,browserLaunched:false};
}
const temp=path.join(run,'temp');fs.mkdirSync(temp);
const args=['--max-old-space-size=512',path.join(repo,'node_modules/vitest/vitest.mjs'),'run','--config',configPath];
const r=spawnSync(process.execPath,args,{cwd:run,env:{...process.env,NODE_PATH:path.join(repo,'node_modules'),TEMP:temp,TMP:temp},windowsHide:true,encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024});
fs.writeFileSync(path.join(run,'candidate.log'),(r.stdout||'')+(r.stderr||''));
assert.ok(fs.existsSync(resultPath),'Vitest result missing: '+(r.error||r.status));const result=JSON.parse(fs.readFileSync(resultPath));
for(const[file,h]of Object.entries(sharedHashes))assert.equal(sha(fs.readFileSync(path.join(repo,file))),h,'Shared input drift '+file);
for(const[file,h]of [[privateSource,pins.sourceSHA256],[path.join(work,'candidate.js'),pins.sourceSHA256],[path.join(run,testFile),pins.testSHA256],[configPath,pins.configSHA256],[__filename,pins.runnerSHA256]])assert.equal(sha(fs.readFileSync(file)),h,'Private input drift '+file);
for(const[name,h]of Object.entries(helperHashes))assert.equal(sha(fs.readFileSync(path.join(privateHelpers,name))),h);
for(const[name,h]of Object.entries(dependencyHashes)){assert.equal(sha(fs.readFileSync(path.join(dependencyRoot,name))),h);assert.equal(sha(fs.readFileSync(path.join(dependencyTarget,name))),h);}
const stats={exitCode:r.status,numPassedTests:result.numPassedTests,numFailedTests:result.numFailedTests,numTotalTests:result.numTotalTests,numPendingTests:result.numPendingTests};
const passed=stats.exitCode===0&&stats.numPassedTests===109&&stats.numFailedTests===0&&stats.numTotalTests===109&&stats.numPendingTests===0;
const summary={...pins,...stats,passed,selftest,inputsUnchanged:true,sharedFilesWritten:0,sharedHashes,helperHashes,dependencyCopies:{path:'desktop/web-app/node_modules',source:dependencyTarget,verified:true,hashes:dependencyHashes}};
fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));if(!passed)process.exitCode=1;

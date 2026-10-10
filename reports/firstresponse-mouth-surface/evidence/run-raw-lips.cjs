const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const run=path.join(work,'raw-lip-surfaces');assert.ok(!fs.existsSync(run),'Preserve previous results');fs.mkdirSync(run);
const edit=JSON.parse(fs.readFileSync(path.join(work,'raw-test-edit.json'))),delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json')));
const source=fs.readFileSync(path.join(work,'candidate.js')),test=fs.readFileSync(path.join(work,edit.afterFile)),vendor=fs.readFileSync(path.join(repo,'vendor/three-r128/three.min.js'));
assert.equal(sha(source),delta.afterSHA256);assert.equal(sha(test),edit.afterSHA256);assert.equal(sha(fs.readFileSync(path.join(repo,edit.file))),edit.beforeSHA256);
const runtime=['stem_lab/stem_tool_firstresponse.js','desktop/web-app/public/stem_lab/stem_tool_firstresponse.js','desktop/app-build/stem_lab/stem_tool_firstresponse.js','desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'];
const sharedHashes=Object.fromEntries([...runtime,edit.file].map(file=>[file,sha(fs.readFileSync(path.join(repo,file)))]));
const privateSource=path.join(run,runtime[0]);
for(const[name,bytes]of [[runtime[0],source],[edit.file,test],['vendor/three-r128/three.min.js',vendor]]){const p=path.join(run,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);}
const configPath=path.join(run,'vitest.config.cjs'),resultPath=path.join(run,'vitest-results.json');
const config={root:run,resolve:{alias:{vitest:path.join(repo,'node_modules/vitest/dist/index.js')}},test:{include:[edit.file],environment:'jsdom',maxWorkers:1,minWorkers:1,pool:'threads',fileParallelism:false,testTimeout:60000,hookTimeout:60000,reporters:['default','json'],outputFile:resultPath}};
fs.writeFileSync(configPath,'module.exports='+JSON.stringify(config,null,2)+';\n');const pins={sourceSHA256:sha(source),testSHA256:sha(test),runnerSHA256:sha(fs.readFileSync(__filename)),vendorSHA256:sha(vendor),configSHA256:sha(fs.readFileSync(configPath))};
const temp=path.join(run,'temp');fs.mkdirSync(temp);
function execute(label){const args=[path.join(repo,'node_modules/vitest/vitest.mjs'),'run','--config',configPath];
  const r=spawnSync(process.execPath,args,{cwd:run,env:{...process.env,NODE_PATH:path.join(repo,'node_modules'),TEMP:temp,TMP:temp},windowsHide:true,encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024});
  fs.writeFileSync(path.join(run,label+'.log'),r.stdout+r.stderr);assert.ok(fs.existsSync(resultPath),'Vitest JSON missing '+label);const bytes=fs.readFileSync(resultPath);fs.writeFileSync(path.join(run,label+'-results.json'),bytes);const result=JSON.parse(bytes);return{exitCode:r.status,numPassedTests:result.numPassedTests,numFailedTests:result.numFailedTests,numTotalTests:result.numTotalTests,numPendingTests:result.numPendingTests};
}
let selftest={ran:false};
if(process.argv.includes('--selftest')){const needle='    var earInnerMaterial = material(0xaf8166,6,null,0x777777);';assert.equal(source.toString().split(needle).length,2);
  const saved=path.join(run,'saved-candidate.js');fs.writeFileSync(saved,source);let result;
  try{fs.writeFileSync(privateSource,source.toString().replace(needle,"    headPivot.getObjectByName('fr-manikin-mouth').position.y -= .04 * profile.head;\n"+needle));result=execute('hidden-seam-selftest');assert.notEqual(result.exitCode,0);assert.ok(result.numFailedTests>=6,'Hidden seam must fail visibility tests');}
  finally{fs.writeFileSync(privateSource,fs.readFileSync(saved));assert.deepEqual(fs.readFileSync(privateSource),source);assert.equal(sha(fs.readFileSync(saved)),pins.sourceSHA256);}
  selftest={ran:true,hiddenSeamRejected:true,restoredAndReread:true,result};
}
const result=execute('candidate');
for(const[file,h]of Object.entries(sharedHashes))assert.equal(sha(fs.readFileSync(path.join(repo,file))),h,'Shared input drift '+file);
assert.equal(sha(fs.readFileSync(privateSource)),pins.sourceSHA256);assert.equal(sha(fs.readFileSync(path.join(work,'candidate.js'))),pins.sourceSHA256);assert.equal(sha(fs.readFileSync(path.join(run,edit.file))),pins.testSHA256);assert.equal(sha(fs.readFileSync(path.join(work,edit.afterFile))),pins.testSHA256);
assert.equal(sha(fs.readFileSync(configPath)),pins.configSHA256);assert.equal(sha(fs.readFileSync(__filename)),pins.runnerSHA256);
const summary={...pins,...result,passed:result.exitCode===0&&result.numPassedTests===21&&result.numFailedTests===0&&result.numPendingTests===0,selftest,inputsUnchanged:true,sharedFilesWritten:0,sharedHashes};fs.writeFileSync(path.join(run,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));if(!summary.passed)process.exitCode=1;

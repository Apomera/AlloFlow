const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const runName=process.argv.slice(2).find(arg=>!arg.startsWith('--'))||'raw-arm-contours';
assert.match(runName,/^[a-z0-9][a-z0-9-]*$/,'private run directory name');
const suite=path.join(work,runName),summaryPath=path.join(suite,'summary.json');
assert.ok(!fs.existsSync(path.join(suite,'launch.json'))&&!fs.existsSync(summaryPath),'preserve any previous launched run');
const delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'),'utf8'));
const snapshot=JSON.parse(fs.readFileSync(path.join(work,'history-input-snapshot.json'),'utf8'));
const testName='firstresponse_rescuer_arm_contours.test.js',testSHA256=snapshot.fixtureHashes[testName];
assert.equal(sha(fs.readFileSync(path.join(repo,'tests',testName))),testSHA256,'raw test retains frozen bytes');
const tempDirectory=path.join(suite,'temp');fs.mkdirSync(tempDirectory,{recursive:true});
const files=[[path.join(work,'candidate.js'),'stem_lab/stem_tool_firstresponse.js'],[path.join(repo,'tests',testName),'tests/'+testName],[path.join(repo,'vendor/three-r128/three.min.js'),'vendor/three-r128/three.min.js']];
const inputs={};for(const[source,destination]of files){const bytes=fs.readFileSync(source),target=path.join(suite,destination);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);inputs[destination]=sha(bytes);}
assert.equal(inputs['stem_lab/stem_tool_firstresponse.js'],delta.afterSHA256,'private source equals latest candidate');
assert.equal(inputs['tests/'+testName],testSHA256,'copied raw test is exact');
const sharedSourceHashes=Object.fromEntries(Object.keys(snapshot.sourceHashes).map(file=>[file,sha(fs.readFileSync(path.join(repo,file)))]));
const config={root:suite,resolve:{alias:{vitest:path.join(repo,'node_modules/vitest/dist/index.js')}},test:{include:['tests/'+testName],environment:'jsdom',maxWorkers:1,minWorkers:1,pool:'threads',fileParallelism:false,testTimeout:60000,hookTimeout:60000,reporters:['default','json'],outputFile:path.join(suite,'vitest-results.json')}};
const configPath=path.join(suite,'vitest.config.cjs');fs.writeFileSync(configPath,'module.exports='+JSON.stringify(config,null,2)+';\n');
const args=[path.join(repo,'node_modules/vitest/vitest.mjs'),'run','--config',configPath];
const meta={command:[process.execPath,...args],cwd:suite,tempDirectory,inputs,sharedSourceHashes,configSHA256:sha(fs.readFileSync(configPath)),startedAt:new Date().toISOString(),testFile:'tests/'+testName,rawTestSHA256:testSHA256,sourceSHA256:delta.afterSHA256};
if(process.argv.includes('--prepare-only')){fs.writeFileSync(path.join(suite,'prepared.json'),JSON.stringify(meta,null,2)+'\n');console.log(JSON.stringify({prepared:true,runName,inputs,testFile:meta.testFile,sharedFilesWritten:0}));process.exit(0);}
fs.writeFileSync(path.join(suite,'launch.json'),JSON.stringify(meta,null,2)+'\n');
const output=fs.createWriteStream(path.join(suite,'run.log'));
const child=spawn(process.execPath,args,{cwd:suite,env:{...process.env,NODE_PATH:path.join(repo,'node_modules'),TEMP:tempDirectory,TMP:tempDirectory},windowsHide:true});
child.stdout.on('data',chunk=>{process.stdout.write(chunk);output.write(chunk);});child.stderr.on('data',chunk=>{process.stderr.write(chunk);output.write(chunk);});
child.on('close',code=>{output.end();const file=path.join(suite,'vitest-results.json'),result=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 for(const[source,destination]of files){assert.equal(sha(fs.readFileSync(path.join(suite,destination))),inputs[destination],'copied input stable');assert.equal(sha(fs.readFileSync(source)),inputs[destination],'original input stable');}
 for(const[file,hash]of Object.entries(sharedSourceHashes))assert.equal(sha(fs.readFileSync(path.join(repo,file))),hash,'shared source unchanged during private run');
 assert.equal(sha(fs.readFileSync(configPath)),meta.configSHA256,'configuration unchanged');
 const summary={...meta,finishedAt:new Date().toISOString(),exitCode:code,passed:code===0&&result?.numPassedTests>0&&result?.numFailedTests===0&&result?.numPassedTests===result?.numTotalTests,numPassedTests:result?.numPassedTests,numFailedTests:result?.numFailedTests,numPendingTests:result?.numPendingTests,numTotalTests:result?.numTotalTests,sourceIsExactCandidate:true,rawTestExact:true,sharedFilesWritten:0};
 fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));process.exitCode=summary.passed?0:1;
});

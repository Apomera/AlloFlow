const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',suite=path.join(work,'vitest-wrapper');
const priorSummary=path.join(work,'vitest-wrapper-summary.json');
if(fs.existsSync(priorSummary)){
  const prior=JSON.parse(fs.readFileSync(priorSummary,'utf8'));
  assert.equal(prior.passed,false,'never replace an accepted wrapper run');
  const retained=path.join(suite,prior.numPendingTests===12?'initial-filter-no-match':'initial-temp-denied');fs.mkdirSync(retained,{recursive:true});
  for(const name of ['run.log','launch.json','vitest-results.json','vitest.config.cjs'])if(fs.existsSync(path.join(suite,name)))fs.copyFileSync(path.join(suite,name),path.join(retained,name));
  fs.copyFileSync(priorSummary,path.join(retained,'summary.json'));
}
const tempDirectory=path.join(suite,'temp');fs.mkdirSync(tempDirectory,{recursive:true});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const files=[['candidate.js','stem_lab/stem_tool_firstresponse.js'],['firstresponse_neck_transition.test.js','tests/firstresponse_neck_transition.test.js'],['firstresponse_neck_mesh_checks.cjs','tests/helpers/firstresponse_neck_mesh_checks.cjs']];
const inputs={};
for(const [source,destination] of files){const value=fs.readFileSync(path.join(work,source)),target=path.join(suite,destination);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);inputs[destination]=hash(value);}
const vendor=path.join(suite,'vendor/three-r128/three.min.js');fs.mkdirSync(path.dirname(vendor),{recursive:true});fs.copyFileSync(path.join(repo,'vendor/three-r128/three.min.js'),vendor);inputs['vendor/three-r128/three.min.js']=hash(fs.readFileSync(vendor));
const config={root:suite,resolve:{alias:{vitest:path.join(repo,'node_modules/vitest/dist/index.js')}},test:{include:['tests/firstresponse_neck_transition.test.js'],environment:'jsdom',maxWorkers:1,minWorkers:1,pool:'forks',fileParallelism:false,testTimeout:60000,hookTimeout:60000,reporters:['default','json'],outputFile:path.join(suite,'vitest-results.json')}};
const configPath=path.join(suite,'vitest.config.cjs');fs.writeFileSync(configPath,'module.exports='+JSON.stringify(config,null,2)+';\n');
const args=[path.join(repo,'node_modules/vitest/vitest.mjs'),'run','--config',configPath,'-t','adult.*pose5.*contrast=false'];
const meta={command:[process.execPath,...args],cwd:suite,tempDirectory,inputs,configSHA256:hash(fs.readFileSync(configPath)),startedAt:new Date().toISOString()};
fs.writeFileSync(path.join(suite,'launch.json'),JSON.stringify(meta,null,2)+'\n');
const output=fs.createWriteStream(path.join(suite,'run.log'));
const child=spawn(process.execPath,args,{cwd:suite,env:{...process.env,NODE_PATH:path.join(repo,'node_modules'),TEMP:tempDirectory,TMP:tempDirectory},windowsHide:true});
child.stdout.on('data',chunk=>{process.stdout.write(chunk);output.write(chunk);});
child.stderr.on('data',chunk=>{process.stderr.write(chunk);output.write(chunk);});
child.on('close',code=>{output.end();const resultPath=path.join(suite,'vitest-results.json');const result=fs.existsSync(resultPath)?JSON.parse(fs.readFileSync(resultPath,'utf8')):null;
  for(const [name,value]of Object.entries(inputs))assert.equal(hash(fs.readFileSync(path.join(suite,name))),value,'pinned wrapper input');
  const summary={...meta,finishedAt:new Date().toISOString(),exitCode:code,passed:code===0&&result?.numPassedTests===1&&result?.numFailedTests===0,
    numPassedTests:result?.numPassedTests,numFailedTests:result?.numFailedTests,numPendingTests:result?.numPendingTests,caseFilter:'adult.*pose5.*contrast=false',sourceIsExactCandidate:true,rawTestAndHelperExact:true};
  fs.writeFileSync(path.join(work,'vitest-wrapper-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));process.exitCode=summary.passed?0:1;
});

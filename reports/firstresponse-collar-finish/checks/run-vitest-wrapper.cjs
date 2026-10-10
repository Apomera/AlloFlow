const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',suite=path.join(work,'vitest-wrapper'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const summaryPath=path.join(work,'vitest-wrapper-summary.json');assert.ok(!fs.existsSync(summaryPath),'retain any previous framework run before another launch');
const tempDirectory=path.join(suite,'temp');fs.mkdirSync(tempDirectory,{recursive:true});
const files=[[path.join(work,'candidate.js'),'stem_lab/stem_tool_firstresponse.js'],[path.join(work,'firstresponse_collar_surface.test.js'),'tests/firstresponse_collar_surface.test.js'],[path.join(work,'firstresponse_collar_mesh_checks.cjs'),'tests/helpers/firstresponse_collar_mesh_checks.cjs'],[path.join(repo,'tests/helpers/firstresponse_neck_mesh_checks.cjs'),'tests/helpers/firstresponse_neck_mesh_checks.cjs'],[path.join(repo,'vendor/three-r128/three.min.js'),'vendor/three-r128/three.min.js']];
const inputs={};for(const[source,destination]of files){const data=fs.readFileSync(source),target=path.join(suite,destination);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);inputs[destination]=hash(data);}
assert.equal(inputs['stem_lab/stem_tool_firstresponse.js'],'0cc79f45f9a57ce3c4f1d5fa674b56f462a2418c4b253dbc648557b37a6b2639');
const config={root:suite,resolve:{alias:{vitest:path.join(repo,'node_modules/vitest/dist/index.js')}},test:{include:['tests/firstresponse_collar_surface.test.js'],environment:'jsdom',maxWorkers:1,minWorkers:1,pool:'threads',fileParallelism:false,testTimeout:60000,hookTimeout:60000,reporters:['default','json'],outputFile:path.join(suite,'vitest-results.json')}};
const configPath=path.join(suite,'vitest.config.cjs');fs.writeFileSync(configPath,'module.exports='+JSON.stringify(config,null,2)+';\n');
const filter='adult.*pose5.*contrast=false',args=[path.join(repo,'node_modules/vitest/vitest.mjs'),'run','--config',configPath,'-t',filter];
const meta={command:[process.execPath,...args],cwd:suite,tempDirectory,inputs,configSHA256:hash(fs.readFileSync(configPath)),startedAt:new Date().toISOString(),caseFilter:filter};
if(process.argv.includes('--prepare-only')){fs.writeFileSync(path.join(suite,'prepared.json'),JSON.stringify(meta,null,2)+'\n');console.log(JSON.stringify({prepared:true,inputs,filter}));process.exit(0);}
fs.writeFileSync(path.join(suite,'launch.json'),JSON.stringify(meta,null,2)+'\n');const output=fs.createWriteStream(path.join(suite,'run.log'));
const child=spawn(process.execPath,args,{cwd:suite,env:{...process.env,NODE_PATH:path.join(repo,'node_modules'),TEMP:tempDirectory,TMP:tempDirectory},windowsHide:true});
child.stdout.on('data',chunk=>{process.stdout.write(chunk);output.write(chunk);});child.stderr.on('data',chunk=>{process.stderr.write(chunk);output.write(chunk);});
child.on('close',code=>{output.end();const file=path.join(suite,'vitest-results.json'),result=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
  for(const[source,destination]of files){assert.equal(hash(fs.readFileSync(path.join(suite,destination))),inputs[destination],'pinned copied wrapper input');assert.equal(hash(fs.readFileSync(source)),inputs[destination],'pinned original wrapper input');}
  const summary={...meta,finishedAt:new Date().toISOString(),exitCode:code,passed:code===0&&result?.numPassedTests===1&&result?.numFailedTests===0,numPassedTests:result?.numPassedTests,numFailedTests:result?.numFailedTests,numPendingTests:result?.numPendingTests,sourceIsExactCandidate:true,rawTestAndHelpersExact:true};
  fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));process.exitCode=summary.passed?0:1;
});

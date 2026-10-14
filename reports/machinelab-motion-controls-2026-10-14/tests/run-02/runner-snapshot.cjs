const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
process.chdir(path.resolve(__dirname,'../..'));
const frozen='9b8334a65498aa4ff567b482a31fbb5671f1736e22de67da6d3f29ef03c9acfa',baseline='e058da26d';
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
const out=path.resolve(process.argv[2]||__dirname+'/tests/run-01');assert(!fs.existsSync(out),'Use a fresh directory');fs.mkdirSync(out+'/test-temp',{recursive:true});
const groups=[
  {
    "file": "tests/machinelab_views.test.js",
    "pattern": "^Machine Lab: motion inspection controls",
    "expected": 8
  },
  {
    "file": "tests/machinelab_views.test.js",
    "pattern": "^Machine Lab: stroke distance previews",
    "expected": 11
  },
  {
    "file": "tests/machinelab_views.test.js",
    "pattern": "^Machine Lab: starting outline control",
    "expected": 8
  },
  {
    "file": "tests/machinelab_views.test.js",
    "pattern": "^Machine Lab: hold pose control",
    "expected": 4
  },
  {
    "file": "tests/machinelab_views.test.js",
    "pattern": "^Machine Lab: clue reminder and return navigation",
    "expected": 26
  },
  {
    "file": "tests/machinelab_a11y.test.js",
    "expected": 28
  },
  {
    "file": "tests/machinelab_i18n_hygiene.test.js",
    "expected": 8
  }
];
const tests=groups.map(g=>({file:g.file,sha256:hash(g.file),baselineSha256:g.fresh?null:sha(cp.execFileSync('git',['show',baseline+':'+g.file],{maxBuffer:5e6}))}));for(const t of tests){const previous=cp.execFileSync('git',['show',baseline+':'+t.file],{maxBuffer:5e6}).toString('utf8');assert.equal(fs.readFileSync(t.file,'utf8').replace(/\r\n/g,'\n'),previous.replace(/\r\n/g,'\n'));}
const manifest={baselineCommit:baseline,sourceSha256:frozen,runnerSha256:hash(__filename),helper:{path:'tests/helpers/stem_widgets_smoke_harness.js',sha256:hash('tests/helpers/stem_widgets_smoke_harness.js')},tests,runs:[]};
fs.copyFileSync(__filename,out+'/runner-snapshot.cjs');
function verify(){assert.equal(hash(source),frozen);assert.equal(hash(mirror),frozen);assert.equal(hash(manifest.helper.path),manifest.helper.sha256);for(const t of tests)assert.equal(hash(t.file),t.sha256);}
function write(name,data){fs.writeFileSync(out+'/'+name,JSON.stringify(data,null,2)+'\n');}
async function run(){
  let passed=0;
  for(const [i,g] of groups.entries()){
    verify();const stem='group-'+String(i+1).padStart(2,'0'),receipt=stem+'.json',log=stem+'.log',fd=fs.openSync(out+'/'+log,'wx');
    const args=['node_modules/vitest/vitest.mjs','run',g.file,'--maxWorkers=1','--pool=forks','--no-isolate','--testTimeout=30000','--reporter=default','--reporter=json','--outputFile',out+'/'+receipt];if(g.pattern)args.push('--testNamePattern',g.pattern);
    const row={...g,receipt,log,command:[process.execPath,...args],startedAt:new Date().toISOString()};manifest.runs.push(row);write('processes.json',manifest);
    const result=await new Promise(resolve=>{
      let error=null,timedOut=false;const child=cp.spawn(process.execPath,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8',TEMP:out+'/test-temp',TMP:out+'/test-temp'}});
      child.stdout.on('data',d=>fs.writeSync(fd,d));child.stderr.on('data',d=>fs.writeSync(fd,d));child.on('error',e=>{error=String(e);});
      const timer=setTimeout(()=>{timedOut=true;if(process.platform==='win32'&&child.pid)cp.spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGKILL');},120000);
      child.on('close',(exitCode,signal)=>{clearTimeout(timer);fs.closeSync(fd);resolve({exitCode,signal,error,timedOut});});
    });
    fs.writeFileSync(out+'/'+log,fs.readFileSync(out+'/'+log,'utf8').replace(/\r\n/g,'\n').split('\n').map(s=>s.trimEnd()).join('\n').trimEnd()+'\n');
    Object.assign(row,result,{finishedAt:new Date().toISOString(),sourceAfterSha256:hash(source),mirrorAfterSha256:hash(mirror),logSha256:hash(out+'/'+log)});if(fs.existsSync(out+'/'+receipt))row.receiptSha256=hash(out+'/'+receipt);write('processes.json',manifest);
    assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);verify();
    const report=JSON.parse(fs.readFileSync(out+'/'+receipt));assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPassedTests,g.expected);
    row.passedNames=report.testResults.flatMap(r=>r.assertionResults.filter(t=>t.status==='passed').map(t=>t.fullName));assert.equal(row.passedNames.length,g.expected);assert.equal(new Set(row.passedNames).size,g.expected);passed+=g.expected;write('processes.json',manifest);console.log(stem+': '+g.expected+' passed; native exit 0');
  }
  assert.equal(passed,93);verify();write('final.json',{sourceSha256:frozen,mirrorSha256:hash(mirror),passed,failed:0,processes:7,manifestSha256:hash(out+'/processes.json')});console.log('93 selected existing tests passed.');
}
run().catch(e=>{console.error(e.stack);process.exitCode=1;});

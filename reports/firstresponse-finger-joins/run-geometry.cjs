const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex'),log=path.join(work,'geometry.log');
assert.ok(!fs.existsSync(log),'Preserve prior geometry evidence');
const checker=path.join(work,'verify-finger-joins.cjs'),source=path.join(work,'candidate.js');
const pins={checkerSHA256:sha(fs.readFileSync(checker)),sourceSHA256:sha(fs.readFileSync(source))};
const args=['--max-old-space-size=256',checker,'--selftest'];
const fd=fs.openSync(log,'wx'),timeoutMs=450000,startedAt=new Date().toISOString();
const child=spawn(process.execPath,args,{cwd:work,windowsHide:true,stdio:['ignore',fd,fd]});
fs.writeFileSync(path.join(work,'geometry-launch.json'),JSON.stringify({...pins,pid:child.pid,parentPid:process.pid,args,timeoutMs,startedAt},null,2)+'\n');
console.log('START geometry pid='+child.pid);
let timedOut=false,spawnError=null;const timer=setTimeout(()=>{timedOut=true;child.kill();},timeoutMs);
child.on('error',e=>{spawnError=e.message;});
child.on('close',(exitCode,signal)=>{
  clearTimeout(timer);fs.closeSync(fd);
  const exit={exitCode,signal,timedOut,spawnError,endedAt:new Date().toISOString(),...pins,logSHA256:sha(fs.readFileSync(log))};
  fs.writeFileSync(path.join(work,'geometry-exit.json'),JSON.stringify(exit,null,2)+'\n');
  assert.equal(sha(fs.readFileSync(checker)),pins.checkerSHA256);assert.equal(sha(fs.readFileSync(source)),pins.sourceSHA256);
  console.log(JSON.stringify(exit));if(exitCode!==0||timedOut||spawnError)process.exitCode=1;
});

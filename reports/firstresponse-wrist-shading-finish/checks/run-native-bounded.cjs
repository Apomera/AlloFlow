const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const work=__dirname,[run,view]=process.argv.slice(2),limitMs=900000;
assert.match(run||'',/^[a-z0-9-]+$/);assert.ok(['adult-heel-side','child-heel-side-contrast'].includes(view));
const report=path.join(work,run),recordPath=path.join(work,run+'-watchdog.json');
assert.ok(!fs.existsSync(report),'fresh evidence directory required');assert.ok(!fs.existsSync(recordPath),'watchdog record already exists');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),runner=path.join(work,'run-wrists-browser.cjs');
const record={run,view,startedAt:new Date().toISOString(),limitMs,wrapperSHA256:sha(fs.readFileSync(__filename)),runnerSHA256:sha(fs.readFileSync(runner)),timedOut:false};
const save=()=>fs.writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n');
const child=spawn(process.execPath,[runner,run,view],{cwd:work,windowsHide:true,stdio:'inherit'});record.pid=child.pid;save();
const started=Date.now();console.log('BOUND native '+run+' pid='+child.pid+' limitMs='+limitMs);
const heartbeat=setInterval(()=>console.log('WAIT native '+run+' elapsedMs='+(Date.now()-started)),30000);
const deadline=setTimeout(()=>{
  record.timedOut=true;record.timeoutAt=new Date().toISOString();save();
  console.error('TIMEOUT native '+run+'; stopping spawned runner process tree pid='+child.pid);
  const stop=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'inherit'});
  stop.on('error',error=>{record.terminationError=error.message;save();child.kill();});
  stop.on('close',code=>{record.terminationExitCode=code;save();});
},limitMs);
child.on('error',error=>{record.error=error.message;save();});
child.on('close',(code,signal)=>{
  clearTimeout(deadline);clearInterval(heartbeat);record.finishedAt=new Date().toISOString();record.elapsedMs=Date.now()-started;record.exitCode=code;record.signal=signal;
  record.runnerUnchanged=sha(fs.readFileSync(runner))===record.runnerSHA256;save();process.exitCode=record.timedOut||!record.runnerUnchanged||code!==0?1:0;
  console.log(JSON.stringify(record));
});

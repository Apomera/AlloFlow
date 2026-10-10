const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const work=__dirname,startedAt=new Date().toISOString(),steps=[];
function availableSpace(){const disk=fs.statfsSync(work);const bytes=disk.bavail*disk.bsize;assert.ok(bytes>=64*1024*1024,'At least 64 MiB of disk space is required before installation');return bytes;}
async function run(args){
  const availableBytes=availableSpace();
  console.log('START guarded recovery '+args.join(' '));
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(work,'deliver-with-handoff.cjs'),...args],{cwd:work,windowsHide:true,stdio:['ignore','inherit','inherit']});
    let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();},450000);
    child.on('error',reject);child.on('close',(exitCode,signal)=>{clearTimeout(timer);steps.push({args,exitCode,signal,timedOut,availableBytes});if(exitCode===0&&!timedOut)resolve();else reject(Error('Guarded recovery failed '+JSON.stringify(steps.at(-1))));});
  });
}
(async()=>{
  await run(['--check-only','--selftest']);
  await run(['--apply']);
  const finish=JSON.parse(fs.readFileSync(path.join(work,'finish-integration.json')));assert.equal(finish.complete,true);
  fs.writeFileSync(path.join(work,'guarded-finish-recovery.json'),JSON.stringify({complete:true,startedAt,endedAt:new Date().toISOString(),steps,sourceSHA256:finish.sourceSHA256,reportPath:finish.reportPath},null,2)+'\n');
  console.log('DONE guarded recovery; no commit or deployment.');
})().catch(error=>{fs.writeFileSync(path.join(work,'guarded-finish-recovery-failure.json'),JSON.stringify({startedAt,endedAt:new Date().toISOString(),steps,error:error.stack},null,2)+'\n');console.error(error.stack);process.exitCode=1;});

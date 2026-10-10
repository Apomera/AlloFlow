const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const work=path.resolve(__dirname),id=process.argv[2]||'adult-head';if(!['adult-head','adult-support','infant-head-contrast'].includes(id))throw Error('Invalid view');
const run='native-'+id,dir=path.resolve(work,run),to=path.resolve(work,run+'-interrupted');
if(fs.existsSync(dir)){
  for(const p of[dir,to])if(!p.startsWith(work+path.sep))throw Error('Outside private directory');
  if(fs.existsSync(to))throw Error('Archive already exists');const runner=JSON.parse(fs.readFileSync(path.join(dir,'runner.json')));
  try{process.kill(runner.pid,0);throw Error('Native process still alive');}catch(error){if(error.code!=='ESRCH')throw error;}
  if(fs.existsSync(path.join(dir,'browser-run.json'))||fs.existsSync(path.join(dir,'summary.json'))||fs.readdirSync(dir).some(n=>n.endsWith('.png')))throw Error('Run already contains results');
  const inputs=JSON.parse(fs.readFileSync(path.join(dir,'inputs.json')));for(const[file,h]of Object.entries(inputs.inputs))if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==h)throw Error('Recorded input changed: '+file);
  fs.writeFileSync(path.join(dir,'failure.json'),JSON.stringify({error:'Tool execution was aborted during app refresh. Recorded child PID no longer exists; workflow produced no result JSON or PNG captures.',kind:'interrupted-before-result',exitCode:null,recordedPid:runner.pid,inputsUnchanged:true},null,2)+'\n');fs.renameSync(dir,to);
}
const space=fs.statfsSync(work);console.log(JSON.stringify({availableMB:Math.round(space.bavail*space.bsize/1024/1024)}));
const log=path.join(work,run+'-detached.log'),fd=fs.openSync(log,'wx');
const child=spawn(process.execPath,[path.join(work,'run-face-browser.cjs'),run,id],{cwd:work,windowsHide:true,detached:true,stdio:['ignore',fd,fd]});
fs.writeFileSync(path.join(work,run+'-launcher.json'),JSON.stringify({pid:child.pid,run,id,startedAt:new Date().toISOString(),boundedRunnerTimeoutMs:900000,log},null,2)+'\n');child.unref();fs.closeSync(fd);console.log(JSON.stringify({launched:true,pid:child.pid,run,id}));

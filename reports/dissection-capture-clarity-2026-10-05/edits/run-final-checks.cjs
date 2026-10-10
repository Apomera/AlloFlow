const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const statusFile=path.join(__dirname,'final-sequence.json');if(fs.existsSync(statusFile))throw Error('Sequence already started');
const jobs=[['unit-main','unit-main-latest'],['unit-axe','unit-axe-latest'],['gallery','gallery-latest']];
const status={start:new Date().toISOString(),jobs:[],running:null};
function save(){fs.writeFileSync(statusFile,JSON.stringify(status,null,2));}
async function run(mode,label){status.running=label;save();const log=fs.openSync(path.join(__dirname,label+'-runner.log'),'w');const exit=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(__dirname,'run-checks.cjs'),mode,label],{stdio:['ignore',log,log],windowsHide:true});status.runnerPid=child.pid;save();child.on('error',reject);child.on('exit',(code,signal)=>resolve({code,signal}));});fs.closeSync(log);status.jobs.push({mode,label,...exit,end:new Date().toISOString()});save();if(exit.code!==0)throw Error('Check failed: '+label);}
(async()=>{try{for(const [mode,label] of jobs)await run(mode,label);status.end=new Date().toISOString();status.running=null;status.success=true;save();}catch(error){status.end=new Date().toISOString();status.success=false;status.error=String(error);save();process.exitCode=1;}})();

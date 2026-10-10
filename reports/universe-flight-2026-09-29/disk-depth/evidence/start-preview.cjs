const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth');
const url='http://127.0.0.1:3187/stem_lab/universe_flight_scene.js',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const expected=sha(fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js')));
async function ready(){try{const r=await fetch(url,{signal:AbortSignal.timeout(2000)});return r.status===200&&sha(Buffer.from(await r.arrayBuffer()))===expected;}catch{return false;}}
(async()=>{
 let pid=null,existing=await ready();
 if(!existing){const log=fs.openSync(path.join(report,'preview-server.log'),'a');const child=spawn(process.execPath,[path.join(repo,'dev-tools/universe_flight_preview.cjs')],{cwd:repo,detached:true,windowsHide:true,stdio:['ignore',log,log]});pid=child.pid;child.unref();fs.closeSync(log);}
 let online=false;for(let i=0;i<20;i++){if(await ready()){online=true;break;}await new Promise(r=>setTimeout(r,500));}
 assert.equal(online,true,'Current renderer is served on the local preview');
 const result={completed:true,pid,existing,rendererHash:expected,url:'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=57#universe-flight'};
 fs.writeFileSync(path.join(report,'preview-server.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});

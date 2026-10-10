const fs=require('fs'),path=require('path');
const report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-adaptive-coaching-2026-10-09';
for(const item of fs.readdirSync(report)){const dir=path.join(report,item),run=path.join(dir,'run.json');if(!fs.existsSync(run))continue;const r=JSON.parse(fs.readFileSync(run));let alive=false;try{process.kill(r.pid,0);alive=true;}catch{}let result=null;try{const v=JSON.parse(fs.readFileSync(path.join(dir,'results.json')));result=v.stats||{passed:v.numPassedTests,failed:v.numFailedTests,excluded:v.numPendingTests};}catch{}console.log(JSON.stringify({item,pid:r.pid,alive,exit:r.exitCode,result}));}
const d=fs.statfsSync(report);console.log('Free MiB '+d.bavail*d.bsize/1048576);

const fs=require('node:fs'),path=require('node:path');
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith('.json')).map(f=>({name:f,time:fs.statSync(path.join(__dirname,f)).mtimeMs})).sort((a,b)=>a.time-b.time);
const latest=new Map(),runs=[];
for(const file of files){let r;try{r=JSON.parse(fs.readFileSync(path.join(__dirname,file.name),'utf8'));}catch(_){continue;}if(!Array.isArray(r.testResults))continue;
 runs.push({report:file.name,passed:r.numPassedTests,failed:r.numFailedTests,pending:r.numPendingTests,files:r.testResults.length});
 for(const result of r.testResults)latest.set(result.name,{file:path.basename(result.name),report:file.name,passed:result.assertionResults.filter(t=>t.status==='passed').length,failed:result.assertionResults.filter(t=>t.status==='failed').map(t=>({name:t.fullName,message:t.failureMessages.join('\n').slice(0,1600)})),pending:result.assertionResults.filter(t=>!['passed','failed'].includes(t.status)).length});
}
const current=Array.from(latest.values()),summary={runs,latestFiles:current.length,passed:current.reduce((n,r)=>n+r.passed,0),failed:current.reduce((n,r)=>n+r.failed.length,0),pending:current.reduce((n,r)=>n+r.pending,0),files:current};
console.log(JSON.stringify({...summary,files:current.filter(r=>r.failed.length)},null,2));
if(process.argv.includes('--save')){const file=path.join(__dirname,'verification-summary.json'),data=Buffer.from(JSON.stringify(summary,null,2)+'\n');if(fs.existsSync(file)){const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}}else fs.writeFileSync(file,data,{flag:'wx'});}

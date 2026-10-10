const fs=require('fs'),path=require('path'),report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-checkpoint-coaching-2026-10-09';
for(const dir of fs.readdirSync(report).filter(n=>/^(before|browser|unit|adjacent)-\d+$/.test(n))){
 const run=JSON.parse(fs.readFileSync(path.join(report,dir,'run.json')));console.log(dir,JSON.stringify({code:run.exitCode,end:run.end,stable:run.inputHashesStable}));
 const result=path.join(report,dir,'results.json');if(!fs.existsSync(result))continue;const r=JSON.parse(fs.readFileSync(result));console.log(JSON.stringify(r.stats||{passed:r.numPassedTests,failed:r.numFailedTests,skipped:r.numPendingTests}));
 if(r.testResults)for(const f of r.testResults)for(const t of f.assertionResults||[])if(t.status==='failed')console.log(t.fullName,t.failureMessages);
 if(r.stats?.unexpected){const scan=s=>{for(const sp of s.specs||[])for(const t of sp.tests||[])for(const rr of t.results||[])if(rr.errors?.length)console.log(sp.title,rr.errors);for(const c of s.suites||[])scan(c);};for(const s of r.suites||[])scan(s);}
}
const d=fs.statfsSync(report);console.log('Free disk MiB '+d.bavail*d.bsize/1048576);

const fs=require('fs'),path=require('path');
const report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-scenario-clarity-2026-10-06';
for(const f of fs.readdirSync(report).filter(f=>/^sequence-.*\.json$/.test(f))){const s=JSON.parse(fs.readFileSync(path.join(report,f)));console.log(JSON.stringify({file:f,...s}));}
for(const dir of fs.readdirSync(report,{withFileTypes:true}).filter(f=>f.isDirectory()&&fs.existsSync(path.join(report,f.name,'results.json')))){
 const r=JSON.parse(fs.readFileSync(path.join(report,dir.name,'results.json')));if(r.stats)console.log(JSON.stringify({job:dir.name,stats:r.stats}));else console.log(JSON.stringify({job:dir.name,passed:r.numPassedTests,failed:r.numFailedTests,total:r.numTotalTests,success:r.success}));
 function walk(s){for(const spec of s.specs||[])for(const t of spec.tests||[])for(const result of t.results||[])if(result.status!=='passed'&&process.argv[2]==='failures')console.log(JSON.stringify({job:dir.name,title:spec.title,status:result.status,errors:(result.errors||[]).map(e=>e.message.slice(0,1500))}));for(const c of s.suites||[])walk(c);}if(r.suites)for(const s of r.suites)walk(s);
 for(const suite of r.testResults||[])for(const a of suite.assertionResults||[])if(a.status==='failed')console.log(JSON.stringify({job:dir.name,title:a.fullName,errors:a.failureMessages}));
}

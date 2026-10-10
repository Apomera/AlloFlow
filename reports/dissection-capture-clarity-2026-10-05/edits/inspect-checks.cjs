const fs=require('node:fs'),path=require('node:path');
for(const name of process.argv.slice(2)){
 const folder=path.join(__dirname,name),file=path.join(folder,'results.json');if(!fs.existsSync(file)){console.log(JSON.stringify({name,results:false}));continue;}
 const r=JSON.parse(fs.readFileSync(file,'utf8'));const failures=[];
 if(r.testResults)for(const f of r.testResults)for(const a of f.assertionResults||[])if(a.status==='failed')failures.push({test:a.fullName,error:(a.failureMessages||[]).join('\n').slice(0,1800)});
 function visit(s){for(const c of s.specs||[])for(const t of c.tests||[])for(const a of t.results||[])if(a.status!=='passed'&&a.status!=='skipped')failures.push({test:c.title,error:(a.error?.message||JSON.stringify(a.errors||[])).slice(0,1800)});for(const c of s.suites||[])visit(c);}
 if(r.suites)r.suites.forEach(visit);
 console.log(JSON.stringify({name,stats:r.stats||{passed:r.numPassedTests,failed:r.numFailedTests,skipped:r.numPendingTests,total:r.numTotalTests},failures},null,2));
}

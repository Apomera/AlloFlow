const fs=require('node:fs'),path=require('node:path');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const dirs=[path.join(__dirname,'native-report'),path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/browser'),path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/unit'),path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/previews')];
for(const dir of dirs){
 if(!fs.existsSync(dir)){console.log(JSON.stringify({dir,missing:true}));continue;}
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){
  const obj=JSON.parse(fs.readFileSync(path.join(dir,file)));const summary={dir,file,keys:Object.keys(obj)};
  for(const key of ['completed','success','numTotalTests','numPassedTests','numFailedTests','failure','harnessSha256','harnessHash','analysisSha256','pins','errors','checks','loaderRetries','sourceReadErrors'])if(key in obj)summary[key]=obj[key];
  for(const key of ['captures','observations','comparisons','resources','stability','nearObserver','groups','audits','tests','views','testResults','checks','cases'])if(Array.isArray(obj[key]))summary[key+'Count']=obj[key].length;
  if(obj.testResults)summary.suites=obj.testResults.map(x=>({name:path.basename(x.name),status:x.status,assertions:x.assertionResults?.length,failed:x.assertionResults?.filter(a=>a.status!=='passed').map(a=>({title:a.title,messages:a.failureMessages}))}));
  console.log(JSON.stringify(summary));
 }
}

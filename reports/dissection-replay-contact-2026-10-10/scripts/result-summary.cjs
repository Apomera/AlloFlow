const fs=require('node:fs'),path=require('node:path');
const report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-replay-contact-2026-10-10';
const output={};for(const label of process.argv.slice(2)){const file=path.join(report,label,'results.json');if(!fs.existsSync(file)){output[label]={missing:true};continue;}const result=JSON.parse(fs.readFileSync(file,'utf8'));output[label]=result.stats||{passed:result.numPassedTests,failed:result.numFailedTests,excluded:result.numPendingTests};}
console.log(JSON.stringify(output,null,2));

const fs=require('node:fs'),path=require('node:path');
const out=__dirname,runs=['final-tests.json','final-lifecycle-tests.json','showcase-guard-tests.json'];
const latest=new Map();
for(const file of runs){const report=JSON.parse(fs.readFileSync(path.join(out,file),'utf8'));for(const suite of report.testResults)latest.set(suite.name,{source:file,...suite});}
const suites=[...latest.values()];
const summary={method:'Most recent result per test file across the main run and focused reruns.',rawRuns:runs,files:suites.length,passed:suites.reduce((n,s)=>n+s.assertionResults.filter(t=>t.status==='passed').length,0),success:suites.every(s=>s.status==='passed'&&s.assertionResults.every(t=>t.status==='passed')),suites:suites.map(s=>({file:s.name,source:s.source,passed:s.assertionResults.length,status:s.status}))};
if(!summary.success)throw Error('A final suite is not passing');
function write(p,s){if(fs.existsSync(p)){const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}else fs.writeFileSync(p,s);}
write(path.join(out,'verified-tests.json'),JSON.stringify(summary,null,2)+'\n');
const reportPath=path.join(out,'VISUAL-POLISH.md');let report=fs.readFileSync(reportPath,'utf8');
report=report.replace('[graphics/building/Print Lab regressions](final-tests.json)','[graphics/building/Print Lab regressions](verified-tests.json)');
if(!report.includes('251 focused tests'))report=report.replace('Evidence:', '**251 focused tests passed across ten files**, including the shape, STL, Print Lab, keyboard, graphics, and engine lifecycle checks. The record combines the main run with focused reruns of the graphics and input suites.\n\nEvidence:');
write(reportPath,report);
for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js']){const a=fs.readFileSync('stem_lab/'+name),b=fs.readFileSync('desktop/web-app/public/stem_lab/'+name);if(!a.equals(b))throw Error('Mirror differs: '+name);}
console.log(JSON.stringify({files:summary.files,passed:summary.passed,success:summary.success,mirrors:'all three pairs match'}));

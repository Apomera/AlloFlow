const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),tests=new Map();
for(const name of ['integration-final-tests.json','reduced-motion-tests.json','camera-fit-tests.json','creation-focus-tests.json']){
  const report=JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
  if(!report.success || report.numFailedTests || report.numFailedTestSuites || report.wasInterrupted)throw Error('Incomplete test report: '+name);
  let count=0;
  for(const suite of report.testResults){
    if(suite.status!=='passed' || suite.assertionResults.some(test=>test.status!=='passed'))throw Error('Incomplete suite: '+suite.name);
    count+=suite.assertionResults.length;
    tests.set(path.basename(suite.name),{count:suite.assertionResults.length,evidence:name});
  }
  if(count!==report.numPassedTests)throw Error('Test count differs: '+name);
}
const sources={};
for(const file of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js']){
  const source=fs.readFileSync(path.join(root,'stem_lab',file)),mirror=fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab',file));
  if(!source.equals(mirror))throw Error('Mirror mismatch: '+file);
  new Function(source.toString('utf8'));
  sources[file]=crypto.createHash('sha256').update(source).digest('hex');
}
const browser=JSON.parse(fs.readFileSync(path.join(__dirname,'focus-final-results.json'),'utf8'));
if(!(browser.passed===true || browser.pass===true) || (browser.errors || []).length || (browser.consoleErrors || []).length)throw Error('Final browser verification incomplete');
const summary={verifiedAt:new Date().toISOString(),passedTests:[...tests.values()].reduce((n,s)=>n+s.count,0),testsByFile:Object.fromEntries(tests),syntax:'passed',desktopMirrors:'byte-identical',sourceSHA256:sources,browser:{passed:true,evidence:'focus-final-results.json'}};
fs.writeFileSync(path.join(__dirname,'focus-pass-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));

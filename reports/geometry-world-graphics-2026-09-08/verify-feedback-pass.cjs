const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const reports=['placement-transaction-tests.json','building-controls-tests.json','input-transition-tests.json','workspace-feedback-tests.json','workspace-feedback-visual-tests.json','highres-export-tests.json','history-refresh-tests.json','retained-selection-tests.json'];
// A later result for the same file replaces the earlier result, including a
// corrected legacy visual assertion. Parameterized cases retain their own count.
const suites=new Map();
for(const report of reports){
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,report),'utf8'));
  for(const suite of data.testResults)suites.set(path.basename(suite.name),{suite,report});
}
const testsByFile={},evidenceByFile={};
for(const [name,{suite,report}] of suites){
  if(suite.status!=='passed'||suite.assertionResults.some(test=>test.status!=='passed'))throw Error('Unresolved regression in '+name+' ('+report+')');
  testsByFile[name]=suite.assertionResults.length;evidenceByFile[name]=report;
}
const hashes={};
for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js']){
  const src=fs.readFileSync(path.join(root,'stem_lab',name)),mirror=fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab',name));
  if(!src.equals(mirror))throw Error('Mirror differs: '+name);
  new Function(src.toString('utf8'));
  hashes[name]=crypto.createHash('sha256').update(src).digest('hex');
}
const result={verifiedAt:new Date().toISOString(),passedTests:Object.values(testsByFile).reduce((a,b)=>a+b,0),testsByFile,evidenceByFile,syntax:'passed',desktopMirrors:'byte-identical',sourceSHA256:hashes};
fs.writeFileSync(path.join(__dirname,'workspace-feedback-summary.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

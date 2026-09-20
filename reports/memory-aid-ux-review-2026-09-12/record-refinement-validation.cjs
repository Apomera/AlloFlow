const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const dir=__dirname,byFile=new Map();
for(const file of ['refinement-validation.json','refinement-final-targeted.json','refinement-final-label-checks.json']){
 const report=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
 for(const row of report.testResults)byFile.set(row.name,{name:row.name,source:file,passed:row.assertionResults.filter(x=>x.status==='passed').length,failed:row.assertionResults.filter(x=>x.status==='failed').length,status:row.status});
}
const tests=[...byFile.values()];if(tests.some(x=>x.failed||x.status!=='passed'))throw Error('Final test results not all passing');
const files=['memory_aid_module.js','generate_dispatcher_module.js','doc_pipeline_module.js','studio_response_module.js','ui_strings.js'];
const mirrors=files.map(file=>({file,identical:fs.readFileSync(file).equals(fs.readFileSync(path.join('desktop/web-app/public',file)))}));if(mirrors.some(x=>!x.identical))throw Error('Public module mismatch');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const browser=JSON.parse(fs.readFileSync(path.join(dir,'refinement-browser-qa.json'),'utf8'));
const result={date:'2026-09-19',tests:{passed:tests.reduce((n,x)=>n+x.passed,0),failed:0,files:tests},browser:{states:browser.states.length,widths:[1280,390,320],violations:browser.states.reduce((n,x)=>n+x.violations.length,0),overflow:browser.states.some(x=>x.overflow),errors:browser.errors,checks:browser.checks},mirrors,buildFreshness:execFileSync(process.execPath,['_build_memory_aid_module.js','--check'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(['memory_aid_source.jsx','generate_dispatcher_source.jsx','doc_pipeline_source.jsx','studio_response_module.js','_build_memory_aid_module.js'].map(file=>[file,hash(file)])),limitations:['Local authored fixture and mocked AI; no live generation or classroom learning-outcome study.']};
fs.writeFileSync(path.join(dir,'REFINEMENT-VALIDATION-2026-09-19.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.tests.passed,testFiles:tests.length,browser:result.browser,mirrors}));

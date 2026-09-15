const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const reports=['preview-tests.json','dock-tests.json','core-refinement-tests.json','final-refinement-tests.json','final-alignment-tests.json','aim-and-crosshair-tests.json','discoverability-final-tests.json',...process.argv.slice(2)];
const latest=new Map();
for(const report of reports){
 const result=JSON.parse(fs.readFileSync(path.join(__dirname,report),'utf8'));
 for(const file of result.testResults)latest.set(file.name,{file:path.basename(file.name),report,status:file.status,assertions:file.assertionResults});
}
const files=Array.from(latest.values()).sort((a,b)=>a.file.localeCompare(b.file)).map(file=>({file:file.file,report:file.report,status:file.status,passed:file.assertions.filter(a=>a.status==='passed').length,failed:file.assertions.filter(a=>a.status==='failed').length,pending:file.assertions.filter(a=>!['passed','failed'].includes(a.status)).length}));
const result={scope:'Latest result for each targeted test file run during this refinement pass; earlier results superseded only by a rerun of the same file. This is not a full repository suite run.',files,totalFiles:files.length,passed:files.reduce((n,f)=>n+f.passed,0),failed:files.reduce((n,f)=>n+f.failed,0),pending:files.reduce((n,f)=>n+f.pending,0)};
result.success=files.every(f=>f.status==='passed')&&result.failed===0&&result.pending===0;
const target=path.join(__dirname,'targeted-verification-summary.json'),data=Buffer.from(JSON.stringify(result,null,2)+'\n');
if(fs.existsSync(target)){const fd=fs.openSync(target,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}}else fs.writeFileSync(target,data,{flag:'wx'});
console.log(JSON.stringify({files:result.totalFiles,passed:result.passed,failed:result.failed,pending:result.pending,success:result.success}));
assert(result.success,'Latest targeted results contain failures or pending tests');

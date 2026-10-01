const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=__dirname,source=path.resolve(root,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'basis.json'),'utf8'));
const newFiles=['catalog/cloudflare-worker/src/bug-reports.js','catalog/cloudflare-worker/BUG_REPORTING.md','tests/bug_report_governance.test.js','tests/error_reporter_privacy.test.js'];
const files=[...Object.keys(manifest.hashes),...newFiles];
const patches=[],changed=[];
for(const file of files){
 const before=path.join(root,'basis',file),after=path.join(root,'candidate',file);
 if(fs.existsSync(before)&&fs.readFileSync(before).equals(fs.readFileSync(after)))continue;
 const args=['diff','--no-index','--no-ext-diff','--src-prefix=a/','--dst-prefix=b/','--',fs.existsSync(before)?'basis/'+file:'NUL','candidate/'+file];
 const r=cp.spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
 if(r.status!==1&&r.status!==0)throw Error(r.stderr);
 const patch=r.stdout.replaceAll('a/basis/','a/').replaceAll('b/candidate/','b/').replaceAll('a/candidate/','a/');
 patches.push(patch);changed.push(file);
}
const patchFile=path.join(root,'bug-report-privacy.patch');fs.writeFileSync(patchFile,patches.join(''));
const check=cp.spawnSync('git',['apply','--check','--whitespace=error-all',patchFile],{cwd:source,encoding:'utf8'});
const primaryHead=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
const tests=JSON.parse(fs.readFileSync(path.join(root,'final-tests.json'),'utf8'));
const browser=JSON.parse(fs.readFileSync(path.join(root,'browser-results.json'),'utf8'));
const candidateHashes=Object.fromEntries(changed.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'candidate',file))).digest('hex')]));
const primaryMatches=Object.fromEntries(Object.keys(manifest.hashes).map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex')===manifest.hashes[file]]));
const result={basisHead:manifest.sourceHead,checkedHead:primaryHead,checkedAt:new Date().toISOString(),patchApplies:check.status===0,patchCheckOutput:(check.stdout+check.stderr).trim(),files:changed,candidateHashes,primaryMatches,tests:{total:tests.numTotalTests,passed:tests.numPassedTests,failed:tests.numFailedTests},browser};
fs.writeFileSync(path.join(root,'handoff-check.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({basis:result.basisHead,head:primaryHead,patchApplies:result.patchApplies,check:result.patchCheckOutput,files:changed,tests:result.tests,primaryFilesStillMatch:Object.values(primaryMatches).every(Boolean)}));
if(check.status!==0)process.exitCode=1;


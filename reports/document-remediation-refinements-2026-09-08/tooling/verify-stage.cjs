'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=process.cwd(), service=path.resolve('services/alloflow-remote-mcp');
const evidence=path.resolve('reports/document-remediation-refinements-2026-09-08/tooling');
if(fs.realpathSync(service)!==service)throw Error('Service root must resolve to the intended workspace directory');
for(const name of fs.readdirSync(service).filter(name=>name==='.runner-context'||name.startsWith('.runner-context.tmp-'))){
 const target=path.resolve(service,name),stat=fs.lstatSync(target),relative=path.relative(service,fs.realpathSync(target));
 if(stat.isSymbolicLink()||relative.startsWith('..')||path.isAbsolute(relative)||!target.startsWith(service+path.sep))throw Error('Unsafe staging target: '+target);
}
function run(name,args){
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:4*1024*1024});
 fs.writeFileSync(path.join(evidence,name+'.log'),(result.stdout||'')+(result.stderr||''));
 if(result.status!==0||result.error)throw Error(name+' failed: '+(result.error?.message||result.status));
 return {passed:true,exitCode:result.status};
}
const checks={stage:run('runner-stage',['services/alloflow-remote-mcp/scripts/stage-runner.cjs'])};
checks.check=run('runner-stage-check',['services/alloflow-remote-mcp/scripts/stage-runner.cjs','--check']);
checks.ocrMapping=run('runner-stage-ocr-test',['--test','services/alloflow-remote-mcp/runner/test/staged-ocr-mapping.test.cjs']);
const staged=path.join(service,'.runner-context');
const manifest=JSON.parse(fs.readFileSync(path.join(staged,'manifest.json'),'utf8'));
const contract=fs.readFileSync(path.join(service,'src/runner-release-contract.ts'),'utf8');
const release=JSON.parse(contract.match(/export const RUNNER_RELEASE_CONTRACT = ([\s\S]*?) as const;/)[1]);
const driver=require(path.join(staged,'desktop/mcp/remediation_headless_driver.cjs'));
if(typeof driver.createDriver!=='function')throw Error('Packaged driver did not load');
const report=JSON.parse(fs.readFileSync(path.join(evidence,'mcp-final/benchmark-report.json'),'utf8'));
const raw=JSON.parse(fs.readFileSync(path.join(evidence,'mcp-final/trials/scripted-pipeline/trial-01/result.json'),'utf8'));
const result={mcp:{summary:report.summary,trialStatus:report.trials[0].status,implementationSha256:report.versions.implementationSha256,sourceDrift:report.trials[0].versions.sourceDrift,subprocessDurationMs:report.trials[0].durationMs,selftestDurationMs:raw.durationMs,checks:raw.checks,modelCalls:raw.modelCalls,beforeScore:raw.beforeScore,afterScore:raw.afterScore},stage:{checks,files:manifest.files.length,build:release.build,packagedDriverLoaded:true,selectedFiles:manifest.files.filter(file=>['doc_pipeline_module.js','desktop/mcp/remediation_headless_driver.cjs','desktop/mcp/remediation_verification.cjs'].includes(file.path))}};
fs.writeFileSync(path.join(evidence,'final-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

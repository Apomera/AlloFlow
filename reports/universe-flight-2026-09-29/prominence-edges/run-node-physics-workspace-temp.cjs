'use strict';
// Diagnostic only: retry the original physics file with a writable transform
// cache location. The DOM unit suite is outside this runner's scope.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..'),temp='C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-3/universe-detail-lens/temp';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const hash=file=>digest(fs.readFileSync(path.join(repo,file)));
const before=JSON.parse(fs.readFileSync(path.join(__dirname,'node-physics-attempt.json'),'utf8'));
assert.equal(before.completed,true);assert.equal(before.exitCode,1);assert.ok(fs.statSync(temp).isDirectory());
for(const [file,pin]of Object.entries(before.pins)) assert.equal(hash(file),pin,'Diagnostic source/config/setup bytes stay exact');
const oldReport='unit-diagnostic-node-default-temp.json',oldMetadata='node-physics-default-temp-attempt.json';
fs.copyFileSync(path.join(__dirname,'unit-diagnostic-node.json'),path.join(__dirname,oldReport),fs.constants.COPYFILE_EXCL);
fs.copyFileSync(path.join(__dirname,'node-physics-attempt.json'),path.join(__dirname,oldMetadata),fs.constants.COPYFILE_EXCL);
assert.equal(digest(fs.readFileSync(path.join(__dirname,oldReport))),before.reportHash);
const attemptsPath=path.join(__dirname,'diagnostic-attempts.json'),attempts=JSON.parse(fs.readFileSync(attemptsPath,'utf8'));
const oldAttempt=attempts.attempts.find(item=>item.sessionId===69387);assert.ok(oldAttempt);
oldAttempt.originalCapturedReport=oldAttempt.report;oldAttempt.report=oldReport;oldAttempt.metadata=oldMetadata;
fs.writeFileSync(attemptsPath,JSON.stringify(attempts,null,2)+'\n');
const args=['node_modules/vitest/vitest.mjs','run','tests/universe_flight_physics.test.js','--config','reports/universe-flight-2026-09-29/prominence-edges/node-physics.config.mjs','--pool=forks','--maxWorkers=1','--no-file-parallelism','--isolate','--reporter=default','--reporter=json','--outputFile=reports/universe-flight-2026-09-29/prominence-edges/unit-diagnostic-node.json'];
const command='node '+args.join(' '),target=path.join(__dirname,'node-physics-workspace-temp-attempt.json');
assert.ok(!fs.existsSync(target),'Do not repeat this diagnostic');
const record={completed:false,startedAt:new Date().toISOString(),scope:before.scope,environment:'node',jsdomBypassed:true,repositoryBrowserSetupBypassed:true,browserGlobalAlias:before.browserGlobalAlias,nodeVersion:process.version,vitestVersion:before.vitestVersion,executionBoundary:'default sandbox; cmd.exe; login:false; explicit TEMP/TMP inherited by transform server and fork',temporaryDirectory:{TEMP:temp,TMP:temp},command,commandHash:digest(command),runnerHash:digest(fs.readFileSync(__filename)),pins:before.pins,preservedDefaultTempReport:oldReport,preservedDefaultTempReportHash:before.reportHash,preservedDefaultTempMetadata:oldMetadata,preservedDefaultTempMetadataHash:digest(fs.readFileSync(path.join(__dirname,oldMetadata))),report:'unit-diagnostic-node.json'};
const save=()=>fs.writeFileSync(target,JSON.stringify(record,null,2)+'\n');save();
console.log(JSON.stringify({starting:true,environment:'node',TEMP:temp,TMP:temp,preservedDefaultTempReport:oldReport,pins:record.pins}));
const started=Date.now(),run=cp.spawnSync(process.execPath,args,{cwd:repo,env:{...process.env,TEMP:temp,TMP:temp},stdio:'inherit'});
record.elapsedMs=Date.now()-started;record.finishedAt=new Date().toISOString();record.exitCode=run.status;if(run.error)record.error=String(run.error);
const reportPath=path.join(__dirname,record.report);
if(fs.existsSync(reportPath)){
  const bytes=fs.readFileSync(reportPath),report=JSON.parse(bytes);record.reportHash=digest(bytes);record.tests={success:report.success,total:report.numTotalTests,passed:report.numPassedTests,failed:report.numFailedTests,files:report.testResults.length};
}
record.pinsUnchanged=Object.entries(before.pins).every(([file,pin])=>hash(file)===pin);
record.completed=true;record.outcome=run.status===0&&record.tests?.success?'Node physics subset passed; DOM suite proof remains pending':'Node physics retry failed; unit recovery stopped';save();
console.log(JSON.stringify({...record,metadataHash:digest(fs.readFileSync(target))}));
process.exitCode=run.status===0&&record.pinsUnchanged?0:1;

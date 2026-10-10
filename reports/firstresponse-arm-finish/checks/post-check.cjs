const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
// Run after integration. This script writes only its private post-check report.
const args = process.argv.slice(2);
function option(name, fallback) { const i=args.indexOf(name); if(i<0)return fallback; assert.ok(args[i+1]&&!args[i+1].startsWith('--'),'missing '+name); return args[i+1]; }
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFileSync(file,'utf8'),json=file=>JSON.parse(read(file));
const candidatePath=path.join(work,'candidate.js'),candidateBytes=fs.readFileSync(candidatePath),candidate=candidateBytes.toString('utf8');
const sourceSHA256=sha(candidateBytes),baseline=read(path.join(work,'before.js'));
const delta=json(path.join(work,'delta.json')),integration=json(path.join(work,'history-integration.json'));
const preservation=json(path.join(work,'history-preservation.json')),snapshot=json(path.join(work,'history-input-snapshot.json'));
const checkerArgument=option('--checker',null),geometryArgument=option('--geometry-result',null);
assert.ok(checkerArgument&&geometryArgument,'provide --checker PATH and --geometry-result PATH for the exact executed checker and result');
const checkerPath=path.resolve(checkerArgument),geometryPath=path.resolve(geometryArgument);
const privateCheckerBytes=fs.readFileSync(checkerPath),geometryBytes=fs.readFileSync(geometryPath),geometry=JSON.parse(geometryBytes);
const sharedCheckerFile=option('--shared-checker','dev-tools/firstresponse_arm_finish_check.cjs');
assert.equal(sha(baseline),'179ddeefd0c930ca4a084d98fc683c321fb4f36f720e62cddf8b30d56b576466');
assert.equal(delta.beforeSHA256,sha(baseline));assert.equal(delta.afterSHA256,sourceSHA256);
assert.equal(integration.sourceSHA256,sourceSHA256,'rerun prepare-history after candidate changes');
assert.equal(integration.beforeSHA256,delta.beforeSHA256);
assert.equal(preservation.sourceSHA256,sourceSHA256);assert.equal(preservation.beforeSHA256,delta.beforeSHA256);
assert.equal(integration.historicalAssertionsChanged,false);assert.equal(preservation.historicalAssertionsChanged,false);
assert.equal(preservation.selftest.ran,true);assert.equal(preservation.selftest.restoredAndReread,true);
let reconstructed=baseline;
for(const edit of delta.edits){assert.equal(reconstructed.split(edit.old).length,2);reconstructed=reconstructed.replace(edit.old,edit.new);}
assert.equal(reconstructed,candidate,'delta accounts for every current source byte');
const sourceCopies=Object.keys(snapshot.sourceHashes);
assert.equal(sourceCopies.length,4);
for(const file of sourceCopies){assert.equal(snapshot.sourceHashes[file],delta.beforeSHA256);assert.ok(fs.readFileSync(path.join(repo,file)).equals(candidateBytes),'integrated source copy: '+file);}
const fixtureHashes=snapshot.fixtureHashes;
assert.equal(Object.keys(fixtureHashes).length,39);assert.deepEqual(preservation.fixtureHashes,fixtureHashes);
for(const[name,hash]of Object.entries(fixtureHashes))assert.equal(sha(fs.readFileSync(path.join(repo,'tests',name))),hash,'raw test unchanged: '+name);
const preparedFiles=[...integration.additions,...integration.edits];
for(const item of preparedFiles){const content=item.content??item.after,hash=item.SHA256??item.afterSHA256;assert.equal(sha(content),hash);assert.equal(read(path.join(repo,item.file)),content,'prepared file exact: '+item.file);}
assert.deepEqual(json(path.join(repo,'tests/helpers/firstresponse_arm_finish_delta.json')),delta);
for(const[name,hash]of Object.entries(snapshot.checkerHashes))assert.equal(sha(fs.readFileSync(path.join(repo,'dev-tools',name))),hash,'historical checker remains byte-identical: '+name);
assert.equal(Object.keys(snapshot.checkerHashes).length,7,'seven existing checkers preserved');
const changedHelpers=new Map(integration.edits.filter(item=>item.file.startsWith('tests/helpers/')).map(item=>[path.basename(item.file),item.afterSHA256]));
for(const[name,hash]of Object.entries(snapshot.helperHashes))assert.equal(sha(fs.readFileSync(path.join(repo,'tests/helpers',name))),changedHelpers.get(name)||hash,'historical helper exact: '+name);
assert.equal(preservation.historicalChain.length,10);
for(const item of preservation.historicalChain){const fn=require(path.join(repo,'tests/helpers',item.file))[item.method];assert.equal(sha(fn(candidate)),item.SHA256);assert.equal(sha(fn(baseline)),item.SHA256);assert.throws(()=>fn(candidate+'\n'),'unknown source rejected: '+item.file);}

// Pin the checker that produced the accepted result. No old generator is used.
const normalize=file=>path.resolve(file).replace(/\\/g,'/').toLowerCase();
function executionPin(file, explicitKey){
 const paths=Object.entries(geometry.inputs||{}).filter(([key])=>normalize(key)===normalize(file));
 if(paths.length){assert.equal(paths.length,1,'one input pin for '+file);return paths[0][1];}
 const value=geometry[explicitKey]??geometry.inputHashes?.[explicitKey];
 assert.match(value||'',/^[0-9a-f]{64}$/,'execution result must pin '+explicitKey);return value;
}
const executedCheckerSHA256=executionPin(checkerPath,'checkerSHA256');
const executedSourceSHA256=executionPin(candidatePath,'candidateSHA256');
assert.equal(executedSourceSHA256,sourceSHA256,'accepted geometry used integrated candidate');
assert.equal(geometry.passed,true,'geometry result explicitly passed');
assert.ok(geometry.results.length>0&&geometry.results.every(item=>item.status==='passed'),'every executed geometry case passed');
function assertCheckerBytes(privateBytes,sharedBytes){assert.equal(sha(privateBytes),executedCheckerSHA256,'private checker matches executed checker hash');assert.ok(privateBytes.equals(sharedBytes),'shared checker is byte-identical to executed checker');}
const sharedCheckerPath=path.join(repo,sharedCheckerFile),sharedCheckerBytes=fs.readFileSync(sharedCheckerPath);
assertCheckerBytes(privateCheckerBytes,sharedCheckerBytes);
let negative={requested:args.includes('--selftest'),ran:false};
if(args.includes('--selftest')){
 const damaged=Buffer.concat([privateCheckerBytes,Buffer.from('\n/* intentional in-memory checker mutation */')]);
 assert.throws(()=>assertCheckerBytes(damaged,sharedCheckerBytes),/private checker matches executed checker hash/);
 assert.throws(()=>assertCheckerBytes(privateCheckerBytes,damaged),/shared checker is byte-identical/);
 assertCheckerBytes(fs.readFileSync(checkerPath),fs.readFileSync(sharedCheckerPath));
 negative={requested:true,ran:true,changedPrivateCheckerRejected:true,changedSharedCheckerRejected:true,mutationScope:'in-memory bytes only',originalsReread:true};
}
const syntaxFiles=[...new Set([...sourceCopies,...preparedFiles.map(item=>item.file),sharedCheckerFile])].filter(file=>/\.(?:cjs|js)$/.test(file));
for(const file of syntaxFiles){const code=read(path.join(repo,file));new vm.Script(code,{filename:file});assert.ok(!/[^\S\r\n]+\r?$/m.test(code),'no trailing whitespace: '+file);}
const report=path.resolve(repo,option('--report','reports/firstresponse-arm-finish'));
const readmePath=path.join(report,'README.md');let reportLinksVerified=0,reportExternalLinks=0;
assert.ok(fs.existsSync(readmePath),'integration report exists');
for(let link of [...read(readmePath).matchAll(/\]\((<[^>]+>|[^)]+)\)/g)].map(match=>match[1])){
 link=link.trim();if(link.startsWith('<'))link=link.slice(1,link.indexOf('>'));else link=link.replace(/\s+["'][\s\S]*$/,'');
 if(/^(?:https?:|mailto:|data:|codex:)/i.test(link)){reportExternalLinks++;continue;}if(link.startsWith('#'))continue;
 link=decodeURIComponent(link.split('#')[0].split('?')[0]);if(!link)continue;
 assert.ok(fs.existsSync(path.isAbsolute(link)?link:path.resolve(report,link)),'report link exists: '+link);reportLinksVerified++;
}
const verificationFile=path.join(report,'verification.json');
if(fs.existsSync(verificationFile)){const verification=json(verificationFile);if(verification.sourceSHA256)assert.equal(verification.sourceSHA256,sourceSHA256);}
const git=spawnSync('git',['--git-dir='+path.join(repo,'.git'),'--work-tree='+repo,'diff','--cached','--name-only','-z'],{encoding:'utf8',windowsHide:true,timeout:30000});
assert.ifError(git.error);assert.equal(git.status,0,'read-only staged-name check succeeds: '+git.stderr);
const stagedNames=git.stdout.split('\0').filter(Boolean);
assert.equal(fs.existsSync(snapshot.indexPath)?sha(fs.readFileSync(snapshot.indexPath)):null,snapshot.indexSHA256,'shared Git index bytes preserved');
assert.equal(sha(fs.readFileSync(candidatePath)),sourceSHA256);
for(const file of sourceCopies)assert.equal(sha(fs.readFileSync(path.join(repo,file))),sourceSHA256);
assert.equal(sha(fs.readFileSync(checkerPath)),executedCheckerSHA256);assert.equal(sha(fs.readFileSync(geometryPath)),sha(geometryBytes));
const output={passed:true,sourceSHA256,beforeSHA256:delta.beforeSHA256,sourceCopies,sourceCopiesIdentical:4,
 rawTestsUnchanged:39,historicalHelperChains:10,preparedAdditionsVerified:integration.additions.length,preparedEditsVerified:integration.edits.length,
 executedCheckerPath:checkerPath,executedCheckerSHA256,geometryResultPath:geometryPath,geometryResultSHA256:sha(geometryBytes),
 sharedCheckerFile,portableCheckerMatchesExecutedBytes:true,syntaxFiles,reportLinksVerified,reportExternalLinks,
 stagedNames,indexBytesPreserved:true,indexEmpty:stagedNames.length===0,negative,sharedFilesWritten:0,
 limitations:'Source, compatibility, syntax and report-link checks; geometry execution is pinned above and browser acceptance is verified separately.'};
fs.writeFileSync(path.join(work,'post-check.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));

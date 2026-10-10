const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-replay-contact-2026-10-10');
const read=file=>fs.readFileSync(path.join(repo,file)),json=file=>JSON.parse(fs.readFileSync(path.join(report,file),'utf8')),hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const git=args=>cp.execFileSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true}).trim();
const baseline=json('baseline.json'),edits=json('edits/source-edits.json');
const sourcePath='stem_lab/stem_tool_dissection.js',mirrorPath='desktop/web-app/public/stem_lab/stem_tool_dissection.js',unitPath='tests/dissection_lab_improvements.test.js',newUnitPath='tests/dissection_replay_contact.test.js',browserPath='tests/e2e/dissection-replay-contact.spec.ts';
const source=read(sourcePath);assert(source.equals(read(mirrorPath)));assert.equal(hash(source),edits.after);new vm.Script(source.toString(),{filename:sourcePath});
let reversed=source.toString();for(const edit of [...edits.edits].reverse()){assert.equal(reversed.split(edit.after).length-1,1,'unique reverse edit');reversed=reversed.replace(edit.after,edit.before);}
assert.equal(hash(reversed),baseline.source);assert.equal(hash(zlib.gunzipSync(fs.readFileSync(path.join(report,'edits/source-before.js.gz')))),baseline.source);
for(const[file,expected]of Object.entries(baseline.protected))assert.equal(hash(read(file)),expected,file);
const labels=['unit-'+process.argv[2],'browser-'+process.argv[3],'regression-'+process.argv[4]],runs={};
for(const label of labels){const run=json(label+'/run.json'),result=json(label+'/results.json');assert.equal(run.exitCode,0,label);assert.equal(run.inputHashesStable,true,label);assert.deepEqual(run.startHashes,run.endHashes,label);
 for(const[file,expected]of Object.entries(run.endHashes))assert.equal(hash(read(file)),expected,label+' final input '+file);
 if(label.startsWith('unit')){assert.equal(result.numFailedTests,0);assert.equal(result.numPassedTests,44);runs[label]={passed:result.numPassedTests,failed:result.numFailedTests,excluded:result.numPendingTests,inputs:run.endHashes};}
 else{assert.equal(result.stats.expected,4);assert.equal(result.stats.unexpected,0);assert.equal(result.stats.flaky,0);assert.equal(result.stats.skipped,0);runs[label]={...result.stats,inputs:run.endHashes};}
}
const browser=labels[1],audits={},metrics={};
const captures=path.join(report,browser,'captures');
for(const entry of fs.readdirSync(captures)){if(entry.endsWith('-axe.json')){const audit=json(browser+'/captures/'+entry);assert.equal(audit.violations.length,0);audits[entry]={violations:0,incomplete:audit.incomplete.map(rule=>({id:rule.id,nodes:rule.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}))};}if(entry.endsWith('-metrics.json'))metrics[entry]=json(browser+'/captures/'+entry);}
assert.equal(Object.keys(audits).length,4);assert.equal(Object.keys(metrics).length,4);
const scope=[sourcePath,mirrorPath,newUnitPath,browserPath];git(['diff','--check','--',...scope]);
for(const file of[newUnitPath,browserPath])assert(!/[\t ]+$/m.test(read(file).toString()),file+' whitespace');
const staged=git(['diff','--cached','--name-only']);assert.equal(staged,baseline.staged,'index names unchanged');
const head=git(['rev-parse','HEAD']),scopedCommits=head===baseline.head?'':git(['diff','--name-only',baseline.head,head,'--',...scope]);assert.equal(scopedCommits,'','no concurrent commits in owned scope');
const archived={};for(const[file,archive]of[[sourcePath,'source-after.js.gz'],[newUnitPath,'contact-unit-after.js.gz'],[browserPath,'browser-after.ts.gz']]){const buffer=read(file);fs.writeFileSync(path.join(report,'edits',archive),zlib.gzipSync(buffer));archived[file]={sha256:hash(buffer),archive:'edits/'+archive};}
const result={at:new Date().toISOString(),sourceSha256:hash(source),existingUnitSha256:hash(read(unitPath)),sourceRuntimeParity:true,sourceSyntax:true,sourceReversalEdits:edits.edits.length,sourceReversalMatchesBaseline:true,protectedFilesUnchanged:Object.keys(baseline.protected).length,runs,audits,metrics,scopedWhitespace:true,baselineHead:baseline.head,finalHead:head,concurrentOwnedCommits:scopedCommits,stagedNamesUnchanged:true,stagedNames:staged,scopedStatus:git(['status','--short','--',...scope]),archived};
fs.writeFileSync(path.join(report,'verification.json'),JSON.stringify(result,null,2)+'\n');fs.copyFileSync(__filename,path.join(report,'verify-final.cjs'));
console.log(JSON.stringify({source:result.sourceSha256,protected:result.protectedFilesUnchanged,edits:result.sourceReversalEdits,runs,audits,head},null,2));

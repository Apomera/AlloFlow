// Private delivery gate. --check-only --selftest prepares a pinned plan; --apply requires that exact plan.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const work=__dirname,root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const beforeSHA='af6ecb094af6d67ebb0955170a55e0a9726308c59f4ddd9b196d56cfe434e4c7';
const reportRelative='reports/firstresponse-eyelid-finish',reportPath=path.join(root,reportRelative),handoffPath=path.join(root,'AGENT_HANDOFF.md');
const views=['adult-support','adult-head','infant-head-contrast'];
const nativeDirectory=id=>'native-'+id+(id==='adult-head'?'-recovered':'');
const originalFixtureSHA='4bf79db39170b0b00cd9e8a465865e0a5bb560f9fce8225c63d45567adb1339a';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),local=p=>path.join(work,p);
const fail=m=>{throw Error(m);},same=(a,b,m)=>assert.deepEqual(a,b,m),must=(value,message)=>{if(!value)fail(message);};
const relative=p=>path.relative(work,p).split(path.sep).join('/');
function guardFile(file,expected){must(fs.existsSync(file),'Missing guarded file '+file);must(hash(read(file))===expected,'Changed guarded file '+file);}
function guardNativeInput(file,expected,id,repair){
  if(path.resolve(file)===path.resolve(local('firstresponse-face-preview.spec.ts'))){
    const earlier=id==='adult-support';must(expected===(earlier?originalFixtureSHA:repair.afterSHA256),'Native fixture provenance mismatch '+id);
    guardFile(earlier?local('fixture-before-head-context-repair/firstresponse-face-preview.spec.ts.saved'):file,expected);
  }else guardFile(file,expected);
}
function safeShared(name){must(!path.isAbsolute(name),'Absolute shared target');const target=path.resolve(root,name);must(target.startsWith(path.resolve(root)+path.sep),'Shared target escapes repository');return target;}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{const file=path.join(dir,e.name);must(!e.isSymbolicLink(),'Evidence symlink rejected '+file);return e.isDirectory()?walk(file):[file];});}
function syntax(file,bytes=read(file)){new vm.Script(bytes.toString(),{filename:file});}
function validateVisual(review,sourceSHA,images){must(review.accepted===true,'Visual review has not accepted the candidate');must(review.sourceSHA256===sourceSHA,'Visual review source drift');same(review.imageHashes,images,'Visual review must pin all 12 actual images');}
function selftest(source,sourceSHA,visual,images,repair){
  const dir=local('finish-selftest-sandbox');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'candidate.js'),saved=Buffer.from(source);fs.writeFileSync(file,saved);guardFile(file,sourceSHA);
  let mutationRejected=false,reason='';try{fs.writeFileSync(file,Buffer.concat([saved,Buffer.from('\n/* deliberate private pin mutation */\n')]));try{guardFile(file,sourceSHA);}catch(e){mutationRejected=true;reason=e.message;}}finally{fs.writeFileSync(file,saved);same(read(file),saved,'Private selftest bytes restored and reread');guardFile(file,sourceSHA);}
  must(mutationRejected,'Damaged source was not rejected');
  const reviewFile=path.join(dir,'visual-review.json'),reviewBytes=Buffer.from(JSON.stringify(visual));fs.writeFileSync(reviewFile,reviewBytes);let reviewRejected=false;
  try{fs.writeFileSync(reviewFile,JSON.stringify({...visual,accepted:false}));try{validateVisual(json(reviewFile),sourceSHA,images);}catch{reviewRejected=true;}}finally{fs.writeFileSync(reviewFile,reviewBytes);same(read(reviewFile),reviewBytes,'Private visual selftest restored and reread');validateVisual(json(reviewFile),sourceSHA,images);}
  must(reviewRejected,'Unaccepted visual review was not rejected');
  let oldFixtureRecoveryRejected=false,unexpectedSupportFixtureRejected=false;
  try{guardNativeInput(local('firstresponse-face-preview.spec.ts'),originalFixtureSHA,'adult-head',repair);}catch{oldFixtureRecoveryRejected=true;}
  try{guardNativeInput(local('firstresponse-face-preview.spec.ts'),'0'.repeat(64),'adult-support',repair);}catch{unexpectedSupportFixtureRejected=true;}
  must(oldFixtureRecoveryRejected&&unexpectedSupportFixtureRejected,'Fixture provenance exceptions were not bounded');
  const result={passed:true,scriptSHA256:hash(read(__filename)),sourceSHA256:sourceSHA,mutationRejected,reviewRejected,oldFixtureRecoveryRejected,unexpectedSupportFixtureRejected,restoredAndReread:true,mutationScope:'private finish-selftest-sandbox only',reason};
  fs.writeFileSync(local('finish-selftest.json'),JSON.stringify(result,null,2)+'\n');return result;
}
function helperLoader(integration,fromShared){
  const overrides=new Map();if(!fromShared){for(const e of integration.edits)overrides.set(path.basename(e.file),e.after);for(const a of integration.additions)overrides.set(path.basename(a.file),a.content);}
  const cache=new Map();function load(name){must(/^firstresponse_[a-z_]+_delta\.(?:cjs|json)$/.test(name),'Unexpected history dependency '+name);if(cache.has(name))return cache.get(name).exports;
    const code=overrides.has(name)?overrides.get(name):read(path.join(root,'tests/helpers',name)).toString(),module={exports:{}};cache.set(name,module);
    if(name.endsWith('.json'))module.exports=JSON.parse(code);else{syntax(name,Buffer.from(code));new Function('require','module','exports',code)(id=>id==='node:crypto'?crypto:load(id.replace(/^\.\//,'')),module,module.exports);}return module.exports;
  }return load;
}
function verifyHistory(preservation,integration,candidate,baseline,fromShared){
  const load=helperLoader(integration,fromShared),rows=preservation.historicalChain;must(rows.length===13,'Expected 13 history reversals');
  for(const row of rows){must(row.candidatePassed&&row.baselinePassed&&row.unknownSourceRejected,'Historical preparation failed');const fn=load(row.file)[row.method];must(typeof fn==='function','Missing history method');must(hash(fn(candidate))===row.SHA256,'Candidate reversal failed '+row.file);must(hash(fn(baseline))===row.SHA256,'Baseline reversal failed '+row.file);let rejected=false;try{fn(candidate+'\n// deliberate unknown history input\n');}catch{rejected=true;}must(rejected,'History helper accepted unknown source '+row.file);}
  return rows.map(r=>({file:r.file,SHA256:r.SHA256,passed:true}));
}
function sharedSnapshot(history,integration,after){
  const out={};for(const [file,h]of Object.entries(history.sourceHashes)){const target=safeShared(file),expected=after?integration.sourceSHA256:h;guardFile(target,expected);out[file]=expected;}
  must(Object.keys(history.sourceHashes).length===4,'Expected four runtime copies');
  for(const [kind,folder,count]of [['fixtureHashes','tests',39],['helperHashes','tests/helpers',null],['checkerHashes','dev-tools',8]]){
    must(count===null||Object.keys(history[kind]).length===count,'Unexpected history count '+kind);
    for(const[name,h]of Object.entries(history[kind])){const file=folder+'/'+name,edit=integration.edits.find(e=>e.file===file),expected=after&&edit?edit.afterSHA256:h;guardFile(safeShared(file),expected);out[file]=expected;}
  }
  for(const a of integration.additions){const file=safeShared(a.file);if(after){guardFile(file,a.afterSHA256);out[a.file]=a.afterSHA256;}else{must(!fs.existsSync(file),'New helper already exists '+a.file);out[a.file]=null;}}
  guardFile(history.indexPath,history.indexSHA256);out['[git index]']=history.indexSHA256;
  out['AGENT_HANDOFF.md']=hash(read(handoffPath));return out;
}
function gather(){
  const baseline=json(local('baseline.json')),delta=json(local('delta.json')),integration=json(local('history-integration.json')),preservation=json(local('history-preservation.json')),history=json(local('history-input-snapshot.json'));
  const source=read(local('candidate.js')),previous=read(local('before.js')),sourceSHA=hash(source),inputs={},packageFiles=new Map();
  const include=file=>{const name=relative(file);must(!name.startsWith('../'),'Evidence outside private work');const bytes=read(file);inputs[name]=hash(bytes);packageFiles.set('evidence/'+name,bytes);};
  must(hash(previous)===beforeSHA&&delta.beforeSHA256===beforeSHA&&delta.afterSHA256===sourceSHA,'Source/delta pin mismatch');must(sourceSHA!==beforeSHA,'Candidate unchanged');
  must(baseline.sourceSHA256===beforeSHA&&baseline.candidateSHA256===sourceSHA,'Baseline metadata mismatch');must(baseline.copies.length===4,'Baseline copies incomplete');
  for(const item of baseline.copies){must(item.sha256===beforeSHA,'Baseline copy pin mismatch');must(history.sourceHashes[item.relativePath]===beforeSHA,'History source list mismatch');}
  must(integration.sourceSHA256===sourceSHA&&integration.beforeSHA256===beforeSHA&&preservation.sourceSHA256===sourceSHA,'History source mismatch');
  same(integration.sourceHashes,history.sourceHashes,'History source snapshot');same(preservation.sharedHistoryInputs,history,'Historical shared-input snapshot');must(integration.indexSHA256===history.indexSHA256,'Index history mismatch');
  must(integration.exactReversal&&integration.sourceOutsideEditIdentical&&integration.unknownSourceRejected&&integration.historicalAssertionsChanged===false,'Invalid history integration');
  must(preservation.exactReversal&&preservation.sourceOutsideListedEditsIdentical&&preservation.existingRawTests===39&&preservation.historicalAssertionsChanged===false,'Invalid history preservation');
  must(preservation.selftest?.ran&&preservation.selftest?.restoredAndReread&&preservation.selftest?.damagedDeltaRejected,'History selftest missing');
  same(integration.edits.map(e=>e.file),['tests/helpers/firstresponse_nose_contrast_delta.cjs'],'Unexpected shared helper edit');
  same(integration.additions.map(a=>a.file).sort(),['tests/helpers/firstresponse_eyelid_finish_delta.cjs','tests/helpers/firstresponse_eyelid_finish_delta.json'],'Unexpected additions');
  for(const e of integration.edits){must(hash(e.before)===e.beforeSHA256&&hash(e.after)===e.afterSHA256,'Helper edit content pin mismatch');}
  for(const a of integration.additions){must(a.beforeSHA256===null&&hash(a.content)===a.afterSHA256&&a.SHA256===a.afterSHA256,'Helper addition pin mismatch');}
  const storedDelta=integration.additions.find(a=>a.file.endsWith('.json'));same(JSON.parse(storedDelta.content),delta,'Published delta differs from candidate delta');
  let reversed=source.toString();for(const edit of [...delta.edits].reverse()){must(reversed.split(edit.new).length===2,'Nonunique delta reversal');reversed=reversed.replace(edit.new,edit.old);}same(Buffer.from(reversed),previous,'Exact source reversal');
  syntax(local('candidate.js'),source);syntax(local('run-face-browser.cjs'));syntax(local('check-eyelids.cjs'));syntax(__filename);
  const cpu=json(local('cpu-validation.json'));must(cpu.beforeSHA256===beforeSHA&&cpu.candidateSHA256===sourceSHA&&cpu.checkerSHA256===hash(read(local('check-eyelids.cjs'))),'CPU source/checker mismatch');
  must(cpu.passed===12&&cpu.failed===0&&cpu.results.length===12,'CPU validation incomplete');must(cpu.results.every(r=>r.status==='passed'),'CPU failure present');
  same(cpu.results.map(r=>[r.age,r.phase,r.contrast].join('/')).sort(),['adult','child','infant'].flatMap(age=>[0,8].flatMap(phase=>[false,true].map(contrast=>[age,phase,contrast].join('/')))).sort(),'CPU scenarios incomplete');
  must(cpu.negativeTests.some(t=>t.kind==='raised-lid'&&t.error)&&cpu.negativeTests.some(t=>t.kind==='invalid-normal'&&t.error),'CPU deliberate-failure checks missing');
  const audit=json(local('fixture-audit.json'));must(audit.accepted&&audit.syntaxPassed&&audit.listedTests===3&&audit.browserLaunched===false&&audit.sourceSHA===sourceSHA,'Fixture audit incomplete');
  guardFile(local('firstresponse-face-preview.spec.ts'),audit.fixtureSHA);guardFile(local('run-face-browser.cjs'),audit.runnerSHA);
  const repair=json(local('fixture-head-context-repair.json'));
  must(repair.beforeSHA256===originalFixtureSHA&&repair.afterSHA256===audit.fixtureSHA&&repair.afterSHA256!==originalFixtureSHA&&repair.sourceSHA256===sourceSHA&&repair.sourceChanged===false&&repair.runnerChanged===false,'Fixture repair provenance mismatch');
  must(repair.fixture==='firstresponse-face-preview.spec.ts'&&repair.failedRun==='native-adult-head'&&repair.recoveryRun==='native-adult-head-recovered'&&repair.earlierAcceptedRun==='native-adult-support','Unexpected fixture repair scope');
  const oldFixturePath=local('fixture-before-head-context-repair/firstresponse-face-preview.spec.ts.saved');
  must(path.resolve(work,repair.savedFixture)===path.resolve(oldFixturePath),'Unexpected archived fixture path');guardFile(oldFixturePath,originalFixtureSHA);
  const oldAudit=json(local('fixture-before-head-context-repair/fixture-audit.json'));must(oldAudit.accepted&&oldAudit.syntaxPassed&&oldAudit.listedTests===3&&oldAudit.browserLaunched===false&&oldAudit.fixtureSHA===originalFixtureSHA&&oldAudit.runnerSHA===audit.runnerSHA&&oldAudit.sourceSHA===sourceSHA,'Archived fixture audit mismatch');
  let repaired=read(oldFixturePath).toString();must(Array.isArray(repair.edits)&&repair.edits.length>0,'Missing fixture repair edits');for(const edit of repair.edits){must(repaired.split(edit.old).length===2,'Nonunique fixture repair edit');repaired=repaired.replace(edit.old,edit.next);}same(Buffer.from(repaired),read(local('firstresponse-face-preview.spec.ts')),'Fixture repair does not reproduce active fixture');
  must(fs.existsSync(local('native-adult-head/failure.json'))&&!fs.existsSync(local('native-adult-head/summary.json')),'Initial failed head preview must remain separate');
  const failedHead=json(local('native-adult-head/browser-run.json')),failedHeadStatus=json(local('native-adult-head/failure.json'));
  must(failedHeadStatus.exitCode===1&&failedHead.stats.expected===0&&failedHead.stats.unexpected===1&&JSON.stringify(failedHead).includes('window.__faceProbe')&&JSON.stringify(failedHead).includes("reading 'context'"),'Unexpected initial head-preview failure');
  const imageHashes={},native=[];
  for(const id of views){const dir=local(nativeDirectory(id)),summary=json(path.join(dir,'summary.json')),input=json(path.join(dir,'inputs.json')),metrics=json(path.join(dir,'face-preview-metrics.json')),result=json(path.join(dir,'browser-run.json'));
    must(!fs.existsSync(path.join(dir,'failure.json')),'Accepted native run has a failure');must(summary.baselineSHA===beforeSHA&&summary.finalSHA===sourceSHA&&summary.inputsUnchanged&&summary.privateCandidate,'Native source/input mismatch '+id);
    must(summary.workflows===1&&summary.matchingViewPairs===1&&summary.evidenceCount===2&&summary.workers===1&&summary.retries===0,'Native run counts '+id);same(summary.selectedViews,[id],'Native view mismatch');
    must(summary.perWorkflowTimeoutMs===450000&&summary.runnerTimeoutMs===900000,'Native bounds changed');same(result.stats,summary.stats,'Browser result statistics differ');must(summary.stats.expected===1&&summary.stats.unexpected===0&&summary.stats.skipped===0&&summary.stats.flaky===0,'Native result failed');
    must(input.baselineSHA===beforeSHA&&input.finalSHA===sourceSHA&&input.workers===1&&input.retries===0&&input.expectedWorkflows===1&&input.expectedEvidence===2,'Native input pins incomplete');same(input.selectedViews,[id],'Native input view mismatch');for(const[file,h]of Object.entries(input.inputs))guardNativeInput(file,h,id,repair);
    must(Object.keys(input.inputs).filter(file=>path.resolve(file)===path.resolve(local('firstresponse-face-preview.spec.ts'))).length===1,'Native fixture input must be pinned exactly once');
    must(metrics.baselineSHA===beforeSHA&&metrics.finalSHA===sourceSHA,'Native metric source mismatch');same(metrics.selectedViews,[id],'Native metric view mismatch');must(metrics.evidence.length===2,'Native pair incomplete');
    const pair=metrics.evidence,old=pair.find(e=>e.variant==='baseline'),current=pair.find(e=>e.variant==='candidate');must(old&&current&&old.id===id&&current.id===id,'Missing matched native pair');must(old.sourceSHA===beforeSHA&&current.sourceSHA===sourceSHA,'Native capture source mismatch');
    for(const key of ['geometries','calls','materials','programs'])same(current.draw[key],old.draw[key],'Native allocation/draw change '+key);must(current.draw.triangles-old.draw.triangles===4992,'Unexpected triangle cost');
    same(current.preservedScene,old.preservedScene,'Native unrelated scene drift');same(current.camera,old.camera,'Native camera drift');same(current.pose,old.pose,'Native pose drift');same(current.state,old.state,'Native state drift');
    must(summary.pixelComparisons.length===1&&summary.pixelComparisons[0].id===id,'Pixel evidence missing');const pixels=summary.pixelComparisons[0];must(Number.isInteger(pixels.changedPixels)&&pixels.changedPixels>=0&&pixels.changedPixels<=pixels.totalPixels,'Invalid pixel count');if(id!=='infant-head-contrast')must(pixels.changedPixels>0,'Normal eyelid change not visible');
    const expected=['baseline','candidate'].flatMap(variant=>['face','stage'].map(part=>id+'-'+variant+'-'+part+'.png')).sort();same(summary.images.slice().sort(),expected,'Expected exactly four native images');same(fs.readdirSync(dir).filter(n=>n.endsWith('.png')).sort(),expected,'Unexpected native image set');
    for(const name of expected)imageHashes[name]=hash(read(path.join(dir,name)));
    for(const e of pair){must(e.errors.length===0&&e.detail.proof.sameCapturedFrame,'Native crop/error evidence invalid');must(e.detail.proof.sourceSHA256===imageHashes[e.capture],'Crop source mismatch');}
    for(const file of walk(dir))include(file);native.push({id,summary});
  }
  const visual=json(local('visual-review.json')),independent=json(local('independent-visual-review.json'));validateVisual(visual,sourceSHA,imageHashes);validateVisual(independent,sourceSHA,imageHashes);
  if(process.argv.includes('--selftest'))selftest(source,sourceSHA,visual,imageHashes,repair);
  const gateSelftest=json(local('finish-selftest.json'));must(gateSelftest.passed&&gateSelftest.mutationRejected&&gateSelftest.reviewRejected&&gateSelftest.oldFixtureRecoveryRejected&&gateSelftest.unexpectedSupportFixtureRejected&&gateSelftest.restoredAndReread&&gateSelftest.scriptSHA256===hash(read(__filename))&&gateSelftest.sourceSHA256===sourceSHA,'Delivery gate selftest missing/stale; run --check-only --selftest');
  const required=['baseline.json','before.js','candidate.js','delta.json','history-integration.json','history-preservation.json','history-input-snapshot.json','check-eyelids.cjs','cpu-validation.json','fixture-audit.json','firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','visual-review.json','independent-visual-review.json','finish-pass.cjs','finish-selftest.json'];
  for(const name of required)include(local(name));
  include(local('fixture-head-context-repair.json'));for(const file of walk(local('fixture-before-head-context-repair')))include(file);
  const retained=[];for(const entry of fs.readdirSync(work,{withFileTypes:true})){if(entry.isFile()&&(/^(?:cpu|check-eyelids)[\w.-]*\.(?:json|log|cjs|saved)$/.test(entry.name)||/^(?:sampling-revision|lid-normal-diagnosis|lid-ring-diagnosis|baseline-shell-diagnostic|scope-differences)\.json$/.test(entry.name))&&!required.includes(entry.name)){include(local(entry.name));retained.push(entry.name);}if(entry.isDirectory()&&/^(?:cpu[-_]|candidate-rejected-)/.test(entry.name))for(const file of walk(local(entry.name))){include(file);retained.push(relative(file));}}
  for(const entry of fs.readdirSync(work,{withFileTypes:true})){if(entry.isDirectory()&&entry.name.startsWith('native-')&&!views.some(id=>entry.name===nativeDirectory(id))&&fs.existsSync(local(entry.name+'/failure.json'))){for(const file of walk(local(entry.name)))include(file);retained.push(entry.name+'/failure.json');}}
  const historyChecks=verifyHistory(preservation,integration,source.toString(),previous.toString(),false),shared=sharedSnapshot(history,integration,false);must(!fs.existsSync(reportPath),'Report target already exists; inspect before delivery');
  const rows=native.map(({id,summary:s})=>`| ${id} | ${s.pixelComparisons[0].changedPixels} / ${s.pixelComparisons[0].totalPixels} | ${Math.round(s.stats.duration/1000)} s |`).join('\n');
  const images=views.map(id=>`### ${id}\n\n| Before | After |\n| --- | --- |\n| ![Before ${id}](evidence/${nativeDirectory(id)}/${id}-baseline-face.png) | ![After ${id}](evidence/${nativeDirectory(id)}/${id}-candidate-face.png) |\n\n[Full stage before](evidence/${nativeDirectory(id)}/${id}-baseline-stage.png) · [Full stage after](evidence/${nativeDirectory(id)}/${id}-candidate-stage.png)`).join('\n\n');
  const readme=`# First Response Lab: eyelid finish\n\nThe closed eyelids follow the rendered skull surface with smoother, mirrored shells. Mesh rings follow the eye path to improve the surface normals. Their corners and back faces sit below the skin, while a shallow upper and lower fold preserves the closed-eye expression. Fine eye creases follow the new lids, with aligned mesh rows at the corners.\n\nOnly the four lids and their two dependent seams may change geometry. Head proportions, materials, nose shading, camera settings, pose, contact, lesson content and controls are preserved. The refinement adds **4,992 rendered triangles** with no added draw calls, geometries, materials or shader programs in the three inspected views.\n\n## Validation\n\n- ${cpu.passed} CPU geometry cases passed across adult, child and infant, two poses and both contrast modes (${cpu.checks.toLocaleString('en-US')} checks). Closed shells, winding, normals, skin burial, visible relief, crease clearance, mirrored surfaces, scene preservation and resource reuse/disposal were checked. Deliberately raised vertices and invalid normals were rejected and restored.\n- Three raw-module browser comparisons passed, with one worker and zero retries: 6 captures and 12 PNGs. Both normal views have a visible pixel change; infant high contrast is a visibility/control comparison and may match. Crops come from each matching full-stage capture.\n- Root and independent visual reviews accepted the same 12 image hashes.\n- Thirteen exact history reversals passed. The 39 existing raw test files, 8 existing checkers and Git index are preserved. The raw test files were **not run as a suite** for this pass.\n- The existing raw eyelid fixture still assumes TubeGeometry; it was not run and is not claimed as passing.\n\n| View | Changed stage pixels | Browser duration |\n| --- | ---: | ---: |\n${rows}\n\n## Before and after\n\n${images}\n\n## Scope and limits\n\nThese checks load the raw module through the existing browser harness. The full application loader, full-app build and deployment were not tested. The change remains uncommitted; this delivery performs no staging, commit, push or deployment.\n\nSource: \`${beforeSHA}\` → \`${sourceSHA}\`.\n\nCPU and browser evidence, source delta, compatibility checks and visual reviews are saved under [evidence](evidence). ${retained.length?`Earlier attempts and checker versions are retained separately: ${retained.map(n=>'\`'+n+'\`').join(', ')}.`:'No earlier failed attempts were found to archive.'}\n\n[Post-write verification](post-write.json) records the installed bytes, syntax, history reversals and preserved inputs.\n`;
  const repairExplanation='## Preview fixture repair\n\nThe first adult head preview failed in the baseline probe because the resting pose has no supporting-hand inspection metadata. The fixture now treats that context as optional for head views and still requires five cheek points in the supporting-hand view. The failed run is retained in [native-adult-head](evidence/native-adult-head/failure.json), and the accepted repeat is stored separately in `native-adult-head-recovered`.\n\nThe earlier supporting-hand comparison remains tied to its exact [original fixture](evidence/fixture-before-head-context-repair/firstresponse-face-preview.spec.ts.saved). Only that run may use the archived fixture hash; every other input remains checked against its recorded file hash. The repair record and original audit are archived with the evidence. The candidate and browser runner were unchanged by this fixture repair.\n\n';
  packageFiles.set('README.md',Buffer.from(readme.replace('## Before and after\n\n',repairExplanation+'## Before and after\n\n')));
  const packageHashes=Object.fromEntries([...packageFiles].map(([name,b])=>[name,hash(b)]));
  const snapshot={sourceSHA256:sourceSHA,beforeSHA256:beforeSHA,inputs,shared,packageHashes,reportRelative};
  return {snapshot,source,previous,sourceSHA,integration,preservation,history,historyChecks,packageFiles,imageHashes,cpu,native};
}
function guardedWrite(file,bytes,expected){if(expected===null)must(!fs.existsSync(file),'Refusing to overwrite '+file);else guardFile(file,expected);fs.writeFileSync(file,bytes,{flag:expected===null?'wx':'w'});same(read(file),Buffer.from(bytes),'Written bytes differ '+file);}
const args=process.argv.slice(2);must(args.every(a=>['--check-only','--selftest','--apply'].includes(a)),'Unknown option');must(!(args.includes('--check-only')&&args.includes('--apply')),'Choose check-only or apply');must(!(args.includes('--apply')&&args.includes('--selftest')),'Run selftest during preflight, before apply');
const data=gather(),preflightPath=local('finish-preflight.json');
if(!args.includes('--apply')){const preflight={createdAt:new Date().toISOString(),snapshot:data.snapshot};fs.writeFileSync(preflightPath,JSON.stringify(preflight,null,2)+'\n');console.log(JSON.stringify({checkOnly:true,sourceSHA256:data.sourceSHA,cpuCases:data.cpu.passed,nativeViews:views.length,images:Object.keys(data.imageHashes).length,historyReversals:data.historyChecks.length,sharedWrites:false,preflightSHA256:hash(read(preflightPath))}));process.exit(0);}
const preflight=json(preflightPath);same(data.snapshot,preflight.snapshot,'Preflight no longer matches; rerun --check-only --selftest and inspect');
const token='firstresponse-eyelid-finish-'+data.sourceSHA.slice(0,12),savedHandoff=read(handoffPath),eol=savedHandoff.includes(Buffer.from('\r\n'))?'\r\n':'\n';
must(!savedHandoff.toString().includes(token),'Handoff already mentions this delivery; inspect prior attempt');
const active=savedHandoff.toString()+eol+`## ACTIVE ${token}`+eol+`Scope: four First Response Lab runtime copies; nose compatibility helper; two new eyelid compatibility helper files; ${reportRelative}. Private source ${beforeSHA} -> ${data.sourceSHA}. No staging, commit, push or deployment. Owner: current First Response Lab enhancement task.`+eol;
guardedWrite(handoffPath,active,data.snapshot.shared['AGENT_HANDOFF.md']);
try{
  // Every target is rechecked immediately before the guarded write.
  for(const file of Object.keys(data.history.sourceHashes))guardedWrite(safeShared(file),data.source,beforeSHA);
  for(const e of data.integration.edits)guardedWrite(safeShared(e.file),e.after,e.beforeSHA256);
  for(const a of data.integration.additions)guardedWrite(safeShared(a.file),a.content,null);
  must(!fs.existsSync(reportPath),'Report appeared during delivery');fs.mkdirSync(reportPath,{recursive:false});
  for(const[name,bytes]of data.packageFiles){const destination=path.join(reportPath,name);fs.mkdirSync(path.dirname(destination),{recursive:true});guardedWrite(destination,bytes,null);}
  guardedWrite(path.join(reportPath,'preflight.json'),JSON.stringify(preflight,null,2)+'\n',null);
  for(const file of Object.keys(data.history.sourceHashes))syntax(safeShared(file));for(const e of [...data.integration.edits,...data.integration.additions])if(e.file.endsWith('.cjs'))syntax(safeShared(e.file));
  const installed=sharedSnapshot(data.history,data.integration,true),historyChecks=verifyHistory(data.preservation,data.integration,data.source.toString(),data.previous.toString(),true);
  for(const[name,h]of Object.entries(data.snapshot.inputs))guardFile(local(name),h);for(const[name,h]of Object.entries(data.snapshot.packageHashes))guardFile(path.join(reportPath,name),h);
  must(installed['[git index]']===data.snapshot.shared['[git index]'],'Index changed');
  const {['AGENT_HANDOFF.md']:activeHandoffSHA256,...protectedShared}=installed;
  const post={passed:true,sourceSHA256:data.sourceSHA,beforeSHA256:beforeSHA,allFourCopiesIdentical:true,syntaxPassed:true,historyChecks,rawFixtureFilesPreserved:39,existingCheckerFilesPreserved:8,indexUnchanged:true,sharedHashes:protectedShared,activeHandoffSHA256,reportHashes:data.snapshot.packageHashes,gateSelftest:json(local('finish-selftest.json')),limitations:'Raw-module verification only. Full application loader/build/deployment not tested. Existing TubeGeometry eyelid fixture not run.'};
  guardedWrite(path.join(reportPath,'post-write.json'),JSON.stringify(post,null,2)+'\n',null);
  const currentHandoff=read(handoffPath),activeHeader=`## ACTIVE ${token}`;must(currentHandoff.toString().split(activeHeader).length===2,'Active handoff entry missing or duplicated');
  const complete=currentHandoff.toString().replace(activeHeader,`## COMPLETE ${token}`)+eol+`Completed ${token}: scope released. All four runtime copies match ${data.sourceSHA}; syntax, 13 compatibility reversals, 39 unchanged raw test files, 8 unchanged checkers and the unchanged Git index verified. Evidence: ${reportRelative}/README.md. No commit or deployment.`+eol;
  guardedWrite(handoffPath,complete,hash(currentHandoff));guardFile(data.history.indexPath,data.history.indexSHA256);
  const result={completed:true,sourceSHA256:data.sourceSHA,report:reportPath,indexUnchanged:true,committed:false,deployed:false};fs.writeFileSync(local('finish-integration.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){fs.writeFileSync(local('finish-failure.json'),JSON.stringify({error:error.stack,sourceSHA256:data.sourceSHA,activeHandoff:token,sharedWritesMayHaveOccurred:true},null,2)+'\n');throw error;}

// Private delivery gate. --check-only --selftest prepares a pinned plan; --apply requires that exact plan.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const work=__dirname,root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const beforeSHA='f551cf0c50073315effbf3fa5bcd9ce2dd3e1b806dbfcbd3f1434ba7e831af2c',candidateSHA='bb4526d583db90d928008a1fa9b7540dfef8c8acdfd4055c0fd71225454011bf';
const reportRelative='reports/firstresponse-mouth-surface',reportPath=path.join(root,reportRelative),handoffPath=path.join(root,'AGENT_HANDOFF.md');
const views=['adult-support','adult-head','infant-head-contrast'];
const EXPECTED_TRIANGLE_DELTA=1960;
const nativeDirectory=id=>'native-'+id;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),local=p=>path.join(work,p);
const fail=m=>{throw Error(m);},same=(a,b,m)=>assert.deepEqual(a,b,m),must=(value,message)=>{if(!value)fail(message);};
const relative=p=>path.relative(work,p).split(path.sep).join('/');
function guardFile(file,expected){must(fs.existsSync(file),'Missing guarded file '+file);must(hash(read(file))===expected,'Changed guarded file '+file);}
function safeShared(name){must(!path.isAbsolute(name),'Absolute shared target');const target=path.resolve(root,name);must(target.startsWith(path.resolve(root)+path.sep),'Shared target escapes repository');return target;}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{const file=path.join(dir,e.name);must(!e.isSymbolicLink(),'Evidence symlink rejected '+file);return e.isDirectory()?walk(file):[file];});}
function syntax(file,bytes=read(file)){new vm.Script(bytes.toString(),{filename:file});}
function validateVisual(review,sourceSHA,images){must(review.accepted===true,'Visual review has not accepted the candidate');must(review.sourceSHA256===sourceSHA,'Visual review source drift');same(review.imageHashes,images,'Visual review must pin all 12 actual images');must(Array.isArray(review.observations)&&review.observations.length>0&&review.observations.every(s=>typeof s==='string'&&s.trim()),'Visual review observations missing');must(typeof review.limitations==='string'&&review.limitations.trim(),'Visual review limitations missing');}
function selftest(source,sourceSHA,visual,images){
  const dir=local('finish-selftest-sandbox');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'candidate.js'),saved=Buffer.from(source);fs.writeFileSync(file,saved);guardFile(file,sourceSHA);
  let mutationRejected=false,reason='';try{fs.writeFileSync(file,Buffer.concat([saved,Buffer.from('\n/* deliberate private pin mutation */\n')]));try{guardFile(file,sourceSHA);}catch(e){mutationRejected=true;reason=e.message;}}finally{fs.writeFileSync(file,saved);same(read(file),saved,'Private selftest bytes restored and reread');guardFile(file,sourceSHA);}
  must(mutationRejected,'Damaged source was not rejected');
  const reviewFile=path.join(dir,'visual-review.json'),reviewBytes=Buffer.from(JSON.stringify(visual));fs.writeFileSync(reviewFile,reviewBytes);let reviewRejected=false;
  try{fs.writeFileSync(reviewFile,JSON.stringify({...visual,accepted:false}));try{validateVisual(json(reviewFile),sourceSHA,images);}catch{reviewRejected=true;}}finally{fs.writeFileSync(reviewFile,reviewBytes);same(read(reviewFile),reviewBytes,'Private visual selftest restored and reread');validateVisual(json(reviewFile),sourceSHA,images);}
  must(reviewRejected,'Unaccepted visual review was not rejected');
  const result={passed:true,scriptSHA256:hash(read(__filename)),sourceSHA256:sourceSHA,mutationRejected,reviewRejected,restoredAndReread:true,mutationScope:'private finish-selftest-sandbox only',reason};
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
  const load=helperLoader(integration,fromShared),rows=preservation.historicalChain;must(rows.length===15,'Expected 15 history reversals');
  must(new Set(rows.map(row=>row.file)).size===15,'Duplicate history reversal');
  for(const row of rows){must(row.candidatePassed&&row.baselinePassed&&row.unknownSourceRejected,'Historical preparation failed');const fn=load(row.file)[row.method];must(typeof fn==='function','Missing history method');must(hash(fn(candidate))===row.SHA256,'Candidate reversal failed '+row.file);must(hash(fn(baseline))===row.SHA256,'Baseline reversal failed '+row.file);let rejected=false;try{fn(candidate+'\n// deliberate unknown history input\n');}catch{rejected=true;}must(rejected,'History helper accepted unknown source '+row.file);}
  return rows.map(r=>({file:r.file,SHA256:r.SHA256,passed:true}));
}
function sharedSnapshot(history,integration,after,rawEdit){
  const out={};for(const [file,h]of Object.entries(history.sourceHashes)){const target=safeShared(file),expected=after?integration.sourceSHA256:h;guardFile(target,expected);out[file]=expected;}
  must(Object.keys(history.sourceHashes).length===4,'Expected four runtime copies');
  for(const [kind,folder,count]of [['fixtureHashes','tests',39],['helperHashes','tests/helpers',null],['checkerHashes','dev-tools',8]]){
    must(count===null||Object.keys(history[kind]).length===count,'Unexpected history count '+kind);
    for(const[name,h]of Object.entries(history[kind])){const file=folder+'/'+name,edit=integration.edits.find(e=>e.file===file)||(rawEdit&&rawEdit.file===file?rawEdit:null),expected=after&&edit?edit.afterSHA256:h;guardFile(safeShared(file),expected);out[file]=expected;}
  }
  for(const a of integration.additions){const file=safeShared(a.file);if(after){guardFile(file,a.afterSHA256);out[a.file]=a.afterSHA256;}else{must(!fs.existsSync(file),'New helper already exists '+a.file);out[a.file]=null;}}
  guardFile(history.indexPath,history.indexSHA256);out['[git index]']=history.indexSHA256;
  out['AGENT_HANDOFF.md']=hash(read(handoffPath));return out;
}
function gather(){
  const baseline=json(local('baseline.json')),delta=json(local('delta.json')),integration=json(local('history-integration.json')),preservation=json(local('history-preservation.json')),history=json(local('history-input-snapshot.json'));
  const source=read(local('candidate.js')),previous=read(local('before.js')),sourceSHA=hash(source),inputs={},packageFiles=new Map();
  const include=file=>{const name=relative(file);must(!name.startsWith('../'),'Evidence outside private work');const bytes=read(file);inputs[name]=hash(bytes);packageFiles.set('evidence/'+name,bytes);};
  const indexRefresh=json(local('index-refresh.json')),indexFiles=['history-input-snapshot.json','history-integration.json','history-preservation.json'];
  must(indexRefresh.oldIndexSHA256==='8e20b05c29c0ebb6e2096635eefbb040deb73f79bd567630f4a8f85d09168404'&&indexRefresh.currentIndexSHA256===history.indexSHA256&&indexRefresh.currentIndexSHA256!==indexRefresh.oldIndexSHA256,'Index refresh hash mismatch');
  must(path.resolve(indexRefresh.indexPath)===path.resolve(history.indexPath)&&indexRefresh.indexWritten===false&&indexRefresh.archive==='index-refresh-before','Unexpected index refresh scope');
  same(indexRefresh.stagedPaths,[],'Index refresh observed staged paths');
  same(Object.keys(indexRefresh.privateFiles).sort(),indexFiles.slice().sort(),'Index refresh private file scope');
  same(fs.readdirSync(local(indexRefresh.archive)).sort(),indexFiles.slice().sort(),'Unexpected index archive files');
  for(const name of indexFiles){const pin=indexRefresh.privateFiles[name],archived=local(indexRefresh.archive+'/'+name);guardFile(archived,pin.beforeSHA256);guardFile(local(name),pin.afterSHA256);const old=json(archived),holder=name==='history-preservation.json'?old.sharedHistoryInputs:old;must(holder.indexSHA256===indexRefresh.oldIndexSHA256,'Archived index observation mismatch');holder.indexSHA256=indexRefresh.currentIndexSHA256;same(Buffer.from(JSON.stringify(old,null,2)+'\n'),read(local(name)),'Index refresh changed more than one expected hash in '+name);include(archived);}
  const staged=indexRefresh.stagingObservation;must(staged.file==='current-staged-paths.txt'&&staged.command==='git diff --cached --name-only'&&staged.exitCode===0,'Index staging observation missing');guardFile(local(staged.file),staged.SHA256);must(read(local(staged.file)).toString().trim()==='','Staging observation was not empty');guardFile(history.indexPath,indexRefresh.currentIndexSHA256);
  must(hash(previous)===beforeSHA&&delta.beforeSHA256===beforeSHA&&delta.afterSHA256===sourceSHA,'Source/delta pin mismatch');must(sourceSHA===candidateSHA,'Unexpected candidate source');
  must(baseline.sourceSHA256===beforeSHA,'Baseline metadata mismatch');must(baseline.runtimeCopies.length===4,'Baseline copies incomplete');
  same(Object.keys(history.sourceHashes).sort(),['stem_lab/stem_tool_firstresponse.js','desktop/web-app/public/stem_lab/stem_tool_firstresponse.js','desktop/app-build/stem_lab/stem_tool_firstresponse.js','desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'].sort(),'Unexpected runtime target list');
  same(baseline.runtimeCopies.map(item=>item.path).sort(),Object.keys(history.sourceHashes).sort(),'Baseline runtime copy list');
  for(const item of baseline.runtimeCopies){must(item.sha256===beforeSHA&&item.bytes===previous.length,'Baseline copy pin mismatch');must(history.sourceHashes[item.path]===beforeSHA,'History source list mismatch');}
  must(integration.sourceSHA256===sourceSHA&&integration.beforeSHA256===beforeSHA&&preservation.sourceSHA256===sourceSHA,'History source mismatch');
  same(integration.sourceHashes,history.sourceHashes,'History source snapshot');same(preservation.sharedHistoryInputs,history,'Historical shared-input snapshot');must(integration.indexSHA256===history.indexSHA256,'Index history mismatch');
  must(integration.exactReversal&&integration.sourceOutsideEditIdentical&&integration.unknownSourceRejected&&integration.historicalAssertionsChanged===false,'Invalid history integration');
  must(preservation.exactReversal&&preservation.sourceOutsideListedEditsIdentical&&preservation.existingRawTests===39&&preservation.historicalAssertionsChanged===false,'Invalid history preservation');
  must(preservation.selftest?.ran&&preservation.selftest?.restoredAndReread&&preservation.selftest?.damagedDeltaRejected,'History selftest missing');
  same(integration.edits.map(e=>e.file),['tests/helpers/firstresponse_brow_finish_delta.cjs'],'Unexpected shared helper edit');
  same(integration.additions.map(a=>a.file).sort(),['tests/helpers/firstresponse_mouth_surface_delta.cjs','tests/helpers/firstresponse_mouth_surface_delta.json'],'Unexpected additions');
  for(const e of integration.edits){must(hash(e.before)===e.beforeSHA256&&hash(e.after)===e.afterSHA256,'Helper edit content pin mismatch');}
  for(const a of integration.additions){must(a.beforeSHA256===null&&hash(a.content)===a.afterSHA256&&a.SHA256===a.afterSHA256,'Helper addition pin mismatch');}
  const storedDelta=integration.additions.find(a=>a.file.endsWith('.json'));same(JSON.parse(storedDelta.content),delta,'Published delta differs from candidate delta');
  let reversed=source.toString();for(const edit of [...delta.edits].reverse()){must(reversed.split(edit.new).length===2,'Nonunique delta reversal');reversed=reversed.replace(edit.new,edit.old);}same(Buffer.from(reversed),previous,'Exact source reversal');
  const rawEdit=json(local('raw-test-edit.json')),rawBefore=read(local(rawEdit.beforeFile)),rawAfter=read(local(rawEdit.afterFile));
  must(rawEdit.file==='tests/firstresponse_lip_surfaces.test.js'&&rawEdit.beforeFile==='raw-lip-before.test.js'&&rawEdit.afterFile==='raw-lip-candidate.test.js','Unexpected raw fixture edit');
  must(hash(rawBefore)===rawEdit.beforeSHA256&&hash(rawAfter)===rawEdit.afterSHA256&&rawEdit.unchangedOutsideListedEdits===true,'Raw fixture byte pins mismatch');
  must(history.fixtureHashes[path.basename(rawEdit.file)]===rawEdit.beforeSHA256,'Raw fixture original snapshot mismatch');
  let rawForward=rawBefore.toString();for(const edit of rawEdit.edits){must(rawForward.split(edit.old).length===2,'Nonunique raw fixture edit');rawForward=rawForward.replace(edit.old,edit.new);}same(Buffer.from(rawForward),rawAfter,'Raw fixture changes exceed exact listed edits');
  const rawReview=json(local('independent-raw-test-review.json'));
  must(rawReview.accepted===true&&rawReview.sourceSHA256===sourceSHA&&rawReview.beforeTestSHA256===rawEdit.beforeSHA256&&rawReview.afterTestSHA256===rawEdit.afterSHA256&&rawReview.unchangedOutsideListedEdits===true,'Independent raw fixture review is missing or stale');
  must(Array.isArray(rawReview.observations)&&rawReview.observations.length>0&&typeof rawReview.limitations==='string'&&rawReview.limitations.length>0,'Independent raw review details missing');
  const rawDirectory=local('raw-lip-surfaces'),raw=json(path.join(rawDirectory,'summary.json'));
  must(raw.passed===true&&raw.sourceSHA256===sourceSHA&&raw.testSHA256===rawEdit.afterSHA256&&raw.exitCode===0&&raw.numPassedTests===21&&raw.numFailedTests===0&&raw.numTotalTests===21&&raw.numPendingTests===0,'Focused raw lip tests incomplete');
  must(raw.inputsUnchanged===true&&raw.sharedFilesWritten===0,'Raw fixture run modified shared inputs');
  guardFile(local('run-raw-lips.cjs'),raw.runnerSHA256);syntax(local('run-raw-lips.cjs'));
  guardFile(path.join(root,'vendor/three-r128/three.min.js'),raw.vendorSHA256);guardFile(path.join(rawDirectory,'vitest.config.cjs'),raw.configSHA256);
  guardFile(path.join(rawDirectory,'stem_lab/stem_tool_firstresponse.js'),sourceSHA);guardFile(path.join(rawDirectory,rawEdit.file),rawEdit.afterSHA256);
  must(raw.selftest?.ran&&raw.selftest.hiddenSeamRejected&&raw.selftest.restoredAndReread&&raw.selftest.result.exitCode===1&&raw.selftest.result.numFailedTests===9&&raw.selftest.result.numPassedTests===12&&raw.selftest.result.numPendingTests===0&&raw.selftest.result.numTotalTests===21,'Raw fixture hidden-seam selftest missing');
  same(Object.keys(raw.sharedHashes).sort(),[...Object.keys(history.sourceHashes),rawEdit.file].sort(),'Raw fixture shared pin list');
  for(const[file,h]of Object.entries(raw.sharedHashes)){must(h===(file===rawEdit.file?rawEdit.beforeSHA256:beforeSHA),'Raw test shared baseline mismatch');guardFile(safeShared(file),h);}
  const rawResult=json(path.join(rawDirectory,'candidate-results.json')),rawNegative=json(path.join(rawDirectory,'hidden-seam-selftest-results.json'));
  must(rawResult.numPassedTests===21&&rawResult.numFailedTests===0&&rawResult.numTotalTests===21&&rawResult.numPendingTests===0,'Raw test report differs from summary');
  must(rawNegative.numFailedTests===9&&rawNegative.numPassedTests===12&&rawNegative.numPendingTests===0&&rawNegative.numTotalTests===21,'Raw hidden-seam report differs from summary');
  for(const file of walk(rawDirectory))include(file);
  syntax(local('candidate.js'),source);syntax(local('run-face-browser.cjs'));syntax(local('check-mouth.cjs'));syntax(__filename);
  const cpu=json(local('cpu-validation.json'));must(cpu.beforeSHA256===beforeSHA&&cpu.candidateSHA256===sourceSHA&&cpu.checkerSHA256===hash(read(local('check-mouth.cjs'))),'CPU source/checker mismatch');
  const cpuSummary=json(local('cpu-summary.json'));must(cpuSummary.candidateSHA256===sourceSHA&&cpuSummary.checkerSHA256===cpu.checkerSHA256&&cpuSummary.cases===cpu.passed&&cpuSummary.checks===cpu.checks,'CPU audit summary mismatch');same(cpuSummary.negativeTests,cpu.negativeTests,'CPU audit negative tests mismatch');
  must(cpu.passed===12&&cpu.failed===0&&cpu.results.length===12,'CPU validation incomplete');must(cpu.results.every(r=>r.status==='passed'),'CPU failure present');
  same(cpu.results.map(r=>[r.age,r.phase,r.contrast].join('/')).sort(),['adult','child','infant'].flatMap(age=>[0,8].flatMap(phase=>[false,true].map(contrast=>[age,phase,contrast].join('/')))).sort(),'CPU scenarios incomplete');
  same(cpu.negativeTests.map(t=>t.kind).sort(),['raised-lip','hidden-seam','invalid-normal'].sort(),'CPU deliberate-failure cases missing or duplicated');
  must(cpu.negativeTests.every(t=>typeof t.error==='string'&&t.error.length>0),'CPU deliberate-failure reason missing');
  for(const row of cpu.results){same(row.resources,row.priorResources,'CPU resource allocation/disposal changed');must(row.seam.vertices===1237&&row.seam.faces===2280,'CPU fitted crease topology mismatch');must(row.shells.length===2&&row.shells.every(s=>s.vertices===1225&&s.faces===2208),'CPU lip topology mismatch');}
  must(cpu.results.every(r=>r.triangleDelta===EXPECTED_TRIANGLE_DELTA),'CPU triangle budget mismatch');
  must(cpu.negativeTests.some(t=>t.kind==='hidden-seam'&&t.error),'CPU hidden-seam failure check missing');
  const audit=json(local('fixture-audit.json'));must(audit.accepted===true&&audit.candidateSHA256===sourceSHA&&audit.baselineSHA256===beforeSHA&&audit.inputsUnchanged===true&&audit.sharedFilesWritten===0,'Fixture audit incomplete');
  guardFile(local('audit-preview-fixture.cjs'),audit.auditorSHA256);syntax(local('audit-preview-fixture.cjs'));
  same(Object.keys(audit.inputs).sort(),['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','candidate.js','before.js','delta.json'].sort(),'Fixture audit inputs incomplete');
  for(const [name,pin]of Object.entries(audit.inputs))guardFile(local(name),pin);
  must(audit.list?.exitCode===0&&audit.list?.browserLaunched===false&&/Total: 3 tests in 1 file/.test(audit.list.stdout),'Fixture listing incomplete');
  for(const id of views)must(audit.list.stdout.includes('mouth surface '+id+' preview at matching native view'),'Fixture view missing '+id);
  same(audit.negativeTests.map(test=>test.kind).sort(),['broaden-geometry-scope','omit-preserved-scene','permit-triangle-drift','skip-lip-index','allow-unchanged-normal','permit-crease-topology-drift'].sort(),'Fixture selftests incomplete');
  must(audit.negativeTests.every(test=>test.rejected===true&&typeof test.error==='string'&&test.error.length>0),'Fixture mutation was not rejected');
  const imageHashes={},native=[];
  for(const id of views){const dir=local(nativeDirectory(id)),summary=json(path.join(dir,'summary.json')),input=json(path.join(dir,'inputs.json')),metrics=json(path.join(dir,'face-preview-metrics.json')),result=json(path.join(dir,'browser-run.json'));
    must(!fs.existsSync(path.join(dir,'failure.json')),'Accepted native run has a failure');must(summary.baselineSHA===beforeSHA&&summary.finalSHA===sourceSHA&&summary.inputsUnchanged&&summary.privateCandidate,'Native source/input mismatch '+id);
    must(summary.workflows===1&&summary.matchingViewPairs===1&&summary.evidenceCount===2&&summary.workers===1&&summary.retries===0,'Native run counts '+id);same(summary.selectedViews,[id],'Native view mismatch');
    must(summary.perWorkflowTimeoutMs===450000&&summary.runnerTimeoutMs===900000,'Native bounds changed');same(result.stats,summary.stats,'Browser result statistics differ');must(summary.stats.expected===1&&summary.stats.unexpected===0&&summary.stats.skipped===0&&summary.stats.flaky===0,'Native result failed');
    must(input.baselineSHA===beforeSHA&&input.finalSHA===sourceSHA&&input.workers===1&&input.retries===0&&input.expectedWorkflows===1&&input.expectedEvidence===2,'Native input pins incomplete');same(input.selectedViews,[id],'Native input view mismatch');for(const[file,h]of Object.entries(input.inputs))guardFile(file,h);
    const expectedNativeInputs=[...Object.keys(history.sourceHashes).map(safeShared),...['delta.json','face-capture-png.cjs','face-mount-window.cjs','run-face-browser.cjs','before.js','candidate.js','firstresponse-face-preview.spec.ts','playwright-face.config.cjs'].map(local),...['node_modules/playwright-core/lib/utilsBundle.js','tests/e2e/helpers/stem_gl_harness.ts','vendor/three-r128/three.min.js','stem_lab/stem_lab_module.js'].map(safeShared)];
    same(Object.keys(input.inputs).map(p=>path.resolve(p)).sort(),expectedNativeInputs.map(p=>path.resolve(p)).sort(),'Native input manifest incomplete or broadened');
    must(metrics.baselineSHA===beforeSHA&&metrics.finalSHA===sourceSHA,'Native metric source mismatch');same(metrics.selectedViews,[id],'Native metric view mismatch');must(metrics.evidence.length===2,'Native pair incomplete');
    const pair=metrics.evidence,old=pair.find(e=>e.variant==='baseline'),current=pair.find(e=>e.variant==='candidate');must(old&&current&&old.id===id&&current.id===id,'Missing matched native pair');must(old.sourceSHA===beforeSHA&&current.sourceSHA===sourceSHA,'Native capture source mismatch');
    for(const key of ['geometries','calls','materials','programs']){must(Number.isInteger(old.draw[key])&&old.draw[key]>0,'Invalid native resource count '+key);same(current.draw[key],old.draw[key],'Native allocation/draw change '+key);}must(Number.isInteger(old.draw.triangles)&&old.draw.triangles>0&&Number.isInteger(current.draw.triangles)&&current.draw.triangles-old.draw.triangles===EXPECTED_TRIANGLE_DELTA,'Unexpected mouth triangle delta');
    same(current.preservedScene,old.preservedScene,'Native unrelated scene drift');same(current.camera,old.camera,'Native camera drift');same(current.pose,old.pose,'Native pose drift');same(current.state,old.state,'Native state drift');
    must(summary.pixelComparisons.length===1&&summary.pixelComparisons[0].id===id,'Pixel evidence missing');const pixels=summary.pixelComparisons[0];must(Number.isInteger(pixels.changedPixels)&&pixels.changedPixels>=0&&pixels.changedPixels<=pixels.totalPixels,'Invalid pixel count');if(id!=='infant-head-contrast')must(pixels.changedPixels>0,'Normal mouth change not visible');
    const expected=['baseline','candidate'].flatMap(variant=>['face','stage'].map(part=>id+'-'+variant+'-'+part+'.png')).sort();same(summary.images.slice().sort(),expected,'Expected exactly four native images');same(fs.readdirSync(dir).filter(n=>n.endsWith('.png')).sort(),expected,'Unexpected native image set');
    for(const name of expected)imageHashes[name]=hash(read(path.join(dir,name)));
    for(const e of pair){must(e.errors.length===0&&e.detail.proof.sameCapturedFrame,'Native crop/error evidence invalid');must(e.detail.proof.sourceSHA256===imageHashes[e.capture],'Crop source mismatch');}
    for(const file of walk(dir))include(file);native.push({id,summary});
  }
  const visual=json(local('visual-review.json')),independent=json(local('independent-visual-review.json'));validateVisual(visual,sourceSHA,imageHashes);validateVisual(independent,sourceSHA,imageHashes);
  if(process.argv.includes('--selftest'))selftest(source,sourceSHA,visual,imageHashes);
  const gateSelftest=json(local('finish-selftest.json'));must(gateSelftest.passed&&gateSelftest.mutationRejected&&gateSelftest.reviewRejected&&gateSelftest.restoredAndReread&&gateSelftest.scriptSHA256===hash(read(__filename))&&gateSelftest.sourceSHA256===sourceSHA,'Delivery gate selftest missing/stale; run --check-only --selftest');
  const required=['baseline.json','before.js','candidate.js','delta.json','history-integration.json','history-preservation.json','history-input-snapshot.json','prepare-history.cjs','check-mouth.cjs','cpu-validation.json','audit-preview-fixture.cjs','fixture-audit.json','firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','visual-review.json','independent-visual-review.json','finish-pass.cjs','finish-selftest.json'];
  required.push('raw-test-edit.json','raw-lip-before.test.js','raw-lip-candidate.test.js','run-raw-lips.cjs','independent-raw-test-review.json','cpu-summary.json','finalize-cpu-evidence.cjs','index-refresh.json','current-staged-paths.txt','refresh-index-observation.cjs');
  for(const name of required)include(local(name));
  const retained=[];for(const entry of fs.readdirSync(work,{withFileTypes:true})){if(entry.isFile()&&(/^(?:cpu|check-mouth|fixture-audit)[\w.-]*\.(?:json|log|cjs|saved)$/.test(entry.name)||/^selftest-(?:raised-lip|hidden-seam|invalid-normal)\.bin$/.test(entry.name)||/^native-[\w-]+-(?:detached\.log|launcher\.json)$/.test(entry.name)||/^(?:recover-native-launch|archive-aborted-native)\.cjs$/.test(entry.name))&&!required.includes(entry.name)){include(local(entry.name));retained.push(entry.name);}if(entry.isDirectory()&&/^(?:cpu[-_]|candidate-rejected-|candidate-history$)/.test(entry.name)){for(const file of walk(local(entry.name)))include(file);retained.push(entry.name+'/');}}
  const unsuccessfulNative=[];
  for(const entry of fs.readdirSync(work,{withFileTypes:true})){if(entry.isDirectory()&&entry.name.startsWith('native-')&&!views.some(id=>entry.name===nativeDirectory(id))){const failureFile=local(entry.name+'/failure.json');must(fs.existsSync(failureFile),'Unclassified native attempt '+entry.name);const failure=json(failureFile);must(typeof failure.error==='string'&&failure.error.length>0,'Missing unsuccessful-run diagnosis');for(const file of walk(local(entry.name)))include(file);retained.push(entry.name+'/');unsuccessfulNative.push({directory:entry.name,kind:failure.kind||'failed',error:failure.error});}}
  const historyChecks=verifyHistory(preservation,integration,source.toString(),previous.toString(),false),shared=sharedSnapshot(history,integration,false,rawEdit);must(!fs.existsSync(reportPath),'Report target already exists; inspect before delivery');
  const rows=native.map(({id,summary:s})=>`| ${id} | ${s.pixelComparisons[0].changedPixels} / ${s.pixelComparisons[0].totalPixels} | ${Math.round(s.stats.duration/1000)} s |`).join('\n');
  const images=views.map(id=>`### ${id}\n\n| Before | After |\n| --- | --- |\n| ![Before ${id}](evidence/${nativeDirectory(id)}/${id}-baseline-face.png) | ![After ${id}](evidence/${nativeDirectory(id)}/${id}-candidate-face.png) |\n\n[Full stage before](evidence/${nativeDirectory(id)}/${id}-baseline-stage.png) · [Full stage after](evidence/${nativeDirectory(id)}/${id}-candidate-stage.png)`).join('\n\n');
  const readme=`# First Response Lab: mouth surface refinement

The upper and lower lips now use mesh rings that follow the mouth. A fitted mouth seam follows the actual lip surfaces across the tested mannequin ages and poses.

Only the upper lip, lower lip and mouth seam geometry changes. The fitted seam adds exactly 1,960 rendered triangles in each inspected view. Draw calls, geometry counts, materials and shader programs match the baseline. Head proportions, brows, eyelids, camera settings, pose, contact, lesson content and controls are preserved.

## Validation

- ${cpu.passed} CPU geometry cases passed across adult, child and infant, two poses and both contrast modes (${cpu.checks.toLocaleString('en-US')} checks). The validator checks closed lip shells, winding, normals, skin burial, visible seam fit, symmetry, attachments, scene preservation and resource reuse/disposal. Raised lip vertices, a hidden seam and invalid normals were deliberately rejected, restored and reread.
- ${raw.numPassedTests} focused raw lip tests passed. Hiding the mouth seam caused ${raw.selftest.result.numFailedTests} failures; the saved candidate bytes were restored and reread. The fixture now checks the fitted surface directly and includes additional probes near the corners.
- Three raw-module browser comparisons passed, with one worker and zero retries in each accepted run: 6 captures and 12 PNGs. Both normal views have changed pixels. The infant high-contrast view is a control comparison and may match. Each crop comes from its full-stage capture.
- Root and independent visual reviews accepted the same 12 image hashes.
- Fifteen exact history reversals passed. The 38 other raw test files and 8 existing checkers are preserved. The current Git index is preserved from the refreshed delivery preflight through completion. The raw tests were **not run as a whole suite** for this pass.

| View | Changed stage pixels | Browser duration |
| --- | ---: | ---: |
${rows}

## Visual review

${visual.observations.map(line=>'- '+line).join('\n')}

## Before and after

${images}

## Scope and limits

These checks load the raw module through the existing browser harness. The full application loader, full-app build and deployment were not tested. The change remains uncommitted; this delivery performs no staging, commit, push or deployment.

Source: \`${beforeSHA}\` → \`${sourceSHA}\`.

## Retained attempts and diagnostics

Rejected candidate and earlier CPU evidence remain under [candidate history](evidence/candidate-history). The CPU audit records why those attempts were rejected or why a probe was corrected. They are separate from the accepted validation above.

${unsuccessfulNative.length?unsuccessfulNative.map(run=>'- ['+run.directory+'](evidence/'+run.directory+'/failure.json): '+run.error).join('\n'):'No unsuccessful native attempts were recorded.'}

Detached launcher records and logs are retained when present. Interrupted launches are not counted as passing browser comparisons.

The first delivery preflight detected changed Git index bytes. All scoped runtime, test, helper and checker hashes still matched, and the staged-path listing was empty. Only the expected index hash in three private evidence files was refreshed; this task did not write the Git index. [The refresh record](evidence/index-refresh.json) and [original metadata](evidence/index-refresh-before) preserve that observation. Delivery guards compare against the refreshed index hash.

CPU and browser evidence, the source delta, compatibility checks and visual reviews are saved under [evidence](evidence). ${retained.length?`Supporting audit files and directories: ${retained.map(n=>'\`'+n+'\`').join(', ')}.`:'No additional supporting audit files were found to archive.'}

[Post-write verification](post-write.json) records the installed bytes, syntax, history reversals and preserved inputs.
`;
  packageFiles.set('README.md',Buffer.from(readme));

  const packageHashes=Object.fromEntries([...packageFiles].map(([name,b])=>[name,hash(b)]));
  const snapshot={sourceSHA256:sourceSHA,beforeSHA256:beforeSHA,inputs,shared,packageHashes,reportRelative};
  return {snapshot,source,previous,sourceSHA,integration,preservation,history,historyChecks,packageFiles,imageHashes,cpu,native,rawEdit,rawAfter,raw,indexRefresh};
}
function guardedWrite(file,bytes,expected){if(expected===null)must(!fs.existsSync(file),'Refusing to overwrite '+file);else guardFile(file,expected);fs.writeFileSync(file,bytes,{flag:expected===null?'wx':'w'});same(read(file),Buffer.from(bytes),'Written bytes differ '+file);}
const args=process.argv.slice(2);must(args.every(a=>['--check-only','--selftest','--apply'].includes(a)),'Unknown option');must(!(args.includes('--check-only')&&args.includes('--apply')),'Choose check-only or apply');must(!(args.includes('--apply')&&args.includes('--selftest')),'Run selftest during preflight, before apply');
const data=gather(),preflightPath=local('finish-preflight.json');
if(!args.includes('--apply')){const preflight={createdAt:new Date().toISOString(),snapshot:data.snapshot};fs.writeFileSync(preflightPath,JSON.stringify(preflight,null,2)+'\n');console.log(JSON.stringify({checkOnly:true,sourceSHA256:data.sourceSHA,cpuCases:data.cpu.passed,nativeViews:views.length,images:Object.keys(data.imageHashes).length,historyReversals:data.historyChecks.length,sharedWrites:false,preflightSHA256:hash(read(preflightPath))}));process.exit(0);}
const preflight=json(preflightPath);same(data.snapshot,preflight.snapshot,'Preflight no longer matches; rerun --check-only --selftest and inspect');
const token='firstresponse-mouth-surface-'+data.sourceSHA.slice(0,12),savedHandoff=read(handoffPath),eol=savedHandoff.includes(Buffer.from('\r\n'))?'\r\n':'\n';
must(!savedHandoff.toString().includes(token),'Handoff already mentions this delivery; inspect prior attempt');
const active=savedHandoff.toString()+eol+`## ACTIVE ${token}`+eol+`Scope: four First Response Lab runtime copies; brow compatibility helper; two new mouth compatibility helper files; one focused lip test fixture; ${reportRelative}. Private source ${beforeSHA} -> ${data.sourceSHA}. No staging, commit, push or deployment. Owner: current First Response Lab enhancement task.`+eol;
guardedWrite(handoffPath,active,data.snapshot.shared['AGENT_HANDOFF.md']);
try{
  // Every target is rechecked immediately before the guarded write.
  for(const file of Object.keys(data.history.sourceHashes))guardedWrite(safeShared(file),data.source,beforeSHA);
  for(const e of data.integration.edits)guardedWrite(safeShared(e.file),e.after,e.beforeSHA256);
  for(const a of data.integration.additions)guardedWrite(safeShared(a.file),a.content,null);
  guardedWrite(safeShared(data.rawEdit.file),data.rawAfter,data.rawEdit.beforeSHA256);
  must(!fs.existsSync(reportPath),'Report appeared during delivery');fs.mkdirSync(reportPath,{recursive:false});
  for(const[name,bytes]of data.packageFiles){const destination=path.join(reportPath,name);fs.mkdirSync(path.dirname(destination),{recursive:true});guardedWrite(destination,bytes,null);}
  guardedWrite(path.join(reportPath,'preflight.json'),JSON.stringify(preflight,null,2)+'\n',null);
  for(const file of Object.keys(data.history.sourceHashes))syntax(safeShared(file));for(const e of [...data.integration.edits,...data.integration.additions])if(e.file.endsWith('.cjs'))syntax(safeShared(e.file));
  const installed=sharedSnapshot(data.history,data.integration,true,data.rawEdit),historyChecks=verifyHistory(data.preservation,data.integration,data.source.toString(),data.previous.toString(),true);
  for(const[name,h]of Object.entries(data.snapshot.inputs))guardFile(local(name),h);for(const[name,h]of Object.entries(data.snapshot.packageHashes))guardFile(path.join(reportPath,name),h);
  must(installed['[git index]']===data.snapshot.shared['[git index]'],'Index changed');
  const {['AGENT_HANDOFF.md']:activeHandoffSHA256,...protectedShared}=installed;
  const post={passed:true,sourceSHA256:data.sourceSHA,beforeSHA256:beforeSHA,allFourCopiesIdentical:true,syntaxPassed:true,historyChecks,rawFixtureFilesPreserved:38,rawFixtureFilesStrengthened:1,focusedRawTestsPassed:data.raw.numPassedTests,rawFixtureSelftest:data.raw.selftest,existingCheckerFilesPreserved:8,indexUnchanged:true,indexPreservationScope:'Refreshed delivery preflight through completion; earlier shared index drift is recorded in evidence/index-refresh.json.',indexRefresh:data.indexRefresh,sharedHashes:protectedShared,activeHandoffSHA256,reportHashes:data.snapshot.packageHashes,gateSelftest:json(local('finish-selftest.json')),limitations:'Raw-module verification only. Full application loader/build/deployment not tested. Focused raw lip fixture uses geometric surface assertions.'};
  guardedWrite(path.join(reportPath,'post-write.json'),JSON.stringify(post,null,2)+'\n',null);
  const currentHandoff=read(handoffPath),activeHeader=`## ACTIVE ${token}`;must(currentHandoff.toString().split(activeHeader).length===2,'Active handoff entry missing or duplicated');
  const complete=currentHandoff.toString().replace(activeHeader,`## COMPLETE ${token}`)+eol+`Completed ${token}: scope released. All four runtime copies match ${data.sourceSHA}; syntax, 15 compatibility reversals, 38 unchanged raw test files and one strengthened lip fixture, 8 unchanged checkers verified. Current Git index preserved from refreshed delivery preflight through completion; earlier drift recorded in evidence/index-refresh.json. Evidence: ${reportRelative}/README.md. No commit or deployment.`+eol;
  guardedWrite(handoffPath,complete,hash(currentHandoff));guardFile(data.history.indexPath,data.history.indexSHA256);
  const result={completed:true,sourceSHA256:data.sourceSHA,report:reportPath,indexUnchanged:true,committed:false,deployed:false};fs.writeFileSync(local('finish-integration.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){fs.writeFileSync(local('finish-failure.json'),JSON.stringify({error:error.stack,sourceSHA256:data.sourceSHA,activeHandoff:token,sharedWritesMayHaveOccurred:true},null,2)+'\n');throw error;}

// Private delivery gate. --check-only --selftest prepares a pinned plan; --apply requires that exact plan.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const work=__dirname,root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const beforeSHA='69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242',candidateSHA='dc9deade4909e37e9aa4918309541168696e808b7eb066575fea3fa91d574c7e';
const reportRelative='reports/firstresponse-patient-wrist-finish',reportPath=path.join(root,reportRelative),handoffPath=path.join(root,'AGENT_HANDOFF.md');
const views=['infant-narrow-contrast','child-narrow','adult-wide'];
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
  const load=helperLoader(integration,fromShared),rows=preservation.historicalChain;must(rows.length===19,'Expected 19 history reversals');
  must(new Set(rows.map(row=>row.file)).size===19,'Duplicate history reversal');
  for(const row of rows){must(row.candidatePassed&&row.baselinePassed&&row.unknownSourceRejected,'Historical preparation failed');const fn=load(row.file)[row.method];must(typeof fn==='function','Missing history method');must(hash(fn(candidate))===row.SHA256,'Candidate reversal failed '+row.file);must(hash(fn(baseline))===row.SHA256,'Baseline reversal failed '+row.file);let rejected=false;try{fn(candidate+'\n// deliberate unknown history input\n');}catch{rejected=true;}must(rejected,'History helper accepted unknown source '+row.file);}
  return rows.map(r=>({file:r.file,SHA256:r.SHA256,passed:true}));
}
function sharedSnapshot(history,integration,after){
  for(const [folder,pattern,kind] of [['tests',/^firstresponse.*\.test\.js$/,'fixtureHashes'],['dev-tools',/^firstresponse.*\.cjs$/,'checkerHashes'],['tests/helpers',/^firstresponse_.*_delta\.(cjs|json)$/,'helperHashes']]){const expected=Object.keys(history[kind]);if(after&&kind==='helperHashes')expected.push(...integration.additions.map(item=>path.basename(item.file)));same(fs.readdirSync(path.join(root,folder)).filter(name=>pattern.test(name)).sort(),expected.sort(),'Shared file inventory changed '+folder);}
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
  same(integration.edits.map(e=>e.file),['tests/helpers/firstresponse_support_frame_delta.cjs'],'Unexpected shared helper edit');
  same(integration.additions.map(a=>a.file).sort(),['tests/helpers/firstresponse_patient_wrist_finish_delta.cjs','tests/helpers/firstresponse_patient_wrist_finish_delta.json'],'Unexpected additions');
  for(const e of integration.edits){must(hash(e.before)===e.beforeSHA256&&hash(e.after)===e.afterSHA256,'Helper edit content pin mismatch');}
  for(const a of integration.additions){must(a.beforeSHA256===null&&hash(a.content)===a.afterSHA256&&a.SHA256===a.afterSHA256,'Helper addition pin mismatch');}
  const storedDelta=integration.additions.find(a=>a.file.endsWith('.json'));same(JSON.parse(storedDelta.content),delta,'Published delta differs from candidate delta');
  let reversed=source.toString();for(const edit of [...delta.edits].reverse()){must(reversed.split(edit.new).length===2,'Nonunique delta reversal');reversed=reversed.replace(edit.new,edit.old);}same(Buffer.from(reversed),previous,'Exact source reversal');
  const rawDirectory=local('raw-wrist-tests'),raw=json(path.join(rawDirectory,'summary.json'));
  const rawFiles=['tests/firstresponse_patient_wrists.test.js','tests/firstresponse_hand_surface.test.js'];
  const testHashes=Object.fromEntries(rawFiles.map(file=>[file,history.fixtureHashes[path.basename(file)]]));
  same(raw.testHashes,testHashes,'Selected raw fixtures must retain original bytes');
  must(raw.passed===true&&raw.sourceSHA256===sourceSHA&&raw.exitCode===0&&raw.numPassedTests===56&&raw.numFailedTests===0&&raw.numTotalTests===56&&raw.numPendingTests===0,'Focused raw wrist/hand tests incomplete');
  must(raw.inputsUnchanged===true&&raw.sharedFilesWritten===0,'Raw fixture run modified shared inputs');
  guardFile(local('run-raw-wrist.cjs'),raw.runnerSHA256);syntax(local('run-raw-wrist.cjs'));
  guardFile(safeShared('vendor/three-r128/three.min.js'),raw.vendorSHA256);guardFile(path.join(rawDirectory,'vitest.config.cjs'),raw.configSHA256);
  guardFile(path.join(rawDirectory,'stem_lab/stem_tool_firstresponse.js'),sourceSHA);guardFile(path.join(rawDirectory,'vendor/three-r128/three.min.js'),raw.vendorSHA256);
  for(const[file,h]of Object.entries(testHashes))guardFile(path.join(rawDirectory,file),h);
  must(raw.selftest?.ran&&raw.selftest.inputMutationRejected&&raw.selftest.restoredAndReread&&raw.selftest.browserLaunched===false,'Raw input pin selftest missing');
  same(Object.keys(raw.sharedHashes).sort(),[...Object.keys(history.sourceHashes),...rawFiles,'vendor/three-r128/three.min.js'].sort(),'Raw fixture shared pin list');
  for(const[file,h]of Object.entries(raw.sharedHashes)){must(h===(testHashes[file]|| (file==='vendor/three-r128/three.min.js'?raw.vendorSHA256:beforeSHA)),'Raw test shared baseline mismatch');guardFile(safeShared(file),h);}
  const helperExpected={...history.helperHashes};for(const e of integration.edits)helperExpected[path.basename(e.file)]=e.afterSHA256;for(const a of integration.additions)helperExpected[path.basename(a.file)]=a.afterSHA256;
  same(raw.helperHashes,helperExpected,'Raw helper sandbox differs from complete proposed history');
  same(fs.readdirSync(path.join(rawDirectory,'tests/helpers')).sort(),Object.keys(helperExpected).sort(),'Unexpected raw helper files');
  for(const[name,h]of Object.entries(helperExpected)){guardFile(path.join(rawDirectory,'tests/helpers',name),h);guardFile(local('history-helper-sandbox/'+name),h);}
  const rawResult=json(path.join(rawDirectory,'candidate-results.json'));
  must(rawResult.numPassedTests===56&&rawResult.numFailedTests===0&&rawResult.numTotalTests===56&&rawResult.numPendingTests===0&&rawResult.success===true,'Raw test report differs from summary');
  must(rawResult.testResults.length===2&&rawResult.testResults.every(row=>row.assertionResults.every(test=>test.status==='passed')),'Raw individual test outcomes incomplete');
  same(rawResult.testResults.map(row=>row.assertionResults.length).sort((a,b)=>a-b),[23,33],'Raw test per-file counts');
  same(rawResult.testResults.map(row=>path.basename(row.name)).sort(),rawFiles.map(file=>path.basename(file)).sort(),'Raw result fixture names');
  for(const file of walk(rawDirectory))include(file);
  syntax(local('candidate.js'),source);syntax(local('run-face-browser.cjs'));syntax(local('verify-patient-wrist-finish.cjs'));syntax(__filename);
  const cpu=json(local('geometry-contract/shading-verification.json'));
  must(cpu.passed===true&&cpu.beforeSHA256===beforeSHA&&cpu.candidateSHA256===sourceSHA&&cpu.checkerSHA256===hash(read(local('verify-patient-wrist-finish.cjs'))),'CPU source/checker mismatch');
  must(cpu.results.length===30&&Number.isInteger(cpu.assertions)&&cpu.assertions>0,'CPU validation incomplete');
  same(cpu.results.map(r=>[r.age,r.phase,r.contrast].join(':')).sort(),['adult','child','infant'].flatMap(age=>[0,3,4,5,8].flatMap(phase=>[false,true].map(contrast=>[age,phase,contrast].join(':')))).sort(),'CPU scenarios incomplete');
  same(Object.keys(cpu.inputs).map(file=>path.resolve(file)).sort(),[local('candidate.js'),local('before.js'),local('verify-patient-wrist-finish.cjs'),safeShared('vendor/three-r128/three.min.js')].map(file=>path.resolve(file)).sort(),'CPU input scope');
  for(const[file,pin]of Object.entries(cpu.inputs))guardFile(file,pin);
  same(cpu.negative.map(test=>test.type).sort(),['omit-patient-wrist-blend','off-scope-palm-normal'].sort(),'CPU deliberate-failure cases missing or duplicated');
  must(cpu.negative.every(test=>test.rejected===true&&typeof test.error==='string'&&test.error.length>0&&test.restored===true&&test.restoredSHA256===sourceSHA),'CPU deliberate failures not rejected/restored');
  guardFile(local('geometry-contract/selftest-candidate.js'),sourceSHA);
  for(const row of cpu.results){
    must(row.status==='passed','CPU case failed');must(/^[a-f0-9]{64}$/.test(row.preservation.SHA256),'CPU scene preservation pin missing');
    for(const key of ['nodes','meshes'])must(Number.isInteger(row.preservation[key])&&row.preservation[key]>0,'CPU resource count missing '+key);
    same(row.priorResources,row.currentResources,'CPU resource allocations changed');same(row.repeatResources,row.currentResources,'CPU repeat resource allocations changed');
    for(const key of ['geometries','materials','total'])must(Number.isInteger(row.currentResources[key])&&row.currentResources[key]>0,'CPU resources invalid');
    must(row.currentResources.total===row.currentResources.geometries+row.currentResources.materials,'CPU total resources mismatch');
    same(row.wrists.map(w=>w.side),['left','right'],'CPU wrist scope');
    for(const w of row.wrists){const n=w.normals,b=w.baseline,c=w.candidate;
      same(n.changedRows,[0,1,2,3,4,5,6,7],'CPU root normal scope');same(n.unchangedJointAndPalmRows,[8,24],'CPU unchanged joint/palm scope');
      must(n.count===1200&&n.changed===384&&n.minLength>.9999&&n.maxLength<1.0001&&n.minimumChangedFaceDot>0&&n.unchangedFacesExact===true&&Number.isFinite(n.minimumFaceDot)&&Number.isFinite(n.minimumUnchangedFaceDot)&&/^[a-f0-9]{64}$/.test(n.SHA256),'CPU normal geometry failed');
      must(n.minimumFaceDot===Math.min(n.minimumChangedFaceDot,n.minimumUnchangedFaceDot),'CPU global normal agreement does not match changed and unchanged regions');
      must(b.samples===48&&c.samples===48&&Number.isFinite(b.meanAngleDegrees)&&b.meanAngleDegrees>0&&Number.isFinite(c.meanAngleDegrees)&&c.meanAngleDegrees>=0&&c.meanAngleDegrees<b.meanAngleDegrees*.25&&c.maximumAngleDegrees<2,'CPU seam normal continuity failed');
      for(const m of [b,c])must(Number.isFinite(m.minimumAngleDegrees)&&m.minimumAngleDegrees>=0&&Number.isFinite(m.maximumSurfaceGap)&&m.maximumSurfaceGap>=0&&m.maximumCrossingRootRow<5&&m.minimumCrossingDistance>0&&m.maximumCrossingDistance>=m.minimumCrossingDistance,'CPU overlap crossing invalid');
    }
  }
  for(const file of walk(local('geometry-contract')))include(file);
  const audit=json(local('fixture-audit.json'));must(audit.accepted===true&&audit.candidateSHA256===sourceSHA&&audit.baselineSHA256===beforeSHA&&audit.inputsUnchanged===true&&audit.sharedFilesWritten===0,'Fixture audit incomplete');
  guardFile(local('audit-preview-fixture.cjs'),audit.auditorSHA256);syntax(local('audit-preview-fixture.cjs'));
  same(Object.keys(audit.inputs).sort(),['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','candidate.js','before.js','delta.json'].sort(),'Fixture audit inputs incomplete');
  for(const [name,pin]of Object.entries(audit.inputs))guardFile(local(name),pin);
  must(audit.list?.exitCode===0&&audit.list?.browserLaunched===false&&/Total: 3 tests in 1 file/.test(audit.list.stdout),'Fixture listing incomplete');
  for(const id of views)must(audit.list.stdout.includes('patient wrist finish '+id+' preview at native view'),'Fixture view missing '+id);
  const fixtureMutationFiles={'broaden-normal-exemption':'firstresponse-face-preview.spec.ts','normalize-metadata':'firstresponse-face-preview.spec.ts','omit-unit-normal-check':'firstresponse-face-preview.spec.ts','omit-resize':'firstresponse-face-preview.spec.ts','omit-wrist-pixel-effect':'run-face-browser.cjs'};
  const dataMutations=['reject-other-geometry-change','reject-camera-change','reject-inspection-change','reject-normal-count-change','reject-invalid-unit-normals','reject-extra-normal-target','reject-unchanged-wrist-normals','reject-material-allocation'];
  same(audit.negativeTests.map(test=>test.kind).sort(),[...Object.keys(fixtureMutationFiles),...dataMutations].sort(),'Fixture selftests incomplete');
  for(const test of audit.negativeTests){must(test.rejected===true&&typeof test.error==='string'&&test.error.length>0&&test.restoredAndReread===true,'Fixture mutation was not rejected/restored');const name=fixtureMutationFiles[test.kind],file=local('fixture-selftest/'+(name?name+'.saved':'native-evidence.json.saved'));guardFile(file,test.restoredSHA256);if(name)must(test.restoredSHA256===audit.inputs[name],'Fixture saved mutation source drift');include(file);}
  const contract=require(local('patient-wrist-contract.cjs'));syntax(local('patient-wrist-contract.cjs'));
  const imageHashes={},native=[];
  for(const id of views){const dir=local(nativeDirectory(id)),summary=json(path.join(dir,'summary.json')),input=json(path.join(dir,'inputs.json')),metrics=json(path.join(dir,'face-preview-metrics.json')),result=json(path.join(dir,'browser-run.json'));
    must(!fs.existsSync(path.join(dir,'failure.json')),'Accepted native run has a failure');must(summary.baselineSHA===beforeSHA&&summary.finalSHA===sourceSHA&&summary.inputsUnchanged&&summary.privateCandidate,'Native source/input mismatch '+id);
    must(summary.workflows===1&&summary.matchingViewPairs===1&&summary.evidenceCount===2&&summary.workers===1&&summary.retries===0,'Native run counts '+id);same(summary.selectedViews,[id],'Native view mismatch');
    must(summary.perWorkflowTimeoutMs===450000&&summary.runnerTimeoutMs===900000,'Native bounds changed');same(result.stats,summary.stats,'Browser result statistics differ');must(summary.stats.expected===1&&summary.stats.unexpected===0&&summary.stats.skipped===0&&summary.stats.flaky===0,'Native result failed');
    must(input.baselineSHA===beforeSHA&&input.finalSHA===sourceSHA&&input.workers===1&&input.retries===0&&input.expectedWorkflows===1&&input.expectedEvidence===2,'Native input pins incomplete');same(input.selectedViews,[id],'Native input view mismatch');for(const[file,h]of Object.entries(input.inputs))guardFile(file,h);
    const expectedNativeInputs=[...Object.keys(history.sourceHashes).map(safeShared),...['delta.json','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','run-face-browser.cjs','before.js','candidate.js','firstresponse-face-preview.spec.ts','playwright-face.config.cjs'].map(local),...['node_modules/playwright-core/lib/utilsBundle.js','tests/e2e/helpers/stem_gl_harness.ts','vendor/three-r128/three.min.js','stem_lab/stem_lab_module.js'].map(safeShared)];
    same(Object.keys(input.inputs).map(p=>path.resolve(p)).sort(),expectedNativeInputs.map(p=>path.resolve(p)).sort(),'Native input manifest incomplete or broadened');
    must(metrics.baselineSHA===beforeSHA&&metrics.finalSHA===sourceSHA,'Native metric source mismatch');same(metrics.selectedViews,[id],'Native metric view mismatch');must(metrics.evidence.length===2,'Native pair incomplete');
    const pair=metrics.evidence,old=pair.find(e=>e.variant==='baseline'),current=pair.find(e=>e.variant==='candidate');must(old&&current&&old.id===id&&current.id===id,'Missing matched native pair');must(old.sourceSHA===beforeSHA&&current.sourceSHA===sourceSHA,'Native capture source mismatch');
    for(const e of pair)for(const key of ['geometries','calls','materials','programs','triangles'])must(Number.isInteger(e.draw[key])&&e.draw[key]>0,'Invalid native resource/draw count '+key);
    contract.validateMetadata(old);contract.validateMetadata(current);contract.validateNativePair(old,current,id);contract.validateCandidateFraming(current,id);
    must(old.draw.createdBy==='page'&&current.draw.createdBy==='page'&&old.draw.disposeCount===0&&current.draw.disposeCount===0,'Native renderer lifecycle invalid');
    same(current.detail.clip,old.detail.clip,'Wrist detail crop exact');
    if(id==='child-narrow'){must(old.resize&&current.resize,'Child real resize evidence missing');contract.validateResize(old,old.resize);contract.validateResize(current,current.resize);contract.validateNativePair(old.resize.wide,current.resize.wide,'adult-wide');}
    else must(old.resize===null&&current.resize===null,'Unexpected resize scope');
    const workflow=json(path.join(dir,id+'-evidence.json'));must(workflow.baselineSHA===beforeSHA&&workflow.finalSHA===sourceSHA,'Workflow source pins');same(workflow.evidence,pair,'Workflow captures differ from metrics');
    same(workflow.attempts.map(a=>a.variant),['baseline','candidate'],'Workflow attempts incomplete');
    for(const attempt of workflow.attempts){must(attempt.phase==='complete'&&attempt.mountWindow.adjustedWaits===4,'Workflow did not complete');const value=pair.find(e=>e.variant===attempt.variant);must(attempt.materialDisposal.length===value.draw.materials&&attempt.materialDisposal.every(item=>item.disposeCount>0),'Native materials not disposed');if(id==='infant-narrow-contrast')for(const name of ['fr-patient-nose-skin','fr-patient-arm-skin'])same(attempt.materialDisposal.filter(item=>item.name===name).map(item=>item.disposeCount),[1],name+' contrast material disposal');}
    must(summary.pixelComparisons.length===1&&summary.pixelComparisons[0].id===id,'Pixel evidence missing');const pixels=summary.pixelComparisons[0];
    for(const[count,total]of [['changedPixels','totalPixels'],['wristChangedPixels','wristTotalPixels']])must(Number.isInteger(pixels[count])&&pixels[count]>=0&&Number.isInteger(pixels[total])&&pixels[total]>0&&pixels[count]<=pixels[total],'Invalid pixel count '+count);
    if(id!=='infant-narrow-contrast')must(pixels.changedPixels>0&&pixels.wristChangedPixels>0,'Normal wrist shading improvement not visible');
    const expected=['baseline','candidate'].flatMap(variant=>['wrist','stage'].map(part=>id+'-'+variant+'-'+part+'.png')).sort();same(summary.images.slice().sort(),expected,'Expected exactly four native images');same(fs.readdirSync(dir).filter(n=>n.endsWith('.png')).sort(),expected,'Unexpected native image set');
    for(const name of expected)imageHashes[name]=hash(read(path.join(dir,name)));
    for(const e of pair){must(e.errors.length===0&&e.detail.proof.sameCapturedFrame,'Native crop/error evidence invalid');must(e.detail.proof.sourceSHA256===imageHashes[e.capture],'Crop source mismatch');}
    for(const file of walk(dir))include(file);native.push({id,summary});
  }
  const visual=json(local('visual-review.json')),independent=json(local('independent-visual-review.json'));validateVisual(visual,sourceSHA,imageHashes);validateVisual(independent,sourceSHA,imageHashes);
  if(process.argv.includes('--selftest'))selftest(source,sourceSHA,visual,imageHashes);
  const gateSelftest=json(local('finish-selftest.json'));must(gateSelftest.passed&&gateSelftest.mutationRejected&&gateSelftest.reviewRejected&&gateSelftest.restoredAndReread&&gateSelftest.scriptSHA256===hash(read(__filename))&&gateSelftest.sourceSHA256===sourceSHA,'Delivery gate selftest missing/stale; run --check-only --selftest');
  const required=['baseline.json','before.js','candidate.js','delta.json','history-integration.json','history-preservation.json','history-input-snapshot.json','prepare-history.cjs','snapshot-history.cjs','author-history.cjs','author-delivery.cjs','author-candidate.cjs','prepare-browser-fixture.cjs','delivery-raw-cpu.txt','delivery-native.txt','delivery-readme.txt','verify-patient-wrist-finish.cjs','geometry-contract/shading-verification.json','audit-preview-fixture.cjs','fixture-audit.json','firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','visual-review.json','independent-visual-review.json','finish-pass.cjs','finish-selftest.json','run-raw-wrist.cjs','firstresponse_patient_wrist_finish_delta.cjs','firstresponse_patient_wrist_finish_delta.json'];
  for(const name of required)include(local(name));
  const retained=[];for(const entry of fs.readdirSync(work,{withFileTypes:true})){if(entry.isFile()&&(/^(?:cpu|winding-diagnosis|check-nose-contour|fixture-audit)[\w.-]*\.(?:json|log|cjs|saved)$/.test(entry.name)||/^selftest-[\w-]+\.bin$/.test(entry.name)||/^native-[\w-]+-(?:detached\.log|launcher\.json)$/.test(entry.name)||/^(?:recover-native-launch|archive-aborted-native)\.cjs$/.test(entry.name))&&!required.includes(entry.name)){include(local(entry.name));retained.push(entry.name);}if(entry.isDirectory()&&/^(?:cpu[-_]|geometry-contract(?!$)|winding-diagnostics$|candidate-rejected-|candidate-history$)/.test(entry.name)){for(const file of walk(local(entry.name)))include(file);retained.push(entry.name+'/');}}
  for(const name of ['raw-dependency-diagnostics','raw-memory-diagnostics']){const dir=local(name);if(fs.existsSync(dir)){for(const file of walk(dir))if(!path.relative(dir,file).split(path.sep).includes('node_modules'))include(file);retained.push(name+'/');}}
  const unsuccessfulNative=[];
  for(const entry of fs.readdirSync(work,{withFileTypes:true})){if(entry.isDirectory()&&entry.name.startsWith('native-')&&!views.some(id=>entry.name===nativeDirectory(id))){const failureFile=local(entry.name+'/failure.json');must(fs.existsSync(failureFile),'Unclassified native attempt '+entry.name);const failure=json(failureFile);must(typeof failure.error==='string'&&failure.error.length>0,'Missing unsuccessful-run diagnosis');for(const file of walk(local(entry.name)))include(file);retained.push(entry.name+'/');unsuccessfulNative.push({directory:entry.name,kind:failure.kind||'failed',error:failure.error});}}
  const historyChecks=verifyHistory(preservation,integration,source.toString(),previous.toString(),false),shared=sharedSnapshot(history,integration,false);must(!fs.existsSync(reportPath),'Report target already exists; inspect before delivery');
  const rows=native.map(({id,summary:s})=>`| ${id} | ${s.pixelComparisons[0].changedPixels} / ${s.pixelComparisons[0].totalPixels} | ${Math.round(s.stats.duration/1000)} s |`).join('\n');
  const images=views.map(id=>`### ${id}\n\n| Before | After |\n| --- | --- |\n| ![Before ${id}](evidence/${nativeDirectory(id)}/${id}-baseline-wrist.png) | ![After ${id}](evidence/${nativeDirectory(id)}/${id}-candidate-wrist.png) |\n\n[Full stage before](evidence/${nativeDirectory(id)}/${id}-baseline-stage.png) · [Full stage after](evidence/${nativeDirectory(id)}/${id}-candidate-stage.png)`).join('\n\n');
  const readme=`# First Response Lab: patient wrist shading

The patient wrist surfaces transition more smoothly into the forearms. Surface normals in the wrist root region follow the adjoining forearm shading, then blend back into the existing wrist surface.

Only the two patient wrist normal buffers change. All vertex positions, silhouettes, geometry counts, materials, cameras, poses, supporting-hand contact, metadata and lesson state are preserved.

## Validation

- ${cpu.results.length} CPU geometry cases passed (${cpu.assertions.toLocaleString('en-US')} assertions). The validator checks the current wrist normals and exact preservation of positions and unrelated scene data. Deliberate defects were rejected, then saved source bytes were restored and reread.
- ${raw.numPassedTests} unchanged raw tests passed: 33 patient-wrist compatibility cases and 23 current hand-surface tests. The runner also rejected a deliberate source-pin mismatch and restored and reread the saved bytes.
- Three native Supporting hand close-up comparisons passed: adult wide, child narrow, and infant narrow high contrast. Every accepted run used one worker and zero retries. Cameras, framing, contact, lesson state, draw counts and allocated resources match within each pair. A real child-view resize verifies the camera and resource behavior. Each wrist crop comes from its full-stage capture.
- Root and independent visual reviews accepted the same 12 image hashes.
- Nineteen exact history reversals passed. All 39 raw fixtures and 8 existing checkers are preserved. The Git index is guarded against the fresh delivery snapshot. The raw tests were **not run as a whole suite**.

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

${unsuccessfulNative.length?unsuccessfulNative.map(run=>'- ['+run.directory+'](evidence/'+run.directory+'/failure.json): '+run.error).join('\n'):'No unsuccessful native attempts were recorded.'}

The initial CPU check found an inward-facing normal at an existing folded wrist crease in recovery pose 8. The same triangle and normal agreement are present in the baseline. The final check requires all changed root faces to face outward and preserves every unchanged face exactly. The failed check and diagnosis are retained under winding-diagnostics and winding-diagnosis.json.

CPU and browser evidence, the source delta, compatibility checks and visual reviews are saved under [evidence](evidence). ${retained.length?'Supporting audit files and directories: '+retained.join(', ')+'.':'No additional supporting audit files were found to archive.'}

[Post-write verification](post-write.json) records the installed bytes, syntax, history reversals and preserved inputs.
`;
  packageFiles.set('README.md',Buffer.from(readme));

  const packageHashes=Object.fromEntries([...packageFiles].map(([name,b])=>[name,hash(b)]));
  const snapshot={sourceSHA256:sourceSHA,beforeSHA256:beforeSHA,inputs,shared,packageHashes,reportRelative};
  return {snapshot,source,previous,sourceSHA,integration,preservation,history,historyChecks,packageFiles,imageHashes,cpu,native,raw};
}
function guardedWrite(file,bytes,expected){if(expected===null)must(!fs.existsSync(file),'Refusing to overwrite '+file);else guardFile(file,expected);fs.writeFileSync(file,bytes,{flag:expected===null?'wx':'w'});same(read(file),Buffer.from(bytes),'Written bytes differ '+file);}
const args=process.argv.slice(2);must(args.every(a=>['--check-only','--selftest','--apply'].includes(a)),'Unknown option');must(!(args.includes('--check-only')&&args.includes('--apply')),'Choose check-only or apply');must(!(args.includes('--apply')&&args.includes('--selftest')),'Run selftest during preflight, before apply');
const data=gather(),preflightPath=local('finish-preflight.json');
if(!args.includes('--apply')){const preflight={createdAt:new Date().toISOString(),snapshot:data.snapshot};fs.writeFileSync(preflightPath,JSON.stringify(preflight,null,2)+'\n');console.log(JSON.stringify({checkOnly:true,sourceSHA256:data.sourceSHA,cpuCases:data.cpu.results.length,nativeViews:views.length,images:Object.keys(data.imageHashes).length,historyReversals:data.historyChecks.length,sharedWrites:false,preflightSHA256:hash(read(preflightPath))}));process.exit(0);}
const preflight=json(preflightPath);same(data.snapshot,preflight.snapshot,'Preflight no longer matches; rerun --check-only --selftest and inspect');
const token='firstresponse-patient-wrist-finish-'+data.sourceSHA.slice(0,12),savedHandoff=read(handoffPath),eol=savedHandoff.includes(Buffer.from('\r\n'))?'\r\n':'\n';
must(!savedHandoff.toString().includes(token),'Handoff already mentions this delivery; inspect prior attempt');
const active=savedHandoff.toString()+eol+`## ACTIVE ${token}`+eol+`Scope: four First Response Lab runtime copies; support-frame compatibility helper; two new patient-wrist-finish compatibility helper files; ${reportRelative}. Private source ${beforeSHA} -> ${data.sourceSHA}. No staging, commit, push or deployment. Owner: current First Response Lab enhancement task.`+eol;
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
  const post={passed:true,sourceSHA256:data.sourceSHA,beforeSHA256:beforeSHA,allFourCopiesIdentical:true,syntaxPassed:true,historyChecks,rawFixtureFilesPreserved:39,rawFixtureFilesStrengthened:0,focusedRawTestsPassed:data.raw.numPassedTests,rawFixtureSelftest:data.raw.selftest,existingCheckerFilesPreserved:8,indexUnchanged:true,indexPreservationScope:'Fresh private history snapshot through completion.',sharedHashes:protectedShared,activeHandoffSHA256,reportHashes:data.snapshot.packageHashes,gateSelftest:json(local('finish-selftest.json')),limitations:'Raw-module verification only. Full application loader/build/deployment not tested. Both selected raw fixtures remain unchanged; current wrist normals are checked by the CPU and native browser validators.'};
  guardedWrite(path.join(reportPath,'post-write.json'),JSON.stringify(post,null,2)+'\n',null);
  const currentHandoff=read(handoffPath),activeHeader=`## ACTIVE ${token}`;must(currentHandoff.toString().split(activeHeader).length===2,'Active handoff entry missing or duplicated');
  const complete=currentHandoff.toString().replace(activeHeader,`## COMPLETE ${token}`)+eol+`Completed ${token}: scope released. All four runtime copies match ${data.sourceSHA}; syntax, 19 compatibility reversals, 39 unchanged raw test files, 8 unchanged checkers verified. Current Git index preserved from the fresh private history snapshot through completion. Evidence: ${reportRelative}/README.md. No commit or deployment.`+eol;
  guardedWrite(handoffPath,complete,hash(currentHandoff));guardFile(data.history.indexPath,data.history.indexSHA256);
  const result={completed:true,sourceSHA256:data.sourceSHA,report:reportPath,indexUnchanged:true,committed:false,deployed:false};fs.writeFileSync(local('finish-integration.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){fs.writeFileSync(local('finish-failure.json'),JSON.stringify({error:error.stack,sourceSHA256:data.sourceSHA,activeHandoff:token,sharedWritesMayHaveOccurred:true},null,2)+'\n');throw error;}

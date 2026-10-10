// Private delivery gate. --check-only --selftest prepares a pinned plan; --apply requires that exact plan.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const work=__dirname,root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const beforeSHA='69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242',candidateSHA='147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891';
const reportRelative='reports/firstresponse-patient-wrist-finish',reportPath=path.join(root,reportRelative),handoffPath=path.join(root,'AGENT_HANDOFF.md');
const views=['infant-narrow-contrast','child-narrow','adult-wide'];
const nativeDirectory=id=>({'adult-wide':'native-adult-fold-final','child-narrow':'native-child-fold-final','infant-narrow-contrast':'native-infant-fold-final'}[id]);
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
  const interruptedRaw=[];
  for(const name of ['fold-interrupted-no-result','fold-interrupted-streaming']){
    const directory=local('raw-memory-diagnostics/'+name),failure=json(path.join(directory,'failure.json'));
    const entries=Array.isArray(failure.files)?failure.files:Object.entries(failure.files).map(([name,sha256])=>({path:name,sha256}));
    must((failure.candidateSHA256||failure.sourceSHA256)===sourceSHA,'Interrupted raw source drift');
    must(entries.length===(name==='fold-interrupted-no-result'?44:46),'Interrupted raw input inventory incomplete');
    same(walk(directory).map(file=>path.relative(directory,file).split(path.sep).join('/')).sort(),[...entries.map(entry=>entry.path.split('\\').join('/')),'failure.json','runner.cjs.saved'].sort(),'Interrupted raw archive inventory drift');
    for(const entry of entries){const file=path.resolve(directory,entry.path);must(file.startsWith(path.resolve(directory)+path.sep),'Interrupted raw path escapes archive');guardFile(file,entry.sha256);if(entry.bytes!==undefined)must(read(file).length===entry.bytes,'Interrupted raw file size changed');}
    guardFile(path.join(directory,'runner.cjs.saved'),failure.runnerSHA256);guardFile(path.join(directory,'saved-candidate.js'),sourceSHA);guardFile(path.join(directory,'stem_lab/stem_tool_firstresponse.js'),sourceSHA);
    for(const name of ['candidate-results.json','summary.json','exit.json'])must(!fs.existsSync(path.join(directory,name)),'Interrupted archive unexpectedly contains a result');
    if(name==='fold-interrupted-no-result')must(failure.accepted===false&&failure.verifiedAfterMove===true&&failure.sharedWrites===0&&typeof failure.reason==='string'&&failure.reason.length>0,'Buffered raw interruption diagnosis missing');
    else{const launch=json(path.join(directory,'launch.json'));same(launch,failure.launch,'Interrupted raw launch record changed');must(failure.status==='interrupted-no-result'&&failure.testOutcome===null&&failure.verifiedReread===true&&typeof failure.processCheck==='string'&&failure.processCheck.length>0,'Streaming raw interruption diagnosis missing');must(launch.sourceSHA256===sourceSHA&&launch.runnerSHA256===failure.runnerSHA256&&launch.streamedOutput===true,'Interrupted raw launch source/runner mismatch');}
    interruptedRaw.push({directory:'raw-memory-diagnostics/'+name,files:entries.length,outcome:null});
  }
  const rawDirectory=local('raw-wrist-fold-tests'),raw=json(path.join(rawDirectory,'summary.json'));
  const rawFiles=['tests/firstresponse_patient_wrists.test.js','tests/firstresponse_hand_surface.test.js'];
  const testHashes=Object.fromEntries(rawFiles.map(file=>[file,history.fixtureHashes[path.basename(file)]]));
  same(raw.testHashes,testHashes,'Selected raw fixtures must retain original bytes');
  must(raw.passed===false&&raw.sourceSHA256===sourceSHA&&raw.exitCode===1&&raw.numPassedTests===53&&raw.numFailedTests===3&&raw.numTotalTests===56&&raw.numPendingTests===0,'Expected the complete raw run with 53 passes and exactly three separately verified baseline failures');
  must(raw.inputsUnchanged===true&&raw.sharedFilesWritten===0,'Raw fixture run modified shared inputs');
  guardFile(local('run-raw-wrist.cjs'),raw.runnerSHA256);syntax(local('run-raw-wrist.cjs'));
  const rawLaunch=json(path.join(rawDirectory,'launch.json')),rawExit=json(path.join(rawDirectory,'exit.json'));
  must(rawLaunch.streamedOutput===true&&rawLaunch.sourceSHA256===sourceSHA&&rawLaunch.runnerSHA256===raw.runnerSHA256&&rawLaunch.timeoutMs===240000&&Number.isInteger(rawLaunch.pid)&&rawLaunch.pid>0,'Raw streamed launch metadata incomplete');
  must(rawExit.pid===rawLaunch.pid&&rawExit.exitCode===1&&rawExit.signal===null&&rawExit.timedOut===false&&rawExit.spawnError===null,'Raw test process interrupted or timed out');guardFile(path.join(rawDirectory,'candidate.log'),rawExit.logSHA256);
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
  must(rawResult.numPassedTests===53&&rawResult.numFailedTests===3&&rawResult.numTotalTests===56&&rawResult.numPendingTests===0&&rawResult.success===false,'Raw test report differs from summary');
  must(rawResult.testResults.length===2&&rawResult.testResults.every(row=>row.assertionResults.every(test=>['passed','failed'].includes(test.status))),'Raw individual test outcomes incomplete');
  same(rawResult.testResults.map(row=>row.assertionResults.length).sort((a,b)=>a-b),[23,33],'Raw test per-file counts');
  same(rawResult.testResults.map(row=>path.basename(row.name)).sort(),rawFiles.map(file=>path.basename(file)).sort(),'Raw result fixture names');
  const wristRaw=rawResult.testResults.find(row=>path.basename(row.name)==='firstresponse_patient_wrists.test.js'),handRaw=rawResult.testResults.find(row=>path.basename(row.name)==='firstresponse_hand_surface.test.js');
  must(wristRaw.assertionResults.length===33&&wristRaw.assertionResults.every(test=>test.status==='passed'),'A patient-wrist compatibility test failed');
  must(handRaw.assertionResults.length===23&&handRaw.assertionResults.filter(test=>test.status==='passed').length===20,'Unexpected current hand-surface outcomes');
  const baselineDirectory=local('raw-baseline-fold-comparison'),rawBaseline=json(path.join(baselineDirectory,'summary.json'));
  must(rawBaseline.verified===true&&rawBaseline.baselineSHA256===beforeSHA&&rawBaseline.candidateSHA256===sourceSHA&&rawBaseline.fixture==='tests/firstresponse_hand_surface.test.js'&&rawBaseline.fixtureSHA256===testHashes[rawBaseline.fixture]&&rawBaseline.vendorSHA256===raw.vendorSHA256,'Baseline comparison source/fixture mismatch');
  must(rawBaseline.baselineExitCode===1&&rawBaseline.candidatePassedTests===53&&rawBaseline.candidateFailedTests===3&&rawBaseline.baselineFailedTests===3&&rawBaseline.baselineSkippedTests===20&&rawBaseline.inputsUnchanged===true&&rawBaseline.sharedFilesWritten===0,'Baseline comparison was incomplete');
  guardFile(local('run-baseline-crease-comparison.cjs'),rawBaseline.runnerSHA256);syntax(local('run-baseline-crease-comparison.cjs'));
  guardFile(path.join(baselineDirectory,'vitest.config.cjs'),rawBaseline.configSHA256);
  guardFile(path.join(baselineDirectory,'stem_lab/stem_tool_firstresponse.js'),beforeSHA);
  guardFile(path.join(baselineDirectory,rawBaseline.fixture),rawBaseline.fixtureSHA256);
  guardFile(path.join(baselineDirectory,'vendor/three-r128/three.min.js'),rawBaseline.vendorSHA256);
  guardFile(path.join(rawDirectory,'candidate-results.json'),rawBaseline.candidateResultSHA256);
  guardFile(path.join(baselineDirectory,'baseline-results.json'),rawBaseline.baselineResultSHA256);
  const baselinePins=[local('run-baseline-crease-comparison.cjs'),local('before.js'),local('candidate.js'),path.join(rawDirectory,'candidate-results.json'),path.join(rawDirectory,'summary.json'),safeShared(rawBaseline.fixture),safeShared('vendor/three-r128/three.min.js'),path.join(baselineDirectory,'stem_lab/stem_tool_firstresponse.js'),path.join(baselineDirectory,rawBaseline.fixture),path.join(baselineDirectory,'vendor/three-r128/three.min.js'),path.join(baselineDirectory,'vitest.config.cjs')];
  same(Object.keys(rawBaseline.pins).map(file=>path.resolve(file)).sort(),baselinePins.map(file=>path.resolve(file)).sort(),'Baseline input pin inventory changed');
  for(const[file,pin]of Object.entries(rawBaseline.pins))guardFile(file,pin);
  const baselineProvenance=rawBaseline.provenance,baselineArchive=local('candidate-rejected-recovery-fold'),savedBaselineDirectory=path.join(baselineArchive,'raw-baseline-comparison'),savedBaselineSummary=json(path.join(savedBaselineDirectory,'summary.json'));
  must(baselineProvenance.kind==='reuse-verified-baseline-run'&&baselineProvenance.baselineExecutedThisComparison===false&&baselineProvenance.archive==='candidate-rejected-recovery-fold/raw-baseline-comparison'&&baselineProvenance.originalBaselineExitCode===1,'Baseline evidence reuse provenance missing');
  const baselineArchiveFiles=['run-baseline-crease-comparison.cjs','before.js','candidate.js','raw-wrist-tests/candidate-results.json','raw-wrist-tests/summary.json','raw-baseline-comparison/summary.json','raw-baseline-comparison/baseline-results.json','raw-baseline-comparison/baseline.log','raw-baseline-comparison/comparison-selftest.json','raw-baseline-comparison/stem_lab/stem_tool_firstresponse.js','raw-baseline-comparison/'+rawBaseline.fixture,'raw-baseline-comparison/vendor/three-r128/three.min.js','raw-baseline-comparison/vitest.config.cjs','rejection.json'];
  same(Object.keys(baselineProvenance.archivePins).map(file=>path.resolve(file)).sort(),baselineArchiveFiles.map(file=>path.resolve(baselineArchive,file)).sort(),'Baseline archive pin inventory');
  for(const[file,pin]of Object.entries(baselineProvenance.archivePins))guardFile(file,pin);
  must(savedBaselineSummary.verified===true&&savedBaselineSummary.baselineSHA256===beforeSHA&&savedBaselineSummary.fixtureSHA256===rawBaseline.fixtureSHA256&&savedBaselineSummary.vendorSHA256===rawBaseline.vendorSHA256&&savedBaselineSummary.baselineExitCode===1,'Archived baseline inputs or result changed');
  must(baselineProvenance.originalSummarySHA256===hash(read(path.join(savedBaselineDirectory,'summary.json')))&&baselineProvenance.originalRunnerSHA256===savedBaselineSummary.runnerSHA256&&baselineProvenance.originalConfigSHA256===rawBaseline.configSHA256&&baselineProvenance.originalResultSHA256===rawBaseline.baselineResultSHA256,'Copied baseline evidence differs from original run');
  guardFile(path.join(baselineArchive,'run-baseline-crease-comparison.cjs'),savedBaselineSummary.runnerSHA256);guardFile(path.join(savedBaselineDirectory,'vitest.config.cjs'),rawBaseline.configSHA256);guardFile(path.join(savedBaselineDirectory,'baseline-results.json'),rawBaseline.baselineResultSHA256);guardFile(path.join(savedBaselineDirectory,'comparison-selftest.json'),rawBaseline.baselineResultSHA256);
  for(const[file,pin]of Object.entries(savedBaselineSummary.pins)){const rel=path.relative(work,file),preserved=rel.startsWith('..')?file:path.join(baselineArchive,rel);guardFile(preserved,pin);}
  const baselineResult=json(path.join(baselineDirectory,'baseline-results.json'));
  must(baselineResult.success===false&&baselineResult.numTotalTests===23&&baselineResult.numPassedTests===0&&baselineResult.numFailedTests===3&&baselineResult.numPendingTests===20&&baselineResult.testResults.length===1,'Filtered baseline outcomes incomplete');
  const baselineTests=baselineResult.testResults[0].assertionResults;
  same(baselineTests.map(test=>test.fullName).sort(),handRaw.assertionResults.map(test=>test.fullName).sort(),'Baseline/current hand test identities differ');
  must(path.basename(baselineResult.testResults[0].name)==='firstresponse_hand_surface.test.js'&&baselineTests.length===23&&baselineTests.filter(test=>['pending','skipped'].includes(test.status)).length===20,'Baseline selected a different test set');
  function creaseFailures(result){const failures=result.testResults.flatMap(file=>file.assertionResults).filter(test=>test.status==='failed');
    same(failures.map(test=>test.fullName).sort(),['adult','child','infant'].map(age=>'First Response hand skin surfaces mirrors patient fingers, thumbs and nails between the two hands for '+age).sort(),'Unexpected raw failing test');
    return failures.map(test=>{must(test.failureMessages.length===1,'Unexpected multiple raw failure messages');const assertion=test.failureMessages[0].split(/\r?\n/)[0],match=assertion.match(/^AssertionError: primary palm crease mirrored skin path: expected ([0-9.e+-]+) to be less than (0\.00001)$/);must(match,'Unexpected failing assertion');const actual=Number(match[1]),expected=Number(match[2]);must(Number.isFinite(actual)&&actual>expected,'Invalid failing palm-crease value');return{test:test.fullName,assertion,actual,expected};}).sort((a,b)=>a.test.localeCompare(b.test));}
  const currentFailures=creaseFailures(rawResult),baselineFailures=creaseFailures(baselineResult);
  same(currentFailures,baselineFailures,'Current raw failures differ from baseline in identity, assertion or exact numeric value');same(rawBaseline.comparisons,currentFailures,'Baseline summary differs from actual result files');
  must(rawBaseline.selftest?.ran===true&&rawBaseline.selftest.changedFailureRejected===true&&rawBaseline.selftest.restoredAndReread===true&&rawBaseline.selftest.restoredSHA256===rawBaseline.baselineResultSHA256,'Baseline failure-comparison selftest missing');
  guardFile(path.join(baselineDirectory,'comparison-selftest.json'),rawBaseline.baselineResultSHA256);
  for(const file of walk(baselineDirectory))include(file);
  for(const file of walk(rawDirectory))include(file);
  syntax(local('candidate.js'),source);syntax(local('run-face-browser.cjs'));syntax(local('verify-patient-wrist-palm.cjs'));syntax(__filename);
  const cpu=json(local('geometry-contract-palm-fold/shading-verification.json'));
  must(cpu.passed===true&&cpu.beforeSHA256===beforeSHA&&cpu.candidateSHA256===sourceSHA&&cpu.checkerSHA256===hash(read(local('verify-patient-wrist-palm.cjs'))),'CPU source/checker mismatch');
  must(cpu.results.length===30&&Number.isInteger(cpu.assertions)&&cpu.assertions>0,'CPU validation incomplete');
  same(cpu.results.map(r=>[r.age,r.phase,r.contrast].join(':')).sort(),['adult','child','infant'].flatMap(age=>[0,3,4,5,8].flatMap(phase=>[false,true].map(contrast=>[age,phase,contrast].join(':')))).sort(),'CPU scenarios incomplete');
  same(Object.keys(cpu.inputs).map(file=>path.resolve(file)).sort(),[local('candidate.js'),local('before.js'),local('verify-patient-wrist-palm.cjs'),safeShared('vendor/three-r128/three.min.js')].map(file=>path.resolve(file)).sort(),'CPU input scope');
  for(const[file,pin]of Object.entries(cpu.inputs))guardFile(file,pin);
  same(cpu.negative.map(test=>test.type).sort(),['omit-patient-wrist-blend','omit-patient-palm-blend','off-scope-palm-normal','omit-palm-alignment-guard','omit-palm-fold-skip'].sort(),'CPU deliberate-failure cases missing or duplicated');
  must(cpu.negative.every(test=>test.rejected===true&&typeof test.error==='string'&&test.error.length>0&&test.restored===true&&test.restoredSHA256===sourceSHA),'CPU deliberate failures not rejected/restored');
  guardFile(local('geometry-contract-palm-fold/selftest-candidate.js'),sourceSHA);
  for(const row of cpu.results){
    must(row.status==='passed','CPU case failed');must(/^[a-f0-9]{64}$/.test(row.preservation.SHA256),'CPU scene preservation pin missing');
    for(const key of ['nodes','meshes'])must(Number.isInteger(row.preservation[key])&&row.preservation[key]>0,'CPU resource count missing '+key);
    same(row.priorResources,row.currentResources,'CPU resource allocations changed');same(row.repeatResources,row.currentResources,'CPU repeat resource allocations changed');
    for(const key of ['geometries','materials','total'])must(Number.isInteger(row.currentResources[key])&&row.currentResources[key]>0,'CPU resources invalid');
    must(row.currentResources.total===row.currentResources.geometries+row.currentResources.materials,'CPU total resources mismatch');
    same(row.wrists.map(w=>w.side),['left','right'],'CPU wrist scope');
    for(const w of row.wrists){const n=w.normals,b=w.baseline,c=w.candidate,p=w.palm;
      must(n.count===1200&&Number.isInteger(n.changed)&&n.changed>n.rootChanged&&n.changed<=1200&&n.rootChanged===336&&Number.isInteger(n.palmChanged)&&n.palmChanged>0&&n.changed>=n.rootChanged+n.palmChanged&&n.changed<=n.rootChanged+n.palmChanged+48,'CPU wrist normal change count invalid');
      must(Array.isArray(n.changedRows)&&n.changedRows.every((value,i)=>Number.isInteger(value)&&value>=0&&value<=24&&(i===0||value>n.changedRows[i-1]))&&[0,1,2,3,4,5,6].every(value=>n.changedRows.includes(value)),'CPU changed normal rows invalid');
      must(n.minLength>.9999&&n.maxLength<1.0001&&n.newNegativeFaces===0&&n.unchangedFacesExact===true&&Number.isInteger(n.unchangedFaces)&&n.unchangedFaces>0&&Number.isInteger(n.baselineNegativeFaces)&&n.baselineNegativeFaces>=0&&[n.minimumFaceDot,n.baselineMinimumFaceDot,n.minimumChangedFaceDot,n.minimumUnchangedFaceDot].every(Number.isFinite)&&/^[a-f0-9]{64}$/.test(n.SHA256),'CPU normal geometry failed');
      must(n.baselineMinimumFaceDot<0?n.minimumFaceDot>=n.baselineMinimumFaceDot-1e-7:n.minimumFaceDot>0,'CPU normal orientation regressed');
      must(n.minimumFaceDot===Math.min(n.minimumChangedFaceDot,n.minimumUnchangedFaceDot),'CPU global normal agreement does not match changed and unchanged regions');
      must(b.samples===48&&c.samples===48&&Number.isFinite(b.meanAngleDegrees)&&b.meanAngleDegrees>0&&Number.isFinite(c.meanAngleDegrees)&&c.meanAngleDegrees>=0&&c.meanAngleDegrees<b.meanAngleDegrees*.25&&c.maximumAngleDegrees<2,'CPU seam normal continuity failed');
      for(const m of [b,c])must(Number.isFinite(m.minimumAngleDegrees)&&m.minimumAngleDegrees>=0&&Number.isFinite(m.maximumSurfaceGap)&&m.maximumSurfaceGap>=0&&m.maximumCrossingRootRow<5&&m.minimumCrossingDistance>0&&m.maximumCrossingDistance>=m.minimumCrossingDistance,'CPU overlap crossing invalid');
      must(Number.isInteger(p.samples)&&p.samples>=6&&p.rows.length===p.samples&&Number.isInteger(p.totalCrossings)&&Number.isInteger(p.excludedOccluded)&&p.excludedOccluded>=0&&Number.isInteger(p.excludedOpposing)&&p.excludedOpposing>=0&&p.totalCrossings===p.samples+p.excludedOccluded+p.excludedOpposing,'CPU palm sampling scope');
      must(Number.isFinite(p.beforeMeanAngleDegrees)&&p.beforeMeanAngleDegrees>0&&Number.isFinite(p.candidateMeanAngleDegrees)&&p.candidateMeanAngleDegrees>=0&&p.candidateMeanAngleDegrees<p.beforeMeanAngleDegrees*.65&&Number.isFinite(p.maximumSurfaceGap)&&p.maximumSurfaceGap>=0&&p.maximumSurfaceGap<1e-5,'CPU visible compatible palm seam improvement');
      for(const sample of p.rows)must(Number.isInteger(sample.lane)&&sample.lane>=0&&sample.lane<48&&sample.row>=7&&sample.row<24&&Number.isFinite(sample.beforeAngleDegrees)&&sample.beforeAngleDegrees>=0&&Number.isFinite(sample.candidateAngleDegrees)&&sample.candidateAngleDegrees>=0&&sample.candidateAngleDegrees<=sample.beforeAngleDegrees+1&&Number.isFinite(sample.surfaceGap)&&sample.surfaceGap>=0&&sample.surfaceGap<1e-5,'CPU palm sample validation');
      const mean=key=>p.rows.reduce((sum,sample)=>sum+sample[key],0)/p.rows.length;
      must(p.beforeMeanAngleDegrees===mean('beforeAngleDegrees')&&p.candidateMeanAngleDegrees===mean('candidateAngleDegrees')&&p.beforeMaximumAngleDegrees===Math.max(...p.rows.map(sample=>sample.beforeAngleDegrees))&&p.candidateMaximumAngleDegrees===Math.max(...p.rows.map(sample=>sample.candidateAngleDegrees)),'CPU palm summary differs from samples');
    }
  }
  for(const file of walk(local('geometry-contract-palm-fold')))include(file);
  const cpuAudit=json(local('delivery-cpu-schema-review.json'));
  must(cpuAudit.accepted===true&&cpuAudit.sourceSHA256===sourceSHA&&cpuAudit.checkerSHA256===cpu.checkerSHA256&&cpuAudit.reportSHA256===hash(read(local('geometry-contract-palm-fold/shading-verification.json')))&&cpuAudit.gateFragmentSHA256===hash(read(local('delivery-raw-cpu.txt')))&&cpuAudit.auditorSHA256===hash(read(local('audit-cpu-delivery.cjs')))&&cpuAudit.cases===30&&cpuAudit.assertions===cpu.assertions&&cpuAudit.sharedWrites===0,'CPU delivery schema audit stale or incomplete');
  same(cpuAudit.negative.map(row=>row.type).sort(),['failed-report','newly-reversed-face'],'CPU delivery schema selftests incomplete');
  must(cpuAudit.negative.every(row=>row.rejected===true&&typeof row.error==='string'&&row.error.length>0&&row.restoredAndReread===true&&row.restoredSHA256===cpuAudit.reportSHA256),'CPU delivery schema mutation not rejected/restored');
  guardFile(local('cpu-delivery-fold-selftest/report.json'),cpuAudit.reportSHA256);
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
  const recoveryDirectory=local('recovery-fold-native-diagnostic');
  const recovery=require(local('verify-recovery-native-package.cjs')).verify(recoveryDirectory);
  must(recovery.sourceSHA256===sourceSHA&&recovery.beforeSHA256===beforeSHA&&recovery.pose===8&&recovery.images===4,'Recovery diagnostic source or scope mismatch');
  for(const file of walk(recoveryDirectory))include(file);
  const hostArchive=local('candidate-rejected-host-refresh'),hostArchiveManifest=json(path.join(hostArchive,'manifest.json')),hostRevalidation=json(path.join(hostArchive,'revalidation.json'));
  must(hostArchiveManifest.sharedWrites===0&&hostArchiveManifest.moves.length===5,'Host refresh archive scope');
  const expectedArchivedNames=['native-adult-fold-final','native-child-fold-final','native-infant-fold-final','recovery-fold-native-diagnostic','original-recovery-run'];
  same(hostArchiveManifest.moves.map(item=>path.basename(item.to)).sort(),expectedArchivedNames.slice().sort(),'Host refresh archive inventory');
  const expectedRevalidatedImages={};
  for(const item of hostArchiveManifest.moves){const name=path.basename(item.to),directory=path.join(hostArchive,name);same(walk(directory).map(file=>path.relative(directory,file)).sort(),Object.keys(item.files).sort(),'Original host evidence inventory');for(const[file,pin]of Object.entries(item.files)){const target=path.resolve(directory,file);must(target.startsWith(path.resolve(directory)+path.sep),'Archived host evidence path');guardFile(target,pin);if(file.endsWith('.png')&&name!=='recovery-fold-native-diagnostic'){const current=name==='original-recovery-run'?path.join(recoveryDirectory,'native-adult-recovery-fold',file):local(name+'/'+file);guardFile(current,pin);expectedRevalidatedImages[path.resolve(item.from,file)]=pin;}}}
  must(hostRevalidation.passed===true&&hostRevalidation.allSixteenImagesExact===true&&hostRevalidation.sharedWrites===0&&hostRevalidation.images.length===16,'Host refresh revalidation incomplete');
  same(Object.fromEntries(hostRevalidation.images.map(item=>[path.resolve(item.file),item.sha256])),expectedRevalidatedImages,'All sixteen reviewed images must remain exact');
  for(const file of walk(hostArchive))include(file);
  const visual=json(local('visual-review.json')),independent=json(local('independent-visual-review.json'));validateVisual(visual,sourceSHA,imageHashes);validateVisual(independent,sourceSHA,imageHashes);
  if(process.argv.includes('--selftest'))selftest(source,sourceSHA,visual,imageHashes);
  const gateSelftest=json(local('finish-selftest.json'));must(gateSelftest.passed&&gateSelftest.mutationRejected&&gateSelftest.reviewRejected&&gateSelftest.restoredAndReread&&gateSelftest.scriptSHA256===hash(read(__filename))&&gateSelftest.sourceSHA256===sourceSHA,'Delivery gate selftest missing/stale; run --check-only --selftest');
  const required=['baseline.json','before.js','candidate.js','delta.json','history-integration.json','history-preservation.json','history-input-snapshot.json','prepare-history.cjs','snapshot-history.cjs','author-history.cjs','author-delivery.cjs','author-candidate.cjs','prepare-browser-fixture.cjs','delivery-raw-cpu.txt','delivery-native.txt','delivery-readme.txt','verify-patient-wrist-palm.cjs','geometry-contract-palm-fold/shading-verification.json','audit-preview-fixture.cjs','fixture-audit.json','firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','visual-review.json','independent-visual-review.json','finish-pass.cjs','finish-selftest.json','run-raw-wrist.cjs','firstresponse_patient_wrist_finish_delta.cjs','firstresponse_patient_wrist_finish_delta.json'];
  required.push('reclaimed-archived-copies.json','accept-final-cpu.cjs','summarize-cpu.cjs','correct-winding-check.cjs','adjust-probe.cjs','diagnose-winding.cjs','checker-before-probe-adjustment.cjs.saved','archive-root-only.cjs','author-palm-prototype.cjs','guard-palm-prototype.cjs','check-palm-prototype.cjs','palm-prototype-scope.json','diagnose-palm-boundary.cjs','palm-boundary-diagnosis.json','diagnose-caps.cjs','cap-diagnosis.json','write-root-visual-review.cjs','write-independent-visual-review.cjs','author-palm-checker.cjs','palm-check-functions.txt','palm-check-mutations.txt','run-baseline-crease-comparison.cjs','prepare-baseline-retry.cjs','prepare-baseline-noopt.cjs','inspect-raw-failures.cjs','summarize-palm-cpu.cjs','audit-cpu-delivery.cjs','delivery-cpu-schema-review.json','archive-recovery-fold.cjs','refresh-fold-delivery.cjs','preserve-palm-fold-normals.cjs','diagnose-recovery-fold.cjs','delivery-raw-archives.txt','delivery-recovery-native.txt','verify-recovery-native-package.cjs','package-recovery-native.cjs','prepare-native-fold-diagnostic.cjs','archive-interrupted-raw-fold.cjs','archive-interrupted-streaming.cjs','refresh-final-history.cjs','refresh-history-index.cjs','history-index-refresh.json','upgrade-fold-selftest.cjs','inspect-final-fold-cpu.cjs');
  for(const name of required)include(local(name));
  for(const name of ['early-check','early-diagnostic','early-corrected'])for(const file of walk(local(name)))include(file);
  const retained=[];for(const entry of fs.readdirSync(work,{withFileTypes:true})){if(entry.isFile()&&(/^(?:cpu|winding-diagnosis|check-nose-contour|fixture-audit)[\w.-]*\.(?:json|log|cjs|saved)$/.test(entry.name)||/^selftest-[\w-]+\.bin$/.test(entry.name)||/^native-[\w-]+-(?:detached\.log|launcher\.json)$/.test(entry.name)||/^(?:recover-native-launch|archive-aborted-native)\.cjs$/.test(entry.name))&&!required.includes(entry.name)){include(local(entry.name));retained.push(entry.name);}if(entry.isDirectory()&&/^(?:cpu[-_]|geometry-contract(?!$)|winding-diagnostics$|palm-prototype-diagnostics$|palm-early-|palm-query-diagnostic$|candidate-rejected-|candidate-history$)/.test(entry.name)){for(const file of walk(local(entry.name)))include(file);retained.push(entry.name+'/');}}
  for(const name of ['raw-dependency-diagnostics','raw-memory-diagnostics']){const dir=local(name);if(fs.existsSync(dir)){for(const file of walk(dir))if(!path.relative(dir,file).split(path.sep).includes('node_modules'))include(file);retained.push(name+'/');}}
  const rejectedDirectory=local('candidate-rejected-root-only'),rejection=json(path.join(rejectedDirectory,'rejection.json'));
  must(rejection.accepted===false&&rejection.candidateSHA256==='dc9deade4909e37e9aa4918309541168696e808b7eb066575fea3fa91d574c7e'&&rejection.sharedWrites===0&&rejection.artifacts.length===111,'Rejected candidate archive incomplete');
  const rejectedFiles=walk(rejectedDirectory).map(file=>path.relative(rejectedDirectory,file).split(path.sep).join('/')).filter(file=>file!=='rejection.json').sort();
  same(rejectedFiles,rejection.artifacts.map(item=>item.path).sort(),'Rejected candidate archive inventory changed');
  for(const item of rejection.artifacts){const file=path.resolve(rejectedDirectory,item.path);must(file.startsWith(path.resolve(rejectedDirectory)+path.sep),'Rejected archive path escapes scope');guardFile(file,item.sha256);must(read(file).length===item.bytes,'Rejected archive size mismatch');}
  guardFile(path.join(rejectedDirectory,'candidate.js'),rejection.candidateSHA256);
  const recoveryArchive=local('candidate-rejected-recovery-fold'),recoveryRejection=json(path.join(recoveryArchive,'rejection.json'));
  must(recoveryRejection.accepted===false&&recoveryRejection.candidateSHA256==='38660be59270be0b42e34649f7c7ef62f91a804671d3469631b48b5292a35be4'&&recoveryRejection.sharedWrites===0&&recoveryRejection.originalsPreserved===true&&recoveryRejection.artifacts.length===253,'Recovery candidate rejection archive incomplete');
  same(walk(recoveryArchive).map(file=>path.relative(recoveryArchive,file).split(path.sep).join('/')).filter(file=>file!=='rejection.json').sort(),recoveryRejection.artifacts.map(item=>item.path).sort(),'Recovery rejected archive inventory changed');
  for(const item of recoveryRejection.artifacts){const file=path.resolve(recoveryArchive,item.path);must(file.startsWith(path.resolve(recoveryArchive)+path.sep),'Recovery archive path escapes scope');guardFile(file,item.sha256);must(read(file).length===item.bytes,'Recovery archive size mismatch');}
  const reference=recoveryRejection.previousArchiveReference;must(reference.path==='../candidate-rejected-root-only'&&reference.candidateSHA256===rejection.candidateSHA256,'Recovery archive predecessor mismatch');
  same(reference.files.map(item=>item.path).sort(),walk(rejectedDirectory).map(file=>path.relative(rejectedDirectory,file).split(path.sep).join('/')).sort(),'Recovery archive predecessor inventory drift');
  for(const item of reference.files){const file=path.resolve(rejectedDirectory,item.path);must(file.startsWith(path.resolve(rejectedDirectory)+path.sep),'Previous archive reference escapes scope');guardFile(file,item.sha256);must(read(file).length===item.bytes,'Referenced previous archive size mismatch');}
  guardFile(path.join(recoveryArchive,'candidate.js'),recoveryRejection.candidateSHA256);
  const unsuccessfulNative=[];
  for(const entry of fs.readdirSync(work,{withFileTypes:true})){if(entry.isDirectory()&&entry.name.startsWith('native-')&&!views.some(id=>entry.name===nativeDirectory(id))){if(entry.name==='native-adult-wide'){const archived=local('candidate-rejected-root-only/native-adult-wide'),original=local(entry.name);const originalFiles=walk(original),archivedFiles=walk(archived);same(originalFiles.map(file=>path.relative(original,file)),archivedFiles.map(file=>path.relative(archived,file)),'Superseded adult evidence inventory drift');for(const file of originalFiles)guardFile(path.join(archived,path.relative(original,file)),hash(read(file)));must(json(path.join(archived,'summary.json')).finalSHA==='dc9deade4909e37e9aa4918309541168696e808b7eb066575fea3fa91d574c7e','Superseded adult source drift');continue;}if(['native-adult-palm-prototype','native-child-narrow','native-infant-narrow-contrast'].includes(entry.name)){const archived=local('candidate-rejected-recovery-fold/'+entry.name),original=local(entry.name),files=walk(original);same(files.map(file=>path.relative(original,file)),walk(archived).map(file=>path.relative(archived,file)),'Superseded recovery native inventory drift');for(const file of files)guardFile(path.join(archived,path.relative(original,file)),hash(read(file)));must(json(path.join(archived,'summary.json')).finalSHA==='38660be59270be0b42e34649f7c7ef62f91a804671d3469631b48b5292a35be4','Superseded recovery native source drift');continue;}const failureFile=local(entry.name+'/failure.json');must(fs.existsSync(failureFile),'Unclassified native attempt '+entry.name);const failure=json(failureFile);must(typeof failure.error==='string'&&failure.error.length>0,'Missing unsuccessful-run diagnosis');for(const file of walk(local(entry.name)))include(file);retained.push(entry.name+'/');unsuccessfulNative.push({directory:entry.name,kind:failure.kind||'failed',error:failure.error});}}
  const historyChecks=verifyHistory(preservation,integration,source.toString(),previous.toString(),false),shared=sharedSnapshot(history,integration,false);must(!fs.existsSync(reportPath),'Report target already exists; inspect before delivery');
  const rows=native.map(({id,summary:s})=>`| ${id} | ${s.pixelComparisons[0].changedPixels} / ${s.pixelComparisons[0].totalPixels} | ${Math.round(s.stats.duration/1000)} s |`).join('\n');
  const images=views.map(id=>`### ${id}\n\n| Before | After |\n| --- | --- |\n| ![Before ${id}](evidence/${nativeDirectory(id)}/${id}-baseline-wrist.png) | ![After ${id}](evidence/${nativeDirectory(id)}/${id}-candidate-wrist.png) |\n\n[Full stage before](evidence/${nativeDirectory(id)}/${id}-baseline-stage.png) · [Full stage after](evidence/${nativeDirectory(id)}/${id}-candidate-stage.png)`).join('\n\n');
  const readme=`# First Response Lab: patient wrist shading

The patient wrists have smoother shading where they meet the forearms and a more rounded transition into the sculpted palms. Surface normals follow the adjoining surfaces near each join and blend back into the existing wrist shading.

Only the two patient wrist normal buffers change. All vertex positions, silhouettes, geometry counts, materials, cameras, poses, supporting-hand contact, metadata and lesson state are preserved.

## Validation

- ${cpu.results.length} CPU geometry cases passed (${cpu.assertions.toLocaleString('en-US')} assertions). The validator checks the current wrist normals and exact preservation of positions and unrelated scene data. Deliberate defects were rejected, then saved source bytes were restored and reread.
- The two unchanged raw fixtures ran all 56 tests: **53 passed and 3 failed**. All 33 patient-wrist compatibility cases passed; the current hand-surface fixture had 20 passes and three palm-crease mirroring failures. The final candidate results were compared with the preserved, hash-verified baseline run of those three tests. Test names, assertions and numeric values match exactly. That baseline run deliberately skipped the other 20 hand tests; it was reused rather than executed again. No fixture assertion or tolerance was changed. The source-pin and changed-failure selftests rejected deliberate defects, then restored and reread saved bytes.
- Three native Supporting hand close-up comparisons passed: adult wide, child narrow, and infant narrow high contrast. Every accepted run used one worker and zero retries. Cameras, framing, contact, lesson state, draw counts and allocated resources match within each pair. A real child-view resize verifies the camera and resource behavior. Each wrist crop comes from its full-stage capture.
- Root and independent visual reviews accepted the same 12 image hashes.
- A separate adult recovery-pose-8 comparison passed the same scene, camera, contact, normal-buffer and resource checks. Root and independent visual reviews accepted its four image hashes, retained separately below. The diagnostic fixture changes only the adult pose from 5 to 8; the exact derivation and deliberate-rejection checks are saved with it.
- Nineteen exact history reversals passed. All 39 raw fixtures and 8 existing checkers are preserved. The Git index is guarded against the fresh delivery snapshot. The raw tests were **not run as a whole suite**.

| View | Changed stage pixels | Browser duration |
| --- | ---: | ---: |
${rows}

## Visual review

${visual.observations.map(line=>'- '+line).join('\n')}

## Before and after

${images}

### Adult recovery pose 8 — additional diagnostic

| Before | After |
| --- | --- |
| ![Recovery before](evidence/recovery-fold-native-diagnostic/native-adult-recovery-fold/adult-wide-baseline-wrist.png) | ![Recovery after](evidence/recovery-fold-native-diagnostic/native-adult-recovery-fold/adult-wide-candidate-wrist.png) |

[Full stage before](evidence/recovery-fold-native-diagnostic/native-adult-recovery-fold/adult-wide-baseline-stage.png) · [Full stage after](evidence/recovery-fold-native-diagnostic/native-adult-recovery-fold/adult-wide-candidate-stage.png)

${recovery.observations.map(line=>'- '+line).join('\n')}

${recovery.limitations}

## Scope and limits

These checks load the raw module through the existing browser harness. The full application loader, full-app build and deployment were not tested. The change remains uncommitted; this delivery performs no staging, commit, push or deployment.

The raw test run remains red because of the three pre-existing palm-crease mirroring failures. Their measured distances are approximately 0.0000114755 against the unchanged 0.00001 tolerance. This shading change leaves those crease positions exact; it does not resolve that separate issue. The gate requires the actual baseline and candidate result files to agree on each failure:

| Test age | Baseline and candidate measured distance | Existing tolerance |
| --- | ---: | ---: |
${rawBaseline.comparisons.map(row=>'| '+row.test.split(' for ').pop()+' | '+row.actual+' | '+row.expected+' |').join('\n')}

Source: \`${beforeSHA}\` → \`${sourceSHA}\`.

## Retained attempts and diagnostics

The shared STEM host changed after the first accepted captures. All four comparisons were rerun against the updated host using unchanged fixtures. Their 16 PNG files exactly match the reviewed images. Previous captures, input manifests and repeat-run logs are preserved under candidate-rejected-host-refresh. The first repeat attempt also discovered an archived fixture; its two browser workflows passed, but the runner rejected the unexpected count. The archive was moved under the existing test exclusion before the successful repeats. These earlier runs are excluded from the final comparison counts.

${unsuccessfulNative.length?unsuccessfulNative.map(run=>'- ['+run.directory+'](evidence/'+run.directory+'/failure.json): '+run.error).join('\n'):'No unsuccessful native attempts were recorded.'}

The first candidate adjusted only the forearm join. Its adult comparison showed a small improvement, so it was set aside for a more useful palm-junction refinement. Its source, successful checks and adult images are retained under candidate-rejected-root-only. The accepted adult evidence is stored under native-adult-fold-final; the gate verifies that the superseded native views remain identical to their respective archived copies.

The next candidate improved the palm join in all three native views, but its complete CPU pass found that one already reversed triangle became worse in the adult recovery wrist fold. That candidate and its 253 evidence files are retained under candidate-rejected-recovery-fold. The final refinement preserves the existing shading normals at vertices adjoining a reversed fold face. A fifth deliberate defect removes that protection in recovery pose 8 and must fail. All final native and raw evidence was rerun for the corrected source.

The initial CPU check found inward-facing shading at an existing folded wrist crease in recovery pose 8. The same issue is present in the baseline. The final check prevents newly reversed shading, requires existing reversed faces to retain or improve their normal agreement, and preserves every unchanged face exactly. The failed check and diagnosis are retained under winding-diagnostics and winding-diagnosis.json.

An intermediate check of the rejected root-only candidate ran out of disk space while saving its deliberate-failure evidence. A later rerun completed, and both attempts remain with that candidate's diagnostics. The accepted wrist-and-palm CPU evidence is under geometry-contract-palm-fold. The disk-recovery manifest records older private duplicates removed only after their completed report copies were verified as identical.

The initial filtered baseline test comparison did not complete. A JIT-disabled retry failed before tests because Vite requires WebAssembly. Those unsuccessful attempts and their launch settings are retained under raw-memory-diagnostics. Only the preserved completed baseline run supplies the baseline failure evidence. Two final-candidate raw attempts were interrupted by app refreshes before a result was saved. Their prepared inputs, original runners and available launch/log evidence remain under raw-memory-diagnostics/fold-interrupted-no-result and raw-memory-diagnostics/fold-interrupted-streaming; neither supplies a test outcome. The completed final candidate run is under raw-wrist-fold-tests.

CPU and browser evidence, the source delta, compatibility checks and visual reviews are saved under [evidence](evidence). ${retained.length?'Supporting audit files and directories: '+retained.join(', ')+'.':'No additional supporting audit files were found to archive.'}

[Post-write verification](post-write.json) records the installed bytes, syntax, history reversals and preserved inputs.
`;
  packageFiles.set('README.md',Buffer.from(readme));

  const packageHashes=Object.fromEntries([...packageFiles].map(([name,b])=>[name,hash(b)]));
  const snapshot={sourceSHA256:sourceSHA,beforeSHA256:beforeSHA,inputs,shared,packageHashes,reportRelative};
  return {snapshot,source,previous,sourceSHA,integration,preservation,history,historyChecks,packageFiles,imageHashes,cpu,native,raw,rawBaseline,recovery,interruptedRaw};
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
  const post={passed:true,sourceSHA256:data.sourceSHA,beforeSHA256:beforeSHA,allFourCopiesIdentical:true,syntaxPassed:true,historyChecks,rawFixtureFilesPreserved:39,rawFixtureFilesStrengthened:0,focusedRawTestsPassed:data.raw.numPassedTests,focusedRawTestsFailed:data.raw.numFailedTests,rawFailuresMatchedBaseline:true,baselineEvidenceReused:true,recoveryDiagnostic:data.recovery,interruptedRawAttempts:data.interruptedRaw,rawFailureComparisons:data.rawBaseline.comparisons,rawBaselineSelftest:data.rawBaseline.selftest,rawFixtureSelftest:data.raw.selftest,existingCheckerFilesPreserved:8,indexUnchanged:true,indexPreservationScope:'Fresh private history snapshot through completion.',sharedHashes:protectedShared,activeHandoffSHA256,reportHashes:data.snapshot.packageHashes,gateSelftest:json(local('finish-selftest.json')),limitations:'Raw-module verification only. Full application loader/build/deployment not tested. Both selected raw fixtures remain unchanged. The full two-file raw run remains red: 53 passed and three palm-crease mirroring failures exactly match the preserved, hash-verified three-test baseline run. Current wrist normals are checked by the CPU and native browser validators.'};
  guardedWrite(path.join(reportPath,'post-write.json'),JSON.stringify(post,null,2)+'\n',null);
  const currentHandoff=read(handoffPath),activeHeader=`## ACTIVE ${token}`;must(currentHandoff.toString().split(activeHeader).length===2,'Active handoff entry missing or duplicated');
  const complete=currentHandoff.toString().replace(activeHeader,`## COMPLETE ${token}`)+eol+`Completed ${token}: scope released. All four runtime copies match ${data.sourceSHA}; syntax, 19 compatibility reversals, 39 unchanged raw test files, 8 unchanged checkers verified. Current Git index preserved from the fresh private history snapshot through completion. Raw test run: 53 passes and three palm-crease mirroring failures exactly match the preserved, hash-verified baseline results; fixtures and tolerances unchanged. Evidence: ${reportRelative}/README.md. No commit or deployment.`+eol;
  guardedWrite(handoffPath,complete,hash(currentHandoff));guardFile(data.history.indexPath,data.history.indexSHA256);
  const result={completed:true,sourceSHA256:data.sourceSHA,report:reportPath,indexUnchanged:true,committed:false,deployed:false};fs.writeFileSync(local('finish-integration.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){fs.writeFileSync(local('finish-failure.json'),JSON.stringify({error:error.stack,sourceSHA256:data.sourceSHA,activeHandoff:token,sharedWritesMayHaveOccurred:true},null,2)+'\n');throw error;}

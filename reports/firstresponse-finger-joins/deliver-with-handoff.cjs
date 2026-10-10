'use strict';
// This gate writes shared files only with --apply, after a matching private preflight.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', work = __dirname;
const beforeSHA = 'dfe3e01f38a419187e468c749cc37827f486a47401b9916afaa9ec6f98a3f86a';
const finalSHA = '77394bfee2544c33c3274293a13e9666912c26f657117ac98d15416f220f060e';
const reportName = 'reports/firstresponse-finger-joins', reportPath = path.join(root, reportName);
const p = name => path.join(work, name), r = name => path.join(root, name);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const hash = file => sha(fs.readFileSync(file));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const save = (file, value) => { const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(file, bytes); assert.deepEqual(fs.readFileSync(file), bytes, 'written evidence reread ' + file); };
const equal = (a, b, message) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw Error(message); };
const pin = (file, expected) => assert.equal(hash(file), expected, 'Exact file bytes: ' + file);
const inside = (base, name) => { const file = path.resolve(base, name), relative = path.relative(path.resolve(base), file); assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Safe scoped path ' + name); return file; };
const inventory = (dir, filter) => Object.fromEntries(fs.readdirSync(dir).filter(filter).sort().map(name => [name, hash(path.join(dir, name))]));
const snapshot = json(p('history-input-snapshot.json')), history = json(p('history-integration.json')), preservation = json(p('history-preservation.json'));
const sourceFiles = Object.keys(snapshot.sourceHashes), written = new Map();
assert.equal(sourceFiles.length, 4); assert.equal(Object.keys(snapshot.fixtureHashes).length, 39); assert.equal(Object.keys(snapshot.checkerHashes).length, 8);
equal(sourceFiles, ['stem_lab/stem_tool_firstresponse.js', 'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js', 'desktop/app-build/stem_lab/stem_tool_firstresponse.js', 'desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'], 'Exact runtime scope');
assert.equal(history.sourceSHA256, finalSHA); assert.equal(history.beforeSHA256, beforeSHA);
equal(history.edits.map(edit => edit.file), ['tests/helpers/firstresponse_palm_symmetry_delta.cjs'], 'Exact helper edit');
equal(history.additions.map(edit => edit.file), ['tests/helpers/firstresponse_finger_joins_delta.cjs', 'tests/helpers/firstresponse_finger_joins_delta.json'], 'Exact helper additions');
for (const edit of history.edits) { assert.equal(sha(edit.before), edit.beforeSHA256); assert.equal(sha(edit.after), edit.afterSHA256); }
for (const edit of history.additions) { assert.equal(sha(edit.content), edit.afterSHA256); assert.equal(edit.beforeSHA256, null); }
function sharedGuard() {
  for (const file of sourceFiles) pin(r(file), written.get(file) || beforeSHA);
  equal(inventory(r('tests'), name => /^firstresponse.*\.test\.js$/.test(name)), snapshot.fixtureHashes, 'Raw fixture inventory or bytes changed');
  equal(inventory(r('dev-tools'), name => /^firstresponse.*\.cjs$/.test(name)), snapshot.checkerHashes, 'Checker inventory or bytes changed');
  const helpers = { ...snapshot.helperHashes };
  for (const [file, SHA256] of written) if (file.startsWith('tests/helpers/')) helpers[path.basename(file)] = SHA256;
  const expected = Object.fromEntries(Object.entries(helpers).sort(([a], [b]) => a.localeCompare(b)));
  const actual = inventory(r('tests/helpers'), name => name.startsWith('firstresponse_') && /_delta\.(cjs|json)$/.test(name));
  assert.deepEqual(actual, expected, 'Historical helper inventory and bytes');
  for (const addition of history.additions) if (!written.has(addition.file)) assert.ok(!fs.existsSync(r(addition.file)), 'New helper destination absent');
}
function handoffSnapshot(bytes) { return { SHA256:sha(bytes),length:bytes.length,base64:bytes.toString('base64') }; }
function handoffPrefix(snapshot,current) {
  assert.ok(snapshot && Number.isSafeInteger(snapshot.length) && snapshot.length>=0 && typeof snapshot.base64==='string','Valid handoff snapshot');
  const original=Buffer.from(snapshot.base64,'base64');
  assert.equal(original.toString('base64'),snapshot.base64,'Canonical handoff snapshot encoding');
  assert.equal(original.length,snapshot.length,'Exact handoff snapshot length');
  assert.equal(sha(original),snapshot.SHA256,'Exact handoff snapshot digest');
  assert.ok(current.length>=original.length,'Handoff cannot be truncated');
  assert.deepEqual(current.subarray(0,original.length),original,'Exact handoff prefix preserved');
}
function indexState() {
  let gitDir = r('.git');
  if (!fs.statSync(gitDir).isDirectory()) gitDir = path.resolve(root, fs.readFileSync(gitDir, 'utf8').trim().replace(/^gitdir:\s*/, ''));
  const file = path.join(gitDir, 'index'); return { path: file, SHA256: fs.existsSync(file) ? hash(file) : null };
}
function sourceCheck(file = p('candidate.js')) {
  pin(file, finalSHA); pin(p('before.js'), beforeSHA);
  const delta = json(p('delta.json')); assert.equal(delta.beforeSHA256, beforeSHA); assert.equal(delta.afterSHA256, finalSHA); assert.equal(delta.edits.length, 3);
  let text = fs.readFileSync(p('before.js'), 'utf8');
  for (const edit of delta.edits) { assert.equal(text.split(edit.old).length, 2, 'Unique source edit'); text = text.replace(edit.old, edit.new); }
  assert.equal(text, fs.readFileSync(file, 'utf8'), 'All source bytes accounted for'); new Function(text);
}
function pinsMatch(pins) { for (const [file, SHA256] of Object.entries(pins)) pin(path.isAbsolute(file) ? file : p(file), SHA256); }
function historyCheck(dir) {
  assert.equal(preservation.sourceSHA256, finalSHA); assert.equal(preservation.beforeSHA256, beforeSHA);
  assert.equal(preservation.historicalChain.length, 21); assert.equal(preservation.historicalAssertionsChanged, false);
  assert.ok(preservation.selftest.ran && preservation.selftest.restoredAndReread && preservation.selftest.damagedDeltaRejected);
  const expected = { ...snapshot.helperHashes };
  for (const edit of [...history.edits, ...history.additions]) expected[path.basename(edit.file)] = edit.afterSHA256;
  assert.deepEqual(inventory(dir, name => /_delta\.(cjs|json)$/.test(name)), expected, 'Exact private compatibility helpers');
  const candidate = fs.readFileSync(p('candidate.js'), 'utf8'), before = fs.readFileSync(p('before.js'), 'utf8');
  for (const item of preservation.historicalChain) {
    assert.ok(item.candidatePassed && item.baselinePassed && item.unknownSourceRejected);
    const api = require(inside(dir, item.file)); assert.equal(typeof api[item.method], 'function');
    assert.equal(sha(api[item.method](candidate)), item.SHA256, 'Exact candidate historical reversal');
    assert.equal(sha(api[item.method](before)), item.SHA256, 'Exact baseline historical reversal');
    assert.throws(() => api[item.method](candidate + '\n'), 'Unknown source rejected');
  }
}
function rawCheck() {
  const folder = p('raw-finger-tests'), summary = json(path.join(folder, 'summary.json')), result = json(path.join(folder, 'candidate-results.json')), exit = json(path.join(folder, 'exit.json'));
  assert.equal(summary.sourceSHA256, finalSHA); assert.equal(summary.passed, true); assert.ok(summary.inputsUnchanged && summary.selftest.inputMutationRejected && summary.selftest.restoredAndReread);
  for (const value of [summary, result]) { assert.equal(value.numPassedTests, 65); assert.equal(value.numFailedTests, 0); assert.equal(value.numTotalTests, 65); assert.equal(value.numPendingTests, 0); }
  assert.equal(result.success, true); assert.equal(summary.exitCode, 0); assert.equal(exit.exitCode, 0); assert.equal(exit.signal, null); assert.equal(exit.timedOut, false); assert.equal(exit.spawnError, null);
  pin(path.join(folder, 'candidate.log'), exit.logSHA256); pin(p('run-raw.cjs'), summary.runnerSHA256); pin(path.join(folder, 'vitest.config.cjs'), summary.configSHA256);
  pin(path.join(folder, 'stem_lab/stem_tool_firstresponse.js'), finalSHA); pin(path.join(folder, 'vendor/three-r128/three.min.js'), summary.vendorSHA256); pin(r('vendor/three-r128/three.min.js'), summary.vendorSHA256);
  const assertions = result.testResults.flatMap(test => test.assertionResults); assert.equal(assertions.length, 65); assert.equal(new Set(assertions.map(test => test.fullName)).size, 65);
  for (const test of assertions) { assert.equal(test.status, 'passed'); assert.equal(test.failureMessages.length, 0); }
  equal(result.testResults.map(test => path.basename(test.name)).sort(), ['firstresponse_finger_folds.test.js', 'firstresponse_hand_surface.test.js', 'firstresponse_patient_wrists.test.js'], 'Exact raw fixture selection');
  for (const [file, SHA256] of Object.entries(summary.testHashes)) { pin(r(file), SHA256); pin(inside(folder, file), SHA256); }
  for (const [file, SHA256] of Object.entries(summary.helperHashes)) pin(inside(path.join(folder, 'tests/helpers'), file), SHA256);
  historyCheck(path.join(folder, 'tests/helpers'));
  return { passed: 65, failed: 0, total: 65 };
}
function cpuCheck() {
  const cpu = json(p('geometry-result.json')); assert.equal(cpu.passed,true); assert.equal(cpu.beforeSHA256,beforeSHA); assert.equal(cpu.candidateSHA256,finalSHA);
  pin(p('verify-finger-joins.cjs'),cpu.checkerSHA256); pinsMatch(cpu.inputs); assert.equal(cpu.cases,24); assert.equal(cpu.results.length,24); assert.ok(cpu.assertions>0);
  const exit=json(p('geometry-exit.json')); assert.equal(exit.exitCode,0); assert.equal(exit.signal,null); assert.equal(exit.timedOut,false); assert.equal(exit.spawnError,null); assert.equal(exit.checkerSHA256,cpu.checkerSHA256); assert.equal(exit.sourceSHA256,finalSHA); pin(p('geometry.log'),exit.logSHA256);
  const expected=[]; for(const age of ['adult','child','infant']) for(const phase of [0,2,5,8]) for(const contrast of [false,true]) expected.push([age,phase,contrast]);
  equal(cpu.results.map(v=>[v.age,v.phase,v.contrast]),expected,'Complete geometry age/pose/contrast matrix');
  const names=[]; for(const side of ['left','right']) for(let f=0;f<4;f++) names.push('fr-patient-'+side+'-finger-'+f+'-surface');
  for(const value of cpu.results) {
    assert.equal(value.status,'passed'); assert.equal(value.resources.disposed,true);
    equal(value.sceneParity.allowedChanges,names.map(n=>n+'.normal'),'Only eight patient finger normal buffers');
    equal(value.fingers.map(f=>f.name),names,'All eight finger measurements');
    for(const f of value.fingers) {
      assert.equal(f.newReversedFaces,0); assert.ok(f.protectedVerticesUnchanged&&f.capCentersUnchanged&&f.distalNormalsUnchanged);
      assert.ok(Number.isInteger(f.changedVertices)&&f.changedVertices>0,'Finger join shading actually changes');
      assert.ok(Number.isInteger(f.probe.count)&&f.probe.count>=5,'Independent palm intersection samples');
      assert.ok(f.maximumChangedT<.36&&f.minimumCandidateFaceAgreement>0,'Proximal, outward shading');
      for(const key of ['baselineMeanDegrees','candidateMeanDegrees']) assert.ok(Number.isFinite(f.probe[key])&&f.probe[key]>=0&&f.probe[key]<=180);
      assert.ok(f.probe.candidateMeanDegrees<f.probe.baselineMeanDegrees*.80&&f.probe.baselineMeanDegrees-f.probe.candidateMeanDegrees>=5,'Measured join normal mismatch improves by at least twenty percent and five degrees');
    }
  }
  assert.equal(cpu.selftestRequested,true); assert.equal(cpu.negative.length,2); for(const negative of cpu.negative){assert.ok(negative.rejected&&negative.restoredAndReread);assert.equal(negative.restoredSHA256,finalSHA);}
  const negative=cpu.negative.find(n=>n.type==='omit-finger-fit'); assert.ok(negative&&negative.rejected&&negative.restoredAndReread); assert.equal(negative.restoredSHA256,finalSHA);
  return {cases:24,assertions:cpu.assertions};
}
const views = [['native-adult', 'adult-wide'], ['native-child', 'child-narrow'], ['native-infant', 'infant-narrow-contrast']];
function rasterCheck(dir, id, baseline, candidate, expected, candidateStageFile=path.join(dir,id+'-candidate-stage.png')) {
  const {PNG}=require(r('node_modules/playwright-core/lib/utilsBundle.js'));
  const a=PNG.sync.read(fs.readFileSync(path.join(dir,id+'-baseline-stage.png'))),b=PNG.sync.read(fs.readFileSync(candidateStageFile));
  assert.equal(a.width,b.width);assert.equal(a.height,b.height);
  const stage=baseline.captureInfo.stageClip,canvas=baseline.captureInfo.observedCanvas;
  const targetClips=['left','right'].map(side=>{
    const projection=baseline.fingerScopeProjections[side];
    const x0=Math.max(0,Math.min(a.width,Math.floor(canvas.x+(projection.min[0]+1)*canvas.width/2)-18-stage.x));
    const x1=Math.max(0,Math.min(a.width,Math.ceil(canvas.x+(projection.max[0]+1)*canvas.width/2)+18-stage.x));
    const y0=Math.max(0,Math.min(a.height,Math.floor(canvas.y+(1-projection.max[1])*canvas.height/2)-18-stage.y));
    const y1=Math.max(0,Math.min(a.height,Math.ceil(canvas.y+(1-projection.min[1])*canvas.height/2)+18-stage.y));
    return {side,x:x0,y:y0,width:Math.max(0,x1-x0),height:Math.max(0,y1-y0)};
  });
  equal(candidate.fingerScopeProjections,baseline.fingerScopeProjections,'Exact unchanged target projections');
  equal(expected.targetClips,targetClips,'Measured per-hand raster target rectangles');
  let changedPixels=0,outsideTargetChangedPixels=0;
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
    const i=(y*a.width+x)*4;if(a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))continue;changedPixels++;
    if(!targetClips.some(c=>x>=c.x&&x<c.x+c.width&&y>=c.y&&y<c.y+c.height))outsideTargetChangedPixels++;
  }
  assert.ok(changedPixels>0,'Visible finger shading improvement');assert.equal(changedPixels,expected.changedPixels);assert.equal(outsideTargetChangedPixels,0,'Pixels outside patient finger targets remain exact');assert.equal(expected.outsideTargetChangedPixels,0);
  return {changedPixels,outsideTargetChangedPixels,targetClips};
}
function nativeCheck() {
  const audit = json(p('fixture-audit.json')); assert.equal(audit.accepted, true); assert.equal(audit.candidateSHA256, finalSHA); assert.equal(audit.baselineSHA256, beforeSHA); pin(p('audit-preview-fixture.cjs'), audit.auditorSHA256); pinsMatch(audit.inputs);
  assert.ok(audit.inputsUnchanged && audit.sharedFilesWritten === 0); assert.equal(audit.negativeTests.length,30); for (const test of audit.negativeTests) assert.ok(test.rejected && test.restoredAndReread);
  assert.equal(audit.list.exitCode, 0); assert.match(audit.list.stdout, /Total: 3 tests in 1 file/);
  const contract = require(p('patient-wrist-contract.cjs')), { cropPng } = require(p('face-capture-png.cjs')), images = [], pixels = [];
  for (const [folder, id] of views) {
    const dir = p(folder), summary = json(path.join(dir, 'summary.json')), input = json(path.join(dir, 'inputs.json')), result = json(path.join(dir, 'browser-run.json')), metrics = json(path.join(dir, 'face-preview-metrics.json')), evidenceFile = json(path.join(dir, id + '-evidence.json'));
    assert.ok(!fs.existsSync(path.join(dir, 'failure.json')), 'Final native run has no failure');
    for (const value of [summary, input, evidenceFile]) { assert.equal(value.baselineSHA, beforeSHA); assert.equal(value.finalSHA, finalSHA); }
    for (const value of [summary, input]) { assert.equal(value.workers, 1); assert.equal(value.retries, 0); equal(value.selectedViews, [id], 'One selected native view'); }
    assert.equal(summary.workflows, 1); assert.equal(summary.evidenceCount, 2); assert.ok(summary.inputsUnchanged && summary.privateCandidate); pinsMatch(input.inputs);
    for (const stats of [summary.stats, result.stats]) { assert.equal(stats.expected, 1); for (const field of ['unexpected', 'skipped', 'flaky']) assert.equal(stats[field], 0); }
    const pair = metrics.evidence; assert.equal(pair.length, 2); equal(pair, evidenceFile.evidence, 'Native metrics match actual workflow evidence');
    const baseline = pair.find(value => value.variant === 'baseline'), candidate = pair.find(value => value.variant === 'candidate'); assert.ok(baseline && candidate);
    for (const value of pair) {
      assert.equal(value.id, id); assert.equal(value.sourceSHA, value.variant === 'baseline' ? beforeSHA : finalSHA); contract.validateMetadata(value); contract.validateCandidateFraming(value, id);
      assert.deepEqual(value.errors, []); assert.equal(value.draw.disposeCount, 0);
      if (id === 'child-narrow') contract.validateResize(value, value.resize);
      const stageName = id + '-' + value.variant + '-stage.png', fingerName = id + '-' + value.variant + '-fingers.png'; assert.equal(value.capture, stageName);
      const stage = fs.readFileSync(path.join(dir, stageName)), palm = fs.readFileSync(path.join(dir, fingerName)), proof = value.detail.proof;
      assert.ok(proof.sameCapturedFrame); assert.equal(sha(stage), proof.sourceSHA256); assert.equal(sha(palm), proof.cropSHA256);
      const stageClip = value.captureInfo.stageClip, clip = { x: value.detail.clip.x - stageClip.x, y: value.detail.clip.y - stageClip.y, width: value.detail.clip.width, height: value.detail.clip.height };
      const size = { width: stageClip.width, height: stageClip.height }; assert.deepEqual(proof.sourceSize, size, 'Captured stage dimensions'); assert.deepEqual(proof.clip, clip, 'Stage-relative crop coordinates');
      const cropped = cropPng(stage, clip, size); assert.deepEqual(cropped.buffer, palm, 'Palm detail pixels from same stage frame');
      images.push({ file: folder + '/' + stageName, SHA256: sha(stage) }, { file: folder + '/' + fingerName, SHA256: sha(palm) });
    }
    const comparison = contract.validateNativePair(baseline, candidate, id); assert.deepEqual(candidate.scopeComparison, comparison);
    if (id === 'child-narrow') contract.validateNativePair(baseline.resize.wide, candidate.resize.wide, 'adult-wide');
    assert.equal(evidenceFile.attempts.length, 2); for (const attempt of evidenceFile.attempts) { assert.equal(attempt.phase, 'complete'); assert.ok(attempt.materialDisposal.length > 0); for (const material of attempt.materialDisposal) assert.ok(material.disposeCount > 0); }
    equal(summary.images.slice().sort(), pair.flatMap(value => [id + '-' + value.variant + '-stage.png', id + '-' + value.variant + '-fingers.png']).sort(), 'Exactly four native images');
    assert.equal(summary.pixelComparisons.length,1); const pixel=summary.pixelComparisons[0]; assert.equal(pixel.id,id); assert.ok(pixel.changedPixels>0&&pixel.fingerChangedPixels>0); rasterCheck(dir,id,baseline,candidate,pixel); pixels.push(pixel);
  }
  return { images, pixels };
}
function reviewCheck(images, file = p('visual-review.json')) {
  const review = json(file); assert.equal(review.sourceSHA256, finalSHA); assert.equal(review.accepted, true, 'Visual review must be accepted'); assert.equal(review.images.length, 12);
  equal(review.images.map(value => value.file).sort(), images.map(value => value.file).sort(), 'Review covers each exact image once');
  for (const expected of images) { const image = review.images.find(value => value.file === expected.file); assert.equal(image.accepted, true); assert.equal(image.SHA256, expected.SHA256); pin(inside(work, image.file), image.SHA256); }
}
function collectEvidence() {
  const files = ['author-candidate.cjs', 'author-native.cjs', 'independent-finger-probe.cjs', 'independent-finger-probe-result.json', 'before.js', 'candidate.js', 'delta.json', 'deliver.cjs', 'deliver-with-handoff.cjs', 'prepare-handoff-fallback.cjs', 'run-finish-recovery.cjs', 'prepare-history.cjs', 'history-input-snapshot.json', 'history-integration.json', 'history-preservation.json', 'run-raw.cjs', 'run-geometry.cjs', 'reset-archived-geometry.cjs', 'verify-finger-joins.cjs', 'geometry-result.json', 'geometry.log', 'geometry-launch.json', 'geometry-exit.json', 'firstresponse_finger_joins_delta.cjs', 'firstresponse_finger_joins_delta.json', 'audit-preview-fixture.cjs', 'fixture-audit.json', 'firstresponse-face-preview.spec.ts', 'patient-wrist-contract.cjs', 'playwright-face.config.cjs', 'run-face-browser.cjs', 'face-capture-png.cjs', 'face-mount-window.cjs', 'visual-review.json'];
  function walk(name) { for (const item of fs.readdirSync(p(name), { withFileTypes: true })) { const relative = name + '/' + item.name; assert.ok(!item.isSymbolicLink(), 'Evidence cannot follow symlinks'); if (item.isDirectory()) walk(relative); else if (item.isFile()) files.push(relative); } }
  for (const [folder] of views) walk(folder);
  for (const file of ['candidate-results.json', 'candidate.log', 'summary.json', 'launch.json', 'exit.json', 'vitest.config.cjs', 'saved-candidate.js']) files.push('raw-finger-tests/' + file);
  for (const folder of ['raw-finger-tests/tests', 'raw-finger-tests/vendor', 'raw-finger-tests/stem_lab', 'history-helper-sandbox', 'fixture-selftest']) walk(folder);
  // Preserve unsuccessful native attempts as diagnostics, outside successful counts.
  for (const item of fs.readdirSync(work, { withFileTypes: true })) {
    if (item.isDirectory() && (/^candidate-rejected-/.test(item.name) || /^native-/.test(item.name) && !views.some(([folder]) => folder === item.name))) walk(item.name);
    if (item.isFile() && /^(?:diagnosis.*\.(?:json|cjs)|fix-native.*\.cjs)$/.test(item.name)) files.push(item.name);
  }
  if (fs.existsSync(p('write-visual-review.cjs'))) files.push('write-visual-review.cjs');
  return Object.fromEntries([...new Set(files)].sort().map(file => [file, hash(inside(work, file))]));
}
function selftest(images) {
  const checks = [];
  for (const kind of ['wrong-source', 'unaccepted-review']) {
    const original = fs.readFileSync(p(kind === 'wrong-source' ? 'candidate.js' : 'visual-review.json')), file = p('delivery-selftest-' + kind + (kind === 'wrong-source' ? '.js' : '.json'));
    fs.writeFileSync(file, original); assert.deepEqual(fs.readFileSync(file), original); let rejected = false;
    try {
      if (kind === 'wrong-source') fs.writeFileSync(file, Buffer.concat([original, Buffer.from('\n// deliberate private mutation\n')]));
      else { const value = JSON.parse(original); value.accepted = false; fs.writeFileSync(file, JSON.stringify(value)); }
      try { if (kind === 'wrong-source') sourceCheck(file); else reviewCheck(images, file); } catch { rejected = true; }
      assert.ok(rejected, 'Gate must reject ' + kind);
    } finally { fs.writeFileSync(file, original); assert.deepEqual(fs.readFileSync(file), original, 'Selftest restored and reread'); }
    if (kind === 'wrong-source') sourceCheck(file); else reviewCheck(images, file);
    checks.push({ kind, rejected, restoredAndReread: true, restoredSHA256: hash(file) });
  }
  const dir=p('native-adult'),id='adult-wide',pair=json(path.join(dir,id+'-evidence.json')).evidence;
  const baseline=pair.find(v=>v.variant==='baseline'),candidate=pair.find(v=>v.variant==='candidate');
  const pixel=json(path.join(dir,'summary.json')).pixelComparisons[0],file=p('delivery-selftest-outside-target.png');
  const original=fs.readFileSync(path.join(dir,id+'-candidate-stage.png')),{PNG}=require(r('node_modules/playwright-core/lib/utilsBundle.js'));
  const png=PNG.sync.read(original);let target=-1;
  for(let y=0;y<png.height&&target<0;y++)for(let x=0;x<png.width;x++)if(!pixel.targetClips.some(c=>x>=c.x&&x<c.x+c.width&&y>=c.y&&y<c.y+c.height)){target=(y*png.width+x)*4;break;}
  assert.ok(target>=0,'Actual rendered view has pixels outside authorized finger targets');let rejected=false;
  try{
    png.data[target]^=1;fs.writeFileSync(file,PNG.sync.write(png));
    try{rasterCheck(dir,id,baseline,candidate,{...pixel,changedPixels:pixel.changedPixels+1},file);}catch(error){rejected=/Pixels outside patient finger targets remain exact/.test(error.message);}
    assert.ok(rejected,'Delivery raster gate rejects changed pixel outside patient fingers');
  }finally{fs.writeFileSync(file,original);assert.deepEqual(fs.readFileSync(file),original,'Mutated private PNG restored and reread');}
  rasterCheck(dir,id,baseline,candidate,pixel,file);
  checks.push({kind:'outside-finger-target-pixel',rejected,restoredAndReread:true,restoredSHA256:hash(file)});
  const handoffFile=p('delivery-selftest-handoff-prefix.md'),originalHandoff=fs.readFileSync(r('AGENT_HANDOFF.md')),handoffPin=handoffSnapshot(originalHandoff);
  assert.ok(originalHandoff.length>0,'Handoff selftest has bytes to mutate');
  fs.writeFileSync(handoffFile,originalHandoff);assert.deepEqual(fs.readFileSync(handoffFile),originalHandoff);
  let prefixRejected=false,appendAccepted=false;
  try {
    const damaged=Buffer.from(originalHandoff);damaged[0]^=1;fs.writeFileSync(handoffFile,damaged);
    try { handoffPrefix(handoffPin,fs.readFileSync(handoffFile)); } catch(error) { prefixRejected=/Exact handoff prefix preserved/.test(error.message); }
    assert.ok(prefixRejected,'Changed handoff prefix must be rejected');
    fs.writeFileSync(handoffFile,originalHandoff);assert.deepEqual(fs.readFileSync(handoffFile),originalHandoff,'Handoff prefix restored and reread');
    fs.appendFileSync(handoffFile,'\nPrivate append-only selftest.\n');handoffPrefix(handoffPin,fs.readFileSync(handoffFile));appendAccepted=true;
  } finally { fs.writeFileSync(handoffFile,originalHandoff);assert.deepEqual(fs.readFileSync(handoffFile),originalHandoff,'Handoff selftest restored and reread'); }
  handoffPrefix(handoffPin,fs.readFileSync(handoffFile));
  checks.push({kind:'handoff-prefix-change',rejected:prefixRejected,appendAccepted,restoredAndReread:true,restoredSHA256:hash(handoffFile)});
  return { passed: true, sourceSHA256: finalSHA, checks };
}
function validate() {
  sharedGuard(); sourceCheck(); assert.ok(!fs.existsSync(reportPath), 'Report destination must be new');
  const index = indexState(), raw = rawCheck(), cpu = cpuCheck(); historyCheck(p('history-helper-sandbox')); const native = nativeCheck(); reviewCheck(native.images);
  const evidence = collectEvidence(); sharedGuard(); equal(indexState(), index, 'Git index changed while checking');
  const handoff=handoffSnapshot(fs.readFileSync(r('AGENT_HANDOFF.md')));
  return { sourceSHA256: finalSHA, baselineSHA256: beforeSHA, gateSHA256: hash(__filename), index, handoffSHA256: handoff.SHA256, handoffSnapshot:handoff, sourceHashes: snapshot.sourceHashes, fixtureHashes: snapshot.fixtureHashes, checkerHashes: snapshot.checkerHashes, helperHashes: snapshot.helperHashes, evidence, raw, cpu, native, historyReversals: 21, commit: false, deployment: false, fullApplicationBuild: false };
}
function readme(checked) {
  let text = '# First Response Lab: smoother finger joins\n\nThe patient fingers now blend their shading into the actual sculpted palm surface near the roots. The fit uses triangle normals, a surface-distance guard and a gentle fade before the first joint fold. Both hands keep their existing shapes, creases, nails, contact and poses. Thumb and rescuer shading remain unchanged.\n\n## Verification\n\n- All 65 focused raw-module tests passed, including finger folds, nail fit, hand surfaces and patient wrists.\n- All 24 geometry cases passed: adult, child and infant; recovery poses 0, 2, 5 and 8; normal and high contrast.\n- Three paired native browser views passed, including child-view resize and resource disposal. All rendered pixel changes stayed within the two regions projected from the eight patient finger meshes.\n- Twenty-one exact historical helper reversals passed. Existing fixtures and checkers are unchanged.\n- Deliberate source, geometry, browser-contract and visual-acceptance mutations were rejected, restored and reread.\n\nThe full application loader and build were not run. No staging, commit, push or deployment was performed. The shared Git index was preserved during installation.\n\n## Before and after\n';
  const fingers=json(p('geometry-result.json')).results[0].fingers;
  const improvements=fingers.map(f=>100*(1-f.probe.candidateMeanDegrees/f.probe.baselineMeanDegrees));
  text += '\nGeometry-selected samples reduce the average palm/finger shading angle by '+Math.min(...improvements).toFixed(1)+'–'+Math.max(...improvements).toFixed(1)+' percent per finger. These samples include vertices partly covered by the palm; the images show the subtle change at native viewing size.\n';
  for (const [folder, id] of views) text += '\n### ' + id + '\n\nBefore\n\n![Before finger joins](' + folder + '/' + id + '-baseline-fingers.png)\n\nAfter\n\n![After finger joins](' + folder + '/' + id + '-candidate-fingers.png)\n';
  text += '\n## Evidence\n\nSee [geometry results](geometry-result.json), [raw results](raw-finger-tests/candidate-results.json), [visual review](visual-review.json), [history preservation](history-preservation.json) and [installation checks](post-write.json). The manifest pins the copied evidence. Unsuccessful native attempts, if present, are preserved as diagnostics and excluded from the three successful views.\n\nBaseline: `' + beforeSHA + '`\n\nCandidate: `' + finalSHA + '`\n';
  return text;
}
function main() {
  const apply = process.argv.includes('--apply'), checkOnly = process.argv.includes('--check-only'); assert.ok(apply !== checkOnly, 'Choose exactly one of --check-only or --apply');
  const checked = validate();
  if (checkOnly) {
    assert.ok(process.argv.includes('--selftest'), 'Preflight requires --selftest'); const result = selftest(checked.native.images); save(p('delivery-selftest.json'), result); checked.selftestSHA256 = hash(p('delivery-selftest.json')); save(p('delivery-preflight.json'), checked);
    console.log(JSON.stringify({ checkOnly: true, sharedWrites: false, sourceSHA256: finalSHA, rawTests: 65, geometryCases: 24, nativeViews: 3, images: 12, historyReversals: 21 })); return;
  }
  const preflight = json(p('delivery-preflight.json')), test = json(p('delivery-selftest.json')); assert.equal(test.passed, true); assert.equal(test.sourceSHA256, finalSHA); assert.equal(test.checks.length, 4); assert.equal(test.checks.find(entry=>entry.kind==='handoff-prefix-change').appendAccepted,true); for (const entry of test.checks) assert.ok(entry.rejected && entry.restoredAndReread);
  checked.selftestSHA256 = hash(p('delivery-selftest.json'));
  assert.equal(preflight.handoffSHA256,preflight.handoffSnapshot.SHA256,'Preflight handoff digest matches snapshot');
  assert.equal(checked.handoffSHA256,checked.handoffSnapshot.SHA256,'Current handoff digest matches snapshot');
  handoffPrefix(preflight.handoffSnapshot,fs.readFileSync(r('AGENT_HANDOFF.md')));
  equal({...checked,handoffSHA256:preflight.handoffSHA256,handoffSnapshot:preflight.handoffSnapshot},preflight,'Fresh preflight no longer matches; rerun --check-only --selftest before any shared write');
  const saved = { files: {}, handoff: fs.readFileSync(r('AGENT_HANDOFF.md')) }, stamp = new Date().toISOString();
  for (const file of [...sourceFiles, ...history.edits.map(edit => edit.file)]) saved.files[file] = fs.readFileSync(r(file));
  function guard() { sharedGuard(); equal(indexState(), checked.index, 'Shared index changed; stopping before further writes'); handoffPrefix(preflight.handoffSnapshot,fs.readFileSync(r('AGENT_HANDOFF.md'))); }
  function writeShared(file, bytes, expected) { guard(); if (expected === null) assert.ok(!fs.existsSync(r(file)), 'New destination remains absent'); else pin(r(file), expected); fs.writeFileSync(r(file), bytes, expected === null ? { flag: 'wx' } : undefined); assert.deepEqual(fs.readFileSync(r(file)), Buffer.from(bytes), 'Shared bytes reread'); written.set(file, sha(bytes)); }
  function appendHandoff(text) { guard(); const current = fs.readFileSync(r('AGENT_HANDOFF.md')); handoffPrefix(preflight.handoffSnapshot,current); fs.appendFileSync(r('AGENT_HANDOFF.md'), text); const after = fs.readFileSync(r('AGENT_HANDOFF.md')); assert.deepEqual(after.subarray(0, current.length), current, 'Concurrent handoff content preserved'); assert.ok(after.subarray(current.length).includes(Buffer.from(text)), 'Handoff append reread'); }
  try {
    guard(); handoffPrefix(preflight.handoffSnapshot,fs.readFileSync(r('AGENT_HANDOFF.md')));
    appendHandoff('\n\n## ' + stamp + ' First Response finger joins — ACTIVE\nScope: four First Response runtime copies; palm symmetry history helper; two new finger join helpers; ' + reportName + '. No commit or deployment.\n');
    fs.mkdirSync(reportPath); const backups = path.join(reportPath, 'saved-before'); fs.mkdirSync(backups);
    for (const [file, bytes] of Object.entries(saved.files)) { const destination = inside(backups, file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes); assert.deepEqual(fs.readFileSync(destination), bytes); }
    fs.writeFileSync(path.join(backups, 'AGENT_HANDOFF.md'), saved.handoff); assert.deepEqual(fs.readFileSync(path.join(backups, 'AGENT_HANDOFF.md')), saved.handoff);
    const candidate = fs.readFileSync(p('candidate.js')); pin(p('candidate.js'), finalSHA);
    for (const file of sourceFiles) writeShared(file, candidate, beforeSHA);
    for (const edit of history.additions) writeShared(edit.file, edit.content, null);
    for (const edit of history.edits) writeShared(edit.file, edit.after, edit.beforeSHA256);
    guard(); for (const file of sourceFiles) new Function(fs.readFileSync(r(file), 'utf8')); for (const edit of [...history.edits, ...history.additions]) if (edit.file.endsWith('.cjs')) new Function(fs.readFileSync(r(edit.file), 'utf8'));
    historyCheck(r('tests/helpers'));
    for (const [file, SHA256] of Object.entries(checked.evidence)) { const source = inside(work, file), destination = inside(reportPath, file); pin(source, SHA256); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(source, destination); pin(destination, SHA256); }
    for (const file of ['delivery-preflight.json', 'delivery-selftest.json']) { fs.copyFileSync(p(file), path.join(reportPath, file)); pin(path.join(reportPath, file), hash(p(file))); }
    fs.writeFileSync(path.join(reportPath, 'README.md'), readme(checked));
    save(path.join(reportPath, 'manifest.json'), { sourceSHA256: finalSHA, files: checked.evidence, selftestSHA256: checked.selftestSHA256 });
    guard(); const post = { complete: true, sourceSHA256: finalSHA, runtimeHashes: Object.fromEntries(sourceFiles.map(file => [file, hash(r(file))])), historyReversals: 21, raw: checked.raw, cpu: checked.cpu, nativeViews: 3, images: 12, indexPreserved: true, index: checked.index, commit: false, deployment: false, fullApplicationBuild: false, sourceAndHelperSyntax: true, preservedFixtures: 39, preservedCheckers: 8 };
    save(path.join(reportPath, 'post-write.json'), post);
    appendHandoff('\n\n## ' + new Date().toISOString() + ' First Response finger joins — COMPLETE\nAll four runtime copies updated; patient finger-to-palm shading joins refined. 65 raw tests, 24 geometry cases, 3 native paired views and 21 historical reversals passed. Existing fixtures/checkers and shared index preserved. Report: ' + reportName + '/README.md. Full application build not run. Uncommitted and undeployed. Scope released.\n');
    guard(); save(p('finish-integration.json'), { ...post, reportPath, handoffComplete: true }); console.log(JSON.stringify({ complete: true, sourceSHA256: finalSHA, reportPath, commit: false, deployment: false }));
  } catch (error) { save(p('finish-failure.json'), { error: error.stack, written: Object.fromEntries(written), reportPath, automaticRollback: false, note: 'Inspect saved-before and current shared state; do not overwrite concurrent work.' }); throw error; }
}
try { main(); } catch (error) { console.error(error.stack); process.exitCode = 1; }

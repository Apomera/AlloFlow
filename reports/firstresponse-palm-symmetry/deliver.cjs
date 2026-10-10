'use strict';
// This gate writes shared files only with --apply, after a matching private preflight.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', work = __dirname;
const beforeSHA = '147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891';
const finalSHA = 'dfe3e01f38a419187e468c749cc37827f486a47401b9916afaa9ec6f98a3f86a';
const reportName = 'reports/firstresponse-palm-symmetry', reportPath = path.join(root, reportName);
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
equal(history.edits.map(edit => edit.file), ['tests/helpers/firstresponse_patient_wrist_finish_delta.cjs'], 'Exact helper edit');
equal(history.additions.map(edit => edit.file), ['tests/helpers/firstresponse_palm_symmetry_delta.cjs', 'tests/helpers/firstresponse_palm_symmetry_delta.json'], 'Exact helper additions');
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
function indexState() {
  let gitDir = r('.git');
  if (!fs.statSync(gitDir).isDirectory()) gitDir = path.resolve(root, fs.readFileSync(gitDir, 'utf8').trim().replace(/^gitdir:\s*/, ''));
  const file = path.join(gitDir, 'index'); return { path: file, SHA256: fs.existsSync(file) ? hash(file) : null };
}
function sourceCheck(file = p('candidate.js')) {
  pin(file, finalSHA); pin(p('before.js'), beforeSHA);
  const delta = json(p('delta.json')); assert.equal(delta.beforeSHA256, beforeSHA); assert.equal(delta.afterSHA256, finalSHA); assert.equal(delta.edits.length, 1);
  let text = fs.readFileSync(p('before.js'), 'utf8');
  for (const edit of delta.edits) { assert.equal(text.split(edit.old).length, 2, 'Unique source edit'); text = text.replace(edit.old, edit.new); }
  assert.equal(text, fs.readFileSync(file, 'utf8'), 'All source bytes accounted for'); new Function(text);
}
function pinsMatch(pins) { for (const [file, SHA256] of Object.entries(pins)) pin(path.isAbsolute(file) ? file : p(file), SHA256); }
function historyCheck(dir) {
  assert.equal(preservation.sourceSHA256, finalSHA); assert.equal(preservation.beforeSHA256, beforeSHA);
  assert.equal(preservation.historicalChain.length, 20); assert.equal(preservation.historicalAssertionsChanged, false);
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
  const folder = p('raw-palm-tests'), summary = json(path.join(folder, 'summary.json')), result = json(path.join(folder, 'candidate-results.json')), exit = json(path.join(folder, 'exit.json'));
  assert.equal(summary.sourceSHA256, finalSHA); assert.equal(summary.passed, true); assert.ok(summary.inputsUnchanged && summary.selftest.inputMutationRejected && summary.selftest.restoredAndReread);
  for (const value of [summary, result]) { assert.equal(value.numPassedTests, 56); assert.equal(value.numFailedTests, 0); assert.equal(value.numTotalTests, 56); assert.equal(value.numPendingTests, 0); }
  assert.equal(result.success, true); assert.equal(summary.exitCode, 0); assert.equal(exit.exitCode, 0); assert.equal(exit.signal, null); assert.equal(exit.timedOut, false); assert.equal(exit.spawnError, null);
  pin(path.join(folder, 'candidate.log'), exit.logSHA256); pin(p('run-raw.cjs'), summary.runnerSHA256); pin(path.join(folder, 'vitest.config.cjs'), summary.configSHA256);
  pin(path.join(folder, 'stem_lab/stem_tool_firstresponse.js'), finalSHA); pin(path.join(folder, 'vendor/three-r128/three.min.js'), summary.vendorSHA256); pin(r('vendor/three-r128/three.min.js'), summary.vendorSHA256);
  const assertions = result.testResults.flatMap(test => test.assertionResults); assert.equal(assertions.length, 56); assert.equal(new Set(assertions.map(test => test.fullName)).size, 56);
  for (const test of assertions) { assert.equal(test.status, 'passed'); assert.equal(test.failureMessages.length, 0); }
  equal(result.testResults.map(test => path.basename(test.name)).sort(), ['firstresponse_hand_surface.test.js', 'firstresponse_patient_wrists.test.js'], 'Exact raw fixture selection');
  for (const [file, SHA256] of Object.entries(summary.testHashes)) { pin(r(file), SHA256); pin(inside(folder, file), SHA256); }
  for (const [file, SHA256] of Object.entries(summary.helperHashes)) pin(inside(path.join(folder, 'tests/helpers'), file), SHA256);
  historyCheck(path.join(folder, 'tests/helpers'));
  return { passed: 56, failed: 0, total: 56 };
}
function cpuCheck() {
  const cpu = json(p('geometry-result.json')); assert.equal(cpu.passed, true); assert.equal(cpu.beforeSHA256, beforeSHA); assert.equal(cpu.candidateSHA256, finalSHA);
  pin(p('verify-palm-symmetry.cjs'), cpu.checkerSHA256); pinsMatch(cpu.inputs); assert.equal(cpu.cases, 24); assert.equal(cpu.results.length, 24); assert.ok(cpu.assertions > 0);
  const expected = []; for (const age of ['adult', 'child', 'infant']) for (const phase of [0, 2, 5, 8]) for (const contrast of [false, true]) expected.push([age, phase, contrast]);
  equal(cpu.results.map(value => [value.age, value.phase, value.contrast]), expected, 'All age/pose/contrast combinations');
  for (const value of cpu.results) {
    assert.equal(value.status, 'passed'); assert.equal(value.wrist.newReversedFaces, 0); assert.equal(value.resources.disposed, true);
    equal(value.palms.map(palm => palm.pair), value.age === 'infant' ? ['patient'] : ['patient', 'rescuer'], 'Exact palm pair inventory');
    for (const palm of value.palms) {
      assert.ok(Number.isInteger(palm.triangles) && palm.triangles > 2000); assert.ok(Number.isInteger(palm.vertices) && palm.vertices > 0); assert.match(palm.mirrorTriangleSHA256, /^[a-f0-9]{64}$/);
      for (const stats of [palm.normalMirror, palm.baselineNormalMirror]) {
        assert.equal(stats.vertices, palm.vertices);
        for (const key of ['maximumChordError', 'maximumAngleDegrees', 'meanAngleDegrees']) assert.ok(Number.isFinite(stats[key]) && stats[key] >= 0, 'Finite measured normal statistic ' + key);
        assert.ok(stats.meanAngleDegrees <= stats.maximumAngleDegrees && stats.maximumAngleDegrees <= 180);
        assert.ok(Math.abs(stats.maximumAngleDegrees - 2 * Math.asin(Math.min(1, stats.maximumChordError / 2)) * 180 / Math.PI) < 1e-10, 'Reported normal angle matches chord measurement');
      }
      assert.equal(palm.maxNormalMirrorError, palm.normalMirror.maximumChordError);
      assert.ok(palm.normalMirror.maximumAngleDegrees <= .2, 'Palm normal maximum stays within 0.2 degrees');
      assert.ok(palm.normalMirror.maximumAngleDegrees < palm.baselineNormalMirror.maximumAngleDegrees * .5, 'Palm normal maximum improves by over 50 percent');
      assert.ok(palm.normalMirror.meanAngleDegrees < palm.baselineNormalMirror.meanAngleDegrees * .05, 'Palm normal mean improves by over 95 percent');
      assert.ok(Number.isFinite(palm.minNormalLength) && Number.isFinite(palm.maxNormalLength) && palm.minNormalLength > 1 - 1e-6 && palm.maxNormalLength < 1 + 1e-6 && palm.minNormalLength <= palm.maxNormalLength, 'Unit palm normals');
      assert.ok(Number.isFinite(palm.minFaceNormalAgreement) && palm.minFaceNormalAgreement > 0 && palm.minFaceNormalAgreement <= 1, 'Palm shader normals face outward');
      assert.equal(palm.outwardFaces.length, 2); for (const count of palm.outwardFaces) assert.ok(Number.isInteger(count) && count > 2000 && count <= palm.triangles, 'Both complete palm surfaces checked for outward winding');
    }
    assert.equal(value.creases.length, 4); equal(value.creases.map(crease => [crease.side, crease.kind]), [['left', 'palm'], ['right', 'palm'], ['left', 'thumb'], ['right', 'thumb']], 'Exact four crease records');
    for (const crease of value.creases) { assert.ok(crease.maximumMirrorError < 1e-7); assert.equal(crease.pathSamples, 129); assert.ok(crease.ribbonSamples > 0); assert.ok(crease.minSkinGap >= -.001 && crease.maxSkinGap <= .004); }
  }
  assert.equal(cpu.selftestRequested, true); assert.equal(cpu.negative.length, 1); const negative = cpu.negative[0]; assert.equal(negative.type, 'omit-palm-diagonal-mirror'); assert.ok(negative.rejected && negative.restoredAndReread); assert.equal(negative.restoredSHA256, finalSHA);
  return { cases: 24, assertions: cpu.assertions };
}
const views = [['native-adult', 'adult-wide'], ['native-child', 'child-narrow'], ['native-infant', 'infant-narrow-contrast']];
function nativeCheck() {
  const audit = json(p('fixture-audit.json')); assert.equal(audit.accepted, true); assert.equal(audit.candidateSHA256, finalSHA); assert.equal(audit.baselineSHA256, beforeSHA); pin(p('audit-preview-fixture.cjs'), audit.auditorSHA256); pinsMatch(audit.inputs);
  assert.ok(audit.inputsUnchanged && audit.sharedFilesWritten === 0); assert.ok(audit.negativeTests.length >= 19); for (const test of audit.negativeTests) assert.ok(test.rejected && test.restoredAndReread);
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
      const stageName = id + '-' + value.variant + '-stage.png', palmName = id + '-' + value.variant + '-palm.png'; assert.equal(value.capture, stageName);
      const stage = fs.readFileSync(path.join(dir, stageName)), palm = fs.readFileSync(path.join(dir, palmName)), proof = value.detail.proof;
      assert.ok(proof.sameCapturedFrame); assert.equal(sha(stage), proof.sourceSHA256); assert.equal(sha(palm), proof.cropSHA256);
      const stageClip = value.captureInfo.stageClip, clip = { x: value.detail.clip.x - stageClip.x, y: value.detail.clip.y - stageClip.y, width: value.detail.clip.width, height: value.detail.clip.height };
      const size = { width: stageClip.width, height: stageClip.height }; assert.deepEqual(proof.sourceSize, size, 'Captured stage dimensions'); assert.deepEqual(proof.clip, clip, 'Stage-relative crop coordinates');
      const cropped = cropPng(stage, clip, size); assert.deepEqual(cropped.buffer, palm, 'Palm detail pixels from same stage frame');
      images.push({ file: folder + '/' + stageName, SHA256: sha(stage) }, { file: folder + '/' + palmName, SHA256: sha(palm) });
    }
    const comparison = contract.validateNativePair(baseline, candidate, id); assert.deepEqual(candidate.scopeComparison, comparison);
    if (id === 'child-narrow') contract.validateNativePair(baseline.resize.wide, candidate.resize.wide, 'adult-wide');
    assert.equal(evidenceFile.attempts.length, 2); for (const attempt of evidenceFile.attempts) { assert.equal(attempt.phase, 'complete'); assert.ok(attempt.materialDisposal.length > 0); for (const material of attempt.materialDisposal) assert.ok(material.disposeCount > 0); }
    equal(summary.images.slice().sort(), pair.flatMap(value => [id + '-' + value.variant + '-stage.png', id + '-' + value.variant + '-palm.png']).sort(), 'Exactly four native images');
    assert.equal(summary.pixelComparisons.length, 1); const pixel = summary.pixelComparisons[0]; assert.equal(pixel.id, id); if (!pixel.contrast) assert.ok(pixel.changedPixels > 0 && pixel.palmChangedPixels > 0); pixels.push(pixel);
  }
  return { images, pixels };
}
function reviewCheck(images, file = p('visual-review.json')) {
  const review = json(file); assert.equal(review.sourceSHA256, finalSHA); assert.equal(review.accepted, true, 'Visual review must be accepted'); assert.equal(review.images.length, 12);
  equal(review.images.map(value => value.file).sort(), images.map(value => value.file).sort(), 'Review covers each exact image once');
  for (const expected of images) { const image = review.images.find(value => value.file === expected.file); assert.equal(image.accepted, true); assert.equal(image.SHA256, expected.SHA256); pin(inside(work, image.file), image.SHA256); }
}
function collectEvidence() {
  const files = ['before.js', 'candidate.js', 'delta.json', 'deliver.cjs', 'prepare-history.cjs', 'history-input-snapshot.json', 'history-integration.json', 'history-preservation.json', 'run-raw.cjs', 'verify-palm-symmetry.cjs', 'geometry-result.json', 'geometry.log', 'firstresponse_palm_symmetry_delta.cjs', 'firstresponse_palm_symmetry_delta.json', 'audit-preview-fixture.cjs', 'fixture-audit.json', 'firstresponse-face-preview.spec.ts', 'patient-wrist-contract.cjs', 'playwright-face.config.cjs', 'run-face-browser.cjs', 'face-capture-png.cjs', 'face-mount-window.cjs', 'visual-review.json'];
  function walk(name) { for (const item of fs.readdirSync(p(name), { withFileTypes: true })) { const relative = name + '/' + item.name; assert.ok(!item.isSymbolicLink(), 'Evidence cannot follow symlinks'); if (item.isDirectory()) walk(relative); else if (item.isFile()) files.push(relative); } }
  for (const [folder] of views) walk(folder);
  for (const file of ['candidate-results.json', 'candidate.log', 'summary.json', 'launch.json', 'exit.json', 'vitest.config.cjs', 'saved-candidate.js']) files.push('raw-palm-tests/' + file);
  for (const folder of ['raw-palm-tests/tests', 'raw-palm-tests/vendor', 'raw-palm-tests/stem_lab', 'history-helper-sandbox', 'fixture-selftest']) walk(folder);
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
  return { passed: true, sourceSHA256: finalSHA, checks };
}
function validate() {
  sharedGuard(); sourceCheck(); assert.ok(!fs.existsSync(reportPath), 'Report destination must be new');
  const index = indexState(), raw = rawCheck(), cpu = cpuCheck(); historyCheck(p('history-helper-sandbox')); const native = nativeCheck(); reviewCheck(native.images);
  const evidence = collectEvidence(); sharedGuard(); equal(indexState(), index, 'Git index changed while checking');
  return { sourceSHA256: finalSHA, baselineSHA256: beforeSHA, gateSHA256: hash(__filename), index, handoffSHA256: hash(r('AGENT_HANDOFF.md')), sourceHashes: snapshot.sourceHashes, fixtureHashes: snapshot.fixtureHashes, checkerHashes: snapshot.checkerHashes, helperHashes: snapshot.helperHashes, evidence, raw, cpu, native, historyReversals: 20, commit: false, deployment: false, fullApplicationBuild: false };
}
function readme(checked) {
  let text = '# First Response Lab: mirrored palm surfaces\n\nPalm triangles now follow matching diagonals on both hands. This gives the fitted palm and thumb folds mirrored paths and reduces shading asymmetry in the right patient palm and upper rescuer palm. Small residual normal differences remain near the mesh seam; exact symmetry is verified for the triangle surfaces and crease paths. Palm vertex positions, hand proportions, lesson state, contact and cameras remain unchanged. The existing wrist surface fit follows the corrected palm normals.\n\n## Verification\n\n- All 56 focused raw-module tests passed, including the three hand-symmetry cases that previously failed.\n- All 24 geometry cases passed: adult, child and infant; recovery poses 0, 2, 5 and 8; normal and high contrast.\n- Three paired native-browser views passed, including narrow-view resize and resource disposal checks.\n- Twenty exact historical helper reversals passed. Existing fixtures and checker files are unchanged.\n- Deliberate source, geometry, browser-contract and visual-acceptance mutations were rejected and restored.\n\nThese checks use raw-module harnesses. The full application loader and full application build were not run. No commit, push or deployment was performed. The original shared Git index was preserved during installation.\n\n## Before and after\n';
  for (const [folder, id] of views) text += '\n### ' + id + '\n\nBefore\n\n![Before palm detail](' + folder + '/' + id + '-baseline-palm.png)\n\nAfter\n\n![After palm detail](' + folder + '/' + id + '-candidate-palm.png)\n';
  text += '\n## Evidence\n\nSee [geometry results](geometry-result.json), [raw results](raw-palm-tests/candidate-results.json), [visual review](visual-review.json), [history preservation](history-preservation.json) and [installation checks](post-write.json). The manifest pins the copied evidence. Unsuccessful native attempts, if present, are preserved as diagnostics and excluded from the three successful views.\n\nBaseline: `' + beforeSHA + '`\n\nCandidate: `' + finalSHA + '`\n';
  return text;
}
function main() {
  const apply = process.argv.includes('--apply'), checkOnly = process.argv.includes('--check-only'); assert.ok(apply !== checkOnly, 'Choose exactly one of --check-only or --apply');
  const checked = validate();
  if (checkOnly) {
    assert.ok(process.argv.includes('--selftest'), 'Preflight requires --selftest'); const result = selftest(checked.native.images); save(p('delivery-selftest.json'), result); checked.selftestSHA256 = hash(p('delivery-selftest.json')); save(p('delivery-preflight.json'), checked);
    console.log(JSON.stringify({ checkOnly: true, sharedWrites: false, sourceSHA256: finalSHA, rawTests: 56, geometryCases: 24, nativeViews: 3, images: 12, historyReversals: 20 })); return;
  }
  const preflight = json(p('delivery-preflight.json')), test = json(p('delivery-selftest.json')); assert.equal(test.passed, true); assert.equal(test.sourceSHA256, finalSHA); assert.equal(test.checks.length, 2); for (const entry of test.checks) assert.ok(entry.rejected && entry.restoredAndReread);
  checked.selftestSHA256 = hash(p('delivery-selftest.json')); equal(checked, preflight, 'Fresh preflight no longer matches; rerun --check-only --selftest before any shared write');
  const saved = { files: {}, handoff: fs.readFileSync(r('AGENT_HANDOFF.md')) }, stamp = new Date().toISOString();
  for (const file of [...sourceFiles, ...history.edits.map(edit => edit.file)]) saved.files[file] = fs.readFileSync(r(file));
  function guard() { sharedGuard(); equal(indexState(), checked.index, 'Shared index changed; stopping before further writes'); }
  function writeShared(file, bytes, expected) { guard(); if (expected === null) assert.ok(!fs.existsSync(r(file)), 'New destination remains absent'); else pin(r(file), expected); fs.writeFileSync(r(file), bytes, expected === null ? { flag: 'wx' } : undefined); assert.deepEqual(fs.readFileSync(r(file)), Buffer.from(bytes), 'Shared bytes reread'); written.set(file, sha(bytes)); }
  function appendHandoff(text) { const current = fs.readFileSync(r('AGENT_HANDOFF.md')); fs.appendFileSync(r('AGENT_HANDOFF.md'), text); const after = fs.readFileSync(r('AGENT_HANDOFF.md')); assert.deepEqual(after.subarray(0, current.length), current, 'Concurrent handoff content preserved'); assert.ok(after.subarray(current.length).includes(Buffer.from(text)), 'Handoff append reread'); }
  try {
    guard(); pin(r('AGENT_HANDOFF.md'), checked.handoffSHA256);
    appendHandoff('\n\n## ' + stamp + ' First Response palm symmetry — ACTIVE\nScope: four First Response runtime copies; patient wrist history helper; two new palm symmetry helpers; ' + reportName + '. No commit or deployment.\n');
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
    guard(); const post = { complete: true, sourceSHA256: finalSHA, runtimeHashes: Object.fromEntries(sourceFiles.map(file => [file, hash(r(file))])), historyReversals: 20, raw: checked.raw, cpu: checked.cpu, nativeViews: 3, images: 12, indexPreserved: true, index: checked.index, commit: false, deployment: false, fullApplicationBuild: false, sourceAndHelperSyntax: true, preservedFixtures: 39, preservedCheckers: 8 };
    save(path.join(reportPath, 'post-write.json'), post);
    appendHandoff('\n\n## ' + new Date().toISOString() + ' First Response palm symmetry — COMPLETE\nAll four runtime copies updated; mirrored palm diagonals and fitted crease symmetry refined. 56 raw tests, 24 geometry cases, 3 native paired views and 20 historical reversals passed. Existing fixtures/checkers and shared index preserved. Report: ' + reportName + '/README.md. Full application build not run. Uncommitted and undeployed. Scope released.\n');
    guard(); save(p('finish-integration.json'), { ...post, reportPath, handoffComplete: true }); console.log(JSON.stringify({ complete: true, sourceSHA256: finalSHA, reportPath, commit: false, deployment: false }));
  } catch (error) { save(p('finish-failure.json'), { error: error.stack, written: Object.fromEntries(written), reportPath, automaticRollback: false, note: 'Inspect saved-before and current shared state; do not overwrite concurrent work.' }); throw error; }
}
try { main(); } catch (error) { console.error(error.stack); process.exitCode = 1; }

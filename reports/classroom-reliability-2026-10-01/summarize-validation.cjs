'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const unitPaths = ['host-save-tests-complete-20261003.json', 'storage-ack-complete-20261003.json', 'evolution/current-integrated-unit.json', 'evolution/current-regressions-unit.json'];
const units = unitPaths.map(file => {
  const result = read(file);
  assert.equal(result.success, true, file);
  assert.equal(result.numFailedTests, 0, file);
  assert.equal(result.numPendingTests, 0, file);
  return { file, passed: result.numPassedTests, failed: result.numFailedTests, skipped: result.numPendingTests };
});
const passed = units.reduce((total, result) => total + result.passed, 0);
assert.equal(passed, 211);
const browser = read('accessibility/report.json');
const bridge = read('accessibility/bridge-report.json');
const candidate = read('release/candidate-after-complete-20261003.json');
const consistency = read('current-consistency-complete-20261003.json');
const reader = read('reader-release-complete-20261003.json');
assert.equal(browser.passed, true);
assert.equal(bridge.passed, true);
assert.equal(candidate.unchanged, true);
assert.equal(candidate.current.declaredParityMatches, true);
assert.equal(consistency.passed, true);
assert.equal(reader.ok, true);
assert.deepEqual(browser.pageErrors, []);
assert.deepEqual(bridge.pageErrors, []);
assert.equal(browser.teacherSave.verified, true);
assert.equal(browser.reopened.hasAudio, true);
assert.equal(browser.teacherStorageIsolation.nativeStudentWorkRecordCount, 0);
assert.equal(browser.teacherStorageIsolation.productionReadMiss, null);
const playback = browser.playback.map(row => {
  assert.equal(row.synthesisCalls, 0);
  assert.equal(row.clips.length, row.required);
  assert(row.clips.every(clip => clip.ended && !clip.error && Number.isFinite(clip.duration) && clip.duration > 0 && clip.maxTime >= clip.duration * .9));
  return { resourceId: row.id, required: row.required, nativeCompletedClips: row.clips.length, learnerSynthesisCalls: row.synthesisCalls };
});
const supplementalRuntimeInputs = [];
for (const [file, sha256] of Object.entries(browser.inputs)) {
  if (candidate.current.files[file]) assert.equal(candidate.current.files[file].sha256, sha256, 'Browser input/candidate mismatch: ' + file);
  else {
    assert(file.startsWith('desktop/web-app/node_modules/'), 'Unexpected unselected application input: ' + file);
    const currentHash = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', file))).digest('hex');
    assert.equal(currentHash, sha256, 'Browser runtime library changed after acceptance: ' + file);
    supplementalRuntimeInputs.push({ file, sha256, evidence: 'Browser runner fingerprints before/after acceptance; matched again during report assembly. Outside the 76 selected application/package inputs.' });
  }
}
for (const [file, source] of Object.entries(bridge.sources)) assert.equal(candidate.current.files[file].sha256, source.sha256, 'Bridge input/candidate mismatch: ' + file);
for (const host of consistency.hosts) assert.equal(candidate.current.files[host.file].sha256, host.sha256);
assert.equal(candidate.current.files['stem_lab/stem_tool_evolab.js'].sha256, 'b587a28fcb14a13e6a70a1d81e41ded97694cb6577b0e45c11bf04ddfa47563f');
const result = {
  passed: true, summarizedAt: new Date().toISOString(), validationCompletedAt: browser.completedAt,
  unitChecks: { passed, failed: 0, skipped: 0, groups: units },
  candidate: { sha256: candidate.currentCandidateSha256, head: candidate.currentHead, selectedInputs: candidate.inputCount, declaredPairs: candidate.current.parity.length, unchanged: candidate.unchanged, currentCI: 'unverified' },
  supplementalRuntimeInputs,
  browsers: { classroom: 'pass', bridge: 'pass', teacherSaveVerified: true, reopenedAudio: true, playback, keyboardNavigation: browser.uiNavigation, keyboardStop: browser.keyboardCancellation, reflow: browser.reflow, teacherStorageIsolation: browser.teacherStorageIsolation, bridgeTwoSaves: bridge.twoSaves, bridgeFreshClient: bridge.freshClientRestore, pageErrors: [] },
  consistency: { threeHosts: 'pass', audioGenerationAndPins: 'pass', readerGenerationAndPins: 'pass', declaredMirrors: 'pass' },
  limits: { nativeZoom: browser.nativeZoom, screenReaders: 'not tested', hostedClassroomTransport: 'not tested', actualGoogleCanvasPartition: 'not tested', fullAppShell: 'not tested', exports: 'not tested', installer: 'not tested', deployment: 'not performed', commit: 'not performed; uncommitted integration prerequisites documented in release/commit-scope-assessment.md' }
};
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: result.passed, unitChecks: result.unitChecks, candidate: result.candidate, nativeCompletedClips: playback.reduce((total, row) => total + row.nativeCompletedClips, 0), nativeZoom: browser.nativeZoom.status }));

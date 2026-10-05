'use strict';
// Full editable/generated factories, with a controlled deferred provenance
// boundary and mailbox/download adapters. No production handler is replaced.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../../..');
const sourcePath = process.env.SUBMISSION_HOST_SOURCE || path.join(repo, 'host_handlers_source.jsx');
const runtimePath = process.env.SUBMISSION_HOST_MODULE || path.join(repo, 'host_handlers_module.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const runtime = fs.readFileSync(runtimePath, 'utf8');
const results = [];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function factory(name) {
  const window = { React: {}, AlloModules: {}, location: { search: '' } };
  const context = vm.createContext({ window, React: window.React, structuredClone, URLSearchParams, console: { log() {}, error() {} }, setTimeout, clearTimeout, Blob, Buffer, Date });
  if (name === 'source') vm.runInContext(source + '\nwindow.__factory = createHostHandlers;', context);
  else vm.runInContext(runtime, context);
  return { window, create: name === 'source' ? window.__factory : window.AlloModules.HostHandlers };
}
function harness(name, lane = 'live') {
  const loaded = factory(name), gate = deferred(), uploaded = [], downloaded = [], toasts = [], pulses = [];
  const laneA = { url: 'https://old.example.invalid', code: 'OLD', uid: 'learner-A', participant: 'old-token' };
  const hostedA = { url: 'https://old.example.invalid', id: 'old-assignment', secret: 'old-key' };
  const deps = {
    history: [{ id: 'old-quiz', type: 'quiz', title: 'Old assignment', data: [] }],
    studentResponses: { 'old-quiz': { answer: 'Old learner writing' } }, studentNickname: 'Synthetic Owl', studentProjectSettings: {},
    sourceTopic: 'Old assignment', generatedContent: null, rosterKey: null, gameCompletions: {}, pasteEvents: [], globalPoints: 0, adventureState: { level: 1 },
    _alloCheckpointRecordsRef: { current: [] }, _alloLedgerRef: { current: {} },
    _alloProvenanceApi: () => null, _alloRefreshWorkStory: () => gate.promise,
    activeSessionCode: null, mbStudent: lane === 'live' ? laneA : null, mbHostedAssignment: lane === 'hosted' ? hostedA : null,
    alloStableAssignmentId: () => 'old-stable-assignment', generateUUID: () => 'synthetic-id',
    t: key => key, addToast: (...args) => toasts.push(args), warnLog() {}, setIsSaveActionPulsing: value => pulses.push(value),
    downloadSubmissionBackup: (payload, filename) => downloaded.push({ payload: structuredClone(payload), filename }),
    _alloMailboxCallWithRetry: async (url, payload) => { uploaded.push({ url, payload: structuredClone(payload) }); return { ok: true, filename: 'synthetic.json' }; },
    _alloSplitPackChunks: serialized => [serialized],
  };
  const handlers = loaded.create(deps);
  deps.sanitizeSubmissionData = handlers.sanitizeSubmissionData;
  return { deps, gate, handlers, uploaded, downloaded, toasts, pulses, laneA, hostedA };
}
async function check(name, caseName, callback) {
  try { await callback(); results.push({ factory: name, case: caseName, passed: true }); }
  catch (error) { results.push({ factory: name, case: caseName, passed: false, error: error.message }); }
}
(async () => {
  for (const name of ['source', 'runtime']) {
    await check(name, 'unchanged live mailbox accepts original assignment after provenance', async () => {
      const h = harness(name); const sending = h.handlers.handleSubmitAssignment('Synthetic Owl', {});
      assert.equal(h.uploaded.length, 0); h.gate.resolve(); const result = await sending;
      assert.equal(result.ok, true); assert.equal(result.delivery, 'mailbox'); assert.equal(h.uploaded.length, 1);
      assert.equal(h.uploaded[0].url, h.laneA.url); assert.equal(h.uploaded[0].payload.c, 'OLD');
      assert.equal(JSON.parse(h.uploaded[0].payload.data).answers['old-quiz'].answer, 'Old learner writing');
    });
    await check(name, 'unchanged hosted assignment accepts original assignment after provenance', async () => {
      const h = harness(name, 'hosted'); const sending = h.handlers.handleSubmitAssignment('Synthetic Owl', {}); h.gate.resolve();
      const result = await sending; assert.equal(result.ok, true); assert.equal(h.uploaded.length, 1); assert.equal(h.uploaded[0].payload.id, 'old-assignment');
    });
    await check(name, 'switching live mailbox during provenance never sends old work to new teacher', async () => {
      const h = harness(name); const sending = h.handlers.handleSubmitAssignment('Synthetic Owl', {});
      h.deps.mbStudent = { url: 'https://new.example.invalid', code: 'NEW', uid: 'learner-B', participant: 'new-token' };
      h.deps.history = [{ id: 'new-quiz', type: 'quiz', data: [] }]; h.deps.studentResponses = { 'new-quiz': { answer: 'New learner writing' } };
      h.gate.resolve(); await sending;
      assert.ok(h.uploaded.every(entry => entry.url !== 'https://new.example.invalid'), 'Old assignment was uploaded to the newly joined mailbox');
    });
    await check(name, 'switching hosted assignment during provenance never sends old work to new assignment', async () => {
      const h = harness(name, 'hosted'); const sending = h.handlers.handleSubmitAssignment('Synthetic Owl', {});
      h.deps.mbHostedAssignment = { url: 'https://new.example.invalid', id: 'new-assignment', secret: 'new-key' };
      h.gate.resolve(); await sending;
      assert.ok(h.uploaded.every(entry => entry.payload.id !== 'new-assignment'), 'Old assignment was uploaded to the newly opened hosted assignment');
    });
    await check(name, 'a download-only attempt cannot become an upload after joining a mailbox', async () => {
      const h = harness(name, 'download'); const sending = h.handlers.handleSubmitAssignment('Synthetic Owl', {});
      h.deps.mbStudent = { url: 'https://new.example.invalid', code: 'NEW', uid: 'learner-B', participant: 'new-token' };
      h.gate.resolve(); await sending; assert.equal(h.uploaded.length, 0, 'A local download became an upload to a newly joined teacher');
    });
    await check(name, 'edits during provenance remain pending after the older payload is delivered', async () => {
      const h = harness(name); const sending = h.handlers.handleSubmitAssignment('Synthetic Owl', {});
      h.deps.studentResponses = { 'old-quiz': { answer: 'Newer learner writing' } };
      h.gate.resolve(); await sending;
      assert.deepEqual(h.pulses, [], 'Older submission cleared the save indicator for newer writing');
      assert.equal(h.deps.studentResponses['old-quiz'].answer, 'Newer learner writing');
    });
  }
  const report = { generatedAt: new Date().toISOString(), inputs: { sourcePath, sourceSha256: hash(source), runtimePath, runtimeSha256: hash(runtime) }, passed: results.filter(x => x.passed).length, failed: results.filter(x => !x.passed).length, results };
  fs.writeFileSync(process.env.SUBMISSION_REPORT || path.join(__dirname, 'baseline-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: process.env.SUBMISSION_REPORT || path.join(__dirname, 'baseline-results.json') }));
  process.exitCode = report.failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 2; });

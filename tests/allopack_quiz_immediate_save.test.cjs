const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const { JSDOM } = require(path.join(root, 'node_modules/jsdom'));
const React = require(path.join(root, 'desktop/web-app/node_modules/react'));
const candidatePath = path.join(root, 'view_quiz_module.js');
const moduleText = fs.readFileSync(candidatePath, 'utf8');
// A missing anchor must fail loudly; slice(-1) would silently read to the end of the module.
function anchorAt(text, needle, from, last) {
  const index = last ? text.lastIndexOf(needle, from) : text.indexOf(needle, from);
  assert.ok(index >= 0, 'anchor not found: ' + needle);
  return index;
}
const quiz = JSON.parse(fs.readFileSync(path.join(root, 'allopacks/authoring/source_media_literacy_grade7_8.json'), 'utf8')).history.find(row => row.type === 'quiz');
function harness({ owner = true, stored = false } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.invalid/' });
  const window = dom.window;
  window.React = React; window.AlloModules = {};
  // Return private functions lexically from the test-only module evaluation.
  // No debug API or additional global is installed in the product or harness.
  const expression = moduleText.slice(anchorAt(moduleText, '(function() {')).replace('  window.AlloModules.QuizView = QuizView;', '  return { stage: _quizStageDraftField, working: _quizReadWorkingDraft, read: _quizReadDraft, snapshot: _quizResponseSnapshot, write: _quizWriteDraftField };');
  const api = new Function('window', 'CustomEvent', 'navigator', 'return ' + expression)(window, window.CustomEvent, window.navigator);
  const namespace = 'alloflow_assess_draft_v1:local:immediate-fixture';
  const calls = [], responses = {}, callback = (id, key, value) => { calls.push([id, key, value]); responses[id] = { ...(responses[id] || {}), [key]: value }; };
  const ref = { current: owner ? callback : null }, recorded = { current: {} };
  if (stored) window.localStorage.setItem(namespace, JSON.stringify({ version: 1, items: {}, updatedAt: Date.now() }));
  const at = anchorAt(moduleText, 'if (!draftNamespace || !recordResponsesRef.current) return undefined;');
  const start = anchorAt(moduleText, 'React.useEffect(function () {', at, true);
  const end = anchorAt(moduleText, '}, [draftNamespace, recordResourceId]);', at) + '}, [draftNamespace, recordResourceId]);'.length;
  const recordFrom = anchorAt(moduleText, 'function recordAssessmentResponses(key, snapshot)');
  const recordTo = anchorAt(moduleText, 'React.useEffect(function () {', recordFrom);
  let cleanup;
  new Function('React', 'window', 'draftNamespace', 'recordResourceId', 'recordResponsesRef', 'recordAttemptMetaRef', 'recordedResponsesRef', 'draftContext', 'assessmentData', '_quizResponseSnapshot', '_quizReadWorkingDraft', '_quizReadDraft', moduleText.slice(recordFrom, recordTo) + '\n' + moduleText.slice(start, end))(
    { useEffect: effect => { cleanup = effect(); } }, window, namespace, quiz.id, ref, { current: { attemptId: 'attempt-fixture', startedAt: 100 } }, recorded, { resourceId: quiz.id, workspaceScope: 'synthetic-workspace' }, quiz.data, api.snapshot, api.working, api.read,
  );
  return { window, api, namespace, calls, responses, ref, callback, cleanup: () => cleanup?.(), close() { cleanup?.(); window.close(); } };
}

test('the actual staging event mirrors the latest MCQ and final written character synchronously without a timer', () => {
  const h = harness();
  try {
    h.api.stage(h.namespace, 'root', 'mcqAnswers', { 0: 0 });
    assert.equal(h.calls.length, 1, 'host mirror must be updated before stage returns');
    h.api.stage(h.namespace, 'q-4', 'response', 'QA immediate last character!');
    const snapshot = h.responses[quiz.id]?.assessmentDraft;
    assert.ok(snapshot, 'Save File can read a host snapshot immediately');
    assert.equal(snapshot.items[0].answer.optionIdx, 0);
    assert.equal(snapshot.items[4].response, 'QA immediate last character!');
    assert.equal(snapshot.answered, 2);
    assert.equal(snapshot.status, 'in-progress');
    assert.equal(snapshot.assessmentIdentity.workspaceScope, 'synthetic-workspace');
  } finally { h.close(); }
});

test('snapshot deduplication prevents repeated identical host writes and blank on-load overwrite', () => {
  const h = harness({ stored: true });
  try {
    assert.equal(h.calls.length, 0, 'a blank saved draft must not overwrite host work');
    h.api.stage(h.namespace, 'q-4', 'response', 'My reason.');
    const count = h.calls.length;
    h.api.stage(h.namespace, 'q-4', 'response', 'My reason.');
    assert.equal(h.calls.length, count);
    h.api.stage(h.namespace, 'q-4', 'response', 'My revised reason.');
    assert.equal(h.calls.length, count + 1);
  } finally { h.close(); }
});

test('foreign namespace, retired owner and unmounted listener never record a stale snapshot', () => {
  const h = harness();
  try {
    h.api.stage(h.namespace + ':other', 'q-4', 'response', 'Foreign work');
    assert.equal(h.calls.length, 0);
    h.ref.current = null;
    h.api.stage(h.namespace, 'q-4', 'response', 'Retired owner work');
    assert.equal(h.calls.length, 0);
    h.ref.current = h.callback;
    h.api.stage(h.namespace, 'q-4', 'response', 'Current work');
    assert.equal(h.calls.length, 1);
    h.cleanup();
    h.api.stage(h.namespace, 'q-4', 'response', 'After unmount');
    assert.equal(h.calls.length, 1);
  } finally { h.close(); }
});

test('actual Save File immediately receives the synchronized partial responses and still withholds graded keys', async () => {
  const h = harness();
  try {
    for (const file of ['firestore_sync_module.js', 'session_transport_module.js', 'live_aac_module.js', 'phase_k_helpers_module.js']) new Function('window', 'React', fs.readFileSync(path.join(root, file), 'utf8'))(h.window, React);
    let downloaded;
    class BlobFixture { constructor(parts) { this.parts = parts; } }
    const urls = { createObjectURL: blob => { downloaded = blob; return 'blob:fixture'; }, revokeObjectURL() {} };
    const phase = fs.readFileSync(path.join(root, 'phase_k_helpers_module.js'), 'utf8');
    delete h.window.AlloModules.PhaseKHelpersModule;
    new Function('window', 'React', 'document', 'Blob', 'URL', phase)(h.window, React, h.window.document, BlobFixture, urls);
    h.window.HTMLAnchorElement.prototype.click = function () {};
    h.api.stage(h.namespace, 'root', 'mcqAnswers', { 0: 0 });
    h.api.stage(h.namespace, 'q-4', 'response', 'QA immediate Save File!');
    const deps = { saveFileName: 'immediate-quiz', saveType: 'student', history: [quiz], studentProgressLog: [], studentResponses: h.responses, studentNickname: 'Synthetic Owl', studentProjectSettings: {}, adventureState: {}, escapeRoomState: {}, completedActivities: new Map(), socraticMessages: [], fluencyAssessments: [], flashcardEngagement: {}, timeOnTask: {}, pointHistory: [], probeHistory: [], interventionLogs: [], surveyResponses: [], fidelityLog: [], externalCBMScores: [], gameCompletions: {}, labelChallengeResults: [], wordSoundsHistory: [], wordSoundsBadges: {}, phonemeMastery: {}, wordSoundsDailyProgress: {}, wordSoundsConfusionPatterns: {}, wordSoundsFamilies: {}, wordSoundsAudioLibrary: {}, wordSoundsScore: {}, globalPoints: 0, sessionCounter: 1, addToast() {}, warnLog() {}, t: key => key, setStudentProgressLog() {}, setLastJsonFileSave() {}, setIsSaveActionPulsing() {}, setShowSaveModal() {}, getFocusRatio: () => null };
    assert.equal((await h.window.AlloModules.PhaseKHelpers.executeSaveFile(deps)).ok, true);
    const saved = JSON.parse(downloaded.parts.join(''));
    assert.equal(saved.responses[quiz.id].assessmentDraft.items[4].response, 'QA immediate Save File!');
    assert.equal(saved.responses[quiz.id].assessmentDraft.items[0].answer.optionIdx, 0);
    assert.equal(Object.hasOwn(saved.history[0].data.questions[0], 'correctAnswer'), false);
    assert.equal(Object.hasOwn(saved.history[0].data.questions[4], 'expectedAnswer'), false);
  } finally { h.close(); }
});


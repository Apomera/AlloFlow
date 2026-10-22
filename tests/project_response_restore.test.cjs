'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { File } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return text.slice(a, b);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
function harness(host, options = {}) {
  const readers = [], state = { responses: options.initialResponses || {}, restores: [], invalidations: 0, history: [] };
  class ControlledReader {
    constructor() { readers.push(this); }
    readAsText(file) { this.file = file; }
    async deliver(text) { await this.onload({ target: { result: text === undefined ? await this.file.text() : text } }); }
    abort() { if (this.onabort) this.onabort(); }
  }
  const window = { AlloModules: {}, dispatchEvent() {} };
  // Run the shipped importer, including its real per-file ownership/lifecycle manager.
  const importer = new Function('window', 'FileReader', 'AbortController', 'localStorage', 'CustomEvent',
    section(read('misc_handlers_module.js'), 'function _createProjectLoadOperationManager', 'function handleRestoreView')
    + '\nreturn { handleLoadProject, cancelProjectLoad };')(
      window, ControlledReader, AbortController, { setItem() {} }, class CustomEvent {});
  window.AlloModules.MiscHandlers = importer;
  const hostText = read(host);
  const source = section(hostText, '  const handleLoadProject = (e) => {', '  // Bridge for the Community Catalog:');
  const resetSource = section(hostText, '  const resetAllMathRuntimeState = React.useCallback(', '  const mathSelfGradeContextKey =');
  const scope = Object.fromEntries([...new Set((source + resetSource).match(/\bset[A-Z]\w*/g))].map(name => [name, () => {}]));
  Object.assign(scope, {
    window, React: { useCallback: callback => callback },
    mathSelfGradeSubmissionRef: { current: 'prior-math-work' }, mathSelfGradeContextRef: { current: 'prior-math-context' },
    _restoreBuilderDraftFromProject: options.restore || (async () => true),
    GUIDED_STEP_IDS: [], normalizeGuidedPlanBrief: value => value,
    projectFileInputRef: { current: { value: '' } },
    t: key => key, addToast() {}, warnLog() {}, hydrateHistory: value => value,
    normalizeArtifactInstanceIds: value => value, isCanvas: false,
    canvasRecoveryMutationInProgressRef: { current: false },
    canvasRecoveryImportPreviousIdRef: { current: null },
    canvasRecoveryCurrentIdRef: { current: 'previous-workspace' },
    canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryPendingSaveCountRef: { current: 0 },
    canvasRecoveryStoreRef: { current: { snapshots: [] } },
    ALLO_WORKSPACE_RECOVERY: { newId: () => 'import-' + state.invalidations },
    _alloLearningWebWorkspaceKey: 'workspace', safeSetItem() {},
    invalidateLocalDataHydration() { state.invalidations++; },
    studentWorkLatestRef: { current: state.responses },
    setHistory(value) { state.history = value; },
    setStudentResponses(value) { assert.equal(typeof value, 'object'); state.responses = value; state.restores.push(value); },
    _alloAwaitModules: async () => {},
  });
  // Execute the real reset callback: it clears the shared response map too.
  scope.resetAllMathRuntimeState = new Function(...Object.keys(scope), resetSource + '\nreturn resetAllMathRuntimeState;')(...Object.values(scope));
  const load = new Function(...Object.keys(scope), source + '\nreturn handleLoadProject;')(...Object.values(scope));
  return {
    state, scope, readers, importer,
    load(project) {
      const file = new File([JSON.stringify(project)], 'saved-student-project.json', { type: 'application/json' });
      return load({ target: { files: [file], value: 'selected' } });
    },
  };
}
const project = responses => ({
  mode: 'student', studentNickname: 'Local Test Learner',
  history: [
    { id: 'notes', type: 'note-taking', title: 'Decision record', data: { templateType: 'cornell-notes' } },
    { id: 'exit', type: 'quiz', title: 'Exit check', data: { questions: [{ type: 'short-answer', question: 'Why?' }] } },
  ],
  ...(responses === undefined ? {} : { responses }),
});
const savedResponses = {
  notes: { studio: { schemaVersion: 1, notes: [{ id: 'row1', content: 'Evidence B keeps the shelf route clear.' }], summary: 'Our group revised the layout.' } },
  exit: { 0: 'I changed my proposal after hearing the route concern.' },
};
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

for (const host of hosts) {
  test(host + ': portable student project restores notes and quiz in a fresh profile only after success', async () => {
    const waiting = deferred();
    const h = harness(host, { restore: () => waiting.promise });
    const owner = h.load(project(savedResponses));
    const delivering = h.readers[0].deliver();
    await nextTurn();
    assert.deepEqual(h.state.responses, {});
    assert.equal(h.state.restores.length, 0);
    waiting.resolve(true);
    await delivering;
    assert.equal((await owner.completion).success, true);
    assert.deepEqual(h.state.responses, savedResponses);
    assert.strictEqual(h.scope.studentWorkLatestRef.current, h.state.responses);
    assert.equal(h.state.restores.length, 2); // math reset, then imported responses
    assert.deepEqual(h.state.restores[0], {});
    assert.deepEqual(h.state.history.map(item => item.id), ['notes', 'exit']);
  });
  test(host + ': replacement discards prior learner answers and a response-free lesson clears them', async () => {
    const h = harness(host, { initialResponses: { prior: { 0: 'Do not carry this learner forward' } } });
    let owner = h.load(project(savedResponses));
    await h.readers[0].deliver();
    assert.equal((await owner.completion).success, true);
    assert.deepEqual(h.state.responses, savedResponses);
    owner = h.load(project());
    await h.readers[1].deliver();
    assert.equal((await owner.completion).success, true);
    assert.deepEqual(h.state.responses, {});
    assert.deepEqual(h.scope.studentWorkLatestRef.current, {});
  });
  test(host + ': invalid maps and prototype keys fail before invalidating the current workspace', async () => {
    const invalid = [null, [], 'text', { notes: 'not a response record' },
      JSON.parse('{"__proto__":{"polluted":true}}'),
      JSON.parse('{"notes":{"studio":{"constructor":{"polluted":true}}}}'),
      JSON.parse('{"notes":{"studio":{"rows":[{"prototype":true}]}}}')];
    for (const responses of invalid) {
      const previous = { prior: { 0: 'Keep existing work' } };
      const h = harness(host, { initialResponses: previous });
      const owner = h.load(project(responses));
      await h.readers[0].deliver();
      assert.equal((await owner.completion).success, false);
      assert.strictEqual(h.state.responses, previous);
      assert.equal(h.state.invalidations, 0);
      assert.equal(h.state.restores.length, 0);
    }
    assert.equal({}.polluted, undefined);
  });
  test(host + ': cancelled and superseded imports never restore an older response map', async () => {
    for (const supersede of [false, true]) {
      const waiting = deferred(); let restores = 0;
      const previous = { prior: { 0: 'Existing work' } };
      const h = harness(host, { initialResponses: previous, restore: () => ++restores === 1 ? waiting.promise : Promise.resolve(true) });
      const oldOwner = h.load(project(savedResponses));
      const delivering = h.readers[0].deliver();
      await nextTurn();
      const latest = { exit: { 0: 'Newer file wins' } };
      if (supersede) {
        const nextOwner = h.load(project(latest));
        await h.readers[1].deliver();
        assert.equal((await nextOwner.completion).success, true);
      } else h.importer.cancelProjectLoad({ notifyLifecycle: true });
      assert.equal((await oldOwner.completion).cancelled, true);
      waiting.resolve(true);
      await delivering;
      assert.deepEqual(h.state.responses, supersede ? latest : previous);
      assert.equal(h.state.restores.length, supersede ? 2 : 0);
    }
  });
  test(host + ': read, malformed JSON, and asynchronous restore failures preserve current responses', async () => {
    for (const failure of ['read', 'parse', 'restore']) {
      const previous = { prior: { 0: 'Retained after failure' } };
      const h = harness(host, { initialResponses: previous, restore: failure === 'restore' ? async () => { throw new Error('restore failed'); } : undefined });
      const owner = h.load(project(savedResponses));
      if (failure === 'read') h.readers[0].onerror();
      else await h.readers[0].deliver(failure === 'parse' ? '{invalid' : undefined);
      assert.equal((await owner.completion).success, false);
      assert.strictEqual(h.state.responses, previous);
      assert.equal(h.state.restores.length, 0);
    }
  });
}

for (const host of hosts) {
  test(host + ': quiz receives only the active learner response and a learner-only workspace scope', () => {
    const invocation = section(read(host), 'React.createElement(window.AlloModules.QuizView, {', 'onRecordQuizResponses:');
    const responseExpression = invocation.match(/learnerResponses:\s*([^\n]+),\n/);
    const scopeExpression = invocation.match(/learnerResponseScope:\s*([^\n]+),\n/);
    assert.ok(responseExpression, 'actual QuizView invocation must receive restored work');
    assert.ok(scopeExpression, 'quiz local storage must be scoped to the imported workspace');
    const propsFor = new Function('isTeacherMode', 'isParentMode', 'studentResponses', 'generatedContent', 'canvasRecoveryCurrentIdRef',
      'return { learnerResponses: (' + responseExpression[1] + '), learnerResponseScope: (' + scopeExpression[1] + ') };');
    const responseMap = { exit: { assessmentDraft: { answers: ['Saved answer'] } }, unrelated: { 0: 'Another resource' } };
    const current = { id: 'exit' }, workspace = { current: 'student-project-2' };
    const learner = propsFor(false, false, responseMap, current, workspace);
    assert.strictEqual(learner.learnerResponses, responseMap.exit);
    assert.equal(learner.learnerResponseScope, 'student-project-2');
    for (const [teacher, parent] of [[true, false], [false, true], [true, true]]) {
      assert.deepEqual(propsFor(teacher, parent, responseMap, current, workspace), { learnerResponses: null, learnerResponseScope: '' });
    }
    assert.equal(propsFor(false, false, responseMap, { id: 'missing' }, workspace).learnerResponses, null);
    assert.equal(propsFor(false, false, responseMap, null, workspace).learnerResponses, null);
    assert.equal(propsFor(false, false, responseMap, current, { current: null }).learnerResponseScope, '');
  });
}

for (const host of hosts) {
  test(host + ': delayed quiz cleanup cannot overwrite a newer imported learner workspace', () => {
    const invocation = section(read(host), 'React.createElement(window.AlloModules.QuizView, {', '                    onClose:');
    const marker = 'onRecordQuizResponses:';
    const expression = invocation.slice(invocation.indexOf(marker) + marker.length).trim().replace(/,$/, '');
    const createCallback = new Function('canvasRecoveryCurrentIdRef', 'setStudentResponses', 'return (' + expression + ');');
    const workspace = { current: 'learner-A' }, queued = [];
    const callbackA = createCallback(workspace, update => queued.push(update));
    callbackA('exit', 'assessmentDraft', { attemptId: 'attempt-A' });
    assert.equal(queued.length, 1);
    workspace.current = 'learner-B';
    const currentWork = { exit: { assessmentDraft: { attemptId: 'attempt-B' } }, notes: { studio: { summary: 'Learner B notes' } } };
    // Ownership can change between scheduling and applying a React updater.
    assert.strictEqual(queued.shift()(currentWork), currentWork);
    callbackA('exit', 'assessmentSubmitted', { attemptId: 'late-A' });
    assert.equal(queued.length, 0, 'retired cleanup must not schedule an update');
    const callbackB = createCallback(workspace, update => queued.push(update));
    callbackB('exit', 'assessmentSubmitted', { attemptId: 'submitted-B' });
    const updated = queued.shift()(currentWork);
    assert.deepEqual(updated.exit.assessmentSubmitted, { attemptId: 'submitted-B' });
    assert.strictEqual(updated.notes, currentWork.notes);
    assert.strictEqual(updated.exit.assessmentDraft, currentWork.exit.assessmentDraft);
  });
}

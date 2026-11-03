'use strict';
// Run with node --test. These checks invoke live modules from the repository;
// no task-candidate directory or generated screenshot fixture is required.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ROOT = path.resolve(__dirname, '..');
const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
const React = require(path.join(ROOT, 'desktop/web-app/node_modules/react'));
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
// A missing anchor must fail loudly; slice(-1) would silently read to the end of the source.
function anchorAt(text, needle, from) {
  const index = text.indexOf(needle, from);
  assert.ok(index >= 0, 'anchor not found: ' + needle);
  return index;
}
const clone = value => JSON.parse(JSON.stringify(value));

function harness() {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.invalid/' });
  const window = dom.window, downloads = [], updates = [], messages = [];
  window.React = React; window.AlloModules = {};
  for (const file of ['firestore_sync_module.js', 'session_transport_module.js', 'live_aac_module.js', 'view_brainstorm_module.js']) new Function('window', read(file))(window);
  let blob;
  class BlobFixture { constructor(parts) { this.parts = parts; } async text() { return this.parts.join(''); } }
  window.HTMLAnchorElement.prototype.click = function () { downloads.push(blob); };
  new Function('React', 'window', 'document', 'Blob', 'URL', read('phase_k_helpers_module.js'))(React, window, window.document, BlobFixture, { createObjectURL(value) { blob = value; return 'blob:roundtrip-test'; }, revokeObjectURL() {} });
  const deps = values => ({
    saveFileName: 'source-check', saveType: 'student', history: [], studentNickname: 'PracticeOwl',
    studentProgressLog: [], studentResponses: {}, studentProjectSettings: {}, adventureState: {}, escapeRoomState: {}, completedActivities: new Map(), socraticMessages: [], fluencyAssessments: [], flashcardEngagement: {}, timeOnTask: {}, pointHistory: [], probeHistory: [], interventionLogs: [], surveyResponses: [], fidelityLog: [], externalCBMScores: [], gameCompletions: {}, labelChallengeResults: [], wordSoundsHistory: [], wordSoundsBadges: {}, phonemeMastery: {}, wordSoundsDailyProgress: {}, wordSoundsConfusionPatterns: {}, wordSoundsFamilies: {}, wordSoundsAudioLibrary: {}, wordSoundsScore: {}, globalPoints: 0, sessionCounter: 1,
    addToast: (...args) => messages.push(args), warnLog() {}, t: key => key,
    setStudentProgressLog: value => updates.push(['progress', value]), setLastJsonFileSave: value => updates.push(['saved', value]), setIsSaveActionPulsing() {}, setShowSaveModal() {}, getFocusRatio: () => null,
    ...values
  });
  const save = values => window.AlloModules.PhaseKHelpers.executeSaveFile(deps(values));
  return { dom, window, deps, save, downloads, updates, messages, async result() { assert.equal(downloads.length, 1); return JSON.parse(await downloads[0].text()); }, close() { window.close(); } };
}
const discussion = () => ({ id: 'talk', type: 'brainstorm', title: 'Compare records', config: { language: 'en', customInstructions: 'PRIVATE generator prompt' }, data: [{ kind: 'discussion', title: 'Explain a limit', protocol: 'think-pair-share', openingQuestion: 'What can this record establish?', questionSets: [{ depth: 'evaluative', questions: ['What remains uncertain?'] }], facilitationNotes: 'PRIVATE teacher model', lookFors: ['PRIVATE teacher assessment'] }] });
const quiz = timing => ({ id: 'check', type: 'quiz', data: { deliverySettings: { feedbackTiming: timing }, questions: [{ type: 'mcq', question: 'Choose a relevant record.', options: ['Observation', 'Popularity'], correctAnswer: 'Observation' }, { type: 'short-answer', question: 'Explain its limit.', expectedAnswer: 'PRIVATE reference answer', studentCriteria: ['Name a specific limit.'] }] } });

test('live student Save preserves discussion and own work while withholding graded keys and teacher guidance', async () => {
  const h = harness();
  try {
    const history = [discussion(), quiz('teacher-graded'), { id: 'packet', type: 'dbq', data: { title: 'Records', teacherNotes: 'PRIVATE model conclusion', documents: [{ id: 'A', excerpt: 'A fictional record.' }] } }, { id: 'plan', type: 'lesson-plan', data: { essentialQuestion: 'PRIVATE plan' } }];
    const before = JSON.stringify(history), own = { check: { assessmentSubmitted: { items: [{ answer: { optionText: 'Observation' } }, { answer: { text: 'My own reason' } }] } }, talk: { answer: 'A learner explanation.' } };
    assert.equal((await h.save({ history, studentResponses: own })).ok, true);
    const saved = await h.result();
    assert(saved.history.some(item => item.id === 'talk' && item.studentProjection === true));
    assert(!saved.history.some(item => item.id === 'plan'));
    assert.equal(JSON.stringify(saved.history).includes('PRIVATE'), false);
    assert.deepEqual(saved.responses, own);
    assert.equal(saved.history.find(item => item.id === 'check').data.answerKeysWithheld, true);
    assert.equal(Object.hasOwn(saved.history.find(item => item.id === 'check').data.questions[0], 'correctAnswer'), false);
    assert.equal(JSON.stringify(history), before);
  } finally { h.close(); }
});

test('practice keys and teacher-source history retain their separate existing save contracts', async () => {
  for (const saveType of ['student', 'teacher']) {
    const h = harness();
    try {
      const item = quiz('immediate');
      assert.equal((await h.save({ saveType, history: [item] })).ok, true);
      const saved = await h.result();
      assert.equal(saved.history[0].data.questions[0].correctAnswer, 'Observation');
      if (saveType === 'teacher') assert.deepEqual(saved.history, [item]);
    } finally { h.close(); }
  }
});

test('missing privacy serializer fails without download or a false saved/progress update', async () => {
  const h = harness();
  try {
    delete h.window.AlloModules.LiveAac;
    const outcome = await h.save({ history: [quiz('teacher-graded')] });
    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'student-resource-projection-unavailable');
    assert.deepEqual(h.downloads, []);
    assert.deepEqual(h.updates, []);
  } finally { h.close(); }
});

test('pending teacher assessment leaves prior numeric progress rows and submission evidence intact', async () => {
  const h = harness();
  try {
    const previous = [{ timestamp: new Date().toISOString(), quizAverage: 82, xp: 10, existingField: 'Keep this row' }], before = clone(previous);
    const responses = { check: { assessmentSubmitted: { status: 'submitted', items: [{ answer: { text: 'My reasoning' } }] } } };
    assert.equal((await h.save({ history: [quiz('teacher-graded')], studentProgressLog: previous, studentResponses: responses })).ok, true);
    const saved = await h.result();
    assert.deepEqual(saved.progressLog, before);
    assert.deepEqual(previous, before);
    assert.deepEqual(saved.responses, responses);
  } finally { h.close(); }
});

test('native glossary and image-panel bytes and alt text survive the live portable serializer', async () => {
  const h = harness();
  try {
    const picture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSuoAAAAASUVORK5CYII=';
    const history = [{ id: 'words', type: 'glossary', data: [{ term: 'Evidence', def: 'Information relevant to a claim.', image: picture, imageAlt: 'A small image used as a serialization fixture.' }] }, { id: 'visual', type: 'image', data: { visualPlan: { title: 'A companion', panels: [{ id: 'panel', imageUrl: picture, alt: 'A small image used as a serialization fixture.', caption: 'A conceptual cue, not additional evidence.' }] } } }];
    assert.equal((await h.save({ history })).ok, true);
    const saved = await h.result();
    assert.equal(saved.history[0].data[0].image, picture);
    assert.equal(saved.history[0].data[0].imageAlt, history[0].data[0].imageAlt);
    assert.equal(saved.history[1].data.visualPlan.panels[0].imageUrl, picture);
    assert.equal(saved.history[1].data.visualPlan.panels[0].alt, history[1].data.visualPlan.panels[0].alt);
  } finally { h.close(); }
});

test('student import retains the previous split width so the real Restore Split View action works', async () => {
  const h = harness();
  try {
    const state = { width: 42, fullscreen: false };
    class Reader { readAsText(file) { this.onload({ target: { result: file.contents } }); } abort() {} }
    new Function('window', 'FileReader', 'localStorage', 'CustomEvent', read('misc_handlers_module.js'))(h.window, Reader, h.window.localStorage, h.window.CustomEvent);
    const source = read('misc_handlers_source.jsx');
    const block = source.slice(anchorAt(source, 'const handleLoadProject ='), anchorAt(source, 'const handleRestoreView ='));
    const setters = Object.fromEntries([...new Set(block.match(/\bset[A-Z][A-Za-z]+\b/g))].map(name => [name, value => { state[name] = value; }]));
    const deps = {
      ...setters,
      t: key => key, addToast() {}, warnLog() {}, hydrateHistory: items => clone(items), projectFileInputRef: { current: { value: 'selected' } },
      setIsFullscreen(value) { state.fullscreen = typeof value === 'function' ? value(state.fullscreen) : value; },
      setLeftWidth(value) { state.width = typeof value === 'function' ? value(state.width) : value; }
    };
    const project = { mode: 'student', history: [{ id: 'reading', type: 'simplified', data: 'A fictional reading.' }] };
    const owner = h.window.AlloModules.MiscHandlers.handleLoadProject({ target: { files: [{ contents: JSON.stringify(project) }] } }, deps);
    assert.equal((await owner.completion).success, true);
    assert.equal(state.fullscreen, true);
    assert.equal(state.width, 42);
    const actual = read('AlloFlowANTI.txt').match(/const handleToggleIsFullscreen = React\.useCallback\([^\n]+/)[0];
    const toggle = new Function('React', 'setIsFullscreen', actual + '\nreturn handleToggleIsFullscreen;')({ useCallback: fn => fn }, deps.setIsFullscreen);
    toggle(); assert.equal(state.fullscreen, false); assert.equal(state.width, 42);
  } finally { h.close(); }
});

test('the live Inbox recognizes the saved student nickname without changing responses or borrowing another identity', async () => {
  const source = read('view_submission_inbox_module.js');
  const start = anchorAt(source, 'const handleSubmissionFiles = '), end = anchorAt(source, 'const handleDecryptAll = ', start);
  const helperStart = anchorAt(source, 'function siStableIdentityValue('), helperEnd = anchorAt(source, 'function siSavedReviewState(', helperStart);
  assert(start > 0 && end > start && helperStart > 0 && helperEnd > helperStart);
  let queue = [];
  const handle = new Function('setQueue', 'tr', 'addToast', source.slice(helperStart, helperEnd) + '\n' + source.slice(start, end) + '\nreturn handleSubmissionFiles;')(update => { queue = update(queue); }, text => text, () => {});
  const payloads = [{ mode: 'student', studentNickname: 'PracticeOwl', responses: { check: { answer: 'A learner explanation.' } } }, { mode: 'student', responses: {} }];
  const before = JSON.stringify(payloads);
  const input = { value: 'selected', files: payloads.map((payload, index) => ({ name: 'practice-' + index + '.json', text: async () => JSON.stringify(payload) })) };
  await handle({ target: input });
  assert.deepEqual(queue.map(row => row.nickname), ['PracticeOwl', '?']);
  assert.equal(queue[0].payload.nickname, 'PracticeOwl');
  assert.deepEqual(queue[0].payload.responses, payloads[0].responses);
  assert.equal(Object.hasOwn(queue[0].payload, 'learnerId'), false);
  assert.equal(JSON.stringify(payloads), before);
  assert.equal(input.value, '');
});

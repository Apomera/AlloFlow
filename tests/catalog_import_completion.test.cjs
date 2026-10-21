'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Blob, File } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
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
function setup(compiled = false, overrides = {}) {
  const readers = [], state = { history: [{ id: 'saved-work' }] }, events = [];
  class ControlledFileReader {
    constructor() { readers.push(this); }
    readAsText(file) { this.file = file; }
    async deliver(text) { await this.onload({ target: { result: text === undefined ? await this.file.text() : text } }); }
    abort() { if (this.onabort) this.onabort(); }
  }
  const source = read(compiled ? 'misc_handlers_module.js' : 'misc_handlers_source.jsx');
  const runtime = new Function('window', 'FileReader', 'AbortController', 'localStorage', 'CustomEvent',
    section(source, 'function _createProjectLoadOperationManager', 'function handleRestoreView') + '\nreturn { handleLoadProject, cancelProjectLoad };')(
    { AlloModules: {}, dispatchEvent() {} }, ControlledFileReader, AbortController, { setItem() {} }, class CustomEvent {});
  const deps = {
    setStudentProjectSettings() {}, setStickers() {},
    setHistory(value) { state.history = value; }, hydrateHistory: value => value,
    restoreBuilderDraft: async () => true,
    setGeneratedContent(value) { state.content = value; }, setActiveView() {}, setIsMapLocked() {},
    projectFileInputRef: { current: { value: 'selected' } },
    addToast() {}, warnLog() {}, t: key => key,
    onProjectLoadStart() { events.push('start'); }, onProjectLoadComplete(value) { events.push(value); },
    ...overrides,
  };
  const hostSource = read(compiled ? 'host_handlers_module.js' : 'host_handlers_source.jsx');
  const bridgeSource = section(hostSource, compiled ? 'const loadProjectFromJson=' : 'const loadProjectFromJson =', compiled ? 'const handleBotFinishedSpeaking=' : 'const handleBotFinishedSpeaking =');
  const bridgeDeps = { handleLoadProject: event => runtime.handleLoadProject(event, deps), addToast() {}, t: key => key };
  const importLesson = new Function('__d', 'Blob', 'File', bridgeSource + '\nreturn loadProjectFromJson;')(bridgeDeps, Blob, File);
  return { ...runtime, importLesson, bridgeDeps, readers, state, events };
}
const lesson = { mode: 'teacher', history: [{ id: 'new-lesson', type: 'lesson-plan', data: {} }], builderDraft: { version: 2 } };

for (const compiled of [false, true]) {
  const label = compiled ? 'compiled modules' : 'source';
  test(label + ': import remains pending through file read and asynchronous restoration', async () => {
    const restoring = deferred();
    const h = setup(compiled, { restoreBuilderDraft: () => restoring.promise });
    let settled = false;
    const imported = h.importLesson(lesson).then(value => { settled = true; return value; });
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(h.state.history[0].id, 'saved-work');
    const delivered = h.readers[0].deliver();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(settled, false);
    restoring.resolve(true);
    await delivered;
    assert.equal((await imported).success, true);
    assert.equal(h.state.content.id, 'new-lesson');
    assert.equal(h.events.at(-1).success, true);
  });
  test(label + ': read, parse, validation and asynchronous restore failures resolve unsuccessful', async () => {
    for (const kind of ['read', 'parse', 'validation', 'restore']) {
      const h = setup(compiled, kind === 'restore' ? { restoreBuilderDraft: async () => { throw new Error('restore failed'); } } : {});
      const imported = h.importLesson(lesson);
      if (kind === 'read') h.readers[0].onerror();
      else await h.readers[0].deliver(kind === 'parse' ? '{invalid' : kind === 'validation' ? '{}' : undefined);
      assert.equal((await imported).success, false, kind);
      if (kind !== 'restore') assert.equal(h.state.history[0].id, 'saved-work', kind);
    }
  });
  test(label + ': cancellation before validation or during restore settles without late success', async () => {
    for (const startReading of [false, true]) {
      const restoring = deferred();
      const h = setup(compiled, { restoreBuilderDraft: () => restoring.promise });
      const imported = h.importLesson(lesson);
      const delivered = startReading ? h.readers[0].deliver() : Promise.resolve();
      await new Promise(resolve => setImmediate(resolve));
      h.cancelProjectLoad({ notifyLifecycle: true });
      const result = await imported;
      assert.equal(result.success, false);
      assert.equal(result.cancelled, true);
      restoring.resolve(true);
      await delivered;
      assert.equal(h.state.content, undefined);
    }
  });
  test(label + ': lazily loaded importer is awaited and missing completion never reports success', async () => {
    const h = setup(compiled);
    const actual = h.bridgeDeps.handleLoadProject;
    h.bridgeDeps.handleLoadProject = async event => actual(event);
    const imported = h.importLesson(lesson);
    await h.readers[0].deliver();
    assert.equal((await imported).success, true);
    h.bridgeDeps.handleLoadProject = async () => undefined;
    assert.equal((await h.importLesson(lesson)).success, false);
    h.bridgeDeps.handleLoadProject = async () => { throw new Error('module unavailable'); };
    assert.equal((await h.importLesson(lesson)).success, false);
  });
}
test('compiled import contracts match both public mirrors', () => {
  for (const file of ['host_handlers_module.js', 'misc_handlers_module.js']) {
    assert.equal(read(file), read('desktop/web-app/public/' + file), file);
  }
});

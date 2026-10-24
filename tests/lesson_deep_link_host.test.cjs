// node --test tests/lesson_deep_link_host.test.cjs
// Runs the host's actual URL parser and arrival/import handlers without mounting
// the entire app. Catalog approval, fetching, and preview are tested separately.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const source = fs.readFileSync(path.join(root, hosts[0]), 'utf8');
function section(text, name) {
  const start = text.indexOf('// LESSON_DEEP_LINK_' + name + '_START');
  const end = text.indexOf('// LESSON_DEEP_LINK_' + name + '_END', start);
  assert.ok(start >= 0 && end > start, 'Missing ' + name);
  return text.slice(start, end);
}
const readSlug = search => vm.runInNewContext(section(source, 'READER') + '\n_alloReadLessonDeepLinkSlug()', {
  window: { location: { search } }, URLSearchParams,
});
const slug = 'academic-discourse-reading-space-grade6';

test('lesson links accept a bounded catalog slug and decode query parameters once', () => {
  assert.equal(readSlug('?lesson=' + slug), slug);
  assert.equal(readSlug('?lesson=academic%2Ddiscourse&view=preview'), 'academic-discourse');
  assert.equal(readSlug('?lesson=' + 'a'.repeat(128)), 'a'.repeat(128));
  assert.equal(readSlug('?lesson=area_perimeter_grade4_illustrated'), 'area_perimeter_grade4_illustrated');
  assert.equal(readSlug('?lesson=Grade6_Discourse'), 'Grade6_Discourse');
  assert.equal(readSlug('?tool=waterCycle&lesson=' + slug), slug);
});

test('absent, duplicate, URL, path, control, and oversized values cannot become lesson selectors', () => {
  for (const value of ['', 'https://example.com/lesson.json', '../secret', '/approved', 'a/b', 'a\\b',
    'a.json', 'a?b', 'a#b', 'a%2fb', '-a', '_a', ' a', 'a\n', '<script>', 'é', 'a'.repeat(129)]) {
    assert.equal(readSlug('?lesson=' + encodeURIComponent(value)), null, JSON.stringify(value));
  }
  assert.equal(readSlug('?lesson=first&lesson=second'), null);
  assert.equal(readSlug('?lesson=first&lesson=first'), null);
  assert.equal(readSlug('?lesson'), null);
  assert.equal(readSlug('?url=https://example.com/lesson.json'), null);
  assert.equal(readSlug(''), null);
});

function arrivalHarness(overrides = {}) {
  const calls = [];
  const savedHistory = [{ id: 'existing-resource', data: { text: 'Saved work' } }];
  const context = vm.createContext({
    lessonDeepLinkActive: true,
    lessonDeepLinkSlug: slug,
    lessonDeepLinkAppliedRef: { current: false },
    isAppReady: true, isHistoryLoaded: true, canvasRecoveryDecisionMade: true,
    useEffect: fn => fn(),
    setCommunityCatalogLessonSlug: value => calls.push(['select', value]),
    setIsCommunityCatalogOpen: value => calls.push(['open', value]),
    window: { __alloPromoteModule: name => calls.push(['promote', name]) },
    setHistory: () => assert.fail('Preview must not replace history'),
    setHasSelectedRole: () => assert.fail('Preview must not change role'),
    setHasSelectedMode: () => assert.fail('Preview must not select mode'),
    loadProjectFromJson: () => assert.fail('Preview must not import'),
    history: savedHistory,
    ...overrides,
  });
  return { calls, context, savedHistory, render: () => vm.runInContext(section(source, 'ARRIVAL'), context) };
}

test('arrival waits for app, history, and recovery before selecting a preview, without importing', () => {
  for (const pending of ['isAppReady', 'isHistoryLoaded', 'canvasRecoveryDecisionMade']) {
    const h = arrivalHarness({ [pending]: false });
    h.render();
    assert.deepEqual(h.calls, [], pending);
    h.context[pending] = true;
    h.render();
    assert.deepEqual(h.calls, [['select', slug], ['open', true], ['promote', 'CommunityCatalog']]);
    assert.deepEqual(h.savedHistory, [{ id: 'existing-resource', data: { text: 'Saved work' } }]);
    h.render();
    assert.equal(h.calls.length, 3, 'StrictMode or rerender must not reopen or promote twice');
  }
});

test('dismissed lesson and competing tool arrivals cannot automatically open a lesson preview', () => {
  const start = source.indexOf('  const lessonDeepLinkActive =');
  const expression = source.slice(start, source.indexOf('\n', start));
  for (const vars of [
    { lessonDeepLinkSlug: slug, lessonDeepLinkDismissed: true, shellDeepLinkTool: null },
    { lessonDeepLinkSlug: slug, lessonDeepLinkDismissed: false, shellDeepLinkTool: 'waterCycle' },
    { lessonDeepLinkSlug: null, lessonDeepLinkDismissed: false, shellDeepLinkTool: null },
  ]) {
    const active = vm.runInNewContext(expression + '\nlessonDeepLinkActive', vars);
    assert.equal(active, false);
    const h = arrivalHarness({ lessonDeepLinkActive: active });
    h.render();
    assert.deepEqual(h.calls, []);
  }
});

test('closing the catalog clears the selected lesson and permits normal landing without changing saved work', () => {
  const state = section(source, 'STATE');
  const close = state.slice(state.indexOf('  const closeCommunityCatalog ='));
  const calls = [];
  vm.runInNewContext(close + '\ncloseCommunityCatalog()', {
    setIsCommunityCatalogOpen: value => calls.push(['open', value]),
    setCommunityCatalogLessonSlug: value => calls.push(['select', value]),
    setLessonDeepLinkDismissed: value => calls.push(['dismiss', value]),
    setHistory: () => assert.fail('Closing a preview must preserve history'),
  });
  assert.deepEqual(calls, [['open', false], ['select', null], ['dismiss', true]]);
});

test('only a completed successful linked import opens Class & Materials without setup', async () => {
  const calls = [];
  const lesson = { title: 'Approved example', history: [{ id: 'new-resource' }] };
  let complete;
  const context = vm.createContext({
    communityCatalogLessonSlug: slug,
    loadProjectFromJson: value => { calls.push(['import', value]); return new Promise(resolve => { complete = resolve; }); },
    setHasSelectedMode: value => calls.push(['mode', value]),
    setHasSelectedRole: value => calls.push(['role', value]),
    setShowWizard: value => calls.push(['wizard', value]),
    setWizardInitialMode: value => calls.push(['wizardInitialMode', value]),
    setGuidedMode: value => calls.push(['guided', value]),
    setActiveSidebarTab: value => calls.push(['sidebar', value]),
  });
  vm.runInContext(section(source, 'IMPORT') + '\nthis.importLesson = handleImportCatalogLesson;', context);
  assert.deepEqual(calls, [], 'Defining the import callback must not invoke it');
  const pending = context.importLesson(lesson);
  assert.deepEqual(calls, [['import', lesson]], 'Pending imports must leave the preview and role unchanged');
  complete({ success: true });
  assert.equal((await pending).success, true);
  assert.deepEqual(calls, [['import', lesson], ['wizard', false], ['wizardInitialMode', null], ['guided', false], ['sidebar', 'history'], ['mode', true], ['role', true]]);
  context.communityCatalogLessonSlug = null;
  calls.length = 0;
  const ordinary = context.importLesson(lesson);
  complete({ success: true });
  await ordinary;
  assert.deepEqual(calls, [['import', lesson]], 'Ordinary catalog imports retain existing role behavior');
  context.communityCatalogLessonSlug = slug;
  for (const outcome of [{ success: false }, { success: false, cancelled: true }, undefined]) {
    calls.length = 0;
    const failed = context.importLesson(lesson);
    complete(outcome);
    await failed;
    assert.deepEqual(calls, [['import', lesson]], 'Failed or unconfirmed import must not advance role');
  }
});

test('all host copies share routing handlers, selectedSlug wiring, and the recovery-first landing guard', () => {
  for (const host of hosts) {
    const text = fs.readFileSync(path.join(root, host), 'utf8');
    for (const name of ['READER', 'STATE', 'ARRIVAL', 'IMPORT']) assert.equal(section(text, name), section(source, name), host + ' ' + name);
    assert.match(text, /selectedSlug: communityCatalogLessonSlug/);
    assert.match(text, /loadProjectFromJson: handleImportCatalogLesson/);
    assert.match(text, /onClose=\{closeCommunityCatalog\}.*accessibleModal=\{true\}/);
    assert.match(text, /isAppReady && canvasRecoveryDecisionMade && !hasSelectedMode && !shellDeepLinkTool && window.AlloModules && window.AlloModules.LaunchPadView && !lessonDeepLinkActive && React.createElement/);
  }
});

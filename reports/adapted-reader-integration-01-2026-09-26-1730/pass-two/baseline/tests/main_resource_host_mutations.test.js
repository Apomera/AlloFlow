import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Evaluate the actual host callbacks with controlled state and deferred AI calls.
// This catches integration regressions without duplicating their implementation.
const source = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function actual(name, end, scope) {
  const start = source.indexOf('  const ' + name + ' =');
  const finish = source.indexOf(end, start);
  if (start < 0 || finish < 0) throw new Error('Missing host callback boundary: ' + name);
  return new Function(...Object.keys(scope), source.slice(start, finish) + '\nreturn ' + name + ';')(...Object.values(scope));
}
const useCallback = fn => fn;
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function host(history, active = history[0], inputText = '', queued = false) {
  const state = { history, generatedContent: active, inputText };
  const ref = { current: state };
  const pending = [];
  const set = key => value => {
    const apply = () => { state[key] = typeof value === 'function' ? value(state[key]) : value; };
    if (queued) pending.push(apply); else apply();
  };
  const scope = {
    useCallback, _resourceMutationStateRef: ref,
    setHistory: set('history'), setGeneratedContent: set('generatedContent'), setInputText: set('inputText')
  };
  const onUpdateResource = actual('onUpdateResource', '  const handleNoteUpdate =', scope);
  const h = { state, ref, scope, onUpdateResource, flush: () => { while (pending.length) pending.shift()(); } };
  h.correct = (evidence = { localStats: { words: 4 }, targetGrade: '5', instructionalText: { text: 'Fresh text' } }) => {
    const fresh = vi.fn(() => evidence);
    const undo = vi.fn();
    return { fresh, undo, run: actual('onCorrectAnalysisText', '  // ── Global text undo/redo', {
      ...scope, onUpdateResource, _getFreshTextComplexityEvidence: fresh, _recordTextChange: undo
    }) };
  };
  return h;
}
function analysis(overrides = {}) {
  return { id: 'analysis-a', type: 'analysis', unitId: 'unit-a', levelCheck: { old: true }, alignmentCheck: { old: true },
    data: { originalText: 'The dog run.', grammar: ['Subject-verb agreement', 'Other note'], localStats: { words: 3 } }, ...overrides };
}
function lesson() {
  return { id: 'lesson-a', type: 'lesson-plan', config: { grade: '7' }, unitId: 'unit-a',
    data: { title: 'Weather', extensions: [
      { title: 'Measure rain', description: 'Build a rain gauge.' },
      { title: 'Observe clouds', description: 'Record cloud types.' }
    ] } };
}
function extensionHost(h) {
  const requests = { current: new Map() };
  const pending = [];
  const callGemini = vi.fn(() => { const request = deferred(); pending.push(request); return request.promise; });
  const busy = { value: {} };
  const setIsGeneratingExtensionGuide = vi.fn(update => { busy.value = typeof update === 'function' ? update(busy.value) : update; });
  const addToast = vi.fn();
  return {
    requests, pending, callGemini, busy, setIsGeneratingExtensionGuide, addToast,
    render: () => actual('handleGenerateExtensionGuide', '  const handleGenerateProgression =', {
      generatedContent: h.state.generatedContent, _extensionGuideRequests: requests,
      onUpdateResource: h.onUpdateResource, setIsGeneratingExtensionGuide,
      callGemini, addToast, t: key => key, warnLog: vi.fn(), gradeLevel: '12', _resourceMutationStateRef: h.ref
    })
  };
}
const ownedStart = source.indexOf('function _alloBeginOwnedAsync(');
const ownedEnd = source.indexOf('async function _loadTranslationGlossary(', ownedStart);
const owned = new Function(source.slice(ownedStart, ownedEnd) + '\nreturn {_alloBeginOwnedAsync,_alloOwnedAsyncIsCurrent,_alloInvalidateOwnedAsync};')();
function sortResource() {
  return { id: 'sort-a', type: 'concept-sort', data: {
    categories: [{ id: 'category-a', label: 'Solids' }],
    items: [{ id: 'item-a', content: 'Ice', categoryId: 'category-a', image: 'data:image/png;base64,b2xk' }]
  } };
}
function conceptHost(h) {
  const live = { current: h.state.generatedContent?.type === 'concept-sort' ? String(h.state.generatedContent.id) : '' };
  const owner = { current: { generation: 0, identity: '', controller: null } };
  const setCsBusyId = vi.fn();
  const pending = [];
  const handleGenerateConceptItem = vi.fn(() => { const request = deferred(); pending.push(request); return request.promise; });
  const imageRequests = [];
  const callImagen = vi.fn(() => { const request = deferred(); imageRequests.push(request); return request.promise; });
  const scope = { ...h.scope, ...owned, onUpdateResource: h.onUpdateResource,
    callImagen, universalImageStyle: '', conceptSortAutoRemoveWords: false, callGeminiImageEdit: vi.fn(), warnLog: vi.fn(),
    generatedContent: h.state.generatedContent, csLiveDocumentIdRef: live, csAsyncOwnerRef: owner, setCsBusyId,
    addToast: vi.fn(), t: key => key, handleGenerateConceptItem };
  scope.csBeginAsyncRun = actual('csBeginAsyncRun', '  const csAsyncRunIsCurrent =', scope);
  scope.csAsyncRunIsCurrent = actual('csAsyncRunIsCurrent', '  const csInvalidateAsyncRun =', scope);
  scope.csInvalidateAsyncRun = actual('csInvalidateAsyncRun', '  useEffect(', scope);
  scope.csUpdateData = actual('csUpdateData', '  const csDeleteItem =', scope);
  scope.csDeleteItem = actual('csDeleteItem', '  const csUpdateItemText =', scope);
  scope.csUpdateItemText = actual('csUpdateItemText', '  const csMoveItem =', scope);
  scope.csRegenerateItem = actual('csRegenerateItem', '  const csAddItem =', scope);
  scope.csClearItemImage = actual('csClearItemImage', '  const handleExplainConceptSortItem =', scope);
  scope.csRegenerateItemImage = actual('csRegenerateItemImage', '  // Image-to-image refinement', scope);
  return { ...scope, live, owner, pending, imageRequests };
}

describe('main resource host: targeted persistent mutations', () => {
  it('updates the requested history artifact without changing a newly selected resource', () => {
    const a = { id: 21, type: 'image', data: { imageUrl: 'before' }, unitId: 'unit-a' };
    const quiz = { id: 'quiz-b', type: 'quiz', data: [{ question: 'Keep me' }] };
    const h = host([a, quiz], quiz);
    expect(h.onUpdateResource('21', item => ({ ...item, data: { ...item.data, imageUrl: 'after' } }))).toBe(true);
    expect(h.state.history[0]).toMatchObject({ id: 21, type: 'image', unitId: 'unit-a', data: { imageUrl: 'after' } });
    expect(h.state.generatedContent).toBe(quiz);
    expect(h.state.history[1]).toBe(quiz);
    expect(h.state.history[0].updatedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it('preserves independent history and active metadata when applying a pure updater', () => {
    const stored = { id: 'a', type: 'image', unitId: 'u', notes: 'Saved note', data: { imageUrl: 'old' } };
    const active = { id: 'a', type: 'image', panelState: 'open', data: { imageUrl: 'old' } };
    const h = host([stored], active);
    h.onUpdateResource('a', item => ({ ...item, data: { ...item.data, imageUrl: 'new' } }));
    expect(h.state.history[0]).toMatchObject({ unitId: 'u', notes: 'Saved note', data: { imageUrl: 'new' } });
    expect(h.state.generatedContent).toMatchObject({ panelState: 'open', data: { imageUrl: 'new' } });
  });

  it('does not resurrect a target removed while functional updates are queued', () => {
    const a = { id: 'a', type: 'image', data: { imageUrl: 'old' } };
    const quiz = { id: 'b', type: 'quiz', data: [] };
    const h = host([a], a, '', true);
    expect(h.onUpdateResource('a', item => ({ ...item, data: { imageUrl: 'new' } }))).toBe(true);
    h.state.history = [quiz]; h.state.generatedContent = quiz;
    h.flush();
    expect(h.state.history).toEqual([quiz]);
    expect(h.state.generatedContent).toBe(quiz);
  });

  it('reapplies against newer queued state and protects artifact identity and type', () => {
    const a = { id: 'a', type: 'image', data: { imageUrl: 'old' } };
    const h = host([a], a, '', true);
    h.onUpdateResource('a', item => ({ ...item, id: 'bad', type: 'quiz', data: { ...item.data, imageUrl: 'new' } }));
    h.state.history = [{ ...a, unitId: 'new-unit', data: { ...a.data, altText: 'Recently edited' } }];
    h.flush();
    expect(h.state.history[0]).toMatchObject({ id: 'a', type: 'image', unitId: 'new-unit', data: { imageUrl: 'new', altText: 'Recently edited' } });
  });

  it('rejects nonexistent targets and null or identity updaters without deleting resources', () => {
    const a = analysis(); const h = host([a]);
    expect(h.onUpdateResource('missing', item => ({ ...item }))).toBe(false);
    expect(h.onUpdateResource(a.id, () => null)).toBe(false);
    expect(h.onUpdateResource(a.id, item => item)).toBe(false);
    expect(h.onUpdateResource(null, () => ({}))).toBe(false);
    expect(h.onUpdateResource(a.id, null)).toBe(false);
    expect(h.state.history).toEqual([a]); expect(h.state.generatedContent).toBe(a);
  });

  it('preserves intentional deletion of stale top-level fields', () => {
    const h = host([analysis()]);
    h.onUpdateResource('analysis-a', item => { const next = { ...item }; delete next.levelCheck; return next; });
    expect(h.state.history[0]).not.toHaveProperty('levelCheck');
    expect(h.state.generatedContent).not.toHaveProperty('levelCheck');
  });
});

describe('main resource host: grammar correction bookkeeping', () => {
  it('persists correction, selected fixed notes, fresh complexity, invalidation, source input and undo', () => {
    const a = analysis(); const h = host([a], { ...a, panel: 'grammar' }, 'The dog run.');
    const correction = h.correct();
    expect(correction.run(a.id, 'The dog run.', 'The dog runs.', ['Subject-verb agreement'])).toBe(true);
    for (const item of [h.state.history[0], h.state.generatedContent]) {
      expect(item.data).toMatchObject({ originalText: 'The dog runs.', grammar: ['✓ FIXED: Subject-verb agreement', 'Other note'], localStats: { words: 4 } });
      expect(item).toMatchObject({ targetGradeLevel: '5', instructionalText: { text: 'Fresh text' } });
      expect(item).not.toHaveProperty('levelCheck'); expect(item).not.toHaveProperty('alignmentCheck');
    }
    expect(correction.fresh).toHaveBeenCalledWith(a, 'The dog runs.');
    expect(correction.undo).toHaveBeenCalledExactlyOnceWith('analysis', a.id, 'The dog run.', 'The dog runs.');
    expect(h.state.inputText).toBe('The dog runs.');
  });

  it('rejects an analysis whose source was edited after the correction request started', () => {
    const a = analysis({ data: { originalText: 'Teacher revision.', grammar: ['Subject-verb agreement'] } });
    const h = host([a], a, 'Teacher revision.'); const correction = h.correct();
    expect(correction.run(a.id, 'The dog run.', 'The dog runs.', ['Subject-verb agreement'])).toBe(false);
    expect(h.state.history[0]).toBe(a); expect(h.state.inputText).toBe('Teacher revision.');
    expect(correction.fresh).not.toHaveBeenCalled(); expect(correction.undo).not.toHaveBeenCalled();
  });

  it('does not overwrite unrelated source input or a newly active quiz', () => {
    const a = analysis(); const quiz = { id: 'b', type: 'quiz', data: [] };
    const h = host([a, quiz], quiz, 'New source being drafted.'); const correction = h.correct();
    expect(correction.run(a.id, 'The dog run.', 'The dog runs.', [])).toBe(true);
    expect(h.state.generatedContent).toBe(quiz);
    expect(h.state.inputText).toBe('New source being drafted.');
    expect(h.state.history[0].data.originalText).toBe('The dog runs.');
  });

  it('removes old local statistics when fresh complexity evidence has none', () => {
    const h = host([analysis()]); const correction = h.correct({ targetGrade: '5', instructionalText: null });
    correction.run('analysis-a', 'The dog run.', 'The dog runs.', []);
    expect(h.state.history[0].data).not.toHaveProperty('localStats');
    expect(h.state.generatedContent.data).not.toHaveProperty('localStats');
  });

  it('rejects missing and wrong-type artifacts without creating undo entries', () => {
    const a = { ...analysis(), type: 'quiz' }; const h = host([a]); const correction = h.correct();
    expect(correction.run('absent', 'The dog run.', 'Fixed', [])).toBe(false);
    expect(correction.run(a.id, 'The dog run.', 'Fixed', [])).toBe(false);
    expect(correction.undo).not.toHaveBeenCalled();
  });
});

describe('main resource host: lesson extension async ownership', () => {
  it('keeps both concurrent guides when they resolve in reverse order', async () => {
    const h = host([lesson()]); const e = extensionHost(h); const run = e.render();
    const first = run(0); const second = run(1);
    e.pending[1].resolve('Cloud guide'); await second;
    e.pending[0].resolve('Rain guide'); await first;
    for (const item of [h.state.history[0], h.state.generatedContent]) {
      expect(item.data.extensions.map(x => x.guide)).toEqual(['Rain guide', 'Cloud guide']);
      expect(item.unitId).toBe('unit-a');
    }
    expect(e.requests.current.size).toBe(0);
    expect(e.busy.value).toEqual({ 0: false, 1: false });
    expect(e.callGemini.mock.calls[0][0]).toContain('Target Grade: 7');
  });

  it('deduplicates a request for the same extension', async () => {
    const h = host([lesson()]); const e = extensionHost(h);
    const first = e.render()(0); await e.render()(0);
    expect(e.callGemini).toHaveBeenCalledTimes(1);
    e.pending[0].resolve('Guide'); await first;
  });

  it('updates the original lesson in history after navigation without touching quiz state', async () => {
    const h = host([lesson()]); const e = extensionHost(h); const pending = e.render()(0);
    const quiz = { id: 'quiz-next', type: 'quiz', data: [{ question: 'Unchanged' }] };
    h.state.history.push(quiz); h.state.generatedContent = quiz;
    e.busy.value = { quizWork: true }; e.setIsGeneratingExtensionGuide.mockClear();
    e.pending[0].resolve('Saved guide'); await pending;
    expect(h.state.history[0].data.extensions[0].guide).toBe('Saved guide');
    expect(h.state.generatedContent).toBe(quiz);
    expect(e.setIsGeneratingExtensionGuide).not.toHaveBeenCalled();
    expect(e.busy.value).toEqual({ quizWork: true });
  });

  it('does not overwrite a newer edit to the extension', async () => {
    const h = host([lesson()]); const e = extensionHost(h); const pending = e.render()(0);
    h.onUpdateResource('lesson-a', item => ({ ...item, data: { ...item.data, extensions: item.data.extensions.map((x, i) => i === 0 ? { ...x, description: 'Teacher changed task' } : x) } }));
    e.pending[0].resolve('Stale guide'); await pending;
    expect(h.state.history[0].data.extensions[0]).toMatchObject({ description: 'Teacher changed task' });
    expect(h.state.history[0].data.extensions[0]).not.toHaveProperty('guide');
    expect(e.addToast).toHaveBeenLastCalledWith('resource_edit.changed_retry', 'info');
  });

  it('preserves a guide saved by a newer edit', async () => {
    const h = host([lesson()]); const e = extensionHost(h); const pending = e.render()(0);
    h.onUpdateResource('lesson-a', item => ({ ...item, data: { ...item.data, extensions: item.data.extensions.map((x, i) => i === 0 ? { ...x, guide: 'Teacher guide' } : x) } }));
    e.pending[0].resolve('Stale guide'); await pending;
    expect(h.state.history[0].data.extensions[0].guide).toBe('Teacher guide');
  });

  it('follows extension identity when the teacher reorders activities', async () => {
    const h = host([lesson()]); const e = extensionHost(h); const pending = e.render()(0);
    h.onUpdateResource('lesson-a', item => ({ ...item, data: { ...item.data, extensions: [...item.data.extensions].reverse() } }));
    e.pending[0].resolve('Rain guide'); await pending;
    expect(h.state.history[0].data.extensions[1]).toMatchObject({ title: 'Measure rain', guide: 'Rain guide' });
    expect(h.state.history[0].data.extensions[0]).not.toHaveProperty('guide');
  });

  it('does not restore a deleted activity or resource', async () => {
    const h = host([lesson()]); const e = extensionHost(h); const pending = e.render()(0);
    h.onUpdateResource('lesson-a', item => ({ ...item, data: { ...item.data, extensions: item.data.extensions.slice(1) } }));
    e.pending[0].resolve('Deleted guide'); await pending;
    expect(h.state.history[0].data.extensions).toHaveLength(1);
    expect(h.state.history[0].data.extensions[0]).not.toHaveProperty('guide');
    const next = e.render()(0);
    h.state.history = []; h.state.generatedContent = null;
    e.pending[1].resolve('Deleted resource guide'); await next;
    expect(h.state.history).toEqual([]); expect(h.state.generatedContent).toBeNull();
  });

  it('clears request ownership after failure and permits a retry', async () => {
    const h = host([lesson()]); const e = extensionHost(h); const pending = e.render()(0);
    e.pending[0].reject(new Error('AI unavailable')); await pending;
    expect(e.requests.current.size).toBe(0); expect(e.busy.value[0]).toBe(false);
    expect(e.addToast).toHaveBeenLastCalledWith('toasts.guide_generate_failed', 'error');
    const retry = e.render()(0); e.pending[1].resolve('Retry guide'); await retry;
    expect(h.state.history[0].data.extensions[0].guide).toBe('Retry guide');
  });
});

describe('main resource host: Concept Sort actual async guards', () => {
  it('ignores regeneration that finishes after navigating to another sort with matching item IDs', async () => {
    const a = sortResource(); const h = host([a]); const c = conceptHost(h);
    const pending = c.csRegenerateItem(a.data.items[0], a.data.categories);
    const b = { ...sortResource(), id: 'sort-b' };
    h.state.history.push(b); h.state.generatedContent = b; c.live.current = b.id;
    c.pending[0].resolve({ id: 'other', content: 'Late AI', categoryId: 'other' }); await pending;
    expect(h.state.generatedContent).toBe(b);
    expect(h.state.history[0].data.items[0].content).toBe('Ice');
  });

  it('invalidates regeneration when the teacher edits the item text', async () => {
    const a = sortResource(); const h = host([a]); const c = conceptHost(h);
    const pending = c.csRegenerateItem(a.data.items[0], a.data.categories);
    const guard = c.handleGenerateConceptItem.mock.calls[0][3];
    expect(guard()).toBe(true);
    c.csUpdateItemText('item-a', '  Teacher choice  ');
    expect(guard()).toBe(false);
    c.pending[0].resolve({ content: 'Late AI' }); await pending;
    expect(h.state.generatedContent.data.items[0].content).toBe('Teacher choice');
    expect(h.state.history[0].data.items[0].content).toBe('Teacher choice');
  });

  it('does not recreate a deleted item from late regeneration', async () => {
    const a = sortResource(); const h = host([a]); const c = conceptHost(h);
    const pending = c.csRegenerateItem(a.data.items[0], a.data.categories);
    c.csDeleteItem('item-a'); c.pending[0].resolve({ content: 'Late AI' }); await pending;
    expect(h.state.history[0].data.items).toEqual([]);
    expect(h.state.generatedContent.data.items).toEqual([]);
  });

  it('applies a current regeneration while retaining item identity and its teacher-selected category', async () => {
    const a = sortResource(); const h = host([a]); const c = conceptHost(h);
    const pending = c.csRegenerateItem(a.data.items[0], a.data.categories);
    c.pending[0].resolve({ id: 'AI-id', content: 'Frozen water', categoryId: 'AI-category' }); await pending;
    expect(h.state.history[0].data.items[0]).toMatchObject({ id: 'item-a', content: 'Frozen water', categoryId: 'category-a' });
    expect(c.setCsBusyId).toHaveBeenLastCalledWith(null);
  });

  it('persists an accepted queued edit to its original history without changing a newly active resource', () => {
    const a = sortResource(); const h = host([a], a, '', true); const c = conceptHost(h);
    c.csUpdateData(data => ({ ...data, title: 'Late update' }), a.id);
    const quiz = { id: a.id, type: 'quiz', data: { title: 'Quiz' } };
    h.state.generatedContent = quiz; h.flush();
    expect(h.state.generatedContent).toBe(quiz);
    expect(h.state.history[0].data.title).toBe('Late update');
  });

  it('rejects a targeted edit invoked after navigation to a different resource', () => {
    const a = sortResource(); const h = host([a]); const c = conceptHost(h);
    h.state.generatedContent = { id: 'sort-b', type: 'concept-sort', data: {} };
    expect(c.csUpdateData(data => ({ ...data, title: 'Late update' }), a.id)).toBe(false);
    h.state.generatedContent = { id: a.id, type: 'quiz', data: {} };
    expect(c.csUpdateData(data => ({ ...data, title: 'Late update' }), a.id)).toBe(false);
    expect(h.state.history[0]).toBe(a);
  });

  it('preserves history-only metadata while editing an active sort', () => {
    const active = sortResource(); const stored = { ...active, unitId: 'unit-a', teacherNotes: 'Saved metadata' };
    const h = host([stored], active); const c = conceptHost(h);
    c.csUpdateItemText('item-a', 'Snow');
    expect(h.state.history[0]).toMatchObject({ unitId: 'unit-a', teacherNotes: 'Saved metadata', data: { items: [{ content: 'Snow' }] } });
  });

  it('clears an item image without throwing and persists the result', () => {
    const h = host([sortResource()]); const c = conceptHost(h);
    expect(() => c.csClearItemImage('item-a')).not.toThrow();
    expect(h.state.generatedContent.data.items[0]).not.toHaveProperty('image');
    expect(h.state.history[0].data.items[0]).not.toHaveProperty('image');
    expect(h.state.generatedContent.data.items[0].content).toBe('Ice');
  });
});


describe('main resource host: Concept Sort image generation ownership', () => {
  it('discards a generated image after navigation', async () => {
    const a = sortResource(); const h = host([a]); const c = conceptHost(h);
    const pending = c.csRegenerateItemImage(a.data.items[0]);
    const quiz = { id: 'quiz-next', type: 'quiz', data: [] };
    h.state.generatedContent = quiz; c.live.current = '';
    c.imageRequests[0].resolve('data:image/png;base64,bmV3'); await pending;
    expect(h.state.generatedContent).toBe(quiz);
    expect(h.state.history[0].data.items[0].image).toBe(a.data.items[0].image);
    expect(c.addToast).not.toHaveBeenCalled();
  });

  it('silences a canceled image generation failure after navigation', async () => {
    const a = sortResource(); const h = host([a]); const c = conceptHost(h);
    const pending = c.csRegenerateItemImage(a.data.items[0]);
    h.state.generatedContent = { id: 'quiz-next', type: 'quiz', data: [] }; c.live.current = '';
    c.imageRequests[0].reject(new Error('Canceled request failed late')); await pending;
    expect(c.addToast).not.toHaveBeenCalled();
  });

  it('retains the newer image when generation requests resolve out of order', async () => {
    const a = sortResource(); const h = host([a]); const c = conceptHost(h);
    const old = c.csRegenerateItemImage(a.data.items[0]);
    const newer = c.csRegenerateItemImage(a.data.items[0]);
    c.imageRequests[1].resolve('data:image/png;base64,bmV3'); await newer;
    c.imageRequests[0].resolve('data:image/png;base64,b2xk'); await old;
    expect(h.state.generatedContent.data.items[0].image).toBe('data:image/png;base64,bmV3');
    expect(h.state.history[0].data.items[0].image).toBe('data:image/png;base64,bmV3');
  });
});


describe('main resource host: learner studio boundaries and Notebook wiring', () => {
  const kinds = ['note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge'];
  const entries = () => kinds.map((type, index) => ({ id: 'studio-' + index, type, data: { notes: 'PRIVATE template notes' } }));
  const quiz = { id: 'quiz', type: 'quiz', data: [] };
  function notebookHistory(history, isTeacherMode = false, studio = null, studentResponses = {}) {
    const begin = source.indexOf('history: history.map(item => {', source.indexOf('{showNotebook &&'));
    const end = source.indexOf('onSelectEntry:', begin);
    if (begin < 0 || end < 0) throw new Error('Notebook history mapping boundary missing');
    const expression = source.slice(begin + 'history: '.length, end).trim().replace(/,\s*$/, '');
    return new Function('history', 'window', 'isTeacherMode', 'studentResponses', 'return ' + expression)(history, { AlloModules: { StudioResponse: studio } }, isTeacherMode, studentResponses);
  }
  function exportHistory(history, isTeacherMode = false, studio = null, studentResponses = {}) {
    return actual('getExportableHistory', '  const _getBuilderHistorySignature =', {
      history, NON_EXPORTABLE_TYPES: new Set(), window: { AlloModules: { StudioResponse: studio } }, isTeacherMode, studentResponses
    })();
  }
  function submissionParts(history, studentResponses, studio = null) {
    const begin = source.indexOf('      const relevantTypes = [', source.indexOf('  const handleSubmitAssignment ='));
    const end = source.indexOf('      const submissionData =', begin);
    if (begin < 0 || end < 0) throw new Error('Submission data boundary missing');
    return new Function('history', 'studentResponses', 'window', 'sanitizeSubmissionData', source.slice(begin, end) + '\nreturn {cleanContent,submissionResponses};')(
      history, studentResponses, { AlloModules: { StudioResponse: studio } }, items => structuredClone(items)
    );
  }

  it('omits all four learner studio types from Notebook and export while the response module is unavailable', () => {
    const history = [...entries(), quiz];
    expect(notebookHistory(history)).toEqual([quiz]);
    expect(exportHistory(history)).toEqual([quiz]);
  });

  it('keeps educator Notebook and export entries available without the learner response module', () => {
    const history = [...entries(), quiz];
    expect(notebookHistory(history, true)).toEqual(history);
    expect(exportHistory(history, true)).toEqual(history);
  });

  it('projects learner Notebook fields and prefers the export-specific projection', () => {
    const history = entries();
    const responses = Object.fromEntries(history.map(item => [item.id, { studio: { response: 'Learner work' } }]));
    const project = vi.fn((item, response) => ({ ...item, data: response }));
    const projectForExport = vi.fn((item, response) => ({ ...item, data: { response: response.response, exported: true } }));
    const studio = { supports: type => kinds.includes(type), project, projectForExport };
    const shelf = notebookHistory(history, false, studio, responses);
    const exported = exportHistory(history, false, studio, responses);
    expect(project).toHaveBeenCalledTimes(4); expect(projectForExport).toHaveBeenCalledTimes(4);
    expect(shelf.every(item => item.data.response === 'Learner work')).toBe(true);
    expect(exported.every(item => item.data.exported === true)).toBe(true);
    expect(JSON.stringify([shelf, exported])).not.toContain('PRIVATE');
  });

  it('selects the canonical saved resource when the Notebook displays a response projection', () => {
    const canonical = entries()[0]; const projection = { ...canonical, data: { notes: 'Learner work' } };
    const setGeneratedContent = vi.fn(); const setActiveView = vi.fn(); const setShowNotebook = vi.fn();
    const select = actual('handleSelectNotebookEntry', '  const fetchCloudHistory =', {
      React: { useCallback }, history: [canonical], setGeneratedContent, setActiveView, setShowNotebook
    });
    select(projection);
    expect(setGeneratedContent).toHaveBeenCalledExactlyOnceWith(canonical);
    expect(setActiveView).toHaveBeenCalledExactlyOnceWith('note-taking');
    expect(setShowNotebook).toHaveBeenCalledExactlyOnceWith(false);
    select({ id: 'deleted', type: 'note-taking' });
    expect(setGeneratedContent).toHaveBeenCalledTimes(1);
  });

  it('does not export raw studio responses through either submission lane when the module is unavailable', () => {
    const history = [...entries(), quiz];
    const responses = Object.fromEntries(history.map(item => [item.id, item.type === 'quiz' ? { 0: 'Quiz answer' } : { studio: { notes: 'PRIVATE raw work', image: 'data:image/png;base64,big' } }]));
    const result = submissionParts(history, responses);
    expect(result.cleanContent).toEqual([quiz]);
    expect(result.submissionResponses.quiz).toEqual({ 0: 'Quiz answer' });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(JSON.stringify(result)).not.toContain('data:image');
  });

  it('routes studio submission content and response aliases through the bounded adapter', () => {
    const history = entries();
    const responses = Object.fromEntries(history.map(item => [item.id, { studio: { notes: 'PRIVATE raw notes' } }]));
    const toSubmission = vi.fn(item => ({ id: item.id, type: item.type, data: { response: 'Allowed learner work' } }));
    const toResponseEntries = vi.fn(item => ({ [item.id]: { studio: { response: 'Allowed learner work' } } }));
    const result = submissionParts(history, responses, { supports: type => kinds.includes(type), toSubmission, toResponseEntries });
    expect(toSubmission).toHaveBeenCalledTimes(4); expect(toResponseEntries).toHaveBeenCalledTimes(4);
    expect(result.cleanContent).toHaveLength(4);
    expect(Object.keys(result.submissionResponses)).toHaveLength(4);
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(result.submissionResponses['studio-0'].studio.response).toBe('Allowed learner work');
  });
});

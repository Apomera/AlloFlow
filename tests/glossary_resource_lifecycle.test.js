import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { React } from './helpers/games_live_harness.js';

let helpers, phase;
beforeAll(() => {
  window.React = React;
  loadAlloModule('glossary_helpers_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  helpers = window.AlloModules.GlossaryHelpers;
  phase = window.AlloModules.PhaseNHelpers;
});
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const glossary = (id = 'a') => ({ id, type: 'glossary', data: [
  { entryId: 'river', term: 'Bank', def: 'The edge of a river.', image: 'data:image/png;base64,river' },
  { entryId: 'money', term: 'Bank', def: 'A financial institution.', image: 'data:image/png;base64,money' },
] });
function fixture(resource = glossary()) {
  const state = { resource, history: [resource] };
  const deps = {
    generatedContent: resource, history: state.history,
    getGlossaryLive: () => state, glossaryTaskRegistry: new Map(),
    setGeneratedContent: vi.fn(update => { state.resource = typeof update === 'function' ? update(state.resource) : update; }),
    setHistory: vi.fn(update => { state.history = typeof update === 'function' ? update(state.history) : update; }),
    setIsGeneratingTermImage: vi.fn(), setIsGeneratingEtymology: vi.fn(), setGlossaryRefinementInputs: vi.fn(),
    setIsAddingTerm: vi.fn(), setNewGlossaryTerm: vi.fn(),
    glossaryRefinementInputs: { 'entry:river': 'Make the river wider' },
    glossaryImageStyle: '', universalImageStyle: '', autoRemoveWords: false,
    gradeLevel: '5th Grade', selectedLanguages: [], leveledTextLanguage: 'English',
    newGlossaryTerm: 'Leaf', cleanJson: value => value, addToast: vi.fn(), t: key => key,
    warnLog: vi.fn(), callGemini: vi.fn(), callImagen: vi.fn(), callGeminiImageEdit: vi.fn(),
  };
  deps._alloBeginGlossaryTask = (index, fields, channel) => helpers.beginGlossaryTask(deps, index, fields, channel);
  return { state, deps };
}
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
function handler(name, nextName, deps) {
  const start = host.indexOf('  const ' + name + ' =');
  const end = host.indexOf('  const ' + nextName + ' =', start);
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  return new Function('deps', 'with (deps) { ' + host.slice(start, end) + '; return ' + name + '; }')(deps);
}

describe('resource-bound glossary updates', () => {
  it('finishes an image for A in history without changing visible glossary B with the same term', async () => {
    const { state, deps } = fixture(), image = deferred();
    deps.callImagen.mockReturnValue(image.promise);
    const run = handler('handleGenerateTermImage', 'handleGenerateTermEtymology', deps)(0, 'Bank');
    const other = glossary('b'); state.resource = other; state.history.push(other);
    image.resolve('new-river-image'); await run;
    expect(state.resource).toBe(other);
    expect(state.history[0].data[0].image).toBe('new-river-image');
    expect(state.history[1].data[0].image).toBe('data:image/png;base64,river');
    expect(deps.addToast).not.toHaveBeenCalled();
  });
  it('tracks an entry through reordering and preserves an unrelated edit', async () => {
    const { state, deps } = fixture(), image = deferred(); deps.callImagen.mockReturnValue(image.promise);
    const run = handler('handleGenerateTermImage', 'handleGenerateTermEtymology', deps)(0, 'Bank');
    state.resource = { ...state.resource, title: 'My revised glossary', data: [state.resource.data[1], { ...state.resource.data[0], tier: 'Academic' }] };
    state.history[0] = state.resource;
    image.resolve('river-final'); await run;
    expect(state.resource.title).toBe('My revised glossary');
    expect(state.resource.data[0].image).toBe('data:image/png;base64,money');
    expect(state.resource.data[1]).toMatchObject({ image: 'river-final', tier: 'Academic' });
  });
  it.each(['deleted entry', 'edited definition', 'replaced image', 'deleted resource'])('discards an obsolete image after %s', async change => {
    const { state, deps } = fixture(), image = deferred(); deps.callImagen.mockReturnValue(image.promise);
    const run = handler('handleGenerateTermImage', 'handleGenerateTermEtymology', deps)(0, 'Bank');
    if (change === 'deleted resource') { state.resource = null; state.history = []; }
    else {
      const data = state.resource.data.slice();
      if (change === 'deleted entry') data.shift();
      if (change === 'edited definition') data[0] = { ...data[0], def: 'A different meaning.' };
      if (change === 'replaced image') data[0] = { ...data[0], image: 'teacher-upload' };
      state.resource = { ...state.resource, data }; state.history[0] = state.resource;
    }
    const expected = JSON.stringify(state);
    image.resolve('obsolete-image'); await run;
    expect(JSON.stringify(state)).toBe(expected);
  });
  it('a newer image request wins even if the old provider ignores cancellation', async () => {
    const { state, deps } = fixture(), first = deferred(), second = deferred();
    deps.callImagen.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const generate = handler('handleGenerateTermImage', 'handleGenerateTermEtymology', deps);
    const old = generate(0, 'Bank'), latest = generate(0, 'Bank');
    expect(deps.callImagen.mock.calls[0][3].signal.aborted).toBe(true);
    second.resolve('latest-image'); await latest;
    first.resolve('old-image'); await old;
    expect(state.resource.data[0].image).toBe('latest-image');
  });
  it('image refinement does not restore the old resource or overwrite later text edits', async () => {
    const { state, deps } = fixture(), image = deferred(); deps.callGeminiImageEdit.mockReturnValue(image.promise);
    const run = handler('handleRefineGlossaryImage', 'handleRefineImage', deps)(0);
    state.resource = { ...state.resource, data: state.resource.data.map((entry, index) => index ? { ...entry, def: 'My improved financial definition.' } : entry) };
    state.history[0] = state.resource;
    image.resolve('refined-river'); await run;
    expect(state.resource.data[0].image).toBe('refined-river');
    expect(state.resource.data[1].def).toBe('My improved financial definition.');
  });
  it('word roots update the original duplicate entry after switching resources', async () => {
    const { state, deps } = fixture(), text = deferred(); deps.callGemini.mockReturnValue(text.promise);
    const run = helpers.handleGenerateTermEtymology(1, 'Bank', deps);
    const other = glossary('b'); state.resource = other; state.history.push(other);
    text.resolve(JSON.stringify({ prosePerLanguage: { English: 'From a word meaning bench.' }, roots: [] })); await run;
    expect(state.resource).toBe(other);
    expect(state.history[0].data[0].etymology).toBeUndefined();
    expect(state.history[0].data[1].etymology).toBe('From a word meaning bench.');
  });
  it('keeps a completed task valid for queued React updaters', () => {
    const { deps } = fixture(); deps.setGeneratedContent = vi.fn(); deps.setHistory = vi.fn();
    const task = helpers.beginGlossaryTask(deps, 0, ['image'], 'image');
    task.commit(() => ({ image: 'queued' })); task.finish();
    expect(deps.setGeneratedContent.mock.calls[0][0](deps.generatedContent).data[0].image).toBe('queued');
  });
});

describe('adding terms while navigating', () => {
  it('uses legacy IDs consistently for the refinement draft and busy state', async () => {
    const resource = glossary(); resource.data[0] = { ...resource.data[0], id: 'legacy' }; delete resource.data[0].entryId;
    const { state, deps } = fixture(resource); deps.glossaryRefinementInputs = { 'id:legacy': 'Wider river' }; deps.callGeminiImageEdit.mockResolvedValue('refined');
    await handler('handleRefineGlossaryImage', 'handleRefineImage', deps)(0);
    expect(state.resource.data[0].image).toBe('refined');
    expect(deps.setIsGeneratingTermImage.mock.calls[0][0]({})).toEqual({ 'id:legacy': true });
  });
  it.each(['same word', 'different words'])('keeps Add busy until overlapping requests finish: %s', async kind => {
    const { deps } = fixture(), first = deferred(), second = deferred();
    deps.callGemini.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise); deps.callImagen.mockResolvedValue('leaf');
    const old = phase.handleAddGlossaryTerm(deps);
    const latest = phase.handleAddGlossaryTerm({ ...deps, newGlossaryTerm: kind === 'same word' ? 'Leaf' : 'Root' });
    deps.setIsAddingTerm.mockClear();
    first.resolve(JSON.stringify({ term: 'Leaf', def: 'A plant part.' })); await old;
    expect(deps.setIsAddingTerm).not.toHaveBeenCalledWith(false);
    second.resolve(JSON.stringify({ term: 'Root', def: 'Another plant part.' })); await latest;
    expect(deps.setIsAddingTerm).toHaveBeenLastCalledWith(false);
  });

  it('Quick Add targets the glossary visible at invocation, not the newest one in history', async () => {
    const { state, deps } = fixture(), text = deferred(); deps.callGemini.mockReturnValue(text.promise); deps.callImagen.mockResolvedValue('leaf-image');
    const run = phase.handleQuickAddGlossary('葉', true, deps);
    const other = glossary('b'); state.history.push(other); state.resource = other;
    text.resolve(JSON.stringify({ term: 'Leaf', def: 'A part of a plant.' })); await run;
    expect(deps.callGemini.mock.calls[0][0]).toContain('葉');
    expect(state.history[0].data.at(-1).term).toBe('Leaf');
    expect(state.history[1].data).toHaveLength(2);
    expect(state.resource).toBe(other);
  });
  it('Add preserves edits made while its image is generated and does not clear a newer draft', async () => {
    const { state, deps } = fixture(), image = deferred();
    deps.callGemini.mockResolvedValue(JSON.stringify({ term: 'Leaf', def: 'A part of a plant.' })); deps.callImagen.mockReturnValue(image.promise);
    const run = phase.handleAddGlossaryTerm(deps); await Promise.resolve(); await Promise.resolve();
    state.resource = { ...state.resource, title: 'Edited title', data: state.resource.data.slice(1) }; state.history[0] = state.resource;
    image.resolve('leaf-image'); await run;
    expect(state.resource.title).toBe('Edited title');
    expect(state.resource.data.map(item => item.entryId || item.term)).toEqual(['money', 'Leaf']);
    expect(deps.setNewGlossaryTerm.mock.calls[0][0]('Next draft')).toBe('Next draft');
  });
  it('does not resurrect a deleted glossary when an add request finishes', async () => {
    const { state, deps } = fixture(), text = deferred(); deps.callGemini.mockReturnValue(text.promise);
    const run = phase.handleAddGlossaryTerm(deps); state.resource = null; state.history = [];
    text.resolve(JSON.stringify({ term: 'Leaf', def: 'A plant part.' })); await run;
    expect(state.history).toEqual([]); expect(state.resource).toBeNull(); expect(deps.callImagen).not.toHaveBeenCalled();
  });
});

describe('shared generation display ownership', () => {
  function setters(queued = false) {
    const owner = {}, ref = { current: owner }; let resource = glossary(), view = 'glossary';
    const displayed = { current: { resource, view } };
    const contentQueue = [], viewQueue = [];
    const contentSetter = fn => queued ? contentQueue.push(fn) : resource = fn(resource);
    const viewSetter = fn => queued ? viewQueue.push(fn) : view = fn(view);
    const start = host.indexOf('  const setGeneratedContent = useCallback('), end = host.indexOf('\n  //', start);
    const setGeneratedContent = new Function('_setGeneratedContent', 'generationViewOwnerRef', 'generationDisplayStateRef', 'useCallback', 'ensureArtifactInstanceId', host.slice(start, end) + ';return setGeneratedContent;')(contentSetter, ref, displayed, fn => fn, value => value);
    const viewStart = host.indexOf('  const setActiveView = useCallback('), viewEnd = host.indexOf('\n  const [showReadThisPage', viewStart);
    const setActiveView = new Function('_setActiveView', 'generationViewOwnerRef', 'generationDisplayStateRef', 'useCallback', host.slice(viewStart, viewEnd) + ';return setActiveView;')(viewSetter, ref, displayed, fn => fn);
    return { owner, ref, setGeneratedContent, setActiveView, read: () => ({ resource, view }), flush: () => { contentQueue.forEach(fn => { resource = fn(resource); }); viewQueue.forEach(fn => { view = fn(view); }); } };
  }
  it('revokes display ownership before queued navigation updates flush', () => {
    const state = setters(true);
    state.setActiveView('history');
    state.setGeneratedContent(glossary('late'), state.owner);
    state.flush();
    expect(state.read().resource.id).toBe('a');
    expect(state.read().view).toBe('history');
  });
  it('user resource selection prevents a delayed generation display overwrite', () => {
    const state = setters(), other = glossary('b'); state.setGeneratedContent(other);
    state.setGeneratedContent(glossary('late'), state.owner); state.setActiveView('image', state.owner);
    expect(state.read()).toEqual({ resource: other, view: 'glossary' });
  });
  it('user navigation prevents generation from forcing its view back', () => {
    const state = setters(); state.setActiveView('history'); state.setActiveView('glossary', state.owner);
    expect(state.read().view).toBe('history');
  });
  it('an unrelated no-op background update does not revoke the running generation', () => {
    const state = setters(); state.setGeneratedContent(previous => previous);
    expect(state.ref.current).toBe(state.owner);
    state.setGeneratedContent(glossary('result'), state.owner); state.setActiveView('glossary', state.owner);
    expect(state.read().resource.id).toBe('result');
  });
});

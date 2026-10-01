import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// "Save and continue" (2026-09-28): a step queued behind unsaved word help is
// replayed after the save. It was built from the item as it was when queued,
// so it wrote the old word help back over the explanation just saved. These
// tests run the CURRENT sources (the reader and host handlers are compiled here),
// so they do not depend on when the shared modules were last built.
const require = createRequire(import.meta.url);
const read = (env, file) => readFileSync(process.env[env] || file, 'utf8');
let React, createRoot, act, contract, drafts, View, pure, phase, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('alt_text_module.js');
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  const { INPUTS, renderReaderModule } = require(resolve('dev-tools/lib/reader_compiler.cjs'));
  const reader = process.env.REPLAY_VIEW_MODULE ? readFileSync(process.env.REPLAY_VIEW_MODULE, 'utf8')
    : renderReaderModule(INPUTS.map(file => read(file === 'reader_support_drafts.js' ? 'REPLAY_DRAFTS' : 'REPLAY_NONE', file)));
  delete window.AlloModules.SimplifiedView;
  new Function(reader)();
  contract = window.AlloModules.InstructionalContext; drafts = window.AlloModules.ReaderSupportDrafts; View = window.AlloModules.SimplifiedView;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
}, 120000);
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; });

const PASSAGE = 'The heron walked slowly in the shallow water.';
const byText = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const click = node => act(async () => { if (!node) throw new Error('Missing control'); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const type = (node, value) => act(() => { node.focus(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });

describe('the reader replays queued steps onto the saved item', () => {
  function mount(extra = () => ({})) {
    const source = contract.createSupportedReading('The heron walked through the shallow water.', { id: 'original', sourceFamilyId: 'birds' });
    const adapted = { id: 'adapted', _artifactInstanceId: 'artifact-adapted-1', type: 'simplified', data: PASSAGE, sourceSnapshot: source.sourceSnapshot, sourceFamilyId: 'birds',
      instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English' },
      relevel: { fromText: 'The heron walked slowly in the shallow water today.', direction: 'simpler', measuredBefore: 6, measuredAfter: 3, targetGrade: '3' } };
    adapted.adaptedReadingSupports = contract.upsertAdaptedReadingSupport(adapted, undefined, { id: 'heron', start: 4, end: 9, quote: 'heron', text: 'A wading bird.', origin: 'educator' });
    const sessionRef = { current: drafts.createSession() };
    const state = { item: adapted, history: [source, adapted] };
    const commit = work => { work(); render(); };
    const onUpdate = async (owner, action) => {
      const live = state.history.find(item => item.id === owner.id);
      const saved = contract.upsertAdaptedReadingSupport(live, live.adaptedReadingSupports, action.annotation);
      state.history = state.history.map(item => item.id === owner.id ? { ...item, adaptedReadingSupports: saved } : item);
      state.item = state.history.find(item => item.id === state.item.id) || state.item; render();
      return saved;
    };
    const noop = () => {};
    const props = () => ({ ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop,
      setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop,
      t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: true,
      isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: false, isProcessing: false, isPlaying: false,
      interactionMode: 'read', history: state.history, textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
      handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop,
      isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr',
      isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text),
      formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [] }),
      SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: value => value, latestGlossary: [], generatedContent: state.item,
      supportDraftSessionRef: sessionRef, onUpdateReadingSupports: onUpdate, onGenerateReadingSupports: async () => null,
      setGeneratedContent: item => commit(() => { state.item = typeof item === 'function' ? item(state.item) : item; }),
      setHistory: update => commit(() => { state.history = typeof update === 'function' ? update(state.history) : update; }), ...extra(state) });
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    function render() { root.render(React.createElement(View, props())); }
    act(render);
    return { state, session: sessionRef.current };
  }

  it('keeps an explanation saved through "Save and continue" before Undo re-level', async () => {
    const view = mount();
    await click(host.querySelector('button[aria-label^="Edit gloss for heron"]'));
    type(host.querySelector('[data-gloss-draft] textarea'), 'A tall bird that wades in water.');
    expect(view.session.hasChanges()).toBe(true);
    await click(byText('simplified.relevel_undo'));
    expect(host.querySelector('[role=alertdialog]')).toBeTruthy();
    await click(byText('Save and continue'));
    const row = view.state.history.find(item => item.id === 'adapted');
    for (const item of [row, view.state.item]) {
      expect(item.data).toBe('The heron walked slowly in the shallow water today.');
      expect(item.relevel).toBeUndefined();
      expect(item.adaptedReadingSupports.annotations.map(entry => entry.text)).toEqual(['A tall bird that wades in water.']);
    }
  });

  it('keeps an explanation saved through "Save and continue" before applying a previewed adaptation', async () => {
    const NEW = 'The heron walked slowly. It stayed in the shallow water.';
    let atPreview = null;
    // Like the host, the new version is built from the item as it was at Preview.
    const handleComplexityAdjustment = async plan => {
      if (plan.preview) {
        atPreview = view.state.item;
        return { status: 'preview', resourceId: atPreview.id, baseData: atPreview.data, data: NEW, vocabulary: { version: 1, valid: true }, config: {}, changeLabel: 'Adjusted' };
      }
      const accepted = await plan.commit({ item: { ...atPreview, data: NEW }, baseId: atPreview.id, baseData: atPreview.data, keepOriginal: false });
      return accepted ? { status: 'applied', previousId: atPreview.id, newId: atPreview.id, data: NEW } : { status: 'stale' };
    };
    const view = mount(() => ({ handleComplexityAdjustment, isTeacherToolbarExpanded: true, complexityLevel: 5 }));
    await click(host.querySelector('[data-adapt-option="shorterSentences"]'));
    await click(host.querySelector('[data-apply-complexity]'));
    expect(host.querySelector('[data-adaptation-apply]')).toBeTruthy();
    await click(host.querySelector('button[aria-label^="Edit gloss for heron"]'));
    type(host.querySelector('[data-gloss-draft] textarea'), 'A tall bird that wades in water.');
    await click(host.querySelector('[data-adaptation-apply]'));
    expect(host.querySelector('[role=alertdialog]')).toBeTruthy();
    await click(byText('Save and continue'));
    await act(async () => {});
    const row = view.state.history.find(item => item.id === 'adapted');
    for (const item of [view.state.item, row]) {
      expect(item.data).toBe(NEW);
      expect(item.adaptedReadingSupports.annotations.map(entry => entry.text)).toEqual(['A tall bird that wades in water.']);
    }
  });
});

describe('the draft session tells a replayed step which item it was queued against', () => {
  it('exposes the queued item only while that step replays', () => {
    const session = drafts.createSession();
    let dirty = true, deferred = null, seen = 'unset';
    session.register({ hasChanges: () => dirty, defer: action => { deferred = action; } });
    expect(session.request(() => { seen = session.replayBase(); }, { id: 'queued' })).toBe(false);
    expect(session.replayBase()).toBe(null);
    dirty = false;
    deferred.run();
    expect(seen).toEqual({ id: 'queued' });
    expect(session.replayBase()).toBe(null);
    // A step that is not queued runs at once, with no replay item.
    session.request(() => { seen = session.replayBase(); }, { id: 'now' });
    expect(seen).toBe(null);
  });
});

describe('host writes replayed after "Save and continue"', () => {
  const ANTI = () => read('REPLAY_ANTI', 'AlloFlowANTI.txt');
  const slice = (source, from, to) => {
    const start = source.indexOf(from), end = source.indexOf(to, start);
    if (start < 0 || end < 0) throw new Error('Missing host source: ' + from);
    return source.slice(start, end);
  };
  const getArtifactInstanceId = item => item && typeof item._artifactInstanceId === 'string' ? item._artifactInstanceId : '';
  const carryFrom = source => new Function('getArtifactInstanceId', slice(source, 'const _alloCarrySavedSupports =', 'const findArtifactInstanceIndex') + '\nreturn _alloCarrySavedSupports;')(getArtifactInstanceId);
  const envelope = text => ({ schemaVersion: 1, annotations: [{ id: 'h', start: 4, end: 9, quote: 'heron', text }], shown: false });

  it('carries word help saved in between, and only onto the same copy', () => {
    const carry = carryFrom(ANTI());
    const base = { id: 'a', _artifactInstanceId: 'artifact-aaaaaaaa', data: 'old', adaptedReadingSupports: envelope('Before') };
    const live = { ...base, adaptedReadingSupports: envelope('Saved') };
    const restored = { ...base, data: 'restored' };
    expect(carry(base, live, restored)).toMatchObject({ data: 'restored', adaptedReadingSupports: envelope('Saved') });
    // A write that brings its own word help (another version) keeps it.
    const other = { ...base, data: 'v2', adaptedReadingSupports: envelope('Version two') };
    expect(carry(base, live, other).adaptedReadingSupports).toEqual(envelope('Version two'));
    // Another copy with the same public id, or another resource, is left alone.
    expect(carry(base, { ...live, _artifactInstanceId: 'artifact-bbbbbbbb' }, restored)).toBe(restored);
    expect(carry(base, live, { ...restored, id: 'b' }).adaptedReadingSupports).toEqual(envelope('Before'));
    // Removing the help while the step waited stays removed.
    const { adaptedReadingSupports, ...cleared } = live;
    expect('adaptedReadingSupports' in carry(base, cleared, restored)).toBe(false);
  });

  it('setGeneratedContent keeps the saved word help on a replayed object write', () => {
    const source = ANTI();
    const session = drafts.createSession();
    let dirty = true, deferred = null;
    session.register({ hasChanges: () => dirty, defer: action => { deferred = action; } });
    const base = { id: 'a', _artifactInstanceId: 'artifact-aaaaaaaa', type: 'simplified', data: 'old', adaptedReadingSupports: envelope('Before') };
    const state = { content: base };
    const generationDisplayStateRef = { current: { resource: base } };
    const supportDraftSessionRef = { current: session };
    const requestReadingSupportTransition = run => session.request(run, generationDisplayStateRef.current.resource);
    const setter = new Function('_setGeneratedContent', 'generationViewOwnerRef', 'generationDisplayStateRef', 'useCallback', 'ensureArtifactInstanceId', 'supportDraftSessionRef', 'requestReadingSupportTransition', '_alloCarrySavedSupports',
      slice(source, '  const setGeneratedContent = useCallback((nextContent, generationOwner = null) => {', '  // ── Process Provenance') + ';return setGeneratedContent;')(
      update => { state.content = typeof update === 'function' ? update(state.content) : update; generationDisplayStateRef.current.resource = state.content; },
      { current: null }, generationDisplayStateRef, fn => fn, value => value, supportDraftSessionRef, requestReadingSupportTransition, carryFrom(source));
    setter({ ...base, data: 'restored' });
    expect(state.content).toBe(base);
    // The teacher saves; then the queued write replays.
    state.content = { ...base, adaptedReadingSupports: envelope('Saved') };
    dirty = false;
    deferred.run();
    expect(state.content).toMatchObject({ data: 'restored', adaptedReadingSupports: envelope('Saved') });
  });

  it('a text change waits as ONE step behind unsaved word help, then applies to the live item', () => {
    const source = ANTI();
    const session = drafts.createSession();
    let dirty = true, deferred = null;
    session.register({ hasChanges: () => dirty, defer: action => { deferred = action; } });
    const item = { id: 'a', _artifactInstanceId: 'artifact-aaaaaaaa', type: 'simplified', data: 'old text', instructionalText: { form: 'adapted' }, adaptedReadingSupports: envelope('Before') };
    const copy = { ...item, _artifactInstanceId: 'artifact-bbbbbbbb' };
    const state = { content: item, history: [item, copy] };
    const change = new Function('supportDraftSessionRef', 'requestReadingSupportTransition', 'generatedContent', 'addToast', '_recordTextChange', 'getArtifactInstanceId', '_alloArtifactMatchesInstanceId', '_applySimplifiedTextMutation', 'setGeneratedContent', 'setHistory',
      slice(source, '  const handleSimplifiedTextChange = (value) => {', '  const handleSelectReadingSource =') + ';return handleSimplifiedTextChange;')(
      { current: session }, run => session.request(run, state.content), item, () => {}, () => {}, getArtifactInstanceId,
      (candidate, instanceId) => candidate._artifactInstanceId === instanceId, (current, value) => ({ ...current, data: value }),
      update => { state.content = typeof update === 'function' ? update(state.content) : update; },
      update => { state.history = typeof update === 'function' ? update(state.history) : update; });
    expect(change('new text')).toBe(false);
    // Nothing changed yet: the screen and the saved copy agree.
    expect(state.content.data).toBe('old text');
    expect(state.history.map(row => row.data)).toEqual(['old text', 'old text']);
    // The teacher saves the explanation, then the change runs.
    const saved = { ...item, adaptedReadingSupports: envelope('Saved') };
    state.content = saved; state.history = [saved, copy];
    dirty = false;
    deferred.run();
    expect(state.content).toMatchObject({ data: 'new text', adaptedReadingSupports: envelope('Saved') });
    expect(state.history[0]).toMatchObject({ data: 'new text', adaptedReadingSupports: envelope('Saved') });
    // Another copy with the same public id keeps its own text.
    expect(state.history[1].data).toBe('old text');
  });
});

describe('word help changes only the copy the teacher has open', () => {
  function realHostHandlers(stateRef) {
    const { buildFirstWaveModule } = require(resolve('_build_first_wave_view_modules.js'));
    delete window.AlloModules.HostHandlers; delete window.AlloModules.createHostHandlers;
    new Function(buildFirstWaveModule('HostHandlers', process.env.REPLAY_HOST_SOURCE ? readFileSync(process.env.REPLAY_HOST_SOURCE, 'utf8') : undefined))();
    return window.AlloModules.createHostHandlers({
      _resourceMutationStateRef: stateRef,
      setHistory: update => { stateRef.current.history = typeof update === 'function' ? update(stateRef.current.history) : update; },
      setGeneratedContent: update => { stateRef.current.generatedContent = typeof update === 'function' ? update(stateRef.current.generatedContent) : update; },
      _alloArtifactMatchesInstanceId: (item, instanceId) => !!item && item._artifactInstanceId === instanceId
    });
  }
  it('updates one copy when told which, and every copy of the id when not (unchanged callers)', () => {
    const one = { id: 'x', type: 'simplified', _artifactInstanceId: 'artifact-aaaaaaaa', data: 'text' };
    const two = { ...one, _artifactInstanceId: 'artifact-bbbbbbbb' };
    const stateRef = { current: { history: [one, two], generatedContent: two, isTeacherMode: true } };
    const handlers = realHostHandlers(stateRef);
    expect(handlers.onUpdateResource('x', item => ({ ...item, mark: 'b' }), { instanceId: 'artifact-bbbbbbbb' })).toBe(true);
    expect(stateRef.current.history.map(row => row.mark)).toEqual([undefined, 'b']);
    expect(stateRef.current.generatedContent.mark).toBe('b');
    expect(handlers.onUpdateResource('x', item => ({ ...item, mark: 'all' }))).toBe(true);
    expect(stateRef.current.history.map(row => row.mark)).toEqual(['all', 'all']);
  }, 120000);
});

describe('an edited reading stays readable', () => {
  it('marks text a teacher writes as plain text, even on a reading whose saved envelope had failed to decode', () => {
    const { buildFirstWaveModule } = require(resolve('_build_first_wave_view_modules.js'));
    delete window.AlloModules.HostHandlers; delete window.AlloModules.createHostHandlers;
    new Function(buildFirstWaveModule('HostHandlers', process.env.REPLAY_HOST_SOURCE ? readFileSync(process.env.REPLAY_HOST_SOURCE, 'utf8') : undefined))();
    const handlers = window.AlloModules.createHostHandlers({ _getFreshTextComplexityEvidence: () => ({ targetGrade: '4', instructionalText: { form: 'adapted' } }) });
    const broken = { id: 'r', type: 'simplified', data: '{"not":"text"}', dataEncoding: 'json-text/v1', instructionalText: { form: 'adapted' } };
    const edited = handlers._applySimplifiedTextMutation(broken, 'The heron walked slowly.');
    expect(edited).toMatchObject({ data: 'The heron walked slowly.', dataEncoding: 'text/v1' });
    // Through the real cloud round trip, the edited text opens again.
    loadAlloModule('firestore_sync_module.js');
    const [back] = window.hydrateHistory(window.sanitizeHistoryForCloud([edited]));
    expect(back.data).toBe('The heron walked slowly.');
    expect(back.dataEncoding).toBe('text/v1');
  }, 120000);
});

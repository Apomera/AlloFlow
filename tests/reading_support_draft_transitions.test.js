import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, contract, View, pure, phase, root, host;
const PASSAGE = 'The heron walked slowly in the shallow water.';
const IMAGE = { src: 'data:image/png;base64,QUJD', alt: 'A heron.', source: 'mulberry', altSource: 'author' };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'))); act = React.act;
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const name of ['instructional_context_module.js', 'alt_text_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'view_simplified_module.js']) loadAlloModule(name);
  contract = window.AlloModules.InstructionalContext; View = window.AlloModules.SimplifiedView;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); });
function fixture({ image, original = false, asyncNavigation = false } = {}) {
  const source = contract.createSupportedReading('The heron walked through the shallow water.', { id: 'original', sourceFamilyId: 'birds' });
  const adapted = { id: 'adapted', _artifactInstanceId: 'adapted-instance', type: 'simplified', data: PASSAGE, sourceSnapshot: source.sourceSnapshot, sourceFamilyId: 'birds', instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English', grade: '3' } };
  const entry = { id: 'heron', start: 4, end: 9, quote: 'heron', text: 'A wading bird.', origin: 'educator', image };
  source.readingSupports = contract.upsertReadingSupport(source, undefined, entry);
  adapted.adaptedReadingSupports = contract.upsertAdaptedReadingSupport(adapted, undefined, entry);
  const sessionRef = { current: window.AlloModules.ReaderSupportDrafts.createSession() };
  const state = { item: original ? source : adapted, history: [source, adapted], teacher: true, compare: false, editing: false, view: 'simplified', mode: 'read' };
  const request = work => sessionRef.current.request(work);
  const commit = work => { work(); render(); };
  const navigate = vi.fn((item, compare = false) => request(() => {
    const open = () => commit(() => { state.item = item; state.compare = compare; state.editing = false; state.view = 'simplified'; });
    return asyncNavigation ? Promise.resolve().then(() => request(open)) : open();
  }));
  const persist = vi.fn(async (owner, action) => {
    const live = state.history.find(item => item.id === owner.id);
    return contract.isAdaptedReading(live) ? contract.upsertAdaptedReadingSupport(live, live.adaptedReadingSupports, action.annotation) : contract.upsertReadingSupport(live, live.readingSupports, action.annotation);
  });
  const onUpdate = vi.fn(async (owner, action) => {
    const saved = await persist(owner, action);
    if (saved) {
      state.history = state.history.map(item => item.id === owner.id ? { ...item, [contract.isAdaptedReading(item) ? 'adaptedReadingSupports' : 'readingSupports']: saved } : item);
      state.item = state.history.find(item => item.id === state.item.id) || state.item; render();
    }
    return saved;
  });
  const generate = vi.fn(async owner => ({ ...owner.adaptedReadingSupports, annotations: owner.adaptedReadingSupports.annotations.map(entry => ({ ...entry, id: 'refreshed-' + entry.id })) }));
  const noop = () => {};
  const props = () => ({ ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop,
    setInteractionMode: mode => commit(() => { state.mode = mode; }), setIsCompareMode: compare => request(() => commit(() => { state.compare = compare; })), setIsFluencyMode: noop,
    stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: () => commit(() => { state.editing = !state.editing; }),
    t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: state.teacher,
    isEditingLeveledText: state.editing, isImmersiveReaderActive: false, isCompareMode: state.compare, isSideBySide: false, isZenMode: false, isProcessing: false, isPlaying: false,
    interactionMode: state.mode, history: state.history, textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null,
    handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop,
    isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr',
    isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: state.item,
    supportDraftSessionRef: sessionRef, onUpdateReadingSupports: onUpdate, onOpenReadingArtifact: navigate, onReadOriginal: () => navigate(source),
    onGenerateReadingSupports: async owner => { const help = await generate(owner); commit(() => { state.item = { ...state.item, adaptedReadingSupports: help }; state.history = state.history.map(item => item.id === state.item.id ? state.item : item); }); return help; }
  });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  function render() { root.render(state.view === 'simplified' ? React.createElement(View, props()) : React.createElement('div', { 'data-other-view': true }, 'Other view')); }
  act(render);
  return { state, source, adapted, session: sessionRef.current, navigate, persist, onUpdate, generate, props,
    open: item => act(() => navigate(item)), role: teacher => act(() => request(() => commit(() => { state.teacher = teacher; }))),
    outside: () => act(() => request(() => commit(() => { state.view = 'other'; }))),
    force: patch => act(() => commit(() => { Object.assign(state, patch); })), rerender: () => act(render) };
}
const byText = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const click = node => act(async () => { if (!node) throw new Error('Missing control'); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const draft = () => host.querySelector('[data-gloss-draft]');
const prompt = () => host.querySelector('[role=alertdialog]');
const type = (node, value) => act(() => { node.focus(); Object.getOwnPropertyDescriptor(node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
async function edit() {
  const toggle = [...host.querySelectorAll('button')].find(node => node.textContent.startsWith('Review word supports'));
  if (toggle && toggle.getAttribute('aria-expanded') === 'false') await click(toggle);
  await click(host.querySelector('button[aria-label^="Edit gloss for heron"]'));
}
async function dirtyExplanation() { await edit(); type(draft().querySelector('textarea'), 'My unsaved explanation.'); }
async function pictureChoice(next = { ...IMAGE, src: 'data:image/png;base64,REVG' }, resize) {
  vi.spyOn(window.AlloModules, 'ClassroomImagePicker').mockImplementation(({ onChoose }) => React.createElement('button', { onClick: () => onChoose({ dataUrl: next.src, ...next }) }, 'Choose fixture picture'));
  vi.spyOn(window.AlloModules.AltText, 'shrinkImageDataUrl').mockImplementation(resize || (async () => next.src));
  await click(byText('Choose a different picture') || byText('Choose a picture'));
  await click(byText('Choose fixture picture'));
}
const transitions = {
  Edit: () => click(host.querySelector('[data-help-key="simplified_edit"]')),
  Both: () => click(host.querySelector('[data-reading-version="both"]')),
  Original: () => click(host.querySelector('[data-reading-version="original"]')),
  'new artifact': async h => h.open({ ...h.adapted, id: 'another', _artifactInstanceId: 'another-instance' }),
  'outside navigation': async h => h.outside(),
  'student role': async h => h.role(false)
};
function replaceHelp(h, help) {
  const item = { ...h.state.item, adaptedReadingSupports: help };
  h.force({ item, history: h.state.history.map(value => value.id === item.id ? item : value) });
}

describe('current support data across editor transitions', () => {
  it('keeps a confirmed save while parent props acknowledge it later', async () => {
    const h = fixture(); await dirtyExplanation(); let accepted;
    h.onUpdate.mockImplementationOnce(async (owner, action) => { accepted = contract.upsertAdaptedReadingSupport(owner, owner.adaptedReadingSupports, action.annotation); return accepted; });
    await click(byText('Save word support')); h.rerender();
    expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.'); expect(h.session.hasChanges()).toBe(false);
    replaceHelp(h, accepted); expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.'); expect(h.session.hasChanges()).toBe(false);
  });
  it.each(['mounted', 'recovered'])('updates an unchanged %s draft from its current exact occurrence', async lifecycle => {
    const h = fixture({ image: IMAGE }); await edit();
    if (lifecycle === 'recovered') h.force({ view: 'other' });
    replaceHelp(h, { ...h.state.item.adaptedReadingSupports, annotations: h.state.item.adaptedReadingSupports.annotations.map(entry => ({ ...entry, id: 'refreshed-heron', text: 'Current saved meaning.', priority: 'essential', image: { ...IMAGE, src: 'data:image/png;base64,REVG' } })) });
    if (lifecycle === 'recovered') h.force({ view: 'simplified' });
    expect(draft().querySelector('textarea').value).toBe('Current saved meaning.');
    expect(draft().querySelector('select').value).toBe('essential'); expect(draft().querySelector('img').getAttribute('src')).toBe('data:image/png;base64,REVG');
    expect(h.session.hasChanges()).toBe(false); await transitions.Both(h); expect(h.state.compare).toBe(true); expect(prompt()).toBeNull();
  });
  it.each(['mounted', 'recovered'])('closes an unchanged %s draft when its support was removed', async lifecycle => {
    const h = fixture(); await edit();
    if (lifecycle === 'recovered') h.force({ view: 'other' });
    replaceHelp(h, contract.removeAdaptedReadingSupport(h.state.item, h.state.item.adaptedReadingSupports, 'heron'));
    if (lifecycle === 'recovered') h.force({ view: 'simplified' });
    expect(draft()).toBeNull(); expect(h.session.hasChanges()).toBe(false); expect(host.textContent).toContain('no longer available');
    expect(h.onUpdate).not.toHaveBeenCalled(); expect(document.activeElement).toBe(byText('Add a word or phrase'));
  });
  it.each(['dirty', 'picker'])('retains %s work when the saved exact occurrence changes', async work => {
    const h = fixture({ image: IMAGE }); await edit();
    if (work === 'dirty') type(draft().querySelector('textarea'), 'Keep my unsaved meaning.');
    else await click(byText('Choose a different picture'));
    replaceHelp(h, { ...h.state.item.adaptedReadingSupports, annotations: h.state.item.adaptedReadingSupports.annotations.map(entry => ({ ...entry, text: 'New saved meaning.', image: null })) });
    expect(draft().querySelector('textarea').value).toBe(work === 'dirty' ? 'Keep my unsaved meaning.' : 'A wading bird.');
    expect(draft().querySelector('img').getAttribute('src')).toBe(IMAGE.src); expect(h.session.hasChanges()).toBe(true);
    if (work === 'picker') expect(byText('Cancel')).toBeTruthy();
    await transitions.Both(h); expect(prompt()).toBeTruthy(); await click(byText('Keep editing')); expect(h.state.compare).toBe(false);
  });
  for (const decision of ['Discard changes', 'Save and continue']) {
    it.each(['refreshed', 'removed'])(`resolves a %s deferred edit target after ${decision}`, async change => {
      const h = fixture(); const start = PASSAGE.indexOf('water');
      replaceHelp(h, contract.upsertAdaptedReadingSupport(h.state.item, h.state.item.adaptedReadingSupports, { id: 'water', start, end: start + 5, quote: 'water', text: 'Older water meaning.' }));
      await dirtyExplanation(); await click(host.querySelector('button[aria-label^="Edit gloss for water"]'));
      const saveResult = deferred();
      if (decision === 'Save and continue') { h.persist.mockReturnValueOnce(saveResult.promise); await click(byText(decision)); }
      const help = h.state.item.adaptedReadingSupports;
      replaceHelp(h, change === 'removed' ? contract.removeAdaptedReadingSupport(h.state.item, help, 'water')
        : { ...help, annotations: help.annotations.map(entry => entry.quote === 'water' ? { ...entry, id: 'refreshed-water', text: 'Current water meaning.' } : entry) });
      if (decision === 'Save and continue') await act(async () => saveResult.resolve(contract.upsertAdaptedReadingSupport(h.state.item, h.state.item.adaptedReadingSupports, h.onUpdate.mock.calls[0][1].annotation)));
      else await click(byText(decision));
      expect(prompt()).toBeNull(); expect(h.state.compare).toBe(false);
      if (change === 'refreshed') {
        expect(draft().querySelector('textarea').value).toBe('Current water meaning.');
        type(draft().querySelector('textarea'), 'My water meaning.'); await click(byText('Save word support'));
        expect(h.onUpdate.mock.lastCall[1].annotation.id).toBe('refreshed-water');
      } else {
        expect(host.textContent).toContain('no longer available'); expect(draft()?.querySelector('input[type="text"]').value).not.toBe('water');
        expect(h.state.item.adaptedReadingSupports.annotations.some(entry => entry.quote === 'water')).toBe(false);
      }
    });
  }
});

describe('deferred reader transitions', () => {
  it.each(['Discard changes', 'Save and continue'])('does not re-prompt when an approved asynchronous opener continues after %s', async decision => {
    const h = fixture({ asyncNavigation: true }); await dirtyExplanation(); await transitions.Both(h); await click(byText(decision));
    expect(h.state.compare).toBe(true); expect(prompt()).toBeNull(); expect(h.session.hasChanges()).toBe(false);
  });
  it.each(['Discard changes', 'Save and continue'])('releases native unload protection synchronously after %s', async decision => {
    const h = fixture(); await dirtyExplanation(); let unload;
    h.navigate.mockImplementation(() => { unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); });
    await transitions.Both(h); await click(byText(decision)); expect(unload?.defaultPrevented).toBe(false);
  });
  for (const [name, transition] of Object.entries(transitions)) {
    for (const kind of ['explanation', 'picture']) {
      it(`retains a dirty ${kind} before ${name}, restores focus, and discards only explicitly`, async () => {
        const h = fixture({ image: kind === 'picture' ? IMAGE : undefined });
        if (kind === 'picture') { await edit(); await pictureChoice(); } else await dirtyExplanation();
        const editingControl = kind === 'picture' ? byText('Choose a different picture') : draft().querySelector('textarea');
        act(() => editingControl.focus());
        const value = draft().querySelector('textarea').value;
        await transition(h);
        expect(prompt()).toBeTruthy(); expect(h.state.item.id).toBe('adapted'); expect(h.state.compare).toBe(false); expect(h.state.editing).toBe(false); expect(h.state.teacher).toBe(true); expect(h.state.view).toBe('simplified');
        expect(h.onUpdate).not.toHaveBeenCalled();
        await click(byText('Keep editing'));
        expect(prompt()).toBeNull(); expect(draft().querySelector('textarea').value).toBe(value); expect(document.activeElement).toBe(editingControl);
        await transition(h); await click(byText('Discard changes'));
        expect(prompt()).toBeNull(); expect(h.session.hasChanges()).toBe(false);
        expect(name === 'Edit' ? h.state.editing : name === 'Both' ? h.state.compare : name === 'Original' ? h.state.item.id === 'original' : name === 'new artifact' ? h.state.item.id === 'another' : name === 'student role' ? !h.state.teacher : h.state.view === 'other').toBe(true);
      });
    }
    it(`waits for a complete save before ${name}`, async () => {
      const h = fixture(); await dirtyExplanation(); const pending = deferred();
      h.persist.mockReturnValueOnce(pending.promise);
      await transition(h); await click(byText('Save and continue'));
      expect(h.state.item.id).toBe('adapted'); expect(h.state.compare).toBe(false); expect(h.state.editing).toBe(false); expect(h.state.teacher).toBe(true); expect(h.state.view).toBe('simplified');
      const annotation = h.onUpdate.mock.calls[0][1].annotation;
      await act(async () => pending.resolve(contract.upsertAdaptedReadingSupport(h.adapted, h.adapted.adaptedReadingSupports, annotation)));
      expect(prompt()).toBeNull(); expect(h.session.hasChanges()).toBe(false);
      expect(h.state.history.find(item => item.id === 'adapted').adaptedReadingSupports.annotations[0].text).toBe('My unsaved explanation.');
      if (h.state.item.id === 'adapted') expect(h.state.item.adaptedReadingSupports.annotations[0].text).toBe('My unsaved explanation.');
      expect(name === 'Edit' ? h.state.editing : name === 'Both' ? h.state.compare : name === 'Original' ? h.state.item.id === 'original' : name === 'new artifact' ? h.state.item.id === 'another' : name === 'student role' ? !h.state.teacher : h.state.view === 'other').toBe(true);
    });
  }
  it.each(['reject', 'null', 'cancel'])('does not continue after a %s save', async outcome => {
    const h = fixture(); await dirtyExplanation(); const pending = deferred(); h.persist.mockReturnValueOnce(pending.promise);
    await transitions.Both(h); await click(byText('Save and continue'));
    if (outcome === 'cancel') await click(byText('Keep editing'));
    await act(async () => outcome === 'reject' ? pending.reject(new Error('Storage unavailable.')) : pending.resolve(outcome === 'null' ? null : contract.upsertAdaptedReadingSupport(h.adapted, h.adapted.adaptedReadingSupports, h.onUpdate.mock.calls[0][1].annotation)));
    expect(h.state.compare).toBe(false); expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
  });
  it('restores editing focus when a save settles after Keep editing', async () => {
    const h = fixture(); await dirtyExplanation(); const pending = deferred(); h.persist.mockReturnValueOnce(pending.promise);
    const input = draft().querySelector('textarea');
    await transitions.Both(h); await click(byText('Save and continue')); await click(byText('Keep editing'));
    await act(async () => pending.reject(new Error('Storage unavailable.')));
    expect(h.state.compare).toBe(false); expect(document.activeElement).toBe(input);
  });
  it('does not apply a stale save after the source changes away and back', async () => {
    const h = fixture(); await dirtyExplanation(); const pending = deferred(); h.persist.mockReturnValueOnce(pending.promise);
    await click(byText('Save word support'));
    const captured = h.onUpdate.mock.calls[0][1].annotation;
    h.force({ item: { ...h.adapted, data: 'A heron stood in a pond.' } }); h.force({ item: h.adapted });
    type(draft().querySelector('textarea'), 'Newer wording after returning.');
    await act(async () => pending.resolve(contract.upsertAdaptedReadingSupport(h.adapted, h.adapted.adaptedReadingSupports, captured)));
    expect(draft().querySelector('textarea').value).toBe('Newer wording after returning.'); expect(h.session.hasChanges()).toBe(true);
  });
  it('does not let an older failure release or overwrite a newer save', async () => {
    const h = fixture(); await dirtyExplanation(); const old = deferred(), latest = deferred();
    h.persist.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise); await click(byText('Save word support'));
    h.force({ item: { ...h.adapted, data: 'A heron stood in a pond.' } }); h.force({ item: h.adapted });
    type(draft().querySelector('textarea'), 'Newest wording.'); await click(byText('Save word support'));
    await act(async () => old.reject(new Error('Obsolete failure.')));
    expect(draft().disabled).toBe(true); expect(host.textContent).not.toContain('Obsolete failure.');
    await act(async () => latest.resolve(contract.upsertAdaptedReadingSupport(h.adapted, h.adapted.adaptedReadingSupports, h.onUpdate.mock.calls[1][1].annotation)));
    expect(draft().disabled).toBe(false); expect(draft().querySelector('textarea').value).toBe('Newest wording.'); expect(h.session.hasChanges()).toBe(false);
  });
  it('keeps a picture draft dirty when the explanation saves without its picture', async () => {
    const h = fixture(); await dirtyExplanation(); await pictureChoice();
    h.persist.mockImplementationOnce(async (owner, action) => contract.upsertAdaptedReadingSupport(owner, owner.adaptedReadingSupports, { ...action.annotation, image: null }));
    await transitions.Both(h); await click(byText('Save and continue'));
    expect(h.state.compare).toBe(false); expect(h.session.hasChanges()).toBe(true); expect(host.textContent).toContain('its picture did not fit');
    expect(draft().querySelector('img').getAttribute('src')).toBe('data:image/png;base64,REVG');
    await click(byText('Keep editing')); await transitions.Both(h); expect(prompt()).toBeTruthy();
  });
  it.each(['explanation', 'importance', 'pin'])('retains an unconfirmed %s and blocks navigation until retry confirms it', async field => {
    const h = fixture({ original: field === 'pin' }); await dirtyExplanation();
    if (field === 'importance') act(() => { const select = draft().querySelector('select'); select.value = 'essential'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    if (field === 'pin') await click(draft().querySelector('input[type="checkbox"]'));
    h.persist.mockImplementationOnce(async (owner, action) => {
      const annotation = { ...action.annotation, ...(field === 'explanation' ? { text: 'Older saved wording.' } : field === 'importance' ? { priority: 'helpful' } : { pinned: false }) };
      return contract.isAdaptedReading(owner) ? contract.upsertAdaptedReadingSupport(owner, owner.adaptedReadingSupports, annotation) : contract.upsertReadingSupport(owner, owner.readingSupports, annotation);
    });
    await transitions.Both(h); await click(byText('Save and continue'));
    expect(h.state.compare).toBe(false); expect(prompt()).toBeTruthy(); expect(h.session.hasChanges()).toBe(true);
    expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
    if (field === 'importance') expect(draft().querySelector('select').value).toBe('essential');
    if (field === 'pin') expect(draft().querySelector('input[type="checkbox"]').checked).toBe(true);
    expect(host.textContent).toContain('did not confirm all your changes');
    await click(byText('Keep editing')); await transitions.Both(h); await click(byText('Save and continue'));
    expect(h.state.compare).toBe(true); expect(h.session.hasChanges()).toBe(false);
    const stored = h.state.history.find(item => item.id === (field === 'pin' ? 'original' : 'adapted'));
    const accepted = (stored.readingSupports || stored.adaptedReadingSupports).annotations[0];
    expect(accepted.text).toBe('My unsaved explanation.');
    if (field === 'importance') expect(accepted.priority).toBe('essential');
    if (field === 'pin') expect(accepted.pinned).toBe(true);
  });
  it('retains an unconfirmed picture removal without describing it as a full picture budget', async () => {
    const h = fixture({ image: IMAGE }); await edit(); await click(byText('Remove picture'));
    h.persist.mockImplementationOnce(async (owner, action) => contract.upsertAdaptedReadingSupport(owner, owner.adaptedReadingSupports, { ...action.annotation, image: IMAGE }));
    await transitions.Both(h); await click(byText('Save and continue'));
    expect(h.state.compare).toBe(false); expect(h.session.hasChanges()).toBe(true); expect(draft().querySelector('img')).toBeNull();
    expect(host.textContent).toContain('did not confirm all your changes'); expect(host.textContent).not.toContain('as many pictures as it can hold');
    await click(byText('Save and continue')); expect(h.state.compare).toBe(true); expect(h.session.hasChanges()).toBe(false);
    expect(h.state.history.find(item => item.id === 'adapted').adaptedReadingSupports.annotations[0].image).toBeUndefined();
  });
  it('retains a new draft when a partial save changes its wording', async () => {
    const h = fixture(); await click(byText('Add a word or phrase'));
    type(draft().querySelector('input[type="text"]'), 'water'); type(draft().querySelector('textarea'), 'A liquid where the heron walks.');
    h.persist.mockImplementationOnce(async (owner, action) => contract.upsertAdaptedReadingSupport(owner, owner.adaptedReadingSupports, { ...action.annotation, text: 'Unconfirmed wording.' }));
    await transitions.Edit(h); await click(byText('Save and continue'));
    expect(h.state.editing).toBe(false); expect(h.session.hasChanges()).toBe(true); expect(draft().querySelector('textarea').value).toBe('A liquid where the heron walks.');
    await click(byText('Save and continue')); expect(h.state.editing).toBe(true); expect(h.session.hasChanges()).toBe(false);
    expect(h.state.item.adaptedReadingSupports.annotations.find(entry => entry.quote === 'water').text).toBe('A liquid where the heron walks.');
  });
  it('recovers all unconfirmed edits after a partial save and interrupted editor', async () => {
    const h = fixture(); await dirtyExplanation(); await pictureChoice();
    h.persist.mockImplementationOnce(async (owner, action) => contract.upsertAdaptedReadingSupport(owner, owner.adaptedReadingSupports, { ...action.annotation, text: 'Only this older wording was saved.', image: null }));
    await transitions.Both(h); await click(byText('Save and continue'));
    expect(h.state.compare).toBe(false); expect(host.textContent).toContain('did not confirm all your changes');
    h.force({ view: 'other' }); h.force({ view: 'simplified' });
    expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
    expect(draft().querySelector('img').getAttribute('src')).toBe('data:image/png;base64,REVG');
    const unload = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
    await transitions.Both(h); await click(byText('Save and continue'));
    expect(h.state.compare).toBe(true); expect(h.session.hasChanges()).toBe(false);
    expect(h.state.history.find(item => item.id === 'adapted').adaptedReadingSupports.annotations[0]).toMatchObject({ text: 'My unsaved explanation.', image: { src: 'data:image/png;base64,REVG' } });
  });
  it('saves an equal-length picture replacement before navigating', async () => {
    const h = fixture({ image: IMAGE }); await edit(); await pictureChoice();
    await transitions.Both(h); await click(byText('Save and continue'));
    expect(h.state.compare).toBe(true);
    expect(h.state.history.find(item => item.id === 'adapted').adaptedReadingSupports.annotations[0].image.src).toBe('data:image/png;base64,REVG');
  });
  it('recognizes an equal-length same-alt picture replacement on the existing local close path', async () => {
    fixture({ image: IMAGE }); await edit(); await pictureChoice();
    await click(byText('Done editing')); expect(prompt()).toBeTruthy();
    await click(byText('Keep editing')); expect(draft().querySelector('img').getAttribute('src')).toBe('data:image/png;base64,REVG');
  });
  it('treats changed picture credit as unsaved work even with identical pixels and alt', async () => {
    fixture({ image: IMAGE }); await edit(); await pictureChoice({ ...IMAGE, attribution: { set: 'New collection', author: 'New author', license: 'CC0' } });
    await transitions.Both(); expect(prompt()).toBeTruthy();
  });
  it('cancels deferred navigation when the source changes during a save', async () => {
    const h = fixture(); await dirtyExplanation(); const pending = deferred(); h.persist.mockReturnValueOnce(pending.promise);
    await transitions.Both(h); await click(byText('Save and continue'));
    h.force({ item: { ...h.adapted, data: 'A heron stood in a pond.' } });
    await act(async () => pending.resolve(null));
    expect(h.state.compare).toBe(false); expect(prompt()).toBeNull(); expect(draft().disabled).toBe(false);
    expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
  });
  it('does not prompt for an unchanged existing picture', async () => {
    const h = fixture({ image: IMAGE }); await edit(); await pictureChoice(IMAGE);
    await transitions.Both(h); expect(prompt()).toBeNull(); expect(h.state.compare).toBe(true);
  });
  it('preserves the draft and exact occurrence through refreshed suggestion IDs', async () => {
    const h = fixture(); await dirtyExplanation(); await click(host.querySelector('[data-adapted-word-help-generate]'));
    expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
    await click(byText('Save word support'));
    expect(h.onUpdate.mock.calls[0][1].annotation).toMatchObject({ id: 'refreshed-heron', start: 4, end: 9, quote: 'heron' });
  });
  it('retains valid drafts after passage growth and holds stale drafts for explicit re-anchoring', async () => {
    const h = fixture(); await dirtyExplanation();
    h.force({ item: { ...h.state.item, data: PASSAGE + ' Another sentence.' } });
    expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.'); expect(host.textContent).not.toContain('Your draft is retained');
    h.force({ item: { ...h.state.item, data: 'A heron stood in a pond.' } });
    expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.'); expect(host.textContent).toContain('Your draft is retained');
    await click(byText('Save word support')); expect(h.onUpdate).not.toHaveBeenCalled();
  });
  it('successfully saves a retained draft after valid passage growth', async () => {
    const h = fixture(); await dirtyExplanation(); const grown = { ...h.adapted, data: PASSAGE + ' Another sentence.' };
    h.force({ item: grown, history: [h.source, grown] }); await click(byText('Save word support'));
    expect(h.session.hasChanges()).toBe(false);
    expect(h.state.item.adaptedReadingSupports.annotations[0]).toMatchObject({ start: 4, end: 9, text: 'My unsaved explanation.' });
  });
  it('saves a stale draft only after reviewing supports and explicitly choosing its current occurrence', async () => {
    const h = fixture(); await dirtyExplanation(); const changed = { ...h.adapted, data: 'A heron stood in a pond.' };
    changed.adaptedReadingSupports = contract.upsertAdaptedReadingSupport(changed, undefined, { id: 'current-heron', start: 2, end: 7, quote: 'heron', text: 'Current suggestion.' });
    h.force({ item: changed, history: [h.source, changed] });
    expect(byText('Save word support').disabled).toBe(true);
    await click(byText('choose the occurrence in the current text')); await click(byText('Save word support'));
    expect(h.session.hasChanges()).toBe(false);
    expect(h.state.item.adaptedReadingSupports.annotations[0]).toMatchObject({ id: 'current-heron', start: 2, end: 7, text: 'My unsaved explanation.' });
  });
  it('recovers an unmounted draft only for its artifact instance', async () => {
    const h = fixture(); await dirtyExplanation();
    h.force({ view: 'other' }); expect(h.session.hasChanges()).toBe(true);
    h.force({ view: 'simplified', item: { ...h.adapted, _artifactInstanceId: 'different-instance' } }); expect(draft()).toBeNull();
    h.force({ item: h.adapted }); expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
  });
  it('cancels an interrupted confirmation so the restored editor can defer another transition', async () => {
    const h = fixture(); await dirtyExplanation(); await transitions.Both(h); expect(prompt()).toBeTruthy();
    h.force({ view: 'other' }); h.force({ view: 'simplified' });
    await transitions.Both(h); expect(prompt()).toBeTruthy();
    await click(byText('Keep editing')); expect(h.state.compare).toBe(false);
  });
  it('protects an original support draft before opening Both', async () => {
    const h = fixture({ original: true }); await dirtyExplanation(); await transitions.Both(h);
    expect(prompt()).toBeTruthy(); expect(h.state.item.id).toBe('original');
    await click(byText('Save and continue'));
    expect(h.state.compare).toBe(true); expect(h.state.item.id).toBe('adapted');
    expect(h.state.history.find(item => item.id === 'original').readingSupports.annotations[0].text).toBe('My unsaved explanation.');
  });
  it('protects a comparison support draft before a mode unmounts its editor', async () => {
    const h = fixture(); await transitions.Both(h); await dirtyExplanation();
    await click(host.querySelector('[data-reading-mode="revise"]')); expect(prompt()).toBeTruthy(); expect(h.state.compare).toBe(true);
    await click(byText('Keep editing')); expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
    await click(host.querySelector('[data-reading-mode="revise"]')); await click(byText('Discard changes'));
    expect(h.state.compare).toBe(false); expect(h.state.mode).toBe('revise');
  });
  it('warns on refresh only for unresolved reader work', async () => {
    const h = fixture();
    const reload = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event; };
    expect(reload().defaultPrevented).toBe(false); await dirtyExplanation(); expect(reload().defaultPrevented).toBe(true);
    expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
    await click(byText('Save word support')); expect(reload().defaultPrevented).toBe(false); expect(h.session.hasChanges()).toBe(false);
  });
  it('does not add a second disclosure or prompt for harmless reader changes', async () => {
    fixture(); await dirtyExplanation();
    expect(host.querySelector('[data-adapted-word-help-teacher] [aria-expanded]')).toBeNull();
    await click(host.querySelector('[data-reading-mode="define"]'));
    expect(prompt()).toBeNull(); expect(draft().querySelector('textarea').value).toBe('My unsaved explanation.');
  });
});
describe('picture preparation cancellation', () => {
  it('protects a real picker download through Keep editing and saves its eventual result before leaving', async () => {
    const h = fixture(); await edit(); const download = deferred(), Picker = window.AlloModules.ClassroomImagePicker;
    const fetchImpl = vi.fn(url => String(url).startsWith('https://globalsymbols.com/api/v1/labels/search')
      ? Promise.resolve({ ok: true, json: async () => [{ id: 1, text: 'heron', picto: { id: 11, image_url: 'https://globalsymbols.com/uploads/heron.svg' } }] }) : download.promise);
    vi.spyOn(window.AlloModules, 'ClassroomImagePicker').mockImplementation(props => React.createElement(Picker, { ...props, fetchImpl }));
    const resize = vi.spyOn(window.AlloModules.AltText, 'shrinkImageDataUrl').mockResolvedValue(IMAGE.src);
    await click(byText('Choose a picture'));
    await act(async () => host.querySelector('[data-classroom-image-picker] form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const useSymbol = host.querySelector('button[aria-label="Use symbol: heron"]'); act(() => useSymbol.focus()); await click(useSymbol);
    expect(resize).not.toHaveBeenCalled(); await transitions.Both(h); expect(prompt()).toBeTruthy();
    await click(byText('Keep editing')); expect(document.activeElement === host.querySelector('[data-classroom-image-picker] input')).toBe(true);
    await transitions.Both(h);
    await act(async () => { download.resolve({ ok: true, blob: async () => new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/svg+xml' }) }); await vi.waitFor(() => expect(resize).toHaveBeenCalled()); });
    expect(byText('Save and continue').disabled).toBe(false); expect(document.activeElement === byText('Keep editing')).toBe(true);
    await click(byText('Save and continue')); expect(h.state.compare).toBe(true);
    expect(h.state.history.find(item => item.id === 'adapted').adaptedReadingSupports.annotations[0].image.src).toBe(IMAGE.src);
  });
  it('retains an open picker and its query before the picture callback starts', async () => {
    const h = fixture(); await edit();
    vi.spyOn(window.AlloModules, 'ClassroomImagePicker').mockImplementation(() => React.createElement('div', { 'data-classroom-image-picker': true }, React.createElement('input', { 'aria-label': 'Picture query', defaultValue: 'heron' })));
    await click(byText('Choose a picture'));
    const query = host.querySelector('[aria-label="Picture query"]'); type(query, 'water bird');
    await transitions.Both(h); expect(prompt()).toBeTruthy(); expect(h.state.compare).toBe(false);
    expect(byText('Save and continue').disabled).toBe(true); expect(prompt().textContent).toContain('finish choosing or cancel'); await click(byText('Keep editing'));
    expect(host.querySelector('[aria-label="Picture query"]')).toBe(query); expect(query.value).toBe('water bird'); expect(document.activeElement).toBe(query);
    await click(byText('Cancel')); expect(h.session.hasChanges()).toBe(false); await transitions.Both(h); expect(h.state.compare).toBe(true);
  });
  it('protects picker work on refresh and local close before a picture has been chosen', async () => {
    const h = fixture(); await edit(); await click(byText('Choose a picture'));
    const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    await click(byText('Done editing')); expect(prompt()).toBeTruthy();
    await click(byText('Discard changes')); expect(draft()).toBeNull(); expect(h.session.hasChanges()).toBe(false);
  });
  it('can cancel picture selection while its module is unavailable', async () => {
    const h = fixture(); await edit(); const picker = window.AlloModules.ClassroomImagePicker;
    try {
      window.AlloModules.ClassroomImagePicker = undefined;
      await click(byText('Choose a picture')); expect(host.textContent).toContain('Picture search is still loading');
      await click(byText('Cancel')); expect(h.session.hasChanges()).toBe(false);
      expect(document.activeElement === byText('Choose a picture')).toBe(true);
    } finally { window.AlloModules.ClassroomImagePicker = picker; }
  });
  it('rejects a callback from a cancelled picker even if its download ignores cancellation', async () => {
    const h = fixture(); await edit(); const download = deferred();
    vi.spyOn(window.AlloModules, 'ClassroomImagePicker').mockImplementation(({ onChoose }) => React.createElement('button', { onClick: async () => { await download.promise; await onChoose({ ...IMAGE, dataUrl: IMAGE.src }); } }, 'Download fixture picture'));
    const resize = vi.spyOn(window.AlloModules.AltText, 'shrinkImageDataUrl').mockResolvedValue(IMAGE.src);
    await click(byText('Choose a picture')); await click(byText('Download fixture picture')); await click(byText('Cancel'));
    await act(async () => download.resolve()); expect(resize).not.toHaveBeenCalled(); expect(draft().querySelector('img')).toBeNull(); expect(h.session.hasChanges()).toBe(false);
  });
  it('ignores an unfinished picture after forced unmount without leaving a false dirty record', async () => {
    const h = fixture(); await edit(); const resized = deferred(); await pictureChoice(IMAGE, () => resized.promise);
    h.force({ view: 'other' }); await act(async () => resized.resolve(IMAGE.src));
    expect(h.session.hasChanges()).toBe(false);
    h.force({ view: 'simplified' }); expect(draft().querySelector('img')).toBeNull();
  });
  it.each(['cancel picker', 'discard transition'])('ignores resize completion after %s', async action => {
    const h = fixture(); await edit(); const resized = deferred(); await pictureChoice(IMAGE, () => resized.promise);
    expect(host.querySelector('[data-gloss-picture]').getAttribute('aria-busy')).toBe('true'); expect(host.textContent).toContain('Preparing picture');
    if (action === 'cancel picker') await click(byText('Cancel'));
    else { await transitions.Both(h); expect(byText('Save and continue').disabled).toBe(true); await click(byText('Discard changes')); }
    await act(async () => resized.resolve(IMAGE.src));
    if (action === 'cancel picker') expect(draft().querySelector('img')).toBeNull();
    expect(h.session.hasChanges()).toBe(false);
  });
});

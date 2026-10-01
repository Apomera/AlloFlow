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
function fixture({ image, original = false } = {}) {
  const source = contract.createSupportedReading('The heron walked through the shallow water.', { id: 'original', sourceFamilyId: 'birds' });
  const adapted = { id: 'adapted', _artifactInstanceId: 'adapted-instance', type: 'simplified', data: PASSAGE, sourceSnapshot: source.sourceSnapshot, sourceFamilyId: 'birds', instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English', grade: '3' } };
  const entry = { id: 'heron', start: 4, end: 9, quote: 'heron', text: 'A wading bird.', origin: 'educator', image };
  source.readingSupports = contract.upsertReadingSupport(source, undefined, entry);
  adapted.adaptedReadingSupports = contract.upsertAdaptedReadingSupport(adapted, undefined, entry);
  const sessionRef = { current: window.AlloModules.ReaderSupportDrafts.createSession() };
  const state = { item: original ? source : adapted, history: [source, adapted], teacher: true, compare: false, editing: false, view: 'simplified', mode: 'read' };
  const request = work => sessionRef.current.request(work);
  const commit = work => { work(); render(); };
  const navigate = vi.fn((item, compare = false) => request(() => commit(() => { state.item = item; state.compare = compare; state.editing = false; state.view = 'simplified'; })));
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
describe('deferred reader transitions', () => {
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
  it('keeps a picture draft dirty when the explanation saves without its picture', async () => {
    const h = fixture(); await dirtyExplanation(); await pictureChoice();
    h.persist.mockImplementationOnce(async (owner, action) => contract.upsertAdaptedReadingSupport(owner, owner.adaptedReadingSupports, { ...action.annotation, image: null }));
    await transitions.Both(h); await click(byText('Save and continue'));
    expect(h.state.compare).toBe(false); expect(h.session.hasChanges()).toBe(true); expect(host.textContent).toContain('its picture did not fit');
    expect(draft().querySelector('img').getAttribute('src')).toBe('data:image/png;base64,REVG');
    await click(byText('Keep editing')); await transitions.Both(h); expect(prompt()).toBeTruthy();
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
  it('ignores an unfinished picture after forced unmount without leaving a false dirty record', async () => {
    const h = fixture(); await edit(); const resized = deferred(); await pictureChoice(IMAGE, () => resized.promise);
    h.force({ view: 'other' }); await act(async () => resized.resolve(IMAGE.src));
    expect(h.session.hasChanges()).toBe(false);
    h.force({ view: 'simplified' }); expect(draft().querySelector('img')).toBeNull();
  });
  it.each(['cancel picker', 'discard transition'])('ignores resize completion after %s', async action => {
    const h = fixture(); await edit(); const resized = deferred(); await pictureChoice(IMAGE, () => resized.promise);
    if (action === 'cancel picker') await click(byText('Cancel'));
    else { await transitions.Both(h); expect(byText('Save and continue').disabled).toBe(true); await click(byText('Discard changes')); }
    await act(async () => resized.resolve(IMAGE.src));
    if (action === 'cancel picker') expect(draft().querySelector('img')).toBeNull();
    expect(h.session.hasChanges()).toBe(false);
  });
});

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, api, pure, phase, root, host, state, latestKaraoke;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: key => key });
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js']) loadAlloModule(file);
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  loadAlloModule('immersive_reader_module.js');
  View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; host = null;
  localStorage.clear(); delete navigator.locks; vi.restoreAllMocks(); latestKaraoke = null;
});
function pair() {
  const original = api.createSupportedReading('The heron walked in the shallow water.', { id: 'original', sourceFamilyId: 'birds' });
  const adapted = { id: 'adapted', type: 'simplified', data: 'The heron walked in water.', sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'birds', instructionalText: { form: 'adapted' }, config: { language: 'English' } };
  const entry = { id: 'help', start: 4, end: 9, quote: 'heron', text: 'A wading bird.', origin: 'generated', kind: 'gloss' };
  original.readingSupports = api.upsertReadingSupport(original, undefined, entry);
  adapted.adaptedReadingSupports = api.setAdaptedReadingSupportsShown(adapted, api.upsertAdaptedReadingSupport(adapted, undefined, entry), true);
  return { original, adapted };
}
function mount(extra = {}) {
  const { original, adapted } = pair();
  state = { ComplexityGauge: () => null, t: key => key, generatedContent: adapted, history: [original, adapted],
    isTeacherMode: true, isZenMode: false, isCompareMode: false, isEditingLeveledText: false, interactionMode: 'read',
    readingLearnerKey: 'teacher', leveledTextLanguage: 'English', selectedVoice: 'Kore', voiceSpeed: 1,
    textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
    cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text,
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: () => null }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [],
    setFocusedParagraphIndex: vi.fn(), onReadOriginal: vi.fn(), onOpenReadingArtifact: vi.fn(),
    setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), setReadingTheme: vi.fn(), handleToggleIsTeacherToolbarExpanded: vi.fn(),
    handleAnalyzePOS: vi.fn(), setIsImmersiveReaderActive: vi.fn(), handleSimplifiedTextChange: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(),
    handleSpeak: vi.fn(), callTTS: vi.fn(async () => 'blob:test-audio'), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(),
    KaraokeReaderOverlay: props => { latestKaraoke = props; return props.isOpen ? React.createElement('section', { 'data-karaoke-test': true }, React.createElement('button', { 'data-close-test': true, onClick: props.onClose }, 'Close')) : null; },
    ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, state)));
  return state;
}
const find = selector => host.querySelector(selector);
const click = node => act(() => node.click());
function rerender(extra) { Object.assign(state, extra); act(() => root.render(React.createElement(View, state))); }
function openDirect() {
  const button = find('[data-reader-listen-along]');
  expect(button.disabled).toBe(false); click(button); return button;
}
describe('direct Listen along', () => {
  const realReader = { KaraokeReaderOverlay: (...args) => React.createElement(window.AlloModules.KaraokeReaderOverlay, args[0]) };
  const dialogButton = label => [...host.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
  const arrow = code => act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: code, code, bubbles: true })));
  const threeLines = () => ({ ...pair().adapted, id: 'listening-place', data: 'One sentence. Another sentence. Final sentence.' });
  const flush = async () => { await act(async () => { await Promise.resolve(); }); };
  it('offers a saved sentence on reopen, preserves it if the chooser closes, and resumes or restarts paused', async () => {
    mount({ ...realReader, generatedContent: threeLines(), readingLearnerKey: 'reader-a' });
    openDirect(); arrow('ArrowRight'); arrow('ArrowRight'); await flush();
    expect(find('[role="dialog"]').textContent).toContain('Sentence 3 / 3');
    click(dialogButton('Close')); const before = state.callTTS.mock.calls.length; openDirect();
    expect(dialogButton('Continue at sentence 3')).toBeTruthy();
    expect(state.callTTS.mock.calls).toHaveLength(before);
    click(dialogButton('Close')); openDirect(); click(dialogButton('Continue at sentence 3'));
    expect(find('[role="dialog"]').textContent).toContain('Sentence 3 / 3');
    expect(dialogButton('Play')).toBeTruthy();
    click(dialogButton('Close')); openDirect(); click(dialogButton('Start over')); await flush();
    expect(find('[role="dialog"]').textContent).toContain('Sentence 1 / 3');
    expect(dialogButton('Play')).toBeTruthy();
    click(dialogButton('Close')); openDirect(); await flush(); expect(dialogButton('Continue at sentence 3')).toBeUndefined();
  });
  it('scopes the offer to the exact learner, wording, artifact instance and spoken language', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_name, callback) => Promise.resolve().then(callback) } });
    const first = threeLines();
    mount({ ...realReader, generatedContent: first, readingLearnerKey: 'identity-a' });
    openDirect(); arrow('ArrowRight'); await flush(); click(dialogButton('Close'));
    const recordedRow = Object.values(JSON.parse(localStorage.getItem('alloflow_reading_places_v1'))).find(row => row.listeningSentence === 1);
    expect(recordedRow).toBeTruthy(); expect(recordedRow.bookmark).toBeUndefined(); expect(recordedRow.paragraph).toBeUndefined();
    expect(JSON.stringify(recordedRow)).not.toContain('Another sentence.');
    for (const change of [
      { readingLearnerKey: 'identity-b' }, { generatedContent: { ...first, data: first.data + ' Changed.' } },
      { generatedContent: { ...first, _artifactInstanceId: 'second-copy' } },
      { generatedContent: { ...first, config: { language: 'French' } } }
    ]) {
      rerender({ generatedContent: first, readingLearnerKey: 'identity-a', ...change }); openDirect();
      expect(dialogButton('Continue at sentence 2')).toBeUndefined(); click(dialogButton('Close'));
    }
    rerender({ generatedContent: first, readingLearnerKey: 'identity-a' }); openDirect();
    expect(dialogButton('Continue at sentence 2')).toBeTruthy();
  });
  it('keeps anonymous listening in page memory and forgets it when the learner session changes', async () => {
    mount({ ...realReader, generatedContent: threeLines(), isTeacherMode: false, readingLearnerKey: '', readingLearnerSession: 'visit-a' });
    openDirect(); arrow('ArrowRight'); await flush(); click(dialogButton('Close')); openDirect();
    expect(dialogButton('Continue at sentence 2')).toBeTruthy();
    expect(localStorage.getItem('alloflow_reading_places_v1')).toBeNull();
    click(dialogButton('Close')); rerender({ readingLearnerSession: 'visit-b' }); openDirect(); await flush();
    expect(dialogButton('Continue at sentence 2')).toBeUndefined();
  });
  it('keeps original and adapted listening positions distinct even when their displayed text is identical', async () => {
    const text = 'First sentence. Next sentence.';
    const original = api.createSupportedReading(text, { id: 'original-twins', sourceFamilyId: 'twins' });
    const adapted = { ...threeLines(), id: 'adapted-twins', data: text, sourceFamilyId: 'twins', sourceSnapshot: original.sourceSnapshot };
    mount({ ...realReader, generatedContent: adapted, history: [original, adapted], isCompareMode: true, readingLearnerKey: 'twins' });
    click(find('[data-comparison-karaoke="adapted"]')); arrow('ArrowRight'); await flush(); click(dialogButton('Close'));
    click(find('[data-comparison-karaoke="source"]')); expect(dialogButton('Continue at sentence 2')).toBeUndefined();
    expect(find('[role="dialog"]').textContent).toContain('Sentence 1 / 2'); click(dialogButton('Close'));
    click(find('[data-comparison-karaoke="adapted"]')); expect(dialogButton('Continue at sentence 2')).toBeTruthy();
  });
  it('bypasses a failed saved clip on retry while the shared audio resolver is unavailable', async () => {
    const store = window.AlloModules.KaraokeAudioStore, shared = window.__alloResolveReadAloudAudio;
    const getCompatible = vi.fn(() => 'blob:bad-clip');
    try {
      window.AlloModules.KaraokeAudioStore = { current: { getCompatible } };
      window.__alloResolveReadAloudAudio = undefined;
      const props = mount();
      openDirect();
      const sentence = latestKaraoke.sentenceList[0];
      expect(await latestKaraoke.getAudioUrl(sentence, { occurrence: 0 })).toBe('blob:bad-clip');
      expect(await latestKaraoke.getAudioUrl(sentence, { occurrence: 0, force: true })).toBe('blob:test-audio');
      expect(getCompatible).toHaveBeenCalledTimes(1);
      expect(props.callTTS).toHaveBeenCalledTimes(1);
    } finally {
      window.AlloModules.KaraokeAudioStore = store;
      window.__alloResolveReadAloudAudio = shared;
    }
  });
  it.each([['original', true], ['original', false], ['adapted', true], ['adapted', false]])('opens %s with generated supports (teacher=%s) without preparing or changing text', (form, teacher) => {
    const reading = pair()[form];
    expect((reading.readingSupports || reading.adaptedReadingSupports).annotations).toHaveLength(1);
    const props = mount({ generatedContent: reading, isTeacherMode: teacher });
    expect(reading.immersiveData).toBeUndefined();
    openDirect();
    expect(find('[data-karaoke-test]')).not.toBeNull();
    expect(latestKaraoke.text).toBe(reading.data);
    // A shown support on the original is read after its sentence, labelled.
    expect(latestKaraoke.sentenceList).toEqual(form === 'original' ? [reading.data, 'Word help for "heron": A wading bird.'] : [reading.data]);
    expect(latestKaraoke.playbackOnly).toBe(true);
    for (const action of ['handleAnalyzePOS', 'setIsImmersiveReaderActive', 'setGeneratedContent', 'setHistory', 'handleSimplifiedTextChange', 'callTTS']) expect(props[action]).not.toHaveBeenCalled();
    expect(props.stopPlayback).toHaveBeenCalledOnce();
  });
  it('returns keyboard focus to Listen along when closed', () => {
    mount(); const opener = openDirect();
    act(() => find('[data-close-test]').focus()); click(find('[data-close-test]'));
    expect(find('[data-karaoke-test]')).toBeNull(); expect(document.activeElement).toBe(opener);
  });
  it('places read-along beside Listen and avoids a duplicate in Both', () => {
    mount(); expect(find('[data-reader-listen]').parentElement.contains(find('[data-reader-listen-along]'))).toBe(true);
    rerender({ isCompareMode: true }); expect(find('[data-reader-listen-along]')).toBeNull();
    expect(host.querySelectorAll('[data-comparison-karaoke]')).toHaveLength(2);
    click(find('[data-comparison-karaoke="source"]')); expect(latestKaraoke.text).toBe(pair().original.data);
    click(find('[data-close-test]')); click(find('[data-comparison-karaoke="adapted"]')); expect(latestKaraoke.text).toBe(state.generatedContent.data);
  });
  it.each(['module-loading', 'editing', 'empty', 'table-only', 'student-preview'])('disables an unavailable action: %s', reason => {
    const extra = reason === 'module-loading' ? { KaraokeReaderOverlay: undefined }
      : reason === 'editing' ? { isEditingLeveledText: true }
      : reason === 'student-preview' ? { isStudentPreview: true, isTeacherMode: false, previewLimitId: 'preview-limits' }
      : { generatedContent: { ...pair().adapted, data: reason === 'empty' ? '' : '| Word | Help |\n| --- | --- |\n| heron | bird |' } };
    mount(extra);
    const button = find('[data-reader-listen-along]');
    if (reason === 'editing') expect(button).toBeNull(); // The editor replaces the reading controls.
    else { expect(button.disabled).toBe(true); click(button); }
    expect(find('[data-karaoke-test]')).toBeNull(); expect(state.callTTS).not.toHaveBeenCalled();
  });
  it('blocks comparison karaoke in student preview even if an overlay module is supplied', () => {
    mount({ isCompareMode: true, isStudentPreview: true, isTeacherMode: false, previewLimitId: 'preview-limits' });
    for (const button of host.querySelectorAll('[data-comparison-karaoke]')) { expect(button.disabled).toBe(true); click(button); }
    expect(latestKaraoke).toBeNull();
  });
  it.each(['resource', 'text', 'role', 'learner', 'language', 'editing', 'comparison'])('dismisses an open passage after %s changes', reason => {
    mount(); openDirect();
    const changes = { resource: { generatedContent: { ...state.generatedContent, id: 'other' } }, text: { generatedContent: { ...state.generatedContent, data: 'Changed passage.' } },
      role: { isTeacherMode: false }, learner: { readingLearnerKey: 'another-learner' }, language: { generatedContent: { ...state.generatedContent, config: { language: 'French' } } },
      editing: { isEditingLeveledText: true }, comparison: { isCompareMode: true } };
    rerender(changes[reason]); expect(find('[data-karaoke-test]')).toBeNull();
  });
  it('routes repeated bilingual sentences to their own language and occurrence', async () => {
    mount({ generatedContent: { ...pair().adapted, data: 'No. Otra frase.\n\n--- ENGLISH TRANSLATION ---\n\nNo. One more sentence.', config: { language: 'Spanish' } } });
    openDirect();
    expect(latestKaraoke.sentenceList).toEqual(['No.', 'Otra frase.', 'No.', 'One more sentence.']);
    expect(latestKaraoke.sentenceLanguages).toEqual(['es', 'es', 'en', 'en']);
    await latestKaraoke.getAudioUrl('No.', { occurrence: 0 });
    await latestKaraoke.getAudioUrl('No.', { occurrence: 1 });
    expect(state.callTTS.mock.calls.map(call => [call[0], call[3].occurrence, call[4]])).toEqual([['No.', 0, 'Spanish'], ['No.', 1, 'English']]);
  });
});

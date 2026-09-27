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
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js']) loadAlloModule(file);
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; host = null;
  localStorage.clear(); vi.restoreAllMocks(); latestKaraoke = null;
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
  click(find('[data-reader-display]'));
  const button = find('[data-reader-listen-along]');
  expect(button.disabled).toBe(false); click(button); return button;
}
describe('direct Listen along', () => {
  it.each([['original', true], ['original', false], ['adapted', true], ['adapted', false]])('opens %s with generated supports (teacher=%s) without preparing or changing text', (form, teacher) => {
    const reading = pair()[form];
    expect((reading.readingSupports || reading.adaptedReadingSupports).annotations).toHaveLength(1);
    const props = mount({ generatedContent: reading, isTeacherMode: teacher });
    expect(reading.immersiveData).toBeUndefined();
    openDirect();
    expect(find('[data-karaoke-test]')).not.toBeNull();
    expect(latestKaraoke.text).toBe(reading.data);
    expect(latestKaraoke.sentenceList.join(' ')).toBe(reading.data);
    expect(latestKaraoke.playbackOnly).toBe(true);
    for (const action of ['handleAnalyzePOS', 'setIsImmersiveReaderActive', 'setGeneratedContent', 'setHistory', 'handleSimplifiedTextChange', 'callTTS']) expect(props[action]).not.toHaveBeenCalled();
    expect(props.stopPlayback).toHaveBeenCalledOnce();
  });
  it('returns keyboard focus to Listen along when closed', () => {
    mount(); const opener = openDirect();
    act(() => find('[data-close-test]').focus()); click(find('[data-close-test]'));
    expect(find('[data-karaoke-test]')).toBeNull(); expect(document.activeElement).toBe(opener);
  });
  it('keeps the direct action within Display and avoids a duplicate in Both', () => {
    mount(); expect(find('[data-reader-display-panel]').contains(find('[data-reader-listen-along]'))).toBe(true);
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
    mount(extra); click(find('[data-reader-display]'));
    const button = find('[data-reader-listen-along]'); expect(button.disabled).toBe(true); click(button);
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

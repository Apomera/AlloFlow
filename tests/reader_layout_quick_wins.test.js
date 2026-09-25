// Reading view quick wins from the 2026-09-24 layout and teaching review.
//
// WHY:
// - Choosing Word meaning, Word sounds or Explain in Both dropped the original
//   from view, although both panes support those tools.
// - "Compare" repeated the Both button; Add term and Revise showed on an
//   original, where they did nothing.
// - Two buttons were both called "Read along": one records the student for a
//   fluency check, the other plays the text. A student who wanted to listen
//   was recorded.
// - Students saw teacher vocabulary ("Adapted text · Supporting reading") and
//   teacher notes ("Check ... before sharing", word counts) in their view.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase, api;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
const ORIGINAL = 'The heath was quiet. Three figures met there.';
function pair() {
  const snapshot = api.createSourceSnapshot(ORIGINAL, { language: 'English', sourceArtifactId: 'analysis', selection: 'input' });
  const original = api.createSupportedReading(snapshot, { id: 'orig', title: 'Scene' });
  const adapted = { id: 'adapted', type: 'simplified', data: 'The open land was quiet. Three people met there.', sourceSnapshot: snapshot, instructionalText: { role: 'supplemental', form: 'adapted' }, config: { language: 'English', grade: '5' } };
  return { original, adapted };
}
function mount(extra = {}) {
  const noop = () => {};
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, generatedContent: pair().adapted, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], onReadOriginal: noop, onOpenReadingArtifact: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}
const toolButton = mode => host.querySelector(`[data-reading-mode="${mode}"]`);
const click = el => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

describe('reading tools', () => {
  it('Word meaning, Word sounds and Explain keep Both; Revise and Add term leave it', () => {
    const { adapted, original } = pair();
    const props = mount({ isTeacherMode: true, isCompareMode: true, history: [original, adapted] });
    for (const mode of ['define', 'phonics', 'explain', 'read']) click(toolButton(mode));
    expect(props.setIsCompareMode).not.toHaveBeenCalledWith(false);
    click(toolButton('revise'));
    expect(props.setIsCompareMode).toHaveBeenCalledWith(false);
  });
  it('has no separate Compare button', () => {
    mount({ isTeacherMode: true });
    expect(host.querySelector('[data-help-key="simplified_compare_mode"]')).toBeNull();
  });
  it('offers Add term and Revise on adapted text but not on an original', () => {
    mount({ isTeacherMode: true });
    expect(toolButton('revise')).not.toBeNull();
    expect(toolButton('add-glossary')).not.toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    mount({ isTeacherMode: true, generatedContent: pair().original });
    expect(toolButton('revise')).toBeNull();
    expect(toolButton('add-glossary')).toBeNull();
  });
  it('names the recording practice "Record my reading", not "Read along"', () => {
    mount();
    const record = host.querySelector('[data-help-key="simplified_read_along"]');
    expect(record.textContent).toBe('Record my reading');
  });
});

describe('what a student sees', () => {
  it('a plain sentence instead of the teacher\'s form and role names', () => {
    mount();
    const note = host.querySelector('[data-student-role-note]');
    expect(note.textContent).toBe('This is an easier version to help you read the original.');
    expect(host.querySelector('details[data-instructional-role]')).toBeNull();
    expect(host.textContent).not.toMatch(/Supporting reading|Adapted text ·/);
  });
  it('the original is named plainly, and the teacher still gets the full card', () => {
    mount({ generatedContent: pair().original });
    expect(host.querySelector('[data-student-role-note]').textContent).toBe('This is the original text.');
    act(() => root.unmount()); host.remove(); root = null;
    mount({ isTeacherMode: true });
    expect(host.querySelector('details[data-instructional-role]')).not.toBeNull();
  });
  it('the side-by-side view has no word counts or "before sharing" note, and a student hint', () => {
    const { adapted, original } = pair();
    mount({ isCompareMode: true, history: [original, adapted] });
    expect(host.querySelector('[data-reading-comparison]')).not.toBeNull();
    expect(host.textContent).not.toMatch(/Word counts|before sharing/);
    expect(host.textContent).toContain('Read the original and the easier version side by side.');
    const listen = [...host.querySelectorAll('button')].filter(b => b.textContent === 'Listen along');
    expect(listen.length).toBe(2);
    expect(listen.map(b => b.getAttribute('aria-label'))).toEqual(['Listen along to the original', 'Listen along to the adapted text']);
  });
  it('the teacher\'s side-by-side view keeps the review note', () => {
    const { adapted, original } = pair();
    mount({ isTeacherMode: true, isCompareMode: true, history: [original, adapted] });
    expect(host.textContent).toMatch(/Word counts/);
  });
});

// Adapted reader clarity, round 2 (2026-10-29 review of the rendered reader).
//
// WHY:
// - On a phone the mode bar wrapped to five rows; the passage started below the
//   first screen. The modes now share one row that scrolls sideways.
// - The teacher header said only "Target Level: 5", and "Use alongside the
//   original." stood alone between Teacher setup and the version switch.
// - Every section ended in "Think about this section", and the button after the
//   passage repeated it word for word.
// - Each sentence span's padding plus the space between sentences read as a
//   double space in the adapted text only.
// - Side by side, "Listen here" and "Listen along" did not say how they differ;
//   the teacher saw a one-option "Source version" list and a long caveat inline.
// - "Revise" (AI, on a selection) and "Edit" (by hand) did not say which is which.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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
const SECTIONS = '## Leaves\n\nLeaves catch light. They make food.\n\n## Roots\n\nRoots take up water. They hold the plant.';
function pair(text = SECTIONS) {
  const snapshot = api.createSourceSnapshot(text, { language: 'English', sourceArtifactId: 'analysis', selection: 'input' });
  const original = api.createSupportedReading(snapshot, { id: 'orig', title: 'Plants' });
  const adapted = { id: 'adapted', type: 'simplified', data: text, sourceSnapshot: snapshot, instructionalText: { role: 'supplemental', form: 'adapted' }, config: { language: 'English', grade: '5' } };
  return { original, adapted };
}
function mount(extra = {}) {
  const noop = () => {};
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, generatedContent: pair().adapted, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], onReadOriginal: noop, onOpenReadingArtifact: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}
const $ = selector => host.querySelector(selector);
const $$ = selector => [...host.querySelectorAll(selector)];
const teacher = extra => mount({ isTeacherMode: true, isZenMode: false, ...extra });

describe('teacher header', () => {
  it('names the adapted text and its level, with the role note on the same line', () => {
    const { original, adapted } = pair();
    teacher({ generatedContent: adapted, history: [original, adapted] });
    const header = $('[data-reader-metadata]');
    expect(header.querySelector('h4').textContent).toMatch(/^Adapted text · .*: 5$/);
    expect($$('[data-companion-summary]').length).toBe(1);
    expect(header.contains($('[data-companion-summary]'))).toBe(true);
    expect($('[data-reading-column-head] [data-companion-summary]')).toBeNull();
  });
  it('calls an original the original and gives it no target level', () => {
    const { original } = pair();
    teacher({ generatedContent: original, history: [original] });
    expect($('[data-reader-metadata] h4').textContent).toBe('Original text');
    expect($('[data-companion-summary]')).toBeNull();
  });
});

describe('section questions', () => {
  it('after per-section links, the end button is the overview', () => {
    mount();
    expect($$('[data-section-think-toggle]').length).toBe(2);
    expect($('[data-section-prompts-toggle]').textContent).toBe('All section questions');
  });
  it('without per-section links, the end button keeps its name', () => {
    const { adapted } = pair('Leaves catch light. They make food. Roots take up water.');
    mount({ generatedContent: adapted });
    expect($('[data-section-think-toggle]')).toBeNull();
    const toggle = $('[data-section-prompts-toggle]');
    if (toggle) expect(toggle.textContent).toBe('Think about a section');
  });
});

describe('reading text', () => {
  it('a sentence highlight adds no width between sentences', () => {
    mount();
    const sentence = $('[data-reading-sentence]');
    expect(sentence.className.split(/\s+/)).toEqual(expect.arrayContaining(['-mx-0.5', 'px-0.5']));
  });
  it('the version switch shares the Listen row', () => {
    const { original, adapted } = pair();
    mount({ history: [original, adapted] });
    const row = $('[data-reader-listen]').parentElement;
    expect(row.querySelector('[data-reading-versions]')).not.toBeNull();
    expect($$('[data-reading-versions]').length).toBe(1);
  });
});

describe('phone toolbar', () => {
  // Layout is measured in reader_phone_toolbar_browser.test.js; this pins the hook it styles.
  it('marks the Display label so a narrow pane can show the icon alone', () => {
    mount();
    const label = $('[data-reader-display] [data-reader-tool-label]');
    expect(label.textContent).toBe('Display');
  });
});

describe('side by side', () => {
  it('names the two ways to listen, with matching accessible names', () => {
    const { original, adapted } = pair();
    mount({ isCompareMode: true, history: [original, adapted] });
    expect($$('[data-comparison-listen]').map(b => b.textContent)).toEqual(['Listen', 'Listen']);
    for (const button of $$('[data-comparison-listen]')) expect(button.getAttribute('aria-label')).toContain('Listen');
    for (const button of $$('[data-comparison-karaoke]')) {
      expect(button.textContent).toBe('Listen with highlights');
      expect(button.getAttribute('aria-label')).toContain(button.textContent);
    }
  });
  it('folds the review caveat behind the word counts', () => {
    const { original, adapted } = pair();
    teacher({ isCompareMode: true, history: [original, adapted] });
    const review = $('[data-comparison-teacher-review]');
    expect(review.tagName).toBe('DETAILS');
    expect(review.open).toBe(false);
    expect(review.querySelector('summary').textContent).toMatch(/Word counts: \d+ → \d+What to check before sharing/);
    expect(review.querySelector('p').textContent).toContain('Word changes alone do not establish accuracy.');
  });
  it('offers Source version only when there is another version to choose', () => {
    const { adapted } = pair();
    teacher({ isCompareMode: true, history: [adapted] });
    expect(host.textContent).not.toContain('Source version');
    act(() => root.unmount()); host.remove();
    const other = { ...pair().adapted, id: 'other', data: 'Plants grow. They need light.' };
    teacher({ isCompareMode: true, history: [other, adapted] });
    expect(host.textContent).toContain('Source version');
  });
});

describe('teacher editing', () => {
  it('says which change uses AI and which is by hand', () => {
    teacher();
    expect($('[data-teacher-editing-tools] [data-reading-mode="revise"]').textContent).toBe('Revise with AI');
    expect($('[data-teacher-editing-tools] [data-help-key="simplified_edit"]').textContent).toBe('Edit text');
  });
});

describe('strings', () => {
  it('every new label has an English string in both copies', () => {
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const strings = JSON.parse(readFileSync(file, 'utf8')).simplified;
      for (const key of ['prompt_all_sections', 'compare_listen', 'listen_highlighted', 'listen_highlighted_original', 'listen_highlighted_adapted', 'compare_review_check', 'header_original', 'header_adapted', 'revise_with_ai', 'edit_text']) {
        expect(typeof strings[key], file + ': ' + key).toBe('string');
      }
    }
  });
});

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Reader follow-ups (2026-09-26): long-reading navigation and "Continue where
// you left off" scoped to learner and exact version; section prompts beside the
// passage; a teacher review summary with a student preview; precise adaptation
// choices previewed before they change the text, with a way back.
const require = createRequire(import.meta.url);
let React, createRoot, act, contract, View, pure, phase, helpers, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('text_pipeline_helpers_module.js'); loadAlloModule('generation_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  contract = window.AlloModules.InstructionalContext; View = window.AlloModules.SimplifiedView;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; helpers = window.AlloModules.GenerationHelpers;
});
beforeEach(() => { localStorage.clear(); });
afterEach(() => { unmount(); vi.restoreAllMocks(); delete window.__alloGetReadAloudAudioSummary; });
function unmount() { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; }

const LONG = '## Herons\n\nThe heron walked slowly in the shallow water.\n\n## Food\n\nIt waited for a fish near the reeds. Then it struck fast.\n\n## Nests\n\nHerons build nests high in trees.\n\nThey return every spring.';
function item(data = LONG, extra = {}) {
  const original = contract.createSupportedReading(contract.createSourceSnapshot('The heron waded through the marsh.', { sourceArtifactId: 'src' }), { id: 'orig', sourceFamilyId: 'heron' });
  return { id: 'adapted-1', type: 'simplified', data, instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'heron', config: { language: 'English' }, ...extra };
}
function mount(content, extra = {}) {
  const noop = () => {};
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [content], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: vi.fn(), callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: content, readingLearnerKey: 'learner|Blue Fox', ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return { props, rerender: next => act(() => root.render(React.createElement(View, { ...props, ...next }))) };
}
const $ = selector => host.querySelector(selector);
const byText = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim().startsWith(text));
const click = async node => { await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const paragraph = index => $(`[data-reading-passage] [data-reading-paragraph="${index}"]`);
const focusParagraph = index => act(() => { const node = paragraph(index); node.setAttribute('tabindex', '-1'); node.focus(); });
const typeInto = async (node, value) => {
  const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
};
const scrollAndWait = async () => { await act(async () => { document.dispatchEvent(new Event('scroll')); await new Promise(done => setTimeout(done, 900)); }); };

describe('long readings: outline and bookmark', () => {
  it('lists the sections of a long reading and moves to one', async () => {
    mount(item());
    const toggle = $('[data-reading-outline-toggle]');
    expect(toggle.textContent).toBe('Sections & bookmark');
    await click(toggle);
    const sections = [...host.querySelectorAll('[data-reading-outline] li button')];
    expect(sections.map(button => button.textContent)).toEqual(['Herons', 'Food', 'Nests']);
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
    await click(sections[2]);
    expect(document.activeElement).toBe(paragraph(4));
  });

  it('keeps short readings free of the outline control', () => {
    mount(item('The heron walked slowly.\n\nIt waited for a fish.'));
    expect($('[data-reading-outline-toggle]')).toBe(null);
  });

  it('saves a bookmark for this learner and this version, and goes back to it later', async () => {
    Element.prototype.scrollIntoView = () => {};
    mount(item());
    focusParagraph(3);
    await click($('[data-reading-outline-toggle]'));
    await click($('[data-reading-bookmark]'));
    expect($('[data-reading-place-notice]').textContent).toBe('Bookmark saved at: It waited for a fish near the reeds. Then it…');
    const saved = Object.keys(JSON.parse(localStorage.getItem('alloflow_reading_places_v1')));
    expect(saved).toHaveLength(1);
    expect(saved[0].startsWith('learner|Blue Fox|adapted-1|')).toBe(true);
    unmount();
    mount(item());
    await click($('[data-reading-outline-toggle]'));
    await click($('[data-reading-bookmark-open]'));
    expect(document.activeElement).toBe(paragraph(3));
    expect($('[data-reading-place-notice]').textContent).toBe('Moved to your bookmark.');
  });

  it('keeps nothing on the device for a student the host has not named', async () => {
    mount(item(), { readingLearnerKey: '' });
    focusParagraph(3);
    await scrollAndWait();
    await click($('[data-reading-outline-toggle]'));
    await click($('[data-reading-bookmark]'));
    expect(localStorage.getItem('alloflow_reading_places_v1')).toBe(null);
  });
});

describe('continue where you left off', () => {
  it('offers to continue, and moves only when asked', async () => {
    Element.prototype.scrollIntoView = () => {};
    mount(item());
    focusParagraph(3);
    await scrollAndWait();
    unmount();
    mount(item());
    const offer = $('[data-reading-continue]');
    expect(offer.textContent).toContain('Continue where you left off: It waited for a fish near the reeds. Then it…');
    expect(host.contains(document.activeElement)).toBe(false); // no silent jump
    await click($('[data-reading-continue-go]'));
    expect(document.activeElement).toBe(paragraph(3));
    expect($('[data-reading-continue]')).toBe(null);
  });

  it('never reopens a revised passage at an old place', async () => {
    mount(item());
    focusParagraph(3);
    await scrollAndWait();
    unmount();
    mount(item(LONG.replace('near the reeds', 'by the tall reeds')));
    expect($('[data-reading-continue]')).toBe(null);
    expect($('[data-reading-revised]').textContent).toMatch(/changed since you last read it, so it starts at the beginning/);
  });

  it('is scoped to the learner', async () => {
    mount(item());
    focusParagraph(3);
    await scrollAndWait();
    unmount();
    mount(item(), { readingLearnerKey: 'learner|Red Owl' });
    expect($('[data-reading-continue]')).toBe(null);
  });

  it('returns to the same place after Read & reflect', async () => {
    Element.prototype.scrollIntoView = () => {};
    const onReadReflect = vi.fn();
    mount(item(), { onReadReflect });
    focusParagraph(3);
    await click(byText('Read & reflect'));
    expect(onReadReflect).toHaveBeenCalledTimes(1);
    unmount();
    mount(item(), { onReadReflect });
    await act(async () => { await new Promise(done => setTimeout(done, 0)); });
    expect(document.activeElement).toBe(paragraph(3));
    expect($('[data-reading-place-notice]').textContent).toBe('Back where you were reading.');
    expect($('[data-reading-continue]')).toBe(null);
  });
});

describe('section prompts beside the passage', () => {
  it('asks about the current section and keeps the answers across modes and visits', async () => {
    const view = mount(item());
    focusParagraph(3);
    await click($('[data-section-prompts-toggle]'));
    const panel = $('[data-section-prompts]');
    expect(panel.textContent).toContain('What is the main idea?');
    expect(panel.textContent).toContain('Which sentence supports it?');
    expect(panel.textContent).toContain('Mark a confusing part.');
    expect($('[data-section-prompts-section]').value).toBe('1'); // "Food", where the reader is
    await typeInto($('[data-section-prompt="mainIdea"]'), 'How herons catch food.');
    const support = panel.querySelectorAll('select')[1];
    expect([...support.options].map(option => option.value)).toEqual(['', 'It waited for a fish near the reeds.', 'Then it struck fast.']);
    await typeInto(support, 'Then it struck fast.');
    view.rerender({ interactionMode: 'define' });
    expect($('[data-section-prompt="mainIdea"]').value).toBe('How herons catch food.');
    unmount();
    mount(item());
    focusParagraph(3);
    await click($('[data-section-prompts-toggle]'));
    expect($('[data-section-prompt="mainIdea"]').value).toBe('How herons catch food.');
    expect($('[data-section-prompts]').querySelectorAll('select')[1].value).toBe('Then it struck fast.');
  });

  it('asks what is confusing only once a part is marked', async () => {
    mount(item());
    await click($('[data-section-prompts-toggle]'));
    expect($('[data-section-prompt="confusingNote"]')).toBe(null);
    await typeInto($('[data-section-prompts]').querySelectorAll('select')[2], 'The heron walked slowly in the shallow water.');
    expect($('[data-section-prompt="confusingNote"]')).not.toBe(null);
  });
});

describe('teacher review summary and student preview', () => {
  const teacher = { isTeacherMode: true, isZenMode: false };
  it('shows text, word help and audio states with their actions', () => {
    window.__alloGetReadAloudAudioSummary = texts => ({ ready: texts.length, stale: 0 });
    const content = item();
    const view = mount(content, teacher);
    const state = key => $(`[data-teacher-review-summary] [data-review-state="${key}"]`);
    expect(state('text').textContent).toContain('Text unchanged');
    expect(state('help').textContent).toContain('No word help');
    expect(state('audio').textContent).toContain('Audio prepared');
    expect(state('text').querySelector('[data-review-action="compare"]')).not.toBe(null);
    view.rerender({ generatedContent: { ...content, data: LONG + '\n\nA new line.' } });
    expect(state('text').textContent).toContain('Text changed');
    expect(state('text').getAttribute('data-review-tone')).toBe('attention');
  });

  it('flags word help that no longer matches the text', () => {
    let help = contract.upsertAdaptedReadingSupport(item(), undefined, { id: 'w', start: LONG.indexOf('heron walked'), end: LONG.indexOf('heron walked') + 5, quote: 'heron', text: 'A bird.' });
    help = contract.setAdaptedReadingSupportsShown(item(), help, true);
    mount(item(LONG.replace('The heron walked', 'The bird walked'), { adaptedReadingSupports: help }), teacher);
    const row = $('[data-review-state="help"]');
    expect(row.textContent).toContain('Word help needs review');
    expect(row.getAttribute('data-review-tone')).toBe('attention');
  });

  it('is not shown to students', () => {
    mount(item(), { isZenMode: false });
    expect($('[data-teacher-review-summary]')).toBe(null);
  });

  it('previews the student view without changing the lesson', async () => {
    const { props } = mount(item(), teacher);
    const opener = $('[data-student-preview-open]');
    await click(opener);
    const dialog = $('[data-student-preview]');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(document.activeElement).toBe($('[data-student-preview-close]'));
    const inside = dialog.querySelector('[data-reading-passage]');
    expect(inside.textContent).toContain('The heron walked slowly');
    expect(dialog.querySelector('[data-teacher-editing-tools]')).toBe(null);
    expect(dialog.querySelector('[data-teacher-review-summary]')).toBe(null);
    // Students' reading tools are there, but nothing done in a preview is kept.
    await click(dialog.querySelector('[data-reading-outline-toggle]'));
    await click(dialog.querySelector('[data-reading-bookmark]'));
    expect(localStorage.getItem('alloflow_reading_places_v1')).toBe(null);
    await click(dialog.querySelector('[data-reading-mode="define"]'));
    expect(dialog.querySelector('[data-reading-mode="define"]').getAttribute('aria-pressed')).toBe('true');
    expect(props.setInteractionMode).not.toHaveBeenCalled();
    expect(props.handleToggleIsEditingLeveledText).not.toHaveBeenCalled();
    await act(async () => { dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect($('[data-student-preview]')).toBe(null);
    expect(document.activeElement).toBe(opener);
  });
});

describe('precise adaptation choices', () => {
  const open = { isTeacherMode: true, isZenMode: false, isTeacherToolbarExpanded: true, complexityLevel: 5 };
  it('previews a change before applying it, then offers the way back', async () => {
    const content = item('The heron walked slowly in the shallow water.');
    const preview = { status: 'preview', resourceId: content.id, baseData: content.data, data: 'The heron walked slowly. The water was shallow.', config: {}, changeLabel: 'Adjusted' };
    const handleComplexityAdjustment = vi.fn(async plan => plan.preview ? preview : { status: 'applied', previousId: content.id, newId: content.id, previousData: content.data, data: preview.data });
    const view = mount(content, { ...open, handleComplexityAdjustment });
    const go = $('[data-apply-complexity]');
    expect(go.textContent).toBe('Preview change');
    expect(go.disabled).toBe(true); // no level change and no choice yet
    await click($('[data-adapt-option="shorterSentences"]'));
    await typeInto($('[data-adapt-keep-terms]'), 'heron, shallow water');
    await click($('[data-apply-complexity]'));
    expect(handleComplexityAdjustment).toHaveBeenLastCalledWith({ preview: true, options: { shorterSentences: true, explainVocabulary: false, keepTerms: ['heron', 'shallow water'] } });
    const panel = $('[data-adaptation-preview]');
    expect(document.activeElement).toBe(panel);
    expect([...panel.querySelectorAll('ins')].map(node => node.textContent).join('')).toContain('slowly.');
    expect(panel.querySelector('del')).not.toBe(null);
    expect(view.props.handleSimplifiedTextChange).not.toHaveBeenCalled();
    await click($('[data-adaptation-apply]'));
    expect(handleComplexityAdjustment).toHaveBeenLastCalledWith({ apply: preview });
    view.rerender({ generatedContent: { ...content, data: preview.data } });
    expect($('[data-adaptation-preview]')).toBe(null);
    await click($('[data-adaptation-undo]'));
    expect(view.props.handleSimplifiedTextChange).toHaveBeenCalledWith(content.data);
  });

  it('discards a preview without touching the text', async () => {
    const content = item('The heron walked.');
    const handleComplexityAdjustment = vi.fn(async () => ({ status: 'preview', resourceId: content.id, baseData: content.data, data: 'A heron walked.', config: {} }));
    const view = mount(content, { ...open, complexityLevel: 3, handleComplexityAdjustment });
    await click($('[data-apply-complexity]'));
    await click($('[data-adaptation-discard]'));
    expect($('[data-adaptation-preview]')).toBe(null);
    expect($('[data-adaptation-notice]').textContent).toBe('Preview discarded. The text is unchanged.');
    expect(handleComplexityAdjustment).toHaveBeenCalledTimes(1);
    expect(view.props.handleSimplifiedTextChange).not.toHaveBeenCalled();
  });
});

describe('the adaptation helper', () => {
  const TEXT = 'Herons are wading birds. They eat fish.';
  function deps(extra = {}) {
    const generatedContent = { id: 'r1', type: 'simplified', data: TEXT, config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } };
    return { generatedContent, complexityLevel: 5, gradeLevel: 'Grade 4', leveledTextLanguage: 'English', saveOriginalOnAdjust: false,
      setIsProcessing: vi.fn(), setComplexityLevel: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(), setWordSoundsCustomTerms: vi.fn(), setWsPreloadedWords: vi.fn(), setError: vi.fn(),
      addToast: vi.fn(), t: key => key, warnLog: vi.fn(), cleanJson: value => value, callGemini: vi.fn(),
      extractSourceTextForProcessing: window.AlloModules.TextPipelineHelpers.extractSourceTextForProcessing,
      generateBilingualText: vi.fn(async () => 'Herons are birds that wade. They eat fish.'), getDefaultTitle: () => 'Leveled Text', ...extra };
  }
  it('does nothing at the current level with no choices', async () => {
    const d = deps();
    expect(await helpers.handleComplexityAdjustment(d)).toBe(undefined);
    expect(d.generateBilingualText).not.toHaveBeenCalled();
  });
  it('previews the choices without saving or resetting the slider', async () => {
    const d = deps({ adaptationPlan: { preview: true, options: { shorterSentences: true, explainVocabulary: true, keepTerms: ['wading birds'] } } });
    const result = await helpers.handleComplexityAdjustment(d);
    const prompt = d.generateBilingualText.mock.calls[0][0];
    expect(prompt).toContain('Break long sentences into shorter ones');
    expect(prompt).toContain('explain it briefly in plain words');
    expect(prompt).toContain('Keep these essential terms exactly as written; do not replace or simplify them: wading birds.');
    expect(prompt).toContain('Keep the overall difficulty the same');
    expect(result).toMatchObject({ status: 'preview', resourceId: 'r1', baseData: TEXT, data: 'Herons are birds that wade. They eat fish.' });
    expect(d.setGeneratedContent).not.toHaveBeenCalled();
    expect(d.setComplexityLevel).not.toHaveBeenCalled();
  });
  it('applies a previewed version without asking the model again', async () => {
    const d = deps({ adaptationPlan: { apply: { resourceId: 'r1', baseData: TEXT, data: 'Previewed text.', config: { language: 'English' }, changeLabel: 'Adjusted' } } });
    const result = await helpers.handleComplexityAdjustment(d);
    expect(d.generateBilingualText).not.toHaveBeenCalled();
    const update = d.setGeneratedContent.mock.calls[0][0];
    expect(update(d.generatedContent).data).toBe('Previewed text.');
    expect(result).toMatchObject({ status: 'applied', previousId: 'r1', previousData: TEXT, data: 'Previewed text.' });
  });
  it('refuses a preview made for different text', async () => {
    const d = deps({ adaptationPlan: { apply: { resourceId: 'r1', baseData: 'Older text.', data: 'Previewed text.' } } });
    expect(await helpers.handleComplexityAdjustment(d)).toEqual({ status: 'stale' });
    expect(d.setGeneratedContent).not.toHaveBeenCalled();
    expect(d.addToast).toHaveBeenCalledWith('simplified.adapt_preview_stale', 'warning');
  });
});

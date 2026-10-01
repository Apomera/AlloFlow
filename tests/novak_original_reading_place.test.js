// A student reading the preserved original gets the same study tools as the
// adapted companion: Read & reflect, Sections & bookmark (with Continue), and
// Think about a section, with answers saved on the device.
//
// WHY (2026-09-28, lane N1 parity audit): these tools were adapted-only, so the
// grade-level original, which Katie Novak asked to keep at the center, had
// none of them. The original's exact renderer draws lines, not numbered
// paragraphs; each line carries its exact offset, which maps to its paragraph.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, api, pure, phase, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function () {};
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule(process.env.ALLO_CONTEXT_CANDIDATE || 'instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
beforeEach(() => { localStorage.clear(); });
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; });

const TEXT = 'Thunder and lightning. Enter three Witches.\n\nWhen shall we three meet again? In thunder, lightning, or in rain?\n\nWhen the hurlyburly’s done, when the battle’s lost and won.\n\nThat will be ere the set of sun. Upon the heath, there to meet with Macbeth.';
const PARAGRAPH_STARTS = (() => { const starts = [0]; let at = -1; while ((at = TEXT.indexOf('\n\n', at + 1)) !== -1) starts.push(at + 2); return starts; })();
const originalItem = () => api.createSupportedReading(TEXT, { id: 'macbeth-original' });
function mount(item, extra = {}) {
  const noop = () => {};
  const onReadReflect = vi.fn();
  const props = { ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop,
    setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop,
    t: key => key, inputText: '', gradeLevel: '9', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, readingLearnerKey: 'student-1',
    isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: false, isProcessing: false, isPlaying: false,
    interactionMode: 'read', history: [item], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null,
    handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop,
    isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr',
    isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: item,
    onReadReflect, sourceTopic: 'Macbeth 1.1', ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return { onReadReflect };
}
const button = name => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === name);
const click = node => act(async () => { if (!node) throw new Error('Missing control'); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 20)); });

describe('study tools on the preserved original', () => {
  it('a student gets Read & reflect, Sections & bookmark and Think about a section', async () => {
    const { onReadReflect } = mount(originalItem());
    expect(host.querySelector('[data-original-source]')).not.toBeNull();
    expect(button('Sections & bookmark')).toBeTruthy();
    expect(host.querySelector('[data-original-prompts] [data-section-prompts-toggle]')).not.toBeNull();
    await click(button('Read & reflect'));
    expect(onReadReflect).toHaveBeenCalledTimes(1);
    const sent = onReadReflect.mock.calls[0][0];
    expect(sent.text).toBe(TEXT);
    expect(sent.title).toBe('Macbeth 1.1');
    expect(sent.anchor).toMatchObject({ kind: 'adapted', resourceId: 'macbeth-original' });
  });
  it('without a topic, the reflection is titled as the original', async () => {
    const { onReadReflect } = mount(originalItem(), { sourceTopic: '' });
    await click(button('Read & reflect'));
    expect(onReadReflect.mock.calls[0][0].title).toBe('Original reading');
  });
  it('Sections jump to the first line of the right paragraph of the exact text', async () => {
    mount(originalItem());
    await click(button('Sections & bookmark'));
    const sections = [...host.querySelectorAll('[data-reading-outline] ol button')];
    expect(sections).toHaveLength(4);
    await click(sections[3]);
    const focused = document.activeElement;
    expect(focused.closest('[data-original-source]')).not.toBeNull();
    expect(Number(focused.getAttribute('data-reading-offset-start'))).toBe(PARAGRAPH_STARTS[3]);
    await click(sections[1]);
    expect(Number(document.activeElement.getAttribute('data-reading-offset-start'))).toBe(PARAGRAPH_STARTS[1]);
  });
  it('answers to Think about a section are saved on the device and come back', async () => {
    mount(originalItem());
    await click(host.querySelector('[data-section-prompts-toggle]'));
    const mainIdea = host.querySelector('[data-section-prompt="mainIdea"]');
    act(() => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(mainIdea, 'The witches plan to meet Macbeth.'); mainIdea.dispatchEvent(new Event('input', { bubbles: true })); });
    await settle();
    act(() => root.unmount()); host.remove();
    mount(originalItem());
    await click(host.querySelector('[data-section-prompts-toggle]'));
    expect(host.querySelector('[data-section-prompt="mainIdea"]').value).toBe('The witches plan to meet Macbeth.');
    // The words of the original were never changed by any of this.
    expect(host.querySelector('[data-original-source]').textContent.replace(/\s+/g, '')).toBe(TEXT.replace(/\s+/g, ''));
  });
  it('a click in the original text marks the place, and Think about a section opens on that paragraph', async () => {
    mount(originalItem());
    const line = [...host.querySelectorAll('[data-original-source] [data-reading-offset-start]')].find(node => Number(node.getAttribute('data-reading-offset-start')) === PARAGRAPH_STARTS[2]);
    act(() => { line.dispatchEvent(new Event('pointerdown', { bubbles: true })); });
    await click(host.querySelector('[data-section-prompts-toggle]'));
    expect(host.querySelector('[data-section-prompts-section]').value).toBe('2');
  });
  it('Both view still keeps these on the single readings only', () => {
    const source = originalItem();
    const adapted = { id: 'adapted', type: 'simplified', data: 'The witches will meet Macbeth.', sourceSnapshot: source.sourceSnapshot, sourceFamilyId: source.sourceFamilyId, config: { language: 'English' },
      instructionalText: { form: 'adapted', role: 'supplemental', replacementAuthorization: { authorized: false, source: 'none' } } };
    mount(adapted, { isCompareMode: true, history: [source, adapted] });
    expect(button('Sections & bookmark')).toBeFalsy();
    expect(host.querySelector('[data-section-prompts-toggle]')).toBeNull();
  });
});

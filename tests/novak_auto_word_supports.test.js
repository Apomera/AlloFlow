// Word supports appear on the FIRST teacher open of a preserved original,
// without the teacher having to find "Add word supports".
//
// WHY (Katie Novak, 2026-09): keep the grade-level words and add supports like
// "A heath is an area of open land" THROUGHOUT the text, instead of replacing
// language. Supports only ever ran on a click, so most teachers never saw them.
// Now, with AI available, the first teacher open asks for them once; the
// reading is usable at once, a notice says AI added them, the teacher can
// review, edit or remove them, and a remembered switch turns this off. With AI
// off, or for students, nothing happens.
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
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule(process.env.ALLO_CONTEXT_CANDIDATE || 'instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
beforeEach(() => { View.resetAutoWordSupportRuns(); localStorage.removeItem('alloflow_auto_word_supports'); localStorage.removeItem('alloflow_auto_word_supports_day'); window.__alloResolveAiCapability = () => ({ text: true, reason: 'canvas' }); });
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; delete window.__alloResolveAiCapability; vi.restoreAllMocks(); });

const MACBETH = 'When shall we three meet again\nIn thunder, lightning, or in rain?\nWhen the hurlyburly’s done,\nWhen the battle’s lost and won.\nThat will be ere the set of sun.\nWhere the place?\nUpon the heath.\nThere to meet with Macbeth.';
const at = (word, text) => { const start = MACBETH.indexOf(word); return { start, end: start + word.length, quote: word, text }; };
const AI_REPLY = { status: 'complete', annotations: [
  { id: 'g-hurly', ...at('hurlyburly', 'Hurlyburly means noisy confusion; here, the battle.') },
  { id: 'g-ere', ...at('ere', 'Ere means before.') },
  { id: 'g-heath', ...at('heath', 'A heath is an area of open land with rough grass and low bushes.') },
] };
const deferred = () => { let yes, no; const promise = new Promise((a, b) => { yes = a; no = b; }); return { promise, resolve: yes, reject: no }; };

// A host that behaves like AlloFlowANTI's handlers: generation merges into the
// saved original; the passage itself never changes.
function mount({ item = api.createSupportedReading(MACBETH, { id: 'macbeth-1-1' }), teacher = true, preview = false, reply = () => AI_REPLY } = {}) {
  const state = { item, history: [item] };
  const noop = () => {};
  const save = next => { state.item = next; state.history = state.history.map(entry => entry.id === next.id ? next : entry); act(render); };
  const generate = vi.fn(async owner => {
    const result = await reply(owner);
    const merged = api.mergeReadingSupports(state.item, state.item.readingSupports, result);
    save({ ...state.item, readingSupports: merged });
    return merged;
  });
  const update = vi.fn(async (owner, action) => {
    const current = state.item;
    const saved = action.type === 'remove' ? api.removeReadingSupport(current, current.readingSupports, action.id)
      : action.type === 'upsert' ? api.upsertReadingSupport(current, current.readingSupports, action.annotation)
        : api.setReadingSupportPinned(current, current.readingSupports, action.id, action.pinned);
    save({ ...current, readingSupports: saved });
    return saved;
  });
  const props = () => ({ ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop,
    setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop,
    t: key => key, inputText: '', gradeLevel: '9', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: teacher, isStudentPreview: preview,
    isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: false, isProcessing: false, isPlaying: false,
    interactionMode: 'read', history: state.history, textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null,
    handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop,
    isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr',
    isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: state.item,
    onUpdateReadingSupports: update, onGenerateReadingSupports: generate });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  function render() { root.render(React.createElement(View, props())); }
  act(render);
  return { state, generate, update, render: () => act(render), unmount: () => { act(() => root.unmount()); host.remove(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); } };
}
const passage = () => host.querySelector('[data-original-source]');
const auto = () => host.querySelector('[data-auto-word-supports]');
const switchBox = () => host.querySelector('[data-auto-supports-switch]');
const settle = () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
const click = node => act(async () => { if (!node) throw new Error('Missing control'); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

describe('first teacher open of a preserved original', () => {
  it('asks AI for word supports once, while the reading is already usable', async () => {
    const pending = deferred();
    const view = mount({ reply: () => pending.promise });
    // The original is on screen before any support arrives.
    expect(passage().textContent).toContain('hurlyburly');
    expect(auto().getAttribute('data-auto-word-supports')).toBe('working');
    expect(auto().textContent).toContain('Adding word supports with AI. You can start reading now.');
    await settle();
    expect(view.generate).toHaveBeenCalledTimes(1);
    expect(view.generate.mock.calls[0][0].id).toBe('macbeth-1-1');
    pending.resolve(AI_REPLY); await settle();
    // Supports sit beside the exact words; nothing in the text was replaced.
    const glosses = [...passage().querySelectorAll('[data-reading-gloss]')].map(node => node.textContent);
    expect(glosses.join(' ')).toContain('A heath is an area of open land');
    expect(glosses.join(' ')).toContain('Hurlyburly means noisy confusion');
    expect(passage().textContent).toContain('Upon the heath');
    expect(view.state.item.data).toBe(MACBETH);
    expect(auto().getAttribute('data-auto-word-supports')).toBe('added');
    expect(auto().querySelector('[role=status]').textContent).toBe('Word supports added by AI. Review them.');
    // Reopening the same reading does not ask again.
    view.unmount(); view.render(); await settle();
    expect(view.generate).toHaveBeenCalledTimes(1);
  });

  it('never asks when the reading already has supports (a teacher already added or removed them)', async () => {
    const item = api.createSupportedReading(MACBETH, { id: 'macbeth-saved' });
    item.readingSupports = api.validateReadingSupports(item, { annotations: [], suppressedAnnotations: [] });
    const view = mount({ item });
    await settle();
    expect(view.generate).not.toHaveBeenCalled();
  });

  it('does not retry a failed request on every open, and says the original is unchanged', async () => {
    const view = mount({ reply: () => Promise.reject(new Error('offline')) });
    await settle();
    expect(view.generate).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-gloss-status]').textContent).toContain('The original is unchanged.');
    view.unmount(); view.render(); await settle();
    expect(view.generate).toHaveBeenCalledTimes(1);
    expect(view.state.item.data).toBe(MACBETH);
  });

  it('Review and edit supports opens the support list; Remove AI supports removes only AI supports', async () => {
    const view = mount(); await settle();
    // A teacher's own support must survive "Remove AI supports".
    await act(async () => { await view.update(view.state.item, { type: 'upsert', annotation: at('Macbeth', 'The title character, a Scottish general.') }); });
    await click(host.querySelector('[data-auto-supports-review]'));
    const toggle = [...host.querySelectorAll('button')].find(node => node.textContent.startsWith('Review word supports'));
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(auto().getAttribute('data-auto-word-supports')).toBe('done');
    // The notice is gone once reviewed; bring it back to test removal on a fresh reading.
    view.unmount();
    const second = mount({ item: api.createSupportedReading(MACBETH, { id: 'macbeth-2' }) }); await settle();
    await act(async () => { await second.update(second.state.item, { type: 'upsert', annotation: at('Macbeth', 'The title character, a Scottish general.') }); });
    await click(host.querySelector('[data-auto-supports-remove]')); await settle();
    const left = second.state.item.readingSupports.annotations;
    expect(left.map(entry => entry.quote)).toEqual(['Macbeth']);
    expect(left[0].origin).toBe('educator');
    expect(host.querySelector('[data-gloss-status]').textContent).toBe('AI word supports removed. The original is unchanged.');
    expect(second.state.item.data).toBe(MACBETH);
  });
});

describe('when nothing should happen', () => {
  it('with AI off, no request and no new controls', async () => {
    window.__alloResolveAiCapability = () => ({ text: false, reason: 'none' });
    const view = mount(); await settle();
    expect(view.generate).not.toHaveBeenCalled();
    expect(switchBox()).toBeNull();
    expect(auto().getAttribute('data-auto-word-supports')).toBe('idle');
    expect(auto().textContent).toBe('');
  });
  it('with no AI resolver at all (fails closed), no request', async () => {
    delete window.__alloResolveAiCapability;
    const view = mount(); await settle();
    expect(view.generate).not.toHaveBeenCalled();
  });
  it('for a student, or a teacher previewing as a student, no request', async () => {
    const student = mount({ teacher: false }); await settle();
    expect(student.generate).not.toHaveBeenCalled();
    expect(auto()).toBeNull();
    student.unmount();
    const preview = mount({ item: api.createSupportedReading(MACBETH, { id: 'macbeth-preview' }), preview: true }); await settle();
    expect(preview.generate).not.toHaveBeenCalled();
  });
  it('for an adapted text, no request (supports belong to the original)', async () => {
    const adapted = { id: 'adapted-1', type: 'simplified', data: 'The witches plan to meet Macbeth.', instructionalText: { form: 'adapted', role: 'supplemental' } };
    const view = mount({ item: adapted }); await settle();
    expect(view.generate).not.toHaveBeenCalled();
  });
});

describe('the remembered off switch', () => {
  it('turning it off is saved and stops the next first open; turning it on again works', async () => {
    const first = mount({ reply: () => new Promise(() => {}) }); await settle();
    expect(switchBox().checked).toBe(true);
    await act(async () => { switchBox().click(); });
    expect(localStorage.getItem('alloflow_auto_word_supports')).toBe('off');
    first.unmount();
    const next = mount({ item: api.createSupportedReading(MACBETH, { id: 'macbeth-off' }) }); await settle();
    expect(next.generate).not.toHaveBeenCalled();
    expect(switchBox().checked).toBe(false);
    await act(async () => { switchBox().click(); }); await settle();
    expect(localStorage.getItem('alloflow_auto_word_supports')).toBe('on');
    expect(next.generate).toHaveBeenCalledTimes(1);
  });
});

describe('what automatic supports cost', () => {
  const today = () => { const now = new Date(); return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'); };
  it('runs only for an original that is the main reading, not one marked as supporting', async () => {
    const view = mount({ item: api.createSupportedReading(MACBETH, { id: 'macbeth-supporting', role: 'supplemental' }) }); await settle();
    expect(view.generate).not.toHaveBeenCalled();
  });
  it('counts each automatic run for today on this device', async () => {
    mount(); await settle();
    expect(JSON.parse(localStorage.getItem('alloflow_auto_word_supports_day'))).toEqual({ day: today(), count: 1 });
  });
  it('stops after 10 automatic runs a day and says so; the manual button still works', async () => {
    localStorage.setItem('alloflow_auto_word_supports_day', JSON.stringify({ day: today(), count: 10 }));
    const view = mount(); await settle();
    expect(view.generate).not.toHaveBeenCalled();
    expect(auto().getAttribute('data-auto-word-supports')).toBe('paused');
    expect(auto().querySelector('[role=status]').textContent).toBe('Word supports are added automatically for up to 10 originals a day on this device. Use Add word supports for this one.');
    const manual = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Add word supports');
    await click(manual); await settle();
    expect(view.generate).toHaveBeenCalledTimes(1);
  });
  it('counts by the local date, not the UTC date', async () => {
    // A local time on a different UTC date: late evening west of UTC, just after midnight east of it.
    const offset = new Date(2026, 8, 28, 12).getTimezoneOffset();
    if (offset === 0) return;
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(offset > 0 ? new Date(2026, 8, 28, 23, 30) : new Date(2026, 8, 28, 0, 30));
      expect(new Date().toISOString().slice(0, 10)).not.toBe('2026-09-28');
      mount(); await settle();
      expect(JSON.parse(localStorage.getItem('alloflow_auto_word_supports_day')).day).toBe('2026-09-28');
    } finally { vi.useRealTimers(); }
  });
  it('a count from an earlier day does not carry over', async () => {
    localStorage.setItem('alloflow_auto_word_supports_day', JSON.stringify({ day: '2000-01-01', count: 10 }));
    const view = mount(); await settle();
    expect(view.generate).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('alloflow_auto_word_supports_day'))).toEqual({ day: today(), count: 1 });
  });
});

describe('shouldAutoSuggestReadingSupports', () => {
  const base = () => ({ isTeacherMode: true, isStudentPreview: false, verifiedOriginal: true, isMainReading: true, canGenerate: true, aiAvailable: true, off: false, item: { id: 'x' }, owner: null, key: 'x:fp' });
  it('is true only when every condition holds', () => {
    expect(View.shouldAutoSuggestReadingSupports(base())).toBe(true);
    for (const [field, value] of [['isTeacherMode', false], ['isStudentPreview', true], ['verifiedOriginal', false], ['isMainReading', false], ['canGenerate', false], ['aiAvailable', false], ['off', true], ['key', ''], ['item', null]]) {
      expect(View.shouldAutoSuggestReadingSupports({ ...base(), [field]: value }), field).toBe(false);
    }
    expect(View.shouldAutoSuggestReadingSupports({ ...base(), item: { id: 'x', readingSupports: { annotations: [] } } })).toBe(false);
    expect(View.shouldAutoSuggestReadingSupports({ ...base(), owner: { readingSupports: { annotations: [] } } })).toBe(false);
  });
});

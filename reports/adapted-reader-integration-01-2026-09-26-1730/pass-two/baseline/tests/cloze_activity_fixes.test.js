// Fill in the blanks: one blank per place, a real "complete", a Reset that
// resets, read-aloud that does not read the answers, and no empty activity.
//
// WHY (2026-09-24), from an audit of the adapted-text reader:
// - A blank's id was `cloze-<part index>-<term>-<text length>`. A bolded term is
//   its own piece of text, so every bolded "photosynthesis" had the same id:
//   solving one filled every copy.
// - "Complete" never fired: its set was only ever cleared, never added to.
// - Reset cleared that unused set, not the solved blanks, so it did nothing.
// - Listen in this mode read the missing words aloud.
// - With no glossary the activity showed a passage with no blanks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, textUtil, phase;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: key => key });
  // The host puts its icons on window (Object.assign(window, {...CheckCircle2...})).
  window.CheckCircle2 = () => null;
  // *_CANDIDATE paths let a mutation check load scratch copies of modules.
  const env = process.env;
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule(env.ALLO_PHASEN_CANDIDATE || 'phase_n_misc_helpers_module.js');
  loadAlloModule(env.ALLO_MISC_CANDIDATE || 'misc_components_module.js'); loadAlloModule(env.ALLO_TEXTUTIL_CANDIDATE || 'text_utility_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; textUtil = window.AlloModules.TextUtilityHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
const GLOSSARY = [{ term: 'photosynthesis', definition: 'how plants make food', isSelected: true }];
const walk = (node, out = []) => {
  if (Array.isArray(node)) { node.forEach(n => walk(n, out)); return out; }
  if (node && typeof node === 'object' && node.props) {
    if (node.props.targetWord) out.push(node);
    walk(node.props.children, out);
  }
  return out;
};

describe('each blank is its own blank', () => {
  const deps = solved => ({ clozeInstanceSet: new Set(solved), setClozeInstanceSet: vi.fn(), playSound: vi.fn(), handleScoreUpdate: vi.fn(), generatedContent: { id: 'r' }, leveledTextLanguage: 'English', latestGlossary: GLOSSARY });
  it('the same bolded term in two sentences gets two different ids', () => {
    const d = deps([]);
    const first = walk(textUtil.highlightGlossaryTerms('photosynthesis', GLOSSARY, true, false, d, 's1.1.0'))[0];
    const second = walk(textUtil.highlightGlossaryTerms('photosynthesis', GLOSSARY, true, false, d, 's4.1.0'))[0];
    act(() => first.props.onCorrect('photosynthesis'));
    const added = d.setClozeInstanceSet.mock.calls[0][0](new Set());
    expect([...added]).toEqual(['cloze-s1.1.0-1-photosynthesis']);
    const solvedFirst = deps(added);
    expect(walk(textUtil.highlightGlossaryTerms('photosynthesis', GLOSSARY, true, false, solvedFirst, 's1.1.0'))[0].props.isSolved).toBe(true);
    expect(walk(textUtil.highlightGlossaryTerms('photosynthesis', GLOSSARY, true, false, solvedFirst, 's4.1.0'))[0].props.isSolved).toBe(false);
    expect(second.props.isSolved).toBe(false);
  });
  it('the formatter passes a key made of the sentence, part and sub-part', () => {
    const seen = [];
    const d = { latestGlossary: GLOSSARY, highlightGlossaryTerms: (text, g, cloze, dark, key) => { seen.push(key); return text; }, MathSymbol: () => null };
    phase.formatInteractiveText('Plants use **photosynthesis** daily.', true, false, d, 's7');
    expect(seen.filter(Boolean)).toEqual(expect.arrayContaining(['s7.1.0']));
    expect(new Set(seen.filter(Boolean)).size).toBe(seen.filter(Boolean).length);
  });
});

function mount(extra = {}) {
  const noop = () => {}, handleSpeak = vi.fn(), formatInteractiveText = vi.fn((text, cloze, dark, key) => React.createElement('span', { 'data-fit-key': key }, text));
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, generatedContent: { id: 'reading', type: 'simplified', data: 'Plants use photosynthesis every day. Photosynthesis needs light.', config: { language: 'English', grade: '5' } }, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'cloze', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak, handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText, SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: GLOSSARY, ConfettiExplosion: () => null, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return { props, handleSpeak, formatInteractiveText };
}

describe('the reader in Fill in the blanks', () => {
  it('asks the formatter for blanks keyed by the sentence number', () => {
    const { formatInteractiveText } = mount();
    const keys = formatInteractiveText.mock.calls.filter(c => c[1] === true).map(c => c[3]);
    expect([...new Set(keys)]).toEqual(['s0', 's1']);
  });
  it('Listen says "blank" instead of the answers, only in this mode', () => {
    const { handleSpeak } = mount();
    act(() => host.querySelector('[data-reader-listen]').click());
    expect(handleSpeak.mock.calls[0][0]).toBe('Plants use blank every day. blank needs light.');
    act(() => root.unmount()); host.remove(); root = null;
    const read = mount({ interactionMode: 'read' });
    act(() => host.querySelector('[data-reader-listen]').click());
    expect(read.handleSpeak.mock.calls[0][0]).toBe('Plants use photosynthesis every day. Photosynthesis needs light.');
  });
  it('shows "complete" only when every blank on the page is solved', () => {
    const blank = solved => (text, cloze, dark, key) => React.createElement('span', { 'data-cloze-blank': 'true', 'data-cloze-solved': solved(key) ? 'true' : 'false' }, text);
    mount({ formatInteractiveText: blank(key => key === 's0') });
    expect(host.querySelector('[data-a11y-overlay="nonmodal-status"]')).toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    mount({ formatInteractiveText: blank(() => true) });
    expect(host.querySelector('[data-a11y-overlay="nonmodal-status"]')).not.toBeNull();
  });
  it('Fill in the blanks is offered only when the glossary has a term to blank', () => {
    const find = () => host.querySelector('[data-help-key="simplified_cloze_mode"]');
    mount({ interactionMode: 'read', latestGlossary: [] });
    expect(find()).toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    mount({ interactionMode: 'read' });
    expect(find()).not.toBeNull();
  });
});

describe('the word bank', () => {
  it('Reset clears the solved blanks, not only the unused completion set', () => {
    loadAlloModule(process.env.ALLO_PANEL_CANDIDATE || 'view_cloze_interaction_panel_module.js');
    const Panel = window.AlloModules.ClozeInteractionPanel.ClozeInteractionPanel;
    const setClozeInstanceSet = vi.fn(), setClozeCompletedSet = vi.fn();
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(Panel, { activeView: 'simplified', interactionMode: 'cloze', latestGlossary: GLOSSARY, leveledTextLanguage: 'English', playSound: () => {}, setClozeCompletedSet, setClozeInstanceSet, t: k => k, handleBankMouseDown: () => {}, handleSetInteractionModeToRead: () => {}, wordBankPosition: null, wordBankRef: React.createRef() })));
    act(() => host.querySelector('button[aria-label="common.refresh"]').click());
    expect(setClozeInstanceSet).toHaveBeenCalledTimes(1);
    expect(setClozeInstanceSet.mock.calls[0][0].size).toBe(0);
  });
});

describe('the blank itself', () => {
  it('keeps its name and says whether it is solved', () => {
    const Cloze = window.AlloModules.ClozeInput;
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(Cloze, { targetWord: 'cell', acceptedAnswers: ['cell'], passageWord: 'cell', isSolved: false, onCorrect: () => {} })));
    expect(host.querySelector('input').getAttribute('aria-label')).toBe('games.fill_blank.input_label');
    expect(host.querySelector('[data-cloze-blank]').getAttribute('data-cloze-solved')).toBe('false');
    act(() => root.render(React.createElement(Cloze, { targetWord: 'cell', acceptedAnswers: ['cell'], passageWord: 'cell', isSolved: true, onCorrect: () => {} })));
    expect(host.querySelector('[data-cloze-blank]').getAttribute('data-cloze-solved')).toBe('true');
  });
});

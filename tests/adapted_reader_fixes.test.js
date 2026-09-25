// Adapted reading: language, charts, dividers, money, absolute values, and
// comparison signs.
//
// WHY (2026-09-24), from an audit of the adapted-text reader:
// - Listen and sentence clicks never passed the reading's own language, so a
//   Spanish reading opened with the app set to English was spoken as English.
//   Clicking the first sentence during playback stopped it instead.
// - [[CHART: {json}]] directives were shown and read aloud as raw JSON.
// - A "---" divider was a clickable "sentence".
// - "Sam had $5 and spent $3" lost both dollar signs to math formatting.
// - The sentence splitter used "|" internally, so "|-3| = 3" became "-3 = 3".
// - Karaoke, Immersive and the focus/crawl overlays deleted everything between
//   "<" and ">", so "x < 5 and y > 3" became "x  3".
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  // A *_CANDIDATE path lets a mutation check load a scratch copy of a module
  // instead of editing the shared one.
  const env = process.env;
  // tests/setup.js preloads the real pure helpers, and the module skips itself
  // when already loaded, so a candidate would never run without this.
  if (env.ALLO_PURE_CANDIDATE) { delete window.AlloModules.PureHelpersModule; delete window.AlloModules.PureHelpers; }
  loadAlloModule('instructional_context_module.js'); loadAlloModule(env.ALLO_PURE_CANDIDATE || 'pure_helpers_module.js'); loadAlloModule(env.ALLO_PHASEN_CANDIDATE || 'phase_n_misc_helpers_module.js');
  loadAlloModule(env.ALLO_KARAOKE_CANDIDATE || 'karaoke_audio_store_module.js'); loadAlloModule(env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
const split = text => pure.splitTextToSentences(text, {});
const parts = text => {
  const p = String(text).split('--- ENGLISH TRANSLATION ---');
  return p.length < 2 ? null : { source: p[0].trim().split(/\n{2,}/), target: p[1].trim().split(/\n{2,}/), sourceFull: p[0].trim(), targetFull: p[1].trim() };
};
function mount(data, extra = {}) {
  const noop = () => {}, handleSpeak = vi.fn();
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, generatedContent: { id: 'reading', type: 'simplified', data, config: { language: 'English', grade: '5' } }, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: split, getSideBySideContent: parts, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak, handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', { 'data-host-rendered': true }, /\[\[CHART:/.test(text) ? 'CHART DRAWN' : text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => React.createElement('span', { 'data-math': true }, text) }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  const body = host.querySelector('[data-simplified-reading-body]');
  const sentences = () => [...host.querySelectorAll('[data-reading-sentence]')];
  return { props, handleSpeak, body, sentences };
}
const click = el => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

describe('read-aloud uses the reading\'s own language', () => {
  it('Listen and sentence clicks pass the resource language, not the app setting', () => {
    const { handleSpeak, props, sentences } = mount('Hola a todos. El agua se mueve.', { generatedContent: { id: 'es', type: 'simplified', data: 'Hola a todos. El agua se mueve.', config: { language: 'Spanish', grade: '5' } } });
    click(host.querySelector('[data-reader-listen]'));
    expect(handleSpeak).toHaveBeenLastCalledWith('Hola a todos. El agua se mueve.', 'simplified-main', 0, false, 'Spanish');
    click(sentences()[1]);
    expect(handleSpeak).toHaveBeenLastCalledWith('Hola a todos. El agua se mueve.', 'simplified-main', 1, true, 'Spanish');
    expect(props.leveledTextLanguage).toBe('English');
  });
  it('clicking the first sentence restarts rather than toggling playback off', () => {
    const { handleSpeak, sentences } = mount('First one. Second one.');
    click(sentences()[0]);
    expect(handleSpeak.mock.calls.at(-1).slice(2, 4)).toEqual([0, true]);
  });
});

describe('charts and dividers', () => {
  const TEXT = 'Rain falls often.\n[[CHART: {"type":"bar","title":"Rain. Totals","data":[1,2]}]]\nIt helps plants.\n\n---\n\nThe end.';
  it('a chart directive is drawn by the host renderer, never shown or read as JSON', () => {
    const { body, sentences } = mount(TEXT);
    expect(body.textContent).toContain('CHART DRAWN');
    expect(body.querySelector('[data-reading-chart]')).not.toBeNull();
    expect(body.textContent).not.toMatch(/"type"|\[\[CHART/);
    expect(sentences().map(s => s.textContent.trim())).toEqual(['Rain falls often.', 'It helps plants.', 'The end.']);
  });
  it('a divider is a rule, not a clickable sentence, and sentence numbers stay continuous', () => {
    const { body, sentences } = mount(TEXT);
    expect(body.querySelector('hr')).not.toBeNull();
    expect(sentences().map(s => Number(s.dataset.readingSentence))).toEqual([0, 1, 2]);
    expect(body.textContent).not.toContain('---');
  });
  it('the splitter drops chart directives and dividers from every read-aloud list', () => {
    expect(split(TEXT)).toEqual(['Rain falls often.', 'It helps plants.', 'The end.']);
    expect(split('A.\n\n* * *\n\nB.')).toEqual(['A.', 'B.']);
  });
});

describe('screen reader and translated text', () => {
  it('read-aloud is announced once, not sentence by sentence over the voice', () => {
    const quiet = mount('First one. Second one.');
    const status = host.querySelector('[data-read-aloud-status]');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('');
    act(() => root.unmount()); host.remove(); root = null;
    mount('First one. Second one.', { isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 1, sentences: ['First one.', 'Second one.'] } });
    const playing = host.querySelector('[data-read-aloud-status]').textContent;
    expect(playing).toBe('Reading aloud');
    expect(playing).not.toContain('Second one.');
    expect(quiet).toBeTruthy();
  });
  it('the UDL goal keeps its body when the translation uses a full-width colon', () => {
    const goal = 'UDL 目标：提供理解的多种选项';
    mount('Text.', { isTeacherMode: true, isZenMode: false, t: key => key === 'simplified.udl_goal' ? goal : key });
    const box = [...host.querySelectorAll('p')].find(p => p.textContent.includes('UDL 目标'));
    expect(box.querySelector('strong').textContent).toBe('UDL 目标：');
    expect(box.textContent).toContain('提供理解的多种选项');
  });
  it('an English goal with a second colon keeps everything after the first', () => {
    mount('Text.', { isTeacherMode: true, isZenMode: false, t: key => key === 'simplified.udl_goal' ? 'UDL Goal: reduce load: keep the original' : key });
    const box = [...host.querySelectorAll('p')].find(p => p.textContent.includes('UDL Goal'));
    expect(box.querySelector('strong').textContent).toBe('UDL Goal:');
    expect(box.textContent).toContain('reduce load: keep the original');
  });
});

describe('money, absolute values and comparison signs survive', () => {
  it('"$5 ... $3" stays money; real inline math still renders as math', () => {
    const { body } = mount('Sam had $5 and spent $3 on lunch. The area is $x^2$ units.');
    expect(body.textContent).toContain('Sam had $5 and spent $3 on lunch.');
    const math = [...body.querySelectorAll('[data-math]')].map(n => n.textContent);
    expect(math).toEqual(['$x^2$']);
  });
  it('absolute value bars are kept in the display and in the sentences', () => {
    const { body } = mount('The distance is |-3| = 3 units. Next.');
    expect(body.textContent).toContain('|-3| = 3 units.');
    expect(split('The distance is |-3| = 3 units. Next.')).toEqual(['The distance is |-3| = 3 units.', 'Next.']);
  });
  it('karaoke keeps "<" and ">" comparisons and still removes real tags', () => {
    const store = window.AlloModules.KaraokeAudioStore;
    expect(store.splitSentences('If x < 5 and y > 3, then z is small.').join(' ')).toBe('If x < 5 and y > 3, then z is small.');
    expect(store.splitSentences('A <b>bold</b> word.').join(' ')).toBe('A bold word.');
  });
});

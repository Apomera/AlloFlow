// The reader numbers sentences the way read-aloud does.
//
// WHY (2026-09-24): playback splits each paragraph into sentences as a whole
// (phase_k handleSpeak); the reader split each list item and line on its own. A
// list item whose last line has no end punctuation runs into the next line in
// playback ("- Item one\n  continues here\nThen a plain line" is one spoken
// sentence) but was two in the reader, so every later click started reading one
// sentence early and every highlight landed one sentence late.
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
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

function mount(data, extra = {}) {
  const noop = () => {};
  const props = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'a', type: 'simplified', data, config: { language: 'English' } }, leveledTextLanguage: 'English', isTeacherMode: false, isZenMode: true, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze, dark, key) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }, key), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}
const numbered = () => [...host.querySelectorAll('[data-reading-sentence]')].map(s => [Number(s.dataset.readingSentence), s.textContent.trim()]);
// phase_k handleSpeak: paragraphs, table paragraphs skipped, each split as a whole.
const spokenList = text => text.split(/\n{2,}/).flatMap(p => (p.trim().startsWith('|') || p.includes('\n|')) ? [] : pure.splitTextToSentences(p, {}));

const RUN_ON = '- Item one\n  continues here\nThen a plain line\n\nNext para. Done.';

describe('sentence numbers match read-aloud', () => {
  it('a list line that runs into the next line shares its spoken number', () => {
    mount(RUN_ON);
    expect(numbered().map(([n, text]) => [n, text.replace(/\s+/g, ' ')])).toEqual([[0, 'Item one continues here'], [0, 'Then a plain line'], [1, 'Next para.'], [2, 'Done.']]);
    expect(spokenList(RUN_ON)[1]).toBe('Next para.');
  });
  it('later sentences in the same paragraph keep their own numbers', () => {
    const text = '- Item one\n  continues here\nThen a plain line. Another sentence here.\n\nLast one.';
    mount(text);
    expect(numbered().map(([n]) => n)).toEqual([0, 0, 1, 2]);
    expect(spokenList(text)).toHaveLength(3);
  });
  it('clicking a later sentence reads from that sentence', () => {
    const props = mount(RUN_ON);
    act(() => host.querySelector('[data-reading-sentence="2"]').click());
    const [, , index] = props.handleSpeak.mock.calls[0];
    expect(spokenList(RUN_ON)[index]).toBe('Done.');
  });
  it('highlights both parts of the shared sentence, and only one carries its id', () => {
    mount(RUN_ON, { isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 0 } });
    const parts = [...host.querySelectorAll('[data-reading-sentence="0"]')];
    expect(parts).toHaveLength(2);
    expect(parts.every(p => p.getAttribute('aria-current') === 'true')).toBe(true);
    expect(host.querySelectorAll('#sentence-0')).toHaveLength(1);
  });
  it('fill-in-the-blank keys stay unique when parts share a number', () => {
    // Each blank's id is built from this key (text_utility highlightGlossaryTerms).
    const keys = [];
    mount(RUN_ON, { interactionMode: 'cloze', latestGlossary: [{ term: 'line' }], formatInteractiveText: (text, cloze, dark, key) => { if (cloze) keys.push(key); return text; } });
    expect(keys.length % 4).toBe(0); // four sentence parts per render
    expect(new Set(keys.slice(-4)).size).toBe(4);
  });
  it('ordinary lists keep one number per sentence', () => {
    mount('- Item one is long.\n  It continues here.\n- Item two.\nThen a plain line.\n\nNext para.');
    expect(numbered().map(([n]) => n)).toEqual([0, 1, 2, 3, 4]);
  });
});

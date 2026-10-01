// Immersive Reader highlights the words of the sentence being read.
//
// WHY (2026-09-24): Immersive's words are made from the whole text, including
// table rows, the translation divider and chart code, but the sentence list it
// highlights leaves those out. Words were matched to sentences by running
// character count, so after a table "Earth has one moon." lit up the table's
// header cells, and in a bilingual reading the first English sentence lit up
// the divider. Each word is now matched to the sentence text it spells.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase, parseTaggedContent;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js'); loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
  ({ parseTaggedContent } = window.AlloModules.TextPipelineHelpers);
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

// AlloFlowANTI.txt _stripForImmersive and getSideBySideContent, as the host passes them.
const strip = raw => String(raw || '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\[\d+\]/g, '').replace(/https?:\/\/[^\s]+/g, '');
const sideBySide = text => {
  const delimiter = '--- ENGLISH TRANSLATION ---';
  if (!text || !text.includes(delimiter)) return null;
  const [source, target] = text.split(delimiter).map(part => part.trim());
  return { source: source.split(/\n{2,}/).filter(p => p.trim()), target: target.split(/\n{2,}/).filter(p => p.trim()), sourceFull: source, targetFull: target };
};

function sentencesHighlighted(data) {
  const noop = () => {};
  const item = { id: 'r', type: 'simplified', data, config: { language: 'English' }, immersiveData: parseTaggedContent(strip(data)), immersiveSource: data, posEnriched: true };
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), t: k => k, generatedContent: item, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], isTeacherMode: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: sideBySide, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: noop,
    isImmersiveReaderActive: true, ErrorBoundary: ({ children }) => children, FocusReaderOverlay: () => null, PerspectiveCrawlOverlay: () => null, KaraokeReaderOverlay: () => null, ImmersiveToolbar: () => null, ImmersiveWord: ({ wordData }) => wordData.text, ConfettiExplosion: () => null, immersiveSettings: {} };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  const bySentence = {};
  host.querySelectorAll('[data-sentence-idx]').forEach(span => { (bySentence[span.dataset.sentenceIdx] ||= []).push(span.textContent); });
  return Object.fromEntries(Object.entries(bySentence).map(([k, parts]) => [k, parts.join('').replace(/\s+/g, ' ').trim()]));
}

describe('Immersive highlights the sentence being read', () => {
  it('after a table', () => {
    const seen = sentencesHighlighted('The sun is hot.\n\n| Planet | Moons |\n|---|---|\n| Earth | 1 |\n\nEarth has one moon. Mars has two moons.');
    expect(seen['0']).toBe('The sun is hot.');
    expect(seen['1']).toBe('Earth has one moon.');
    expect(seen['2']).toBe('Mars has two moons.');
    expect(seen['-1']).toMatch(/Planet/); // table cells belong to no sentence
  });
  it('in a bilingual reading', () => {
    const seen = sentencesHighlighted('El sol es caliente. Hace calor.\n\n--- ENGLISH TRANSLATION ---\n\nThe sun is hot. It is warm.');
    expect(seen['0']).toBe('El sol es caliente.');
    expect(seen['1']).toBe('Hace calor.');
    expect(seen['2']).toBe('The sun is hot.');
    expect(seen['3']).toBe('It is warm.');
    expect(seen['-1']).toMatch(/ENGLISH TRANSLATION/);
  });
  it('in plain text, with its punctuation and nothing else', () => {
    const seen = sentencesHighlighted('Plants need light. "Water helps too," she said. Roots hold soil.');
    expect(seen).toEqual({ 0: 'Plants need light.', 1: '"Water helps too," she said.', 2: 'Roots hold soil.' });
  });
});

describe('matching words to sentences', () => {
  const align = (words, sentences) => View.alignImmersiveWords(words.split(' ').map(text => ({ text })), sentences);
  it('skips a sentence the words leave out, without drifting', () => {
    expect(align('A b c. G h i.', ['A b c.', 'D e f.', 'G h i.'])).toEqual([0, 0, 0, 2, 2, 2]);
  });
  it('a stray word inside a sentence is left out, and the sentence continues', () => {
    expect(align('The cell grows zzz and divides.', ['The cell grows and divides.'])).toEqual([0, 0, 0, -1, 0, 0]);
  });
  it('a list number is not matched to the same number later in the sentence', () => {
    expect(align('1. Add 1 cup of water.', ['Add 1 cup of water.'])).toEqual([-1, 0, 0, 0, 0, 0]);
  });
  it('a stray word does not jump ahead to where it appears near the end', () => {
    const sentence = 'The cell takes in food and then slowly splits into two cells today.';
    const words = 'The cell today takes in food and then slowly splits into two cells today.';
    expect(align(words, [sentence])).toEqual([0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

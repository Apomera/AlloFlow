// Immersive Reader's read-along does not rebuild the whole reading every frame.
//
// WHY (2026-09-24, measured): the read-along sweep updates the host every
// animation frame, and each update rebuilt the passage hidden behind the
// Immersive dialog, re-split the text and re-matched every word to its sentence:
// about 35-40 ms a frame for 300 sentences in the test DOM. The hidden passage
// is now reused while Immersive is open and the sentence work is done once per
// text.
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

const DATA = 'Plants need light. Roots take in water.\n\nLeaves make food. Energy moves on.';
function setup() {
  const counts = { split: 0, format: 0 };
  const base = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'a', type: 'simplified', data: DATA, config: { language: 'English' }, immersiveData: DATA.split(' ').map(text => ({ text, pos: 'noun' })), immersiveSource: DATA, posEnriched: true }, leveledTextLanguage: 'English', isTeacherMode: false, isZenMode: true, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => { counts.split++; return pure.splitTextToSentences(s, {}); }, getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: (text, cloze) => { counts.format++; return phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text: m }) => m }); }, SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: () => {}, ErrorBoundary: ({ children }) => children, FocusReaderOverlay: () => null, PerspectiveCrawlOverlay: () => null, KaraokeReaderOverlay: () => null, ImmersiveToolbar: () => null, ImmersiveWord: ({ wordData }) => wordData.text, immersiveSettings: {}, isChunkReaderActive: true, chunkReaderIdx: 0 };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = extra => act(() => root.render(React.createElement(View, { ...base, ...extra })));
  return { counts, render };
}

describe('with Immersive Reader open', () => {
  it('a read-along frame rebuilds neither the hidden passage nor the sentence list', () => {
    const { counts, render } = setup();
    render({ isImmersiveReaderActive: true, chunkReaderSweepPct: 0 });
    const before = { ...counts };
    for (let pct = 10; pct <= 50; pct += 10) render({ isImmersiveReaderActive: true, chunkReaderSweepPct: pct });
    expect(counts.format).toBe(before.format);
    expect(counts.split).toBe(before.split);
  });
  it('the words are still matched to their sentences', () => {
    const { render } = setup();
    render({ isImmersiveReaderActive: true, chunkReaderSweepPct: 20 });
    const first = [...host.querySelectorAll('[data-sentence-idx="0"]')].map(s => s.textContent).join(' ').replace(/\s+/g, ' ').trim();
    expect(first).toBe('Plants need light.');
  });
  it('a new text while it is open gets its own sentences', () => {
    const { render } = setup();
    render({ isImmersiveReaderActive: true });
    const next = 'Seeds sprout in spring. Birds sing loudly.';
    render({ isImmersiveReaderActive: true, generatedContent: { id: 'a', type: 'simplified', data: next, config: { language: 'English' }, immersiveData: next.split(' ').map(text => ({ text, pos: 'noun' })), immersiveSource: next, posEnriched: true } });
    const second = [...host.querySelectorAll('[data-sentence-idx="1"]')].map(s => s.textContent).join(' ').replace(/\s+/g, ' ').trim();
    expect(second).toBe('Birds sing loudly.');
  });
  it('the passage is rebuilt, with current text, when Immersive closes', () => {
    const { counts, render } = setup();
    render({ isImmersiveReaderActive: true });
    const before = counts.format;
    render({ isImmersiveReaderActive: false, generatedContent: { id: 'a', type: 'simplified', data: 'Plants need light today.', config: { language: 'English' } } });
    expect(counts.format).toBeGreaterThan(before);
    expect(host.querySelector('[data-simplified-reading-body]').textContent).toContain('Plants need light today.');
  });
});

describe('without Immersive Reader', () => {
  it('the passage follows playback as before', () => {
    const { render } = setup();
    render({ isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 0 } });
    render({ isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 1 } });
    expect(host.querySelector('[data-reading-sentence="1"]').getAttribute('aria-current')).toBe('true');
    expect(host.querySelector('[data-reading-sentence="0"]').getAttribute('aria-current')).toBeNull();
  });
});

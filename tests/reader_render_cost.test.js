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
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; vi.restoreAllMocks(); });

const DATA = 'Plants need light. Roots take in water.\n\nLeaves make food. Energy moves on.';
function setup() {
  const counts = { split: 0, format: 0, words: 0 };
  const base = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'a', type: 'simplified', data: DATA, config: { language: 'English' }, immersiveData: DATA.split(' ').map(text => ({ text, pos: 'noun' })), immersiveSource: DATA, posEnriched: true }, leveledTextLanguage: 'English', isTeacherMode: false, isZenMode: true, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => { counts.split++; return pure.splitTextToSentences(s, {}); }, getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: (text, cloze) => { counts.format++; return phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text: m }) => m }); }, SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => { counts.format++; return text; }, latestGlossary: [], setFocusedParagraphIndex: () => {}, ErrorBoundary: ({ children }) => children, FocusReaderOverlay: () => null, PerspectiveCrawlOverlay: () => null, KaraokeReaderOverlay: () => null, ImmersiveToolbar: () => null, ImmersiveWord: ({ wordData }) => { counts.words++; return wordData.text; }, immersiveSettings: {}, isChunkReaderActive: true, chunkReaderIdx: 0 };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = extra => act(() => root.render(React.createElement(View, { ...base, ...extra })));
  return { counts, render, base };
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


describe('reader performance keeps exact ownership', () => {
  it('a sweep renders only the active sentence, not every immersive word', () => {
    const { counts, render, base } = setup();
    const data = Array.from({ length: 50 }, (_, i) => 'Plant ' + i + ' grows.').join(' ');
    const content = { ...base.generatedContent, data, immersiveSource: data, immersiveData: data.split(' ').map(text => ({ text, pos: 'noun' })) };
    render({ generatedContent: content, isImmersiveReaderActive: true, chunkReaderReadAlong: true, chunkReaderSweepPct: 10 });
    const before = counts.words;
    render({ generatedContent: content, isImmersiveReaderActive: true, chunkReaderReadAlong: true, chunkReaderSweepPct: 50 });
    expect(counts.words - before).toBe(3);
    expect(host.querySelectorAll('[data-sentence-idx="49"]')).toHaveLength(3);
  });
  it('invalidates the hidden tree for text, resource, learner, and support changes', () => {
    const { counts, render, base } = setup();
    const initial = { ...base.generatedContent };
    let props = { generatedContent: initial, isImmersiveReaderActive: true, readingLearnerKey: 'learner-a' };
    render(props);
    for (const change of [
      { generatedContent: { ...initial, id: 'another-resource' } },
      { readingLearnerKey: 'learner-b' },
      { generatedContent: { ...initial, adaptedReadingSupports: { shown: false, annotations: [] } } }
    ]) {
      const before = counts.format;
      props = { ...props, ...change }; render(props);
      expect(counts.format).toBeGreaterThan(before);
    }
    const data = 'A completely new passage.';
    render({ ...props, generatedContent: { ...initial, data, immersiveSource: data, immersiveData: data.split(' ').map(text => ({ text, pos: 'noun' })) } });
    expect(host.querySelector('[data-simplified-reading-body]').textContent).toContain(data);
    expect(host.querySelector('[data-simplified-reading-body]').textContent).not.toContain('Roots take in water');
  });
  it('reuses validation but detects an in-place support edit', () => {
    const api = window.AlloModules.InstructionalContext;
    const validate = vi.spyOn(api, 'validateAdaptedReadingSupports');
    const { render, base } = setup();
    const content = { ...base.generatedContent, instructionalText: { form: 'adapted', role: 'supplemental' } };
    const support = { id: 'plants', start: 0, end: 6, quote: 'Plants', text: 'First explanation', kind: 'definition' };
    content.adaptedReadingSupports = api.setAdaptedReadingSupportsShown(content, api.upsertAdaptedReadingSupport(content, null, support), true);
    render({ generatedContent: content, isImmersiveReaderActive: true });
    validate.mockClear();
    for (let pct = 10; pct < 50; pct += 10) render({ generatedContent: content, isImmersiveReaderActive: true, chunkReaderSweepPct: pct });
    expect(validate).not.toHaveBeenCalled();
    content.adaptedReadingSupports.annotations[0].text = 'The revised explanation';
    render({ generatedContent: content, isImmersiveReaderActive: true });
    expect(validate).toHaveBeenCalled();
    expect(host.querySelector('[data-adapted-word-help]').textContent).toContain('The revised explanation');
  });
  it('refreshes memoized words after an in-place display-setting change', () => {
    const { render } = setup(), settings = { showNouns: false };
    const Word = React.memo(({ wordData, settings }) => React.createElement('span', { 'data-word-setting': String(settings.showNouns) }, wordData.text));
    render({ isImmersiveReaderActive: true, immersiveSettings: settings, ImmersiveWord: Word });
    expect(host.querySelector('[data-word-setting]').getAttribute('data-word-setting')).toBe('false');
    settings.showNouns = true;
    render({ isImmersiveReaderActive: true, immersiveSettings: settings, ImmersiveWord: Word });
    expect(host.querySelector('[data-word-setting]').getAttribute('data-word-setting')).toBe('true');
  });
  it('stable word handlers use the current mode, callbacks, and sentence index', () => {
    const { render } = setup(), first = vi.fn(), current = vi.fn(), jump = vi.fn();
    const Word = ({ wordData, onClick }) => React.createElement('button', { onClick }, wordData.text);
    render({ isImmersiveReaderActive: true, interactionMode: 'define', handleWordClick: first, ImmersiveWord: Word });
    render({ isImmersiveReaderActive: true, interactionMode: 'define', handleWordClick: current, ImmersiveWord: Word });
    act(() => host.querySelector('[data-sentence-idx="0"] button').click());
    expect(first).not.toHaveBeenCalled(); expect(current.mock.calls[0][0]).toBe('Plants');
    render({ isImmersiveReaderActive: true, interactionMode: 'read', isChunkReaderActive: true, setChunkReaderIdx: jump, ImmersiveWord: Word });
    act(() => host.querySelector('[data-sentence-idx="1"] button').click());
    expect(jump).toHaveBeenCalledWith(1);
    const speak = vi.fn();
    render({ isImmersiveReaderActive: true, interactionMode: 'read', isChunkReaderActive: false, handleSpeak: speak, ImmersiveWord: Word });
    act(() => host.querySelector('[data-sentence-idx="0"] button').click());
    expect(speak).toHaveBeenCalledWith('Plants', expect.stringMatching(/^immersive-word-/), 0, true);
  });
});

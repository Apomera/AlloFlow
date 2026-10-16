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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase, passageBuilds;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  const modulePath = resolve(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  const source = readFileSync(modulePath, 'utf8');
  // Measure the real render boundary, not legacy formatting props bypassed by readingText.
  const marker = /function renderSimplifiedReading\(\)\s*\{/g;
  expect([...source.matchAll(marker)]).toHaveLength(1);
  new Function('recordPassageBuild', source.replace(marker, '$&recordPassageBuild();') + '\n//# sourceURL=' + modulePath.replace(/\\/g, '/'))(() => { passageBuilds++; });
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; vi.restoreAllMocks(); });

const DATA = 'Plants need light. Roots take in water.\n\nLeaves make food. Energy moves on.';
function setup() {
  passageBuilds = 0;
  const counts = { split: 0, format: 0, words: 0, get passage() { return passageBuilds; } };
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
    expect(before.passage).toBeGreaterThan(0);
    expect(before.split).toBeGreaterThan(0);
    expect(counts.passage).toBe(before.passage);
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
    const before = counts.passage;
    render({ isImmersiveReaderActive: false, generatedContent: { id: 'a', type: 'simplified', data: 'Plants need light today.', config: { language: 'English' } } });
    expect(counts.passage).toBeGreaterThan(before);
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
      const before = counts.passage;
      props = { ...props, ...change }; render(props);
      expect(counts.passage).toBeGreaterThan(before);
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

describe('render-local source identity reuse', () => {
  function readingPair(base) {
    const api = window.AlloModules.InstructionalContext;
    const snapshot = api.createSourceSnapshot('An earlier source passage.', { sourceArtifactId: 'source-a', language: 'English' });
    const item = { ...base.generatedContent, sourceSnapshot: snapshot, sourceFamilyId: 'scope-family',
      instructionalText: { form: 'adapted', role: 'supplemental' } };
    return { api, item };
  }
  function clickVersion(version) {
    const button = host.querySelector('[data-reading-version="' + version + '"]');
    expect(button).not.toBeNull();
    act(() => button.click());
  }

  it('reads the current source once per unchanged immersive frame, without caching it across renders', () => {
    const { render, base } = setup(), { api, item } = readingPair(base);
    const read = vi.spyOn(api, 'getSourceSnapshot');
    const props = { generatedContent: item, isImmersiveReaderActive: true };
    render(props);
    for (let frame = 1; frame <= 4; frame++) {
      read.mockClear();
      render({ ...props, chunkReaderSweepPct: frame * 10 });
      // Adapted readings without history need the captured source, but no additional
      // source copies for the comparison preference and navigation identities.
      expect(read.mock.calls.filter(([value]) => value === item)).toHaveLength(1);
    }
    Object.assign(item.sourceSnapshot, api.createSourceSnapshot('The updated source passage.', { sourceArtifactId: 'source-b' }));
    read.mockClear();
    render({ ...props, chunkReaderSweepPct: 50 });
    expect(read.mock.calls.filter(([value]) => value === item)).toHaveLength(1);
    expect(read.mock.results.find((result, index) => read.mock.calls[index][0] === item).value.text).toBe('The updated source passage.');
  });

  it('keeps comparison preferences and saved pane positions separate after an in-place source edit', () => {
    const { render, base } = setup(), { api, item } = readingPair(base);
    const alternate = { id: 'alternate-source', type: 'analysis', title: 'Alternative source', data: { originalText: 'Another source for comparison.' } };
    const props = { generatedContent: item, history: [item, alternate], isTeacherMode: true,
      isCompareMode: true, onOpenReadingArtifact: vi.fn() };
    render(props);
    const sourceSelect = () => [...host.querySelectorAll('[data-reading-comparison] select')]
      .find(select => [...select.options].some(option => option.value === alternate.id));
    expect(sourceSelect()).toBeTruthy();
    act(() => { sourceSelect().value = alternate.id; sourceSelect().dispatchEvent(new Event('change', { bubbles: true })); });
    expect(sourceSelect().value).toBe(alternate.id);
    expect(host.querySelector('[data-compare-version="source"]').textContent).toContain('Another source for comparison.');
    host.querySelector('[data-compare-version="source"]').scrollTop = 310;
    clickVersion('adapted');
    render({ ...props, isCompareMode: false });

    Object.assign(item.sourceSnapshot, api.createSourceSnapshot('A replacement source in the same reading.', { sourceArtifactId: 'source-b' }));
    render({ ...props, isCompareMode: false });
    clickVersion('both');
    render(props);
    expect(sourceSelect().value).toBe('linked');
    const source = host.querySelector('[data-compare-version="source"]');
    expect(source.textContent).toContain('A replacement source in the same reading.');
    expect(source.scrollTop).toBe(0);
  });

  it('reads a source changed after render when an Original navigation event records its return scope', () => {
    const { render, base } = setup(), { api, item } = readingPair(base);
    const openOriginal = vi.fn();
    const props = { generatedContent: item, history: [item], isCompareMode: true, onReadOriginal: openOriginal };
    render(props);
    // No intervening render: navigation must not close over the old captured copy.
    Object.assign(item.sourceSnapshot, api.createSourceSnapshot('Source updated just before navigation.', { sourceArtifactId: 'source-b', language: 'French' }));
    clickVersion('original');
    expect(openOriginal).toHaveBeenCalledWith(item);
    const original = api.createSupportedReading(item.sourceSnapshot, { id: 'current-original', sourceFamilyId: 'scope-family', config: { language: 'French' } });
    render({ ...props, generatedContent: original, history: [item, original], isCompareMode: false });
    expect([...host.querySelectorAll('button')].some(button => button.textContent === 'Back to comparison')).toBe(true);
  });
});

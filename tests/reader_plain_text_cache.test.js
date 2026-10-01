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


describe('plain reader text is reused without caching interactive state', () => {
  function comparison(render, base, extra = {}) {
    const api = window.AlloModules.InstructionalContext;
    const original = api.createSupportedReading(DATA, { id: 'plain-original', sourceFamilyId: 'plain-family', config: { language: 'English' } });
    const item = { ...base.generatedContent, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'plain-family' };
    const props = { generatedContent: item, history: [original, item], isCompareMode: true, readingLearnerKey: 'one', ...extra };
    render(props); return { props, item, original, api };
  }
  it('does not parse unchanged comparison text again during read-along updates', () => {
    const { render, base } = setup(); const { props } = comparison(render, base);
    const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const labels = [...host.querySelectorAll('[data-exact-sentence-stop]')].map(node => node.getAttribute('aria-label'));
    expect(labels.length).toBeGreaterThan(0);
    for (let i = 1; i <= 8; i++) render({ ...props, chunkReaderSweepPct: i * 10 });
    expect(parse).not.toHaveBeenCalled();
    expect([...host.querySelectorAll('[data-exact-sentence-stop]')].map(node => node.getAttribute('aria-label'))).toEqual(labels);
  });
  it('updates source text and labels after an in-place snapshot edit', () => {
    const { render, base } = setup(); const { props, item, api } = comparison(render, base);
    Object.assign(item.sourceSnapshot, api.createSourceSnapshot('**Seeds** grow today. Birds find food.', { sourceArtifactId: 'changed-source' }));
    render(props); const source = host.querySelector('[data-compare-version="source"]');
    expect(source.textContent).toContain('Seeds');
    expect(source.textContent).not.toContain('Roots take in water');
    expect(source.querySelector('[data-exact-sentence-stop]').getAttribute('aria-label')).toContain('Seeds');
  });
  it('updates an adaptation edited in place under the same resource id', () => {
    const { render, base } = setup(); const { props, item } = comparison(render, base);
    item.data = 'Rain fills the pond. Ducks swim.'; render(props);
    const adapted = host.querySelector('[data-compare-version="adapted"]');
    expect(adapted.textContent).toContain('Rain fills the pond');
    expect(adapted.textContent).not.toContain('Roots take in water');
    expect(adapted.querySelector('[data-exact-sentence-stop]').getAttribute('aria-label')).toContain('Rain fills the pond');
  });
  it('clears derived text when the learner or resource changes', () => {
    const { render, base } = setup(); const { props, item } = comparison(render, base);
    const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');
    render({ ...props, readingLearnerKey: 'two' }); expect(parse).toHaveBeenCalled(); parse.mockClear();
    render({ ...props, generatedContent: { ...item, id: 'another-resource' } }); expect(parse).toHaveBeenCalled();
  });
  it('uses replacement parser behavior immediately', () => {
    const { render, base } = setup(); const { props } = comparison(render, base);
    const readingText = window.AlloModules.TextPipelineHelpers.readingText, original = readingText.plain;
    vi.spyOn(readingText, 'plain').mockImplementation(value => original(value).replaceAll('Plants', 'Ferns'));
    render(props);
    expect(host.querySelector('[data-compare-version="source"] [data-exact-sentence-stop]').getAttribute('aria-label')).toContain('Ferns');
  });
  it('keeps support edits fresh while reusing passage text', () => {
    const { render, base } = setup(); const { props, original, api } = comparison(render, base);
    original.readingSupports = api.upsertReadingSupport(original, null, { id: 'plants', start: 0, end: 6, quote: 'Plants', text: 'First explanation', kind: 'definition' });
    render(props); expect(host.querySelector('[data-reading-gloss]').textContent).toContain('First explanation');
    original.readingSupports.annotations[0].text = 'Revised explanation'; render(props);
    expect(host.querySelector('[data-reading-gloss]').textContent).toContain('Revised explanation');
  });
  it('switches from read to Explain with current text and callback', () => {
    const { render, base } = setup(); const first = vi.fn(), latest = vi.fn();
    const { props } = comparison(render, base, { setSelectionMenu: first });
    render({ ...props, interactionMode: 'explain', setSelectionMenu: latest });
    act(() => host.querySelector('[data-compare-version="source"] [data-exact-explain]').click());
    expect(first).not.toHaveBeenCalled();
    expect(latest.mock.calls[0][0].text).toBe('Plants need light. Roots take in water.');
  });
});

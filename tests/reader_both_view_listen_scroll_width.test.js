// Both view reads each pane in place (highlighted), can scroll its panes together,
// and the reading column width is a slider (40-100 characters, 72 by default).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, api, pure, phase, root, host, props;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js']) loadAlloModule(file);
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; localStorage.clear(); vi.restoreAllMocks(); });

const SOURCE = 'Hail to thee, thane of Cawdor! Thou shalt be king hereafter.\n\nSo foul and fair a day I have not seen.';
const ADAPTED = 'Hello, lord of Cawdor! You will be king later.\n\nThis day is both bad and good.';
const split = text => pure.splitTextToSentences(text, {});
function pair() {
  const original = api.createSupportedReading(SOURCE, { id: 'original', sourceFamilyId: 'mac', config: { language: 'English' } });
  const start = SOURCE.indexOf('thane');
  original.readingSupports = api.upsertReadingSupport(original, undefined, { id: 'thane', start, end: start + 5, quote: 'thane', text: 'A Scottish lord.', origin: 'generated', kind: 'gloss' });
  const adapted = { id: 'adapted', type: 'simplified', data: ADAPTED, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'mac', instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English' } };
  return { original, adapted };
}
function mount(extra = {}) {
  const { original, adapted } = pair(), noop = () => {};
  props = { ComplexityGauge: () => null, t: key => key, generatedContent: adapted, history: [original, adapted], isTeacherMode: false, isZenMode: false,
    isCompareMode: true, isEditingLeveledText: false, interactionMode: 'read', readingLearnerKey: 'student', leveledTextLanguage: 'English', selectedVoice: 'Kore', voiceSpeed: 1,
    textEditorRef: React.createRef(), splitTextToSentences: split, getSideBySideContent: () => null, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: () => null }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [], setFocusedParagraphIndex: noop,
    onReadOriginal: vi.fn(), onOpenReadingArtifact: vi.fn(), setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), setReadingTheme: vi.fn(),
    handleSpeak: vi.fn(), stopPlayback: vi.fn(), closeDefinition: noop, closePhonics: noop, closeRevision: noop, setGeneratedContent: noop, setHistory: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
}
const rerender = extra => { Object.assign(props, extra); act(() => root.render(React.createElement(View, props))); };
const find = selector => host.querySelector(selector);
const marked = pane => Array.from(host.querySelectorAll('[data-compare-version="' + pane + '"] mark[data-reading-now]')).map(mark => { const copy = mark.cloneNode(true); copy.querySelectorAll('[data-reading-gloss]').forEach(chip => chip.remove()); return copy.textContent; }).join('');
const units = text => text.split(/\n{2,}/).flatMap(split);

describe('Both view read-aloud in place', () => {
  it('reads the original pane with its shown supports as its own sequence and marks only that pane', () => {
    mount();
    act(() => find('[data-comparison-listen="source"]').click());
    const [text, id, start, restart, language] = props.handleSpeak.mock.calls.at(-1);
    expect([id, start, restart, language]).toEqual(['simplified-source', 0, true, 'English']);
    expect(units(text)).toEqual(['Hail to thee, thane of Cawdor!', 'Word support for "thane": A Scottish lord.', 'Thou shalt be king hereafter.', 'So foul and fair a day I have not seen.']);
    rerender({ isPlaying: true, playingContentId: 'simplified-source', playbackState: { currentIdx: 2, sentences: units(text) } });
    expect(marked('source')).toBe('Thou shalt be king hereafter.');
    expect(marked('adapted')).toBe('');
    expect(find('[data-comparison-listen="source"]').getAttribute('aria-label')).toBe('Stop reading the original');
    rerender({ playbackState: { currentIdx: 1, sentences: units(text) } });
    expect(find('[data-compare-version="source"] [data-reading-gloss][data-reading-now]')).not.toBeNull();
    act(() => find('[data-comparison-listen="source"]').click());
    expect(props.handleSpeak).toHaveBeenCalledTimes(1);
  });

  it('reads the adapted pane through the saved-audio sequence', () => {
    mount();
    act(() => find('[data-comparison-listen="adapted"]').click());
    const [text, id] = props.handleSpeak.mock.calls.at(-1);
    expect(id).toBe('simplified-main');
    rerender({ isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 1, sentences: units(text) } });
    expect(marked('adapted')).toBe('You will be king later.');
    expect(marked('source')).toBe('');
  });

  it('reads the original pane without supports when glosses are hidden', () => {
    mount();
    const glosses = Array.from(host.querySelectorAll('label')).find(label => label.textContent.includes('simplified.compare_show_glosses') || label.textContent.includes('Show glosses')).querySelector('input');
    act(() => glosses.click());
    act(() => find('[data-comparison-listen="source"]').click());
    expect(props.handleSpeak.mock.calls.at(-1)[0]).toBe(SOURCE);
  });
});

describe('Both view scroll together', () => {
  it('is on by default and remembers being switched off', () => {
    mount();
    const box = find('[data-compare-scroll-together]');
    expect(box.checked).toBe(true);
    act(() => box.click());
    expect(box.checked).toBe(false);
    expect(localStorage.getItem('alloflow_compare_scroll_together')).toBe('off');
    act(() => root.unmount()); host.remove(); root = null; mount();
    expect(find('[data-compare-scroll-together]').checked).toBe(false);
  });

  // Layout-free panes: rect tops are fixed; scroll offsets move the anchors.
  const pane = (top, height, client, anchors) => {
    const node = { scrollTop: 0, scrollHeight: height, clientHeight: client, getBoundingClientRect: () => ({ top }) };
    node.querySelectorAll = () => anchors.map(([at, tag, text]) => ({ tagName: tag || 'SPAN', textContent: text || '', getBoundingClientRect: () => ({ top: top + at - node.scrollTop }) }));
    return node;
  };
  it('lines up matching paragraphs when both versions have as many', () => {
    const from = pane(100, 2000, 400, [[0], [600], [1200]]), to = pane(100, 1000, 400, [[0], [300], [500]]);
    from.scrollTop = 600; expect(View.mapCompareScroll(from, to)).toBe(300);
    from.scrollTop = 900; expect(View.mapCompareScroll(from, to)).toBe(400);
    from.scrollTop = 1600; expect(View.mapCompareScroll(from, to)).toBe(600);
  });
  it('falls back to matching headings, and ends meet', () => {
    const from = pane(0, 3000, 500, [[0, 'H2', 'Intro'], [100], [200], [1500, 'H2', 'Where the water goes'], [1600]]);
    const to = pane(0, 1500, 500, [[0, 'H2', 'Intro'], [100], [700, 'H2', 'Where the water goes'], [800]]);
    from.scrollTop = 1500; expect(View.mapCompareScroll(from, to)).toBe(700);
    from.scrollTop = 2500; expect(View.mapCompareScroll(from, to)).toBe(1000);
  });
  it('skips a last paragraph too near the end to reach the top, so both ends meet', () => {
    const from = pane(0, 2000, 400, [[0], [600], [1800]]), to = pane(0, 1000, 400, [[0], [300], [900]]);
    from.scrollTop = 1100; expect(View.mapCompareScroll(from, to)).toBe(450);
    from.scrollTop = 1600; expect(View.mapCompareScroll(from, to)).toBe(600);
  });
  it('leaves stacked panes independent', () => {
    expect(View.mapCompareScroll(pane(0, 2000, 400, []), pane(900, 2000, 400, []))).toBeNull();
  });
});

describe('reading width slider', () => {
  const setWidth = (slider, value) => act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, value); slider.dispatchEvent(new Event('input', { bubbles: true })); });
  it('widens the column up to 100 characters and remembers it', () => {
    mount({ isCompareMode: false, generatedContent: pair().adapted });
    const slider = find('input[data-reading-width]');
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual(['40', '100', '4', '72']);
    setWidth(slider, '96');
    expect(find('[data-simplified-reading-body]').style.maxWidth).toBe('min(96ch, 100%)');
    expect(slider.getAttribute('aria-valuetext')).toBe('Extra wide, about 96 characters per line');
    expect(localStorage.getItem('alloflow_reading_width')).toBe('96');
  });
  it('keeps older saved widths and rejects out-of-range ones', () => {
    localStorage.setItem('alloflow_reading_width', '56');
    mount({ isCompareMode: false, generatedContent: pair().adapted });
    expect(find('input[data-reading-width]').value).toBe('56');
    act(() => root.unmount()); host.remove(); root = null;
    localStorage.setItem('alloflow_reading_width', '400');
    mount({ isCompareMode: false, generatedContent: pair().adapted });
    expect(find('input[data-reading-width]').value).toBe('72');
  });
  it('gives the original and the adapted text the same column', () => {
    mount({ isCompareMode: false, generatedContent: pair().original });
    const original = find('[data-simplified-reading-body]');
    expect(original.className).toContain('text-lg font-medium font-sans');
    expect(original.style.maxWidth).toBe('min(72ch, 100%)');
    expect(original.querySelector('[data-reading-versions]')).not.toBeNull();
  });
});

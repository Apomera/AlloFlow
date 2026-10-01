// The original reader reads aloud sentence by sentence (highlighted, saved audio)
// and reads each word support after the sentence that holds its word.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, api, pure, phase, root, host, props, latestKaraoke;
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
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; latestKaraoke = null;
  localStorage.clear(); vi.restoreAllMocks();
  for (const key of ['__alloGetReadAloudAudioSummary', '__alloPrepareReadAloud']) delete window[key];
});

const TEXT = '# Act 1\n\nAll hail, Macbeth! Hail to thee, thane of Cawdor! Thou shalt be king hereafter.\n\nSo foul and fair a day I have not seen.';
const at = word => TEXT.indexOf(word);
const support = (id, word, text) => ({ id, start: at(word), end: at(word) + word.length, quote: word, text, origin: 'generated', kind: 'gloss' });
const THANE = support('thane', 'thane', 'A Scottish lord');
const HEREAFTER = support('hereafter', 'hereafter', 'In the future.');
const split = text => pure.splitTextToSentences(text, {});
const spoken = entry => 'Word support for "' + entry.quote + '": ' + entry.text + (/[.!?]$/.test(entry.text) ? '' : '.');
const units = text => text.split(/\n{2,}/).flatMap(p => p.trim().startsWith('|') || p.includes('\n|') ? [] : split(p));
const clean = sentence => String(sentence).replace(/^#{1,6}\s+/, '').trim();

function reading(entries = [THANE, HEREAFTER]) {
  const item = api.createSupportedReading(TEXT, { id: 'original-mac', sourceFamilyId: 'macbeth', config: { language: 'English' } });
  entries.forEach(entry => { item.readingSupports = api.upsertReadingSupport(item, item.readingSupports, entry); });
  expect(item.readingSupports.annotations).toHaveLength(entries.length);
  return item;
}
function mount(extra = {}) {
  const noop = () => {};
  props = { ComplexityGauge: () => null, t: key => key, generatedContent: reading(), history: [], isTeacherMode: true, isZenMode: false,
    isCompareMode: false, isEditingLeveledText: false, interactionMode: 'read', readingLearnerKey: 'teacher', leveledTextLanguage: 'English',
    selectedVoice: 'Kore', voiceSpeed: 1, textEditorRef: React.createRef(), splitTextToSentences: split, getSideBySideContent: () => null,
    cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text,
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: () => null }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [],
    setFocusedParagraphIndex: noop, onReadOriginal: vi.fn(), onOpenReadingArtifact: vi.fn(), setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(),
    setReadingTheme: vi.fn(), handleToggleIsTeacherToolbarExpanded: vi.fn(), handleSpeak: vi.fn(), stopPlayback: vi.fn(), callTTS: vi.fn(async () => 'blob:test'),
    closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(),
    KaraokeReaderOverlay: next => { latestKaraoke = next; return next.isOpen ? React.createElement('section', { 'data-karaoke-test': true }) : null; },
    ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
}
const rerender = extra => { Object.assign(props, extra); act(() => root.render(React.createElement(View, props))); };
const find = selector => host.querySelector(selector);
const button = label => Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === label);
const lastSpeak = () => props.handleSpeak.mock.calls.at(-1);
// The marked passage text, without the gloss chips drawn inside it.
const markedText = () => Array.from(host.querySelectorAll('mark[data-reading-now]')).map(mark => { const copy = mark.cloneNode(true); copy.querySelectorAll('[data-reading-gloss]').forEach(chip => chip.remove()); return copy.textContent; }).join('');

describe('listen plan for an exact passage', () => {
  it('maps every read-aloud unit back to its exact range in the original', () => {
    const plan = View.exactListenPlan(TEXT, [], split, spoken);
    expect(plan.text).toBe(TEXT);
    expect(plan.units.map(range => TEXT.slice(range.start, range.end))).toEqual(units(TEXT));
  });

  it('reads each support after its whole sentence, in text order, as its own unit', () => {
    const plan = View.exactListenPlan(TEXT, [HEREAFTER, THANE], split, spoken);
    const spokenUnits = units(plan.text);
    expect(spokenUnits).toEqual(['# Act 1', 'All hail, Macbeth!', 'Hail to thee, thane of Cawdor!', 'Word support for "thane": A Scottish lord.',
      'Thou shalt be king hereafter.', 'Word support for "hereafter": In the future.', 'So foul and fair a day I have not seen.']);
    expect(plan.units).toHaveLength(spokenUnits.length);
    expect(plan.units[3]).toEqual({ support: 'thane' });
    expect(plan.units[5]).toEqual({ support: 'hereafter' });
    expect(TEXT.slice(plan.units[2].start, plan.units[2].end)).toBe('Hail to thee, thane of Cawdor!');
    expect(TEXT.slice(plan.units[6].start, plan.units[6].end)).toBe('So foul and fair a day I have not seen.');
  });

  it('keeps the passage sentences identical, so saved sentence audio serves both modes', () => {
    const passage = units(TEXT).map(clean);
    const withSupports = units(View.exactListenPlan(TEXT, [THANE, HEREAFTER], split, spoken).text).filter(unit => !unit.startsWith('Word support')).map(clean);
    expect(withSupports).toEqual(passage);
  });

  it('never drops a support whose word is in unread text, and skips empty supports', () => {
    const table = 'Look at this.\n\n| thane | lord |\n|---|---|';
    const inTable = { id: 't', start: table.indexOf('thane'), end: table.indexOf('thane') + 5, quote: 'thane', text: 'A lord.' };
    const plan = View.exactListenPlan(table, [inTable, { id: 'e', start: 0, end: 4, quote: 'Look', text: ' ' }], split, entry => entry.text.trim() ? spoken(entry) : '');
    expect(units(plan.text)).toEqual(['Look at this.', 'Word support for "thane": A lord.']);
  });
});

describe('original reader read-aloud', () => {
  it('reads the original through the sentence player and highlights the current sentence', () => {
    mount();
    act(() => button('Listen to original').click());
    expect(lastSpeak()).toEqual([TEXT, 'simplified-main', 0, true, 'English']);
    rerender({ isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 2 } });
    expect(markedText()).toBe('Hail to thee, thane of Cawdor!');
    expect(find('mark[data-reading-now] [data-reading-gloss]')?.getAttribute('aria-label')).toBe('Gloss for thane');
    expect(button('Stop original')).toBeTruthy();
    rerender({ playbackState: { currentIdx: 4 } });
    expect(markedText()).toBe('So foul and fair a day I have not seen.');
  });

  it('reads supports after their sentences and marks the support being read', () => {
    mount();
    act(() => button('Listen with glosses').click());
    const [text, id] = lastSpeak();
    expect(id).toBe('simplified-main');
    expect(text).toContain('Hail to thee, thane of Cawdor!\n\nWord support for "thane": A Scottish lord.\n\n');
    expect(text).not.toContain('thane. ');
    rerender({ isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 3 } });
    expect(find('[data-reading-gloss][data-reading-now]')?.getAttribute('aria-label')).toBe('Gloss for thane');
    expect(find('mark[data-reading-now]')).toBeNull();
    expect(button('Stop gloss reading')).toBeTruthy();
    rerender({ playbackState: { currentIdx: 4 } });
    expect(markedText()).toBe('Thou shalt be king hereafter.');
    expect(find('[data-reading-gloss][data-reading-now]')).toBeNull();
  });

  it('does not highlight playback of another text', () => {
    mount();
    rerender({ isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 2 } });
    expect(find('[data-reading-now]')).toBeNull();
    rerender({ playbackState: { currentIdx: 2, sentences: ['A different passage.', 'It is read elsewhere.', 'By another reader.'] } });
    expect(find('[data-reading-now]')).toBeNull();
    expect(button('Listen to original')).toBeTruthy();
  });

  it('knows its own playback after remounting, in either mode', () => {
    const plain = units(TEXT);
    mount({ isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 1, sentences: plain } });
    expect(button('Stop original')).toBeTruthy();
    expect(markedText()).toBe('All hail, Macbeth!');
    const withSupports = units(View.exactListenPlan(TEXT, [THANE, HEREAFTER], split, spoken).text);
    rerender({ playbackState: { currentIdx: 3, sentences: withSupports } });
    expect(button('Stop gloss reading')).toBeTruthy();
    expect(find('[data-reading-gloss][data-reading-now]')?.getAttribute('aria-label')).toBe('Gloss for thane');
    act(() => button('Stop gloss reading').click());
    expect(props.stopPlayback).toHaveBeenCalledTimes(1);
    expect(props.handleSpeak).not.toHaveBeenCalled();
  });

  it('Listen along reads the shown supports, and only the passage when glosses are hidden', () => {
    mount();
    act(() => find('[data-reader-display]').click());
    act(() => find('[data-reader-listen-along]').click());
    expect(latestKaraoke.text).toBe(TEXT);
    expect(latestKaraoke.sentenceList).toContain('Word support for "thane": A Scottish lord.');
    expect(latestKaraoke.sentenceList.indexOf('Word support for "thane": A Scottish lord.')).toBe(latestKaraoke.sentenceList.indexOf('Hail to thee, thane of Cawdor!') + 1);
    act(() => latestKaraoke.onClose());
    const glosses = Array.from(host.querySelectorAll('label')).find(label => label.textContent.includes('Show glosses')).querySelector('input');
    act(() => glosses.click());
    act(() => find('[data-reader-listen-along]').click());
    expect(latestKaraoke.sentenceList.some(sentence => sentence.startsWith('Word support'))).toBe(false);
  });

  it('Save audio prepares every support line along with the passage', async () => {
    window.__alloGetReadAloudAudioSummary = () => ({ total: 7, ready: 0, stale: 0, corrupt: 0, missing: 7 });
    window.__alloPrepareReadAloud = vi.fn(async () => ({ ok: true, remaining: 0 }));
    mount();
    await act(async () => find('[data-review-state="audio"] [data-review-action="audio"]').click());
    const [sentences, , options] = window.__alloPrepareReadAloud.mock.calls[0];
    expect(sentences).toEqual(['Act 1', 'All hail, Macbeth!', 'Hail to thee, thane of Cawdor!', 'Word support for "thane": A Scottish lord.',
      'Thou shalt be king hereafter.', 'Word support for "hereafter": In the future.', 'So foul and fair a day I have not seen.']);
    expect(options.entries.every(entry => entry.language === 'English')).toBe(true);
  });
});

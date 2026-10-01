// On the original and both panes of Both, each sentence is a "read from here"
// control, as in the adapted reader: click, Enter or Space reads from it; one Tab
// stop per line with arrow keys between sentences; gloss chips stay outside.
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

const TEXT = '# Act 1\n\nAll hail, Macbeth! Hail to thee, thane of Cawdor! Thou shalt be king hereafter.\n\nSo foul and fair a day I have not seen.';
const ADAPTED = 'Hello, Macbeth! Hello, lord of Cawdor! You will be king later.\n\nThis day is both bad and good.';
const split = text => pure.splitTextToSentences(text, {});
const at = word => TEXT.indexOf(word);
const support = (id, word, text) => ({ id, start: at(word), end: at(word) + word.length, quote: word, text, origin: 'generated', kind: 'gloss' });
function readings() {
  const original = api.createSupportedReading(TEXT, { id: 'original-mac', sourceFamilyId: 'mac', config: { language: 'English' } });
  for (const entry of [support('thane', 'thane', 'A Scottish lord.'), support('hereafter', 'hereafter', 'In the future.')]) original.readingSupports = api.upsertReadingSupport(original, original.readingSupports, entry);
  const adapted = { id: 'adapted-mac', type: 'simplified', data: ADAPTED, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'mac', instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English' } };
  return { original, adapted };
}
function mount(extra = {}) {
  const { original, adapted } = readings(), noop = () => {};
  props = { ComplexityGauge: () => null, t: key => (key === 'common.read' ? 'Read' : key), generatedContent: original, history: [original, adapted], isTeacherMode: true, isZenMode: false,
    isCompareMode: false, isEditingLeveledText: false, interactionMode: 'read', readingLearnerKey: 'teacher', leveledTextLanguage: 'English', selectedVoice: 'Kore', voiceSpeed: 1,
    textEditorRef: React.createRef(), splitTextToSentences: split, getSideBySideContent: () => null, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: () => null }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [], setFocusedParagraphIndex: noop,
    onReadOriginal: vi.fn(), onOpenReadingArtifact: vi.fn(), setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), setReadingTheme: vi.fn(),
    handleSpeak: vi.fn(), stopPlayback: vi.fn(), closeDefinition: noop, closePhonics: noop, closeRevision: noop, setGeneratedContent: noop, setHistory: noop,
    onUpdateReadingSupports: vi.fn(), ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
}
const rerender = extra => { Object.assign(props, extra); act(() => root.render(React.createElement(View, props))); };
const stops = (scope = host) => Array.from(scope.querySelectorAll('[data-exact-sentence-stop]'));
const stop = (text, scope) => stops(scope).find(node => node.textContent.startsWith(text));
const units = text => text.split(/\n{2,}/).flatMap(p => split(p));
const lastSpeak = () => props.handleSpeak.mock.calls.at(-1);
const key = (node, name) => act(() => { node.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true })); });

describe('original reader sentence starts', () => {
  it('makes each sentence a labelled read-from-here control with one Tab stop per line', () => {
    mount();
    const all = stops();
    expect(all.map(node => node.getAttribute('aria-label'))).toEqual(['Read: # Act 1', 'Read: All hail, Macbeth!', 'Read: Hail to thee, thane of Cawdor!', 'Read: Thou shalt be king hereafter.', 'Read: So foul and fair a day I have not seen.']);
    all.forEach(node => { expect(node.getAttribute('role')).toBe('button'); expect(node.getAttribute('aria-label')).toContain(node.textContent.trim()); });
    const lines = new Map();
    all.forEach(node => { const line = node.closest('[data-reading-paragraph]'); lines.set(line, [...(lines.get(line) || []), node.tabIndex]); });
    for (const tabs of lines.values()) expect(tabs.filter(tab => tab === 0)).toHaveLength(1);
  });

  it('keeps gloss chips and teacher Edit buttons outside the sentence controls', () => {
    mount();
    expect(host.querySelector('[data-exact-sentence-stop] [data-reading-gloss]')).toBeNull();
    expect(host.querySelector('[role="button"] button')).toBeNull();
    expect(host.querySelectorAll('[data-reading-gloss]')).toHaveLength(2);
  });

  it('reads from a clicked sentence with the shown supports, at that sentence in the plan', () => {
    mount();
    act(() => stop('Thou shalt').click());
    const [text, id, index, restart] = lastSpeak();
    expect([id, restart]).toEqual(['simplified-main', true]);
    expect(units(text)[index]).toBe('Thou shalt be king hereafter.');
    expect(units(text)[index - 1]).toMatch(/^Word support for “thane”|^Word support for "thane"/);
  });

  it('reads the plain original from the clicked sentence when glosses are hidden', () => {
    mount();
    const glosses = Array.from(host.querySelectorAll('label')).find(label => /glosses/i.test(label.textContent)).querySelector('input');
    act(() => glosses.click());
    act(() => stop('So foul').click());
    const [text, , index] = lastSpeak();
    expect(text).toBe(TEXT);
    expect(units(text)[index]).toBe('So foul and fair a day I have not seen.');
  });

  it('reads from the rest of a sentence that follows a gloss chip', () => {
    mount();
    const tail = Array.from(host.querySelectorAll('[data-exact-sentence]:not([data-exact-sentence-stop])')).find(node => node.textContent.includes('of Cawdor!'));
    act(() => tail.click());
    const [text, , index] = lastSpeak();
    expect(units(text)[index]).toBe('Hail to thee, thane of Cawdor!');
  });

  it('works from the keyboard: Enter and Space read, arrows, Home and End move within the line', () => {
    mount();
    const first = stop('All hail'), second = stop('Hail to thee'), third = stop('Thou shalt');
    act(() => first.focus());
    key(first, 'ArrowRight'); expect(document.activeElement).toBe(second);
    key(second, 'End'); expect(document.activeElement).toBe(third);
    expect(third.tabIndex).toBe(0); expect(first.tabIndex).toBe(-1);
    key(third, 'Home'); expect(document.activeElement).toBe(first);
    key(first, 'Enter');
    expect(units(lastSpeak()[0])[lastSpeak()[2]]).toBe('All hail, Macbeth!');
    key(first, ' ');
    expect(props.handleSpeak).toHaveBeenCalledTimes(2);
  });

  it('does not start reading when the click ends a text selection', () => {
    mount();
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'thane of Cawdor', removeAllRanges() {}, addRange() {} });
    act(() => stop('Hail to thee').click());
    expect(props.handleSpeak).not.toHaveBeenCalled();
  });

  it('keeps reading in the current mode when a sentence is chosen during playback', () => {
    mount();
    act(() => host.querySelector('[data-reader-listen]').click());
    const plain = lastSpeak()[0];
    rerender({ isPlaying: true, playingContentId: 'simplified-main', playbackState: { currentIdx: 1, sentences: units(plain) } });
    act(() => stop('So foul').click());
    expect(lastSpeak()[0]).toBe(TEXT);
    expect(props.stopPlayback).toHaveBeenCalledTimes(2);
  });

  it('adds no sentence controls in Word meaning mode or the student preview', () => {
    mount({ interactionMode: 'define' });
    expect(stops()).toHaveLength(0);
    act(() => root.unmount()); host.remove(); root = null;
    mount({ isStudentPreview: true, previewLimitId: 'limit' });
    expect(stops()).toHaveLength(0);
  });
});

describe('Both view sentence starts', () => {
  it('reads each pane from its clicked sentence with that pane\'s sequence', () => {
    mount({ generatedContent: readings().adapted, isCompareMode: true, isTeacherMode: false, readingLearnerKey: 'student' });
    const source = host.querySelector('[data-compare-version="source"]'), adapted = host.querySelector('[data-compare-version="adapted"]');
    act(() => stop('So foul', source).click());
    let [text, id, index] = lastSpeak();
    expect(id).toBe('simplified-source');
    expect(units(text)[index]).toBe('So foul and fair a day I have not seen.');
    act(() => stop('You will be king', adapted).click());
    [text, id, index] = lastSpeak();
    expect(id).toBe('simplified-main');
    expect(units(text)[index]).toBe('You will be king later.');
  });
});
